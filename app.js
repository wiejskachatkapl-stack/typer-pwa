const BUILD = 1216;
const BG_TLO = "img_tlo.png";

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
  ["splash","menu","rooms","room"].forEach(s=>{
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
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
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
  if (el("nickLabelMenu")) el("nickLabelMenu").textContent = nick;
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
  if (el("nickLabelRoom")) el("nickLabelRoom").textContent = nick;
}

// ---------- CONTINUE MODAL ----------
function showContinueModal({ code, roomName }){
  const modal = el("continueModal");
  const text = el("continueText");
  if (!modal || !text) return;

  text.textContent =
    `Grasz w pokoju:\n` +
    `• ${roomName || "—"}\n` +
    `• kod: ${code}\n\n` +
    `Czy chcesz kontynuować?`;

  modal.style.display = "flex";
}

function hideContinueModal(){
  const modal = el("continueModal");
  if (modal) modal.style.display = "none";
}

function clearSavedRoom(){
  localStorage.removeItem(KEY_ACTIVE_ROOM);
}

// ---------- ADMIN QUEUE MODAL ----------
function showQueueModal(){
  const m = el("queueModal");
  if (m) m.style.display = "flex";
}
function hideQueueModal(){
  const m = el("queueModal");
  if (m) m.style.display = "none";
}
function setQueueStatus(txt){
  const s = el("queueStatus");
  if (s) s.textContent = txt;
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

let matchesCache = [];   // [{id, home, away, idx}]
let picksCache = {};     // matchId -> {h,a} (TY)
let picksDocByUid = {};  // uid -> picks object
let submittedByUid = {}; // uid -> boolean
let lastPlayers = [];

// ---------- Catalog (A) ----------
const LEAGUES = [
  { id:"laliga", name:"hiszpańska LaLiga" },
  { id:"eredivisie", name:"holenderska Eredivisie" },
  { id:"bundesliga", name:"niemiecka Bundesliga" },
  { id:"premier_league", name:"angielska Premier League" },
  { id:"serie_a", name:"włoska Serie A" },
  { id:"ligue_1", name:"francuska Ligue 1" },
  { id:"ekstraklasa", name:"Polska Ekstraklasa" },
  { id:"ucl", name:"Liga Mistrzów" },
  { id:"uel", name:"Liga Europy" },
  { id:"uecl", name:"Liga Konferencji" },
  { id:"knvb_beker", name:"Puchar Holandii" },
  { id:"puchar_polski", name:"Puchar Polski" },
  { id:"copa_del_rey", name:"Puchar Hiszpanii" },
  { id:"fa_cup", name:"Puchar Anglii" },
  { id:"coppa_italia", name:"Puchar Włoch" },
];

// Przykładowy katalog meczów (możemy go potem rozbudować / podmienić na Firestore/API)
const CATALOG = {
  ekstraklasa: [
    ["Jagiellonia","Piast"],
    ["Lechia","Legia"],
    ["Wisla Plock","Radomiak"],
    ["GKS Katowice","Gornik"],
    ["Arka","Cracovia"],
    ["Lech","Pogon"],
    ["Motor","Rakow"],
    ["Korona","Widzew"],
    ["Slask","Zaglebie"],
    ["Stal Mielec","Puszcza"],
  ],
  premier_league: [
    ["Arsenal","Chelsea"],
    ["Liverpool","Manchester City"],
    ["Tottenham","Manchester United"],
    ["Newcastle","Aston Villa"],
    ["West Ham","Everton"],
  ],
  bundesliga: [
    ["Bayern","Dortmund"],
    ["Leipzig","Leverkusen"],
    ["Frankfurt","Stuttgart"],
    ["Wolfsburg","Werder Bremen"],
  ],
  laliga: [
    ["Real Madrid","Barcelona"],
    ["Atletico","Sevilla"],
    ["Valencia","Villarreal"],
    ["Real Sociedad","Athletic Bilbao"],
  ],
  serie_a: [
    ["Inter","Milan"],
    ["Juventus","Napoli"],
    ["Roma","Lazio"],
    ["Atalanta","Fiorentina"],
  ],
  ligue_1: [
    ["PSG","Marseille"],
    ["Lyon","Monaco"],
    ["Lille","Rennes"],
  ],
  eredivisie: [
    ["Ajax","PSV"],
    ["Feyenoord","AZ Alkmaar"],
    ["Twente","Utrecht"],
  ],
  ucl: [
    ["Real Madrid","Manchester City"],
    ["Bayern","PSG"],
    ["Barcelona","Inter"],
  ],
  uel: [
    ["Roma","Leverkusen"],
    ["Liverpool","Villarreal"],
  ],
  uecl: [
    ["Aston Villa","Fiorentina"],
    ["West Ham","AZ Alkmaar"],
  ],
  knvb_beker: [
    ["Ajax","Feyenoord"],
    ["PSV","AZ Alkmaar"],
  ],
  puchar_polski: [
    ["Lech","Legia"],
    ["Wisla Krakow","Cracovia"],
  ],
  copa_del_rey: [
    ["Barcelona","Sevilla"],
    ["Real Madrid","Valencia"],
  ],
  fa_cup: [
    ["Arsenal","Liverpool"],
    ["Chelsea","Manchester United"],
  ],
  coppa_italia: [
    ["Inter","Juventus"],
    ["Roma","Lazio"],
  ],
};

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

// ---------- boot ----------
async function boot(){
  setBg(BG_TLO);
  setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const {
    getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, query, orderBy, onSnapshot,
    writeBatch, deleteDoc, getDocs
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  boot.doc = doc; boot.getDoc = getDoc; boot.setDoc = setDoc; boot.updateDoc = updateDoc;
  boot.serverTimestamp = serverTimestamp;
  boot.collection = collection; boot.query = query; boot.orderBy = orderBy; boot.onSnapshot = onSnapshot;
  boot.writeBatch = writeBatch; boot.deleteDoc = deleteDoc; boot.getDocs = getDocs;

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
  await ensureNick();
  refreshNickLabels();
  bindUI();
  initLeagueSelect();

  // jeśli jest zapisany pokój -> pytanie kontynuacji
  const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  if(saved && saved.length === 6){
    setSplash(`Znaleziono zapisany pokój: ${saved}\nSprawdzam nazwę…`);
    try{
      const snap = await boot.getDoc(roomRef(saved));
      if(!snap.exists()){
        clearSavedRoom();
        showScreen("menu");
        showToast("Zapisany pokój nie istnieje");
        return;
      }
      const room = snap.data();
      showScreen("menu");
      prepareContinueModal(saved, room?.name || "—");
      return;
    }catch{
      clearSavedRoom();
      showScreen("menu");
      showToast("Nie udało się sprawdzić pokoju");
      return;
    }
  }

  showScreen("menu");
}

function prepareContinueModal(code, roomName){
  const yes = el("btnContinueYes");
  const no = el("btnContinueNo");
  const forget = el("btnContinueForget");

  if(yes){
    yes.onclick = async ()=>{
      hideContinueModal();
      localStorage.setItem(KEY_ACTIVE_ROOM, code);
      await openRoom(code, { silent:true, force:true });
    };
  }
  if(no){
    no.onclick = ()=>{
      hideContinueModal();
      showScreen("menu");
    };
  }
  if(forget){
    forget.onclick = ()=>{
      clearSavedRoom();
      showToast("Zapomniano pokój");
      hideContinueModal();
      showScreen("menu");
    };
  }

  showContinueModal({ code, roomName });
}

// ---------- UI binding ----------
function bindUI(){
  // MENU
  el("btnOpenRooms").onclick = async ()=>{ showScreen("rooms"); el("debugRooms").textContent = "—"; };
  el("btnChangeNickMenu").onclick = async ()=>{
    localStorage.removeItem(KEY_NICK);
    await ensureNick();
    refreshNickLabels();
    showToast("Zmieniono nick");
  };

  // ROOMS
  el("btnBackMenu").onclick = ()=> showScreen("menu");
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
  el("btnBackFromRoom").onclick = ()=>{ showScreen("rooms"); };
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

  // admin actions
  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };
  el("btnAdminQueue").onclick = ()=>{ openAdminQueue(); };

  // queue modal
  el("btnQueueClose").onclick = ()=> hideQueueModal();
  el("btnQueueClose2").onclick = ()=> hideQueueModal();
  el("btnClearQueue").onclick = async ()=>{ await clearAllMatches(); };
  el("selLeague").onchange = ()=> renderCatalog();
}

// ---------- leagues select ----------
function initLeagueSelect(){
  const sel = el("selLeague");
  if(!sel) return;
  sel.innerHTML = "";
  for(const l of LEAGUES){
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    sel.appendChild(opt);
  }
  // domyślnie Polska
  sel.value = "ekstraklasa";
}

// ---------- Firestore paths ----------
function roomRef(code){ return boot.doc(db, "rooms", code); }
function playersCol(code){ return boot.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return boot.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return boot.collection(db, "rooms", code, "picks"); }

// ---------- Rooms logic ----------
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
      createdAt: boot.serverTimestamp()
    });

    await boot.setDoc(boot.doc(db, "rooms", code, "players", userUid), {
      nick, uid: userUid, joinedAt: boot.serverTimestamp()
    });

    localStorage.setItem(KEY_ACTIVE_ROOM, code);
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
  el("debugRooms").textContent = `Dołączono do ${code}`;
  await openRoom(code);
}

