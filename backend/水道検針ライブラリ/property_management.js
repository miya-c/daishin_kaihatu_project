/**
 * property_management.gs - 物件・部屋管理機能
 * 物件マスタ・部屋マスタのCRUD操作と検針台帳の差分更新
 */

// ═══════════════════════════════════════════
// Internal Utilities
// ═══════════════════════════════════════════

/**
 * Normalize property ID input
 * Rules:
 *   - null/undefined/empty string → return null (signals auto-assign)
 *   - Strip non-digit characters
 *   - parseInt to get numeric value (leading zeros ignored)
 *   - Range check: 1-999999
 *   - Format: "P" + zeroPad(6)
 * @param {string|number} input - User input
 * @returns {string|null} Normalized property ID like "P000005", or null for auto-assign
 * @throws {Error} If input is invalid
 */
function normalizePropertyId(input) {
  if (input === null || input === undefined || String(input).trim() === '') {
    return null; // auto-assign signal
  }
  var digits = String(input).replace(/[^0-9]/g, '');
  if (digits === '') {
    throw new Error('物件IDは数字で入力してください');
  }
  var num = parseInt(digits, 10);
  if (isNaN(num) || num < 1 || num > 999999) {
    throw new Error('物件IDは1〜999999の範囲で入力してください');
  }
  return 'P' + ('000000' + num).slice(-6);
}

/**
 * Get next auto-increment property ID
 * Reads property master, finds max ID, returns +1
 * @returns {string} Next property ID like "P000006"
 */
function getNextPropertyId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
  if (!sheet || sheet.getLastRow() <= 1) {
    return 'P000001';
  }
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  var maxNum = 0;
  for (var i = 0; i < data.length; i++) {
    var id = String(data[i][0]).trim();
    var match = id.match(/^P(\d{6})$/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return 'P' + ('000000' + (maxNum + 1)).slice(-6);
}

/**
 * Get next room ID for a property
 * @param {string} propertyId - Property ID
 * @returns {string} Next room ID like "R003"
 */
function getNextRoomId(propertyId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
  if (!sheet || sheet.getLastRow() <= 1) {
    return 'R001';
  }
  var data = sheet.getDataRange().getValues();
  var maxNum = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === propertyId) {
      var roomId = String(data[i][1]).trim();
      var match = roomId.match(/^R(\d{3})$/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return 'R' + ('000' + (maxNum + 1)).slice(-3);
}

/**
 * Sanitize a value to prevent spreadsheet formula injection.
 * Prepends a single quote if the trimmed value starts with a dangerous character.
 * @param {*} value - Value to sanitize
 * @returns {string} Sanitized string safe for spreadsheet cells
 */
function sanitizeSpreadsheetInput(value) {
  if (typeof value !== 'string') value = String(value || '');
  var trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + value;
  }
  return value;
}

// ═══════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════

/**
 * Add a new property to 物件マスタ
 * @param {Object} params - { propertyName: string, propertyId?: string }
 * @returns {Object} { success, data?: { propertyId, propertyName }, error?: string }
 */
function addProperty(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyName || !String(params.propertyName).trim()) {
        return { success: false, error: '物件名は必須です' };
      }
      var propertyName = String(params.propertyName).trim();

      propertyName = sanitizeSpreadsheetInput(propertyName);

      // Normalize or auto-assign property ID
      var propertyId;
      try {
        var normalized = normalizePropertyId(params.propertyId);
        if (normalized === null) {
          propertyId = getNextPropertyId();
        } else {
          propertyId = normalized;
        }
      } catch (e) {
        return { success: false, error: e.message };
      }

      // Check duplicate
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
      if (!sheet) {
        return { success: false, error: '物件マスタシートが見つかりません' };
      }

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === propertyId) {
          return { success: false, error: '物件ID「' + propertyId + '」は既に使用されています' };
        }
        if (String(data[i][1]).trim() === propertyName) {
          return { success: false, error: '物件名「' + propertyName + '」は既に登録されています' };
        }
      }

      // Append row
      sheet.appendRow([propertyId, propertyName, '']);

      Logger.log('物件追加: ' + propertyId + ' ' + propertyName);
      return {
        success: true,
        data: { propertyId: propertyId, propertyName: propertyName },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 30000);
}

/**
 * Bulk add properties to 物件マスタ
 * @param {Object} params - { items: [{ name: string, id?: string }] }
 * @returns {Object} { success, data: { results, succeededCount, failedCount } }
 */
