const BUILD = 1230;

// tło aplikacji (za ramką)
const BG_TLO = "img_tlo.png";

// ekran menu to obraz img_menu_pc.png (w index.html jako <img>)
const KEY_NICK = "typer_nick_v3";
const KEY_ACTIVE_ROOM = "typer_active_room_v3";

const firebaseConfig = {
  apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
  authDomain: "typer-b3087.firebaseapp.com",
  projectId: "typer-b3087",
  storageBucket: "typer-b3087.firebasestorage.app",
  messagingSenderId: "1032303131493",
  appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
  measurementId: "G-5FBDH5G15N"
};

// ====== LIGI (jak chciałeś) ======
const LEAGUES = [
  "hiszpańska Laliga",
  "holenderskia eredivisie",
  "niemiecka bundesliga",
  "angielska premieship",
  "włoska Serie A",
  "francuska Ligue 1",
  "Polska ekstraklasa",
  "liga mistrzów",
  "liga europy",
  "liga konferencji",
  "puchar holandii",
  "puchar polski",
  "puchar hiszpanii",
  "puchar anglii",
  "puchar włoch"
];

// ====== BAZA MECZÓW (TESTOWA) ======
// To jest tylko “lokalna baza”, żeby działało wybieranie.
// Później podepniemy API i będzie brało prawdziwe mecze.
const FIXTURES = {
  "hiszpańska Laliga": [
    ["Real Madrid","Barcelona"],["Atletico","Sevilla"],["Valencia","Villarreal"],["Betis","Sociedad"],
    ["Athletic","Girona"],["Getafe","Osasuna"],["Celta","Mallorca"],["Alaves","Las Palmas"]
  ],
  "holenderskia eredivisie": [
    ["Ajax","PSV"],["Feyenoord","AZ"],["Twente","Utrecht"],["Heerenveen","Sparta"],
    ["NEC","Groningen"],["Go Ahead","Heracles"],["Fortuna","Willem II"]
  ],
  "niemiecka bundesliga": [
    ["Bayern","Dortmund"],["Leipzig","Leverkusen"],["Frankfurt","Wolfsburg"],["Stuttgart","Hoffenheim"],
    ["Union","Freiburg"],["Mainz","Bremen"]
  ],
  "angielska premieship": [
    ["Liverpool","Manchester City"],["Arsenal","Chelsea"],["Manchester Utd","Tottenham"],["Newcastle","Aston Villa"],
    ["Everton","West Ham"],["Brighton","Brentford"]
  ],
  "włoska Serie A": [
    ["Inter","Milan"],["Juventus","Napoli"],["Roma","Lazio"],["Atalanta","Fiorentina"],
    ["Bologna","Torino"]
  ],
  "francuska Ligue 1": [
    ["PSG","Marseille"],["Lyon","Monaco"],["Lille","Rennes"],["Nice","Lens"],
    ["Nantes","Toulouse"]
  ],
  "Polska ekstraklasa": [
    ["Jagiellonia","Piast"],["Lechia","Legia"],["Wisla Plock","Radomiak"],["GKS Katowice","Gornik"],
    ["Arka","Cracovia"],["Lech","Pogon"],["Motor","Rakow"],["Korona","Widzew"],
    ["Slask","Zaglebie"],["Stal Mielec","Puszcza"],["Gornik","Legia"],["Rakow","Lech"]
  ],
  "liga mistrzów": [
    ["Real Madrid","Bayern"],["Barcelona","PSG"],["Manchester City","Inter"],["Liverpool","Dortmund"]
  ],
  "liga europy": [
    ["Roma","Ajax"],["Leverkusen","Lyon"],["Sevilla","West Ham"],["Marseille","Fenerbahce"]
  ],
  "liga konferencji": [
    ["Aston Villa","Fiorentina"],["AZ","Betis"],["Legia","Basel"],["Nice","Braga"]
  ],
  "puchar holandii": [
    ["Ajax","PSV"],["Feyenoord","Twente"],["AZ","Utrecht"]
  ],
  "puchar polski": [
    ["Lech","Legia"],["Rakow","Gornik"],["Jagiellonia","Pogon"],["Widzew","Cracovia"]
  ],
  "puchar hiszpanii": [
    ["Real Madrid","Sevilla"],["Barcelona","Atletico"],["Valencia","Betis"]
  ],
  "puchar anglii": [
    ["Arsenal","Liverpool"],["Manchester City","Chelsea"],["Tottenham","Newcastle"]
  ],
  "puchar włoch": [
    ["Inter","Juventus"],["Milan","Napoli"],["Roma","Atalanta"]
  ]
};

