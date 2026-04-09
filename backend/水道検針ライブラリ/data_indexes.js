/**
 * data_indexes.gs - 水道検針ライブラリ: データインデックス作成と管理機能
 * 検針データや物件・部屋マスタのインデックス作成、高速検索のための補助機能を提供
 * ライブラリ版 - 外部プロジェクトから利用可能
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
          data: {},
        };

        // 各列のデータをインデックスに追加
        headers.forEach((header, index) => {
          propertyIndex[propertyId].data[header] = row[index];
        });
      }
    }

    console.log(
      `[createPropertyIndex] ${Object.keys(propertyIndex).length}件の物件をインデックス化`
    );
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

    // ヘッダーベースで列インデックスを取得
    const roomIdColIndex = headers.indexOf('部屋ID');
    const propertyIdColIndex = headers.indexOf('物件ID');

    if (roomIdColIndex === -1) {
      throw new Error('部屋マスタに「部屋ID」列が見つかりません');
    }

    // ヘッダー行をスキップして処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const roomId = row[roomIdColIndex]; // ヘッダーベース検索
      const propertyId = propertyIdColIndex !== -1 ? row[propertyIdColIndex] : null;

      if (roomId) {
        roomIndex[roomId] = {
          row: i + 1,
          data: {},
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
      propertyRoomIndex,
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
    const dateIndex = {}; // 日付別の検釈データ

    // ヘッダーベースで列インデックスを取得
    const meterRoomIdCol = headers.indexOf('部屋ID');
    const meterReadingDateCol = headers.indexOf('検釈日時');

    // ヘッダー行をスキップして処理
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const recordId = `record_${i}`;
      const roomId = meterRoomIdCol >= 0 ? row[meterRoomIdCol] : null;
      const readingDate = meterReadingDateCol >= 0 ? row[meterReadingDateCol] : null;

      meterIndex[recordId] = {
        row: i + 1,
        data: {},
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
        const dateKey =
          readingDate instanceof Date
            ? readingDate.toDateString()
            : new Date(readingDate).toDateString();

        if (!dateIndex[dateKey]) {
          dateIndex[dateKey] = [];
        }
        dateIndex[dateKey].push(recordId);
      }
    }

    console.log(
      `[createMeterReadingIndex] ${Object.keys(meterIndex).length}件の検針データをインデックス化`
    );
    return {
      meterIndex,
      roomMeterIndex,
      dateIndex,
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
      created: new Date(),
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
      throw new Error(
        '検索タイプが指定されていません。使用可能なタイプ: property, room, meter, propertyRooms, roomMeters'
      );
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
