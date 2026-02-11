const BUILD = 1013;
const CACHE = `typer-cache-v${BUILD}`;

const ASSETS = [
  "./",
  "./index.html?v=1013",
  "./app.js?v=1013",
  "./manifest.json?v=1013",
  "./img_starter.png?v=1013",
  "./img_menu.png?v=1013",
  "./img_menu_pc.png?v=1013",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // tylko GET
  if (req.method !== "GET") return;

  // cache-first dla własnych plików
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: false });
      if (cached) return cached;
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // dla zewnętrznych: network-first
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch {
      const cached = await caches.match(req);
      return cached || new Response("offline", { status: 503 });
    }
  })());
});
