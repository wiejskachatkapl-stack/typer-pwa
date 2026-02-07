/**
 * Typer PWA + Firebase (Auth anon + Firestore)
 * BUILD: podbijaj gdy zmieniasz (i w index.html też: app.js?v=XXXX)
 */
const BUILD = 1101;

// ========= Firebase (modular CDN) =========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs,
  onSnapshot, query, orderBy,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ====== Twoje configi (z Firebase) ======
const firebaseConfig = {
  apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
  authDomain: "typer-b3087.firebaseapp.com",
  projectId: "typer-b3087",
  storageBucket: "typer-b3087.firebasestorage.app",
  messagingSenderId: "1032303131493",
  appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
  measurementId: "G-5FBDH5G15N"
};

// ========= Stałe / localStorage keys =========
const KEY_NICK = "typer_nick_v2";
const KEY_ACTIVE_ROOM = "typer_active_room_v2";

// jedyne tło w pokoju:
const BG_TLO = "img_tlo.png"; // MUSI być w repo root

// ========= DOM helpers =========
const el = (id) => document.getElementById(id);
const show = (screenId) => {
  ["splash", "menu", "rooms", "room"].forEach(id => el(id).classList.remove("active"));
  el(screenId).classList.add("active");
};

const toast = (msg) => {
  const t = el("toast");
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.style.display = "none", 2200);
};

const setBg = (src) => {
  const bg = el("bg");
  bg.style.backgroundImage = `url("${src}")`;
};

// ========= App state =========
let app = null;
let auth = null;
let db = null;
let uid = null;

let nick = "";
let activeRoomCode = "";
let roomUnsubs = [];
let roomData = null;

let matches = [];          // from firestore
let localPicks = new Map(); // matchId -> {home, away}
let players = [];          // from firestore

// ========= Init =========
boot().catch(err => {
  console.error(err);
  el("splashHint").textContent = "Błąd startu: " + (err?.message || err);
});

async function boot() {
  // tło ogólne też dajemy na img_tlo, żeby nie było „podwójnych”
  setBg(BG_TLO);

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // UI events
  wireUI();

  // nick
  nick = (localStorage.getItem(KEY_NICK) || "").trim();
  if (!nick) {
    nick = prompt("Podaj nick (2-14 znaków):", "")?.trim() || "";
    nick = sanitizeNick(nick);
    if (!nick) nick = "Gracz";
    localStorage.setItem(KEY_NICK, nick);
  }
  renderNickEverywhere();

  // auth anon
  await ensureAuth();

  // auto: jeśli był aktywny pokój
  activeRoomCode = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  if (activeRoomCode) {
    // spróbuj wejść do pokoju
    const ok = await joinRoomByCode(activeRoomCode, {silentFail:true});
    if (ok) return;
    localStorage.removeItem(KEY_ACTIVE_ROOM);
    activeRoomCode = "";
  }

  show("menu");
  el("debugInfo").textContent = `BUILD ${BUILD} • uid: ${uid.slice(0,6)}…`;
}

function wireUI() {
  // menu
  el("btnLiga").onclick = async () => {
    show("rooms");
    renderNickEverywhere();
  };
  el("btnExit").onclick = () => {
    toast("Zamknij kartę / aplikację 🙂");
  };
  el("btnChangeNick").onclick = changeNick;
  el("btnChangeNick2").onclick = changeNick;

  el("btnBackFromRooms").onclick = () => show("menu");

  // rooms
  el("btnCreateRoom").onclick = createRoomFlow;
  el("btnJoinRoom").onclick = joinRoomFlow;

  // room
  el("btnBackFromRoom").onclick = () => {
    stopRoomListeners();
    show("rooms");
  };
  el("btnCopyCode").onclick = async () => {
    if (!activeRoomCode) return;
    try{
      await navigator.clipboard.writeText(activeRoomCode);
      toast("Skopiowano kod");
    }catch{
      toast("Nie mogę skopiować – skopiuj ręcznie: " + activeRoomCode);
    }
  };
  el("btnLeaveRoom").onclick = async () => {
    await leaveRoom();
  };
  el("btnRefreshRoom").onclick = async () => {
    if (!activeRoomCode) return;
    await joinRoomByCode(activeRoomCode, {silentFail:false});
    toast("Odświeżono");
  };

  el("btnAddQueueTest").onclick = async () => {
    if (!activeRoomCode) return;
    await addQueueTest(activeRoomCode);
  };

  el("btnSaveAllPicks").onclick = async () => {
    await saveAllPicks();
  };
}

