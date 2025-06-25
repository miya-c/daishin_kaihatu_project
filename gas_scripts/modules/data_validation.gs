/**
 * Data Validation Functions
 * データ検証と整合性チェック機能
 * 元ファイル: 総合カスタム処理.gs および gas_dialog_functions.gs から抽出
 */

/**
 * データ整合性チェック機能 (総合カスタム処理.gsから統合)
 */
function validateInspectionDataIntegrity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('🔍 データ整合性チェックを開始します...');
    const startTime = new Date();

    // 各マスタシートを取得
    const propertyMasterSheet = ss.getSheetByName('物件マスタ');
    const roomMasterSheet = ss.getSheetByName('部屋マスタ');
    const inspectionDataSheet = ss.getSheetByName('inspection_data');

    if (!propertyMasterSheet || !roomMasterSheet || !inspectionDataSheet) {
      safeAlert('エラー', '必要なシート（物件マスタ、部屋マスタ、inspection_data）が見つかりません');
      return;
    }

    // 物件マスタから有効な物件IDを取得
    const propertyMasterData = propertyMasterSheet.getDataRange().getValues();
    const validPropertyIds = new Set();
    for (let i = 1; i < propertyMasterData.length; i++) {
      const propertyId = String(propertyMasterData[i][0]).trim();
      if (propertyId) {
        validPropertyIds.add(propertyId);
      }
    }

    // 部屋マスタから有効な部屋IDと物件-部屋の組み合わせを取得
    const roomMasterData = roomMasterSheet.getDataRange().getValues();
    const validRoomIds = new Set();
    const validPropertyRoomCombinations = new Set();
    for (let i = 1; i < roomMasterData.length; i++) {
      const propertyId = String(roomMasterData[i][0]).trim();
      const roomId = String(roomMasterData[i][1]).trim();
      if (propertyId && roomId) {
        validRoomIds.add(roomId);
        validPropertyRoomCombinations.add(`${propertyId}_${roomId}`);
      }
    }

    // データインデックスを作成
    const indexes = createDataIndexes();
    if (!indexes) {
      return;
    }

    // 整合性チェック結果
    const issues = {
      invalidPropertyIds: [],
      invalidRoomIds: [],
      invalidCombinations: [],
      duplicateRecordIds: Array.from(indexes.duplicateRecordIds),
      missingRecordIds: [],
      inconsistentPropertyNames: []
    };

    // 検針データの各レコードをチェック
    indexes.byRecordId.forEach((rowData, recordId) => {
      const { propertyId, roomId, propertyName } = rowData;

      // 記録IDチェック
      if (!recordId || recordId === '') {
        issues.missingRecordIds.push(`行 ${rowData.rowIndex + 1}`);
      }

      // 物件IDチェック
      if (propertyId && !validPropertyIds.has(propertyId)) {
        issues.invalidPropertyIds.push(`行 ${rowData.rowIndex + 1}: ${propertyId}`);
      }

      // 部屋IDチェック
      if (roomId && !validRoomIds.has(roomId)) {
        issues.invalidRoomIds.push(`行 ${rowData.rowIndex + 1}: ${roomId}`);
      }

      // 物件-部屋組み合わせチェック
      if (propertyId && roomId) {
        const combination = `${propertyId}_${roomId}`;
        if (!validPropertyRoomCombinations.has(combination)) {
          issues.invalidCombinations.push(`行 ${rowData.rowIndex + 1}: ${combination}`);
        }
      }

      // 物件名の整合性チェック（物件マスタと比較）
      if (propertyId && validPropertyIds.has(propertyId)) {
        const masterPropertyName = propertyMasterData.find(row => 
          String(row[0]).trim() === propertyId
        )?.[1];
        if (masterPropertyName && String(masterPropertyName).trim() !== propertyName) {
          issues.inconsistentPropertyNames.push(
            `行 ${rowData.rowIndex + 1}: 検針データ="${propertyName}" vs マスタ="${masterPropertyName}"`
          );
        }
      }
    });

    const endTime = new Date();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    // 結果レポート作成
    let reportMessage = `🔍 データ整合性チェック結果\n処理時間: ${processingTime}秒\n\n`;

    if (Object.values(issues).every(arr => arr.length === 0)) {
      reportMessage += '✅ 問題は見つかりませんでした。';
    } else {
      if (issues.invalidPropertyIds.length > 0) {
        reportMessage += `❌ 無効な物件ID (${issues.invalidPropertyIds.length}件):\n${issues.invalidPropertyIds.join('\n')}\n\n`;
      }
      if (issues.invalidRoomIds.length > 0) {
        reportMessage += `❌ 無効な部屋ID (${issues.invalidRoomIds.length}件):\n${issues.invalidRoomIds.join('\n')}\n\n`;
      }
      if (issues.invalidCombinations.length > 0) {
        reportMessage += `❌ 無効な物件-部屋組み合わせ (${issues.invalidCombinations.length}件):\n${issues.invalidCombinations.join('\n')}\n\n`;
      }
      if (issues.duplicateRecordIds.length > 0) {
        reportMessage += `❌ 重複記録ID (${issues.duplicateRecordIds.length}件):\n${issues.duplicateRecordIds.join('\n')}\n\n`;
      }
      if (issues.missingRecordIds.length > 0) {
        reportMessage += `❌ 欠損記録ID (${issues.missingRecordIds.length}件):\n${issues.missingRecordIds.join('\n')}\n\n`;
      }
      if (issues.inconsistentPropertyNames.length > 0) {
        reportMessage += `❌ 物件名不整合 (${issues.inconsistentPropertyNames.length}件):\n${issues.inconsistentPropertyNames.join('\n')}`;
      }
    }

    Logger.log(reportMessage);
    safeAlert('データ整合性チェック完了', reportMessage);

    return issues;

  } catch (e) {
    Logger.log(`エラー: データ整合性チェック中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `データ整合性チェック中にエラーが発生しました:\n${e.message}`);
    return null;
  }
}

/**
 * データ高速検索用のインデックスを作成 (総合カスタム処理.gsから統合)
 */
function createDataIndexes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return null;
  }

  try {
    Logger.log('📊 データインデックス作成を開始します...');

    const inspectionSheet = ss.getSheetByName('inspection_data');
    if (!inspectionSheet) {
      safeAlert('エラー', 'inspection_dataシートが見つかりません');
      return null;
    }

    const data = inspectionSheet.getDataRange().getValues();
    if (data.length <= 1) {
      safeAlert('情報', 'inspection_dataシートにデータがありません');
      return null;
    }

    const headers = data[0];
    const recordIdIndex = headers.indexOf('記録ID');
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');
    const propertyNameIndex = headers.indexOf('物件名');
    const roomNameIndex = headers.indexOf('部屋名');
    const inspectionDateIndex = headers.indexOf('検針日時');
    const currentReadingIndex = headers.indexOf('今回の指示数');
    const previousReadingIndex = headers.indexOf('前回指示数');
    const usageIndex = headers.indexOf('今回使用量');

    // インデックス構造を初期化
    const indexes = {
      byRecordId: new Map(),
      byProperty: new Map(),
      byRoom: new Map(),
      byPropertyRoom: new Map(),
      duplicateRecordIds: new Set()
    };

    // データをスキャンしてインデックスを構築
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const recordId = String(row[recordIdIndex] || '').trim();
      const propertyId = String(row[propertyIdIndex] || '').trim();
      const roomId = String(row[roomIdIndex] || '').trim();
      const propertyName = String(row[propertyNameIndex] || '').trim();
      const roomName = String(row[roomNameIndex] || '').trim();

      const rowData = {
        rowIndex: i,
        recordId,
        propertyId,
        roomId,
        propertyName,
        roomName,
        inspectionDate: row[inspectionDateIndex],
        currentReading: row[currentReadingIndex],
        previousReading: row[previousReadingIndex],
        usage: row[usageIndex]
      };

      // 記録IDインデックス（重複チェック含む）
      if (recordId) {
        if (indexes.byRecordId.has(recordId)) {
          indexes.duplicateRecordIds.add(recordId);
        } else {
          indexes.byRecordId.set(recordId, rowData);
        }
      }

      // 物件IDインデックス
      if (propertyId) {
        if (!indexes.byProperty.has(propertyId)) {
          indexes.byProperty.set(propertyId, []);
        }
        indexes.byProperty.get(propertyId).push(rowData);
      }

      // 部屋IDインデックス
      if (roomId) {
        if (!indexes.byRoom.has(roomId)) {
          indexes.byRoom.set(roomId, []);
        }
        indexes.byRoom.get(roomId).push(rowData);
      }

      // 物件-部屋組み合わせインデックス
      if (propertyId && roomId) {
        const key = `${propertyId}_${roomId}`;
        if (!indexes.byPropertyRoom.has(key)) {
          indexes.byPropertyRoom.set(key, []);
        }
        indexes.byPropertyRoom.get(key).push(rowData);
      }
    }

    const indexCreationTime = new Date();
    Logger.log(`📊 データインデックス作成完了:`);
    Logger.log(`   - 総レコード数: ${data.length - 1}`);
    Logger.log(`   - 記録ID数: ${indexes.byRecordId.size}`);
    Logger.log(`   - 物件数: ${indexes.byProperty.size}`);
    Logger.log(`   - 部屋数: ${indexes.byRoom.size}`);
    Logger.log(`   - 物件-部屋組み合わせ数: ${indexes.byPropertyRoom.size}`);
    Logger.log(`   - 重複記録ID数: ${indexes.duplicateRecordIds.size}`);

    return indexes;

  } catch (e) {
    Logger.log(`エラー: データインデックス作成中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `データインデックス作成中にエラーが発生しました:\n${e.message}`);
    return null;
  }
}

