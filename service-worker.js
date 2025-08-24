// A simple service worker for Progressive Web App functionality
const CACHE_NAME = 'growth-scheme-cache-v3';
const urlsToCache = [
  'index.html',
  'index.css',
  'index.tsx',
  'manifest.json',
  'icon.svg'
];

/**
 * On install, cache the application shell.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened for assets');
        return cache.addAll(urlsToCache);
      })
  );
});

/**
 * On fetch, serve from cache first for assets.
 * Use a network-first approach for navigation to get the latest version of the app.
 */
self.addEventListener('fetch', event => {
  // We only cache GET requests
  if (event.request.method !== 'GET') {
      event.respondWith(fetch(event.request));
      return;
  }
  
  // For navigation requests (loading the page itself), try the network first.
  // If the network fails, fall back to the cached index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('index.html'))
    );
    return;
  }

  // For all other requests (CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the resource is in the cache, serve it
        if (response) {
          return response;
        }
        
        // If the resource is not in the cache, fetch it from the network
        return fetch(event.request).then(networkResponse => {
            // Optional: You could add logic here to cache new assets dynamically
            return networkResponse;
        });
      })
  );
});

/**
 * On activate, clean up any old caches that are no longer needed.
 */
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});