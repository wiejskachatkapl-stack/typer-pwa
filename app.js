const BUILD = 1242;
const BG_TLO = "img_tlo.png";

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
    ["Real Madrid","Sevilla"],["Barcelona","Atalico"],["Valencia","Betis"]
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
  ["splash","mainMenu","rooms","league","room"].forEach(s=>{
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
function getNick(){ return (localStorage.getItem(KEY_NICK) || "").trim(); }
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
function clearSavedRoom(){ localStorage.removeItem(KEY_ACTIVE_ROOM); }

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

let matchesCache = [];
let picksCache = {};
let picksDocByUid = {};
let submittedByUid = {};
let lastPlayers = [];

// ---------- Firestore paths ----------
function roomRef(code){ return fs.doc(db, "rooms", code); }
function playersCol(code){ return fs.collection(db, "rooms", code, "players"); }
function roundsCol(code){ return fs.collection(db, "rooms", code, "rounds"); }
function roundRef(code, roundId){ return fs.doc(db, "rooms", code, "rounds", roundId); }
function matchesCol(code, roundId){ return fs.collection(db, "rooms", code, "rounds", roundId, "matches"); }
function picksCol(code, roundId){ return fs.collection(db, "rooms", code, "rounds", roundId, "picks"); }
function myPickRef(code, roundId){ return fs.doc(db, "rooms", code, "rounds", roundId, "picks", userUid); }
function scoresCol(code, roundId){ return fs.collection(db, "rooms", code, "rounds", roundId, "scores"); }
function scoreRef(code, roundId, uid){ return fs.doc(db, "rooms", code, "rounds", roundId, "scores", uid); }

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
function mySubmitted(){
  return !!submittedByUid[userUid];
}

// ---------- dots + scoring ----------
function outcomeSign(h, a){
  if(!Number.isInteger(h) || !Number.isInteger(a)) return null;
  if(h > a) return 1;
  if(h < a) return -1;
  return 0;
}
function scoreOnePick(pH, pA, rH, rA){
  // 3 pkt dokładnie
  if(pH === rH && pA === rA) return 3;
  // 1 pkt rozstrzygnięcie
  const ps = outcomeSign(pH, pA);
  const rs = outcomeSign(rH, rA);
  if(ps !== null && rs !== null && ps === rs) return 1;
  // 0 pkt
  return 0;
}
function comparePickToResult(match){
  const p = picksCache?.[match.id];
  if(!p || !Number.isInteger(p.h) || !Number.isInteger(p.a)) return null;

  const hasRes = Number.isInteger(match.resultH) && Number.isInteger(match.resultA);
  if(!hasRes) return null;

  const pts = scoreOnePick(p.h, p.a, match.resultH, match.resultA);
  if(pts === 3) return "green";
  if(pts === 1) return "yellow";
  return "red";
}
function applyDotState(dotEl, state, hasResult){
  dotEl.classList.remove("dotGreen","dotYellow","dotRed","dotNeutral");
  if(state === "green"){
    dotEl.classList.add("dotGreen"); dotEl.title="Trafione dokładnie (3 pkt)";
  } else if(state === "yellow"){
    dotEl.classList.add("dotYellow"); dotEl.title="Trafione rozstrzygnięcie (1 pkt)";
  } else if(state === "red"){
    dotEl.classList.add("dotRed"); dotEl.title="Nietrafione (0 pkt)";
  } else {
    dotEl.classList.add("dotNeutral"); dotEl.title = hasResult ? "Brak typu / niepełny typ" : "Brak wyniku";
  }
}

// ---------- room state ----------
function isAdmin(){ return currentRoom && currentRoom.adminUid === userUid; }
function isQueueLocked(){ return !!currentRoom?.queueLocked; }
function refreshQueueLabel(){
  const node = el("queueLabel");
  if(!node) return;
  node.textContent = activeRoundNo > 0 ? `KOLEJKA ${activeRoundNo}` : "—";
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
    if(btnCustom) btnCustom.disabled = locked;
    if(btnResults) btnResults.disabled = !locked;
    if(btnFinish) btnFinish.disabled = !locked;
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
    collection, query, orderBy, onSnapshot, getDocs,
    writeBatch, deleteDoc
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  fs = { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot, getDocs, writeBatch, deleteDoc };

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

  showScreen("mainMenu");
}

// ---------- UI binding ----------
function bindUI(){
  el("btnMenuRooms").onclick = async ()=>{
    await ensureNick();
    refreshNickLabels();

    const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
    if(saved && saved.length === 6){
      try{
        const snap = await fs.getDoc(roomRef(saved));
        if(snap.exists()){
          await joinRoom(saved, { silentJoin:true });
          return;
        } else {
          clearSavedRoom();
        }
      }catch{}
    }
    showScreen("rooms");
    el("debugRooms").textContent = "—";
  };

  el("btnMenuStats").onclick = ()=> showToast("Statystyki – w następnym kroku (tu już jest Liga)");
  el("btnMenuExit").onclick = ()=> showToast("Wyjście – w PWA zamknij kartę / aplikację");

  // NOWE: TABELA LIGI
  el("btnMenuLeague").onclick = async ()=>{
    await ensureNick();
    refreshNickLabels();
    await openLeagueFromMenu();
  };

  el("btnBackMain").onclick = ()=> showScreen("mainMenu");
  el("btnChangeNickRooms").onclick = async ()=>{
    localStorage.removeItem(KEY_NICK);
    await ensureNick();
    refreshNickLabels();
    showToast("Zmieniono nick");
  };
  el("btnCreateRoom").onclick = async ()=>{
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){ showToast("Podaj nazwę pokoju"); return; }
    await createRoom(name);
  };
  el("btnJoinRoom").onclick = async ()=>{
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){ showToast("Kod musi mieć 6 znaków"); return; }
    await joinRoom(code);
  };

  // LEAGUE SCREEN
  el("btnLeagueBack").onclick = ()=> showScreen("mainMenu");
  el("btnLeagueRefresh").onclick = async ()=>{
    if(!currentRoomCode){
      await openLeagueFromMenu();
    }else{
      await loadLeagueTable(currentRoomCode);
    }
  };

  el("btnBackFromRoom").onclick = ()=> showScreen("rooms");
  el("btnCopyCode").onclick = async ()=>{
    if(!currentRoomCode) return;
    try{ await navigator.clipboard.writeText(currentRoomCode); showToast("Skopiowano kod"); }
    catch{ showToast("Nie udało się skopiować"); }
  };
  el("btnLeave").onclick = async ()=>{ await leaveRoom(); };
  el("btnRefresh").onclick = async ()=>{ if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true}); };
  el("btnSaveAll").onclick = async ()=>{ await saveAllPicks(); };

  // admin
  el("btnCustomQueue").onclick = async ()=>{ await openCustomQueue(); };
  el("btnEnterResults").onclick = async ()=>{ await openResultsModal(); };
  el("btnFinishQueue").onclick = async ()=>{ await finishQueue(); };

  // custom modal
  el("btnCloseCustom").onclick = ()=> closeModal("modalCustom");
  el("btnClearCustom").onclick = ()=> customSelectionClear();
  el("btnConfirm10").onclick = async ()=>{ await customSelectionSave(); };

  // results modal
  el("btnCloseResults").onclick = ()=> closeModal("modalResults");
  el("btnSaveResults").onclick = async ()=>{ await saveResultsAndScores(); };

  // peek modal
  el("btnClosePeek").onclick = ()=> closeModal("modalPeek");
}

