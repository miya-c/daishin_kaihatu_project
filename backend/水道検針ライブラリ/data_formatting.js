/**
 * data_formatting.gs - データフォーマット機能
 * ID フォーマットの統一とデータクリーンアップ
 * Version: 1.0.0 - Library Edition
 */

/**
 * 物件マスタの物件IDフォーマット変更
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function formatPropertyIdsInPropertyMaster(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sheetName = config.propertyMasterSheetName || CONFIG.SHEET_NAMES.PROPERTY_MASTER;
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', error);
    }
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;
  const propertyIdColIndex = values[0] ? values[0].indexOf('物件ID') : -1;
  if (propertyIdColIndex === -1) {
    return { success: true, updatedCount: 0, message: '物件ID列が見つかりません' };
  }

  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('情報', info);
    }
    return { success: true, updatedCount: 0, message: info };
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
      const message = `物件マスタのIDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`;
      if (typeof safeAlert === 'function') {
        safeAlert('完了', message);
      }
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = '更新が必要な物件IDはありませんでした。';
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, updatedCount: 0, message: info };
    }
  } catch (error) {
    Logger.log(`❌ 物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * 部屋マスタの物件IDフォーマット変更
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function formatPropertyIdsInRoomMaster(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sheetName = config.roomMasterSheetName || CONFIG.SHEET_NAMES.ROOM_MASTER;
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', error);
    }
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('情報', info);
    }
    return { success: true, updatedCount: 0, message: info };
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentPropertyId = String(values[i][propertyIdColIndex]).trim();

      if (currentPropertyId && !currentPropertyId.startsWith('P')) {
        const formattedId = `P${currentPropertyId.padStart(6, '0')}`;
        values[i][propertyIdColIndex] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: ${currentPropertyId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`部屋マスタの物件IDフォーマット変更完了: ${updatedCount}件`);
      const message = `部屋マスタの物件IDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`;
      if (typeof safeAlert === 'function') {
        safeAlert('完了', message);
      }
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = '更新が必要な物件IDはありませんでした。';
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, updatedCount: 0, message: info };
    }
  } catch (error) {
    Logger.log(`❌ 部屋マスタ物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * inspection_dataの物件IDフォーマット変更
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function formatPropertyIdsInInspectionData(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sheetName = config.inspectionDataSheetName || CONFIG.SHEET_NAMES.INSPECTION_DATA;
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', error);
    }
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    if (typeof safeAlert === 'function') {
      safeAlert('情報', info);
    }
    return { success: true, updatedCount: 0, message: info };
  }

  try {
    var inspHeaders = values[0];
    var inspPropertyIdCol = inspHeaders.indexOf('物件ID');
    if (inspPropertyIdCol === -1) {
      const error = `${sheetName}シートに「物件ID」列が見つかりません。`;
      return { success: false, error: error };
    }

    for (let i = 1; i < values.length; i++) {
      const currentPropertyId = String(values[i][inspPropertyIdCol]).trim();

      if (currentPropertyId && !currentPropertyId.startsWith('P')) {
        const formattedId = `P${currentPropertyId.padStart(6, '0')}`;
        values[i][inspPropertyIdCol] = formattedId;
        updatedCount++;
        Logger.log(`行 ${i + 1}: ${currentPropertyId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      Logger.log(`inspection_dataの物件IDフォーマット変更完了: ${updatedCount}件`);
      const message = `inspection_dataの物件IDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`;
      if (typeof safeAlert === 'function') {
        safeAlert('完了', message);
      }
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = '更新が必要な物件IDはありませんでした。';
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, updatedCount: 0, message: info };
    }
  } catch (error) {
    Logger.log(
      `❌ inspection_data物件IDフォーマット変更中にエラーが発生しました: ${error.message}`
    );
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * 全シートの物件IDフォーマットを一括変更
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function formatAllPropertyIds(ss = null, config = {}) {
  return withScriptLock(function () {
    if (!ss) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
      return { success: false, error: 'スプレッドシートが見つかりません' };
    }

    try {
      Logger.log('🔄 全シートの物件IDフォーマット変更を開始します...');

      const results = {
        propertyMaster: formatPropertyIdsInPropertyMaster(ss, config),
        roomMaster: formatPropertyIdsInRoomMaster(ss, config),
        inspectionData: formatPropertyIdsInInspectionData(ss, config),
      };

      const totalUpdated =
        (results.propertyMaster.updatedCount || 0) +
        (results.roomMaster.updatedCount || 0) +
        (results.inspectionData.updatedCount || 0);

      const allSuccess =
        results.propertyMaster.success &&
        results.roomMaster.success &&
        results.inspectionData.success;

      if (allSuccess) {
        Logger.log(`✅ 全シートの物件IDフォーマット変更完了: 合計${totalUpdated}件`);
        const message =
          `全シートの物件IDフォーマット変更が完了しました。\n` +
          `物件マスタ: ${results.propertyMaster.updatedCount || 0}件\n` +
          `部屋マスタ: ${results.roomMaster.updatedCount || 0}件\n` +
          `inspection_data: ${results.inspectionData.updatedCount || 0}件\n` +
          `合計: ${totalUpdated}件`;

        if (typeof safeAlert === 'function') {
          safeAlert('完了', message);
        }

        return {
          success: true,
          totalUpdated: totalUpdated,
          results: results,
          message: message,
        };
      } else {
        const errors = [];
        if (!results.propertyMaster.success)
          errors.push(`物件マスタ: ${results.propertyMaster.error}`);
        if (!results.roomMaster.success) errors.push(`部屋マスタ: ${results.roomMaster.error}`);
        if (!results.inspectionData.success)
          errors.push(`inspection_data: ${results.inspectionData.error}`);

        const errorMessage = `一部のシートでエラーが発生しました:\n${errors.join('\n')}`;
        Logger.log(`❌ ${errorMessage}`);

        return {
          success: false,
          error: errorMessage,
          results: results,
        };
      }
    } catch (error) {
      Logger.log(`❌ 全シート物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, 60000);
}

/**
 * データのクリーンアップ（空白行の削除、重複データの統合など）
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {string} sheetName - シート名
 * @param {Object} options - クリーンアップオプション
 * @returns {Object} 処理結果
 */
