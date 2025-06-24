# daishin_kaihatu_project

## 概要

本リポジトリは、大信開発の水道検針業務を効率化するためのWebアプリケーションおよびGoogle Apps Script（GAS）スクリプト群を管理しています。
現場での検針データ入力、物件・部屋情報の管理、データ整合性チェック、最適化、バックアップなどを一元的にサポートします。

---

## 主な構成

### 1. Google Apps Script（`gas_scripts/`）

- **main.gs**: エントリーポイント、メニュー生成、onOpenトリガー
- **web_app_api.gs**: Web API（doGet/doPost）でWebアプリと連携
- **data_management.gs / data_validation.gs / data_cleanup.gs**: データ管理・検証・クリーンアップ
- **dialog_functions.gs**: ダイアログ表示やユーザーインターフェース
- **utilities.gs**: 共通ユーティリティ関数
- **設定.gs**: 設定値管理
- **debug_functions.gs**: デバッグ・診断用
- **appsscript.json**: GASプロジェクト設定

#### 主な機能（GAS）

- 検針データの取得・更新API
- データ整合性チェック・最適化・重複削除・インデックス作成
- スプレッドシートの自動バックアップ
- メニューからのワンクリック自動処理
- エラー時の詳細レポート表示

---

### 2. フロントエンドWebアプリ（`html_files/`）

- **main_app/**: 検針データ入力（meter_reading.html）、物件選択（property_select.html）、部屋選択（room_select.html）
- **testing/**: APIテスト、レスポンス検証用
- **utilities/**: カラム検証・データマッピング確認用

#### 主な機能（Webアプリ）

- 物件・部屋ごとの検針データ入力・履歴表示
- 検針値の自動計算・異常値警告
- PWA（プログレッシブWebアプリ）対応：オフライン利用、インストール、キャッシュ戦略
- セキュリティ対策（XSS/CSRF/入力値検証/HTTPS推奨）
- レスポンシブデザイン・動的CSS読み込み

---

### 3. スプレッドシート連携

- 物件マスタ、部屋マスタ、検針データ（inspection_data）シートと連携
- データ最適化・バックアップ・自動反映

---

## 代表的な利用シーン

- 現場でスマホやタブレットから検針値を入力
- 管理者がWebアプリやスプレッドシートでデータを一元管理
- データの整合性・最適化・バックアップをワンクリックで実施

---

## 開発・運用上の注意

- GASスクリプトは「main.gs → utilities.gs → web_app_api.gs → gas_dialog_functions.gs」の順でアップロード
- WebアプリはPWA対応、Service Workerによるキャッシュ戦略あり
- データ処理前にバックアップ推奨
- テスト環境で十分に動作確認してから本番運用

---

## サポート・問い合わせ

- 不明点はGitHub Issuesまたは管理者まで

---

このREADMEはプロジェクトの全体像・構成・主な機能・運用上の注意点をまとめたものです。
より詳細な使い方や各機能の説明は、`gas_scripts/README.md`・`html_files/README.md`・`総合カスタム処理_説明書.md`を参照してください。
