/* sw.js — BUILD 2011 (cache fix) */

const BUILD = 2011;
const CACHE = `typer-cache-${BUILD}`;

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./sw.js",

  // Tła
  "./img_menu_pc.png",
  "./img_tlo.png",

  // Ikony/UI
  "./ico_gear.png",
  "./btn_pokoje_typerow.png",
  "./btn_statystyki.png",
  "./btn_wyjscie.png",

  // (Jeśli używasz innych plików graficznych w typowaniu – dodaj je tu)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
