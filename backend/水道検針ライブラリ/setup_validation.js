/**
 * setup_validation.gs - 導入完了検証機能
 *
 * システム導入が正常に完了したかを包括的に検証
 * 各コンポーネントの動作確認とセットアップ状況の診断
 */

/**
 * システムセットアップを検証
 * @param {Object} options - 検証オプション
 * @returns {Object} 検証結果
 */
function validateSystemSetup(options = {}) {
  try {
    console.log('=== システムセットアップ検証開始 ===');

    const validation = {
      timestamp: new Date().toISOString(),
      overall: 'UNKNOWN',
      score: 0,
      maxScore: 0,
      categories: {
        sheets: { score: 0, maxScore: 0, status: 'UNKNOWN', issues: [] },
        data: { score: 0, maxScore: 0, status: 'UNKNOWN', issues: [] },
        functions: { score: 0, maxScore: 0, status: 'UNKNOWN', issues: [] },
        integration: { score: 0, maxScore: 0, status: 'UNKNOWN', issues: [] },
      },
      recommendations: [],
      summary: '',
    };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return {
        success: false,
        error: 'アクティブなスプレッドシートが見つかりません',
        message: 'スプレッドシートを開いてから実行してください',
      };
    }

    // 1. シート構造検証
    console.log('シート構造検証中...');
    const sheetValidation = validateSheetStructure(ss, options);
    validation.categories.sheets = sheetValidation;
    validation.score += sheetValidation.score;
    validation.maxScore += sheetValidation.maxScore;

    // 2. データ整合性検証
    console.log('データ整合性検証中...');
    const dataValidation = validateDataIntegrity(ss, options);
    validation.categories.data = dataValidation;
    validation.score += dataValidation.score;
    validation.maxScore += dataValidation.maxScore;

    // 3. 機能動作検証
    console.log('機能動作検証中...');
    const functionValidation = validateFunctionality(ss, options);
    validation.categories.functions = functionValidation;
    validation.score += functionValidation.score;
    validation.maxScore += functionValidation.maxScore;

    // 4. 統合動作検証
    console.log('統合動作検証中...');
    const integrationValidation = validateIntegration(ss, options);
    validation.categories.integration = integrationValidation;
    validation.score += integrationValidation.score;
    validation.maxScore += integrationValidation.maxScore;

    // 総合評価算出
    const percentage =
      validation.maxScore > 0 ? Math.round((validation.score / validation.maxScore) * 100) : 0;

    if (percentage >= 90) {
      validation.overall = 'EXCELLENT';
    } else if (percentage >= 75) {
      validation.overall = 'GOOD';
    } else if (percentage >= 60) {
      validation.overall = 'ACCEPTABLE';
    } else if (percentage >= 40) {
      validation.overall = 'NEEDS_IMPROVEMENT';
    } else {
      validation.overall = 'FAILED';
    }

    // 推奨事項の生成
    validation.recommendations = generateValidationRecommendations(validation);

    // サマリーメッセージの生成
    validation.summary = generateValidationSummary(validation, percentage);

    console.log('=== システムセットアップ検証完了 ===');
    console.log(`総合評価: ${validation.overall} (${percentage}%)`);

    return {
      success: true,
      validation: validation,
      percentage: percentage,
      message: validation.summary,
    };
  } catch (error) {
    console.error('システムセットアップ検証エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `システムセットアップ検証に失敗しました: ${error.message}`,
    };
  }
}

/**
 * シート構造を検証
 */
