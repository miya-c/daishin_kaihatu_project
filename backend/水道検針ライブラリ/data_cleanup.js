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
          Logger.log(`重複物件-部屋組み合わせ発見: ${key} (古い行 ${existingRowIndex + 1} を削除対象に)`);
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
        inspectionSheet.getRange(cleanedData.length + 1, 1, lastRow - cleanedData.length, headers.length).clearContent();
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
      message: message
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
        roomMasterSheet.getRange(validRooms.length + 1, 1, lastRow - validRooms.length, headers.length).clearContent();
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
      message: message
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
      safeAlert('重複データクリーンアップ完了', 
        `削除件数: ${result.removedCount}件\n` +
        `残り件数: ${result.remainingCount}件\n` +
        `処理時間: ${result.duration}ms`);
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

/**
 * 空白行・無効行の削除
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {string} sheetName - シート名
 * @param {Object} options - オプション
 * @returns {Object} クリーンアップ結果
 */
function cleanupEmptyRows(ss = null, sheetName, options = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return { success: false, error: `${sheetName}シートが見つかりません` };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, removedCount: 0, message: 'データがありません' };
    }

    const headers = data[0];
    const validRows = [headers];
    let removedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // 空白行チェック
      const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      
      if (hasData) {
        // 必須フィールドチェック（オプション）
        if (options.requiredColumns) {
          const isValid = options.requiredColumns.every(colIndex => {
            const value = row[colIndex];
            return value !== null && value !== undefined && String(value).trim() !== '';
          });
          
          if (isValid) {
            validRows.push(row);
          } else {
            removedCount++;
          }
        } else {
          validRows.push(row);
        }
      } else {
        removedCount++;
      }
    }

    // シートを更新（安全な上書き方式）
    if (removedCount > 0) {
      if (validRows.length > 0) {
        sheet.getRange(1, 1, validRows.length, headers.length).setValues(validRows);
        // 余剰行をクリア
        const lastRow = sheet.getLastRow();
        if (lastRow > validRows.length) {
          sheet.getRange(validRows.length + 1, 1, lastRow - validRows.length, headers.length).clearContent();
        }
      }
    }

    return {
      success: true,
      removedCount: removedCount,
      remainingCount: validRows.length - 1,
      message: `空白行削除完了: ${removedCount}件削除`
    };

  } catch (error) {
    Logger.log(`cleanupEmptyRows エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * データ整合性に基づく自動クリーンアップ
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} クリーンアップ結果
 */
function autoCleanupInvalidData(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  try {
    Logger.log('🔧 自動データクリーンアップを開始します...');
    const startTime = new Date();
    
    const results = {
      tasks: [],
      totalRemoved: 0,
      success: true
    };

    // タスク1: 重複データ削除
    try {
      const duplicateCleanup = optimizedCleanupDuplicateInspectionData(ss, config);
      results.tasks.push({
        name: '重複データ削除',
        success: duplicateCleanup.success,
        removedCount: duplicateCleanup.removedCount || 0
      });
      results.totalRemoved += duplicateCleanup.removedCount || 0;
    } catch (error) {
      results.tasks.push({
        name: '重複データ削除',
        success: false,
        error: error.message
      });
      results.success = false;
    }

    // タスク2: 孤立データ削除
    try {
      const orphanedCleanup = cleanUpOrphanedRooms(ss, config);
      results.tasks.push({
        name: '孤立データ削除',
        success: orphanedCleanup.success,
        removedCount: orphanedCleanup.removedCount || 0
      });
      results.totalRemoved += orphanedCleanup.removedCount || 0;
    } catch (error) {
      results.tasks.push({
        name: '孤立データ削除',
        success: false,
        error: error.message
      });
      results.success = false;
    }

    // タスク3: 空白行削除
    const sheetsToClean = ['inspection_data', '物件マスタ', '部屋マスタ'];
    for (const sheetName of sheetsToClean) {
      try {
        const emptyRowCleanup = cleanupEmptyRows(ss, sheetName, {
          requiredColumns: sheetName === 'inspection_data' ? [0, 2] : [0] // 物件ID、部屋ID必須
        });
        results.tasks.push({
          name: `空白行削除(${sheetName})`,
          success: emptyRowCleanup.success,
          removedCount: emptyRowCleanup.removedCount || 0
        });
        results.totalRemoved += emptyRowCleanup.removedCount || 0;
      } catch (error) {
        results.tasks.push({
          name: `空白行削除(${sheetName})`,
          success: false,
          error: error.message
        });
        results.success = false;
      }
    }

    const endTime = new Date();
    results.duration = endTime - startTime;

    Logger.log(`✅ 自動データクリーンアップ完了: 合計${results.totalRemoved}件削除`);
    
    return results;

  } catch (error) {
    Logger.log(`❌ 自動データクリーンアップ中にエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}