// ---------- helpers ----------
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
  ["splash","mainMenu","rooms","room"].forEach(s=>{
    const node = el(s);
    if (node) node.classList.toggle("active", s===id);
  });
}
function setSplash(msg){
  const h = el("splashHint");
  if (h) h.textContent = msg;
  console.log(msg);
}

function normalizeSlug(s){
  return (s||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g,"l")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function genCode6(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function clampInt(v, min, max){
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(String(v),10);
  if (Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
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
  return nick;
}
function refreshNickLabels(){
  const nick = getNick() || "—";
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
  if (el("nickLabelRoom")) el("nickLabelRoom").textContent = nick;
}
function clearSavedRoom(){
  localStorage.removeItem(KEY_ACTIVE_ROOM);
}

// ---------- Firebase ----------
let app, auth, db;
let userUid = null;
let fs = {};

let unsubRoomDoc = null;
let unsubPlayers = null;
let unsubMatches = null;
let unsubPicks = null;

let currentRoomCode = null;
let currentRoom = null;

let activeRoundId = null;
let activeRoundNo = 0;

let matchesCache = [];      // matches for active round
let picksCache = {};        // my picks map matchId-> {h,a}
let picksDocByUid = {};     // uid -> picks map
let submittedByUid = {};    // uid -> boolean
let lastPlayers = [];

// ---------- Firestore paths ----------
function roomRef(code){ return fs.doc(db, "rooms", code); }
function playersCol(code){ return fs.collection(db, "rooms", code, "players"); }
function roundsCol(code){ return fs.collection(db, "rooms", code, "rounds"); }
function roundRef(code, roundId){ return fs.doc(db, "rooms", code, "rounds", roundId); }
function matchesCol(code, roundId){ return fs.collection(db, "rooms", code, "rounds", roundId, "matches"); }
function picksCol(code, roundId){ return fs.collection(db, "rooms", code, "rounds", roundId, "picks"); }
function myPickRef(code, roundId){ return fs.doc(db, "rooms", code, "rounds", roundId, "picks", userUid); }

// ---------- status helpers ----------
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

// ---------- dots (green/yellow/red) ----------
function outcomeSign(h, a){
  if(!Number.isInteger(h) || !Number.isInteger(a)) return null;
  if(h > a) return 1;
  if(h < a) return -1;
  return 0;
}
function comparePickToResult(match){
  const p = picksCache?.[match.id];
  if(!p || !Number.isInteger(p.h) || !Number.isInteger(p.a)) return null;

  const hasRes = Number.isInteger(match.resultH) && Number.isInteger(match.resultA);
  if(!hasRes) return null;

  if(p.h === match.resultH && p.a === match.resultA) return "green";

  const ps = outcomeSign(p.h, p.a);
  const rs = outcomeSign(match.resultH, match.resultA);
  if(ps !== null && rs !== null && ps === rs) return "yellow";

  return "red";
}
function applyDotState(dotEl, state, hasResult){
  dotEl.classList.remove("dotGreen","dotYellow","dotRed","dotNeutral");
  if(state === "green"){
    dotEl.classList.add("dotGreen");
    dotEl.title = "Trafione dokładnie";
  } else if(state === "yellow"){
    dotEl.classList.add("dotYellow");
    dotEl.title = "Trafione rozstrzygnięcie (1X2)";
  } else if(state === "red"){
    dotEl.classList.add("dotRed");
    dotEl.title = "Nietrafione";
  } else {
    dotEl.classList.add("dotNeutral");
    dotEl.title = hasResult ? "Brak typu / niepełny typ" : "Brak wyniku";
  }
}

// ---------- room state ----------
function isAdmin(){
  return currentRoom && currentRoom.adminUid === userUid;
}
function isQueueLocked(){
  return !!currentRoom?.queueLocked;
}
function refreshQueueLabel(){
  const node = el("queueLabel");
  if(!node) return;
  if(activeRoundNo > 0) node.textContent = `KOLEJKA ${activeRoundNo}`;
  else node.textContent = "—";
}
function applyAdminButtonsState(){
  const admin = isAdmin();
  const locked = isQueueLocked();

  const btnCustom = el("btnCustomQueue");
  const btnResults = el("btnEnterResults");
  const btnFinish = el("btnFinishQueue");

  if(btnCustom) btnCustom.style.display = admin ? "block" : "none";
  if(btnResults) btnResults.style.display = admin ? "block" : "none";
  if(btnFinish) btnFinish.style.display = admin ? "block" : "none";

  if(admin){
    if(btnCustom) btnCustom.disabled = locked;      // dodawanie tylko gdy nie ma kolejki
    if(btnResults) btnResults.disabled = !locked;   // wyniki tylko gdy kolejka jest ustawiona
    if(btnFinish) btnFinish.disabled = !locked;     // zakończyć tylko gdy jest kolejka
  }
}

// ---------- modals ----------
function openModal(id){ const m = el(id); if(m) m.style.display = "flex"; }
function closeModal(id){ const m = el(id); if(m) m.style.display = "none"; }

// ---------- boot ----------
async function boot(){
  setBg(BG_TLO);
  setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const {
    getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, query, orderBy, onSnapshot,
    writeBatch, deleteDoc
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  fs = { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot, writeBatch, deleteDoc };

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

  setFooter(`BUILD ${BUILD}`);
  bindUI();
  await ensureNick();
  refreshNickLabels();

  // start z menu obrazkowego
  showScreen("mainMenu");
}

// ---------- UI binding ----------
function bindUI(){
  // MAIN MENU image buttons
  el("btnMenuRooms").onclick = async ()=>{
    await ensureNick();
    refreshNickLabels();

    // Jeżeli mamy zapisany aktywny pokój i on istnieje → wchodzimy od razu do pokoju
    // (to jest “uproszczenie klików” – jak chcesz, dodamy ładne okno “Witaj ponownie”)
    const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
    if(saved && saved.length === 6){
      try{
        const snap = await fs.getDoc(roomRef(saved));
        if(snap.exists()){
          await joinRoom(saved, { silentJoin:true }); // w razie gdy nie ma gracza w players
          return;
        } else {
          clearSavedRoom();
        }
      }catch{}
    }

    showScreen("rooms");
    el("debugRooms").textContent = "—";
  };
  el("btnMenuStats").onclick = ()=> showToast("Statystyki – dodamy w kolejnym kroku");
  el("btnMenuExit").onclick = ()=> showToast("Wyjście – w PWA zamknij kartę / aplikację");

  // ROOMS
  el("btnBackMain").onclick = ()=> showScreen("mainMenu");
  el("btnChangeNickRooms").onclick = async ()=>{
    localStorage.removeItem(KEY_NICK);
    await ensureNick();
    refreshNickLabels();
    showToast("Zmieniono nick");
  };
  el("btnCreateRoom").onclick = async ()=>{
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){
      showToast("Podaj nazwę pokoju");
      return;
    }
    await createRoom(name);
  };
  el("btnJoinRoom").onclick = async ()=>{
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){
      showToast("Kod musi mieć 6 znaków");
      return;
    }
    await joinRoom(code);
  };

  // ROOM
  el("btnBackFromRoom").onclick = ()=> showScreen("rooms");
  el("btnCopyCode").onclick = async ()=>{
    if(!currentRoomCode) return;
    try{
      await navigator.clipboard.writeText(currentRoomCode);
      showToast("Skopiowano kod");
    }catch{
      showToast("Nie udało się skopiować");
    }
  };
  el("btnLeave").onclick = async ()=>{ await leaveRoom(); };
  el("btnRefresh").onclick = async ()=>{ if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true}); };
  el("btnSaveAll").onclick = async ()=>{ await saveAllPicks(); };

  // ADMIN actions
  el("btnCustomQueue").onclick = async ()=>{ await openCustomQueue(); };
  el("btnEnterResults").onclick = async ()=>{ await openResultsModal(); };
  el("btnFinishQueue").onclick = async ()=>{ await finishQueue(); };

  // CUSTOM MODAL
  el("btnCloseCustom").onclick = ()=> closeModal("modalCustom");
  el("btnClearCustom").onclick = ()=> customSelectionClear();
  el("btnConfirm10").onclick = async ()=>{ await customSelectionSave(); };

  // RESULTS MODAL
  el("btnCloseResults").onclick = ()=> closeModal("modalResults");
  el("btnSaveResults").onclick = async ()=>{ await saveResults(); };
}

