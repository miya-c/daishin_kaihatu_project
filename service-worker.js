// Service Worker for PWA - No-Cache Strategy for High Performance
// Version 20250902 - Cache-Free High Speed Architecture
const CACHE_NAME = 'meter-reading-app-v13-no-cache-fast';
const DATA_CACHE_NAME = 'meter-reading-data-disabled'; // データキャッシュ無効化

// Static assets for offline support (Cloudflare Pages compatible paths)
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/property_select.html',
  '/room_select.html',
  '/meter_reading.html',
  '/css_styles/pwa-styles.css',
  '/css_styles/property_select.css', 
  '/css_styles/room_select.css',
  '/css_styles/meter_reading.css',
  '/css_styles/pwa-materialui.css',
  '/pwa-utils.js',
  '/manifest.json'
];

// Performance optimization settings - ユーザビリティ重視の超短時間設定
const CACHE_STRATEGIES = {
  // API cache duration (2分 - ユーザビリティ重視)
  API_CACHE_MAX_AGE: 120000,
  // Static asset cache duration (2分 - 常に最新情報を提供)
  STATIC_CACHE_MAX_AGE: 120000,
  // Background sync retry interval (30 seconds)
  SYNC_RETRY_INTERVAL: 30000
};

// Legacy cache names to be deleted - ALL CACHE VERSIONS (Network-Only戦略)
const LEGACY_CACHE_NAMES = [
  'meter-reading-app-v12-err-failed-fix',  // 前バージョン
  'meter-reading-app-v11-room-path-fix',   
  'meter-reading-app-v10-function-fixed',  
  'meter-reading-app-v9-natural-errors',   
  'meter-reading-app-v8-no-timeout',       
  'meter-reading-app-v7-no-custom-errors', 
  'meter-reading-app-v6-clean-urls',       
  'meter-reading-app-v5-encoding-fix',     
  'meter-reading-app-v4-performance',      
  'meter-reading-app-v3-cloudflare-fixed',
  'meter-reading-data-v7',                 // 全データキャッシュを削除
  'meter-reading-data-v6',                 
  'meter-reading-data-v5',
  'meter-reading-data-v4',
  'meter-reading-data-v3',
  'meter-reading-app-v2-optimized',
  'meter-reading-data-v2',
  'meter-reading-app-v1',
  'meter-reading-data-v1',
  'meter-reading-data-disabled'            // 現在の無効化されたデータキャッシュ
];

// Install event - cache essential assets with performance optimization
self.addEventListener('install', (event) => {
  console.log('検針アプリ: オフライン機能を準備中...');
  
  // 即座にアクティベート（古いSWを置き換え）
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      // Static assets cache
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('検針アプリ: 画面データを保存中...');
          return cache.addAll(CACHE_ASSETS);
        })
        .then(() => {
          console.log('検針アプリ: オフライン対応完了');
        })
        .catch(error => {
          // 開発者診断メッセージを削除（ユーザビリティ重視）
        }),
      
      // Data cache initialization
      caches.open(DATA_CACHE_NAME)
        .then((cache) => {
          console.log('検針アプリ: データ保存準備完了');
        })
        .catch(error => {
          // 開発者診断メッセージを削除（ユーザビリティ重視）
        })
    ])
  );
  
  // Immediately activate new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches with enhanced management
