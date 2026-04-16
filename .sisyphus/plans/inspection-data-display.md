# 検針データ表示機能 実装計画

## 概要

モックで合意したA+Cハイブリッドデザイン（展開表示＋一括確認切替）を本番実装する。
物件管理タブの部屋テーブルに検針データ（指示数、使用量、標準偏差等）を表示し、
編集モーダルで部屋マスタ＋検針データの両方を編集可能にする。

---

## Phase 1: バックエンド拡張（GAS）

### 1-1. `getRoomsForManagement()` の戻り値拡張

**ファイル**: `backend/水道検針ライブラリ/property_management.js` (L526-583)

**現状の戻り値**:

```js
{ propertyId, roomId, roomName, hasInspectionResult: true/false }
```

**変更後の戻り値**:

```js
{
  propertyId: "P000001",
  roomId: "R001",
  roomName: "101号室",
  hasInspectionResult: true,
  // 追加フィールド（検針済みの場合のみ値あり）
  readingDate: "2026/04/14",        // Col 6: 検針日時
  warningFlag: "正常",              // Col 7: 警告フラグ
  standardDeviation: 2,             // Col 8: 標準偏差値（整数）
  usage: 5,                         // Col 9: 今回使用量（整数）
  currentReading: 1234,             // Col 10: 今回の指示数
  previousReading: 1229,            // Col 11: 前回指示数
  previousReading2: 1220,           // Col 12: 前々回指示数
  previousReading3: 1215,           // Col 13: 前々々回指示数
  inspectionSkip: "",               // Col 14: 検針不要
  billingSkip: "",                  // Col 15: 請求不要
}
```

**実装内容**:

- Pass 2のループ（L562-575）で `hasInspectionResult = true` にしている箇所を拡張
- `headers.indexOf()` で各列のインデックスを取得（既存パターンに従う）
- 各列の値を `safeValue()` でラップ（Date シリアライズ対策）
- 数値列は `parseInt()` で整数化
- 検針不要・請求不要は真偽値として正規化

### 1-2. `updateInspectionData()` アクション追加

**ファイル**: `backend/水道検針ライブラリ/property_management.js`

**機能**: 編集モーダルからの保存に対応

```js
function updateInspectionData(params) {
  // params: { propertyId, roomId, roomName, currentReading, previousReading, inspectionSkip, billingSkip }
  // 1. 部屋マスタの部屋名更新（変更がある場合）
  // 2. inspection_data該当行の指示数・検針不要・請求不要を更新
  // 3. 使用量(Col 9)は数式で自動再計算されるため更新不要
  //    標準偏差(Col 8)も数式で自動再計算
}
```

**adminDispatchルーティング追加**:
**ファイル**: `backend/水道検針ライブラリ/web_app_admin_api.js`

- `case 'updateInspectionData':` を追加

### 1-3. クライアント側ラッパー

**ファイル**: `gas_scripts/library_client.gs`

- `adminAction` の switch に `updateInspectionData` ケースを追加（不要な場合は `adminDispatch` 経由で自動ルーティング）

---

## Phase 2: フロントエンド実装（Alpine.js + Bulma）

### 2-1. コンポーネント状態拡張

**ファイル**: `admin-ui/src/components/property-management.js`

**追加するリアクティブプロパティ**:

```js
viewMode: 'expand',           // 'expand' | 'bulk'
sortState: { key: null, dir: null },
editInspectionForm: {          // 検針データ編集フォーム
  roomId: '',
  roomName: '',
  currentReading: '',
  previousReading: '',
  inspectionSkip: false,
  billingSkip: false,
  hasInspectionData: false,    // モーダルの検針データセクション表示制御
},
```

**追加するメソッド**:

```js
switchView(mode); // 展開/一括切替
toggleRoomExpand(roomId); // 行展開/閉じる
sortBy(key); // ヘッダークリックソート（3段階トグル）
getSortedRooms(); // ソート済み部屋リスト返却
getSummaryCards(); // サマリーカード用の集計（総数/済/未/警告/完了率）
openInspectionEdit(room); // 編集モーダル表示（部屋マスタ+検針データ）
submitInspectionEdit(); // 編集保存 → callAdminAPI('updateInspectionData')
getUsageTrend(room); // 使用量推移データ返却（3ヶ月分）
```

### 2-2. テンプレート実装

**ファイル**: `admin-ui/index.html`

**現在の部屋テーブル（L616-671）を新デザインに置換**:

1. **サマリーカード**（5枚: 総部屋数/検針済み/未検針/警告/完了率）
2. **ビュー切替トグル**（展開表示 | 一括確認）
3. **展開表示ビュー**:
   - ヘッダー: チェvron | 部屋名 | 検針実績 | 検針日 | 今回 | 前回 | 使用量 | 平均 | 操作
   - 行クリックで展開 → 詳細テーブル（8列）+ 使用量推移バー
   - ソート機能
4. **一括確認ビュー**:
   - フラットテーブル（11列）: 部屋名〜使用量推移
5. **編集モーダル**:
   - 部屋マスタ: 部屋名、検針不要トグル
   - 検針データ（検針済みのみ表示）: 今回指示数、前回指示数、請求不要トグル

### 2-3. CSP制約対応

- ES5 `function()` 構文を維持（アロー関数禁止）
- `typeof`、`window`、`&&` は使用禁止（CSPパーサーでブロック）
- Alpine.js CSPビルドの `x-data`、`x-show`、`x-on:click` 等を使用

---

## Phase 3: ビルド・デプロイ

### 3-1. ビルド

```bash
cd admin-ui && npm run build
cp dist/index.html ../backend/水道検針ライブラリ/admin.html
```

### 3-2. GASデプロイ手順

1. ライブラリ側のファイル変更を保存
2. ライブラリの新バージョンを作成
3. クライアント側でライブラリ参照のバージョン更新
4. Web Appの新バージョンデプロイ

---

## 実装順序（並列化可能）

```
Phase 1-1 (getRoomsForManagement拡張)  ← 先行
    ↓
Phase 1-2 (updateInspectionData追加)   ← 1-1と並列可
    ↓
Phase 2-1 (コンポーネント状態拡張)      ← 1-1完了後
Phase 2-2 (テンプレート実装)            ← 2-1と並列可
    ↓
Phase 2-3 (CSP制約確認)
    ↓
Phase 3 (ビルド・デプロイ)
```

---

## 制約・注意事項

- 指示数は**整数のみ**（小数不可）
- 標準偏差値は**整数**（数式で計算）
- 使用量は**整数**（数式で計算）
- `safeValue()` でDate→ISO string変換（google.script.run対策）
- CacheServiceは使用しない
- 全通信GET統一（POSTは使用しない）
- ADMIN_TOKENはクライアント側のみ
