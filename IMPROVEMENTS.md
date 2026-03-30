# 水道検針PWA 改善課題一覧

最終更新: 2026-03-31

## 完了済み

| # | 課題 | 状態 | 完了日 |
|---|------|------|--------|
| - | テストカバレッジ 71% → 91.79% | 完了 | 2026-03 |
| - | デッドコード削除（performSPANavigation 52行） | 完了 | 2026-03 |
| - | isNotNeeded部屋スキップ機能修正 | 完了 | 2026-03 |
| - | GAS URL環境変数化（.env + import.meta.env） | 完了 | 2026-03 |
| - | CI/CD構築（GitHub Actions） | 完了 | 2026-03 |
| - | PropertySelect / RoomSelect テスト追加（+57テスト） | 完了 | 2026-03 |
| - | ESLint 9 + Prettier 導入 | 完了 | 2026-03 |
| - | hasOwnProperty安全呼び出し修正 | 完了 | 2026-03 |

---

## 未完了課題

### Critical — 今すぐ直すべき

#### C-1: MeterReadingApp.jsx 競合状態
- **対象**: `src/components/MeterReading/MeterReadingApp.jsx` (L85-101)
- **問題**: useEffect内のreadingValues初期化が古いクロージャを参照し、状態不整合のリスク
- **修正**: 関数型更新またはuseMemoへの移行
- **関連**: H-1（コンポーネント分割）と同時対応が効率的

#### C-2: URLパラメータの未検証
- **対象**: `gasClient.js`, `PropertySelectApp.jsx`, `RoomSelectApp.jsx`
- **問題**: propertyId, roomId等がfetch URLに直接結合されており、不正値で予期せぬリクエストが発生
- **修正**: パラメータの型・形式バリデーション追加

#### C-3: Service Worker 未登録
- **対象**: `src/sw/service-worker.js`, `src/pwa-utils.js`
- **問題**: SWファイルは存在するが登録処理が未実装で、PWAとして機能していない
- **修正**: エントリーポイントでnavigator.serviceWorker.register()を呼び出し

---

### High — 品質・信頼性に直結

#### H-1: MeterReadingApp.jsx のコンポーネント分割
- **対象**: `src/components/MeterReading/MeterReadingApp.jsx`（~580行）
- **問題**: 単一コンポーネントに表示・入力・通信・ナビゲーションが全て詰まっている
- **修正案**:
  - `ReadingTable` — 検針データテーブル表示
  - `ReadingInputRow` — 1行分の入力フォーム
  - `InitialReadingForm` — 初回検針入力フォーム
  - `ReadingHeader` — 物件・部屋情報ヘッダー
- **効果**: 保守性・テスタビリティ・再利用性が向上

#### H-2: Branch Coverage底上げ
- **対象**: MeterReadingApp(70.43%), gasClient(60%), RoomSelect(78.9%)
- **問題**: エラーハンドリング分岐が未テストで、本番バグが潜伏する可能性
- **修正**: ネットワーク障害パス、バリデーション分岐、API異常レスポンスのテスト追加
- **目標**: Stmts 95%+, Branch 85%+

#### H-3: ErrorBoundary改善
- **対象**: `src/components/shared/ErrorBoundary.jsx`
- **問題**: エラー発生時にページ全体をリロードするのみ。ユーザーの入力データが消失
- **修正**: リロード以外のリカバリー手段（再試行ボタン、部分的なエラー表示）を追加

#### H-4: オフライン対応
- **対象**: `src/sw/service-worker.js`, 各ページコンポーネント
- **問題**: ネットワーク不安定時に検針データが保存できず、入力が消失
- **修正**:
  - Service Workerのキャッシュ戦略実装
  - IndexedDB / localStorageによる入力データの一時保存
  - ネットワーク復旧時の自動同期
- **効果**: 現場（地下・郊外等）での可靠性向上

#### H-5: CI/CDパイプライン拡充
- **対象**: `.github/workflows/ci.yml`
- **問題**: テスト+ビルドまでで、デプロイ・アーティファクト保存がない
- **修正**:
  - ビルド成果物のアーティファクトアップロード
  - デプロイステップ追加（Netlify / Cloudflare Pages 等）
  - セキュリティスキャン（npm audit）追加

---

### Medium — 段階的に改善

#### M-1: アクセシビリティ改善
- **対象**: 全コンポーネント
- **問題**:
  - ToastOverlayに`role="alert"` / `aria-live`が未設定（スクリーンリーダーに通知されない）
  - ナビゲーションボタンにフォーカスインジケータなし
  - 一部クリックハンドラにキーボード対応（Enter/Space）なし
- **修正**: ARIA属性追加、focus-visibleスタイル、onKeyDownハンドラ

#### M-2: コード重複の解消
- **対象**: `useMeterReadings.js`内のデータマッピングロジック（2箇所）
- **問題**: APIレスポンス → 内部モデル変換が類似コードで重複
- **修正**: 共通マッピング関数を抽出

#### M-3: README.md作成
- **対象**: プロジェクトルート
- **問題**: プロジェクトの概要・セットアップ手順が未整備
- **修正**: プロジェクト概要、スクリーンショット、セットアップ手順、技術スタック記載

