// Service Worker for Water Meter Reading PWA
// Version: 2.1.0 - Phase 3: Background Sync for offline queue

const CACHE_VERSION = 'v2';
const CACHE_NAME = `meter-reading-${CACHE_VERSION}`;
const SYNC_TAG = 'offline-sync';

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// Install: cache essential static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
});

// Activate: delete all old caches, take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: route-based caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip non-http(s) schemes (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // GAS API: Network only (always fresh data)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({
              success: false,
              error: 'インターネット接続を確認してください。',
              offline: true,
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          )
      )
    );
    return;
  }

  // Static assets (CSS/JS with hash): Stale-while-revalidate
  if (url.pathname.match(/\.(css|js|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML pages: Stale-while-revalidate
  // Serve cached HTML immediately for fast navigation, update cache in background
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        // Fetch fresh version in background to update cache
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              cache.put(request, responseToCache);
            }
            return networkResponse;
          })
          .catch(() => cached);
        // Return cached version immediately if available, otherwise wait for network
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Images: Cache first
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Default: Network first with cache fallback
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Message handler: only skip waiting for updates
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync: process offline queue when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const client of allClients) {
    client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
  }
}
