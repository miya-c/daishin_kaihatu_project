/**
 * data_cleanup.gs - データクリーンアップ機能
 * 重複データの削除と孤立データのクリーンアップ機能
 * Version: 1.0.0 - Library Edition
 */

/**
 * 重複データクリーンアップ機能（最適化版）
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} クリーンアップ結果
 */
function optimizedCleanupDuplicateInspectionData(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    }
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    Logger.log('🧹 重複データクリーンアップを開始します...');
    const startTime = new Date();

    const sheetName = config.inspectionDataSheetName || 'inspection_data';
    const inspectionSheet = ss.getSheetByName(sheetName);
    if (!inspectionSheet) {
      const error = `${sheetName}シートが見つかりません`;
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    const data = inspectionSheet.getDataRange().getValues();
    if (data.length <= 1) {
      const info = `${sheetName}シートにデータがありません`;
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, removedCount: 0, message: info };
    }

    const headers = data[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');

    if (propertyIdIndex === -1 || roomIdIndex === -1) {
      const error = '必要な列（物件ID、部屋ID）が見つかりません';
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    // 重複チェック用のマップ
    const propertyRoomMap = new Map();
    const duplicateRows = new Set();

    // 重複を特定
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const propertyId = String(row[propertyIdIndex] || '').trim();
      const roomId = String(row[roomIdIndex] || '').trim();

      // 物件-部屋組み合わせの重複チェック
      if (propertyId && roomId) {
        const key = `${propertyId}_${roomId}`;
        if (propertyRoomMap.has(key)) {
          // より新しいデータを保持（行番号が大きいものを優先）
          const existingRowIndex = propertyRoomMap.get(key);
          duplicateRows.add(existingRowIndex);
          propertyRoomMap.set(key, i);
          Logger.log(
            `重複物件-部屋組み合わせ発見: ${key} (古い行 ${existingRowIndex + 1} を削除対象に)`
          );
        } else {
          propertyRoomMap.set(key, i);
        }
      }
    }

    if (duplicateRows.size === 0) {
      const info = '重複データは見つかりませんでした。';
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, removedCount: 0, message: info };
    }

    // 重複行を除いた新しいデータを作成
    const cleanedData = [headers];
    for (let i = 1; i < data.length; i++) {
      if (!duplicateRows.has(i)) {
        cleanedData.push(data[i]);
      }
    }

    // シートを更新（安全な上書き方式）
    if (cleanedData.length > 0) {
      inspectionSheet.getRange(1, 1, cleanedData.length, headers.length).setValues(cleanedData);
      // 余剰行をクリア
      const lastRow = inspectionSheet.getLastRow();
      if (lastRow > cleanedData.length) {
        inspectionSheet
          .getRange(cleanedData.length + 1, 1, lastRow - cleanedData.length, headers.length)
          .clearContent();
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;
    const removedCount = duplicateRows.size;

    Logger.log(`✅ 重複データクリーンアップ完了: ${removedCount}件削除, 処理時間: ${duration}ms`);

    const message = `重複データクリーンアップが完了しました。\n削除件数: ${removedCount}件\n処理時間: ${duration}ms`;
    if (typeof safeAlert === 'function') {
      safeAlert('完了', message);
    }

    return {
      success: true,
      removedCount: removedCount,
      remainingCount: cleanedData.length - 1,
      duration: duration,
      message: message,
    };
  } catch (error) {
    Logger.log(`❌ 重複データクリーンアップ中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * 孤立した部屋データの削除
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} クリーンアップ結果
 */
function cleanUpOrphanedRooms(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  if (!ss) {
    Logger.log('エラー: スプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    Logger.log('🔍 孤立した部屋データの削除を開始します...');
    const startTime = new Date();

    const propertyMasterSheet = ss.getSheetByName(config.propertyMasterSheetName || '物件マスタ');
    const roomMasterSheet = ss.getSheetByName(config.roomMasterSheetName || '部屋マスタ');

    if (!propertyMasterSheet) {
      const error = '物件マスタシートが見つかりません';
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    if (!roomMasterSheet) {
      const error = '部屋マスタシートが見つかりません';
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
    }

    // 有効な物件IDを取得
    const propertyData = propertyMasterSheet.getDataRange().getValues();
    const validPropertyIds = new Set();
    for (let i = 1; i < propertyData.length; i++) {
      const propertyId = String(propertyData[i][0] || '').trim();
      if (propertyId) {
        validPropertyIds.add(propertyId);
      }
    }

    // 部屋マスタから孤立データを特定
    const roomData = roomMasterSheet.getDataRange().getValues();
    const headers = roomData[0];
    const validRooms = [headers];
    let orphanedCount = 0;

    for (let i = 1; i < roomData.length; i++) {
      const row = roomData[i];
      const propertyId = String(row[0] || '').trim();

      if (propertyId && validPropertyIds.has(propertyId)) {
        validRooms.push(row);
      } else {
        orphanedCount++;
        Logger.log(`孤立した部屋データ発見: 物件ID=${propertyId}, 行=${i + 1}`);
      }
    }

    if (orphanedCount === 0) {
      const info = '孤立した部屋データは見つかりませんでした。';
      if (typeof safeAlert === 'function') {
        safeAlert('情報', info);
      }
      return { success: true, removedCount: 0, message: info };
    }

    // 部屋マスタを更新（安全な上書き方式）
    if (validRooms.length > 0) {
      roomMasterSheet.getRange(1, 1, validRooms.length, headers.length).setValues(validRooms);
      // 余剰行をクリア
      const lastRow = roomMasterSheet.getLastRow();
      if (lastRow > validRooms.length) {
        roomMasterSheet
          .getRange(validRooms.length + 1, 1, lastRow - validRooms.length, headers.length)
          .clearContent();
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    Logger.log(`✅ 孤立データ削除完了: ${orphanedCount}件削除, 処理時間: ${duration}ms`);

    const message = `孤立した部屋データの削除が完了しました。\n削除件数: ${orphanedCount}件\n残り件数: ${validRooms.length - 1}件`;
    if (typeof safeAlert === 'function') {
      safeAlert('完了', message);
    }

    return {
      success: true,
      removedCount: orphanedCount,
      remainingCount: validRooms.length - 1,
      duration: duration,
      message: message,
    };
  } catch (error) {
    Logger.log(`❌ 孤立データ削除中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * メニューから重複データクリーンアップを実行
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 実行結果
 */
function menuCleanupDuplicateData(ss = null) {
  try {
    const result = optimizedCleanupDuplicateInspectionData(ss);

    if (result.success && typeof safeAlert === 'function') {
      safeAlert(
        '重複データクリーンアップ完了',
        `削除件数: ${result.removedCount}件\n` +
          `残り件数: ${result.remainingCount}件\n` +
          `処理時間: ${result.duration}ms`
      );
    }

    return result;
  } catch (error) {
    Logger.log(`menuCleanupDuplicateData エラー: ${error.message}`);
    if (typeof safeAlert === 'function') {
      safeAlert('エラー', `重複データクリーンアップ中にエラーが発生しました: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}
