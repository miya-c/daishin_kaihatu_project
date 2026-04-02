# プロジェクト修正計画 — 最適実行順序

## 実行方針

1. **テストを先にグリーンにする** — 修正の安全性を担保する基盤
2. **リスクの高いものから** — AbortController、エラーハンドリング
3. **影響範囲の小さいものから** — ファイルをまたぐ変更は後回し
4. **各ステップ後にビルド+テストで確認** — デグレを防止

---

## Step 1: テスト修正（3ファイル並列）

> 目的: 全テストをグリーンにし、以降の修正の安全網を確保

### Step 1-1. useMeterReadings.test.js — 5件（削除のみ）
- 削除済み `loadRoomDataForSPA` のテストブロック（4件）を削除
- 削除済み `popstate` ハンドラのテストブロック（2件）を削除

### Step 1-2. MeterReadingApp.test.jsx — 4件（モック更新）
- `handleBackButton` の呼び出し期待値を `(propertyId, roomId, hasSaved)` の3引数に更新

### Step 1-3. useRoomNavigation.test.js — 1件（アサーション修正）
- 楽観的更新テストのデータ構造を実際のロジックに合わせて修正

**確認**: `npx vitest run` → 322/322 pass

---

## Step 2: AbortController追加（2ファイル）

> 目的: コンポーネント解除時のメモリリーク・競合状態を防止

### Step 2-1. useMeterReadings.ts
- `loadMeterReadings` の fetch に `AbortController` 追加
- useEffect のクリーンアップで `controller.abort()` を呼ぶ
- 中断されたリクエストはエラー表示しない

### Step 2-2. useRoomNavigation.ts
- `saveReadings` の fetch に `AbortController` 追加
- `updateSessionStorageCache` の fetch に `AbortController` 追加

**確認**: `npx vitest run` + 手動テスト（前/次ナビゲーション）

---

## Step 3: エラーハンドリング強化（3ファイル）

> 目的: サイレントな失敗をなくし、ユーザーに適切に通知

### Step 3-1. useRoomNavigation.ts — 空のcatchブロック修正
- `saveReadings` の `.catch()` でコンソールログ + displayToast 追加

### Step 3-2. sessionStorage アクセスの try-catch
- `useMeterReadings.ts` — getItem/setItem を try-catch で囲む
- `useRoomNavigation.ts` — 同上
- `gasClient.ts` — 同上
- フォールバック: メモリ内 Map または空値を返す

**確認**: `npx vitest run` + プライベートモードでの動作確認

---

## Step 4: パフォーマンス最適化（4ファイル）

> 目的: 不要な再レンダリングを削減し、体感速度を向上

### Step 4-1. React.memo 適用
- `ReadingHistoryTable` → `React.memo()` でラップ
- `InitialReadingForm` → `React.memo()` でラップ
- `PropertyInfoHeader` → `React.memo()` でラップ
- `NavigationButtons` → `React.memo()` でラップ

### Step 4-2. useCallback の依存関係確認
- `MeterReadingApp.tsx` のインライン関数が過剰に再生成されていないか確認
- 必要に応じて `useCallback` に抽出

**確認**: React DevTools Profiler で再レンダリング回数を比較

---

## Step 5: Error Boundary 追加（1新規ファイル + 3ファイル）

> 目的: 予期しないエラーで画面が真っ白になるのを防止

### Step 5-1. ErrorBoundary コンポーネント作成
- `src/components/ErrorBoundary.tsx` を新規作成
- エラー時のフォールバックUI（再試行ボタン付き）

### Step 5-2. 各ページに Error Boundary を配置
- `PropertySelectApp.tsx` のルートにラップ
- `RoomSelectApp.tsx` のルートにラップ
- `MeterReadingApp.tsx` のルートにラップ

**確認**: 意図的に例外を発生させてフォールバックUIが表示されることを確認

---

## Step 6: CSS改善（インラインスタイル抽出 + UI統一）

> 目的: スタイルの保守性と一貫性を向上

### Step 6-1. CSS変数の統一
- `src/styles/common.css` を新規作成（共通トークン）
- フォントサイズ、カラー、スペーシングを変数化

### Step 6-2. インラインスタイルの抽出
- `PropertySelectApp.tsx` のモーダル/カードスタイル → CSS クラス
- `RoomSelectApp.tsx` のトースト/カードスタイル → CSS クラス
- `InitialReadingForm.tsx` のレイアウトスタイル → CSS クラス
- `LoadingOverlay.tsx` / `ToastOverlay.tsx` → CSS クラス

### 6-3. CSS `!important` の削減
- 特異性の問題を根本解決し、`!important` を段階的に削除

**確認**: ビルド + 全ページの目視確認

---

## Step 7: アクセシビリティ・品質向上（低優先度）

> 目的: 長期的な品質の底上げ

### 7-1. ハードコード文字列の定数化
- `src/constants/messages.ts` を新規作成
- `'N/A'`, `'部屋名不明'`, `'物件名不明'` 等を集約

### 7-2. テーブルのアクセシビリティ
- `<th>` に `scope="col"` / `scope="row"` を追加
- モバイル非表示の `<thead>` に `sr-only` クラスを適用（スクリーンリーダーには読み上げ）

**確認**: ビルド + axe-core でのアクセシビリティ監査

---

## 全体タイムライン

```
Step 1: テスト修正          ← 最初（安全網）
  ↓
Step 2: AbortController      ← 高リスク（メモリリーク）
  ↓
Step 3: エラーハンドリング   ← 高リスク（サイレント障害）
  ↓
Step 4: React.memo          ← 中リスク（パフォーマンス）
  ↓
Step 5: Error Boundary      ← 中リスク（堅牢性）
  ↓
Step 6: CSS改善             ← 低リスク（保守性）
  ↓
Step 7: 品質向上            ← 低リスク（長期品質）
```

各Step完了ごとにコミット推奨。
Step 1〜3は連続して実施し、Step 4以降は個別コミットで管理。
