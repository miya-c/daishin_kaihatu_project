## 基本設定
ユーザーには日本語で回答してください。

実装が完了したらテストしてください。

フロントエンドURL:https://daishin-kaihatu-project.pages.dev/
----------

## 水道検針アプリ 画面遷移速度改善 - Claudeへの追加指示

これまでの作業、特にViteの導入とReactコードのモジュール化、人工的な遅延の削除、アニメーションの最適化、PWA関連JavaScriptロジックの移行、本当に素晴らしいです。大幅なパフォーマンス改善の基盤ができました。

しかし、Cloudflare Pagesでアプリケーションがまだ正しく動作していません。これは、Viteでビルドされた新しいアプリケーション構造と、それをホストするためのHTMLファイルやルーティング設定との間に不整合があるためです。

つきましては、以下の残りのフロントエンドタスクと、Cloudflare Pagesでのデプロイを成功させるためのルーティング修正をお願いします。

### 1. `index.html` の整理と置き換え

*   **目的:** アプリケーションのメインエントリポイントをViteのビルド成果物を読み込むシンプルなHTMLにすることで、初期ロードを高速化し、PWA関連の重複を解消します。
*   **タスク:**
    *   プロジェクトのルートにある `index.html` を、`index-new.html` の内容で完全に上書きしてください。
    *   これにより、`index.html` はViteのビルド成果物（`src/main.jsx` が生成するバンドル）を読み込むだけのシンプルなHTMLファイルになります。
    *   `index-new.html` に残っているPWA関連のJavaScript（`pageshow` イベントのハンドリングなど）も、`src/utils/pwa.js` に完全に統合してください。`index.html` には `<div id="root"></div>` とViteが生成するスクリプトタグのみが残るようにしてください。

### 2. 残りのCSSファイルの統合と最適化

*   **目的:** 複数のCSSファイルを統合し、Viteのビルドプロセスで最適化することで、CSSの読み込み効率を最大化します。
*   **タスク:**
    *   `css_styles` ディレクトリに残っている全てのCSSファイル（`critical-styles.css`, `meter_reading.css`, `property_select.css`, `pwa-materialui.css`, `pwa-styles.css`, `room_select.css`）の内容を、`src/styles/main.css` に統合してください。
    *   もし、特定のページ（例: 部屋一覧画面、検針情報画面）に固有のCSSがある場合は、それらを `src/styles/main.css` に統合するか、またはViteのCSS処理機能を活用して適切にバンドルされるようにしてください。
    *   `html_files/main_app/` ディレクトリ内の各HTMLファイル（`property_select.html`, `room_select.html`, `meter_reading.html`）から、古いCSSの `<link>` タグや `<style>` タグを全て削除してください。これらのファイルは、最終的にはViteでビルドされたSPAのルーティングによって置き換えられることを想定しています。

### 3. Cloudflare Pages向けルーティング (`_redirects`) の修正

*   **目的:** Cloudflare Pagesが新しいViteベースのSPAを正しく提供できるように、ルーティング設定を更新します。
*   **タスク:**
    *   プロジェクトのルートにある `_redirects` ファイルの内容を、以下のように変更してください。
        ```
        # 全てのパスをViteでビルドされたSPAのindex.htmlにフォールバックさせる
        /*    /index.html   200
        ```
    *   これにより、`/property_select` や `/room_select` などのパスへのアクセスが、Viteによってビルドされた `index.html` を通じてReactアプリケーションによって処理されるようになります。

これらのタスクが完了したら、再度報告してください。