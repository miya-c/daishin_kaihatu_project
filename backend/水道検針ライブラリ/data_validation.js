/**
 * data_validation.gs - データ検証と整合性チェック機能
 * Version: 1.0.0 - Library Edition
 */

/**
 * データ整合性チェック機能
 * @param {Spreadsheet} ss - 対象スプレッドシート（指定しない場合はアクティブシート）
 * @param {Object} config - 設定オブジェクト（オプション）
 * @returns {Object} チェック結果
 */
function validateInspectionDataIntegrity(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    Logger.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    Logger.log('🔍 データ整合性チェックを開始します...');
    const startTime = new Date();

    // 各マスタシートを取得
    const propertyMasterSheet = ss.getSheetByName(config.propertyMasterSheetName || '物件マスタ');
    const roomMasterSheet = ss.getSheetByName(config.roomMasterSheetName || '部屋マスタ');
    const inspectionDataSheet = ss.getSheetByName(config.inspectionDataSheetName || 'inspection_data');

    if (!propertyMasterSheet || !roomMasterSheet || !inspectionDataSheet) {
      const error = '必要なシート（物件マスタ、部屋マスタ、inspection_data）が見つかりません';
      if (typeof safeAlert === 'function') {
        safeAlert('エラー', error);
      }
      return { success: false, error: error };
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
        validPropertyRoomCombinations.add(`${propertyId}|${roomId}`);
      }
    }

    // inspection_dataの整合性チェック
    const inspectionData = inspectionDataSheet.getDataRange().getValues();
    const invalidRecords = [];
    let validRecords = 0;

    for (let i = 1; i < inspectionData.length; i++) {
      const row = inspectionData[i];
      const propertyId = String(row[0]).trim();
      const roomId = String(row[2]).trim();
      const combination = `${propertyId}|${roomId}`;

      const issues = [];

      // 物件IDの検証
      if (!validPropertyIds.has(propertyId)) {
        issues.push('無効な物件ID');
      }

      // 部屋IDの検証
      if (!validRoomIds.has(roomId)) {
        issues.push('無効な部屋ID');
      }

      // 物件-部屋の組み合わせ検証
      if (!validPropertyRoomCombinations.has(combination)) {
        issues.push('無効な物件-部屋の組み合わせ');
      }

      if (issues.length > 0) {
        invalidRecords.push({
          row: i + 1,
          propertyId: propertyId,
          roomId: roomId,
          issues: issues
        });
      } else {
        validRecords++;
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    const result = {
      success: true,
      summary: {
        totalRecords: inspectionData.length - 1,
        validRecords: validRecords,
        invalidRecords: invalidRecords.length,
        validPropertyIds: validPropertyIds.size,
        validRoomIds: validRoomIds.size,
        validCombinations: validPropertyRoomCombinations.size,
        duration: duration
      },
      invalidRecords: invalidRecords
    };

    Logger.log(`✅ データ整合性チェック完了`);
    Logger.log(`📊 総レコード数: ${result.summary.totalRecords}`);
    Logger.log(`✅ 有効レコード数: ${result.summary.validRecords}`);
    Logger.log(`❌ 無効レコード数: ${result.summary.invalidRecords}`);
    Logger.log(`⏱️ 処理時間: ${duration}ms`);

    return result;

  } catch (error) {
    Logger.log(`❌ データ整合性チェック中にエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 物件マスタの重複チェック
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} チェック結果
 */
function validatePropertyMasterDuplicates(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    Logger.log('エラー: スプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    const propertyMasterSheet = ss.getSheetByName(config.propertyMasterSheetName || '物件マスタ');
    if (!propertyMasterSheet) {
      return { success: false, error: '物件マスタシートが見つかりません' };
    }

    const data = propertyMasterSheet.getDataRange().getValues();
    const duplicates = [];
    const seenIds = new Map();

    for (let i = 1; i < data.length; i++) {
      const propertyId = String(data[i][0]).trim();
      if (propertyId) {
        if (seenIds.has(propertyId)) {
          duplicates.push({
            propertyId: propertyId,
            rows: [seenIds.get(propertyId), i + 1]
          });
        } else {
          seenIds.set(propertyId, i + 1);
        }
      }
    }

    return {
      success: true,
      duplicates: duplicates,
      totalRecords: data.length - 1,
      duplicateCount: duplicates.length
    };

  } catch (error) {
    Logger.log(`❌ 物件マスタ重複チェック中にエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 部屋マスタの重複チェック
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} チェック結果
 */
function validateRoomMasterDuplicates(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    Logger.log('エラー: スプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    const roomMasterSheet = ss.getSheetByName(config.roomMasterSheetName || '部屋マスタ');
    if (!roomMasterSheet) {
      return { success: false, error: '部屋マスタシートが見つかりません' };
    }

    const data = roomMasterSheet.getDataRange().getValues();
    const duplicates = [];
    const seenCombinations = new Map();

    for (let i = 1; i < data.length; i++) {
      const propertyId = String(data[i][0]).trim();
      const roomId = String(data[i][1]).trim();
      const combination = `${propertyId}|${roomId}`;
      
      if (propertyId && roomId) {
        if (seenCombinations.has(combination)) {
          duplicates.push({
            propertyId: propertyId,
            roomId: roomId,
            rows: [seenCombinations.get(combination), i + 1]
          });
        } else {
          seenCombinations.set(combination, i + 1);
        }
      }
    }

    return {
      success: true,
      duplicates: duplicates,
      totalRecords: data.length - 1,
      duplicateCount: duplicates.length
    };

  } catch (error) {
    Logger.log(`❌ 部屋マスタ重複チェック中にエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * データ値の妥当性チェック
 * @param {Object} data - チェック対象のデータ
 * @param {Object} rules - バリデーションルール
 * @returns {Object} チェック結果
 */
function validateDataValues(data, rules = {}) {
  const errors = [];
  
  try {
    // 物件IDの形式チェック
    if (rules.propertyIdFormat && data.propertyId) {
      const propertyIdPattern = new RegExp(rules.propertyIdFormat);
      if (!propertyIdPattern.test(data.propertyId)) {
        errors.push('物件IDの形式が正しくありません');
      }
    }
    
    // 部屋IDの形式チェック
    if (rules.roomIdFormat && data.roomId) {
      const roomIdPattern = new RegExp(rules.roomIdFormat);
      if (!roomIdPattern.test(data.roomId)) {
        errors.push('部屋IDの形式が正しくありません');
      }
    }
    
    // 検針値の数値チェック
    if (data.previousReading !== undefined && data.previousReading !== '') {
      const prevReading = Number(data.previousReading);
      if (isNaN(prevReading) || prevReading < 0) {
        errors.push('前回検針値が無効です');
      }
    }
    
    if (data.currentReading !== undefined && data.currentReading !== '') {
      const currReading = Number(data.currentReading);
      if (isNaN(currReading) || currReading < 0) {
        errors.push('今回検針値が無効です');
      }
    }
    
    // 使用量の妥当性チェック
    if (data.usage !== undefined && data.usage !== '') {
      const usage = Number(data.usage);
      if (isNaN(usage)) {
        errors.push('使用量が無効です');
      } else if (rules.maxUsage && usage > rules.maxUsage) {
        errors.push(`使用量が上限値（${rules.maxUsage}）を超えています`);
      }
    }
    
    return {
      success: errors.length === 0,
      errors: errors
    };
    
  } catch (error) {
    Logger.log(`❌ データ値チェック中にエラーが発生しました: ${error.message}`);
    return { success: false, errors: [error.message] };
  }
}
