(() => {
  const BUILD = 1006;
  const APP_VERSION = "20260202-02";

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  // -------- SAFE STORAGE (gdy localStorage zablokowany) --------
  const memStore = {};
  const storage = {
    get(key) {
      try { return localStorage.getItem(key); }
      catch { return (key in memStore) ? memStore[key] : null; }
    },
    set(key, val) {
      try { localStorage.setItem(key, val); }
      catch { memStore[key] = String(val); }
    }
  };

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
  const debugBox = el("debugBox");

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

  // --------- Debug / Errors ---------
  const setStatus = (txt) => { if (statusText) statusText.textContent = txt; };
  const setDebug = (txt) => { if (debugBox) debugBox.textContent = txt; };

  window.addEventListener("error", (e) => {
    setStatus("Błąd: " + (e.message || "unknown"));
    setDebug("JS error: " + (e.message || "unknown"));
  });

  // --- Helpers ---
  const isLandscape = () => window.matchMedia("(orientation: landscape)").matches;
  const pickMenuBg = () => (isLandscape() ? MENU_PC : MENU_PHONE);

  const show = (screen) => {
    [menuScreen, roomsScreen, roomScreen].forEach(s => s && s.classList.remove("active"));
    screen && screen.classList.add("active");
  };

  const setBadge = (txt) => { if (screenBadge) screenBadge.textContent = txt; };

  const refreshBg = () => {
    if (!bgImg) return;
    bgImg.src = "./" + pickMenuBg() + "?v=" + BUILD;
  };

  const loadNick = () => storage.get(KEY_NICK) || "";
  const saveNick = (v) => storage.set(KEY_NICK, v);

  const loadRooms = () => {
    try { return JSON.parse(storage.get(KEY_ROOMS) || "[]"); } catch { return []; }
  };
  const saveRooms = (rooms) => storage.set(KEY_ROOMS, JSON.stringify(rooms));

  const setActiveRoom = (code) => storage.set(KEY_ACTIVE_ROOM, code || "");
  const getActiveRoom = () => storage.get(KEY_ACTIVE_ROOM) || "";

  const genCode6 = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const renderNick = () => {
    const n = loadNick();
    if (nickBig) nickBig.textContent = n ? `Nick: ${n}` : "Nick: —";
  };

  const openNickModal = (prefill = "") => {
    if (!nickModal || !nickInput) return;
    nickInput.value = prefill;
    nickModal.classList.add("active");
    setTimeout(() => nickInput.focus(), 80);
  };
  const closeNickModal = () => nickModal && nickModal.classList.remove("active");

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
    if (r.admin === playerNick) r.admin = r.players[0] || "";

    const filtered = rooms.filter(x => x.code !== code);
    if (r.players.length > 0) filtered.unshift(r);
    saveRooms(filtered);
    setActiveRoom("");
  };

  const renderRoom = (room) => {
    setBadge("Pokój");
    show(roomScreen);

    if (roomTitle) roomTitle.textContent = room.name || "—";
    if (roomAdmin) roomAdmin.textContent = "Admin: " + (room.admin || "—");
    if (roomCode) roomCode.textContent = room.code || "------";

    if (!playersList) return;
    playersList.innerHTML = "";

    const me = loadNick();
    if (!room.players || room.players.length === 0) {
      playersList.textContent = "Brak graczy…";
      return;
    }

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "8px";

    room.players.forEach(p => {
      const line = document.createElement("div");
      line.className = "pill";
      line.textContent = "Gracz: " + p + (p === me ? " (Ty)" : "");
      wrap.appendChild(line);
    });
    playersList.appendChild(wrap);
  };

  // --- Navigation ---
  const goMenu = () => {
    refreshBg();
    setBadge("Menu");
    show(menuScreen);
    setStatus(`BUILD ${BUILD} (${APP_VERSION})`);
    setDebug(`NickKey=${KEY_NICK} rooms=${loadRooms().length}`);
  };

  const goRooms = () => {
    refreshBg();
    setBadge("Liga");
    show(roomsScreen);
    setStatus("Wybierz: nowy pokój lub dołącz");
    setDebug(`rooms=${loadRooms().length} localStorageOK=${testLocalStorage()}`);
  };

  function testLocalStorage() {
    try {
      localStorage.setItem("__t", "1");
      localStorage.removeItem("__t");
      return "TAK";
    } catch {
      return "NIE (fallback RAM)";
    }
  }

  // --- Events ---
  window.addEventListener("resize", refreshBg);

  backBtn && backBtn.addEventListener("click", () => {
    if (roomScreen && roomScreen.classList.contains("active")) { goRooms(); return; }
    if (roomsScreen && roomsScreen.classList.contains("active")) { goMenu(); return; }
  });

  changeNickBtn && changeNickBtn.addEventListener("click", () => openNickModal(loadNick()));

  nickCancel && nickCancel.addEventListener("click", () => closeNickModal());
  nickSave && nickSave.addEventListener("click", () => {
    const v = (nickInput?.value || "").trim();
    if (!v) { setStatus("Wpisz nick"); return; }
    saveNick(v);
    renderNick();
    closeNickModal();
    setStatus("Nick zapisany");
  });

  btnLiga && btnLiga.addEventListener("click", () => ensureNickThen(() => goRooms()));
  btnStats && btnStats.addEventListener("click", () => alert("Statystyki – później."));
  btnExit && btnExit.addEventListener("click", () => alert("Wyjście: w PWA zamknij kartę."));

  // *** NAJWAŻNIEJSZE: UTWÓRZ POKÓJ ***
  createRoomBtn && createRoomBtn.addEventListener("click", () => {
    try {
      ensureNickThen((nick) => {
        const nm = (newRoomName?.value || "").trim();
        const r = createRoom(nm, nick);
        if (newRoomName) newRoomName.value = "";
        renderRoom(r);
        setStatus("Utworzono pokój: " + r.code);
        setDebug("OK createRoom code=" + r.code);
      });
    } catch (err) {
      setStatus("Błąd tworzenia pokoju");
      setDebug("createRoom exception: " + (err?.message || String(err)));
    }
  });

  joinCode && joinCode.addEventListener("input", () => {
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,6);
  });

  joinRoomBtn && joinRoomBtn.addEventListener("click", () => {
    ensureNickThen((nick) => {
      const code = (joinCode?.value || "").trim().toUpperCase();
      if (code.length !== 6) { alert("Kod musi mieć 6 znaków."); return; }
      const r = joinRoom(code, nick);
      if (!r) { alert("Nie znaleziono pokoju o takim kodzie (lokalnie)."); return; }
      renderRoom(r);
      setStatus("Dołączono do pokoju");
      setDebug("OK joinRoom code=" + code);
    });
  });

  copyCodeBtn && copyCodeBtn.addEventListener("click", async () => {
    const code = roomCode?.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Skopiowano kod");
    } catch {
      alert("Nie mogę skopiować – schowek zablokowany.");
    }
  });

  leaveRoomBtn && leaveRoomBtn.addEventListener("click", () => {
    const n = loadNick();
    const code = roomCode?.textContent || "";
    if (!code || code.length !== 6) return;
    leaveRoom(code, n);
    goRooms();
    setStatus("Opuszczono pokój");
  });

  // --- Splash timing ---
  const startApp = () => {
    splash && splash.classList.remove("active");
    app && app.classList.add("active");

    refreshBg();
    renderNick();

    const active = getActiveRoom();
    if (active) {
      const r = getRoom(active);
      if (r) { renderRoom(r); setStatus("Wczytano pokój"); return; }
      setActiveRoom("");
    }
    goMenu();
  };

  setStatus(`Splash… BUILD ${BUILD} (${APP_VERSION})`);
  setTimeout(startApp, SPLASH_MS);
})();
