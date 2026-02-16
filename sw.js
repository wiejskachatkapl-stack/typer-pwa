const BUILD = 2005;
const CACHE = `typer-cache-v${BUILD}`;

const ASSETS = [
  "./",
  "./index.html?v=2005",
  "./app.js?v=2005",
  "./manifest.json?v=2005",

  // backgrounds / UI
  "./img_starter.png?v=2005",
  "./img_menu.png?v=2005",
  "./img_menu_pc.png?v=2005",
  "./img_tlo.png?v=2005",

  // HOME buttons (PL)
  "./btn_pokoje_typerow.png?v=2005",
  "./btn_statystyki.png?v=2005",
  "./btn_wyjscie.png?v=2005",

  // HOME buttons (EN)
  "./btn_typers_rooms.png?v=2005",
  "./btn_statistics.png?v=2005",
  "./btn_exit.png?v=2005",
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

  if (req.method !== "GET") return;

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

  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch {
      const cached = await caches.match(req);
      return cached || new Response("offline", { status: 503 });
    }
  })());
});
