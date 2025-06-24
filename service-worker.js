// Service Worker for PWA - Simplified for Vercel + GAS architecture
const CACHE_NAME = 'meter-reading-app-v1';
const CACHE_ASSETS = [
  '/html_files/main_app/property_select.html',
  '/html_files/main_app/room_select.html',
  '/html_files/main_app/meter_reading.html',
  '/css_styles/pwa-styles.css',
  '/css_styles/meter_reading.css',
  '/pwa-utils.js',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .catch(error => {
        console.warn('Service Worker: Cache install failed, continuing anyway', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first strategy for GAS API calls, cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network first for GAS API calls
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return a basic offline response for API failures
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'オフラインです。インターネット接続を確認してください。' 
            }),
            { 
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }

  // Cache first for static assets
  if (CACHE_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});
