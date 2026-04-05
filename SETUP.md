# 水道検針PWA セットアップガイド

## 必要な環境

- Node.js 18 以上
- npm

## 初期セットアップ

### 1. パッケージインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、GAS Web App URLを設定してください。

```bash
cp .env.example .env
```

`.env` の内容：

```
VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

> **注意**: `.env` はGit管理対象外です。URLはリポジトリに含まれません。

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

`.env` にURLが設定されていれば、アプリ起動時に自動的にGAS URLが設定されます。

### テストの実行

```bash
# テスト実行
npm test

# カバレッジ付きテスト
npx vitest run --coverage
```

### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` に出力されます。

## CI/CD（GitHub Actions）

mainブランチへのpushまたはPR作成時に、GitHub Actionsが自動でテストとビルドを実行します。

- **トリガー**: `main` へのpush / PR
- **実行環境**: Node.js 18, 20
- **手順**: `npm ci` → `npm test` → `npm run build`

## GAS URLの優先順位

アプリは以下の順序でGAS URLを参照します：

1. **sessionStorage** — 最優先（アプリ内での設定）
2. **localStorage** — 次点（永続保存）
3. **環境変数（.env）** — フォールバック（デフォルト値）

アプリ内のURL入力画面からURLを変更すると、sessionStorageとlocalStorageに保存されます。

## デプロイ

### 本番環境

本番環境用の `.env` に本番GAS URLを設定してビルド：

```bash
# .env に本番URLを設定後
npm run build
```

### テスト環境

テスト用GAS URLを `.env` に設定してビルド：

```bash
# .env にテストURLを設定後
npm run build
```

## プロジェクト構成

```
src/
├── components/
│   ├── MeterReading/        # 検針ページ
│   │   ├── MeterReadingApp.svelte
│   │   ├── components/      # UIコンポーネント
│   │   ├── hooks/           # カスタムフック
│   │   └── utils/           # ユーティリティ
│   ├── PropertySelect/      # 物件選択ページ
│   └── RoomSelect/          # 部屋選択ページ
├── utils/
│   └── gasClient.js         # GAS APIクライアント
└── ...
```

## トラブルシューティング

### GAS URLが反映されない

1. `.env` ファイルがプロジェクトルートにあるか確認
2. 変数名が `VITE_GAS_WEB_APP_URL` になっているか確認
3. 開発サーバーを再起動（`.env` の変更は再起動が必要）

### テストが失敗する

```bash
# クリーンインストール
rm -rf node_modules
npm ci
npm test
```

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf node_modules/.vite
npm run build
```
