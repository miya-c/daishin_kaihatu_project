/**
 * api_data_functions.gs - API用データ関数群（軽量版）
 * スプレッドシートからのデータ取得とデータ更新処理を管理
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
                const roomId = String(row[inspRoomIdIndex]).trim();
                
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
  try {
    if (!propertyId || !roomId || !Array.isArray(readings) || readings.length === 0) {
      throw new Error('無効なパラメータ');
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
    
    // シートに一括書き込み
    if (updatedRowCount > 0) {
      Logger.log(`[updateMeterReadings] 💾 シートへの書き込み開始: ${updatedRowCount}件`);
      
      sheet.clear();
      sheet.getRange(1, 1, data.length, headers.length).setValues(data);
      
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
    
    // 閾値計算：前回値 + 標準偏差（切り捨て） + 10
    const threshold = previousReading + Math.floor(standardDeviation) + 10;
    
    Logger.log(`[calculateThreshold] 前回値: ${previousReading}, 履歴: [${readingHistory.join(', ')}], 平均: ${average.toFixed(2)}, 標準偏差: ${standardDeviation.toFixed(2)}, 閾値: ${threshold}`);
    
    return {
      standardDeviation: Math.floor(standardDeviation), // 整数化（切り捨て）
      threshold: threshold, // 整数値
      reason: `前回値${previousReading} + σ${Math.floor(standardDeviation)} + 10`,
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
 * @returns {number} 標準偏差（STDEV.S相当）
 */
function calculateSTDEV_S(values) {
  if (!values || values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1); // n-1で割る
  return Math.sqrt(variance);
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