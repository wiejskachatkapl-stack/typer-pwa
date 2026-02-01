// ================== USTAWIENIA ==================
const APP_VERSION = "v1001";
const MENU_PHONE = "img_menu.png";
const MENU_PC = "img_menu_pc.png";
const CALIBRATE = false; // kalibracja WYŁĄCZONA

// ================== START ==================
document.addEventListener("DOMContentLoaded", () => {
  mountUI();
  registerSW();
});

// ================== UI ==================
function mountUI() {
  const root = document.getElementById("app");
  root.innerHTML = `
    <div id="wrap" style="position:fixed; inset:0; background:#0b1020;">
      <div id="version" style="position:fixed; left:10px; top:8px; font-size:12px; opacity:.7; z-index:50;">
        ${APP_VERSION}
      </div>

      <div id="splash" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column;">
        <img src="./img_starter.png" alt="Start" style="max-width:92vw; max-height:80vh; object-fit:contain; border-radius:18px; box-shadow:0 10px 40px rgba(0,0,0,.55);" />
        <div style="margin-top:10px; opacity:.8;">Ekran startowy (5s)…</div>
      </div>

      <div id="menuView" style="position:absolute; inset:0; display:none;">
        <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
          <img id="menuImg" alt="Menu"
               style="max-width:96vw; max-height:92vh; object-fit:contain; border-radius:22px; box-shadow:0 10px 50px rgba(0,0,0,.55);" />
        </div>

        <!-- Hotspoty / przyciski (przezroczyste) -->
        <div id="hotspots" style="position:absolute; inset:0; pointer-events:auto;"></div>

        <div style="position:fixed; left:0; right:0; bottom:10px; text-align:center; font-size:12px; opacity:.7;">
          Copyright 2026 RN_APS Mariusz Gębka
        </div>
      </div>
    </div>
  `;

  // Splash 5s -> menu
  setTimeout(() => {
    showMenu();
  }, 5000);

  window.addEventListener("resize", () => refreshMenuImage());
}

// ================== MENU RESPONSIVE ==================
function isLandscape() {
  return window.matchMedia("(orientation: landscape)").matches;
}

function pickMenuSrc() {
  return isLandscape() ? MENU_PC : MENU_PHONE;
}

function refreshMenuImage() {
  const img = document.getElementById("menuImg");
  if (!img) return;
  img.src = "./" + pickMenuSrc() + "?t=" + Date.now();
}

function showMenu() {
  const splash = document.getElementById("splash");
  const menuView = document.getElementById("menuView");
  if (splash) splash.style.display = "none";
  if (menuView) menuView.style.display = "block";

  refreshMenuImage();
  mountHotspots();
}

// ================== HOTSPOTY (przyciski) ==================
function mountHotspots() {
  const hs = document.getElementById("hotspots");
  if (!hs) return;

  // UWAGA: Tu wpisujemy Twoje przyciski jako przezroczyste pola.
  // Na razie 3 przykładowe: Liga / Statystyki / Wyjście
  // Pozycje są procentowe -> działają na telefonie i PC (bo obraz jest "contain").
  // Jeśli będziesz chciał idealnie, zrobimy kalibrację.
  hs.innerHTML = "";

  // Kontener referencyjny na środku (pod obraz)
  // Zrobimy warstwę, która ma taki sam rozmiar jak obraz (contain):
  const layer = document.createElement("div");
  layer.style.position = "absolute";
  layer.style.left = "50%";
  layer.style.top = "50%";
  layer.style.transform = "translate(-50%, -50%)";
  layer.style.width = "96vw";
  layer.style.height = "92vh";
  layer.style.maxWidth = "96vw";
  layer.style.maxHeight = "92vh";
  layer.style.pointerEvents = "none"; // hotspoty same będą miały pointer events

  // Hotspoty (w % tej warstwy)
  layer.appendChild(hotspot(20, 60, 60, 10, "Liga typerów", () => alert("Liga typerów (tu będzie Nick)")));
  layer.appendChild(hotspot(20, 72, 60, 10, "Statystyki", () => alert("Statystyki — zrobimy później")));
  layer.appendChild(hotspot(20, 84, 60, 10, "Wyjście", () => alert("Wyjście (Android: finish())")));

  hs.appendChild(layer);
}

function hotspot(x, y, w, h, label, onClick) {
  const d = document.createElement("div");
  d.title = label;
  d.style.position = "absolute";
  d.style.left = x + "%";
  d.style.top = y + "%";
  d.style.width = w + "%";
  d.style.height = h + "%";
  d.style.pointerEvents = "auto";
  d.style.borderRadius = "14px";
  d.style.background = "rgba(0,0,0,0.18)"; // lekko ciemniejsze, jak chciałeś
  d.style.border = "1px solid rgba(255,255,255,0.12)";
  d.style.display = "flex";
  d.style.alignItems = "center";
  d.style.justifyContent = "center";
  d.style.fontWeight = "700";
  d.style.letterSpacing = "0.2px";
  d.style.userSelect = "none";

  d.addEventListener("click", (e) => {
    if (CALIBRATE) return; // tu kiedyś kliknięcia do kalibracji
    onClick();
  });

  return d;
}

// ================== SERVICE WORKER ==================
function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .then(() => {
      // jak SW się zaktualizuje — odśwież
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // unikamy pętli
        if (window.__reloaded) return;
        window.__reloaded = true;
        location.reload();
      });
    })
    .catch(() => {});
}