function validateSheetStructure(ss, options) {
  const validation = {
    score: 0,
    maxScore: 0,
    status: 'UNKNOWN',
    issues: [],
    details: {},
  };

  try {
    const requiredSheets = [
      { name: CONFIG.SHEET_NAMES.PROPERTY_MASTER, required: true, score: 15 },
      { name: CONFIG.SHEET_NAMES.ROOM_MASTER, required: true, score: 15 },
      { name: CONFIG.SHEET_NAMES.INSPECTION_DATA, required: true, score: 20 },
    ];

    requiredSheets.forEach((sheetDef) => {
      validation.maxScore += sheetDef.score;
      const sheet = ss.getSheetByName(sheetDef.name);

      if (!sheet) {
        validation.issues.push({
          type: sheetDef.required ? 'error' : 'warning',
          message: `${sheetDef.name}シートが見つかりません`,
          category: 'sheet_missing',
        });
        return;
      }

      validation.score += sheetDef.score;

      // ヘッダー行の確認
      try {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        validation.details[sheetDef.name] = {
          rows: lastRow,
          columns: lastCol,
          hasData: lastRow > 1,
        };

        if (lastRow === 0) {
          validation.issues.push({
            type: 'warning',
            message: `${sheetDef.name}シートにデータがありません`,
            category: 'sheet_empty',
          });
          validation.score -= Math.floor(sheetDef.score * 0.3);
        }

        // 特定シートのヘッダー検証
        if (lastRow > 0) {
          const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          const validationResult = validateSheetHeaders(sheetDef.name, headers);

          if (!validationResult.valid) {
            validation.issues.push(...validationResult.issues);
            validation.score -= Math.floor(sheetDef.score * 0.2);
          }
        }
      } catch (sheetError) {
        validation.issues.push({
          type: 'error',
          message: `${sheetDef.name}シートの検証中にエラー: ${sheetError.message}`,
          category: 'sheet_error',
        });
        validation.score -= Math.floor(sheetDef.score * 0.5);
      }
    });

    // ステータス決定
    const percentage = validation.maxScore > 0 ? (validation.score / validation.maxScore) * 100 : 0;
    if (percentage >= 80) {
      validation.status = 'PASS';
    } else if (percentage >= 60) {
      validation.status = 'WARNING';
    } else {
      validation.status = 'FAIL';
    }
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `シート構造検証エラー: ${error.message}`,
      category: 'validation_error',
    });
    validation.status = 'ERROR';
  }

  return validation;
}

/**
 * シートヘッダーを検証
 */
function validateSheetHeaders(sheetName, headers) {
  const expectedHeaders = {
    物件マスタ: ['物件ID', '物件名', '住所', '検針完了日'],
    部屋マスタ: ['物件ID', '部屋ID', '部屋名', '部屋ステータス', '備考'],
    inspection_data: [
      '記録ID',
      '物件名',
      '物件ID',
      '部屋ID',
      '部屋名',
      '検針日時',
      '警告フラグ',
      '標準偏差値',
      '今回使用量',
      '今回の指示数',
      '前回指示数',
      '前々回指示数',
      '前々々回指示数',
      '検針不要',
    ],
    設定値: ['設定項目', '設定値', '説明'],
  };

  const expected = expectedHeaders[sheetName];
  if (!expected) {
    return { valid: true, issues: [] };
  }

  const issues = [];
  const missingHeaders = expected.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    issues.push({
      type: 'warning',
      message: `${sheetName}に必要な列が不足: ${missingHeaders.join(', ')}`,
      category: 'missing_headers',
    });
  }

  return {
    valid: missingHeaders.length === 0,
    issues: issues,
  };
}

/**
 * データ整合性を検証
 */
function validateDataIntegrity(ss, options) {
  const validation = {
    score: 0,
    maxScore: 100,
    status: 'UNKNOWN',
    issues: [],
    details: {},
  };

  try {
    // 物件マスタデータ検証
    const propertyValidation = validatePropertyMasterData(ss);
    validation.score += propertyValidation.score;
    validation.maxScore += propertyValidation.maxScore - 100; // 調整
    validation.issues.push(...propertyValidation.issues);
    validation.details.propertyMaster = propertyValidation.details;

    // 部屋マスタデータ検証
    const roomValidation = validateRoomMasterData(ss);
    validation.score += roomValidation.score;
    validation.issues.push(...roomValidation.issues);
    validation.details.roomMaster = roomValidation.details;

    // ID関連性検証
    const idValidation = validateIdRelationships(ss);
    validation.score += idValidation.score;
    validation.issues.push(...idValidation.issues);
    validation.details.idRelationships = idValidation.details;

    // ステータス決定
    const percentage = validation.maxScore > 0 ? (validation.score / validation.maxScore) * 100 : 0;
    if (percentage >= 80) {
      validation.status = 'PASS';
    } else if (percentage >= 60) {
      validation.status = 'WARNING';
    } else {
      validation.status = 'FAIL';
    }
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `データ整合性検証エラー: ${error.message}`,
      category: 'validation_error',
    });
    validation.status = 'ERROR';
  }

  return validation;
}

