const BUILD = 1220;

const BG_MENU = "img_menu_pc.png"; // ✅ jedyne tło startowe
const BG_TLO  = "img_tlo.png";     // tło dla rooms/room

const KEY_NICK = "typer_nick_v4";
const KEY_ACTIVE_ROOM = "typer_active_room_v4";

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

  // ✅ tła: menu ma img_menu_pc.png, reszta img_tlo.png
  if(id === "menu") setBg(BG_MENU);
  else setBg(BG_TLO);
}

function setSplash(msg){
  const h = el("splashHint");
  if (h) h.textContent = msg;
  console.log(msg);
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

function setNick(nick){
  localStorage.setItem(KEY_NICK, (nick||"").trim());
}

function refreshNickLabels(){
  const nick = getNick() || "—";
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
  if (el("nickLabelRoom"))  el("nickLabelRoom").textContent  = nick;
}

function clearSavedRoom(){
  localStorage.removeItem(KEY_ACTIVE_ROOM);
}

function getSavedRoom(){
  return (localStorage.getItem(KEY_ACTIVE_ROOM) || "").trim().toUpperCase();
}

function setSavedRoom(code){
  localStorage.setItem(KEY_ACTIVE_ROOM, (code||"").trim().toUpperCase());
}

// ---------- Modal ----------
function modalShow({ icon="✦", title="—", sub="—", bodyHtml="", canClose=true }){
  el("modalIcon").textContent = icon;
  el("modalTitle").textContent = title;
  el("modalSub").textContent = sub;
  el("modalBody").innerHTML = bodyHtml;

  el("modalClose").style.display = canClose ? "inline-flex" : "none";
  el("modal").style.display = "flex";
}

function modalHide(){
  el("modal").style.display = "none";
  el("modalBody").innerHTML = "";
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
function roomRef(code){ return boot.doc(db, "rooms", code); }
function playersCol(code){ return boot.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return boot.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return boot.collection(db, "rooms", code, "picks"); }

// ---------- boot ----------
async function boot(){
  showScreen("splash");
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

  // expose (bez globali)
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
  bindUI();
  refreshNickLabels();

  // ✅ Start zawsze na MENU z img_menu_pc.png
  showScreen("menu");
}

// ---------- UI binding ----------
function bindUI(){
  // modal close
  el("modalClose").onclick = ()=> modalHide();
  el("modal").addEventListener("click", (e)=>{
    if(e.target === el("modal")) modalHide();
  });

  // MENU buttons (PNG)
  el("btnMenuRooms").onclick = async ()=> { await onClickRooms(); };
  el("btnMenuStats").onclick = ()=> { showToast("Statystyki – wkrótce"); };
  el("btnMenuExit").onclick  = ()=> { showToast("Wyjście: zamknij kartę / aplikację"); };

  // ROOMS
  el("btnBackToMenu").onclick = ()=> showScreen("menu");

  el("btnChangeNickRooms").onclick = async ()=>{
    setNick("");
    refreshNickLabels();
    await askNickThenContinue(() => showScreen("rooms"));
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

  el("inpJoinCode").addEventListener("keydown", (e)=>{
    if(e.key === "Enter") el("btnJoinRoom").click();
  });

  // ROOM
  el("btnBackFromRoom").onclick = ()=>{ showScreen("menu"); };
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
  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };
}

// ---------- Flow: klik Pokoje typerów ----------
async function onClickRooms(){
  // 1) jeśli nie ma nicka -> pytanie o nick
  if(!getNick()){
    await askNickThenContinue(async ()=>{
      await afterNickRoomsFlow();
    });
    return;
  }

  // 2) jeśli nick jest -> kontynuacja lub rooms
  await afterNickRoomsFlow();
}

async function askNickThenContinue(onOk){
  modalShow({
    icon:"👤",
    title:"Podaj swój nick",
    sub:"Pierwsze wejście — ustaw nick (3–16 znaków).",
    canClose:false,
    bodyHtml: `
      <div class="miniBox">
        <div class="sub" style="margin-bottom:8px">Nick:</div>
        <div class="row">
          <input id="inpNickModal" placeholder="np. Mariusz" style="flex:1" maxlength="16" />
          <button class="btn btnGreen" id="btnNickOk">Dalej</button>
        </div>
        <div class="help" style="margin-top:8px">Nick będzie zapamiętany na tym urządzeniu.</div>
      </div>
    `
  });

  const inp = el("inpNickModal");
  const ok = el("btnNickOk");

  const submit = async ()=>{
    let nick = (inp.value || "").trim();
    if(nick.length < 3 || nick.length > 16){
      showToast("Nick 3–16 znaków");
      return;
    }
    setNick(nick);
    refreshNickLabels();
    modalHide();
    if(typeof onOk === "function") await onOk();
  };

  ok.onclick = submit;
  inp.addEventListener("keydown",(e)=>{ if(e.key==="Enter") submit(); });

  inp.focus();
}

async function afterNickRoomsFlow(){
  const saved = getSavedRoom();

  // jeśli jest zapisany pokój -> sprawdź czy istnieje i pokaż modal kontynuacji
  if(saved && saved.length === 6){
    try{
      const snap = await boot.getDoc(roomRef(saved));
      if(snap.exists()){
        const room = snap.data();
        const roomName = room?.name || "—";
        showContinueModal({ roomName, code: saved });
        return;
      }else{
        clearSavedRoom();
      }
    }catch{
      // jak nie wyszło sprawdzenie, idziemy do rooms
    }
  }

  // brak pokoju -> od razu ekran dołącz/utwórz
  showScreen("rooms");
}

function showContinueModal({ roomName, code }){
  const nick = getNick() || "—";

  modalShow({
    icon:"↩",
    title:"Witaj ponownie",
    sub:"Wykryto wcześniejszy pokój — możesz wejść jednym kliknięciem.",
    canClose:true,
    bodyHtml: `
      <div class="grid2">
        <div class="miniBox">
          <div class="title" style="margin:0 0 6px 0">Witaj ponownie</div>
          <div class="sub">Nick:</div>
          <div class="chip" style="margin-top:8px;width:100%;justify-content:space-between">
            <span>${escapeHtml(nick)}</span>
          </div>
        </div>

        <div class="miniBox">
          <div class="title" style="margin:0 0 6px 0">Grasz w pokoju</div>
          <div class="sub">Nazwa pokoju:</div>
          <div class="chip" style="margin-top:8px;width:100%;justify-content:space-between">
            <span>${escapeHtml(roomName)}</span>
          </div>
        </div>
      </div>

      <div class="bigAsk">Czy kontynuujesz grę w tym pokoju?</div>

      <div class="modalActions">
        <button class="btn btnGreen" id="btnContinueYes">✅ Tak</button>
        <button class="btn" id="btnContinueNo">↪ Nie</button>
        <div class="spacer"></div>
        <button class="btn" id="btnForgetRoom">🗑 Zapomnij pokój</button>
      </div>
    `
  });

  el("btnContinueYes").onclick = async ()=>{
    modalHide();
    // upewnij się, że zapisany kod jest ustawiony
    setSavedRoom(code);
    await openRoom(code, { silent:true, force:true });
  };

  el("btnContinueNo").onclick = ()=>{
    modalHide();
    showScreen("rooms");
  };

  el("btnForgetRoom").onclick = ()=>{
    clearSavedRoom();
    modalHide();
    showToast("Zapomniano pokój");
    showScreen("rooms");
  };
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

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

    setSavedRoom(code);
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

  setSavedRoom(code);
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

  renderMatches();
  renderPlayers([]);

  showScreen("menu");
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

  unsubRoomDoc = boot.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    const isAdm = (currentRoom.adminUid === userUid);
    el("btnAddQueue").style.display = isAdm ? "block" : "none";
  });

  // players
  const pq = boot.query(playersCol(code), boot.orderBy("joinedAt","asc"));
  unsubPlayers = boot.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  // picks
  unsubPicks = boot.onSnapshot(picksCol(code), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });

  // matches
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

  if(!silent) showToast(`W pokoju`);
}

// ---------- Picks ----------
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
  const slug = (teamName||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g,"l")
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");

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

// ---------- start ----------
(async()=>{
  try{
    showScreen("splash");
    setBg(BG_MENU); // żeby od razu ładowało się menu-tło
    setSplash(`BUILD ${BUILD}\nŁadowanie…`);
    await boot();
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
