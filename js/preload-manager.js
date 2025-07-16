/**
 * preload-manager.js - インテリジェントプリフェッチマネージャー
 * 制約: meter_reading画面への遷移体験を維持
 */

class PreloadManager {
  constructor() {
    this.prefetchQueue = [];
    this.prefetchCache = new Map();
    this.predictionModel = new Map();
    this.isEnabled = true;
    this.maxCacheSize = 10;
    this.prefetchTimeout = 5000; // 5秒タイムアウト
    
    // 使用パターンの学習データ
    this.userPatterns = {
      'property_select': { 'room_select': 0.85, 'meter_reading': 0.15 },
      'room_select': { 'meter_reading': 0.90, 'property_select': 0.10 }
    };
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    console.log('[PreloadManager] 初期化開始');
    
    // ページ遷移の監視
    this.trackPageTransitions();
    
    // ユーザー操作の監視
    this.trackUserInteractions();
    
    // メモリ使用量の監視
    this.monitorMemoryUsage();
    
    console.log('[PreloadManager] 初期化完了');
  }

  /**
   * ページ遷移の監視
   */
  trackPageTransitions() {
    // ページロード時の処理
    window.addEventListener('DOMContentLoaded', () => {
      this.onPageLoad();
    });

    // ページ非表示時の処理
    window.addEventListener('beforeunload', () => {
      this.onPageUnload();
    });
  }

  /**
   * ユーザー操作の監視
   */
  trackUserInteractions() {
    // 物件カードへのマウスオーバー監視
    document.addEventListener('mouseover', (event) => {
      if (event.target.closest('.property-card')) {
        const propertyCard = event.target.closest('.property-card');
        this.onPropertyCardHover(propertyCard);
      }
    });

    // 部屋カードへのマウスオーバー監視
    document.addEventListener('mouseover', (event) => {
      if (event.target.closest('.room-card')) {
        const roomCard = event.target.closest('.room-card');
        this.onRoomCardHover(roomCard);
      }
    });

    // クリック予測（マウスダウン時）
    document.addEventListener('mousedown', (event) => {
      if (event.target.closest('.property-card') || event.target.closest('.room-card')) {
        this.onCardMouseDown(event.target.closest('.property-card, .room-card'));
      }
    });
  }

  /**
   * メモリ使用量の監視
   */
  monitorMemoryUsage() {
    setInterval(() => {
      this.cleanupCache();
    }, 30000); // 30秒間隔
  }

  /**
   * ページロード時の処理
   */
  onPageLoad() {
    const currentPage = this.getCurrentPage();
    console.log(`[PreloadManager] ページロード: ${currentPage}`);
    
    // 現在のページに基づいて次のページを予測
    this.predictAndPrefetch(currentPage);
  }

  /**
   * ページアンロード時の処理
   */
  onPageUnload() {
    // 進行中のプリフェッチをキャンセル
    this.cancelAllPrefetch();
  }