// ---------- Rooms logic ----------
async function createRoom(roomName){
  const nick = getNick();
  el("debugRooms").textContent = "Tworzę pokój…";

  for(let tries=0; tries<12; tries++){
    const code = genCode6();
    const ref = roomRef(code);
    const snap = await fs.getDoc(ref);
    if(snap.exists()) continue;

    await fs.setDoc(ref, {
      name: roomName,
      adminUid: userUid,
      adminNick: nick,
      queueLocked: false,
      activeRoundId: null,
      activeRoundNo: 0,
      createdAt: fs.serverTimestamp()
    });

    await fs.setDoc(fs.doc(db, "rooms", code, "players", userUid), {
      nick, uid: userUid, joinedAt: fs.serverTimestamp()
    });

    localStorage.setItem(KEY_ACTIVE_ROOM, code);
    el("debugRooms").textContent = `Utworzono pokój ${code}`;
    await openRoom(code);
    return;
  }
  el("debugRooms").textContent = "Nie udało się wygenerować wolnego kodu.";
}

async function joinRoom(code, opts={}){
  const { silentJoin=false } = opts;
  const nick = getNick();
  el("debugRooms").textContent = silentJoin ? "Wchodzę…" : "Dołączam…";

  const ref = roomRef(code);
  const snap = await fs.getDoc(ref);
  if(!snap.exists()){
    el("debugRooms").textContent = "Nie ma takiego pokoju.";
    showToast("Nie ma takiego pokoju");
    return;
  }

  await fs.setDoc(fs.doc(db, "rooms", code, "players", userUid), {
    nick, uid: userUid, joinedAt: fs.serverTimestamp()
  }, { merge:true });

  localStorage.setItem(KEY_ACTIVE_ROOM, code);
  if(!silentJoin) el("debugRooms").textContent = `Dołączono do ${code}`;
  await openRoom(code);
}

