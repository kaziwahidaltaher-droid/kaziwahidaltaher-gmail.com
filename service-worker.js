/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aurelion Universal Creation Engine - Service Worker
 *
 * This service worker implements a robust caching strategy to ensure the application
 * is fast, reliable, and works offline.
 */

// Use a descriptive and versioned cache name.
// Increment the version number ('v1', 'v2', etc.) whenever you update the cached files.
const CACHE_NAME = 'aurelion-engine-cache-v16-galaxy';

// A list of all the essential files (the "app shell") that need to be cached.
const urlsToCache = [
  '/', // Cache the root URL
  'index.html',
  'index.css',
  'index.tsx',
  'manifest.json',
  'icon.svg'
];

/**
 * INSTALL: Caches the application shell.
 *
 * This event fires when the service worker is first installed.
 * It opens our specific cache and adds all the essential files to it.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate the new service worker immediately
  );
});

/**
 * ACTIVATE: Cleans up old caches.
 *
 * This event fires when the new service worker becomes active.
 * We use this opportunity to delete any old, outdated caches to free up space.
 */
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

/**
 * FETCH: Intercepts network requests and serves cached content.
 *
 * This event is the core of the offline experience. We use different strategies
 * for different types of requests to optimize for speed and freshness.
 */
self.addEventListener('fetch', event => {
  // We only handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // --- Caching Strategy: Network First for HTML ---
  // For the main HTML document, we always try to get the latest version from the
  // network first. This ensures the user gets the latest app structure.
  // If the network is unavailable, we fall back to the cached version.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('[Service Worker] Network unavailable. Serving cached HTML.');
          return caches.match('index.html');
        })
    );
    return;
  }

  // --- Caching Strategy: Cache First for Assets ---
  // For all other assets (CSS, JS, images, etc.), we serve from the cache
  // immediately if available. This makes the app load incredibly fast on
  // repeat visits. If it's not in the cache, we fetch it from the network.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return the cached response if it exists.
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, fetch the resource from the network.
        return fetch(event.request);
      })
  );
});