function bulkAddProperties(params) {
  return withScriptLock(function () {
    try {
      if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
        return { success: false, error: '登録データが空です' };
      }
      if (params.items.length > 100) {
        return { success: false, error: '一括登録は100件までです' };
      }

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
      if (!sheet) {
        return { success: false, error: '物件マスタシートが見つかりません' };
      }

      var existingData = sheet.getDataRange().getValues();
      var existingIds = {};
      var existingNames = {};
      var maxNum = 0;
      for (var i = 1; i < existingData.length; i++) {
        var eid = String(existingData[i][0]).trim();
        var ename = String(existingData[i][1]).trim();
        existingIds[eid] = true;
        existingNames[ename] = true;
        var match = eid.match(/^P(\d{6})$/);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }

      var results = [];
      var succeededCount = 0;
      var failedCount = 0;
      var batchNames = {};

      for (var j = 0; j < params.items.length; j++) {
        var item = params.items[j];
        var propertyName = String(item.name || '').trim();

        if (!propertyName) {
          results.push({ name: '', id: '', success: false, error: '物件名が空です' });
          failedCount++;
          continue;
        }

        if (batchNames[propertyName]) {
          results.push({ name: propertyName, id: '', success: false, error: 'バッチ内重複' });
          failedCount++;
          continue;
        }

        propertyName = sanitizeSpreadsheetInput(propertyName);

        var propertyId;
        if (item.id && String(item.id).trim()) {
          try {
            var normalized = normalizePropertyId(item.id);
            if (normalized !== null) {
              propertyId = normalized;
            } else {
              propertyId = 'P' + ('000000' + ++maxNum).slice(-6);
            }
          } catch (e) {
            results.push({ name: propertyName, id: '', success: false, error: e.message });
            failedCount++;
            continue;
          }
        } else {
          propertyId = 'P' + ('000000' + ++maxNum).slice(-6);
        }

        if (existingIds[propertyId]) {
          results.push({ name: propertyName, id: propertyId, success: false, error: '物件ID重複' });
          failedCount++;
          continue;
        }
        if (existingNames[propertyName]) {
          results.push({ name: propertyName, id: '', success: false, error: '物件名重複' });
          failedCount++;
          continue;
        }

        sheet.appendRow([propertyId, propertyName, '']);
        existingIds[propertyId] = true;
        existingNames[propertyName] = true;
        batchNames[propertyName] = true;

        results.push({ name: propertyName, id: propertyId, success: true });
        succeededCount++;
      }

      return {
        success: true,
        data: { results: results, succeededCount: succeededCount, failedCount: failedCount },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 60000);
}

/**
 * Bulk add rooms to 部屋マスタ and diff-insert into inspection_data
 * @param {Object} params - { propertyId: string, items: [{ name: string }] }
 * @returns {Object} { success, data: { results, succeededCount, failedCount } }
 */
function bulkAddRooms(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyId) {
        return { success: false, error: '物件IDは必須です' };
      }
      if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
        return { success: false, error: '登録データが空です' };
      }
      if (params.items.length > 200) {
        return { success: false, error: '一括登録は200件までです' };
      }

      var propertyId = String(params.propertyId).trim();
      var ss = SpreadsheetApp.getActiveSpreadsheet();

      var propSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
      if (!propSheet) {
        return { success: false, error: '物件マスタシートが見つかりません' };
      }
      var propData = propSheet.getDataRange().getValues();
      var propertyName = '';
      var propertyFound = false;
      for (var p = 1; p < propData.length; p++) {
        if (String(propData[p][0]).trim() === propertyId) {
          propertyName = String(propData[p][1]).trim();
          propertyFound = true;
          break;
        }
      }
      if (!propertyFound) {
        return { success: false, error: '物件ID「' + propertyId + '」が見つかりません' };
      }

      var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
      if (!roomSheet) {
        return { success: false, error: '部屋マスタシートが見つかりません' };
      }
      var roomData = roomSheet.getDataRange().getValues();
      var existingRoomIds = {};
      var existingRoomNames = {};
      var maxRoomNum = 0;
      for (var r = 1; r < roomData.length; r++) {
        if (String(roomData[r][0]).trim() === propertyId) {
          var rid = String(roomData[r][1]).trim();
          var rname = String(roomData[r][2]).trim();
          existingRoomIds[rid] = true;
          existingRoomNames[rname] = true;
          var rmatch = rid.match(/^R(\d{3})$/);
          if (rmatch) {
            var rnum = parseInt(rmatch[1], 10);
            if (rnum > maxRoomNum) maxRoomNum = rnum;
          }
        }
      }

      var inspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      var inspHeaders = null;
      if (inspectionSheet && inspectionSheet.getLastRow() >= 1) {
        inspHeaders = inspectionSheet
          .getRange(1, 1, 1, inspectionSheet.getLastColumn())
          .getValues()[0];
      }

      var results = [];
      var succeededCount = 0;
      var failedCount = 0;
      var batchNames = {};

      for (var j = 0; j < params.items.length; j++) {
        var item = params.items[j];
        var roomName = String(item.name || '').trim();

        if (!roomName) {
          results.push({ name: '', id: '', success: false, error: '部屋名が空です' });
          failedCount++;
          continue;
        }
        if (batchNames[roomName]) {
          results.push({ name: roomName, id: '', success: false, error: 'バッチ内重複' });
          failedCount++;
          continue;
        }

        roomName = sanitizeSpreadsheetInput(roomName);

        var roomId = 'R' + ('000' + ++maxRoomNum).slice(-3);

        if (existingRoomNames[roomName]) {
          results.push({ name: roomName, id: roomId, success: false, error: '部屋名重複' });
          failedCount++;
          continue;
        }

        roomSheet.appendRow([propertyId, roomId, roomName]);

        if (inspHeaders) {
          var newRow = new Array(inspHeaders.length).fill('');
          var propIdCol = inspHeaders.indexOf('物件ID');
          var propNameCol = inspHeaders.indexOf('物件名');
          var roomIdCol = inspHeaders.indexOf('部屋ID');
          var roomNameCol = inspHeaders.indexOf('部屋名');
          if (propIdCol !== -1) newRow[propIdCol] = propertyId;
          if (propNameCol !== -1) newRow[propNameCol] = propertyName;
          if (roomIdCol !== -1) newRow[roomIdCol] = roomId;
          if (roomNameCol !== -1) newRow[roomNameCol] = roomName;
          inspectionSheet.appendRow(newRow);
        }

        existingRoomIds[roomId] = true;
        existingRoomNames[roomName] = true;
        batchNames[roomName] = true;

        results.push({ name: roomName, id: roomId, success: true });
        succeededCount++;
      }

      return {
        success: true,
        data: { results: results, succeededCount: succeededCount, failedCount: failedCount },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 60000);
}