function cleanupSheetData(ss = null, sheetName, options = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: スプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { success: false, error: `${sheetName}シートが見つかりません` };
  }

  try {
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let cleanedData = [];
    let removedRows = 0;

    // ヘッダー行を保持
    if (values.length > 0) {
      cleanedData.push(values[0]);
    }

    // データ行をクリーンアップ
    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      // 空白行のスキップ
      if (options.removeEmptyRows && row.every((cell) => !cell || String(cell).trim() === '')) {
        removedRows++;
        continue;
      }

      // データの正規化
      const cleanedRow = row.map((cell) => {
        if (options.trimWhitespace && typeof cell === 'string') {
          return cell.trim();
        }
        return cell;
      });

      cleanedData.push(cleanedRow);
    }

    // クリーンアップされたデータをシートに書き戻し（安全な上書き方式）
    if (cleanedData.length > 0) {
      const newRange = sheet.getRange(1, 1, cleanedData.length, cleanedData[0].length);
      newRange.setValues(cleanedData);
      // 余剰行をクリア
      const lastRow = sheet.getLastRow();
      if (lastRow > cleanedData.length) {
        sheet
          .getRange(cleanedData.length + 1, 1, lastRow - cleanedData.length, cleanedData[0].length)
          .clearContent();
      }
    }

    Logger.log(`✅ ${sheetName}のデータクリーンアップ完了: ${removedRows}行削除`);

    return {
      success: true,
      removedRows: removedRows,
      totalRows: cleanedData.length - 1, // ヘッダー行を除く
      message: `${sheetName}のデータクリーンアップが完了しました。削除行数: ${removedRows}`,
    };
  } catch (error) {
    Logger.log(`❌ ${sheetName}データクリーンアップ中にエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 部屋ID自動生成機能
 * 物件ごとにR001, R002, R003...の形式で部屋IDを自動生成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function generateRoomIds(ss = null, config = {}) {
  return withScriptLock(function () {
    if (!ss) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
      return { success: false, error: 'スプレッドシートが見つかりません' };
    }

    const sheetName = config.roomMasterSheetName || CONFIG.SHEET_NAMES.ROOM_MASTER;
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      const error = `${sheetName}シートが見つかりません。`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length <= 1) {
      const info = `${sheetName}シートにデータがありません。`;
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, updatedCount: 0, message: info };
    }

    // ヘッダー行の確認
    const headers = values[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');

    if (propertyIdIndex === -1) {
      const error = `${sheetName}シートに「物件ID」列が見つかりません。`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    if (roomIdIndex === -1) {
      const error = `${sheetName}シートに「部屋ID」列が見つかりません。`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    try {
      // 物件IDごとに部屋をグループ化
      const propertyGroups = new Map();

      for (let i = 1; i < values.length; i++) {
        const propertyId = String(values[i][propertyIdIndex] || '').trim();

        if (propertyId) {
          if (!propertyGroups.has(propertyId)) {
            propertyGroups.set(propertyId, []);
          }
          propertyGroups.get(propertyId).push(i);
        }
      }

      let updatedCount = 0;

      // 各物件に対して部屋IDを連番で生成
      propertyGroups.forEach((rowIndexes, propertyId) => {
        // 部屋データを部屋名でソート（もしあれば）
        const roomNameIndex = headers.indexOf('部屋名');
        if (roomNameIndex !== -1) {
          rowIndexes.sort((a, b) => {
            const nameA = String(values[a][roomNameIndex] || '').trim();
            const nameB = String(values[b][roomNameIndex] || '').trim();
            return nameA.localeCompare(nameB);
          });
        }

        // 連番で部屋IDを生成
        rowIndexes.forEach((rowIndex, counter) => {
          const newRoomId = `R${String(counter + 1).padStart(3, '0')}`;
          const currentRoomId = String(values[rowIndex][roomIdIndex] || '').trim();

          if (currentRoomId !== newRoomId) {
            values[rowIndex][roomIdIndex] = newRoomId;
            updatedCount++;
            Logger.log(`物件 ${propertyId} - 行 ${rowIndex + 1}: 部屋ID を "${newRoomId}" に設定`);
          }
        });
      });

      if (updatedCount > 0) {
        dataRange.setValues(values);
        Logger.log(`部屋ID自動生成完了: ${updatedCount}件`);
        const message = `部屋IDの自動生成が完了しました。\n更新件数: ${updatedCount}件\n\n物件別にR001, R002, R003...の形式で部屋IDを割り当てました。`;
        if (typeof safeAlert === 'function') {
          safeAlert('完了', message);
        }
        return { success: true, updatedCount: updatedCount, message: message };
      } else {
        const info = 'すべての部屋IDが既に正しい形式で設定されています。';
        if (typeof safeAlert === 'function') {
          safeAlert('情報', info);
        }
        return { success: true, updatedCount: 0, message: info };
      }
    } catch (error) {
      Logger.log(`❌ 部屋ID自動生成中にエラーが発生: ${error.message}`);
      const errorMessage = `部屋ID自動生成中にエラーが発生しました: ${error.message}`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', errorMessage);
      }
      return { success: false, error: errorMessage };
    }
  }, 60000);
}
