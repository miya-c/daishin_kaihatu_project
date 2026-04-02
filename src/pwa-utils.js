// PWA Utilities - Service Worker registration and install prompt

class PWAUtils {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.checkInstallStatus();
    this.setupPeriodicUpdate();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        return registration;
      } catch (_) {
        // Service Worker registration failed
      }
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallButton();
    });
  }

  showInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.promptInstall());
    } else {
      this.createInstallButton();
    }
  }

  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.className = 'btn btn-primary btn-sm position-fixed pwa-install-btn';
    button.textContent = 'アプリをインストール';
    button.addEventListener('click', () => this.promptInstall());
    document.body.appendChild(button);
  }

  async promptInstall() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.hideInstallButton();
    }
  }

  checkInstallStatus() {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      this.isInstalled = true;
      this.hideInstallButton();
    }
  }

  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  getAppInfo() {
    return {
      isInstalled: this.isInstalled,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator,
      userAgent: navigator.userAgent,
    };
  }

  showNetworkStatus(_message, _level) {
    // Network status is now handled by NetworkStatusBar Svelte component
  }

  setupPeriodicUpdate() {
    if ('serviceWorker' in navigator) {
      setInterval(
        async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registration.update();
          }
        },
        60 * 60 * 1000
      ); // Check for updates every hour
    }
  }
}

window.pwaUtils = new PWAUtils();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAUtils;
}
