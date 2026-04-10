/**
 * api_data_functions.gs - 水道検針ライブラリ: API用データ関数群
 * スプレッドシートからのデータ取得とデータ更新処理を管理
 * ライブラリ版 - 外部プロジェクトから利用可能
 */

/**
 * 物件一覧を取得（軽量版）
 * @returns {Array} 物件データの配列
 */
function getProperties() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);

    if (!sheet) {
      return { success: false, error: '物件マスタシートが見つかりません' };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const headers = data[0];
    const properties = data.slice(1).map((row) => {
      const property = {};
      headers.forEach((header, colIndex) => {
        property[header] = row[colIndex];
      });
      return property;
    });
    return { success: true, data: properties };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 部屋一覧取得の内部実装（統合版）
 * getRooms/getRoomsLight両方の処理を統合
 * @param {string} propertyId - 物件ID
 * @param {Object} options - オプション
 * @param {string} options.lastSync - 差分同期用タイムスタンプ（省略時は全件取得）
 * @param {boolean} options.includeMetadata - hasChanges/compression等のメタデータを含める
 * @returns {Object} {success, data}
 */
function _getRoomsImpl(propertyId, options = {}) {
  try {
    if (!propertyId) {
      return { success: false, error: '物件IDが指定されていません' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const propertySheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    const roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);

    // --- Phase 1 fix: add sheet existence check ---
    if (!propertySheet) {
      return { success: false, error: '物件マスタシートが見つかりません' };
    }
    if (!roomSheet) {
      return { success: false, error: '部屋マスタシートが見つかりません' };
    }

    // --- Property info extraction ---
    const propertyData = propertySheet.getDataRange().getValues();
    // --- Phase 1 fix: add empty data guard ---
    if (propertyData.length <= 1) {
      return { success: false, error: '物件マスタにデータがありません' };
    }

    const propertyHeaders = propertyData[0];
    const propertyIdIndex = propertyHeaders.indexOf('物件ID');
    const propertyNameIndex = propertyHeaders.indexOf('物件名');

    // --- Phase 1 fix: add column validation ---
    if (propertyIdIndex === -1) {
      return { success: false, error: '物件マスタに「物件ID」列が見つかりません' };
    }
    if (propertyNameIndex === -1) {
      return { success: false, error: '物件マスタに「物件名」列が見つかりません' };
    }

    const propertyRow = propertyData
      .slice(1)
      .find((row) => String(row[propertyIdIndex]).trim() === String(propertyId).trim());

    if (!propertyRow) {
      return { success: false, error: `物件ID「${propertyId}」が物件マスタに見つかりません` };
    }

    const propertyInfo = {
      id: String(propertyRow[propertyIdIndex]).trim(),
      name: String(propertyRow[propertyNameIndex] || '物件名不明').trim(),
    };

    // --- Room data extraction ---
    const roomData = roomSheet.getDataRange().getValues();
    // --- Phase 1 fix: add empty data guard ---
    if (roomData.length <= 1) {
      return {
        success: true,
        data: {
          property: propertyInfo,
          rooms: [],
          ...(options.includeMetadata
            ? {
                hasChanges: false,
                lastModified: new Date(0).toISOString(),
                totalCount: 0,
              }
            : {}),
        },
      };
    }

    const roomHeaders = roomData[0];
    const roomPropertyIdIndex = roomHeaders.indexOf('物件ID');
    const roomIdIndex = roomHeaders.indexOf('部屋ID');
    const roomNameIndex = roomHeaders.indexOf('部屋名');

    // --- Phase 1 fix: add column validation ---
    if (roomPropertyIdIndex === -1 || roomIdIndex === -1 || roomNameIndex === -1) {
      return {
        success: false,
        error: '部屋マスタに必要な列（物件ID、部屋ID、部屋名）が見つかりません',
      };
    }

    // --- Phase 2: Delta sync support (from getRoomsLight) ---
    const lightFields = getConfig('PERFORMANCE.LIGHT_API.ROOMS_FIELDS', ['部屋ID', '部屋名']);
    const timestampCol = getConfig('PERFORMANCE.DELTA_SYNC.TIMESTAMP_COLUMN', '最終更新日時');
    const timestampIndex = roomHeaders.indexOf(timestampCol);

    const fieldIndexes = {};
    lightFields.forEach((field) => {
      const index = roomHeaders.indexOf(field);
      if (index !== -1) {
        fieldIndexes[field] = index;
      }
    });

    const rooms = [];
    let maxTimestamp = new Date(0);

    for (let i = 1; i < roomData.length; i++) {
      const row = roomData[i];

      if (String(row[roomPropertyIdIndex]).trim() !== String(propertyId).trim()) {
        continue;
      }

      const room = {};
      lightFields.forEach((field) => {
        if (fieldIndexes[field] !== undefined) {
          room[field] = row[fieldIndexes[field]];
        }
      });

      room.id = String(row[roomIdIndex] || '').trim();
      room.name = String(row[roomNameIndex] || '').trim();
      room.readingStatus = 'not-completed';
      room.isCompleted = false;
      room.readingDateFormatted = null;
      room.isNotNeeded = false;

      // Timestamp processing (for delta sync)
      let rowTimestamp = new Date();
      if (timestampIndex !== -1 && row[timestampIndex]) {
        try {
          rowTimestamp = new Date(row[timestampIndex]);
          if (isNaN(rowTimestamp.getTime())) {
            rowTimestamp = new Date();
          }
        } catch (e) {
          rowTimestamp = new Date();
        }
      }

      // Delta sync filtering
      if (options.lastSync) {
        const lastSyncDate = new Date(options.lastSync);
        if (rowTimestamp <= lastSyncDate) {
          continue;
        }
      }

      room.lastModified = rowTimestamp.toISOString();
      rooms.push(room);

      if (rowTimestamp > maxTimestamp) {
        maxTimestamp = rowTimestamp;
      }
    }

    // --- Phase 3: Column-slim inspection_data read ---
    _applyInspectionStatus(ss, propertyId, rooms);

    // --- Build response ---
    const result = {
      property: propertyInfo,
      rooms: rooms,
    };

    if (options.includeMetadata) {
      result.hasChanges = rooms.length > 0;
      result.lastModified = maxTimestamp.toISOString();
      result.totalCount = rooms.length;
      result.compression = Math.round(
        (1 -
          JSON.stringify({ property: propertyInfo, rooms: rooms }).length /
            JSON.stringify(roomData).length) *
          100
      );
    }

    return { success: true, data: result };
  } catch (error) {
    Logger.log(`[getRooms] エラー: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * inspection_dataから検針完了状況と検針不要フラグを部屋データに反映
 * Phase 3: 列スリム読込を実装（5列のみ読込）
 * @param {Spreadsheet} ss - スプレッドシートオブジェクト
 * @param {string} propertyId - 物件ID
 * @param {Array} rooms - 部屋データ配列（参照渡しで更新）
 */
function _applyInspectionStatus(ss, propertyId, rooms) {
  const inspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);
  if (!inspectionSheet) {
    Logger.log('[getRooms] inspection_dataシートが見つかりません（部屋一覧は継続）');
    return;
  }

  try {
    // --- Phase 3: Column-slim read ---
    // Only read the 5 columns we need: 物件ID(C=3), 部屋ID(D=4), 検針日時(F=6), 今回の指示数(J=10), 検針不要(N=14)
    // Columns are 1-indexed in GAS getRange: C=3, D=4, F=6, J=10, N=14
    // We read from column 3 to column 14 (12 columns) to get all needed fields in one contiguous range
    const lastRow = inspectionSheet.getLastRow();
    if (lastRow <= 1) return; // Only headers or empty

    const inspectionData = inspectionSheet.getRange(1, 3, lastRow, 12).getValues();
    // Within this sub-range:
    // Index 0 = column C (物件ID)
    // Index 1 = column D (部屋ID)
    // Index 3 = column F (検針日時)
    // Index 7 = column J (今回の指示数)
    // Index 11 = column N (検針不要)

    if (inspectionData.length <= 1) return;

    // Map sub-range column headers to confirm positions
    const inspHeaders = inspectionData[0];
    const inspPropertyIdIndex = inspHeaders.indexOf('物件ID');
    const inspRoomIdIndex = inspHeaders.indexOf('部屋ID');
    const inspValueIndex = inspHeaders.indexOf('今回の指示数');
    const inspDateIndex = inspHeaders.indexOf('検針日時');
    const inspNotNeededIndex = inspHeaders.indexOf('検針不要');

    if (inspPropertyIdIndex === -1 || inspRoomIdIndex === -1 || inspValueIndex === -1) {
      Logger.log('[getRooms] inspection_dataの必要な列が見つかりません');
      return;
    }

    const readingMap = new Map();
    const notNeededMap = new Map();

    inspectionData.slice(1).forEach((row) => {
      if (String(row[inspPropertyIdIndex]).trim() === String(propertyId).trim()) {
        const roomIdRaw = String(row[inspRoomIdIndex]).trim();

        // 部屋ID正規化（R000001 → R001等）
        let roomId = roomIdRaw;
        if (roomIdRaw.startsWith('R') && roomIdRaw.length > 4) {
          const numPart = roomIdRaw.substring(1);
          const normalizedNum = String(parseInt(numPart, 10)).padStart(3, '0');
          roomId = 'R' + normalizedNum;
        }

        // 検針完了データ確認
        if (
          row[inspValueIndex] !== null &&
          row[inspValueIndex] !== undefined &&
          String(row[inspValueIndex]).trim() !== ''
        ) {
          let readingDateFormatted = null;
          if (inspDateIndex !== -1 && row[inspDateIndex]) {
            try {
              const dateStr = String(row[inspDateIndex]).trim();
              if (dateStr) {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  readingDateFormatted = `${date.getMonth() + 1}月${date.getDate()}日`;
                }
              }
            } catch (e) {
              Logger.log(`[getRooms] 日付変換エラー: ${e.message}`);
            }
          }

          if (!readingDateFormatted) {
            const today = new Date();
            readingDateFormatted = `${today.getMonth() + 1}月${today.getDate()}日`;
          }

          readingMap.set(roomId, readingDateFormatted);
        }

        // 検針不要フラグ確認
        if (inspNotNeededIndex !== -1) {
          const notNeededValue = row[inspNotNeededIndex];
          if (notNeededValue !== null && notNeededValue !== undefined) {
            const notNeededStr = String(notNeededValue).trim().toLowerCase();
            const isNotNeeded =
              notNeededStr !== '' &&
              (notNeededStr === 'true' ||
                notNeededStr === '1' ||
                notNeededStr === 'yes' ||
                notNeededStr === 'on' ||
                notNeededStr === '○' ||
                notNeededStr === 'x' ||
                notNeededStr === '×');

            notNeededMap.set(roomId, isNotNeeded);
          }
        }
      }
    });

    // 部屋データに検針状況を反映
    rooms.forEach((room) => {
      if (readingMap.has(room.id)) {
        room.readingStatus = 'completed';
        room.isCompleted = true;
        room.readingDateFormatted = readingMap.get(room.id);
      }

      if (notNeededMap.has(room.id)) {
        room.isNotNeeded = notNeededMap.get(room.id);
        if (room.isNotNeeded) {
          room.readingStatus = 'not-needed';
        }
      } else {
        room.isNotNeeded = false;
      }
    });
  } catch (inspectionError) {
    Logger.log(
      `[getRooms] inspection_data読み込みエラー（部屋一覧は継続）: ${inspectionError.message}`
    );
  }
}

/**
 * 指定物件の部屋一覧を取得
 * @param {string} propertyId - 物件ID
 * @returns {Object} {success, data: {property, rooms}}
 */
function getRooms(propertyId) {
  return _getRoomsImpl(propertyId, { includeMetadata: false });
}

/**
 * 指定物件の部屋一覧を取得（軽量版・差分同期対応）
 * @param {string} propertyId - 物件ID
 * @param {string} lastSync - 最終同期日時（ISO形式、省略可）
 * @returns {Object} {success, data: {property, rooms, hasChanges, lastModified, totalCount, compression}}
 */
function getRoomsLight(propertyId, lastSync = null) {
  return _getRoomsImpl(propertyId, { lastSync: lastSync, includeMetadata: true });
}

/**
 * 指定された物件・部屋の検針データと名称を一括取得する（統合版）
 * inspection_dataから物件名・部屋名・検針データを一括取得し、
 * 名称が取得できない場合はマスタシートからフォールバック
 * @param {string} propertyId - 物件ID
 * @param {string} roomId - 部屋ID
 * @returns {Object} {propertyName, roomName, readings} 形式のオブジェクト
 */
function getMeterReadings(propertyId, roomId) {
  try {
    if (!propertyId || !roomId) {
      return { success: false, error: '物件IDと部屋IDが必要です' };
    }

    const CACHE_TTL = 300;
    const cacheKey = 'mr_idx_' + propertyId;
    let roomIndex = getFastCache(cacheKey);

    if (!roomIndex) {
      Logger.log('[getMeterReadings] キャッシュミス - インデックス構築開始');
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const inspectionSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);

      if (!inspectionSheet) {
        return { success: false, error: 'inspection_dataシートが見つかりません' };
      }

      const inspectionData = inspectionSheet.getDataRange().getValues();
      if (inspectionData.length <= 1) {
        const fallbackNames = getFallbackNames(propertyId, roomId);
        return {
          success: true,
          propertyName: fallbackNames.propertyName,
          roomName: fallbackNames.roomName,
          readings: [],
        };
      }

      const headers = inspectionData[0];
      const propertyIdCol = headers.indexOf('物件ID');
      const roomIdCol = headers.indexOf('部屋ID');

      if (propertyIdCol === -1 || roomIdCol === -1) {
        return { success: false, error: '必要な列（物件ID、部屋ID）が見つかりません' };
      }

      roomIndex = {};
      for (let i = 1; i < inspectionData.length; i++) {
        const row = inspectionData[i];
        const rowPropId = String(row[propertyIdCol]).trim();
        const rowRoomId = String(row[roomIdCol]).trim();

        if (rowPropId && !roomIndex[rowPropId]) {
          roomIndex[rowPropId] = {};
        }
        if (rowPropId && rowRoomId) {
          if (!roomIndex[rowPropId][rowRoomId]) {
            roomIndex[rowPropId][rowRoomId] = [];
          }
          const reading = {};
          headers.forEach(function (header, index) {
            reading[header] = row[index];
          });
          roomIndex[rowPropId][rowRoomId].push(reading);
        }
      }

      setFastCache(cacheKey, roomIndex, CACHE_TTL);
    }

    const propertyIndex = roomIndex[propertyId];
    if (!propertyIndex || !propertyIndex[roomId]) {
      const fbNames = getFallbackNames(propertyId, roomId);
      return {
        success: true,
        propertyName: fbNames.propertyName,
        roomName: fbNames.roomName,
        readings: [],
      };
    }

    const readings = propertyIndex[roomId];

    let propertyName = '';
    let roomName = '';
    if (readings.length > 0) {
      propertyName = readings[0]['物件名'] || '';
      roomName = readings[0]['部屋名'] || '';
    }

    if (!propertyName || !roomName) {
      const fallbackNames2 = getFallbackNames(propertyId, roomId);
      if (!propertyName) propertyName = fallbackNames2.propertyName;
      if (!roomName) roomName = fallbackNames2.roomName;
    }

    return {
      success: true,
      propertyName: propertyName,
      roomName: roomName,
      readings: readings,
    };
  } catch (error) {
    Logger.log('[getMeterReadings] エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * マスタシートから物件名・部屋名をフォールバック取得
 * @param {string} propertyId - 物件ID
 * @param {string} roomId - 部屋ID
 * @returns {Object} {propertyName, roomName}
 */
function getFallbackNames(propertyId, roomId) {
  let propertyName = '';
  let roomName = '';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 物件名を物件マスタから取得
    const propertySheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);
    if (propertySheet) {
      const propertyData = propertySheet.getDataRange().getValues();
      if (propertyData.length > 1) {
        const propertyHeaders = propertyData[0];
        const propertyIdIndex = propertyHeaders.indexOf('物件ID');
        const propertyNameIndex = propertyHeaders.indexOf('物件名');

        if (propertyIdIndex >= 0 && propertyNameIndex >= 0) {
          const propertyRow = propertyData
            .slice(1)
            .find((row) => String(row[propertyIdIndex]).trim() === String(propertyId).trim());
          if (propertyRow) {
            propertyName = propertyRow[propertyNameIndex] || '';
          }
        }
      }
    }

    // 部屋名を部屋マスタから取得
    const roomSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.ROOM_MASTER);
    if (roomSheet) {
      const roomData = roomSheet.getDataRange().getValues();
      if (roomData.length > 1) {
        const roomHeaders = roomData[0];
        const roomPropertyIdIndex = roomHeaders.indexOf('物件ID');
        const roomIdIndex = roomHeaders.indexOf('部屋ID');
        const roomNameIndex = roomHeaders.indexOf('部屋名');

        if (roomPropertyIdIndex >= 0 && roomIdIndex >= 0 && roomNameIndex >= 0) {
          const roomRow = roomData
            .slice(1)
            .find(
              (row) =>
                String(row[roomPropertyIdIndex]).trim() === String(propertyId).trim() &&
                String(row[roomIdIndex]).trim() === String(roomId).trim()
            );
          if (roomRow) {
            roomName = roomRow[roomNameIndex] || '';
          }
        }
      }
    }
  } catch (error) {
    Logger.log(`[getFallbackNames] エラー: ${error.message}`);
  }

  return {
    propertyName: propertyName,
    roomName: roomName,
  };
}

/**
 * 検針データを更新（軽量版）
 * @param {string} propertyId - 物件ID
 * @param {string} roomId - 部屋ID
 * @param {Array} readings - 更新する検針データ
 * @return {Object} 更新結果
 */
function updateMeterReadings(propertyId, roomId, readings, options = {}) {
  const lock = LockService.getScriptLock();
  try {
    if (!propertyId || !roomId || !Array.isArray(readings) || readings.length === 0) {
      return { success: false, error: '無効なパラメータ' };
    }

    // 排他制御: ロック取得（30秒タイムアウト）
    try {
      lock.waitLock(30000);
    } catch (lockError) {
      return {
        success: false,
        error: '他の処理が実行中です。しばらく待ってから再試行してください。',
        timestamp: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss'),
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.INSPECTION_DATA);

    if (!sheet) {
      throw new Error('inspection_dataシートが見つかりません');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // 必要な列インデックスを取得
    const colIndexes = {
      propertyId: headers.indexOf('物件ID'),
      roomId: headers.indexOf('部屋ID'),
      date: headers.indexOf('検針日時'),
      currentReading:
        headers.indexOf('今回の指示数') >= 0
          ? headers.indexOf('今回の指示数')
          : headers.indexOf('今回指示数（水道）'),
      previousReading: headers.indexOf('前回指示数'),
      previousPreviousReading: headers.indexOf('前々回指示数'),
      threeTimesPreviousReading: headers.indexOf('前々々回指示数'),
      usage: headers.indexOf('今回使用量'),
      warningFlag: headers.indexOf('警告フラグ'),
      standardDeviation: headers.indexOf('標準偏差値'),
    };

    // 警告フラグ列が存在しない場合のエラーハンドリング
    if (colIndexes.warningFlag === -1) {
      Logger.log(`[updateMeterReadings] ❌ 警告フラグ列が見つかりません！`);
      return { success: false, error: '警告フラグ列が見つかりません' };
    }

    // 必須列の存在確認
    if (
      colIndexes.propertyId === -1 ||
      colIndexes.roomId === -1 ||
      colIndexes.date === -1 ||
      colIndexes.currentReading === -1
    ) {
      return {
        success: false,
        error: `必要な列が見つかりません。利用可能な列: ${headers.join(', ')}`,
      };
    }

    let updatedRowCount = 0;
    const now = new Date();

    readings.forEach((reading, readingIndex) => {
      const currentValue = parseFloat(reading.currentReading) || 0;

      // 警告フラグを確実に受信
      const receivedWarningFlag = reading.warningFlag || '正常';

      // JST日付を正規化
      const normalizedDate = reading.date ? normalizeToJSTDate(reading.date) : getCurrentJSTDate();

      // 既存データを検索
      const existingRowIndex = data.findIndex(
        (row, index) =>
          index > 0 &&
          String(row[colIndexes.propertyId]).trim() === String(propertyId).trim() &&
          String(row[colIndexes.roomId]).trim() === String(roomId).trim()
      );

      if (existingRowIndex >= 0) {
        // 既存データ更新

        const previousReading = parseFloat(data[existingRowIndex][colIndexes.previousReading]) || 0;
        const usage =
          previousReading > 0 ? Math.max(0, currentValue - previousReading) : currentValue;

        // 標準偏差をバックエンドで計算
        let calculatedStandardDeviation = 0;
        if (colIndexes.standardDeviation >= 0) {
          const previousPreviousReading =
            parseFloat(data[existingRowIndex][colIndexes.previousPreviousReading]) || 0;
          const threeTimesPreviousReading =
            parseFloat(data[existingRowIndex][colIndexes.threeTimesPreviousReading]) || 0;
          const thresholdInfo = calculateThreshold(
            previousReading,
            previousPreviousReading,
            threeTimesPreviousReading
          );
          calculatedStandardDeviation = thresholdInfo.standardDeviation;
        }

        // データ更新
        data[existingRowIndex][colIndexes.date] = normalizedDate;
        data[existingRowIndex][colIndexes.currentReading] = currentValue;
        if (colIndexes.usage >= 0) data[existingRowIndex][colIndexes.usage] = usage;

        // ✅ 警告フラグを確実にG列に保存
        data[existingRowIndex][colIndexes.warningFlag] = receivedWarningFlag;

        // 標準偏差を保存
        if (colIndexes.standardDeviation >= 0) {
          data[existingRowIndex][colIndexes.standardDeviation] = calculatedStandardDeviation;
        }
      } else {
        // 新規データ作成

        const newRow = new Array(headers.length).fill('');

        newRow[colIndexes.propertyId] = propertyId;
        newRow[colIndexes.roomId] = roomId;
        newRow[colIndexes.date] = normalizedDate;
        newRow[colIndexes.currentReading] = currentValue;
        if (colIndexes.usage >= 0) newRow[colIndexes.usage] = currentValue;

        // ✅ 警告フラグを確実にG列に設定
        newRow[colIndexes.warningFlag] = receivedWarningFlag;

        // 新規データの標準偏差は0
        if (colIndexes.standardDeviation >= 0) {
          newRow[colIndexes.standardDeviation] = 0;
        }

        data.push(newRow);
      }

      updatedRowCount++;
    });

    // シートに一括書き込み（安全な上書き方式）
    if (updatedRowCount > 0) {
      // 安全な上書き: clear()を使わず直接setValuesで上書き
      sheet.getRange(1, 1, data.length, headers.length).setValues(data);
      // 余剰行があればクリア
      const lastRow = sheet.getLastRow();
      if (lastRow > data.length) {
        sheet.getRange(data.length + 1, 1, lastRow - data.length, headers.length).clearContent();
      }
    }

    if (!options.skipCacheInvalidation) {
      invalidateFastCache('mr_idx_' + propertyId);
    }

    return {
      success: true,
      message: `${updatedRowCount}件の検針データを正常に更新しました`,
      timestamp: Utilities.formatDate(now, 'JST', 'yyyy-MM-dd HH:mm:ss'),
      updatedRows: updatedRowCount,
      details: readings.map((r) => ({
        date: r.date,
        currentReading: r.currentReading,
        warningFlag: r.warningFlag || '正常',
      })),
      debugInfo: {
        warningFlagColumnExists: colIndexes.warningFlag >= 0,
        warningFlagColumnIndex: colIndexes.warningFlag,
        standardDeviationColumnExists: colIndexes.standardDeviation >= 0,
        standardDeviationColumnIndex: colIndexes.standardDeviation,
        totalColumns: headers.length,
        headers: headers,
        processedData: readings.map((r, i) => ({
          index: i,
          receivedWarningFlag: r.warningFlag || '正常',
          processedSuccessfully: true,
        })),
      },
    };
  } catch (error) {
    Logger.log(`[updateMeterReadings] ❌ エラー: ${error.message}`);
    Logger.log(`[updateMeterReadings] ❌ エラースタック:`, error.stack);
    return {
      success: false,
      error: error.message,
      timestamp: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss'),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {
      Logger.log('[updateMeterReadings] Lock release warning: ' + e.message);
    }
  }
}

/**
 * 物件の検針完了日を更新する関数（シンプル版）
 * @param {string} propertyId - 物件ID
 * @param {string} completionDate - 完了日（YYYY-MM-DD形式、省略時は現在日付）
 * @returns {Object} 更新結果
 */
function completePropertyInspectionSimple(propertyId, completionDate) {
  try {
    if (!propertyId) {
      throw new Error('物件IDが指定されていません');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROPERTY_MASTER);

    if (!sheet) {
      throw new Error('物件マスタシートが見つかりません');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      throw new Error('物件マスタにデータがありません');
    }

    const headers = data[0];
    const propertyIdCol = headers.indexOf('物件ID');
    const completionDateCol = headers.indexOf('検針完了日');

    if (propertyIdCol === -1) {
      throw new Error('物件IDカラムが見つかりません');
    }
    if (completionDateCol === -1) {
      throw new Error('検針完了日カラムが見つかりません');
    }

    // 対象物件の行を検索
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][propertyIdCol]).trim() === String(propertyId).trim()) {
        targetRow = i;
        break;
      }
    }

    if (targetRow === -1) {
      throw new Error(`物件ID「${propertyId}」が見つかりません`);
    }

    // 完了日の準備（YYYY-MM-DD形式）
    let saveDate = '';
    if (completionDate) {
      // 形式チェック
      if (/^\d{4}-\d{2}-\d{2}$/.test(completionDate)) {
        saveDate = completionDate;
      } else {
        // 変換を試行
        const d = new Date(completionDate);
        if (!isNaN(d.getTime())) {
          saveDate = Utilities.formatDate(d, 'JST', 'yyyy-MM-dd');
        } else {
          throw new Error('completionDateの形式が不正です');
        }
      }
    } else {
      // 指定がなければ現在日付
      const now = new Date();
      saveDate = Utilities.formatDate(now, 'JST', 'yyyy-MM-dd');
    }

    // スプレッドシートに書き込み
    const targetCell = sheet.getRange(targetRow + 1, completionDateCol + 1);
    targetCell.setValue(saveDate);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: `物件 ${propertyId} の検針完了日を ${saveDate} で保存しました`,
      propertyId: propertyId,
      completionDate: saveDate,
      apiVersion: 'v2.9.0-simple-completion',
    };
  } catch (error) {
    console.error(`[検針完了] エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      propertyId: propertyId,
    };
  }
}

/**
 * 部屋IDの妥当性を検証
 * @param {string} propertyId - 物件ID
 * @param {string} roomId - 部屋ID
 * @returns {boolean} 妥当性
 */
function validateRoomId(propertyId, roomId) {
  try {
    if (!propertyId || !roomId) return false;

    const roomResult = getRooms(propertyId);
    if (!roomResult.success || !roomResult.data) return false;
    return roomResult.data.rooms.some((room) => String(room.id).trim() === String(roomId).trim());
  } catch (error) {
    return false;
  }
}

/**
 * スプレッドシート情報を取得
 * @returns {Object} スプレッドシート情報
 */
function getSpreadsheetInfo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets().map((sheet) => ({
      name: sheet.getName(),
      rows: sheet.getLastRow(),
      cols: sheet.getLastColumn(),
    }));

    return {
      success: true,
      spreadsheetId: ss.getId(),
      name: ss.getName(),
      sheets: sheets,
      url: ss.getUrl(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 閾値情報を履歴データのみで計算する関数（今回指示数不要）
 * @param {number} previousReading - 前回指示数
 * @param {number} previousPreviousReading - 前々回指示数
 * @param {number} threeTimesPreviousReading - 前々々回指示数
 * @returns {Object} 閾値と標準偏差の情報
 */
function calculateThreshold(previousReading, previousPreviousReading, threeTimesPreviousReading) {
  try {
    // 履歴データの準備（指示数ベース）
    const readingHistory = [];

    // 前回、前々回、前々々回の指示数を履歴に追加
    if (typeof previousReading === 'number' && !isNaN(previousReading) && previousReading >= 0) {
      readingHistory.push(previousReading);
    }
    if (
      typeof previousPreviousReading === 'number' &&
      !isNaN(previousPreviousReading) &&
      previousPreviousReading >= 0
    ) {
      readingHistory.push(previousPreviousReading);
    }
    if (
      typeof threeTimesPreviousReading === 'number' &&
      !isNaN(threeTimesPreviousReading) &&
      threeTimesPreviousReading >= 0
    ) {
      readingHistory.push(threeTimesPreviousReading);
    }

    // 履歴データが2件未満の場合は標準偏差計算不可
    if (readingHistory.length < 2) {
      return {
        standardDeviation: 0,
        threshold: 0,
        reason: '履歴データ不足',
        isCalculable: false,
      };
    }

    // STDEV.S準拠の標準偏差を計算
    const average = calculateAVERAGE(readingHistory);
    const standardDeviation = calculateSTDEV_S(readingHistory);

    // 閾値計算：前回値 + 標準偏差 + 10（標準偏差は既に整数）
    const threshold = previousReading + standardDeviation + 10;

    return {
      standardDeviation: standardDeviation, // 既に整数
      threshold: threshold, // 整数値
      reason: `前回値${previousReading} + σ${standardDeviation} + 10`,
      isCalculable: true,
    };
  } catch (error) {
    Logger.log(`[calculateThreshold] エラー: ${error.message}`);
    return {
      standardDeviation: 0,
      threshold: 0,
      reason: 'エラー',
      isCalculable: false,
    };
  }
}

/**
 * 警告フラグを計算する関数（指示数ベース・STDEV.S準拠）
 * @param {number} currentReading - 今回指示数
 * @param {number} previousReading - 前回指示数
 * @param {number} previousPreviousReading - 前々回指示数
 * @param {number} threeTimesPreviousReading - 前々々回指示数
 * @returns {Object} 標準偏差と警告フラグの結果
 */
function calculateWarningFlag(
  currentReading,
  previousReading,
  previousPreviousReading,
  threeTimesPreviousReading
) {
  try {
    // まず閾値情報を履歴データのみで計算（今回指示数不要）
    const thresholdInfo = calculateThreshold(
      previousReading,
      previousPreviousReading,
      threeTimesPreviousReading
    );

    // 今回指示数が無効な場合は入力待ち状態を表示
    if (typeof currentReading !== 'number' || isNaN(currentReading) || currentReading < 0) {
      return {
        warningFlag: thresholdInfo.isCalculable ? '入力待ち' : '判定不可',
        standardDeviation: thresholdInfo.standardDeviation,
        threshold: thresholdInfo.threshold,
        reason: thresholdInfo.reason,
      };
    }

    // 前回指示数との比較：今回が前回未満の場合は即「要確認」
    if (typeof previousReading === 'number' && !isNaN(previousReading) && previousReading >= 0) {
      if (currentReading < previousReading) {
        Logger.log(
          `[calculateWarningFlag] 今回指示数(${currentReading})が前回値(${previousReading})未満のため要確認`
        );
        return {
          warningFlag: '要確認',
          standardDeviation: thresholdInfo.standardDeviation,
          threshold: thresholdInfo.threshold,
          reason: '前回値未満',
        };
      }
    }

    // 履歴データ不足の場合
    if (!thresholdInfo.isCalculable) {
      return {
        warningFlag: '正常',
        standardDeviation: 0,
        threshold: 0,
        reason: thresholdInfo.reason,
      };
    }

    // 警告フラグを判定：今回指示数が閾値を超えた場合のみ「要確認」
    const warningFlag = currentReading > thresholdInfo.threshold ? '要確認' : '正常';

    return {
      warningFlag: warningFlag,
      standardDeviation: thresholdInfo.standardDeviation,
      threshold: thresholdInfo.threshold,
      reason: thresholdInfo.reason,
    };
  } catch (error) {
    Logger.log(`[calculateWarningFlag] エラー: ${error.message}`);
    return {
      warningFlag: 'エラー',
      standardDeviation: 0,
      threshold: 0,
      reason: 'エラー',
    };
  }
}

/**
 * STDEV.S関数相当の標準偏差を計算（標本標準偏差：n-1で割る）
 * @param {number[]} values - 数値の配列
 * @returns {number} 標準偏差（STDEV.S相当、整数値）
 */
function calculateSTDEV_S(values) {
  if (!values || values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1); // n-1で割る
  return Math.round(Math.sqrt(variance)); // 整数に丸める
}

/**
 * AVERAGE関数相当の平均値を計算
 * @param {number[]} values - 数値の配列
 * @returns {number} 平均値
 */
function calculateAVERAGE(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 日本時間（JST）でYYYY-MM-DD形式に正規化（最適化版）
 * @param {string|Date} dateValue - 正規化する日付値
 * @returns {string} YYYY-MM-DD形式の日付文字列（JST基準）
 */
function normalizeToJSTDate(dateValue) {
  if (!dateValue) return '';

  try {
    let date;

    // 文字列の場合
    if (typeof dateValue === 'string') {
      // 既にYYYY-MM-DD形式の場合
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateValue;
      }
      date = new Date(dateValue);
    }
    // Dateオブジェクトの場合
    else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      Logger.log(`[normalizeToJSTDate] 未対応の型: ${typeof dateValue}`);
      return '';
    }

    // 有効な日付かチェック
    if (isNaN(date.getTime())) {
      Logger.log(`[normalizeToJSTDate] 無効な日付: ${dateValue}`);
      return '';
    }

    // Google Apps Script推奨: Utilities.formatDateを使用
    const jstDateString = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');

    return jstDateString;
  } catch (error) {
    Logger.log(`[normalizeToJSTDate] エラー: ${error.message}, 入力値: ${dateValue}`);
    return '';
  }
}

/**
 * 現在のJST日付を取得（最適化版）
 * @returns {string} YYYY-MM-DD形式の今日の日付（JST）
 */
function getCurrentJSTDate() {
  const now = new Date();
  // Google Apps Script推奨: Utilities.formatDateを使用
  const jstDateString = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd');

  return jstDateString;
}

// ═══════════════════════════════════════════════════════
// Phase 2.1 - 統合API実装 (saveAndNavigate)
// ナビゲーション高速化プロジェクト
// ═══════════════════════════════════════════════════════

/**
 * 統合API: 検針データ保存とナビゲーションデータ取得を1回のAPI呼び出しで実行
 * Phase 2.1 - 基本実装: 保存と取得を統合した高速化API
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} 統合レスポンス
 */
function saveAndNavigate(params) {
  const startTime = Date.now();
  const timeout = parseInt(params.timeout) || 30000; // デフォルト30秒

  try {
    // Phase 2.3: 既存API互換性確保 - バージョン情報追加
    const apiVersion = 'v1.0.0-integrated';
    const compatibilityMode = params.compatibilityMode || 'strict';

    // 1. パラメータ検証（タイムアウト監視付き）
    if (Date.now() - startTime > timeout * 0.1) {
      // 10%でタイムアウト警告
    }

    const validationResult = validateSaveAndNavigateParams(params);
    if (!validationResult.success) {
      return createErrorResponse('VALIDATION_ERROR', validationResult.error, {
        processingTime: Date.now() - startTime,
        apiVersion: apiVersion,
        timeoutRemaining: timeout - (Date.now() - startTime),
      });
    }

    // 2. データ保存処理（タイムアウト監視付き）
    const saveStartTime = Date.now();
    const saveTimeLimit = timeout * 0.6; // 60%を保存処理に割当

    if (Date.now() - startTime > saveTimeLimit) {
    }

    const saveResult = performSaveOperation(params);
    const saveOperationTime = Date.now() - saveStartTime;

    if (!saveResult.success) {
      return createErrorResponse('SAVE_FAILED', saveResult.error, {
        saveResult,
        processingTime: Date.now() - startTime,
        apiVersion: apiVersion,
        operationBreakdown: {
          saveTime: saveOperationTime,
          totalTime: Date.now() - startTime,
        },
      });
    }

    // 3. ナビゲーションデータ取得（残り時間監視付き）
    const navStartTime = Date.now();
    const remainingTime = timeout - (Date.now() - startTime);

    if (remainingTime < timeout * 0.2) {
      // 20%未満で警告
    }

    const navigationResult = performNavigationOperation(params, null, null, null);
    const navOperationTime = Date.now() - navStartTime;

    if (!navigationResult.success) {
      // 保存は成功したが取得が失敗した場合の部分的成功
      return createPartialSuccessResponse(saveResult, navigationResult.error, {
        processingTime: Date.now() - startTime,
        apiVersion: apiVersion,
        operationBreakdown: {
          saveTime: saveOperationTime,
          navigationTime: navOperationTime,
          totalTime: Date.now() - startTime,
        },
      });
    }

    // 4. 成功レスポンス作成（Phase 2.3: 詳細メタデータ付き）
    const totalProcessingTime = Date.now() - startTime;

    const response = createSuccessResponse(saveResult, navigationResult, totalProcessingTime);

    // Phase 2.3: 互換性情報の追加
    response.apiVersion = apiVersion;
    response.compatibilityMode = compatibilityMode;
    response.performance = {
      totalTime: totalProcessingTime,
      breakdown: {
        validation: saveStartTime - startTime,
        saveOperation: saveOperationTime,
        navigationOperation: navOperationTime,
        responseGeneration: Date.now() - (navStartTime + navOperationTime),
      },
      timeoutUsage: `${Math.round((totalProcessingTime / timeout) * 100)}%`,
      efficiency:
        totalProcessingTime < timeout * 0.5
          ? 'excellent'
          : totalProcessingTime < timeout * 0.8
            ? 'good'
            : 'acceptable',
    };

    return response;
  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    Logger.log('[saveAndNavigate] ❌ 予期しないエラー: ' + error.toString());
    Logger.log('[saveAndNavigate] エラースタック:', error.stack);

    return createErrorResponse('SYSTEM_ERROR', error.message, {
      processingTime: totalProcessingTime,
      apiVersion: 'v1.0.0-integrated',
      errorDetails: {
        timeoutExceeded: totalProcessingTime > timeout,
      },
    });
  }
}

/**
 * saveAndNavigate用パラメータ検証
 * @param {Object} params - 検証対象パラメータ
 * @returns {Object} 検証結果
 */
function validateSaveAndNavigateParams(params) {
  try {
    // 基本パラメータ存在確認
    const required = [
      'action',
      'propertyId',
      'currentRoomId',
      'targetRoomId',
      'direction',
      'meterReadingsData',
    ];
    const missing = [];

    for (const field of required) {
      if (!params[field]) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return {
        success: false,
        error: `必須パラメータが不足: ${missing.join(', ')}`,
        details: {
          missingFields: missing,
          receivedParams: Object.keys(params),
        },
      };
    }

    // 物件ID形式検証（Phase 2.2: 強化されたバリデーション）
    if (!/^P\d{6}$/.test(params.propertyId)) {
      return {
        success: false,
        error: '物件IDの形式が正しくありません（P000001 形式である必要があります）',
        details: {
          receivedPropertyId: params.propertyId,
          expectedFormat: 'P000001',
        },
      };
    }

    // 部屋ID形式検証
    if (!/^R\d{3,6}$/.test(params.currentRoomId) || !/^R\d{3,6}$/.test(params.targetRoomId)) {
      return {
        success: false,
        error: '部屋IDの形式が正しくありません（R001 形式である必要があります）',
        details: {
          currentRoomId: params.currentRoomId,
          targetRoomId: params.targetRoomId,
          expectedFormat: 'R001',
        },
      };
    }

    // direction値の検証
    if (!['next', 'prev'].includes(params.direction)) {
      return {
        success: false,
        error: 'direction は "next" または "prev" である必要があります',
        details: {
          receivedDirection: params.direction,
          allowedValues: ['next', 'prev'],
        },
      };
    }

    // JSON文字列の詳細検証
    let readings;
    try {
      readings = JSON.parse(params.meterReadingsData);

      if (!Array.isArray(readings)) {
        return {
          success: false,
          error: 'meterReadingsData は配列のJSON文字列である必要があります',
          details: {
            receivedType: typeof readings,
            expectedType: 'array',
          },
        };
      }

      if (readings.length === 0) {
        return {
          success: false,
          error: 'meterReadingsData には少なくとも1つの検針データが必要です',
          details: {
            arrayLength: readings.length,
          },
        };
      }

      // 各検針データの必須フィールド確認
      const requiredReadingFields = ['date', 'currentReading'];
      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        for (const field of requiredReadingFields) {
          if (reading[field] === undefined || reading[field] === null) {
            return {
              success: false,
              error: `検針データ[${i}]に必須フィールド「${field}」がありません`,
              details: {
                readingIndex: i,
                missingField: field,
                receivedReading: reading,
              },
            };
          }
        }

        // 指示数の数値検証
        const currentReading = parseFloat(reading.currentReading);
        if (isNaN(currentReading) || currentReading < 0) {
          return {
            success: false,
            error: `検針データ[${i}]の今回指示数が無効です（0以上の数値である必要があります）`,
            details: {
              readingIndex: i,
              receivedValue: reading.currentReading,
              parsedValue: currentReading,
            },
          };
        }
      }
    } catch (parseError) {
      return {
        success: false,
        error: `meterReadingsData のJSON解析エラー: ${parseError.message}`,
        details: {
          parseError: parseError.message,
          receivedData: params.meterReadingsData?.substring(0, 100) + '...', // 最初の100文字のみ
        },
      };
    }

    // タイムアウト設定の検証（オプション）
    if (params.timeout !== undefined) {
      const timeout = parseInt(params.timeout);
      if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
        return {
          success: false,
          error: 'timeoutは1000-300000の範囲の数値である必要があります',
          details: {
            receivedTimeout: params.timeout,
            allowedRange: '1000-300000ms',
          },
        };
      }
    }

    return {
      success: true,
      validatedData: {
        readingsCount: readings.length,
        timeout: params.timeout || 30000,
      },
    };
  } catch (error) {
    Logger.log(`[validateSaveAndNavigateParams] 予期しないエラー: ${error.message}`);
    return {
      success: false,
      error: `パラメータ検証エラー: ${error.message}`,
    };
  }
}

/**
 * 保存処理実行
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} 保存結果
 */
function performSaveOperation(params, saveOptions = {}) {
  const { propertyId, currentRoomId, meterReadingsData } = params;
  const operationStartTime = Date.now();

  try {
    // JSON文字列をパース
    let readings;
    try {
      readings = JSON.parse(meterReadingsData);
    } catch (parseError) {
      Logger.log(`[performSaveOperation] JSON解析失敗: ${parseError.message}`);
      return {
        success: false,
        error: `検針データの解析に失敗しました: ${parseError.message}`,
        errorType: 'PARSE_ERROR',
        details: {
          originalData: meterReadingsData?.substring(0, 200) + '...',
          parseError: parseError.message,
        },
      };
    }

    // データ存在確認（Phase 2.2: 詳細チェック）
    if (!Array.isArray(readings) || readings.length === 0) {
      return {
        success: false,
        error: '保存対象の検針データがありません',
        errorType: 'NO_DATA_ERROR',
        details: {
          dataType: typeof readings,
          dataLength: Array.isArray(readings) ? readings.length : 'not-array',
        },
      };
    }

    // 事前データ整合性チェック
    const validationErrors = [];
    readings.forEach((reading, index) => {
      if (!reading.date || !reading.currentReading) {
        validationErrors.push(`データ[${index}]: 日付または指示数が不足`);
      }

      const currentReading = parseFloat(reading.currentReading);
      if (isNaN(currentReading) || currentReading < 0) {
        validationErrors.push(`データ[${index}]: 指示数が無効 (${reading.currentReading})`);
      }
    });

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `検針データに不正な値があります: ${validationErrors.join(', ')}`,
        errorType: 'VALIDATION_ERROR',
        details: {
          validationErrors: validationErrors,
          affectedReadings: readings.length,
        },
      };
    }

    // 既存の updateMeterReadings ロジックを再利用（詳細エラー監視）
    const result = updateMeterReadings(propertyId, currentRoomId, readings, saveOptions);
    const operationDuration = Date.now() - operationStartTime;

    if (result && result.success) {
      return {
        success: true,
        updatedCount: result.updatedRows || readings.length,
        operationTime: operationDuration,
        updatedRecords: readings.map((reading, index) => ({
          index: index,
          date: reading.date,
          roomId: currentRoomId,
          currentReading: reading.currentReading,
          saved: true,
          timestamp: new Date().toISOString(),
        })),
        details: {
          totalProcessingTime: operationDuration,
          dataIntegrityCheck: 'passed',
        },
      };
    } else {
      // 保存失敗の詳細分析
      const errorMessage = result?.error || '保存処理が失敗しました（原因不明）';
      Logger.log(`[performSaveOperation] 保存失敗: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        errorType: 'SAVE_OPERATION_FAILED',
        details: {
          originalResult: result,
          operationTime: operationDuration,
          attemptedRecords: readings.length,
          failureReason: result?.error || 'updateMeterReadings returned unsuccessful result',
        },
      };
    }
  } catch (error) {
    const operationDuration = Date.now() - operationStartTime;
    Logger.log(`[performSaveOperation] 予期しないエラー: ${error.message}`);
    Logger.log(`[performSaveOperation] エラースタック:`, error.stack);

    return {
      success: false,
      error: `保存処理中に予期しないエラーが発生しました: ${error.message}`,
      errorType: 'UNEXPECTED_ERROR',
      details: {
        operationTime: operationDuration,
        failedAt: 'performSaveOperation',
      },
    };
  }
}

/**
 * ナビゲーション処理実行
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} ナビゲーション結果
 */
function performNavigationOperation(
  params,
  preloadedPropertyId,
  preloadedTargetRoomId,
  preloadedInspectionData = null
) {
  const propertyId = preloadedPropertyId || params.propertyId;
  const targetRoomId = preloadedTargetRoomId || params.targetRoomId;
  const operationStartTime = Date.now();

  try {
    // 移動先部屋の存在確認（Phase 2.2: 事前チェック）
    if (!targetRoomId || !/^R\d{3,6}$/.test(targetRoomId)) {
      return {
        success: false,
        error: `移動先部屋IDが無効です: ${targetRoomId}`,
        errorType: 'INVALID_TARGET_ROOM',
        details: {
          targetRoomId: targetRoomId,
          expectedFormat: 'R001',
          validationFailed: 'room_id_format',
        },
      };
    }

    // Use preloaded data if available, otherwise fetch
    const result = preloadedInspectionData || getMeterReadings(propertyId, targetRoomId);
    const operationDuration = Date.now() - operationStartTime;

    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error || 'ナビゲーションデータの取得に失敗しました',
        errorType: 'NAVIGATION_DATA_ERROR',
        details: {
          operationTime: operationDuration,
          targetRoom: targetRoomId,
        },
      };
    }

    // データ構造の検証
    if (result.propertyName === undefined && result.roomName === undefined) {
      return {
        success: false,
        error: 'ナビゲーションデータの取得に失敗しました（物件名・部屋名が取得できませんでした）',
        errorType: 'MISSING_NAMES_ERROR',
        details: {
          operationTime: operationDuration,
          receivedResult: result,
          targetRoom: targetRoomId,
          hasReadings: Array.isArray(result.readings),
        },
      };
    }

    // 移動先部屋が存在しない場合
    if (
      !result.propertyName &&
      !result.roomName &&
      (!result.readings || result.readings.length === 0)
    ) {
      return {
        success: false,
        error: `指定された部屋が見つかりません（物件: ${propertyId}, 部屋: ${targetRoomId}）`,
        errorType: 'ROOM_NOT_FOUND_ERROR',
        details: {
          operationTime: operationDuration,
          propertyId: propertyId,
          targetRoomId: targetRoomId,
          searchResult: result,
        },
      };
    }

    // 成功レスポンス（Phase 2.2: 詳細情報付き）
    const responseData = {
      success: true,
      data: {
        propertyName: result.propertyName || '物件名不明',
        roomName: result.roomName || '部屋名不明',
        roomId: targetRoomId,
        readings: Array.isArray(result.readings) ? result.readings : [],
      },
      metadata: {
        operationTime: operationDuration,
        readingsCount: Array.isArray(result.readings) ? result.readings.length : 0,
        hasHistoricalData: Array.isArray(result.readings) && result.readings.length > 0,
        dataRetrievalSuccess: true,
        timestamp: new Date().toISOString(),
      },
    };

    return responseData;
  } catch (error) {
    const operationDuration = Date.now() - operationStartTime;
    Logger.log(`[performNavigationOperation] 予期しないエラー: ${error.message}`);
    Logger.log(`[performNavigationOperation] エラースタック:`, error.stack);

    return {
      success: false,
      error: `ナビゲーション処理中に予期しないエラーが発生しました: ${error.message}`,
      errorType: 'UNEXPECTED_ERROR',
      details: {
        operationTime: operationDuration,
        targetRoom: targetRoomId,
        failedAt: 'performNavigationOperation',
      },
    };
  }
}

/**
 * エラーレスポンス作成（Phase 2.2 - 強化版）
 * @param {string} code - エラーコード
 * @param {string} message - エラーメッセージ
 * @param {Object} additionalData - 追加データ
 * @returns {Object} エラーレスポンス
 */
function createErrorResponse(code, message, additionalData = {}) {
  const errorLevel = getErrorLevel(code);
  const recoveryGuidance = getRecoveryGuidance(code);

  return {
    success: false,
    error: {
      code: code,
      message: message,
      level: errorLevel.level,
      recoverable: errorLevel.recoverable,
      details: {
        phase: getPhaseFromCode(code),
        timestamp: new Date().toISOString(),
        recovery: recoveryGuidance,
        errorCategory: getCategoryFromCode(code),
      },
    },
    ...additionalData,
  };
}

/**
 * 部分的成功レスポンス作成
 * @param {Object} saveResult - 保存結果
 * @param {string} navigationError - ナビゲーションエラー
 * @param {Object} additionalData - 追加データ
 * @returns {Object} 部分的成功レスポンス
 */
function createPartialSuccessResponse(saveResult, navigationError, additionalData = {}) {
  return {
    success: false,
    error: {
      code: 'NAVIGATION_FAILED',
      message: `データ保存は成功しましたが、画面更新中にエラーが発生しました: ${navigationError}`,
      details: {
        phase: 'navigate',
        timestamp: new Date().toISOString(),
      },
    },
    saveResult: saveResult,
    ...additionalData,
  };
}

/**
 * 成功レスポンス作成
 * @param {Object} saveResult - 保存結果
 * @param {Object} navigationResult - ナビゲーション結果
 * @param {number} processingTime - 処理時間
 * @returns {Object} 成功レスポンス
 */
function createSuccessResponse(saveResult, navigationResult, processingTime) {
  return {
    success: true,
    processingTime: processingTime,
    saveResult: {
      success: saveResult.success,
      updatedCount: saveResult.updatedCount,
      updatedRecords: saveResult.updatedRecords,
    },
    navigationResult: navigationResult.data,
  };
}

/**
 * エラーコードから処理フェーズを取得
 * @param {string} code - エラーコード
 * @returns {string} フェーズ名
 */
function getPhaseFromCode(code) {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'validate';
    case 'SAVE_FAILED':
      return 'save';
    case 'NAVIGATION_FAILED':
      return 'navigate';
    case 'SYSTEM_ERROR':
    default:
      return 'system';
  }
}

/**
 * エラーレベル情報を取得（Phase 2.2）
 * @param {string} code - エラーコード
 * @returns {Object} エラーレベル情報
 */
function getErrorLevel(code) {
  switch (code) {
    case 'VALIDATION_ERROR':
      return {
        level: 'WARNING',
        recoverable: true,
        severity: 1,
      };
    case 'SAVE_FAILED':
      return {
        level: 'ERROR',
        recoverable: true,
        severity: 3,
      };
    case 'NAVIGATION_FAILED':
      return {
        level: 'ERROR',
        recoverable: false,
        severity: 2,
      };
    case 'SYSTEM_ERROR':
      return {
        level: 'CRITICAL',
        recoverable: false,
        severity: 4,
      };
    default:
      return {
        level: 'UNKNOWN',
        recoverable: false,
        severity: 5,
      };
  }
}

/**
 * エラーコードからリカバリーガイダンスを取得（Phase 2.2）
 * @param {string} code - エラーコード
 * @returns {Object} リカバリーガイダンス
 */
function getRecoveryGuidance(code) {
  switch (code) {
    case 'VALIDATION_ERROR':
      return {
        action: 'ユーザー入力の修正が必要',
        steps: [
          '入力データの形式を確認してください',
          '必須フィールドがすべて入力されているか確認してください',
          '数値が正しい範囲内にあるか確認してください',
        ],
        retryable: true,
      };
    case 'SAVE_FAILED':
      return {
        action: '保存処理の再試行が可能',
        steps: [
          '一時的な問題の可能性があります',
          '数秒待ってから再度実行してください',
          '問題が継続する場合は管理者に連絡してください',
        ],
        retryable: true,
      };
    case 'NAVIGATION_FAILED':
      return {
        action: '手動でページ遷移してください',
        steps: [
          'データは正常に保存されました',
          'ブラウザを手動で更新してください',
          'または直接目的のページに移動してください',
        ],
        retryable: false,
      };
    case 'SYSTEM_ERROR':
      return {
        action: 'システム管理者に連絡してください',
        steps: [
          'システムに予期しない問題が発生しました',
          'エラー詳細を管理者に報告してください',
          '復旧まで他の機能をご利用ください',
        ],
        retryable: false,
      };
    default:
      return {
        action: '不明なエラーです',
        steps: ['システム管理者に連絡してください'],
        retryable: false,
      };
  }
}

/**
 * エラーコードからカテゴリを取得（Phase 2.2）
 * @param {string} code - エラーコード
 * @returns {string} エラーカテゴリ
 */
function getCategoryFromCode(code) {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'INPUT_ERROR';
    case 'SAVE_FAILED':
      return 'DATA_PERSISTENCE_ERROR';
    case 'NAVIGATION_FAILED':
      return 'DATA_RETRIEVAL_ERROR';
    case 'SYSTEM_ERROR':
      return 'SYSTEM_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}
