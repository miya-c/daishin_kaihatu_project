/**
 * utilities.gs - ユーティリティ関数
 * 共通で使用されるヘルパー関数群
 * Version: 1.0.0 - Library Edition
 */

/**
 * UI操作を安全に処理するためのヘルパー関数
 * @param {string} title - アラートのタイトル
 * @param {string} message - アラートのメッセージ
 */
function safeAlert(title, message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(title, message, ui.ButtonSet.OK);
  } catch (e) {
    Logger.log(`${title}: ${message}`);
    console.log(`${title}: ${message}`);
  }
}

/**
 * 日付を指定フォーマットの文字列に変換
 * @param {Date} date - 変換する日付
 * @param {string} format - フォーマット（デフォルト: 'YYYY-MM-DD'）
 * @returns {string} フォーマットされた日付文字列
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date || !(date instanceof Date)) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 文字列を日付オブジェクトに変換
 * @param {string} dateString - 日付文字列
 * @returns {Date|null} 変換された日付オブジェクト
 */
function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    Logger.log(`日付解析エラー: ${error.message}`);
    return null;
  }
}

/**
 * 数値を安全に変換
 * @param {any} value - 変換する値
 * @param {number} defaultValue - デフォルト値
 * @returns {number} 変換された数値
 */
function safeNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 文字列を安全に取得
 * @param {any} value - 変換する値
 * @param {string} defaultValue - デフォルト値
 * @returns {string} 変換された文字列
 */
function safeString(value, defaultValue = '') {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  return String(value).trim();
}

/**
 * オブジェクトの深いコピーを作成
 * @param {any} obj - コピーするオブジェクト
 * @returns {any} コピーされたオブジェクト
 */
function deepCopy(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item));
  }

  const copied = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      copied[key] = deepCopy(obj[key]);
    }
  }

  return copied;
}

/**
 * ログレベル付きのログ出力
 * @param {string} level - ログレベル（INFO, WARN, ERROR）
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ（オプション）
 */
function logWithLevel(level, message, data = null) {
  const timestamp = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  Logger.log(logMessage);

  if (data !== null) {
    Logger.log(`[${timestamp}] [${level}] Data: ${JSON.stringify(data)}`);
  }

  // コンソールにも出力（デバッグ用）
  console.log(logMessage);
  if (data !== null) {
    console.log(data);
  }
}

/**
 * キャッシュユーティリティ（速度改善用）
 * PropertiesServiceを使用したキャッシュ管理機能
 */

/**
 * キャッシュの有効性を確認
 * @param {string} key - キャッシュキー
 * @param {number} maxAge - 最大保持時間（ミリ秒）
 * @returns {boolean} 有効な場合true
 */
function isCacheValid(key, maxAge = null) {
  try {
    const cacheConfig = getConfig('PERFORMANCE.CACHE', {});
    const defaultMaxAge = maxAge || cacheConfig.MAX_AGE || 3600000; // 1時間

    const cacheData = getCacheData(key);
    if (!cacheData) {
      return false;
    }

    const now = new Date().getTime();
    const cacheTime = cacheData.timestamp || 0;
    const age = now - cacheTime;

    return age < defaultMaxAge;
  } catch (error) {
    Logger.log(`[isCacheValid] エラー: ${error.message}`);
    return false;
  }
}

/**
 * キャッシュデータを取得
 * @param {string} key - キャッシュキー
 * @returns {any} キャッシュされたデータ、存在しない場合はnull
 */
function getCacheData(key) {
  try {
    const cacheConfig = getConfig('PERFORMANCE.CACHE', {});
    const prefix = cacheConfig.STORAGE_PREFIX || 'suido_cache_';
    const fullKey = prefix + key;

    const cached = PropertiesService.getScriptProperties().getProperty(fullKey);
    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached);
    return cacheData;
  } catch (error) {
    Logger.log(`[getCacheData] エラー: ${error.message}`);
    return null;
  }
}

/**
 * キャッシュにデータを保存
 * @param {string} key - キャッシュキー
 * @param {any} data - 保存するデータ
 * @param {number} customMaxAge - カスタム最大保持時間（省略可）
 * @returns {boolean} 成功した場合true
 */
