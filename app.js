(() => {
  /**
   * WERSJA BUILD – podbijaj przy każdej zmianie, np. 1002 -> 1003
   * Musi się zgadzać z index.html (app.js?v=xxxx).
   */
  const BUILD = 1002;

  const KEY_NICK = "typer_nick_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  const el = (id) => document.getElementById(id);

  const splash = el("splash");
  const splashHint = el("splashHint");

  const menuImg = el("menuImg");
  const nickText = el("nickText");

  const changeNickBtn = el("changeNickBtn");
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");
  const btnRefresh = el("btnRefresh");

  function isLandscapeOrWide() {
    // “PC/poziom” – praktyczne kryterium
    return window.matchMedia("(orientation: landscape)").matches || window.innerWidth >= 900;
  }

  function pickMenuSrc() {
    return isLandscapeOrWide() ? MENU_PC : MENU_PHONE;
  }

  function setMenuImage() {
    const src = pickMenuSrc();
    // cache-bust, żeby szybko widzieć zmiany grafiki
    menuImg.src = `${src}?b=${BUILD}&t=${Date.now()}`;
    // fallback jeśli nie ma PC grafiki
    menuImg.onerror = () => {
      menuImg.onerror = null;
      menuImg.src = `${MENU_PHONE}?b=${BUILD}&t=${Date.now()}`;
    };
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
    nickText.textContent = n ? n : "—";
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
      // po wejściu do menu – jeśli brak nicka, poproś raz
      if (!getNick()) askNick(false);
      renderNick();
    }, SPLASH_MS);
  }

  // ===== AWARYJNE: odśwież / napraw cache =====
  async function hardRefreshFix() {
    try {
      // 1) Unregister SW
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      // 2) Wyczyść caches (SW cache)
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch {
      // nic
    }

    // 3) Odśwież z “cache-bust” żeby wymusić nowy HTML/JS
    const url = new URL(location.href);
    url.searchParams.set("v", String(BUILD));
    url.searchParams.set("t", String(Date.now()));
    location.replace(url.toString());
  }

  // ====== EVENTS ======
  changeNickBtn.addEventListener("click", () => askNick(true));
  btnLiga.addEventListener("click", () => {
    if (!getNick()) {
      const res = askNick(false);
      if (!res) return;
    }
    alert("Liga typerów — następny krok: zrobimy osobny ekran ligi.");
  });

  btnStats.addEventListener("click", () => {
    if (!getNick()) {
      const res = askNick(false);
      if (!res) return;
    }
    alert("Statystyki — następny krok: dodamy ekran statystyk.");
  });

  btnExit.addEventListener("click", () => {
    alert("Wyjście: w przeglądarce zamknij kartę. W aplikacji Android dodamy finish().");
  });

  btnRefresh.addEventListener("click", () => {
    hardRefreshFix();
  });

  // Resize/orientation -> zmień tło
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setMenuImage, 140);
  });

  // ===== INIT =====
  renderNick();
  setMenuImage();
  startSplash();

  // Rejestracja SW (PWA) – bezpiecznie
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
