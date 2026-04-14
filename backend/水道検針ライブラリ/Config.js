/**
 * Config.gs - 設定管理
 * システムの設定値と定数を管理
 * Version: 1.0.0 - Library Edition
 */

const CONFIG = {
  // シート名
  SHEET_NAMES: {
    PROPERTY_MASTER: '物件マスタ',
    ROOM_MASTER: '部屋マスタ',
    INSPECTION_DATA: 'inspection_data',
    SETTINGS: '設定値',
  },

  // ※ 参照用定義 - 実際の列アクセスは headers.indexOf() を使用してください
  // 物件マスタシートの列インデックス（1始まり）
  PROPERTY_MASTER_COLS: {
    PROPERTY_ID: 1, // 物件ID
    PROPERTY_NAME: 2, // 物件名
    COMPLETION_DATE: 3, // 検針完了日
  },

  // ※ 参照用定義 - 実際の列アクセスは headers.indexOf() を使用してください
  // 部屋マスタシートの列インデックス（1始まり）
  ROOM_MASTER_COLS: {
    PROPERTY_ID: 1, // 物件ID
    ROOM_ID: 2, // 部屋ID
    ROOM_NAME: 3, // 部屋名
  },

  // ※ 参照用定義 - 実際の列アクセスは headers.indexOf() を使用してください
  // 検針データシートの列インデックス（1始まり）
  // 実際のCSV構造: 記録ID,物件名,物件ID,部屋ID,部屋名,検針日時,警告フラグ,標準偏差値,今回使用量,今回の指示数,前回指示数,前々回指示数,前々々回指示数
  INSPECTION_DATA_COLS: {
    RECORD_ID: 1, // 記録ID
    PROPERTY_NAME: 2, // 物件名
    PROPERTY_ID: 3, // 物件ID
    ROOM_ID: 4, // 部屋ID
    ROOM_NAME: 5, // 部屋名
    READING_DATE: 6, // 検針日時
    WARNING_FLAG: 7, // 警告フラグ
    STANDARD_DEVIATION: 8, // 標準偏差値
    USAGE: 9, // 今回使用量
    CURRENT_READING: 10, // 今回の指示数
    PREVIOUS_READING: 11, // 前回指示数
    PREVIOUS_PREVIOUS_READING: 12, // 前々回指示数
    THREE_TIMES_PREVIOUS_READING: 13, // 前々々回指示数
    INSPECTION_SKIP: 14, // 検針不要
    BILLING_SKIP: 15, // 請求不要
  },

  // データ処理設定
  PROCESSING: {
    BATCH_SIZE: 100, // バッチサイズ
    MAX_RETRIES: 3, // 最大リトライ回数
    TIMEOUT_MS: 30000, // タイムアウト（ミリ秒）
  },

  // バリデーション設定
  VALIDATION: {
    PROPERTY_ID_FORMAT: /^P\d{6}$/, // 物件IDフォーマット（P000001形式）
    ROOM_ID_FORMAT: /^R\d{3}$/, // 部屋IDフォーマット（R001形式）
    MAX_USAGE: 1000, // 最大使用量
    MIN_READING: 0, // 最小検針値
    MAX_READING: 999999, // 最大検針値
  },

  // ログ設定
  LOGGING: {
    LEVEL: 'INFO', // ログレベル（DEBUG, INFO, WARN, ERROR）
    MAX_LOG_ENTRIES: 1000, // 最大ログエントリ数
  },

  // Web App設定
  WEB_APP: {
    DEFAULT_PAGE_SIZE: 20, // デフォルトページサイズ
    MAX_PAGE_SIZE: 100, // 最大ページサイズ
    CACHE_DURATION: 300, // キャッシュ持続時間（秒）
  },

  // 速度改善設定
  PERFORMANCE: {
    // 差分更新設定
    DELTA_SYNC: {
      ENABLED: true, // 差分同期有効化
      DEFAULT_SYNC_INTERVAL: 3600000, // デフォルト同期間隔（1時間）
      MAX_DELTA_RECORDS: 1000, // 最大差分レコード数
      TIMESTAMP_COLUMN: '最終更新日時', // タイムスタンプ列名
      RETRY_ATTEMPTS: 3, // リトライ回数
      RETRY_DELAY: 5000, // リトライ間隔（5秒）
    },

    // レスポンス軽量化設定
    LIGHT_API: {
      ENABLED: true, // 軽量API有効化
      PROPERTIES_FIELDS: ['物件ID', '物件名'], // 物件軽量版フィールド
      ROOMS_FIELDS: ['部屋ID', '部屋名'], // 部屋軽量版フィールド
      COMPRESS_RESPONSE: false, // レスポンス圧縮（GAS制限により無効）
      TIMEOUT: 25000, // APIタイムアウト（25秒）
      PAGINATION: {
        ENABLED: true, // ページネーション有効化
        PAGE_SIZE: 100, // 1ページあたりのアイテム数
        MAX_PAGES: 50, // 最大ページ数
      },
    },

    // キャッシュ設定（改良版）
    CACHE: {
      ENABLED: true, // キャッシュ有効化
      MAX_AGE: 3600000, // デフォルトキャッシュ時間（1時間）
      PROPERTIES_CACHE_AGE: 7200000, // 物件データキャッシュ（2時間）
      ROOMS_CACHE_AGE: 3600000, // 部屋データキャッシュ（1時間）
      INSPECTION_CACHE_AGE: 1800000, // 検針データキャッシュ（30分）
      MAX_SIZE: 5242880, // 最大キャッシュサイズ（5MB）
      STORAGE_PREFIX: 'suido_cache_', // キャッシュキーのプレフィックス
      AUTO_CLEANUP: true, // 自動クリーンアップ
    },

    // インデックス設定
    INDEXING: {
      ENABLED: true, // インデックス有効化
      AUTO_CREATE: true, // 自動作成
      REBUILD_THRESHOLD: 100, // 再構築閾値（レコード数）
      INDEX_TIMEOUT: 30000, // インデックス作成タイムアウト
    },
  },
};

/**
 * 設定値を取得
 * @param {string} path - 設定パス（例: 'SHEET_NAMES.PROPERTY_MASTER'）
 * @param {any} defaultValue - デフォルト値
 * @returns {any} 設定値
 */
function getConfig(path, defaultValue = null) {
  try {
    const keys = path.split('.');
    let value = CONFIG;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  } catch (error) {
    Logger.log(`設定取得エラー: ${error.message}`);
    return defaultValue;
  }
}
