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
        console.log('検針アプリ: オフライン機能を有効化');
        return registration;
      } catch (error) {
        // Service Worker登録失敗時は無視（ユーザビリティ重視）
      }
    } else {
      // Service Worker非対応時は無視（ユーザビリティ重視）
    }
  }

  // インストールプロンプト設定
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('検針アプリ: アプリインストール可能');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('検針アプリ: インストール完了');
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
  // シンプル キャッシュシステム（ユーザビリティ重視）
  // ========================================

  // キャッシュシステムは完全廃止（Network-Only戦略）
  initCacheSystem() {
    console.log('検針アプリ: キャッシュなし高速モード');
  }

  // ========================================
  // 簡素化されたキャッシュ互換性メソッド
  // ========================================
  
  // 下位互換性のためのスタブメソッド（実際のキャッシュはService Workerが処理）
  isCacheValid(key, customMaxAge = null) {
    // Service Workerが管理するため、常にfalseを返して新規取得を促す
    return false;
  }

  getCacheData(key) {
    // Service Workerが管理するため、nullを返して新規取得を促す
    return null;
  }

  setCacheData(key, data, customMaxAge = null) {
    // Service Workerが管理するため、何もしない
    return true;
  }

  removeCacheData(key) {
    // Service Workerが管理するため、何もしない
    return true;
  }

  clearCache(pattern = 'all') {
    // LocalStorageキャッシュは廃止済み
    console.log('検針アプリ: データ管理を簡素化');
    return 0;
  }

  // 差分データマージ（Service Worker統一管理）
  mergeData(cachedData, deltaData, keyField = 'id') {
    // Service Workerが管理するため、新規データをそのまま返す
    return deltaData || cachedData || [];
  }

  // キャッシュストレージサイズ取得（Service Worker統一管理）
  getCacheStorageSize() {
    // Service Workerが管理するため、0を返す
    return 0;
  }

  // キャッシュ統計情報取得（Service Worker統一管理）
  getCacheStats() {
    // Service Workerが管理するため、簡素な統計を返す
    return {
      enabled: true,
      totalCaches: 0,
      validCaches: 0,
      expiredCaches: 0,
      totalSizeKB: 0,
      maxSizeKB: 0,
      usagePercent: 0,
      message: 'Service Worker統一キャッシュ管理中'
    };
  }
}

// PWAUtilsのグローバルインスタンス
window.pwaUtils = new PWAUtils();

// DOMContentLoaded後の設定
document.addEventListener('DOMContentLoaded', () => {
  console.log('検針アプリ: 機能初期化完了');
});

// 簡素化されたパフォーマンス最適化拡張（Service Worker統一管理）
PWAUtils.prototype.getOptimalCacheAge = function(dataType) {
  // Service Workerが管理するため、固定値を返す
  return 120000; // 2分（超短時間）
};

PWAUtils.prototype.recordCacheAccess = function(key) {
  // Service Workerが管理するため、何もしない
  return;
};

PWAUtils.prototype.getCacheAccessCounts = function() {
  // Service Workerが管理するため、空のオブジェクトを返す
  return {};
};

PWAUtils.prototype.protectHighPriorityCache = function() {
  // Service Workerが管理するため、空の配列を返す
  // 簡素化されたキャッシュ管理
  return [];
};

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAUtils;
}