async function leaveRoom(){
  if(!currentRoomCode) return;
  try{
    await fs.deleteDoc(fs.doc(db, "rooms", currentRoomCode, "players", userUid));
  }catch{}

  localStorage.removeItem(KEY_ACTIVE_ROOM);
  cleanupRoomListeners();

  currentRoomCode = null;
  currentRoom = null;

  activeRoundId = null;
  activeRoundNo = 0;

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

function cleanupRoomListeners(){
  if(unsubRoomDoc){ unsubRoomDoc(); unsubRoomDoc=null; }
  if(unsubPlayers){ unsubPlayers(); unsubPlayers=null; }
  if(unsubMatches){ unsubMatches(); unsubMatches=null; }
  if(unsubPicks){ unsubPicks(); unsubPicks=null; }
}

// ---------- Open room + live ----------
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

  // reset view
  activeRoundId = null;
  activeRoundNo = 0;
  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  lastPlayers = [];
  renderMatches();
  renderPlayers([]);
  refreshQueueLabel();

  // load room
  const ref = roomRef(code);
  const snap = await fs.getDoc(ref);
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  applyAdminButtonsState();

  // room live
  unsubRoomDoc = fs.onSnapshot(ref, async(d)=>{
    if(!d.exists()) return;
    const prevRound = activeRoundId;
    currentRoom = d.data();

    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";

    applyAdminButtonsState();

    activeRoundId = currentRoom.activeRoundId || null;
    activeRoundNo = currentRoom.activeRoundNo || 0;
    refreshQueueLabel();

    // jeżeli zmieniła się aktywna kolejka → przepnij suby
    if(prevRound !== activeRoundId){
      await attachRoundListeners();
    }
  });

  // players live
  const pq = fs.query(playersCol(code), fs.orderBy("joinedAt","asc"));
  unsubPlayers = fs.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  // set active round and attach listeners
  activeRoundId = currentRoom.activeRoundId || null;
  activeRoundNo = currentRoom.activeRoundNo || 0;
  refreshQueueLabel();
  await attachRoundListeners();

  if(!silent) showToast(`W pokoju: ${code}`);
}

