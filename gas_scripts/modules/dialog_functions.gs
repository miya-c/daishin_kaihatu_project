/**
 * dialog_functions.gs - ダイアログ表示関数
 * Web App URL案内とクイック機能を提供
 */

/**
 * Web App URL表示とクイックアクセス機能
 */
function showWaterMeterWebApp() {
  try {
    console.log('[showWaterMeterWebApp] Web App案内開始');
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('[showWaterMeterWebApp] UI利用不可');
      showExecutionGuidance();
      return;
    }
    
    // Web App URLを取得
    const webAppUrl = getWebAppUrl();
    
    const message = `🌐 水道検針アプリ Web App

📱 アプリにアクセス:
${webAppUrl || 'https://line-app-project.vercel.app'}

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
    }
    
  } catch (error) {
    console.error('[showWaterMeterWebApp] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `Web App表示でエラーが発生しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[showWaterMeterWebApp] UI表示エラー:', uiError);
      showExecutionGuidance();
    }
  }
}

/**
 * 物件選択機能（簡易版）
 */
function showPropertySelectDialog() {
  try {
    console.log('[showPropertySelectDialog] 簡易物件選択開始');
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('[showPropertySelectDialog] UI利用不可');
      showExecutionGuidance();
      return;
    }
    
    // 物件データを取得
    const properties = getProperties();
    
    if (!Array.isArray(properties) || properties.length === 0) {
      ui.alert('情報', '物件データが見つかりません。\n\n物件マスタシートを確認してください。', ui.ButtonSet.OK);
      return;
    }
    
    // 物件リストを作成（最初の5件のみ表示）
    const propertyList = properties.slice(0, 5).map((prop, index) => 
      `${index + 1}. ${prop.id || 'IDなし'} - ${prop.name || '名称なし'}`
    ).join('\n');
    
    const message = `📋 物件一覧（最初の5件）:

${propertyList}

${properties.length > 5 ? `\n... 他 ${properties.length - 5} 件` : ''}

🌐 完全な物件選択機能:
${getWebAppUrl() || 'https://line-app-project.vercel.app'}

💡 Web版では:
• 全物件の表示・検索
• 部屋選択
• 検針データ入力
が可能です。`;
      
  } catch (error) {
    console.error('[showPropertySelectDialog] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `物件選択でエラーが発生しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[showPropertySelectDialog] UI表示エラー:', uiError);
      showExecutionGuidance();
    }
  }
}

/**
 * 部屋選択機能（簡易版）
 * @param {string} propertyId - 物件ID
 * @param {string} propertyName - 物件名
 */
function openRoomSelectDialog(propertyId, propertyName) {
  try {
    console.log('[openRoomSelectDialog] 簡易部屋選択開始 - propertyId:', propertyId);
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('[openRoomSelectDialog] UI利用不可');
      showExecutionGuidance();
      return;
    }
    
    if (!propertyId) {
      ui.alert('エラー', '物件IDが指定されていません。', ui.ButtonSet.OK);
      return;
    }
    
    // 部屋データを取得
    const rooms = getRooms(propertyId);
    
    if (!Array.isArray(rooms) || rooms.length === 0) {
      ui.alert('情報', `物件「${propertyName || propertyId}」に部屋データが見つかりません。\n\n部屋マスタシートを確認してください。`, ui.ButtonSet.OK);
      return;
    }
    
    // 部屋リストを作成（最初の5件のみ表示）
    const roomList = rooms.slice(0, 5).map((room, index) => 
      `${index + 1}. ${room.id || 'IDなし'} - ${room.name || '名称なし'}`
    ).join('\n');
    
    const message = `🏠 物件: ${propertyName || propertyId}

🚪 部屋一覧（最初の5件）:

${roomList}

${rooms.length > 5 ? `\n... 他 ${rooms.length - 5} 件` : ''}

🌐 完全な部屋選択・検針機能:
${getWebAppUrl() || 'https://line-app-project.vercel.app'}

💡 Web版では:
• 全部屋の表示
• 検針データの入力・更新
• 履歴確認
が可能です。`;
      
  } catch (error) {
    console.error('[openRoomSelectDialog] エラー:', error);
    
    try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `部屋選択でエラーが発生しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[openRoomSelectDialog] UI表示エラー:', uiError);
      showExecutionGuidance();
    }
  }
}

/**
 * 検針入力機能（簡易版）
 * @param {string} propertyId - 物件ID
 * @param {string} propertyName - 物件名
 * @param {string} roomId - 部屋ID
 * @param {string} roomName - 部屋名
 */
function openMeterReadingDialog(propertyId, propertyName, roomId, roomName) {
  try {
    console.log('[openMeterReadingDialog] 簡易検針機能開始');
    console.log('- propertyId:', propertyId, 'roomId:', roomId);
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('[openMeterReadingDialog] UI利用不可');
      showExecutionGuidance();
      return;
    }
    
    if (!propertyId || !roomId) {
      ui.alert('エラー', '物件IDまたは部屋IDが指定されていません。', ui.ButtonSet.OK);
      return;
    }
    
    // 検針データを取得
    const meterReadings = getMeterReadings(propertyId, roomId);
    
    const message = `🏠 物件: ${propertyName || propertyId}
🚪 部屋: ${roomName || roomId}

📊 検針データ概要:
• データ件数: ${Array.isArray(meterReadings) ? meterReadings.length : 'データなし'}
• 最新データ: ${meterReadings && meterReadings.length > 0 ? 
  (meterReadings[meterReadings.length - 1]?.date || '日付なし') : 
  'データなし'}

🌐 完全な検針入力機能:
${getWebAppUrl() || 'https://line-app-project.vercel.app'}

💡 Web版では:
• リアルタイムでの検針データ入力
• 使用量の自動計算
• データの即座更新
• 履歴確認
が可能です。

🔧 手動でのデータ入力は「inspection_data」シートで行えます。`;
    
    ui.alert('検針入力', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('[openMeterReadingDialog] エラー:', error);
      try {
      const ui = SpreadsheetApp.getUi();
      ui.alert('エラー', `検針入力でエラーが発生しました:\n${error.message}`, ui.ButtonSet.OK);
    } catch (uiError) {
      console.error('[openMeterReadingDialog] UI表示エラー:', uiError);
      showExecutionGuidance();    }
  }
}

/**
 * UI利用可能性チェック */

/**
 * 実行案内表示（UI利用不可時）
 */
function showExecutionGuidance() {
  console.log(`
=================================================================
📱 水道検針アプリへのアクセス方法

🌐 Web App URL:
https://line-app-project.vercel.app

🚀 利用可能な機能:
• 物件選択
• 部屋選択  
• 検針データ入力・更新
• データ管理

🔧 管理者向けコマンド（Google Apps Scriptエディタで実行）:
• getProperties() - 物件一覧取得
• getRooms('物件ID') - 部屋一覧取得  
• getMeterReadings('物件ID', '部屋ID') - 検針データ取得
• validateInspectionDataIntegrity() - データ整合性チェック
• runComprehensiveDataOptimization() - 統合最適化処理

💡 このメッセージは実行ログで確認できます。
=================================================================
  `);
}