/**
 * 物件マスタデータを検証
 */
function validatePropertyMasterData(ss) {
  const validation = {
    score: 0,
    maxScore: 30,
    issues: [],
    details: {},
  };

  try {
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    if (!sheet) {
      validation.issues.push({
        type: 'error',
        message: '物件マスタシートが見つかりません',
        category: 'sheet_missing',
      });
      return validation;
    }

    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() <= 1) {
      validation.issues.push({
        type: 'warning',
        message: '物件マスタにデータがありません',
        category: 'no_data',
      });
      return validation;
    }

    const data = dataRange.getValues();
    const headers = data[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const propertyNameIndex = headers.indexOf('物件名');

    validation.details.totalProperties = data.length - 1;

    // 物件IDフォーマット確認
    if (propertyIdIndex !== -1) {
      let validIdCount = 0;
      const duplicateIds = new Set();
      const seenIds = new Set();

      for (let i = 1; i < data.length; i++) {
        const propertyId = String(data[i][propertyIdIndex]).trim();

        if (/^P\d{6}$/.test(propertyId)) {
          validIdCount++;
        } else if (propertyId) {
          validation.issues.push({
            type: 'warning',
            message: `物件ID「${propertyId}」がP000001形式ではありません（行${i + 1}）`,
            category: 'invalid_format',
          });
        }

        if (seenIds.has(propertyId)) {
          duplicateIds.add(propertyId);
        } else {
          seenIds.add(propertyId);
        }
      }

      if (duplicateIds.size > 0) {
        validation.issues.push({
          type: 'error',
          message: `重複する物件ID: ${Array.from(duplicateIds).join(', ')}`,
          category: 'duplicate_ids',
        });
      } else {
        validation.score += 15;
      }

      const formatPercentage = (validIdCount / (data.length - 1)) * 100;
      if (formatPercentage >= 80) {
        validation.score += 15;
      } else if (formatPercentage >= 60) {
        validation.score += 10;
      } else if (formatPercentage >= 40) {
        validation.score += 5;
      }

      validation.details.validIdPercentage = Math.round(formatPercentage);
    }

    // 物件名確認
    if (propertyNameIndex !== -1) {
      let namedPropertiesCount = 0;
      for (let i = 1; i < data.length; i++) {
        const propertyName = String(data[i][propertyNameIndex]).trim();
        if (propertyName) {
          namedPropertiesCount++;
        }
      }

      if (namedPropertiesCount === data.length - 1) {
        // すべての物件に名前がある
      } else {
        validation.issues.push({
          type: 'warning',
          message: `物件名が空の物件が${data.length - 1 - namedPropertiesCount}件あります`,
          category: 'missing_names',
        });
      }

      validation.details.namedProperties = namedPropertiesCount;
    }
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `物件マスタデータ検証エラー: ${error.message}`,
      category: 'validation_error',
    });
  }

  return validation;
}

/**
 * 部屋マスタデータを検証
 */
