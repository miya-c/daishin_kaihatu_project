# PWAクライアント改善計画

> **ステータス**: 🔒 保留中
> **理由**: 検針員が今週現場でモバイル端末を実作業中使用。悪影響リスクを回避するため、実作業完了後に着手。
> **作成日**: 2026-04-14

---

## 対象ファイル

- `src/components/PropertySelect/PropertySelectApp.svelte`
- `src/components/RoomSelect/RoomSelectApp.svelte`
- `src/components/MeterReading/MeterReadingApp.svelte`
- `src/components/MeterReading/components/ReadingHistoryTable.svelte`
- `src/components/MeterReading/components/ToastOverlay.svelte`
- `src/components/MeterReading/components/InitialReadingForm.svelte`
- `src/components/MeterReading/components/NavigationButtons.svelte`
- `src/components/MeterReading/components/LoadingOverlay.svelte`
- `src/components/MeterReading/hooks/useMeterReadings.svelte.ts`
- `src/components/MeterReading/hooks/useRoomNavigation.svelte.ts`
- `src/components/MeterReading/hooks/useToast.svelte.ts`
- `src/components/NetworkStatusBar.svelte`
- `src/components/IndexPage.svelte`
- `src/utils/offlineQueue.ts`
- `src/utils/roomCache.ts`
- `src/utils/gasClient.ts`
- `src/sw/service-worker.js`
- `manifest.json`

---

## Phase A: 機能追加（Critical）— 3件

| #   | タスク                         | 対象ファイル                                            | 変更内容                                                                                                                                                  |
| --- | ------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 検針サマリー画面の新規作成     | 新規: `src/components/CompletionSummary/`               | 物件完了時に表示：総部屋数・完了数・警告数・所要時間。「ダッシュボードに戻る」「次の物件へ」ボタン。RoomSelectApp.svelte の完了フローに統合               |
| A2  | マニフェストショートカット修正 | `manifest.json` (line 37)                               | `url: "/reading/"` → 削除（必須パラメータ不足で壊れているため）                                                                                           |
| A3  | 数値入力のバリデーション強化   | `ReadingHistoryTable.svelte` + `MeterReadingApp.svelte` | (1) `inputmode="numeric"` `pattern="[0-9]*"` 追加 (2) 最大値チェック追加（Config.MAX_USAGE または合理的上限）(3) 小数入力のJS拒否（oninputで `.` を除去） |

---

## Phase B: オフライン体験改善（High）— 5件

| #   | タスク                                       | 対象ファイル                                    | 変更内容                                                                                                           |
| --- | -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| B1  | 物件選択ページのリトライボタン追加           | `PropertySelectApp.svelte` (lines 192-199)      | エラー状態に「再試行」ボタン追加。キャッシュなし+オフライン時も表示                                                |
| B2  | 部屋選択ページのキャッシュ鮮度表示           | `RoomSelectApp.svelte` (lines 117-148)          | キャッシュフォールバック時に「キャッシュからの表示（最終更新: HH:mm）」表示。roomCache.ts にタイムスタンプ保存追加 |
| B3  | オフラインキュー書き込み失敗の確実な通知     | `useRoomNavigation.svelte.ts` (line 197-200)    | キュー書き込み try/catch で失敗時に「保存に失敗しました。データが失われました。」トースト表示                      |
| B4  | 物件選択ローディング中にNetworkStatusBar表示 | `PropertySelectApp.svelte` (lines 151-181)      | ローディング状態にも `<NetworkStatusBar />` を含める                                                               |
| B5  | バックグラウンド同期失敗の通知               | `service-worker.js` + `NetworkStatusBar.svelte` | 同期失敗時に永続的な通知（自動消去なし）を表示。「○件の同期に失敗しました。再試行」リンク付き                      |

---

## Phase C: ナビゲーション・フロー改善（Medium）— 4件

| #   | タスク                           | 対象ファイル                                        | 変更内容                                                                                                                                                                      |
| --- | -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | ページ遷移の視覚的改善           | 全ページ + CSS                                      | (1) `document.body.classList.add('page-transitioning')` でフェードアウト (2) CSS `opacity` トランジション (3) 新ページでフェードイン。完全SPA化は工数過大なので視覚的改善のみ |
| C2  | 「終了」ボタンの修正             | `PropertySelectApp.svelte` (lines 117-121)          | `window.close()` 削除。「検針を終了しますか？」確認後、物件選択の初期状態にリセット                                                                                           |
| C3  | 戻るボタンの自動保存を確認付きに | `useRoomNavigation.svelte.ts` (lines 380-428)       | 未保存データがある場合、「保存して戻る」「保存せず戻る」「キャンセル」の3択ダイアログ表示                                                                                     |
| C4  | パンくず/進捗インジケーター追加  | 新規: `src/components/shared/FlowBreadcrumb.svelte` | 全ページのヘッダーに「物件選択 → 部屋選択 → 検針入力」表示。現在ステップをハイライト                                                                                          |

---

## Phase D: PWA設定・ポリッシュ（Medium/Low）— 7件

| #   | タスク                             | 対象ファイル                                                          | 変更内容                                                       |
| --- | ---------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| D1  | マスカブルアイコン追加             | `manifest.json` + `public/icons/`                                     | 既存アイコンに `"purpose": "any maskable"` 版を追加            |
| D2  | theme_color 統一                   | `manifest.json` (line 8)                                              | `#1E88E5` → HTMLメタタグと同じ `#007bff` に統一                |
| D3  | PWAインストール案内（iOS向け）追加 | `IndexPage.svelte`                                                    | iOS検出時に「Safariの共有ボタン → ホーム画面に追加」手順を表示 |
| D4  | FABボタンの絵文字→アイコン化       | `MeterReadingApp.svelte` (line 689)                                   | 💾 → Material Icons の `save` アイコンに変更                   |
| D5  | トースト実装の統一                 | `RoomSelectApp.svelte`                                                | インライントーストを `ToastOverlay` + `createToast` に統一     |
| D6  | 見出し階層の修正                   | `MeterReadingApp.svelte`                                              | 重複h1を解消。`<h1>` は1箇所のみ。他はh2/h3に                  |
| D7  | 空catch ブロックのログ追加         | `PropertySelectApp.svelte`, `RoomSelectApp.svelte`, `gasClient.ts` 等 | `catch {}` → `catch (e) { console.warn('操作名:', e) }` に変更 |

---

## 合計: 19タスク

- Phase A（Critical）: 3件
- Phase B（High）: 5件
- Phase C（Medium）: 4件
- Phase D（Low）: 7件
