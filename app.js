const BUILD = 1219;
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
function showContinueModal({ roomName }){
  const modal = el("continueModal");
  if (!modal) return;
  el("continueNick").textContent = getNick() || "—";
  el("continueRoomName").textContent = roomName || "—";
  modal.style.display = "flex";
}
function hideContinueModal(){
  const modal = el("continueModal");
  if (modal) modal.style.display = "none";
}
function clearSavedRoom(){
  localStorage.removeItem(KEY_ACTIVE_ROOM);
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

let matchesCache = [];
let picksCache = {};
let picksDocByUid = {};
let submittedByUid = {};
let lastPlayers = [];

let fs = {};

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

// ---------- Firestore paths ----------
function roomRef(code){ return fs.doc(db, "rooms", code); }
function playersCol(code){ return fs.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return fs.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return fs.collection(db, "rooms", code, "picks"); }

// ---------- queue label ----------
function getQueueNoFromRoomOrMatches(){
  const n = currentRoom?.queueNo;
  if (Number.isInteger(n) && n > 0) return n;

  const first = matchesCache?.[0]?.queueNo;
  if (Number.isInteger(first) && first > 0) return first;

  return 0;
}
function refreshQueueLabel(){
  const q = getQueueNoFromRoomOrMatches();
  const out = q > 0 ? `KOLEJKA ${q}` : "—";
  const node = el("queueLabel");
  if (node) node.textContent = out;
}

// ---------- dot logic (green/yellow/red) ----------
function outcomeSign(h, a){
  if(!Number.isInteger(h) || !Number.isInteger(a)) return null;
  if(h > a) return 1;     // 1
  if(h < a) return -1;    // 2
  return 0;               // X
}

function comparePickToResult(match){
  const p = picksCache?.[match.id];
  if(!p || !Number.isInteger(p.h) || !Number.isInteger(p.a)) return null;

  const hasRes = Number.isInteger(match.resultH) && Number.isInteger(match.resultA);
  if(!hasRes) return null;

  // 1) dokładny wynik
  if(p.h === match.resultH && p.a === match.resultA) return "green";

  // 2) tylko rozstrzygnięcie (1X2)
  const ps = outcomeSign(p.h, p.a);
  const rs = outcomeSign(match.resultH, match.resultA);
  if(ps !== null && rs !== null && ps === rs) return "yellow";

  // 3) nietrafione
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

// ---------- Admin UI (na razie tylko blokady przycisków) ----------
function isAdmin(){
  return currentRoom && currentRoom.adminUid === userUid;
}
function isQueueLocked(){
  return !!currentRoom?.queueLocked;
}
function applyAdminButtonsState(){
  const admin = isAdmin();
  const locked = isQueueLocked();

  const btnAdd = el("btnAddQueue");
  const btnCustom = el("btnCustomQueue");
  const btnResults = el("btnEnterResults");
  const btnFinish = el("btnFinishQueue");

  if(btnAdd) btnAdd.style.display = admin ? "block" : "none";
  if(btnCustom) btnCustom.style.display = admin ? "block" : "none";
  if(btnResults) btnResults.style.display = admin ? "block" : "none";
  if(btnFinish) btnFinish.style.display = admin ? "block" : "none";

  if(admin){
    if(btnAdd) btnAdd.disabled = locked;
    if(btnCustom) btnCustom.disabled = locked;
    if(btnResults) btnResults.disabled = !locked;
    if(btnFinish) btnFinish.disabled = !locked;
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
  await ensureNick();
  refreshNickLabels();
  bindUI();

  // jeśli jest zapisany pokój — pokaż modal kontynuacji
  const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  if(saved && saved.length === 6){
    setSplash(`Znaleziono zapisany pokój: ${saved}\nSprawdzam…`);
    try{
      const snap = await fs.getDoc(roomRef(saved));
      if(!snap.exists()){
        clearSavedRoom();
        showScreen("menu");
        showToast("Zapisany pokój nie istnieje");
        return;
      }
      const room = snap.data();
      showScreen("menu");

      el("btnContinueYes").onclick = async ()=>{
        hideContinueModal();
        localStorage.setItem(KEY_ACTIVE_ROOM, saved);
        await openRoom(saved, { silent:true, force:true });
      };
      el("btnContinueNo").onclick = ()=>{
        hideContinueModal();
        showScreen("rooms");
      };
      el("btnContinueForget").onclick = ()=>{
        clearSavedRoom();
        hideContinueModal();
        showToast("Zapomniano pokój");
        showScreen("menu");
      };

      showContinueModal({ roomName: room?.name || "—" });
      return;
    }catch(e){
      console.error(e);
      clearSavedRoom();
      showScreen("menu");
      return;
    }
  }

  showScreen("menu");
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

  // ADMIN (na razie tylko test)
  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };
  el("btnCustomQueue").onclick = ()=> showToast("Własna kolejka — dodamy w kolejnym kroku");
  el("btnEnterResults").onclick = ()=> showToast("Wpisywanie wyników — dołożymy w kolejnym kroku");
  el("btnFinishQueue").onclick = ()=> showToast("Zakończenie kolejki — dołożymy w kolejnym kroku");
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
      queueNo: 0,
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
  el("debugRooms").textContent = "Nie udało się wygenerować wolnego kodu (spróbuj ponownie).";
}

async function joinRoom(code){
  const nick = getNick();
  el("debugRooms").textContent = "Dołączam…";

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
  el("debugRooms").textContent = `Dołączono do ${code}`;
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
  refreshQueueLabel();

  unsubRoomDoc = fs.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    applyAdminButtonsState();
    refreshQueueLabel();
  });

  // players
  const pq = fs.query(fs.collection(db, "rooms", code, "players"), fs.orderBy("joinedAt","asc"));
  unsubPlayers = fs.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  // picks status
  unsubPicks = fs.onSnapshot(fs.collection(db, "rooms", code, "picks"), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });

  // matches
  const mq = fs.query(fs.collection(db, "rooms", code, "matches"), fs.orderBy("idx","asc"));
  unsubMatches = fs.onSnapshot(mq, async (qs)=>{
    const arr = [];
    qs.forEach(docu=>{
      arr.push({ id: docu.id, ...docu.data() });
    });
    matchesCache = arr;

    refreshQueueLabel();

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
    const ref = fs.doc(db, "rooms", currentRoomCode, "picks", userUid);
    const snap = await fs.getDoc(ref);
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

  const ref = fs.doc(db, "rooms", currentRoomCode, "picks", userUid);
  await fs.setDoc(ref, {
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
  btn.disabled = !allMyPicksFilled();
}

// ---------- TEST: dodanie kolejki (tylko admin) ----------
async function addTestQueue(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(isQueueLocked()){
    showToast("Kolejka zablokowana – zakończ ją, aby dodać nową.");
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

  const ok = confirm("Dodać testową kolejkę 10 meczów?");
  if(!ok) return;

  // zwiększamy numer kolejki w pokoju + zapisujemy queueNo do meczów
  const currentNo = Number.isInteger(currentRoom?.queueNo) ? currentRoom.queueNo : 0;
  const nextNo = currentNo + 1;

  const b = fs.writeBatch(db);

  // wyczyść poprzednie mecze (prosto, bez archiwum – testowo)
  // jeżeli chcesz archiwum – dopiszemy w następnym kroku
  // UWAGA: potrzebujemy listy ID – robimy prościej: nie kasujemy, tylko nadpisujemy idx/nowe id
  // (dla testu wystarczy, a archiwum dodamy później)

  sample.forEach((pair, idx)=>{
    const id = `m_${Date.now()}_${idx}`;
    const ref = fs.doc(db, "rooms", currentRoomCode, "matches", id);
    b.set(ref, {
      idx,
      home: pair[0],
      away: pair[1],
      createdAt: fs.serverTimestamp(),
      resultH: null,
      resultA: null,
      queueNo: nextNo
    });
  });

  b.set(roomRef(currentRoomCode), {
    queueNo: nextNo,
    queueLocked: true,
    queueLockedAt: fs.serverTimestamp()
  }, { merge:true });

  await b.commit();
  showToast(`Dodano KOLEJKĘ ${nextNo} ✅`);
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
