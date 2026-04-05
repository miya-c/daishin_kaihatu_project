/**
 * main.gs - 水道検針ライブラリ: メインエントリーポイント
 * 外部プロジェクトから利用可能なライブラリ関数
 * バージョン: v3.0.0-library
 */

/**
 * ライブラリのバージョン情報
 */
function getLibraryVersion() {
  return "v3.0.0-library";
}

/**
 * ライブラリ情報を返す
 * @returns {Object} ライブラリ情報
 */
function getLibraryInfo() {
  return {
    name: "水道検針ライブラリ",
    version: getLibraryVersion(),
    description: "水道メーター検針システム用のGoogleスプレッドシート操作ライブラリ",
    modules: [
      "api_data_functions - データアクセス機能",
      "data_indexes - データインデックス・検索機能", 
      "web_app_api - WebアプリAPI機能",
      "data_management - データ管理・生成機能",
      "data_validation - データ検証・整合性チェック機能",
      "data_formatting - データフォーマット・クリーンアップ機能",
      "utilities - ユーティリティ・ヘルパー機能",
      "system_diagnostics - システム診断機能",
      "spreadsheet_config - スプレッドシート設定管理"
    ],
    functions: [
      "getProperties",
      "getRooms", 
      "getMeterReadings",
      "updateMeterReadings",
      "completePropertyInspectionSimple",
      "calculateWarningFlag",
      "validateRoomId",
      "getSpreadsheetInfo",
      "fastSearch",
      "createAllIndexes",
      "testFastSearch",
      "populateInspectionDataFromMasters",
      "createInitialInspectionData",
      "startSystemSetupWizard",
      "processInspectionDataMonthlyImpl",
      "updateInspectionData",
      "searchInspectionData",
      "validateInspectionDataIntegrity",
      "formatPropertyIdsInPropertyMaster",
      "formatPropertyIdsInRoomMaster", 
      "formatPropertyIdsInInspectionData",
      "formatAllPropertyIds",
      "cleanupSheetData",
      "optimizedCleanupDuplicateInspectionData",
      "cleanUpOrphanedRooms",
      "menuCleanupDuplicateData",
      "testSearchFunctions",
      "showSearchUsageGuide",
      "showWaterMeterWebApp",
      "batchValidateMeterReadings",
      "runDataMaintenance",
      "runSystemDiagnostics",
      "showSystemDiagnostics",
      "collectErrorLogs",
      "getConfigSpreadsheetId",
      "checkConfigStatus",
      "generateRoomIds",
      "getAvailableFunctions",
      "checkFunction",
      "safeAlert",
      "formatDate",
      "parseDate",
      "safeNumber",
      "safeString",
      "deepCopy",
      "calculateSTDEV_S",
      "checkStandardDeviationIntegerFormat",
      "showPropertiesList",
      "showRoomsDialog", 
      "openMeterReadingInput",
      "runDataValidation",
      "runDataCleanup",
      "displayPreCheckResults",
      "showUsageGuide",
      "runSystemDiagnosticsFromMenu",
      "startSystemSetupWizardFromMenu",
      "createMasterSheetTemplatesFromMenu",
      "createSampleDataFromMenu",
      "formatAllPropertyIdsFromMenu",
      "generateRoomIdsFromMenu",
      "createInitialInspectionDataFromMenu",
      "validateSystemSetupFromMenu",
      "showSystemSetupGuide"
    ],
    lastUpdated: "2025-06-26"
  };
}

/**
 * ライブラリのヘルプを表示
 * @returns {string} ヘルプテキスト
 */
function getLibraryHelp() {
  const version = getLibraryVersion();
  return `
=== 水道検針ライブラリ v${version} ===

【利用可能な関数】

■ データ取得系
• getProperties() - 物件一覧を取得
• getRooms(propertyId) - 指定物件の部屋一覧を取得
• getMeterReadings(propertyId, roomId) - 検針データを取得

■ データ更新系
• updateMeterReadings(propertyId, roomId, readings) - 検針データを更新
• completePropertyInspectionSimple(propertyId, completionDate) - 物件検針完了
• calculateWarningFlag(current, previous, previous2, previous3) - 警告フラグ計算（標準偏差は整数値）

■ 検索・インデックス系
• fastSearch(type, key, indexes) - 高速検索
• createAllIndexes() - 全インデックスを作成
• testFastSearch() - 検索機能テスト

■ データ管理系
• formatPropertyIdsInPropertyMaster() - 物件マスタの物件IDフォーマット
• formatPropertyIdsInRoomMaster() - 部屋マスタの物件IDフォーマット
• formatPropertyIdsInInspectionData() - 検針データの物件IDフォーマット
• formatAllPropertyIds() - 全シートの物件IDフォーマット
• cleanupSheetData() - シートデータクリーンアップ
• populateInspectionDataFromMasters() - 新規部屋反映
• createInitialInspectionData() - 初期検針データ作成（標準偏差は整数値）
• processInspectionDataMonthlyImpl() - 月次データ処理・アーカイブ
• updateInspectionData() - 検針データ更新
• searchInspectionData() - 検針データ検索
• validateInspectionDataIntegrity() - データ整合性チェック
• generateRoomIds() - 部屋ID連番自動生成

■ システム管理系
• runSystemDiagnostics() - システム診断実行
• showSystemDiagnostics() - システム診断表示
• collectErrorLogs() - エラーログ収集
• checkConfigStatus() - 設定状態確認

■ ユーティリティ系
• validateRoomId(propertyId, roomId) - 部屋ID妥当性チェック
• getSpreadsheetInfo() - スプレッドシート情報取得
• safeAlert(title, message) - 安全なアラート表示
• formatDate(date, format) - 日付フォーマット
• parseDate(dateString) - 日付パース
• safeNumber(value, defaultValue) - 安全な数値変換
• safeString(value, defaultValue) - 安全な文字列変換
• deepCopy(obj) - オブジェクトの深いコピー
• calculateSTDEV_S(values) - 標準偏差計算（整数値）

■ メニュー・UI系
• showPropertiesList() - 物件一覧をダイアログで表示
• showRoomsDialog() - 部屋一覧をダイアログで表示（物件ID入力）
• openMeterReadingInput() - 検針データ入力インターフェース
• runDataValidation() - データ整合性チェック実行
• runDataCleanup() - データクリーンアップ実行
• displayPreCheckResults() - 月次処理事前チェック結果表示
• showUsageGuide() - 使用方法ガイド表示

■ デバッグ系
• getAvailableFunctions() - 利用可能な関数一覧取得
• checkFunction(functionName) - 関数存在チェック

【使用例】
// 物件一覧を取得
const properties = getProperties();

// 特定物件の部屋一覧を取得
const roomsData = getRooms('P000001');

// 検針データを取得
const readings = getMeterReadings('P000001', 'R001');

// 高速検索を使用
const indexes = createAllIndexes();
const property = fastSearch('property', 'P000001', indexes);

// メニュー機能を使用
const propertiesResult = showPropertiesList();
const roomsResult = showRoomsDialog();
const validationResult = runDataValidation();

【エラーハンドリング】
try {
  const result = getProperties();
  console.log(result);
} catch (error) {
  console.error('エラー:', error.message);
}

【ライブラリとしての使用】
// ライブラリを「cmlibrary」識別子で追加後
const properties = cmlibrary.getProperties();
const rooms = cmlibrary.getRooms('P001');
  `;
}

