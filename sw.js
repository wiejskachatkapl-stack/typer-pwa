// Typer PWA Service Worker (BUILD 3049)
const CACHE_NAME = 'typer-cache-3049';

// Core assets to pre-cache. leagues.json is intentionally NOT pre-cached,
// because it should update immediately after edits on GitHub.
const CORE = [
  './',
  './index.html',
  './app.js?v=3049',
  './manifest.json?v=3049',
  './apple-touch-icon.png?v=3049',
  './favicon-32x32.png?v=3049',
  './favicon-16x16.png?v=3049',
  './ui/loader_ball.webp',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()));
    } catch (e) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isJS = url.pathname.endsWith('.js');
  const isLeaguesJSON = url.pathname.endsWith('/data/leagues.json');

  // leagues.json: always try GitHub/network first so edits are visible immediately.
  // The last good copy is kept only as an offline fallback.
  if (isLeaguesJSON) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (!fresh.ok) throw new Error(`HTTP ${fresh.status}`);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  // Network-first for HTML/JS to avoid stale UI.
  if (isHTML || isJS) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || caches.match('./index.html') || Response.error();
      }
    })());
    return;
  }

  // Other assets: cache-first.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      await cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
