const CACHE_NAME = 'moreira-v6';
const STATIC_ASSETS = [
  '/',
  '/logo.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: pre-cache shell & activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: remove all older caches and claim all open tabs immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Allow client to trigger skipWaiting explicitly
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Only handle same-origin http/https requests
  if (!url.protocol.startsWith('http') || url.origin !== self.location.origin) return;

  // Never cache version.json or sw.js
  if (url.pathname === '/version.json' || url.pathname === '/sw.js') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(
        () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Navigation requests (HTML): always network-first with no-store, fallback to cache when offline
  if (event.request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/');
          return cached || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // Hashed Vite assets (/assets/*) and static files: cache-first with safe network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const fallback = await caches.match(event.request);
          return fallback || new Response('', { status: 504 });
        });
    })
  );
});
