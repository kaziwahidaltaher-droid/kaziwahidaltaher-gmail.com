
/**
 * @license
 * Copyright Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION Exoplanet Synthesis Engine (AXEE) - Service Worker
 *
 * This service worker implements a robust caching strategy to ensure the application
 * is fast, reliable, and works offline.
 */

// Use a descriptive and versioned cache name.
const CACHE_NAME = 'axee-cache-v5'; // Bump version for new assets

// A list of all the essential files (the "app shell") that need to be cached.
const urlsToCache = [
  '/', // Cache the root URL
  'index.html',
  'index.css',
  'manifest.json',
  'icon.svg',
  'index.tsx',
  'cosmos-visualizer.tsx',
  'conversation-visualizer.tsx',
  'tutorial-overlay.tsx',
  'audio-engine.tsx',
  'light-curve-visualizer.tsx',
  'radial-velocity-visualizer.tsx',
  'shielding-visualizer.tsx',
  'deep-scan-visualizer.tsx',
  'exo-suit-visualizer.tsx',
  'planet-visualizer.tsx',
  'weather-visualizer.tsx',
  'energy-signature-visualizer.tsx',
  'shader-lab-visualizer.tsx',
  'qubit-visualizer.tsx',
  'live-motion-shader.tsx',
  'planet-shader.tsx',
  'atmosphere-shader.tsx',
  'starfield-shaders.tsx',
  'nebula-shader.tsx',
  'star-shader.tsx',
  'shader-utils.tsx',
  'solar-system-data.ts',
  'volume-meter.ts',
  'route-shader.tsx',
  'galaxy-point-shaders.tsx',
  'space-creature-shader.tsx',
  'oltaris-shader.tsx'
];

/**
 * INSTALL: Caches the application shell.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell');
        // Use addAll with a catch to prevent a single failed asset from breaking the entire cache
        return cache.addAll(urlsToCache).catch(error => {
          console.error('[Service Worker] Failed to cache App Shell:', error);
        });
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * ACTIVATE: Cleans up old caches.
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
    }).then(() => self.clients.claim()) // Claim clients immediately
  );
});


/**
 * FETCH: Serves assets from the cache, with a network-first strategy for dynamic files.
 */
self.addEventListener('fetch', event => {
  // Use a cache-first strategy for most assets for performance
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we found a match in the cache, return it
        if (response) {
          return response;
        }

        // Otherwise, fetch from the network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});
