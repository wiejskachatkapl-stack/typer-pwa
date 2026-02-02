(() => {
  const KEY_NICK = "typer_nick_v1";

  const MENU_PHONE = "img_menu.png";
  const MENU_PC    = "img_menu_pc.png";

  const el = (id) => document.getElementById(id);

  const menuImg = el("menuImg");
  const nickText = el("nickText");
  const changeNickBtn = el("changeNickBtn");
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");

  function isLandscapeOrWide() {
    // szeroki ekran albo landscape
    return window.matchMedia("(orientation: landscape)").matches || window.innerWidth >= 900;
  }

  function pickMenuSrc() {
    return isLandscapeOrWide() ? MENU_PC : MENU_PHONE;
  }

  function setMenuImage() {
    const src = pickMenuSrc();
    // cache-bust żeby nie trzymało starego
    menuImg.src = `${src}?t=${Date.now()}`;
  }

  function getNick() {
    const v = localStorage.getItem(KEY_NICK);
    return (v && v.trim()) ? v.trim() : "";
  }

  function setNick(v) {
    localStorage.setItem(KEY_NICK, (v || "").trim());
    renderNick();
  }

  function renderNick() {
    const n = getNick();
    nickText.textContent = n ? n : "—";
  }

  function promptNick(force = false) {
    const current = getNick();
    if (!force && current) return current;

    const v = prompt("Podaj nick / imię:", current || "");
    if (v === null) return null; // anuluj
    const trimmed = v.trim();
    if (!trimmed) {
      alert("Nick nie może być pusty.");
      return null;
    }
    setNick(trimmed);
    return trimmed;
  }

  // Obsługa przycisków
  changeNickBtn.addEventListener("click", () => {
    promptNick(true);
  });

  btnLiga.addEventListener("click", () => {
    // po pierwszym wejściu na urządzeniu – poproś o nick
    const n = getNick();
    if (!n) {
      const res = promptNick(false);
      if (!res) return;
    }
    alert("Liga typerów — dalsza część w następnym kroku 🙂");
  });

  btnStats.addEventListener("click", () => {
    alert("Statystyki — zrobimy w następnym kroku 🙂");
  });

  btnExit.addEventListener("click", () => {
    alert("Wyjście: w przeglądarce zamknij kartę, a w aplikacji Android dodamy finish().");
  });

  // Init
  renderNick();
  setMenuImage();

  // Reaguj na zmianę rozmiaru/orientacji
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setMenuImage, 150);
  });
})();
