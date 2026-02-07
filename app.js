(() => {
  /**
   * BUILD – podbijaj przy zmianach.
   * Musi się zgadzać z index.html (app.js?v=1019).
   */
  const BUILD = 1019;

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";
  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  // W POKOJU (i splash) ma zostać tylko to:
  const ROOM_BG = "img_tlo.png";

  const el = (id) => document.getElementById(id);

  // screens
  const splash = el("splash");
  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");
  const roomScreen = el("roomScreen");

  // bg
  const bg = el("bg");

  // splash labels
  const splashHint = el("splashHint");
  const splashVer = el("splashVer");

  // nick labels
  const nickText = el("nickText");
  const nickTextRooms = el("nickTextRooms");
  const nickTextRoom = el("nickTextRoom");

  // menu buttons
  const changeNickBtn = el("changeNickBtn");
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");
  const menuInfo = el("menuInfo");

  // rooms screen
  const changeNickBtnRooms = el("changeNickBtnRooms");
  const backToMenuBtn = el("backToMenuBtn");
  const newRoomName = el("newRoomName");
  const createRoomBtn = el("createRoomBtn");
  const joinRoomCode = el("joinRoomCode");
  const joinRoomBtn = el("joinRoomBtn");
  const debugBox = el("debugBox");
  const roomsInfo = el("roomsInfo");

  // room screen
  const roomBackBtn = el("roomBackBtn");
  const matchesList = el("matchesList");
  const addQueueBtn = el("addQueueBtn");
  const saveAllBtn = el("saveAllBtn");

  const playersList = el("playersList");
  const roomNameText = el("roomNameText");
  const roomAdminText = el("roomAdminText");
  const roomCodeText = el("roomCodeText");
  const copyCodeBtn = el("copyCodeBtn");
  const leaveRoomBtn = el("leaveRoomBtn");
  const refreshRoomBtn = el("refreshRoomBtn");
  const roomInfo = el("roomInfo");

  // state
  let nick = "";
  let rooms = [];
  let activeRoomCode = "";
  let lastDebug = [];

  const isPhone = () => window.matchMedia("(max-width: 880px)").matches;

  const setBackground = (which) => {
    bg.style.backgroundImage = `url('${which}')`;
  };

  const showScreen = (scr) => {
    [splash, menuScreen, roomsScreen, roomScreen].forEach(s => s.classList.remove("active"));
    scr.classList.add("active");
  };

  const logDebug = (msg) => {
    if (!debugBox) return;
    const t = new Date();
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    const ss = String(t.getSeconds()).padStart(2, "0");
    lastDebug.unshift(`[${hh}:${mm}:${ss}] ${msg}`);
    lastDebug = lastDebug.slice(0, 30);
    debugBox.textContent = lastDebug.join("\n");
  };

  const saveRooms = () => localStorage.setItem(KEY_ROOMS, JSON.stringify(rooms));
  const loadRooms = () => {
    try {
      const raw = localStorage.getItem(KEY_ROOMS);
      rooms = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(rooms)) rooms = [];
    } catch {
      rooms = [];
    }
  };

  const saveNick = (n) => localStorage.setItem(KEY_NICK, n);
  const loadNick = () => (localStorage.getItem(KEY_NICK) || "").trim();

  const saveActiveRoom = (code) => localStorage.setItem(KEY_ACTIVE_ROOM, code);
  const loadActiveRoom = () => (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim();

  const normalize = (s) => (s || "").toString().trim();
  const upper = (s) => normalize(s).toUpperCase();

  const genCode6 = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const findRoom = (code) => rooms.find(r => r.code === code);

  // TEST QUEUE
  const testQueue = () => ([
    { home: "Jagiellonia", away: "Piast" },
    { home: "Lechia", away: "Legia" },
    { home: "Wisła Płock", away: "Radomiak" },
    { home: "GKS Katowice", away: "Górnik" },
    { home: "Arka", away: "Cracovia" },
    { home: "Lech", away: "Pogoń" },
    { home: "Motor", away: "Raków" },
    { home: "Korona", away: "Widzew" },
    { home: "Śląsk", away: "Zagłębie" },
    { home: "Jagiellonia", away: "Lech" },
  ]);

  // LOGO RESOLVER
  const slug = (name) => normalize(name)
    .toLowerCase()
    .replaceAll("ł", "l").replaceAll("ś", "s").replaceAll("ć", "c").replaceAll("ń", "n")
    .replaceAll("ó", "o").replaceAll("ż", "z").replaceAll("ź", "z").replaceAll("ą", "a")
    .replaceAll("ę", "e")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const LOGO_ALIASES = {
    "jagiellonia": ["jagiellonia", "bialystok"],
    "piast": ["piast", "gliwice"],
    "lechia": ["lechia", "gdansk"],
    "legia": ["legia", "warszawa"],
    "wisla_plock": ["wisla_plock", "plock"],
    "radomiak": ["radomiak", "radom"],
    "gks_katowice": ["gks_katowice", "katowice"],
    "gornik": ["gornik", "zabrze"],
    "arka": ["arka", "gdynia"],
    "cracovia": ["cracovia", "krakow"],
    "lech": ["lech", "poznan"],
    "pogon": ["pogon", "szczecin"],
    "motor": ["motor", "lublin"],
    "rakow": ["rakow", "czestochowa"],
    "korona": ["korona", "kielce"],
    "widzew": ["widzew", "lodz"],
    "slask": ["slask", "wroclaw"],
    "zaglebie": ["zaglebie", "lubin"],
  };

  const guessLogoCandidates = (teamName) => {
    const s = slug(teamName);
    const aliases = LOGO_ALIASES[s] || [s];
    const out = [];
    for (const a of aliases) {
      out.push(`logos/${a}.png`);
      out.push(`logos/${a}.jpg`);
      out.push(`logos/${a}.jpeg`);
      out.push(`${a}.png`);
      out.push(`${a}.jpg`);
    }
    return out;
  };

  const syncNickLabels = () => {
    nickText.textContent = nick || "—";
    nickTextRooms.textContent = nick || "—";
    nickTextRoom.textContent = nick || "—";
  };

  const setMenuBg = () => setBackground(isPhone() ? MENU_PHONE : MENU_PC);
  const setRoomBg = () => setBackground(ROOM_BG);

  const renderPlayers = (room) => {
    playersList.innerHTML = "";
    const list = (room.players || []).slice();
    if (!list.includes(nick)) list.push(nick);

    list.forEach(p => {
      const row = document.createElement("div");
      row.className = "playerRow";
      row.innerHTML = `<span>Gracz:</span><b>${p}</b>`;
      playersList.appendChild(row);
    });
  };

  const getNickTipsForRoom = (room) => {
    if (!room.tips) room.tips = {};
    if (!room.tips[nick]) room.tips[nick] = {};
    return room.tips[nick];
  };

  const allPicksFilled = () => {
    const inputs = [...matchesList.querySelectorAll("input[data-mid]")];
    if (inputs.length === 0) return false;

    const by = {};
    inputs.forEach(i => {
      const mid = i.getAttribute("data-mid");
      if (!by[mid]) by[mid] = [];
      by[mid].push(i);
    });

    for (const mid of Object.keys(by)) {
      const arr = by[mid];
      const a = arr.find(x => x.getAttribute("data-side") === "home");
      const b = arr.find(x => x.getAttribute("data-side") === "away");
      if (!a || !b) return false;

      const va = a.value.trim();
      const vb = b.value.trim();
      if (va === "" || vb === "") return false;
      if (!/^\d+$/.test(va) || !/^\d+$/.test(vb)) return false;
    }
    return true;
  };

  const updateSaveAllState = () => {
    saveAllBtn.disabled = !allPicksFilled();
  };

  const renderMatches = (room) => {
    matchesList.innerHTML = "";
    const tips = getNickTipsForRoom(room);

    (room.matches || []).forEach(m => {
      const row = document.createElement("div");
      row.className = "matchRow";

      // LEFT TEAM
      const left = document.createElement("div");
      left.className = "team";

      const leftLogo = document.createElement("img");
      leftLogo.className = "logo";
      leftLogo.alt = m.home; // <-- POPRAWIONE
      leftLogo.src = guessLogoCandidates(m.home)[0];
      leftLogo.onerror = () => {
        const c = guessLogoCandidates(m.home);
        const idx = Number(leftLogo.dataset.idx || "0") + 1;
        if (idx < c.length) {
          leftLogo.dataset.idx = String(idx);
          leftLogo.src = c[idx];
        } else {
          leftLogo.onerror = null;
          leftLogo.style.opacity = "0.0";
        }
      };

      const leftName = document.createElement("div");
      leftName.className = "teamName";
      leftName.textContent = m.home;

      left.appendChild(leftLogo);
      left.appendChild(leftName);

      // SCORE
      const mid = document.createElement("div");
      mid.className = "scoreBox";

      const inA = document.createElement("input");
      inA.className = "scoreInput";
      inA.inputMode = "numeric";
      inA.placeholder = "-";
      inA.value = (tips[m.id]?.h ?? "").toString();
      inA.setAttribute("data-mid", m.id);
      inA.setAttribute("data-side", "home");

      const sep = document.createElement("div");
      sep.className = "scoreSep";
      sep.textContent = ":";

      const inB = document.createElement("input");
      inB.className = "scoreInput";
      inB.inputMode = "numeric";
      inB.placeholder = "-";
      inB.value = (tips[m.id]?.a ?? "").toString();
      inB.setAttribute("data-mid", m.id);
      inB.setAttribute("data-side", "away");

      const onAnyInput = () => {
        inA.value = inA.value.replace(/[^\d]/g, "");
        inB.value = inB.value.replace(/[^\d]/g, "");
        updateSaveAllState();
      };
      inA.addEventListener("input", onAnyInput);
      inB.addEventListener("input", onAnyInput);

      mid.appendChild(inA);
      mid.appendChild(sep);
      mid.appendChild(inB);

      // RIGHT TEAM
      const right = document.createElement("div");
      right.className = "team";
      right.style.justifyContent = "flex-end";

      const rightName = document.createElement("div");
      rightName.className = "teamName";
      rightName.style.textAlign = "right";
      rightName.textContent = m.away;

      const rightLogo = document.createElement("img");
      rightLogo.className = "logo";
      rightLogo.alt = m.away;
      rightLogo.src = guessLogoCandidates(m.away)[0];
      rightLogo.onerror = () => {
        const c = guessLogoCandidates(m.away);
        const idx = Number(rightLogo.dataset.idx || "0") + 1;
        if (idx < c.length) {
          rightLogo.dataset.idx = String(idx);
          rightLogo.src = c[idx];
        } else {
          rightLogo.onerror = null;
          rightLogo.style.opacity = "0.0";
        }
      };

      right.appendChild(rightName);
      right.appendChild(rightLogo);

      row.appendChild(left);
      row.appendChild(mid);
      row.appendChild(right);

      matchesList.appendChild(row);
    });

    updateSaveAllState();
  };

  const askNickIfNeeded = () => {
    if (nick) return true;
    const n = prompt("Podaj nick:");
    const nn = normalize(n);
    if (!nn) return false;
    nick = nn;
    saveNick(nick);
    syncNickLabels();
    return true;
  };

  const openMenu = () => {
    setMenuBg();
    syncNickLabels();
    menuInfo.textContent = `BUILD ${BUILD}`;
    showScreen(menuScreen);
  };

  const openLiga = () => {
    setMenuBg();
    syncNickLabels();
    roomsInfo.textContent = `BUILD ${BUILD}`;
    showScreen(roomsScreen);
    logDebug(`openLiga (BUILD ${BUILD}) rooms=${rooms.length}`);
  };

  const openRoom = (code) => {
    const room = findRoom(code);
    if (!room) {
      roomInfo.textContent = "Nie znaleziono pokoju.";
      return;
    }
    activeRoomCode = code;
    saveActiveRoom(code);

    setRoomBg();

    roomNameText.textContent = room.name || "—";
    roomAdminText.textContent = `Admin: ${room.admin || "—"}`;
    roomCodeText.value = room.code;

    renderPlayers(room);
    renderMatches(room);

    roomInfo.textContent = `W pokoju: ${room.code}`;
    showScreen(roomScreen);
  };

  const createRoom = () => {
    try {
      const name = normalize(newRoomName.value);
      if (!name) {
        roomsInfo.textContent = "Podaj nazwę pokoju.";
        return;
      }

      let code = genCode6();
      while (rooms.some(r => r.code === code)) code = genCode6();

      const room = {
        code,
        name,
        admin: nick,
        players: [nick],
        createdAt: Date.now(),
        matches: [],
        tips: {},
      };

      rooms.push(room);
      saveRooms();
      roomsInfo.textContent = `Utworzono pokój: ${code}`;
      logDebug(`createRoom ok: ${code} (${name}) admin=${nick}`);

      openRoom(code);
    } catch (e) {
      roomsInfo.textContent = "Błąd tworzenia pokoju";
      logDebug(`createRoom exception: ${e?.message || e}`);
    }
  };

  const joinRoom = () => {
    try {
      const code = upper(joinRoomCode.value);
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        roomsInfo.textContent = "Kod musi mieć 6 znaków.";
        return;
      }
      const room = findRoom(code);
      if (!room) {
        roomsInfo.textContent = "Nie ma takiego pokoju (test – lokalnie).";
        return;
      }
      if (!room.players) room.players = [];
      if (!room.players.includes(nick)) room.players.push(nick);
      saveRooms();
      roomsInfo.textContent = `Dołączono do ${code}`;
      logDebug(`joinRoom ok: ${code} gracz=${nick}`);
      openRoom(code);
    } catch (e) {
      roomsInfo.textContent = "Błąd dołączania";
      logDebug(`joinRoom exception: ${e?.message || e}`);
    }
  };

  const addQueue = () => {
    const room = findRoom(activeRoomCode);
    if (!room) return;

    const base = testQueue();
    const now = Date.now();
    const matches = base.slice(0, 10).map((m, idx) => ({
      id: `m_${now}_${idx}`,
      league: "Ekstraklasa",
      home: m.home,
      away: m.away
    }));

    room.matches = matches;
    saveRooms();
    renderMatches(room);
    roomInfo.textContent = "Dodano kolejkę (test)";
    logDebug(`queue added: ${matches.length} matches`);
  };

  const saveAllTips = () => {
    const room = findRoom(activeRoomCode);
    if (!room) return;

    if (!allPicksFilled()) {
      roomInfo.textContent = "Uzupełnij typy we wszystkich meczach.";
      return;
    }

    const tips = getNickTipsForRoom(room);
    const inputs = [...matchesList.querySelectorAll("input[data-mid]")];
    const by = {};
    inputs.forEach(i => {
      const mid = i.getAttribute("data-mid");
      const side = i.getAttribute("data-side");
      if (!by[mid]) by[mid] = {};
      by[mid][side] = i.value.trim();
    });

    for (const mid of Object.keys(by)) {
      const h = Number(by[mid].home);
      const a = Number(by[mid].away);
      tips[mid] = { h, a, at: Date.now() };
    }

    saveRooms();
    roomInfo.textContent = "Zapisano wszystkie typy ✔";
    logDebug(`saveAllTips ok for ${nick} matches=${Object.keys(by).length}`);
  };

  const copyCode = async () => {
    try {
      const code = roomCodeText.value;
      await navigator.clipboard.writeText(code);
      roomInfo.textContent = "Skopiowano kod.";
    } catch {
      roomInfo.textContent = "Nie udało się skopiować.";
    }
  };

  const leaveRoom = () => {
    const room = findRoom(activeRoomCode);
    if (room && Array.isArray(room.players)) {
      room.players = room.players.filter(p => p !== nick);
      saveRooms();
    }
    activeRoomCode = "";
    saveActiveRoom("");
    openLiga();
  };

  const refreshRoom = () => {
    loadRooms();
    if (activeRoomCode) openRoom(activeRoomCode);
    else openLiga();
  };

  const changeNick = () => {
    const n = prompt("Nowy nick:", nick || "");
    const nn = normalize(n);
    if (!nn) return;
    nick = nn;
    saveNick(nick);
    syncNickLabels();

    const room = findRoom(activeRoomCode);
    if (room) {
      if (!room.players) room.players = [];
      if (!room.players.includes(nick)) room.players.push(nick);
      saveRooms();
      renderPlayers(room);
      renderMatches(room);
    }
  };

  const boot = () => {
    setRoomBg(); // splash + room -> img_tlo.png
    splashVer.textContent = `BUILD ${BUILD}`;
    splashHint.textContent = `Ekran startowy (7s)…`;

    loadRooms();
    nick = loadNick();
    activeRoomCode = loadActiveRoom();

    setTimeout(() => {
      setMenuBg();
      if (!nick) {
        const ok = askNickIfNeeded();
        if (!ok) {
          nick = "";
          saveNick("");
        }
      }
      syncNickLabels();
      openMenu();
    }, SPLASH_MS);
  };

  window.addEventListener("resize", () => {
    if (menuScreen.classList.contains("active") || roomsScreen.classList.contains("active")) setMenuBg();
    if (roomScreen.classList.contains("active") || splash.classList.contains("active")) setRoomBg();
  });

  // menu
  changeNickBtn.addEventListener("click", changeNick);
  btnLiga.addEventListener("click", () => { if (!askNickIfNeeded()) return; openLiga(); });
  btnStats.addEventListener("click", () => alert("Statystyki: wkrótce"));
  btnExit.addEventListener("click", () => alert("Wyjście: w PWA zamknij kartę / aplikację."));

  // rooms
  changeNickBtnRooms.addEventListener("click", changeNick);
  backToMenuBtn.addEventListener("click", openMenu);
  createRoomBtn.addEventListener("click", () => { if (!askNickIfNeeded()) return; createRoom(); });
  joinRoomBtn.addEventListener("click", () => { if (!askNickIfNeeded()) return; joinRoom(); });

  // room
  roomBackBtn.addEventListener("click", openLiga);
  addQueueBtn.addEventListener("click", addQueue);
  saveAllBtn.addEventListener("click", saveAllTips);
  copyCodeBtn.addEventListener("click", copyCode);
  leaveRoomBtn.addEventListener("click", leaveRoom);
  refreshRoomBtn.addEventListener("click", refreshRoom);

  boot();
})();
