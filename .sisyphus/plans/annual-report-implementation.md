# 年間レポート + 部屋ステータス + 月次処理改修 実装計画 (第2版)

## 概要

PWA改修解禁に伴い、全面的に再策定。4フェーズ7ステップ:

1. **部屋ステータス管理** (5ステータス + 備考欄) — バックエンド + 管理画面 + PWA
2. **月次処理の保存月選択** (実行日ではなくユーザー指定 + アーカイブにステータス保存)
3. **年間レポート** (12ヶ月表形式、色分け、印刷対応)

### ⚠️ 重要な制約事項

1. **PWAは段階的移行**: バックエンドは `isNotNeeded` と `roomStatus` の**両方**を返す。PWA新バージョンは `roomStatus` を使用、旧キャッシュ版は `isNotNeeded` にフォールバック。
2. **月次アーカイブに部屋ステータスを保存**。年間レポートは各月のその時点のステータスで背景色を判定（現在のステータスではない）。
3. **GASメニューからの月次処理パスも維持**。params 未指定時は `new Date()` フォールバック。

---

## 5ステータス定義

| 値       | 表示名            | 検針不要 | 請求不要 | レポート背景色 | PWA検針対象 |
| -------- | ----------------- | -------- | -------- | -------------- | ----------- |
| `normal` | 🏠 通常入居中     | ''       | ''       | 白             | ✅ 対象     |
| `vacant` | 📭 空室           | ''       | ''       | 薄灰(0㎥時)    | ✅ 対象     |
| `owner`  | 🔑 オーナー使用中 | ''       | '●'      | 薄緑 #e3f2e8   | ✅ 対象     |
| `fixed`  | 💰 固定料金       | ''       | '●'      | 薄黄 #fef9e7   | ✅ 対象     |
| `skip`   | 🚫 検針不要       | 'true'   | ''       | 斜線           | ❌ 対象外   |

**重要**: `vacant`/`owner`/`fixed` は**検針対象**。空室でも水が使われる場合があるため。`skip`のみが検針スキップ。

---

## Phase 1: 部屋ステータス管理 (Backend + Admin + PWA)

### 1-1. スプレッドシート構造変更

#### 部屋マスタ (ROOM_MASTER)

```
Before: 物件ID | 部屋ID | 部屋名
After:  物件ID | 部屋ID | 部屋名 | 部屋ステータス | 備考
```

- 4列目に「部屋ステータス」を追加（`normal`/`vacant`/`owner`/`fixed`/`skip`）
- 5列目に「備考」を追加
- 既存データは4列目空欄 = 「通常入居中」として扱う（後方互換）

#### inspection_data（列構成変更なし）

- 14列目「検針不要」、15列目「請求不要」は**そのまま維持**
- 部屋ステータスから**自動導出**して書き込む（ステータスが正のときはフラグを上書き）

---

### 1-2. Backend変更

#### Config.js

```javascript
// ROOM_MASTER_COLS に追加
ROOM_MASTER_COLS: {
  PROPERTY_ID: 1,
  ROOM_ID: 2,
  ROOM_NAME: 3,
  STATUS: 4,      // 新規: 部屋ステータス
  NOTES: 5         // 新規: 備考
}
```

#### property_management.js

**新規: deriveFlagsFromStatus(status)**

```javascript
function deriveFlagsFromStatus(status) {
  switch (status) {
    case 'skip':
      return { inspectionSkip: 'true', billingSkip: '' };
    case 'owner':
      return { inspectionSkip: '', billingSkip: '●' };
    case 'fixed':
      return { inspectionSkip: '', billingSkip: '●' };
    default: // normal, vacant, その他
      return { inspectionSkip: '', billingSkip: '' };
  }
}
```

**addRoom()** (line 469)

- `roomSheet.appendRow([propertyId, roomId, roomName])` → `[propertyId, roomId, roomName, status || '', notes || '']`
- inspection_data の新規行にも `deriveFlagsFromStatus()` で導出した値を設定

**getRoomsForManagement()** (line 780-879)

- rooms.push() に `roomStatus`, `roomNotes` を追加
- `roomData[i][3]` → roomStatus, `roomData[i][4]` → roomNotes
- 後方互換推定: roomStatusが空欄の場合、inspection_dataの検針不要/請求不要から推定
  - `検針不要 = 'true'` → `skip`
  - `請求不要 = '●'` → `owner` または `fixed`（部屋マスタ優先、デフォルト`owner`）
  - 両方なし → `normal`