async function attachRoundListeners(){
  // clear old
  if(unsubMatches){ unsubMatches(); unsubMatches=null; }
  if(unsubPicks){ unsubPicks(); unsubPicks=null; }

  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  renderMatches();

  if(!activeRoundId){
    renderMatches();
    updateSaveButtonState();
    renderPlayers(lastPlayers);
    return;
  }

  // matches live
  const mq = fs.query(matchesCol(currentRoomCode, activeRoundId), fs.orderBy("idx","asc"));
  unsubMatches = fs.onSnapshot(mq, async(qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push({ id: docu.id, ...docu.data() }));
    matchesCache = arr;
    await loadMyPicks();
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
    renderMatches();
  });

  // picks live (status)
  unsubPicks = fs.onSnapshot(picksCol(currentRoomCode, activeRoundId), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });
}

// ---------- Picks ----------
async function loadMyPicks(){
  if(!activeRoundId){
    picksCache = {};
    return;
  }
  try{
    const snap = await fs.getDoc(myPickRef(currentRoomCode, activeRoundId));
    if(!snap.exists()){
      picksCache = {};
      return;
    }
    picksCache = snap.data()?.picks || {};
  }catch{
    picksCache = {};
  }
}
function allMyPicksFilled(){
  return isCompletePicksObject(picksCache);
}
async function saveAllPicks(){
  if(!activeRoundId){
    showToast("Brak aktywnej kolejki");
    return;
  }
  if(!matchesCache.length){
    showToast("Brak meczów");
    return;
  }
  if(!allMyPicksFilled()){
    showToast("Uzupełnij wszystkie typy");
    return;
  }
  await fs.setDoc(myPickRef(currentRoomCode, activeRoundId), {
    uid: userUid,
    nick: getNick(),
    updatedAt: fs.serverTimestamp(),
    picks: picksCache
  }, { merge:true });

  showToast("Zapisano typy ✅");
}

// ---------- Render ----------
function renderPlayers(players){
  const box = el("playersList");
  if(!box) return;
  box.innerHTML = "";

  const adminUid = currentRoom?.adminUid;

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

  if(!activeRoundId){
    const empty = document.createElement("div");
    empty.className = "sub";
    empty.style.padding = "10px";
    empty.textContent = isAdmin()
      ? "Brak aktywnej kolejki. Admin może dodać własną kolejkę."
      : "Brak aktywnej kolejki. Poczekaj aż admin doda mecze.";
    list.appendChild(empty);
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
      renderMatches();
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
      renderMatches();
    };

    score.appendChild(inpH);
    score.appendChild(sep);
    score.appendChild(inpA);

    // wynik + kropka
    const resBox = document.createElement("div");
    resBox.className = "miniResult";

    const dot = document.createElement("div");
    dot.className = "dot dotNeutral";

    const hasRes = Number.isInteger(m.resultH) && Number.isInteger(m.resultA);
    const label = document.createElement("div");
    label.textContent = hasRes ? `Wynik: ${m.resultH}:${m.resultA}` : "Wynik: —";

    const state = comparePickToResult(m);
    applyDotState(dot, state, hasRes);

    resBox.appendChild(dot);
    resBox.appendChild(label);

    card.appendChild(leftTeam);
    card.appendChild(score);
    card.appendChild(resBox);
    card.appendChild(rightTeam);

    list.appendChild(card);
  }

  updateSaveButtonState();
}

