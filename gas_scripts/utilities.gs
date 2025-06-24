/**
 * utilities.gs - ユーティリティ関数
 * 共通で使用されるヘルパー関数群
 */

/**
 * UI操作を安全に処理するためのヘルパー関数
 * @param {string} title - アラートのタイトル
 * @param {string} message - アラートのメッセージ
 */
function safeAlert(title, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (e) {
    Logger.log(`${title}: ${message}`);
    console.log(`${title}: ${message}`);
  }
}