**updateInspectionData()** (line 926-1035)

- params に `roomStatus`, `roomNotes` を追加で受け取る
- 部屋マスタの4列目・5列目を更新
- **PWA互換ロジック**:

```javascript
var flags;
if (params.roomStatus) {
  // 管理画面からの呼び出し（新方式）
  flags = deriveFlagsFromStatus(params.roomStatus);
} else {
  // PWAからの従来呼び出し（旧方式）
  flags = {
    inspectionSkip:
      params.inspectionSkip === true || params.inspectionSkip === 'true' ? 'true' : '',
    billingSkip: params.billingSkip === true || params.billingSkip === 'true' ? '●' : '',
  };
}
// inspection_data の検針不要/請求不要列に flags を書き込み
```

#### api_data_functions.js

**\_applyInspectionStatus()** (line 273-399) — **重要変更**

この関数は `_getRoomsImpl()` 内で部屋データにステータスを付与する。現在は inspection_data のみ読んでいるが、room_master も読むよう変更:

```javascript
// 追加: room_master からステータス情報を取得
var roomMasterSheet = ss.getSheetByName('部屋マスタ');
var roomMasterHeaders = roomMasterSheet
  .getRange(1, 1, 1, roomMasterSheet.getLastColumn())
  .getValues()[0];
var statusColIdx = roomMasterHeaders.indexOf('部屋ステータス');
var notesColIdx = roomMasterHeaders.indexOf('備考');
var roomMasterData = roomMasterSheet.getDataRange().getValues();

// 物件ID+部屋ID をキーにした statusMap を構築
var statusMap = {};
for (var i = 1; i < roomMasterData.length; i++) {
  var rPropertyId = roomMasterData[i][0];
  var rRoomId = roomMasterData[i][1];
  var rStatus = statusColIdx >= 0 ? roomMasterData[i][statusColIdx] : '';
  var rNotes = notesColIdx >= 0 ? roomMasterData[i][notesColIdx] : '';
  statusMap[rPropertyId + '_' + rRoomId] = { status: rStatus || 'normal', notes: rNotes };
}
```

各 room オブジェクトに **両方** のフィールドを設定:

```javascript
// room_master から roomStatus を設定
var statusInfo = statusMap[room.propertyId + '_' + room.roomId];
room.roomStatus = statusInfo ? statusInfo.status : 'normal';
room.roomNotes = statusInfo ? statusInfo.notes : '';

// 従来の isNotNeeded も維持（旧PWA互換）
// roomStatus === 'skip' のみ isNotNeeded = true
room.isNotNeeded = room.roomStatus === 'skip';
```

**\_getRoomsImpl()** (line 95-264)

- 返却される Room オブジェクトに `roomStatus`, `roomNotes` が含まれるようになる
- `isNotNeeded`, `readingStatus`, `isCompleted` は**従来通り設定**（旧PWA互換）

#### web_app_admin_api.js

- updateInspectionData のバリデーションに roomStatus を追加
- 許可値: `normal`, `vacant`, `owner`, `fixed`, `skip`（空欄も許可 → `normal` 扱い）

#### setup_validation.js

- 部屋マスタの期待列に `部屋ステータス`, `備考` を追加
- `['物件ID', '物件名', '部屋ID', '部屋名', '検針不要']` → `['物件ID', '物件名', '部屋ID', '部屋名', '部屋ステータス', '備考']`
  ※ `検針不要` 列を削除してステータス/備考に置換（ステータスから自動導出するため）

---

### 1-3. Admin UI変更

#### property-management.js

**editInspectionForm** state 変更:

```javascript
// Before
editInspectionForm: {
  roomId: '', roomName: '',
  inspectionSkip: false, billingSkip: false,
  ...
}
// After
editInspectionForm: {
  roomId: '', roomName: '',
  roomStatus: 'normal', roomNotes: '',
  ...
}
```

**openInspectionEdit()** — roomStatus/roomNotes を設定:

- `room.roomStatus || 'normal'` を設定
- 後方互換: roomStatusがない場合、inspectionSkip/billingSkipから推定

**submitInspectionEdit()** — roomStatus/roomNotes を送信:

- params に `roomStatus`, `roomNotes` を送信
- `inspectionSkip`/`billingSkip` は送信しない