function validateRoomMasterData(ss) {
  const validation = {
    score: 0,
    maxScore: 30,
    issues: [],
    details: {},
  };

  try {
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
    if (!sheet) {
      validation.issues.push({
        type: 'error',
        message: '部屋マスタシートが見つかりません',
        category: 'sheet_missing',
      });
      return validation;
    }

    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() <= 1) {
      validation.issues.push({
        type: 'warning',
        message: '部屋マスタにデータがありません',
        category: 'no_data',
      });
      return validation;
    }

    const data = dataRange.getValues();
    const headers = data[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');
    const roomNameIndex = headers.indexOf('部屋名');

    validation.details.totalRooms = data.length - 1;

    // 部屋IDフォーマット確認
    if (roomIdIndex !== -1) {
      let validIdCount = 0;
      const duplicateRoomIds = new Set();
      const seenRoomIds = new Set();

      for (let i = 1; i < data.length; i++) {
        const roomId = String(data[i][roomIdIndex]).trim();
        const propertyId = String(data[i][propertyIdIndex]).trim();
        const compositeKey = `${propertyId}-${roomId}`;

        if (/^R\d{3}$/.test(roomId)) {
          validIdCount++;
        } else if (roomId) {
          validation.issues.push({
            type: 'warning',
            message: `部屋ID「${roomId}」がR001形式ではありません（行${i + 1}）`,
            category: 'invalid_format',
          });
        }

        if (seenRoomIds.has(compositeKey)) {
          duplicateRoomIds.add(compositeKey);
        } else {
          seenRoomIds.add(compositeKey);
        }
      }

      if (duplicateRoomIds.size > 0) {
        validation.issues.push({
          type: 'error',
          message: `重複する物件ID-部屋IDの組み合わせが${duplicateRoomIds.size}件あります`,
          category: 'duplicate_ids',
        });
      } else {
        validation.score += 15;
      }

      const formatPercentage = (validIdCount / (data.length - 1)) * 100;
      if (formatPercentage >= 80) {
        validation.score += 15;
      } else if (formatPercentage >= 60) {
        validation.score += 10;
      } else if (formatPercentage >= 40) {
        validation.score += 5;
      }

      validation.details.validIdPercentage = Math.round(formatPercentage);
    }

    // 物件別部屋数統計
    if (propertyIdIndex !== -1) {
      const roomsByProperty = {};
      for (let i = 1; i < data.length; i++) {
        const propertyId = String(data[i][propertyIdIndex]).trim();
        if (propertyId) {
          roomsByProperty[propertyId] = (roomsByProperty[propertyId] || 0) + 1;
        }
      }
      validation.details.roomsByProperty = roomsByProperty;
      validation.details.averageRoomsPerProperty = Math.round(
        Object.values(roomsByProperty).reduce((sum, count) => sum + count, 0) /
          Object.keys(roomsByProperty).length
      );
    }
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `部屋マスタデータ検証エラー: ${error.message}`,
      category: 'validation_error',
    });
  }

  return validation;
}

/**
 * ID関連性を検証
 */
