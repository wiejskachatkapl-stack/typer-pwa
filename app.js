const BUILD = 1218;
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
let builderLockedUI = false;

function showBuilder(){
  const m = el("builderModal");
  if (m) m.style.display = "flex";
}
function hideBuilder(){
  const m = el("builderModal");
  if (m) m.style.display = "none";
  builderLockedUI = false;
}
function showBuilderConfirm(){
  const m = el("builderConfirm");
  if (m) m.style.display = "flex";
  builderLockedUI = true;
}
function hideBuilderConfirm(){
  const m = el("builderConfirm");
  if (m) m.style.display = "none";
  builderLockedUI = false;
}

// ---------- RESULTS MODAL ----------
let resultsDraft = {}; // { matchId: {h,a} }

function showResultsModal(){
  const m = el("resultsModal");
  if (m) m.style.display = "flex";
}
function hideResultsModal(){
  const m = el("resultsModal");
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

// ---------- Admin state ----------
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
  const btnFinish = el("btnFinishQueue");
  const btnResults = el("btnEnterResults");

  if(btnAdd) btnAdd.style.display = admin ? "block" : "none";
  if(btnCustom) btnCustom.style.display = admin ? "block" : "none";
  if(btnFinish) btnFinish.style.display = admin ? "block" : "none";
  if(btnResults) btnResults.style.display = admin ? "block" : "none";

  if(admin){
    if(btnAdd) btnAdd.disabled = locked;
    if(btnCustom) btnCustom.disabled = locked;

    if(btnFinish) btnFinish.disabled = !locked;
    // Wyniki sensownie wpisywać gdy kolejka jest locked (mecze zamknięte)
    if(btnResults) btnResults.disabled = !locked;
  }
}

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

const FIXTURES = {
  laliga: [["Real Madrid","Barcelona"],["Atletico Madrid","Sevilla"],["Valencia","Villarreal"],["Real Sociedad","Betis"]],
  eredivisie: [["Ajax","PSV"],["Feyenoord","AZ Alkmaar"],["Utrecht","Twente"],["Heerenveen","Sparta Rotterdam"]],
  bundesliga: [["Bayern","Dortmund"],["Leipzig","Leverkusen"],["Frankfurt","Stuttgart"],["Union Berlin","Werder Bremen"]],
  premier: [["Liverpool","Manchester City"],["Arsenal","Chelsea"],["Manchester United","Tottenham"],["Newcastle","Aston Villa"]],
  seriea: [["Inter","Milan"],["Juventus","Napoli"],["Roma","Lazio"],["Atalanta","Fiorentina"]],
  ligue1: [["PSG","Marseille"],["Lyon","Monaco"],["Lille","Rennes"],["Nice","Lens"]],
  ekstraklasa: [["Jagiellonia","Piast"],["Lechia","Legia"],["Wisla Plock","Radomiak"],["Lech","Pogon"],["Korona","Widzew"],["Slask","Zaglebie"],["Stal Mielec","Puszcza"],["Motor","Rakow"],["GKS Katowice","Gornik"],["Arka","Cracovia"]],
  ucl: [["Real Madrid","Bayern"],["Barcelona","PSG"],["Manchester City","Inter"],["Liverpool","Dortmund"]],
  uel: [["Roma","Sevilla"],["Leverkusen","Liverpool"],["Ajax","Marseille"],["Sporting","Benfica"]],
  uecl: [["Aston Villa","Fiorentina"],["PAOK","Besiktas"],["Legia","Basel"],["Lugano","Gent"]],
  cup_nl: [["Ajax","Feyenoord"],["PSV","AZ Alkmaar"],["Twente","Utrecht"],["Vitesse","Heerenveen"]],
  cup_pl: [["Lech","Legia"],["Wisla Krakow","Cracovia"],["Jagiellonia","Pogon"],["Rakow","Slask"]],
  cup_es: [["Real Madrid","Atletico Madrid"],["Barcelona","Sevilla"],["Valencia","Betis"],["Villarreal","Real Sociedad"]],
  cup_en: [["Manchester City","Liverpool"],["Arsenal","Manchester United"],["Chelsea","Tottenham"],["Newcastle","Aston Villa"]],
  cup_it: [["Inter","Juventus"],["Milan","Napoli"],["Roma","Lazio"],["Atalanta","Fiorentina"]],
};

