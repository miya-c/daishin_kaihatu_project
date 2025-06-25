/**
 * データインデックス作成と管理機能
 * 
 * 検針データや物件・部屋マスタのインデックス作成、
 * 高速検索のための補助機能を提供します。
 */

/**
 * 物件マスタのインデックスを作成
 * @returns {Object} 物件インデックス
 */
function createPropertyIndex() {
  try {
    console.log('[createPropertyIndex] 物件マスタインデックス作成開始');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('物件マスタ');
    if (!sheet) {
      throw new Error('物件マスタシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const propertyIndex = {};
    
    // ヘッダー行をスキップして処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const propertyId = row[0]; // 物件ID
      
      if (propertyId) {
        propertyIndex[propertyId] = {
          row: i + 1,
          data: {}
        };
        
        // 各列のデータをインデックスに追加
        headers.forEach((header, index) => {
          propertyIndex[propertyId].data[header] = row[index];
        });
      }
    }
    
    console.log(`[createPropertyIndex] ${Object.keys(propertyIndex).length}件の物件をインデックス化`);
    return propertyIndex;
    
  } catch (error) {
    console.error('[createPropertyIndex] エラー:', error);
    throw error;
  }
}

/**
 * 部屋マスタのインデックスを作成
 * @returns {Object} 部屋インデックス
 */
function createRoomIndex() {
  try {
    console.log('[createRoomIndex] 部屋マスタインデックス作成開始');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('部屋マスタ');
    if (!sheet) {
      throw new Error('部屋マスタシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const roomIndex = {};
    const propertyRoomIndex = {}; // 物件ID別の部屋一覧
    
    // ヘッダー行をスキップして処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const roomId = row[0]; // 部屋ID
      const propertyId = row[1]; // 物件ID
      
      if (roomId) {
        roomIndex[roomId] = {
          row: i + 1,
          data: {}
        };
        
        // 各列のデータをインデックスに追加
        headers.forEach((header, index) => {
          roomIndex[roomId].data[header] = row[index];
        });
        
        // 物件ID別インデックスも作成
        if (propertyId) {
          if (!propertyRoomIndex[propertyId]) {
            propertyRoomIndex[propertyId] = [];
          }
          propertyRoomIndex[propertyId].push(roomId);
        }
      }
    }
    
    console.log(`[createRoomIndex] ${Object.keys(roomIndex).length}件の部屋をインデックス化`);
    return {
      roomIndex,
      propertyRoomIndex
    };
    
  } catch (error) {
    console.error('[createRoomIndex] エラー:', error);
    throw error;
  }
}

/**
 * 検針データのインデックスを作成
 * @returns {Object} 検針データインデックス
 */
function createMeterReadingIndex() {
  try {
    console.log('[createMeterReadingIndex] 検針データインデックス作成開始');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('inspection_data');
    if (!sheet) {
      throw new Error('検針データシートが見つかりません');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const meterIndex = {};
    const roomMeterIndex = {}; // 部屋ID別の検針データ
    const dateIndex = {}; // 日付別の検針データ
    
    // ヘッダー行をスキップして処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const recordId = `record_${i}`;
      const roomId = row[0]; // 部屋ID
      const readingDate = row[1]; // 検針日
      
      meterIndex[recordId] = {
        row: i + 1,
        data: {}
      };
      
      // 各列のデータをインデックスに追加
      headers.forEach((header, index) => {
        meterIndex[recordId].data[header] = row[index];
      });
      
      // 部屋ID別インデックス
      if (roomId) {
        if (!roomMeterIndex[roomId]) {
          roomMeterIndex[roomId] = [];
        }
        roomMeterIndex[roomId].push(recordId);
      }
      
      // 日付別インデックス
      if (readingDate) {
        const dateKey = readingDate instanceof Date ? 
          readingDate.toDateString() : 
          new Date(readingDate).toDateString();
        
        if (!dateIndex[dateKey]) {
          dateIndex[dateKey] = [];
        }
        dateIndex[dateKey].push(recordId);
      }
    }
    
    console.log(`[createMeterReadingIndex] ${Object.keys(meterIndex).length}件の検針データをインデックス化`);
    return {
      meterIndex,
      roomMeterIndex,
      dateIndex
    };
    
  } catch (error) {
    console.error('[createMeterReadingIndex] エラー:', error);
    throw error;
  }
}

/**
 * 全インデックスを作成
 * @returns {Object} 全インデックス
 */
function createAllIndexes() {
  try {
    console.log('[createAllIndexes] 全インデックス作成開始');
    
    const propertyIndex = createPropertyIndex();
    const roomIndexes = createRoomIndex();
    const meterIndexes = createMeterReadingIndex();
    
    const allIndexes = {
      property: propertyIndex,
      room: roomIndexes.roomIndex,
      propertyRoom: roomIndexes.propertyRoomIndex,
      meter: meterIndexes.meterIndex,
      roomMeter: meterIndexes.roomMeterIndex,
      dateMeter: meterIndexes.dateIndex,
      created: new Date()
    };
    
    console.log('[createAllIndexes] 全インデックス作成完了');
    return allIndexes;
    
  } catch (error) {
    console.error('[createAllIndexes] エラー:', error);
    throw error;
  }
}

/**
 * インデックスを使用した高速検索
 * @param {string} type - 検索タイプ ('property', 'room', 'meter', 'propertyRooms', 'roomMeters')
 * @param {string} key - 検索キー
 * @param {Object} indexes - インデックス（省略時は新規作成）
 * @returns {Object|null} 検索結果
 */
function fastSearch(type, key, indexes = null) {
  try {
    // 引数バリデーション
    if (!type) {
      throw new Error('検索タイプが指定されていません。使用可能なタイプ: property, room, meter, propertyRooms, roomMeters');
    }
    
    if (!key) {
      throw new Error('検索キーが指定されていません');
    }
    
    const validTypes = ['property', 'room', 'meter', 'propertyRooms', 'roomMeters'];
    if (!validTypes.includes(type)) {
      throw new Error(`不明な検索タイプ: "${type}". 使用可能なタイプ: ${validTypes.join(', ')}`);
    }
    
    console.log(`[fastSearch] 検索開始: type="${type}", key="${key}"`);
    
    if (!indexes) {
      console.log('[fastSearch] インデックスを新規作成中...');
      indexes = createAllIndexes();
    }
    
    // インデックスの存在確認
    if (!indexes || typeof indexes !== 'object') {
      throw new Error('インデックスの作成に失敗しました');
    }
    
    switch (type) {
      case 'property':
        return indexes.property[key] || null;
        
      case 'room':
        return indexes.room[key] || null;
        
      case 'meter':
        return indexes.meter[key] || null;
        
      case 'propertyRooms':
        return indexes.propertyRoom[key] || [];
        
      case 'roomMeters':
        return indexes.roomMeter[key] || [];
        
      default:
        throw new Error(`不明な検索タイプ: ${type}`);
    }
    
  } catch (error) {
    console.error('[fastSearch] エラー:', error);
    throw error;
  }
}

/**
 * インデックス統計情報を取得
 * @returns {Object} 統計情報
 */
function getIndexStats() {
  try {
    const indexes = createAllIndexes();
    
    return {
      物件数: Object.keys(indexes.property).length,
      部屋数: Object.keys(indexes.room).length,
      検針データ数: Object.keys(indexes.meter).length,
      物件別部屋数: Object.keys(indexes.propertyRoom).length,
      部屋別検針数: Object.keys(indexes.roomMeter).length,
      作成日時: indexes.created
    };
    
  } catch (error) {
    console.error('[getIndexStats] エラー:', error);
    throw error;
  }
}

/**
 * fastSearch関数のテスト用関数
 */
function testFastSearch() {
  try {
    console.log('[testFastSearch] 高速検索テスト開始');
    
    // インデックスを一度作成
    const indexes = createAllIndexes();
    console.log('[testFastSearch] インデックス作成完了');
    
    // 各検索タイプのテスト
    const testCases = [
      { type: 'property', description: '物件検索テスト' },
      { type: 'room', description: '部屋検索テスト' },
      { type: 'meter', description: '検針データ検索テスト' },
      { type: 'propertyRooms', description: '物件別部屋一覧テスト' },
      { type: 'roomMeters', description: '部屋別検針データテスト' }
    ];
    
    const results = [];
    
    testCases.forEach(testCase => {
      try {
        console.log(`[testFastSearch] ${testCase.description}`);
        
        // テスト用の検索を実行（存在しないキーで安全にテスト）
        const result = fastSearch(testCase.type, 'TEST_KEY_NOT_EXISTS', indexes);
        
        results.push({
          type: testCase.type,
          description: testCase.description,
          status: 'OK',
          result: result
        });
        
        console.log(`[testFastSearch] ${testCase.type}: OK`);
        
      } catch (error) {
        results.push({
          type: testCase.type,
          description: testCase.description,
          status: 'ERROR',
          error: error.message
        });
        
        console.error(`[testFastSearch] ${testCase.type}: ERROR -`, error.message);
      }
    });
    
    // 結果サマリー
    const successCount = results.filter(r => r.status === 'OK').length;
    const totalCount = results.length;
    
    console.log(`[testFastSearch] テスト完了: ${successCount}/${totalCount} 成功`);
    
    return {
      成功率: `${successCount}/${totalCount}`,
      詳細結果: results,
      実行時間: new Date()
    };
    
  } catch (error) {
    console.error('[testFastSearch] テストエラー:', error);
    throw error;
  }
}

/**
 * 実際のデータを使用した検索サンプル
 */
function sampleDataSearch() {
  try {
    console.log('[sampleDataSearch] 実データ検索サンプル');
    
    // インデックス作成
    const indexes = createAllIndexes();
    
    // 利用可能なキーを取得してサンプル検索
    const propertyKeys = Object.keys(indexes.property);
    const roomKeys = Object.keys(indexes.room);
    
    const samples = [];
    
    // 物件検索サンプル
    if (propertyKeys.length > 0) {
      const samplePropertyId = propertyKeys[0];
      const propertyResult = fastSearch('property', samplePropertyId, indexes);
      samples.push({
        type: '物件検索',
        key: samplePropertyId,
        found: !!propertyResult,
        data: propertyResult ? propertyResult.data : null
      });
    }
    
    // 部屋検索サンプル
    if (roomKeys.length > 0) {
      const sampleRoomId = roomKeys[0];
      const roomResult = fastSearch('room', sampleRoomId, indexes);
      samples.push({
        type: '部屋検索',
        key: sampleRoomId,
        found: !!roomResult,
        data: roomResult ? roomResult.data : null
      });
      
      // 物件別部屋一覧サンプル
      if (roomResult && roomResult.data) {
        const propertyId = roomResult.data['物件ID'] || roomResult.data[Object.keys(roomResult.data)[1]];
        if (propertyId) {
          const propertyRooms = fastSearch('propertyRooms', propertyId, indexes);
          samples.push({
            type: '物件別部屋一覧',
            key: propertyId,
            found: propertyRooms.length > 0,
            count: propertyRooms.length
          });
        }
      }
    }
    
    console.log('[sampleDataSearch] サンプル検索完了:', samples);
    return samples;
    
  } catch (error) {
    console.error('[sampleDataSearch] エラー:', error);
    throw error;
  }
}

/**
 * 検索機能の使用方法ガイド
 */
function showSearchGuide() {
  const guide = `
=== 高速検索機能の使用方法 ===

1. 基本的な使用方法:
   const result = fastSearch(type, key);

2. 検索タイプ:
   - 'property': 物件IDで物件情報を検索
   - 'room': 部屋IDで部屋情報を検索
   - 'meter': レコードIDで検針データを検索
   - 'propertyRooms': 物件IDで該当する部屋一覧を取得
   - 'roomMeters': 部屋IDで該当する検針データ一覧を取得

3. 使用例:
   // 物件情報の取得
   const property = fastSearch('property', 'P001');
   
   // 部屋情報の取得
   const room = fastSearch('room', 'R001-101');
   
   // 物件内の全部屋を取得
   const rooms = fastSearch('propertyRooms', 'P001');
   
   // 部屋の全検針データを取得
   const meters = fastSearch('roomMeters', 'R001-101');

4. エラーハンドリング:
   try {
     const result = fastSearch('property', 'P001');
     if (result) {
       console.log('見つかりました:', result.data);
     } else {
       console.log('データが見つかりません');
     }
   } catch (error) {
     console.error('検索エラー:', error.message);
   }

5. パフォーマンス最適化:
   // インデックスを一度作成して再利用
   const indexes = createAllIndexes();
   const result1 = fastSearch('property', 'P001', indexes);
   const result2 = fastSearch('room', 'R001-101', indexes);

=== テスト関数 ===
- testFastSearch(): 検索機能のテスト
- sampleDataSearch(): 実データでのサンプル検索
- getIndexStats(): インデックス統計情報
  `;
  
  console.log(guide);
  return guide;
}
