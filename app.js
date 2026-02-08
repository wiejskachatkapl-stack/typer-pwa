const BUILD = 1213;

// TŁO globalne (stadion)
const BG_TLO = "img_tlo.png";

// EKRAN WYBORU (Twoja grafika z 3 przyciskami)
const BG_WYBOR = "img_wybor.png";

const KEY_NICK = "typer_nick_v2";
const KEY_ACTIVE_ROOM = "typer_active_room_v2";

const firebaseConfig = {
  apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
  authDomain: "typer-b3087.firebaseapp.com",
  projectId: "typer-b3087",
  storageBucket: "typer-b3087.firebasestorage.app",
  messagingSenderId: "1032303131493",
  appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
  measurementId: "G-5FBDH5G15N"
};

// ---------- helpers ----------
const el = (id) => document.getElementById(id);
const setBg = (src) => {
  const bg = el("bg");
  if (bg) bg.style.backgroundImage = `url("${src}")`;
};
const setFooter = (txt) => {
  const f = el("footerRight");
  if (f) f.textContent = txt;
};

function showToast(msg) {
  const t = el("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(showToast._tm);
  showToast._tm = setTimeout(() => (t.style.display = "none"), 2600);
}

function showScreen(id) {
  ["splash", "menu", "rooms", "room"].forEach((s) => {
    const node = el(s);
    if (node) node.classList.toggle("active", s === id);
  });
}

function setSplash(msg) {
  const h = el("splashHint");
  if (h) h.textContent = msg;
  console.log(msg);
}

function normalizeSlug(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function genCode6() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function clampInt(v, min, max) {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(String(v), 10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function getNick() {
  return (localStorage.getItem(KEY_NICK) || "").trim();
}

async function ensureNick() {
  let nick = getNick();
  while (!nick) {
    nick = prompt("Podaj nick (3–16 znaków):", "") || "";
    nick = nick.trim();
    if (nick.length < 3 || nick.length > 16) nick = "";
    if (!nick) alert("Nick musi mieć 3–16 znaków.");
  }
  localStorage.setItem(KEY_NICK, nick);
  return nick;
}

function refreshNickLabels() {
  const nick = getNick() || "—";
  if (el("nickLabelMenu")) el("nickLabelMenu").textContent = nick;
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
  if (el("nickLabelRoom")) el("nickLabelRoom").textContent = nick;
}

// ---------- CONTINUE MODAL ----------
function showContinueModal({ code, roomName }) {
  const modal = el("continueModal");
  const text = el("continueText");
  if (!modal || !text) return;

  const nick = getNick() || "—";

  // Tekst w stylu prostym, ale czytelny
  text.textContent =
    `Witaj ponownie, ${nick}!\n\n` +
    `Grasz w pokoju:\n` +
    `• ${roomName || "—"}\n` +
    `• kod: ${code}\n\n` +
    `Czy chcesz kontynuować w tym pokoju?`;

  modal.style.display = "flex";
}

function hideContinueModal() {
  const modal = el("continueModal");
  if (modal) modal.style.display = "none";
}

function clearSavedRoom() {
  localStorage.removeItem(KEY_ACTIVE_ROOM);
}

function getSavedRoomCode() {
  const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  if (saved && saved.length === 6) return saved;
  return null;
}

// ---------- Firebase ----------
let app, auth, db;
let userUid = null;

let unsubRoomDoc = null;
let unsubPlayers = null;
let unsubMatches = null;
let unsubPicks = null;

let currentRoomCode = null;
let currentRoom = null;

let matchesCache = []; // [{id, home, away, idx}]
let picksCache = {}; // matchId -> {h,a}
let picksDocByUid = {}; // uid -> picks object
let submittedByUid = {}; // uid -> boolean
let lastPlayers = [];

// ---------- status helpers ----------
function isCompletePicksObject(picksObj) {
  if (!matchesCache.length) return false;
  if (!picksObj || typeof picksObj !== "object") return false;

  for (const m of matchesCache) {
    const p = picksObj[m.id];
    if (!p) return false;
    if (!Number.isInteger(p.h) || !Number.isInteger(p.a)) return false;
  }
  return true;
}

function recomputeSubmittedMap() {
  submittedByUid = {};
  for (const [uid, picksObj] of Object.entries(picksDocByUid)) {
    submittedByUid[uid] = isCompletePicksObject(picksObj);
  }
}

// ---------- Firestore paths ----------
function roomRef(code) {
  return boot.doc(db, "rooms", code);
}
function playersCol(code) {
  return boot.collection(db, "rooms", code, "players");
}
function matchesCol(code) {
  return boot.collection(db, "rooms", code, "matches");
}
function picksCol(code) {
  return boot.collection(db, "rooms", code, "picks");
}

// ---------- UI flow helpers ----------
async function fetchRoomName(code) {
  try {
    const snap = await boot.getDoc(roomRef(code));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data?.name || "—";
  } catch {
    return null;
  }
}

// To jest NAJWAŻNIEJSZE: po kliknięciu "Pokoje typerów" ma wejść:
// 1) jeśli zapisany pokój -> modal kontynuacji
// 2) jeśli brak -> ekran rooms
async function openTyperRoomsEntry() {
  // jeśli już jesteś w pokoju – nie pokazuj rooms, tylko wróć do pokoju
  if (currentRoomCode) {
    showScreen("room");
    return;
  }

  const saved = getSavedRoomCode();
  if (!saved) {
    showScreen("rooms");
    return;
  }

  // sprawdź czy pokój istnieje i pokaż modal
  setSplash(`Sprawdzam zapisany pokój ${saved}…`);
  const name = await fetchRoomName(saved);
  // splash niech nie zostaje - wracamy do UI wyboru
  showScreen("menu");

  if (!name) {
    clearSavedRoom();
    showToast("Zapisany pokój nie istnieje");
    showScreen("rooms");
    return;
  }

  prepareContinueModal(saved, name);
}

function prepareContinueModal(code, roomName) {
  const yes = el("btnContinueYes");
  const no = el("btnContinueNo");
  const forget = el("btnContinueForget");

  if (yes) {
    yes.onclick = async () => {
      hideContinueModal();
      localStorage.setItem(KEY_ACTIVE_ROOM, code);
      await openRoom(code, { silent: true, force: true });
    };
  }

  if (no) {
    no.onclick = () => {
      hideContinueModal();
      showScreen("rooms");
    };
  }

  if (forget) {
    forget.onclick = () => {
      clearSavedRoom();
      hideContinueModal();
      showToast("Zapomniano pokój");
      showScreen("rooms");
    };
  }

  showContinueModal({ code, roomName });
}

// ---------- boot ----------
async function boot() {
  // Najpierw tło wyboru
  setBg(BG_WYBOR);
  setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import(
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"
  );
  const {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
    onSnapshot,
    writeBatch,
    deleteDoc
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  boot.doc = doc;
  boot.getDoc = getDoc;
  boot.setDoc = setDoc;
  boot.updateDoc = updateDoc;
  boot.serverTimestamp = serverTimestamp;
  boot.collection = collection;
  boot.query = query;
  boot.orderBy = orderBy;
  boot.onSnapshot = onSnapshot;
  boot.writeBatch = writeBatch;
  boot.deleteDoc = deleteDoc;

  await new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          userUid = u.uid;
          unsub();
          resolve();
          return;
        }
        await signInAnonymously(auth);
      } catch (e) {
        reject(e);
      }
    });
    setTimeout(() => reject(new Error("Auth timeout (12s)")), 12000);
  });

  setFooter(`BUILD ${BUILD}`);
  await ensureNick();
  refreshNickLabels();
  bindUI();

  // Start: pokazuj WYBÓR (img_wybor.png) – a kontynuacja dopiero po kliknięciu "Pokoje typerów"
  showScreen("menu");
}

