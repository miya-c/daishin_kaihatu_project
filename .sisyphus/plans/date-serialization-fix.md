# Date シリアライズ脆弱性 改修計画

## 背景

`google.script.run` は Date オブジェクトをシリアライズできず、**戻り値全体が null になる**。
物件管理タブの「物件一覧の取得に失敗しました」エラーは `getProperties()` の `検針完了日` 列に Date オブジェクトが含まれていたことが根本原因。
同じパターンが他の関数にも存在するため、一括で改修する。

## 分類基準

| 経路                                       | シリアライザ | Date対応                        |
| ------------------------------------------ | ------------ | ------------------------------- |
| `google.script.run`（管理画面）            | GAS独自      | ❌ Date → **戻り値全体が null** |
| `ContentService` + `JSON.stringify`（PWA） | JSON標準     | ✅ Date → ISO string            |

→ **管理画面から呼ばれる関数は全て Date を string に変換する必要がある**

---

## Step 1: 共通ヘルパー追加

**ファイル**: `backend/水道検針ライブラリ/utilities.js`

`safeValue()` 関数を追加。スプレッドシートのセル値を `google.script.run` 安全な値に変換する。

```javascript
function safeValue(val) {
  if (val instanceof Date) return val.toISOString();
  return val;
}
```

## Step 2: 必須改修（管理画面経路）

### 2-1. `api_data_functions.js` — `getProperties()` ✅ 完了済み

L68-78: `instanceof Date` チェック追加済み。

### 2-2. `api_data_functions.js` — `_getRoomsImpl()`

**行**: L209-211

**経路**: `adminDispatch` → `getRooms` → `_getRoomsImpl()` → `google.script.run`

**現在**:

```javascript
lightFields.forEach((field) => {
  if (fieldIndexes[field] !== undefined) {
    room[field] = row[fieldIndexes[field]];
  }
});
```

**修正**:

```javascript
lightFields.forEach((field) => {
  if (fieldIndexes[field] !== undefined) {
    room[field] = safeValue(row[fieldIndexes[field]]);
  }
});
```

**リスク**: 低。現在の `lightFields` は `['部屋ID', '部屋名']` のみだが、設定変更でDate列が含まれる可能性があるため予防的修正。

### 2-3. `api_data_functions.js` — `getMeterReadings()`

**行**: L487-489

**経路**: 現在は管理画面から未呼び出しだが、PWAのナビゲーション経由で使用。
将来的に管理画面から呼ばれる可能性がある。

**現在**:

```javascript
headers.forEach(function (header, index) {
  reading[header] = row[index];
});
```

**修正**:

```javascript
headers.forEach(function (header, index) {
  reading[header] = safeValue(row[index]);
});
```

**リスク**: 低。`ContentService` 経路では `JSON.stringify` がDateをISO stringに変換するため、`safeValue` を通しても結果は同じ。

## Step 3: 推奨改修（将来予防）

### 3-1. `data_indexes.js` — `createPropertyIndex()`

**行**: L38-39

**現在**:

```javascript
headers.forEach((header, index) => {
  propertyIndex[propertyId].data[header] = row[index];
});
```

**修正**:

```javascript
headers.forEach((header, index) => {
  propertyIndex[propertyId].data[header] = safeValue(row[index]);
});
```

### 3-2. `data_indexes.js` — `createRoomIndex()`

**行**: L95-96

同パターンの修正。

### 3-3. `data_indexes.js` — `createMeterReadingIndex()`

**行**: L161-163

同パターンの修正。

### 3-4. `data_indexes.js` — `createAllIndexes()`

**行**: L228

**現在**: `created: new Date()`
**修正**: `created: new Date().toISOString()`

## Step 4: 対応不要（安全確認済み）

| 関数                        | ファイル               | 理由                                           |
| --------------------------- | ---------------------- | ---------------------------------------------- |
| `buildAdminDashboardData()` | web_app_admin_api.js   | Dateを真偽値チェックのみ使用、戻り値に含まない |
| `getRoomsForManagement()`   | property_management.js | Dateを真偽値チェックのみ、戻り値に含まない     |
| `_applyInspectionStatus()`  | api_data_functions.js  | Dateをフォーマット済み文字列に変換してから返す |
| `preCheckMonthlyProcess()`  | data_management.js     | 要確認だが、数値・文字列のみの可能性高い       |

---

## 実行順序

1. `utilities.js` に `safeValue()` 追加
2. `_getRoomsImpl()` に `safeValue()` 適用（必須）
3. `getMeterReadings()` に `safeValue()` 適用（必須）
4. `data_indexes.js` の4箇所に適用（推奨）
5. `getProperties()` の既存の `instanceof Date` チェックを `safeValue()` に統一（リファクタリング）

## 影響範囲

- `safeValue()` は新しい関数追加のみ。既存コードへの副作用なし。
- 全修正は「値の読み取り→戻り値への格納」部分のみ。書き込みロジックには影響しない。
- `ContentService` 経路では `JSON.stringify` がDateを正しく変換するため、`safeValue` を通しても動作に影響なし。

## デプロイ手順

1. ライブラリGASの該当ファイルを更新
2. ライブラリの新しいバージョンを作成
3. クライアントGASでライブラリ参照を更新
4. クライアントGASのWeb Appも新バージョンでデプロイ
