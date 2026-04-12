/**
 * Mock dispatcher for admin actions
 *
 * Provides window.__mockDispatcher(action, params) that routes
 * admin actions to mock data responses.
 */

(function () {
  var VALID_TOKEN = 'test-token';

  function errorResult(message, code) {
    return { success: false, error: message, code: code || 'UNKNOWN_ERROR' };
  }

  function successResult(data) {
    return { success: true, data: data };
  }

  function validateToken(params) {
    if (!params || params.adminToken !== VALID_TOKEN) {
      return errorResult('管理者トークンが無効です', 'INVALID_TOKEN');
    }
    return null;
  }

  function getMockData() {
    return window.__mockData;
  }

  function sumPropertyField(fieldName) {
    var data = getMockData();
    var total = 0;
    for (var i = 0; i < data.properties.length; i++) {
      total += data.properties[i][fieldName];
    }
    return total;
  }

  function buildDashboardData() {
    var data = getMockData();
    var totalRooms = sumPropertyField('roomCount');
    var totalCompleted = sumPropertyField('completedCount');
    var completionRate = totalRooms > 0 ? Math.round((totalCompleted / totalRooms) * 100) : 0;

    return {
      propertyCount: data.properties.length,
      totalRooms: totalRooms,
      completedRooms: totalCompleted,
      pendingRooms: totalRooms - totalCompleted,
      completionRate: completionRate,
      spreadsheetInfo: data.spreadsheetInfo,
      systemStatus: data.diagnostics.status,
      lastDiagnosticTime: data.diagnostics.timestamp,
    };
  }

  function getRoomsByProperty(params) {
    var data = getMockData();
    var propertyId = params.propertyId;

    if (!propertyId) {
      return errorResult('物件IDが指定されていません', 'MISSING_PROPERTY_ID');
    }

    var rooms = data.rooms[propertyId];
    if (!rooms) {
      return errorResult('物件が見つかりません: ' + propertyId, 'PROPERTY_NOT_FOUND');
    }

    return successResult(rooms);
  }

  function formatTimestamp() {
    return new Date().toISOString();
  }

  function buildProcessResult(processName) {
    return {
      process: processName,
      executedAt: formatTimestamp(),
      duration: Math.floor(Math.random() * 2000) + 500 + 'ms',
    };
  }

  var actionHandlers = {
    verifyToken: function () {
      return successResult({
        valid: true,
        message: 'トークンが確認されました。',
        verifiedAt: formatTimestamp(),
      });
    },

    getSpreadsheetInfo: function () {
      return successResult(getMockData().spreadsheetInfo);
    },

    getProperties: function () {
      return successResult(getMockData().properties);
    },

    getRooms: function (params) {
      return getRoomsByProperty(params);
    },

    getAdminDashboardData: function () {
      return successResult(buildDashboardData());
    },

    preCheckMonthlyProcess: function () {
      return successResult(getMockData().monthlyPreCheck);
    },

    executeMonthlyProcess: function () {
      var result = buildProcessResult('月次処理');
      result.summary = {
        processedRooms: 5,
        skippedRooms: 3,
        errors: 0,
        message: '月次処理が完了しました。5件処理、3件スキップ。',
      };
      return successResult(result);
    },

    getMonthlyProcessStatus: function () {
      return successResult({
        isRunning: false,
        lastRun: '2026-04-12T09:30:00.000Z',
        status: '完了',
        progress: 100,
        message: '前回の月次処理は正常に完了しました。',
      });
    },

    validateSystemSetup: function () {
      return successResult(getMockData().systemValidation);
    },

    validateInspectionDataIntegrity: function () {
      return successResult({
        isValid: false,
        totalChecked: 8,
        validCount: 6,
        invalidCount: 2,
        issues: [
          {
            propertyId: 'P001',
            roomId: 'P001-201',
            type: '欠落',
            message: 'サンライズマンション201号室の検針データが欠落しています。',
          },
          {
            propertyId: 'P002',
            roomId: 'P002-101',
            type: '異常値',
            message: 'グリーンハイツ101号室に異常な使用量が検出されました。',
          },
        ],
        checkedAt: formatTimestamp(),
      });
    },

    cleanupDuplicateData: function () {
      var result = buildProcessResult('重複データクリーンアップ');
      result.summary = {
        duplicatesFound: 2,
        duplicatesRemoved: 2,
        message: '2件の重複データを削除しました。',
      };
      return successResult(result);
    },

    generateRoomIds: function () {
      var result = buildProcessResult('部屋ID生成');
      result.summary = {
        generated: 0,
        skipped: 8,
        message: 'すべての部屋にIDが既に割り当てられています。',
      };
      return successResult(result);
    },

    formatAllPropertyIds: function () {
      var result = buildProcessResult('物件IDフォーマット');
      result.summary = {
        formatted: 3,
        message: '3件の物件IDをフォーマットしました。',
      };
      return successResult(result);
    },

    cleanUpOrphanedRooms: function () {
      var result = buildProcessResult('孤立部屋クリーンアップ');
      result.summary = {
        orphanedFound: 0,
        orphanedRemoved: 0,
        message: '孤立した部屋データは見つかりませんでした。',
      };
      return successResult(result);
    },

    runSystemDiagnostics: function () {
      var diag = getMockData().diagnostics;
      diag.timestamp = formatTimestamp();
      diag.overall = diag.status || 'WARNING';
      return successResult(diag);
    },

    createMasterSheetTemplates: function () {
      var result = buildProcessResult('マスタテンプレート作成');
      result.summary = {
        created: ['物件マスタ', '部屋マスタ'],
        updated: [],
        skipped: ['設定'],
        message: '2つのシートを作成しました。',
      };
      return successResult(result);
    },

    populateInspectionDataFromMasters: function () {
      return successResult({
        message: '検針データにマスタデータを反映しました。',
      });
    },

    createInitialInspectionData: function () {
      var result = buildProcessResult('検針データ作成');
      result.summary = {
        createdCount: 8,
        message: '8件の検針データを作成しました。',
      };
      return successResult(result);
    },
  };

  /**
   * Main dispatcher function.
   * @param {string} action - Action name to dispatch.
   * @param {Object} params - Parameters including adminToken.
   * @returns {Object} Result with success boolean and data/error.
   */
  window.__mockDispatcher = function (action, params) {
    params = params || {};

    // Token gate
    var tokenError = validateToken(params);
    if (tokenError) {
      return tokenError;
    }

    // Action routing
    var handler = actionHandlers[action];
    if (typeof handler !== 'function') {
      return errorResult('不明なアクション: ' + action, 'UNKNOWN_ACTION');
    }

    return handler(params);
  };
})();
