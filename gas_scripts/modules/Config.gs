/**
 * @fileoverview This file contains the configuration settings for the script.
 * Users should modify the values in this file to match their spreadsheet setup.
 */

const CONFIG = {
  // シート名
  SHEET_NAMES: {
    PROPERTY_MASTER: '物件マスタ',
    ROOM_MASTER: '部屋マスタ',
    INSPECTION_DATA: '検針データ',
    SETTINGS: '設定値',
  },
  
  // 部屋マスタシートの列インデックス（1始まり）
  ROOM_MASTER_COLS: {
    PROPERTY_ID: 1, // 物件ID
    ROOM_ID: 2,       // 部屋ID
    // ... 他に必要な列を追加
  },

  // 検針データシートの列インデックス（1始まり）
  INSPECTION_DATA_COLS: {
    TIMESTAMP: 1,     // タイムスタンプ
    PROPERTY_ID: 2,   // 物件ID
    ROOM_ID: 3,       // 部屋ID
    METER_VALUE: 4,   // 今回検針値
    // ... 他に必要な列を追加
  },

  // その他の設定値
  SOME_OTHER_SETTING: 'some_value',
};
