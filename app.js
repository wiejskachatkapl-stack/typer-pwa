const BUILD = 1214;

const BG_TLO = "img_tlo.png";
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

const el = (id) => document.getElementById(id);

function setBg(src){
  const bg = el("bg");
  if (bg) bg.style.backgroundImage = `url("${src}")`;
}
function setWyborImg(src){
  const w = el("wyborImg");
  if (w) w.style.backgroundImage = `url("${src}")`;
}
function setFooter(txt){
  const f = el("footerRight");
  if (f) f.textContent = txt;
}
function showToast(msg){
  const t = el("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(showToast._tm);
  showToast._tm = setTimeout(()=> t.style.display="none", 2600);
}
function showScreen(id){
  ["splash","wybor","room"].forEach(s=>{
    const node = el(s);
    if (node) node.classList.toggle("active", s===id);
  });

  setBg(BG_TLO);
  if(id === "wybor"){
    setWyborImg(BG_WYBOR);
  }
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
  const a = el("nickLabelWybor"); if(a) a.textContent = nick;
  const b = el("nickLabelRoom"); if(b) b.textContent = nick;
}

function openModal(id){
  const m = el(id);
  if(m) m.style.display = "flex";
}
function closeModal(id){
  const m = el(id);
  if(m) m.style.display = "none";
}
function clearSavedRoom(){
  localStorage.removeItem(KEY_ACTIVE_ROOM);
}

// Firebase
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

// Firestore paths
function roomRef(code){ return boot.doc(db, "rooms", code); }
function playersCol(code){ return boot.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return boot.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return boot.collection(db, "rooms", code, "picks"); }

async function boot(){
  setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const {
    getFirestore, doc, getDoc, setDoc, serverTimestamp,
    collection, query, orderBy, onSnapshot,
    writeBatch, deleteDoc
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  boot.doc = doc; boot.getDoc = getDoc; boot.setDoc = setDoc;
  boot.serverTimestamp = serverTimestamp;
  boot.collection = collection; boot.query = query; boot.orderBy = orderBy; boot.onSnapshot = onSnapshot;
  boot.writeBatch = writeBatch; boot.deleteDoc = deleteDoc;

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

  showScreen("wybor");

  // Kontynuacja: pojawia się dopiero po pokazaniu wyboru
  const saved = (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
  if(saved && saved.length === 6){
    setTimeout(async ()=>{
      try{
        const snap = await boot.getDoc(roomRef(saved));
        if(!snap.exists()){
          clearSavedRoom();
          showToast("Zapisany pokój nie istnieje");
          return;
        }
        const room = snap.data();
        prepareContinueModal(saved, room?.name || "—");
      }catch{
        clearSavedRoom();
        showToast("Nie udało się sprawdzić pokoju");
      }
    }, 80);
  }
}

function prepareContinueModal(code, roomName){
  const rn = el("continueRoomName"); if(rn) rn.textContent = roomName || "—";
  const rc = el("continueRoomCode"); if(rc) rc.textContent = code || "—";

  const yes = el("btnContinueYes");
  const no = el("btnContinueNo");
  const forget = el("btnContinueForget");

  if(yes){
    yes.onclick = async ()=>{
      closeModal("continueModal");
      localStorage.setItem(KEY_ACTIVE_ROOM, code);
      await openRoom(code, { silent:true, force:true });
    };
  }
  if(no){
    no.onclick = ()=>{
      closeModal("continueModal");
      openRoomsModal();
    };
  }
  if(forget){
    forget.onclick = ()=>{
      clearSavedRoom();
      closeModal("continueModal");
      showToast("Zapomniano pokój");
    };
  }

  openModal("continueModal");
}

function openRoomsModal(){
  openModal("roomsModal");
  el("debugRooms").textContent = "—";
  refreshNickLabels();
  setTimeout(()=>{
    el("inpJoinCode")?.focus();
    el("inpJoinCode")?.select?.();
  }, 60);
}

function bindUI(){
  const hsRooms = el("hsRooms");
  const hsStats = el("hsStats");
  const hsExit  = el("hsExit");

  if(hsRooms) hsRooms.onclick = ()=> openRoomsModal();
  if(hsStats) hsStats.onclick = ()=> showToast("Statystyki — wkrótce ✅");
  if(hsExit)  hsExit.onclick  = ()=>{
    showToast("Zamykanie…");
    try{ window.close(); }catch{}
    setTimeout(()=> showToast("Jeśli nie zamknęło — zamknij kartę ręcznie."), 900);
  };

  const closeRooms = el("btnCloseRooms");
  if(closeRooms) closeRooms.onclick = ()=> closeModal("roomsModal");

  const chNick = el("btnChangeNick");
  if(chNick) chNick.onclick = async ()=>{
    localStorage.removeItem(KEY_NICK);
    await ensureNick();
    refreshNickLabels();
    showToast("Zmieniono nick");
    setTimeout(()=> el("inpJoinCode")?.focus(), 60);
  };

  // ENTER w polu kodu = DOŁĄCZ
  const joinInput = el("inpJoinCode");
  if(joinInput){
    joinInput.addEventListener("keydown", (ev)=>{
      if(ev.key === "Enter"){
        ev.preventDefault();
        el("btnJoinRoom")?.click();
      }
    });
  }

  const btnCreate = el("btnCreateRoom");
  if(btnCreate) btnCreate.onclick = async ()=>{
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){ showToast("Podaj nazwę pokoju"); return; }
    await createRoom(name);
  };

  const btnJoin = el("btnJoinRoom");
  if(btnJoin) btnJoin.onclick = async ()=>{
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){ showToast("Kod musi mieć 6 znaków"); return; }
    await joinRoom(code);
  };

  const btnBack = el("btnBackFromRoom");
  if(btnBack) btnBack.onclick = ()=>{ showScreen("wybor"); };

  const btnCopy = el("btnCopyCode");
  if(btnCopy) btnCopy.onclick = async ()=>{
    if(!currentRoomCode) return;
    try{ await navigator.clipboard.writeText(currentRoomCode); showToast("Skopiowano kod"); }
    catch{ showToast("Nie udało się skopiować"); }
  };

  const btnLeave = el("btnLeave");
  if(btnLeave) btnLeave.onclick = async ()=>{ await leaveRoom(); };

  const btnRefresh = el("btnRefresh");
  if(btnRefresh) btnRefresh.onclick = async ()=>{ if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true}); };

  const btnSave = el("btnSaveAll");
  if(btnSave) btnSave.onclick = async ()=>{ await saveAllPicks(); };

  const btnAddQ = el("btnAddQueue");
  if(btnAddQ) btnAddQ.onclick = async ()=>{ await addTestQueue(); };
}

