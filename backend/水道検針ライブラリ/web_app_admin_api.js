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
        const execResult = processInspectionDataMonthlyImpl(null, params);
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

      // ── Phase 5b: Setup Wizard (3-button) ──
      case 'hasExistingData':
        return { success: true, data: hasExistingData() };

      case 'clearAllMasterData':
        clearAllMasterData();
        return { success: true, message: 'マスタデータをクリアしました' };

      case 'createSampleData':
        return createSampleData();

      case 'ensureInspectionDataFormulas':
        return ensureInspectionDataFormulas();

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

      // ── Phase 7: Property Management ──
      case 'addProperty': {
        if (!params.propertyName || !String(params.propertyName).trim()) {
          return { success: false, error: '物件名は必須です' };
        }
        return addProperty(params);
      }

      case 'addRoom': {
        if (!params.propertyId || !params.roomName) {
          return { success: false, error: '物件IDと部屋名は必須です' };
        }
        return addRoom(params);
      }

      case 'bulkAddProperties': {
        if (!params.items || !Array.isArray(params.items)) {
          return { success: false, error: 'items配列が必要です' };
        }
        return bulkAddProperties(params);
      }

      case 'bulkAddRooms': {
        if (!params.propertyId) {
          return { success: false, error: '物件IDは必須です' };
        }
        if (!params.items || !Array.isArray(params.items)) {
          return { success: false, error: 'items配列が必要です' };
        }
        return bulkAddRooms(params);
      }

      case 'updateRoom': {
        if (!params.propertyId || !params.roomId || !params.roomName) {
          return { success: false, error: '物件ID・部屋ID・部屋名は必須です' };
        }
        return updateRoom(params);
      }

      case 'deleteRoom': {
        if (!params.propertyId || !params.roomId) {
          return { success: false, error: '物件IDと部屋IDは必須です' };
        }
        return deleteRoom(params);
      }

      case 'updateProperty': {
        if (!params.propertyId) {
          return { success: false, error: '物件IDは必須です' };
        }
        if (!params.newPropertyName || !String(params.newPropertyName).trim()) {
          return { success: false, error: '物件名は必須です' };
        }
        return updateProperty(params);
      }

      case 'deleteProperty': {
        if (!params.propertyId) {
          return { success: false, error: '物件IDは必須です' };
        }
        return deleteProperty(params);
      }

      case 'getRoomsForManagement': {
        if (!params.propertyId) {
          return { success: false, error: '物件IDが必要です', code: 'MISSING_PARAM' };
        }
        return getRoomsForManagement(params.propertyId);
      }

      case 'updateInspectionData': {
        if (!params.propertyId || !params.roomId) {
          return { success: false, error: '物件ID・部屋IDが必要です', code: 'MISSING_PARAM' };
        }
        if (params.roomStatus) {
          var validStatuses = ['normal', 'vacant', 'owner', 'fixed', 'skip'];
          if (validStatuses.indexOf(params.roomStatus) === -1) {
            return {
              success: false,
              error: '無効な部屋ステータス: ' + params.roomStatus,
              code: 'INVALID_PARAM',
            };
          }
        }
        return updateInspectionData(params);
      }

      case 'getAvailableYears': {
        return getAvailableYears();
      }

      case 'getAnnualReport': {
        if (!params.propertyId) {
          return { success: false, error: '物件IDが必要です', code: 'MISSING_PARAM' };
        }
        if (!params.year) {
          return { success: false, error: '年度が必要です', code: 'MISSING_PARAM' };
        }
        return getAnnualReport(params);
      }

      case 'migrateMonthlyToYearly': {
        return migrateMonthlyToYearlySheets();
      }

      case 'getMonthlyBackupInfo':
        return getMonthlyBackupInfo();

      case 'undoMonthlyProcess':
        return undoMonthlyProcess();

      // ── Access Copy ──
      case 'getAccessCopyData': {
        if (!params.propertyId) {
          return { success: false, error: 'propertyIdが必要です', code: 'MISSING_PARAM' };
        }
        return getAccessCopyData(params.propertyId);
      }

      default:
        return { success: false, error: '不明なアクション: ' + action, code: 'UNKNOWN_ACTION' };
    }
  } catch (error) {
    return { success: false, error: sanitizeErrorMessage(error), code: 'SERVER_ERROR' };
  }
}