let builderSelected = [];
let builderDirty = false;

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

  el("btnBuilderClose").onclick = ()=> {
    if(builderLockedUI) return;
    hideBuilder();
  };

  el("btnClearSelected").onclick = ()=>{
    if(builderLockedUI) return;
    builderSelected = [];
    builderDirty = true;
    renderBuilderSelected();
    renderBuilderPool();
    updateBuilderSaveState();
  };

  el("btnBuilderSave").onclick = ()=>{
    if(builderLockedUI) return;
    if(builderSelected.length !== 10){
      showToast("Musisz mieć dokładnie 10 meczów");
      return;
    }
    showBuilderConfirm();
  };

  el("btnConfirmYes").onclick = async ()=>{
    await saveCustomQueueToFirestore();
  };
  el("btnConfirmNo").onclick = ()=>{
    hideBuilderConfirm();
  };
}

function openBuilder(){
  if(!isAdmin()){
    showToast("Tylko admin może ustawiać kolejkę");
    return;
  }
  if(isQueueLocked()){
    showToast("Kolejka jest zablokowana. Najpierw zakończ kolejkę.");
    return;
  }

  builderSelected = [];
  builderDirty = false;

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

    if(builderLockedUI){
      btn.disabled = true;
      btn.style.opacity = ".55";
      btn.style.cursor = "not-allowed";
    } else {
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
    }

    btn.onclick = ()=>{
      if(builderLockedUI) return;
      if(builderSelected.length >= 10){
        showToast("Limit 10 meczów");
        return;
      }
      builderSelected.push({ home, away, leagueId, leagueName: lg.name });
      builderDirty = true;

      renderBuilderSelected();
      renderBuilderPool();
      updateBuilderSaveState();

      if(builderSelected.length === 10){
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

    if(builderLockedUI){
      del.disabled = true;
      del.style.opacity = ".55";
      del.style.cursor = "not-allowed";
    }

    del.onclick = ()=>{
      if(builderLockedUI) return;
      builderSelected.splice(idx,1);
      builderDirty = true;
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
  if(btn) btn.disabled = (builderSelected.length !== 10) || builderLockedUI;

  if(hint){
    if(builderLockedUI){
      hint.textContent = `Potwierdź zapis (TAK/NIE).`;
    } else if(builderSelected.length < 10){
      hint.textContent = `Dodaj jeszcze ${10 - builderSelected.length} meczów.`;
    } else if(builderSelected.length === 10){
      hint.textContent = `Gotowe: 10 meczów.`;
    } else {
      hint.textContent = `Za dużo meczów.`;
    }
  }
}

async function saveCustomQueueToFirestore(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(isQueueLocked()){
    showToast("Kolejka jest zablokowana.");
    hideBuilderConfirm();
    hideBuilder();
    return;
  }
  if(builderSelected.length !== 10){
    showToast("Musisz mieć dokładnie 10 meczów");
    return;
  }

  try{
    const existingSnap = await fs.getDocs(matchesCol(currentRoomCode));
    const b = fs.writeBatch(db);
    existingSnap.forEach((docu)=> b.delete(docu.ref));

    builderSelected.forEach((m, idx)=>{
      const id = `m_${Date.now()}_${idx}`;
      const ref = fs.doc(db, "rooms", currentRoomCode, "matches", id);
      b.set(ref, {
        idx,
        home: m.home,
        away: m.away,
        leagueId: m.leagueId,
        leagueName: m.leagueName,
        createdAt: fs.serverTimestamp(),
        // wyniki puste
        resultH: null,
        resultA: null
      });
    });

    b.set(roomRef(currentRoomCode), {
      queueLocked: true,
      queueLockedAt: fs.serverTimestamp(),
      queueLockedBy: userUid
    }, { merge:true });

    await b.commit();

    hideBuilderConfirm();
    hideBuilder();

    showToast("Zapisano kolejkę i zablokowano ✅");
  }catch(e){
    console.error(e);
    showToast("Błąd zapisu kolejki");
    hideBuilderConfirm();
  }
}

async function finishQueueUnlock(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(!isQueueLocked()){
    showToast("Kolejka nie jest zablokowana");
    return;
  }

  const ok = confirm("Zakończyć kolejkę? Odblokuje to możliwość ustawienia nowej.");
  if(!ok) return;

  try{
    await fs.setDoc(roomRef(currentRoomCode), {
      queueLocked: false,
      queueFinishedAt: fs.serverTimestamp(),
      queueFinishedBy: userUid
    }, { merge:true });

    showToast("Kolejka zakończona. Można ustawić nową ✅");
  }catch(e){
    console.error(e);
    showToast("Błąd zakończenia kolejki");
  }
}

// ---------- Results (Admin) ----------
function buildResultsDraftFromMatches(){
  resultsDraft = {};
  for(const m of matchesCache){
    const h = Number.isInteger(m.resultH) ? m.resultH : null;
    const a = Number.isInteger(m.resultA) ? m.resultA : null;
    resultsDraft[m.id] = { h, a };
  }
}

function renderResultsModal(){
  const list = el("resultsList");
  if(!list) return;
  list.innerHTML = "";

  if(!matchesCache.length){
    const p = document.createElement("div");
    p.className = "panel";
    p.style.padding = "14px";
    p.textContent = "Brak meczów w tej kolejce.";
    list.appendChild(p);
    return;
  }

  matchesCache.forEach((m, idx)=>{
    const row = document.createElement("div");
    row.className = "rRow";

    const teams = document.createElement("div");
    teams.className = "rTeams";
    const l = document.createElement("span");
    l.textContent = m.home || "—";
    const mid = document.createElement("span");
    mid.style.opacity = ".75";
    mid.textContent = " vs ";
    const r = document.createElement("span");
    r.textContent = m.away || "—";
    teams.appendChild(l);
    teams.appendChild(mid);
    teams.appendChild(r);

    const score = document.createElement("div");
    score.className = "rScore";

    const inpH = document.createElement("input");
    inpH.placeholder = "0";
    inpH.inputMode = "numeric";
    inpH.value = (resultsDraft[m.id]?.h ?? "") === "" ? "" : String(resultsDraft[m.id]?.h ?? "");
    inpH.oninput = ()=>{
      const v = clampInt(inpH.value, 0, 20);
      resultsDraft[m.id] = resultsDraft[m.id] || {h:null,a:null};
      resultsDraft[m.id].h = v;
    };

    const sep = document.createElement("div");
    sep.className = "sep";
    sep.textContent = ":";

    const inpA = document.createElement("input");
    inpA.placeholder = "0";
    inpA.inputMode = "numeric";
    inpA.value = (resultsDraft[m.id]?.a ?? "") === "" ? "" : String(resultsDraft[m.id]?.a ?? "");
    inpA.oninput = ()=>{
      const v = clampInt(inpA.value, 0, 20);
      resultsDraft[m.id] = resultsDraft[m.id] || {h:null,a:null};
      resultsDraft[m.id].a = v;
    };

    score.appendChild(inpH);
    score.appendChild(sep);
    score.appendChild(inpA);

    row.appendChild(teams);
    row.appendChild(score);

    list.appendChild(row);
  });
}

function allResultsFilled(){
  if(!matchesCache.length) return false;
  for(const m of matchesCache){
    const r = resultsDraft[m.id];
    if(!r) return false;
    if(!Number.isInteger(r.h) || !Number.isInteger(r.a)) return false;
  }
  return true;
}

async function saveResultsToFirestore(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin może wpisać wyniki");
    return;
  }
  if(!isQueueLocked()){
    showToast("Najpierw zablokuj kolejkę (ustaw mecze).");
    return;
  }
  if(!allResultsFilled()){
    showToast("Uzupełnij wyniki dla wszystkich meczów (0–20).");
    return;
  }

  try{
    const b = fs.writeBatch(db);
    for(const m of matchesCache){
      const r = resultsDraft[m.id];
      const ref = fs.doc(db, "rooms", currentRoomCode, "matches", m.id);
      b.set(ref, {
        resultH: r.h,
        resultA: r.a,
        resultSetAt: fs.serverTimestamp(),
        resultSetBy: userUid
      }, { merge:true });
    }
    await b.commit();

    hideResultsModal();
    showToast("Zapisano wyniki ✅");
  }catch(e){
    console.error(e);
    showToast("Błąd zapisu wyników");
  }
}

function openResults(){
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(!isQueueLocked()){
    showToast("Najpierw ustaw kolejkę (mecze) i ją zablokuj.");
    return;
  }
  buildResultsDraftFromMatches();
  renderResultsModal();
  showResultsModal();
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

  // results modal UI
  el("btnResultsClose").onclick = ()=> hideResultsModal();
  el("btnResultsSave").onclick = async ()=> await saveResultsToFirestore();

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

  // ADMIN
  el("btnAddQueue").onclick = async ()=>{ await addTestQueue(); };
  el("btnCustomQueue").onclick = ()=> openBuilder();
  el("btnFinishQueue").onclick = async ()=> { await finishQueueUnlock(); };

  // NOWE: wyniki
  el("btnEnterResults").onclick = ()=> openResults();
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

  const ref = roomRef(code);
  const snap = await fs.getDoc(ref);
  if(!snap.exists()) throw new Error("Room not found");
  currentRoom = snap.data();

  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  applyAdminButtonsState();

  unsubRoomDoc = fs.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";

    if(isQueueLocked()){
      hideBuilderConfirm();
      hideBuilder();
    }

    applyAdminButtonsState();
  });

  const pq = fs.query(playersCol(code), fs.orderBy("joinedAt","asc"));
  unsubPlayers = fs.onSnapshot(pq, (qs)=>{
    const arr = [];
    qs.forEach(docu=> arr.push(docu.data()));
    lastPlayers = arr;
    renderPlayers(arr);
  });

  unsubPicks = fs.onSnapshot(picksCol(code), (qs)=>{
    picksDocByUid = {};
    qs.forEach(d=>{
      const data = d.data();
      picksDocByUid[d.id] = data?.picks || {};
    });
    recomputeSubmittedMap();
    renderPlayers(lastPlayers);
  });

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

function comparePickToResult(match){
  const p = picksCache?.[match.id];
  if(!p || !Number.isInteger(p.h) || !Number.isInteger(p.a)) return null;

  const hasRes = Number.isInteger(match.resultH) && Number.isInteger(match.resultA);
  if(!hasRes) return null;

  return (p.h === match.resultH && p.a === match.resultA) ? "green" : "red";
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
      // odśwież kropkę
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

    // obok typów pokazujemy wynik + kropkę
    const resBox = document.createElement("div");
    resBox.className = "miniResult";

    const dot = document.createElement("div");
    dot.className = "dot";

    const hasRes = Number.isInteger(m.resultH) && Number.isInteger(m.resultA);
    const label = document.createElement("div");
    label.style.fontWeight = "1000";
    label.style.opacity = ".92";
    label.textContent = hasRes ? `Wynik: ${m.resultH}:${m.resultA}` : "Wynik: —";

    const cmp = comparePickToResult(m);
    if(cmp === "green"){
      dot.style.background = "#33ff88";
      dot.title = "Trafione";
    } else if(cmp === "red"){
      dot.style.background = "#ff4d4d";
      dot.title = "Nietrafione";
    } else {
      dot.style.background = "rgba(255,255,255,.25)";
      dot.title = hasRes ? "Brak typu / niepełny typ" : "Brak wyniku";
    }

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

// ---------- test queue ----------
async function addTestQueue(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast("Tylko admin");
    return;
  }
  if(isQueueLocked()){
    showToast("Kolejka zablokowana – zakończ ją, aby ustawić nową.");
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

  const ok = confirm("Dodać testową kolejkę 10 meczów i zablokować kolejkę?");
  if(!ok) return;

  const b = fs.writeBatch(db);

  const existingSnap = await fs.getDocs(matchesCol(currentRoomCode));
  existingSnap.forEach((docu)=> b.delete(docu.ref));

  sample.forEach((pair, idx)=>{
    const id = `m_${Date.now()}_${idx}`;
    const ref = fs.doc(db, "rooms", currentRoomCode, "matches", id);
    b.set(ref, {
      idx,
      home: pair[0],
      away: pair[1],
      createdAt: fs.serverTimestamp(),
      resultH: null,
      resultA: null
    });
  });

  b.set(roomRef(currentRoomCode), {
    queueLocked: true,
    queueLockedAt: fs.serverTimestamp(),
    queueLockedBy: userUid
  }, { merge:true });

  await b.commit();
  showToast("Dodano testową kolejkę i zablokowano ✅");
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
