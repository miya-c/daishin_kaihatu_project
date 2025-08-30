# Cloudflare Pages - 無限リダイレクト問題 対処法

## 🚨 現在の問題状況
- `ERR_TOO_MANY_REDIRECTS`エラーが発生
- `index.html`が自分自身にリダイレクトされている
- ユーザーが「アプリを開始」ボタンを押せない状態

## 🔍 根本原因
1. **Cloudflareキャッシュ**が古い`_redirects`設定を保持
2. **Page Rules**や**Transform Rules**が干渉している可能性
3. **Workers/Functions**が意図しないリダイレクトを実行

## 🔧 解決手順

### 1. Cloudflareキャッシュ完全パージ（最重要）
```
1. Cloudflareダッシュボードにログイン
2. 対象ドメイン「daishin-kaihatu-project.pages.dev」を選択
3. 左メニュー「Caching」→「Configuration」
4. 「Purge Cache」セクションで「Purge Everything」をクリック
5. 確認ダイアログで「Purge Everything」を再度クリック
```

### 2. Cloudflare設定確認
#### Page Rules確認
```
1. 「Rules」→「Page Rules」
2. リダイレクト関連のルールがないか確認
3. あれば一時的に無効化
```

#### Transform Rules確認
```
1. 「Rules」→「Transform Rules」
2. 「URL Redirects」タブを確認
3. 意図しないリダイレクトルールがないか確認
```

#### Workers/Functions確認
```
1. 「Workers & Pages」→対象プロジェクト
2. 「Functions」タブを確認
3. リダイレクト処理があれば確認
```

### 3. DNS設定確認
```
1. 「DNS」→「Records」
2. CNAMEレコードが正しく設定されているか確認
3. プロキシ設定（オレンジクラウド）の状態確認
```

## 🛠️ 技術的対処

### 現在実施済み修正
- [x] `_redirects`ファイルの問題ルール無効化
- [x] JavaScript構文エラー修正
- [x] 無限ループ検出機能追加
- [x] キャッシュバスティングパラメータ追加
- [x] フォールバック画面追加

### 追加対策
1. **直接リンクの提供**: `/property_select.html?v=20250830&direct=1`
2. **キャッシュバイパス**: タイムスタンプ付きURL生成
3. **ユーザー向け手順**: 段階的な解決手順表示

## 🎯 期待される結果
1. Cloudflareキャッシュパージ後、無限ループ解消
2. 「アプリを開始」ボタンの正常動作
3. `property_select.html`への正常遷移
4. エラーが発生した場合も直接リンクで回避可能

## 📞 緊急時対応
もしCloudflareキャッシュパージ後も問題が続く場合：
1. フォールバック画面の「直接リンク」を使用
2. Cloudflareサポートに連絡
3. 一時的にCloudflareプロキシを無効化（DNSレコードのクラウドをグレーに）