**toggleInspectionSkip/toggleBillingSkip 削除** — ステータスドロップダウンに置換

**新規メソッド: getStatusLabel(status), getStatusDescription(status)**

```javascript
getStatusLabel: function(status) {
  var labels = {
    normal: '🏠 通常入居中',
    vacant: '📭 空室',
    owner: '🔑 オーナー使用中',
    fixed: '💰 固定料金',
    skip: '🚫 検針不要'
  };
  return labels[status] || labels.normal;
},
getStatusDescription: function(status) {
  var descs = {
    normal: '通常どおり検針・請求を行います',
    vacant: '検針対象です（空室でも水が使われる場合があります）',
    owner: '検針対象ですが、請求はスキップされます',
    fixed: '検針対象ですが、請求はスキップされます（固定料金契約）',
    skip: '検針・請求ともにスキップされます'
  };
  return descs[status] || descs.normal;
}
```

#### index.html

**編集モーダル** (line ~2032-2078):

- 「検針不要」「請求不要」の2トグル → 「部屋ステータス」ドロップダウン + 「備考」テキスト入力
- ステータスに応じた説明文を自動表示
- CSP制約: `<select>` + `x-on:change="setFormProp('editInspectionForm', 'roomStatus', $event.target.value)"`

**展開表示テーブル**:

- 部屋名列の右にステータスバッジを表示（色分け）

---

### 1-4. PWA変更（Svelte 5）

#### src/types/index.ts

```typescript
// Room interface に roomStatus を追加（isNotNeeded は後方互換で残す）
export interface Room {
  id: string;
  name: string;
  propertyId: string;
  readingStatus: 'completed' | 'not-needed' | 'not-completed';
  isCompleted: boolean;
  readingDateFormatted: string | null;
  currentReading: number | null;
  previousReading: number | null;
  isNotNeeded: boolean; // 旧フィールド（後方互換）— 非推奨
  roomStatus: string; // 新フィールド: 'normal' | 'vacant' | 'owner' | 'fixed' | 'skip'
  roomNotes: string; // 新フィールド: 備考
}
```

#### src/components/MeterReading/hooks/useRoomNavigation.svelte.ts

```typescript
// NavigationRoom interface
interface NavigationRoom {
  id: string;
  roomStatus?: string; // 新規
  isNotNeeded?: boolean; // 旧（フォールバック）
}

// スキップ判定を変更（2箇所: line 64, 74）
// Before: if (room && room.isNotNeeded !== true)
// After:
function isSkipRoom(room: NavigationRoom): boolean {
  if (room.roomStatus !== undefined) {
    return room.roomStatus === 'skip';
  }
  return room.isNotNeeded === true;
}
```

#### src/components/RoomSelect/RoomSelectApp.svelte (8箇所)

**1. ヘルパー関数を追加**:

```typescript
function getRoomStatusInfo(room: Room) {
  // roomStatus を優先、なければ isNotNeeded からフォールバック
  let status = room.roomStatus || (room.isNotNeeded ? 'skip' : 'normal');
  const configs: Record<string, { icon: string; color: string; text: string; cssClass: string }> = {
    normal: { icon: 'circle', color: '#4caf50', text: '', cssClass: '' },
    vacant: { icon: 'vacation', color: '#ff9800', text: '空室', cssClass: 'status-vacant' },
    owner: { icon: 'key', color: '#2196f3', text: 'オーナー', cssClass: 'status-owner' },
    fixed: { icon: 'attach_money', color: '#9c27b0', text: '固定料金', cssClass: 'status-fixed' },
    skip: { icon: 'block', color: '#9e9e9e', text: '検針不要', cssClass: 'status-skip' },
  };
  return configs[status] || configs.normal;
}

function shouldSkipRoom(room: Room): boolean {
  if (room.roomStatus !== undefined) return room.roomStatus === 'skip';
  return room.isNotNeeded === true;
}
```

**2. 各箇所の変更マップ**:

| 行  | 現在                                           | 変更後                            |
| --- | ---------------------------------------------- | --------------------------------- |
| 152 | `room.isNotNeeded === true`                    | `shouldSkipRoom(room)`            |
| 220 | `room.isNotNeeded !== true`                    | `!shouldSkipRoom(room)`           |
| 366 | `r.isNotNeeded !== true`                       | `!shouldSkipRoom(r)`              |
| 368 | `r.isNotNeeded !== true`                       | `!shouldSkipRoom(r)`              |
| 370 | `r.isNotNeeded !== true`                       | `!shouldSkipRoom(r)`              |
| 399 | `r.isNotNeeded === true`                       | `shouldSkipRoom(r)`               |
| 436 | `isSkipInspection = room.isNotNeeded === true` | `getRoomStatusInfo(room)`         |
| 476 | `disabled={isSkipInspection}`                  | `disabled={shouldSkipRoom(room)}` |

