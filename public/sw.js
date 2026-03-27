const CACHE_NAME = 'bible-app-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/data/kjv.json',
  '/data/asv.json',
  '/data/unv.json',
  '/data/ncv.json',
  '/data/lzz.json',
  '/data/esv.json',
  '/data/web.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for local assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // FHL API requests — network only (no cache)
  if (url.hostname === 'bible.fhl.net') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Everything else — cache first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
