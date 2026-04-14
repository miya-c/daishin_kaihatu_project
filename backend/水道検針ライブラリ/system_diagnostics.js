/**
 * system_diagnostics.gs - システム診断機能
 * ライブラリの健全性とパフォーマンスを診断
 * Version: 1.0.0 - Library Edition
 */

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
      issues: [],
    };

    // シート存在確認
    const requiredSheets = options.requiredSheets || [
      '物件マスタ',
      '部屋マスタ',
      'inspection_data',
    ];
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!spreadsheet) {
      diagnostics.issues.push({
        type: 'error',
        message: 'アクティブなスプレッドシートが見つかりません',
      });
      return diagnostics;
    }

    // シート診断
    requiredSheets.forEach((sheetName) => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      const sheetInfo = {
        name: sheetName,
        exists: !!sheet,
        rows: 0,
        columns: 0,
        lastUpdate: null,
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
            message: `シート読み取りエラー: ${error.message}`,
          });
        }
      } else {
        diagnostics.issues.push({
          type: 'error',
          sheet: sheetName,
          message: `必須シート「${sheetName}」が見つかりません`,
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
      'createAllIndexes',
    ];

    var functionMap = {
      getProperties: typeof getProperties === 'function' ? getProperties : null,
      getRooms: typeof getRooms === 'function' ? getRooms : null,
      getMeterReadings: typeof getMeterReadings === 'function' ? getMeterReadings : null,
      updateMeterReadings: typeof updateMeterReadings === 'function' ? updateMeterReadings : null,
      validateInspectionDataIntegrity:
        typeof validateInspectionDataIntegrity === 'function'
          ? validateInspectionDataIntegrity
          : null,
      createAllIndexes: typeof createAllIndexes === 'function' ? createAllIndexes : null,
    };

    coreFunctions.forEach((funcName) => {
      const funcInfo = {
        name: funcName,
        exists: false,
        callable: false,
      };

      try {
        var fn = functionMap[funcName];
        if (fn !== null) {
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
          message: `コア関数「${funcName}」が利用できません`,
        });
      }
    });

    // パフォーマンステスト（簡易版）
    try {
      const startTime = Date.now();

      // 物件数カウント
      if (spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER)) {
        const propResult = getProperties();
        const propertyCount = propResult.success ? propResult.data.length : 0;
        diagnostics.performance.propertyCount = propertyCount;
      }

      const endTime = Date.now();
      diagnostics.performance.responseTime = endTime - startTime;
      diagnostics.performance.status =
        diagnostics.performance.responseTime < 3000 ? 'good' : 'slow';
    } catch (error) {
      diagnostics.performance.error = error.message;
      diagnostics.issues.push({
        type: 'warning',
        message: `パフォーマンステスト失敗: ${error.message}`,
      });
    }

    // 総合評価
    const errorCount = diagnostics.issues.filter((issue) => issue.type === 'error').length;
    const warningCount = diagnostics.issues.filter((issue) => issue.type === 'warning').length;

    if (errorCount === 0 && warningCount === 0) {
      diagnostics.status = 'healthy';
    } else if (errorCount === 0) {
      diagnostics.status = 'warning';
    } else {
      diagnostics.status = 'error';
    }

    diagnostics.summary = {
      status: diagnostics.status,
      sheetsOk: diagnostics.sheets.filter((s) => s.exists).length,
      sheetsTotal: diagnostics.sheets.length,
      functionsOk: diagnostics.functions.filter((f) => f.callable).length,
      functionsTotal: diagnostics.functions.length,
      errorCount: errorCount,
      warningCount: warningCount,
    };

    console.log('[runSystemDiagnostics] 診断完了:', diagnostics.summary);
    return diagnostics;
  } catch (error) {
    console.error('[runSystemDiagnostics] エラー:', error);
    return {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
      issues: [
        {
          type: 'error',
          message: `システム診断実行エラー: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * システム診断結果を表示（UI版）
 * @param {Object} diagnostics - 診断結果（省略時は自動実行）
 * @returns {Object} 表示結果
 */
function showSystemDiagnostics(diagnostics = null) {
  try {
    if (!diagnostics) {
      diagnostics = runSystemDiagnostics();
    }

    const ui = SpreadsheetApp.getUi();
    if (!ui) {
      console.log('=== システム診断結果 ===');
      console.log(JSON.stringify(diagnostics, null, 2));
      return { success: true, action: 'logged' };
    }

    let message = `🔍 システム診断結果\n\n`;
    message += `状態: ${getDiagnosticStatusIcon(diagnostics.status)} ${diagnostics.status.toUpperCase()}\n\n`;

    if (diagnostics.summary) {
      message += `📊 サマリー:\n`;
      message += `シート: ${diagnostics.summary.sheetsOk}/${diagnostics.summary.sheetsTotal} 正常\n`;
      message += `関数: ${diagnostics.summary.functionsOk}/${diagnostics.summary.functionsTotal} 利用可能\n`;

      if (diagnostics.performance.responseTime) {
        message += `応答時間: ${diagnostics.performance.responseTime}ms\n`;
      }

      message += `\n`;
    }

    // 問題がある場合は詳細表示
    if (diagnostics.issues && diagnostics.issues.length > 0) {
      const errors = diagnostics.issues.filter((issue) => issue.type === 'error');
      const warnings = diagnostics.issues.filter((issue) => issue.type === 'warning');

      if (errors.length > 0) {
        message += `❌ エラー (${errors.length}件):\n`;
        errors.slice(0, 3).forEach((error) => {
          message += `• ${error.message}\n`;
        });
        if (errors.length > 3) {
          message += `• ...他 ${errors.length - 3} 件\n`;
        }
        message += `\n`;
      }

      if (warnings.length > 0) {
        message += `⚠️ 警告 (${warnings.length}件):\n`;
        warnings.slice(0, 2).forEach((warning) => {
          message += `• ${warning.message}\n`;
        });
        if (warnings.length > 2) {
          message += `• ...他 ${warnings.length - 2} 件\n`;
        }
      }
    }

    message += `\n診断実行時刻: ${new Date(diagnostics.timestamp).toLocaleString()}`;

    ui.alert('システム診断', message, ui.ButtonSet.OK);

    return { success: true, action: 'dialog_shown', diagnostics: diagnostics };
  } catch (error) {
    console.error('[showSystemDiagnostics] 表示エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * エラーログを収集
 * @param {Object} options - 収集オプション
 * @returns {Object} エラーログ情報
 */
function collectErrorLogs(options = {}) {
  try {
    const logs = {
      timestamp: new Date().toISOString(),
      console: [],
      execution: [],
      validation: [],
      summary: {},
    };

    // 基本的なエラーチェック実行
    try {
      const diagnostics = runSystemDiagnostics();
      if (diagnostics.issues) {
        logs.validation = diagnostics.issues;
      }
    } catch (error) {
      logs.execution.push({
        function: 'runSystemDiagnostics',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // 関数実行テスト
    var testFunctions = ['getProperties', 'getSpreadsheetInfo'];
    var testFunctionMap = {
      getProperties: typeof getProperties === 'function' ? getProperties : null,
      getSpreadsheetInfo: typeof getSpreadsheetInfo === 'function' ? getSpreadsheetInfo : null,
    };

    testFunctions.forEach((funcName) => {
      try {
        var fn = testFunctionMap[funcName];
        if (fn) {
          fn();
        }
      } catch (error) {
        logs.execution.push({
          function: funcName,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // サマリー作成
    logs.summary = {
      totalErrors: logs.execution.length + logs.validation.filter((v) => v.type === 'error').length,
      executionErrors: logs.execution.length,
      validationErrors: logs.validation.filter((v) => v.type === 'error').length,
      warnings: logs.validation.filter((v) => v.type === 'warning').length,
    };

    console.log('[collectErrorLogs] ログ収集完了:', logs.summary);
    return logs;
  } catch (error) {
    console.error('[collectErrorLogs] エラー:', error);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      summary: { totalErrors: 1, collectError: true },
    };
  }
}

/**
 * 統合作業サマリーを表示
 * @returns {Object} サマリー情報
 */
function showIntegrationSummary() {
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      library: {
        name: 'merter-library-test',
        version: '1.0.0',
        modules: [],
      },
      diagnostics: runSystemDiagnostics(),
      recommendations: [],
    };

    // モジュール情報収集
    const moduleFiles = [
      'api_data_functions.gs',
      'data_management.gs',
      'data_validation.gs',
      'data_cleanup.gs',
      'batch_processing.gs',
      'dialog_functions.gs',
      'web_app_api.gs',
      'utilities.gs',
    ];

    moduleFiles.forEach((moduleName) => {
      summary.library.modules.push({
        name: moduleName,
        status: 'active',
      });
    });

    // 推奨事項生成
    if (summary.diagnostics.issues) {
      const errors = summary.diagnostics.issues.filter((issue) => issue.type === 'error');
      const warnings = summary.diagnostics.issues.filter((issue) => issue.type === 'warning');

      if (errors.length > 0) {
        summary.recommendations.push('エラーの解決を優先してください');
      }

      if (warnings.length > 0) {
        summary.recommendations.push('警告の確認をお勧めします');
      }
    }

    if (summary.diagnostics.performance && summary.diagnostics.performance.status === 'slow') {
      summary.recommendations.push('パフォーマンスの改善を検討してください');
    }

    if (summary.recommendations.length === 0) {
      summary.recommendations.push('システムは正常に動作しています');
    }

    // UI表示
    const ui = SpreadsheetApp.getUi();
    if (ui) {
      let message = `📋 統合作業サマリー\n\n`;
      message += `ライブラリ: ${summary.library.name} v${summary.library.version}\n`;
      message += `モジュール数: ${summary.library.modules.length}\n`;
      message += `システム状態: ${getDiagnosticStatusIcon(summary.diagnostics.status)} ${summary.diagnostics.status.toUpperCase()}\n\n`;

      message += `🎯 推奨事項:\n`;
      summary.recommendations.forEach((rec) => {
        message += `• ${rec}\n`;
      });

      ui.alert('統合作業サマリー', message, ui.ButtonSet.OK);
    }

    console.log('[showIntegrationSummary] サマリー表示完了');
    return summary;
  } catch (error) {
    console.error('[showIntegrationSummary] エラー:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ステータスアイコンを取得
 * @param {string} status - ステータス
 * @returns {string} アイコン
 */
function getDiagnosticStatusIcon(status) {
  switch (status) {
    case 'healthy':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return '❓';
  }
}
