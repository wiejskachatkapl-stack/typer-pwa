/* Typer PWA - Service Worker (bez psucia nawigacji)
   ZMIENIAJ WERSJĘ przy każdej zmianie plików!
*/
const CACHE_NAME = "typer-pwa-v1001";

const PRECACHE = [
  "./",
  "./index.html",
  "./app.js?v=1001",
  "./manifest.json",
  "./img_menu.png",
  "./img_menu_pc.png",
  "./img_starter.png"
];

// Install: cache podstawowe pliki
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activate: usuń stare cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("typer-pwa-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: NAJWAŻNIEJSZE -> nawigacja ZAWSZE index.html
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // tylko ta domena/scope
  if (url.origin !== self.location.origin) return;

  // 1) NAWIGACJA (wejście w adres /typer-pwa/ albo /index.html)
  // zawsze zwracamy index.html z cache lub z sieci
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const fresh = await fetch("./index.html", { cache: "no-store" });
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch (e) {
          const cached = await cache.match("./index.html");
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // 2) RESZTA (obrazy, js, css): cache-first, a jak nie ma to sieć
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((fresh) => {
        const copy = fresh.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return fresh;
      });
    })
  );
});
