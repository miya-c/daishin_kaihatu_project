/**
 * Service Worker 登録ユーティリティ
 */

class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
  }

  // Service Worker を登録
  async register() {
    if (!this.isSupported) {
      console.warn('[SW] Service Worker not supported');
      return null;
    }

    try {
      console.log('[SW] Registering Service Worker...');
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW] Service Worker registered successfully');
      
      // アップデート検出
      this.registration.addEventListener('updatefound', () => {
        console.log('[SW] New Service Worker found');
        this.handleUpdateFound();
      });

      // 状態変化の監視
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page');
        window.location.reload();
      });

      return this.registration;
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      return null;
    }
  }

  // アップデート検出時の処理
  handleUpdateFound() {
    const installingWorker = this.registration.installing;
    
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // 新しいバージョンが利用可能
          this.showUpdateNotification();
        } else {
          // 初回インストール
          console.log('[SW] Service Worker installed for the first time');
        }
      }
    });
  }

  // アップデート通知表示
  showUpdateNotification() {
    const shouldUpdate = confirm(
      '新しいバージョンが利用可能です。更新しますか？'
    );

    if (shouldUpdate) {
      this.skipWaiting();
    }
  }

  // 新しいService Workerをアクティブ化
  async skipWaiting() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // キャッシュクリア
  async clearCache() {
    if (!this.registration || !this.registration.active) {
      console.warn('[SW] No active Service Worker found');
      return false;
    }

    try {
      const messageChannel = new MessageChannel();
      
      const response = await new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        this.registration.active.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });

      if (response.success) {
        console.log('[SW] Cache cleared successfully');
        return true;
      } else {
        console.error('[SW] Cache clear failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('[SW] Cache clear error:', error);
      return false;
    }
  }

  // キャッシュサイズ取得
  async getCacheSize() {
    if (!this.registration || !this.registration.active) {
      return 0;
    }

    try {
      const messageChannel = new MessageChannel();
      
      const response = await new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        this.registration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      });

      return response.size || 0;
    } catch (error) {
      console.error('[SW] Cache size check error:', error);
      return 0;
    }
  }

  // オフライン状態の監視
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      console.log('[SW] Back online');
      this.showOfflineStatus(false);
    });

    window.addEventListener('offline', () => {
      console.log('[SW] Gone offline');
      this.showOfflineStatus(true);
    });

    // 初期状態をチェック
    if (!navigator.onLine) {
      this.showOfflineStatus(true);
    }
  }

  // オフライン状態の表示
  showOfflineStatus(isOffline) {
    const existingBanner = document.getElementById('offline-banner');
    
    if (isOffline) {
      if (!existingBanner) {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.innerHTML = `
          <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff9800;
            color: white;
            text-align: center;
            padding: 8px;
            z-index: 9999;
            font-size: 14px;
          ">
            ⚠️ オフラインモードで動作しています
          </div>
        `;
        document.body.appendChild(banner);
        
        // body要素にpadding-topを追加
        document.body.style.paddingTop = '40px';
      }
    } else {
      if (existingBanner) {
        existingBanner.remove();
        document.body.style.paddingTop = '';
      }
    }
  }
}

// グローバルインスタンス
const swManager = new ServiceWorkerManager();

// 自動初期化
document.addEventListener('DOMContentLoaded', async () => {
  await swManager.register();
  swManager.setupOfflineDetection();
  
  // デバッグ用：グローバルアクセス
  window.swManager = swManager;
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ServiceWorkerManager, swManager };
}