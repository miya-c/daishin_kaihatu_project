/**
 * pwa-install.js - PWAインストール機能
 * アプリのインストール促進とプッシュ通知管理
 */

class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.supportsNotifications = 'Notification' in window;
    this.supportsPush = 'PushManager' in window;
    this.pushSubscription = null;
    
    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    console.log('[PWAInstaller] 初期化開始');
    
    // インストール状態の確認
    this.checkInstallStatus();
    
    // インストールプロンプトの監視
    this.setupInstallPrompt();
    
    // 通知権限の確認
    this.checkNotificationPermission();
    
    // プッシュ通知の初期化
    await this.initPushNotifications();
    
    console.log('[PWAInstaller] 初期化完了');
  }

  /**
   * インストール状態の確認
   */
  checkInstallStatus() {
    // PWAがインストールされているかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('[PWAInstaller] PWAがインストールされています');
    } else {
      console.log('[PWAInstaller] PWAは未インストールです');
    }
  }

  /**
   * インストールプロンプトの設定
   */
  setupInstallPrompt() {
    // beforeinstallpromptイベントの監視
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWAInstaller] インストールプロンプト利用可能');
      
      // デフォルトのプロンプトを防止
      e.preventDefault();
      
      // 後で使用するためにイベントを保存
      this.deferredPrompt = e;
      
      // カスタムインストールボタンを表示
      this.showInstallButton();
    });

    // インストール完了後のイベント
    window.addEventListener('appinstalled', (e) => {
      console.log('[PWAInstaller] アプリがインストールされました');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showInstallSuccessMessage();
    });
  }

  /**
   * インストールボタンの表示
   */
  showInstallButton() {
    // インストールボタンの作成
    const installButton = this.createInstallButton();
    
    // ページに追加
    document.body.appendChild(installButton);
    
    // フェードイン効果
    setTimeout(() => {
      installButton.style.opacity = '1';
    }, 100);
  }

  /**
   * インストールボタンの作成
   */
  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      アプリをインストール
    `;
    
    // スタイル設定
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '25px',
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: '10000',
      opacity: '0',
      transition: 'all 0.3s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
    
    // ホバー効果
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#0056b3';
      button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#007bff';
      button.style.transform = 'translateY(0)';
    });
    
    // クリックイベント
    button.addEventListener('click', () => {
      this.installApp();
    });
    
    return button;
  }

  /**
   * アプリのインストール実行
   */
  async installApp() {
    if (!this.deferredPrompt) {
      console.log('[PWAInstaller] インストールプロンプトが利用できません');
      return;
    }
    
    try {
      // インストールプロンプトを表示
      this.deferredPrompt.prompt();
      
      // ユーザーの選択を待つ
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWAInstaller] ユーザーがインストールを承認');
      } else {
        console.log('[PWAInstaller] ユーザーがインストールを拒否');
      }
      
      // プロンプトを無効化
      this.deferredPrompt = null;
      
      // ボタンを非表示
      this.hideInstallButton();
      
    } catch (error) {
      console.error('[PWAInstaller] インストールエラー:', error);
    }
  }

  /**
   * インストールボタンの非表示
   */
  hideInstallButton() {
    const button = document.getElementById('pwa-install-button');
    if (button) {
      button.style.opacity = '0';
      setTimeout(() => {
        button.remove();
      }, 300);
    }
  }

  /**
   * インストール成功メッセージの表示
   */
  showInstallSuccessMessage() {
    const message = document.createElement('div');
    message.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        アプリのインストールが完了しました
      </div>
    `;
    
    Object.assign(message.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: '#28a745',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: '10000',
      boxShadow: '0 4px 12px rgba(40,167,69,0.3)',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
    
    document.body.appendChild(message);
    
    // フェードイン
    setTimeout(() => {
      message.style.opacity = '1';
    }, 100);
    
    // 3秒後にフェードアウト
    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => {
        message.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 通知権限の確認
   */
  checkNotificationPermission() {
    if (!this.supportsNotifications) {
      console.log('[PWAInstaller] 通知がサポートされていません');
      return;
    }
    
    console.log('[PWAInstaller] 通知権限:', Notification.permission);
    
    if (Notification.permission === 'default') {
      // 権限が未決定の場合、後でリクエストを表示
      this.showNotificationPermissionRequest();
    }
  }

  /**
   * 通知権限のリクエスト表示
   */
  showNotificationPermissionRequest() {
    // 遅延してリクエストを表示（UXを考慮）
    setTimeout(() => {
      if (Notification.permission === 'default') {
        this.requestNotificationPermission();
      }
    }, 5000); // 5秒後
  }

  /**
   * 通知権限のリクエスト
   */
  async requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      console.log('[PWAInstaller] 通知権限の結果:', permission);
      
      if (permission === 'granted') {
        console.log('[PWAInstaller] 通知権限が許可されました');
        await this.initPushNotifications();
      } else {
        console.log('[PWAInstaller] 通知権限が拒否されました');
      }
      
    } catch (error) {
      console.error('[PWAInstaller] 通知権限リクエストエラー:', error);
    }
  }

  /**
   * プッシュ通知の初期化
   */
  async initPushNotifications() {
    if (!this.supportsPush || !('serviceWorker' in navigator)) {
      console.log('[PWAInstaller] プッシュ通知がサポートされていません');
      return;
    }
    
    if (Notification.permission !== 'granted') {
      console.log('[PWAInstaller] 通知権限がありません');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('[PWAInstaller] サービスワーカーの準備完了');
      
      // 既存のサブスクリプションを確認
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        console.log('[PWAInstaller] 既存のプッシュサブスクリプションが見つかりました');
        this.pushSubscription = existingSubscription;
      } else {
        console.log('[PWAInstaller] 新しいプッシュサブスクリプションを作成します');
        await this.subscribeToPush(registration);
      }
      
    } catch (error) {
      console.error('[PWAInstaller] プッシュ通知初期化エラー:', error);
    }
  }

  /**
   * プッシュ通知の購読
   */
  async subscribeToPush(registration) {
    try {
      // VAPID公開鍵（実際の運用では環境変数から取得）
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8wBbf8gCc5r4nJtBQKrOGlIvQvJ9FzWV6PKvd4-zQm5hY4t6PTRT4UOo';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });
      
      console.log('[PWAInstaller] プッシュサブスクリプション作成成功');
      this.pushSubscription = subscription;
      
      // サーバーにサブスクリプションを送信
      await this.sendSubscriptionToServer(subscription);
      
    } catch (error) {
      console.error('[PWAInstaller] プッシュサブスクリプション作成エラー:', error);
    }
  }

  /**
   * サーバーにサブスクリプションを送信
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/subscribe-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
      
      if (response.ok) {
        console.log('[PWAInstaller] サブスクリプションをサーバーに送信しました');
      } else {
        console.error('[PWAInstaller] サブスクリプション送信エラー:', response.status);
      }
      
    } catch (error) {
      console.error('[PWAInstaller] サブスクリプション送信エラー:', error);
    }
  }

  /**
   * VAPID鍵の変換
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  /**
   * 通知の送信
   */
  async sendNotification(title, options = {}) {
    if (!this.supportsNotifications || Notification.permission !== 'granted') {
      console.log('[PWAInstaller] 通知を送信できません');
      return;
    }
    
    const notification = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/icon-72x72.png',
      tag: options.tag || 'water-meter-notification',
      data: options.data || {},
      ...options
    });
    
    // 通知のクリック処理
    notification.onclick = (event) => {
      event.preventDefault();
      
      // 通知を閉じる
      notification.close();
      
      // アプリにフォーカス
      if (window.focus) {
        window.focus();
      }
      
      // カスタムイベントを発火
      const clickEvent = new CustomEvent('notification-click', {
        detail: { notification: notification, data: options.data }
      });
      window.dispatchEvent(clickEvent);
    };
    
    return notification;
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    return {
      isInstalled: this.isInstalled,
      supportsNotifications: this.supportsNotifications,
      supportsPush: this.supportsPush,
      notificationPermission: this.supportsNotifications ? Notification.permission : 'not-supported',
      hasPushSubscription: !!this.pushSubscription,
      deferredPromptAvailable: !!this.deferredPrompt
    };
  }
}

// グローバルインスタンス
window.pwaInstaller = new PWAInstaller();

// 通知クリックイベントの監視例
window.addEventListener('notification-click', (event) => {
  const { data } = event.detail;
  console.log('[PWAInstaller] 通知がクリックされました:', data);
  
  // meter_reading関連の通知の場合
  if (data && data.type === 'meter-reading') {
    // meter_reading画面に遷移
    window.location.href = `/meter_reading?property=${data.propertyId}&room=${data.roomId}`;
  }
});

// デバッグ用（開発時のみ）
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
  window.pwaDebug = {
    getStats: () => window.pwaInstaller.getStats(),
    requestNotificationPermission: () => window.pwaInstaller.requestNotificationPermission(),
    sendNotification: (title, options) => window.pwaInstaller.sendNotification(title, options),
    showInstallButton: () => window.pwaInstaller.showInstallButton()
  };
}

console.log('[pwa-install.js] PWAインストール機能初期化完了');