const BUILD = 2002;

// TŁO stałe (za frame) – możesz zostawić img_tlo.png albo dać img_menu_pc.png
const BG_TLO = "img_tlo.png";

// ====== PROFILOWANIE (współdzielenie komputera) ======
const KEY_ACTIVE_PROFILE = "typer_active_profile_v1";
const KEY_PROFILES = "typer_profiles_v1";

// Każdy profil ma swoje dane:
function kNick(pid){ return `typer_${pid}_nick`; }
function kRoom(pid){ return `typer_${pid}_active_room`; }
function kLang(pid){ return `typer_${pid}_lang`; }

function uid6(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function loadProfiles(){
  try{
    const raw = localStorage.getItem(KEY_PROFILES);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveProfiles(arr){
  localStorage.setItem(KEY_PROFILES, JSON.stringify(arr));
}
function getActiveProfileId(){
  return (localStorage.getItem(KEY_ACTIVE_PROFILE) || "").trim();
}
function setActiveProfileId(id){
  localStorage.setItem(KEY_ACTIVE_PROFILE, id);
}
function ensureProfiles(){
  let profiles = loadProfiles();
  let active = getActiveProfileId();

  if(!profiles.length){
    const id = uid6();
    profiles = [{ id, name:"Domyślny" }];
    saveProfiles(profiles);
    setActiveProfileId(id);
    active = id;
  }

  if(!active || !profiles.some(p=>p.id===active)){
    active = profiles[0].id;
    setActiveProfileId(active);
  }

  return { profiles, active };
}

function getNick(){
  const pid = getActiveProfileId();
  return (localStorage.getItem(kNick(pid)) || "").trim();
}
function setNick(nick){
  const pid = getActiveProfileId();
  localStorage.setItem(kNick(pid), nick);
}
function getSavedRoom(){
  const pid = getActiveProfileId();
  return (localStorage.getItem(kRoom(pid)) || "").trim().toUpperCase();
}
function setSavedRoom(code){
  const pid = getActiveProfileId();
  localStorage.setItem(kRoom(pid), code);
}
function clearSavedRoom(){
  const pid = getActiveProfileId();
  localStorage.removeItem(kRoom(pid));
}
function getLang(){
  const pid = getActiveProfileId();
  return (localStorage.getItem(kLang(pid)) || "pl").trim();
}
function setLang(lang){
  const pid = getActiveProfileId();
  localStorage.setItem(kLang(pid), lang);
}

// Czyści wszystko (reset gry w przeglądarce)
function clearAllLocal(){
  localStorage.removeItem(KEY_ACTIVE_PROFILE);
  const profiles = loadProfiles();
  profiles.forEach(p=>{
    localStorage.removeItem(kNick(p.id));
    localStorage.removeItem(kRoom(p.id));
    localStorage.removeItem(kLang(p.id));
  });
  localStorage.removeItem(KEY_PROFILES);
}

// ====== Firebase ======
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
  ["splash","home","rooms","room"].forEach(s=>{
    const node = el(s);
    if (node) node.classList.toggle("active", s===id);
  });
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

function refreshNickLabels(){
  const nick = getNick() || "—";
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
  if (el("nickLabelRoom")) el("nickLabelRoom").textContent = nick;
}

async function ensureNick(){
  let nick = getNick();
  while(!nick){
    nick = prompt("Podaj nick (3–16 znaków):", "") || "";
    nick = nick.trim();
    if (nick.length < 3 || nick.length > 16) nick = "";
    if (!nick) alert("Nick musi mieć 3–16 znaków.");
  }
  setNick(nick);
  return nick;
}

// ---------- Settings modal ----------
function openSettings(){
  syncSettingsUI();
  el("settingsModal").style.display = "flex";
}
function closeSettings(){
  el("settingsModal").style.display = "none";
}
function syncSettingsUI(){
  const { profiles, active } = ensureProfiles();

  // select profilu
  const sel = el("selProfile");
  sel.innerHTML = "";
  profiles.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.id})`;
    if(p.id===active) opt.selected = true;
    sel.appendChild(opt);
  });

  // nick / lang label
  el("inpNickSettings").value = getNick() || "";
  el("langLabel").textContent = (getLang()==="en") ? "English" : "Polski";
}

function addProfile(){
  const profiles = loadProfiles();
  let name = prompt("Nazwa profilu (np. Ania):", "") || "";
  name = name.trim();
  if(name.length < 2) { showToast("Podaj nazwę profilu"); return; }
  const id = uid6();
  profiles.push({ id, name });
  saveProfiles(profiles);
  setActiveProfileId(id);
  showToast(`Dodano profil: ${name}`);
  refreshNickLabels();
  syncSettingsUI();
}

function removeProfile(){
  const profiles = loadProfiles();
  const active = getActiveProfileId();
  if(profiles.length <= 1){
    showToast("Nie można usunąć ostatniego profilu");
    return;
  }
  const p = profiles.find(x=>x.id===active);
  const ok = confirm(`Usunąć profil "${p?.name || active}"?\n(Usunie nick/pokój/język tego profilu)`);
  if(!ok) return;

  // usuń dane profilu
  localStorage.removeItem(kNick(active));
  localStorage.removeItem(kRoom(active));
  localStorage.removeItem(kLang(active));

  const next = profiles.filter(x=>x.id!==active);
  saveProfiles(next);
  setActiveProfileId(next[0].id);

  showToast("Profil usunięty");
  refreshNickLabels();
  syncSettingsUI();
}

function switchProfile(){
  const sel = el("selProfile");
  const id = sel.value;
  setActiveProfileId(id);
  showToast("Przełączono profil");
  refreshNickLabels();
  syncSettingsUI();

  // po przełączeniu profil może mieć zapisany pokój (więc user szybciej wróci)
  // nic nie wymuszamy – użytkownik zdecyduje klikając „Pokoje typerów”
}

function saveNickFromSettings(){
  let nick = (el("inpNickSettings").value || "").trim();
  if(nick.length < 3 || nick.length > 16){
    showToast("Nick 3–16 znaków");
    return;
  }
  setNick(nick);
  refreshNickLabels();
  showToast("Zapisano nick");
}

function setLangUI(lang){
  setLang(lang);
  syncSettingsUI();
  showToast(lang==="en" ? "Language: English" : "Język: Polski");
}

// ====== Firebase runtime ======
let app, auth, db;
let userUid = null;

let unsubRoomDoc = null;
let unsubPlayers = null;
let unsubMatches = null;
let unsubPicks = null;

let currentRoomCode = null;
let currentRoom = null;

let matchesCache = [];   // [{id, home, away, idx}]
let picksCache = {};     // matchId -> {h,a}
let picksDocByUid = {};  // uid -> picks object
let submittedByUid = {}; // uid -> boolean
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

// ---------- boot ----------
async function boot(){
  setBg(BG_TLO);
  setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

  ensureProfiles(); // <-- ważne dla współdzielenia
  refreshNickLabels();

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

  boot.doc = doc; boot.getDoc = getDoc; boot.setDoc = setDoc; boot.updateDoc = updateDoc;
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

  // Nick – jeśli profil nie ma nicku, poprosimy przy pierwszym wejściu w pokoje,
  // ale możesz też ustawić zębatką.
  showScreen("home");
}

// ---------- UI binding ----------
function bindUI(){
  // HOME
  el("btnHomeRooms").onclick = async ()=>{
    // jeśli brak nicka – pytamy tutaj, żeby nie było dodatkowych ekranów
    if(!getNick()) await ensureNick();
    refreshNickLabels();
    showScreen("rooms");
    el("debugRooms").textContent = "—";

    // Jeśli w tym profilu jest zapisany pokój – możesz od razu wejść lub tworzyć/join
    const saved = getSavedRoom();
    if(saved && saved.length===6){
      el("debugRooms").textContent = `Wykryto ostatni pokój: ${saved}. Możesz wpisać kod i dołączyć lub utworzyć nowy.`;
      el("inpJoinCode").value = saved;
    }
  };

  el("btnHomeStats").onclick = ()=>{
    showToast("Statystyki: wkrótce (podłączymy).");
  };

  el("btnHomeExit").onclick = ()=>{
    showToast("Wyjście: w web nie zamkniemy karty automatycznie 🙂");
  };

  // Settings open
  el("btnOpenSettings").onclick = ()=> openSettings();

  // Settings close
  el("btnSettingsClose").onclick = ()=> closeSettings();
  el("btnClearLocalCancel").onclick = ()=> closeSettings();

  // Settings: profile
  el("btnProfileAdd").onclick = ()=> addProfile();
  el("btnProfileRemove").onclick = ()=> removeProfile();
  el("btnProfileSwitch").onclick = ()=> switchProfile();

  // Settings: nick
  el("btnNickSave").onclick = ()=> saveNickFromSettings();

  // Settings: language
  el("btnLangPL").onclick = ()=> setLangUI("pl");
  el("btnLangEN").onclick = ()=> setLangUI("en");

  // Clear local
  el("btnClearLocal").onclick = ()=>{
    const ok = confirm("Na pewno wyczyścić dane lokalne?\n(Nick, pokój, język, profile)");
    if(!ok) return;
    clearAllLocal();
    showToast("Wyczyszczono dane. Odświeżam…");
    setTimeout(()=> location.reload(), 500);
  };

  // ROOMS
  el("btnBackHome").onclick = ()=> showScreen("home");

  el("btnCreateRoom").onclick = async ()=>{
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){
      showToast("Podaj nazwę pokoju");
      return;
    }
    if(!getNick()) await ensureNick();
    await createRoom(name);
  };

  el("btnJoinRoom").onclick = async ()=>{
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){
      showToast("Kod musi mieć 6 znaków");
      return;
    }
    if(!getNick()) await ensureNick();
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
  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };
}

// ---------- Firestore paths ----------
function roomRef(code){ return boot.doc(db, "rooms", code); }
function playersCol(code){ return boot.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return boot.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return boot.collection(db, "rooms", code, "picks"); }

// ---------- Rooms logic ----------
function genCode6(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

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
  refreshNickLabels();

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

function normalizeSlug(s){
  return (s||"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g,"l")
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"");
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
    setBg(BG_TLO);
    setSplash(`BUILD ${BUILD}\nŁadowanie…`);
    await boot();
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
