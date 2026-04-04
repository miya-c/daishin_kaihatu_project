/**
 * spreadsheet_config.gs - スプレッドシート設定管理
 * ライブラリで使用するスプレッドシートの設定を管理
 * Version: 1.0.0 - Library Edition
 */

/**
 * デフォルトのスプレッドシート設定
 * 実際の使用時は消費者プロジェクトで適切に設定してください
 */
const DEFAULT_CONFIG = {
  // スプレッドシートID（例：本番環境用）
  SPREADSHEET_ID: null, // 消費者プロジェクトで設定
  
  // シート名の設定
  SHEET_NAMES: {
    PROPERTY_MASTER: '物件マスタ',
    ROOM_MASTER: '部屋マスタ',
    INSPECTION_DATA: 'inspection_data',
    SETTINGS: '設定値'
  },
  
  // API設定
  API_VERSION: 'v3.0.0-library'
};

/**
 * 設定されたスプレッドシートIDを取得する関数
 * @param {string} customId - カスタムスプレッドシートID（省略時はアクティブなものを使用）
 * @returns {string|null} スプレッドシートID
 */
function getConfigSpreadsheetId(customId = null) {
  try {
    // カスタムIDが指定されている場合はそれを使用
    if (customId) {
      return customId;
    }
    
    // 設定済みのIDがある場合はそれを使用
    if (DEFAULT_CONFIG.SPREADSHEET_ID) {
      return DEFAULT_CONFIG.SPREADSHEET_ID;
    }
    
    // アクティブなスプレッドシートを使用
    return getActiveSpreadsheetId();
    
  } catch (error) {
    console.error('[getConfigSpreadsheetId] エラー:', error);
    return null;
  }
}

/**
 * アクティブなスプレッドシートIDを安全に取得する関数
 * @returns {string|null} スプレッドシートID、取得できない場合はnull
 */
function getActiveSpreadsheetId() {
  try {
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      return activeSpreadsheet.getId();
    } else {
      console.log('[getActiveSpreadsheetId] 警告: アクティブなスプレッドシートが見つかりません');
      return null;
    }
  } catch (error) {
    console.error('[getActiveSpreadsheetId] エラー:', error);
    return null;
  }
}

/**
 * スプレッドシート設定を取得
 * @param {Object} overrides - 設定の上書き
 * @returns {Object} 設定オブジェクト
 */
