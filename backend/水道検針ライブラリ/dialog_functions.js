/**
 * dialog_functions.gs - ダイアログ表示機能
 * Web App URL案内とユーザーガイド機能を提供
 * Version: 1.0.0 - Library Edition
 */

/**
 * 水道検針WebAppを表示
 * @param {string} customUrl - カスタムURL（オプション）
 * @returns {Object} 表示結果
 */
function showWaterMeterWebApp(customUrl = null) {
  try {
    console.log('[showWaterMeterWebApp] Web App案内開始');
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('[showWaterMeterWebApp] UI利用不可');
      return showExecutionGuidance();
    }
    
    // Web App URLを取得
    const webAppUrl = customUrl || getWebAppUrl() || 'https://script.google.com/macros/s/{YOUR_SCRIPT_ID}/exec';
    
    const message = `🌐 水道検針アプリ Web App

📱 アプリにアクセス:
${webAppUrl}

🚀 機能:
• 物件選択
• 部屋選択  
• 検針データ入力
• データ管理

💡 使用方法:
1. 上記URLをブラウザで開く
2. 物件を選択
3. 部屋を選択
4. 検針データを入力

🔧 管理機能:
• データ検証: validateInspectionDataIntegrity()
• データクリーンアップ: optimizedCleanupDuplicateInspectionData()
• 統合処理: runComprehensiveDataOptimization()`;
    
    const response = ui.alert(
      '水道検針アプリ',
      message,
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response === ui.Button.OK) {
      console.log('[showWaterMeterWebApp] ユーザーがOKを選択');
      return { success: true, action: 'confirmed', url: webAppUrl };
    } else {
      console.log('[showWaterMeterWebApp] ユーザーがキャンセルを選択');
      return { success: true, action: 'cancelled' };
    }
    
  } catch (error) {
    console.error('[showWaterMeterWebApp] エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 検索機能の使用方法ガイドを表示
 * @returns {Object} 表示結果
 */
function showSearchUsageGuide() {
  try {
    console.log('[showSearchUsageGuide] 検索ガイド表示開始');
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('[showSearchUsageGuide] UI利用不可、コンソール出力');
      return logSearchUsageGuide();
    }
    
    const message = `🔍 高速検索機能 使用ガイド

📋 検索タイプ:
• 'property' - 物件検索
• 'room' - 部屋検索  
• 'meter' - 検針データ検索
• 'propertyRooms' - 物件の部屋一覧
• 'roomMeters' - 部屋の検針履歴

💻 使用例:
// 物件検索
const property = fastSearch('property', 'P000001');

// 部屋検索
const room = fastSearch('room', 'R001');

// 物件の部屋一覧
const rooms = fastSearch('propertyRooms', 'P000001');

🚀 パフォーマンス向上:
• インデックス作成: createAllIndexes()
• インデックス更新: updateSearchIndexes()
• バッチ検索: batchSearch()

⚡ 高速化のコツ:
1. 定期的にインデックスを更新
2. 大量検索時はbatchSearchを使用
3. 検索結果をキャッシュ活用

🛠️ メンテナンス:
• インデックス再構築: rebuildAllIndexes()
• 検索パフォーマンス測定: measureSearchPerformance()`;
    
    const response = ui.alert(
      '検索機能ガイド',
      message,
      ui.ButtonSet.OK
    );
    
    console.log('[showSearchUsageGuide] ガイド表示完了');
    return { success: true, action: 'guide_shown' };
    
  } catch (error) {
    console.error('[showSearchUsageGuide] エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ライブラリ使用ガイドを表示
 * @returns {Object} 表示結果
 */
function showLibraryUsageGuide() {
  try {
    console.log('[showLibraryUsageGuide] ライブラリガイド表示開始');
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      return logLibraryUsageGuide();
    }
    
    const message = `📚 水道検針ライブラリ 使用ガイド

🔧 セットアップ:
1. Google Apps Scriptプロジェクトで「ライブラリ」を追加
2. ライブラリIDを入力
3. 識別子を「cmlibrary」に設定
4. 最新バージョンを選択

💾 基本的なAPI:
• getProperties() - 物件一覧取得
• getRooms(propertyId) - 部屋一覧取得  
• getMeterReadings(propertyId, roomId) - 検針データ取得
• updateMeterReadings(propertyId, roomId, readings) - データ更新

🛠️ データ管理:
• populateInspectionDataFromMasters() - データ自動生成
• validateInspectionDataIntegrity() - 整合性チェック
• formatAllPropertyIds() - IDフォーマット統一
• cleanupSheetData() - データクリーンアップ

🔍 検索機能:
• fastSearch(type, key) - 高速検索
• createAllIndexes() - インデックス作成
• testSearchFunctions() - 検索テスト

⚠️ 注意事項:
• ライブラリの識別子は必ず「cmlibrary」に設定
• 大量データ処理時はバッチ関数を使用
• 定期的にデータ整合性をチェック`;
    
    const response = ui.alert(
      'ライブラリ使用ガイド',
      message,
      ui.ButtonSet.OK
    );
    
    return { success: true, action: 'library_guide_shown' };
    
  } catch (error) {
    console.error('[showLibraryUsageGuide] エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Web App URLを取得
 * @returns {string|null} Web App URL
 */
function getWebAppUrl() {
  try {
    // スクリプトのURLを取得
    const scriptId = ScriptApp.getScriptId();
    if (scriptId) {
      return `https://script.google.com/macros/s/${scriptId}/exec`;
    }
    return null;
  } catch (error) {
    console.error('Web App URL取得エラー:', error);
    return null;
  }
}

/**
 * 実行ガイダンスを表示（UI利用不可時）
 * @returns {Object} 実行結果
 */
function showExecutionGuidance() {
  try {
    const guidance = `
=== 水道検針アプリ 実行ガイダンス ===

📱 Web Appアクセス方法:
1. Google Apps Scriptエディタを開く
2. 「デプロイ」→「新しいデプロイ」を選択
3. 種類を「ウェブアプリ」に設定
4. 実行ユーザーとアクセス権限を設定
5. デプロイしてURLを取得

🔧 手動実行方法:
• 物件一覧: getProperties()
• 部屋一覧: getRooms('P000001')
• 検針データ: getMeterReadings('P000001', 'R001')

💡 開発者向け:
• ライブラリテスト: testLibraryConnection()
• 関数一覧: showAvailableFunctions()
• 使用例: runUsageExample()
`;
    
    console.log(guidance);
    Logger.log(guidance);
    
    return { success: true, action: 'guidance_logged' };
    
  } catch (error) {
    console.error('実行ガイダンス表示エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 検索使用方法をログ出力（UI利用不可時）
 * @returns {Object} 実行結果
 */
function logSearchUsageGuide() {
  try {
    const guide = `
=== 高速検索機能 使用ガイド ===

検索タイプ:
- 'property': 物件検索
- 'room': 部屋検索
- 'meter': 検針データ検索
- 'propertyRooms': 物件の部屋一覧
- 'roomMeters': 部屋の検針履歴

使用例:
const property = fastSearch('property', 'P000001');
const room = fastSearch('room', 'R001');
const rooms = fastSearch('propertyRooms', 'P000001');

パフォーマンス向上:
- インデックス作成: createAllIndexes()
- インデックス更新: updateSearchIndexes()
- バッチ検索: batchSearch()
`;
    
    console.log(guide);
    Logger.log(guide);
    
    return { success: true, action: 'guide_logged' };
    
  } catch (error) {
    console.error('検索ガイドログ出力エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ライブラリ使用方法をログ出力（UI利用不可時）
 * @returns {Object} 実行結果
 */
function logLibraryUsageGuide() {
  try {
    const guide = `
=== 水道検針ライブラリ 使用ガイド ===

セットアップ:
1. Google Apps Scriptプロジェクトで「ライブラリ」を追加
2. ライブラリIDを入力
3. 識別子を「cmlibrary」に設定

基本API:
- getProperties(): 物件一覧取得
- getRooms(propertyId): 部屋一覧取得
- getMeterReadings(propertyId, roomId): 検針データ取得
- updateMeterReadings(propertyId, roomId, readings): データ更新

データ管理:
- populateInspectionDataFromMasters(): データ自動生成
- validateInspectionDataIntegrity(): 整合性チェック
- formatAllPropertyIds(): IDフォーマット統一

検索機能:
- fastSearch(type, key): 高速検索
- createAllIndexes(): インデックス作成
`;
    
    console.log(guide);
    Logger.log(guide);
    
    return { success: true, action: 'library_guide_logged' };
    
  } catch (error) {
    console.error('ライブラリガイドログ出力エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * エラー報告ダイアログを表示
 * @param {string} title - エラータイトル
 * @param {string} message - エラーメッセージ
 * @param {Object} details - エラー詳細
 * @returns {Object} 表示結果
 */
function showErrorDialog(title, message, details = {}) {
  try {
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      const errorLog = `ERROR - ${title}: ${message}`;
      console.error(errorLog);
      Logger.log(errorLog);
      if (details) {
        console.error('詳細:', details);
        Logger.log('詳細:', JSON.stringify(details));
      }
      return { success: true, action: 'logged' };
    }
    
    let displayMessage = `❌ ${message}`;
    
    if (details.suggestion) {
      displayMessage += `\n\n💡 対処法:\n${details.suggestion}`;
    }
    
    if (details.errorCode) {
      displayMessage += `\n\nエラーコード: ${details.errorCode}`;
    }
    
    ui.alert(title, displayMessage, ui.ButtonSet.OK);
    
    return { success: true, action: 'dialog_shown' };
    
  } catch (error) {
    console.error('エラーダイアログ表示エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 成功メッセージダイアログを表示
 * @param {string} title - タイトル
 * @param {string} message - メッセージ
 * @param {Object} result - 結果詳細
 * @returns {Object} 表示結果
 */
function showSuccessDialog(title, message, result = {}) {
  try {
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      const successLog = `SUCCESS - ${title}: ${message}`;
      console.log(successLog);
      Logger.log(successLog);
      return { success: true, action: 'logged' };
    }
    
    let displayMessage = `✅ ${message}`;
    
    if (result.summary) {
      displayMessage += `\n\n📊 結果:\n${result.summary}`;
    }
    
    if (result.duration) {
      displayMessage += `\n⏱️ 処理時間: ${result.duration}ms`;
    }
    
    ui.alert(title, displayMessage, ui.ButtonSet.OK);
    
    return { success: true, action: 'dialog_shown' };
    
  } catch (error) {
    console.error('成功ダイアログ表示エラー:', error);
    return { success: false, error: error.message };
  }
}
