/**
 * offline-manager.js - オフライン対応管理システム
 * 制約: meter_reading画面の機能を完全に維持しつつオフライン対応
 */

class OfflineManager {
  constructor() {
    this.dbName = 'WaterMeterReadingDB';
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.pendingSync = [];
    
    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    try {
      console.log('[OfflineManager] 初期化開始');
      
      // IndexedDBの初期化
      await this.initDB();
      
      // オンライン状態の監視
      this.setupOnlineStatusMonitoring();
      
      // サービスワーカーの登録
      await this.registerServiceWorker();
      
      // 既存の未同期データの確認
      await this.checkPendingSync();
      
      console.log('[OfflineManager] 初期化完了');
      
    } catch (error) {
      console.error('[OfflineManager] 初期化エラー:', error);
    }
  }

  /**
   * IndexedDBの初期化
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 検針データストア
        if (!db.objectStoreNames.contains('meterReadings')) {
          const meterStore = db.createObjectStore('meterReadings', { keyPath: 'id', autoIncrement: true });
          meterStore.createIndex('propertyId', 'propertyId', { unique: false });
          meterStore.createIndex('roomId', 'roomId', { unique: false });
          meterStore.createIndex('timestamp', 'timestamp', { unique: false });
          meterStore.createIndex('synced', 'synced', { unique: false });
        }
        
        // 物件データストア
        if (!db.objectStoreNames.contains('properties')) {
          const propertyStore = db.createObjectStore('properties', { keyPath: 'id' });
          propertyStore.createIndex('name', 'name', { unique: false });
        }
        
        // 部屋データストア
        if (!db.objectStoreNames.contains('rooms')) {
          const roomStore = db.createObjectStore('rooms', { keyPath: 'id' });
          roomStore.createIndex('propertyId', 'propertyId', { unique: false });
          roomStore.createIndex('name', 'name', { unique: false });
        }
        
        // 同期キューストア
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * オンライン状態の監視
   */
  setupOnlineStatusMonitoring() {
    window.addEventListener('online', () => {
      console.log('[OfflineManager] オンライン復帰');
      this.isOnline = true;
      this.syncPendingData();
      this.showOnlineNotification();
    });
    
    window.addEventListener('offline', () => {
      console.log('[OfflineManager] オフライン状態');
      this.isOnline = false;
      this.showOfflineNotification();
    });
  }