function getSpreadsheetConfig(overrides = {}) {
  try {
    const config = {
      ...DEFAULT_CONFIG,
      ...overrides
    };
    
    // スプレッドシートIDが設定されていない場合はアクティブなものを使用
    if (!config.SPREADSHEET_ID) {
      config.SPREADSHEET_ID = getActiveSpreadsheetId();
    }
    
    return config;
    
  } catch (error) {
    console.error('[getSpreadsheetConfig] エラー:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 指定されたスプレッドシートを開く
 * @param {string} spreadsheetId - スプレッドシートID（省略時は設定値を使用）
 * @returns {Spreadsheet|null} スプレッドシートオブジェクト
 */
function openSpreadsheetById(spreadsheetId = null) {
  try {
    const id = spreadsheetId || getConfigSpreadsheetId();
    
    if (!id) {
      throw new Error('スプレッドシートIDが指定されていません');
    }
    
    return SpreadsheetApp.openById(id);
    
  } catch (error) {
    console.error('[openSpreadsheetById] エラー:', error);
    
    // フォールバック: アクティブなスプレッドシートを使用
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (fallbackError) {
      console.error('[openSpreadsheetById] フォールバックエラー:', fallbackError);
      return null;
    }
  }
}

/**
 * 設定ファイルの状態を確認する診断関数
 * @returns {Object} 診断結果
 */
function checkConfigStatus() {
  try {
    const result = {
      timestamp: new Date().toISOString(),
      config: getSpreadsheetConfig(),
      status: 'ok',
      issues: []
    };
    
    console.log('=== スプレッドシート設定確認 ===');
    console.log(`設定済みスプレッドシートID: ${result.config.SPREADSHEET_ID || '未設定'}`);
    
    const activeId = getActiveSpreadsheetId();
    console.log(`アクティブスプレッドシートID: ${activeId || '取得できませんでした'}`);
    
    // 設定とアクティブIDの比較
    if (result.config.SPREADSHEET_ID && activeId) {
      if (result.config.SPREADSHEET_ID === activeId) {
        console.log('✅ 設定とアクティブスプレッドシートが一致しています');
      } else {
        console.log('⚠️ 設定とアクティブスプレッドシートが異なります');
        result.issues.push('設定とアクティブスプレッドシートのIDが異なります');
      }
    } else if (!activeId) {
      console.log('❌ アクティブスプレッドシートを取得できませんでした');
      result.issues.push('アクティブスプレッドシートを取得できません');
      result.status = 'error';
    }
    
    // 必須シートの存在確認
    try {
      const spreadsheet = openSpreadsheetById();
      if (spreadsheet) {
        const requiredSheets = Object.values(result.config.SHEET_NAMES);
        const missingSheets = [];
        
        requiredSheets.forEach(sheetName => {
          if (!spreadsheet.getSheetByName(sheetName)) {
            missingSheets.push(sheetName);
          }
        });
        
        if (missingSheets.length > 0) {
          result.issues.push(`不足しているシート: ${missingSheets.join(', ')}`);
          if (result.status === 'ok') {
            result.status = 'warning';
          }
        }
        
        console.log(`シート確認完了 - 不足: ${missingSheets.length}件`);
      }
    } catch (sheetError) {
      console.error('シート確認エラー:', sheetError);
      result.issues.push('シート存在確認でエラーが発生しました');
      result.status = 'warning';
    }
    
    result.summary = {
      status: result.status,
      configuredId: !!result.config.SPREADSHEET_ID,
      activeId: !!activeId,
      idsMatch: result.config.SPREADSHEET_ID === activeId,
      issueCount: result.issues.length
    };
    
    console.log('=== 設定確認完了 ===');
    return result;
    
  } catch (error) {
    console.error('[checkConfigStatus] エラー:', error);
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
      issues: [`設定確認エラー: ${error.message}`]
    };
  }
}

/**
 * 設定確認結果を表示（UI版）
 * @returns {Object} 表示結果
 */
function showConfigStatus() {
  try {
    const status = checkConfigStatus();
    
    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('設定確認結果:', JSON.stringify(status, null, 2));
      return { success: true, action: 'logged', status: status };
    }
    
    let message = `⚙️ スプレッドシート設定状態\n\n`;
    message += `状態: ${getStatusIcon(status.status)} ${status.status.toUpperCase()}\n\n`;
    
    if (status.config && status.config.SPREADSHEET_ID) {
      message += `設定ID: ${status.config.SPREADSHEET_ID.substring(0, 10)}...\n`;
    } else {
      message += `設定ID: 未設定（アクティブを使用）\n`;
    }
    
    if (status.summary) {
      message += `アクティブID取得: ${status.summary.activeId ? '✅' : '❌'}\n`;
      if (status.summary.configuredId && status.summary.activeId) {
        message += `ID一致: ${status.summary.idsMatch ? '✅' : '⚠️'}\n`;
      }
    }
    
    if (status.issues && status.issues.length > 0) {
      message += `\n問題点:\n`;
      status.issues.forEach(issue => {
        message += `• ${issue}\n`;
      });
    }
    
    message += `\n確認時刻: ${new Date(status.timestamp).toLocaleString()}`;
    
    ui.alert('設定確認', message, ui.ButtonSet.OK);
    
    return { success: true, action: 'dialog_shown', status: status };
    
  } catch (error) {
    console.error('[showConfigStatus] 表示エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 設定を更新する関数（ライブラリ内部用）
 * 注意: 実際の設定変更はライブラリ消費者側で行う必要があります
 * @param {Object} newConfig - 新しい設定
 * @returns {Object} 更新結果
 */
function updateLibraryConfig(newConfig = {}) {
  try {
    console.log('[updateLibraryConfig] 設定更新要求:', newConfig);
    
    // ライブラリ内では実際の設定は変更できないため、案内メッセージを返す
    const guidance = {
      message: 'ライブラリの設定を変更するには、消費者プロジェクト側で実装が必要です',
      currentConfig: getSpreadsheetConfig(),
      requestedChanges: newConfig,
      instructions: [
        '1. 消費者プロジェクトで独自の設定関数を作成',
        '2. ライブラリ関数呼び出し時に設定を渡す',
        '3. または、環境固有の設定ファイルを作成'
      ]
    };
    
    console.log('[updateLibraryConfig] 設定変更案内:', guidance);
    return guidance;
    
  } catch (error) {
    console.error('[updateLibraryConfig] エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ステータス用アイコンを取得
 * @param {string} status - ステータス
 * @returns {string} アイコン
 */
function getStatusIcon(status) {
  switch (status) {
    case 'ok': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '❓';
  }
}