// ---------- UI binding ----------
function bindUI() {
  // MENU (img_wybor.png) - tu podpinamy przyciski
  // WAŻNE: w index.html musisz mieć elementy z tymi ID:
  // btnWyborRooms, btnWyborStats, btnWyborExit
  // Jeśli masz inne ID - powiedz, dopasuję.

  const bRooms = el("btnWyborRooms");
  const bStats = el("btnWyborStats");
  const bExit = el("btnWyborExit");

  if (bRooms) bRooms.onclick = async () => await openTyperRoomsEntry();
  if (bStats) bStats.onclick = () => showToast("Statystyki: wkrótce 🙂");
  if (bExit) bExit.onclick = () => showToast("Wyjście: zamknij kartę / aplikację.");

  // Zmiana nicku (jeśli masz przycisk w menu)
  if (el("btnChangeNickMenu")) {
    el("btnChangeNickMenu").onclick = async () => {
      localStorage.removeItem(KEY_NICK);
      await ensureNick();
      refreshNickLabels();
      showToast("Zmieniono nick");
    };
  }

  // ROOMS
  if (el("btnBackMenu")) el("btnBackMenu").onclick = () => showScreen("menu");

  if (el("btnChangeNickRooms")) {
    el("btnChangeNickRooms").onclick = async () => {
      localStorage.removeItem(KEY_NICK);
      await ensureNick();
      refreshNickLabels();
      showToast("Zmieniono nick");
    };
  }

  if (el("btnCreateRoom")) {
    el("btnCreateRoom").onclick = async () => {
      const name = (el("inpRoomName").value || "").trim();
      if (name.length < 2) {
        showToast("Podaj nazwę pokoju");
        return;
      }
      await createRoom(name);
    };
  }

  if (el("btnJoinRoom")) {
    el("btnJoinRoom").onclick = async () => {
      await joinRoomFromInput();
    };
  }

  // auto-join: ENTER w polu kodu + automatycznie gdy wpiszesz 6 znaków
  const inpJoin = el("inpJoinCode");
  if (inpJoin) {
    inpJoin.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await joinRoomFromInput();
      }
    });
    inpJoin.addEventListener("input", async () => {
      const code = (inpJoin.value || "").trim().toUpperCase();
      if (code.length === 6) {
        // mało klikania: próbuj od razu
        await joinRoom(code);
      }
    });
  }

  // ROOM
  if (el("btnBackFromRoom")) el("btnBackFromRoom").onclick = () => showScreen("rooms");

  if (el("btnCopyCode")) {
    el("btnCopyCode").onclick = async () => {
      if (!currentRoomCode) return;
      try {
        await navigator.clipboard.writeText(currentRoomCode);
        showToast("Skopiowano kod");
      } catch {
        showToast("Nie udało się skopiować");
      }
    };
  }

  if (el("btnLeave")) el("btnLeave").onclick = async () => await leaveRoom();
  if (el("btnRefresh")) el("btnRefresh").onclick = async () => {
    if (currentRoomCode) await openRoom(currentRoomCode, { silent: true, force: true });
  };
  if (el("btnSaveAll")) el("btnSaveAll").onclick = async () => await saveAllPicks();
  if (el("btnAddQueue")) el("btnAddQueue").onclick = async () => await addTestQueue();
}

