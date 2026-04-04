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
    const sheet = ss.getSheetByName('物件マスタ');
    
    if (!sheet) {
      throw new Error('物件マスタシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return [];
    }
    
    const headers = data[0];
    return data.slice(1).map(row => {
      const property = {};
      headers.forEach((header, colIndex) => {
        property[header] = row[colIndex];
      });
      return property;
    });
    
  } catch (error) {
    throw error;
  }
}

/**
 * 物件一覧を取得（軽量版・速度改善用）
 * 必要最小限のフィールドのみを返却して通信量を削減
 * @param {string} lastSync - 最終同期日時（ISO形式、省略可）
 * @returns {Array} 軽量化された物件データの配列
 */
function getPropertiesLight(lastSync = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('物件マスタ');
    
    if (!sheet) {
      throw new Error('物件マスタシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        hasChanges: false,
        data: [],
        lastModified: new Date().toISOString(),
        totalCount: 0
      };
    }
    
    const headers = data[0];
    const lightFields = getConfig('PERFORMANCE.LIGHT_API.PROPERTIES_FIELDS', ['物件ID', '物件名']);
    const timestampCol = getConfig('PERFORMANCE.DELTA_SYNC.TIMESTAMP_COLUMN', '最終更新日時');
    
    // 必要な列インデックスを取得
    const fieldIndexes = {};
    lightFields.forEach(field => {
      const index = headers.indexOf(field);
      if (index !== -1) {
        fieldIndexes[field] = index;
      }
    });
    
    const timestampIndex = headers.indexOf(timestampCol);
    
    // データを軽量化して返却
    const lightData = [];
    let maxTimestamp = new Date(0);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const item = {};
      
      // 指定されたフィールドのみ抽出
      lightFields.forEach(field => {
        if (fieldIndexes[field] !== undefined) {
          item[field] = row[fieldIndexes[field]];
        }
      });
      
      // タイムスタンプ処理
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
      
      // 差分同期チェック
      if (lastSync) {
        const lastSyncDate = new Date(lastSync);
        if (rowTimestamp <= lastSyncDate) {
          continue; // 未更新のデータはスキップ
        }
      }
      
      item.lastModified = rowTimestamp.toISOString();
      lightData.push(item);
      
      if (rowTimestamp > maxTimestamp) {
        maxTimestamp = rowTimestamp;
      }
    }
    
    return {
      hasChanges: lightData.length > 0,
      data: lightData,
      lastModified: maxTimestamp.toISOString(),
      totalCount: lightData.length,
      compression: Math.round((1 - (JSON.stringify(lightData).length / JSON.stringify(data).length)) * 100)
    };
    
  } catch (error) {
    Logger.log(`[getPropertiesLight] エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 指定された物件の部屋一覧と検針状況を取得する（CSV構造完全対応版）
 * room_select.html用の形式で返却
 * @param {string} propertyId - 物件ID
 * @returns {Object} {property: {...}, rooms: [...]} 形式
 */
function getRooms(propertyId) {
  try {
    Logger.log(`[getRooms] 開始 - propertyId: ${propertyId}`);
    
    if (!propertyId) {
      throw new Error('物件IDが指定されていません');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const propertySheet = ss.getSheetByName('物件マスタ');
    const roomSheet = ss.getSheetByName('部屋マスタ');
    
    if (!propertySheet) {
      throw new Error('物件マスタシートが見つかりません');
    }
    
    if (!roomSheet) {
      throw new Error('部屋マスタシートが見つかりません');
    }
    
    Logger.log('[getRooms] シート取得完了');    // 物件情報取得（物件マスタ.csv: 物件ID,物件名,検針完了日）
    const propertyData = propertySheet.getDataRange().getValues();
    if (propertyData.length <= 1) {
      throw new Error('物件マスタにデータがありません');
    }
    
    const propertyHeaders = propertyData[0];
    const propertyIdIndex = propertyHeaders.indexOf('物件ID');       // 列A (0)
    const propertyNameIndex = propertyHeaders.indexOf('物件名');     // 列B (1)
    
    if (propertyIdIndex === -1) {
      throw new Error('物件マスタに「物件ID」列が見つかりません');
    }
    
    if (propertyNameIndex === -1) {
      throw new Error('物件マスタに「物件名」列が見つかりません');
    }
    
    // 指定された物件IDの物件情報を検索
    const propertyRow = propertyData.slice(1).find(row => 
      String(row[propertyIdIndex]).trim() === String(propertyId).trim()
    );
    
    if (!propertyRow) {
      throw new Error(`指定された物件ID「${propertyId}」が物件マスタに見つかりません`);
    }
    
    const propertyInfo = {
      id: String(propertyRow[propertyIdIndex]).trim(),
      name: String(propertyRow[propertyNameIndex] || '物件名不明').trim()
    };
    
    Logger.log(`[getRooms] 物件情報取得完了: ${JSON.stringify(propertyInfo)}`);    // 部屋情報取得（部屋マスタ.csv: 物件ID,部屋ID,部屋名）
    const roomData = roomSheet.getDataRange().getValues();
    if (roomData.length <= 1) {
      Logger.log('[getRooms] 部屋マスタにデータなし - 空配列を返却');
      return {
        property: propertyInfo,
        rooms: []
      };
    }
    
    const roomHeaders = roomData[0];
    const roomPropertyIdIndex = roomHeaders.indexOf('物件ID');  // 列A (0)
    const roomIdIndex = roomHeaders.indexOf('部屋ID');          // 列B (1)
    const roomNameIndex = roomHeaders.indexOf('部屋名');        // 列C (2)
    
    if (roomPropertyIdIndex === -1 || roomIdIndex === -1 || roomNameIndex === -1) {
      throw new Error('部屋マスタに必要な列（物件ID、部屋ID、部屋名）が見つかりません');
    }
    
    Logger.log(`[getRooms] 部屋マスタ列構成確認: 物件ID列:${roomPropertyIdIndex}, 部屋ID列:${roomIdIndex}, 部屋名列:${roomNameIndex}`);
    
    const rooms = roomData.slice(1)
      .filter(row => String(row[roomPropertyIdIndex]).trim() === String(propertyId).trim())
      .map(row => ({
        id: String(row[roomIdIndex] || '').trim(),
        name: String(row[roomNameIndex] || '').trim(),
        readingStatus: 'not-completed', // HTMLが期待するフィールド
        isCompleted: false,             // HTMLが期待するフィールド
        readingDateFormatted: null,     // HTMLが期待するフィールド
        isNotNeeded: false              // 検針不要フラグ（デフォルトは必要）
      }));
    
    Logger.log(`[getRooms] 対象部屋数: ${rooms.length}件`);    // inspection_dataから検針完了状況と検針不要フラグを確認
    // inspection_data.csv: 記録ID,物件名,物件ID,部屋ID,部屋名,検針日時,警告フラグ,標準偏差値,今回使用量,今回の指示数,前回指示数,前々回指示数,前々々回指示数,検針不要
    const inspectionSheet = ss.getSheetByName('inspection_data');
    if (inspectionSheet) {
      try {
        const inspectionData = inspectionSheet.getDataRange().getValues();
        
        if (inspectionData.length > 1) {
          const inspHeaders = inspectionData[0];
          const inspPropertyIdIndex = inspHeaders.indexOf('物件ID');      // 列C (2)
          const inspRoomIdIndex = inspHeaders.indexOf('部屋ID');          // 列D (3)
          const inspValueIndex = inspHeaders.indexOf('今回の指示数');     // 列J (9)
          const inspDateIndex = inspHeaders.indexOf('検針日時');          // 列F (5)
          const inspNotNeededIndex = inspHeaders.indexOf('検針不要');     // 列N (13)
          
          Logger.log(`[getRooms] inspection_data列構成 - 物件ID列:${inspPropertyIdIndex}, 部屋ID列:${inspRoomIdIndex}, 今回の指示数列:${inspValueIndex}, 検針日時列:${inspDateIndex}, 検針不要列:${inspNotNeededIndex}`);
          
          if (inspPropertyIdIndex !== -1 && inspRoomIdIndex !== -1 && inspValueIndex !== -1) {
            const readingMap = new Map(); // 部屋IDと検針日のマップ
            const notNeededMap = new Map(); // 部屋IDと検針不要フラグのマップ
            
            // inspection_dataの各行を検索
            inspectionData.slice(1).forEach(row => {
              // 物件IDが一致する場合
              if (String(row[inspPropertyIdIndex]).trim() === String(propertyId).trim()) {
                const roomIdRaw = String(row[inspRoomIdIndex]).trim();
                
                // 部屋IDを正規化（R000001 → R001, R000002 → R002 など）
                let roomId = roomIdRaw;
                if (roomIdRaw.startsWith('R') && roomIdRaw.length > 4) {
                  // R000001 → R001 に変換
                  const numPart = roomIdRaw.substring(1); // 000001
                  const normalizedNum = String(parseInt(numPart, 10)).padStart(3, '0'); // 001
                  roomId = 'R' + normalizedNum; // R001
                  Logger.log(`[getRooms] 部屋ID正規化: ${roomIdRaw} → ${roomId}`);
                }
                
                // 検針完了データを確認（検針値が入力されている場合）
                if (row[inspValueIndex] !== null && 
                    row[inspValueIndex] !== undefined && 
                    String(row[inspValueIndex]).trim() !== '') {
                  
                  // 検針日時をフォーマット（2025/05/31 → 5月31日）
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
                  
                  // 日付がない場合のフォールバック
                  if (!readingDateFormatted) {
                    const today = new Date();
                    readingDateFormatted = `${today.getMonth() + 1}月${today.getDate()}日`;
                  }
                  
                  readingMap.set(roomId, readingDateFormatted);
                }
                
                // 検針不要フラグを確認
                if (inspNotNeededIndex !== -1) {
                  const notNeededValue = row[inspNotNeededIndex];
                  if (notNeededValue !== null && notNeededValue !== undefined) {
                    const notNeededStr = String(notNeededValue).trim().toLowerCase();
                    // 空文字でない値が入っている場合は検針不要とする（'true', '1', 'yes', 'on'など）
                    const isNotNeeded = notNeededStr !== '' && 
                                       (notNeededStr === 'true' || notNeededStr === '1' || 
                                        notNeededStr === 'yes' || notNeededStr === 'on' ||
                                        notNeededStr === '○' || notNeededStr === 'x' || notNeededStr === '×');
                    
                    notNeededMap.set(roomId, isNotNeeded);
                    Logger.log(`[getRooms] 部屋${roomId} 検針不要フラグ: ${notNeededStr} -> ${isNotNeeded}`);
                  }
                }
              }
            });
            
            // 検針完了状況と検針不要フラグを部屋データに反映
            rooms.forEach(room => {
              // 検針完了状況の設定
              if (readingMap.has(room.id)) {
                room.readingStatus = 'completed';
                room.isCompleted = true;
                room.readingDateFormatted = readingMap.get(room.id);
              }
              
              // 検針不要フラグの設定
              if (notNeededMap.has(room.id)) {
                room.isNotNeeded = notNeededMap.get(room.id);
                // 検針不要の場合は検針状況を'not-needed'に設定
                if (room.isNotNeeded) {
                  room.readingStatus = 'not-needed';
                }
              } else {
                room.isNotNeeded = false; // デフォルトは検針必要
              }
            });
            
            Logger.log(`[getRooms] 検針完了部屋数: ${readingMap.size}件, 検針不要部屋数: ${Array.from(notNeededMap.values()).filter(v => v).length}件`);
          } else {
            Logger.log('[getRooms] inspection_dataの必要な列が見つかりません');
          }
        }
      } catch (inspectionError) {
        Logger.log(`[getRooms] inspection_data読み込みエラー（部屋一覧は継続）: ${inspectionError.message}`);
      }
    } else {
      Logger.log('[getRooms] inspection_dataシートが見つかりません（部屋一覧は継続）');
    }
    
    // HTMLが期待する形式で返却
    const result = {
      property: propertyInfo,
      rooms: rooms
    };
    
    Logger.log(`[getRooms] 完了 - 結果サマリー: 物件名=${propertyInfo.name}, 部屋数=${rooms.length}件, 検針完了=${rooms.filter(r => r.isCompleted).length}件`);
    return result;
    
  } catch (error) {
    Logger.log(`getRooms エラー: ${error.message}`);
    throw error;
  }
}

/**
 * 指定物件の部屋一覧を取得（軽量版・速度改善用）
 * 必要最小限のフィールドのみを返却して通信量を削減
 * @param {string} propertyId - 物件ID
 * @param {string} lastSync - 最終同期日時（ISO形式、省略可）
 * @returns {Object} 軽量化された部屋データ
 */
function getRoomsLight(propertyId, lastSync = null) {
  try {
    Logger.log(`[getRoomsLight] 開始 - propertyId: ${propertyId}`);
    
    if (!propertyId) {
      throw new Error('物件IDが指定されていません');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const propertySheet = ss.getSheetByName('物件マスタ');
    const roomSheet = ss.getSheetByName('部屋マスタ');
    
    if (!propertySheet || !roomSheet) {
      throw new Error('必要なシートが見つかりません');
    }
    
    // 物件情報取得（軽量版）
    const propertyData = propertySheet.getDataRange().getValues();
    const propertyHeaders = propertyData[0];
    const propertyIdIndex = propertyHeaders.indexOf('物件ID');
    const propertyNameIndex = propertyHeaders.indexOf('物件名');
    
    const propertyRow = propertyData.slice(1).find(row => 
      String(row[propertyIdIndex]).trim() === String(propertyId).trim()
    );
    
    if (!propertyRow) {
      throw new Error(`物件ID「${propertyId}」が見つかりません`);
    }
    
    const propertyInfo = {
      id: String(propertyRow[propertyIdIndex]).trim(),
      name: String(propertyRow[propertyNameIndex] || '物件名不明').trim()
    };
    
    // 部屋情報取得（軽量版）
    const roomData = roomSheet.getDataRange().getValues();
    const roomHeaders = roomData[0];
    const lightFields = getConfig('PERFORMANCE.LIGHT_API.ROOMS_FIELDS', ['部屋ID', '部屋名']);
    const timestampCol = getConfig('PERFORMANCE.DELTA_SYNC.TIMESTAMP_COLUMN', '最終更新日時');
    
    const roomPropertyIdIndex = roomHeaders.indexOf('物件ID');
    const timestampIndex = roomHeaders.indexOf(timestampCol);
    
    // 必要な列インデックスを取得
    const fieldIndexes = {};
    lightFields.forEach(field => {
      const index = roomHeaders.indexOf(field);
      if (index !== -1) {
        fieldIndexes[field] = index;
      }
    });
    
    const lightRooms = [];
    let maxTimestamp = new Date(0);
    
    // 対象物件の部屋を抽出
    for (let i = 1; i < roomData.length; i++) {
      const row = roomData[i];
      
      if (String(row[roomPropertyIdIndex]).trim() !== String(propertyId).trim()) {
        continue;
      }
      
      const room = {};
      
      // 指定されたフィールドのみ抽出
      lightFields.forEach(field => {
        if (fieldIndexes[field] !== undefined) {
          room[field] = row[fieldIndexes[field]];
        }
      });
      
      // タイムスタンプ処理
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
      
      // 差分同期チェック
      if (lastSync) {
        const lastSyncDate = new Date(lastSync);
        if (rowTimestamp <= lastSyncDate) {
          continue;
        }
      }
      
      // HTMLが期待するフィールド構造で初期化
      room.id = room['部屋ID'] || '';
      room.name = room['部屋名'] || '';
      room.readingStatus = 'not-completed'; // デフォルト未完了
      room.isCompleted = false;             // HTMLが期待するフィールド
      room.readingDateFormatted = null;     // HTMLが期待するフィールド  
      room.isNotNeeded = false;             // 検針不要フラグ（デフォルトは必要）
      room.lastModified = rowTimestamp.toISOString();
      
      lightRooms.push(room);
      
      if (rowTimestamp > maxTimestamp) {
        maxTimestamp = rowTimestamp;
      }
    }
    
    Logger.log(`[getRoomsLight] 基本部屋データ取得完了: ${lightRooms.length}件`);
    
    // inspection_dataから検針完了状況と検針不要フラグを確認
    const inspectionSheet = ss.getSheetByName('inspection_data');
    if (inspectionSheet) {
      try {
        const inspectionData = inspectionSheet.getDataRange().getValues();
        
        if (inspectionData.length > 1) {
          const inspHeaders = inspectionData[0];
          const inspPropertyIdIndex = inspHeaders.indexOf('物件ID');      // 列C (2)
          const inspRoomIdIndex = inspHeaders.indexOf('部屋ID');          // 列D (3)
          const inspValueIndex = inspHeaders.indexOf('今回の指示数');     // 列J (9)
          const inspDateIndex = inspHeaders.indexOf('検針日時');          // 列F (5)
          const inspNotNeededIndex = inspHeaders.indexOf('検針不要');     // 列N (13)
          
          Logger.log(`[getRoomsLight] inspection_data列構成 - 物件ID列:${inspPropertyIdIndex}, 部屋ID列:${inspRoomIdIndex}, 今回の指示数列:${inspValueIndex}, 検針日時列:${inspDateIndex}, 検針不要列:${inspNotNeededIndex}`);
          
          if (inspPropertyIdIndex !== -1 && inspRoomIdIndex !== -1 && inspValueIndex !== -1) {
            const readingMap = new Map(); // 部屋IDと検針日のマップ
            const notNeededMap = new Map(); // 部屋IDと検針不要フラグのマップ
            
            // inspection_dataの各行を検索
            inspectionData.slice(1).forEach(row => {
              // 物件IDが一致する場合
              if (String(row[inspPropertyIdIndex]).trim() === String(propertyId).trim()) {
                const roomIdRaw = String(row[inspRoomIdIndex]).trim();
                
                // 部屋IDを正規化（R000001 → R001, R000002 → R002 など）
                let roomId = roomIdRaw;
                if (roomIdRaw.startsWith('R') && roomIdRaw.length > 4) {
                  // R000001 → R001 に変換
                  const numPart = roomIdRaw.substring(1); // 000001
                  const normalizedNum = String(parseInt(numPart, 10)).padStart(3, '0'); // 001
                  roomId = 'R' + normalizedNum; // R001
                  Logger.log(`[getRoomsLight] 部屋ID正規化: ${roomIdRaw} → ${roomId}`);
                }
                
                // 検針完了データを確認（検針値が入力されている場合）
                if (row[inspValueIndex] !== null && 
                    row[inspValueIndex] !== undefined && 
                    String(row[inspValueIndex]).trim() !== '') {
                  
                  // 検針日時をフォーマット（2025/05/31 → 5月31日）
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
                      Logger.log(`[getRoomsLight] 日付変換エラー: ${e.message}`);
                    }
                  }
                  
                  // 日付がない場合のフォールバック
                  if (!readingDateFormatted) {
                    const today = new Date();
                    readingDateFormatted = `${today.getMonth() + 1}月${today.getDate()}日`;
                  }
                  
                  readingMap.set(roomId, readingDateFormatted);
                }
                
                // 検針不要フラグを確認
                if (inspNotNeededIndex !== -1) {
                  const notNeededValue = row[inspNotNeededIndex];
                  if (notNeededValue !== null && notNeededValue !== undefined) {
                    const notNeededStr = String(notNeededValue).trim().toLowerCase();
                    // 空文字でない値が入っている場合は検針不要とする（'true', '1', 'yes', 'on'など）
                    const isNotNeeded = notNeededStr !== '' && 
                                       (notNeededStr === 'true' || notNeededStr === '1' || 
                                        notNeededStr === 'yes' || notNeededStr === 'on' ||
                                        notNeededStr === '○' || notNeededStr === 'x' || notNeededStr === '×');
                    
                    notNeededMap.set(roomId, isNotNeeded);
                    Logger.log(`[getRoomsLight] 部屋${roomId} 検針不要フラグ: ${notNeededStr} -> ${isNotNeeded}`);
                  }
                }
              }
            });
            
            // 検針完了状況と検針不要フラグを部屋データに反映
            lightRooms.forEach(room => {
              // 検針完了状況の設定
              if (readingMap.has(room.id)) {
                room.readingStatus = 'completed';
                room.isCompleted = true;
                room.readingDateFormatted = readingMap.get(room.id);
              }
              
              // 検針不要フラグの設定
              if (notNeededMap.has(room.id)) {
                room.isNotNeeded = notNeededMap.get(room.id);
                // 検針不要の場合は検針状況を'not-needed'に設定
                if (room.isNotNeeded) {
                  room.readingStatus = 'not-needed';
                }
              } else {
                room.isNotNeeded = false; // デフォルトは検針必要
              }
            });
            
            Logger.log(`[getRoomsLight] 検針完了部屋数: ${readingMap.size}件, 検針不要部屋数: ${Array.from(notNeededMap.values()).filter(v => v).length}件`);
          } else {
            Logger.log('[getRoomsLight] inspection_dataの必要な列が見つかりません');
          }
        }
      } catch (inspectionError) {
        Logger.log(`[getRoomsLight] inspection_data読み込みエラー（部屋一覧は継続）: ${inspectionError.message}`);
      }
    } else {
      Logger.log('[getRoomsLight] inspection_dataシートが見つかりません（部屋一覧は継続）');
    }
    
    return {
      hasChanges: lightRooms.length > 0,
      property: propertyInfo,
      rooms: lightRooms,
      lastModified: maxTimestamp.toISOString(),
      totalCount: lightRooms.length,
      compression: Math.round((1 - (JSON.stringify({property: propertyInfo, rooms: lightRooms}).length / JSON.stringify(roomData).length)) * 100)
    };
    
  } catch (error) {
    Logger.log(`[getRoomsLight] エラー: ${error.message}`);
    throw error;
  }
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
    Logger.log(`[getMeterReadings] 統合版開始 - propertyId: ${propertyId}, roomId: ${roomId}`);
    
    if (!propertyId || !roomId) {
      throw new Error('物件IDと部屋IDが必要です');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const inspectionSheet = ss.getSheetByName('inspection_data');
    
    if (!inspectionSheet) {
      throw new Error('inspection_dataシートが見つかりません');
    }
    
    const inspectionData = inspectionSheet.getDataRange().getValues();
    if (inspectionData.length <= 1) {
      // 検針データがない場合でも名称は取得して返す
      const fallbackNames = getFallbackNames(propertyId, roomId);
      return {
        propertyName: fallbackNames.propertyName,
        roomName: fallbackNames.roomName,
        readings: []
      };
    }
    
    const headers = inspectionData[0];
    const propertyIdIndex = headers.indexOf('物件ID');
    const roomIdIndex = headers.indexOf('部屋ID');
    const propertyNameIndex = headers.indexOf('物件名');
    const roomNameIndex = headers.indexOf('部屋名');
    
    if (propertyIdIndex === -1 || roomIdIndex === -1) {
      throw new Error('必要な列（物件ID、部屋ID）が見つかりません');
    }
    
    // 該当する検針データを抽出
    const targetRows = inspectionData.slice(1).filter(row => 
      String(row[propertyIdIndex]).trim() === String(propertyId).trim() && 
      String(row[roomIdIndex]).trim() === String(roomId).trim()
    );
    
    let propertyName = '';
    let roomName = '';
    
    // inspection_dataから名称を取得（最初の該当行から）
    if (targetRows.length > 0 && propertyNameIndex >= 0 && roomNameIndex >= 0) {
      propertyName = targetRows[0][propertyNameIndex] || '';
      roomName = targetRows[0][roomNameIndex] || '';
    }
    
    // 名称が取得できない場合はマスタシートからフォールバック
    if (!propertyName || !roomName) {
      Logger.log('[getMeterReadings] 名称フォールバック実行');
      const fallbackNames = getFallbackNames(propertyId, roomId);
      if (!propertyName) propertyName = fallbackNames.propertyName;
      if (!roomName) roomName = fallbackNames.roomName;
    }
    
    // 検針データを整形
    const readings = targetRows.map(row => {
      const reading = {};
      headers.forEach((header, index) => {
        reading[header] = row[index];
      });
      return reading;
    });
    
    Logger.log(`[getMeterReadings] 完了 - 物件名: ${propertyName}, 部屋名: ${roomName}, 検針件数: ${readings.length}`);
    
    return {
      propertyName: propertyName,
      roomName: roomName,
      readings: readings
    };
    
  } catch (error) {
    Logger.log(`[getMeterReadings] エラー: ${error.message}`);
    throw error;
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
    const propertySheet = ss.getSheetByName('物件マスタ');
    if (propertySheet) {
      const propertyData = propertySheet.getDataRange().getValues();
      if (propertyData.length > 1) {
        const propertyHeaders = propertyData[0];
        const propertyIdIndex = propertyHeaders.indexOf('物件ID');
        const propertyNameIndex = propertyHeaders.indexOf('物件名');
        
        if (propertyIdIndex >= 0 && propertyNameIndex >= 0) {
          const propertyRow = propertyData.slice(1).find(row => 
            String(row[propertyIdIndex]).trim() === String(propertyId).trim()
          );
          if (propertyRow) {
            propertyName = propertyRow[propertyNameIndex] || '';
          }
        }
      }
    }
    
    // 部屋名を部屋マスタから取得
    const roomSheet = ss.getSheetByName('部屋マスタ');
    if (roomSheet) {
      const roomData = roomSheet.getDataRange().getValues();
      if (roomData.length > 1) {
        const roomHeaders = roomData[0];
        const roomPropertyIdIndex = roomHeaders.indexOf('物件ID');
        const roomIdIndex = roomHeaders.indexOf('部屋ID');
        const roomNameIndex = roomHeaders.indexOf('部屋名');
        
        if (roomPropertyIdIndex >= 0 && roomIdIndex >= 0 && roomNameIndex >= 0) {
          const roomRow = roomData.slice(1).find(row => 
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
    roomName: roomName
  };
}

/**
 * 検針データを更新（軽量版）
 * @param {string} propertyId - 物件ID
 * @param {string} roomId - 部屋ID
 * @param {Array} readings - 更新する検針データ
 * @return {Object} 更新結果
 */
function updateMeterReadings(propertyId, roomId, readings) {
  const lock = LockService.getScriptLock();
  try {
    if (!propertyId || !roomId || !Array.isArray(readings) || readings.length === 0) {
      throw new Error('無効なパラメータ');
    }

    // 排他制御: ロック取得（30秒タイムアウト）
    try {
      lock.waitLock(30000);
    } catch (lockError) {
      return {
        success: false,
        error: '他の処理が実行中です。しばらく待ってから再試行してください。',
        timestamp: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss')
      };
    }

    Logger.log(`[updateMeterReadings] 🚀 開始: 物件=${propertyId}, 部屋=${roomId}, データ数=${readings.length}`);
    Logger.log(`[updateMeterReadings] 📥 受信データ:`, readings);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('inspection_data');

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
      currentReading: headers.indexOf('今回の指示数') >= 0 ? 
        headers.indexOf('今回の指示数') : headers.indexOf('今回指示数（水道）'),
      previousReading: headers.indexOf('前回指示数'),
      previousPreviousReading: headers.indexOf('前々回指示数'),
      threeTimesPreviousReading: headers.indexOf('前々々回指示数'),
      usage: headers.indexOf('今回使用量'),
      warningFlag: headers.indexOf('警告フラグ'),
      standardDeviation: headers.indexOf('標準偏差値')
    };
    
    Logger.log(`[updateMeterReadings] 📊 列インデックス:`, colIndexes);
    Logger.log(`[updateMeterReadings] 🎯 警告フラグ列インデックス: ${colIndexes.warningFlag}`);
    Logger.log(`[updateMeterReadings] 📋 利用可能な列: ${headers.join(', ')}`);
    
    // 警告フラグ列が存在しない場合のエラーハンドリング
    if (colIndexes.warningFlag === -1) {
      Logger.log(`[updateMeterReadings] ❌ 警告フラグ列が見つかりません！`);
      throw new Error('警告フラグ列が見つかりません');
    }
    
    // 必須列の存在確認
    if (colIndexes.propertyId === -1 || colIndexes.roomId === -1 || 
        colIndexes.date === -1 || colIndexes.currentReading === -1) {
      throw new Error(`必要な列が見つかりません。利用可能な列: ${headers.join(', ')}`);
    }
    
    let updatedRowCount = 0;
    const now = new Date();
    
    readings.forEach((reading, readingIndex) => {
      Logger.log(`[updateMeterReadings] 🔄 処理中[${readingIndex}]:`, reading);
      
      const currentValue = parseFloat(reading.currentReading) || 0;
      
      // ✅ 警告フラグを確実に受信・ログ出力
      const receivedWarningFlag = reading.warningFlag || '正常';
      Logger.log(`[updateMeterReadings] 🚨 受信した警告フラグ[${readingIndex}]: "${receivedWarningFlag}" (型: ${typeof receivedWarningFlag})`);
      
      // JST日付を正規化
      const normalizedDate = reading.date ? normalizeToJSTDate(reading.date) : getCurrentJSTDate();
      
      // 既存データを検索
      const existingRowIndex = data.findIndex((row, index) => 
        index > 0 && 
        String(row[colIndexes.propertyId]).trim() === String(propertyId).trim() &&
        String(row[colIndexes.roomId]).trim() === String(roomId).trim()
      );
      
      Logger.log(`[updateMeterReadings] 🔍 既存データ検索結果[${readingIndex}]: インデックス=${existingRowIndex}`);
      
      if (existingRowIndex >= 0) {
        // 既存データ更新
        Logger.log(`[updateMeterReadings] 📝 既存データ更新モード[${readingIndex}]`);
        
        const previousReading = parseFloat(data[existingRowIndex][colIndexes.previousReading]) || 0;
        const usage = previousReading > 0 ? Math.max(0, currentValue - previousReading) : currentValue;
        
        // 標準偏差をバックエンドで計算
        let calculatedStandardDeviation = 0;
        if (colIndexes.standardDeviation >= 0) {
          const previousPreviousReading = parseFloat(data[existingRowIndex][colIndexes.previousPreviousReading]) || 0;
          const threeTimesPreviousReading = parseFloat(data[existingRowIndex][colIndexes.threeTimesPreviousReading]) || 0;
          const thresholdInfo = calculateThreshold(previousReading, previousPreviousReading, threeTimesPreviousReading);
          calculatedStandardDeviation = thresholdInfo.standardDeviation;
        }
        
        // データ更新
        data[existingRowIndex][colIndexes.date] = normalizedDate;
        data[existingRowIndex][colIndexes.currentReading] = currentValue;
        if (colIndexes.usage >= 0) data[existingRowIndex][colIndexes.usage] = usage;
        
        // ✅ 警告フラグを確実にG列に保存
        Logger.log(`[updateMeterReadings] 💾 警告フラグ保存前[${readingIndex}]: 列${colIndexes.warningFlag + 1} = "${data[existingRowIndex][colIndexes.warningFlag]}"`);
        data[existingRowIndex][colIndexes.warningFlag] = receivedWarningFlag;
        Logger.log(`[updateMeterReadings] ✅ 警告フラグ保存後[${readingIndex}]: 列${colIndexes.warningFlag + 1} = "${data[existingRowIndex][colIndexes.warningFlag]}"`);
        
        // 標準偏差を保存
        if (colIndexes.standardDeviation >= 0) {
          data[existingRowIndex][colIndexes.standardDeviation] = calculatedStandardDeviation;
        }
        
      } else {
        // 新規データ作成
        Logger.log(`[updateMeterReadings] 🆕 新規データ作成モード[${readingIndex}]`);
        
        const newRow = new Array(headers.length).fill('');
        
        newRow[colIndexes.propertyId] = propertyId;
        newRow[colIndexes.roomId] = roomId;
        newRow[colIndexes.date] = normalizedDate;
        newRow[colIndexes.currentReading] = currentValue;
        if (colIndexes.usage >= 0) newRow[colIndexes.usage] = currentValue;
        
        // ✅ 警告フラグを確実にG列に設定
        Logger.log(`[updateMeterReadings] 🆕 新規警告フラグ設定[${readingIndex}]: 列${colIndexes.warningFlag + 1} = "${receivedWarningFlag}"`);
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
      Logger.log(`[updateMeterReadings] 💾 シートへの書き込み開始: ${updatedRowCount}件`);

      // 書き込み前にバックアップを作成
      try {
        const backupSheetName = 'inspection_data_backup';
        let backupSheet = ss.getSheetByName(backupSheetName);
        if (!backupSheet) {
          backupSheet = ss.insertSheet(backupSheetName);
        }
        const backupData = sheet.getDataRange().getValues();
        backupSheet.clear();
        if (backupData.length > 0) {
          backupSheet.getRange(1, 1, backupData.length, backupData[0].length).setValues(backupData);
        }
        Logger.log(`[updateMeterReadings] ✅ バックアップ作成完了: ${backupSheetName}`);
      } catch (backupError) {
        Logger.log(`[updateMeterReadings] ⚠️ バックアップ作成エラー: ${backupError.message}`);
      }

      // 安全な上書き: clear()を使わず直接setValuesで上書き
      sheet.getRange(1, 1, data.length, headers.length).setValues(data);
      // 余剰行があればクリア
      const lastRow = sheet.getLastRow();
      if (lastRow > data.length) {
        sheet.getRange(data.length + 1, 1, lastRow - data.length, headers.length).clearContent();
      }
      
      Logger.log(`[updateMeterReadings] ✅ ${updatedRowCount}件のデータをシートに書き込み完了`);
      
      // ✅ 書き込み後の確認強化
      Logger.log(`[updateMeterReadings] 🔍 書き込み後確認: 警告フラグ列=${colIndexes.warningFlag + 1}列目`);
      
      // 実際のシートから読み戻して確認
      const verificationData = sheet.getDataRange().getValues();
      readings.forEach((reading, readingIndex) => {
        const verificationRow = verificationData.find((row, index) => 
          index > 0 && 
          String(row[colIndexes.propertyId]).trim() === String(propertyId).trim() &&
          String(row[colIndexes.roomId]).trim() === String(roomId).trim()
        );
        
        if (verificationRow) {
          const actualWarningFlag = verificationRow[colIndexes.warningFlag];
          const expectedWarningFlag = reading.warningFlag || '正常';
          
          Logger.log(`[updateMeterReadings] 📋 書き込み確認[${readingIndex}]:`);
          Logger.log(`[updateMeterReadings]   - 期待値: "${expectedWarningFlag}"`);
          Logger.log(`[updateMeterReadings]   - 実際値: "${actualWarningFlag}" (型: ${typeof actualWarningFlag})`);
          Logger.log(`[updateMeterReadings]   - 一致: ${expectedWarningFlag === actualWarningFlag ? '✅ YES' : '❌ NO'}`);
        } else {
          Logger.log(`[updateMeterReadings] ❌ 確認用データが見つかりません[${readingIndex}]`);
        }
      });
    }
    
    return {
      success: true,
      message: `${updatedRowCount}件の検針データを正常に更新しました`,
      timestamp: Utilities.formatDate(now, 'JST', 'yyyy-MM-dd HH:mm:ss'),
      updatedRows: updatedRowCount,
      details: readings.map(r => ({
        date: r.date,
        currentReading: r.currentReading,
        warningFlag: r.warningFlag || '正常'
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
          processedSuccessfully: true
        }))
      }
    };

  } catch (error) {
    Logger.log(`[updateMeterReadings] ❌ エラー: ${error.message}`);
    Logger.log(`[updateMeterReadings] ❌ エラースタック:`, error.stack);
    return {
      success: false,
      error: error.message,
      timestamp: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss')
    };
  } finally {
    try { lock.releaseLock(); } catch (e) { /* ignore */ }
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
    console.log(`[検針完了] 開始 - 物件ID: ${propertyId}, 完了日: ${completionDate}`);
    
    if (!propertyId) {
      throw new Error('物件IDが指定されていません');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('物件マスタ');
    
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
    
    console.log(`[検針完了] 成功 - ${saveDate} を記録しました`);
    
    return {
      success: true,
      message: `物件 ${propertyId} の検針完了日を ${saveDate} で保存しました`,
      propertyId: propertyId,
      completionDate: saveDate,
      apiVersion: 'v2.9.0-simple-completion'
    };
    
  } catch (error) {
    console.error(`[検針完了] エラー: ${error.message}`);
    return {
      success: false,
      error: error.message,
      propertyId: propertyId
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
    
    const roomData = getRooms(propertyId);
    return roomData.rooms.some(room => 
      String(room.id).trim() === String(roomId).trim()
    );
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
    const sheets = ss.getSheets().map(sheet => ({
      name: sheet.getName(),
      rows: sheet.getLastRow(),
      cols: sheet.getLastColumn()
    }));
    
    return {
      success: true,
      spreadsheetId: ss.getId(),
      name: ss.getName(),
      sheets: sheets,
      url: ss.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
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
    if (typeof previousPreviousReading === 'number' && !isNaN(previousPreviousReading) && previousPreviousReading >= 0) {
      readingHistory.push(previousPreviousReading);
    }
    if (typeof threeTimesPreviousReading === 'number' && !isNaN(threeTimesPreviousReading) && threeTimesPreviousReading >= 0) {
      readingHistory.push(threeTimesPreviousReading);
    }
    
    // 履歴データが2件未満の場合は標準偏差計算不可
    if (readingHistory.length < 2) {
      return {
        standardDeviation: 0,
        threshold: 0,
        reason: '履歴データ不足',
        isCalculable: false
      };
    }
    
    // STDEV.S準拠の標準偏差を計算
    const average = calculateAVERAGE(readingHistory);
    const standardDeviation = calculateSTDEV_S(readingHistory);
    
    // 閾値計算：前回値 + 標準偏差 + 10（標準偏差は既に整数）
    const threshold = previousReading + standardDeviation + 10;
    
    Logger.log(`[calculateThreshold] 前回値: ${previousReading}, 履歴: [${readingHistory.join(', ')}], 平均: ${average.toFixed(2)}, 標準偏差: ${standardDeviation}, 閾値: ${threshold}`);
    
    return {
      standardDeviation: standardDeviation, // 既に整数
      threshold: threshold, // 整数値
      reason: `前回値${previousReading} + σ${standardDeviation} + 10`,
      isCalculable: true
    };
    
  } catch (error) {
    Logger.log(`[calculateThreshold] エラー: ${error.message}`);
    return {
      standardDeviation: 0,
      threshold: 0,
      reason: 'エラー',
      isCalculable: false
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
function calculateWarningFlag(currentReading, previousReading, previousPreviousReading, threeTimesPreviousReading) {
  try {
    // まず閾値情報を履歴データのみで計算（今回指示数不要）
    const thresholdInfo = calculateThreshold(previousReading, previousPreviousReading, threeTimesPreviousReading);
    
    // 今回指示数が無効な場合は入力待ち状態を表示
    if (typeof currentReading !== 'number' || isNaN(currentReading) || currentReading < 0) {
      return {
        warningFlag: thresholdInfo.isCalculable ? '入力待ち' : '判定不可',
        standardDeviation: thresholdInfo.standardDeviation,
        threshold: thresholdInfo.threshold,
        reason: thresholdInfo.reason
      };
    }
    
    // 前回指示数との比較：今回が前回未満の場合は即「要確認」
    if (typeof previousReading === 'number' && !isNaN(previousReading) && previousReading >= 0) {
      if (currentReading < previousReading) {
        Logger.log(`[calculateWarningFlag] 今回指示数(${currentReading})が前回値(${previousReading})未満のため要確認`);
        return {
          warningFlag: '要確認',
          standardDeviation: thresholdInfo.standardDeviation,
          threshold: thresholdInfo.threshold,
          reason: '前回値未満'
        };
      }
    }
    
    // 履歴データ不足の場合
    if (!thresholdInfo.isCalculable) {
      return {
        warningFlag: '正常',
        standardDeviation: 0,
        threshold: 0,
        reason: thresholdInfo.reason
      };
    }
    
    // 警告フラグを判定：今回指示数が閾値を超えた場合のみ「要確認」
    const warningFlag = (currentReading > thresholdInfo.threshold) ? '要確認' : '正常';
    
    Logger.log(`[calculateWarningFlag] 今回指示数: ${currentReading}, 前回値: ${previousReading}, 標準偏差: ${thresholdInfo.standardDeviation}, 閾値: ${thresholdInfo.threshold}, 判定: ${warningFlag}`);
    
    return {
      warningFlag: warningFlag,
      standardDeviation: thresholdInfo.standardDeviation,
      threshold: thresholdInfo.threshold,
      reason: thresholdInfo.reason
    };
    
  } catch (error) {
    Logger.log(`[calculateWarningFlag] エラー: ${error.message}`);
    return {
      warningFlag: 'エラー',
      standardDeviation: 0,
      threshold: 0,
      reason: 'エラー'
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
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1); // n-1で割る
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
        Logger.log(`[normalizeToJSTDate] 既に正規化済み: ${dateValue}`);
        return dateValue;
      }
      date = new Date(dateValue);
    } 
    // Dateオブジェクトの場合
    else if (dateValue instanceof Date) {
      date = dateValue;
    }
    else {
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
    
    Logger.log(`[normalizeToJSTDate] JST日付正規化: ${dateValue} → ${jstDateString}`);
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
  
  Logger.log(`[getCurrentJSTDate] 現在のJST日付: ${jstDateString}`);
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
    Logger.log('[saveAndNavigate] 統合API開始 - バージョン: Phase 2.3');
    Logger.log('[saveAndNavigate] パラメータ:', params);
    Logger.log(`[saveAndNavigate] タイムアウト設定: ${timeout}ms`);
    
    // Phase 2.3: 既存API互換性確保 - バージョン情報追加
    const apiVersion = 'v1.0.0-integrated';
    const compatibilityMode = params.compatibilityMode || 'strict';
    
    // 1. パラメータ検証（タイムアウト監視付き）
    if (Date.now() - startTime > timeout * 0.1) { // 10%でタイムアウト警告
      Logger.log('[saveAndNavigate] ⚠️ タイムアウト警告: 検証段階で時間を消費');
    }
    
    const validationResult = validateSaveAndNavigateParams(params);
    if (!validationResult.success) {
      return createErrorResponse('VALIDATION_ERROR', validationResult.error, {
        processingTime: Date.now() - startTime,
        apiVersion: apiVersion,
        timeoutRemaining: timeout - (Date.now() - startTime)
      });
    }
    
    Logger.log('[saveAndNavigate] ✅ パラメータ検証完了');
    
    // 2. データ保存処理（タイムアウト監視付き）
    const saveStartTime = Date.now();
    const saveTimeLimit = timeout * 0.6; // 60%を保存処理に割当
    
    if (Date.now() - startTime > saveTimeLimit) {
      Logger.log('[saveAndNavigate] ⚠️ タイムアウト警告: 保存処理開始前に制限時間に近づいています');
    }
    
    const saveResult = performSaveOperation(params);
    const saveOperationTime = Date.now() - saveStartTime;
    
    Logger.log(`[saveAndNavigate] 保存処理完了: ${saveOperationTime}ms`);
    
    if (!saveResult.success) {
      return createErrorResponse('SAVE_FAILED', saveResult.error, { 
        saveResult,
        processingTime: Date.now() - startTime,
        apiVersion: apiVersion,
        operationBreakdown: {
          saveTime: saveOperationTime,
          totalTime: Date.now() - startTime
        }
      });
    }
    
    // 3. ナビゲーションデータ取得（残り時間監視付き）
    const navStartTime = Date.now();
    const remainingTime = timeout - (Date.now() - startTime);
    
    if (remainingTime < timeout * 0.2) { // 20%未満で警告
      Logger.log(`[saveAndNavigate] ⚠️ タイムアウト警告: ナビゲーション処理に残り${remainingTime}ms`);
    }
    
    const navigationResult = performNavigationOperation(params);
    const navOperationTime = Date.now() - navStartTime;
    
    Logger.log(`[saveAndNavigate] ナビゲーション処理完了: ${navOperationTime}ms`);
    
    if (!navigationResult.success) {
      // 保存は成功したが取得が失敗した場合の部分的成功
      return createPartialSuccessResponse(saveResult, navigationResult.error, {
        processingTime: Date.now() - startTime,
        apiVersion: apiVersion,
        operationBreakdown: {
          saveTime: saveOperationTime,
          navigationTime: navOperationTime,
          totalTime: Date.now() - startTime
        }
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
        responseGeneration: Date.now() - (navStartTime + navOperationTime)
      },
      timeoutUsage: `${Math.round((totalProcessingTime / timeout) * 100)}%`,
      efficiency: totalProcessingTime < timeout * 0.5 ? 'excellent' : 
                 totalProcessingTime < timeout * 0.8 ? 'good' : 'acceptable'
    };
    
    Logger.log(`[saveAndNavigate] ✅ 統合API完了 - 総処理時間: ${totalProcessingTime}ms`);
    return response;
    
  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    Logger.log('[saveAndNavigate] ❌ 予期しないエラー: ' + error.toString());
    Logger.log('[saveAndNavigate] エラースタック:', error.stack);
    
    return createErrorResponse('SYSTEM_ERROR', error.toString(), {
      processingTime: totalProcessingTime,
      apiVersion: 'v1.0.0-integrated',
      errorDetails: {
        errorType: error.name,
        errorStack: error.stack,
        timeoutExceeded: totalProcessingTime > timeout
      }
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
    Logger.log('[validateSaveAndNavigateParams] 検証開始');
    
    // 基本パラメータ存在確認
    const required = ['action', 'propertyId', 'currentRoomId', 'targetRoomId', 'direction', 'meterReadingsData'];
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
          receivedParams: Object.keys(params)
        }
      };
    }
    
    // 物件ID形式検証（Phase 2.2: 強化されたバリデーション）
    if (!/^P\d{6}$/.test(params.propertyId)) {
      return {
        success: false,
        error: '物件IDの形式が正しくありません（P000001 形式である必要があります）',
        details: {
          receivedPropertyId: params.propertyId,
          expectedFormat: 'P000001'
        }
      };
    }
    
    // 部屋ID形式検証
    if (!/^R\d{3}$/.test(params.currentRoomId) || !/^R\d{3}$/.test(params.targetRoomId)) {
      return {
        success: false,
        error: '部屋IDの形式が正しくありません（R001 形式である必要があります）',
        details: {
          currentRoomId: params.currentRoomId,
          targetRoomId: params.targetRoomId,
          expectedFormat: 'R001'
        }
      };
    }
    
    // direction値の検証
    if (!['next', 'prev'].includes(params.direction)) {
      return {
        success: false,
        error: 'direction は "next" または "prev" である必要があります',
        details: {
          receivedDirection: params.direction,
          allowedValues: ['next', 'prev']
        }
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
            expectedType: 'array'
          }
        };
      }
      
      if (readings.length === 0) {
        return {
          success: false,
          error: 'meterReadingsData には少なくとも1つの検針データが必要です',
          details: {
            arrayLength: readings.length
          }
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
                receivedReading: reading
              }
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
              parsedValue: currentReading
            }
          };
        }
      }
      
    } catch (parseError) {
      return {
        success: false,
        error: `meterReadingsData のJSON解析エラー: ${parseError.message}`,
        details: {
          parseError: parseError.message,
          receivedData: params.meterReadingsData?.substring(0, 100) + '...' // 最初の100文字のみ
        }
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
            allowedRange: '1000-300000ms'
          }
        };
      }
    }
    
    Logger.log('[validateSaveAndNavigateParams] 検証成功');
    return { 
      success: true,
      validatedData: {
        readingsCount: readings.length,
        timeout: params.timeout || 30000
      }
    };
    
  } catch (error) {
    Logger.log(`[validateSaveAndNavigateParams] 予期しないエラー: ${error.message}`);
    return {
      success: false,
      error: `パラメータ検証エラー: ${error.message}`,
      details: {
        errorType: error.name,
        errorStack: error.stack
      }
    };
  }
}

/**
 * 保存処理実行
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} 保存結果
 */
function performSaveOperation(params) {
  const { propertyId, currentRoomId, meterReadingsData } = params;
  const operationStartTime = Date.now();
  
  try {
    Logger.log('[performSaveOperation] 保存処理開始');
    Logger.log(`[performSaveOperation] 対象: 物件=${propertyId}, 部屋=${currentRoomId}`);
    
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
          parseError: parseError.message
        }
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
          dataLength: Array.isArray(readings) ? readings.length : 'not-array'
        }
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
          affectedReadings: readings.length
        }
      };
    }
    
    Logger.log(`[performSaveOperation] ${readings.length}件の検針データを保存実行`);
    
    // 既存の updateMeterReadings ロジックを再利用（詳細エラー監視）
    const result = updateMeterReadings(propertyId, currentRoomId, readings);
    const operationDuration = Date.now() - operationStartTime;
    
    Logger.log(`[performSaveOperation] updateMeterReadings結果:`, result);
    Logger.log(`[performSaveOperation] 処理時間: ${operationDuration}ms`);
    
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
          timestamp: new Date().toISOString()
        })),
        details: {
          totalProcessingTime: operationDuration,
          dataIntegrityCheck: 'passed'
        }
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
          failureReason: result?.error || 'updateMeterReadings returned unsuccessful result'
        }
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
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        operationTime: operationDuration,
        failedAt: 'performSaveOperation'
      }
    };
  }
}

/**
 * ナビゲーション処理実行
 * @param {Object} params - リクエストパラメータ
 * @returns {Object} ナビゲーション結果
 */
function performNavigationOperation(params) {
  const { propertyId, targetRoomId } = params;
  const operationStartTime = Date.now();
  
  try {
    Logger.log('[performNavigationOperation] ナビゲーション処理開始');
    Logger.log(`[performNavigationOperation] 移動先: 物件=${propertyId}, 部屋=${targetRoomId}`);
    
    // 移動先部屋の存在確認（Phase 2.2: 事前チェック）
    if (!targetRoomId || !/^R\d{3}$/.test(targetRoomId)) {
      return {
        success: false,
        error: `移動先部屋IDが無効です: ${targetRoomId}`,
        errorType: 'INVALID_TARGET_ROOM',
        details: {
          targetRoomId: targetRoomId,
          expectedFormat: 'R001',
          validationFailed: 'room_id_format'
        }
      };
    }
    
    // 既存の getMeterReadings ロジックを再利用（詳細エラー監視）
    Logger.log('[performNavigationOperation] getMeterReadings実行開始');
    const result = getMeterReadings(propertyId, targetRoomId);
    const operationDuration = Date.now() - operationStartTime;
    
    Logger.log(`[performNavigationOperation] getMeterReadings結果:`, result);
    Logger.log(`[performNavigationOperation] 処理時間: ${operationDuration}ms`);
    
    // 結果の詳細検証
    if (!result) {
      return {
        success: false,
        error: 'ナビゲーションデータの取得関数がnullを返しました',
        errorType: 'NULL_RESULT_ERROR',
        details: {
          operationTime: operationDuration,
          targetRoom: targetRoomId,
          resultType: typeof result
        }
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
          hasReadings: Array.isArray(result.readings)
        }
      };
    }
    
    // 移動先部屋が存在しない場合
    if (!result.propertyName && !result.roomName && (!result.readings || result.readings.length === 0)) {
      return {
        success: false,
        error: `指定された部屋が見つかりません（物件: ${propertyId}, 部屋: ${targetRoomId}）`,
        errorType: 'ROOM_NOT_FOUND_ERROR',
        details: {
          operationTime: operationDuration,
          propertyId: propertyId,
          targetRoomId: targetRoomId,
          searchResult: result
        }
      };
    }
    
    // 成功レスポンス（Phase 2.2: 詳細情報付き）
    const responseData = {
      success: true,
      data: {
        propertyName: result.propertyName || '物件名不明',
        roomName: result.roomName || '部屋名不明',
        roomId: targetRoomId,
        readings: Array.isArray(result.readings) ? result.readings : []
      },
      metadata: {
        operationTime: operationDuration,
        readingsCount: Array.isArray(result.readings) ? result.readings.length : 0,
        hasHistoricalData: Array.isArray(result.readings) && result.readings.length > 0,
        dataRetrievalSuccess: true,
        timestamp: new Date().toISOString()
      }
    };
    
    Logger.log('[performNavigationOperation] 成功完了');
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
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        operationTime: operationDuration,
        targetRoom: targetRoomId,
        failedAt: 'performNavigationOperation'
      }
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
        errorCategory: getCategoryFromCode(code)
      }
    },
    ...additionalData
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
        timestamp: new Date().toISOString()
      }
    },
    saveResult: saveResult,
    ...additionalData
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
      updatedRecords: saveResult.updatedRecords
    },
    navigationResult: navigationResult.data
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
        severity: 1
      };
    case 'SAVE_FAILED':
      return {
        level: 'ERROR',
        recoverable: true,
        severity: 3
      };
    case 'NAVIGATION_FAILED':
      return {
        level: 'ERROR',
        recoverable: false,
        severity: 2
      };
    case 'SYSTEM_ERROR':
      return {
        level: 'CRITICAL',
        recoverable: false,
        severity: 4
      };
    default:
      return {
        level: 'UNKNOWN',
        recoverable: false,
        severity: 5
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
          '数値が正しい範囲内にあるか確認してください'
        ],
        retryable: true
      };
    case 'SAVE_FAILED':
      return {
        action: '保存処理の再試行が可能',
        steps: [
          '一時的な問題の可能性があります',
          '数秒待ってから再度実行してください',
          '問題が継続する場合は管理者に連絡してください'
        ],
        retryable: true
      };
    case 'NAVIGATION_FAILED':
      return {
        action: '手動でページ遷移してください',
        steps: [
          'データは正常に保存されました',
          'ブラウザを手動で更新してください',
          'または直接目的のページに移動してください'
        ],
        retryable: false
      };
    case 'SYSTEM_ERROR':
      return {
        action: 'システム管理者に連絡してください',
        steps: [
          'システムに予期しない問題が発生しました',
          'エラー詳細を管理者に報告してください',
          '復旧まで他の機能をご利用ください'
        ],
        retryable: false
      };
    default:
      return {
        action: '不明なエラーです',
        steps: ['システム管理者に連絡してください'],
        retryable: false
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