/**
 * データの基本統計情報を収集・表示
 */
function generateDataStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    safeAlert('エラー', 'アクティブなスプレッドシートが見つかりません');
    return;
  }

  try {
    Logger.log('📈 データ統計情報の生成を開始します...');

    const propertyMasterSheet = ss.getSheetByName('物件マスタ');
    const roomMasterSheet = ss.getSheetByName('部屋マスタ');
    const inspectionDataSheet = ss.getSheetByName('inspection_data');

    if (!propertyMasterSheet || !roomMasterSheet || !inspectionDataSheet) {
      safeAlert('エラー', '必要なシート（物件マスタ、部屋マスタ、inspection_data）が見つかりません');
      return;
    }

    // 各シートのデータ件数を取得
    const propertyCount = Math.max(0, propertyMasterSheet.getLastRow() - 1);
    const roomCount = Math.max(0, roomMasterSheet.getLastRow() - 1);
    const inspectionCount = Math.max(0, inspectionDataSheet.getLastRow() - 1);

    // 統計情報の収集
    const statistics = {
      property: { count: propertyCount },
      room: { count: roomCount },
      inspection: { count: inspectionCount }
    };

    // 検針データの詳細統計
    if (inspectionCount > 0) {
      const inspectionData = inspectionDataSheet.getDataRange().getValues();
      const headers = inspectionData[0];
      
      const propertyIdIndex = headers.indexOf('物件ID');
      const roomIdIndex = headers.indexOf('部屋ID');
      const currentReadingIndex = headers.indexOf('今回の指示数');
      const usageIndex = headers.indexOf('今回使用量');

      let recordsWithReading = 0;
      let recordsWithUsage = 0;
      const uniqueProperties = new Set();
      const uniqueRooms = new Set();

      for (let i = 1; i < inspectionData.length; i++) {
        const row = inspectionData[i];
        
        if (row[currentReadingIndex] && String(row[currentReadingIndex]).trim() !== '') {
          recordsWithReading++;
        }
        
        if (row[usageIndex] && String(row[usageIndex]).trim() !== '') {
          recordsWithUsage++;
        }

        const propertyId = String(row[propertyIdIndex] || '').trim();
        const roomId = String(row[roomIdIndex] || '').trim();
        
        if (propertyId) uniqueProperties.add(propertyId);
        if (roomId) uniqueRooms.add(roomId);
      }

      statistics.inspection.withReading = recordsWithReading;
      statistics.inspection.withUsage = recordsWithUsage;
      statistics.inspection.uniqueProperties = uniqueProperties.size;
      statistics.inspection.uniqueRooms = uniqueRooms.size;
      statistics.inspection.completionRate = ((recordsWithReading / inspectionCount) * 100).toFixed(1);
    }

    // 統計レポートの生成
    let reportMessage = '📈 データ統計レポート\n';
    reportMessage += '='.repeat(40) + '\n\n';
    reportMessage += `🏢 物件マスタ: ${statistics.property.count}件\n`;
    reportMessage += `🏠 部屋マスタ: ${statistics.room.count}件\n`;
    reportMessage += `📊 検針データ: ${statistics.inspection.count}件\n\n`;

    if (statistics.inspection.count > 0) {
      reportMessage += '📋 検針データ詳細:\n';
      reportMessage += `   ✅ 検針値入力済み: ${statistics.inspection.withReading}件\n`;
      reportMessage += `   📈 使用量計算済み: ${statistics.inspection.withUsage}件\n`;
      reportMessage += `   🏢 関連物件数: ${statistics.inspection.uniqueProperties}件\n`;
      reportMessage += `   🏠 関連部屋数: ${statistics.inspection.uniqueRooms}件\n`;
      reportMessage += `   📊 完了率: ${statistics.inspection.completionRate}%\n`;
    }

    Logger.log(reportMessage);
    safeAlert('データ統計完了', reportMessage);

    return statistics;

  } catch (e) {
    Logger.log(`エラー: データ統計生成中にエラーが発生: ${e.message}`);
    safeAlert('エラー', `データ統計生成中にエラーが発生しました:\n${e.message}`);
    return null;
  }
}
