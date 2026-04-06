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

### 新規ファイル: `src/utils/offlineQueue.ts`

- `saveToQueue(entry)`: オフライン時の保存データをキューに追加
- `processQueue()`: オンライン復帰時にキューを一括処理
- `getQueueStatus()`: キューの件数を返す
- `clearQueue()`: キューをクリア

### 夃細仕様

- キューは保存先: `localStorage` (`offline_readings_queue`)
- 各エントリ: `{ id, propertyId, roomId, readings, timestamp, type }`
- `type`: `'save' | 'complete'`

### 夤連携

| ファイル                      | 変更内容                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| `gasClient.ts`                | `gasFetch` にオフライン判定追加、 保存失敗→ `saveToQueue()` 呼び出し |
| `useRoomNavigation.svelte.ts` | `saveAndNavigate` にオフライン判定追加                               |
| `useMeterReadings.svelte.ts`  | `loadMeterReadings` にキャッシュフォールバック追加                   |
| `MeterReadingApp.svelte`      | オフラインバナー表示 + 同期リスナー追加                              |

---

## Phase 2: UI改善（優先度: 高）

- **オフラインバナー**: 「オフライン中・データはローカルに保存します"表示
- **保存ボタン**: オフライン時のラベルを "オフラインで保存" に変更
- **前/次ナビ**: オフライン時もローカルナビゲーション可能に
- **トースト**: "保存しました（オンライン復帰時に自動送信します）" 表示
- **NetworkStatusBar**: 同期中表示追加
- **部屋一覧**: オフライン時にキャッシュされたデータを表示
- **検針完了ボタン**: オフライン時はキュー保存に変更

---

## Phase 3: Service Worker改善（優先度: 中）

- **Background Sync**: `sync` イベントリスナー追加
- **同期タグ**: `offline-sync`
- **`manifest.json`**: `scope` にオフライン対応篚追加

---

## Phase 4: テスト追加（優先度: 中）

- `offlineQueue.test.ts`: キューのCRUD/処理/同期テスト
- `gasClient.test.ts`: オフラインフォールバックテスト追加
- `useRoomNavigation.test.js`: オフラインナビゲーションテスト追加

- CI通過確認: `vitest run` + `svelte-check`

---

## Phase 5: バックエンド対応（優先度: 低）

- **`saveAndNavigate` API**: `validateApiKey` 認証追加（既に対応済み）
- **新規API**: `batchUpdateReadings`（キューの一括処理用、オプション）