#### M-4: TypeScript移行
- **対象**: 全ソースファイル（~16ファイル）+ テストファイル（13ファイル）
- **問題**: JavaScriptのみで型安全性がなく、リファクタリング時にデグレリスクが高い
- **修正**:
  1. TypeScript依存関係追加（typescript, @types/react, @types/react-dom）
  2. tsconfig.json作成
  3. 段階的に .js → .ts / .jsx → .tsx へ移行
  4. 日本語プロパティ（物件ID, 検針日時等）のインターフェース定義
- **移行順序（推奨）**:
  1. tsconfig.json + 設定ファイル（vite.config, vitest.config）
  2. 型定義ファイル（types/）の作成
  3. utils → hooks → 小さいUIコンポーネント → ページコンポーネント
  4. テストファイル
  5. pwa-utils.js, service-worker.js
- **前提**: H-1（MeterReadingApp分割）を先に行うと移行が容易
- **工数**: 約8〜12時間

#### M-5: ビルド最適化
- **対象**: vite.config.js, 各ページ
- **問題**: コード分割・Lazy Loading未導入で初期ロードが重い
- **修正**: React.lazy + Suspenseによるルート単位の遅延読み込み、バンドル分析導入

#### M-6: manifest.json / PWA設定の改善
- **対象**: manifest.json, _headers
- **問題**: iOS向けPNGアイコンなし、CSPヘッダー未設定
- **修正**: アイコン追加、CSPヘッダー設定、インストールプロンプト実装

#### M-7: ナビゲーションとデータ保存の関心分離
- **対象**: `useRoomNavigation.js`
- **問題**: 部屋ナビゲーション（UI操作）と検針データ保存（API通信）が同一関数に混在
- **修正**: 保存ロジックを独立したhookまたはサービスに分離

---

### Low — 余裕があれば

#### L-1: 複雑なuseStateの整理
- **対象**: `MeterReadingApp.jsx`（10+のuseState）
- **問題**: 関連する状態がバラバラに管理されている
- **修正**: useReducerまたは状態グループ化で整理（H-1と同時対応が効率的）

#### L-2: ネットワークステータス表示の実装
- **対象**: `src/pwa-utils.js`
- **問題**: オンライン/オフライン表示がプレースホルダのまま
- **修正**: 実際のネットワーク状態検知とUI表示の実装

#### L-3: ページ遷移の改善
- **対象**: 全ページコンポーネント
- **問題**: window.location.hrefによる画面遷移で、状態が引き継がれない
- **修正**: History APIまたはReact Routerの導入検討（将来的なSPA化を見据えて）

#### L-4: 不要エスケープや微細なコード品質
- **対象**: 各ファイル
- **問題**: ESLint警告40件（未使用変数、不要なエスケープ等）
- **修正**: lint:fixで自動修正可能なものから順次対応
- **注意**: M-4（TypeScript移行）の前に実施、または移行に含めて対応すると効率的

---

## 推奨着手順

```
Phase 1（Quick Win）: 独立した小修正
  C-3 Service Worker登録
  C-2 URLパラメータ検証
  H-3 ErrorBoundary改善
  ※ 他のPhaseと依存しない。いつでも着手可能

Phase 2（構造改善）: TypeScript移行の前準備
  H-1 MeterReadingApp分割
  C-1 競合状態修正（H-1と同時対応）
  M-7 関心分離
  M-2 コード重複解消
  L-1 useState整理（H-1と同時対応）
  ※ 分割前にC-1を修正すると手戻り発生するため、H-1と同時対応

Phase 3（型安全性）:
  L-4 ESLint警告解消
  M-4 TypeScript移行
  ※ Phase 2で構造が安定した後に移行。L-4はTS移行のノイズ削減のため先行

Phase 4（テスト強化）: 安定した構造に対してテスト追加
  H-2 Branch Coverage底上げ
  ※ Phase 2（分割）とPhase 3（TS移行）が完了したコードに対してテストを書く

Phase 5（UX改善）:
  M-1 アクセシビリティ改善
  ※ TS移行後に実施。JSで追加した属性の再変換を避ける

Phase 6（PWA・オフライン）:
  H-4 オフライン対応
  M-6 PWA設定改善
  L-2 ネットワークステータス表示
  ※ PWA関連の3課題をまとめて実施

Phase 7（パフォーマンス）:
  M-5 ビルド最適化
  ※ 全機能追加完了後に、最終的なバンドル最適化

Phase 8（CI/CD）:
  H-5 パイプライン拡充
  ※ アプリが最終形に近くなってからデプロイパイプラインを構築

Phase 9（ドキュメント）:
  M-3 README.md作成
  ※ 全工程完了後に最新状態で記載

未配置（将来的検討）:
  L-3 ページ遷移の改善
  ※ 現行マルチページ構成からSPAへの移行は他課題と独立。
     アーキテクチャ判断が必要なため、独立して検討・対応
```

---

## 現在のメトリクス

| 項目 | 数値 |
|------|------|
| テスト数 | 246（全通過） |
| テストファイル | 13 |
| Statement Coverage | 91.79% |
| Branch Coverage | 80.3% |
| Function Coverage | 84.09% |
| Line Coverage | 92.98% |
| ESLint エラー | 0（警告40） |
| Prettier | 全ファイル通過 |
| CI | lint → format:check → test → build（Node 18/20） |