function setCacheData(key, data, customMaxAge = null) {
  try {
    const cacheConfig = getConfig('PERFORMANCE.CACHE', {});
    const prefix = cacheConfig.STORAGE_PREFIX || 'suido_cache_';
    const maxSize = cacheConfig.MAX_SIZE || 5242880; // 5MB
    const fullKey = prefix + key;

    const cacheData = {
      data: data,
      timestamp: new Date().getTime(),
      key: key,
      maxAge: customMaxAge || cacheConfig.MAX_AGE || 3600000,
    };

    const serialized = JSON.stringify(cacheData);

    // サイズチェック
    if (serialized.length > maxSize) {
      Logger.log(`[setCacheData] キャッシュサイズが制限を超過: ${serialized.length} > ${maxSize}`);
      return false;
    }

    PropertiesService.getScriptProperties().setProperty(fullKey, serialized);
    return true;
  } catch (error) {
    Logger.log(`[setCacheData] エラー: ${error.message}`);
    return false;
  }
}

/**
 * キャッシュをクリア
 * @param {string} pattern - クリア対象パターン（'all'|'properties'|'rooms'|'readings'|特定キー）
 * @returns {number} クリアしたキーの数
 */
function clearCache(pattern = 'all') {
  try {
    const cacheConfig = getConfig('PERFORMANCE.CACHE', {});
    const prefix = cacheConfig.STORAGE_PREFIX || 'suido_cache_';

    const properties = PropertiesService.getScriptProperties();
    const allProps = properties.getProperties();
    let clearedCount = 0;

    Object.keys(allProps).forEach((key) => {
      if (key.startsWith(prefix)) {
        let shouldClear = false;

        switch (pattern) {
          case 'all':
            shouldClear = true;
            break;
          case 'properties':
            shouldClear = key.includes('properties');
            break;
          case 'rooms':
            shouldClear = key.includes('rooms');
            break;
          case 'readings':
            shouldClear = key.includes('readings');
            break;
          default:
            shouldClear = key === prefix + pattern;
            break;
        }

        if (shouldClear) {
          properties.deleteProperty(key);
          clearedCount++;
        }
      }
    });

    Logger.log(`[clearCache] ${clearedCount}個のキャッシュをクリア（パターン: ${pattern}）`);
    return clearedCount;
  } catch (error) {
    Logger.log(`[clearCache] エラー: ${error.message}`);
    return 0;
  }
}

/**
 * 差分データをマージ
 * @param {Array} cachedData - キャッシュされたデータ
 * @param {Array} deltaData - 差分データ
 * @param {string} keyField - プライマリキーフィールド名
 * @returns {Array} マージ後のデータ
 */
function mergeData(cachedData, deltaData, keyField = 'id') {
  try {
    if (!Array.isArray(cachedData) || !Array.isArray(deltaData)) {
      Logger.log('[mergeData] 無効なデータ形式');
      return cachedData || [];
    }

    // キャッシュデータを Map に変換（高速検索用）
    const cachedMap = new Map();
    cachedData.forEach((item) => {
      if (item[keyField]) {
        cachedMap.set(item[keyField], item);
      }
    });

    // 差分データを適用
    deltaData.forEach((deltaItem) => {
      if (deltaItem[keyField]) {
        cachedMap.set(deltaItem[keyField], deltaItem);
      }
    });

    // Map を配列に戻す
    const mergedData = Array.from(cachedMap.values());

    Logger.log(
      `[mergeData] マージ完了: キャッシュ${cachedData.length}件 + 差分${deltaData.length}件 = 結果${mergedData.length}件`
    );
    return mergedData;
  } catch (error) {
    Logger.log(`[mergeData] エラー: ${error.message}`);
    return cachedData || [];
  }
}

/**
 * 期限切れキャッシュの自動クリーンアップ
 * @returns {number} クリーンアップしたキーの数
 */