async function joinRoomFromInput() {
  const code = (el("inpJoinCode").value || "").trim().toUpperCase();
  if (code.length !== 6) {
    showToast("Kod musi mieć 6 znaków");
    return;
  }
  await joinRoom(code);
}

// ---------- Rooms logic ----------
async function createRoom(roomName) {
  const nick = getNick();
  if (el("debugRooms")) el("debugRooms").textContent = "Tworzę pokój…";

  for (let tries = 0; tries < 12; tries++) {
    const code = genCode6();
    const ref = roomRef(code);
    const snap = await boot.getDoc(ref);
    if (snap.exists()) continue;

    await boot.setDoc(ref, {
      name: roomName,
      adminUid: userUid,
      adminNick: nick,
      createdAt: boot.serverTimestamp()
    });

    await boot.setDoc(boot.doc(db, "rooms", code, "players", userUid), {
      nick,
      uid: userUid,
      joinedAt: boot.serverTimestamp()
    });

    localStorage.setItem(KEY_ACTIVE_ROOM, code);
    if (el("debugRooms")) el("debugRooms").textContent = `Utworzono pokój ${code}`;
    await openRoom(code);
    return;
  }

  if (el("debugRooms"))
    el("debugRooms").textContent = "Nie udało się wygenerować wolnego kodu (spróbuj ponownie).";
}

async function joinRoom(code) {
  const nick = getNick();
  if (el("debugRooms")) el("debugRooms").textContent = "Dołączam…";

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if (!snap.exists()) {
    if (el("debugRooms")) el("debugRooms").textContent = "Nie ma takiego pokoju.";
    showToast("Nie ma takiego pokoju");
    return;
  }

  await boot.setDoc(
    boot.doc(db, "rooms", code, "players", userUid),
    { nick, uid: userUid, joinedAt: boot.serverTimestamp() },
    { merge: true }
  );

  localStorage.setItem(KEY_ACTIVE_ROOM, code);
  if (el("debugRooms")) el("debugRooms").textContent = `Dołączono do ${code}`;
  await openRoom(code);
}

async function leaveRoom() {
  if (!currentRoomCode) return;
  try {
    await boot.deleteDoc(boot.doc(db, "rooms", currentRoomCode, "players", userUid));
  } catch {}

  localStorage.removeItem(KEY_ACTIVE_ROOM);
  cleanupRoomListeners();

  currentRoomCode = null;
  currentRoom = null;

  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  lastPlayers = [];

  renderMatches();
  renderPlayers([]);

  showScreen("rooms");
  showToast("Opuszczono pokój");
}

