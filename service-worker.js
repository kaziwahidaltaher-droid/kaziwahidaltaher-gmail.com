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
const CACHE_NAME = 'aurelion-engine-cache-v17-galaxy';

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
    })
  );
});

/**
 * FETCH: Serves assets from the cache.
 *
 * This event fires for every request the page makes.
 * We implement a "cache-first" strategy:
 * 1. Check if the request is in our cache.
 * 2. If yes, serve the cached version.
 * 3. If no, fetch it from the network, add it to the cache, and then serve it.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
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
