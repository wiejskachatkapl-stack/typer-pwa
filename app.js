(() => {
  /**
   * BUILD – podbijaj przy zmianach.
   * Musi się zgadzać z index.html (app.js?v=....).
   */
  const BUILD = 1010;

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";        // lokalna baza pokoi (na urządzeniu)
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  const el = (id) => document.getElementById(id);

  // screens
  const splashOverlay = el("splashOverlay");
  const splashHint = el("splashHint");
  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");

  // backgrounds
  const menuImg = el("menuImg");
  const roomsBg = el("roomsBg");

  // nick labels
  const nickText = el("nickText");
  const nickTextRooms = el("nickTextRooms");

  // menu buttons
  const changeNickBtn = el("changeNickBtn");
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");

  // rooms buttons / inputs
  const changeNickBtn2 = el("changeNickBtn2");
  const backToMenuBtn = el("backToMenuBtn");
  const newRoomName = el("newRoomName");
  const createRoomBtn = el("createRoomBtn");
  const joinRoomCode = el("joinRoomCode");
  const joinRoomBtn = el("joinRoomBtn");
  const debugBox = el("debugBox");
  const statusText = el("statusText");
  const roomsStatusText = el("roomsStatusText");

  // ----------------------------
  // helpers
  // ----------------------------
  const isLandscape = () => window.matchMedia("(orientation: landscape)").matches;
  const pickMenuSrc = () => (isLandscape() ? MENU_PC : MENU_PHONE);

  function setBgImages() {
    const src = pickMenuSrc();
    if (menuImg) menuImg.src = src + "?b=" + BUILD;
    if (roomsBg) roomsBg.src = src + "?b=" + BUILD;
  }

  function showScreen(name) {
    menuScreen.classList.toggle("active", name === "menu");
    roomsScreen.classList.toggle("active", name === "rooms");
  }

  function logDebug(msg) {
    if (!debugBox) return;
    const now = new Date().toLocaleTimeString();
    debugBox.textContent = `[${now}] ${msg}\n` + debugBox.textContent;
  }

  function normalizeCode(s) {
    return String(s || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function makeCode6() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bez mylących 0 O 1 I
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function loadNick() {
    const n = localStorage.getItem(KEY_NICK);
    return (n && n.trim()) ? n.trim() : "";
  }

  function saveNick(nick) {
    localStorage.setItem(KEY_NICK, nick);
  }

  /**
   * NAJWAŻNIEJSZE: migracja rooms → zawsze tablica.
   * Obsługujemy:
   * - null -> []
   * - tablica -> ok
   * - obiekt {code:..., name:...} -> [obiekt]
   * - obiekt map {ABC123:{...}, ...} -> Object.values(...)
   */
  function loadRooms() {
    let raw = localStorage.getItem(KEY_ROOMS);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) return parsed;

      // pojedynczy pokój jako obiekt
      if (parsed && typeof parsed === "object" && parsed.code) {
        return [parsed];
      }

      // mapka kod->pokój
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed).filter(x => x && typeof x === "object" && x.code);
      }

      return [];
    } catch {
      return [];
    }
  }

  function saveRooms(rooms) {
    // tylko tablica
    if (!Array.isArray(rooms)) rooms = [];
    localStorage.setItem(KEY_ROOMS, JSON.stringify(rooms));
  }

  function setActiveRoom(code) {
    localStorage.setItem(KEY_ACTIVE_ROOM, code);
  }

  function updateNickUI() {
    const nick = loadNick();
    const shown = nick ? nick : "—";
    if (nickText) nickText.textContent = `Nick: ${shown}`;
    if (nickTextRooms) nickTextRooms.textContent = `Nick: ${shown}`;
  }

  function promptNick(force = false) {
    let nick = loadNick();
    if (!nick || force) {
      const input = prompt("Podaj nick / imię:", nick || "");
      if (input === null) return ""; // anuluj
      const cleaned = input.trim().replace(/\s+/g, " ");
      if (!cleaned) {
        alert("Nick nie może być pusty.");
        return "";
      }
      const oldNick = nick;
      nick = cleaned;
      saveNick(nick);
      migrateNickInRooms(oldNick, nick);
      updateNickUI();
    }
    return nick;
  }

  function migrateNickInRooms(oldNick, newNick) {
    if (!oldNick || !newNick || oldNick === newNick) return;

    const rooms = loadRooms();
    let changed = false;

    for (const r of rooms) {
      if (!r) continue;

      if (r.admin === oldNick) {
        r.admin = newNick;
        changed = true;
      }
      if (Array.isArray(r.players)) {
        const idx = r.players.indexOf(oldNick);
        if (idx >= 0) {
          r.players[idx] = newNick;
          changed = true;
        }
      }
    }
    if (changed) saveRooms(rooms);
  }

  // ----------------------------
  // rooms actions
  // ----------------------------
  function createRoom() {
    try {
      const nick = loadNick();
      if (!nick) {
        roomsStatusText.textContent = "Brak nicku.";
        logDebug("createRoom: brak nicku, proszę podać.");
        return;
      }

      const name = (newRoomName.value || "").trim().replace(/\s+/g, " ");
      if (!name) {
        alert("Podaj nazwę pokoju.");
        return;
      }

      // WAŻNE: rooms zawsze tablica
      const rooms = loadRooms();
      if (!Array.isArray(rooms)) {
        logDebug("createRoom: rooms nie było tablicą -> naprawiam na []");
      }

      // generuj unikalny kod
      let code = makeCode6();
      let guard = 0;
      while (rooms.some(r => r && r.code === code) && guard < 40) {
        code = makeCode6();
        guard++;
      }

      const room = {
        code,
        name,
        admin: nick,
        players: [nick],
        createdAt: Date.now()
      };

      rooms.unshift(room);
      saveRooms(rooms);
      setActiveRoom(code);

      roomsStatusText.textContent = `Utworzono pokój ${code}`;
      logDebug(`createRoom ok: ${code} (${name}) admin=${nick}`);

      alert(`Utworzono pokój!\nNazwa: ${name}\nKod: ${code}`);
    } catch (e) {
      roomsStatusText.textContent = "Błąd tworzenia pokoju";
      logDebug(`createRoom exception: ${e && e.message ? e.message : String(e)}`);
    }
  }

  function joinRoom() {
    try {
      const nick = loadNick();
      if (!nick) {
        roomsStatusText.textContent = "Brak nicku.";
        logDebug("joinRoom: brak nicku.");
        return;
      }

      const code = normalizeCode(joinRoomCode.value);
      if (code.length !== 6) {
        alert("Kod musi mieć 6 znaków.");
        return;
      }

      const rooms = loadRooms();

      const room = rooms.find(r => r && r.code === code);
      if (!room) {
        alert("Nie znaleziono pokoju o takim kodzie (na tym urządzeniu).");
        roomsStatusText.textContent = "Nie znaleziono pokoju.";
        logDebug(`joinRoom: brak pokoju ${code}`);
        return;
      }

      // dopisz gracza jeśli nie ma
      if (!Array.isArray(room.players)) room.players = [];
      if (!room.players.includes(nick)) room.players.push(nick);

      saveRooms(rooms);
      setActiveRoom(code);

      roomsStatusText.textContent = `Dołączono do ${code}`;
      logDebug(`joinRoom ok: ${code} gracz=${nick}`);

      alert(`Dołączono do pokoju!\nNazwa: ${room.name}\nKod: ${room.code}`);
    } catch (e) {
      roomsStatusText.textContent = "Błąd dołączania";
      logDebug(`joinRoom exception: ${e && e.message ? e.message : String(e)}`);
    }
  }

  // ----------------------------
  // menu handlers
  // ----------------------------
  function openLiga() {
    const nick = promptNick(false);
    if (!nick) return;
    showScreen("rooms");
    roomsStatusText.textContent = "—";
    logDebug(`openLiga (BUILD ${BUILD})`);
  }

  function initHandlers() {
    // menu
    changeNickBtn.addEventListener("click", () => promptNick(true));
    btnLiga.addEventListener("click", openLiga);

    btnStats.addEventListener("click", () => alert("Statystyki – zrobimy w następnym kroku."));
    btnExit.addEventListener("click", () => alert("Wyjście: w przeglądarce zamknij kartę, w Androidzie dodamy finish()."));

    // rooms
    changeNickBtn2.addEventListener("click", () => promptNick(true));
    backToMenuBtn.addEventListener("click", () => showScreen("menu"));

    createRoomBtn.addEventListener("click", createRoom);
    joinRoomBtn.addEventListener("click", joinRoom);

    // enter = tworzenie/dołączanie
    newRoomName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") createRoom();
    });
    joinRoomCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinRoom();
    });

    // uppercase input
    joinRoomCode.addEventListener("input", () => {
      joinRoomCode.value = normalizeCode(joinRoomCode.value).slice(0, 6);
    });

    window.addEventListener("resize", setBgImages);
  }

  // ----------------------------
  // splash + start
  // ----------------------------
  function boot() {
    setBgImages();
    updateNickUI();

    // migracja rooms przy starcie (naprawa starego formatu)
    const rooms = loadRooms();
    saveRooms(rooms);
    logDebug(`boot ok (BUILD ${BUILD}) rooms=${rooms.length}`);

    initHandlers();

    // pokaż menu po 7s
    if (splashHint) splashHint.textContent = "Ekran startowy (7s)…";
    setTimeout(() => {
      if (splashOverlay) splashOverlay.style.display = "none";
      showScreen("menu");
      if (statusText) statusText.textContent = `Menu gotowe. BUILD ${BUILD}`;
    }, SPLASH_MS);
  }

  boot();
})();
