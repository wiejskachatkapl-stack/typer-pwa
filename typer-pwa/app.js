// ========= KONFIG OBRAZÓW =========
const MENU_PHONE = "img_menu.png";
const MENU_PC = "img_menu_pc.png"; // jak mówiłeś: na stronę

// ========= STORAGE =========
const NICK_KEY = "typer_nick_v1";

// =================== WIDOKI ===================
const splash = document.getElementById("splash");
const menuView = document.getElementById("menuView");
const ligaView = document.getElementById("ligaView");
const gameView = document.getElementById("gameView");

function showOnly(viewName) {
  if (splash) splash.style.display = "none";
  if (menuView) menuView.style.display = (viewName === "menu") ? "block" : "none";
  if (ligaView) ligaView.style.display = (viewName === "liga") ? "block" : "none";
  if (gameView) gameView.style.display = (viewName === "game") ? "block" : "none";
}

function go(hash) { location.hash = hash; }

function applyRoute() {
  const h = (location.hash || "#menu").replace("#", "");

  if (h === "liga") {
    showOnly("liga");
    ligaOnEnter();
    return;
  }

  if (h === "game") {
    showOnly("game");
    return;
  }

  showOnly("menu");
}

window.addEventListener("hashchange", applyRoute);

// =================== STARTER 5s -> MENU ===================
(function starter5s() {
  const secLeftEl = document.getElementById("secLeft");
  let left = 5;
  if (secLeftEl) secLeftEl.textContent = String(left);

  const tick = setInterval(() => {
    left -= 1;
    if (secLeftEl) secLeftEl.textContent = String(Math.max(0, left));
    if (left <= 0) clearInterval(tick);
  }, 1000);

  setTimeout(() => {
    if (splash) splash.style.display = "none";
    go("#menu");
    applyRoute();
  }, 5000);
})();

// =================== OBSŁUGA TŁA: MENU + LIGA (telefon/PC) ===================
function isLandscape() {
  return window.matchMedia("(orientation: landscape)").matches;
}
function pickBg() {
  return isLandscape() ? MENU_PC : MENU_PHONE;
}
function setBg(imgEl) {
  if (!imgEl) return;
  const src = pickBg();
  imgEl.src = src + "?t=" + Date.now();
}
function initBackgrounds() {
  const menuImg = document.getElementById("menuImg");
  const ligaImg = document.getElementById("ligaImg");

  // fallback jeśli ktoś ma starą nazwę na serwerze
  function onErr(e) {
    const el = e.target;
    if (!el || !el.src) return;
    // jeżeli PC nie istnieje -> podmień na phone
    if (el.src.includes(MENU_PC)) {
      el.src = MENU_PHONE + "?t=" + Date.now();
    }
  }

  if (menuImg) menuImg.addEventListener("error", onErr);
  if (ligaImg) ligaImg.addEventListener("error", onErr);

  setBg(menuImg);
  setBg(ligaImg);

  window.addEventListener("resize", () => {
    setBg(menuImg);
    setBg(ligaImg);
  });
}
initBackgrounds();

// =================== MENU: KLIK PRZYCISKÓW ===================
(function initMenuActions() {
  const hotspots = document.getElementById("hotspots");
  if (!hotspots) return;

  hotspots.querySelectorAll("[data-go]").forEach(el => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-go");

      if (target === "liga") {
        go("#liga");
        applyRoute();
      } else if (target === "stats") {
        alert("Statystyki – zrobimy w następnym kroku.");
      } else if (target === "exit") {
        alert("Wyjście: w przeglądarce nie zamkniemy karty, w aplikacji Android dodamy finish().");
      }
    });
  });
})();

// =================== LIGA: NICK (pierwszy raz) ===================
const nickLabel = document.getElementById("nickLabel");
const nickModal = document.getElementById("nickModal");
const nickInput = document.getElementById("nickInput");
const saveNickBtn = document.getElementById("saveNickBtn");
const nickErr = document.getElementById("nickErr");
const changeNickBtn = document.getElementById("changeNickBtn");
const backToMenuLigaBtn = document.getElementById("backToMenuLigaBtn");

function getNick() {
  try { return (localStorage.getItem(NICK_KEY) || "").trim(); }
  catch { return ""; }
}
function setNick(v) {
  try { localStorage.setItem(NICK_KEY, v); } catch {}
}

function updateNickUI() {
  const n = getNick();
  if (nickLabel) nickLabel.textContent = n ? `Nick: ${n}` : "Nick: —";
}

function openNickModal(forceEmpty = false) {
  if (!nickModal || !nickInput) return;
  if (nickErr) nickErr.style.display = "none";

  nickModal.style.display = "flex";
  nickInput.value = forceEmpty ? "" : (getNick() || "");
  setTimeout(() => nickInput.focus(), 50);
}

function closeNickModal() {
  if (!nickModal) return;
  nickModal.style.display = "none";
}

