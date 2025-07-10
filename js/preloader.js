/**
 * プリロード機能
 * 次の画面のデータを事前に読み込んでパフォーマンスを向上
 */

class PreloadManager {
  constructor() {
    this.preloadedData = new Map();
    this.preloadPromises = new Map();
    this.maxCacheSize = 10; // 最大キャッシュ数
  }

  // 検針データのプリロード
  async preloadMeterReadings(propertyId, roomId) {
    const cacheKey = `meter_${propertyId}_${roomId}`;
    
    // 既にプリロード済みまたは進行中の場合はスキップ
    if (this.preloadedData.has(cacheKey) || this.preloadPromises.has(cacheKey)) {
      return;
    }

    const gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');
    if (!gasWebAppUrl) {
      console.warn('[Preloader] gasWebAppUrl not found');
      return;
    }

    const fetchUrl = `${gasWebAppUrl}?action=getMeterReadings&propertyId=${propertyId}&roomId=${roomId}`;
    
    console.log(`[Preloader] Preloading meter readings: ${cacheKey}`);

    const preloadPromise = fetch(fetchUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        this.preloadedData.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        this.preloadPromises.delete(cacheKey);
        this.cleanupOldCache();
        console.log(`[Preloader] Meter readings preloaded: ${cacheKey}`);
      })
      .catch(error => {
        console.warn(`[Preloader] Failed to preload meter readings:`, error);
        this.preloadPromises.delete(cacheKey);
      });

    this.preloadPromises.set(cacheKey, preloadPromise);
  }

  // 部屋リストのプリロード
  async preloadRooms(propertyId) {
    const cacheKey = `rooms_${propertyId}`;
    
    if (this.preloadedData.has(cacheKey) || this.preloadPromises.has(cacheKey)) {
      return;
    }

    const gasWebAppUrl = sessionStorage.getItem('gasWebAppUrl');
    if (!gasWebAppUrl) {
      console.warn('[Preloader] gasWebAppUrl not found');
      return;
    }

    const fetchUrl = `${gasWebAppUrl}?action=getRooms&propertyId=${propertyId}`;
    
    console.log(`[Preloader] Preloading rooms: ${cacheKey}`);

    const preloadPromise = fetch(fetchUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        this.preloadedData.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        this.preloadPromises.delete(cacheKey);
        this.cleanupOldCache();
        console.log(`[Preloader] Rooms preloaded: ${cacheKey}`);
      })
      .catch(error => {
        console.warn(`[Preloader] Failed to preload rooms:`, error);
        this.preloadPromises.delete(cacheKey);
      });

    this.preloadPromises.set(cacheKey, preloadPromise);
  }

  // プリロードされたデータの取得
  getPreloadedData(type, propertyId, roomId = null) {
    const cacheKey = roomId ? 
      `${type}_${propertyId}_${roomId}` : 
      `${type}_${propertyId}`;
    
    const cached = this.preloadedData.get(cacheKey);
    
    if (cached) {
      // 5分以内のデータのみ有効
      const isValid = (Date.now() - cached.timestamp) < 5 * 60 * 1000;
      
      if (isValid) {
        console.log(`[Preloader] Using preloaded data: ${cacheKey}`);
        return cached.data;
      } else {
        console.log(`[Preloader] Preloaded data expired: ${cacheKey}`);
        this.preloadedData.delete(cacheKey);
      }
    }
    
    return null;
  }

  // 古いキャッシュのクリーンアップ
  cleanupOldCache() {
    if (this.preloadedData.size <= this.maxCacheSize) {
      return;
    }

    // タイムスタンプ順にソートして古いものから削除
    const entries = Array.from(this.preloadedData.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
    toDelete.forEach(([key]) => {
      this.preloadedData.delete(key);
      console.log(`[Preloader] Cleaned up old cache: ${key}`);
    });
  }

  // 画像のプリロード
  preloadImages(imageUrls) {
    imageUrls.forEach(url => {
      if (typeof url !== 'string' || !url) return;
      
      const img = new Image();
      img.onload = () => {
        console.log(`[Preloader] Image preloaded: ${url}`);
      };
      img.onerror = () => {
        console.warn(`[Preloader] Failed to preload image: ${url}`);
      };
      img.src = url;
    });
  }

  // リソースのプリロード（CSS/JS）
  preloadResource(url, type = 'script') {
    return new Promise((resolve, reject) => {
      if (type === 'script') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = url;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      } else if (type === 'style') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = url;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      }
    });
  }

  // キャッシュクリア
  clearCache() {
    this.preloadedData.clear();
    this.preloadPromises.clear();
    console.log('[Preloader] Cache cleared');
  }

  // キャッシュ状態の取得
  getCacheStatus() {
    return {
      cacheSize: this.preloadedData.size,
      pendingRequests: this.preloadPromises.size,
      cachedKeys: Array.from(this.preloadedData.keys())
    };
  }
}

// React用のカスタムフック
if (typeof React !== 'undefined') {
  // 次の部屋データのプリロード
  window.usePreloadNextRoom = (currentRoomIndex, allRooms, propertyId) => {
    const preloadManager = window.preloadManager;
    
    React.useEffect(() => {
      if (!preloadManager || !propertyId || !allRooms.length) return;
      
      const nextRoomIndex = currentRoomIndex + 1;
      if (nextRoomIndex < allRooms.length) {
        const nextRoom = allRooms[nextRoomIndex];
        const nextRoomId = nextRoom['部屋ID'] || nextRoom['roomId'] || nextRoom['id'];
        
        if (nextRoomId) {
          // 少し遅延させて現在の処理を優先
          setTimeout(() => {
            preloadManager.preloadMeterReadings(propertyId, nextRoomId);
          }, 1000);
        }
      }
    }, [currentRoomIndex, allRooms, propertyId, preloadManager]);
  };

  // 前の部屋データのプリロード
  window.usePreloadPreviousRoom = (currentRoomIndex, allRooms, propertyId) => {
    const preloadManager = window.preloadManager;
    
    React.useEffect(() => {
      if (!preloadManager || !propertyId || !allRooms.length) return;
      
      const prevRoomIndex = currentRoomIndex - 1;
      if (prevRoomIndex >= 0) {
        const prevRoom = allRooms[prevRoomIndex];
        const prevRoomId = prevRoom['部屋ID'] || prevRoom['roomId'] || prevRoom['id'];
        
        if (prevRoomId) {
          setTimeout(() => {
            preloadManager.preloadMeterReadings(propertyId, prevRoomId);
          }, 1500);
        }
      }
    }, [currentRoomIndex, allRooms, propertyId, preloadManager]);
  };
}

// グローバルインスタンス
const preloadManager = new PreloadManager();
window.preloadManager = preloadManager;

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PreloadManager, preloadManager };
}

console.log('[Preloader] Preload manager initialized');