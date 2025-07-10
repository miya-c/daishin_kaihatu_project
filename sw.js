/**
 * 検針システム用 Service Worker
 * オフライン対応とキャッシュ戦略を実装
 */

const CACHE_NAME = 'meter-reading-v1.2.0';
const API_CACHE_NAME = 'meter-api-v1.0.0';
const STATIC_CACHE_NAME = 'meter-static-v1.0.0';

// キャッシュする静的リソース
const STATIC_ASSETS = [
  '/',
  '/html_files/main_app/property_select.html',
  '/html_files/main_app/room_select.html',
  '/html_files/main_app/meter_reading.html',
  '/css_styles/property_select.css',
  '/css_styles/room_select.css',
  '/css_styles/meter_reading.css',
  '/css_styles/pwa-styles.css',
  '/js/lazy-loading.js',
  '/manifest.json',
  '/pwa-utils.js'
];

// API エンドポイントのパターン
const API_PATTERNS = [
  /\/\?action=getProperties/,
  /\/\?action=getRooms/,
  /\/\?action=getMeterReadings/,
  /\/\?action=updateMeterReadings/,
  /\/\?action=completeInspection/
];

// Service Worker インストール
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // 静的リソースをキャッシュ
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // APIキャッシュを初期化
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] API cache initialized');
        return cache;
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      // 新しいService Workerを即座にアクティブ化
      return self.skipWaiting();
    })
  );
});

// Service Worker アクティベート
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // 古いキャッシュを削除
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // すべてのクライアントを制御下に置く
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// フェッチイベント処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 外部リソースは通常通り処理
  if (url.origin !== location.origin) {
    return;
  }

  // API リクエストの処理
  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 静的リソースの処理
  event.respondWith(handleStaticRequest(request));
});

// API リクエストかどうか判定
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_PATTERNS.some(pattern => pattern.test(url.search));
}

// API リクエストの処理
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `${url.pathname}${url.search}`;
  
  try {
    // GETリクエストの場合はキャッシュを確認
    if (request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(cacheKey);
      
      // キャッシュの有効期限チェック（5分）
      if (cachedResponse) {
        const cacheTime = cachedResponse.headers.get('sw-cache-time');
        if (cacheTime && (Date.now() - parseInt(cacheTime)) < 5 * 60 * 1000) {
          console.log('[SW] API cache hit:', cacheKey);
          return cachedResponse;
        }
      }
    }

    // ネットワークからデータを取得
    console.log('[SW] Fetching from network:', cacheKey);
    const response = await fetch(request);
    
    // レスポンスが成功し、GETリクエストの場合はキャッシュに保存
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const responseToCache = response.clone();
      
      // キャッシュ時刻をヘッダーに追加
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(cacheKey, modifiedResponse);
      console.log('[SW] API response cached:', cacheKey);
    }
    
    return response;
    
  } catch (error) {
    console.error('[SW] API request failed:', error);
    
    // ネットワークエラーの場合、キャッシュから返す（期限切れでも）
    if (request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      const cachedResponse = await cache.match(cacheKey);
      
      if (cachedResponse) {
        console.log('[SW] Fallback to cached API response:', cacheKey);
        return cachedResponse;
      }
    }
    
    // オフライン用のエラーレスポンス
    return new Response(JSON.stringify({
      success: false,
      error: 'ネットワークに接続できません。オフラインモードで動作しています。',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 静的リソースの処理
async function handleStaticRequest(request) {
  try {
    // Cache First 戦略
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Static cache hit:', request.url);
      return cachedResponse;
    }
    
    // キャッシュにない場合はネットワークから取得
    console.log('[SW] Fetching static resource from network:', request.url);
    const response = await fetch(request);
    
    // 成功した場合はキャッシュに保存
    if (response.ok) {
      await cache.put(request, response.clone());
      console.log('[SW] Static resource cached:', request.url);
    }
    
    return response;
    
  } catch (error) {
    console.error('[SW] Static request failed:', error);
    
    // フォールバック用のシンプルなHTMLページ
    if (request.destination === 'document') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>オフライン - 検針システム</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h1>オフラインモード</h1>
            <p>インターネット接続を確認してください。</p>
            <button onclick="window.location.reload()">再試行</button>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Resource not available offline', { status: 503 });
  }
}

// メッセージ処理（キャッシュクリアなど）
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// キャッシュクリア
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

// キャッシュサイズ取得
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    totalSize += keys.length;
  }
  
  return totalSize;
}

console.log('[SW] Service Worker script loaded');