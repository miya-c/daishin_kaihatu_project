/**
 * バッチ処理機能
 * 
 * 大量データの一括処理、定期実行処理、
 * データメンテナンス処理を提供します。
 */

/**
 * 検針データの一括バリデーション
 * @param {number} batchSize - バッチサイズ（デフォルト: 100）
 * @returns {Object} バリデーション結果
 */
function batchValidateMeterReadings(batchSize = 100) {
  try {
    console.log('[batchValidateMeterReadings] 一括バリデーション開始');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('検針データ');
    if (!sheet) {
      throw new Error('検針データシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const results = {
      total: data.length - 1,
      processed: 0,
      errors: [],
      warnings: [],
      summary: {}
    };
    
    // バッチ処理でデータを検証
    for (let i = 1; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length));
      
      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j;
        const row = batch[j];
        
        try {
          // データバリデーション
          const validationResult = validateMeterReadingRow(row, headers, rowIndex + 1);
          
          if (validationResult.errors.length > 0) {
            results.errors.push({
              row: rowIndex + 1,
              errors: validationResult.errors
            });
          }
          
          if (validationResult.warnings.length > 0) {
            results.warnings.push({
              row: rowIndex + 1,
              warnings: validationResult.warnings
            });
          }
          
          results.processed++;
          
        } catch (error) {
          results.errors.push({
            row: rowIndex + 1,
            errors: [`バリデーションエラー: ${error.message}`]
          });
        }
      }
      
      // 進捗表示
      const progress = Math.round((results.processed / results.total) * 100);
      console.log(`[batchValidateMeterReadings] 進捗: ${progress}% (${results.processed}/${results.total})`);
      
      // 処理が重い場合の一時停止
      if (i % (batchSize * 10) === 0) {
        Utilities.sleep(100);
      }
    }
    
    // サマリー作成
    results.summary = {
      エラー数: results.errors.length,
      警告数: results.warnings.length,
      成功率: Math.round(((results.processed - results.errors.length) / results.processed) * 100) + '%'
    };
    
    console.log('[batchValidateMeterReadings] 一括バリデーション完了', results.summary);
    return results;
    
  } catch (error) {
    console.error('[batchValidateMeterReadings] エラー:', error);
    throw error;
  }
}

/**
 * 単一行のバリデーション
 * @param {Array} row - データ行
 * @param {Array} headers - ヘッダー
 * @param {number} rowNumber - 行番号
 * @returns {Object} バリデーション結果
 */