// ---------- League open ----------
async function openLeagueFromMenu(){
  const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  if(!saved || saved.length !== 6){
    showToast("Najpierw wejdź do pokoju (Pokoje typerów).");
    showScreen("rooms");
    return;
  }

  try{
    const snap = await fs.getDoc(roomRef(saved));
    if(!snap.exists()){
      clearSavedRoom();
      showToast("Nie znaleziono pokoju. Wejdź ponownie.");
      showScreen("rooms");
      return;
    }
    // nie wchodzimy do pokoju – tylko liga
    currentRoomCode = saved;
    currentRoom = snap.data();
    showScreen("league");
    await loadLeagueTable(saved);
  }catch(e){
    console.error(e);
    showToast("Błąd ładowania ligi");
  }
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
      lastCompletedRoundNo: 0,
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
  await openRoom(code);
}
async function leaveRoom(){
  if(!currentRoomCode) return;
  try{ await fs.deleteDoc(fs.doc(db, "rooms", currentRoomCode, "players", userUid)); }catch{}

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

  const ref = roomRef(code);
  const snap = await fs.getDoc(ref);
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  applyAdminButtonsState();

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

    if(prevRound !== activeRoundId){
      await attachRoundListeners();
    }
  });

  const pq = fs.query(playersCol(code), fs.orderBy("joinedAt","asc"));
  unsubPlayers = fs.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  activeRoundId = currentRoom.activeRoundId || null;
  activeRoundNo = currentRoom.activeRoundNo || 0;
  refreshQueueLabel();
  await attachRoundListeners();

  if(!silent) showToast(`W pokoju: ${code}`);
}

