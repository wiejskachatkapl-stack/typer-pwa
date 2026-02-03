/* Service Worker - twarde wersjonowanie cache */
const VERSION = "20260202-01";
const CACHE = `typer-cache-${VERSION}`;

const CORE = [
  "./",
  `./index.html?v=${VERSION}`,
  `./app.js?v=${VERSION}`,
  `./manifest.json?v=${VERSION}`,
  "./img_starter.png",
  "./img_menu.png",
  "./img_menu_pc.png",
  // jeśli masz dodatkowe:
  "./img_typowanie.png",
  "./img_typowanie_pc.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE).catch(()=>{}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // tylko nasza domena
  if (url.origin !== location.origin) return;

  // Network-first dla HTML/JS żeby nie wisiało na starym
  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  const isJS = url.pathname.endsWith(".js");

  if (isHTML || isJS) {
    event.respondWith(networkFirst(req));
    return;
  }

  // reszta: cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req){
  try{
    const fresh = await fetch(req, { cache: "no-store" });
    const cache = await caches.open(CACHE);
    cache.put(req, fresh.clone());
    return fresh;
  }catch{
    const cached = await caches.match(req);
    return cached || new Response("Offline", { status: 503, headers: { "Content-Type":"text/plain" } });
  }
}

async function cacheFirst(req){
  const cached = await caches.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  const cache = await caches.open(CACHE);
  cache.put(req, fresh.clone());
  return fresh;
}
