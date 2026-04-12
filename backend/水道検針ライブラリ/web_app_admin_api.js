// web_app_admin_api.js - 管理者アクションディスパッチャー

function adminDispatch(action, params) {
  try {
    const storedToken =
      params._storedAdminToken ||
      PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
    if (!params.adminToken || !storedToken || params.adminToken !== storedToken) {
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
    const propResult = getProperties();
    if (!propResult.success) {
      return propResult;
    }
    const properties = propResult.data || [];
    let totalRooms = 0;
    let completedRooms = 0;
    for (var i = 0; i < properties.length; i++) {
      var p = properties[i];
      if (p.roomCount) totalRooms += Number(p.roomCount);
      if (p.completedCount) completedRooms += Number(p.completedCount);
    }
    const ssInfo = getSpreadsheetInfo();
    return {
      success: true,
      data: {
        propertyCount: properties.length,
        totalRooms: totalRooms,
        completedRooms: completedRooms,
        pendingRooms: totalRooms - completedRooms,
        completionRate: totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0,
        spreadsheetInfo: ssInfo.success
          ? { id: ssInfo.spreadsheetId, name: ssInfo.name, url: ssInfo.url }
          : null,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function adminAction(action, params) {
  params = params || {};
  var storedToken = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (storedToken) {
    params._storedAdminToken = storedToken;
  }
  return adminDispatch(action, params);
}