async function attachRoundListeners(){
  if(unsubMatches){ unsubMatches(); unsubMatches=null; }
  if(unsubPicks){ unsubPicks(); unsubPicks=null; }

  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  renderMatches();
  renderPlayers(lastPlayers);

  if(!activeRoundId){
    updateSaveButtonState();
    return;
  }

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
  if(!activeRoundId){ picksCache = {}; return; }
  try{
    const snap = await fs.getDoc(myPickRef(currentRoomCode, activeRoundId));
    picksCache = snap.exists() ? (snap.data()?.picks || {}) : {};
  }catch{ picksCache = {}; }
}
function allMyPicksFilled(){ return isCompletePicksObject(picksCache); }

async function saveAllPicks(){
  if(!activeRoundId){ showToast("Brak aktywnej kolejki"); return; }
  if(!matchesCache.length){ showToast("Brak meczów"); return; }
  if(!allMyPicksFilled()){ showToast("Uzupełnij wszystkie typy"); return; }

  await fs.setDoc(myPickRef(currentRoomCode, activeRoundId), {
    uid: userUid,
    nick: getNick(),
    updatedAt: fs.serverTimestamp(),
    picks: picksCache
  }, { merge:true });

  showToast("Zapisano typy ✅");
}

// ---------- Render ----------
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

// ---------- PODGLĄD TYPOW ----------
function openPeek(uid, nick){
  if(!activeRoundId){ showToast("Brak aktywnej kolejki"); return; }
  if(uid === userUid){ showToast("To Twoje typy 🙂"); return; }
  if(!mySubmitted()){ showToast("Najpierw zapisz swoje typy w tej kolejce ✅"); return; }
  if(!submittedByUid[uid]){ showToast("Ten gracz jeszcze nie zapisał typów"); return; }

  const picksObj = picksDocByUid[uid] || {};
  el("peekTitle").textContent = `Typy gracza: ${nick || "—"}`;
  el("peekSub").textContent = `KOLEJKA ${activeRoundNo} • Podgląd dostępny po zapisaniu Twoich typów`;

  const box = el("peekList");
  box.innerHTML = "";

  const sorted = [...matchesCache].sort((a,b)=>(a.idx??0)-(b.idx??0));
  sorted.forEach(m=>{
    const p = picksObj[m.id];
    const line = document.createElement("div");
    line.className = "pickLine";

    const teams = document.createElement("div");
    teams.className = "pickTeams";
    teams.textContent = `${m.home} — ${m.away}`;

    const score = document.createElement("div");
    score.className = "pickScore";
    score.textContent = (p && Number.isInteger(p.h) && Number.isInteger(p.a)) ? `${p.h}:${p.a}` : "—";

    line.appendChild(teams);
    line.appendChild(score);
    box.appendChild(line);
  });

  openModal("modalPeek");
}

