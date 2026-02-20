// Typer PWA Service Worker (BUILD 4012)
// Network-first for HTML/JS to avoid being stuck on old builds.

const CACHE_VERSION = 'typer-cache-4012';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_VERSION ? caches.delete(k) : Promise.resolve())));
    if (self.clients && self.clients.claim) await self.clients.claim();
  })());
});

const isHtmlOrJs = (req) => {
  const url = new URL(req.url);
  return req.destination === 'document' ||
         req.destination === 'script' ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('.js');
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Always network-first for app shell files (prevents "stuck on build 4009")
  if (isHtmlOrJs(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // For images/fonts/etc: cache-first with SWR
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(async (fresh) => {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, fresh.clone());
      return fresh;
    }).catch(() => null);

    return cached || (await fetchPromise) || Response.error();
  })());
});
