# 水道メーター検針 PWA

水道メーターの検針データを入力・管理するプログレッシブウェブアプリ（PWA）。
物件選択 → 部屋選択 → 検針入力の流れで、効率的に検針作業を行えます。

## セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd daishin_kaihatu_project

# 依存パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env の VITE_GAS_WEB_APP_URL を実際のGAS URLに変更

# 開発サーバーの起動
npm run dev
```

## スクリプト一覧

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm test` | テスト実行 |
| `npm run test:watch` | テスト監視モード |
| `npm run lint` | ESLintによる静的解析 |
| `npm run lint:fix` | ESLint自動修正 |
| `npm run format` | Prettierによるフォーマット |
| `npm run format:check` | フォーマットチェック |
| `npm run analyze` | バンドルサイズ分析 |

## プロジェクト構造

```
src/
├── components/
│   ├── MeterReading/          # 検針入力ページ
│   │   ├── components/        # UIコンポーネント
│   │   ├── hooks/             # カスタムフック
│   │   └── utils/             # ユーティリティ
│   ├── PropertySelect/        # 物件選択ページ
│   ├── RoomSelect/            # 部屋選択ページ
│   ├── NetworkStatusBar.tsx   # ネットワーク状態表示
│   └── shared/                # 共通コンポーネント
├── hooks/                     # グローバルフック
├── pages/                     # マルチページエントリーポイント
│   ├── index.html             # メイン（リダイレクト）
│   ├── property/              # 物件選択
│   ├── room/                  # 部屋選択
│   └── reading/               # 検針入力
├── styles/                    # CSSスタイル
├── sw/                        # Service Worker
├── types/                     # TypeScript型定義
└── utils/                     # 共通ユーティリティ
```

## テスト

```bash
# 全テスト実行
npm test

# カバレッジ付きテスト
npx vitest run --coverage

# 監視モード
npm run test:watch
```

### テストカバレッジ

- Statements: 95%+
- Branches: 85%+
- 321テストケース

## 使用技術

- **フロントエンド**: Svelte 5, TypeScript
- **ビルドツール**: Vite 6
- **テスト**: Vitest, Testing Library
- **コード品質**: ESLint, Prettier
- **PWA**: Service Worker, Web App Manifest
- **CI/CD**: GitHub Actions

## バックエンド（Google Apps Script）

`gas_scripts/` ディレクトリにGASスクリプトが含まれています。
データの取得・更新はGAS Web App API経由で行います。

## ライセンス

Private
