/* ================== KONFIG ================== */
const KEY_NICK = "typer_nick_v1";

// Twoje pliki graficzne:
const MENU_PHONE = "img_menu.png";
const MENU_PC = "img_menu_pc.png";

// Splash min. 7 sekund
const SPLASH_MS = 7000;

/* ================== POMOCNICZE ================== */
const el = (id) => document.getElementById(id);

function isLandscapePC() {
  // “PC / szeroko” – nie idealne, ale praktyczne:
  return window.matchMedia("(orientation: landscape)").matches && window.innerWidth >= 900;
}

function pickMenuSrc() {
  return isLandscapePC() ? MENU_PC : MENU_PHONE;
}

function loadNick() {
  try { return localStorage.getItem(KEY_NICK) || ""; } catch { return ""; }
}

function saveNick(nick) {
  try { localStorage.setItem(KEY_NICK, nick); } catch {}
}

function setNickUI(nick) {
  el("nickBadge").textContent = nick ? `Nick: ${nick}` : "Nick: —";
}

/* ================== NICK MODAL ================== */
function openNickModal(prefill = "") {
  el("nickInput").value = prefill || "";
  el("nickMask").style.display = "flex";
  setTimeout(() => el("nickInput").focus(), 50);
}
function closeNickModal() {
  el("nickMask").style.display = "none";
}

function ensureNickOrAsk() {
  const nick = loadNick().trim();
  if (!nick) {
    openNickModal("");
    return false;
  }
  setNickUI(nick);
  return true;
}

/* ================== SPLASH -> MENU ================== */
function showMenu() {
  // ustaw obraz zależnie od urządzenia
  el("menuImg").src = pickMenuSrc();

  // widok
  el("menuView").style.display = "block";
  el("statusRight").textContent = "";

  // nick
  setNickUI(loadNick().trim());

  // reaguj na zmianę rozmiaru/orientacji
  window.addEventListener("resize", () => {
    el("menuImg").src = pickMenuSrc();
  });
}

function startApp() {
  // Service Worker (opcjonalnie)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Splash minimum 7s
  setTimeout(() => {
    el("splash").style.display = "none";
    showMenu();

    // przy pierwszym wejściu poproś o nick
    ensureNickOrAsk();
  }, SPLASH_MS);
}

/* ================== PRZYCISKI ================== */
function wireUI() {
  // Zmień nick
  el("changeNickBtn").addEventListener("click", () => {
    openNickModal(loadNick().trim());
  });

  // Zapis nick
  el("nickSaveBtn").addEventListener("click", () => {
    const v = el("nickInput").value.trim();
    if (!v) return;
    saveNick(v);
    setNickUI(v);
    closeNickModal();
  });

  // Enter w polu nick
  el("nickInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") el("nickSaveBtn").click();
  });

  // Liga typerów
  el("btnLiga").addEventListener("click", () => {
    if (!ensureNickOrAsk()) return;
    el("statusRight").textContent = "Liga: placeholder (dalej dodamy właściwą ligę).";
    // Na razie tylko test działania nick + nawigacja
    // Później tu zrobimy ekran ligi.
  });

  // Statystyki
  el("btnStats").addEventListener("click", () => {
    if (!ensureNickOrAsk()) return;
    el("statusRight").textContent = "Statystyki: w następnym kroku.";
  });

  // Wyjście
  el("btnExit").addEventListener("click", () => {
    // W przeglądarce nie zamkniemy karty – więc komunikat:
    el("statusRight").textContent = "Wyjście: w aplikacji Android zrobimy finish().";
    alert("Wyjście: w przeglądarce zamknij kartę, w aplikacji Android dodamy zamknięcie.");
  });
}

/* ================== START ================== */
document.addEventListener("DOMContentLoaded", () => {
  wireUI();
  startApp();
});
