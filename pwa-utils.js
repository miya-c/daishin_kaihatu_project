// PWA Utilities - Simplified for Vercel + GAS architecture
// Basic PWA support functions

class PWAUtils {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.cacheConfig = {
      prefix: 'suido_cache_',
      maxAge: 3600000, // 1時間
      maxSize: 5242880, // 5MB
      enabled: true
    };
    this.init();
  }

  // PWA初期化
  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkInstallStatus();
    this.initCacheSystem();
  }

  // Service Worker登録
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('PWA: Service Worker registered successfully:', registration.scope);
        return registration;
      } catch (error) {
        console.error('PWA: Service Worker registration failed:', error);
      }
    } else {
      console.log('PWA: Service Worker not supported');
    }
  }

  // インストールプロンプト設定
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA: App was installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
    });
  }

  // インストールボタン表示
  showInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.promptInstall());
    } else {
      this.createInstallButton();
    }
  }

  // インストールボタン作成
  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.className = 'btn btn-primary btn-sm position-fixed pwa-install-btn';
    button.innerHTML = '📱 アプリをインストール';
    button.addEventListener('click', () => this.promptInstall());
    document.body.appendChild(button);
  }

  // インストールプロンプト表示
  async promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('PWA: User response to install prompt:', outcome);
      this.deferredPrompt = null;
      this.hideInstallButton();
    }
  }

  // インストール状態確認
  checkInstallStatus() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      console.log('PWA: App is running in standalone mode');
      this.isInstalled = true;
      this.hideInstallButton();
    }
  }

  // インストールボタン非表示
  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  // アプリ情報取得
  getAppInfo() {
    return {
      isInstalled: this.isInstalled,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator,
      userAgent: navigator.userAgent,
      cacheEnabled: this.cacheConfig.enabled,
      cacheStats: this.getCacheStats()
    };
  }

  // ========================================
  // キャッシュシステム（速度改善用）
  // ========================================

  // キャッシュシステム初期化
  initCacheSystem() {
    if (!this.cacheConfig.enabled) {
      console.log('Cache: キャッシュシステムは無効です');
      return;
    }

    try {
      // LocalStorageの可用性確認
      const testKey = this.cacheConfig.prefix + 'test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      console.log('Cache: キャッシュシステム初期化完了');
      
      // 期限切れキャッシュのクリーンアップ
      this.cleanupExpiredCache();
    } catch (error) {
      console.error('Cache: 初期化エラー:', error);
      this.cacheConfig.enabled = false;
    }
  }

  // キャッシュの有効性確認
  isCacheValid(key, customMaxAge = null) {
    if (!this.cacheConfig.enabled) return false;
    
    try {
      const cacheData = this.getCacheData(key);
      if (!cacheData) return false;
      
      const maxAge = customMaxAge || this.cacheConfig.maxAge;
      const age = Date.now() - cacheData.timestamp;
      
      return age < maxAge;
    } catch (error) {
      console.error('Cache: 有効性確認エラー:', error);
      return false;
    }
  }

  // キャッシュデータ取得
  getCacheData(key) {
    if (!this.cacheConfig.enabled) return null;
    
    try {
      const fullKey = this.cacheConfig.prefix + key;
      const cached = localStorage.getItem(fullKey);
      
      if (!cached) return null;
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('Cache: データ取得エラー:', error);
      // 破損したキャッシュを削除
      this.removeCacheData(key);
      return null;
    }
  }

  // キャッシュデータ保存
  setCacheData(key, data, customMaxAge = null) {
    if (!this.cacheConfig.enabled) return false;
    
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        key: key,
        maxAge: customMaxAge || this.cacheConfig.maxAge,
        version: '3.0.0'
      };
      
      const serialized = JSON.stringify(cacheData);
      
      // サイズチェック
      if (serialized.length > this.cacheConfig.maxSize) {
        console.warn('Cache: データサイズが制限を超過:', serialized.length);
        return false;
      }
      
      // ストレージ容量チェック
      const currentSize = this.getCacheStorageSize();
      if (currentSize + serialized.length > this.cacheConfig.maxSize) {
        console.log('Cache: 容量不足、古いキャッシュをクリーンアップ中...');
        this.cleanupExpiredCache();
        
        // 再チェック
        const newSize = this.getCacheStorageSize();
        if (newSize + serialized.length > this.cacheConfig.maxSize) {
          console.warn('Cache: クリーンアップ後も容量不足');
          return false;
        }
      }
      
      const fullKey = this.cacheConfig.prefix + key;
      localStorage.setItem(fullKey, serialized);
      
      console.log(`Cache: データ保存完了 - ${key} (${Math.round(serialized.length/1024)}KB)`);
      return true;
    } catch (error) {
      console.error('Cache: データ保存エラー:', error);
      return false;
    }
  }

  // キャッシュデータ削除
  removeCacheData(key) {
    if (!this.cacheConfig.enabled) return false;
    
    try {
      const fullKey = this.cacheConfig.prefix + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Cache: データ削除エラー:', error);
      return false;
    }
  }

  // キャッシュクリア
  clearCache(pattern = 'all') {
    if (!this.cacheConfig.enabled) return 0;
    
    try {
      let clearedCount = 0;
      const keysToRemove = [];
      
      // LocalStorage内のキーを確認
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cacheConfig.prefix)) {
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
              shouldClear = key === this.cacheConfig.prefix + pattern;
              break;
          }
          
          if (shouldClear) {
            keysToRemove.push(key);
          }
        }
      }
      
      // キーを削除
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        clearedCount++;
      });
      
      console.log(`Cache: ${clearedCount}個のキャッシュをクリア (パターン: ${pattern})`);
      return clearedCount;
    } catch (error) {
      console.error('Cache: クリアエラー:', error);
      return 0;
    }
  }

  // 期限切れキャッシュのクリーンアップ
  cleanupExpiredCache() {
    if (!this.cacheConfig.enabled) return 0;
    
    try {
      let cleanedCount = 0;
      const keysToRemove = [];
      const now = Date.now();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cacheConfig.prefix)) {
          try {
            const cached = localStorage.getItem(key);
            const cacheData = JSON.parse(cached);
            const age = now - cacheData.timestamp;
            const maxAge = cacheData.maxAge || this.cacheConfig.maxAge;
            
            if (age > maxAge) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // パース失敗したキャッシュも削除
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });
      
      if (cleanedCount > 0) {
        console.log(`Cache: ${cleanedCount}個の期限切れキャッシュをクリーンアップ`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Cache: クリーンアップエラー:', error);
      return 0;
    }
  }

  // 差分データマージ
  mergeData(cachedData, deltaData, keyField = 'id') {
    try {
      if (!Array.isArray(cachedData) || !Array.isArray(deltaData)) {
        console.error('Cache: 無効なデータ形式');
        return cachedData || [];
      }
      
      // キャッシュデータをMapに変換
      const dataMap = new Map();
      cachedData.forEach(item => {
        if (item[keyField]) {
          dataMap.set(item[keyField], item);
        }
      });
      
      // 差分データを適用
      deltaData.forEach(deltaItem => {
        if (deltaItem[keyField]) {
          dataMap.set(deltaItem[keyField], deltaItem);
        }
      });
      
      const mergedData = Array.from(dataMap.values());
      console.log(`Cache: マージ完了 - キャッシュ${cachedData.length}件 + 差分${deltaData.length}件 = 結果${mergedData.length}件`);
      
      return mergedData;
    } catch (error) {
      console.error('Cache: マージエラー:', error);
      return cachedData || [];
    }
  }

  // キャッシュストレージサイズ取得
  getCacheStorageSize() {
    try {
      let totalSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cacheConfig.prefix)) {
          const value = localStorage.getItem(key);
          totalSize += key.length + (value ? value.length : 0);
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Cache: サイズ計算エラー:', error);
      return 0;
    }
  }

  // キャッシュ統計情報取得
  getCacheStats() {
    if (!this.cacheConfig.enabled) {
      return { enabled: false };
    }
    
    try {
      let totalCaches = 0;
      let validCaches = 0;
      let expiredCaches = 0;
      const now = Date.now();
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cacheConfig.prefix)) {
          totalCaches++;
          
          try {
            const cached = localStorage.getItem(key);
            const cacheData = JSON.parse(cached);
            const age = now - cacheData.timestamp;
            const maxAge = cacheData.maxAge || this.cacheConfig.maxAge;
            
            if (age > maxAge) {
              expiredCaches++;
            } else {
              validCaches++;
            }
          } catch (e) {
            expiredCaches++;
          }
        }
      }
      
      const totalSize = this.getCacheStorageSize();
      
      return {
        enabled: true,
        totalCaches,
        validCaches,
        expiredCaches,
        totalSizeKB: Math.round(totalSize / 1024),
        maxSizeKB: Math.round(this.cacheConfig.maxSize / 1024),
        usagePercent: Math.round((totalSize / this.cacheConfig.maxSize) * 100)
      };
    } catch (error) {
      console.error('Cache: 統計取得エラー:', error);
      return { enabled: true, error: error.message };
    }
  }
}

