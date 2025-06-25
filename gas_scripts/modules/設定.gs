// ======================================================================
// スプレッドシート設定ファイル
// 全プロジェクトで使用されるスプレッドシートIDを集中管理
// ======================================================================

// スプレッドシートIDの設定
// 本番環境のスプレッドシートID
const CONFIG_SPREADSHEET_ID = '1FLXQSL-kH_wEACzk2OO28eouGp-JFRg7QEUNz5t2fg0';

/**
 * 設定されたスプレッドシートIDを取得する関数
 * 他のスクリプトファイルから呼び出される共通関数
 * 
 * @return {string} スプレッドシートID
 */
function getConfigSpreadsheetId() {
  return CONFIG_SPREADSHEET_ID;
}

/**
 * アクティブなスプレッドシートIDを安全に取得する関数
 * 実行時環境でのスプレッドシートIDを動的に取得
 * 
 * @return {string|null} スプレッドシートID、取得できない場合はnull
 */
function getActiveSpreadsheetId() {
  try {
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSpreadsheet) {
      return activeSpreadsheet.getId();
    } else {
      Logger.log('警告: アクティブなスプレッドシートが見つかりません');
      return null;
    }
  } catch (e) {
    Logger.log(`スプレッドシートID取得エラー: ${e.message}`);
    return null;
  }
}

/**
 * 設定ファイルの状態を確認する診断関数
 * スクリプトエディタから安全に実行可能
 */
function checkConfigStatus() {
  try {
    Logger.log('=== スプレッドシート設定確認 ===');
    Logger.log(`設定済みスプレッドシートID: ${CONFIG_SPREADSHEET_ID}`);
    
    const activeId = getActiveSpreadsheetId();
    Logger.log(`アクティブスプレッドシートID: ${activeId || '取得できませんでした'}`);
    
    if (activeId && activeId === CONFIG_SPREADSHEET_ID) {
      Logger.log('✅ 設定とアクティブスプレッドシートが一致しています');
    } else if (activeId) {
      Logger.log('⚠️ 設定とアクティブスプレッドシートが異なります');
    } else {
      Logger.log('❌ アクティブスプレッドシートを取得できませんでした');
    }
    
    return 'Config check completed';
  } catch (e) {
    Logger.log(`設定確認エラー: ${e.message}`);
    return `エラー: ${e.message}`;
  }
}

/**
 * 現在の設定を更新する関数（開発・管理用）
 * 新しいスプレッドシートIDに変更する際に使用
 * 
 * @param {string} newSpreadsheetId 新しいスプレッドシートID
 * @return {boolean} 更新成功フラグ
 */
function updateSpreadsheetConfig(newSpreadsheetId) {
  try {
    // 注意: この関数は実行時にはCONFIG_SPREADSHEET_IDを動的に変更できません
    // 実際の更新は手動でコードを編集する必要があります
    Logger.log('⚠️ スプレッドシートID設定を更新するには、');
    Logger.log('CONFIG_SPREADSHEET_ID の値を手動で編集してください');
    Logger.log(`現在の設定: ${CONFIG_SPREADSHEET_ID}`);
    Logger.log(`新しい値: ${newSpreadsheetId}`);
    
    return false;
  } catch (e) {
    Logger.log(`設定更新エラー: ${e.message}`);
    return false;
  }
}
