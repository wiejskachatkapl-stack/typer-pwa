const BUILD = 2003;

const BG_HOME = "img_menu_pc.png";
const BG_ROOM = "img_tlo.png";

const KEY_NICK = "typer_nick_v3";
const KEY_ACTIVE_ROOM = "typer_active_room_v3";
const KEY_ROOMS_HISTORY = "typer_rooms_history_v3";

const firebaseConfig = {
  apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
  authDomain: "typer-b3087.firebaseapp.com",
  projectId: "typer-b3087",
  storageBucket: "typer-b3087.firebasestorage.app",
  messagingSenderId: "1032303131493",
  appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
  measurementId: "G-5FBDH5G15N"
};

const el = (id) => document.getElementById(id);
const setBg = (src) => { const bg = el("bg"); if (bg) bg.style.backgroundImage = `url("${src}")`; };
const setFooter = (txt) => { const f = el("footerRight"); if (f) f.textContent = txt; };

function showToast(msg){
  const t = el("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(showToast._tm);
  showToast._tm = setTimeout(()=> t.style.display="none", 2600);
}

function showScreen(id){
  const ids = ["splash","home","continue","rooms","room","results","league"];
  ids.forEach(s=>{
    const node = el(s);
    if (node) node.classList.toggle("active", s===id);
  });

  if(id === "room" || id === "results") setBg(BG_ROOM);
  else setBg(BG_HOME);
}

function setSplash(msg){
  const h = el("splashHint");
  if (h) h.textContent = msg;
  console.log(msg);
}

function clampInt(v, min, max){
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(String(v),10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function genCode6(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function normalizeSlug(s){
  return (s||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g,"l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getNick(){
  return (localStorage.getItem(KEY_NICK) || "").trim();
}
async function ensureNick(){
  let nick = getNick();
  while(!nick){
    nick = prompt("Podaj nick (3–16 znaków):", "") || "";
    nick = nick.trim();
    if (nick.length < 3 || nick.length > 16) nick = "";
    if (!nick) alert("Nick musi mieć 3–16 znaków.");
  }
  localStorage.setItem(KEY_NICK, nick);
  refreshNickLabels();
  return nick;
}
function refreshNickLabels(){
  const nick = getNick() || "—";
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
  if (el("nickLabelRoom")) el("nickLabelRoom").textContent = nick;
  if (el("leagueNick")) el("leagueNick").textContent = nick;
}

function getSavedRoom(){
  return (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
}
function clearSavedRoom(){
  localStorage.removeItem(KEY_ACTIVE_ROOM);
}
function pushRoomHistory(code){
  code = (code||"").trim().toUpperCase();
  if(code.length !== 6) return;
  const raw = localStorage.getItem(KEY_ROOMS_HISTORY) || "[]";
  let arr = [];
  try{ arr = JSON.parse(raw); }catch{ arr=[]; }
  arr = arr.filter(x => String(x).toUpperCase() !== code);
  arr.unshift(code);
  arr = arr.slice(0, 12);
  localStorage.setItem(KEY_ROOMS_HISTORY, JSON.stringify(arr));
}

// ===== Modal =====
function modalOpen(title, bodyNode){
  const m = el("modal");
  const t = el("modalTitle");
  const b = el("modalBody");
  if(!m || !t || !b) return;
  t.textContent = title || "—";
  b.innerHTML = "";
  if(bodyNode) b.appendChild(bodyNode);
  m.classList.add("active");
}
function modalClose(){
  const m = el("modal");
  if(m) m.classList.remove("active");
}

// Firebase boot
let app, auth, db;
let userUid = null;
const boot = {};

let unsubRoomDoc = null;
let unsubPlayers = null;
let unsubMatches = null;
let unsubPicks = null;

let currentRoomCode = null;
let currentRoom = null;
let currentRoundNo = 1;

let matchesCache = [];   // [{id, home, away, idx, resultH, resultA}]
let picksCache = {};     // my picks: matchId -> {h,a}
let picksDocByUid = {};  // uid -> picks object
let submittedByUid = {}; // uid -> bool
let lastPlayers = [];

let pointsByUid = {}; // uid -> number (current round)
let myPoints = null;

function roomRef(code){ return boot.doc(db, "rooms", code); }
function playersCol(code){ return boot.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return boot.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return boot.collection(db, "rooms", code, "picks"); }
function roundsCol(code){ return boot.collection(db, "rooms", code, "rounds"); } // archiwum
function leagueCol(code){ return boot.collection(db, "rooms", code, "league"); } // suma

function roundDocRef(code, roundNo){
  return boot.doc(db, "rooms", code, "rounds", `round_${roundNo}`);
}
function leagueDocRef(code, uid){
  return boot.doc(db, "rooms", code, "league", uid);
}

function isCompletePicksObject(picksObj){
  if(!matchesCache.length) return false;
  if(!picksObj || typeof picksObj !== "object") return false;
  for(const m of matchesCache){
    const p = picksObj[m.id];
    if(!p) return false;
    if(!Number.isInteger(p.h) || !Number.isInteger(p.a)) return false;
  }
  return true;
}
function recomputeSubmittedMap(){
  submittedByUid = {};
  for(const [uid, picksObj] of Object.entries(picksDocByUid)){
    submittedByUid[uid] = isCompletePicksObject(picksObj);
  }
}
function iAmSubmitted(){
  return !!submittedByUid[userUid];
}
function allResultsComplete(){
  if(!matchesCache.length) return false;
  return matchesCache.every(m => Number.isInteger(m.resultH) && Number.isInteger(m.resultA));
}

// scoring: 3 exact, 1 outcome, 0 else
function outcomeSign(h,a){
  if(h>a) return 1;
  if(h<a) return -1;
  return 0;
}
function scoreOneMatch(pH,pA,rH,rA){
  if(!Number.isInteger(pH) || !Number.isInteger(pA) || !Number.isInteger(rH) || !Number.isInteger(rA)) return null;
  if(pH===rH && pA===rA) return 3;
  if(outcomeSign(pH,pA) === outcomeSign(rH,rA)) return 1;
  return 0;
}
function dotClassFor(pH,pA,rH,rA){
  const pts = scoreOneMatch(pH,pA,rH,rA);
  if(pts === null) return "gray";
  if(pts === 3) return "green";
  if(pts === 1) return "yellow";
  return "red";
}

function recomputePoints(){
  pointsByUid = {};
  myPoints = null;

  if(!allResultsComplete()){
    if(el("myPointsLabel")) el("myPointsLabel").textContent = "—";
    return;
  }

  for(const [uid, picksObj] of Object.entries(picksDocByUid)){
    if(!isCompletePicksObject(picksObj)) continue;
    let sum = 0;
    for(const m of matchesCache){
      const p = picksObj[m.id];
      const pts = scoreOneMatch(p?.h, p?.a, m.resultH, m.resultA);
      if(pts !== null) sum += pts;
    }
    pointsByUid[uid] = sum;
  }

  myPoints = pointsByUid[userUid] ?? 0;
  if(el("myPointsLabel")) el("myPointsLabel").textContent = String(myPoints);
}

async function initFirebase(){
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const {
    getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, query, orderBy, onSnapshot,
    writeBatch, deleteDoc, getDocs, increment
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  boot.doc = doc; boot.getDoc = getDoc; boot.setDoc = setDoc; boot.updateDoc = updateDoc;
  boot.serverTimestamp = serverTimestamp;
  boot.collection = collection; boot.query = query; boot.orderBy = orderBy; boot.onSnapshot = onSnapshot;
  boot.writeBatch = writeBatch; boot.deleteDoc = deleteDoc; boot.getDocs = getDocs;
  boot.increment = increment;

  await new Promise((resolve, reject)=>{
    const unsub = onAuthStateChanged(auth, async(u)=>{
      try{
        if(u){
          userUid = u.uid;
          unsub();
          resolve();
          return;
        }
        await signInAnonymously(auth);
      }catch(e){ reject(e); }
    });
    setTimeout(()=>reject(new Error("Auth timeout (12s)")), 12000);
  });
}

// ===== UI =====
function bindUI(){
  // Modal
  if(el("modalClose")) el("modalClose").onclick = modalClose;
  if(el("modal")) el("modal").addEventListener("click",(e)=>{
    if(e.target && e.target.id === "modal") modalClose();
  });

  // HOME
  el("btnHomeRooms").onclick = async ()=>{
    if(!getNick()) await ensureNick();
    const saved = getSavedRoom();
    if(saved && saved.length === 6){
      await showContinueIfRoomExists(saved);
      return;
    }
    showScreen("rooms");
  };

  el("btnHomeStats").onclick = async ()=>{
    if(!getNick()) await ensureNick();
    const saved = getSavedRoom();
    if(saved && saved.length === 6){
      await openLeagueTable(saved);
      return;
    }
    showToast("Najpierw wybierz / dołącz do pokoju");
    showScreen("rooms");
  };

  el("btnHomeExit").onclick = ()=> showToast("Możesz zamknąć kartę przeglądarki.");

  // CONTINUE
  el("btnContYes").onclick = async ()=>{
    const code = getSavedRoom();
    if(!code) { showScreen("rooms"); return; }
    await openRoom(code, { force:true });
  };
  el("btnContNo").onclick = ()=> showScreen("rooms");
  el("btnContForget").onclick = ()=>{
    clearSavedRoom();
    showToast("Zapomniano pokój");
    showScreen("rooms");
  };

  // ROOMS
  el("btnBackHomeFromRooms").onclick = ()=> showScreen("home");
  el("btnChangeNickRooms").onclick = async ()=>{
    localStorage.removeItem(KEY_NICK);
    await ensureNick();
    showToast("Zmieniono nick");
  };
  el("btnCreateRoom").onclick = async ()=>{
    if(!getNick()) await ensureNick();
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){ showToast("Podaj nazwę pokoju"); return; }
    await createRoom(name);
  };
  el("btnJoinRoom").onclick = async ()=>{
    if(!getNick()) await ensureNick();
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){ showToast("Kod musi mieć 6 znaków"); return; }
    await joinRoom(code);
  };

  // ROOM
  el("btnBackFromRoom").onclick = ()=> showScreen("home");

  el("btnCopyCode").onclick = async ()=>{
    if(!currentRoomCode) return;
    try{
      await navigator.clipboard.writeText(currentRoomCode);
      showToast("Skopiowano kod");
    }catch{ showToast("Nie udało się skopiować"); }
  };

  el("btnLeave").onclick = async ()=>{ await leaveRoom(); };
  el("btnRefresh").onclick = async ()=>{ if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true}); };

  el("btnSaveAll").onclick = async ()=>{ await saveAllPicks(); };

  // ADMIN
  el("btnEnterResults").onclick = async ()=>{
    if(!isAdmin()) { showToast("Tylko admin"); return; }
    if(!matchesCache.length){ showToast("Brak meczów"); return; }
    openResultsScreen();
  };

  el("btnEndRound").onclick = async ()=>{
    await endRoundConfirmAndArchive();
  };

  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };
  el("btnMyQueue").onclick = async ()=>{ showToast("Własna kolejka – dopinamy dalej"); };

  // RESULTS
  el("btnResBack").onclick = ()=> showScreen("room");
  el("btnResSave").onclick = async ()=>{ await saveResults(); };

  // League from room
  el("btnLeagueFromRoom").onclick = async ()=>{
    if(!currentRoomCode) return;
    await openLeagueTable(currentRoomCode);
  };

  // League
  el("btnLeagueBack").onclick = ()=>{ if(currentRoomCode) showScreen("room"); else showScreen("home"); };
  el("btnLeagueRefresh").onclick = async ()=>{
    if(!leagueState.roomCode) return;
    await openLeagueTable(leagueState.roomCode, {silent:true});
  };
}

function isAdmin(){
  return currentRoom?.adminUid === userUid;
}

// ===== CONTINUE FLOW =====
async function showContinueIfRoomExists(code){
  code = (code||"").trim().toUpperCase();
  if(code.length !== 6){ showScreen("rooms"); return; }

  try{
    const snap = await boot.getDoc(roomRef(code));
    if(!snap.exists()){
      clearSavedRoom();
      showToast("Zapisany pokój nie istnieje");
      showScreen("rooms");
      return;
    }
    const room = snap.data();
    el("contNick").textContent = getNick() || "—";
    el("contRoomName").textContent = room?.name || "—";
    showScreen("continue");
  }catch{
    showToast("Nie udało się sprawdzić pokoju");
    showScreen("rooms");
  }
}

// ===== ROOMS LOGIC =====
async function createRoom(roomName){
  const nick = getNick();
  el("debugRooms").textContent = "Tworzę pokój…";

  for(let tries=0; tries<12; tries++){
    const code = genCode6();
    const ref = roomRef(code);
    const snap = await boot.getDoc(ref);
    if(snap.exists()) continue;

    await boot.setDoc(ref, {
      name: roomName,
      adminUid: userUid,
      adminNick: nick,
      createdAt: boot.serverTimestamp(),
      currentRoundNo: 1
    });

    await boot.setDoc(boot.doc(db, "rooms", code, "players", userUid), {
      nick, uid: userUid, joinedAt: boot.serverTimestamp()
    });

    localStorage.setItem(KEY_ACTIVE_ROOM, code);
    pushRoomHistory(code);

    el("debugRooms").textContent = `Utworzono pokój ${code}`;
    await openRoom(code);
    return;
  }
  el("debugRooms").textContent = "Nie udało się wygenerować wolnego kodu (spróbuj ponownie).";
}

async function joinRoom(code){
  const nick = getNick();
  el("debugRooms").textContent = "Dołączam…";

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if(!snap.exists()){
    el("debugRooms").textContent = "Nie ma takiego pokoju.";
    showToast("Nie ma takiego pokoju");
    return;
  }

  await boot.setDoc(boot.doc(db, "rooms", code, "players", userUid), {
    nick, uid: userUid, joinedAt: boot.serverTimestamp()
  }, { merge:true });

  localStorage.setItem(KEY_ACTIVE_ROOM, code);
  pushRoomHistory(code);

  el("debugRooms").textContent = `Dołączono do ${code}`;
  await openRoom(code);
}

async function leaveRoom(){
  if(!currentRoomCode) return;
  try{
    await boot.deleteDoc(boot.doc(db, "rooms", currentRoomCode, "players", userUid));
  }catch{}

  clearSavedRoom();
  cleanupRoomListeners();

  currentRoomCode = null;
  currentRoom = null;

  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  lastPlayers = [];
  pointsByUid = {};
  myPoints = null;

  renderMatches();
  renderPlayers([]);

  showScreen("home");
  showToast("Opuszczono pokój");
}

function cleanupRoomListeners(){
  if(unsubRoomDoc){ unsubRoomDoc(); unsubRoomDoc=null; }
  if(unsubPlayers){ unsubPlayers(); unsubPlayers=null; }
  if(unsubMatches){ unsubMatches(); unsubMatches=null; }
  if(unsubPicks){ unsubPicks(); unsubPicks=null; }
}

// ===== OPEN ROOM =====
async function openRoom(code, opts={}){
  const { silent=false, force=false } = opts;
  code = (code||"").trim().toUpperCase();
  if(!code || code.length!==6) throw new Error("Bad code");

  if(!force && currentRoomCode === code){
    showScreen("room");
    return;
  }

  cleanupRoomListeners();
  currentRoomCode = code;
  showScreen("room");

  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  lastPlayers = [];
  pointsByUid = {};
  myPoints = null;

  renderMatches();
  renderPlayers([]);
  if(el("myPointsLabel")) el("myPointsLabel").textContent = "—";

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  currentRoundNo = currentRoom?.currentRoundNo || 1;
  el("roundLabel").textContent = `KOLEJKA ${currentRoundNo}`;

  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  refreshNickLabels();

  const adm = isAdmin();
  el("btnAddQueue").style.display = adm ? "block" : "none";
  el("btnMyQueue").style.display = adm ? "block" : "none";
  el("btnEnterResults").style.display = adm ? "block" : "none";
  el("btnEndRound").style.display = adm ? "block" : "none";
  el("btnEndRound").disabled = true;

  unsubRoomDoc = boot.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    currentRoundNo = currentRoom?.currentRoundNo || 1;
    el("roundLabel").textContent = `KOLEJKA ${currentRoundNo}`;

    const adm2 = isAdmin();
    el("btnAddQueue").style.display = adm2 ? "block" : "none";
    el("btnMyQueue").style.display = adm2 ? "block" : "none";
    el("btnEnterResults").style.display = adm2 ? "block" : "none";
    el("btnEndRound").style.display = adm2 ? "block" : "none";
    el("btnEndRound").disabled = !(adm2 && matchesCache.length && allResultsComplete());
  });

  const pq = boot.query(playersCol(code), boot.orderBy("joinedAt","asc"));
  unsubPlayers = boot.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  unsubPicks = boot.onSnapshot(picksCol(code), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    recomputePoints();
    renderPlayers(lastPlayers);
  });

  const mq = boot.query(matchesCol(code), boot.orderBy("idx","asc"));
  unsubMatches = boot.onSnapshot(mq, async (qs)=>{
    const arr = [];
    qs.forEach(docu=>{
      arr.push({ id: docu.id, ...docu.data() });
    });
    matchesCache = arr;

    recomputeSubmittedMap();
    recomputePoints();

    renderPlayers(lastPlayers);

    await loadMyPicks();
    renderMatches();

    if(el("btnEnterResults")) el("btnEnterResults").disabled = !isAdmin() || !matchesCache.length;
    if(el("btnEndRound")) el("btnEndRound").disabled = !(isAdmin() && matchesCache.length && allResultsComplete());
  });

  if(!silent) showToast(`W pokoju: ${code}`);
}

