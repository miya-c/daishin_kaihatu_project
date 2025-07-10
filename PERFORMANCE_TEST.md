# パフォーマンステスト実行ガイド

## 実装完了項目（Phase 1 & 2）

### ✅ Phase 1: 最優先項目
1. **レイジーロード実装** - 仮想スクロール（20件ずつ表示）、Intersection Observer API
2. **Reactコンポーネント最適化** - React.memo()、useCallback()でメモ化
3. **不要なレンダリング削減** - useMemo()、debounce（300ms）で検索最適化
4. **アニメーション最適化** - animation-delay を 0.1s → 0.05s に短縮

### ✅ Phase 2: 重要項目
5. **イベントハンドラ最適化** - 300ms遅延を削除、即座に画面遷移
6. **APIレスポンス時間短縮** - 部屋データを遅延読み込み、基本情報のみで遷移
7. **キャッシュ利用強化** - SessionStorage 5分間キャッシュ、HTTPキャッシュバスティング削除

## パフォーマンステスト手順

### 1. 本番環境でのテスト
```
URL: https://daishin-kaihatu-project.pages.dev
```

### 2. Chrome DevTools Lighthouse テスト
1. Chrome で上記URLを開く
2. F12 で DevTools を開く
3. Lighthouse タブをクリック
4. 「Performance」と「Best Practices」にチェック
5. 「Analyze page load」をクリック

### 3. 期待される改善結果

#### Before（改善前）:
- **First Contentful Paint (FCP)**: 2.5-3.0秒
- **Largest Contentful Paint (LCP)**: 3.5-4.0秒
- **Time to Interactive (TTI)**: 4.5-5.0秒
- **物件一覧表示**: 全件一度に読み込み（重い）
- **画面遷移**: 300ms + 部屋データ取得時間

#### After（改善後）:
- **First Contentful Paint (FCP)**: 1.5-2.0秒 ⚡ **30-40%改善**
- **Largest Contentful Paint (LCP)**: 2.0-2.5秒 ⚡ **35-40%改善**
- **Time to Interactive (TTI)**: 2.5-3.0秒 ⚡ **40-45%改善**
- **物件一覧表示**: 20件ずつ段階的読み込み ⚡ **メモリ使用量削減**
- **画面遷移**: 即座（300ms削除 + 部屋データ遅延読み込み） ⚡ **70-80%高速化**

### 4. ユーザーエクスペリエンス改善確認

#### 物件一覧画面:
1. **初期表示**: 20件のみ表示で高速表示
2. **スクロール**: 自動で15件ずつ追加読み込み
3. **検索**: 300ms debounceで入力中のパフォーマンス改善
4. **キャッシュ**: 2回目アクセス時は5分間キャッシュから即座表示

#### 画面遷移:
1. **物件選択**: クリック後即座に次画面へ遷移
2. **部屋データ**: 次画面で必要時に遅延読み込み
3. **ナビゲーション**: スムーズで待機時間なし

### 5. ネットワークパフォーマンス確認

#### Network タブでの測定:
1. Chrome DevTools → Network タブ
2. キャッシュクリア後に物件一覧をロード
3. 確認項目:
   - **初回ロード**: APIリクエスト1回のみ（部屋データなし）
   - **キャッシュヒット**: 5分以内の再訪問でAPIリクエスト0回
   - **画面遷移**: APIリクエストなしで即座遷移

### 6. メモリ使用量確認

#### Memory タブでの測定:
1. Chrome DevTools → Memory タブ
2. 「Heap snapshot」を実行
3. 確認項目:
   - **DOM要素数**: 仮想スクロールにより削減
   - **React コンポーネント**: memo化によりre-render削減
   - **イベントリスナー**: useCallbackによる最適化

## トラブルシューティング

### パフォーマンスが改善されない場合:
1. **ブラウザキャッシュクリア**: Ctrl+Shift+R で強制リロード
2. **SessionStorageクリア**: DevTools → Application → SessionStorage をクリア
3. **本番デプロイ確認**: Cloudflare Pages での最新デプロイを確認

### 表示に問題がある場合:
1. **コンソールエラー確認**: F12 → Console でエラーログ確認
2. **React DevTools**: React コンポーネントの状態確認
3. **Network エラー**: API エンドポイントの応答確認

## 次のPhase予定

### Phase 3（中期改善）:
- サードパーティライブラリ見直し（本番版React、ビルドプロセス）
- ビルドサイズ削減（Tree-shaking、画像最適化）
- ユーザーエクスペリエンス向上（骨格スクリーン、エラーハンドリング）

実装された改善により、特に**画面遷移速度**と**初期表示速度**の大幅な改善が確認できるはずです。