**UI表示の拡張** (line 436-472):

- `statusIcon`/`statusColor`/`statusText`/`cardClasses` を `getRoomStatusInfo(room)` から取得
- 各ステータスに応じたアイコン・色・ラベル表示

#### src/styles/room_select.css

```css
/* 既存の status-skip はそのまま */
.room-card.status-skip {
  opacity: 0.5;
  background-color: #f5f5f5;
  pointer-events: none;
  cursor: not-allowed;
}
.room-card.status-skip .room-name {
  color: #9e9e9e;
  text-decoration: line-through;
}

/* 新規: その他ステータス（検針対象だが表示違い） */
.room-card.status-vacant {
  border-left: 3px solid #ff9800;
}
.room-card.status-owner {
  border-left: 3px solid #2196f3;
}
.room-card.status-fixed {
  border-left: 3px solid #9c27b0;
}

.room-card .status-badge {
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}
.room-card.status-vacant .status-badge {
  background: #fff3e0;
  color: #e65100;
}
.room-card.status-owner .status-badge {
  background: #e3f2fd;
  color: #0d47a1;
}
.room-card.status-fixed .status-badge {
  background: #f3e5f5;
  color: #6a1b9a;
}
```

#### テストファイル更新

**src/components/RoomSelect/**tests**/RoomSelectApp.svelte.test.js** (line 155):

```javascript
// Before: { id: 'r3', name: '103号室', isNotNeeded: true }
// After:  { id: 'r3', name: '103号室', isNotNeeded: true, roomStatus: 'skip' }
```

**src/components/MeterReading/hooks/**tests**/useRoomNavigation.test.js** (line 121):

```javascript
// Before: { id: 'room2', isNotNeeded: true }
// After:  { id: 'room2', isNotNeeded: true, roomStatus: 'skip' }
```

---

## Phase 2: 月次処理の保存月選択

### 2-1. Backend変更

#### data_management.js

**processInspectionDataMonthlyImpl** (line 589) — シグネチャ変更:

```javascript
// Before
function processInspectionDataMonthlyImpl(ss) {

// After
function processInspectionDataMonthlyImpl(ss, params) {
```

**月判定 (line 628-631)**:

```javascript
// Before
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

// After
var targetYear = params && params.targetYear;
var targetMonth = params && params.targetMonth;
if (!targetYear || !targetMonth) {
  var fallback = new Date();
  targetYear = fallback.getFullYear();
  targetMonth = String(fallback.getMonth() + 1).padStart(2, '0');
}
```

**generateProcessDetailedInfo** (line 1249) — 同様に targetYear/targetMonth パラメータ対応

**アーカイブ列に「部屋ステータス」を追加 (line 871)**:

```javascript
// Before
var columnsToCopy = [
  '記録ID',
  '物件名',
  '物件ID',
  '部屋ID',
  '部屋名',
  '検針日時',
  '警告フラグ',
  '標準偏差値',
  '今回使用量',
  '今回の指示数',
  '前回指示数',
  '前々回指示数',
  '前々々回指示数',
  '検針不要',
  '請求不要',
];

// After
var columnsToCopy = [
  '記録ID',
  '物件名',
  '物件ID',
  '部屋ID',
  '部屋名',
  '検針日時',
  '警告フラグ',
  '標準偏差値',
  '今回使用量',
  '今回の指示数',
  '前回指示数',
  '前々回指示数',
  '前々々回指示数',
  '検針不要',
  '請求不要',
  '部屋ステータス',
];
```

**アーカイブ行コピー時 (line 880-887)**: sourceHeaders に「部屋ステータス」がなければ room_master から補完して16列目に書き込む

**inspection_dataに「部屋ステータス」列を追加**:

- 新規の初期データ作成時 (`populateInspectionDataFromMasters`) に16列目として「部屋ステータス」を追加
- 月次リセット時も16列目の値は維持（ステータスはリセットしない）

#### web_app_admin_api.js

