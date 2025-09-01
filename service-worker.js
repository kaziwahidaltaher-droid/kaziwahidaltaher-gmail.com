/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * AURELION Exoplanet Synthesis Engine (AXEE) - Service Worker
 *
 * This service worker implements a robust caching strategy to ensure the application
 * is fast, reliable, and works offline.
 */

// Use a descriptive and versioned cache name.
const CACHE_NAME = 'axee-cache-v1';

// A list of all the essential files (the "app shell") that need to be cached.
const urlsToCache = [
  '/', // Cache the root URL
  'index.html',
  'index.css',
  'index.tsx',
  'visual-3d.tsx',
  'manifest.json',
  'icon.svg',
  'LiveMotionVisualizer.tsx',
  'atmosphere-shader.tsx',
  'light-curve-visualizer.tsx',
];

/**
 * INSTALL: Caches the application shell.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell');
        return cache.addAll(urlsToCache);
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
    })
  );
});

/**
 * FETCH: Serves assets from the cache.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});