  /**
   * サービスワーカーの登録
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[OfflineManager] サービスワーカー登録成功:', registration);
        
        // バックグラウンド同期の登録
        if ('sync' in registration) {
          await registration.sync.register('meter-reading-sync');
          console.log('[OfflineManager] バックグラウンド同期登録成功');
        }
        
        return registration;
      } catch (error) {
        console.error('[OfflineManager] サービスワーカー登録エラー:', error);
      }
    }
  }

  /**
   * 検針データの保存（オフライン対応）
   * 制約: meter_reading画面の既存機能を完全に維持
   */
  async saveMeterReadings(propertyId, roomId, readings) {
    try {
      const data = {
        propertyId: propertyId,
        roomId: roomId,
        readings: readings,
        timestamp: new Date().toISOString(),
        synced: this.isOnline
      };
      
      // IndexedDBに保存
      const id = await this.saveToIndexedDB('meterReadings', data);
      
      if (this.isOnline) {
        // オンライン時は即座に同期
        try {
          await this.syncMeterReadings(id, data);
          await this.markAsSynced('meterReadings', id);
          
          console.log('[OfflineManager] 検針データ保存・同期完了');
          return { success: true, id: id, synced: true };
          
        } catch (error) {
          console.error('[OfflineManager] 同期エラー:', error);
          // 同期失敗時はオフライン扱い
          return { success: true, id: id, synced: false, error: error.message };
        }
      } else {
        // オフライン時は同期キューに追加
        await this.addToSyncQueue('updateMeterReadings', data);
        
        console.log('[OfflineManager] 検針データをオフライン保存');
        return { success: true, id: id, synced: false, offline: true };
      }
      
    } catch (error) {
      console.error('[OfflineManager] 検針データ保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 検針データの取得（オフライン対応）
   * 制約: meter_reading画面が期待する形式で返却
   */
  async getMeterReadings(propertyId, roomId) {
    try {
      if (this.isOnline) {
        // オンライン時はネットワークから取得
        const response = await fetch(`/api/getMeterReadings?propertyId=${propertyId}&roomId=${roomId}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // 成功したデータをキャッシュ
          await this.cacheMeterReadings(propertyId, roomId, data);
          
          return data;
        }
      }
      
      // オフライン時またはネットワークエラー時はキャッシュから取得
      const cachedData = await this.getCachedMeterReadings(propertyId, roomId);
      
      if (cachedData) {
        return {
          ...cachedData,
          offline: true,
          message: 'オフライン中のため、キャッシュされたデータを表示しています'
        };
      }
      
      // キャッシュにもない場合のフォールバック
      return {
        propertyName: '物件名（オフライン）',
        roomName: '部屋名（オフライン）',
        readings: [],
        offline: true,
        error: 'オフライン中のため、データを取得できません'
      };
      
    } catch (error) {
      console.error('[OfflineManager] 検針データ取得エラー:', error);
      return {
        propertyName: '物件名（エラー）',
        roomName: '部屋名（エラー）',
        readings: [],
        error: error.message
      };
    }
  }

  /**
   * IndexedDBへの保存
   */
  async saveToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * IndexedDBからの取得
   */
  async getFromIndexedDB(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 検針データのキャッシュ
   */
  async cacheMeterReadings(propertyId, roomId, data) {
    const cacheData = {
      id: `${propertyId}_${roomId}`,
      propertyId: propertyId,
      roomId: roomId,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    const transaction = this.db.transaction(['meterReadings'], 'readwrite');
    const store = transaction.objectStore('meterReadings');
    await store.put(cacheData);
  }

  /**
   * キャッシュされた検針データの取得
   */
  async getCachedMeterReadings(propertyId, roomId) {
    const cacheKey = `${propertyId}_${roomId}`;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['meterReadings'], 'readonly');
      const store = transaction.objectStore('meterReadings');
      const request = store.get(cacheKey);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 同期キューへの追加
   */
  async addToSyncQueue(action, data) {
    const queueItem = {
      action: action,
      data: data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    await store.add(queueItem);
  }

  /**
   * 検針データの同期
   */
  async syncMeterReadings(id, data) {
    const response = await fetch('/api/updateMeterReadings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        propertyId: data.propertyId,
        roomId: data.roomId,
        readings: data.readings
      })
    });
    
    if (!response.ok) {
      throw new Error(`同期エラー: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * 同期済みマーク
   */
  async markAsSynced(storeName, id) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        data.synced = true;
        data.syncedAt = new Date().toISOString();
        store.put(data);
      }
    };
  }

  /**
   * 未同期データの確認
   */
  async checkPendingSync() {
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();
    
    request.onsuccess = () => {
      this.pendingSync = request.result;
      console.log(`[OfflineManager] 未同期データ: ${this.pendingSync.length}件`);
    };
  }

  /**
   * 未同期データの同期
   */
  async syncPendingData() {
    if (this.pendingSync.length === 0) return;
    
    console.log('[OfflineManager] 未同期データの同期開始');
    
    for (const item of this.pendingSync) {
      try {
        await this.syncSingleItem(item);
        await this.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error('[OfflineManager] 同期エラー:', error);
        await this.incrementRetryCount(item.id);
      }
    }
    
    await this.checkPendingSync();
    console.log('[OfflineManager] 未同期データの同期完了');
  }

  /**
   * 単一アイテムの同期
   */
  async syncSingleItem(item) {
    if (item.action === 'updateMeterReadings') {
      return this.syncMeterReadings(null, item.data);
    }
    
    throw new Error(`未対応のアクション: ${item.action}`);
  }

  /**
   * 同期キューからアイテムを削除
   */
  async removeSyncQueueItem(id) {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    await store.delete(id);
  }

  /**
   * リトライ回数の増加
   */
  async incrementRetryCount(id) {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.get(id);
    
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        data.retryCount = (data.retryCount || 0) + 1;
        data.lastRetry = new Date().toISOString();
        store.put(data);
      }
    };
  }

  /**
   * オンライン通知の表示
   */
  showOnlineNotification() {
    this.showNotification('オンライン復帰', 'ネットワークに接続されました。未同期データを同期中です。', 'success');
  }

  /**
   * オフライン通知の表示
   */
  showOfflineNotification() {
    this.showNotification('オフライン状態', 'ネットワークに接続されていません。データはローカルに保存されます。', 'warning');
  }

  /**
   * 通知の表示
   */
  showNotification(title, message, type = 'info') {
    // 既存の通知システムがある場合はそれを使用
    // なければコンソールログで代替
    console.log(`[通知 ${type}] ${title}: ${message}`);
    
    // 将来的にはUIに通知バナーを表示
    const notificationEvent = new CustomEvent('offline-notification', {
      detail: { title, message, type }
    });
    window.dispatchEvent(notificationEvent);
  }

  /**
   * オンライン状態の確認
   */
  isOnlineStatus() {
    return this.isOnline;
  }

  /**
   * 統計情報の取得
   */
  async getStats() {
    const stats = {
      isOnline: this.isOnline,
      pendingSync: this.pendingSync.length,
      dbName: this.dbName,
      dbVersion: this.dbVersion
    };
    
    try {
      // 各ストアのデータ数を取得
      const storeNames = ['meterReadings', 'properties', 'rooms', 'syncQueue'];
      
      for (const storeName of storeNames) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        
        stats[storeName] = await new Promise((resolve) => {
          countRequest.onsuccess = () => resolve(countRequest.result);
        });
      }
      
    } catch (error) {
      console.error('[OfflineManager] 統計取得エラー:', error);
    }
    
    return stats;
  }
}

// グローバルインスタンス
window.offlineManager = new OfflineManager();

// デバッグ用（開発時のみ）
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
  window.offlineDebug = {
    getStats: () => window.offlineManager.getStats(),
    syncPendingData: () => window.offlineManager.syncPendingData(),
    showOfflineNotification: () => window.offlineManager.showOfflineNotification(),
    showOnlineNotification: () => window.offlineManager.showOnlineNotification()
  };
}

console.log('[offline-manager.js] オフライン管理システム初期化完了');