/**
 * Add a new room to 部屋マスタ and diff-insert into inspection_data
 * @param {Object} params - { propertyId: string, roomName: string, roomId?: string }
 * @returns {Object} { success, data?: { propertyId, roomId, roomName }, error?: string }
 */
function addRoom(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyId || !String(params.propertyId).trim()) {
        return { success: false, error: '物件IDは必須です' };
      }
      if (!params.roomName || !String(params.roomName).trim()) {
        return { success: false, error: '部屋名は必須です' };
      }

      var propertyId = String(params.propertyId).trim();
      var roomName = String(params.roomName).trim();

      roomName = sanitizeSpreadsheetInput(roomName);

      var ss = SpreadsheetApp.getActiveSpreadsheet();

      // Verify property exists and get property name
      var propSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
      if (!propSheet) {
        return { success: false, error: '物件マスタシートが見つかりません' };
      }
      var propData = propSheet.getDataRange().getValues();
      var propertyName = '';
      var propertyFound = false;
      for (var i = 1; i < propData.length; i++) {
        if (String(propData[i][0]).trim() === propertyId) {
          propertyName = String(propData[i][1]).trim();
          propertyFound = true;
          break;
        }
      }
      if (!propertyFound) {
        return { success: false, error: '物件ID「' + propertyId + '」が見つかりません' };
      }

      // Auto-assign room ID (always auto for rooms)
      var roomId = getNextRoomId(propertyId);

      // Append to room master
      var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
      if (!roomSheet) {
        return { success: false, error: '部屋マスタシートが見つかりません' };
      }
      roomSheet.appendRow([
        propertyId,
        roomId,
        roomName,
        sanitizeSpreadsheetInput(params.roomStatus || ''),
        sanitizeSpreadsheetInput(params.roomNotes || ''),
      ]);

      // Diff-insert into inspection_data
      var inspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      if (inspectionSheet && inspectionSheet.getLastRow() >= 1) {
        var headers = inspectionSheet
          .getRange(1, 1, 1, inspectionSheet.getLastColumn())
          .getValues()[0];

        var newRow = new Array(headers.length).fill('');
        var propIdCol = headers.indexOf('物件ID');
        var propNameCol = headers.indexOf('物件名');
        var roomIdCol = headers.indexOf('部屋ID');
        var roomNameCol = headers.indexOf('部屋名');
        var inspSkipCol = headers.indexOf('検針不要');
        var billSkipCol = headers.indexOf('請求不要');
        var roomStatusCol = headers.indexOf('部屋ステータス');

        if (propIdCol !== -1) newRow[propIdCol] = propertyId;
        if (propNameCol !== -1) newRow[propNameCol] = propertyName;
        if (roomIdCol !== -1) newRow[roomIdCol] = roomId;
        if (roomNameCol !== -1) newRow[roomNameCol] = roomName;

        var status = params.roomStatus || 'normal';
        var flags = deriveFlagsFromStatus(status);
        if (inspSkipCol !== -1) newRow[inspSkipCol] = flags.inspectionSkip;
        if (billSkipCol !== -1) newRow[billSkipCol] = flags.billingSkip;
        if (roomStatusCol !== -1) newRow[roomStatusCol] = status;

        inspectionSheet.appendRow(newRow);
      }

      Logger.log('部屋追加: ' + propertyId + ' ' + roomId + ' ' + roomName);
      return {
        success: true,
        data: { propertyId: propertyId, roomId: roomId, roomName: roomName },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 30000);
}

/**
 * Update a room name in 部屋マスタ and inspection_data
 * @param {Object} params - { propertyId: string, roomId: string, roomName: string }
 * @returns {Object} { success, data?, error? }
 */
