# Google Apps Script ファイル管理

このフォルダには、水道メーター読み取りアプリケーションで使用されるすべてのGoogle Apps Script（.gs）ファイルが含まれています。

## 📁 ファイル構成

### メインファイル
- **`main.gs`** - エントリーポイント、onOpen()トリガー
- **`web_app_api.gs`** - Web App API関数群、doGet()、doPost()
- **`gas_dialog_functions.gs`** - 統合された主要機能（物件.gs + 総合カスタム処理.gsから統合）

### データ管理
- **`data_management.gs`** - データ管理機能
- **`data_validation.gs`** - データ検証機能
- **`data_cleanup.gs`** - データクリーンアップ機能
- **`data_formatting.gs`** - データフォーマット機能

### ユーティリティ
- **`utilities.gs`** - 共通ユーティリティ関数
- **`dialog_functions.gs`** - ダイアログ表示機能
- **`設定.gs`** - 設定管理

### デバッグ・開発支援
- **`debug_functions.gs`** - デバッグ機能、システム診断
- **`debug_headers.gs`** - ヘッダー情報デバッグ

### レガシーファイル（参考用）
- **`物件.gs`** - 旧物件管理（gas_dialog_functions.gsに統合済み）
- **`総合カスタム処理.gs`** - 旧カスタム処理（gas_dialog_functions.gsに統合済み）

## 🚀 デプロイメント手順

### 1. Google Apps Scriptプロジェクトの準備
```
1. Google Apps Script (script.google.com) にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を「水道メーター読み取りアプリ」に設定
```

### 2. ファイルのアップロード順序
```
1. main.gs （最初にアップロード）
2. utilities.gs
3. web_app_api.gs
4. gas_dialog_functions.gs （メイン機能）
5. その他のファイル（data_*.gs, debug_*.gs等）
```

### 3. Web Appとして公開
```
1. デプロイ → 新しいデプロイ
2. 種類: ウェブアプリ
3. 実行者: 自分
4. アクセス権限: 全員
5. デプロイ
```

## 🔧 主要関数

### エントリーポイント
- `onOpen()` - スプレッドシート開時のメニュー作成
- `doGet(e)` - HTTP GETリクエスト処理
- `doPost(e)` - HTTP POSTリクエスト処理

### アプリケーション関数
- `showWaterMeterApp()` - メインアプリケーション表示
- `getMeterReadings(propertyId, roomId)` - 検針データ取得
- `updateMeterReadings(propertyId, roomId, readings)` - 検針データ更新

### データ管理関数
- `validateInspectionDataIntegrity()` - データ整合性チェック
- `runComprehensiveDataOptimization()` - 総合データ最適化
- `createDataIndexes()` - データインデックス作成

### デバッグ関数
- `forceCreateMenu()` - 強制メニュー作成
- `runSystemDiagnostics()` - システム診断
- `measurePerformance()` - パフォーマンス測定

## 📊 推奨スプレッドシート構成

必要なシート:
- **物件マスタ** - 物件情報
- **部屋マスタ** - 部屋情報  
- **inspection_data** - 検針データ

## 🛠️ トラブルシューティング

### メニューが表示されない場合
```javascript
// スクリプトエディタで実行
forceCreateMenu();
```

### システム診断
```javascript
// スクリプトエディタで実行
runSystemDiagnostics();
```

### パフォーマンス測定
```javascript
// スクリプトエディタで実行
measurePerformance();
```

## 📝 更新履歴

- **2024-06-16**: gas_scriptsフォルダに整理統合
- **2024-06-15**: 統合テスト完了
- **2024-06-14**: 動的キャッシュバスティング実装
- **2024-06-13**: ゼロ値処理機能追加

## ⚠️ 注意事項

1. **実行順序**: main.gs → utilities.gs → web_app_api.gs → gas_dialog_functions.gs の順序でアップロード
2. **権限設定**: Web App公開時は適切なアクセス権限を設定
3. **バックアップ**: デプロイ前に既存データのバックアップを推奨
4. **テスト**: 本番環境デプロイ前にテスト環境での動作確認を実施

---
📧 サポート: GitHub Issues または開発者に連絡
🔗 プロジェクト: https://github.com/your-repo/LINE_app_project
