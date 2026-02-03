const BUILD = 1010;
const CACHE_NAME = `typer-cache-${BUILD}`;

const ASSETS = [
  "./",
  `./index.html?v=${BUILD}`,
  `./app.js?v=${BUILD}`,
  `./manifest.json?v=${BUILD}`,
  "./img_menu.png",
  "./img_menu_pc.png",
  "./img_starter.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // tylko własny origin
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // cache GET
        if (req.method === "GET" && res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        }
        return res;
      }).catch(() => cached || new Response("Offline", { status: 503 }));
    })
  );
});
