# デプロイ手順書

## 前提条件

| 項目 | 詳細 |
|------|------|
| フロントエンド | Cloudflare Pages にデプロイ（Vite ビルド） |
| バックエンド | Google Apps Script（Web App としてデプロイ） |
| データ | Google スプレッドシート（物件マスタ・部屋マスタ・inspection_data） |
| Node.js | 18以上 |

---

## 手順1: GAS バックエンドのデプロイ

### 1-1. スクリプトプロパティの設定

Google Apps Script エディタで **プロジェクトの設定**（歯車アイコン）→ **スクリプトプロパティ** に以下を追加：

| プロパティ名 | 値 | 説明 |
|---|---|---|
| `API_KEY` | 任意の安全な文字列（例: `sk-xxxx-xxxx-xxxx`） | フロントエンドとの通信認証用 |
| `ADMIN_TOKEN` | 任意の安全な文字列（例: `admin-xxxx-xxxx`） | デバッグエンドポイント用管理トークン |

**API_KEY の生成例**:
```
sk-a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 1-2. GAS ファイルのデプロイ

`backend/merter-library-test/src/` 以下のファイルを GAS プロジェクトに配置：

**ルートファイル**:
- `src/main.gs` → `main.gs`（または `コード.gs`）

**モジュールファイル**（`src/modules/` から）:
| ファイル | 役割 |
|----------|------|
| `web_app_api.gs` | API エントリポイント（doGet/doPost） |
| `api_data_functions.gs` | データ取得・更新の中核 |
| `data_management.gs` | 月次処理・データ生成 |
| `data_indexes.gs` | 高速検索インデックス |
| `Config.gs` | 設定・列定義 |
| `utilities.gs` | 共通ユーティリティ |
| `data_validation.gs` | データ検証 |
| `data_cleanup.gs` | データクリーンアップ |
| `data_formatting.gs` | データフォーマット |
| `batch_processing.gs` | バッチ処理 |
| `dialog_functions.gs` | UI ダイアログ |
| `spreadsheet_config.gs` | スプレッドシート設定 |
| `system_diagnostics.gs` | システム診断 |
| `水道検針アプリ.gs` | メニュ・ウィザード |
| `appsscript.json` | プロジェクト設定（上書き） |

### 1-3. Web App としてデプロイ

1. GAS エディタ右上の **「デプロイ」** → **「新しいデプロイ」**
2. 種類: **ウェブアプリ**
3. 実行するバージョン: **新規**
4. 実行 as: **自分**
5. アクセスできるユーザー: **全員**
6. デプロイ → URL をコピー

**この URL が `VITE_GAS_WEB_APP_URL` になります。**

### 1-4. 動作確認

ブラウザで以下のURLにアクセスしてテスト：
```
{GAS_URL}?action=test
```
→ `{"success":true,"message":"ライブラリAPI接続テスト成功",...}` が返れば OK

---

## 手順2: フロントエンドの環境変数設定

### 2-1. .env ファイルの更新

プロジェクトルートの `.env` に2つの変数を設定：

```bash
# 従来の設定（必須）
VITE_GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# 新規追加（API認証用）
VITE_GAS_API_KEY=sk-a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**重要**:
- `VITE_GAS_API_KEY` の値は手順1-1で設定した `API_KEY` と**同じ値**にする
- `.env` は Git 管理対象外（`.gitignore` に含まれる）

### 2-2. Cloudflare Pages の環境変数設定

Cloudflare ダッシュボード → Pages → 対象プロジェクト → **設定** → **環境変数**:

| 変数名 | 値 | 環境 |
|--------|----|----|
| `VITE_GAS_WEB_APP_URL` | GAS Web App URL | Production / Preview |
| `VITE_GAS_API_KEY` | 手順1-1の API_KEY と同じ値 | Production / Preview |

---

## 手順3: ビルドとデプロイ

### 3-1. ローカルビルド確認

```bash
# テスト実行
npm test

# ビルド
npm run build
```

テストが全て通過（214/214）し、ビルドが成功することを確認。

### 3-2. Cloudflare Pages へのデプロイ

**方法A: GitHub 連携（自動デプロイ）**
1. 変更を main ブランチに push
2. Cloudflare Pages が自動的にビルド・デプロイ

**方法B: 手動デプロイ**
```bash
npx wrangler pages deploy dist --project-name=daishin-kaihatu
```

---

## 手順4: 動作確認チェックリスト

デプロイ後、以下の操作をブラウザで確認：

### 基本機能
- [ ] アプリにアクセス → 物件一覧が表示される
- [ ] 物件を選択 → 部屋一覧が表示される
- [ ] 部屋を選択 → 検針入力ページが表示される
- [ ] 検針数を入力 → 保存ボタン → 「保存しました」トースト表示
- [ ] 前/次ボタンで部屋移動 → データが引き継がれる
- [ ] 戻るボタン → 部屋選択ページに遷移

### 認証関連
- [ ] 検針データ保存が正常に動作（API key 付きで POST 送信）
- [ ] ブラウザ開発者ツールの Network タブで POST リクエストを確認
- [ ] `apiKey` パラメータが POST body に含まれていることを確認

### セキュリティ
- [ ] `?action=getSpreadsheetInfo` にアクセス → `adminToken` なしでエラー返却される
- [ ] `?action=getPropertyMaster` も同様にアクセス拒否される

### データ保護
- [ ] 2つのブラウザタブで同時に異なる部屋を保存 → 片方がロックエラーまたは順次処理される
- [ ] 月次処理実行 → バックアップシートが自動作成される

---

## 手順5: 移行期間中の運用（オプション）

### API key の段階的導入

現在の実装では：
- **書き込み操作**（updateMeterReadings, completeInspection）: API key **必須**
- **読み込み操作**（getProperties, getRooms, getMeterReadings）: API key **なしでも許可**

2週間後に読み込み操作も API key 必須にする場合：

`web_app_api.gs` の `validateApiKey` 関数で `requireAuth` を全アクションで `true` に変更：

```javascript
case 'getProperties':
case 'getRooms':
case 'getRoomsLight':
case 'getMeterReadings':
  const auth = validateApiKey(params, true); // false → true に変更
  if (!auth.authorized) {
    return createCorsJsonResponse({ success: false, error: auth.error });
  }
```

### apiKey の動的変更

ユーザーがブラウザで apiKey を変更する場合：
```javascript
localStorage.setItem('gasApiKey', '新しいAPIキー');
```

---

## トラブルシューティング

### API key エラーが出る場合
1. GAS スクリプトプロパティの `API_KEY` と `.env` の `VITE_GAS_API_KEY` が一致しているか確認
2. Cloudflare Pages の環境変数に `VITE_GAS_API_KEY` が設定されているか確認
3. ブラウザの localStorage に古い key が残っていないか確認

### POST リクエストが失敗する場合
1. GAS の `doPost` 関数が正しくデプロイされているか確認
2. `appsscript.json` で `executionApi.access: "ANYONE"` が設定されているか確認
3. ブラウザの Network タブで POST body の内容を確認

### ロックエラーが頻発する場合
1. `waitLock` のタイムアウト（30秒）以内に処理が完了するか確認
2. 同時アクセス数が想定以上でないか確認
3. 必要に応じて `waitLock` のタイムアウトを延長

### バックアップシートが大量に作成される場合
1. `inspection_data_backup` や `inspection_data_pre_reset_*` シートを定期的に削除
2. 月次処理成功後、古いバックアップシートは手動削除可能