function renderNickEverywhere(){
  el("nickText").textContent = nick;
  el("nickTextRooms").textContent = nick;
  el("nickTextRoom").textContent = nick;
}

function sanitizeNick(s){
  s = (s || "").trim();
  s = s.replace(/\s+/g, " ");
  if (s.length < 2) return "";
  if (s.length > 14) s = s.slice(0,14);
  return s;
}

function changeNick(){
  const n = sanitizeNick(prompt("Nowy nick (2-14 znaków):", nick) || "");
  if (!n) return;
  nick = n;
  localStorage.setItem(KEY_NICK, nick);
  renderNickEverywhere();
  toast("Zmieniono nick");
  // jeśli jesteś w pokoju – zaktualizuj swój wpis gracza
  if (activeRoomCode && uid) upsertPlayer(activeRoomCode).catch(()=>{});
}

// ========= Auth =========
async function ensureAuth(){
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try{
        if (user){
          uid = user.uid;
          unsub();
          resolve();
          return;
        }
        await signInAnonymously(auth);
      }catch(err){
        reject(err);
      }
    });
  });
}

// ========= Rooms flow =========
async function createRoomFlow(){
  try{
    const nameRaw = (el("roomNameInput").value || "").trim();
    const roomName = nameRaw ? nameRaw.slice(0,24) : "Pokój";
    el("roomNameInput").value = roomName;

    const code = await generateRoomCode();
    await createRoom(code, roomName);
    await joinRoomByCode(code, {silentFail:false});
    toast("Utworzono pokój: " + code);
  }catch(err){
    console.error(err);
    toast("Błąd tworzenia pokoju");
    showRoomsDebug(String(err?.message || err));
  }
}

async function joinRoomFlow(){
  const code = (el("joinCodeInput").value || "").trim().toUpperCase();
  el("joinCodeInput").value = code;
  if (code.length !== 6) {
    toast("Kod ma 6 znaków");
    return;
  }
  const ok = await joinRoomByCode(code, {silentFail:false});
  if (!ok) toast("Nie znaleziono pokoju");
}

function showRoomsDebug(txt){
  el("roomsDebugCard").style.display = "block";
  el("roomsDebug").textContent = txt;
}

function generateCode6(){
  // bez mylących: O,0,I,1
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0;i<6;i++){
    out += chars[Math.floor(Math.random()*chars.length)];
  }
  return out;
}

