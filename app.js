(() => {
  /**
   * BUILD – podbijaj przy zmianach.
   * Musi się zgadzać z index.html (app.js?v=XXXX).
   */
  const BUILD = 1012;

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";       // local rooms (device)
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";

  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  const LOGO_DIR = "logos";

  const el = (id) => document.getElementById(id);

  // screens
  const splash = el("splash");
  const splashHint = el("splashHint");
  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");
  const roomScreen = el("roomScreen");

  // bg
  const bgImage = el("bgImage");
  const menuImg = el("menuImg");

  // menu ui
  const nickChip = el("nickChip");
  const changeNickBtn = el("changeNickBtn");
  const btnLiga = el("btnLiga");
  const btnStats = el("btnStats");
  const btnExit = el("btnExit");

  // rooms ui
  const nickChipRooms = el("nickChipRooms");
  const changeNickBtn2 = el("changeNickBtn2");
  const backToMenu1 = el("backToMenu1");
  const roomNameInput = el("roomNameInput");
  const createRoomBtn = el("createRoomBtn");
  const joinCodeInput = el("joinCodeInput");
  const joinRoomBtn = el("joinRoomBtn");
  const debugCard = el("debugCard");
  const debugLog = el("debugLog");
  const buildLabel = el("buildLabel");
  const roomsStatus = el("roomsStatus");

  // room ui
  const nickChipRoom = el("nickChipRoom");
  const backToRooms = el("backToRooms");
  const playersList = el("playersList");
  const roomTitle = el("roomTitle");
  const roomAdmin = el("roomAdmin");
  const roomCodeInput = el("roomCodeInput");
  const copyCodeBtn = el("copyCodeBtn");
  const leaveRoomBtn = el("leaveRoomBtn");
  const refreshRoomBtn = el("refreshRoomBtn");
  const roomStatus = el("roomStatus");

  const addRoundBtn = el("addRoundBtn");
  const saveAllTipsBtn = el("saveAllTipsBtn");
  const matchesList = el("matchesList");

  // ---------- helpers ----------

  const isLandscape = () => window.matchMedia && window.matchMedia("(orientation: landscape)").matches;
  const pickMenuSrc = () => (isLandscape() ? MENU_PC : MENU_PHONE);

  function showScreen(which) {
    [splash, menuScreen, roomsScreen, roomScreen].forEach(s => s.classList.remove("active"));
    which.classList.add("active");
  }

  function clampNick(n) {
    n = (n || "").trim();
    if (!n) return "";
    n = n.replace(/\s+/g, " ");
    if (n.length > 16) n = n.slice(0, 16);
    return n;
  }

  function getNick() {
    return clampNick(localStorage.getItem(KEY_NICK) || "");
  }

  function setNick(nick) {
    nick = clampNick(nick);
    if (!nick) return false;
    localStorage.setItem(KEY_NICK, nick);
    return true;
  }

  function ensureNickOrAsk() {
    const current = getNick();
    if (current) return current;
    let n = prompt("Podaj nick (max 16 znaków):", "");
    if (!n) return "";
    n = clampNick(n);
    if (!n) return "";
    setNick(n);
    return n;
  }

  function readRooms() {
    try {
      const raw = localStorage.getItem(KEY_ROOMS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRooms(rooms) {
    localStorage.setItem(KEY_ROOMS, JSON.stringify(rooms));
  }

  function getActiveRoomCode() {
    return (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  }

  function setActiveRoomCode(code) {
    localStorage.setItem(KEY_ACTIVE_ROOM, code);
  }

  function genCode6() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function nowHHMM() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function log(msg) {
    debugCard.style.display = "block";
    debugLog.textContent = `[${nowHHMM()}] ${msg}\n` + debugLog.textContent;
  }

  function statusRooms(msg) {
    roomsStatus.textContent = msg;
  }

  function statusRoom(msg) {
    roomStatus.textContent = msg;
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function normalizeSlug(s) {
    // normalize: lowercase, remove diacritics, keep a-z0-9
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  // Map team name -> file base
  const TEAM_LOGO_MAP = {
    "legia": "legia",
    "lech": "lech",
    "rakow": "raków",          // file has Polish char
    "jagiellonia": "jagiellonia",
    "cracovia": "cracovia",
    "widzew": "widzew",
    "korona": "korona",
    "radomiak": "radomiak",
    "piast": "piast",
    "pogon": "pogon",          // .jpg
    "gornik": "gornik",
    "lechia": "lechia",
    "motor": "motor",
    "zaglebie": "lubin",       // Zagłębie Lubin -> lubin.png
    "katowice": "katowice",    // GKS Katowice
    "plock": "płock",          // Wisła Płock -> płock.png
    "arka": "arka",
    "brukbet": "brukbet",
  };

  function logoCandidates(teamName) {
    const n = normalizeSlug(teamName);

    // special cases by keyword
    const candidates = [];

    if (n.includes("rakow")) candidates.push("raków");
    if (n.includes("plock")) candidates.push("płock");
    if (n.includes("zaglebie") || n.includes("lubin")) candidates.push("lubin");
    if (n.includes("katowice") || n.includes("gks")) candidates.push("katowice");

    // direct map by first token / full
    const first = n;
    if (TEAM_LOGO_MAP[first]) candidates.push(TEAM_LOGO_MAP[first]);

    // try last word (city/club)
    const parts = (teamName || "").toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const last = normalizeSlug(parts[parts.length - 1]);
      if (TEAM_LOGO_MAP[last]) candidates.push(TEAM_LOGO_MAP[last]);
      candidates.push(parts[parts.length - 1]);
    }

    // fallback: full normalized (rare)
    candidates.push(n);

    // de-dup keep order
    return [...new Set(candidates.filter(Boolean))];
  }

  function buildLogoUrl(base) {
    return `${LOGO_DIR}/${base}`;
  }

  function makeLogoImg(teamName) {
    const img = document.createElement("img");
    img.className = "logo";
    img.alt = teamName;

    const tries = [];
    for (const base of logoCandidates(teamName)) {
      // prefer png, but allow jpg
      tries.push(buildLogoUrl(`${base}.png`));
      tries.push(buildLogoUrl(`${base}.jpg`));
      tries.push(buildLogoUrl(`${base}.jpeg`));
    }

    let idx = 0;
    const setNext = () => {
      if (idx >= tries.length) {
        img.style.visibility = "hidden";
        return;
      }
      img.src = tries[idx++];
    };
    img.onerror = () => setNext();
    setNext();
    return img;
  }

  // Ekstraklasa-ish list (test) – we only use teams you likely have logos for.
  const EKSTRA_TEAMS = [
    "Legia",
    "Lech",
    "Raków",
    "Jagiellonia",
    "Cracovia",
    "Widzew",
    "Korona",
    "Radomiak",
    "Piast",
    "Pogoń",
    "Górnik",
    "Lechia",
    "Motor",
    "Zagłębie Lubin",
    "GKS Katowice",
    "Wisła Płock",
    "Arka",
    "Bruk-Bet",
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function genRound10() {
    // pick 20 unique teams if possible
    const pool = shuffle(EKSTRA_TEAMS);
    const pairs = [];
    for (let i = 0; i + 1 < pool.length && pairs.length < 10; i += 2) {
      pairs.push([pool[i], pool[i + 1]]);
    }

    // time: next day 18:00 + index*15min
    const base = new Date();
    base.setMinutes(0, 0, 0);
    base.setHours(18);
    base.setDate(base.getDate() + 1);

    return pairs.map((p, idx) => {
      const d = new Date(base.getTime() + idx * 15 * 60 * 1000);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return {
        id: `m_${Date.now()}_${idx}`,
        league: "Ekstraklasa",
        home: p[0],
        away: p[1],
        time: `${dd}.${mm} ${hh}:${mi}`,
        tips: {},
      };
    });
  }

  // ---------- rendering ----------

  function renderNick() {
    const n = getNick();
    const t = n ? `Nick: ${n}` : "Nick: —";
    nickChip.textContent = t;
    nickChipRooms.textContent = t;
    nickChipRoom.textContent = t;
  }

  function refreshMenuImage() {
    const src = pickMenuSrc();
    // menu panel
    menuImg.src = src;
    // background blur (soft)
    bgImage.style.backgroundImage = `url('${src}')`;
  }

  function renderRoomsDebugInfo(rooms) {
    buildLabel.textContent = String(BUILD);
    statusRooms(`Pokoje: ${rooms.length}`);
  }

  function findRoomByCode(rooms, code) {
    return rooms.find(r => (r.code || "").toUpperCase() === code.toUpperCase()) || null;
  }

  function ensurePlayer(room, nick) {
    room.players = Array.isArray(room.players) ? room.players : [];
    if (!room.players.includes(nick)) room.players.push(nick);
  }

  function renderPlayers(room) {
    playersList.innerHTML = "";
    const list = Array.isArray(room.players) ? room.players : [];

    list.forEach(p => {
      const row = document.createElement("div");
      row.className = "pill";
      const left = document.createElement("div");
      left.textContent = "Gracz:";
      left.style.opacity = ".85";
      const right = document.createElement("div");
      right.textContent = p;
      row.append(left, right);
      playersList.appendChild(row);
    });

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Brak graczy";
      playersList.appendChild(empty);
    }
  }

  function renderMatches(room) {
    matchesList.innerHTML = "";
    const matches = Array.isArray(room.matches) ? room.matches : [];
    const nick = getNick();

    if (matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "Brak spotkań. Admin może dodać kolejkę testową.";
      matchesList.appendChild(empty);
      return;
    }

    // show up to 10 (as requested)
    matches.slice(0, 10).forEach((m) => {
      const wrap = document.createElement("div");
      wrap.className = "matchRow";

      const home = document.createElement("div");
      home.className = "team";
      home.appendChild(makeLogoImg(m.home));
      const homeName = document.createElement("div");
      homeName.className = "teamName";
      homeName.textContent = m.home;
      home.appendChild(homeName);

      const tip = document.createElement("div");
      tip.className = "tipBox";
      const inH = document.createElement("input");
      inH.className = "scoreInput";
      inH.type = "number";
      inH.min = "0";
      inH.max = "20";
      inH.inputMode = "numeric";

      const colon = document.createElement("div");
      colon.className = "colon";
      colon.textContent = ":";

      const inA = document.createElement("input");
      inA.className = "scoreInput";
      inA.type = "number";
      inA.min = "0";
      inA.max = "20";
      inA.inputMode = "numeric";

      const saveBtn = document.createElement("button");
      saveBtn.className = "miniBtn";
      saveBtn.textContent = "Zapisz";

      // preload existing tip
      const t = (m.tips && nick && m.tips[nick]) ? m.tips[nick] : null;
      if (t) {
        inH.value = String(t.h);
        inA.value = String(t.a);
      }

      saveBtn.addEventListener("click", () => {
        const h = Number(inH.value);
        const a = Number(inA.value);
        if (!Number.isFinite(h) || !Number.isFinite(a) || h < 0 || a < 0) {
          statusRoom("Podaj poprawny typ");
          return;
        }
        saveTip(room.code, m.id, nick, h, a);
      });

      tip.append(inH, colon, inA, saveBtn);

      const away = document.createElement("div");
      away.className = "team";
      // away: name then logo right (looks nicer in tight grid)
      const awayName = document.createElement("div");
      awayName.className = "teamName";
      awayName.textContent = m.away;
      away.appendChild(awayName);
      away.appendChild(makeLogoImg(m.away));
      away.style.justifyContent = "flex-end";

      const tipInfo = document.createElement("div");
      tipInfo.className = "muted";
      tipInfo.style.fontSize = "12px";
      tipInfo.style.gridColumn = "1 / -1";
      const myTip = (m.tips && nick && m.tips[nick]) ? `${m.tips[nick].h}:${m.tips[nick].a}` : "—";
      tipInfo.textContent = `${m.league || ""}${m.time ? ` • ${m.time}` : ""} • Twój typ: ${myTip}`;

      wrap.append(home, tip, away);
      wrap.appendChild(tipInfo);

      matchesList.appendChild(wrap);
    });

    if (matches.length > 10) {
      const more = document.createElement("div");
      more.className = "muted";
      more.style.fontSize = "12px";
      more.textContent = `Pokazuję 10 z ${matches.length} spotkań (na razie).`;
      matchesList.appendChild(more);
    }
  }

  // ---------- actions ----------

  function openMenu() {
    renderNick();
    refreshMenuImage();
    showScreen(menuScreen);
    statusRooms("");
  }

  function openRooms() {
    const nick = ensureNickOrAsk();
    if (!nick) {
      alert("Bez nicku nie wejdziesz do ligi.");
      return;
    }
    renderNick();
    refreshMenuImage();

    const rooms = readRooms();
    renderRoomsDebugInfo(rooms);

    showScreen(roomsScreen);
  }

  function openRoom(code) {
    const nick = ensureNickOrAsk();
    if (!nick) return;

    const rooms = readRooms();
    const room = findRoomByCode(rooms, code);
    if (!room) {
      statusRooms("Nie znaleziono pokoju");
      return;
    }

    ensurePlayer(room, nick);
    room.matches = Array.isArray(room.matches) ? room.matches : [];
    saveRooms(rooms);

    setActiveRoomCode(room.code);

    // render
    roomTitle.textContent = room.name || "(bez nazwy)";
    roomAdmin.textContent = `Admin: ${room.admin || "—"}`;
    roomCodeInput.value = room.code;

    // admin-only addRound
    addRoundBtn.style.display = (room.admin === nick) ? "inline-flex" : "none";

    renderPlayers(room);
    renderMatches(room);

    renderNick();
    refreshMenuImage();
    showScreen(roomScreen);
    statusRoom(`W pokoju: ${room.code}`);
  }

  function createRoom() {
    const nick = ensureNickOrAsk();
    if (!nick) return;

    const name = (roomNameInput.value || "").trim();
    if (!name) {
      statusRooms("Podaj nazwę pokoju");
      return;
    }

    const rooms = readRooms();

    // generate unique code
    let code = genCode6();
    let guard = 0;
    while (findRoomByCode(rooms, code) && guard++ < 50) code = genCode6();

    const room = {
      code,
      name: name.toUpperCase(),
      admin: nick,
      players: [nick],
      matches: [],
    };

    rooms.unshift(room);
    saveRooms(rooms);

    log(`createRoom ok: ${code} (${name}) admin=${nick}`);
    statusRooms(`Utworzono pokój ${code}`);

    openRoom(code);
  }

  function joinRoom() {
    const nick = ensureNickOrAsk();
    if (!nick) return;

    const code = (joinCodeInput.value || "").trim().toUpperCase();
    if (code.length !== 6) {
      statusRooms("Kod musi mieć 6 znaków");
      return;
    }

    const rooms = readRooms();
    const room = findRoomByCode(rooms, code);
    if (!room) {
      statusRooms("Nie ma takiego pokoju (lokalnie)");
      return;
    }

    ensurePlayer(room, nick);
    saveRooms(rooms);

    log(`joinRoom ok: ${code} gracz=${nick}`);
    statusRooms(`Dołączono do ${code}`);

    openRoom(code);
  }

  function leaveRoom() {
    const nick = getNick();
    const code = getActiveRoomCode();
    if (!code) {
      openRooms();
      return;
    }

    const rooms = readRooms();
    const room = findRoomByCode(rooms, code);
    if (room && Array.isArray(room.players)) {
      room.players = room.players.filter(p => p !== nick);
      saveRooms(rooms);
    }

    setActiveRoomCode("");
    statusRoom("Opuszczono pokój");
    openRooms();
  }

  function refreshRoom() {
    const code = getActiveRoomCode();
    if (!code) {
      openRooms();
      return;
    }
    openRoom(code);
  }

  function copyCode() {
    const code = (roomCodeInput.value || "").trim();
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      statusRoom("Skopiowano kod");
    }).catch(() => {
      // fallback
      try {
        roomCodeInput.focus();
        roomCodeInput.select();
        document.execCommand("copy");
        statusRoom("Skopiowano kod");
      } catch {
        statusRoom("Nie udało się skopiować");
      }
    });
  }

  function saveTip(roomCode, matchId, nick, h, a) {
    const rooms = readRooms();
    const room = findRoomByCode(rooms, roomCode);
    if (!room) {
      statusRoom("Brak pokoju");
      return;
    }
    const m = (room.matches || []).find(x => x.id === matchId);
    if (!m) {
      statusRoom("Brak meczu");
      return;
    }
    m.tips = m.tips || {};
    m.tips[nick] = { h, a, ts: Date.now() };
    saveRooms(rooms);

    statusRoom(`Zapisano typ ${h}:${a}`);
    renderMatches(room);
  }


  function saveAllTips() {
    const nick = getNick();
    const code = getActiveRoomCode();
    if (!code) return;

    const rooms = readRooms();
    const room = findRoomByCode(rooms, code);
    if (!room) return;

    room.matches = Array.isArray(room.matches) ? room.matches : [];

    // Walidacja: nie zapisujemy "połówek" (np. tylko gospodarze)
    for (const m of room.matches) {
      const t = state.tips && state.tips[m.id];
      if (!t) continue;
      const hasH = t.h !== null && t.h !== "" && !Number.isNaN(Number(t.h));
      const hasA = t.a !== null && t.a !== "" && !Number.isNaN(Number(t.a));
      if (hasH !== hasA) {
        statusRoom(`Uzupełnij wynik: ${m.home} vs ${m.away}`);
        return;
      }
    }

    const ts = Date.now();
    let savedCount = 0;

    for (const m of room.matches) {
      const t = state.tips && state.tips[m.id];
      if (!t) continue;
      const h = Number(t.h);
      const a = Number(t.a);
      if (Number.isNaN(h) || Number.isNaN(a)) continue;

      m.tips = m.tips || {};
      m.tips[nick] = { h, a, ts };
      savedCount++;
    }

    saveRooms(rooms);
    statusRoom(savedCount ? "Zapisano typy" : "Brak typów do zapisu");
    renderMatches(room);
  }

  function addRoundTest() {
    const nick = getNick();
    const code = getActiveRoomCode();
    if (!code) return;

    const rooms = readRooms();
    const room = findRoomByCode(rooms, code);
    if (!room) return;

    if (room.admin !== nick) {
      statusRoom("Tylko admin może dodać kolejkę");
      return;
    }

    room.matches = Array.isArray(room.matches) ? room.matches : [];

    // add 10 matches (append)
    const round = genRound10();
    room.matches = round.concat(room.matches);

    saveRooms(rooms);
    statusRoom("Dodano kolejkę (test)");
    renderMatches(room);
  }

  // ---------- navigation ----------

  function showSplashThenMenu() {
    showScreen(splash);
    renderNick();
    refreshMenuImage();
    splashHint.textContent = `Ekran startowy (${Math.round(SPLASH_MS / 1000)}s)…`;

    // after SPLASH_MS go to correct screen
    setTimeout(() => {
      const code = getActiveRoomCode();
      if (code) {
        openRoom(code);
      } else {
        openMenu();
      }
    }, SPLASH_MS);
  }

  // ---------- events ----------

  window.addEventListener("resize", refreshMenuImage);

  changeNickBtn.addEventListener("click", () => {
    const n = prompt("Nowy nick:", getNick() || "");
    if (!n) return;
    if (setNick(n)) {
      renderNick();
      statusRoom("Zmieniono nick");
      statusRooms("Zmieniono nick");
    }
  });

  changeNickBtn2.addEventListener("click", () => changeNickBtn.click());

  btnLiga.addEventListener("click", () => {
    openRooms();
  });

  btnStats.addEventListener("click", () => {
    alert("Statystyki – zrobimy w następnym kroku.");
  });

  btnExit.addEventListener("click", () => {
    alert("Wyjście: w aplikacji Android dodamy finish().");
  });

  backToMenu1.addEventListener("click", () => openMenu());
  backToRooms.addEventListener("click", () => openRooms());

  createRoomBtn.addEventListener("click", () => {
    try {
      createRoom();
    } catch (e) {
      log(`createRoom exception: ${e?.message || e}`);
      statusRooms("Błąd tworzenia pokoju");
    }
  });

  joinRoomBtn.addEventListener("click", () => {
    try {
      joinRoom();
    } catch (e) {
      log(`joinRoom exception: ${e?.message || e}`);
      statusRooms("Błąd dołączania");
    }
  });

  joinCodeInput.addEventListener("input", () => {
    joinCodeInput.value = joinCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  });

  copyCodeBtn.addEventListener("click", copyCode);
  leaveRoomBtn.addEventListener("click", leaveRoom);
  refreshRoomBtn.addEventListener("click", refreshRoom);

  addRoundBtn.addEventListener("click", addRoundTest);
  saveAllTipsBtn.addEventListener("click", saveAllTips);

  // Web app install prompt (optional)
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---------- boot ----------

  buildLabel.textContent = String(BUILD);
  refreshMenuImage();
  renderNick();
  showSplashThenMenu();

})();