```javascript
// Before (line 41-43)
case 'executeMonthlyProcess':
  result = processInspectionDataMonthlyImpl(ss);
  break;

// After
case 'executeMonthlyProcess':
  result = processInspectionDataMonthlyImpl(ss, params);
  break;
```

### 2-2. Frontend変更

#### monthly-process.js

月選択UI state を追加:

```javascript
// 新規 state
monthlyTargetYear: new Date().getFullYear(),
monthlyTargetMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
```

月選択メソッド:

```javascript
setMonthlyTargetMonth: function(year, month) {
  self.monthlyTargetYear = year;
  self.monthlyTargetMonth = month;
},
```

executeMonthlyProcess の params に `targetYear`, `targetMonth` を追加

#### index.html

月次処理タブ内に月選択UIを追加:

- 年・月セレクトボックス
- 現在の月をデフォルト選択
- CSP制約: `<select>` + `x-on:change` で対応

---

## Phase 3: 年間レポート

### 3-1. Backend

#### 新規: getAnnualReport(params)

```javascript
function getAnnualReport(params) {
  var propertyId = params.propertyId;
  var year = params.year; // e.g. 2026
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. アーカイブシートを検索: "検針データ_2026年04月" ... "検針データ_2027年03月"
  // 2. 各月のシートから該当物件の部屋データを抽出
  //    - 16列目(部屋ステータス)があればそれを使用（各月のその時点のステータス）
  //    - 16列目がなければ部屋マスタの現在ステータスを使用（旧アーカイブ互換）
  // 3. 月別データを構造化して返す
}
```

戻り値:

```json
{
  "success": true,
  "data": {
    "propertyName": "ABCマンション",
    "year": 2026,
    "months": [
      { "month": 4, "label": "4月" },
      { "month": 5, "label": "5月" }
    ],
    "rooms": [
      {
        "roomId": "R001",
        "roomName": "101",
        "roomStatus": "normal",
        "roomNotes": "",
        "monthlyData": [
          { "month": 4, "reading": 120, "usage": 5, "warningFlag": "正常", "roomStatus": "normal" },
          { "month": 5, "reading": 125, "usage": 5, "warningFlag": "正常", "roomStatus": "normal" }
        ]
      }
    ],
    "availableYears": [2025, 2026]
  }
}
```

#### web_app_admin_api.js

```javascript
case 'getAnnualReport':
  result = getAnnualReport(params);
  break;

case 'getAvailableYears':
  result = getAvailableYears(params);
  break;
```

### 3-2. Frontend

#### property-management.js

新規 state:

```javascript
annualReport: null,
annualReportYear: null,
annualReportLoading: false,
annualAvailableYears: [],
```

新規メソッド:

- `loadAnnualReport()` — API呼び出し
- `getCellStyle(monthData, room)` — ステータス+使用量からCSS class返す:
  - `skip` → 斜線 (`background: repeating-linear-gradient(...)`)
  - `owner` → 薄緑 `#e3f2e8`
  - `fixed` → 薄黄 `#fef9e7`
  - `vacant` + 使用量0 → 薄灰 `#f5f5f5`
  - `normal` → 白
- `printAnnualReport()` — `window.print()`

#### index.html

ビュー切替:

```
展開表示 | 一括確認 | 年間レポート
```

年間レポートHTML:

- 年度セレクタ (ドロップダウン)
- 印刷ボタン
- 凡例 (5色 + 斜線)
- 12ヶ月テーブル (colgroup固定幅)
  - ヘッダー: 部屋 | ステータス | 4月 | ... | 3月
  - 各セル: 指示数 + 使用量 + 背景色クラス

印刷用CSS:

```css
@media print {
  .sidebar,
  .tab-content:not(.annual-report-view) {
    display: none !important;
  }
  .annual-report-view {
    display: block !important;
  }
  @page {
    size: landscape;
  }
}
```

---

## 実装順序