function updateRoom(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyId || !params.roomId || !params.roomName) {
        return { success: false, error: '物件ID・部屋ID・部屋名は必須です' };
      }
      var propertyId = String(params.propertyId).trim();
      var roomId = String(params.roomId).trim();
      var roomName = String(params.roomName).trim();
      roomName = sanitizeSpreadsheetInput(roomName);

      var ss = SpreadsheetApp.getActiveSpreadsheet();

      // Update room master
      var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
      if (!roomSheet) {
        return { success: false, error: '部屋マスタシートが見つかりません' };
      }
      var roomData = roomSheet.getDataRange().getValues();
      var roomUpdated = false;
      for (var i = 1; i < roomData.length; i++) {
        if (
          String(roomData[i][0]).trim() === propertyId &&
          String(roomData[i][1]).trim() === roomId
        ) {
          roomSheet.getRange(i + 1, 3).setValue(roomName);
          roomUpdated = true;
          break;
        }
      }
      if (!roomUpdated) {
        return { success: false, error: '指定された部屋が見つかりません' };
      }

      // Update inspection_data
      var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      if (inspSheet && inspSheet.getLastRow() > 1) {
        var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
        var inspPropIdCol = inspHeaders.indexOf('物件ID');
        var inspRoomIdCol = inspHeaders.indexOf('部屋ID');
        var inspRoomNameCol = inspHeaders.indexOf('部屋名');

        if (inspPropIdCol !== -1 && inspRoomIdCol !== -1 && inspRoomNameCol !== -1) {
          var inspData = inspSheet.getDataRange().getValues();
          for (var j = 1; j < inspData.length; j++) {
            if (
              String(inspData[j][inspPropIdCol]).trim() === propertyId &&
              String(inspData[j][inspRoomIdCol]).trim() === roomId
            ) {
              inspSheet.getRange(j + 1, inspRoomNameCol + 1).setValue(roomName);
            }
          }
        }
      }

      Logger.log('部屋更新: ' + propertyId + ' ' + roomId + ' → ' + roomName);
      return {
        success: true,
        data: { propertyId: propertyId, roomId: roomId, roomName: roomName },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 30000);
}

/**
 * Delete a room from 部屋マスタ and inspection_data
 * Only allowed if room has no inspection results (検針日時 is empty)
 * @param {Object} params - { propertyId: string, roomId: string }
 * @returns {Object} { success, data?, error? }
 */
function deleteRoom(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyId || !params.roomId) {
        return { success: false, error: '物件IDと部屋IDは必須です' };
      }
      var propertyId = String(params.propertyId).trim();
      var roomId = String(params.roomId).trim();

      var ss = SpreadsheetApp.getActiveSpreadsheet();

      // Check inspection results
      var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      if (inspSheet && inspSheet.getLastRow() > 1) {
        var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
        var inspPropIdCol = inspHeaders.indexOf('物件ID');
        var inspRoomIdCol = inspHeaders.indexOf('部屋ID');
        var inspDateCol = inspHeaders.indexOf('検針日時');

        if (inspPropIdCol !== -1 && inspRoomIdCol !== -1 && inspDateCol !== -1) {
          var inspData = inspSheet.getDataRange().getValues();
          for (var k = 1; k < inspData.length; k++) {
            if (
              String(inspData[k][inspPropIdCol]).trim() === propertyId &&
              String(inspData[k][inspRoomIdCol]).trim() === roomId
            ) {
              if (inspData[k][inspDateCol]) {
                return {
                  success: false,
                  error: '検針実績がある部屋は削除できません。部屋ID: ' + roomId,
                };
              }
            }
          }
        }
      }

      // Delete from room master
      var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
      if (!roomSheet) {
        return { success: false, error: '部屋マスタシートが見つかりません' };
      }
      var roomData = roomSheet.getDataRange().getValues();
      var roomDeleted = false;
      // Iterate in reverse to safely delete rows
      for (var i = roomData.length - 1; i >= 1; i--) {
        if (
          String(roomData[i][0]).trim() === propertyId &&
          String(roomData[i][1]).trim() === roomId
        ) {
          roomSheet.deleteRow(i + 1);
          roomDeleted = true;
          break;
        }
      }
      if (!roomDeleted) {
        return { success: false, error: '指定された部屋が見つかりません' };
      }

      // Delete from inspection_data
      if (inspSheet && inspSheet.getLastRow() > 1) {
        var inspHeaders2 = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
        var pCol = inspHeaders2.indexOf('物件ID');
        var rCol = inspHeaders2.indexOf('部屋ID');
        if (pCol !== -1 && rCol !== -1) {
          var inspData2 = inspSheet.getDataRange().getValues();
          for (var j = inspData2.length - 1; j >= 1; j--) {
            if (
              String(inspData2[j][pCol]).trim() === propertyId &&
              String(inspData2[j][rCol]).trim() === roomId
            ) {
              inspSheet.deleteRow(j + 1);
            }
          }
        }
      }

      Logger.log('部屋削除: ' + propertyId + ' ' + roomId);
      return { success: true, data: { propertyId: propertyId, roomId: roomId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 30000);
}

