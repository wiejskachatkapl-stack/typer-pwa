/* ===========================
   TYPUJ SPORT - app.js
   =========================== */

const KEY_NICK = "typer_nick_v1";

// obraz menu: PC vs phone
const MENU_PHONE = "img_menu.png";
const MENU_PC    = "img_menu_pc.png";

// czas startu
const SPLASH_MS = 7000;

// ====== elementy ======
const el = (id) => document.getElementById(id);

const splash     = el("splash");
const menuView   = el("menuView");
const ligaView   = el("ligaView");
const statsView  = el("statsView");

const nickBadge  = el("nickBadge");
const nickBadge2 = el("nickBadge2");
const nickBadge3 = el("nickBadge3");

const changeNickBtn = el("changeNickBtn");

const menuImg   = el("menuImg");
const ligaImg   = el("ligaImg");
const statsImg  = el("statsImg");

const statusLine = el("statusLine");

// modal
const nickModal    = el("nickModal");
const nickInput    = el("nickInput");
const saveNickBtn  = el("saveNickBtn");
const cancelNickBtn= el("cancelNickBtn");

// ====== helpers ======
function isLandscape() {
  return window.matchMedia && window.matchMedia("(orientation: landscape)").matches;
}

function pickMenuSrc() {
  // Na PC/landscape próbujemy img_menu_pc.png, jak brak — spadamy do img_menu.png
  return isLandscape() ? MENU_PC : MENU_PHONE;
}

function setImageWithFallback(imgEl, primary, fallback) {
  if (!imgEl) return;
  imgEl.onerror = null;
  imgEl.src = primary + "?t=" + Date.now();

  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = fallback + "?t=" + Date.now();
  };
}

function refreshMenuImages() {
  const wanted = pickMenuSrc();
  // menu
  setImageWithFallback(menuImg, wanted, MENU_PHONE);
  // placeholdery widoków też na razie na tej samej grafice
  setImageWithFallback(ligaImg, wanted, MENU_PHONE);
  setImageWithFallback(statsImg, wanted, MENU_PHONE);
}

function showView(name) {
  // ukryj wszystkie
  [splash, menuView, ligaView, statsView].forEach(v => v.classList.remove("show"));

  if (name === "splash") splash.classList.add("show");
  if (name === "menu")   menuView.classList.add("show");
  if (name === "liga")   ligaView.classList.add("show");
  if (name === "stats")  statsView.classList.add("show");

  // status
  if (name === "menu") statusLine.textContent = "Menu gotowe.";
  if (name === "liga") statusLine.textContent = "Liga: placeholder (następny krok).";
  if (name === "stats") statusLine.textContent = "Statystyki: placeholder (następny krok).";
}

function getNick() {
  try {
    return localStorage.getItem(KEY_NICK) || "";
  } catch {
    return "";
  }
}

function setNick(nick) {
  try {
    localStorage.setItem(KEY_NICK, nick);
  } catch {}
  renderNick();
}

function renderNick() {
  const n = getNick();
  const txt = n ? `Nick: ${n}` : "Nick: —";
  if (nickBadge) nickBadge.textContent = txt;
  if (nickBadge2) nickBadge2.textContent = txt;
  if (nickBadge3) nickBadge3.textContent = txt;
}

function openNickModal(force = false) {
  // jeśli nie force i nick już jest — nie otwieramy
  if (!force && getNick()) return;

  nickInput.value = getNick() || "";
  nickModal.classList.add("show");
  nickModal.setAttribute("aria-hidden", "false");

  setTimeout(() => nickInput.focus(), 50);
}

function closeNickModal() {
  nickModal.classList.remove("show");
  nickModal.setAttribute("aria-hidden", "true");
}

function saveNickFromModal() {
  const val = (nickInput.value || "").trim();
  if (!val) {
    nickInput.focus();
    return;
  }
  // proste czyszczenie
  const cleaned = val.replace(/\s+/g, " ").slice(0, 20);
  setNick(cleaned);
  closeNickModal();
}

function wireMenuButtons() {
  const buttons = document.querySelectorAll("[data-go]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");

      if (target === "exit") {
        // PWA/strona: nie zamkniemy karty. Android WebView: przycisk Wyjście docelowo może wołać finish().
        alert("Wyjście: w przeglądarce zamknij kartę. W aplikacji Android dodamy zamykanie (finish).");
        return;
      }

      if (target === "liga") {
        // jeśli brak nicka — wymuś wpis
        if (!getNick()) {
          openNickModal(true);
          // po zapisaniu i tak wróci do menu — użytkownik kliknie jeszcze raz
          return;
        }
        showView("liga");
        return;
      }

      if (target === "stats") {
        if (!getNick()) {
          openNickModal(true);
          return;
        }
        showView("stats");
        return;
      }

      if (target === "menu") {
        showView("menu");
        return;
      }
    });
  });
}

function startSplashThenMenu() {
  showView("splash");

  // od razu ustaw obrazki
  refreshMenuImages();
  renderNick();

  setTimeout(() => {
    showView("menu");
    // jeśli pierwszy raz na urządzeniu — poproś o nick
    if (!getNick()) openNickModal(true);
  }, SPLASH_MS);
}

// ====== eventy ======
window.addEventListener("resize", () => refreshMenuImages());
window.addEventListener("orientationchange", () => refreshMenuImages());

changeNickBtn?.addEventListener("click", () => openNickModal(true));

saveNickBtn?.addEventListener("click", saveNickFromModal);
cancelNickBtn?.addEventListener("click", closeNickModal);

nickInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveNickFromModal();
  if (e.key === "Escape") closeNickModal();
});

// klik poza kartą zamyka
nickModal?.addEventListener("click", (e) => {
  if (e.target === nickModal) closeNickModal();
});

// ====== init ======
wireMenuButtons();
startSplashThenMenu();
