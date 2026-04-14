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
      roomSheet.appendRow([propertyId, roomId, roomName]);

      // Diff-insert into inspection_data
      var inspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
      if (inspectionSheet && inspectionSheet.getLastRow() >= 1) {
        var headers = inspectionSheet
          .getRange(1, 1, 1, inspectionSheet.getLastColumn())
          .getValues()[0];

        // Build new row matching inspection_data columns
        // Expected columns: 物件ID, 物件名, 部屋ID, 部屋名, (検針日時以降は空)
        var newRow = new Array(headers.length).fill('');
        var propIdCol = headers.indexOf('物件ID');
        var propNameCol = headers.indexOf('物件名');
        var roomIdCol = headers.indexOf('部屋ID');
        var roomNameCol = headers.indexOf('部屋名');

        if (propIdCol !== -1) newRow[propIdCol] = propertyId;
        if (propNameCol !== -1) newRow[propNameCol] = propertyName;
        if (roomIdCol !== -1) newRow[roomIdCol] = roomId;
        if (roomNameCol !== -1) newRow[roomNameCol] = roomName;

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
 * Get rooms for a property (management view - includes inspection status)
 * @param {string} propertyId - Property ID
 * @returns {Object} { success, data: [{ roomId, roomName, hasInspectionResult }] }
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
        rooms.push({
          propertyId: propertyId,
          roomId: String(roomData[i][1]).trim(),
          roomName: String(roomData[i][2]).trim(),
          hasInspectionResult: false,
        });
      }
    }

    // Check inspection results
    var inspSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
    if (inspSheet && inspSheet.getLastRow() > 1 && rooms.length > 0) {
      var inspHeaders = inspSheet.getRange(1, 1, 1, inspSheet.getLastColumn()).getValues()[0];
      var inspPropIdCol = inspHeaders.indexOf('物件ID');
      var inspRoomIdCol = inspHeaders.indexOf('部屋ID');
      var inspDateCol = inspHeaders.indexOf('検針日時');

      if (inspPropIdCol !== -1 && inspRoomIdCol !== -1 && inspDateCol !== -1) {
        var inspData = inspSheet.getDataRange().getValues();
        for (var j = 1; j < inspData.length; j++) {
          var iPropId = String(inspData[j][inspPropIdCol]).trim();
          var iRoomId = String(inspData[j][inspRoomIdCol]).trim();
          var iDate = inspData[j][inspDateCol];
          if (iPropId === propertyId && iDate) {
            for (var k = 0; k < rooms.length; k++) {
              if (rooms[k].roomId === iRoomId) {
                rooms[k].hasInspectionResult = true;
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
