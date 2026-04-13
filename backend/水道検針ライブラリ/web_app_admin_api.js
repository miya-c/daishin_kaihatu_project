// web_app_admin_api.js - 管理者アクションディスパッチャー

function adminDispatch(action, params) {
  try {
    // クライアント経由の呼び出しのみ許可（_storedAdminToken はクライアントが検証後に設定）
    if (!params._storedAdminToken) {
      return { success: false, error: '管理者トークンが無効です', code: 'INVALID_TOKEN' };
    }

    if (action === 'verifyToken') {
      return { success: true, data: { valid: true, message: 'トークンが確認されました' } };
    }

    switch (action) {
      // ── Phase 1: Core ──
      case 'getSpreadsheetInfo': {
        const result = getSpreadsheetInfo();
        if (result.success) {
          return {
            success: true,
            data: {
              spreadsheetId: result.spreadsheetId,
              name: result.name,
              sheets: result.sheets,
              url: result.url,
            },
          };
        }
        return result;
      }

      case 'getProperties':
        return getProperties();

      // ── Phase 2: Monthly Process ──
      case 'preCheckMonthlyProcess': {
        const preCheck = preCheckMonthlyProcess();
        return { success: preCheck.success, data: preCheck };
      }

      case 'executeMonthlyProcess': {
        const execResult = processInspectionDataMonthlyImpl();
        return { success: execResult.success, data: execResult };
      }

      case 'getMonthlyProcessStatus':
        return getAdminMonthlyProcessStatus();

      // ── Phase 3: Dashboard ──
      case 'getRooms': {
        if (!params.propertyId) {
          return { success: false, error: 'propertyIdが必要です', code: 'MISSING_PARAM' };
        }
        return getRooms(params.propertyId);
      }

      case 'getAdminDashboardData':
        return buildAdminDashboardData();

      // ── Phase 4: Data Maintenance ──
      case 'validateInspectionDataIntegrity':
        return validateInspectionDataIntegrity();

      case 'cleanupDuplicateData':
        return optimizedCleanupDuplicateInspectionData();

      case 'generateRoomIds':
        return generateRoomIds();

      case 'formatAllPropertyIds':
        return formatAllPropertyIds();

      case 'cleanUpOrphanedRooms':
        return cleanUpOrphanedRooms();

      // ── Phase 5: Setup Wizard ──
      case 'validateSystemSetup':
        return validateSystemSetup();

      case 'createMasterSheetTemplates':
        return createMasterSheetTemplates(null, { overwrite: params.overwrite === true });

      case 'populateInspectionDataFromMasters': {
        const populated = populateInspectionDataFromMasters({}, null);
        if (populated === true) {
          return { success: true, data: { message: '検針データにマスタデータを反映しました' } };
        }
        return { success: false, error: 'マスタデータの反映に失敗しました' };
      }

      case 'createInitialInspectionData':
        return createInitialInspectionData();

      // ── Phase 6: Diagnostics ──
      case 'runSystemDiagnostics': {
        const diagResult = runSystemDiagnostics();
        var hasErrors = (diagResult.issues || []).some(function (i) {
          return i.severity === 'error' || i.type === 'error';
        });
        var hasWarnings = (diagResult.issues || []).some(function (i) {
          return i.severity === 'warning' || i.type === 'warning';
        });
        var overall = hasErrors ? 'ERROR' : hasWarnings ? 'WARNING' : 'HEALTHY';
        return { success: true, data: Object.assign({}, diagResult, { overall: overall }) };
      }

      default:
        return { success: false, error: '不明なアクション: ' + action, code: 'UNKNOWN_ACTION' };
    }
  } catch (error) {
    return { success: false, error: error.message, code: 'SERVER_ERROR' };
  }
}

function getAdminMonthlyProcessStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'スプレッドシートが見つかりません' };
    }
    const archiveSheets = ss.getSheets().filter(function (s) {
      return s.getName().indexOf('inspection_data_') === 0;
    });
    return {
      success: true,
      data: {
        isRunning: false,
        lastRun:
          archiveSheets.length > 0 ? archiveSheets[archiveSheets.length - 1].getName() : null,
        archiveCount: archiveSheets.length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function buildAdminDashboardData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);

    if (!sheet) {
      return { success: false, error: '検針データシートが見つかりません' };
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      var ssInfo = getSpreadsheetInfo();
      return {
        success: true,
        data: {
          propertyCount: 0,
          totalRooms: 0,
          completedRooms: 0,
          pendingRooms: 0,
          completionRate: 0,
          spreadsheetInfo: ssInfo.success
            ? { id: ssInfo.spreadsheetId, name: ssInfo.name, url: ssInfo.url }
            : null,
        },
      };
    }

    var headers = data[0];
    var propIdCol = headers.indexOf('物件ID');
    var propNameCol = headers.indexOf('物件名');
    var dateCol = headers.indexOf('検針日時');
    var skipCol = headers.indexOf('検針不要');

    if (propIdCol === -1 || dateCol === -1) {
      return { success: false, error: '検針データに必要な列が見つかりません' };
    }

    var propertyMap = {};
    var totalRooms = 0;
    var totalCompleted = 0;

    for (var i = 1; i < data.length; i++) {
      var isSkipped = skipCol !== -1 && !!data[i][skipCol];
      if (isSkipped) continue;

      var pId = String(data[i][propIdCol]).trim();
      var pName = propNameCol !== -1 ? String(data[i][propNameCol] || '').trim() : '';
      var readingDate = data[i][dateCol];
      var isCompleted = !!readingDate;

      totalRooms++;
      if (isCompleted) totalCompleted++;

      if (!propertyMap[pId]) {
        propertyMap[pId] = { id: pId, name: pName, roomCount: 0, completedCount: 0 };
      }
      propertyMap[pId].roomCount++;
      if (isCompleted) propertyMap[pId].completedCount++;
    }

    var properties = [];
    for (var key in propertyMap) {
      properties.push(propertyMap[key]);
    }

    var ssInfo2 = getSpreadsheetInfo();
    return {
      success: true,
      data: {
        propertyCount: properties.length,
        totalRooms: totalRooms,
        completedRooms: totalCompleted,
        pendingRooms: totalRooms - totalCompleted,
        completionRate: totalRooms > 0 ? Math.round((totalCompleted / totalRooms) * 100) : 0,
        spreadsheetInfo: ssInfo2.success
          ? { id: ssInfo2.spreadsheetId, name: ssInfo2.name, url: ssInfo2.url }
          : null,
      },
      properties: properties,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function adminAction(action, params) {
  params = params || {};
  return adminDispatch(action, params);
}