function cleanupExpiredCache() {
  try {
    const cacheConfig = getConfig('PERFORMANCE.CACHE', {});
    const prefix = cacheConfig.STORAGE_PREFIX || 'suido_cache_';

    const properties = PropertiesService.getScriptProperties();
    const allProps = properties.getProperties();
    let cleanedCount = 0;
    const now = new Date().getTime();

    Object.keys(allProps).forEach((key) => {
      if (key.startsWith(prefix)) {
        try {
          const cacheData = JSON.parse(allProps[key]);
          const age = now - (cacheData.timestamp || 0);
          const maxAge = cacheData.maxAge || cacheConfig.MAX_AGE || 3600000;

          if (age > maxAge) {
            properties.deleteProperty(key);
            cleanedCount++;
          }
        } catch (e) {
          // パース失敗したキャッシュも削除
          properties.deleteProperty(key);
          cleanedCount++;
        }
      }
    });

    Logger.log(`[cleanupExpiredCache] ${cleanedCount}個の期限切れキャッシュをクリーンアップ`);
    return cleanedCount;
  } catch (error) {
    Logger.log(`[cleanupExpiredCache] エラー: ${error.message}`);
    return 0;
  }
}

/**
 * キャッシュ統計情報を取得
 * @returns {Object} キャッシュ統計
 */
function getCacheStats() {
  try {
    const cacheConfig = getConfig('PERFORMANCE.CACHE', {});
    const prefix = cacheConfig.STORAGE_PREFIX || 'suido_cache_';

    const properties = PropertiesService.getScriptProperties();
    const allProps = properties.getProperties();

    let totalCaches = 0;
    let totalSize = 0;
    let expiredCount = 0;
    const now = new Date().getTime();

    Object.keys(allProps).forEach((key) => {
      if (key.startsWith(prefix)) {
        totalCaches++;
        totalSize += Utilities.newBlob(allProps[key]).getBytes().length;
        try {
          const cacheData = JSON.parse(allProps[key]);
          const age = now - (cacheData.timestamp || 0);
          const maxAge = cacheData.maxAge || cacheConfig.MAX_AGE || 3600000;

          if (age > maxAge) {
            expiredCount++;
          }
        } catch (e) {
          expiredCount++;
        }
      }
    });

    return {
      totalCaches: totalCaches,
      totalSizeBytes: totalSize,
      totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      expiredCaches: expiredCount,
      validCaches: totalCaches - expiredCount,
      maxSizeMB: Math.round(((cacheConfig.MAX_SIZE || 5242880) / 1024 / 1024) * 100) / 100,
      usagePercent: Math.round((totalSize / (cacheConfig.MAX_SIZE || 5242880)) * 100),
    };
  } catch (error) {
    Logger.log(`[getCacheStats] エラー: ${error.message}`);
    return null;
  }
}

/**
 * CacheService 高速キャッシュ取得
 * @param {string} key - キャッシュキー
 * @returns {*} キャッシュされたデータ、なければnull
 */
function getFastCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    Logger.log('[getFastCache] エラー: ' + error.message);
    return null;
  }
}

/**
 * CacheService 高速キャッシュ保存
 * @param {string} key - キャッシュキー
 * @param {*} data - 保存データ
 * @param {number} ttl - TTL秒（デフォルト3600）
 * @returns {boolean}
 */
function setFastCache(key, data, ttl) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(data), ttl || 3600);
    return true;
  } catch (error) {
    Logger.log('[setFastCache] エラー: ' + error.message);
    return false;
  }
}

/**
 * CacheService キャッシュ無効化
 * @param {string} key - キャッシュキー
 */
function invalidateFastCache(key) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(key);
  } catch (error) {
    Logger.log('[invalidateFastCache] エラー: ' + error.message);
  }
}

/**
 * LockService wrapper for atomic operations
 * Ensures exclusive access during spreadsheet write operations
 * @param {Function} fn - Function to execute within lock
 * @param {number} timeoutMs - Lock timeout in milliseconds (default: 30000)
 * @returns {*} Return value of fn
 */
function withScriptLock(fn, timeoutMs) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(timeoutMs || 30000);
    return fn();
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

// google.script.run cannot serialize Date objects (returns null silently).
// Always use this when returning spreadsheet cell values to the frontend.
function safeValue(val) {
  if (val instanceof Date) return val.toISOString();
  return val;
}
