# オフライン対応改修計画

## 概要

水道メーター検針PWAのオフライン対応を強化する。現場環境（地下・地下室・山間部など）で電波が届かないケースを想定し、オフライン時でも検針入力が完了できるようにする。

## 目標

検針員がオフライン時も検針入力を完了でき、オンライン復帰時にデータが自動送信されること。

## 現状のオフライン対応

| 項目                        | 状態                               |
| --------------------------- | ---------------------------------- |
| アプリページ（HTML/CSS/JS） | ✅ Service Workerでキャッシュ済み  |
| ネットワーク状態表示        | ✅ NetworkStatusBarコンポーネント  |
| 保存ボタンの無効化          | ✅ `!navigator.onLine` で制御      |
| 検針データの読み込み        | ❌ オフライン時はAPIエラー         |
| 検針データの保存            | ❌ オフライン時は不可              |
| 前/次ナビゲーション         | ❌ `saveAndNavigate` API依存で不可 |

---

## Phase 1: オフライン保存キュー（優先度: 高）

### 1.1 新規ファイル: `src/utils/offlineQueue.ts`

保存失敗時のデータを `localStorage` にキューイングするユーティリティ。

**機能:**

- `saveToQueue(entry)`: オフライン時の保存データをキューに追加
- `processQueue()`: オンライン復帰時にキューを一括処理
- `getQueueStatus()`: キューの件数と保留中データの概要を返す
- `clearQueue()`: 送信完了後にキューをクリア

**キューエントリの構造:**

```typescript
interface QueueEntry {
  id: string;
  timestamp: number;
  action: 'updateMeterReadings' | 'completeInspection';
  propertyId: string;
  roomId: string;
  readings?: Record<string, unknown>[];
  completionDate?: string;
}
```

**保存先:** `localStorage` キー `offlineQueue`

### 1.2 変更: `src/utils/gasClient.ts`

- `gasFetch` のラッパー関数 `gasFetchWithQueue` を追加
- ネットワークエラー時に自動で `saveToQueue()` を呼び出す
- 成功時はキューから該当エントリを削除

### 1.3 変更: `src/components/MeterReading/hooks/useRoomNavigation.svelte.ts`

- `saveAndNavigateToRoom` を書き換え
- `!navigator.onLine` の場合:
  1. 現在の部屋のデータを `sessionStorage` に保存
  2. 次の部屋のデータを `sessionStorage` キャッシュから読み込み
  3. ナビゲーション実行（API呼び出しなし）
- オンライン復帰時にキャッシュされた変更を一括送信

### 1.4 変更: `src/components/MeterReading/hooks/useMeterReadings.svelte.ts`

- `loadMeterReadings` にオフラインフォールバック追加
- API失敗時に `sessionStorage` キャッシュからデータを返す

---

## Phase 2: オフライン時の部屋移動（優先度: 高）

### 2.1 物件選択時の事前ダウンロード

物件選択時に全部屋の検針データを一括取得し、`sessionStorage` にキャッシュする。

**変更ファイル:**

- `backend/水道検針ライブラリ/web_app_api.js`: `getAllRoomReadings` アクション追加
- `backend/水道検針ライブラリ/api_data_functions.js`: 一括取得関数追加
- `src/components/RoomSelect/RoomSelectApp.svelte`: 物件選択時に一括取得をトリガー
- `src/utils/gasClient.ts`: `fetchAllRoomReadings` 追加

### 2.2 ローカルナビゲーション

前/次ボタン押下時にオフラインの場合、`saveAndNavigate` APIを使わずに:

1. 現在の入力値を `sessionStorage` に保存
2. 次の部屋のキャッシュデータを読み込み
3. 画面遷移

---

## Phase 3: Service Worker改善（優先度: 中）

### 3.1 変更: `src/sw/service-worker.js`

- Background Sync API の `sync` イベントリスナー追加
- タグ: `offline-queue-sync`
- オンライン復帰時に自動で `processQueue()` を実行

### 3.2 変更: `manifest.json`

- `scope` を追加してService Workerの動作範囲を明確化

---

## Phase 4: UI/UX調整（優先度: 中）

### 4.1 オフライン中表示

| 箇所           | 変更内容                                                   |
| -------------- | ---------------------------------------------------------- |
| ヘッダーバナー | オフライン中（赤）「オフライン中・保存は後で送信されます」 |
| ヘッダーバナー | 保留データあり（黄）「〇件の保存データが保留中」           |
| ヘッダーバナー | 同期中（青）「データを同期中...」                          |
| FAB保存ボタン  | オフライン時のラベルを「オフラインで保存」に変更           |
| トースト       | 保存時に「保存しました（オンライン時に自動送信します）」   |
| トースト       | 復帰時に「〇件のデータを同期しました」                     |

### 4.2 変更ファイル

- `src/components/NetworkStatusBar.svelte`: 同期中表示を追加
- `src/components/MeterReading/MeterReadingApp.svelte`: オフライン判定ロジック追加
- `src/components/RoomSelect/RoomSelectApp.svelte`: 物件選択時の一括取得UI

---

## Phase 5: テスト・検証（優先度: 高）

### 5.1 新規テストファイル

- `src/utils/__tests__/offlineQueue.test.ts`: キューのCRUD操作テスト
- `src/components/MeterReading/hooks/__tests__/offlineNavigation.test.ts`: オフライン時のナビゲーションテスト

### 5.2 既存テストの更新

- `gasClient.test.ts`: オフライン時のフォールバックテスト追加
- `useRoomNavigation.test.ts`: オフラインナビゲーションのテスト追加

---

## 対象ファイル一覧

### 新規ファイル

| ファイル                    | 用途                     |
| --------------------------- | ------------------------ |
| `src/utils/offlineQueue.ts` | オフライン保存キュー管理 |

### 変更ファイル

| ファイル                                                        | 変更内容                     |
| --------------------------------------------------------------- | ---------------------------- |
| `src/utils/gasClient.ts`                                        | オフラインフォールバック追加 |
| `src/components/MeterReading/hooks/useRoomNavigation.svelte.ts` | ローカルナビゲーション対応   |
| `src/components/MeterReading/hooks/useMeterReadings.svelte.ts`  | キャッシュフォールバック追加 |
| `src/components/MeterReading/MeterReadingApp.svelte`            | オフラインUI対応             |
| `src/components/NetworkStatusBar.svelte`                        | 同期中表示追加               |
| `src/components/RoomSelect/RoomSelectApp.svelte`                | 一括取得トリガー             |
| `src/sw/service-worker.js`                                      | Background Sync対応          |
| `manifest.json`                                                 | scope追加                    |
| `backend/水道検針ライブラリ/web_app_api.js`                     | 一括取得API追加              |
| `backend/水道検針ライブラリ/api_data_functions.js`              | 一括取得関数追加             |

---

## 想定スケジュール

| Phase    | 期間       | 内容                            |
| -------- | ---------- | ------------------------------- |
| Phase 1  | 2-3日      | オフライン保存キュー            |
| Phase 2  | 2-3日      | 事前ダウンロード + ローカルナビ |
| Phase 3  | 1日        | Service Worker改善              |
| Phase 4  | 1-2日      | UI/UX調整                       |
| Phase 5  | 1-2日      | テスト・検証                    |
| **合計** | **7-11日** |                                 |
