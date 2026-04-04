/**
 * batch_processing.gs - バッチ処理モジュール
 * Version: 1.0.0 - Library Edition
 */

/**
 * 検針データ行の妥当性をバリデーション（ヘッダーベース列検索版）
 * @param {Array} row - 検査対象のデータ行
 * @param {Array} headers - ヘッダー行の配列
 * @param {Object} options - バリデーションオプション
 * @returns {Object} {valid: boolean, errors: string[]}
 */
function validateMeterReadingRow(row, headers, options = {}) {
  const errors = [];

  if (!headers || !Array.isArray(headers)) {
    return { valid: false, errors: ['ヘッダー行が無効です'] };
  }

  if (!row || !Array.isArray(row)) {
    return { valid: false, errors: ['データ行が無効です'] };
  }

  // ヘッダーベースで必要な列インデックスを動的に特定
  const propertyIdCol = headers.indexOf('物件ID');
  const roomIdCol = headers.indexOf('部屋ID');
  const currentReadingCol = headers.indexOf('今回の指示数');
  const previousReadingCol = headers.indexOf('前回指示数');
  const usageCol = headers.indexOf('今回使用量');
  const readingDateCol = headers.indexOf('検針日時');
  const warningFlagCol = headers.indexOf('警告フラグ');

  // 必須列の存在確認
  if (propertyIdCol === -1) {
    errors.push('「物件ID」列が見つかりません');
  }
  if (roomIdCol === -1) {
    errors.push('「部屋ID」列が見つかりません');
  }
  if (currentReadingCol === -1) {
    errors.push('「今回の指示数」列が見つかりません');
  }

  if (errors.length > 0) {
    return { valid: false, errors: errors };
  }

  // 物件IDの検証
  const propertyId = String(row[propertyIdCol] || '').trim();
  if (!propertyId) {
    errors.push('物件IDが空です');
  } else if (!/^P\d{6}$/.test(propertyId)) {
    errors.push(`物件IDの形式が不正です: ${propertyId}`);
  }

  // 部屋IDの検証
  const roomId = String(row[roomIdCol] || '').trim();
  if (!roomId) {
    errors.push('部屋IDが空です');
  } else if (!/^R\d{3,6}$/.test(roomId)) {
    errors.push(`部屋IDの形式が不正です: ${roomId}`);
  }

  // 今回指示数の検証
  const currentReading = row[currentReadingCol];
  if (currentReading !== null && currentReading !== undefined && String(currentReading).trim() !== '') {
    const numReading = Number(currentReading);
    if (isNaN(numReading)) {
      errors.push(`今回の指示数が数値ではありません: ${currentReading}`);
    } else if (numReading < 0) {
      errors.push(`今回の指示数が負の値です: ${numReading}`);
    } else if (numReading > 999999) {
      errors.push(`今回の指示数が上限を超えています: ${numReading}`);
    }
  }

  // 前回指示数との整合性チェック（オプション）
  if (previousReadingCol !== -1 && currentReadingCol !== -1) {
    const prevReading = row[previousReadingCol];
    const currReading = row[currentReadingCol];
    if (prevReading !== null && prevReading !== undefined && String(prevReading).trim() !== '' &&
        currReading !== null && currReading !== undefined && String(currReading).trim() !== '') {
      const prevNum = Number(prevReading);
      const currNum = Number(currReading);
      if (!isNaN(prevNum) && !isNaN(currNum) && currNum < prevNum) {
        errors.push(`今回指示数(${currNum})が前回指示数(${prevNum})を下回っています`);
      }
    }
  }

  // 使用量の検証（オプション）
  if (usageCol !== -1) {
    const usage = row[usageCol];
    if (usage !== null && usage !== undefined && String(usage).trim() !== '') {
      const numUsage = Number(usage);
      if (isNaN(numUsage)) {
        errors.push(`使用量が数値ではありません: ${usage}`);
      } else if (numUsage < 0) {
        errors.push(`使用量が負の値です: ${numUsage}`);
      }
    }
  }

  // 検針日時の検証（オプション）
  if (readingDateCol !== -1 && options.validateDate !== false) {
    const dateValue = row[readingDateCol];
    if (dateValue !== null && dateValue !== undefined && String(dateValue).trim() !== '') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) {
        errors.push(`検針日時が無効な日付です: ${dateValue}`);
      }
    }
  }

  // 警告フラグの検証（オプション）
  if (warningFlagCol !== -1 && options.validateWarningFlag === true) {
    const warningFlag = String(row[warningFlagCol] || '').trim();
    const validFlags = ['正常', '要確認', '警告あり', '入力待ち', '判定不可', ''];
    if (warningFlag && !validFlags.includes(warningFlag)) {
      errors.push(`警告フラグの値が不正です: ${warningFlag}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * 検針データをバッチでバリデーション
 * @param {Array} headers - ヘッダー行の配列
 * @param {Array} dataRows - データ行の配列（ヘッダー除く）
 * @param {Object} options - バリデーションオプション
 * @returns {Object} {totalRows, validRows, invalidRows, errors: Array<{row, errors}>}
 */
function batchValidateMeterReadings(headers, dataRows, options = {}) {
  const results = {
    totalRows: dataRows.length,
    validRows: 0,
    invalidRows: 0,
    errors: []
  };

  for (let i = 0; i < dataRows.length; i++) {
    const validation = validateMeterReadingRow(dataRows[i], headers, options);
    if (validation.valid) {
      results.validRows++;
    } else {
      results.invalidRows++;
      results.errors.push({
        row: i + 2, // ヘッダー行+1始まりインデックス
        rowData: dataRows[i],
        errors: validation.errors
      });
    }
  }

  return results;
}
