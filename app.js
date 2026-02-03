(() => {
  /**
   * BUILD – podbijaj przy zmianach.
   * Musi się zgadzać z index.html (app.js?v=....).
   */
  const BUILD = 1015;

  const KEY_NICK = "typer_nick_v1";
  const KEY_ROOMS = "typer_rooms_v1";
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
  const statusText = el("statusText");

  // rooms buttons / inputs
  const changeNickBtn2 = el("changeNickBtn2");
  const backToMenuBtn = el("backToMenuBtn");
  const newRoomName = el("newRoomName");
  const createRoomBtn = el("createRoomBtn");
  const joinRoomCode = el("joinRoomCode");
  const joinRoomBtn = el("joinRoomBtn");
  const debugBox = el("debugBox");
  const roomsStatusText = el("roomsStatusText");

  // room
  const roomBackBtn = el("roomBackBtn");
  const playersList = el("playersList");
  const roomNameText = el("roomNameText");
  const roomAdminText = el("roomAdminText");
  const roomCodeText = el("roomCodeText");
  const copyCodeBtn = el("copyCodeBtn");
  const leaveRoomBtn = el("leaveRoomBtn");
  const repairBtn = el("repairBtn");
  const roomStatusHint = el("roomStatusHint");
  const roomStatusText = el("roomStatusText");

  // matches UI
  const addMatchBtn = el("addMatchBtn");
  const addRoundBtn = el("addRoundBtn");
  const matchesList = el("matchesList");

  // ----------------------------
  // helpers
  // ----------------------------
  const isLandscape = () => window.matchMedia("(orientation: landscape)").matches;
  const pickMenuSrc = () => (isLandscape() ? MENU_PC : MENU_PHONE);

  function setBgImages() {
    const src = pickMenuSrc();
    const bust = `?b=${BUILD}`;
    if (menuImg) menuImg.src = src + bust;
    if (roomsBg) roomsBg.src = src + bust;
    if (roomBg) roomBg.src = src + bust;
  }

  function showScreen(name) {
    menuScreen.classList.toggle("active", name === "menu");
    roomsScreen.classList.toggle("active", name === "rooms");
    roomScreen.classList.toggle("active", name === "room");
  }

  function logDebug(msg) {
    if (!debugBox) return;
    const now = new Date().toLocaleTimeString();
    debugBox.textContent = `[${now}] ${msg}\n` + debugBox.textContent;
  }

  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function normalizeCode(s) {
    return String(s || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function makeCode6() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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

  // MIGRACJA rooms → zawsze tablica
  function loadRooms() {
    let raw = localStorage.getItem(KEY_ROOMS);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) return parsed;

      if (parsed && typeof parsed === "object" && parsed.code) {
        return [parsed];
      }

      if (parsed && typeof parsed === "object") {
        return Object.values(parsed).filter(x => x && typeof x === "object" && x.code);
      }

      return [];
    } catch {
      return [];
    }
  }

  function saveRooms(rooms) {
    if (!Array.isArray(rooms)) rooms = [];
    localStorage.setItem(KEY_ROOMS, JSON.stringify(rooms));
  }

  function setActiveRoom(code) {
    localStorage.setItem(KEY_ACTIVE_ROOM, code);
  }

  function getActiveRoomCode() {
    return localStorage.getItem(KEY_ACTIVE_ROOM) || "";
  }

  function getRoomByCode(code) {
    const rooms = loadRooms();
    return rooms.find(r => r && r.code === code) || null;
  }

  function updateNickUI() {
    const nick = loadNick();
    const shown = nick ? nick : "—";
    if (nickText) nickText.textContent = `Nick: ${shown}`;
    if (nickTextRooms) nickTextRooms.textContent = `Nick: ${shown}`;
    if (nickTextRoom) nickTextRoom.textContent = `Nick: ${shown}`;
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

      // przenieś tipy
      if (Array.isArray(r.matches)) {
        for (const m of r.matches) {
          if (m && m.tips && typeof m.tips === "object") {
            if (m.tips[oldNick] && !m.tips[newNick]) {
              m.tips[newNick] = m.tips[oldNick];
              delete m.tips[oldNick];
              changed = true;
            }
          }
        }
      }
    }
    if (changed) saveRooms(rooms);
  }

  function promptNick(force = false) {
    let nick = loadNick();
    if (!nick || force) {
      const input = prompt("Podaj nick / imię:", nick || "");
      if (input === null) return "";
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

  // ----------------------------
  // TEAM LOGO (badge) helpers
  // ----------------------------
  function hashString32(str){
    let h = 2166136261;
    for (let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function teamAbbr(name){
    const s = String(name || "").trim();
    if (!s) return "??";
    const words = s.split(/\s+/).filter(Boolean);

    // np. "ŁKS" zostawiamy
    if (words.length === 1 && words[0].length <= 4) {
      return words[0].toUpperCase();
    }

    // bierzemy pierwsze litery pierwszych 2 wyrazów
    const a = (words[0]?.[0] || "?").toUpperCase();
    const b = (words[1]?.[0] || (words[0]?.[1] || "?")).toUpperCase();
    return (a + b).replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9]/g, "").slice(0,2) || "??";
  }

  function teamColorHsl(name){
    const h = hashString32(name) % 360;
    // ciemny, ale żywy (pod badge)
    return `hsl(${h} 55% 42% / 0.85)`;
  }

  // ----------------------------
  // LEAGUE TEST: Ekstraklasa (static list – test)
  // ----------------------------
  const EKSTRA_TEAMS_TEST = [
    "Legia Warszawa",
    "Lech Poznań",
    "Raków",
    "Pogoń Szczecin",
    "Jagiellonia",
    "Śląsk Wrocław",
    "Górnik Zabrze",
    "Cracovia",
    "Widzew",
    "Radomiak",
    "Korona",
    "Piast",
    "Zagłębie Lubin",
    "Stal Mielec",
    "Puszcza",
    "Ruch Chorzów",
    "ŁKS",
    "Warta Poznań"
  ];

  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, seed){
    const a = arr.slice();
    const rnd = mulberry32(seed >>> 0);
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(rnd() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // circle method (round-robin) – wylicza pary dla konkretnej kolejki (1..n-1)
  function roundRobinPairs(teams, roundIndexZeroBased){
    let list = teams.slice();
    if (list.length % 2 === 1) list.push("BYE");
    const n = list.length;

    // wykonaj rotację roundIndexZeroBased razy
    for (let r=0; r<roundIndexZeroBased; r++){
      const fixed = list[0];
      const rest = list.slice(1);
      const last = rest.pop();
      rest.unshift(last);
      list = [fixed, ...rest];
    }

    const pairs = [];
    for (let i=0;i<n/2;i++){
      const a = list[i];
      const b = list[n-1-i];
      if (a === "BYE" || b === "BYE") continue;

      // przeplatanie gospodarza/gościa
      const swap = (roundIndexZeroBased % 2 === 1) && (i % 2 === 0);
      pairs.push(swap ? [b,a] : [a,b]);
    }
    return pairs;
  }

  function nextSaturdayBaseTs(){
    const now = new Date();
    const d = new Date(now);
    d.setHours(12, 0, 0, 0); // start 12:00

    // JS: 0=nd, 6=sob
    const day = d.getDay();
    let add = (6 - day + 7) % 7;
    if (add === 0 && now.getTime() > d.getTime()) add = 7; // jeśli już po 12:00 w sobotę → następna sobota
    d.setDate(d.getDate() + add);
    return d.getTime();
  }

  // ----------------------------
  // MATCHES – zapis w obiekcie pokoju
  // ----------------------------
  function ensureRoomMatches(room){
    if (!room.matches) room.matches = [];
    if (!Array.isArray(room.matches)) room.matches = [];
  }

  function ensureMatchTips(match){
    if (!match.tips) match.tips = {};
    if (typeof match.tips !== "object") match.tips = {};
  }

  function fmtKick(ts){
    if (!ts) return "—";
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2ীৱ,"0");
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function addMatchTest(){
    const code = getActiveRoomCode();
    const rooms = loadRooms();
    const room = rooms.find(r => r && r.code === code);
    if (!room) return;

    const home = prompt("Gospodarz (np. Radomiak):", "Radomiak");
    if (home === null) return;
    const away = prompt("Gość (np. Korona):", "Korona");
    if (away === null) return;

    const kick = Date.now() + 2*60*60*1000;

    ensureRoomMatches(room);
    const id = `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    room.matches.unshift({
      id,
      home: home.trim().replace(/\s+/g," "),
      away: away.trim().replace(/\s+/g," "),
      kick,
      tips: {},
      league: "Test",
      round: null
    });

    saveRooms(rooms);
    renderRoom(code);
    roomStatusText.textContent = "Dodano mecz (test)";
  }

  // AUTOMAT: dodaj całą kolejkę Ekstraklasy (test)
  function addRoundTest(){
    const code = getActiveRoomCode();
    const rooms = loadRooms();
    const room = rooms.find(r => r && r.code === code);
    if (!room) return;

    ensureRoomMatches(room);

    room.league = room.league || "Ekstraklasa (test)";

    const seed = hashString32(room.code || "room");
    room.teams = room.teams || seededShuffle(EKSTRA_TEAMS_TEST, seed);

    const teams = Array.isArray(room.teams) && room.teams.length >= 8 ? room.teams : seededShuffle(EKSTRA_TEAMS_TEST, seed);

    const nextRound = Number.isFinite(room.nextRound) ? room.nextRound : (room.nextRound = 1);

    const already = room.matches.some(m => m && m.league === "Ekstraklasa (test)" && m.round === nextRound);
    if (already){
      roomStatusText.textContent = `Kolejka ${nextRound} już istnieje`;
      logDebug(`addRound: kolejka ${nextRound} już była`);
      return;
    }

    const roundIndex0 = nextRound - 1;
    const pairs = roundRobinPairs(teams, roundIndex0);

    const base = nextSaturdayBaseTs() + roundIndex0 * 7 * 24 * 60 * 60 * 1000;

    let i = 0;
    for (const [home, away] of pairs){
      const id = `ek_${room.code}_${nextRound}_${i}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const kick = base + i * 2 * 60 * 60 * 1000;

      room.matches.push({
        id,
        home,
        away,
        kick,
        tips: {},
        league: "Ekstraklasa (test)",
        round: nextRound
      });
      i++;
    }

    room.nextRound = nextRound + 1;

    saveRooms(rooms);
    renderRoom(code);
    roomStatusText.textContent = `Dodano kolejkę ${nextRound} (${pairs.length} meczów)`;
    logDebug(`addRound ok: kolejka ${nextRound} mecze=${pairs.length}`);
  }

  function deleteMatch(matchId){
    const code = getActiveRoomCode();
    const rooms = loadRooms();
    const room = rooms.find(r => r && r.code === code);
    if (!room) return;

    ensureRoomMatches(room);
    room.matches = room.matches.filter(m => m && m.id !== matchId);

    saveRooms(rooms);
    renderRoom(code);
    roomStatusText.textContent = "Usunięto mecz";
  }

  function readScoreValue(v){
    const s = String(v ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (n < 0) return null;
    if (n > 99) return null;
    return Math.floor(n);
  }

  function saveTip(matchId, homeScoreRaw, awayScoreRaw){
    const nick = loadNick();
    if (!nick) {
      alert("Brak nicku. Podaj nick.");
      promptNick(true);
      return;
    }

    const h = readScoreValue(homeScoreRaw);
    const a = readScoreValue(awayScoreRaw);

    if (h === null || a === null) {
      alert("Wpisz poprawne liczby (0–99) dla obu drużyn.");
      return;
    }

    const code = getActiveRoomCode();
    const rooms = loadRooms();
    const room = rooms.find(r => r && r.code === code);
    if (!room) return;

    ensureRoomMatches(room);
    const match = room.matches.find(m => m && m.id === matchId);
    if (!match) return;

    ensureMatchTips(match);
    match.tips[nick] = { h, a, ts: Date.now() };

    saveRooms(rooms);
    renderRoom(code);
    roomStatusText.textContent = `Zapisano typ: ${h}:${a}`;
  }

  function renderMatches(room){
    if (!matchesList) return;
    matchesList.innerHTML = "";

    ensureRoomMatches(room);
    const nick = loadNick();

    const list = room.matches.slice().sort((a,b) => (a?.kick||0) - (b?.kick||0));

    if (list.length === 0){
      const div = document.createElement("div");
      div.className = "matchRow";
      div.innerHTML = `<div class="matchMain">
        <div class="matchMeta" style="font-weight:900;">Brak spotkań</div>
        <div class="matchMeta">Kliknij „Dodaj kolejkę (test)” albo „Dodaj mecz (test)”.</div>
      </div>`;
      matchesList.appendChild(div);
      return;
    }

    for (const m of list){
      ensureMatchTips(m);

      const tip = nick ? m.tips[nick] : null;
      const tipText = tip ? `Twój typ: ${tip.h}:${tip.a}` : "Twój typ: —";

      const leagueRound =
        (m.league && m.round)
          ? `${m.league} • Kolejka ${m.round}`
          : (m.league ? m.league : "—");

      const homeAb = teamAbbr(m.home);
      const awayAb = teamAbbr(m.away);

      const homeCol = teamColorHsl(m.home);
      const awayCol = teamColorHsl(m.away);

      const row = document.createElement("div");
      row.className = "matchRow";

      row.innerHTML = `
        <div class="matchMain">
          <div class="teamsLine">
            <div class="teamPill" title="${escapeHtml(m.home)}">
              <div class="logo" style="background:${homeCol};">${escapeHtml(homeAb)}</div>
              <div class="teamName">${escapeHtml(m.home)}</div>
            </div>

            <div class="vs">vs</div>

            <div class="teamPill" title="${escapeHtml(m.away)}">
              <div class="logo" style="background:${awayCol};">${escapeHtml(awayAb)}</div>
              <div class="teamName">${escapeHtml(m.away)}</div>
            </div>
          </div>

          <div class="matchMeta">${leagueRound} • ${fmtKick(m.kick)} • ID: ${escapeHtml(m.id).slice(0,10)}…</div>

          <div class="matchTipRow">
            <input class="scoreInput" inputmode="numeric" pattern="[0-9]*" maxlength="2"
                   data-h="${escapeHtml(m.id)}" placeholder="0" value="${tip ? tip.h : ""}">
            <span class="vs">:</span>
            <input class="scoreInput" inputmode="numeric" pattern="[0-9]*" maxlength="2"
                   data-a="${escapeHtml(m.id)}" placeholder="0" value="${tip ? tip.a : ""}">
            <button class="btn primary" data-save="${escapeHtml(m.id)}">Zapisz</button>
            <span class="tipSaved">${escapeHtml(tipText)}</span>
          </div>
        </div>

        <button class="btn" data-del="${escapeHtml(m.id)}">Usuń</button>
      `;

      matchesList.appendChild(row);
    }

    matchesList.querySelectorAll("input.scoreInput").forEach(inp => {
      inp.addEventListener("input", () => {
        inp.value = String(inp.value).replace(/[^0-9]/g, "").slice(0,2);
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const id = inp.getAttribute("data-h") || inp.getAttribute("data-a");
          if (!id) return;
          const hEl = matchesList.querySelector(`input[data-h="${CSS.escape(id)}"]`);
          const aEl = matchesList.querySelector(`input[data-a="${CSS.escape(id)}"]`);
          saveTip(id, hEl ? hEl.value : "", aEl ? aEl.value : "");
        }
      });
    });

    matchesList.querySelectorAll("button[data-save]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-save");
        const hEl = matchesList.querySelector(`input[data-h="${CSS.escape(id)}"]`);
        const aEl = matchesList.querySelector(`input[data-a="${CSS.escape(id)}"]`);
        saveTip(id, hEl ? hEl.value : "", aEl ? aEl.value : "");
      });
    });

    matchesList.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => deleteMatch(btn.getAttribute("data-del")));
    });
  }

  // ----------------------------
  // RENDER POKOJU
  // ----------------------------
  function renderRoom(code) {
    const room = getRoomByCode(code);

    if (!room) {
      roomStatusText.textContent = "Brak pokoju";
      roomStatusHint.textContent = "Nie znaleziono pokoju (lokalnie). Wróć i spróbuj ponownie.";
      if (playersList) playersList.innerHTML = "";
      if (roomNameText) roomNameText.textContent = "—";
      if (roomAdminText) roomAdminText.textContent = "Admin: —";
      if (roomCodeText) roomCodeText.textContent = "------";
      if (matchesList) matchesList.innerHTML = "";
      return;
    }

    roomNameText.textContent = room.name || "—";
    roomAdminText.textContent = `Admin: ${room.admin || "—"}`;
    roomCodeText.textContent = room.code || "------";
    roomStatusText.textContent = `W pokoju: ${room.code}`;

    const league = room.league || "—";
    const nextRound = Number.isFinite(room.nextRound) ? room.nextRound : 1;
    roomStatusHint.textContent =
      `Pokoje są lokalne (test). Liga: ${league}. Następna kolejka: ${nextRound}.`;

    // players (PRAWA strona)
    const players = Array.isArray(room.players) ? room.players : [];
    playersList.innerHTML = "";

    if (players.length === 0) {
      const div = document.createElement("div");
      div.className = "playerRow";
      div.innerHTML = `<span class="label">Gracz:</span><span class="name">—</span>`;
      playersList.appendChild(div);
    } else {
      for (const p of players) {
        const div = document.createElement("div");
        div.className = "playerRow";
        div.innerHTML = `<span class="label">Gracz:</span><span class="name">${escapeHtml(p)}</span>`;
        playersList.appendChild(div);
      }
    }

    // matches (LEWA strona)
    renderMatches(room);
  }

  function openRoom(code) {
    setActiveRoom(code);
    showScreen("room");
    renderRoom(code);
    logDebug(`openRoom: ${code}`);
  }

  // ----------------------------
  // actions
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

      const rooms = loadRooms();

      let code = makeCode6();
      let guard = 0;
      while (rooms.some(r => r && r.code === code) && guard < 60) {
        code = makeCode6();
        guard++;
      }

      const room = {
        code,
        name,
        admin: nick,
        players: [nick],
        matches: [],
        createdAt: Date.now(),
        league: "Ekstraklasa (test)",
        nextRound: 1
      };

      rooms.unshift(room);
      saveRooms(rooms);

      roomsStatusText.textContent = `Utworzono pokój ${code}`;
      logDebug(`createRoom ok: ${code} (${name}) admin=${nick}`);

      openRoom(code);
    } catch (e) {
      roomsStatusText.textContent = "Błąd tworzenia pokoju";
      logDebug(`createRoom exception: ${e && e.message ? e.message : String(e)}`);
      alert("Błąd tworzenia pokoju");
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
        roomsStatusText.textContent = "Nie znaleziono pokoju.";
        logDebug(`joinRoom: brak pokoju ${code}`);
        alert("Nie znaleziono pokoju o takim kodzie (na tym urządzeniu).");
        return;
      }

      if (!Array.isArray(room.players)) room.players = [];
      if (!room.players.includes(nick)) room.players.push(nick);
      ensureRoomMatches(room);

      room.league = room.league || "Ekstraklasa (test)";
      if (!Number.isFinite(room.nextRound)) room.nextRound = 1;

      saveRooms(rooms);

      roomsStatusText.textContent = `Dołączono do ${code}`;
      logDebug(`joinRoom ok: ${code} gracz=${nick}`);

      openRoom(code);
    } catch (e) {
      roomsStatusText.textContent = "Błąd dołączania";
      logDebug(`joinRoom exception: ${e && e.message ? e.message : String(e)}`);
      alert("Błąd dołączania do pokoju");
    }
  }

  function leaveRoom() {
    const code = getActiveRoomCode();
    if (!code) {
      showScreen("rooms");
      return;
    }

    const nick = loadNick();
    const rooms = loadRooms();
    const room = rooms.find(r => r && r.code === code);

    if (room && Array.isArray(room.players) && nick) {
      room.players = room.players.filter(p => p !== nick);

      if (room.admin === nick && room.players.length > 0) {
        room.admin = room.players[0];
      }

      if (room.players.length === 0) {
        const idx = rooms.indexOf(room);
        if (idx >= 0) rooms.splice(idx, 1);
      }

      saveRooms(rooms);
    }

    roomStatusText.textContent = "Opuściłeś pokój";
    roomStatusHint.textContent = "Wrócono do ekranu Lig.";
    logDebug(`leaveRoom: ${code}`);

    localStorage.removeItem(KEY_ACTIVE_ROOM);
    showScreen("rooms");
  }

  function copyCode() {
    const code = getActiveRoomCode();
    if (!code) return;

    navigator.clipboard?.writeText(code).then(() => {
      roomStatusText.textContent = `Skopiowano ${code}`;
    }).catch(() => {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        roomStatusText.textContent = `Skopiowano ${code}`;
      } catch {
        roomStatusText.textContent = "Nie udało się skopiować";
      }
    });
  }

  function openLiga() {
    const nick = promptNick(false);
    if (!nick) return;
    showScreen("rooms");
    roomsStatusText.textContent = "—";
    logDebug(`openLiga (BUILD ${BUILD})`);
  }

  function restoreLastRoomIfAny() {
    const code = getActiveRoomCode();
    if (code && getRoomByCode(code)) {
      openRoom(code);
      return true;
    }
    return false;
  }

  // ----------------------------
  // handlers
  // ----------------------------
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

    newRoomName.addEventListener("keydown", (e) => { if (e.key === "Enter") createRoom(); });
    joinRoomCode.addEventListener("keydown", (e) => { if (e.key === "Enter") joinRoom(); });
    joinRoomCode.addEventListener("input", () => { joinRoomCode.value = normalizeCode(joinRoomCode.value).slice(0, 6); });

    // room
    roomBackBtn.addEventListener("click", () => showScreen("rooms"));
    copyCodeBtn.addEventListener("click", copyCode);
    leaveRoomBtn.addEventListener("click", leaveRoom);
    repairBtn.addEventListener("click", () => {
      const rooms = loadRooms();
      saveRooms(rooms);
      const code = getActiveRoomCode();
      renderRoom(code);
      roomStatusText.textContent = "Odświeżono";
      logDebug("repair: migrated rooms + rerender");
    });

    if (addMatchBtn) addMatchBtn.addEventListener("click", addMatchTest);
    if (addRoundBtn) addRoundBtn.addEventListener("click", addRoundTest);

    // resize bg
    window.addEventListener("resize", setBgImages);
  }

  // ----------------------------
  // boot
  // ----------------------------
  function boot() {
    setBgImages();
    updateNickUI();

    const rooms = loadRooms();
    saveRooms(rooms);

    logDebug(`boot ok (BUILD ${BUILD}) rooms=${rooms.length}`);

    initHandlers();

    if (splashHint) splashHint.textContent = "Ekran startowy (7s)…";
    setTimeout(() => {
      if (splashOverlay) splashOverlay.style.display = "none";

      if (!restoreLastRoomIfAny()) {
        showScreen("menu");
      }

      if (statusText) statusText.textContent = `Menu gotowe. BUILD ${BUILD}`;
    }, SPLASH_MS);
  }

  boot();
})();
