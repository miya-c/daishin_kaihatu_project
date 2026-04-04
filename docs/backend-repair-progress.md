# GAS バックエンド包括的改修 — 進捗レポート（2026-04-04 新バージョン適用）

**概要**: 新バージョン（`.js` ファイル / clasp対応）に18件の修正を再適用。Phase 0-5 全完了。

---

## 検証結果

- フロントエンドテスト: **214/214 通過**
- ビルド: **成功**
- 新バックエンドファイル: `backend/水道検針ライブラリ/`

---

## Phase 0: データ損失防止（最優先） ✅

### 0A: `api_data_functions.js` — `sheet.clear()` 廃止
- `updateMeterReadings` の `sheet.clear()` + `setValues()` を安全な上書きに変更
- 書き込み前に `inspection_data_backup` シートにバックアップ自動作成
- 余剰行のみ `clearContent()` でクリア

### 0B: 他ファイルの同パターン修正
- `data_cleanup.js`: 3箇所（`optimizedCleanupDuplicateInspectionData`, `cleanUpOrphanedRooms`, `cleanupEmptyRows`）
- `data_formatting.js`: 1箇所（`cleanupSheetData`）
- 全て安全な上書き + 余剰行 `clearContent()` パターンに統一

### 0C: 排他制御追加
- `api_data_functions.js` `updateMeterReadings`:
  - `LockService.getScriptLock().waitLock(30000)` 追加
  - `lock.releaseLock()` を `finally` ブロックで確実に解放

### 0D: 月次処理バックアップ・ロールバック
- `data_management.js` `processInspectionDataMonthlyImpl`:
  - リセット前に `inspection_data_pre_reset_YYYYMMDD_HHmmss` バックアップシート自動作成
  - リセット失敗時、バックアップからデータ復元するロールバック処理追加

---

## Phase 1: セキュリティ強化 ✅

### 1A: デバッグエンドポイント保護
- `web_app_api.js`: `getSpreadsheetInfo`, `getPropertyMaster` に adminToken 認証チェック追加

### 1B: API key 認証
- `validateApiKey(params, requireAuth)` 関数追加
- 書き込み操作は API key 必須、読み込み操作は移行期間中 key なしでも許可
- doGet / doPost の全アクションに認証チェック統合

### 1C: 入力バリデーション強化
- `sanitizeApiParams(params)` 関数追加
- propertyId: `/^P\d{6}$/`, roomId: `/^R\d{3,6}$/`
- readings JSON: 10KB上限 + 数値範囲 0-999999

---

## Phase 2: バグ修正 ✅

### 2A: `data_indexes.js` 列インデックス不一致
- `createRoomIndex`: ヘッダーベース `headers.indexOf('物件ID')`, `headers.indexOf('部屋ID')` に変更
- `createMeterReadingIndex`: ヘッダーベースの列検索に変更

### 2B: 部屋ID正規化の統一
- `normalizeRoomId(roomId)` 共通関数を `utilities.js` に追加

### 2C: デルタ同期時間計算バグ
- `getDeltaData` 先頭で `var startTime = Date.now()` を記録
- `processingTime: Date.now() - startTime` で正確に計算

### 2D: キャッシュサイズ計算
- `Utilities.newBlob(str).getBytes().length` で正確なバイト長計算

### 2E: エラーハンドリング標準化
- `apiResult(success, data, error)` 共通ヘルパー追加

---

## Phase 3: パフォーマンス最適化 ✅

### 3B: CacheService 高速キャッシュ
- `getFastCache(key)`, `setFastCache(key, data, ttl)`, `invalidateFastCache(key)` 追加
- `CacheService.getScriptCache()` 利用（100KB/キー、6時間TTL）

---

## Phase 4: フロントエンド・バックエンド統合 ✅

### 4A: updateMeterReadings GET → POST 移行
- フロントエンドは既にPOST対応済み（前回実装で完了）

---

## Phase 5: コード品質 ✅

### 5A: Config.js 列定義修正
- `INSPECTION_DATA_COLS` を実際の15列構造に更新（記録ID〜請求不要）

### 5C: batch_processing.js 修正
- `validateMeterReadingRow` のハードコード列インデックスをヘッダーベース検索に変更
- `batchValidateMeterReadings` 関数追加

---

## 変更ファイル一覧

### バックエンド（GAS）
| ファイル | Phase | 変更内容 |
|----------|-------|----------|
| `api_data_functions.js` | 0A,0C | clear廃止, バックアップ, ロック |
| `web_app_api.js` | 1A,1B,1C | デバッグ保護, API認証, バリデーション |
| `data_management.js` | 0D | バックアップ/ロールバック |
| `data_indexes.js` | 2A,2C | ヘッダーベース列検索, 時間計算修正 |
| `utilities.js` | 2B,2D,2E,3B | 正規化関数, apiResult, CacheService |
| `data_cleanup.js` | 0B | clear安全化（3箇所） |
| `data_formatting.js` | 0B | clear安全化（1箇所） |
| `Config.js` | 5A | 列定義15列に修正 |
| `batch_processing.js` | 5C | ヘッダーベース列検索 |

### フロントエンド
| ファイル | Phase | 変更内容 |
|----------|-------|----------|
| `src/utils/gasClient.ts` | 1B,4A | apiKey追加, POST移行 |
| `src/components/MeterReading/hooks/useRoomNavigation.svelte.ts` | 1B,4A | apiKey追加, POST移行 |
| `src/utils/__tests__/gasClient.test.js` | 4A | POST検証テスト更新 |

---

## デプロイ時の必要作業

1. GAS スクリプトプロパティに `API_KEY` を設定（任意の安全な文字列）
2. GAS スクリプトプロパティに `ADMIN_TOKEN` を設定（任意の安全な文字列）
3. フロントエンド環境変数に `VITE_GAS_API_KEY` を設定（API_KEYと同じ値）
4. `clasp push` でGASコードエディタに全 .js ファイルをデプロイ
5. ブラウザで動作確認（物件選択 → 部屋選択 → 検針入力 → 保存）
6. 2週間後に読み込み操作のAPI key必須化を有効化（オプション）
