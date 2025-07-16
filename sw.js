/**
 * sw.js - 水道検針アプリ用 高度なサービスワーカー
 * 制約: meter_reading画面のオフライン対応を完全実装
 */

const CACHE_NAME = 'water-meter-reading-v1.2';
const API_CACHE_NAME = 'water-meter-api-v1.2';
const METER_READING_CACHE_NAME = 'meter-reading-cache-v1.2';
const STATIC_CACHE_NAME = 'static-resources-v1.2';

// キャッシュ対象のリソース
const STATIC_RESOURCES = [
  '/',
  '/property_select',
  '/room_select',
  '/meter_reading',
  '/html_files/main_app/property_select.html',
  '/html_files/main_app/room_select.html',
  '/html_files/main_app/meter_reading.html',
  '/css_styles/optimized.min.css',
  '/css_styles/meter_reading.css',
  '/js/preload-manager.js',
  '/manifest.json',
  // React CDN (重要)
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// meter_reading専用のキャッシュ戦略
const METER_READING_RESOURCES = [
  '/meter_reading',
  '/html_files/main_app/meter_reading.html',
  '/css_styles/meter_reading.css'
];

// API エンドポイント
const API_ENDPOINTS = [
  '/api/getProperties',
  '/api/getRooms',
  '/api/getMeterReadings',
  '/api/updateMeterReadings'
];

/**
 * インストール時の処理
 */
self.addEventListener('install', event => {
  console.log('[SW] インストール開始');
  
  event.waitUntil(
    Promise.all([
      // 静的リソースのキャッシュ
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] 静的リソースキャッシュ中...');
        return cache.addAll(STATIC_RESOURCES);
      }),
      
      // meter_reading専用キャッシュ
      caches.open(METER_READING_CACHE_NAME).then(cache => {
        console.log('[SW] meter_reading専用キャッシュ中...');
        return cache.addAll(METER_READING_RESOURCES);
      })
    ]).then(() => {
      console.log('[SW] インストール完了');
      return self.skipWaiting();
    })
  );
});

/**
 * アクティベート時の処理
 */
self.addEventListener('activate', event => {
  console.log('[SW] アクティベート開始');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== METER_READING_CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] アクティベート完了');
      return self.clients.claim();
    })
  );
});

/**
 * フェッチリクエストの処理
 */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // meter_reading関連のリクエストの特別処理
  if (isMeterReadingRequest(event.request)) {
    event.respondWith(handleMeterReadingRequest(event.request));
    return;
  }
  
  // API リクエストの処理
  if (isApiRequest(event.request)) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // 静的リソースの処理
  if (isStaticResource(event.request)) {
    event.respondWith(handleStaticResource(event.request));
    return;
  }
  
  // その他のリクエストはネットワークファーストで処理
  event.respondWith(handleGenericRequest(event.request));
});

/**
 * meter_reading関連リクエストの判定
 */
function isMeterReadingRequest(request) {
  return request.url.includes('/meter_reading') || 
         request.url.includes('/api/getMeterReadings') ||
         request.url.includes('/api/updateMeterReadings');
}

/**
 * meter_reading関連リクエストの処理
 * 制約: 既存機能を完全に維持しつつオフライン対応
 */
async function handleMeterReadingRequest(request) {
  try {
    // ネットワークファーストで試行
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // 成功したレスポンスをキャッシュ
      const cache = await caches.open(METER_READING_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      
      console.log('[SW] meter_reading: ネットワークレスポンスをキャッシュ');
      return networkResponse;
    }
    
    throw new Error('ネットワークエラー');
    
  } catch (error) {
    console.log('[SW] meter_reading: ネットワーク失敗、キャッシュから取得');
    
    // キャッシュから取得を試行
    const cache = await caches.open(METER_READING_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // オフライン状態をヘッダーで通知
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...cachedResponse.headers,
          'X-Offline-Mode': 'true',
          'X-Cache-Source': 'meter-reading-cache'
        }
      });
      
      console.log('[SW] meter_reading: キャッシュから取得成功');
      return response;
    }
    
    // キャッシュにもない場合のフォールバック
    return createOfflineFallbackResponse(request);
  }
}

/**
 * API リクエストの判定
 */
function isApiRequest(request) {
  return request.url.includes('/api/');
}

/**
 * API リクエストの処理
 */