function updateSaveButtonState(){
  const btn = el("btnSaveAll");
  if(!btn) return;
  btn.disabled = !activeRoundId || !allMyPicksFilled();
}

// ---------- ADMIN: Custom Queue ----------
let customSelected = []; // [{home,away,league}]
function customSelectionClear(){
  customSelected = [];
  renderCustomList();
}
function fillLeagueSelect(){
  const s = el("selLeague");
  s.innerHTML = "";
  LEAGUES.forEach(l=>{
    const o = document.createElement("option");
    o.value = l;
    o.textContent = l;
    s.appendChild(o);
  });
  s.onchange = ()=> renderCustomList();
}
function renderCustomList(){
  el("customCount").textContent = String(customSelected.length);
  el("btnConfirm10").disabled = customSelected.length !== 10;

  const league = el("selLeague").value;
  const fixtures = FIXTURES[league] || [];

  const box = el("customMatchesList");
  box.innerHTML = "";

  fixtures.forEach((pair)=>{
    const home = pair[0], away = pair[1];

    const already = customSelected.some(x=> x.home===home && x.away===away && x.league===league);

    const item = document.createElement("div");
    item.className = "pickItem";

    const left = document.createElement("div");
    left.textContent = `${home} — ${away}`;
    left.style.fontWeight = "1000";

    const btn = document.createElement("button");
    btn.className = "btn btnSmall";
    btn.textContent = already ? "Dodane" : "Dodaj";
    btn.disabled = already || customSelected.length >= 10;
    btn.onclick = ()=>{
      if(customSelected.length >= 10) return;
      customSelected.push({ home, away, league });
      renderCustomList();
    };

    item.appendChild(left);
    item.appendChild(btn);
    box.appendChild(item);
  });

  if(!fixtures.length){
    const t = document.createElement("div");
    t.className = "sub";
    t.textContent = "Brak meczów w bazie testowej dla tej ligi.";
    box.appendChild(t);
  }
}

async function openCustomQueue(){
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(isQueueLocked()){
    showToast("Nie można modyfikować – kolejka trwa (najpierw zakończ).");
    return;
  }
  if(!currentRoomCode) return;

  fillLeagueSelect();
  customSelectionClear();
  openModal("modalCustom");
}

async function customSelectionSave(){
  if(customSelected.length !== 10){
    showToast("Musisz mieć dokładnie 10 meczów");
    return;
  }
  const ok = confirm("Masz 10 pojedynków. Zapisać kolejkę?");
  if(!ok){
    // wraca do ustawiania (modal zostaje)
    return;
  }

  // nowa runda
  const nextNo = (currentRoom?.activeRoundNo || 0) + 1;
  const roundId = `r_${Date.now()}_${genCode6()}`;

  const b = fs.writeBatch(db);

  // round doc
  b.set(roundRef(currentRoomCode, roundId), {
    no: nextNo,
    createdAt: fs.serverTimestamp(),
    createdByUid: userUid,
    createdByNick: getNick()
  });

  // matches
  customSelected.forEach((m, idx)=>{
    const matchId = `m_${Date.now()}_${idx}`;
    const ref = fs.doc(db, "rooms", currentRoomCode, "rounds", roundId, "matches", matchId);
    b.set(ref, {
      idx,
      league: m.league,
      home: m.home,
      away: m.away,
      resultH: null,
      resultA: null,
      createdAt: fs.serverTimestamp()
    });
  });

  // lock + active
  b.set(roomRef(currentRoomCode), {
    queueLocked: true,
    activeRoundId: roundId,
    activeRoundNo: nextNo
  }, { merge:true });

  await b.commit();

  closeModal("modalCustom");
  showToast(`Zapisano KOLEJKĘ ${nextNo} ✅`);
}

