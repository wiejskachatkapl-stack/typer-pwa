const CACHE = "typer-cache-v6";

const ASSETS = [
  "/",
  "/index.html?v=6",
  "/app.js?v=6",
  "/manifest.json?v=6",
  "/img_starter.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

// HTML: network-first, reszta: cache-first
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const accept = req.headers.get("accept") || "";
  const isHtml = accept.includes("text/html");

  if (isHtml) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match("/") || Response.error();
      }
    })());
    return;
  }

  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