/**
 * Update a property's ID and/or name
 * Updates property_master (first), room_master, and inspection_data
 * Idempotent: safe to re-run if partially completed
 * @param {Object} params - { propertyId, newPropertyId?, newPropertyName }
 * @returns {Object} { success, data?, error? }
 */
function updateProperty(params) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
  } catch (lockErr) {
    return {
      success: false,
      error: '別の処理（月次処理など）が実行中です。しばらく待ってから再試行してください。',
    };
  }

  try {
    // ── Validation ──
    if (!params.propertyId) {
      return { success: false, error: '物件IDは必須です' };
    }
    var oldId = String(params.propertyId).trim();

    var newName = params.newPropertyName ? String(params.newPropertyName).trim() : '';
    if (!newName) {
      return { success: false, error: '物件名は必須です' };
    }
    newName = sanitizeSpreadsheetInput(newName);

    var newId;
    try {
      var normalized = normalizePropertyId(params.newPropertyId);
      newId = normalized || oldId;
    } catch (e) {
      return { success: false, error: e.message };
    }

    var idChanged = oldId !== newId;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Monthly backup guard (ID change only) ──
    if (idChanged) {
      var backupSheet = ss.getSheetByName('_monthly_backup');
      if (backupSheet) {
        return {
          success: false,
          error:
            '月次処理の取り消しデータが存在します。取り消し完了後に物件IDの変更が可能です。物件名のみの変更は可能です。',
          code: 'BACKUP_EXISTS',
        };
      }
    }

    // ── Property master: existence + duplicate check ──
    var propSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    if (!propSheet) {
      return { success: false, error: '物件マスタシートが見つかりません' };
    }
    var propData = propSheet.getDataRange().getValues();
    var propRow = -1;
    for (var i = 1; i < propData.length; i++) {
      var rowId = String(propData[i][0]).trim();
      var rowName = String(propData[i][1]).trim();
      if (rowId === oldId) {
        propRow = i + 1;
      }
      if (rowId !== oldId && idChanged && rowId === newId) {
        return { success: false, error: '物件ID「' + newId + '」は既に使用されています' };
      }
      if (rowId !== oldId && rowName === newName) {
        return { success: false, error: '物件名「' + newName + '」は既に登録されています' };
      }
    }
    if (propRow === -1) {
      return {
        success: false,
        error: '物件ID「' + oldId + '」が見つかりません。別の管理者によって削除された可能性があります。',
      };
    }

    // ── STEP 1: Update property_master (source of truth FIRST) ──
    propSheet.getRange(propRow, 2).setValue(newName);
    if (idChanged) {
      propSheet.getRange(propRow, 1).setValue(newId);
    }
    Logger.log('updateProperty step1: property_master row=' + propRow);

    // ── STEP 2: Update room_master (ID change only) ──
    if (idChanged) {
      var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
      if (roomSheet && roomSheet.getLastRow() > 1) {
        var roomData = roomSheet.getDataRange().getValues();
        var roomCount = 0;
        for (var r = 1; r < roomData.length; r++) {
          if (String(roomData[r][0]).trim() === oldId) {
            roomSheet.getRange(r + 1, 1).setValue(newId);
            roomCount++;
          }
        }
        Logger.log('updateProperty step2: room_master ' + roomCount + ' rows');
      }
    }

    // ── STEP 3: Update inspection_data ──
    var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
    if (inspSheet && inspSheet.getLastRow() > 1) {
      var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
      var inspPropIdCol = inspHeaders.indexOf('物件ID');
      var inspPropNameCol = inspHeaders.indexOf('物件名');

      var inspData = inspSheet.getDataRange().getValues();
      var inspCount = 0;
      for (var j = 1; j < inspData.length; j++) {
        if (String(inspData[j][inspPropIdCol]).trim() === oldId) {
          if (idChanged && inspPropIdCol !== -1) {
            inspSheet.getRange(j + 1, inspPropIdCol + 1).setValue(newId);
          }
          if (inspPropNameCol !== -1) {
            inspSheet.getRange(j + 1, inspPropNameCol + 1).setValue(newName);
          }
          inspCount++;
        }
      }
      Logger.log('updateProperty step3: inspection_data ' + inspCount + ' rows');
    }

    Logger.log(
      'updateProperty complete: ' + oldId + (idChanged ? ' → ' + newId : '') + ' name="' + newName + '"'
    );
    return {
      success: true,
      data: {
        oldPropertyId: oldId,
        newPropertyId: newId,
        newPropertyName: newName,
        idChanged: idChanged,
      },
    };
  } catch (error) {
    Logger.log('updateProperty error: ' + error.message);
    return { success: false, error: error.message };
  } finally {
    LockService.getScriptLock().releaseLock();
  }
}

/**
 * Delete a property and all its rooms from all sheets
 * Checks for inspection results first
 * @param {Object} params - { propertyId: string, force?: boolean }
 * @returns {Object} { success, data?, error?, hasInspectionResults?: boolean }
 */
