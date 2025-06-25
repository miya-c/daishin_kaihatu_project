/**
 * Data Cleanup Functions
 * データクリーンアップと孤立データ削除機能
 * 元ファイル: 総合カスタム処理.gs および gas_dialog_functions.gs から抽出
 */

/**
 * 重複データクリーンアップ機能 (総合カスタム処理.gsから統合)
 */
function optimizedCleanupDuplicateInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🧹 重複データクリーンアップを開始します...');
    const startTime = new Date();

    const inspectionSheet = ss.getSheetByName('inspection_data');
    if (!inspectionSheet) {
      safeAlert('エラー', 'inspection_dataシートが見つかりません');
      return;
    }

    const data = inspectionSheet.getDataRange().getValues();
    if (data.length <= 1) {
      safeAlert('情報', 'inspection_dataシートにデータがありません');
      return;
    }

    const headers = data[0];
    const recordIdIndex = headers.indexOf('記録ID');
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');

    if ([recordIdIndex, propertyIdIndex, roomIdIndex].includes(-1)) {
      safeAlert('エラー', '必要な列（記録ID、物件ID、部屋ID）が見つかりません');
      return;
    }

    // 重複チェック用のマップ
    const recordIdMap = new Map();
    const propertyRoomMap = new Map();
    const duplicateRows = new Set();

    // 重複を特定
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const recordId = String(row[recordIdIndex] || '').trim();
      const propertyId = String(row[propertyIdIndex] || '').trim();
      const roomId = String(row[roomIdIndex] || '').trim();

      // 記録IDの重複チェック
      if (recordId) {
        if (recordIdMap.has(recordId)) {
          duplicateRows.add(i);
          Logger.log(`重複記録ID発見: ${recordId} (行 ${i + 1})`);
        } else {
          recordIdMap.set(recordId, i);
        }
      }

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
      safeAlert('情報', '重複データは見つかりませんでした。');
      return;
    }

    // 重複行を除いた新しいデータを作成
    const cleanedData = [headers];
    for (let i = 1; i < data.length; i++) {
      if (!duplicateRows.has(i)) {
        cleanedData.push(data[i]);
      }
    }

    // シートを更新
    inspectionSheet.clear();
    if (cleanedData.length > 0) {
      inspectionSheet.getRange(1, 1, cleanedData.length, headers.length).setValues(cleanedData);
    }

    const endTime = new Date();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    Logger.log(`🧹 重複データクリーンアップ完了: ${duplicateRows.size}件の重複データを削除 (処理時間: ${processingTime}秒)`);
    safeAlert('完了', `重複データクリーンアップが完了しました。\n削除件数: ${duplicateRows.size}件\n処理時間: ${processingTime}秒`);

  } catch (e) {
    Logger.log(`エラー: 重複データクリーンアップ中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `重複データクリーンアップ中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 部屋マスタ整合性チェックと孤立部屋データの削除 (総合カスタム処理.gsから統合)
 */
function cleanUpOrphanedRooms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }
  
  const roomSheet = ss.getSheetByName('部屋マスタ');
  const propertySheet = ss.getSheetByName('物件マスタ');

  if (!roomSheet) {
    safeAlert('エラー', '部屋マスタシートが見つかりません。');
    return;
  }
  if (!propertySheet) {
    safeAlert('エラー', '物件マスタシートが見つかりません。');
    return;
  }

  try {
    // 物件マスタから有効な物件IDを取得
    const propertyData = propertySheet.getDataRange().getValues().slice(1);
    const validPropertyIds = new Set();
    propertyData.forEach(row => {
      const propertyId = String(row[0]).trim();
      if (propertyId) {
        validPropertyIds.add(propertyId);
      }
    });

    // 部屋マスタのデータを確認
    const roomData = roomSheet.getDataRange().getValues();
    const headers = roomData[0];
    const dataRows = roomData.slice(1);
    
    const validRows = [headers];
    let removedCount = 0;

    dataRows.forEach((row, index) => {
      const propertyId = String(row[0]).trim();
      if (propertyId && validPropertyIds.has(propertyId)) {
        validRows.push(row);
      } else {
        removedCount++;
        Logger.log(`削除対象: 行${index + 2} - 物件ID: ${propertyId}`);
      }
    });

    if (removedCount > 0) {
      // データを更新
      roomSheet.clear();
      if (validRows.length > 0) {
        roomSheet.getRange(1, 1, validRows.length, headers.length).setValues(validRows);
      }
      
      Logger.log(`部屋マスタクリーンアップ完了: ${removedCount}件の孤立データを削除`);
      safeAlert('完了', `部屋マスタのクリーンアップが完了しました。\n削除された孤立データ: ${removedCount}件`);
    } else {
      safeAlert('情報', '削除が必要な孤立データはありませんでした。');
    }
  } catch (e) {
    Logger.log(`エラー: 部屋マスタクリーンアップ中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `部屋マスタクリーンアップ中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 空白・無効データの削除
 */
function cleanUpEmptyData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🧹 空白・無効データクリーンアップを開始します...');
    const startTime = new Date();

    const inspectionSheet = ss.getSheetByName('inspection_data');
    if (!inspectionSheet) {
      safeAlert('エラー', 'inspection_dataシートが見つかりません');
      return;
    }

    const data = inspectionSheet.getDataRange().getValues();
    if (data.length <= 1) {
      safeAlert('情報', 'inspection_dataシートにデータがありません');
      return;
    }

    const headers = data[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');

    if (propertyIdIndex === -1 || roomIdIndex === -1) {
      safeAlert('エラー', '物件IDまたは部屋ID列が見つかりません');
      return;
    }

    // 有効な行を特定
    const validRows = [headers];
    let removedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const propertyId = String(row[propertyIdIndex] || '').trim();
      const roomId = String(row[roomIdIndex] || '').trim();

      // 物件IDと部屋IDが両方とも有効な場合のみ保持
      if (propertyId && roomId) {
        validRows.push(row);
      } else {
        removedCount++;
        Logger.log(`空白データ削除: 行${i + 1} - 物件ID: "${propertyId}", 部屋ID: "${roomId}"`);
      }
    }

    if (removedCount > 0) {
      // シートを更新
      inspectionSheet.clear();
      if (validRows.length > 0) {
        inspectionSheet.getRange(1, 1, validRows.length, headers.length).setValues(validRows);
      }

      const endTime = new Date();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      Logger.log(`🧹 空白データクリーンアップ完了: ${removedCount}件の空白データを削除 (処理時間: ${processingTime}秒)`);
      safeAlert('完了', `空白データクリーンアップが完了しました。\n削除件数: ${removedCount}件\n処理時間: ${processingTime}秒`);
    } else {
      safeAlert('情報', '削除が必要な空白データは見つかりませんでした。');
    }

  } catch (e) {
    Logger.log(`エラー: 空白データクリーンアップ中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `空白データクリーンアップ中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * inspection_dataから物件マスタ・部屋マスタに存在しない孤立データを削除
 */
function cleanUpOrphanedInspectionData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🧹 孤立検針データクリーンアップを開始します...');
    const startTime = new Date();

    const propertyMasterSheet = ss.getSheetByName('物件マスタ');
    const roomMasterSheet = ss.getSheetByName('部屋マスタ');
    const inspectionDataSheet = ss.getSheetByName('inspection_data');

    if (!propertyMasterSheet || !roomMasterSheet || !inspectionDataSheet) {
      safeAlert('エラー', '必要なシート（物件マスタ、部屋マスタ、inspection_data）が見つかりません');
      return;
    }

    // 有効な物件-部屋組み合わせを取得
    const roomMasterData = roomMasterSheet.getDataRange().getValues();
    const validCombinations = new Set();
    
    for (let i = 1; i < roomMasterData.length; i++) {
      const propertyId = String(roomMasterData[i][0] || '').trim();
      const roomId = String(roomMasterData[i][1] || '').trim();
      if (propertyId && roomId) {
        validCombinations.add(`${propertyId}_${roomId}`);
      }
    }

    // 検針データを確認
    const inspectionData = inspectionDataSheet.getDataRange().getValues();
    if (inspectionData.length <= 1) {
      safeAlert('情報', 'inspection_dataシートにデータがありません');
      return;
    }

    const headers = inspectionData[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');

    if (propertyIdIndex === -1 || roomIdIndex === -1) {
      safeAlert('エラー', '物件IDまたは部屋ID列が見つかりません');
      return;
    }

    // 有効な検針データを特定
    const validRows = [headers];
    let removedCount = 0;

    for (let i = 1; i < inspectionData.length; i++) {
      const row = inspectionData[i];
      const propertyId = String(row[propertyIdIndex] || '').trim();
      const roomId = String(row[roomIdIndex] || '').trim();

      if (propertyId && roomId) {
        const combination = `${propertyId}_${roomId}`;
        if (validCombinations.has(combination)) {
          validRows.push(row);
        } else {
          removedCount++;
          Logger.log(`孤立データ削除: 行${i + 1} - ${combination}`);
        }
      } else {
        removedCount++;
        Logger.log(`無効データ削除: 行${i + 1} - 物件ID: "${propertyId}", 部屋ID: "${roomId}"`);
      }
    }

    if (removedCount > 0) {
      // シートを更新
      inspectionDataSheet.clear();
      if (validRows.length > 0) {
        inspectionDataSheet.getRange(1, 1, validRows.length, headers.length).setValues(validRows);
      }

      const endTime = new Date();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      Logger.log(`🧹 孤立検針データクリーンアップ完了: ${removedCount}件の孤立データを削除 (処理時間: ${processingTime}秒)`);
      safeAlert('完了', `孤立検針データクリーンアップが完了しました。\n削除件数: ${removedCount}件\n処理時間: ${processingTime}秒`);
    } else {
      safeAlert('情報', '削除が必要な孤立データは見つかりませんでした。');
    }

  } catch (e) {
    Logger.log(`エラー: 孤立検針データクリーンアップ中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `孤立検針データクリーンアップ中にエラーが発生しました:\n${e.message}`);
  }
}

/**
 * 全データクリーンアップの実行
 */
function runCompleteDataCleanup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🧹 全データクリーンアップを開始します...');
    const overallStartTime = new Date();

    // 1. 孤立部屋データの削除
    Logger.log('📋 ステップ1: 孤立部屋データクリーンアップ');
    cleanUpOrphanedRooms();

    // 2. 孤立検針データの削除
    Logger.log('📋 ステップ2: 孤立検針データクリーンアップ');
    cleanUpOrphanedInspectionData();

    // 3. 空白・無効データの削除
    Logger.log('📋 ステップ3: 空白・無効データクリーンアップ');
    cleanUpEmptyData();

    // 4. 重複データの削除
    Logger.log('📋 ステップ4: 重複データクリーンアップ');
    optimizedCleanupDuplicateInspectionData();

    const overallEndTime = new Date();
    const totalProcessingTime = ((overallEndTime - overallStartTime) / 1000).toFixed(2);

    Logger.log(`🧹 全データクリーンアップ完了 (総処理時間: ${totalProcessingTime}秒)`);
    
    let summary = `✅ 全データクリーンアップが完了しました！\n総処理時間: ${totalProcessingTime}秒\n\n`;
    summary += '実行された処理:\n';
    summary += '1. ✅ 孤立部屋データクリーンアップ\n';
    summary += '2. ✅ 孤立検針データクリーンアップ\n';
    summary += '3. ✅ 空白・無効データクリーンアップ\n';
    summary += '4. ✅ 重複データクリーンアップ\n';
    summary += '\n🎉 データの整理が完了しました！';
    
    safeAlert('全データクリーンアップ完了', summary);

  } catch (e) {
    Logger.log(`エラー: 全データクリーンアップ中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `全データクリーンアップ中にエラーが発生しました:\n${e.message}`);
  }
}
