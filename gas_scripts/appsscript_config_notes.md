# appsscript.json 設定説明

このファイルは Google Apps Script プロジェクトの設定ファイルです。

## 設定内容

- **timeZone**: "Asia/Tokyo" - 日本時間に設定
- **dependencies.enabledAdvancedServices**: [] - 現在は追加サービスなし
- **exceptionLogging**: "STACKDRIVER" - エラーログをStackdriverに送信
- **runtimeVersion**: "V8" - V8エンジンを使用（推奨）
- **webapp.executeAs**: "USER_DEPLOYING" - デプロイユーザーとして実行
- **webapp.access**: "ANYONE" - 誰でもアクセス可能

## 注意事項

- JSONファイルなので、コメントは含められません
- プロジェクトルートに配置する必要があります
- Google Apps Scriptプロジェクトでの実際の設定は管理画面から行います
