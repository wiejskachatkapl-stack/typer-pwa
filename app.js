(() => {
  const BUILD = 1006;

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";
  const KEY_ACTIVE_ROOM = "typer_active_room_v1";
  const KEY_FIXTURES = "typer_fixtures_v1";

  const SPLASH_MS = 7000;

  const MENU_PHONE = "img_menu.png";
  const MENU_PC = "img_menu_pc.png";

  // TEST: TheSportsDB Ekstraklasa
  // Jeśli API nie odpowie / CORS / blokada, pokażemy błąd w UI.
  const TSD_API_KEY = "1";
  const TSD_EKSTRAKLASA_LEAGUE_ID = "4422";

  const el = (id) => document.getElementById(id);

  // screens
  const splash = el("splash");
  const splashHint = el("splashHint");
  const menuScreen = el("menuScreen");
  const roomsScreen = el("roomsScreen");
  const roomScreen = el("roomScreen");
  const fixturesScreen = el("fixturesScreen");

  // backgrounds
  const menuImg = el("menuImg");
  const roomsBg = el("roomsBg");
  const roomBg = el("roomBg");
  const fixturesBg = el("fixturesBg");

  // nick
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
  const btnFixtures = el("btnFixtures");
  const roomDebug = el("roomDebug");

  // fixtures ui
  const backToRoomBtn = el("backToRoomBtn");
  const btnRefresh4 = el("btnRefresh4");
  const fixturesRoomLabel = el("fixturesRoomLabel");
  const fixturesTitle = el("fixturesTitle");
  const fixturesList = el("fixturesList");
  const fixturesInfo = el("fixturesInfo");
  const btnLoadFixtures = el("btnLoadFixtures");
  const btnClearFixtures = el("btnClearFixtures");

  // modals
  const createRoomMask = el("createRoomMask");
  const createRoomNameInput = el("createRoomNameInput");
  const createRoomOkBtn = el("createRoomOkBtn");
  const createRoomCancelBtn = el("createRoomCancelBtn");

  const joinRoomMask = el("joinRoomMask");
  const joinRoomCodeInput = el("joinRoomCodeInput");
  const joinRoomOkBtn = el("joinRoomOkBtn");
  const joinRoomCancelBtn = el("joinRoomCancelBtn");

  // ============ helpers ============
  const escapeHtml = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function isLandscapeOrWide() {
    return window.matchMedia("(orientation: landscape)").matches || window.innerWidth >= 900;
  }
  function pickMenuSrc() {
    return isLandscapeOrWide() ? MENU_PC : MENU_PHONE;
  }

  function setBgImages() {
    const src = pickMenuSrc();
    const full = `${src}?b=${BUILD}&t=${Date.now()}`;

    const setWithFallback = (imgEl) => {
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = `${MENU_PHONE}?b=${BUILD}&t=${Date.now()}`;
      };
      imgEl.src = full;
    };

    setWithFallback(menuImg);
    setWithFallback(roomsBg);
    setWithFallback(roomBg);
    setWithFallback(fixturesBg);
  }

  function getNick() {
    try {
      const v = localStorage.getItem(KEY_NICK);
      return (v && v.trim()) ? v.trim() : "";
    } catch { return ""; }
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
    if (!trimmed) { alert("Nick nie może być pusty."); return null; }
    setNick(trimmed);
    return trimmed;
  }

  function loadRooms() {
    try {
      const raw = localStorage.getItem(KEY_ROOMS);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    } catch { return {}; }
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
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let tries = 0; tries < 200; tries++) {
      let out = "";
      for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
      if (!existingRooms[out]) return out;
    }
    return String(Date.now()).slice(-6).toUpperCase();
  }

  function addPlayerIfMissing(room, nick) {
    if (!room.players) room.players = [];
    if (!room.players.includes(nick)) room.players.push(nick);
  }

  // Fixtures store
  function loadFixturesStore() {
    try {
      const raw = localStorage.getItem(KEY_FIXTURES);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    } catch { return {}; }
  }
  function saveFixturesStore(store) {
    try { localStorage.setItem(KEY_FIXTURES, JSON.stringify(store)); } catch {}
  }

  function isoWeekId(d = new Date()) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  function loadFixturesForRoomWeek(roomCode, weekId) {
    const store = loadFixturesStore();
    const roomObj = store[roomCode] || {};
    return Array.isArray(roomObj[weekId]) ? roomObj[weekId] : null;
  }

  function saveFixturesForRoomWeek(roomCode, weekId, list) {
    const store = loadFixturesStore();
    if (!store[roomCode]) store[roomCode] = {};
    store[roomCode][weekId] = list;
    saveFixturesStore(store);
  }

  function clearFixturesForRoomWeek(roomCode, weekId) {
    const store = loadFixturesStore();
    if (!store[roomCode]) return;
    delete store[roomCode][weekId];
    saveFixturesStore(store);
  }

  // Screens
  function showScreen(name) {
    [menuScreen, roomsScreen, roomScreen, fixturesScreen].forEach(s => s.classList.add("hidden"));
    if (name === "menu") menuScreen.classList.remove("hidden");
    if (name === "rooms") roomsScreen.classList.remove("hidden");
    if (name === "room") roomScreen.classList.remove("hidden");
    if (name === "fixtures") fixturesScreen.classList.remove("hidden");
  }

  // Splash
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

  // Modals
  function openCreateRoomModal() {
    createRoomNameInput.value = "";
    createRoomMask.style.display = "flex";
    setTimeout(() => createRoomNameInput.focus(), 50);
  }
  function closeCreateRoomModal() { createRoomMask.style.display = "none"; }

  function openJoinRoomModal() {
    joinRoomCodeInput.value = "";
    joinRoomMask.style.display = "flex";
    setTimeout(() => joinRoomCodeInput.focus(), 50);
  }
  function closeJoinRoomModal() { joinRoomMask.style.display = "none"; }

  // Render room
  function renderRoom(code) {
    const rooms = loadRooms();
    const room = rooms[code];
    if (!room) { alert("Ten pokój nie istnieje na tym urządzeniu."); showScreen("rooms"); return; }

    roomNameEl.textContent = room.name || "—";
    roomAdminEl.textContent = `Admin: ${room.admin || "—"}`;
    roomCodeEl.textContent = code;

    playersListEl.innerHTML = "";
    const players = Array.isArray(room.players) ? room.players : [];
    players.forEach(p => {
      const row = document.createElement("div");
      row.className = "playerRow";
      row.innerHTML = `<div class="playerLabel">Gracz:</div><div class="playerName">${escapeHtml(p)}</div>`;
      playersListEl.appendChild(row);
    });

    // debug: żeby było widać, że wersja żyje
    roomDebug.textContent = `DEBUG: BUILD ${BUILD} • URL: ${location.href.split("?")[0]} • ${new Date().toLocaleString()}`;

    showScreen("room");
  }

  // Create / Join / Leave
  function doCreateRoom() {
    const nick = getNick();
    const name = normalizeRoomName(createRoomNameInput.value);
    if (!name) { alert("Podaj nazwę pokoju."); return; }

    const rooms = loadRooms();
    const code = genRoomCode6(rooms);
    const room = { code, name, admin: nick, players: [] };
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
    if (code.length !== 6) { alert("Kod musi mieć dokładnie 6 znaków."); return; }

    const rooms = loadRooms();
    const room = rooms[code];
    if (!room) { alert("Nie znaleziono pokoju o takim kodzie (lokalnie)."); return; }

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
    if (!code) { showScreen("rooms"); return; }

    const rooms = loadRooms();
    const room = rooms[code];
    const nick = getNick();

    if (room && Array.isArray(room.players)) {
      room.players = room.players.filter(p => p !== nick);
      rooms[code] = room;
      saveRooms(rooms);
    }
    setActiveRoomCode("");
    showScreen("rooms");
  }

  // Fixtures (TEST)
  function fmtDateTimeLocal(dateObj) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth()+1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
  }

  function toDateFromTSD(ev) {
    const d = (ev?.dateEvent || "").trim();
    if (!d) return null;
    const t = (ev?.strTime || "").trim();
    if (t) {
      const dt = new Date(`${d}T${t}`);
      if (!isNaN(dt.getTime())) return dt;
    }
    const dt2 = new Date(`${d}T00:00:00`);
    if (!isNaN(dt2.getTime())) return dt2;
    return null;
  }

  async function fetchEkstraklasaNextEvents() {
    const url = `https://www.thesportsdb.com/api/v1/json/${TSD_API_KEY}/eventsnextleague.php?id=${TSD_EKSTRAKLASA_LEAGUE_ID}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const events = Array.isArray(data?.events) ? data.events : [];
    return events;
  }

  function filterNext7Days(events) {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events
      .map(ev => {
        const dt = toDateFromTSD(ev);
        if (!dt) return null;
        return {
          id: ev.idEvent || `${ev.strEvent || ""}-${dt.getTime()}`,
          dt: dt.getTime(),
          dateText: fmtDateTimeLocal(dt),
          home: ev.strHomeTeam || "",
          away: ev.strAwayTeam || ""
        };
      })
      .filter(Boolean)
      .filter(x => x.dt >= now.getTime() && x.dt <= end.getTime())
      .sort((a, b) => a.dt - b.dt);
  }

  function renderFixturesList(items) {
    fixturesList.innerHTML = "";
    if (!items || items.length === 0) {
      const div = document.createElement("div");
      div.className = "hintSmall";
      div.textContent = "Brak meczów w najbliższych 7 dniach lub API nic nie zwróciło.";
      fixturesList.appendChild(div);
      return;
    }

    items.forEach(x => {
      const row = document.createElement("div");
      row.className = "fixtureRow";
      row.innerHTML = `
        <div class="fxTop">
          <div>${escapeHtml(x.dateText)}</div>
          <div>Ekstraklasa</div>
        </div>
        <div class="fxTeams">
          <span>${escapeHtml(x.home)}</span>
          <span class="fxVs">vs</span>
          <span>${escapeHtml(x.away)}</span>
        </div>
      `;
      fixturesList.appendChild(row);
    });
  }

  async function openFixturesScreen(forceRefresh = false) {
    const roomCode = getActiveRoomCode();
    if (!roomCode) { alert("Brak aktywnego pokoju."); return; }

    const rooms = loadRooms();
    const room = rooms[roomCode];
    fixturesRoomLabel.textContent = room ? (room.name || roomCode) : roomCode;

    const weekId = isoWeekId(new Date());
    fixturesTitle.textContent = `Ekstraklasa — najbliższe 7 dni (${weekId})`;

    showScreen("fixtures");

    const cached = !forceRefresh ? loadFixturesForRoomWeek(roomCode, weekId) : null;
    if (cached) {
      fixturesInfo.textContent = "Wczytano kolejkę z pamięci lokalnej (ten tydzień).";
      renderFixturesList(cached);
      return;
    }

    fixturesInfo.textContent = "Pobieram mecze z API…";
    renderFixturesList([]);

    try {
      const events = await fetchEkstraklasaNextEvents();
      const list = filterNext7Days(events);
      saveFixturesForRoomWeek(roomCode, weekId, list);
      fixturesInfo.textContent = `OK: pobrano ${list.length} meczów i zapisano lokalnie.`;
      renderFixturesList(list);
    } catch (e) {
      fixturesInfo.textContent = "BŁĄD pobierania z API (zobacz szczegóły poniżej).";
      const div = document.createElement("div");
      div.className = "hintSmall";
      div.textContent = `Szczegóły: ${String(e?.message || e)}`;
      fixturesList.appendChild(div);
    }
  }

  // Cache fix
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

  // ========= events =========
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

  backToMenuBtn.addEventListener("click", () => showScreen("menu"));
  btnNewRoom.addEventListener("click", () => {
    if (!getNick()) { const res = askNick(false); if (!res) return; }
    openCreateRoomModal();
  });
  btnJoinRoom.addEventListener("click", () => {
    if (!getNick()) { const res = askNick(false); if (!res) return; }
    openJoinRoomModal();
  });
  btnRefresh2.addEventListener("click", hardRefreshFix);

  backToRoomsBtn.addEventListener("click", () => showScreen("rooms"));
  btnRefresh3.addEventListener("click", hardRefreshFix);

  btnCopyCode.addEventListener("click", async () => {
    const code = getActiveRoomCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      alert("Skopiowano kod pokoju.");
    } catch {
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

  btnFixtures.addEventListener("click", () => openFixturesScreen(false));

  backToRoomBtn.addEventListener("click", () => showScreen("room"));
  btnRefresh4.addEventListener("click", hardRefreshFix);

  btnLoadFixtures.addEventListener("click", () => openFixturesScreen(true));
  btnClearFixtures.addEventListener("click", () => {
    const roomCode = getActiveRoomCode();
    if (!roomCode) return;
    const weekId = isoWeekId(new Date());
    if (confirm("Wyczyścić kolejkę tygodnia dla tego pokoju?")) {
      clearFixturesForRoomWeek(roomCode, weekId);
      fixturesInfo.textContent = "Wyczyszczono lokalną kolejkę.";
      renderFixturesList([]);
    }
  });

  createRoomCancelBtn.addEventListener("click", closeCreateRoomModal);
  createRoomOkBtn.addEventListener("click", doCreateRoom);
  createRoomNameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doCreateRoom(); });

  joinRoomCancelBtn.addEventListener("click", closeJoinRoomModal);
  joinRoomOkBtn.addEventListener("click", doJoinRoom);
  joinRoomCodeInput.addEventListener("input", () => { joinRoomCodeInput.value = normalizeCode(joinRoomCodeInput.value).slice(0, 6); });
  joinRoomCodeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doJoinRoom(); });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setBgImages, 140);
  });

  // ========= init =========
  console.log("Typer BUILD", BUILD);
  renderNick();
  setBgImages();
  showScreen("menu");
  startSplash();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