async function leaveRoom(){
  if(!currentRoomCode) return;
  try{
    await boot.deleteDoc(boot.doc(db, "rooms", currentRoomCode, "players", userUid));
  }catch{}

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
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  // UI left
  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  const isAdmin = (currentRoom.adminUid === userUid);
  el("btnAddQueue").style.display = isAdmin ? "block" : "none";
  el("btnAdminQueue").style.display = isAdmin ? "block" : "none";

  unsubRoomDoc = boot.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    const isAdm = (currentRoom.adminUid === userUid);
    el("btnAddQueue").style.display = isAdm ? "block" : "none";
    el("btnAdminQueue").style.display = isAdm ? "block" : "none";
  });

  // live players
  const pq = boot.query(playersCol(code), boot.orderBy("joinedAt","asc"));
  unsubPlayers = boot.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  // live picks (status)
  unsubPicks = boot.onSnapshot(picksCol(code), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });

  // live matches
  const mq = boot.query(matchesCol(code), boot.orderBy("idx","asc"));
  unsubMatches = boot.onSnapshot(mq, async (qs)=>{
    const arr = [];
    qs.forEach(docu=>{
      arr.push({ id: docu.id, ...docu.data() });
    });
    matchesCache = arr;

    recomputeSubmittedMap();
    renderPlayers(lastPlayers);

    await loadMyPicks();
    renderMatches();
  });

  if(!silent) showToast(`W pokoju: ${code}`);
}