// ===== PICKS =====
async function loadMyPicks(){
  try{
    const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
    const snap = await boot.getDoc(ref);
    if(!snap.exists()){
      picksCache = {};
      return;
    }
    const data = snap.data();
    picksCache = data?.picks || {};
  }catch{
    picksCache = {};
  }
}

function allMyPicksFilled(){
  return isCompletePicksObject(picksCache);
}

async function saveAllPicks(){
  if(!currentRoomCode) return;
  if(!matchesCache.length){
    showToast("Brak meczów");
    return;
  }
  if(!allMyPicksFilled()){
    showToast("Uzupełnij wszystkie typy");
    return;
  }

  const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
  await boot.setDoc(ref, {
    uid: userUid,
    nick: getNick(),
    updatedAt: boot.serverTimestamp(),
    picks: picksCache
  }, { merge:true });

  showToast("Zapisano typy ✅");

  recomputeSubmittedMap();
  recomputePoints();
  renderPlayers(lastPlayers);
}

// ===== RENDER =====
function renderPlayers(players){
  const box = el("playersList");
  if(!box) return;
  box.innerHTML = "";

  const adminUid = currentRoom?.adminUid;
  const myOk = iAmSubmitted();
  const resultsOk = allResultsComplete();

  players.forEach(p=>{
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

    // punkty (aktualna kolejka) tylko jak są wyniki kompletne
    if(resultsOk && isCompletePicksObject(picksDocByUid[p.uid])){
      const pts = pointsByUid[p.uid] ?? 0;
      const ptsBadge = document.createElement("div");
      ptsBadge.className = "badge";
      ptsBadge.textContent = `${pts} pkt`;
      right.appendChild(ptsBadge);
    }

    // oko
    const eye = document.createElement("button");
    eye.className = "eyeBtn";
    eye.textContent = "👁";
    eye.title = myOk ? "Podgląd typów" : "Zapisz swoje typy, aby podglądać innych";
    eye.disabled = !myOk;
    eye.onclick = ()=>{
      openPicksPreview(p.uid, p.nick || "—");
    };
    right.appendChild(eye);

    if(p.uid === adminUid){
      const b = document.createElement("div");
      b.className = "badge";
      b.textContent = "ADMIN";
      right.appendChild(b);
    }
    if(p.uid === userUid){
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

function createLogoImg(teamName){
  const slug = normalizeSlug(teamName);
  const img = document.createElement("img");
  img.className = "logo";
  img.alt = teamName;

  img.src = `./logos/${slug}.png`;
  img.onerror = () => {
    if(img.dataset.try === "jpg"){ img.style.display="none"; return; }
    img.dataset.try = "jpg";
    img.src = `./logos/${slug}.jpg`;
  };
  return img;
}

function renderMatches(){
  const list = el("matchesList");
  if(!list) return;
  list.innerHTML = "";

  el("matchesCount").textContent = String(matchesCache.length || 0);

  if(el("myPointsLabel")){
    if(allResultsComplete() && isCompletePicksObject(picksDocByUid[userUid])){
      el("myPointsLabel").textContent = String(pointsByUid[userUid] ?? 0);
    }else{
      el("myPointsLabel").textContent = "—";
    }
  }

  // end-round enable
  if(el("btnEndRound")) el("btnEndRound").disabled = !(isAdmin() && matchesCache.length && allResultsComplete());

  if(!matchesCache.length){
    const info = document.createElement("div");
    info.className = "sub";
    info.textContent = "Brak aktywnej kolejki. Admin może dodać własną kolejkę.";
    list.appendChild(info);
    updateSaveButtonState();
    return;
  }

  for(const m of matchesCache){
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

    if(Number.isInteger(m.resultH) && Number.isInteger(m.resultA)){
      const rp = document.createElement("div");
      rp.className = "resultPill";
      rp.textContent = `Wynik: ${m.resultH}:${m.resultA}`;
      score.appendChild(rp);
    }

    card.appendChild(leftTeam);
    card.appendChild(score);
    card.appendChild(rightTeam);
    list.appendChild(card);
  }

  updateSaveButtonState();
}

function updateSaveButtonState(){
  const btn = el("btnSaveAll");
  if(!btn) return;
  btn.disabled = !allMyPicksFilled();
}

// ===== PODGLĄD TYPOW (MODAL) =====
function openPicksPreview(uid, nick){
  if(!currentRoomCode) return;

  const picksObj = picksDocByUid[uid] || null;
  const hasPicks = isCompletePicksObject(picksObj);

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "10px";

  const top = document.createElement("div");
  top.className = "row";
  top.style.flexWrap = "wrap";

  const titleChip = document.createElement("div");
  titleChip.className = "chip";
  titleChip.textContent = `Gracz: ${nick}`;

  const roundChip = document.createElement("div");
  roundChip.className = "chip";
  roundChip.textContent = `KOLEJKA ${currentRoundNo}`;

  const ptsChip = document.createElement("div");
  ptsChip.className = "chip";
  if(allResultsComplete() && hasPicks){
    const pts = pointsByUid[uid] ?? 0;
    ptsChip.textContent = `PUNKTY: ${pts}`;
  }else{
    ptsChip.textContent = `PUNKTY: —`;
  }

  top.appendChild(titleChip);
  top.appendChild(roundChip);
  top.appendChild(ptsChip);
  wrap.appendChild(top);

  if(!hasPicks){
    const info = document.createElement("div");
    info.className = "sub";
    info.textContent = "Ten gracz nie ma jeszcze zapisanych typów w tej kolejce.";
    wrap.appendChild(info);
    modalOpen(`Podgląd typów`, wrap);
    return;
  }

  for(const m of matchesCache){
    const row = document.createElement("div");
    row.className = "matchCard";

    const leftTeam = document.createElement("div");
    leftTeam.className = "team";
    leftTeam.appendChild(createLogoImg(m.home));
    const ln = document.createElement("div");
    ln.className = "teamName";
    ln.textContent = m.home || "—";
    leftTeam.appendChild(ln);

    const score = document.createElement("div");
    score.className = "scoreBox";

    const p = picksObj[m.id];
    const pickPill = document.createElement("div");
    pickPill.className = "resultPill";
    pickPill.textContent = `Typ: ${p.h}:${p.a}`;
    score.appendChild(pickPill);

    const resOk = Number.isInteger(m.resultH) && Number.isInteger(m.resultA);
    const dot = document.createElement("span");
    dot.className = "dot " + (resOk ? dotClassFor(p.h,p.a,m.resultH,m.resultA) : "gray");

    const resPill = document.createElement("div");
    resPill.className = "resultPill";
    resPill.textContent = resOk ? `Wynik: ${m.resultH}:${m.resultA}` : "Wynik: —";

    const pts = resOk ? scoreOneMatch(p.h,p.a,m.resultH,m.resultA) : null;
    const ptsPill = document.createElement("div");
    ptsPill.className = "resultPill";
    ptsPill.textContent = (pts === null) ? "pkt: —" : `pkt: ${pts}`;

    score.appendChild(dot);
    score.appendChild(resPill);
    score.appendChild(ptsPill);

    const rightTeam = document.createElement("div");
    rightTeam.className = "team";
    rightTeam.style.justifyContent = "flex-end";
    const rn = document.createElement("div");
    rn.className = "teamName";
    rn.style.textAlign = "right";
    rn.textContent = m.away || "—";
    rightTeam.appendChild(rn);
    rightTeam.appendChild(createLogoImg(m.away));

    row.appendChild(leftTeam);
    row.appendChild(score);
    row.appendChild(rightTeam);

    wrap.appendChild(row);
  }

  modalOpen(`Podgląd typów`, wrap);
}

// ===== RESULTS SCREEN (ADMIN) =====
const resultsDraft = {}; // matchId -> {h,a}

function openResultsScreen(){
  if(!currentRoomCode) return;
  if(!isAdmin()) return;

  el("resRoomName").textContent = currentRoom?.name || "—";
  el("resRound").textContent = `KOLEJKA ${currentRoundNo}`;

  for(const m of matchesCache){
    resultsDraft[m.id] = {
      h: Number.isInteger(m.resultH) ? m.resultH : null,
      a: Number.isInteger(m.resultA) ? m.resultA : null
    };
  }

  renderResultsList();
  showScreen("results");
}

function renderResultsList(){
  const list = el("resultsList");
  if(!list) return;
  list.innerHTML = "";

  for(const m of matchesCache){
    const card = document.createElement("div");
    card.className = "matchCard";

    const leftTeam = document.createElement("div");
    leftTeam.className = "team";
    leftTeam.appendChild(createLogoImg(m.home));
    const lName = document.createElement("div");
    lName.className = "teamName";
    lName.textContent = m.home || "—";
    leftTeam.appendChild(lName);

    const rightTeam = document.createElement("div");
    rightTeam.className = "team";
    rightTeam.style.justifyContent = "flex-end";
    const rName = document.createElement("div");
    rName.className = "teamName";
    rName.style.textAlign = "right";
    rName.textContent = m.away || "—";
    rightTeam.appendChild(rName);
    rightTeam.appendChild(createLogoImg(m.away));

    const score = document.createElement("div");
    score.className = "scoreBox";

    const inpH = document.createElement("input");
    inpH.className = "scoreInput";
    inpH.inputMode = "numeric";
    inpH.placeholder = "0";
    inpH.value = resultsDraft[m.id]?.h ?? "";
    inpH.oninput = () => {
      const v = clampInt(inpH.value, 0, 20);
      resultsDraft[m.id].h = v;
    };

    const sep = document.createElement("div");
    sep.className = "sep";
    sep.textContent = ":";

    const inpA = document.createElement("input");
    inpA.className = "scoreInput";
    inpA.inputMode = "numeric";
    inpA.placeholder = "0";
    inpA.value = resultsDraft[m.id]?.a ?? "";
    inpA.oninput = () => {
      const v = clampInt(inpA.value, 0, 20);
      resultsDraft[m.id].a = v;
    };

    score.appendChild(inpH);
    score.appendChild(sep);
    score.appendChild(inpA);

    card.appendChild(leftTeam);
    card.appendChild(score);
    card.appendChild(rightTeam);

    list.appendChild(card);
  }
}

async function saveResults(){
  if(!currentRoomCode) return;
  if(!isAdmin()) { showToast("Tylko admin"); return; }
  if(!matchesCache.length) { showToast("Brak meczów"); return; }

  for(const m of matchesCache){
    const d = resultsDraft[m.id];
    if(!d || !Number.isInteger(d.h) || !Number.isInteger(d.a)){
      showToast("Uzupełnij wszystkie wyniki (0–20)");
      return;
    }
  }

  const b = boot.writeBatch(db);
  for(const m of matchesCache){
    const d = resultsDraft[m.id];
    const ref = boot.doc(db, "rooms", currentRoomCode, "matches", m.id);
    b.update(ref, {
      resultH: d.h,
      resultA: d.a,
      resultAt: boot.serverTimestamp(),
      resultBy: userUid
    });
  }

  await b.commit();

  recomputePoints();
  renderPlayers(lastPlayers);
  renderMatches();

  showToast("Zapisano wyniki ✅");
  showScreen("room");
}

// ===== ARCHIWUM KOLEJEK (HISTORIA) =====
async function endRoundConfirmAndArchive(){
  if(!currentRoomCode) return;
  if(!isAdmin()) { showToast("Tylko admin"); return; }
  if(!matchesCache.length){ showToast("Brak meczów"); return; }
  if(!allResultsComplete()){ showToast("Najpierw wpisz komplet wyników"); return; }

  const ok = confirm(`Zakończyć KOLEJKĘ ${currentRoundNo} i zapisać do historii?\n\nPo zakończeniu: mecze/typy tej kolejki zostaną zarchiwizowane, a aplikacja przejdzie do KOLEJKI ${currentRoundNo+1}.`);
  if(!ok) return;

  await archiveCurrentRound();
}

async function archiveCurrentRound(){
  const code = currentRoomCode;
  const roundNo = currentRoundNo;

  // 1) pobierz wszystkie typy z /picks
  const picksSnap = await boot.getDocs(picksCol(code));
  const picksByUid = {};
  const nickByUid = {};
  picksSnap.forEach(d=>{
    const data = d.data();
    picksByUid[d.id] = data?.picks || {};
    if(data?.nick) nickByUid[d.id] = data.nick;
  });

  // 2) zbuduj listę meczów do archiwum
  const matches = matchesCache.map(m=>({
    id: m.id,
    idx: Number.isInteger(m.idx) ? m.idx : 0,
    home: m.home || "",
    away: m.away || "",
    resultH: m.resultH,
    resultA: m.resultA
  }));

  // 3) policz punkty dla każdego uid, który ma komplet typów
  const pointsMap = {};
  const playedMap = {};
  for(const [uid, picksObj] of Object.entries(picksByUid)){
    // komplet = ma wszystkie typy
    let complete = true;
    for(const m of matchesCache){
      const p = picksObj?.[m.id];
      if(!p || !Number.isInteger(p.h) || !Number.isInteger(p.a)){ complete = false; break; }
    }
    if(!complete) continue;

    let sum = 0;
    for(const m of matchesCache){
      const p = picksObj[m.id];
      sum += scoreOneMatch(p.h, p.a, m.resultH, m.resultA) ?? 0;
    }
    pointsMap[uid] = sum;
    playedMap[uid] = true;
  }

  // 4) zapis do archiwum + aktualizacja ligi + czyszczenie bieżącej kolejki
  const b = boot.writeBatch(db);

  // round doc
  const rd = roundDocRef(code, roundNo);
  b.set(rd, {
    roundNo,
    roomCode: code,
    roomName: currentRoom?.name || "",
    createdAt: boot.serverTimestamp(),
    closedAt: boot.serverTimestamp(),
    closedBy: userUid,
    matchesCount: matches.length,
    matches,
    picksByUid,     // archiwum typów
    pointsByUid: pointsMap,
    nickByUid
  }, { merge:false });

  // update league totals (increment)
  for(const [uid, pts] of Object.entries(pointsMap)){
    const nick = nickByUid[uid] || (lastPlayers.find(p=>p.uid===uid)?.nick) || "—";
    const ld = leagueDocRef(code, uid);
    b.set(ld, {
      uid,
      nick,
      totalPoints: boot.increment(pts),
      roundsPlayed: boot.increment(1),
      updatedAt: boot.serverTimestamp()
    }, { merge:true });
  }

  // update room -> next round
  b.update(roomRef(code), {
    currentRoundNo: roundNo + 1,
    updatedAt: boot.serverTimestamp()
  });

  // delete current matches & picks (czyścimy na nową kolejkę)
  for(const m of matchesCache){
    b.delete(boot.doc(db, "rooms", code, "matches", m.id));
  }
  picksSnap.forEach(d=>{
    b.delete(boot.doc(db, "rooms", code, "picks", d.id));
  });

  await b.commit();

  // UI reset (zostanie też odświeżone snapshotami)
  showToast(`Zakończono KOLEJKĘ ${roundNo} ✅`);
}

// ===== TEST QUEUE =====
async function addTestQueue(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }

  const sample = [
    ["Jagiellonia","Piast"],
    ["Lechia","Legia"],
    ["Wisla Plock","Radomiak"],
    ["GKS Katowice","Gornik"],
    ["Arka","Cracovia"],
    ["Lech","Pogon"],
    ["Motor","Rakow"],
    ["Korona","Widzew"],
    ["Slask","Zaglebie"],
    ["Stal Mielec","Puszcza"]
  ];

  const b = boot.writeBatch(db);
  sample.forEach((pair, idx)=>{
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

// ===== LEAGUE (prawdziwa) =====
const leagueState = {
  roomCode: null,
  roomName: null,
  afterRound: 0,
  rows: []
};

async function openLeagueTable(roomCode, opts={}) {
  const { silent=false } = opts;
  roomCode = (roomCode||"").trim().toUpperCase();
  if(roomCode.length !== 6){
    showToast("Brak pokoju");
    return;
  }

  try{
    const snap = await boot.getDoc(roomRef(roomCode));
    if(!snap.exists()){
      showToast("Pokój nie istnieje");
      return;
    }
    const room = snap.data();
    leagueState.roomCode = roomCode;
    leagueState.roomName = room?.name || "—";
    leagueState.afterRound = (room?.currentRoundNo ? Math.max(0, room.currentRoundNo - 1) : 0);

    el("leagueRoomName").textContent = leagueState.roomName;
    el("leagueAfterRound").textContent = String(leagueState.afterRound);

    // Pobierz ranking z /league
    const q = boot.query(leagueCol(roomCode), boot.orderBy("totalPoints","desc"));
    const qs = await boot.getDocs(q);

    const arr = [];
    qs.forEach(d=>{
      const x = d.data();
      arr.push({
        uid: x.uid || d.id,
        nick: x.nick || "—",
        rounds: Number.isInteger(x.roundsPlayed) ? x.roundsPlayed : (x.roundsPlayed ?? 0),
        points: Number.isInteger(x.totalPoints) ? x.totalPoints : (x.totalPoints ?? 0)
      });
    });

    leagueState.rows = arr;
    renderLeagueTable();
    showScreen("league");
    if(!silent) showToast("Tabela ligi");
  }catch(e){
    console.error(e);
    showToast("Nie udało się otworzyć tabeli");
  }
}

function renderLeagueTable(){
  const body = el("leagueBody");
  if(!body) return;
  body.innerHTML = "";

  const rows = [...leagueState.rows];
  rows.sort((a,b)=>{
    if(b.points !== a.points) return b.points - a.points;
    return String(a.nick).localeCompare(String(b.nick), "pl");
  });

  if(!rows.length){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="color:rgba(255,255,255,.75)">Brak danych…</td>`;
    body.appendChild(tr);
    return;
  }

  rows.forEach((r, idx)=>{
    const tr = document.createElement("tr");
    tr.className = "linkRow";
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(r.nick)}${(r.uid===userUid) ? " (TY)" : ""}</td>
      <td>${r.rounds}</td>
      <td>${r.points}</td>
    `;
    tr.onclick = ()=> openPlayerStatsFromLeague(r.uid, r.nick);
    body.appendChild(tr);
  });
}

// ===== STATYSTYKI GRACZA (MODAL) =====
async function openPlayerStatsFromLeague(uid, nick){
  if(!leagueState.roomCode) return;

  const code = leagueState.roomCode;

  // pobierz archiwalne kolejki (rounds) i wyświetl punkty gracza
  const q = boot.query(roundsCol(code), boot.orderBy("roundNo","desc"));
  const qs = await boot.getDocs(q);

  const wrap = document.createElement("div");
  wrap.style.display="flex";
  wrap.style.flexDirection="column";
  wrap.style.gap="10px";

  const head = document.createElement("div");
  head.className="row";
  head.style.flexWrap="wrap";
  head.appendChild(chip(`Pokój: ${leagueState.roomName}`));
  head.appendChild(chip(`Gracz: ${nick}`));
  wrap.appendChild(head);

  if(qs.empty){
    const info = document.createElement("div");
    info.className="sub";
    info.textContent="Brak zakończonych kolejek w historii.";
    wrap.appendChild(info);
    modalOpen("Statystyki gracza", wrap);
    return;
  }

  qs.forEach(d=>{
    const rd = d.data();
    const rn = rd.roundNo ?? 0;
    const pts = rd?.pointsByUid?.[uid];
    const played = (pts !== undefined && pts !== null);

    const row = document.createElement("div");
    row.className="matchCard";
    row.style.justifyContent="space-between";

    const left = document.createElement("div");
    left.style.display="flex";
    left.style.flexDirection="column";
    left.style.gap="4px";
    left.innerHTML = `<div style="font-weight:1000">KOLEJKA ${rn}</div>
                      <div class="sub">${played ? "Zagrana" : "Brak typów / niepełne"}</div>`;

    const right = document.createElement("div");
    right.className="row";

    const ptsChip = document.createElement("div");
    ptsChip.className="chip";
    ptsChip.textContent = `Punkty: ${played ? pts : "—"}`;

    const btn = document.createElement("button");
    btn.className="btn btnSmall";
    btn.textContent="Podgląd";
    btn.disabled = !played;
    btn.onclick = async ()=>{
      await openArchivedPicksPreview(code, rn, uid, nick);
    };

    right.appendChild(ptsChip);
    right.appendChild(btn);

    row.appendChild(left);
    row.appendChild(right);
    wrap.appendChild(row);
  });

  modalOpen("Statystyki gracza", wrap);
}

async function openArchivedPicksPreview(code, roundNo, uid, nick){
  const rd = await boot.getDoc(roundDocRef(code, roundNo));
  if(!rd.exists()){ showToast("Brak archiwum tej kolejki"); return; }
  const data = rd.data();

  const matches = data.matches || [];
  const picksByUid = data.picksByUid || {};
  const picksObj = picksByUid[uid] || null;

  const wrap = document.createElement("div");
  wrap.style.display="flex";
  wrap.style.flexDirection="column";
  wrap.style.gap="10px";

  const top = document.createElement("div");
  top.className="row";
  top.style.flexWrap="wrap";
  top.appendChild(chip(`Gracz: ${nick}`));
  top.appendChild(chip(`KOLEJKA ${roundNo}`));
  const pts = data?.pointsByUid?.[uid];
  top.appendChild(chip(`PUNKTY: ${pts ?? "—"}`));
  wrap.appendChild(top);

  if(!picksObj){
    const info = document.createElement("div");
    info.className="sub";
    info.textContent="Brak zapisanych typów w tej kolejce.";
    wrap.appendChild(info);
    modalOpen("Podgląd (archiwum)", wrap);
    return;
  }

  for(const m of matches){
    const row = document.createElement("div");
    row.className="matchCard";

    const leftTeam = document.createElement("div");
    leftTeam.className="team";
    leftTeam.appendChild(createLogoImg(m.home));
    const ln = document.createElement("div");
    ln.className="teamName";
    ln.textContent = m.home;
    leftTeam.appendChild(ln);

    const score = document.createElement("div");
    score.className="scoreBox";

    const p = picksObj[m.id];
    const pickPill = document.createElement("div");
    pickPill.className="resultPill";
    pickPill.textContent = p ? `Typ: ${p.h}:${p.a}` : "Typ: —";
    score.appendChild(pickPill);

    const resOk = Number.isInteger(m.resultH) && Number.isInteger(m.resultA) && p;
    const dot = document.createElement("span");
    dot.className = "dot " + (resOk ? dotClassFor(p.h,p.a,m.resultH,m.resultA) : "gray");

    const resPill = document.createElement("div");
    resPill.className="resultPill";
    resPill.textContent = `Wynik: ${m.resultH}:${m.resultA}`;

    const ptsOne = resOk ? scoreOneMatch(p.h,p.a,m.resultH,m.resultA) : null;
    const ptsPill = document.createElement("div");
    ptsPill.className="resultPill";
    ptsPill.textContent = (ptsOne===null) ? "pkt: —" : `pkt: ${ptsOne}`;

    score.appendChild(dot);
    score.appendChild(resPill);
    score.appendChild(ptsPill);

    const rightTeam = document.createElement("div");
    rightTeam.className="team";
    rightTeam.style.justifyContent="flex-end";
    const rn = document.createElement("div");
    rn.className="teamName";
    rn.style.textAlign="right";
    rn.textContent = m.away;
    rightTeam.appendChild(rn);
    rightTeam.appendChild(createLogoImg(m.away));

    row.appendChild(leftTeam);
    row.appendChild(score);
    row.appendChild(rightTeam);
    wrap.appendChild(row);
  }

  modalOpen("Podgląd (archiwum)", wrap);
}

function chip(text){
  const d = document.createElement("div");
  d.className="chip";
  d.textContent = text;
  return d;
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ===== START =====
(async()=>{
  try{
    setBg(BG_HOME);
    setFooter(`BUILD ${BUILD}`);
    setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

    await initFirebase();
    bindUI();

    if(getNick()) refreshNickLabels();

    showScreen("home");
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