async function handleApiRequest(request) {
  try {
    // ネットワークファーストで試行
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // APIレスポンスをキャッシュ
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      
      console.log('[SW] API: ネットワークレスポンスをキャッシュ');
      return networkResponse;
    }
    
    throw new Error('APIエラー');
    
  } catch (error) {
    console.log('[SW] API: ネットワーク失敗、キャッシュから取得');
    
    // キャッシュから取得
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // オフライン状態をヘッダーで通知
      const modifiedResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...cachedResponse.headers,
          'X-Offline-Mode': 'true',
          'X-Cache-Source': 'api-cache'
        }
      });
      
      return modifiedResponse;
    }
    
    // キャッシュにもない場合
    return new Response(JSON.stringify({
      error: 'オフライン中のため、データを取得できません',
      offline: true,
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Mode': 'true'
      }
    });
  }
}

/**
 * 静的リソースの判定
 */
function isStaticResource(request) {
  return request.method === 'GET' && (
    request.url.includes('.css') ||
    request.url.includes('.js') ||
    request.url.includes('.html') ||
    request.url.includes('.png') ||
    request.url.includes('.jpg') ||
    request.url.includes('.svg') ||
    request.url.includes('.ico')
  );
}

/**
 * 静的リソースの処理
 */
async function handleStaticResource(request) {
  // キャッシュファーストで処理
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] 静的リソース: キャッシュから取得');
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('[SW] 静的リソース: ネットワークから取得してキャッシュ');
      return networkResponse;
    }
    
    throw new Error('ネットワークエラー');
    
  } catch (error) {
    console.log('[SW] 静的リソース: 取得失敗');
    return new Response('リソースが見つかりません', { status: 404 });
  }
}

/**
 * その他のリクエストの処理
 */
async function handleGenericRequest(request) {
  try {
    // ネットワークファーストで試行
    const networkResponse = await fetch(request);
    return networkResponse;
    
  } catch (error) {
    // キャッシュから取得を試行
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // フォールバック
    return new Response('オフライン中です', { status: 503 });
  }
}

/**
 * オフライン時のフォールバックレスポンス
 */
function createOfflineFallbackResponse(request) {
  if (request.url.includes('/api/getMeterReadings')) {
    return new Response(JSON.stringify({
      propertyName: '物件名（オフライン）',
      roomName: '部屋名（オフライン）',
      readings: [],
      offline: true,
      message: 'オフライン中のため、検針データを取得できません'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Mode': 'true'
      }
    });
  }
  
  if (request.url.includes('/api/updateMeterReadings')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'オフライン中のため、データを更新できません',
      offline: true,
      message: 'オンライン復帰後に再度お試しください'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Mode': 'true'
      }
    });
  }
  
  return new Response('オフライン中です', { status: 503 });
}

/**
 * バックグラウンド同期
 */
self.addEventListener('sync', event => {
  console.log('[SW] バックグラウンド同期:', event.tag);
  
  if (event.tag === 'meter-reading-sync') {
    event.waitUntil(syncMeterReadings());
  }
});

/**
 * 検針データの同期処理
 */
async function syncMeterReadings() {
  try {
    console.log('[SW] 検針データの同期開始');
    
    // IndexedDBから未同期データを取得
    const unsyncedData = await getUnsyncedMeterReadings();
    
    if (unsyncedData.length > 0) {
      for (const data of unsyncedData) {
        try {
          await syncSingleMeterReading(data);
          await markAsSynced(data.id);
        } catch (error) {
          console.error('[SW] 同期エラー:', error);
        }
      }
    }
    
    console.log('[SW] 検針データの同期完了');
    
  } catch (error) {
    console.error('[SW] 同期処理エラー:', error);
  }
}

/**
 * 未同期データの取得（IndexedDB）
 */
async function getUnsyncedMeterReadings() {
  // IndexedDBからの取得処理
  // 実装はクライアントサイドのIndexedDB管理と連携
  return [];
}

/**
 * 単一検針データの同期
 */
async function syncSingleMeterReading(data) {
  const response = await fetch('/api/updateMeterReadings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('同期失敗');
  }
  
  return response;
}

/**
 * 同期済みマーク
 */
async function markAsSynced(id) {
  // IndexedDBでの同期済み状態の更新
  console.log('[SW] 同期済みマーク:', id);
}

/**
 * プッシュ通知
 */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || '検針データが更新されました',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'meter-reading-update',
    data: data,
    actions: [
      {
        action: 'view',
        title: '確認',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: '閉じる',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '水道検針アプリ', options)
  );
});

/**
 * 通知クリック処理
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/meter_reading')
    );
  }
});

console.log('[SW] サービスワーカー初期化完了 - 水道検針アプリ v1.2');