// ---------- Picks (TY) ----------
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

// ---------- Admin Queue Builder ----------
function openAdminQueue(){
  if(!currentRoomCode) return;
  if(currentRoom?.adminUid !== userUid){
    showToast("Tylko admin");
    return;
  }
  renderCatalog();
  setQueueStatus(`Pokój: ${currentRoomCode} • mecze w pokoju: ${matchesCache.length}`);
  showQueueModal();
}

function renderCatalog(){
  const sel = el("selLeague");
  const box = el("catalogList");
  if(!sel || !box) return;

  const leagueId = sel.value;
  const list = CATALOG[leagueId] || [];
  box.innerHTML = "";

  if(!list.length){
    const empty = document.createElement("div");
    empty.className = "qHint";
    empty.textContent = "Brak meczów w katalogu dla tej ligi (na razie).";
    box.appendChild(empty);
    return;
  }

  list.forEach(pair=>{
    const [home, away] = pair;

    const row = document.createElement("div");
    row.className = "qMatch";
    row.title = "Kliknij, aby dodać do kolejki";

    const left = document.createElement("div");
    left.className = "qTeams";
    const b1 = document.createElement("b");
    b1.textContent = home;
    const b2 = document.createElement("b");
    b2.style.opacity = ".92";
    b2.textContent = away;
    left.appendChild(b1);
    left.appendChild(b2);

    const right = document.createElement("div");
    right.className = "badge";
    right.textContent = "Dodaj";

    row.appendChild(left);
    row.appendChild(right);

    row.onclick = async ()=>{
      await addMatchFromCatalog(leagueId, home, away);
    };

    box.appendChild(row);
  });
}

function nextIdx(){
  if(!matchesCache.length) return 0;
  let maxIdx = -1;
  for(const m of matchesCache){
    const v = Number.isFinite(m.idx) ? m.idx : -1;
    if(v > maxIdx) maxIdx = v;
  }
  return maxIdx + 1;
}

async function addMatchFromCatalog(leagueId, home, away){
  if(!currentRoomCode) return;
  if(currentRoom?.adminUid !== userUid){
    showToast("Tylko admin");
    return;
  }

  // zabezpieczenie przed duplikatem (home+away)
  const dup = matchesCache.some(m => (m.home === home && m.away === away));
  if(dup){
    showToast("Ten mecz już jest w kolejce");
    return;
  }

  const idx = nextIdx();
  const id = `m_${Date.now()}_${normalizeSlug(home)}_${normalizeSlug(away)}`;

  const ref = boot.doc(db, "rooms", currentRoomCode, "matches", id);
  await boot.setDoc(ref, {
    idx,
    home,
    away,
    league: leagueId,
    createdAt: boot.serverTimestamp()
  });

  showToast(`Dodano: ${home} – ${away}`);
  setQueueStatus(`Dodano mecz • mecze w pokoju: ${matchesCache.length + 1}`);
}

async function clearAllMatches(){
  if(!currentRoomCode) return;
  if(currentRoom?.adminUid !== userUid){
    showToast("Tylko admin");
    return;
  }
  if(!confirm("Usunąć WSZYSTKIE mecze z tego pokoju?")) return;

  const qs = await boot.getDocs(matchesCol(currentRoomCode));
  const b = boot.writeBatch(db);
  qs.forEach(d => b.delete(d.ref));
  await b.commit();

  showToast("Wyczyszczono kolejkę");
  setQueueStatus("Kolejka wyczyszczona");
}

// ---------- test queue ----------
async function addTestQueue(){
  if(!currentRoomCode) return;
  if(currentRoom?.adminUid !== userUid){
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

  const startIdx = nextIdx();
  const b = boot.writeBatch(db);

  sample.forEach((pair, i)=>{
    const [home, away] = pair;
    const id = `m_${Date.now()}_${i}`;
    const ref = boot.doc(db, "rooms", currentRoomCode, "matches", id);
    b.set(ref, {
      idx: startIdx + i,
      home,
      away,
      league: "ekstraklasa",
      createdAt: boot.serverTimestamp()
    });
  });

  await b.commit();
  showToast("Dodano kolejkę (test)");
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
