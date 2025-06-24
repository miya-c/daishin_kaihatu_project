// PWA Utilities - Simplified for Vercel + GAS architecture
// Basic PWA support functions

class PWAUtils {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  // PWA初期化
  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkInstallStatus();
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
      userAgent: navigator.userAgent
    };
  }
}

// PWAUtilsのグローバルインスタンス
window.pwaUtils = new PWAUtils();

// DOMContentLoaded後の設定
document.addEventListener('DOMContentLoaded', () => {
  console.log('PWA: PWA utilities initialized');
});

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAUtils;
}