function validateNick(n) {
  const trimmed = (n || "").trim();
  if (trimmed.length < 2) return "";
  // prosty filtr: max 20 znaków, bez samych spacji
  return trimmed.slice(0, 20);
}

function ligaOnEnter() {
  updateNickUI();

  const n = getNick();
  if (!n) {
    openNickModal(true);
  } else {
    closeNickModal();
  }
}

if (saveNickBtn) {
  saveNickBtn.addEventListener("click", () => {
    const val = validateNick(nickInput ? nickInput.value : "");
    if (!val) {
      if (nickErr) nickErr.style.display = "block";
      return;
    }
    setNick(val);
    updateNickUI();
    closeNickModal();
  });
}

if (nickInput) {
  nickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (saveNickBtn) saveNickBtn.click();
    }
  });
}

if (changeNickBtn) {
  changeNickBtn.addEventListener("click", () => openNickModal(false));
}

if (backToMenuLigaBtn) {
  backToMenuLigaBtn.addEventListener("click", () => {
    go("#menu");
    applyRoute();
  });
}

// =================== GAME (zostaje na później) ===================
(function initBackButtonGame() {
  const btn = document.getElementById("backToMenuBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    go("#menu");
    applyRoute();
  });
})();

/* ====== Typowanie (bez zmian) ====== */
function pointsFor(realH, realA, tipH, tipA) {
  if ([realH, realA, tipH, tipA].some(v => v === null || Number.isNaN(v))) return 0;
  if (realH === tipH && realA === tipA) return 3;
  const realSign = Math.sign(realH - realA);
  const tipSign  = Math.sign(tipH - tipA);
  return realSign === tipSign ? 1 : 0;
}
const KEY = "typer_matches_v1";
let state = load();

function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function el(id) { return document.getElementById(id); }

function render() {
  const root = el("matches");
  if (!root) return;
  root.innerHTML = "";

  if (state.length === 0) {
    const empty = document.createElement("div");
    empty.className = "pill";
    empty.textContent = "Brak meczów. Dodaj pierwszy u góry.";
    root.appendChild(empty);
    return;
  }

  state.forEach((m, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.style.padding = "12px";

    const row1 = document.createElement("div");
    row1.className = "match";
    row1.innerHTML = `
      <span class="pill">${escapeHtml(m.league)}</span>
      <span><b>${escapeHtml(m.home)}</b> vs <b>${escapeHtml(m.away)}</b></span>
      <span class="spacer"></span>
      <button class="danger" data-del="${idx}">Usuń</button>
    `;

    const row2 = document.createElement("div");
    row2.className = "match";
    row2.style.marginTop = "10px";

    const realH = inputScore(m.realH, v => update(idx, { realH: v }));
    const realA = inputScore(m.realA, v => update(idx, { realA: v }));
    const tipH  = inputScore(m.tipH,  v => update(idx, { tipH: v }));
    const tipA  = inputScore(m.tipA,  v => update(idx, { tipA: v }));

    const pts = pointsFor(m.realH, m.realA, m.tipH, m.tipA);

    row2.append(
      label("Wynik:"), realH, text(":"), realA,
      spacer(),
      label("Typ:"), tipH, text(":"), tipA,
      spacer(),
      pill(`Punkty: ${pts}`)
    );

    wrap.append(row1, row2);
    root.appendChild(wrap);
  });

  root.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-del"));
      state.splice(i, 1);
      save();
      render();
    });
  });
}

function update(i, patch) { state[i] = { ...state[i], ...patch }; save(); render(); }

function inputScore(value, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  input.min = "0";
  input.value = (value ?? "") === null ? "" : (value ?? "");
  input.addEventListener("input", () => {
    const n = input.value === "" ? null : Number(input.value);
    onChange(Number.isNaN(n) ? null : n);
  });
  return input;
}
function label(t) { const s = document.createElement("span"); s.className = "muted"; s.style.marginRight = "6px"; s.textContent = t; return s; }
function pill(t) { const s = document.createElement("span"); s.className = "pill score"; s.textContent = t; return s; }
function text(t) { const s = document.createElement("span"); s.textContent = t; return s; }
function spacer() { const s = document.createElement("span"); s.className = "spacer"; return s; }
function escapeHtml(str) {
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

const addBtn = el("addBtn");
if (addBtn) {
  addBtn.addEventListener("click", () => {
    const leagueEl = el("league");
    const homeEl = el("home");
    const awayEl = el("away");
    if (!leagueEl || !homeEl || !awayEl) return;

    const league = leagueEl.value;
    const home = homeEl.value.trim();
    const away = awayEl.value.trim();
    if (!home || !away) return;

    state.unshift({ league, home, away, realH: null, realA: null, tipH: null, tipA: null });
    homeEl.value = "";
    awayEl.value = "";
    save();
    render();
  });
}

render();

// =================== PWA install prompt ===================
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = el("installBtn");
  if (!btn) return;
  btn.style.display = "inline-block";
  btn.addEventListener("click", async () => {
    btn.style.display = "none";
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }, { once: true });
});

// start
applyRoute();
