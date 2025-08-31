// Service Worker for PWA - Speed Optimized for Cache+Light API architecture  
// Version 20250831f - ERR_FAILED Fix + Complete Cache Reset
const CACHE_NAME = 'meter-reading-app-v12-err-failed-fix';
const DATA_CACHE_NAME = 'meter-reading-data-v7';

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

// Performance optimization settings
const CACHE_STRATEGIES = {
  // API cache duration (1 hour)
  API_CACHE_MAX_AGE: 3600000,
  // Static asset cache duration (24 hours)
  STATIC_CACHE_MAX_AGE: 86400000,
  // Background sync retry interval (30 seconds)
  SYNC_RETRY_INTERVAL: 30000
};

// Legacy cache names to be deleted - COMPLETE RESET for ERR_FAILED fix
const LEGACY_CACHE_NAMES = [
  'meter-reading-app-v11-room-path-fix',   // 追加: ERR_FAILED問題修正前
  'meter-reading-app-v10-function-fixed',  // 追加: ファイルパス問題修正前
  'meter-reading-app-v9-natural-errors',   // 追加: 自然エラーハンドリング版
  'meter-reading-app-v8-no-timeout',       // 追加: タイムアウト削除版
  'meter-reading-app-v7-no-custom-errors', // 追加: カスタムエラー削除版
  'meter-reading-app-v6-clean-urls',       // 追加: URL最適化版
  'meter-reading-app-v5-encoding-fix',     // 追加: エンコーディング修正版
  'meter-reading-app-v4-performance',      // 追加: 性能向上版
  'meter-reading-app-v3-cloudflare-fixed',
  'meter-reading-data-v6',                 // データキャッシュも完全クリア
  'meter-reading-data-v5',
  'meter-reading-data-v4',
  'meter-reading-data-v3',
  'meter-reading-app-v2-optimized',
  'meter-reading-data-v2',
  'meter-reading-app-v1',
  'meter-reading-data-v1'
];

// Install event - cache essential assets with performance optimization
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker v20250831f: Install event - ERR_FAILED Fix + Complete Cache Reset');
  
  // 即座にアクティベート（古いSWを置き換え）
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      // Static assets cache
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('SW: 📦 静的アセットキャッシュ開始');
          return cache.addAll(CACHE_ASSETS);
        })
        .then(() => {
          console.log('SW: ✅ 静的アセットキャッシュ完了');
        })
        .catch(error => {
          console.warn('SW: ⚠️ 静的アセットキャッシュ失敗（継続）:', error);
        }),
      
      // Data cache initialization
      caches.open(DATA_CACHE_NAME)
        .then((cache) => {
          console.log('SW: 🗄️ データキャッシュ初期化完了');
        })
        .catch(error => {
          console.warn('SW: ⚠️ データキャッシュ初期化失敗:', error);
        })
    ])
  );
  
  // Immediately activate new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches with enhanced management