function getAdminMonthlyProcessStatus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return { success: false, error: 'スプレッドシートが見つかりません' };
    }
    var archiveSheets = ss.getSheets().filter(function (s) {
      return /^検針データ_\d{4}年$/.test(s.getName());
    });
    var lastSheet =
      archiveSheets.length > 0 ? archiveSheets[archiveSheets.length - 1].getName() : null;
    return {
      success: true,
      data: {
        isRunning: false,
        lastRun: lastSheet,
        archiveCount: archiveSheets.length,
      },
    };
  } catch (error) {
    return { success: false, error: sanitizeErrorMessage(error) };
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
          spreadsheetInfo: ssInfo.success ? { name: ssInfo.name, url: ssInfo.url } : null,
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
        spreadsheetInfo: ssInfo2.success ? { name: ssInfo2.name, url: ssInfo2.url } : null,
      },
      properties: properties,
    };
  } catch (error) {
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

function adminAction(action, params) {
  params = params || {};
  return adminDispatch(action, params);
}

function getAccessCopyData(propertyId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
    if (!roomSheet || roomSheet.getLastRow() < 2) {
      return { success: false, error: '部屋マスタが見つかりません' };
    }

    var roomData = roomSheet.getRange(2, 1, roomSheet.getLastRow() - 1, roomSheet.getLastColumn()).getValues();
    var rooms = [];
    for (var i = 0; i < roomData.length; i++) {
      if (String(roomData[i][0]).trim() === propertyId) {
        rooms.push({
          roomId: String(roomData[i][1]).trim(),
          roomName: String(roomData[i][2] || '').trim(),
          roomStatus: roomData[i].length > 3 ? String(roomData[i][3] || '').trim() : '',
        });
      }
    }
    rooms.sort(function (a, b) {
      return a.roomId < b.roomId ? -1 : a.roomId > b.roomId ? 1 : 0;
    });

    if (rooms.length === 0) {
      return { success: false, error: '該当物件の部屋が見つかりません' };
    }

    var propertyName = '';
    var propSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    if (propSheet && propSheet.getLastRow() >= 2) {
      var propData = propSheet.getRange(2, 1, propSheet.getLastRow() - 1, propSheet.getLastColumn()).getValues();
      for (var p = 0; p < propData.length; p++) {
        if (String(propData[p][0]).trim() === propertyId) {
          propertyName = String(propData[p][1] || '').trim();
          break;
        }
      }
    }

    var readings = _getAccessReadingsFromSheet(ss, propertyId, rooms);

    if (!readings) {
      readings = _getAccessReadingsFromArchive(ss, propertyId, rooms);
    }

    if (!readings) {
      return { success: false, error: '検針データが見つかりません（月次処理済みでアーカイブもなし）' };
    }

    var inspectedCount = 0;
    for (var r = 0; r < readings.length; r++) {
      if (readings[r] !== '') inspectedCount++;
    }

    return {
      success: true,
      data: {
        propertyName: propertyName,
        totalCount: rooms.length,
        inspectedCount: inspectedCount,
        readings: readings,
      },
    };
  } catch (error) {
    return { success: false, error: sanitizeErrorMessage(error) };
  }
}

function _getAccessReadingsFromSheet(ss, propertyId, rooms) {
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var propIdCol = headers.indexOf('物件ID');
  var roomIdCol = headers.indexOf('部屋ID');
  var readingCol = headers.indexOf('今回の指示数');

  if (propIdCol === -1 || roomIdCol === -1 || readingCol === -1) return null;

  var hasAnyData = false;
  var readingMap = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][propIdCol]).trim() === propertyId) {
      var rid = String(data[i][roomIdCol]).trim();
      var val = data[i][readingCol];
      readingMap[rid] = val;
      if (val !== '' && val !== null && val !== undefined) {
        hasAnyData = true;
      }
    }
  }

  if (!hasAnyData) return null;

  var result = [];
  for (var j = 0; j < rooms.length; j++) {
    var v = readingMap[rooms[j].roomId];
    if (v !== undefined && v !== null && v !== '') {
      result.push(String(v));
    } else {
      result.push('');
    }
  }
  return result;
}

function _getAccessReadingsFromArchive(ss, propertyId, rooms) {
  var sheets = ss.getSheets();
  var archiveSheets = [];
  for (var i = 0; i < sheets.length; i++) {
    if (/^検針データ_\d{4}年$/.test(sheets[i].getName())) {
      archiveSheets.push(sheets[i]);
    }
  }
  if (archiveSheets.length === 0) return null;

  var latestSheet = archiveSheets[archiveSheets.length - 1];

  if (latestSheet.getLastRow() < 2) return null;

  var data = latestSheet.getDataRange().getValues();
  var headers = data[0];
  var monthCol = headers.indexOf('月');
  var propIdCol = headers.indexOf('物件ID');
  var roomIdCol = headers.indexOf('部屋ID');
  var readingCol = headers.indexOf('今回の指示数');

  if (propIdCol === -1 || roomIdCol === -1 || readingCol === -1) return null;

  var latestMonth = 0;
  for (var m = 1; m < data.length; m++) {
    if (String(data[m][propIdCol]).trim() === propertyId && monthCol !== -1) {
      var mv = Number(data[m][monthCol]);
      if (mv > latestMonth) latestMonth = mv;
    }
  }
  if (latestMonth === 0) return null;

  var readingMap = {};
  for (var k = 1; k < data.length; k++) {
    if (String(data[k][propIdCol]).trim() === propertyId) {
      if (monthCol !== -1 && Number(data[k][monthCol]) !== latestMonth) continue;
      var rid = String(data[k][roomIdCol]).trim();
      var val = data[k][readingCol];
      readingMap[rid] = val;
    }
  }

  var result = [];
  for (var j = 0; j < rooms.length; j++) {
    var v = readingMap[rooms[j].roomId];
    if (v !== undefined && v !== null && v !== '') {
      result.push(String(v));
    } else {
      result.push('');
    }
  }
  return result;
}
