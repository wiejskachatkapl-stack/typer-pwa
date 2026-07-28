// Specjalne Eventy Typera Service Worker (v1004)
const BUILD = '1004';
const CACHE_PREFIX = 'typer-events-cache-';
const CACHE_NAME = `${CACHE_PREFIX}${BUILD}`;
const VERSIONED_INDEX = `./index.html?v=${BUILD}`;

const CORE = [
  VERSIONED_INDEX,
  `./app.js?v=${BUILD}`,
  `./manifest.json?v=${BUILD}`,
  `./apple-touch-icon.png?v=${BUILD}`,
  `./favicon-32x32.png?v=${BUILD}`,
  `./favicon-16x16.png?v=${BUILD}`,
  `./ui/loader_ball.webp?v=${BUILD}`,
  `./events/event-types.json?v=${BUILD}`,
  `./events/teams/world-cup.json?v=${BUILD}`,
  `./events/teams/euro.json?v=${BUILD}`,
  `./events/teams/european-cups.json?v=${BUILD}`,
  `./events/teams/friendly-matches.json?v=${BUILD}`,
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of clients) client.postMessage({type:'TYPER_EVENTS_BUILD_ACTIVE', build:BUILD});
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'CLEAR_TYPER_EVENTS_CACHES') {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)))));
  }
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isCode = /\.(?:js|css|json)$/i.test(url.pathname);
  const isEventAsset = url.pathname.includes('/events/');
  const isLeagueData = url.pathname.endsWith('/data/leagues.json');

  if (isNavigation || isCode || isEventAsset || isLeagueData) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, {cache:'no-store'});
        if (!fresh.ok) throw new Error(`HTTP ${fresh.status}`);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, fresh.clone());
        return fresh;
      } catch (error) {
        return (await caches.match(req)) || (await caches.match(VERSIONED_INDEX)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req, {cache:'no-store'});
      if (fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (error) {
      return Response.error();
    }
  })());
});
