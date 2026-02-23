const CACHE_NAME = "typer-pwa-cache-v2000";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js?v=3000",
  "./manifest.json",
  "./ui/flags/pl.png",
  "./ui/flags/gb.png",
  "./img_menu.png",
  "./img_menu_pc.png",
  "./img_tlo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isHTML = req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  const isJS = url.pathname.endsWith("/app.js") || url.search.includes("v=");

  if (isHTML || isJS) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
