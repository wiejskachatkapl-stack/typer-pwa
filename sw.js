/* Simple cache for GitHub Pages. Bump CACHE when you want hard refresh. */
const CACHE = "typer-cache-v1012";

const ASSETS = [
  "./",
  "index.html",
  "app.js?v=1012",
  "manifest.json",
  "img_starter.png",
  "img_menu.png",
  "img_menu_pc.png",
  // optional screens (if you have them)
  "img_typowanie.png",
  "img_typowanie_pc.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map(a => new Request(a, { cache: "reload" })))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For logos and images: cache-first
  if (url.pathname.includes("/logos/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg")) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // For HTML/JS: network-first, then cache
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