/**
 * デバッグ用: ライブラリで利用可能な関数一覧を取得
 * @returns {Array} 関数名の配列
 */
function getAvailableFunctions() {
  const allFunctions = [];
  
  // グローバルスコープの関数をスキャン
  for (const name in this) {
    if (typeof this[name] === 'function' && !name.startsWith('_')) {
      allFunctions.push(name);
    }
  }
  
  return allFunctions.sort();
}

/**
 * デバッグ用: 特定の関数が存在するかチェック
 * @param {string} functionName - チェックする関数名
 * @returns {Object} チェック結果
 */
function checkFunction(functionName) {
  return {
    name: functionName,
    exists: typeof this[functionName] === 'function',
    type: typeof this[functionName]
  };
}

/**
 * デバッグ用: 標準偏差の数式が整数化されているかチェック
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} チェック結果
 */
function checkStandardDeviationIntegerFormat(ss = null) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }
  
  const inspectionDataSheet = ss.getSheetByName('inspection_data');
  if (!inspectionDataSheet) {
    return { success: false, error: 'inspection_dataシートが見つかりません' };
  }
  
  try {
    const headers = inspectionDataSheet.getRange(1, 1, 1, inspectionDataSheet.getLastColumn()).getValues()[0];
    const stdDevIndex = headers.indexOf('標準偏差値');
    
    if (stdDevIndex === -1) {
      return { success: false, error: '標準偏差値列が見つかりません' };
    }
    
    const lastRow = inspectionDataSheet.getLastRow();
    let integerFormatCount = 0;
    let roundFunctionCount = 0;
    
    for (let row = 2; row <= lastRow; row++) {
      const formula = inspectionDataSheet.getRange(row, stdDevIndex + 1).getFormula();
      const numberFormat = inspectionDataSheet.getRange(row, stdDevIndex + 1).getNumberFormat();
      
      if (formula && formula.includes('ROUND(STDEV.S')) {
        roundFunctionCount++;
      }
      
      if (numberFormat === '0') {
        integerFormatCount++;
      }
    }
    
    return {
      success: true,
      totalRows: lastRow - 1,
      roundFunctionCount: roundFunctionCount,
      integerFormatCount: integerFormatCount,
      message: `標準偏差列チェック完了: ROUND関数使用${roundFunctionCount}件, 整数フォーマット${integerFormatCount}件`
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * システム導入ウィザードを開始（メニューから呼び出し）
 * @returns {Object} 実行結果
 */
function startSystemSetupWizardFromMenu() {
  try {
    // Google Apps Scriptライブラリの制限により、
    // main.gsから他ファイルの関数を直接呼び出すため、
    // 水道検針アプリ.gsの実装をここで簡易実行
    console.log('=== main.gs: システム導入ウィザード開始 ===');
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      'システム導入ウィザード',
      '検針システム導入ウィザードを開始します。\n\n' +
      '本ウィザードでは以下を実行します：\n' +
      '1. システム診断・環境確認\n' +
      '2. マスタシートテンプレート作成\n' +
      '3. サンプルデータ投入（オプション）\n' +
      '4. 物件ID自動割り当て\n' +
      '5. 部屋ID自動生成\n' +
      '6. 検針データシート作成\n' +
      '7. 最終確認・動作テスト\n\n' +
      '開始しますか？',
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      return {
        success: false,
        message: 'ユーザーによりウィザードがキャンセルされました',
        cancelled: true
      };
    }

    // 各ステップを順次実行
    const results = {
      success: true,
      completedSteps: [],
      errors: [],
      warnings: []
    };

    // ステップ1: システム診断
    try {
      console.log('ステップ1: システム診断実行');
      const diagnostics = runSystemDiagnostics();
      results.completedSteps.push(1);
      ui.alert('ステップ1完了', 'システム診断が完了しました', ui.ButtonSet.OK);
    } catch (error) {
      results.errors.push({step: 1, error: error.message});
      console.error('ステップ1エラー:', error.message);
    }

    // ステップ2: マスタシートテンプレート作成
    try {
      console.log('ステップ2: マスタシートテンプレート作成');
      const templates = createMasterSheetTemplates();
      results.completedSteps.push(2);
      ui.alert('ステップ2完了', 'マスタシートテンプレートを作成しました', ui.ButtonSet.OK);
    } catch (error) {
      results.errors.push({step: 2, error: error.message});
      console.error('ステップ2エラー:', error.message);
    }

    // ステップ3: 物件ID自動割り当て
    try {
      console.log('ステップ3: 物件ID自動割り当て');
      const propertyIds = formatAllPropertyIds();
      results.completedSteps.push(3);
      ui.alert('ステップ3完了', '物件IDを自動割り当てしました', ui.ButtonSet.OK);
    } catch (error) {
      results.errors.push({step: 3, error: error.message});
      console.error('ステップ3エラー:', error.message);
    }

    // ステップ4: 部屋ID自動生成
    try {
      console.log('ステップ4: 部屋ID自動生成');
      const roomIds = generateRoomIds();
      results.completedSteps.push(4);
      ui.alert('ステップ4完了', '部屋IDを自動生成しました', ui.ButtonSet.OK);
    } catch (error) {
      results.errors.push({step: 4, error: error.message});
      console.error('ステップ4エラー:', error.message);
    }

    // ステップ5: 検針データシート作成
    try {
      console.log('ステップ5: 検針データシート作成');
      const inspectionData = createInitialInspectionData();
      results.completedSteps.push(5);
      ui.alert('ステップ5完了', '検針データシートを作成しました', ui.ButtonSet.OK);
    } catch (error) {
      results.errors.push({step: 5, error: error.message});
      console.error('ステップ5エラー:', error.message);
    }

    // 完了メッセージ
    const completedCount = results.completedSteps.length;
    const errorCount = results.errors.length;
    
    ui.alert(
      'システム導入ウィザード完了',
      `導入ウィザードが完了しました。\n\n` +
      `完了ステップ: ${completedCount}/5\n` +
      `エラー: ${errorCount}件\n\n` +
      `次のステップ:\n` +
      `1. メニューから「📋 物件一覧を表示」で確認\n` +
      `2. 「📊 検針データ入力」で実際の検針を開始`,
      ui.ButtonSet.OK
    );

    return {
      success: completedCount > 0,
      message: `システム導入ウィザードが完了しました。完了: ${completedCount}/5`,
      completedSteps: results.completedSteps,
      errors: results.errors
    };

  } catch (error) {
    console.error('startSystemSetupWizardFromMenu エラー:', error.message);
    return {
      success: false,
      error: error.message,
      message: `システム導入ウィザードの実行中にエラーが発生しました: ${error.message}`
    };
  }
}


/**
 * システム診断実行（メニューから呼び出し）
 */
function runSystemDiagnosticsFromMenu() {
  try {
    return runSystemDiagnostics();
  } catch (error) {
    console.error('runSystemDiagnosticsFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * マスタシートテンプレート作成（メニューから呼び出し）
 */
function createMasterSheetTemplatesFromMenu() {
  try {
    return createMasterSheetTemplates();
  } catch (error) {
    console.error('createMasterSheetTemplatesFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * サンプルデータ投入（メニューから呼び出し）
 */
function createSampleDataFromMenu() {
  try {
    return createSampleData();
  } catch (error) {
    console.error('createSampleDataFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 物件ID自動割り当て（メニューから呼び出し）
 */
function formatAllPropertyIdsFromMenu() {
  try {
    return formatAllPropertyIds();
  } catch (error) {
    console.error('formatAllPropertyIdsFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 部屋ID自動生成（メニューから呼び出し）
 */
function generateRoomIdsFromMenu() {
  try {
    return generateRoomIds();
  } catch (error) {
    console.error('generateRoomIdsFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 検針データシート作成（メニューから呼び出し）
 */
function createInitialInspectionDataFromMenu() {
  try {
    return createInitialInspectionData();
  } catch (error) {
    console.error('createInitialInspectionDataFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 導入完了確認（メニューから呼び出し）
 */
function validateSystemSetupFromMenu() {
  try {
    return validateSystemSetup();
  } catch (error) {
    console.error('validateSystemSetupFromMenu ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 導入ガイド表示（メニューから呼び出し）
 */
function showSystemSetupGuide() {
  try {
    const ui = SpreadsheetApp.getUi();
    let message = '📖 検針システム導入ガイド\n\n';
    
    message += '🚀 システム導入の流れ:\n';
    message += '1. システム診断でスプレッドシート状態を確認\n';
    message += '2. マスタシートテンプレートを作成\n';
    message += '3. サンプルデータを投入（オプション）\n';
    message += '4. 物件IDを自動割り当て\n';
    message += '5. 部屋IDを自動生成\n';
    message += '6. 検針データシートを作成\n';
    message += '7. 導入完了確認でセットアップ状況をチェック\n\n';
    
    message += '💡 推奨:\n';
    message += '• 「導入ウィザード開始」で全工程を自動実行\n';
    message += '• 個別実行する場合は上記順序で実行\n';
    message += '• エラーが発生した場合は導入ガイドを参照\n\n';
    
    message += 'ℹ️ 詳細は「使用方法ガイド」メニューをご確認ください。';
    
    ui.alert('システム導入ガイド', message, ui.ButtonSet.OK);
    
    return { success: true, message: '導入ガイドを表示しました' };
  } catch (error) {
    console.error('showSystemSetupGuide ラッパーエラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * システム診断を実行
 * @param {Object} options - 診断オプション
 * @returns {Object} 診断結果
 */
function runSystemDiagnostics(options = {}) {
  try {
    console.log('[runSystemDiagnostics] システム診断開始');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      sheets: [],
      functions: [],
      performance: {},
      issues: []
    };
    
    // シート存在確認
    const requiredSheets = options.requiredSheets || ['物件マスタ', '部屋マスタ', 'inspection_data'];
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!spreadsheet) {
      diagnostics.issues.push({
        type: 'error',
        message: 'アクティブなスプレッドシートが見つかりません'
      });
      return diagnostics;
    }
    
    // シート診断
    requiredSheets.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      const sheetInfo = {
        name: sheetName,
        exists: !!sheet,
        rows: 0,
        columns: 0,
        lastUpdate: null
      };
      
      if (sheet) {
        try {
          sheetInfo.rows = sheet.getLastRow();
          sheetInfo.columns = sheet.getLastColumn();
          
          // 最終更新日の推定（データがある場合）
          if (sheetInfo.rows > 1) {
            sheetInfo.hasData = true;
          }
        } catch (error) {
          sheetInfo.error = error.message;
          diagnostics.issues.push({
            type: 'warning',
            sheet: sheetName,
            message: `シート読み取りエラー: ${error.message}`
          });
        }
      } else {
        diagnostics.issues.push({
          type: 'error',
          sheet: sheetName,
          message: `必須シート「${sheetName}」が見つかりません`
        });
      }
      
      diagnostics.sheets.push(sheetInfo);
    });
    
    // 関数存在確認
    const coreFunctions = [
      'getProperties',
      'getRooms',
      'getMeterReadings',
      'updateMeterReadings',
      'validateInspectionDataIntegrity',
      'createAllIndexes'
    ];
    
    coreFunctions.forEach(funcName => {
      const funcInfo = {
        name: funcName,
        exists: false,
        callable: false
      };
      
      try {
        if (typeof eval(funcName) === 'function') {
          funcInfo.exists = true;
          funcInfo.callable = true;
        }
      } catch (error) {
        funcInfo.error = error.message;
      }
      
      diagnostics.functions.push(funcInfo);
      
      if (!funcInfo.callable) {
        diagnostics.issues.push({
          type: 'error',
          function: funcName,
          message: `コア関数「${funcName}」が利用できません`
        });
      }
    });
    
    // パフォーマンステスト（簡易版）
    try {
      const startTime = Date.now();
      
      // 物件数カウント
      if (spreadsheet.getSheetByName('物件マスタ')) {
        const propertyCount = getProperties().length;
        diagnostics.performance.propertyCount = propertyCount;
      }
      
      const endTime = Date.now();
      diagnostics.performance.responseTime = endTime - startTime;
      diagnostics.performance.status = diagnostics.performance.responseTime < 3000 ? 'good' : 'slow';
      
    } catch (error) {
      diagnostics.performance.error = error.message;
      diagnostics.issues.push({
        type: 'warning',
        message: `パフォーマンステスト失敗: ${error.message}`
      });
    }
    
    // 総合評価
    const errorCount = diagnostics.issues.filter(issue => issue.type === 'error').length;
    const warningCount = diagnostics.issues.filter(issue => issue.type === 'warning').length;
    
    if (errorCount === 0 && warningCount === 0) {
      diagnostics.status = 'healthy';
    } else if (errorCount === 0) {
      diagnostics.status = 'warning';
    } else {
      diagnostics.status = 'error';
    }
    
    diagnostics.summary = {
      status: diagnostics.status,
      sheetsOk: diagnostics.sheets.filter(s => s.exists).length,
      sheetsTotal: diagnostics.sheets.length,
      functionsOk: diagnostics.functions.filter(f => f.callable).length,
      functionsTotal: diagnostics.functions.length,
      errorCount: errorCount,
      warningCount: warningCount
    };
    
    console.log('[runSystemDiagnostics] 診断完了:', diagnostics.summary);
    return diagnostics;
    
  } catch (error) {
    console.error('[runSystemDiagnostics] エラー:', error);
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
      issues: [{
        type: 'error',
        message: `システム診断実行エラー: ${error.message}`
      }]
    };
  }
}

/**
 * マスタシートテンプレートを作成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} options - 作成オプション
 * @returns {Object} 作成結果
 */
function createMasterSheetTemplates(ss = null, options = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    return { 
      success: false, 
      error: 'アクティブなスプレッドシートが見つかりません' 
    };
  }

  try {
    console.log('=== マスタシートテンプレート作成開始 ===');
    
    const results = {
      propertyMaster: null,
      roomMaster: null,
      configSheet: null,
      created: [],
      updated: [],
      skipped: []
    };

    // 物件マスタテンプレート作成
    const propertyMasterResult = createPropertyMasterTemplate(ss, options);
    results.propertyMaster = propertyMasterResult;
    
    if (propertyMasterResult.created) {
      results.created.push('物件マスタ');
    } else if (propertyMasterResult.updated) {
      results.updated.push('物件マスタ');
    } else if (propertyMasterResult.skipped) {
      results.skipped.push('物件マスタ');
    }

    // 部屋マスタテンプレート作成
    const roomMasterResult = createRoomMasterTemplate(ss, options);
    results.roomMaster = roomMasterResult;
    
    if (roomMasterResult.created) {
      results.created.push('部屋マスタ');
    } else if (roomMasterResult.updated) {
      results.updated.push('部屋マスタ');
    } else if (roomMasterResult.skipped) {
      results.skipped.push('部屋マスタ');
    }

    // 設定値シートテンプレート作成
    const configResult = createConfigSheetTemplate(ss, options);
    results.configSheet = configResult;
    
    if (configResult.created) {
      results.created.push('設定値');
    } else if (configResult.updated) {
      results.updated.push('設定値');
    } else if (configResult.skipped) {
      results.skipped.push('設定値');
    }

    // 結果サマリー作成
    let message = 'マスタシートテンプレート作成が完了しました。\n\n';
    
    if (results.created.length > 0) {
      message += `✅ 新規作成: ${results.created.join(', ')}\n`;
    }
    
    if (results.updated.length > 0) {
      message += `🔄 更新: ${results.updated.join(', ')}\n`;
    }
    
    if (results.skipped.length > 0) {
      message += `⏭️ スキップ: ${results.skipped.join(', ')}\n`;
    }

    console.log('=== マスタシートテンプレート作成完了 ===');
    
    return {
      success: true,
      message: message,
      results: results
    };
    
  } catch (error) {
    console.error('マスタシートテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `マスタシートテンプレート作成に失敗しました: ${error.message}`
    };
  }
}

/**
 * 物件マスタテンプレートを作成
 */
function createPropertyMasterTemplate(ss, options = {}) {
  try {
    const sheetName = '物件マスタ';
    let sheet = ss.getSheetByName(sheetName);
    let created = false;
    let updated = false;
    
    if (!sheet) {
      // 新規作成
      sheet = ss.insertSheet(sheetName);
      created = true;
      console.log(`${sheetName}シートを新規作成しました`);
    } else if (options.overwrite || sheet.getLastRow() <= 1) {
      // 既存シートの更新（データがない場合または上書き指定）
      sheet.clear();
      updated = true;
      console.log(`${sheetName}シートを更新しました`);
    } else {
      // 既存データがある場合はスキップ
      return {
        success: true,
        skipped: true,
        message: `${sheetName}は既存データがあるためスキップしました`
      };
    }

    // ヘッダー行を設定
    const headers = [
      '物件ID',      // A列: P000001形式
      '物件名',      // B列: マンション名など
      '検針完了日'   // C列: 月次処理で使用
    ];

    // ヘッダーを設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // ヘッダーのスタイル設定
    headerRange.setFontWeight('bold')
               .setBackground('#e1f5fe')
               .setHorizontalAlignment('center')
               .setBorder(true, true, true, true, true, true);

    // 列幅の自動調整
    headers.forEach((header, index) => {
      sheet.autoResizeColumn(index + 1);
      
      // 最小幅設定
      const currentWidth = sheet.getColumnWidth(index + 1);
      if (currentWidth < 100) {
        sheet.setColumnWidth(index + 1, 100);
      }
    });

    // サンプル行を追加（オプション）
    if (options.includeSample) {
      const sampleData = [
        ['P000001', 'サンプル物件A', ''],
        ['P000002', 'サンプル物件B', ''],
        ['P000003', 'サンプル物件C', '']
      ];
      
      const sampleRange = sheet.getRange(2, 1, sampleData.length, headers.length);
      sampleRange.setValues(sampleData);
      
      // サンプルデータのスタイル設定
      sampleRange.setFontColor('#666666')
                 .setFontStyle('italic');
    }

    return {
      success: true,
      created: created,
      updated: updated,
      sheet: sheet,
      message: `${sheetName}テンプレートを${created ? '作成' : '更新'}しました`
    };
    
  } catch (error) {
    console.error('物件マスタテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 部屋マスタテンプレートを作成
 */
function createRoomMasterTemplate(ss, options = {}) {
  try {
    const sheetName = '部屋マスタ';
    let sheet = ss.getSheetByName(sheetName);
    let created = false;
    let updated = false;
    
    if (!sheet) {
      // 新規作成
      sheet = ss.insertSheet(sheetName);
      created = true;
      console.log(`${sheetName}シートを新規作成しました`);
    } else if (options.overwrite || sheet.getLastRow() <= 1) {
      // 既存シートの更新
      sheet.clear();
      updated = true;
      console.log(`${sheetName}シートを更新しました`);
    } else {
      // 既存データがある場合はスキップ
      return {
        success: true,
        skipped: true,
        message: `${sheetName}は既存データがあるためスキップしました`
      };
    }

    // ヘッダー行を設定
    const headers = [
      '物件ID',      // A列: 物件マスタと連携
      '部屋ID',      // B列: R001形式
      '部屋名'       // C列: 部屋番号など
    ];

    // ヘッダーを設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // ヘッダーのスタイル設定
    headerRange.setFontWeight('bold')
               .setBackground('#fff3e0')
               .setHorizontalAlignment('center')
               .setBorder(true, true, true, true, true, true);

    // 列幅の自動調整
    headers.forEach((header, index) => {
      sheet.autoResizeColumn(index + 1);
      
      // 最小幅設定
      const currentWidth = sheet.getColumnWidth(index + 1);
      if (currentWidth < 100) {
        sheet.setColumnWidth(index + 1, 100);
      }
    });

    // サンプル行を追加（オプション）
    if (options.includeSample) {
      const sampleData = [
        ['P000001', 'R001', '101号室'],
        ['P000001', 'R002', '102号室'],
        ['P000001', 'R003', '201号室'],
        ['P000002', 'R001', 'A棟101'],
        ['P000002', 'R002', 'A棟102']
      ];
      
      const sampleRange = sheet.getRange(2, 1, sampleData.length, headers.length);
      sampleRange.setValues(sampleData);
      
      // サンプルデータのスタイル設定
      sampleRange.setFontColor('#666666')
                 .setFontStyle('italic');
    }

    return {
      success: true,
      created: created,
      updated: updated,
      sheet: sheet,
      message: `${sheetName}テンプレートを${created ? '作成' : '更新'}しました`
    };
    
  } catch (error) {
    console.error('部屋マスタテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 設定値シートテンプレートを作成
 */
function createConfigSheetTemplate(ss, options = {}) {
  try {
    const sheetName = '設定値';
    let sheet = ss.getSheetByName(sheetName);
    let created = false;
    let updated = false;
    
    if (!sheet) {
      // 新規作成
      sheet = ss.insertSheet(sheetName);
      created = true;
      console.log(`${sheetName}シートを新規作成しました`);
    } else if (options.overwrite || sheet.getLastRow() <= 1) {
      // 既存シートの更新
      sheet.clear();
      updated = true;
      console.log(`${sheetName}シートを更新しました`);
    } else {
      // 既存データがある場合はスキップ
      return {
        success: true,
        skipped: true,
        message: `${sheetName}は既存データがあるためスキップしました`
      };
    }

    // ヘッダー行を設定
    const headers = ['設定項目', '設定値', '説明'];

    // ヘッダーを設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    
    // ヘッダーのスタイル設定
    headerRange.setFontWeight('bold')
               .setBackground('#f3e5f5')
               .setHorizontalAlignment('center')
               .setBorder(true, true, true, true, true, true);

    // 設定データを作成
    const configData = [
      ['システム名', '水道検針管理システム', 'システムの名称'],
      ['バージョン', 'v3.0.0-library', 'システムバージョン'],
      ['導入日', new Date().toLocaleDateString('ja-JP'), 'システム導入日'],
      ['月次処理日', '', '月次処理実行日（自動設定）'],
      ['バックアップ推奨', 'TRUE', 'バックアップ推奨表示'],
      ['自動ID生成', 'TRUE', 'ID自動生成機能'],
      ['検針完了通知', 'FALSE', '検針完了時の通知機能'],
      ['データ保持期間', '36', 'アーカイブデータ保持期間（月）'],
      ['警告フラグ閾値', '30', '使用量警告の閾値（％）'],
      ['パフォーマンス監視', 'TRUE', 'パフォーマンス監視機能']
    ];

    // データを設定
    const dataRange = sheet.getRange(2, 1, configData.length, 3);
    dataRange.setValues(configData);

    // 列幅の調整
    sheet.setColumnWidth(1, 200); // 設定項目
    sheet.setColumnWidth(2, 150); // 設定値
    sheet.setColumnWidth(3, 300); // 説明

    // スタイル設定
    dataRange.setBorder(true, true, true, true, true, true);
    
    // 設定値列の背景色
    const valueRange = sheet.getRange(2, 2, configData.length, 1);
    valueRange.setBackground('#f8f9fa');

    // 説明の追加
    const noteRange = sheet.getRange(configData.length + 4, 1, 5, 3);
    const notes = [
      ['', '', ''],
      ['注意事項', '', ''],
      ['• このシートはシステム設定を管理します', '', ''],
      ['• 設定値を変更する場合は慎重に行ってください', '', ''],
      ['• バックアップを取ってから変更することを推奨します', '', '']
    ];
    noteRange.setValues(notes);
    
    // 注意事項のスタイル
    const noteTitleRange = sheet.getRange(configData.length + 5, 1, 1, 1);
    noteTitleRange.setFontWeight('bold')
                  .setBackground('#fff3e0');

    return {
      success: true,
      created: created,
      updated: updated,
      sheet: sheet,
      message: `${sheetName}テンプレートを${created ? '作成' : '更新'}しました`
    };
    
  } catch (error) {
    console.error('設定値シートテンプレート作成エラー:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * サンプルデータを作成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} options - 作成オプション
 * @returns {Object} 作成結果
 */
function createSampleData(ss = null, options = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    return { 
      success: false, 
      error: 'アクティブなスプレッドシートが見つかりません' 
    };
  }

  try {
    console.log('=== サンプルデータ作成開始 ===');
    
    const results = {
      propertyData: null,
      roomData: null,
      created: 0,
      message: ''
    };

    // 物件マスタサンプルデータ
    const propertyMasterSheet = ss.getSheetByName('物件マスタ');
    if (propertyMasterSheet && propertyMasterSheet.getLastRow() <= 1) {
      const propertyData = [
        ['P000001', 'グリーンハイツA棟', '東京都渋谷区桜丘町1-1-1', ''],
        ['P000002', 'グリーンハイツB棟', '東京都渋谷区桜丘町1-1-2', ''],
        ['P000003', 'サンシャインマンション', '東京都新宿区歌舞伎町1-2-3', ''],
        ['P000004', 'リバーサイドコート', '東京都港区青山2-3-4', ''],
        ['P000005', 'パークビュー南青山', '東京都港区南青山3-4-5', '']
      ];
      
      const propertyRange = propertyMasterSheet.getRange(2, 1, propertyData.length, 4);
      propertyRange.setValues(propertyData);
      results.propertyData = propertyData.length;
      results.created += propertyData.length;
    }

    // 部屋マスタサンプルデータ
    const roomMasterSheet = ss.getSheetByName('部屋マスタ');
    if (roomMasterSheet && roomMasterSheet.getLastRow() <= 1) {
      const roomData = [
        // グリーンハイツA棟
        ['P000001', 'グリーンハイツA棟', 'R001', '101号室', 'FALSE'],
        ['P000001', 'グリーンハイツA棟', 'R002', '102号室', 'FALSE'],
        ['P000001', 'グリーンハイツA棟', 'R003', '201号室', 'FALSE'],
        ['P000001', 'グリーンハイツA棟', 'R004', '202号室', 'FALSE'],
        
        // グリーンハイツB棟
        ['P000002', 'グリーンハイツB棟', 'R001', '101号室', 'FALSE'],
        ['P000002', 'グリーンハイツB棟', 'R002', '102号室', 'TRUE'],
        ['P000002', 'グリーンハイツB棟', 'R003', '201号室', 'FALSE'],
        
        // サンシャインマンション
        ['P000003', 'サンシャインマンション', 'R001', 'A-101', 'FALSE'],
        ['P000003', 'サンシャインマンション', 'R002', 'A-102', 'FALSE'],
        ['P000003', 'サンシャインマンション', 'R003', 'B-101', 'FALSE'],
        ['P000003', 'サンシャインマンション', 'R004', 'B-102', 'FALSE'],
        
        // リバーサイドコート
        ['P000004', 'リバーサイドコート', 'R001', '1階テナント', 'TRUE'],
        ['P000004', 'リバーサイドコート', 'R002', '301号室', 'FALSE'],
        
        // パークビュー南青山
        ['P000005', 'パークビュー南青山', 'R001', 'ペントハウス', 'FALSE']
      ];
      
      const roomRange = roomMasterSheet.getRange(2, 1, roomData.length, 5);
      roomRange.setValues(roomData);
      results.roomData = roomData.length;
      results.created += roomData.length;
    }

    if (results.created > 0) {
      results.message = `サンプルデータを作成しました。\n物件: ${results.propertyData || 0}件\n部屋: ${results.roomData || 0}件`;
    } else {
      results.message = 'サンプルデータは既存データがあるためスキップされました';
    }

    console.log('=== サンプルデータ作成完了 ===');
    
    return {
      success: true,
      message: results.message,
      results: results
    };
    
  } catch (error) {
    console.error('サンプルデータ作成エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `サンプルデータ作成に失敗しました: ${error.message}`
    };
  }
}

/**
 * 全シートの物件IDフォーマットを一括変更
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function formatAllPropertyIds(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    console.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  try {
    console.log('🔄 全シートの物件IDフォーマット変更を開始します...');
    
    const results = {
      propertyMaster: formatPropertyIdsInPropertyMaster(ss, config),
      roomMaster: formatPropertyIdsInRoomMaster(ss, config),
      inspectionData: formatPropertyIdsInInspectionData(ss, config)
    };

    const totalUpdated = 
      (results.propertyMaster.updatedCount || 0) +
      (results.roomMaster.updatedCount || 0) +
      (results.inspectionData.updatedCount || 0);

    const allSuccess = results.propertyMaster.success && 
                      results.roomMaster.success && 
                      results.inspectionData.success;

    if (allSuccess) {
      console.log(`✅ 全シートの物件IDフォーマット変更完了: 合計${totalUpdated}件`);
      const message = `全シートの物件IDフォーマット変更が完了しました。\n` +
                     `物件マスタ: ${results.propertyMaster.updatedCount || 0}件\n` +
                     `部屋マスタ: ${results.roomMaster.updatedCount || 0}件\n` +
                     `inspection_data: ${results.inspectionData.updatedCount || 0}件\n` +
                     `合計: ${totalUpdated}件`;
      
      return {
        success: true,
        totalUpdated: totalUpdated,
        results: results,
        message: message
      };
    } else {
      const errors = [];
      if (!results.propertyMaster.success) errors.push(`物件マスタ: ${results.propertyMaster.error}`);
      if (!results.roomMaster.success) errors.push(`部屋マスタ: ${results.roomMaster.error}`);
      if (!results.inspectionData.success) errors.push(`inspection_data: ${results.inspectionData.error}`);
      
      const errorMessage = `一部のシートでエラーが発生しました:\n${errors.join('\n')}`;
      console.log(`❌ ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        results: results
      };
    }

  } catch (error) {
    console.log(`❌ 全シート物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 物件マスタの物件IDフォーマット変更
 */
function formatPropertyIdsInPropertyMaster(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    console.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }
  
  const sheetName = config.propertyMasterSheetName || '物件マスタ';
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    return { success: true, updatedCount: 0, message: info };
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentId = String(values[i][0]).trim();
      
      if (currentId && !currentId.startsWith('P')) {
        const formattedId = `P${currentId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        console.log(`行 ${i + 1}: ${currentId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      console.log(`物件マスタのフォーマット変更完了: ${updatedCount}件`);
      const message = `物件マスタのIDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`;
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = '更新が必要な物件IDはありませんでした。';
      return { success: true, updatedCount: 0, message: info };
    }

  } catch (error) {
    console.log(`❌ 物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    return { success: false, error: errorMessage };
  }
}

/**
 * 部屋マスタの物件IDフォーマット変更
 */
function formatPropertyIdsInRoomMaster(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    console.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sheetName = config.roomMasterSheetName || '部屋マスタ';
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    return { success: true, updatedCount: 0, message: info };
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentPropertyId = String(values[i][0]).trim();
      
      if (currentPropertyId && !currentPropertyId.startsWith('P')) {
        const formattedId = `P${currentPropertyId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        console.log(`行 ${i + 1}: ${currentPropertyId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      console.log(`部屋マスタの物件IDフォーマット変更完了: ${updatedCount}件`);
      const message = `部屋マスタの物件IDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`;
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = '更新が必要な物件IDはありませんでした。';
      return { success: true, updatedCount: 0, message: info };
    }

  } catch (error) {
    console.log(`❌ 部屋マスタ物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    return { success: false, error: errorMessage };
  }
}

/**
 * inspection_dataの物件IDフォーマット変更
 */
function formatPropertyIdsInInspectionData(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    console.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }

  const sheetName = config.inspectionDataSheetName || 'inspection_data';
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  let updatedCount = 0;

  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    return { success: true, updatedCount: 0, message: info };
  }

  try {
    for (let i = 1; i < values.length; i++) {
      const currentPropertyId = String(values[i][0]).trim();
      
      if (currentPropertyId && !currentPropertyId.startsWith('P')) {
        const formattedId = `P${currentPropertyId.padStart(6, '0')}`;
        values[i][0] = formattedId;
        updatedCount++;
        console.log(`行 ${i + 1}: ${currentPropertyId} → ${formattedId}`);
      }
    }

    if (updatedCount > 0) {
      dataRange.setValues(values);
      console.log(`inspection_dataの物件IDフォーマット変更完了: ${updatedCount}件`);
      const message = `inspection_dataの物件IDフォーマット変更が完了しました。\n更新件数: ${updatedCount}件`;
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = '更新が必要な物件IDはありませんでした。';
      return { success: true, updatedCount: 0, message: info };
    }

  } catch (error) {
    console.log(`❌ inspection_data物件IDフォーマット変更中にエラーが発生しました: ${error.message}`);
    const errorMessage = `処理中にエラーが発生しました: ${error.message}`;
    return { success: false, error: errorMessage };
  }
}

/**
 * 物件ごとにR001, R002, R003...の形式で部屋IDを自動生成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @param {Object} config - 設定オブジェクト
 * @returns {Object} 処理結果
 */
function generateRoomIds(ss = null, config = {}) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    console.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }
  
  const sheetName = config.roomMasterSheetName || '部屋マスタ';
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const error = `${sheetName}シートが見つかりません。`;
    return { success: false, error: error };
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    const info = `${sheetName}シートにデータがありません。`;
    return { success: true, updatedCount: 0, message: info };
  }

  // ヘッダー行の確認
  const headers = values[0];
  const propertyIdIndex = headers.indexOf('物件ID');
  const roomIdIndex = headers.indexOf('部屋ID');
  
  if (propertyIdIndex === -1) {
    const error = `${sheetName}シートに「物件ID」列が見つかりません。`;
    return { success: false, error: error };
  }
  
  if (roomIdIndex === -1) {
    const error = `${sheetName}シートに「部屋ID」列が見つかりません。`;
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
          console.log(`物件 ${propertyId} - 行 ${rowIndex + 1}: 部屋ID を "${newRoomId}" に設定`);
        }
      });
    });

    if (updatedCount > 0) {
      dataRange.setValues(values);
      console.log(`部屋ID自動生成完了: ${updatedCount}件`);
      const message = `部屋IDの自動生成が完了しました。\n更新件数: ${updatedCount}件\n\n物件別にR001, R002, R003...の形式で部屋IDを割り当てました。`;
      return { success: true, updatedCount: updatedCount, message: message };
    } else {
      const info = 'すべての部屋IDが既に正しい形式で設定されています。';
      return { success: true, updatedCount: 0, message: info };
    }
    
  } catch (error) {
    console.log(`❌ 部屋ID自動生成中にエラーが発生: ${error.message}`);
    const errorMessage = `部屋ID自動生成中にエラーが発生しました: ${error.message}`;
    return { success: false, error: errorMessage };
  }
}

/**
 * 初期検針データを作成
 * @param {Spreadsheet} ss - 対象スプレッドシート
 * @returns {Object} 処理結果
 */
function createInitialInspectionData(ss = null) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    console.log('エラー: アクティブなスプレッドシートが見つかりません');
    return { success: false, error: 'スプレッドシートが見つかりません' };
  }
  
  const propertyMasterSheet = ss.getSheetByName('物件マスタ');
  const roomMasterSheet = ss.getSheetByName('部屋マスタ');
  let inspectionDataSheet = ss.getSheetByName('inspection_data');

  if (!propertyMasterSheet) {
    const error = '物件マスタシートが見つかりません。';
    return { success: false, error: error };
  }
  if (!roomMasterSheet) {
    const error = '部屋マスタシートが見つかりません。';
    return { success: false, error: error };
  }

  try {
    // inspection_dataシートが存在しない場合は作成
    if (!inspectionDataSheet) {
      inspectionDataSheet = ss.insertSheet('inspection_data');
      const headers = [
        '記録ID', '物件名', '物件ID', '部屋ID', '部屋名',
        '検針日時', '警告フラグ', '標準偏差値', '今回使用量',
        '今回の指示数', '前回指示数', '前々回指示数', '前々々回指示数',
        '検針不要', '請求不要'
      ];
      inspectionDataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダーのフォーマット設定
      const headerRange = inspectionDataSheet.getRange(1, 1, 1, headers.length);
      headerRange.setHorizontalAlignment('center')
                 .setFontWeight('bold')
                 .setBackground('#f0f0f0');
      
      // シート全体にヒラギノ丸ゴ Proフォントを設定
      const wholeSheetRange = inspectionDataSheet.getRange(1, 1, 1000, headers.length);
      wholeSheetRange.setFontFamily("ヒラギノ丸ゴ Pro");
      
      inspectionDataSheet.setFrozenRows(1);
      headerRange.createFilter();
    }

    // 物件マスタから物件情報を取得
    const propertyData = propertyMasterSheet.getDataRange().getValues().slice(1);
    const propertyMap = {};
    propertyData.forEach(row => {
      const propertyId = String(row[0]).trim();
      const propertyName = String(row[1]).trim();
      if (propertyId && propertyName) {
        propertyMap[propertyId] = propertyName;
      }
    });

    // 部屋マスタからデータを取得してinspection_dataに追加（3列のみ取得）
    const roomData = roomMasterSheet.getRange(2, 1, roomMasterSheet.getLastRow() - 1, 3).getValues();
    const newRows = [];

    roomData.forEach((row, index) => {
      const propertyId = String(row[0]).trim();
      const roomId = String(row[1]).trim(); // 部屋マスタの部屋IDは2列目
      const roomName = String(row[2]).trim(); // 部屋マスタの部屋名は3列目

      if (propertyId && roomId) {
        const propertyName = propertyMap[propertyId] || '';
        const rowNumber = inspectionDataSheet.getLastRow() + newRows.length + 1;
        
        // STDEV.S関数の数式を作成（標準偏差値列用、ROUND関数で整数に丸める）
        const stdDevFormula = `=IF(AND(K${rowNumber}<>"",L${rowNumber}<>"",M${rowNumber}<>""),ROUND(STDEV.S(K${rowNumber}:M${rowNumber}),0),"")`;
        
        // 今回使用量の計算式 = 今回指示数 - 前回指示数
        const usageFormula = `=IF(AND(J${rowNumber}<>"",K${rowNumber}<>""),J${rowNumber}-K${rowNumber},"")`;
        
        newRows.push([
          Utilities.getUuid(),  // 記録ID
          propertyName,         // 物件名
          propertyId,          // 物件ID
          roomId,              // 部屋ID
          roomName,            // 部屋名
          '',                  // 検針日時
          '',                  // 警告フラグ
          stdDevFormula,       // 標準偏差値（STDEV.S関数、整数）
          usageFormula,        // 今回使用量（計算式）
          '',                  // 今回の指示数
          '',                  // 前回指示数
          '',                  // 前々回指示数
          '',                  // 前々々回指示数
          '',                  // 検針不要
          ''                   // 請求不要
        ]);
      }
    });

    if (newRows.length > 0) {
      const nextRow = inspectionDataSheet.getLastRow() + 1;
      const targetRange = inspectionDataSheet.getRange(nextRow, 1, newRows.length, 15);
      targetRange.setValues(newRows);
    }

    console.log(`初期検針データ作成完了: ${newRows.length}件`);
    const message = `初期検針データの作成が完了しました。\n作成件数: ${newRows.length}件\n\n設定済み機能:\n• シート固定行設定\n• ヘッダーフィルタ\n• 標準偏差値自動計算（整数）\n• 今回使用量自動計算`;
    
    return { success: true, createdCount: newRows.length, message: message };

  } catch (error) {
    console.log(`❌ 初期検針データ作成中にエラーが発生: ${error.message}`);
    const errorMessage = `初期検針データ作成中にエラーが発生しました: ${error.message}`;
    return { success: false, error: errorMessage };
  }
}

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
      maxScore: 100,
      categories: {
        sheets: { score: 0, maxScore: 40, status: 'UNKNOWN', issues: [] },
        data: { score: 0, maxScore: 30, status: 'UNKNOWN', issues: [] },
        functions: { score: 0, maxScore: 30, status: 'UNKNOWN', issues: [] }
      },
      recommendations: [],
      summary: ''
    };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return {
        success: false,
        error: 'アクティブなスプレッドシートが見つかりません',
        message: 'スプレッドシートを開いてから実行してください'
      };
    }

    // 1. シート構造検証
    console.log('シート構造検証中...');
    const requiredSheets = ['物件マスタ', '部屋マスタ', 'inspection_data'];
    let sheetScore = 0;
    
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        validation.categories.sheets.issues.push({
          type: 'error',
          message: `${sheetName}シートが見つかりません`
        });
      } else {
        sheetScore += 13;
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) {
          validation.categories.sheets.issues.push({
            type: 'warning',
            message: `${sheetName}シートにデータがありません`
          });
          sheetScore -= 3;
        }
      }
    });
    
    // 設定値シート（オプション）
    const configSheet = ss.getSheetByName('設定値');
    if (configSheet) {
      sheetScore += 5;
    }
    
    validation.categories.sheets.score = Math.min(sheetScore, 40);
    validation.categories.sheets.status = validation.categories.sheets.score >= 30 ? 'PASS' : 
                                          validation.categories.sheets.score >= 20 ? 'WARNING' : 'FAIL';

    // 2. データ整合性検証
    console.log('データ整合性検証中...');
    let dataScore = 0;
    
    const propertyMasterSheet = ss.getSheetByName('物件マスタ');
    const roomMasterSheet = ss.getSheetByName('部屋マスタ');
    
    if (propertyMasterSheet && propertyMasterSheet.getLastRow() > 1) {
      dataScore += 10;
      // 物件IDフォーマット簡易確認
      try {
        const propertyData = propertyMasterSheet.getDataRange().getValues();
        let validIds = 0;
        for (let i = 1; i < propertyData.length; i++) {
          const propertyId = String(propertyData[i][0]).trim();
          if (/^P\d{6}$/.test(propertyId)) {
            validIds++;
          }
        }
        if (validIds / (propertyData.length - 1) >= 0.8) {
          dataScore += 5;
        }
      } catch (error) {
        validation.categories.data.issues.push({
          type: 'warning',
          message: '物件マスタデータの検証中にエラーが発生しました'
        });
      }
    }
    
    if (roomMasterSheet && roomMasterSheet.getLastRow() > 1) {
      dataScore += 10;
      // 部屋IDフォーマット簡易確認
      try {
        const roomData = roomMasterSheet.getDataRange().getValues();
        const headers = roomData[0];
        const roomIdIndex = headers.indexOf('部屋ID');
        if (roomIdIndex !== -1) {
          let validIds = 0;
          for (let i = 1; i < roomData.length; i++) {
            const roomId = String(roomData[i][roomIdIndex]).trim();
            if (/^R\d{3}$/.test(roomId)) {
              validIds++;
            }
          }
          if (validIds / (roomData.length - 1) >= 0.8) {
            dataScore += 5;
          }
        }
      } catch (error) {
        validation.categories.data.issues.push({
          type: 'warning',
          message: '部屋マスタデータの検証中にエラーが発生しました'
        });
      }
    }
    
    validation.categories.data.score = Math.min(dataScore, 30);
    validation.categories.data.status = validation.categories.data.score >= 24 ? 'PASS' : 
                                        validation.categories.data.score >= 18 ? 'WARNING' : 'FAIL';

    // 3. 機能動作検証
    console.log('機能動作検証中...');
    const basicFunctions = [
      'formatAllPropertyIds',
      'generateRoomIds', 
      'createInitialInspectionData',
      'runSystemDiagnostics'
    ];

    let availableFunctions = 0;
    basicFunctions.forEach(funcName => {
      try {
        if (typeof eval(funcName) === 'function') {
          availableFunctions++;
        }
      } catch (error) {
        validation.categories.functions.issues.push({
          type: 'warning',
          message: `関数${funcName}が利用できません`
        });
      }
    });

    validation.categories.functions.score = Math.floor((availableFunctions / basicFunctions.length) * 30);
    validation.categories.functions.status = validation.categories.functions.score >= 24 ? 'PASS' : 
                                             validation.categories.functions.score >= 18 ? 'WARNING' : 'FAIL';

    // 総合評価算出
    validation.score = validation.categories.sheets.score + 
                       validation.categories.data.score + 
                       validation.categories.functions.score;
    
    const percentage = Math.round((validation.score / validation.maxScore) * 100);
    
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
    if (validation.overall === 'FAILED' || validation.overall === 'NEEDS_IMPROVEMENT') {
      validation.recommendations.push('システムの再導入を検討してください');
      validation.recommendations.push('導入ウィザードを使用して段階的にセットアップしてください');
    } else if (validation.overall === 'ACCEPTABLE') {
      validation.recommendations.push('一部の機能に問題があります。個別に修正してください');
    }

    // サマリーメッセージの生成
    const statusEmoji = {
      'EXCELLENT': '🌟',
      'GOOD': '✅',
      'ACCEPTABLE': '⚠️',
      'NEEDS_IMPROVEMENT': '❌',
      'FAILED': '🚨'
    };

    validation.summary = `🔍 システムセットアップ検証結果\n\n` +
                        `📊 総合評価: ${statusEmoji[validation.overall]} ${validation.overall}\n` +
                        `📈 スコア: ${validation.score}/${validation.maxScore} (${percentage}%)\n\n` +
                        `📋 カテゴリ別結果:\n` +
                        `  • シート構造: ${Math.round((validation.categories.sheets.score / 40) * 100)}%\n` +
                        `  • データ整合性: ${Math.round((validation.categories.data.score / 30) * 100)}%\n` +
                        `  • 機能動作: ${Math.round((validation.categories.functions.score / 30) * 100)}%\n`;

    // エラー・警告の追加
    const totalIssues = Object.values(validation.categories).reduce((total, cat) => total + cat.issues.length, 0);
    if (totalIssues > 0) {
      validation.summary += `\n⚠️ 検出された問題: ${totalIssues}件`;
    }

    // 次のステップ
    if (validation.overall === 'EXCELLENT' || validation.overall === 'GOOD') {
      validation.summary += `\n\n🚀 次のステップ:\n  • 検針システムの運用を開始できます`;
    } else {
      validation.summary += `\n\n🔧 改善が必要:\n  • 上記の問題を修正してください`;
    }

    console.log('=== システムセットアップ検証完了 ===');
    console.log(`総合評価: ${validation.overall} (${percentage}%)`);

    return {
      success: true,
      validation: validation,
      percentage: percentage,
      message: validation.summary
    };

  } catch (error) {
    console.error('システムセットアップ検証エラー:', error);
    return {
      success: false,
      error: error.message,
      message: `システムセットアップ検証に失敗しました: ${error.message}`
    };
  }
}

