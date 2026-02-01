/* Typer PWA - UI: Splash 7s -> Menu -> Liga/Stats/Exit
   - Telefon: img_menu.png
   - PC:      img_menu_pc.png
   - Nick zapis w localStorage i pokaz na górze
*/

const KEY_NICK = "typer_nick_v1";

const SPLASH_MS = 7000;

const MENU_PHONE = "img_menu.png";
const MENU_PC = "img_menu_pc.png";

const viewSplash = document.getElementById("viewSplash");
const viewMenu = document.getElementById("viewMenu");

const splashHint = document.getElementById("splashHint");
const menuBg = document.getElementById("menuBg");

const nickPill = document.getElementById("nickPill");
const nickPill2 = document.getElementById("nickPill2");

const panelLiga = document.getElementById("panelLiga");
const panelStats = document.getElementById("panelStats");

const debugInfo = document.getElementById("debugInfo");

function isLandscape() {
  return window.matchMedia("(orientation: landscape)").matches;
}

function pickMenuSrc() {
  // Prosta zasada: landscape = PC/poziomo, portrait = telefon/pionowo
  return isLandscape() ? MENU_PC : MENU_PHONE;
}

function applyMenuBg() {
  const src = pickMenuSrc();
  menuBg.style.backgroundImage = `url("./${src}")`;
}

function setNickPills() {
  const nick = loadNick();
  if (nick) {
    nickPill.style.display = "inline-block";
    nickPill.textContent = `Nick: ${nick}`;

    nickPill2.style.display = "inline-block";
    nickPill2.textContent = `Nick: ${nick}`;
  } else {
    nickPill.style.display = "none";
    nickPill2.style.display = "none";
  }
}

function loadNick() {
  try {
    const v = localStorage.getItem(KEY_NICK);
    return v ? String(v) : "";
  } catch {
    return "";
  }
}

function saveNick(nick) {
  try {
    localStorage.setItem(KEY_NICK, nick);
  } catch {}
}

function askNickIfNeeded() {
  let nick = loadNick();
  if (nick) return nick;

  while (true) {
    const val = prompt("Podaj nick / imię (będzie widoczne w grze):", "");
    if (val === null) return ""; // anuluj
    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      saveNick(trimmed);
      setNickPills();
      return trimmed;
    }
    alert("Nick musi mieć przynajmniej 2 znaki.");
  }
}

function showSplash() {
  viewMenu.classList.remove("active");
  viewSplash.classList.add("active");
}

function showMenu() {
  viewSplash.classList.remove("active");
  viewMenu.classList.add("active");
  hidePanels();
  applyMenuBg();
}

function hidePanels() {
  panelLiga.style.display = "none";
  panelStats.style.display = "none";
}

function showLiga() {
  hidePanels();
  panelLiga.style.display = "flex";
  debugInfo.textContent = "Liga: placeholder (dalej dodamy właściwą ligę).";
}

function showStats() {
  hidePanels();
  panelStats.style.display = "flex";
  debugInfo.textContent = "Statystyki: placeholder (w kolejnym kroku).";
}

function exitApp() {
  // W przeglądarce: próbujemy zamknąć kartę (zwykle zablokowane)
  // W Android WebView: dodamy później obsługę w MainActivity (finish()).
  alert("Wyjście: w przeglądarce nie zamknę karty automatycznie.\nW aplikacji Android dodamy obsługę przycisku (finish()).");
}

function handleAction(go) {
  if (go === "menu") {
    showMenu();
    return;
  }

  if (go === "liga") {
    const nick = askNickIfNeeded();
    if (!nick) return; // anulował
    showLiga();
    return;
  }

  if (go === "stats") {
    showStats();
    return;
  }

  if (go === "exit") {
    exitApp();
    return;
  }
}

function bindClicks() {
  document.querySelectorAll("[data-go]").forEach(el => {
    el.addEventListener("click", () => {
      const go = el.getAttribute("data-go");
      handleAction(go);
    });
  });
}

function boot() {
  setNickPills();

  // MENU background
  applyMenuBg();
  window.addEventListener("resize", applyMenuBg);

  // Splash -> Menu po 7 sekundach
  showSplash();
  let left = Math.ceil(SPLASH_MS / 1000);
  splashHint.textContent = `Ekran startowy (${left}s)…`;

  const timer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearInterval(timer);
      showMenu();
    } else {
      splashHint.textContent = `Ekran startowy (${left}s)…`;
    }
  }, 1000);

  // SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  bindClicks();
}

boot();
