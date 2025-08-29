// Service Worker for PWA - Speed Optimized for Cache+Light API architecture
// Version 20250826a - Cache integration + Performance optimizations
const CACHE_NAME = 'meter-reading-app-v2-optimized';
const DATA_CACHE_NAME = 'meter-reading-data-v2';

// Static assets for offline support (Cloudflare Pages compatible paths)
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/html_files/main_app/property_select.html',
  '/html_files/main_app/room_select.html',
  '/html_files/main_app/meter_reading.html',
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
  // Network timeout (5 seconds)
  NETWORK_TIMEOUT: 5000,
  // Background sync retry interval (30 seconds)
  SYNC_RETRY_INTERVAL: 30000
};

// Install event - cache essential assets with performance optimization
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker v20250826a: Install event - Cache+Light API対応');
  
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
  console.log('SW: 🔄 Activate event - キャッシュ最適化実行');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const validCacheNames = [CACHE_NAME, DATA_CACHE_NAME];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCacheNames.includes(cacheName)) {
              console.log('SW: 🗑️ 古いキャッシュ削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
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

  // Strategy 2: Static assets with stale-while-revalidate
  if (CACHE_ASSETS.some(asset => request.url.includes(asset)) || 
      url.pathname.includes('.css') || 
      url.pathname.includes('.js') ||
      url.pathname.includes('.html')) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // Strategy 3: Images and media with cache first
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Strategy 4: Default network first with cache fallback
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
    const timeout = isLightAPI ? CACHE_STRATEGIES.NETWORK_TIMEOUT * 0.7 : CACHE_STRATEGIES.NETWORK_TIMEOUT;
    
    // Network first with timeout
    const networkResponse = await fetchWithTimeout(request, timeout);
    
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

// Utility: Fetch with timeout
async function fetchWithTimeout(request, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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