function validateIdRelationships(ss) {
  const validation = {
    score: 0,
    maxScore: 40,
    issues: [],
    details: {},
  };

  try {
    // 物件マスタと部屋マスタの物件ID一致確認
    const propertyMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    const roomMasterSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
    const inspectionDataSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);

    if (!propertyMasterSheet || !roomMasterSheet) {
      validation.issues.push({
        type: 'error',
        message: '必要なシートが見つかりません（物件マスタまたは部屋マスタ）',
        category: 'sheet_missing',
      });
      return validation;
    }

    // 物件マスタの物件ID取得
    const propertyData = propertyMasterSheet.getDataRange().getValues();
    const propertyHeaders = propertyData[0];
    const propertyIdIndex = propertyHeaders.indexOf('物件ID');

    if (propertyIdIndex === -1) {
      validation.issues.push({
        type: 'error',
        message: '物件マスタに物件ID列が見つかりません',
        category: 'missing_column',
      });
      return validation;
    }

    const propertyIds = new Set();
    for (let i = 1; i < propertyData.length; i++) {
      const id = String(propertyData[i][propertyIdIndex]).trim();
      if (id) propertyIds.add(id);
    }

    // 部屋マスタの物件ID確認
    const roomData = roomMasterSheet.getDataRange().getValues();
    const roomHeaders = roomData[0];
    const roomPropertyIdIndex = roomHeaders.indexOf('物件ID');

    if (roomPropertyIdIndex === -1) {
      validation.issues.push({
        type: 'error',
        message: '部屋マスタに物件ID列が見つかりません',
        category: 'missing_column',
      });
      return validation;
    }

    const roomPropertyIds = new Set();
    let orphanedRoomsCount = 0;

    for (let i = 1; i < roomData.length; i++) {
      const id = String(roomData[i][roomPropertyIdIndex]).trim();
      if (id) {
        roomPropertyIds.add(id);
        if (!propertyIds.has(id)) {
          orphanedRoomsCount++;
        }
      }
    }

    if (orphanedRoomsCount === 0) {
      validation.score += 20;
    } else {
      validation.issues.push({
        type: 'warning',
        message: `物件マスタに存在しない物件IDの部屋が${orphanedRoomsCount}件あります`,
        category: 'orphaned_rooms',
      });
      if (orphanedRoomsCount < roomData.length * 0.1) {
        validation.score += 15;
      } else if (orphanedRoomsCount < roomData.length * 0.2) {
        validation.score += 10;
      }
    }

    // inspection_dataとの整合性確認
    if (inspectionDataSheet && inspectionDataSheet.getLastRow() > 1) {
      const inspectionData = inspectionDataSheet.getDataRange().getValues();
      const inspectionHeaders = inspectionData[0];
      const inspPropertyIdIndex = inspectionHeaders.indexOf('物件ID');
      const inspRoomIdIndex = inspectionHeaders.indexOf('部屋ID');

      if (inspPropertyIdIndex !== -1 && inspRoomIdIndex !== -1) {
        let matchingRecords = 0;
        let totalRecords = inspectionData.length - 1;

        // 部屋マスタから物件ID-部屋IDペアを作成
        const validRoomPairs = new Set();
        for (let i = 1; i < roomData.length; i++) {
          const propId = String(roomData[i][roomPropertyIdIndex]).trim();
          const roomId = String(roomData[i][roomHeaders.indexOf('部屋ID')]).trim();
          if (propId && roomId) {
            validRoomPairs.add(`${propId}-${roomId}`);
          }
        }

        for (let i = 1; i < inspectionData.length; i++) {
          const propId = String(inspectionData[i][inspPropertyIdIndex]).trim();
          const roomId = String(inspectionData[i][inspRoomIdIndex]).trim();
          const pair = `${propId}-${roomId}`;

          if (validRoomPairs.has(pair)) {
            matchingRecords++;
          }
        }

        const matchPercentage = (matchingRecords / totalRecords) * 100;
        if (matchPercentage >= 95) {
          validation.score += 20;
        } else if (matchPercentage >= 85) {
          validation.score += 15;
        } else if (matchPercentage >= 70) {
          validation.score += 10;
        } else {
          validation.issues.push({
            type: 'warning',
            message: `inspection_dataの${Math.round(100 - matchPercentage)}%がマスタデータと不一致です`,
            category: 'data_mismatch',
          });
        }

        validation.details.inspectionDataMatching = {
          totalRecords: totalRecords,
          matchingRecords: matchingRecords,
          percentage: Math.round(matchPercentage),
        };
      }
    } else {
      validation.score += 10; // inspection_dataがない場合は部分点
    }

    validation.details.propertyIdCount = propertyIds.size;
    validation.details.roomPropertyIdCount = roomPropertyIds.size;
    validation.details.orphanedRoomsCount = orphanedRoomsCount;
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `ID関連性検証エラー: ${error.message}`,
      category: 'validation_error',
    });
  }

  return validation;
}

/**
 * 機能動作を検証
 */
