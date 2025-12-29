// KeyFlow Service Worker - Minimal version
const CACHE_VERSION = 'keyflow-v1.3.1';
const CACHE_NAME = `keyflow-cache-${CACHE_VERSION}`;

// Install event - don't cache anything initially
self.addEventListener('install', (event) => {
  console.log('[SW] Installing:', CACHE_VERSION);
  // Don't skip waiting automatically - let the app control this
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - network only, no caching to prevent stale content issues
self.addEventListener('fetch', (event) => {
  // Don't intercept any requests - let them go directly to network
  // This prevents any caching-related flashing issues
  return;
});

// Listen for messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
