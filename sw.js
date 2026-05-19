// ─── Swar Music — Service Worker ───
// Cache version — bump this string to force update
const CACHE_VERSION = 'swar-v1.0.0';

// Core shell assets to cache on install
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './swar.png'
];

// ─── Install: cache shell assets ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: delete old cache versions ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: Network First for API/YouTube, Cache First for shell ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for external APIs (YouTube, Piped, etc.)
  const isExternal =
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com') ||
    url.hostname.includes('piped') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isExternal) {
    // Network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful font/image responses
          if (
            response.ok &&
            (url.hostname.includes('ytimg.com') ||
             url.hostname.includes('fonts.gstatic.com'))
          ) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache first for local shell assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
