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

// ---------- BUILDER MODAL (ADMIN) ----------
function showBuilder(){
  const m = el("builderModal");
  if (m) m.style.display = "flex";
}
function hideBuilder(){
  const m = el("builderModal");
  if (m) m.style.display = "none";
}
function showBuilderConfirm(){
  const m = el("builderConfirm");
  if (m) m.style.display = "flex";
}
function hideBuilderConfirm(){
  const m = el("builderConfirm");
  if (m) m.style.display = "none";
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

let fs = {}; // firestore fns holder

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

// ---------- Admin: własna kolejka ----------
const LEAGUES = [
  { id:"laliga", name:"Hiszpańska LaLiga" },
  { id:"eredivisie", name:"Holenderska Eredivisie" },
  { id:"bundesliga", name:"Niemiecka Bundesliga" },
  { id:"premier", name:"Angielska Premiership" },
  { id:"seriea", name:"Włoska Serie A" },
  { id:"ligue1", name:"Francuska Ligue 1" },
  { id:"ekstraklasa", name:"Polska Ekstraklasa" },
  { id:"ucl", name:"Liga Mistrzów" },
  { id:"uel", name:"Liga Europy" },
  { id:"uecl", name:"Liga Konferencji" },
  { id:"cup_nl", name:"Puchar Holandii" },
  { id:"cup_pl", name:"Puchar Polski" },
  { id:"cup_es", name:"Puchar Hiszpanii" },
  { id:"cup_en", name:"Puchar Anglii" },
  { id:"cup_it", name:"Puchar Włoch" },
];

// Tymczasowa lista meczów do wyboru (bez API) — łatwo ją potem podmienić na pobieranie z serwera.
const FIXTURES = {
  laliga: [
    ["Real Madrid","Barcelona"],["Atletico Madrid","Sevilla"],["Valencia","Villarreal"],["Real Sociedad","Betis"],
    ["Athletic Bilbao","Getafe"],["Celta Vigo","Osasuna"],["Las Palmas","Mallorca"],["Girona","Alaves"],
    ["Rayo Vallecano","Granada"],["Cadiz","Espanyol"],["Almeria","Valladolid"],["Leganes","Eibar"]
  ],
  eredivisie: [
    ["Ajax","PSV"],["Feyenoord","AZ Alkmaar"],["Utrecht","Twente"],["Heerenveen","Sparta Rotterdam"],
    ["Groningen","Vitesse"],["NEC","Go Ahead Eagles"],["Fortuna Sittard","Heracles"],["PEC Zwolle","Excelsior"],
    ["RKC Waalwijk","NAC Breda"],["Volendam","Cambuur"],["Willem II","Emmen"],["ADO Den Haag","Roda JC"]
  ],
  bundesliga: [
    ["Bayern","Dortmund"],["Leipzig","Leverkusen"],["Frankfurt","Stuttgart"],["Union Berlin","Werder Bremen"],
    ["Freiburg","Hoffenheim"],["Wolfsburg","Mainz"],["Augsburg","Koln"],["Monchengladbach","Bochum"],
    ["Heidenheim","Darmstadt"],["Hamburg","Schalke"],["Hertha","Nurnberg"],["Kaiserslautern","Hannover"]
  ],
  premier: [
    ["Liverpool","Manchester City"],["Arsenal","Chelsea"],["Manchester United","Tottenham"],["Newcastle","Aston Villa"],
    ["Everton","West Ham"],["Brighton","Brentford"],["Fulham","Crystal Palace"],["Wolves","Bournemouth"],
    ["Nottingham Forest","Burnley"],["Sheffield United","Leeds"],["Southampton","Leicester"],["Ipswich","Sunderland"]
  ],
  seriea: [
    ["Inter","Milan"],["Juventus","Napoli"],["Roma","Lazio"],["Atalanta","Fiorentina"],
    ["Torino","Bologna"],["Udinese","Genoa"],["Cagliari","Sassuolo"],["Verona","Parma"],
    ["Lecce","Empoli"],["Sampdoria","Monza"],["Palermo","Cremonese"],["Bari","Pisa"]
  ],
  ligue1: [
    ["PSG","Marseille"],["Lyon","Monaco"],["Lille","Rennes"],["Nice","Lens"],
    ["Nantes","Strasbourg"],["Montpellier","Toulouse"],["Reims","Brest"],["Metz","Clermont"],
    ["Angers","Auxerre"],["Saint-Etienne","Bordeaux"],["Caen","Le Havre"],["Dijon","Amiens"]
  ],
  ekstraklasa: [
    ["Jagiellonia","Piast"],["Lechia","Legia"],["Wisla Plock","Radomiak"],["GKS Katowice","Gornik"],
    ["Arka","Cracovia"],["Lech","Pogon"],["Motor","Rakow"],["Korona","Widzew"],
    ["Slask","Zaglebie"],["Stal Mielec","Puszcza"],["Wisla Krakow","LKS"],["Ruch","Gornik Zabrze"]
  ],
  ucl: [
    ["Real Madrid","Bayern"],["Barcelona","PSG"],["Manchester City","Inter"],["Liverpool","Dortmund"],
    ["Arsenal","Juventus"],["Napoli","Milan"],["Benfica","Porto"],["Atletico Madrid","Chelsea"],
    ["Leverkusen","Monaco"],["Leipzig","Lille"],["Roma","Ajax"],["PSV","Sevilla"]
  ],
  uel: [
    ["Roma","Sevilla"],["Leverkusen","Liverpool"],["Ajax","Marseille"],["Sporting","Benfica"],
    ["West Ham","Villarreal"],["Lazio","Betis"],["Fenerbahce","Rangers"],["Shakhtar","Braga"],
    ["Freiburg","Monaco"],["Nice","Feyenoord"],["AZ Alkmaar","Anderlecht"],["Slavia","Dinamo Zagreb"]
  ],
  uecl: [
    ["Aston Villa","Fiorentina"],["PAOK","Besiktas"],["Legia","Basel"],["Lugano","Gent"],
    ["Rapid Wien","Twente"],["Celtic","AZ Alkmaar"],["Hapoel","Lech"],["Partizan","Dinamo"],
    ["Hearts","Rosenborg"],["Sparta","Fenerbahce"],["Viktoria Plzen","Brugge"],["LASK","Rayo Vallecano"]
  ],
  cup_nl: [
    ["Ajax","Feyenoord"],["PSV","AZ Alkmaar"],["Twente","Utrecht"],["Vitesse","Heerenveen"],
    ["Sparta Rotterdam","NEC"],["Go Ahead Eagles","Groningen"],["RKC Waalwijk","Heracles"],["PEC Zwolle","Fortuna Sittard"],
    ["Willem II","ADO Den Haag"],["Cambuur","Volendam"]
  ],
  cup_pl: [
    ["Lech","Legia"],["Wisla Krakow","Cracovia"],["Jagiellonia","Pogon"],["Rakow","Slask"],
    ["Gornik","Widzew"],["Zaglebie","Korona"],["Arka","Motor"],["Piast","Lechia"],
    ["Stal Mielec","Puszcza"],["Radomiak","Wisla Plock"]
  ],
  cup_es: [
    ["Real Madrid","Atletico Madrid"],["Barcelona","Sevilla"],["Valencia","Betis"],["Villarreal","Real Sociedad"],
    ["Athletic Bilbao","Osasuna"],["Celta Vigo","Getafe"],["Girona","Alaves"],["Mallorca","Las Palmas"],
    ["Rayo Vallecano","Granada"],["Cadiz","Espanyol"]
  ],
  cup_en: [
    ["Manchester City","Liverpool"],["Arsenal","Manchester United"],["Chelsea","Tottenham"],["Newcastle","Aston Villa"],
    ["Everton","West Ham"],["Brighton","Brentford"],["Fulham","Crystal Palace"],["Wolves","Bournemouth"],
    ["Nottingham Forest","Leeds"],["Southampton","Leicester"]
  ],
  cup_it: [
    ["Inter","Juventus"],["Milan","Napoli"],["Roma","Lazio"],["Atalanta","Fiorentina"],
    ["Torino","Bologna"],["Udinese","Genoa"],["Cagliari","Sassuolo"],["Verona","Parma"],
    ["Lecce","Empoli"],["Monza","Sampdoria"]
  ],
};

let builderSelected = []; // [{home, away, leagueId, leagueName}]

function isAdmin(){
  return currentRoom && currentRoom.adminUid === userUid;
}

function initBuilderUI(){
  const sel = el("selLeague");
  if(!sel) return;

  sel.innerHTML = "";
  for(const lg of LEAGUES){
    const opt = document.createElement("option");
    opt.value = lg.id;
    opt.textContent = lg.name;
    sel.appendChild(opt);
  }

  sel.onchange = ()=> renderBuilderPool();

  el("btnBuilderClose").onclick = ()=> hideBuilder();
  el("btnClearSelected").onclick = ()=>{
    builderSelected = [];
    renderBuilderSelected();
    renderBuilderPool();
    updateBuilderSaveState();
  };

  el("btnBuilderSave").onclick = ()=>{
    if(builderSelected.length !== 10){
      showToast("Musisz mieć dokładnie 10 meczów");
      return;
    }
    // pokazujemy potwierdzenie
    showBuilderConfirm();
  };

  el("btnConfirmYes").onclick = async ()=>{
    hideBuilderConfirm();
    await saveCustomQueueToFirestore();
  };
  el("btnConfirmNo").onclick = ()=>{
    hideBuilderConfirm(); // wraca do ustawiania meczów
  };
}

function openBuilder(){
  if(!isAdmin()){
    showToast("Tylko admin może ustawiać kolejkę");
    return;
  }
  // reset (opcjonalnie możesz chcieć pamiętać wybór)
  builderSelected = [];
  renderBuilderPool();
  renderBuilderSelected();
  updateBuilderSaveState();
  showBuilder();
}

function renderBuilderPool(){
  const sel = el("selLeague");
  const leagueId = sel ? sel.value : "ekstraklasa";
  const lg = LEAGUES.find(x=>x.id===leagueId) || LEAGUES[0];
  const list = el("poolList");
  const arr = FIXTURES[leagueId] || [];

  if(el("poolCount")) el("poolCount").textContent = String(arr.length);

  if(!list) return;
  list.innerHTML = "";

  arr.forEach((pair)=>{
    const home = pair[0], away = pair[1];

    const item = document.createElement("div");
    item.className = "bItem";
    item.innerHTML = `<div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${home} <span style="opacity:.7">vs</span> ${away}</div>`;
    const sp = document.createElement("div"); sp.className="spacer";

    const btn = document.createElement("button");
    btn.className = "bMini";
    btn.textContent = "Dodaj";

    const already = builderSelected.some(x=>x.home===home && x.away===away && x.leagueId===leagueId);
    if(already){
      btn.textContent = "Dodane";
      btn.disabled = true;
      btn.style.opacity = ".6";
      btn.style.cursor = "not-allowed";
    }
    if(builderSelected.length >= 10 && !already){
      btn.disabled = true;
      btn.style.opacity = ".6";
      btn.style.cursor = "not-allowed";
    }

    btn.onclick = ()=>{
      if(builderSelected.length >= 10){
        showToast("Limit 10 meczów");
        return;
      }
      builderSelected.push({ home, away, leagueId, leagueName: lg.name });
      renderBuilderSelected();
      renderBuilderPool();
      updateBuilderSaveState();

      if(builderSelected.length === 10){
        // automatycznie pokazujemy pytanie
        showBuilderConfirm();
      }
    };

    item.appendChild(sp);
    item.appendChild(btn);
    list.appendChild(item);
  });
}

function renderBuilderSelected(){
  const list = el("selectedList");
  if(el("selectedCount")) el("selectedCount").textContent = String(builderSelected.length);
  if(!list) return;

  list.innerHTML = "";
  builderSelected.forEach((m, idx)=>{
    const item = document.createElement("div");
    item.className = "bItem";

    const t = document.createElement("div");
    t.style.minWidth="0";
    t.style.overflow="hidden";
    t.style.textOverflow="ellipsis";
    t.style.whiteSpace="nowrap";
    t.textContent = `${idx+1}. ${m.home} vs ${m.away}`;

    const sub = document.createElement("div");
    sub.style.opacity=".75";
    sub.style.fontWeight="900";
    sub.style.fontSize="12px";
    sub.textContent = m.leagueName;

    const col = document.createElement("div");
    col.style.display="flex";
    col.style.flexDirection="column";
    col.style.gap="2px";
    col.appendChild(t);
    col.appendChild(sub);

    const sp = document.createElement("div"); sp.className="spacer";

    const del = document.createElement("button");
    del.className = "bMini";
    del.textContent = "Usuń";
    del.onclick = ()=>{
      builderSelected.splice(idx,1);
      renderBuilderSelected();
      renderBuilderPool();
      updateBuilderSaveState();
    };

    item.appendChild(col);
    item.appendChild(sp);
    item.appendChild(del);
    list.appendChild(item);
  });
}

function updateBuilderSaveState(){
  const btn = el("btnBuilderSave");
  const hint = el("builderHint");
  if(btn) btn.disabled = (builderSelected.length !== 10);
  if(hint){
    if(builderSelected.length < 10) hint.textContent = `Dodaj jeszcze ${10 - builderSelected.length} meczów.`;
    else if(builderSelected.length === 10) hint.textContent = `Gotowe: 10 meczów. Możesz zapisać.`;
    else hint.textContent = `Za dużo meczów.`;
  }
}

async function saveCustomQueueToFirestore(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(builderSelected.length !== 10){
    showToast("Musisz mieć dokładnie 10 meczów");
    return;
  }

  try{
    // 1) pobierz istniejące mecze i usuń
    const existingSnap = await fs.getDocs(matchesCol(currentRoomCode));
    const b = fs.writeBatch(db);

    existingSnap.forEach((docu)=>{
      b.delete(docu.ref);
    });

    // 2) dodaj nowe 10
    builderSelected.forEach((m, idx)=>{
      const id = `m_${Date.now()}_${idx}`;
      const ref = fs.doc(db, "rooms", currentRoomCode, "matches", id);
      b.set(ref, {
        idx,
        home: m.home,
        away: m.away,
        leagueId: m.leagueId,
        leagueName: m.leagueName,
        createdAt: fs.serverTimestamp()
      });
    });

    await b.commit();
    showToast("Zapisano kolejkę ✅");
    hideBuilder();
    // po zapisie po prostu zostajesz w oknie typowania (room już jest)
  }catch(e){
    console.error(e);
    showToast("Błąd zapisu kolejki");
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

  fs = { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, orderBy, onSnapshot, writeBatch, deleteDoc, getDocs };

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
  initBuilderUI();

  // jeśli jest zapisany pokój -> pokaż pytanie o kontynuację (bez kodu)
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
      // guziki kontynuacji
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
  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };

  // ADMIN custom queue
  el("btnCustomQueue").onclick = ()=> openBuilder();
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

  // reset
  matchesCache = [];
  picksCache = {};
  picksDocByUid = {};
  submittedByUid = {};
  lastPlayers = [];
  renderMatches();
  renderPlayers([]);

  const ref = roomRef(code);
  const snap = await fs.getDoc(ref);
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  // UI left
  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  const admin = isAdmin();
  el("btnAddQueue").style.display = admin ? "block" : "none";
  el("btnCustomQueue").style.display = admin ? "block" : "none";

  unsubRoomDoc = fs.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    const admin2 = isAdmin();
    el("btnAddQueue").style.display = admin2 ? "block" : "none";
    el("btnCustomQueue").style.display = admin2 ? "block" : "none";
  });

  // live players
  const pq = fs.query(playersCol(code), fs.orderBy("joinedAt","asc"));
  unsubPlayers = fs.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  // live picks (status)
  unsubPicks = fs.onSnapshot(picksCol(code), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });

  // live matches
  const mq = fs.query(matchesCol(code), fs.orderBy("idx","asc"));
  unsubMatches = fs.onSnapshot(mq, async (qs)=>{
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

  const b = fs.writeBatch(db);
  sample.forEach((pair, idx)=>{
    const id = `m_${Date.now()}_${idx}`;
    const ref = fs.doc(db, "rooms", currentRoomCode, "matches", id);
    b.set(ref, {
      idx,
      home: pair[0],
      away: pair[1],
      createdAt: fs.serverTimestamp()
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
