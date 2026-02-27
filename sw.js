/* TYPER service worker (BUILD 7013)
   Cel: wymusić odświeżenie plików po aktualizacji (index.html/app.js) i utrzymać cache dla assetów.
*/

const BUILD = 7013;
const CACHE_NAME = `typer-cache-v${BUILD}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

function isCoreRequest(url) {
  const p = url.pathname;
  return p.endsWith('/index.html') || p.endsWith('/app.js') || p === '/' || p.endsWith('/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Dla nawigacji (HTML) – network-first (żeby łapać nowe wersje), a jak offline to cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // app.js / index.html – network-first.
  if (isCoreRequest(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Reszta (PNG/CSS/itp.) – cache-first.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});
