# セキュリティ脆弱性修正実装計画

**作成日**: 2026-04-19
**最終更新**: 2026-04-19（レビュー指摘4件反映済み）
**対象**: 水道検針管理アプリ（GAS + Spreadsheet + PWA）
**状態**: 計画完了・実装待ち
**レビュー**: Momus通過（C-1〜C-4の指摘を反映）

---

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [制約事項の確認](#制約事項の確認)
3. [フェーズ1: 即時対応（Critical）](#フェーズ1-即時対応critical)
4. [フェーズ2: 短期対応（High）](#フェーズ2-短期対応high)
5. [フェーズ3: 中期対応（Medium）](#フェーズ3-中期対応medium)
6. [受容リスク（修正不可・制約による）](#受容リスク修正不可制約による)
7. [やってはいけないこと](#やってはいけないこと)
8. [テスト方針](#テスト方針)
9. [レビュー履歴](#レビュー履歴)

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│                    PWA (Svelte)                  │
│  gasClient.ts → fetch GET → GAS Web App URL     │
│  apiKey をURLパラメータとして送信                │
└──────────────┬──────────────────────────────────┘
               │ GET ?action=...&apiKey=...
               ▼
┌─────────────────────────────────────────────────┐
│            GAS Web App (クライアント)             │
│  library_client.gs                              │
│  doGet/doPost → cmlibrary.doGet/doPost          │
│  _storedApiKey を ScriptProperties から注入      │
└──────────────┬──────────────────────────────────┘
               │ ライブラリ呼び出し
               ▼
┌─────────────────────────────────────────────────┐
│         GAS ライブラリ (cmlibrary)               │
│  web_app_api.js    - API ルーティング             │
│  api_data_functions.js - データ取得・更新         │
│  property_management.js - CRUD                   │
│  web_app_admin_api.js - 管理画面API              │
│                                                  │
│  管理画面: google.script.run (GASネイティブ)      │
│  PWA: ContentService JSON (HTTP GET)             │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│          Google Spreadsheet                      │
│  物件マスタ / 部屋マスタ / inspection_data       │
└─────────────────────────────────────────────────┘
```

**認証フロー**:

- **PWA**: API Key（`apiKey`パラメータ）→ `validateApiKey()` → ScriptProperties照合
- **管理画面**: `ADMIN_TOKEN`（`google.script.run`経由）→ `library_client.gs:adminAction` → トークン照合

---

## 制約事項の確認

| 制約                                                  | 影響                                                  |
| ----------------------------------------------------- | ----------------------------------------------------- |
| GAS Web Apps fetch POST → 302リダイレクト CORS問題    | **全通信GETのみ**。API KeyのURLパラメータ送信回避不可 |
| Alpine.js CSP制約（ES5のみ、`&&`/`;`/アロー関数禁止） | 管理画面のXSS対策に制約あり                           |
| ライブラリはジェネリック（API_KEY固定値禁止）         | ライブラリ側でAPI Keyをハードコード不可               |
| `ADMIN_TOKEN`はクライアント側管理                     | トークンの保護手段が限定                              |
| コミットは `--no-verify`                              | プッシュ時の自動検証なし                              |

---

## フェーズ1: 即時対応（Critical）

> **目標**: 秘密情報の漏洩リスクを即座に排除
> **所要目安**: 1〜2日

### 1-1. `.env` のGit履歴からの完全削除

- **ファイル**: `.env`, `.gitignore`
- **重大度**: Critical
- **複雑さ**: M
- **現状**: `.env` には `VITE_GAS_API_KEY=daishin-8661234` と `VITE_GAS_WEB_APP_URL` が含まれている。`.gitignore` に `.env` は記載済みだが、Git履歴に残存している可能性がある。
- **対応**:
  1. `.env` が現在ステージング/トラッキングされていないか確認: `git ls-files .env`
  2. 過去コミットに含まれていた場合、`git filter-branch` または `git filter-repo` で履歴から削除
  3. `BFG Repo-Cleaner` を使う方が確実:
     ```bash
     bfg --delete-files .env
     git reflog expire --expire=now --all
     git gc --prune=now --aggressive
     ```
  4. **API Key のローテーション必須**: `daishin-8661234` は漏洩済みとみなし、新しいキーに変更。GAS ScriptProperties の `API_KEY` を更新。
  5. `.env.example` はプレースホルダ値のみとし、実値を含めない
- **検証**: `git log --all --full-history -- .env` で履歴に残っていないことを確認
- **依存**: なし（独立実施可能）

### 1-2. `.clasp.json` をバージョン管理から除外

- **ファイル**: `.gitignore`, `backend/水道検針ライブラリ/.clasp.json`
- **重大度**: High
- **複雑さ**: S
- **現状**: `.clasp.json` に GAS Script ID `1iSR_dY3jWIN3rXRXMeYKyulOggtmM2LDhkzlFqM9MccWCupqEwquE04-` が含まれている。このIDは公開情報に近いが、管理上のリスクとして除外が望ましい。
- **対応**:
  1. `.gitignore` に `.clasp.json` を追加
  2. `git rm --cached backend/水道検針ライブラリ/.clasp.json`
  3. `.clasp.json.example` を作成（scriptIdは空欄）
- **検証**: `git status` で .clasp.json が untracked であることを確認
- **依存**: なし

### 1-3. `debugInfo` からヘッダー情報の削除

- **ファイル**: `backend/水道検針ライブラリ/api_data_functions.js`
- **重大度**: Critical
- **複雑さ**: S
- **現状**: `updateMeterReadings()` のレスポンス（808〜820行目）に `debugInfo` オブジェクトが含まれ、`headers: headers` でスプレッドシートの全カラムヘッダーがクライアントに露出している。これは内部スキーマ構造の漏洩であり、攻撃者のリサーチに利用される可能性がある。
- **対応**:
  1. `debugInfo` オブジェクト全体をレスポンスから削除
  2. デバッグ情報が必要な場合は、`Logger.log()` のみに出力し、APIレスポンスには含めない
  3. 具体的に削除する箇所（808〜820行目）:
     ```javascript
     // 削除対象:
     debugInfo: {
       warningFlagColumnExists: ...,
       warningFlagColumnIndex: ...,
       standardDeviationColumnExists: ...,
       standardDeviationColumnIndex: ...,
       totalColumns: ...,
       headers: headers,              // ← 最も危険
       processedData: readings.map(...)
     }
     ```
  4. 代わりに `Logger.log()` でデバッグ出力する形に変更
- **検証**: テストリクエストでレスポンスに `debugInfo`/`headers` が含まれないことを確認
- **依存**: なし

### 1-4. TrustedTypes CSP shim の修正

- **ファイル**: `admin-ui/index.html`
- **重大度**: Critical
- **複雑さ**: M
- **現状**: 9〜23行目の TrustedTypes ポリシーが全ての文字列をパススルーしており、XSS保護が完全に無効化されている:
  ```javascript
  createHTML: function (string) { return string; },
  createScriptURL: function (string) { return string; },
  createScript: function (string) { return string; },
  ```
- **対応**:
  1. **Alpine.jsの制約を考慮**: GAS環境下のAlpine.jsはインラインスクリプト・インラインイベントハンドラに依存するため、`createScript`/`createHTML` の完全なサニタイズは現実的ではない
  2. **最小限の保護を適用**:
     - `createScriptURL`: 許可リスト（`alpinejs` CDN、`bulma` CDN、自ドメイン）のみ通す
     - `createHTML`: 最低限、`<script>` タグの注入をブロック
     - `createScript`: GASの制約上パススルー維持（ドキュメントに理由を明記）
  3. 改修コード:
     ```javascript
     if (window.trustedTypes && window.trustedTypes.createPolicy) {
       window.trustedTypes.createPolicy('default', {
         createHTML: function (string) {
           // <script> タグの注入をブロック
           if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(string)) {
             console.error('[TrustedTypes] Blocked script injection in HTML');
             return '';
           }
           return string;
         },
         createScriptURL: function (string) {
           var allowed = [
             'https://cdn.jsdelivr.net/npm/alpinejs',
             'https://cdn.jsdelivr.net/npm/bulma',
             'https://cdn.jsdelivr.net/npm/@alpinejs',
           ];
           for (var i = 0; i < allowed.length; i++) {
             if (string.indexOf(allowed[i]) === 0) return string;
           }
           console.error('[TrustedTypes] Blocked disallowed script URL: ' + string);
           return '';
         },
         createScript: function (string) {
           // GAS Alpine.js制約: インラインイベントハンドラが必要なためパススルー
           // TODO: Alpine.js移行時にサニタイズ実装
           return string;
         },
       });
     }
     ```
- **注意**: Alpine.js CSP制約により `createScript` はパススルーのまま。完全修正はAlpine.js脱却時。
- **検証**: `<script>` タグ注入テスト、不正URL読み込みテスト
- **依存**: なし

---

## フェーズ2: 短期対応（High）

> **目標**: データ侵害・情報漏洩リスクの低減
> **所要目安**: 3〜5日

### 2-1. スプレッドシート数式インジェクション対策の強化

- **ファイル**: `backend/水道検針ライブラリ/property_management.js`
- **重大度**: High
- **複雑さ**: S
- **現状**: `=`, `+`, `-`, `@` で始まる文字列に `'` プレフィックスを付与する対策がある（104〜112行目など）が、以下の問題がある:
  - `\t`, `\r`, `\n` で始まる数式インジェクションを防いでいない
  - `updateInspectionData` の `roomNotes`（1004行目）は未サニタイズ
  - 対策が散在しており、統一関数にすべき
- **対応**:
  1. 共通サニタイズ関数を作成:
     ```javascript
     function sanitizeSpreadsheetInput(value) {
       if (typeof value !== 'string') value = String(value || '');
       var trimmed = value.trim();
       // 数式インジェクション文字: = + - @ \t \r
       if (/^[=+\-@\t\r]/.test(trimmed)) {
         return "'" + value;
       }
       return value;
     }
     ```
  2. `addProperty`, `addRoom`, `updateRoom`, `bulkAddProperties`, `bulkAddRooms`, `updateInspectionData` の全箇所で `sanitizeSpreadsheetInput()` を適用
  3. `roomNotes`, `roomStatus` 等のフリーテキストフィールドにも適用
  4. 散在する既存のパターンマッチング（`startsWith('=')` 等）を統一関数に置換
- **検証**: `=SUM(A1:A10)`, `\tSUM(...)`, `+cmd|...` 等の入力で `'` プレフィックスが付くことを確認
- **依存**: なし

### 2-2. APIエラーレスポンスのサニタイズ

- **ファイル**: `backend/水道検針ライブラリ/web_app_api.js`, `api_data_functions.js`, `web_app_admin_api.js`
- **重大度**: High
- **複雑さ**: M
- **現状**: 80箇所以上で `error.message` がそのままレスポンスに含まれている。内部パス、シート名、カラム名などが漏洩する可能性がある。
- **対応**:
  1.  共通エラーサニタイズ関数を作成（**PWA向けAPIのみ適用、管理画面向けは維持**）:
      ```javascript
      // エラー型に応じた安全なメッセージマッピング
      // ※ 全て SYSTEM_ERROR にするとバリデーションエラー等の有用な情報まで隠されるため、
      //    エラーの性質に応じて適切なメッセージを返す
      function sanitizeErrorMessage(error, action) {
        Logger.log('[' + action + '] エラー: ' + error.message);
        var msg = error.message || '';
        // バリデーション系（ユーザー入力が原因）→ ユーザーに有用な情報を返す
        if (/パラメータ|形式が不正|無効です|必須です|見つかりません/.test(msg)) {
          return msg; // 既に安全なメッセージ
        }
        // ロック系
        if (/lock|タイムアウト|他の処理/.test(msg)) {
          return '他の処理が実行中です。しばらくお待ちください。';
        }
        // 重複系
        if (/重複|already exists|duplicate/.test(msg)) {
          return 'データが重複しています。';
        }
        // 上記以外 → 内部情報を含む可能性があるため一般的なメッセージに
        return 'システムエラーが発生しました。しばらく経ってからお試しください。';
      }
      ```
  2.  `web_app_api.js` の全 catch ブロックで `error.message` を `sanitizeErrorMessage(error, actionName)` に置換
  3.  外部API（PWA向け）のエラーメッセージは `sanitizeErrorMessage()` 経由に統一
  4.  管理画面（`google.script.run`）向けは詳細エラーを維持（GASネイティブ通信のため外部露出なし）
  5.  **入力値（propertyId, roomId等）をエラーメッセージにそのまま含めない** — ユーザー入力は `Logger.log` のみに出力し、レスポンスには含めない:
      ```javascript
      // ❌ Before: return { success: false, error: '物件 ' + propertyId + ' が見つかりません' };
      // ✅ After:  return { success: false, error: '指定された物件が見つかりません' };
      //           Logger.log('[getRooms] propertyId not found: ' + propertyId);
      ```
  6.  **置換対象箇所（主なもの）**:
      - `web_app_api.js:157` - `getRooms` エラー
      - `web_app_api.js:194` - `getMeterReadings` エラー
      - `web_app_api.js:220` - `updateMeterReadings` エラー
      - `web_app_api.js:248` - `saveAndNavigate` エラー
      - `web_app_api.js:339-342` - バッチ処理エラー
      - `web_app_api.js:407` - 未知のアクション → **action名を露出しない**: `'不明なアクション: ' + action` → `'無効なリクエストです'`
      - `api_data_functions.js:82,262,557,823,828,921,924` 等
  7.  **`adminDispatch` の未知action対応**（`web_app_admin_api.js`）: switch-case の default で `action` 名をエラーメッセージに含めないよう変更:
      ```javascript
      // ❌ Before: return { success: false, error: '不明なアクション: ' + action };
      // ✅ After:  return { success: false, error: '無効なリクエストです' };
      //           Logger.log('[adminDispatch] Unknown action: ' + action);
      ```
- **検証**: 不正なパラメータでAPI呼び出し、レスポンスに内部情報・action名・入力値が含まれないことを確認
- **依存**: なし（独立実施可能）

### 2-3. X-Frame-Options の修正

- **ファイル**: `backend/水道検針ライブラリ/web_app_api.js`
- **重大度**: High
- **複雑さ**: S
- **現状**: 102行目で `HtmlService.XFrameOptionsMode.ALLOWALL` を設定しており、任意のサイトからiframe埋め込み（クリックジャッキング）が可能。
- **対応**:
  1. **注意**: 管理画面（`admin-ui`）はGAS iframeとして動作するため、`ALLOWALL` を単に削除すると管理画面が表示されなくなる可能性がある
  2. GAS Web Appでiframeを使わない場合（直接URLアクセス）のテストが必要
  3. **推奨対応**: 管理画面をiframeで利用する要件がなければ `ALLOWALL` を削除:
     ```javascript
     return HtmlService.createHtmlOutputFromFile('admin')
       .setTitle('水道検針 管理画面')
       .addMetaTag('viewport', 'width=device-width, initial-scale=1');
     ```
  4. もしiframe利用が必要な場合、特定オリジンのみ許可する（ただしGASは `ALLOWALL` か `DEFAULT` の2択のため、中間的な指定は不可）
  5. **ロールバック手順**: `DEFAULT`（ALLOWALL削除）に変更後、管理画面が表示されない場合は直ちに `ALLOWALL` に戻す。変更はライブラリの新バージョン作成→クライアント側の参照更新→動作確認までが一連の操作。問題があればライブラリ参照を旧バージョンに戻すだけで復旧可能。
- **注意事項**: GASの `XFrameOptionsMode` は `ALLOWALL` と `DEFAULT` のみ対応。`DEFAULT` は `SAMEORIGIN` を設定するが、GASホスティング環境での動作確認が必須。
- **検証**: 管理画面が正常表示されること、外部サイトからのiframe埋め込みが拒否されること
- **依存**: なし

### 2-4. `completePropertyInspectionSimple` への LockService 追加

- **ファイル**: `backend/水道検針ライブラリ/api_data_functions.js`
- **重大度**: Medium（High寄り）
- **複雑さ**: S
- **現状**: `completePropertyInspectionSimple`（845〜928行目）はスプレッドシートへの書き込みを行うが、`LockService` を使用していない。他のCRUD操作（`addProperty`, `addRoom` 等）は `withScriptLock` ラッパーを使用している。
- **対応**:
  1. `withScriptLock` ラッパーで囲む:
     ```javascript
     function completePropertyInspectionSimple(propertyId, completionDate) {
       return withScriptLock(function () {
         // 既存の処理...
       }, 30000);
     }
     ```
  2. `withScriptLock` ヘルパー関数が存在することを確認（既に `property_management.js` で使用されている）
- **検証**: 同時実行テスト（2つのリクエストが同時に同じ物件の検針完了を行う）
- **依存**: `withScriptLock` の定義場所の確認（`utilities.js` 等にあるはず）

---

## フェーズ3: 中期対応（Medium）

> **目標**: セキュリティのベストプラクティスへの準拠
> **所要目安**: 1〜2週間

### 3-1. API Key比較のタイミング攻撃対策

- **ファイル**: `backend/水道検針ライブラリ/web_app_api.js`
- **重大度**: Medium
- **複雑さ**: S
- **現状**: 40行目で `apiKey !== storedKey` による比較を行っている。文字列の不一致が早期に検出されるため、攻撃者が応答時間からキーを推測できる可能性がある（理論上のリスク）。
- **対応**:
  1. 定数時間比較関数を実装:
     ```javascript
     function constantTimeCompare(a, b) {
       if (typeof a !== 'string' || typeof b !== 'string') return false;
       if (a.length !== b.length) return false;
       var result = 0;
       for (var i = 0; i < a.length; i++) {
         result |= a.charCodeAt(i) ^ b.charCodeAt(i);
       }
       return result === 0;
     }
     ```
  2. `web_app_api.js:40` を `!constantTimeCompare(apiKey, storedKey)` に変更
- **検証**: ユニットテストで正しいキーが認証され、間違ったキーが拒否されることを確認
- **依存**: なし

### 3-2. `sanitizeApiParams` の全エンドポイントへの適用

- **ファイル**: `backend/水道検針ライブラリ/web_app_api.js`
- **重大度**: Medium
- **複雑さ**: M
- **現状**: `sanitizeApiParams()` は `getRooms`, `updateMeterReadings`, `completeInspection` の一部でのみ呼ばれている。`getProperties`, `getMeterReadings`, `getRoomsLight`, `batchUpdateReadings` のエンドポイントでは未適用。
- **対応**:
  1. `getRoomsLight` エンドポイント（373〜403行目）に `sanitizeApiParams` を追加
  2. `batchUpdateReadings` の個別エントリにもバリデーションを追加（281〜330行目）
  3. `getMeterReadings` に `roomId` の形式チェックを追加
  4. `getProperties` はパラメータなしのため不要だが、追加パラメータが無視されることを確認
- **検証**: 不正な形式の `propertyId`/`roomId` で各エンドポイントをテスト
- **依存**: なし

### 3-3. `completionDate` パラメータのバリデーション

- **ファイル**: `backend/水道検針ライブラリ/web_app_api.js`, `api_data_functions.js`
- **重大度**: Medium
- **複雑さ**: S
- **現状**: `completionDate` パラメータは `completePropertyInspectionSimple` 内で形式チェック（`/^\d{4}-\d{2}-\d{2}$/`）があるが、日付の妥当性（未来日、極端な過去日等）の検証がない。また `batchUpdateReadings` の `completeInspection` エントリでは一切バリデーションなし。
- **対応**:
  1. `sanitizeApiParams` に `completionDate` のバリデーションを追加:
     ```javascript
     if (params.completionDate) {
       if (!/^\d{4}-\d{2}-\d{2}$/.test(String(params.completionDate))) {
         return { valid: false, error: 'completionDateの形式が不正です' };
       }
       // 妥当な日付かチェック
       var d = new Date(params.completionDate);
       if (isNaN(d.getTime())) {
         return { valid: false, error: 'completionDateが無効な日付です' };
       }
     }
     ```
  2. `batchUpdateReadings` の `completeInspection` エントリにも `completionDate` バリデーションを追加
- **検証**: 不正な日付形式でテスト
- **依存**: 3-2（sanitizeApiParamsの拡張）

### 3-4. 管理画面認証の強化

- **ファイル**: `gas_scripts/library_client.gs`, `backend/水道検針ライブラリ/web_app_admin_api.js`
- **重大度**: Medium
- **複雑さ**: M
- **現状**:
  - `adminAction`（`library_client.gs:419-456`）で `adminToken` を `!==` で比較
  - `ADMIN_TOKEN` は `sessionStorage` に平文保存（`admin-ui/src/api.js:13`）
  - セッションタイムアウトは実装済み（`auth.js` の `isSessionExpired`）
- **対応**:
  1. `adminAction` のトークン比較を定数時間比較に変更（3-1と同じ関数）
  2. 管理画面のアクセスログを記録（誰がいつログインしたか）
  3. ログイン失敗回数の制限（レート制限的な対策）
- **検証**: 認証フローのテスト
- **依存**: 3-1

### 3-5. `getRoomsForManagement` のレスポンス最適化

- **ファイル**: `backend/水道検針ライブラリ/property_management.js`
- **重大度**: Medium
- **複雑さ**: S
- **現状**: `getRoomsForManagement`（793〜903行目）は `LockService` を使用しておらず、読み取り中にデータが変更される可能性がある。また `getSpreadsheetInfo`（970〜992行目）はスプレッドシートIDとURLを返しており、権限のないユーザーに情報を提供する可能性がある。
- **対応**:
  1. `getRoomsForManagement` 自体は読み取り専用のため LockService は必須ではないが、データ整合性のため軽いロックの追加を検討
  2. `getSpreadsheetInfo` のレスポンスから `spreadsheetId` と `url` を管理画面専用にし、PWA向けAPIには含めない
- **検証**: データ整合性テスト
- **依存**: なし

---

## 受容リスク（修正不可・制約による）

### R-1. API Key の GET URL パラメータ送信【受容】

- **対象**: Finding #2
- **理由**: GAS Web Apps の ContentService は POST リクエストに対して 302リダイレクトを返し、ブラウザのCORS制限によりレスポンスを読み取れない。そのため **全通信が GET でなければならない** というアーキテクチャ上の制約がある。
- **現状の緩和策**:
  - `_storedApiKey` インジェクション: `library_client.gs` が `e.parameter._storedApiKey` に ScriptProperties から取得したキーを注入し、URL パラメータによる `_storedApiKey` 上書きを防止している（364〜370行目）
  - API Key はScriptPropertiesに保存され、コード内にハードコードされていない
- **推奨**: HTTPSを使用しているため、転送中の暗号化は確保されている。ブラウザ履歴・サーバーログへの露出はリスクとして受容する。

### R-2. 管理画面の TrustedTypes `createScript` パススルー【受容】

- **対象**: Finding #4 の一部
- **理由**: GAS環境下でAlpine.jsを使用するため、インラインイベントハンドラ（`x-on:click="..."`等）が TrustedTypes の `createScript` ポリシーを通過する必要がある。GASが自動付与するCSPヘッダーとAlpine.jsの要件が競合する。
- **緩和策**: `createHTML` と `createScriptURL` には保護を実装。`createScript` はAlpine.js脱却時に修正。
- **長期対応**: Alpine.js から Svelte/Lit 等のCSP互換フレームワークへの移行

### R-3. PWA APIコールのCSRF保護なし【部分的受容】

- **対象**: Finding #13
- **理由**: GET リクエストに対する CSRF 保護は困難（カスタムヘッダーが使えない）。API Key 自体が一種のCSRFトークンとして機能している（正当なリクエストにはAPI Keyが必要）。
- **緩和策**:
  - API Key が第三者に知られなければ、CSRF攻撃は成立しない
  - API Key は Vite ビルド時にバンドルに埋め込まれるため、PWA利用者には露出するが、外部攻撃者には直接見えない
  - 書き込み操作には `requireAuth=true` で API Key を必須としている
- **長期対応**: GASのアーキテクチャ変更が可能になった際、POST+カスタムヘッダーに移行

---

## やってはいけないこと

### ❌ GAS doPost への移行（PWA）

PWAの `gasFetch` を POST に変更してはならない。GAS Web Apps + ContentService の組み合わせでは POST が 302リダイレクトを引き起こし、CORSエラーでレスポンスを取得できなくなる。現在のGET通信はGASの制約による正しい設計。

### ❌ API Key のライブラリ側ハードコード

ライブラリ（`cmlibrary`）は複数のクライアントプロジェクトから利用されるため、API Key をライブラリ側に固定してはならない。現在の `_storedApiKey` インジェクションパターン（`library_client.gs:364-370`）は正しいアプローチ。

### ❌ 管理画面の Alpine.js x-属性でのサニタイズ

Alpine.js の CSP 制約（ES5 `function()` のみ、`;` 不可、`&&` 不可）により、HTMLサニタイズライブラリを x-属性内で使用できない。DOMPurify 等の使用は Alpine.js のビルドパイプライン変更が必要。管理画面のXSS対策はGAS サーバー側の出力エスケープに依存すべき。

### ❌ `completePropertyInspectionSimple` の `completionDate` の完全削除

`completionDate` パラメータを削除して常に現在日付にすると、バッチ処理や遡及登録ができなくなる。バリデーションの強化は行うが、パラメータ自体は維持する。

### ❌ 管理画面の `google.script.run` を HTTP fetch に変更

管理画面はGASの `google.script.run` API（サーバーサイド関数の直接呼び出し）を使用しており、これをHTTP fetchに変更するとCORS問題が発生する。現在のアーキテクチャを維持する。

### ❌ `.env` の代わりにGAS ScriptPropertiesのみを使う

PWA（Viteビルド）は環境変数をビルド時にバンドルする必要がある。`VITE_GAS_WEB_APP_URL` と `VITE_GAS_API_KEY` はビルド時に必要。`.env` 自体の管理は正しいが、Git履歴からの削除が必要。

---

## テスト方針

### フェーズ1テスト

| テスト項目             | 方法                              | 期待結果                                |
| ---------------------- | --------------------------------- | --------------------------------------- |
| `.env` 履歴削除        | `git log --all -- .env`           | 結果なし                                |
| API Key ローテーション | PWAからのAPI呼び出し              | 新Key成功、旧Key拒否                    |
| `debugInfo` 削除       | `updateMeterReadings` API呼び出し | レスポンスに `debugInfo`/`headers` なし |
| TrustedTypes           | `<script>` タグ注入テスト         | ブロックされる                          |
| `.clasp.json` 除外     | `git ls-files .clasp.json`        | 結果なし                                |

### フェーズ2テスト

| テスト項目                 | 方法                        | 期待結果                       |
| -------------------------- | --------------------------- | ------------------------------ |
| 数式インジェクション       | `=SUM()` 入力で物件追加     | `'` プレフィックス付きで保存   |
| エラーメッセージサニタイズ | 不正パラメータでAPI呼び出し | 内部情報（パス・シート名）なし |
| X-Frame-Options            | 外部HTMLからのiframe        | 埋め込み拒否                   |
| LockService                | 同時実行テスト              | データ不整合なし               |

### フェーズ3テスト

| テスト項目                    | 方法                     | 期待結果               |
| ----------------------------- | ------------------------ | ---------------------- |
| タイミング攻撃対策            | 大量の不正キーで計時     | 応答時間のばらつき最小 |
| バリデーション全適用          | 全エンドポイントに不正ID | 適切に拒否             |
| completionDate バリデーション | 不正日付形式             | エラーレスポンス       |
| 認証強化                      | 連続ログイン失敗         | レート制限動作         |

### 回帰テスト

各フェーズの実装後、以下の既存テストスイートを実行:

```bash
npm test                    # 321テストケース
npm run lint                # ESLint
npm run build               # ビルド成功確認
```

---

## 実装順序（依存関係）

```
フェーズ1（即時）
├── 1-1 .env履歴削除 ─────── API Key ローテーション
├── 1-2 .clasp.json除外
├── 1-3 debugInfo削除
└── 1-4 TrustedTypes修正

フェーズ2（短期）※ フェーズ1完了後
├── 2-1 数式インジェクション強化
├── 2-2 エラーメッセージサニタイズ
├── 2-3 X-Frame-Options修正
└── 2-4 LockService追加

フェーズ3（中期）※ フェーズ2完了後
├── 3-1 タイミング攻撃対策
├── 3-2 sanitizeApiParams全適用
├── 3-3 completionDate検証 ← 3-2に依存
├── 3-4 管理画面認証強化 ← 3-1に依存
└── 3-5 レスポンス最適化
```

---

## 附録: 検証済みファインディングス一覧

| #   | 重大度   | ファインディング         | 確認結果                                    | フェーズ  |
| --- | -------- | ------------------------ | ------------------------------------------- | --------- |
| 1   | Critical | `.env` Git露出           | ✅ 確認: `daishin-8661234` 含む             | 1-1       |
| 2   | Critical | API Key GET URL送信      | ✅ 確認: `gasClient.ts:64-66`               | 受容(R-1) |
| 3   | Critical | `debugInfo` ヘッダー露出 | ✅ 確認: `api_data_functions.js:808-820`    | 1-3       |
| 4   | Critical | TrustedTypes無効化       | ✅ 確認: `index.html:9-23`                  | 1-4       |
| 5   | High     | 数式インジェクション     | ✅ 確認: 部分対策あり                       | 2-1       |
| 6   | High     | 生 `error.message` 返却  | ✅ 確認: 80+箇所                            | 2-2       |
| 7   | High     | X-Frame-Options ALLOWALL | ✅ 確認: `web_app_api.js:102`               | 2-3       |
| 8   | High     | `.clasp.json` Script ID  | ✅ 確認: `.clasp.json:scriptId`             | 1-2       |
| 9   | Medium   | `!==` タイミング攻撃     | ✅ 確認: `web_app_api.js:40`                | 3-1       |
| 10  | Medium   | sanitizeApiParams 未適用 | ✅ 確認: 複数エンドポイント                 | 3-2       |
| 11  | Medium   | completionDate 未検証    | ✅ 確認: 一部形式チェックのみ               | 3-3       |
| 12  | Medium   | LockService 欠落         | ✅ 確認: `completePropertyInspectionSimple` | 2-4       |
| 13  | Medium   | CSRF保護なし             | ✅ 確認: PWA fetch GET                      | 受容(R-3) |

---

## レビュー履歴

### レビュー1（2026-04-19）

**レビュアー**: Sisyphus-Junior (unspecified-high)
**結果**: 条件付き通過 → 4件の指摘を反映

| 指摘ID | 重要度 | 内容                                                                                                  | 反映状況                                                  |
| ------ | ------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| C-1    | High   | `sanitizeErrorMessage` が常に `SYSTEM_ERROR` を返すため、バリデーションエラー等の有用情報まで隠される | ✅ エラー型に応じたマッピング実装に変更                   |
| R-1    | High   | X-Frame-Options変更時のロールバック手順が未記載                                                       | ✅ ロールバック手順（ライブラリ参照バージョン戻し）を追加 |
| P-1    | Medium | `adminDispatch` の switch-case で未知action名がエラーメッセージに露出                                 | ✅ 2-2にaction名非表示の対応を追加                        |
| P-3    | Medium | 一部エンドポイントが入力値（propertyId等）をエラーメッセージに反映                                    | ✅ 2-2に入力値非表示ルールを追加                          |
