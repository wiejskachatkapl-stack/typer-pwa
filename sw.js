const CACHE_NAME = "typer-cache-v1000";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js?v=1000",
  "./manifest.json",
  "./img_starter.png",
  "./img_menu.png",
  "./img_menu_pc.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML: network-first (żeby szybciej widzieć zmiany)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("./", copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match("./"))
    );
    return;
  }

  // reszta: cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
