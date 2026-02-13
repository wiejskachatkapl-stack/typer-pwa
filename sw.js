/* sw.js — Typer (network-first for HTML/JS to avoid “stuck version”) */
const VERSION = "2011";
const CACHE_NAME = `typer-cache-${VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json"
];

// Install: pre-cache core
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: "reload" })));
    })()
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// Helpers
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    // cache only OK responses
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

// Fetch strategy:
// - HTML navigations + index.html + app.js -> NETWORK FIRST
// - other assets (png/jpg/css/firebase libs) -> CACHE FIRST
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // only same-origin
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    (req.destination === "document") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("index.html");

  const isCriticalJS = url.pathname.endsWith("/app.js") || url.pathname.endsWith("app.js");

  if (isHTML || isCriticalJS) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});