self.addEventListener('activate', (event) => {
  console.log('検針アプリ: システム更新中...');
  
  event.waitUntil(
    Promise.all([
      // 強制的に古いキャッシュを削除
      caches.keys().then((cacheNames) => {
        // 開発者診断メッセージを削除（ユーザビリティ重視）
        const validCacheNames = [CACHE_NAME, DATA_CACHE_NAME];
        
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCacheNames.includes(cacheName) || LEGACY_CACHE_NAMES.includes(cacheName)) {
              // 古いデータを削除中
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 全クライアント（ページ）を強制リロード
      self.clients.claim().then(() => {
        console.log('検針アプリ: 準備完了');
        return self.clients.matchAll();
      }).then((clients) => {
        // 開発者診断メッセージを削除（ユーザビリティ重視）
        clients.forEach((client) => {
          console.log('SW: 🔄 クライアント更新通知:', client.url);
          client.postMessage({
            type: 'CACHE_UPDATED',
            message: 'キャッシュが更新されました。ページを再読み込みしてください。'
          });
        });
      }),
      
      // Initialize performance monitoring
      initializePerformanceMonitoring(),
      
      // Setup background sync for offline operations
      setupBackgroundSync()
    ])
  );
  
  // Take control of all pages immediately
  self.clients.claim();
  console.log('SW: ✅ Service Worker活性化完了');
});

// Performance monitoring initialization
async function initializePerformanceMonitoring() {
  try {
    console.log('SW: 📊 パフォーマンス監視開始');
    
    // Setup periodic cache cleanup
    setInterval(() => {
      cleanupExpiredCache();
    }, CACHE_STRATEGIES.SYNC_RETRY_INTERVAL);
    
  } catch (error) {
    console.warn('SW: ⚠️ パフォーマンス監視初期化失敗:', error);
  }
}

// Background sync setup for offline operations
async function setupBackgroundSync() {
  try {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('SW: 🔄 バックグラウンド同期セットアップ');
      
      // Register background sync events
      self.addEventListener('sync', handleBackgroundSync);
      
    } else {
      console.log('SW: ℹ️ バックグラウンド同期未対応');
    }
  } catch (error) {
    console.warn('SW: ⚠️ バックグラウンド同期セットアップ失敗:', error);
  }
}

// Handle background sync events
async function handleBackgroundSync(event) {
  console.log('SW: 🔄 バックグラウンド同期実行:', event.tag);
  
  if (event.tag === 'cache-sync') {
    event.waitUntil(performCacheSync());
  }
}

// Perform cache synchronization
async function performCacheSync() {
  try {
    console.log('SW: 🔄 キャッシュ同期実行中...');
    
    // Sync with LocalStorage cache (PWA Utils integration)
    await syncWithLocalStorage();
    
    console.log('SW: ✅ キャッシュ同期完了');
  } catch (error) {
    console.error('SW: ❌ キャッシュ同期エラー:', error);
  }
}

// Sync with LocalStorage for PWA Utils integration
async function syncWithLocalStorage() {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'CACHE_SYNC_REQUEST',
      timestamp: Date.now()
    });
  });
}

// Cleanup expired cache entries
async function cleanupExpiredCache() {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const requests = await cache.keys();
    const now = Date.now();
    
    let cleanedCount = 0;
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const cacheTime = response.headers.get('sw-cache-time');
        const maxAge = response.headers.get('sw-cache-max-age') || CACHE_STRATEGIES.API_CACHE_MAX_AGE;
        
        if (cacheTime && (now - parseInt(cacheTime)) > parseInt(maxAge)) {
          await cache.delete(request);
          cleanedCount++;
        }
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`SW: 🧹 期限切れキャッシュクリーンアップ: ${cleanedCount}件削除`);
    }
    
  } catch (error) {
    console.warn('SW: ⚠️ キャッシュクリーンアップエラー:', error);
  }
}

// Enhanced fetch event with intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Chrome extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Strategy 1: GAS API calls with intelligent caching
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(handleGASAPIRequest(request));
    return;
  }

  // Strategy 2: HTML files with network first for navigation fix
  if (url.pathname.includes('.html')) {
    event.respondWith(handleHTMLRequest(request));
    return;
  }

  // Strategy 3: Static assets (CSS/JS) with stale-while-revalidate
  if (CACHE_ASSETS.some(asset => request.url.includes(asset)) || 
      url.pathname.includes('.css') || 
      url.pathname.includes('.js')) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Strategy 4: Images and media with cache first
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Strategy 5: Default network first with cache fallback
  event.respondWith(handleDefaultRequest(request));
});

// Handle GAS API requests with Network-Only strategy (No Cache)
async function handleGASAPIRequest(request) {
  console.log('検針アプリ: 最新データ取得中...');
  
  try {
    // Network-Only: Always fetch latest data from server (No Cache)
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      console.log('検針アプリ: 最新データ取得完了');
      return networkResponse;
    }
    
    // サーバーエラーの場合はそのまま返す（キャッシュフォールバックなし）
    console.warn('検針アプリ: サーバーエラー応答');
    return networkResponse;
    
  } catch (error) {
    // ネットワークエラーの場合：オフライン応答を返す
    console.error('検針アプリ: ネットワークエラー');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'インターネット接続を確認してください。',
        offline: true,
        timestamp: Date.now()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'sw-cache-status': 'network-error'
        },
        status: 503
      }
    );
  }
}