  /**
   * 現在のページを判定
   * @returns {string} ページ名
   */
  getCurrentPage() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    if (path.includes('property_select') || path === '/') {
      return 'property_select';
    } else if (path.includes('room_select')) {
      return 'room_select';
    } else if (path.includes('meter_reading')) {
      return 'meter_reading';
    } else {
      return 'unknown';
    }
  }

  /**
   * 次のページを予測してプリフェッチ
   * @param {string} currentPage - 現在のページ
   */
  predictAndPrefetch(currentPage) {
    if (!this.isEnabled) return;

    const predictions = this.userPatterns[currentPage];
    if (!predictions) return;

    // 最も可能性の高い次のページをプリフェッチ
    const nextPage = Object.keys(predictions).reduce((a, b) => 
      predictions[a] > predictions[b] ? a : b
    );

    if (predictions[nextPage] > 0.5) { // 50%以上の確率
      console.log(`[PreloadManager] 予測プリフェッチ: ${currentPage} → ${nextPage} (${(predictions[nextPage] * 100).toFixed(1)}%)`);
      this.prefetchPage(nextPage, this.getContextForPage(currentPage));
    }
  }

  /**
   * 物件カードホバー時の処理
   * @param {Element} propertyCard - 物件カード要素
   */
  onPropertyCardHover(propertyCard) {
    const propertyId = this.extractPropertyId(propertyCard);
    if (propertyId) {
      console.log(`[PreloadManager] 物件カードホバー: ${propertyId}`);
      this.prefetchRoomsData(propertyId);
    }
  }

  /**
   * 部屋カードホバー時の処理
   * @param {Element} roomCard - 部屋カード要素
   */
  onRoomCardHover(roomCard) {
    const roomId = this.extractRoomId(roomCard);
    const propertyId = this.getPropertyIdFromURL();
    
    if (propertyId && roomId) {
      console.log(`[PreloadManager] 部屋カードホバー: ${propertyId}/${roomId}`);
      this.prefetchMeterData(propertyId, roomId);
    }
  }

  /**
   * カードマウスダウン時の処理（クリック予測）
   * @param {Element} card - カード要素
   */
  onCardMouseDown(card) {
    // クリック予測で即座にプリフェッチ
    if (card.classList.contains('property-card')) {
      const propertyId = this.extractPropertyId(card);
      if (propertyId) {
        console.log(`[PreloadManager] クリック予測 - 物件: ${propertyId}`);
        this.prefetchRoomsDataUrgent(propertyId);
      }
    } else if (card.classList.contains('room-card')) {
      const roomId = this.extractRoomId(card);
      const propertyId = this.getPropertyIdFromURL();
      if (propertyId && roomId) {
        console.log(`[PreloadManager] クリック予測 - 部屋: ${propertyId}/${roomId}`);
        this.prefetchMeterDataUrgent(propertyId, roomId);
      }
    }
  }

  /**
   * ページのプリフェッチ
   * @param {string} page - ページ名
   * @param {Object} context - コンテキスト情報
   */
  async prefetchPage(page, context) {
    const cacheKey = `page_${page}_${JSON.stringify(context)}`;
    
    if (this.prefetchCache.has(cacheKey)) {
      console.log(`[PreloadManager] プリフェッチキャッシュヒット: ${page}`);
      return;
    }

    try {
      switch (page) {
        case 'room_select':
          if (context.propertyId) {
            await this.prefetchRoomsData(context.propertyId);
          }
          break;
        case 'meter_reading':
          if (context.propertyId && context.roomId) {
            await this.prefetchMeterData(context.propertyId, context.roomId);
          }
          break;
      }
    } catch (error) {
      console.error(`[PreloadManager] プリフェッチエラー: ${page}`, error);
    }
  }

  /**
   * 部屋データのプリフェッチ
   * @param {string} propertyId - 物件ID
   */
  async prefetchRoomsData(propertyId) {
    const cacheKey = `rooms_${propertyId}`;
    
    if (this.prefetchCache.has(cacheKey)) return;

    try {
      console.log(`[PreloadManager] 部屋データプリフェッチ開始: ${propertyId}`);
      
      const data = await this.fetchWithTimeout(`/api/getRooms?propertyId=${propertyId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      this.prefetchCache.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
        type: 'rooms'
      });

      console.log(`[PreloadManager] 部屋データプリフェッチ完了: ${propertyId}`);
      
      // 制約: meter_reading画面への遷移データも準備（UI変更なし）
      if (data && data.rooms && data.rooms.length > 0) {
        // 最初の部屋のメーターデータもプリフェッチ（予測的）
        const firstRoom = data.rooms[0];
        if (firstRoom && firstRoom.id) {
          setTimeout(() => {
            this.prefetchMeterData(propertyId, firstRoom.id);
          }, 1000); // 1秒遅延で実行
        }
      }

    } catch (error) {
      console.error(`[PreloadManager] 部屋データプリフェッチエラー: ${propertyId}`, error);
    }
  }

  /**
   * 部屋データの緊急プリフェッチ（クリック予測時）
   * @param {string} propertyId - 物件ID
   */
  async prefetchRoomsDataUrgent(propertyId) {
    // より短いタイムアウトで緊急実行
    const originalTimeout = this.prefetchTimeout;
    this.prefetchTimeout = 2000; // 2秒
    
    await this.prefetchRoomsData(propertyId);
    
    this.prefetchTimeout = originalTimeout;
  }

  /**
   * メーターデータのプリフェッチ
   * 制約: meter_reading画面のデータ形式を完全維持
   * @param {string} propertyId - 物件ID
   * @param {string} roomId - 部屋ID
   */
  async prefetchMeterData(propertyId, roomId) {
    const cacheKey = `meter_${propertyId}_${roomId}`;
    
    if (this.prefetchCache.has(cacheKey)) return;

    try {
      console.log(`[PreloadManager] メーターデータプリフェッチ開始: ${propertyId}/${roomId}`);
      
      const data = await this.fetchWithTimeout(`/api/getMeterReadings?propertyId=${propertyId}&roomId=${roomId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      // 制約: meter_reading画面が期待するデータ形式を維持
      this.prefetchCache.set(cacheKey, {
        data: data, // {propertyName, roomName, readings} 形式を維持
        timestamp: Date.now(),
        type: 'meter'
      });

      console.log(`[PreloadManager] メーターデータプリフェッチ完了: ${propertyId}/${roomId}`);

    } catch (error) {
      console.error(`[PreloadManager] メーターデータプリフェッチエラー: ${propertyId}/${roomId}`, error);
    }
  }

  /**
   * メーターデータの緊急プリフェッチ（クリック予測時）
   * @param {string} propertyId - 物件ID
   * @param {string} roomId - 部屋ID
   */
  async prefetchMeterDataUrgent(propertyId, roomId) {
    // より短いタイムアウトで緊急実行
    const originalTimeout = this.prefetchTimeout;
    this.prefetchTimeout = 1000; // 1秒
    
    await this.prefetchMeterData(propertyId, roomId);
    
    this.prefetchTimeout = originalTimeout;
  }

  /**
   * タイムアウト付きfetch
   * @param {string} url - URL
   * @param {Object} options - fetchオプション
   * @returns {Promise} レスポンスデータ
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.prefetchTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * プリフェッチデータの取得
   * @param {string} key - キャッシュキー
   * @returns {*} キャッシュされたデータ
   */
  getPrefetchedData(key) {
    const cached = this.prefetchCache.get(key);
    if (cached) {
      // 5分以内のデータのみ有効
      if (Date.now() - cached.timestamp < 300000) {
        console.log(`[PreloadManager] プリフェッチデータ使用: ${key}`);
        return cached.data;
      } else {
        this.prefetchCache.delete(key);
      }
    }
    return null;
  }

  /**
   * キャッシュのクリーンアップ
   */
  cleanupCache() {
    const now = Date.now();
    const maxAge = 300000; // 5分

    for (const [key, cached] of this.prefetchCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.prefetchCache.delete(key);
      }
    }

    // サイズ制限
    if (this.prefetchCache.size > this.maxCacheSize) {
      const entries = Array.from(this.prefetchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // 古いエントリから削除
      for (let i = 0; i < entries.length - this.maxCacheSize; i++) {
        this.prefetchCache.delete(entries[i][0]);
      }
    }

    console.log(`[PreloadManager] キャッシュクリーンアップ完了: ${this.prefetchCache.size}件`);
  }

  /**
   * 全プリフェッチのキャンセル
   */
  cancelAllPrefetch() {
    // 進行中のfetchをキャンセル（AbortControllerで制御）
    this.prefetchQueue.forEach(request => {
      if (request.controller) {
        request.controller.abort();
      }
    });
    
    this.prefetchQueue = [];
    console.log('[PreloadManager] 全プリフェッチキャンセル完了');
  }

  /**
   * ページコンテキストの取得
   * @param {string} page - ページ名
   * @returns {Object} コンテキスト
   */
  getContextForPage(page) {
    const context = {};
    
    if (page === 'property_select') {
      // 最近選択された物件IDなどを含める
      const recentProperty = localStorage.getItem('recentPropertyId');
      if (recentProperty) {
        context.recentPropertyId = recentProperty;
      }
    } else if (page === 'room_select') {
      context.propertyId = this.getPropertyIdFromURL();
    }
    
    return context;
  }

  /**
   * 物件IDの抽出
   * @param {Element} propertyCard - 物件カード要素
   * @returns {string} 物件ID
   */
  extractPropertyId(propertyCard) {
    // データ属性から取得
    const propertyId = propertyCard.dataset.propertyId || 
                     propertyCard.getAttribute('data-property-id');
    
    if (propertyId) return propertyId;
    
    // テキストから抽出（フォールバック）
    const idElement = propertyCard.querySelector('.property-id');
    return idElement ? idElement.textContent.trim() : null;
  }

  /**
   * 部屋IDの抽出
   * @param {Element} roomCard - 部屋カード要素
   * @returns {string} 部屋ID
   */
  extractRoomId(roomCard) {
    // データ属性から取得
    const roomId = roomCard.dataset.roomId || 
                   roomCard.getAttribute('data-room-id');
    
    if (roomId) return roomId;
    
    // テキストから抽出（フォールバック）
    const idElement = roomCard.querySelector('.room-id');
    return idElement ? idElement.textContent.trim() : null;
  }

  /**
   * URLから物件IDを取得
   * @returns {string} 物件ID
   */
  getPropertyIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('propertyId');
  }

  /**
   * プリフェッチの有効/無効切り替え
   * @param {boolean} enabled - 有効フラグ
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`[PreloadManager] プリフェッチ: ${enabled ? '有効' : '無効'}`);
    
    if (!enabled) {
      this.cancelAllPrefetch();
      this.prefetchCache.clear();
    }
  }

  /**
   * 統計情報の取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      enabled: this.isEnabled,
      cacheSize: this.prefetchCache.size,
      maxCacheSize: this.maxCacheSize,
      queueSize: this.prefetchQueue.length,
      userPatterns: this.userPatterns,
      timestamp: new Date()
    };
  }
}

// グローバルインスタンス
window.preloadManager = new PreloadManager();

// デバッグ用（開発時のみ）
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
  window.preloadDebug = {
    getStats: () => window.preloadManager.getStats(),
    getPrefetchedData: (key) => window.preloadManager.getPrefetchedData(key),
    setEnabled: (enabled) => window.preloadManager.setEnabled(enabled),
    clearCache: () => window.preloadManager.prefetchCache.clear()
  };
}

console.log('[preload-manager.js] インテリジェントプリフェッチマネージャー初期化完了');