function cleanupRoomListeners() {
  if (unsubRoomDoc) {
    unsubRoomDoc();
    unsubRoomDoc = null;
  }
  if (unsubPlayers) {
    unsubPlayers();
    unsubPlayers = null;
  }
  if (unsubMatches) {
    unsubMatches();
    unsubMatches = null;
  }
  if (unsubPicks) {
    unsubPicks();
    unsubPicks = null;
  }
}

// ---------- Open room + live ----------
async function openRoom(code, opts = {}) {
  const { silent = false, force = false } = opts;
  code = (code || "").trim().toUpperCase();
  if (!code || code.length !== 6) throw new Error("Bad code");

  if (!force && currentRoomCode === code) {
    showScreen("room");
    return;
  }

  cleanupRoomListeners();
  currentRoomCode = code;

  // przy wejściu do pokoju tło ma być stadionowe
  setBg(BG_TLO);

  showScreen("room");

  // reset
  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  lastPlayers = [];
  renderMatches();
  renderPlayers([]);

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if (!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  // UI left
  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  const isAdmin = currentRoom.adminUid === userUid;
  el("btnAddQueue").style.display = isAdmin ? "block" : "none";

  unsubRoomDoc = boot.onSnapshot(ref, (d) => {
    if (!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    const isAdm = currentRoom.adminUid === userUid;
    el("btnAddQueue").style.display = isAdm ? "block" : "none";
  });

  // live players
  const pq = boot.query(playersCol(code), boot.orderBy("joinedAt", "asc"));
  unsubPlayers = boot.onSnapshot(pq, (qs) => {
    const arr = [];
    qs.forEach((docu) => arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  // live picks (status)
  unsubPicks = boot.onSnapshot(picksCol(code), (qs) => {
    picksDocByUid = {};
    qs.forEach((d) => {
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });

  // live matches
  const mq = boot.query(matchesCol(code), boot.orderBy("idx", "asc"));
  unsubMatches = boot.onSnapshot(mq, async (qs) => {
    const arr = [];
    qs.forEach((docu) => {
      arr.push({ id: docu.id, ...docu.data() });
    });
    matchesCache = arr;

    recomputeSubmittedMap();
    renderPlayers(lastPlayers);

    await loadMyPicks();
    renderMatches();
  });

  if (!silent) showToast(`W pokoju: ${code}`);
}

// ---------- Picks ----------
async function loadMyPicks() {
  try {
    const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
    const snap = await boot.getDoc(ref);
    if (!snap.exists()) {
      picksCache = {};
      return;
    }
    const data = snap.data();
    picksCache = data?.picks || {};
  } catch {
    picksCache = {};
  }
}

function allMyPicksFilled() {
  return isCompletePicksObject(picksCache);
}

async function saveAllPicks() {
  if (!currentRoomCode) return;
  if (!matchesCache.length) {
    showToast("Brak meczów");
    return;
  }
  if (!allMyPicksFilled()) {
    showToast("Uzupełnij wszystkie typy");
    return;
  }

  const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
  await boot.setDoc(
    ref,
    {
      uid: userUid,
      nick: getNick(),
      updatedAt: boot.serverTimestamp(),
      picks: picksCache
    },
    { merge: true }
  );

  showToast("Zapisano typy ✅");
}

// ---------- Render ----------
function renderPlayers(players) {
  const box = el("playersList");
  if (!box) return;
  box.innerHTML = "";

  const adminUid = currentRoom?.adminUid;

  players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "playerRow";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";
    left.style.minWidth = "0";

    const name = document.createElement("div");
    name.textContent = p.nick || "—";
    name.style.whiteSpace = "nowrap";
    name.style.overflow = "hidden";
    name.style.textOverflow = "ellipsis";

    const status = document.createElement("div");
    const ok = !!submittedByUid[p.uid];
    status.textContent = ok ? "✓" : "✗";
    status.style.fontWeight = "1000";
    status.style.fontSize = "18px";
    status.style.lineHeight = "1";
    status.style.color = ok ? "#33ff88" : "#ff4d4d";
    status.title = ok ? "Typy zapisane" : "Brak zapisanych typów";

    left.appendChild(name);
    left.appendChild(status);

    const right = document.createElement("div");
    right.className = "row";
    right.style.gap = "8px";

    if (p.uid === adminUid) {
      const b = document.createElement("div");
      b.className = "badge";
      b.textContent = "ADMIN";
      right.appendChild(b);
    }
    if (p.uid === userUid) {
      const b2 = document.createElement("div");
      b2.className = "badge";
      b2.textContent = "TY";
      right.appendChild(b2);
    }

    row.appendChild(left);
    row.appendChild(right);
    box.appendChild(row);
  });
}

function createLogoImg(teamName) {
  const slug = normalizeSlug(teamName);
  const img = document.createElement("img");
  img.className = "logo";
  img.alt = teamName;

  img.src = `./logos/${slug}.png`;
  img.onerror = () => {
    if (img.dataset.try === "jpg") {
      img.style.display = "none";
      return;
    }
    img.dataset.try = "jpg";
    img.src = `./logos/${slug}.jpg`;
  };
  return img;
}

function renderMatches() {
  const list = el("matchesList");
  if (!list) return;
  list.innerHTML = "";

  el("matchesCount").textContent = String(matchesCache.length || 0);

  for (const m of matchesCache) {
    const card = document.createElement("div");
    card.className = "matchCard";

    const leftTeam = document.createElement("div");
    leftTeam.className = "team";
    const lLogo = createLogoImg(m.home);
    const lName = document.createElement("div");
    lName.className = "teamName";
    lName.textContent = m.home || "—";
    leftTeam.appendChild(lLogo);
    leftTeam.appendChild(lName);

    const rightTeam = document.createElement("div");
    rightTeam.className = "team";
    rightTeam.style.justifyContent = "flex-end";
    const rName = document.createElement("div");
    rName.className = "teamName";
    rName.style.textAlign = "right";
    rName.textContent = m.away || "—";
    const rLogo = createLogoImg(m.away);
    rightTeam.appendChild(rName);
    rightTeam.appendChild(rLogo);

    const score = document.createElement("div");
    score.className = "scoreBox";

    const inpH = document.createElement("input");
    inpH.className = "scoreInput";
    inpH.inputMode = "numeric";
    inpH.placeholder = "0";
    inpH.value = (picksCache[m.id]?.h ?? "") === "" ? "" : String(picksCache[m.id]?.h ?? "");
    inpH.oninput = () => {
      const v = clampInt(inpH.value, 0, 20);
      picksCache[m.id] = picksCache[m.id] || {};
      picksCache[m.id].h = v;
      updateSaveButtonState();
    };

    const sep = document.createElement("div");
    sep.className = "sep";
    sep.textContent = ":";

    const inpA = document.createElement("input");
    inpA.className = "scoreInput";
    inpA.inputMode = "numeric";
    inpA.placeholder = "0";
    inpA.value = (picksCache[m.id]?.a ?? "") === "" ? "" : String(picksCache[m.id]?.a ?? "");
    inpA.oninput = () => {
      const v = clampInt(inpA.value, 0, 20);
      picksCache[m.id] = picksCache[m.id] || {};
      picksCache[m.id].a = v;
      updateSaveButtonState();
    };

    score.appendChild(inpH);
    score.appendChild(sep);
    score.appendChild(inpA);

    card.appendChild(leftTeam);
    card.appendChild(score);
    card.appendChild(rightTeam);

    list.appendChild(card);
  }

  updateSaveButtonState();
}

function updateSaveButtonState() {
  const btn = el("btnSaveAll");
  if (!btn) return;
  btn.disabled = !allMyPicksFilled();
}

// ---------- test queue ----------
async function addTestQueue() {
  if (!currentRoomCode) return;
  if (currentRoom?.adminUid !== userUid) {
    showToast("Tylko admin");
    return;
  }

  const sample = [
    ["Jagiellonia", "Piast"],
    ["Lechia", "Legia"],
    ["Wisla Plock", "Radomiak"],
    ["GKS Katowice", "Gornik"],
    ["Arka", "Cracovia"],
    ["Lech", "Pogon"],
    ["Motor", "Rakow"],
    ["Korona", "Widzew"],
    ["Slask", "Zaglebie"],
    ["Stal Mielec", "Puszcza"]
  ];

  const b = boot.writeBatch(db);
  sample.forEach((pair, idx) => {
    const id = `m_${Date.now()}_${idx}`;
    const ref = boot.doc(db, "rooms", currentRoomCode, "matches", id);
    b.set(ref, {
      idx,
      home: pair[0],
      away: pair[1],
      createdAt: boot.serverTimestamp()
    });
  });
  await b.commit();
  showToast("Dodano kolejkę (test)");
}

// ---------- start ----------
(async () => {
  try {
    // Start: WYBÓR
    setBg(BG_WYBOR);
    setSplash(`BUILD ${BUILD}\nŁadowanie…`);
    await boot();
  } catch (e) {
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
