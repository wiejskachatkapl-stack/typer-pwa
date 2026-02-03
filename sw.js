const BUILD = 1006;
const CACHE_NAME = `typer-cache-${BUILD}`;

const ASSETS = [
  "./",
  "./index.html?v=1006",
  "./app.js?v=1006",
  "./manifest.json?v=1006",
  "./img_starter.png?v=1006",
  "./img_menu.png?v=1006",
  "./img_menu_pc.png?v=1006"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(()=>{})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    const res = await fetch(req);
    if (req.method === "GET") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone()).catch(()=>{});
    }
    return res;
  })());
});