// Handle HTML requests with Network-Only strategy (No Cache)
async function handleHTMLRequest(request) {
  console.log('検針アプリ: HTML取得中...');
  
  try {
    // Network-Only: Always fetch latest HTML from server (No Cache)
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      console.log('検針アプリ: 最新HTML取得完了');
      return networkResponse;
    } else {
      // サーバーエラーの場合はそのまま返す
      console.warn(`検針アプリ: サーバーエラー ${networkResponse.status}`);
      return networkResponse;
    }
    
  } catch (error) {
    // ネットワークエラーの場合はエラーを投げる
    console.error('検針アプリ: HTMLネットワークエラー');
    throw error;
  }
}

// Handle static asset requests with stale-while-revalidate
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache immediately
    console.log('SW: ⚡ キャッシュから静的アセット提供:', request.url);
    
    // Update cache in background (stale-while-revalidate)
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        console.log('SW: 🔄 静的アセットキャッシュ更新:', request.url);
      }
    }).catch(() => {
      // Network failure is acceptable for static assets
    });
    
    return cachedResponse;
  }
  
  // Cache miss - fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('SW: 📦 新規静的アセットキャッシュ:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.warn('SW: ❌ 静的アセット取得失敗:', request.url);
    throw error;
  }
}

// Handle image requests with cache first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a placeholder or throw the error
    throw error;
  }
}

// Handle default requests with network first
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Utility functions removed - using native browser error handling for better UX

// Utility functions removed - using native fetch with browser's natural timeout handling

// APIキャッシュ関数は削除済み（Network-Only戦略のため不要）

// キャッシュAPI関数は削除済み（Network-Only戦略により不要）

// Message handling for PWA Utils integration
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  console.log('SW: 📨 メッセージ受信:', type);
  
  switch (type) {
    case 'CACHE_SYNC_RESPONSE':
      handleCacheSyncResponse(data);
      break;
    case 'PERFORMANCE_STATS_REQUEST':
      sendPerformanceStats(event.source);
      break;
    case 'CACHE_CLEAR_REQUEST':
      clearDataCache(data.pattern);
      break;
    default:
      console.log('SW: ❓ 未知のメッセージタイプ:', type);
  }
});

// Handle cache sync response from PWA Utils
function handleCacheSyncResponse(data) {
  console.log('SW: 🔄 PWA Utilsキャッシュ同期レスポンス:', data);
  // Integration logic can be added here
}

// Send performance stats to client
async function sendPerformanceStats(client) {
  try {
    const cacheStats = await getCacheStats();
    client.postMessage({
      type: 'PERFORMANCE_STATS_RESPONSE',
      data: cacheStats
    });
  } catch (error) {
    console.error('SW: ❌ パフォーマンス統計送信エラー:', error);
  }
}

// Get cache statistics
async function getCacheStats() {
  try {
    const [staticCache, dataCache] = await Promise.all([
      caches.open(CACHE_NAME),
      caches.open(DATA_CACHE_NAME)
    ]);
    
    const [staticKeys, dataKeys] = await Promise.all([
      staticCache.keys(),
      dataCache.keys()
    ]);
    
    return {
      staticCacheSize: staticKeys.length,
      dataCacheSize: dataKeys.length,
      totalCacheItems: staticKeys.length + dataKeys.length,
      cacheVersion: CACHE_NAME,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('SW: ❌ キャッシュ統計取得エラー:', error);
    return { error: error.message };
  }
}

// Clear data cache
async function clearDataCache(pattern = 'all') {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const requests = await cache.keys();
    
    let clearedCount = 0;
    
    for (const request of requests) {
      const url = new URL(request.url);
      let shouldClear = false;
      
      if (pattern === 'all') {
        shouldClear = true;
      } else if (pattern === 'expired') {
        const response = await cache.match(request);
        const cacheTime = response?.headers.get('sw-cache-time');
        const maxAge = response?.headers.get('sw-cache-max-age') || CACHE_STRATEGIES.API_CACHE_MAX_AGE;
        shouldClear = cacheTime && (Date.now() - parseInt(cacheTime)) > parseInt(maxAge);
      } else {
        shouldClear = url.searchParams.get('action')?.includes(pattern);
      }
      
      if (shouldClear) {
        await cache.delete(request);
        clearedCount++;
      }
    }
    
    console.log(`SW: 🧹 データキャッシュクリア完了: ${clearedCount}件削除 (パターン: ${pattern})`);
    return clearedCount;
  } catch (error) {
    console.error('SW: ❌ データキャッシュクリアエラー:', error);
    return 0;
  }
}