```
Step 1: Backend Phase 1 — 部屋ステータス基盤
  ├─ Config.js: STATUS/NOTES 追加
  ├─ deriveFlagsFromStatus() 新規
  ├─ addRoom() 更新
  ├─ getRoomsForManagement() 更新
  ├─ updateInspectionData() 更新
  ├─ _applyInspectionStatus() 更新（room_master 読み込み + roomStatus/isNotNeeded 両返却）
  └─ setup_validation.js 更新

Step 2: PWA Phase 1 — roomStatus マイグレーション
  ├─ src/types/index.ts: roomStatus/roomNotes 追加
  ├─ useRoomNavigation.svelte.ts: shouldSkipRoom() ヘルパー
  ├─ RoomSelectApp.svelte: getRoomStatusInfo() + 8箇所置換
  ├─ room_select.css: 4ステータス分のスタイル追加
  └─ テスト更新 (2ファイル)

Step 3: Admin UI Phase 1 — ステータス管理画面
  ├─ property-management.js: state/メソッド更新
  ├─ index.html: モーダル更新 (トグル→ドロップダウン)
  └─ ビルド確認

Step 4: Backend Phase 2 — 月次処理月選択
  ├─ data_management.js: targetYear/targetMonth params + アーカイブ列追加
  ├─ web_app_admin_api.js: params スルー
  └─ inspection_data 16列目（部屋ステータス）対応

Step 5: Admin UI Phase 2 — 月次処理月選択
  └─ monthly-process.js + index.html: 月選択UI

Step 6: Backend Phase 3 — 年間レポート
  ├─ getAnnualReport() 新規
  └─ web_app_admin_api.js ルーティング追加

Step 7: Admin UI Phase 3 — 年間レポート
  ├─ property-management.js: state/メソッド/ビュー追加
  ├─ index.html: テーブル・CSS・印刷対応
  └─ ビルド確認
```

---

## 影響範囲

### 変更ファイル一覧

| ファイル                                                        | Phase | 変更内容                                                          |
| --------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| `Config.js`                                                     | 1     | ROOM_MASTER_COLS に STATUS/NOTES 追加                             |
| `property_management.js` (backend)                              | 1     | addRoom/getRooms/updateInspection + deriveFlagsFromStatus         |
| `api_data_functions.js`                                         | 1     | \_applyInspectionStatus に room_master 読み込み + roomStatus 追加 |
| `setup_validation.js`                                           | 1     | 部屋マスタ期待列更新                                              |
| `web_app_admin_api.js`                                          | 1,2,3 | ルーティング追加・変更                                            |
| `data_management.js`                                            | 2     | targetMonth params + アーカイブ16列目 + inspection_data 16列目    |
| `src/types/index.ts`                                            | PWA   | Room interface に roomStatus/roomNotes 追加                       |
| `src/components/MeterReading/hooks/useRoomNavigation.svelte.ts` | PWA   | shouldSkipRoom() ヘルパー                                         |
| `src/components/RoomSelect/RoomSelectApp.svelte`                | PWA   | getRoomStatusInfo() + 8箇所置換                                   |
| `src/styles/room_select.css`                                    | PWA   | 4ステータスCSS追加                                                |
| `src/components/RoomSelect/__tests__/...`                       | PWA   | テストモック更新                                                  |
| `src/components/MeterReading/hooks/__tests__/...`               | PWA   | テストモック更新                                                  |
| `property-management.js` (admin-ui)                             | 1,3   | state/メソッド/ビュー追加                                         |
| `monthly-process.js` (admin-ui)                                 | 2     | 月選択UI state/メソッド                                           |
| `index.html` (admin-ui)                                         | 1,2,3 | モーダル・ビュー・CSS変更                                         |
| `admin.html`                                                    | all   | ビルド成果物                                                      |

### 後方互換性

- **部屋マスタ4列目空欄** → `normal` (通常入居中) として扱う
- **PWA旧キャッシュ版**: `roomStatus` が undefined → `isNotNeeded` にフォールバック → 従来通り動作
- **PWA新バージョン**: `roomStatus` を優先使用、`isNotNeeded` は無視
- **管理画面 → updateInspectionData**: `roomStatus` あり → ステータスから自動導出
- **PWA → updateInspectionData**: 従来の `inspectionSkip`/`billingSkip` をそのまま使用（PWA側はステータス変更UIなし）
- **月次処理 params 未指定** → 従来通り `new Date()` を使用（GASメニュー実行対応）
- **旧アーカイブ（16列目なし）** → 部屋マスタの現在ステータスで表示

### GASデプロイ手順 (手動)

1. ライブラリ側ファイルを保存
2. ライブラリの新バージョンを作成
3. クライアント側でライブラリ参照のバージョン更新
4. PWAをビルド・デプロイ
5. admin.html をデプロイ
6. 動作確認（管理画面 + PWA）