function deleteProperty(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyId) {
        return { success: false, error: '物件IDは必須です' };
      }
      var propertyId = String(params.propertyId).trim();

      var ss = SpreadsheetApp.getActiveSpreadsheet();

      // Check for inspection results
      var hasResults = false;
      var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      if (inspSheet && inspSheet.getLastRow() > 1) {
        var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
        var inspPropIdCol = inspHeaders.indexOf('物件ID');
        var inspDateCol = inspHeaders.indexOf('検針日時');

        if (inspPropIdCol !== -1 && inspDateCol !== -1) {
          var inspData = inspSheet.getDataRange().getValues();
          for (var k = 1; k < inspData.length; k++) {
            if (
              String(inspData[k][inspPropIdCol]).trim() === propertyId &&
              inspData[k][inspDateCol]
            ) {
              hasResults = true;
              break;
            }
          }
        }
      }

      if (hasResults && !params.force) {
        // Return warning - frontend should show confirmation
        return {
          success: false,
          error: 'この物件には検針実績があります。削除すると実績データも失われます。',
          hasInspectionResults: true,
          code: 'HAS_INSPECTION_RESULTS',
        };
      }

      // Delete from inspection_data (reverse iteration)
      if (inspSheet && inspSheet.getLastRow() > 1) {
        var inspHeaders2 = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
        var pCol2 = inspHeaders2.indexOf('物件ID');
        if (pCol2 !== -1) {
          var inspData2 = inspSheet.getDataRange().getValues();
          for (var j = inspData2.length - 1; j >= 1; j--) {
            if (String(inspData2[j][pCol2]).trim() === propertyId) {
              inspSheet.deleteRow(j + 1);
            }
          }
        }
      }

      // Delete from room master (reverse iteration)
      var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
      if (roomSheet && roomSheet.getLastRow() > 1) {
        var roomData = roomSheet.getDataRange().getValues();
        for (var r = roomData.length - 1; r >= 1; r--) {
          if (String(roomData[r][0]).trim() === propertyId) {
            roomSheet.deleteRow(r + 1);
          }
        }
      }

      // Delete from property master
      var propSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
      if (!propSheet) {
        return { success: false, error: '物件マスタシートが見つかりません' };
      }
      var propData = propSheet.getDataRange().getValues();
      var propDeleted = false;
      for (var p = propData.length - 1; p >= 1; p--) {
        if (String(propData[p][0]).trim() === propertyId) {
          propSheet.deleteRow(p + 1);
          propDeleted = true;
          break;
        }
      }
      if (!propDeleted) {
        return { success: false, error: '物件ID「' + propertyId + '」が見つかりません' };
      }

      Logger.log('物件削除: ' + propertyId);
      return { success: true, data: { propertyId: propertyId } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, 30000);
}

/**
 * Get rooms for a property (management view - includes full inspection data)
 * @param {string} propertyId - Property ID
 * @returns {Object} { success, data: [{ roomId, roomName, hasInspectionResult, readingDate, warningFlag, standardDeviation, usage, currentReading, previousReading, previousReading2, previousReading3, inspectionSkip, billingSkip }] }
 */
