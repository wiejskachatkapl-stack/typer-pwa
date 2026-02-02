(() => {
  /**
   * BUILD – podbijaj przy zmianach.
   * Musi się zgadzać z index.html (app.js?v=1004).
   */
  const BUILD = 1004;

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";        // lokalna baza pokoi (na urządzeniu)
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  const el = (id) => document.getElementById(id);

  // screens
  const splash = el("splash");
  const splashHint = el("splashHint");
  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");
  const roomScreen = el("roomScreen");

  // backgrounds
  const menuImg = el("menuImg");
  const roomsBg = el("roomsBg");
  const roomBg = el("roomBg");

  // nick labels
  const nickText = el("nickText");
  const nickTextRooms = el("nickTextRooms");
  const nickTextRoom = el("nickTextRoom");

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

  // room ui
  const backToRoomsBtn = el("backToRoomsBtn");
  const btnRefresh3 = el("btnRefresh3");
  const roomNameEl = el("roomName");
  const roomAdminEl = el("roomAdmin");
  const roomCodeEl = el("roomCode");
  const playersListEl = el("playersList");
  const btnCopyCode = el("btnCopyCode");
  const btnLeaveRoom = el("btnLeaveRoom");

  // modals: create/join
  const createRoomMask = el("createRoomMask");
  const createRoomNameInput = el("createRoomNameInput");
  const createRoomOkBtn = el("createRoomOkBtn");
  const createRoomCancelBtn = el("createRoomCancelBtn");

  const joinRoomMask = el("joinRoomMask");
  const joinRoomCodeInput = el("joinRoomCodeInput");
  const joinRoomOkBtn = el("joinRoomOkBtn");
  const joinRoomCancelBtn = el("joinRoomCancelBtn");

  // -------- helpers --------
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

    // room
    roomBg.onerror = () => {
      roomBg.onerror = null;
      roomBg.src = `${MENU_PHONE}?b=${BUILD}&t=${Date.now()}`;
    };
    roomBg.src = full;
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
    nickTextRoom.textContent = txt;
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

  // -------- local rooms storage (device-local) --------
  function loadRooms() {
    try {
      const raw = localStorage.getItem(KEY_ROOMS);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    } catch {
      return {};
    }
  }

  function saveRooms(rooms) {
    try { localStorage.setItem(KEY_ROOMS, JSON.stringify(rooms)); } catch {}
  }

  function setActiveRoomCode(code) {
    try { localStorage.setItem(KEY_ACTIVE_ROOM, code); } catch {}
  }

  function getActiveRoomCode() {
    try { return localStorage.getItem(KEY_ACTIVE_ROOM) || ""; } catch { return ""; }
  }

  function normalizeRoomName(name) {
    return (name || "").trim().replace(/\s+/g, " ");
  }

  function normalizeCode(code) {
    return (code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function genRoomCode6(existingRooms) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bez O/0/I/1
    for (let tries = 0; tries < 200; tries++) {
      let out = "";
      for (let i = 0; i < 6; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
      if (!existingRooms[out]) return out;
    }
    // awaryjnie:
    return String(Date.now()).slice(-6).toUpperCase();
  }

  function addPlayerIfMissing(room, nick) {
    if (!room.players) room.players = [];
    if (!room.players.includes(nick)) room.players.push(nick);
  }

  // -------- screens --------
  function showScreen(name) {
    const all = [menuScreen, roomsScreen, roomScreen];
    all.forEach(s => s.classList.add("hidden"));

    if (name === "menu") menuScreen.classList.remove("hidden");
    if (name === "rooms") roomsScreen.classList.remove("hidden");
    if (name === "room") roomScreen.classList.remove("hidden");
  }

  // -------- splash --------
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
      renderNick();
    }, SPLASH_MS);
  }

  // -------- modals --------
  function openCreateRoomModal() {
    createRoomNameInput.value = "";
    createRoomMask.style.display = "flex";
    setTimeout(() => createRoomNameInput.focus(), 50);
  }
  function closeCreateRoomModal() {
    createRoomMask.style.display = "none";
  }

  function openJoinRoomModal() {
    joinRoomCodeInput.value = "";
    joinRoomMask.style.display = "flex";
    setTimeout(() => joinRoomCodeInput.focus(), 50);
  }
  function closeJoinRoomModal() {
    joinRoomMask.style.display = "none";
  }

  // -------- room rendering --------
  function renderRoom(code) {
    const rooms = loadRooms();
    const room = rooms[code];
    if (!room) {
      alert("Ten pokój nie istnieje na tym urządzeniu (lokalne dane).");
      showScreen("rooms");
      return;
    }

    roomNameEl.textContent = room.name || "—";
    roomAdminEl.textContent = `Admin: ${room.admin || "—"}`;
    roomCodeEl.textContent = code;

    // players list
    playersListEl.innerHTML = "";
    const players = Array.isArray(room.players) ? room.players : [];
    players.forEach(p => {
      const row = document.createElement("div");
      row.className = "playerRow";
      row.innerHTML = `<div class="playerLabel">Gracz:</div><div class="playerName">${escapeHtml(p)}</div>`;
      playersListEl.appendChild(row);
    });

    showScreen("room");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -------- actions: create/join/leave --------
  function createRoomFlow() {
    if (!getNick()) {
      const res = askNick(false);
      if (!res) return;
    }
    openCreateRoomModal();
  }

  function joinRoomFlow() {
    if (!getNick()) {
      const res = askNick(false);
      if (!res) return;
    }
    openJoinRoomModal();
  }

  function doCreateRoom() {
    const nick = getNick();
    const name = normalizeRoomName(createRoomNameInput.value);

    if (!name) {
      alert("Podaj nazwę pokoju.");
      return;
    }

    const rooms = loadRooms();
    const code = genRoomCode6(rooms);

    const room = {
      code,
      name,
      admin: nick,
      players: []
    };
    addPlayerIfMissing(room, nick);

    rooms[code] = room;
    saveRooms(rooms);

    setActiveRoomCode(code);
    closeCreateRoomModal();
    renderNick();
    renderRoom(code);
  }

  function doJoinRoom() {
    const nick = getNick();
    const code = normalizeCode(joinRoomCodeInput.value);

    if (code.length !== 6) {
      alert("Kod musi mieć dokładnie 6 znaków.");
      return;
    }

    const rooms = loadRooms();
    const room = rooms[code];

    if (!room) {
      alert("Nie znaleziono pokoju o takim kodzie (na tym urządzeniu).");
      return;
    }

    addPlayerIfMissing(room, nick);
    rooms[code] = room;
    saveRooms(rooms);

    setActiveRoomCode(code);
    closeJoinRoomModal();
    renderNick();
    renderRoom(code);
  }

  function leaveRoom() {
    const code = getActiveRoomCode();
    if (!code) {
      showScreen("rooms");
      return;
    }
    const rooms = loadRooms();
    const room = rooms[code];
    const nick = getNick();

    if (room && Array.isArray(room.players)) {
      room.players = room.players.filter(p => p !== nick);
      // jeśli admin wyszedł i nie ma graczy — zostaw pokój (na razie nie usuwam)
      rooms[code] = room;
      saveRooms(rooms);
    }
    setActiveRoomCode("");
    showScreen("rooms");
  }

  // -------- refresh / cache fix --------
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

  // -------- events wiring --------

  // menu
  changeNickBtn.addEventListener("click", () => askNick(true));

  btnLiga.addEventListener("click", () => {
    if (!getNick()) {
      const res = askNick(false);
      if (!res) return;
    }
    renderNick();
    showScreen("rooms");
  });

  btnStats.addEventListener("click", () => alert("Statystyki — zrobimy później."));
  btnExit.addEventListener("click", () => alert("Wyjście: w przeglądarce zamknij kartę. W Android dodamy finish()."));
  btnRefresh.addEventListener("click", hardRefreshFix);

  // rooms
  backToMenuBtn.addEventListener("click", () => showScreen("menu"));
  btnNewRoom.addEventListener("click", createRoomFlow);
  btnJoinRoom.addEventListener("click", joinRoomFlow);
  btnRefresh2.addEventListener("click", hardRefreshFix);

  // room
  backToRoomsBtn.addEventListener("click", () => showScreen("rooms"));
  btnRefresh3.addEventListener("click", hardRefreshFix);

  btnCopyCode.addEventListener("click", async () => {
    const code = getActiveRoomCode();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      alert("Skopiowano kod pokoju.");
    } catch {
      // fallback
      const temp = document.createElement("textarea");
      temp.value = code;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
      alert("Skopiowano kod pokoju.");
    }
  });

  btnLeaveRoom.addEventListener("click", () => {
    if (confirm("Opuścić pokój?")) leaveRoom();
  });

  // modal create
  createRoomCancelBtn.addEventListener("click", closeCreateRoomModal);
  createRoomOkBtn.addEventListener("click", doCreateRoom);
  createRoomNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doCreateRoom();
  });

  // modal join
  joinRoomCancelBtn.addEventListener("click", closeJoinRoomModal);
  joinRoomOkBtn.addEventListener("click", doJoinRoom);
  joinRoomCodeInput.addEventListener("input", () => {
    // automatycznie uppercase + tylko A-Z0-9
    joinRoomCodeInput.value = normalizeCode(joinRoomCodeInput.value).slice(0, 6);
  });
  joinRoomCodeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doJoinRoom();
  });

  // resize/orientation
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setBgImages, 140);
  });

  // -------- init --------
  renderNick();
  setBgImages();
  showScreen("menu");
  startSplash();

  // SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // Jeżeli masz zapisany aktywny pokój (na tym urządzeniu) – możesz później chcieć auto-wznawianie.
  // Na razie NIE wznawiam automatycznie, żebyś miał kontrolę.
})();