function validateFunctionality(ss, options) {
  const validation = {
    score: 0,
    maxScore: 45,
    status: 'UNKNOWN',
    issues: [],
    details: {},
  };

  try {
    // 基本機能の存在確認
    const basicFunctions = [
      'formatAllPropertyIds',
      'generateRoomIds',
      'createInitialInspectionData',
      'runSystemDiagnostics',
      'validateSystemSetup',
    ];

    let availableFunctions = 0;
    var functionMap = {
      formatAllPropertyIds:
        typeof formatAllPropertyIds === 'function' ? formatAllPropertyIds : null,
      generateRoomIds: typeof generateRoomIds === 'function' ? generateRoomIds : null,
      createInitialInspectionData:
        typeof createInitialInspectionData === 'function' ? createInitialInspectionData : null,
      runSystemDiagnostics:
        typeof runSystemDiagnostics === 'function' ? runSystemDiagnostics : null,
      validateSystemSetup: typeof validateSystemSetup === 'function' ? validateSystemSetup : null,
    };

    basicFunctions.forEach((funcName) => {
      try {
        var fn = functionMap[funcName];
        if (typeof fn === 'function' || (fn === null && typeof this[funcName] === 'function')) {
          availableFunctions++;
        }
      } catch (error) {
        validation.issues.push({
          type: 'warning',
          message: `関数${funcName}が利用できません`,
          category: 'missing_function',
        });
      }
    });

    validation.score += Math.floor((availableFunctions / basicFunctions.length) * 30);
    validation.details.availableFunctions = availableFunctions;
    validation.details.totalFunctions = basicFunctions.length;

    // メニュー機能の確認
    try {
      const ui = SpreadsheetApp.getUi();
      if (ui) {
        validation.score += 15;
        validation.details.uiAvailable = true;
      }
    } catch (error) {
      validation.issues.push({
        type: 'info',
        message: 'UI機能が制限されています（ライブラリ実行環境）',
        category: 'ui_limited',
      });
      validation.score += 10; // 部分点
      validation.details.uiAvailable = false;
    }

    // ステータス決定
    const percentage = (validation.score / validation.maxScore) * 100;
    if (percentage >= 80) {
      validation.status = 'PASS';
    } else if (percentage >= 60) {
      validation.status = 'WARNING';
    } else {
      validation.status = 'FAIL';
    }
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `機能動作検証エラー: ${error.message}`,
      category: 'validation_error',
    });
    validation.status = 'ERROR';
  }

  return validation;
}

/**
 * 統合動作を検証
 */
function validateIntegration(ss, options) {
  const validation = {
    score: 0,
    maxScore: 40,
    status: 'UNKNOWN',
    issues: [],
    details: {},
  };

  try {
    // スプレッドシート統合確認
    if (ss) {
      validation.score += 10;
      validation.details.spreadsheetIntegration = true;
    }

    // 権限確認
    try {
      const testSheet = ss.insertSheet('_validation_test');
      testSheet.getRange('A1').setValue('test');
      ss.deleteSheet(testSheet);
      validation.score += 15;
      validation.details.writePermissions = true;
    } catch (permError) {
      validation.issues.push({
        type: 'error',
        message: 'スプレッドシートの書き込み権限がありません',
        category: 'permission_error',
      });
      validation.details.writePermissions = false;
    }

    // PropertiesService確認
    try {
      const testKey = '_validation_test_' + Date.now();
      PropertiesService.getScriptProperties().setProperty(testKey, 'test');
      const testValue = PropertiesService.getScriptProperties().getProperty(testKey);
      PropertiesService.getScriptProperties().deleteProperty(testKey);

      if (testValue === 'test') {
        validation.score += 15;
        validation.details.propertiesService = true;
      }
    } catch (propError) {
      validation.issues.push({
        type: 'warning',
        message: 'PropertiesServiceが利用できません',
        category: 'service_unavailable',
      });
      validation.details.propertiesService = false;
    }

    // ステータス決定
    const percentage = (validation.score / validation.maxScore) * 100;
    if (percentage >= 80) {
      validation.status = 'PASS';
    } else if (percentage >= 60) {
      validation.status = 'WARNING';
    } else {
      validation.status = 'FAIL';
    }
  } catch (error) {
    validation.issues.push({
      type: 'error',
      message: `統合動作検証エラー: ${error.message}`,
      category: 'validation_error',
    });
    validation.status = 'ERROR';
  }

  return validation;
}

/**
 * 推奨事項を生成
 */
