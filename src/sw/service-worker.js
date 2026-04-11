// Service Worker for Water Meter Reading PWA
// Version: 2.1.0 - Phase 3: Background Sync for offline queue

const CACHE_VERSION = 'v4';
const CACHE_NAME = `meter-reading-${CACHE_VERSION}`;
const SYNC_TAG = 'offline-sync';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/property/',
  '/room/',
  '/reading/',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

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
  // GAS ContentService returns 302 → script.googleusercontent.com which causes CORS errors
  // when the page follows the redirect. We handle the redirect manually in the SW where
  // cross-origin fetches succeed, then relay the final response back to the page.
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetchGasRequest(request));
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

// GAS ContentService uses a 302 redirect to script.googleusercontent.com to
// deliver the response body. The page's fetch (mode: cors) cannot follow this
// cross-origin redirect, so we handle it here in the SW where fetch is not
// subject to page-level CORS restrictions.
async function fetchGasRequest(request) {
  try {
    // Step 1: Send the request with redirect:manual to capture the 302
    const firstResponse = await fetch(request, { redirect: 'manual' });

    if (firstResponse.status !== 302) {
      // No redirect — return as-is (some GAS responses don't redirect)
      return firstResponse;
    }

    // Step 2: Follow the redirect URL manually
    const redirectUrl = firstResponse.headers.get('Location');
    if (!redirectUrl) {
      return firstResponse;
    }

    const finalResponse = await fetch(redirectUrl);
    // Relay the final response body and content-type to the page
    const body = await finalResponse.text();
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': finalResponse.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    // Network error (truly offline)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'インターネット接続を確認してください。',
        offline: true,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}