self.addEventListener('activate', (event) => {
  console.log('SW: 🔄 Activate event v20250831e - ファイルパス修正 + 旧ファイル構造削除');
  
  event.waitUntil(
    Promise.all([
      // 強制的に古いキャッシュを削除
      caches.keys().then((cacheNames) => {
        console.log('SW: 📋 既存キャッシュ一覧:', cacheNames);
        const validCacheNames = [CACHE_NAME, DATA_CACHE_NAME];
        
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCacheNames.includes(cacheName) || LEGACY_CACHE_NAMES.includes(cacheName)) {
              console.log('SW: 🗑️ 古いキャッシュ強制削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // 全クライアント（ページ）を強制リロード
      self.clients.claim().then(() => {
        console.log('SW: 🔄 全クライアント制御開始');
        return self.clients.matchAll();
      }).then((clients) => {
        console.log('SW: 📱 アクティブクライアント数:', clients.length);
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

// Handle GAS API requests with performance optimization
async function handleGASAPIRequest(request) {
  const url = new URL(request.url);
  const cacheKey = generateAPICacheKey(url);
  
  console.log('SW: 📡 GAS API Request:', url.pathname);
  
  try {
    // Check for Light API calls and prioritize them
    const isLightAPI = url.searchParams.get('action')?.includes('Light');
    
    // Network first - let browser handle natural timeouts
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses for Light APIs
      if (isLightAPI) {
        await cacheAPIResponse(cacheKey, networkResponse.clone());
      }
      
      console.log(`SW: ✅ GAS API成功 (${isLightAPI ? 'Light' : '通常'}):`, url.pathname);
      return networkResponse;
    }
    
  } catch (error) {
    console.warn('SW: ⚠️ GAS APIネットワークエラー:', error.message);
    
    // Try to serve from cache for Light APIs
    const cachedResponse = await getCachedAPIResponse(cacheKey);
    if (cachedResponse) {
      console.log('SW: 🗄️ キャッシュからGAS APIレスポンス:', url.pathname);
      return cachedResponse;
    }
  }
  
  // Return offline response
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'オフラインです。インターネット接続を確認してください。',
      cached: false,
      timestamp: Date.now()
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        'sw-cache-status': 'offline'
      },
      status: 503
    }
  );
}

// Handle HTML requests with intelligent hybrid strategy
async function handleHTMLRequest(request) {
  console.log('SW: 🌐 HTML Request (Hybrid Strategy):', request.url);
  
  const startTime = Date.now();
  let networkError = null;
  let networkDuration = 0;
  
  // Stage 1: Network First (with natural error handling)
  try {
    console.log('SW: 📡 Stage 1: Attempting network fetch...');
    const networkResponse = await fetch(request);
    networkDuration = Date.now() - startTime;
    
    if (networkResponse.ok) {
      // Update cache with fresh content and preserve encoding headers
      const cache = await caches.open(CACHE_NAME);
      
      // Ensure UTF-8 encoding is preserved
      let responseToCache = networkResponse.clone();
      const contentType = networkResponse.headers.get('Content-Type') || 'text/html; charset=utf-8';
      if (contentType.includes('text/html') && !contentType.includes('charset')) {
        // Add charset if missing
        const body = await networkResponse.clone().text();
        responseToCache = new Response(body, {
          status: networkResponse.status,
          statusText: networkResponse.statusText,
          headers: {
            ...Object.fromEntries(networkResponse.headers.entries()),
            'Content-Type': 'text/html; charset=utf-8'
          }
        });
      }
      
      cache.put(request, responseToCache);
      console.log(`SW: ✅ HTML取得成功 & UTF-8エンコーディング保持キャッシュ更新: ${request.url} (${networkDuration}ms)`);
      return networkResponse;
    } else {
      // Server responded but with error status
      networkError = new Error(`HTTP ${networkResponse.status}: ${networkResponse.statusText}`);
      console.warn(`SW: ⚠️ サーバーエラー応答: ${networkResponse.status} for ${request.url}`);
    }
  } catch (error) {
    networkError = error;
    networkDuration = Date.now() - startTime;
    
    console.warn(`SW: ⚠️ HTMLネットワーク取得失敗: ${error.message} (${networkDuration}ms)`);
  }
  
  // Stage 2: Cache Fallback (for network failures or errors)
  console.log('SW: 🗄️ Stage 2: Attempting cache fallback...');
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cacheAge = cachedResponse.headers.get('sw-cache-time');
    const ageInfo = cacheAge ? `cached ${Math.round((Date.now() - parseInt(cacheAge)) / 1000)}s ago` : 'cache age unknown';
    console.log(`SW: ✅ HTMLキャッシュから提供: ${request.url} (${ageInfo})`);
    
    // Add warning header to indicate cache fallback
    const responseWithHeaders = new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers: {
        ...Object.fromEntries(cachedResponse.headers.entries()),
        'X-Served-From': 'service-worker-cache',
        'X-Network-Error': networkError?.message || 'Network unavailable'
      }
    });
    
    return responseWithHeaders;
  }
  
  // No custom error pages - let browser handle natural errors
  console.log('SW: ❌ HTML取得失敗 - ブラウザのネイティブエラーハンドリングに任せる:', request.url);
  console.log('SW: 📊 Network error details:', networkError?.message);
  
  // Let the browser handle the error naturally (404, 503, network error, etc.)
  // This provides better UX than custom error pages
  throw networkError || new Error('Network request failed');
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

// Utility: Generate cache key for API requests
function generateAPICacheKey(url) {
  const action = url.searchParams.get('action');
  const propertyId = url.searchParams.get('propertyId');
  const roomId = url.searchParams.get('roomId');
  
  return `api_${action}_${propertyId || 'all'}_${roomId || 'none'}`;
}

// Utility: Cache API response
async function cacheAPIResponse(cacheKey, response) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const responseToCache = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...response.headers,
        'sw-cache-time': Date.now().toString(),
        'sw-cache-max-age': CACHE_STRATEGIES.API_CACHE_MAX_AGE.toString()
      }
    });
    
    await cache.put(cacheKey, responseToCache);
    console.log('SW: 💾 API レスポンスキャッシュ保存:', cacheKey);
  } catch (error) {
    console.warn('SW: ⚠️ API キャッシュ保存失敗:', error);
  }
}

// Utility: Get cached API response
async function getCachedAPIResponse(cacheKey) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      const maxAge = cachedResponse.headers.get('sw-cache-max-age') || CACHE_STRATEGIES.API_CACHE_MAX_AGE;
      
      if (cacheTime && (Date.now() - parseInt(cacheTime)) < parseInt(maxAge)) {
        return cachedResponse;
      } else {
        // Expired cache
        await cache.delete(cacheKey);
        console.log('SW: ⏰ 期限切れAPIキャッシュ削除:', cacheKey);
      }
    }
  } catch (error) {
    console.warn('SW: ⚠️ キャッシュAPI取得エラー:', error);
  }
  
  return null;
}

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
