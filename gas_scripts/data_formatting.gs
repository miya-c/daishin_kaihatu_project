/**
 * data_formatting.gs - データフォーマット機能
 * ID フォーマットの統一とデータクリーンアップ
 */

/**
 * 物件マスタの物件IDフォーマット変更
 */
function formatPropertyIdsInPropertyMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sheet = ss.getSheetByName('物件マスタ');

  if (!sheet) {
    safeAlert('エラー', '物件マスタシートが見つかりません。');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    safeAlert('情報', '物件マスタシートにデータがありません。');
    return;
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentId = String(values[i][0]).trim();
      
      if (currentId && !currentId.startsWith('P')) {
        const formattedId = `P${currentId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: ${currentId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`物件マスタのフォーマット変更完了: ${updatedCount}件`);
      safeAlert('完了', `物件マスタのIDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`);
    } else {
      safeAlert('情報', '更新が必要な物件IDはありませんでした。');
    }
  } catch (e) {
    Logger.log(`エラー: 物件マスタフォーマット変更中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `物件マスタフォーマット変更中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 部屋マスタの物件IDフォーマット変更
 */
function formatPropertyIdsInRoomMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const sheet = ss.getSheetByName('部屋マスタ');

  if (!sheet) {
    safeAlert('エラー', '部屋マスタシートが見つかりません。');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    safeAlert('情報', '部屋マスタシートにデータがありません。');
    return;
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentId = String(values[i][0]).trim();
      
      if (currentId && !currentId.startsWith('P')) {
        const formattedId = `P${currentId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: ${currentId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`部屋マスタのフォーマット変更完了: ${updatedCount}件`);
      safeAlert('完了', `部屋マスタのIDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`);
    } else {
      safeAlert('情報', '更新が必要な物件IDはありませんでした。');
    }
  } catch (e) {
    Logger.log(`エラー: 部屋マスタフォーマット変更中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `部屋マスタフォーマット変更中にエラーが発生しました:\n${e.message}`);
  }
}
