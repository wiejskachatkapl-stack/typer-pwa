(() => {
  /**
   * Wersja aplikacji:
   * - BUILD podbijaj przy zmianach
   * - musi się zgadzać z index.html (app.js?v=BUILD oraz sw.js?v=BUILD)
   */
  const BUILD = 1005;
  const APP_VERSION = "20260202-01";

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  const el = (id) => document.getElementById(id);

  // Screens
  const splash = el("splash");
  const app = el("app");
  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");
  const roomScreen = el("roomScreen");

  // UI
  const bgImg = el("bgImg");
  const screenBadge = el("screenBadge");
  const nickBig = el("nickBig");
  const backBtn = el("backBtn");
  const changeNickBtn = el("changeNickBtn");

  const statusText = el("statusText");

  // Buttons
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");

  // Rooms UI
  const newRoomName = el("newRoomName");
  const createRoomBtn = el("createRoomBtn");
  const joinCode = el("joinCode");
  const joinRoomBtn = el("joinRoomBtn");

  // Room UI
  const playersList = el("playersList");
  const roomTitle = el("roomTitle");
  const roomAdmin = el("roomAdmin");
  const roomCode = el("roomCode");
  const copyCodeBtn = el("copyCodeBtn");
  const leaveRoomBtn = el("leaveRoomBtn");

  // Modal
  const nickModal = el("nickModal");
  const nickInput = el("nickInput");
  const nickCancel = el("nickCancel");
  const nickSave = el("nickSave");

  // --- Helpers ---
  const isLandscape = () => window.matchMedia("(orientation: landscape)").matches;
  const pickMenuBg = () => (isLandscape() ? MENU_PC : MENU_PHONE);

  const show = (screen) => {
    [menuScreen, roomsScreen, roomScreen].forEach(s => s.classList.remove("active"));
    screen.classList.add("active");
  };

  const setBadge = (txt) => { screenBadge.textContent = txt; };

  const setStatus = (txt) => { statusText.textContent = txt; };

  const loadNick = () => localStorage.getItem(KEY_NICK) || "";
  const saveNick = (v) => localStorage.setItem(KEY_NICK, v);

  const loadRooms = () => {
    try { return JSON.parse(localStorage.getItem(KEY_ROOMS) || "[]"); } catch { return []; }
  };
  const saveRooms = (rooms) => localStorage.setItem(KEY_ROOMS, JSON.stringify(rooms));

  const setActiveRoom = (code) => localStorage.setItem(KEY_ACTIVE_ROOM, code || "");
  const getActiveRoom = () => localStorage.getItem(KEY_ACTIVE_ROOM) || "";

  const genCode6 = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const openNickModal = (prefill = "") => {
    nickInput.value = prefill;
    nickModal.classList.add("active");
    setTimeout(() => nickInput.focus(), 60);
  };
  const closeNickModal = () => nickModal.classList.remove("active");

  const refreshBg = () => {
    bgImg.src = "./" + pickMenuBg() + "?v=" + BUILD;
  };

  const renderNick = () => {
    const n = loadNick();
    nickBig.textContent = n ? `Nick: ${n}` : "Nick: —";
  };

  const ensureNickThen = (onOk) => {
    const n = loadNick();
    if (n) { onOk(n); return; }
    openNickModal("");
    const handler = () => {
      nickSave.removeEventListener("click", handler);
      const nn = loadNick();
      if (nn) onOk(nn);
    };
    nickSave.addEventListener("click", handler);
  };

  // --- Rooms logic (lokalnie na urządzeniu) ---
  const createRoom = (name, adminNick) => {
    const rooms = loadRooms();
    let code = genCode6();
    // unikaj kolizji
    while (rooms.some(r => r.code === code)) code = genCode6();

    const room = {
      code,
      name: (name || "Nowy pokój").trim(),
      admin: adminNick,
      players: [adminNick],
      createdAt: Date.now()
    };
    rooms.unshift(room);
    saveRooms(rooms);
    setActiveRoom(code);
    return room;
  };

  const joinRoom = (code, playerNick) => {
    const rooms = loadRooms();
    const r = rooms.find(x => x.code === code);
    if (!r) return null;
    if (!r.players.includes(playerNick)) r.players.push(playerNick);
    saveRooms(rooms);
    setActiveRoom(code);
    return r;
  };

  const getRoom = (code) => loadRooms().find(r => r.code === code) || null;

  const leaveRoom = (code, playerNick) => {
    const rooms = loadRooms();
    const r = rooms.find(x => x.code === code);
    if (!r) return;

    r.players = r.players.filter(p => p !== playerNick);

    // jeśli admin wyszedł – przejmie pierwszy gracz
    if (r.admin === playerNick) {
      r.admin = r.players[0] || "";
    }

    // jeśli pusty, usuń pokój
    const filtered = rooms.filter(x => x.code !== code);
    if (r.players.length > 0) filtered.unshift(r);
    saveRooms(filtered);

    setActiveRoom("");
  };

  const renderRoom = (room) => {
    const n = loadNick();
    setBadge("Pokój");
    show(roomScreen);

    roomTitle.textContent = room.name || "—";
    roomAdmin.textContent = "Admin: " + (room.admin || "—");
    roomCode.textContent = room.code || "------";

    playersList.innerHTML = "";
    if (!room.players || room.players.length === 0) {
      playersList.textContent = "Brak graczy…";
      return;
    }

    const ul = document.createElement("div");
    ul.style.display = "flex";
    ul.style.flexDirection = "column";
    ul.style.gap = "8px";
    room.players.forEach(p => {
      const line = document.createElement("div");
      line.className = "pill";
      line.textContent = "Gracz: " + p + (p === n ? " (Ty)" : "");
      ul.appendChild(line);
    });
    playersList.appendChild(ul);
  };

  // --- Navigation ---
  const goMenu = () => {
    refreshBg();
    setBadge("Menu");
    show(menuScreen);
    setStatus(`BUILD ${BUILD} (${APP_VERSION})`);
  };

  const goRooms = () => {
    refreshBg(); // na razie ta sama grafika co menu
    setBadge("Liga");
    show(roomsScreen);
    setStatus("Wybierz: nowy pokój lub dołącz");
  };

  // --- Events ---
  window.addEventListener("resize", refreshBg);

  backBtn.addEventListener("click", () => {
    const active = getActiveRoom();
    if (roomScreen.classList.contains("active")) {
      // z pokoju do wyboru pokoi
      goRooms();
      return;
    }
    if (roomsScreen.classList.contains("active")) {
      goMenu();
      return;
    }
    // z menu nic
  });

  changeNickBtn.addEventListener("click", () => {
    openNickModal(loadNick());
  });

  nickCancel.addEventListener("click", () => closeNickModal());
  nickSave.addEventListener("click", () => {
    const v = (nickInput.value || "").trim();
    if (!v) return;
    saveNick(v);
    renderNick();
    closeNickModal();
    setStatus("Nick zapisany");
  });

  btnLiga.addEventListener("click", () => {
    ensureNickThen(() => goRooms());
  });

  btnStats.addEventListener("click", () => alert("Statystyki – zrobimy w następnym kroku."));
  btnExit.addEventListener("click", () => alert("Wyjście: w PWA zamknij kartę. W Android (WebView) dodamy finish()."));

  createRoomBtn.addEventListener("click", () => {
    ensureNickThen((nick) => {
      const nm = (newRoomName.value || "").trim();
      const r = createRoom(nm, nick);
      newRoomName.value = "";
      renderRoom(r);
      setStatus("Utworzono pokój");
    });
  });

  joinCode.addEventListener("input", () => {
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,6);
  });

  joinRoomBtn.addEventListener("click", () => {
    ensureNickThen((nick) => {
      const code = (joinCode.value || "").trim().toUpperCase();
      if (code.length !== 6) { alert("Kod musi mieć 6 znaków."); return; }
      const r = joinRoom(code, nick);
      if (!r) { alert("Nie znaleziono pokoju o takim kodzie (lokalna baza)."); return; }
      renderRoom(r);
      setStatus("Dołączono do pokoju");
    });
  });

  copyCodeBtn.addEventListener("click", async () => {
    const code = roomCode.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Skopiowano kod");
    } catch {
      alert("Nie mogę skopiować – przeglądarka zablokowała schowek.");
    }
  });

  leaveRoomBtn.addEventListener("click", () => {
    const n = loadNick();
    const code = roomCode.textContent || "";
    if (!code || code.length !== 6) return;
    leaveRoom(code, n);
    goRooms();
    setStatus("Opuszczono pokój");
  });

  // --- Splash timing ---
  const startApp = () => {
    // ukryj splash, pokaż app
    splash.classList.remove("active");
    app.classList.add("active");

    refreshBg();
    renderNick();

    // jeśli był aktywny pokój, wejdź od razu
    const active = getActiveRoom();
    if (active) {
      const r = getRoom(active);
      if (r) { renderRoom(r); setStatus("Wczytano pokój"); return; }
      setActiveRoom("");
    }
    goMenu();
  };

  // uruchom po 7s
  setTimeout(startApp, SPLASH_MS);

  // status początkowy (dla testu)
  setStatus(`Splash… BUILD ${BUILD} (${APP_VERSION})`);
})();