// PWAUtilsのグローバルインスタンス
window.pwaUtils = new PWAUtils();

// DOMContentLoaded後の設定
document.addEventListener('DOMContentLoaded', () => {
  console.log('PWA: PWA utilities initialized');
});

// パフォーマンス最適化拡張
PWAUtils.prototype.getOptimalCacheAge = function(dataType) {
  const cacheAgeMap = {
    'properties': 3600000,      // 1時間（物件データは比較的安定）
    'rooms': 1800000,          // 30分（部屋データは変更頻度中程度）
    'inspection_data': 600000,  // 10分（検針データは変更頻度高）
    'user_settings': 7200000,   // 2時間（設定データは変更頻度低）
    'delta_data': 300000       // 5分（差分データは短期有効）
  };
  
  return cacheAgeMap[dataType] || this.cacheConfig.maxAge;
};

PWAUtils.prototype.recordCacheAccess = function(key) {
  const accessKey = `cache_access_${key}`;
  const currentCount = parseInt(localStorage.getItem(accessKey) || '0');
  localStorage.setItem(accessKey, (currentCount + 1).toString());
};

PWAUtils.prototype.getCacheAccessCounts = function() {
  const counts = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_access_')) {
      const originalKey = key.replace('cache_access_', '');
      counts[originalKey] = parseInt(localStorage.getItem(key) || '0');
    }
  }
  return counts;
};

PWAUtils.prototype.protectHighPriorityCache = function() {
  const accessCounts = this.getCacheAccessCounts();
  const highPriorityKeys = Object.entries(accessCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5) // トップ5のキーを保護
    .map(([key]) => key);
  
  // 保護対象キーをマーク
  highPriorityKeys.forEach(key => {
    const cacheData = this.getCacheData(key);
    if (cacheData) {
      cacheData._protected = true;
      localStorage.setItem(key, JSON.stringify(cacheData));
    }
  });
  
  console.log('Cache: 高頻度アクセスデータを保護:', highPriorityKeys);
  return highPriorityKeys;
};

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAUtils;
}