// ---------- Players (✓ + oko) ----------
function renderPlayers(players){
  const box = el("playersList");
  if(!box) return;
  box.innerHTML = "";

  const adminUid = currentRoom?.adminUid;
  const iSubmitted = mySubmitted();

  if(players.length <= 1){
    const info = document.createElement("div");
    info.className = "sub";
    info.textContent = "Jesteś sam w pokoju. Oko będzie użyteczne, gdy dołączą inni gracze.";
    box.appendChild(info);
  }

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

    const eye = document.createElement("button");
    eye.className = "eyeBtn";
    eye.textContent = "👁";

    if(p.uid === userUid){
      eye.disabled = true;
      eye.title = "To Ty";
    }else{
      const canPeek = !!activeRoundId && iSubmitted && !!submittedByUid[p.uid];
      eye.disabled = !canPeek;
      if(canPeek) eye.classList.add("enabled");
      eye.title = canPeek
        ? "Podgląd typów"
        : (!iSubmitted ? "Najpierw zapisz swoje typy" : "Gracz nie zapisał typów");
      eye.onclick = ()=> openPeek(p.uid, p.nick);
    }
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

// ---------- ADMIN: Custom Queue ----------
let customSelected = [];
function fillLeagueSelect(){
  const s = el("selLeague");
  if(!s) return;
  s.innerHTML = "";
  LEAGUES.forEach(l=>{
    const o = document.createElement("option");
    o.value = l;
    o.textContent = l;
    s.appendChild(o);
  });
  s.onchange = ()=> renderCustomList();
}
function customSelectionClear(){
  customSelected = [];
  renderCustomList();
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
  if(!isAdmin()){ showToast("Tylko admin"); return; }
  if(isQueueLocked()){ showToast("Kolejka trwa – nie można modyfikować"); return; }
  fillLeagueSelect();
  customSelectionClear();
  openModal("modalCustom");
}

async function customSelectionSave(){
  if(customSelected.length !== 10){ showToast("Musisz mieć dokładnie 10 meczów"); return; }
  const ok = confirm("Masz 10 pojedynków. Zapisać kolejkę?");
  if(!ok) return;

  const nextNo = (currentRoom?.activeRoundNo || 0) + 1;
  const roundId = `r_${Date.now()}_${genCode6()}`;

  const b = fs.writeBatch(db);

  b.set(roundRef(currentRoomCode, roundId), {
    no: nextNo,
    createdAt: fs.serverTimestamp(),
    createdByUid: userUid,
    createdByNick: getNick(),
    resultsSavedAt: null
  });

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

  b.set(roomRef(currentRoomCode), {
    queueLocked: true,
    activeRoundId: roundId,
    activeRoundNo: nextNo
  }, { merge:true });

  await b.commit();

  closeModal("modalCustom");
  showToast(`Zapisano KOLEJKĘ ${nextNo} ✅`);
}

// ---------- ADMIN: Results + scoring ----------
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
  if(!isAdmin()){ showToast("Tylko admin"); return; }
  if(!isQueueLocked() || !activeRoundId){ showToast("Brak aktywnej kolejki"); return; }
  openModal("modalResults");
  renderResultsEditor();
}

async function saveResultsAndScores(){
  if(!isAdmin() || !activeRoundId) return;

  // 1) zczytaj wyniki z modal
  const inputs = Array.from(el("resultsList").querySelectorAll("input"));
  const temp = {};
  inputs.forEach(inp=>{
    const mid = inp.dataset.mid;
    temp[mid] = temp[mid] || {};
    const v = clampInt(inp.value, 0, 20);
    if(inp.dataset.side === "h") temp[mid].h = v;
    if(inp.dataset.side === "a") temp[mid].a = v;
  });

  for(const m of matchesCache){
    const t = temp[m.id] || {};
    if(!Number.isInteger(t.h) || !Number.isInteger(t.a)){
      showToast("Uzupełnij wszystkie wyniki (0–20)");
      return;
    }
  }

  // 2) zapisz wyniki do meczów
  const b = fs.writeBatch(db);
  matchesCache.forEach(m=>{
    const t = temp[m.id];
    const ref = fs.doc(db, "rooms", currentRoomCode, "rounds", activeRoundId, "matches", m.id);
    b.set(ref, { resultH: t.h, resultA: t.a, resultsUpdatedAt: fs.serverTimestamp() }, { merge:true });
  });

  // 3) nalicz punkty dla graczy, którzy mają komplet typów
  //    (liczymy na podstawie picksDocByUid i temp wyników)
  const playerScores = [];
  for(const [uid, picksObj] of Object.entries(picksDocByUid)){
    // tylko komplet
    let complete = true;
    let pts = 0;
    for(const m of matchesCache){
      const p = picksObj?.[m.id];
      if(!p || !Number.isInteger(p.h) || !Number.isInteger(p.a)){ complete = false; break; }
      pts += scoreOnePick(p.h, p.a, temp[m.id].h, temp[m.id].a);
    }
    if(complete){
      playerScores.push({ uid, points: pts });
    }
  }

  // scores do subkolekcji round/scores
  playerScores.forEach(s=>{
    b.set(scoreRef(currentRoomCode, activeRoundId, s.uid), {
      uid: s.uid,
      points: s.points,
      roundNo: activeRoundNo,
      updatedAt: fs.serverTimestamp()
    }, { merge:true });
  });

  // zapisz timestamp do rundy
  b.set(roundRef(currentRoomCode, activeRoundId), {
    resultsSavedAt: fs.serverTimestamp()
  }, { merge:true });

  await b.commit();

  closeModal("modalResults");
  showToast("Zapisano wyniki + punkty ligi ✅");
}