function validateMeterReadingRow(row, headers, rowNumber) {
  const errors = [];
  const warnings = [];
  
  try {
    // 必須フィールドのチェック
    const roomId = row[0];
    const readingDate = row[1];
    const waterMeter = row[2];
    
    if (!roomId) {
      errors.push('部屋IDが入力されていません');
    }
    
    if (!readingDate) {
      errors.push('検針日が入力されていません');
    } else {
      const date = new Date(readingDate);
      if (isNaN(date.getTime())) {
        errors.push('検針日の形式が正しくありません');
      }
    }
    
    if (waterMeter !== '' && waterMeter !== null && waterMeter !== undefined) {
      const meter = Number(waterMeter);
      if (isNaN(meter) || meter < 0) {
        errors.push('水道メーター値が正しくありません');
      } else if (meter > 999999) {
        warnings.push('水道メーター値が異常に大きい値です');
      }
    }
    
    return { errors, warnings };
    
  } catch (error) {
    return {
      errors: [`行バリデーションエラー: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * 重複データの一括検出
 * @returns {Object} 重複検出結果
 */
function batchDetectDuplicates() {
  try {
    console.log('[batchDetectDuplicates] 重複検出開始');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('検針データ');
    if (!sheet) {
      throw new Error('検針データシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const duplicates = {};
    const results = {
      total: data.length - 1,
      duplicateGroups: [],
      summary: {}
    };
    
    // 重複キーの生成と検出
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const roomId = row[0];
      const readingDate = row[1];
      
      if (roomId && readingDate) {
        const key = `${roomId}_${new Date(readingDate).toDateString()}`;
        
        if (!duplicates[key]) {
          duplicates[key] = [];
        }
        
        duplicates[key].push({
          row: i + 1,
          data: row
        });
      }
    }
    
    // 重複があるグループを抽出
    Object.keys(duplicates).forEach(key => {
      if (duplicates[key].length > 1) {
        results.duplicateGroups.push({
          key,
          count: duplicates[key].length,
          rows: duplicates[key]
        });
      }
    });
    
    results.summary = {
      重複グループ数: results.duplicateGroups.length,
      重複レコード数: results.duplicateGroups.reduce((sum, group) => sum + group.count, 0)
    };
    
    console.log('[batchDetectDuplicates] 重複検出完了', results.summary);
    return results;
    
  } catch (error) {
    console.error('[batchDetectDuplicates] エラー:', error);
    throw error;
  }
}

/**
 * 古いデータのアーカイブ処理
 * @param {number} monthsOld - アーカイブ対象月数（デフォルト: 24ヶ月）
 * @returns {Object} アーカイブ結果
 */
function batchArchiveOldData(monthsOld = 24) {
  try {
    console.log(`[batchArchiveOldData] ${monthsOld}ヶ月以前のデータアーカイブ開始`);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('検針データ');
    if (!sheet) {
      throw new Error('検針データシートが見つかりません');
    }
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const archiveData = [];
    const keepData = [headers];
    
    let archivedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const readingDate = new Date(row[1]);
      
      if (readingDate < cutoffDate) {
        archiveData.push(row);
        archivedCount++;
      } else {
        keepData.push(row);
      }
    }
    
    if (archivedCount > 0) {
      // アーカイブシートの作成または更新
      const archiveSheetName = `検針データ_アーカイブ_${new Date().getFullYear()}`;
      let archiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(archiveSheetName);
      
      if (!archiveSheet) {
        archiveSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(archiveSheetName);
        archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      
      // アーカイブデータの追加
      if (archiveData.length > 0) {
        const lastRow = archiveSheet.getLastRow();
        archiveSheet.getRange(lastRow + 1, 1, archiveData.length, headers.length).setValues(archiveData);
      }
      
      // 元シートのデータ更新
      sheet.clear();
      sheet.getRange(1, 1, keepData.length, headers.length).setValues(keepData);
    }
    
    const results = {
      アーカイブ件数: archivedCount,
      残存件数: keepData.length - 1,
      アーカイブシート: archiveSheetName,
      処理日時: new Date()
    };
    
    console.log('[batchArchiveOldData] アーカイブ処理完了', results);
    return results;
    
  } catch (error) {
    console.error('[batchArchiveOldData] エラー:', error);
    throw error;
  }
}

/**
 * データ整合性の一括チェック
 * @returns {Object} 整合性チェック結果
 */
function batchIntegrityCheck() {
  try {
    console.log('[batchIntegrityCheck] 整合性チェック開始');
    
    const results = {
      checks: [],
      errors: [],
      warnings: [],
      summary: {}
    };
    
    // 物件・部屋マスタの整合性チェック
    const propertyRoomCheck = checkPropertyRoomIntegrity();
    results.checks.push('物件・部屋マスタ整合性');
    if (propertyRoomCheck.errors.length > 0) {
      results.errors.push(...propertyRoomCheck.errors);
    }
    
    // 検針データと部屋マスタの整合性チェック
    const meterRoomCheck = checkMeterRoomIntegrity();
    results.checks.push('検針データ・部屋マスタ整合性');
    if (meterRoomCheck.errors.length > 0) {
      results.errors.push(...meterRoomCheck.errors);
    }
    
    // データ型整合性チェック
    const dataTypeCheck = checkDataTypeIntegrity();
    results.checks.push('データ型整合性');
    if (dataTypeCheck.errors.length > 0) {
      results.errors.push(...dataTypeCheck.errors);
    }
    
    results.summary = {
      チェック項目数: results.checks.length,
      エラー数: results.errors.length,
      警告数: results.warnings.length,
      状態: results.errors.length === 0 ? '正常' : '要確認'
    };
    
    console.log('[batchIntegrityCheck] 整合性チェック完了', results.summary);
    return results;
    
  } catch (error) {
    console.error('[batchIntegrityCheck] エラー:', error);
    throw error;
  }
}

/**
 * 物件・部屋マスタの整合性チェック
 */
function checkPropertyRoomIntegrity() {
  const errors = [];
  
  try {
    const propertySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('物件マスタ');
    const roomSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('部屋マスタ');
    
    if (!propertySheet || !roomSheet) {
      errors.push('物件マスタまたは部屋マスタシートが見つかりません');
      return { errors };
    }
    
    const propertyData = propertySheet.getDataRange().getValues();
    const roomData = roomSheet.getDataRange().getValues();
    
    const propertyIds = new Set();
    for (let i = 1; i < propertyData.length; i++) {
      const propertyId = propertyData[i][0];
      if (propertyId) {
        propertyIds.add(propertyId);
      }
    }
    
    // 部屋マスタの物件IDが物件マスタに存在するかチェック
    for (let i = 1; i < roomData.length; i++) {
      const roomPropertyId = roomData[i][1]; // 物件ID列
      if (roomPropertyId && !propertyIds.has(roomPropertyId)) {
        errors.push(`部屋マスタ行${i + 1}: 物件ID「${roomPropertyId}」が物件マスタに存在しません`);
      }
    }
    
  } catch (error) {
    errors.push(`物件・部屋整合性チェックエラー: ${error.message}`);
  }
  
  return { errors };
}

/**
 * 検針データと部屋マスタの整合性チェック
 */
function checkMeterRoomIntegrity() {
  const errors = [];
  
  try {
    const roomSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('部屋マスタ');
    const meterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('検針データ');
    
    if (!roomSheet || !meterSheet) {
      errors.push('部屋マスタまたは検針データシートが見つかりません');
      return { errors };
    }
    
    const roomData = roomSheet.getDataRange().getValues();
    const meterData = meterSheet.getDataRange().getValues();
    
    const roomIds = new Set();
    for (let i = 1; i < roomData.length; i++) {
      const roomId = roomData[i][0];
      if (roomId) {
        roomIds.add(roomId);
      }
    }
    
    // 検針データの部屋IDが部屋マスタに存在するかチェック
    for (let i = 1; i < meterData.length; i++) {
      const meterRoomId = meterData[i][0]; // 部屋ID列
      if (meterRoomId && !roomIds.has(meterRoomId)) {
        errors.push(`検針データ行${i + 1}: 部屋ID「${meterRoomId}」が部屋マスタに存在しません`);
      }
    }
    
  } catch (error) {
    errors.push(`検針・部屋整合性チェックエラー: ${error.message}`);
  }
  
  return { errors };
}

/**
 * データ型整合性チェック
 */
function checkDataTypeIntegrity() {
  const errors = [];
  
  try {
    const meterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('検針データ');
    if (!meterSheet) {
      errors.push('検針データシートが見つかりません');
      return { errors };
    }
    
    const data = meterSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // 日付チェック
      const readingDate = row[1];
      if (readingDate && !(readingDate instanceof Date) && isNaN(new Date(readingDate).getTime())) {
        errors.push(`検針データ行${i + 1}: 検針日の形式が正しくありません`);
      }
      
      // 数値チェック
      const waterMeter = row[2];
      if (waterMeter !== '' && waterMeter !== null && waterMeter !== undefined && isNaN(Number(waterMeter))) {
        errors.push(`検針データ行${i + 1}: 水道メーター値が数値ではありません`);
      }
    }
    
  } catch (error) {
    errors.push(`データ型整合性チェックエラー: ${error.message}`);
  }  
  return { errors };
}

/**
 * 統合バッチ最適化処理
 * main.gsから呼び出される統合処理関数
 * @returns {Object} 処理結果
 */
function runBatchOptimization() {
  try {
    console.log('[runBatchOptimization] 統合バッチ最適化開始');
    
    const results = {
      validation: null,
      duplicates: null,
      integrity: null,
      indexes: null
    };
    
    // 1. データバリデーション
    try {
      console.log('[runBatchOptimization] バリデーション実行中...');
      results.validation = validateInspectionDataIntegrity();
    } catch (error) {
      console.error('[runBatchOptimization] バリデーションエラー:', error);
    }
    
    // 2. 重複データ検出・クリーンアップ
    try {
      console.log('[runBatchOptimization] 重複データ処理中...');
      results.duplicates = optimizedCleanupDuplicateInspectionData();
    } catch (error) {
      console.error('[runBatchOptimization] 重複処理エラー:', error);
    }
    
    // 3. 整合性チェック
    try {
      console.log('[runBatchOptimization] 整合性チェック中...');
      results.integrity = batchIntegrityCheck();
    } catch (error) {
      console.error('[runBatchOptimization] 整合性チェックエラー:', error);
    }
    
    // 4. インデックス作成
    try {
      console.log('[runBatchOptimization] インデックス作成中...');
      results.indexes = createAllIndexes();
    } catch (error) {
      console.error('[runBatchOptimization] インデックス作成エラー:', error);
    }
    
    console.log('[runBatchOptimization] 統合バッチ最適化完了');
    return results;
    
  } catch (error) {
    console.error('[runBatchOptimization] エラー:', error);
    throw error;
  }
}

/**
 * データバリデーションを実行（data_validation.gsの関数を呼び出し）
 * @returns {Object} バリデーション結果
 */
function batchValidateData() {
  try {
    console.log('[batchValidateData] data_validation.gsの関数を呼び出し');
    return validateInspectionDataIntegrity();
  } catch (error) {
    console.error('[batchValidateData] エラー:', error);
    throw error;
  }
}

/**
 * データクリーンアップを実行（data_cleanup.gsの関数を呼び出し）
 * @returns {Object} クリーンアップ結果
 */
function batchCleanupData() {
  try {
    console.log('[batchCleanupData] data_cleanup.gsの関数を呼び出し');
    return optimizedCleanupDuplicateInspectionData();
  } catch (error) {
    console.error('[batchCleanupData] エラー:', error);
    throw error;
  }
}
