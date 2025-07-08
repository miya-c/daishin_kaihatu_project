// This file is intentionally left blank for now.
// It will be populated with service worker logic later.

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // Add a call to skipWaiting here
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
});

self.addEventListener('fetch', (event) => {
  // console.log('Fetching:', event.request.url);
});