// ---------- ADMIN: Finish Queue ----------
async function finishQueue(){
  if(!isAdmin()){ showToast("Tylko admin"); return; }
  if(!activeRoundId || !isQueueLocked()){ showToast("Brak aktywnej kolejki"); return; }
  const ok = confirm("Zakończyć kolejkę? Po zakończeniu będzie można dodać następną.");
  if(!ok) return;

  await fs.setDoc(roomRef(currentRoomCode), {
    queueLocked: false,
    activeRoundId: null,
    activeRoundNo: currentRoom?.activeRoundNo || 0,
    lastCompletedRoundNo: currentRoom?.activeRoundNo || 0
  }, { merge:true });

  showToast("Kolejka zakończona ✅");
}

// ---------- LEAGUE TABLE ----------
async function loadLeagueTable(code){
  code = (code||"").trim().toUpperCase();
  if(!code || code.length !== 6) return;

  const roomSnap = await fs.getDoc(roomRef(code));
  if(!roomSnap.exists()){
    showToast("Nie znaleziono pokoju");
    return;
  }
  const room = roomSnap.data();
  const after = room.lastCompletedRoundNo || 0;
  el("leagueAfterRound").textContent = after > 0 ? String(after) : "—";

  el("leagueInfo").textContent = `Pokój: ${room.name || code}`;

  // wczytaj graczy (nick)
  const playersSnap = await fs.getDocs(fs.query(playersCol(code), fs.orderBy("joinedAt","asc")));
  const players = [];
  playersSnap.forEach(d=> players.push(d.data()));
  const nickByUid = {};
  players.forEach(p=> nickByUid[p.uid] = p.nick || "—");

  // wczytaj wszystkie rundy
  const roundsSnap = await fs.getDocs(fs.query(roundsCol(code), fs.orderBy("no","asc")));
  const rounds = [];
  roundsSnap.forEach(d=> rounds.push({ id:d.id, ...d.data() }));

  // zsumuj punkty z scores
  const totalPts = {};
  const roundsPlayed = {};

  for(const r of rounds){
    const scSnap = await fs.getDocs(scoresCol(code, r.id));
    scSnap.forEach(docu=>{
      const s = docu.data();
      const uid = s.uid || docu.id;
      const pts = Number(s.points || 0);
      totalPts[uid] = (totalPts[uid] || 0) + pts;
      roundsPlayed[uid] = (roundsPlayed[uid] || 0) + 1;
    });
  }

  // przygotuj ranking (uwzględnij też osoby z 0 pkt)
  const allUids = new Set([...Object.keys(nickByUid), ...Object.keys(totalPts)]);
  const rows = Array.from(allUids).map(uid=>({
    uid,
    nick: nickByUid[uid] || "—",
    points: totalPts[uid] || 0,
    rounds: roundsPlayed[uid] || 0
  }));

  rows.sort((a,b)=>{
    if(b.points !== a.points) return b.points - a.points;
    if(b.rounds !== a.rounds) return b.rounds - a.rounds;
    return a.nick.localeCompare(b.nick);
  });

  const body = el("leagueBody");
  body.innerHTML = "";
  rows.forEach((r, idx)=>{
    const tr = document.createElement("tr");
    const tdPos = document.createElement("td");
    tdPos.className = "pos";
    tdPos.textContent = String(idx+1);

    const tdNick = document.createElement("td");
    tdNick.textContent = r.nick + (r.uid === userUid ? " (TY)" : "");

    const tdRounds = document.createElement("td");
    tdRounds.className = "rnd";
    tdRounds.textContent = String(r.rounds);

    const tdPts = document.createElement("td");
    tdPts.className = "pts";
    tdPts.textContent = String(r.points);

    tr.appendChild(tdPos);
    tr.appendChild(tdNick);
    tr.appendChild(tdRounds);
    tr.appendChild(tdPts);
    body.appendChild(tr);
  });

  showScreen("league");
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