// ---------- ADMIN: Results ----------
function renderResultsEditor(){
  const box = el("resultsList");
  box.innerHTML = "";

  matchesCache.forEach((m)=>{
    const row = document.createElement("div");
    row.className = "pickItem";
    row.style.justifyContent = "flex-start";
    row.style.gap = "12px";

    const title = document.createElement("div");
    title.style.flex = "1";
    title.textContent = `${m.home} — ${m.away}`;
    title.style.fontWeight = "1000";

    const inpH = document.createElement("input");
    inpH.style.width = "70px";
    inpH.inputMode = "numeric";
    inpH.placeholder = "0";
    inpH.value = (m.resultH ?? "") === null ? "" : String(m.resultH ?? "");
    inpH.dataset.mid = m.id;
    inpH.dataset.side = "h";

    const sep = document.createElement("div");
    sep.textContent = ":";
    sep.style.fontWeight = "1000";

    const inpA = document.createElement("input");
    inpA.style.width = "70px";
    inpA.inputMode = "numeric";
    inpA.placeholder = "0";
    inpA.value = (m.resultA ?? "") === null ? "" : String(m.resultA ?? "");
    inpA.dataset.mid = m.id;
    inpA.dataset.side = "a";

    row.appendChild(title);
    row.appendChild(inpH);
    row.appendChild(sep);
    row.appendChild(inpA);

    box.appendChild(row);
  });
}

async function openResultsModal(){
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(!isQueueLocked() || !activeRoundId){
    showToast("Brak aktywnej kolejki");
    return;
  }
  openModal("modalResults");
  renderResultsEditor();
}

async function saveResults(){
  if(!isAdmin() || !activeRoundId) return;

  // zbieramy inputy
  const inputs = Array.from(el("resultsList").querySelectorAll("input"));
  const temp = {}; // mid -> {h,a}
  inputs.forEach(inp=>{
    const mid = inp.dataset.mid;
    temp[mid] = temp[mid] || {};
    const v = clampInt(inp.value, 0, 20);
    if(inp.dataset.side === "h") temp[mid].h = v;
    if(inp.dataset.side === "a") temp[mid].a = v;
  });

  // walidacja: wszystkie mecze muszą mieć wynik
  for(const m of matchesCache){
    const t = temp[m.id] || {};
    if(!Number.isInteger(t.h) || !Number.isInteger(t.a)){
      showToast("Uzupełnij wszystkie wyniki (0–20)");
      return;
    }
  }

  const b = fs.writeBatch(db);
  matchesCache.forEach(m=>{
    const t = temp[m.id];
    const ref = fs.doc(db, "rooms", currentRoomCode, "rounds", activeRoundId, "matches", m.id);
    b.set(ref, { resultH: t.h, resultA: t.a, resultsUpdatedAt: fs.serverTimestamp() }, { merge:true });
  });
  await b.commit();

  closeModal("modalResults");
  showToast("Zapisano wyniki ✅");
}

// ---------- ADMIN: Finish Queue ----------
async function finishQueue(){
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(!activeRoundId || !isQueueLocked()){
    showToast("Brak aktywnej kolejki");
    return;
  }
  const ok = confirm("Zakończyć kolejkę? Po zakończeniu będzie można dodać następną.");
  if(!ok) return;

  await fs.setDoc(roomRef(currentRoomCode), {
    queueLocked: false,
    activeRoundId: null,
    activeRoundNo: currentRoom?.activeRoundNo || 0
  }, { merge:true });

  showToast("Kolejka zakończona ✅");
}

// ---------- start ----------
(async()=>{
  try{
    setBg(BG_TLO);
    setSplash(`BUILD ${BUILD}\nŁadowanie…`);
    await boot();
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