function getRoomsForManagement(propertyId) {
  try {
    if (!propertyId) {
      return { success: false, error: '物件IDが指定されていません' };
    }
    propertyId = String(propertyId).trim();

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get rooms from room master
    var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
    if (!roomSheet) {
      return { success: false, error: '部屋マスタシートが見つかりません' };
    }
    var roomData = roomSheet.getDataRange().getValues();
    var rooms = [];
    for (var i = 1; i < roomData.length; i++) {
      if (String(roomData[i][0]).trim() === propertyId) {
        var rawStatus = roomData[i].length > 3 ? String(roomData[i][3]).trim() : '';
        var rawNotes = roomData[i].length > 4 ? String(roomData[i][4]).trim() : '';
        rooms.push({
          propertyId: propertyId,
          roomId: String(roomData[i][1]).trim(),
          roomName: String(roomData[i][2]).trim(),
          roomStatus: rawStatus || '',
          roomNotes: rawNotes || '',
          hasInspectionResult: false,
          readingDate: '',
          warningFlag: '',
          standardDeviation: '',
          usage: '',
          currentReading: '',
          previousReading: '',
          previousReading2: '',
          previousReading3: '',
          inspectionSkip: false,
          billingSkip: false,
        });
      }
    }

    var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
    if (inspSheet && inspSheet.getLastRow() > 1 && rooms.length > 0) {
      var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
      var inspPropIdCol = inspHeaders.indexOf('物件ID');
      var inspRoomIdCol = inspHeaders.indexOf('部屋ID');
      var inspDateCol = inspHeaders.indexOf('検針日時');
      var inspWarningCol = inspHeaders.indexOf('警告フラグ');
      var inspStdDevCol = inspHeaders.indexOf('標準偏差値');
      var inspUsageCol = inspHeaders.indexOf('今回使用量');
      var inspCurrentCol = inspHeaders.indexOf('今回の指示数');
      var inspPrevCol = inspHeaders.indexOf('前回指示数');
      var inspPrev2Col = inspHeaders.indexOf('前々回指示数');
      var inspPrev3Col = inspHeaders.indexOf('前々々回指示数');
      var inspSkipCol = inspHeaders.indexOf('検針不要');
      var inspBillingCol = inspHeaders.indexOf('請求不要');

      if (inspPropIdCol !== -1 && inspRoomIdCol !== -1) {
        var inspData = inspSheet.getDataRange().getValues();
        for (var j = 1; j < inspData.length; j++) {
          var iPropId = String(inspData[j][inspPropIdCol]).trim();
          var iRoomId = String(inspData[j][inspRoomIdCol]).trim();

          if (iPropId === propertyId) {
            for (var k = 0; k < rooms.length; k++) {
              if (rooms[k].roomId === iRoomId) {
                var row = inspData[j];
                var iDate = inspDateCol !== -1 ? row[inspDateCol] : '';
                var iCurrent = inspCurrentCol !== -1 ? row[inspCurrentCol] : '';
                var hasReading =
                  (iDate !== '' && iDate !== null && iDate !== undefined) ||
                  (iCurrent !== '' && iCurrent !== null && iCurrent !== undefined);

                if (hasReading) {
                  rooms[k].hasInspectionResult = true;
                  rooms[k].readingDate = safeValue(inspDateCol !== -1 ? row[inspDateCol] : '');
                  rooms[k].warningFlag =
                    inspWarningCol !== -1 ? safeValue(row[inspWarningCol]) : '';
                  rooms[k].standardDeviation =
                    inspStdDevCol !== -1 ? _toInt(row[inspStdDevCol]) : '';
                  rooms[k].usage = inspUsageCol !== -1 ? _toInt(row[inspUsageCol]) : '';
                  rooms[k].currentReading =
                    inspCurrentCol !== -1 ? _toInt(row[inspCurrentCol]) : '';
                  rooms[k].previousReading = inspPrevCol !== -1 ? _toInt(row[inspPrevCol]) : '';
                  rooms[k].previousReading2 = inspPrev2Col !== -1 ? _toInt(row[inspPrev2Col]) : '';
                  rooms[k].previousReading3 = inspPrev3Col !== -1 ? _toInt(row[inspPrev3Col]) : '';
                }

                rooms[k].inspectionSkip = inspSkipCol !== -1 ? _isTruthy(row[inspSkipCol]) : false;
                rooms[k].billingSkip =
                  inspBillingCol !== -1 ? _isBillingSkip(row[inspBillingCol]) : false;

                if (!rooms[k].roomStatus || rooms[k].roomStatus === '') {
                  rooms[k].roomStatus = _inferStatusFromFlags(
                    rooms[k].inspectionSkip,
                    rooms[k].billingSkip
                  );
                }
                break;
              }
            }
          }
        }
      }
    }

    return { success: true, data: rooms };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Convert value to integer. Returns '' for empty/invalid values.
 * @param {*} val - Value to convert
 * @returns {number|string} Integer or ''
 */
function _toInt(val) {
  if (val === '' || val === null || val === undefined) return '';
  var num = parseInt(val, 10);
  return isNaN(num) ? '' : num;
}

/**
 * Check if a value represents a truthy inspection skip flag.
 * @param {*} val - Value to check
 * @returns {boolean}
 */
function _isTruthy(val) {
  if (
    val === true ||
    val === 'true' ||
    val === '1' ||
    val === 'yes' ||
    val === 'on' ||
    val === '\u25CB' ||
    val === 'x' ||
    val === '\u00D7'
  )
    return true;
  return false;
}

/**
 * Check if billing skip flag is set (●).
 * @param {*} val - Value to check
 * @returns {boolean}
 */
function _isBillingSkip(val) {
  return val === '\u25CF' || val === 'true' || val === '1' || val === true;
}

function deriveFlagsFromStatus(status) {
  switch (status) {
    case 'skip':
      return { inspectionSkip: 'true', billingSkip: '' };
    case 'owner':
      return { inspectionSkip: '', billingSkip: '\u25CF' };
    case 'fixed':
      return { inspectionSkip: '', billingSkip: '\u25CF' };
    default:
      return { inspectionSkip: '', billingSkip: '' };
  }
}

function _inferStatusFromFlags(inspectionSkip, billingSkip) {
  if (inspectionSkip) return 'skip';
  if (billingSkip) return 'owner';
  return 'normal';
}

/**
 * Update room master name + inspection data (current/prev readings, skip flags)
 * @param {Object} params - { propertyId, roomId, roomName, currentReading, previousReading, inspectionSkip, billingSkip }
 * @returns {Object} { success, message }
 */
function updateInspectionData(params) {
  return withScriptLock(function () {
    try {
      if (!params.propertyId || !params.roomId) {
        return { success: false, error: '物件ID・部屋IDは必須です' };
      }
      var propertyId = String(params.propertyId).trim();
      var roomId = String(params.roomId).trim();
      var roomName = params.roomName
        ? sanitizeSpreadsheetInput(String(params.roomName).trim())
        : '';

      var ss = SpreadsheetApp.getActiveSpreadsheet();

      if (roomName) {
        var roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
        if (roomSheet) {
          var roomData = roomSheet.getDataRange().getValues();
          for (var i = 1; i < roomData.length; i++) {
            if (
              String(roomData[i][0]).trim() === propertyId &&
              String(roomData[i][1]).trim() === roomId
            ) {
              roomSheet.getRange(i + 1, 3).setValue(roomName);
              if (params.roomStatus !== undefined) {
                roomSheet
                  .getRange(i + 1, 4)
                  .setValue(sanitizeSpreadsheetInput(String(params.roomStatus)));
              }
              if (params.roomNotes !== undefined) {
                roomSheet
                  .getRange(i + 1, 5)
                  .setValue(sanitizeSpreadsheetInput(String(params.roomNotes)));
              }
              break;
            }
          }
        }
      } else if (params.roomStatus !== undefined || params.roomNotes !== undefined) {
        var roomSheet2 = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
        if (roomSheet2) {
          var roomData2 = roomSheet2.getDataRange().getValues();
          for (var i2 = 1; i2 < roomData2.length; i2++) {
            if (
              String(roomData2[i2][0]).trim() === propertyId &&
              String(roomData2[i2][1]).trim() === roomId
            ) {
              if (params.roomStatus !== undefined) {
                roomSheet2
                  .getRange(i2 + 1, 4)
                  .setValue(sanitizeSpreadsheetInput(String(params.roomStatus)));
              }
              if (params.roomNotes !== undefined) {
                roomSheet2
                  .getRange(i2 + 1, 5)
                  .setValue(sanitizeSpreadsheetInput(String(params.roomNotes)));
              }
              break;
            }
          }
        }
      }

      var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      if (!inspSheet || inspSheet.getLastRow() <= 1) {
        return { success: false, error: 'inspection_dataシートが見つかりません' };
      }

      var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
      var inspPropIdCol = inspHeaders.indexOf('物件ID');
      var inspRoomIdCol = inspHeaders.indexOf('部屋ID');
      var inspRoomNameCol = inspHeaders.indexOf('部屋名');
      var inspCurrentCol = inspHeaders.indexOf('今回の指示数');
      var inspPrevCol = inspHeaders.indexOf('前回指示数');
      var inspSkipCol = inspHeaders.indexOf('検針不要');
      var inspBillingCol = inspHeaders.indexOf('請求不要');

      if (inspPropIdCol === -1 || inspRoomIdCol === -1) {
        return { success: false, error: 'inspection_dataに必要な列が見つかりません' };
      }

      var inspData = inspSheet.getDataRange().getValues();
      var rowUpdated = false;
      for (var j = 1; j < inspData.length; j++) {
        if (
          String(inspData[j][inspPropIdCol]).trim() === propertyId &&
          String(inspData[j][inspRoomIdCol]).trim() === roomId
        ) {
          if (roomName && inspRoomNameCol !== -1) {
            inspSheet.getRange(j + 1, inspRoomNameCol + 1).setValue(roomName);
          }
          if (
            params.currentReading !== undefined &&
            params.currentReading !== '' &&
            inspCurrentCol !== -1
          ) {
            var curVal = parseInt(params.currentReading, 10);
            if (!isNaN(curVal)) {
              inspSheet.getRange(j + 1, inspCurrentCol + 1).setValue(curVal);
            }
          }
          if (
            params.previousReading !== undefined &&
            params.previousReading !== '' &&
            inspPrevCol !== -1
          ) {
            var prevVal = parseInt(params.previousReading, 10);
            if (!isNaN(prevVal)) {
              inspSheet.getRange(j + 1, inspPrevCol + 1).setValue(prevVal);
            }
          }
          if (inspSkipCol !== -1) {
            var skipVal;
            if (params.roomStatus) {
              skipVal = deriveFlagsFromStatus(params.roomStatus).inspectionSkip;
            } else {
              skipVal =
                params.inspectionSkip === true || params.inspectionSkip === 'true' ? 'true' : '';
            }
            inspSheet.getRange(j + 1, inspSkipCol + 1).setValue(skipVal);
          }
          if (inspBillingCol !== -1) {
            var billVal;
            if (params.roomStatus) {
              billVal = deriveFlagsFromStatus(params.roomStatus).billingSkip;
            } else {
              billVal =
                params.billingSkip === true || params.billingSkip === 'true' ? '\u25CF' : '';
            }
            inspSheet.getRange(j + 1, inspBillingCol + 1).setValue(billVal);
          }
          var inspRoomStatusCol = inspHeaders.indexOf('部屋ステータス');
          if (inspRoomStatusCol !== -1 && params.roomStatus) {
            inspSheet
              .getRange(j + 1, inspRoomStatusCol + 1)
              .setValue(sanitizeSpreadsheetInput(String(params.roomStatus)));
          }
          rowUpdated = true;
          break;
        }
      }

      if (!rowUpdated) {
        return { success: false, error: '該当する部屋の検針データが見つかりません' };
      }

      return { success: true, message: '更新しました' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
