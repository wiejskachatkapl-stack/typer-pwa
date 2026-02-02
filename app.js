(() => {
  /**
   * BUILD – podbijaj przy zmianach.
   * Musi się zgadzać z index.html (app.js?v=1003).
   */
  const BUILD = 1003;

  const KEY_NICK = "typer_nick_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  const el = (id) => document.getElementById(id);

  // screens
  const splash = el("splash");
  const splashHint = el("splashHint");

  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");

  // backgrounds
  const menuImg = el("menuImg");
  const roomsBg = el("roomsBg");

  // nick
  const nickText = el("nickText");
  const nickTextRooms = el("nickTextRooms");

  // menu buttons
  const changeNickBtn = el("changeNickBtn");
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");
  const btnRefresh = el("btnRefresh");

  // rooms buttons
  const backToMenuBtn = el("backToMenuBtn");
  const btnNewRoom = el("btnNewRoom");
  const btnJoinRoom = el("btnJoinRoom");
  const btnRefresh2 = el("btnRefresh2");

  function isLandscapeOrWide() {
    return window.matchMedia("(orientation: landscape)").matches || window.innerWidth >= 900;
  }

  function pickMenuSrc() {
    return isLandscapeOrWide() ? MENU_PC : MENU_PHONE;
  }

  function setBgImages() {
    const src = pickMenuSrc();
    const full = `${src}?b=${BUILD}&t=${Date.now()}`;

    // menu
    menuImg.onerror = () => {
      menuImg.onerror = null;
      menuImg.src = `${MENU_PHONE}?b=${BUILD}&t=${Date.now()}`;
    };
    menuImg.src = full;

    // rooms
    roomsBg.onerror = () => {
      roomsBg.onerror = null;
      roomsBg.src = `${MENU_PHONE}?b=${BUILD}&t=${Date.now()}`;
    };
    roomsBg.src = full;
  }

  function getNick() {
    try {
      const v = localStorage.getItem(KEY_NICK);
      return (v && v.trim()) ? v.trim() : "";
    } catch {
      return "";
    }
  }

  function setNick(v) {
    try { localStorage.setItem(KEY_NICK, (v || "").trim()); } catch {}
    renderNick();
  }

  function renderNick() {
    const n = getNick();
    const txt = n ? n : "—";
    nickText.textContent = txt;
    nickTextRooms.textContent = txt;
  }

  function askNick(force = false) {
    const current = getNick();
    if (!force && current) return current;

    const v = prompt("Podaj nick / imię:", current || "");
    if (v === null) return null;
    const trimmed = v.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      alert("Nick nie może być pusty.");
      return null;
    }
    setNick(trimmed);
    return trimmed;
  }

  function showScreen(name) {
    // tylko 2 ekrany na razie
    if (name === "menu") {
      menuScreen.classList.remove("hidden");
      roomsScreen.classList.add("hidden");
      return;
    }
    if (name === "rooms") {
      menuScreen.classList.add("hidden");
      roomsScreen.classList.remove("hidden");
      return;
    }
  }

  // ===== SPLASH (7s) =====
  function startSplash() {
    const start = Date.now();

    const tick = () => {
      const leftMs = Math.max(0, SPLASH_MS - (Date.now() - start));
      const leftSec = Math.ceil(leftMs / 1000);
      splashHint.textContent = `Ekran startowy (${leftSec}s)…`;
      if (leftMs > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    setTimeout(() => {
      splash.classList.add("hidden");
      // po wejściu do menu – jeśli brak nicka, możesz wpisać później po kliknięciu ligi
      renderNick();
    }, SPLASH_MS);
  }

  // ===== AWARYJNE: odśwież / napraw cache =====
  async function hardRefreshFix() {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {}
    const url = new URL(location.href);
    url.searchParams.set("v", String(BUILD));
    url.searchParams.set("t", String(Date.now()));
    location.replace(url.toString());
  }

  // ===== EVENTS =====

  // zmiana nicku
  changeNickBtn.addEventListener("click", () => askNick(true));

  // Liga typerów -> Pokoje (po nicku)
  btnLiga.addEventListener("click", () => {
    if (!getNick()) {
      const res = askNick(false);
      if (!res) return;
    }
    renderNick();
    showScreen("rooms");
  });

  btnStats.addEventListener("click", () => {
    alert("Statystyki — zrobimy później.");
  });

  btnExit.addEventListener("click", () => {
    alert("Wyjście: w przeglądarce zamknij kartę. W aplikacji Android dodamy finish().");
  });

  btnRefresh.addEventListener("click", hardRefreshFix);
  btnRefresh2.addEventListener("click", hardRefreshFix);

  backToMenuBtn.addEventListener("click", () => {
    showScreen("menu");
  });

  // Pokoje: Nowy / Dołącz (na razie placeholdery)
  btnNewRoom.addEventListener("click", () => {
    alert("Nowy pokój — w następnym kroku zrobimy generowanie kodu pokoju.");
  });

  btnJoinRoom.addEventListener("click", () => {
    alert("Dołącz do pokoju — w następnym kroku dodamy wpisywanie kodu pokoju.");
  });

  // Resize/orientation
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setBgImages, 140);
  });

  // ===== INIT =====
  renderNick();
  setBgImages();
  showScreen("menu");
  startSplash();

  // SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