async function generateRoomCode(){
  // spróbuj kilka razy
  for (let i=0;i<12;i++){
    const code = generateCode6();
    const ref = doc(db, "rooms", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return code;
  }
  // fallback (mało prawdopodobne)
  return generateCode6();
}

async function createRoom(code, roomName){
  const ref = doc(db, "rooms", code);
  await setDoc(ref, {
    code,
    name: roomName,
    adminUid: uid,
    adminNick: nick,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: false });

  // od razu dodaj admina jako gracza
  await upsertPlayer(code);
}

async function upsertPlayer(code){
  const pref = doc(db, "rooms", code, "players", uid);
  await setDoc(pref, {
    uid,
    nick,
    joinedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp()
  }, { merge:true });
}

async function joinRoomByCode(code, {silentFail}){
  try{
    const ref = doc(db, "rooms", code);
    const snap = await getDoc(ref);
    if (!snap.exists()){
      if (!silentFail) showRoomsDebug("Brak pokoju o kodzie: " + code);
      return false;
    }

    activeRoomCode = code;
    localStorage.setItem(KEY_ACTIVE_ROOM, code);

    // dodaj/odśwież gracza
    await upsertPlayer(code);

    // wejdź na screen pokoju
    show("room");
    renderNickEverywhere();

    // start listeners
    startRoomListeners(code);

    return true;
  }catch(err){
    console.error(err);
    if (!silentFail) showRoomsDebug(String(err?.message || err));
    return false;
  }
}

async function leaveRoom(){
  try{
    stopRoomListeners();
    localStorage.removeItem(KEY_ACTIVE_ROOM);
    activeRoomCode = "";
    roomData = null;
    matches = [];
    players = [];
    localPicks.clear();
    renderRoomUI();
    show("rooms");
    toast("Opuszczono pokój");
  }catch(e){
    console.error(e);
    toast("Błąd opuszczania");
  }
}

// ========= Room listeners =========
function stopRoomListeners(){
  roomUnsubs.forEach(u => { try{u();}catch{} });
  roomUnsubs = [];
}

function startRoomListeners(code){
  stopRoomListeners();

  // room doc
  const roomRef = doc(db, "rooms", code);
  roomUnsubs.push(onSnapshot(roomRef, (snap) => {
    roomData = snap.exists() ? snap.data() : null;
    renderRoomUI();
  }));

  // players list
  const playersRef = collection(db, "rooms", code, "players");
  roomUnsubs.push(onSnapshot(query(playersRef, orderBy("joinedAt","asc")), (qs) => {
    players = qs.docs.map(d => d.data());
    renderPlayers();
  }));

  // matches
  const matchesRef = collection(db, "rooms", code, "matches");
  roomUnsubs.push(onSnapshot(query(matchesRef, orderBy("order","asc")), (qs) => {
    matches = qs.docs.map(d => ({ id:d.id, ...d.data() }));
    renderMatches();
    updateSaveButtonState();
  }));

  // my picks (optional live)
  const picksRef = collection(db, "rooms", code, "picks");
  roomUnsubs.push(onSnapshot(picksRef, (qs) => {
    // wczytaj tylko moje picki do localPicks (żeby po odświeżeniu się wypełniało)
    qs.docs.forEach(d => {
      const data = d.data();
      if (data.uid === uid && data.matchId){
        localPicks.set(data.matchId, { home: String(data.home ?? ""), away: String(data.away ?? "") });
      }
    });
    renderMatches(); // uzupełnij inputy
    updateSaveButtonState();
  }));

  renderRoomUI();
}

function renderRoomUI(){
  // tło tylko img_tlo.png (bez starterów i bez podwójnych)
  setBg(BG_TLO);

  const code = activeRoomCode || "------";
  el("roomCodeText").textContent = code;

  if (!roomData){
    el("roomNameText").textContent = "---";
    el("roomAdminText").textContent = "---";
    el("roomStatus").textContent = "Ładowanie danych pokoju…";
    return;
  }
  el("roomNameText").textContent = roomData.name || "---";
  el("roomAdminText").textContent = roomData.adminNick || "---";
  el("roomStatus").textContent = `BUILD ${BUILD} • uid: ${uid.slice(0,6)}… • pokój: ${code}`;
  renderPlayers();
  renderMatches();
}

// ========= Logos =========
// zakładamy, że loga są w /logos i nazwy plików są np. "radomiak.png" itd.
function normKey(s){
  return (s||"")
    .toLowerCase()
    .replace(/ł/g,"l").replace(/ś/g,"s").replace(/ć/g,"c").replace(/ń/g,"n").replace(/ż/g,"z").replace(/ź/g,"z").replace(/ą/g,"a").replace(/ę/g,"e").replace(/ó/g,"o")
    .replace(/[^a-z0-9]+/g,"")
    .trim();
}
function logoUrl(teamName){
  const k = normKey(teamName);
  // próbuj png i jpg
  return `./logos/${k}.png`;
}

// ========= Matches render =========
function renderMatches(){
  const box = el("matchesList");
  box.innerHTML = "";

  if (!matches.length){
    const div = document.createElement("div");
    div.className = "note";
    div.textContent = "Brak spotkań. Kliknij „Dodaj kolejkę (test)”.";
    box.appendChild(div);
    return;
  }

  matches.forEach(m => {
    const matchId = m.id;
    const pick = localPicks.get(matchId) || { home:"", away:"" };

    const row = document.createElement("div");
    row.className = "match";

    // HOME
    const left = document.createElement("div");
    left.className = "team";
    const lLogo = document.createElement("img");
    lLogo.className = "logo";
    lLogo.alt = m.home || "";
    lLogo.src = logoUrl(m.home);
    lLogo.onerror = () => { lLogo.style.opacity = "0"; };
    const lName = document.createElement("div");
    lName.className = "teamName";
    lName.textContent = m.home || "—";
    left.appendChild(lLogo);
    left.appendChild(lName);

    // SCORE INPUTS
    const mid = document.createElement("div");
    mid.className = "scoreBox";
    const inH = document.createElement("input");
    inH.className = "scoreInput";
    inH.inputMode = "numeric";
    inH.maxLength = 2;
    inH.value = pick.home ?? "";
    inH.placeholder = "";
    const sep = document.createElement("div");
    sep.className = "sep";
    sep.textContent = ":";
    const inA = document.createElement("input");
    inA.className = "scoreInput";
    inA.inputMode = "numeric";
    inA.maxLength = 2;
    inA.value = pick.away ?? "";
    inA.placeholder = "";

    // only digits
    const onChange = () => {
      inH.value = inH.value.replace(/[^\d]/g,"").slice(0,2);
      inA.value = inA.value.replace(/[^\d]/g,"").slice(0,2);
      localPicks.set(matchId, { home: inH.value, away: inA.value });
      updateSaveButtonState();
    };
    inH.addEventListener("input", onChange);
    inA.addEventListener("input", onChange);

    mid.appendChild(inH);
    mid.appendChild(sep);
    mid.appendChild(inA);

    // AWAY
    const right = document.createElement("div");
    right.className = "team";
    right.style.justifyContent = "flex-end";
    const rName = document.createElement("div");
    rName.className = "teamName";
    rName.textContent = m.away || "—";
    const rLogo = document.createElement("img");
    rLogo.className = "logo";
    rLogo.alt = m.away || "";
    rLogo.src = logoUrl(m.away);
    rLogo.onerror = () => { rLogo.style.opacity = "0"; };
    right.appendChild(rName);
    right.appendChild(rLogo);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);

    box.appendChild(row);
  });
}