// Rooms logic
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
    closeModal("roomsModal");
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
  closeModal("roomsModal");
  await openRoom(code);
}

async function leaveRoom(){
  if(!currentRoomCode) return;
  try{ await boot.deleteDoc(boot.doc(db, "rooms", currentRoomCode, "players", userUid)); }catch{}

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

  showScreen("wybor");
  showToast("Opuszczono pokój");
}

function cleanupRoomListeners(){
  if(unsubRoomDoc){ unsubRoomDoc(); unsubRoomDoc=null; }
  if(unsubPlayers){ unsubPlayers(); unsubPlayers=null; }
  if(unsubMatches){ unsubMatches(); unsubMatches=null; }
  if(unsubPicks){ unsubPicks(); unsubPicks=null; }
}

// Open room + live
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

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  const isAdmin = (currentRoom.adminUid === userUid);
  el("btnAddQueue").style.display = isAdmin ? "block" : "none";

  unsubRoomDoc = boot.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    const isAdm = (currentRoom.adminUid === userUid);
    el("btnAddQueue").style.display = isAdm ? "block" : "none";
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
    renderPlayers(lastPlayers);

    await loadMyPicks();
    renderMatches();
  });

  if(!silent) showToast(`W pokoju: ${code}`);
}

// Picks
async function loadMyPicks(){
  try{
    const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
    const snap = await boot.getDoc(ref);
    if(!snap.exists()){ picksCache = {}; return; }
    const data = snap.data();
    picksCache = data?.picks || {};
  }catch{ picksCache = {}; }
}
function allMyPicksFilled(){ return isCompletePicksObject(picksCache); }

async function saveAllPicks(){
  if(!currentRoomCode) return;
  if(!matchesCache.length){ showToast("Brak meczów"); return; }
  if(!allMyPicksFilled()){ showToast("Uzupełnij wszystkie typy"); return; }

  const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
  await boot.setDoc(ref, {
    uid: userUid,
    nick: getNick(),
    updatedAt: boot.serverTimestamp(),
    picks: picksCache
  }, { merge:true });

  showToast("Zapisano typy ✅");
}

// Render
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

    left.appendChild(name);
    left.appendChild(status);

    const right = document.createElement("div");
    right.style.display="flex";
    right.style.gap="8px";

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

// test queue
async function addTestQueue(){
  if(!currentRoomCode) return;
  if(currentRoom?.adminUid !== userUid){ showToast("Tylko admin"); return; }

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

// start
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