function generateValidationRecommendations(validation) {
  const recommendations = [];

  // エラーベースの推奨事項
  Object.values(validation.categories).forEach((category) => {
    category.issues.forEach((issue) => {
      switch (issue.category) {
        case 'sheet_missing':
          recommendations.push('マスタシートテンプレート作成機能でシートを作成してください');
          break;
        case 'invalid_format':
          recommendations.push('ID自動割り当て機能でフォーマットを統一してください');
          break;
        case 'duplicate_ids':
          recommendations.push('重複するIDを修正してください');
          break;
        case 'orphaned_rooms':
          recommendations.push('部屋マスタの物件IDを物件マスタと整合させてください');
          break;
        case 'missing_function':
          recommendations.push('必要な機能が不足しています。システムを再導入してください');
          break;
      }
    });
  });

  // スコアベースの推奨事項
  const overallPercentage =
    validation.maxScore > 0 ? (validation.score / validation.maxScore) * 100 : 0;

  if (overallPercentage < 60) {
    recommendations.push('システムの再導入を検討してください');
    recommendations.push('導入ウィザードを使用して段階的にセットアップしてください');
  } else if (overallPercentage < 80) {
    recommendations.push('一部の機能に問題があります。個別に修正してください');
  }

  // 重複を除去
  return [...new Set(recommendations)];
}

/**
 * 検証サマリーを生成
 */
function generateValidationSummary(validation, percentage) {
  let summary = `🔍 システムセットアップ検証結果\n\n`;

  // 総合評価
  const statusEmoji = {
    EXCELLENT: '🌟',
    GOOD: '✅',
    ACCEPTABLE: '⚠️',
    NEEDS_IMPROVEMENT: '❌',
    FAILED: '🚨',
  };

  summary += `📊 総合評価: ${statusEmoji[validation.overall] || '❓'} ${validation.overall}\n`;
  summary += `📈 スコア: ${validation.score}/${validation.maxScore} (${percentage}%)\n\n`;

  // カテゴリ別結果
  summary += `📋 カテゴリ別結果:\n`;
  Object.entries(validation.categories).forEach(([key, category]) => {
    const categoryName =
      {
        sheets: 'シート構造',
        data: 'データ整合性',
        functions: '機能動作',
        integration: '統合動作',
      }[key] || key;

    const statusIcon =
      {
        PASS: '✅',
        WARNING: '⚠️',
        FAIL: '❌',
        ERROR: '🚨',
      }[category.status] || '❓';

    const categoryPercentage =
      category.maxScore > 0 ? Math.round((category.score / category.maxScore) * 100) : 0;
    summary += `  ${statusIcon} ${categoryName}: ${categoryPercentage}%\n`;
  });

  // 主要な問題
  const errors = [];
  const warnings = [];
  Object.values(validation.categories).forEach((category) => {
    category.issues.forEach((issue) => {
      if (issue.type === 'error') {
        errors.push(issue.message);
      } else if (issue.type === 'warning') {
        warnings.push(issue.message);
      }
    });
  });

  if (errors.length > 0) {
    summary += `\n🚨 エラー (${errors.length}件):\n`;
    errors.slice(0, 3).forEach((error) => {
      summary += `  • ${error}\n`;
    });
    if (errors.length > 3) {
      summary += `  • その他${errors.length - 3}件のエラー\n`;
    }
  }

  if (warnings.length > 0) {
    summary += `\n⚠️ 警告 (${warnings.length}件):\n`;
    warnings.slice(0, 2).forEach((warning) => {
      summary += `  • ${warning}\n`;
    });
    if (warnings.length > 2) {
      summary += `  • その他${warnings.length - 2}件の警告\n`;
    }
  }

  // 推奨事項
  if (validation.recommendations.length > 0) {
    summary += `\n💡 推奨事項:\n`;
    validation.recommendations.slice(0, 3).forEach((rec) => {
      summary += `  • ${rec}\n`;
    });
  }

  // 次のステップ
  if (validation.overall === 'EXCELLENT' || validation.overall === 'GOOD') {
    summary += `\n🚀 次のステップ:\n`;
    summary += `  • 検針システムの運用を開始できます\n`;
    summary += `  • 「📋 物件一覧を表示」でデータを確認\n`;
    summary += `  • 「📊 検針データ入力」で検針作業開始\n`;
  } else {
    summary += `\n🔧 改善が必要:\n`;
    summary += `  • 上記の問題を修正してください\n`;
    summary += `  • 修正後に再度検証を実行してください\n`;
  }

  return summary;
}