function renderPlayers(){
  const box = el("playersList");
  box.innerHTML = "";
  if (!players.length){
    const div = document.createElement("div");
    div.className = "note";
    div.textContent = "Brak graczy…";
    box.appendChild(div);
    return;
  }
  players.forEach(p => {
    const item = document.createElement("div");
    item.className = "playerItem";
    const a = document.createElement("div");
    a.textContent = "Gracz:";
    const b = document.createElement("div");
    b.textContent = p.nick || "—";
    item.appendChild(a);
    item.appendChild(b);
    box.appendChild(item);
  });
}

// ========= Save button logic =========
function allPicksFilled(){
  if (!matches.length) return false;
  for (const m of matches){
    const pick = localPicks.get(m.id);
    if (!pick) return false;
    if (pick.home === "" || pick.away === "") return false;
  }
  return true;
}

function updateSaveButtonState(){
  const ok = allPicksFilled();
  el("btnSaveAllPicks").disabled = !ok;
}

// ========= Save all picks (one button) =========
async function saveAllPicks(){
  if (!activeRoomCode) return;
  if (!allPicksFilled()){
    toast("Uzupełnij wszystkie typy");
    return;
  }
  try{
    const batch = writeBatch(db);
    const roomCode = activeRoomCode;

    matches.forEach(m => {
      const pick = localPicks.get(m.id);
      const pickId = `${uid}_${m.id}`;
      const pref = doc(db, "rooms", roomCode, "picks", pickId);
      batch.set(pref, {
        uid,
        nick,
        matchId: m.id,
        home: Number(pick.home),
        away: Number(pick.away),
        updatedAt: serverTimestamp()
      }, { merge:true });
    });

    // bump room update
    batch.set(doc(db, "rooms", roomCode), { updatedAt: serverTimestamp() }, { merge:true });

    await batch.commit();
    toast("Zapisano typy");
  }catch(err){
    console.error(err);
    toast("Błąd zapisu typów");
  }
}

// ========= TEST: dodaj kolejkę =========
async function addQueueTest(roomCode){
  try{
    // Jeśli już są mecze, nie dubluj (prosty warunek)
    const mref = collection(db, "rooms", roomCode, "matches");
    const existing = await getDocs(mref);
    if (existing.size > 0){
      toast("Kolejka już istnieje");
      return;
    }

    const sample = [
      ["Jagiellonia", "Piast"],
      ["Lechia", "Legia"],
      ["Wisła Płock", "Radomiak"],
      ["GKS Katowice", "Górnik"],
      ["Arka", "Cracovia"],
      ["Lech", "Pogoń"],
      ["Motor", "Raków"],
      ["Korona", "Widzew"],
      ["Śląsk", "Zagłębie"],
      ["Stal", "Puszcza"],
    ];

    const batch = writeBatch(db);
    sample.forEach((pair, idx) => {
      const id = `m_${idx+1}`;
      const dref = doc(db, "rooms", roomCode, "matches", id);
      batch.set(dref, {
        league: "Ekstraklasa (test)",
        home: pair[0],
        away: pair[1],
        order: idx,
        createdAt: serverTimestamp()
      }, { merge:true });
    });

    await batch.commit();
    toast("Dodano kolejkę (test)");
  }catch(err){
    console.error(err);
    toast("Błąd dodania kolejki");
  }
}
