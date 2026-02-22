const BUILD = 1022;

// ===== ADD QUEUE MODAL STATE (v1000) =====
const addQueueModalState = { modalOpen:false, addBtnWasDisabled:false, locked:false };

const BG_HOME = "img_menu_pc.png";
const BG_ROOM = "img_tlo.png";

const KEY_NICK = "typer_nick_v3";
const KEY_ACTIVE_ROOM = "typer_active_room_v3";
const KEY_ROOMS_HISTORY = "typer_rooms_history_v3";

// NOWE: język
const KEY_LANG = "typer_lang_v1"; // "pl" | "en"

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

// Set text for normal <button>, but for image-buttons (having data-btn or <img>) only set title/aria-label.
const setBtnLabelSafe = (id, label) => {
  const b = el(id);
  if (!b) return;
  const isImgBtn = b.classList?.contains("imgBtn") || b.dataset?.btn || b.querySelector?.("img");
  if (isImgBtn) {
    b.title = label;
    b.setAttribute("aria-label", label);
  } else {
    b.textContent = label;
  }
};

// ===== ADD QUEUE BUTTON VISIBILITY/LOCK (v1003) =====
function updateAddQueueButtonUI(){
  const b = el("btnAddQueue");
  if(!b) return;
  const adm = isAdmin();
  if(!adm){ b.style.display = "none"; return; }

  // hide when locked (after click) or when this round already has matches
  const hide = !!addQueueModalState.locked || !!matchesCache.length;
  b.style.display = hide ? "none" : "block";
  b.disabled = hide;
}
function setAddQueueLocked(locked){
  addQueueModalState.locked = !!locked;
  updateAddQueueButtonUI();
}

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

// ===== i18n (PL/EN) =====
const I18N = {
  pl: {
    settings: "Ustawienia",
    clearProfile: "Wyczyść profil",
    clearConfirm: "Na pewno wyczyścić profil? To usunie nick, historię, język i cache PWA.",
    cleared: "Profil wyczyszczony.",
    clearFailed: "Nie udało się wyczyścić profilu.",
    language: "Język",
    close: "Zamknij",
    roomsTitle: "Pokoje typerów",
    stats: "Statystyki",
    exit: "Wyjście",

    contTitle: "Kontynuować?",
    contSub: "Wykryto wcześniejszą rozgrywkę",
    contHello: "Witaj ponownie",
    contRoom: "Grasz w pokoju",
    contQ: "Czy chcesz kontynuować grę w tym pokoju?",
    yes: "Tak",
    no: "Nie",
    forget: "Zapomnij pokój",

    nick: "Nick",
    joinTitle: "Dołącz do pokoju",
    joinBtn: "Dołącz",
    joinHelp: "Wpisz kod od admina.",
    createTitle: "Utwórz nowy pokój",
    createBtn: "Utwórz",
    createHelp: "Kod pokoju ma 6 znaków. Adminem będzie osoba, która tworzy pokój.",
    changeNick: "Zmień nick",
    back: "Wróć",

    room: "Pokój",
    admin: "Admin",
    code: "Kod",
    copy: "Kopiuj",
    leave: "Opuść",
    refresh: "Odśwież",
    actions: "Akcje",
    actionsSub: "Zapisz typy dopiero, gdy uzupełnisz wszystkie mecze.",
    savePicks: "Zapisz typy",
    enterResults: "Wpisz wyniki",
    endRound: "Zakończ kolejkę",
    myQueue: "Własna kolejka",
    addQueue: "Dodaj kolejkę",

    matches: "Spotkania",
    matchesSub: "",
    round: "KOLEJKA",
    games: "Mecze",
    pointsRound: "PUNKTY (kolejka)",

    players: "Gracze",
    playersSub: "Zielone ✓ = typy zapisane, czerwone ✗ = brak. Oko aktywne po zapisaniu Twoich typów.",
    leagueBtn: "Tabela ligi typerów",

    results: "Wyniki",
    hintResults: "Podpowiedź: wpisz wszystkie wyniki i kliknij „Zapisz wyniki”.",
    saveResults: "Zapisz wyniki",

    league: "Tabela ligi typerów",
    afterRound: "Po kolejce",
    ranking: "Ranking",
    leagueHint: "Kliknij gracza, aby zobaczyć statystyki (kolejki + podgląd typów).",
    playerCol: "Gracz",
    roundsCol: "Kolejki",
    pointsCol: "Punkty",
    addProfileTitle: "DODAJ PROFIL GRACZA",
    addProfileSub: "Ustaw swój nick, aby rozpocząć grę.",
    nickLabel: "Nick (3–16 znaków):",
    nickPlaceholder: "np. Mariusz",
    nickInvalid: "Nick musi mieć 3–16 znaków.",
    nickRequired: "Nick jest wymagany.",
    ok: "OK",
    cancel: "Anuluj",
    langOnHome: "Język ustawiasz na stronie głównej.",
    avatar: "Avatar",
    chooseAvatar: "Wybierz avatar",
    close: "Zamknij"
  },
  en: {
    settings: "Settings",
    clearProfile: "Clear profile",
    clearConfirm: "Clear profile? This will remove nick, history, language and PWA cache.",
    cleared: "Profile cleared.",
    clearFailed: "Failed to clear profile.",
    language: "Language",
    close: "Close",
    roomsTitle: "Typer rooms",
    stats: "Stats",
    exit: "Exit",

    contTitle: "Continue?",
    contSub: "Previous room detected",
    contHello: "Welcome back",
    contRoom: "You play in room",
    contQ: "Do you want to continue in this room?",
    yes: "Yes",
    no: "No",
    forget: "Forget room",

    nick: "Nick",
    joinTitle: "Join room",
    joinBtn: "Join",
    joinHelp: "Enter the code from admin.",
    createTitle: "Create new room",
    createBtn: "Create",
    createHelp: "Room code has 6 chars. The creator becomes admin.",
    changeNick: "Change nick",
    back: "Back",

    room: "Room",
    admin: "Admin",
    code: "Code",
    copy: "Copy",
    leave: "Leave",
    refresh: "Refresh",
    actions: "Actions",
    actionsSub: "Save picks only after you fill all matches.",
    savePicks: "Save picks",
    enterResults: "Enter results",
    endRound: "End round",
    myQueue: "My fixture",
    addQueue: "Add fixture (test)",

    matches: "Matches",
    matchesSub: "Fill picks (0–20). Admin enters results separately.",
    round: "ROUND",
    games: "Games",
    pointsRound: "POINTS (round)",

    players: "Players",
    playersSub: "Green ✓ = picks saved, red ✗ = missing. Eye active after you save your picks.",
    leagueBtn: "League table",

    results: "Results",
    hintResults: "Tip: fill all results and click “Save results”.",
    saveResults: "Save results",

    league: "League table",
    afterRound: "After round",
    ranking: "Ranking",
    leagueHint: "Click a player to view stats (rounds + picks preview).",
    playerCol: "Player",
    roundsCol: "Rounds",
    pointsCol: "Points",
    addProfileTitle: "ADD PLAYER PROFILE",
    addProfileSub: "Set your nick to start playing.",
    nickLabel: "Nick (3–16 chars):",
    nickPlaceholder: "e.g. Player",
    nickInvalid: "Nick must be 3–16 characters.",
    nickRequired: "Nick is required.",
    ok: "OK",
    cancel: "Cancel",
    langOnHome: "Language is set on the home screen.",
    avatar: "Avatar",
    chooseAvatar: "Choose avatar",
    close: "Close"
  }
};
function getLang(){
  const v = (localStorage.getItem(KEY_LANG) || "").toLowerCase();
  return (v === "en") ? "en" : "pl";
}
function setLang(lang){
  const v = (lang === "en") ? "en" : "pl";
  localStorage.setItem(KEY_LANG, v);
  applyLangToUI();
}

// ===== Buttons (grafiki) =====
// UI assets are stored at the repo root: /<repo>/ui/...
// while this build is typically hosted inside a version folder: /<repo>/v2022/...
// So we compute a stable absolute base for assets.
function getRepoBasePath(){
  const parts = (location.pathname || "/").split("/").filter(Boolean);
  const repo = parts[0] || "";
  return repo ? `/${repo}/` : "/";
}
function getUiBase(){
  return getRepoBasePath() + "ui/";
}
function getBtnDir(){
  return getUiBase() + ((getLang() === "en") ? "buttons/en/" : "buttons/pl/");
}

const BTN_NAME_MAP = {
"btn_pokoj_typerow.png": "btn_tipster_room.png",
  "btn_statystyki.png": "btn_statistics.png",
  "btn_wyjscie.png": "btn_exit.png",
  "btn_wejdz_pokoj.png": "btn_enter_room.png",
  "btn_zaloz.png": "btn_create_room.png",
  "btn_opcje.png": "btn_options.png",
  "btn_nowa_kolejka.png": "btn_new_queue.png",
  "btn_zakoncz_kolejke.png": "btn_end_queue.png",
  "btn_cofnij.png": "btn_back.png",
  "btn_odswiez.png": "btn_refresh.png",
  "btn_tabela_typerow.png": "btn_tipster_table.png",
  "btn_dodaj_profil.png": "btn_add_profile.png",
  "btn_reset_profilu.png": "btn_reset_profile.png",
  "btn_tak.png": "btn_yes.png",
  "btn_nie.png": "btn_no.png",
  "btn_zamknij.png": "btn_close.png",
  "btn_leave_room.png": "btn_opusc.png",
  "btn_ustawienia.png": "btn_settings.png",
  "btn_zapisz_wyniki.png": "btn_save_results.png",
  "btn_dodaj_wyniki.png": "btn_enter_results.png",
  "btn_dodaj_kolejke.png": "btn_add_queue.png",
  "btn_zapisz_kolejke.png": "btn_save_queue.png",
  "btn_zapisz_typy.png": "btn_save_picks.png",
  "btn_dodaj_wyniki1.png": "btn_enter_results.png"
};

function mapBtnName(raw){
  if(!raw) return raw;
  const base = raw.replace(/(\d+)\.png$/i, '.png');
  return BTN_NAME_MAP[base] || base;
}

function refreshAllButtonImages(){
  const dir = getBtnDir();
  document.querySelectorAll('img[data-btn]').forEach(img=>{
    const raw = (img.dataset.btn || '').trim();
    if(!raw) return;

    // Ujednolicenie nazw: jeśli ktoś ma np. btn_statystyki1.png, to wymuszamy btn_statystyki.png
    // (w obu folderach: buttons/pl/ i buttons/en/ powinny być te same nazwy plików).
    const name = mapBtnName(raw);

    const btn = img.closest && img.closest("button");
    // if the image file is missing, fall back to text label with glossy CSS
    img.onerror = () => { if(btn) btn.classList.add("imgMissing"); };
    img.onload = () => { if(btn) btn.classList.remove("imgMissing"); };
    img.src = dir + name;
  });
}
function t(key){
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) ? I18N[lang][key] : (I18N.pl[key] || key);
}


function updateHomeButtonsImages(){
  refreshAllButtonImages();
  // update fallback text labels for image-buttons (when graphics missing)
  document.querySelectorAll(".btnFallbackLabel[data-i18n]").forEach(sp=>{
    const k = (sp.dataset && sp.dataset.i18n) ? sp.dataset.i18n : "";
    if(k) sp.textContent = t(k);
  });
}

function updateLangButtonsVisual(){
  const pl = el("btnLangPL");
  const en = el("btnLangEN");
  if(!pl || !en) return;

  const lang = getLang();
  pl.classList.toggle("active", lang === "pl");
  en.classList.toggle("active", lang === "en");
  pl.classList.toggle("inactive", lang !== "pl");
  en.classList.toggle("inactive", lang !== "en");
}

function applyLangToUI(){
  // HOME titles (tooltipy)
  const hs = el("btnHomeSettings");
  if(hs) hs.title = t("settings");
  const hr = el("btnHomeRooms");
  if(hr) hr.title = t("roomsTitle");
  const ht = el("btnHomeStats");
  if(ht) ht.title = t("stats");
  const he = el("btnHomeExit");
  if(he) he.title = t("exit");

  // HOME images + flag visuals
  updateHomeButtonsImages();
  refreshAllButtonImages();
  // update fallback text labels for image-buttons (when graphics missing)
  document.querySelectorAll(".btnFallbackLabel[data-i18n]").forEach(sp=>{
    const k = (sp.dataset && sp.dataset.i18n) ? sp.dataset.i18n : "";
    if(k) sp.textContent = t(k);
  });
  updateLangButtonsVisual();

  // Continue
  if(el("t_continue_title")) el("t_continue_title").textContent = t("contTitle");
  if(el("t_continue_sub")) el("t_continue_sub").textContent = t("contSub");
  if(el("t_continue_hello")) el("t_continue_hello").textContent = t("contHello");
  if(el("t_continue_room")) el("t_continue_room").textContent = t("contRoom");
  if(el("t_continue_q")) el("t_continue_q").textContent = t("contQ");
  setBtnLabelSafe("btnContYes", t("yes"));
  setBtnLabelSafe("btnContNo", t("no"));
  setBtnLabelSafe("btnContForget", t("forget"));

  // Rooms
  if(el("t_rooms_title")) el("t_rooms_title").textContent = t("roomsTitle");
  if(el("t_nick")) el("t_nick").textContent = t("nick");
  setBtnLabelSafe("btnChangeNickRooms", t("changeNick"));
  setBtnLabelSafe("btnBackHomeFromRooms", t("back"));
  if(el("t_join_title")) el("t_join_title").textContent = t("joinTitle");
  setBtnLabelSafe("btnJoinRoom", t("joinBtn"));
  if(el("t_join_help")) el("t_join_help").textContent = t("joinHelp");
  if(el("t_create_title")) el("t_create_title").textContent = t("createTitle");
  setBtnLabelSafe("btnCreateRoom", t("createBtn"));
  if(el("t_create_help")) el("t_create_help").textContent = t("createHelp");

  // Room
  if(el("t_room_room")) el("t_room_room").textContent = t("room");
  if(el("t_nick2")) el("t_nick2").textContent = t("nick");
  if(el("t_admin")) el("t_admin").textContent = t("admin");
  if(el("t_code")) el("t_code").textContent = t("code");
  setBtnLabelSafe("btnCopyCode", t("copy"));
  setBtnLabelSafe("btnLeave", t("leave"));
  setBtnLabelSafe("btnRefresh", t("refresh"));
  if(el("t_actions")) el("t_actions").textContent = t("actions");
  if(el("t_actions_sub")) el("t_actions_sub").textContent = t("actionsSub");
  setBtnLabelSafe("btnModalSavePicks", t("savePicks"));
  setBtnLabelSafe("btnEnterResults", t("enterResults"));
  setBtnLabelSafe("btnEndRound", t("endRound"));
  // v1001: btnMyQueue removed
  setBtnLabelSafe("btnAddQueue", t("addQueue"));
  setBtnLabelSafe("btnBackFromRoom", t("back"));

  if(el("t_matches")) el("t_matches").textContent = t("matches");
  if(el("t_matches_sub")) el("t_matches_sub").textContent = t("matchesSub");
  if(el("t_round")) el("t_round").textContent = t("round");
  if(el("t_games")) el("t_games").textContent = t("games");
  if(el("t_points_round")) el("t_points_round").textContent = t("pointsRound");

  if(el("t_players")) el("t_players").textContent = t("players");
  if(el("t_players_sub")) el("t_players_sub").textContent = t("playersSub");
  setBtnLabelSafe("btnLeagueFromRoom", t("leagueBtn"));

  // Results
  if(el("t_results")) el("t_results").textContent = t("results");
  if(el("t_room")) el("t_room").textContent = t("room");
  if(el("t_round2")) el("t_round2").textContent = t("round");
  setBtnLabelSafe("btnResBack", t("back"));
  setBtnLabelSafe("btnResSave", t("saveResults"));
  if(el("t_results_hint")) el("t_results_hint").textContent = t("hintResults");

  // League
  if(el("t_league")) el("t_league").textContent = t("league");
  if(el("t_room3")) el("t_room3").textContent = t("room");
  if(el("t_nick3")) el("t_nick3").textContent = t("nick");
  if(el("t_after_round")) el("t_after_round").textContent = t("afterRound");
  setBtnLabelSafe("btnLeagueRefresh", t("refresh"));
  setBtnLabelSafe("btnLeagueBack", t("back"));
  if(el("t_ranking")) el("t_ranking").textContent = t("ranking");
  if(el("leagueHint")) el("leagueHint").textContent = t("leagueHint");
  if(el("t_player_col")) el("t_player_col").textContent = t("playerCol");
  if(el("t_rounds_col")) el("t_rounds_col").textContent = t("roundsCol");
  if(el("t_points_col")) el("t_points_col").textContent = t("pointsCol");
}

// ===== Modal =====
function modalOpen(title, bodyNode){
  const m = el("modal");
  const tEl = el("modalTitle");
  const b = el("modalBody");
  if(!m || !tEl || !b) return;
  tEl.textContent = title || "—";
  b.innerHTML = "";
  if(bodyNode) b.appendChild(bodyNode);
  m.classList.add("active");
}
function modalClose(){
  const m = el("modal");
  if(m) m.classList.remove("active");
}

/** ROOMS MENU MODALS **/

function makeSysImgButton(btnName, {cls="sysBtn", alt="btn", title="", onClick=null} = {}){
  const b = document.createElement("button");
  b.type = "button";
  b.className = `imgBtn ${cls}`.trim();
  if(title) b.title = title;

  const img = document.createElement("img");
  img.dataset.btn = btnName;
  img.alt = alt;

  // Ustaw src od razu (żeby nie było pustki przed refresh)
  img.src = getBtnDir() + mapBtnName(btnName);

  b.appendChild(img);
  if(onClick) b.onclick = onClick;
  return b;
}

function openRoomsChoiceModal(){
  const wrap = document.createElement("div");
  wrap.className = "roomsChoice";

  const p = document.createElement("div");
  p.className = "muted";
  p.textContent = (getLang()==="en")
    ? "Choose what you want to do:"
    : "Wybierz co chcesz zrobić:";
  wrap.appendChild(p);

  const row = document.createElement("div");
  row.className = "roomsChoiceBtns";

  const btnJoin = makeSysImgButton("btn_join.png", {
    cls:"sysBtn sysBtnBig",
    alt:"join",
    title:(getLang()==="en") ? "Join a room" : "Dołącz do pokoju",
    onClick: ()=>{ modalClose(); handleJoinFlow(); }
  });

  const btnCreate = makeSysImgButton("btn_create.png", {
    cls:"sysBtn sysBtnBig",
    alt:"create",
    title:(getLang()==="en") ? "Create room" : "Stwórz pokój",
    onClick: ()=>{ modalClose(); openCreateRoomModal(); }
  });

  row.appendChild(btnJoin);
  row.appendChild(btnCreate);
  wrap.appendChild(row);

  const actions = document.createElement("div");
  actions.className = "roomsChoiceActions";

  const btnMenu = makeSysImgButton("btn_menu.png", {
    cls:"sysBtn",
    alt:"menu",
    title:"Menu",
    onClick: ()=>{ modalClose(); showScreen("home"); }
  });

  actions.appendChild(btnMenu);
  wrap.appendChild(actions);

  modalOpen((getLang()==="en") ? "TYPERS ROOMS" : "POKOJE TYPERÓW", wrap);
  // upewnij się, że obrazki przełączą się przy aktualnym języku
  refreshAllButtonImages();
  // update fallback text labels for image-buttons (when graphics missing)
  document.querySelectorAll(".btnFallbackLabel[data-i18n]").forEach(sp=>{
    const k = (sp.dataset && sp.dataset.i18n) ? sp.dataset.i18n : "";
    if(k) sp.textContent = t(k);
  });
}

async function handleJoinFlow(){
  const saved = getSavedRoom();
  // If user has a saved active room (admin or member), enter immediately.
  if(saved && saved.length===6){
    try{
      await openRoom(saved, {force:true});
      return;
    }catch(err){
      // If room no longer exists, fall back to asking for code
      console.warn("Saved room open failed:", err);
    }
  }
  openJoinRoomModal();
}

function openJoinRoomModal(){
  const wrap = document.createElement("div");
  wrap.className = "joinRoom";

  const lab = document.createElement("div");
  lab.className = "muted";
  lab.textContent = (getLang()==="en")
    ? "Enter room code (6 characters):"
    : "Podaj kod pokoju (6 znaków):";
  wrap.appendChild(lab);

  const inp = document.createElement("input");
  inp.id = "joinCodeInput";
  inp.className = "input";
  inp.maxLength = 6;
  inp.autocomplete = "off";
  inp.placeholder = "ABC123";
  inp.style.textTransform = "uppercase";
  wrap.appendChild(inp);

  const row = document.createElement("div");
row.className = "rowRight";

const btnMenu = makeSysImgButton("btn_menu.png", {
  cls: "sysBtn small",
  alt: "menu",
  title: (getLang()==="en") ? "Menu" : "Menu",
  onClick: ()=>{ modalClose(); openRoomsChoiceModal(); }
});

const btnEnter = makeSysImgButton("btn_wejdz_pokoj.png", {
  cls: "sysBtn",
  alt: "enter",
  title: (getLang()==="en") ? "Join" : "Dołącz",
  onClick: async ()=>{
    const code = (inp.value||"").trim().toUpperCase();
    if(code.length!==6){
      showToast(getLang()==="en" ? "Enter 6-character code" : "Wpisz kod (6 znaków)");
      return;
    }
    modalClose();
    await joinRoom(code);
  }
});

row.appendChild(btnMenu);
row.appendChild(btnEnter);

  wrap.appendChild(row);

  modalOpen((getLang()==="en") ? "JOIN ROOM" : "DOŁĄCZ DO POKOJU", wrap);
  setTimeout(()=>{ inp.focus(); }, 50);
}

function openCreateRoomModal(){
  const wrap = document.createElement("div");
  wrap.className = "createRoom";

  const lab = document.createElement("div");
  lab.className = "muted";
  lab.textContent = (getLang()==="en")
    ? "Room name:"
    : "Nazwa pokoju:";
  wrap.appendChild(lab);

  const inp = document.createElement("input");
  inp.id = "createRoomNameInput";
  inp.className = "input";
  inp.maxLength = 24;
  inp.autocomplete = "off";
  inp.placeholder = (getLang()==="en") ? "e.g. Friends League" : "np. Ekipa znajomych";
  wrap.appendChild(inp);

  const row = document.createElement("div");
  row.className = "rowRight";

const btnMenu = makeSysImgButton("btn_menu.png", {
  cls: "sysBtn small",
  alt: "menu",
  title: (getLang()==="en") ? "Menu" : "Menu",
  onClick: ()=>{ modalClose(); openRoomsChoiceModal(); }
});

const btnCreate = makeSysImgButton("btn_zaloz.png", {
  cls: "sysBtn",
  alt: "create",
  title: (getLang()==="en") ? "Create" : "Stwórz",
  onClick: async ()=>{
    const name = (inp.value||"").trim();
    if(name.length<2){
      showToast(getLang()==="en" ? "Enter room name" : "Wpisz nazwę pokoju");
      return;
    }
    modalClose();
    await createRoom(name);
  }
});

row.appendChild(btnMenu);
row.appendChild(btnCreate);

  wrap.appendChild(row);

  modalOpen((getLang()==="en") ? "CREATE ROOM" : "STWÓRZ POKÓJ", wrap);
  setTimeout(()=>{ inp.focus(); }, 50);
}



// ===== Clear profile (wipe all local data + caches) =====
async function clearProfile(){
  if(!confirm(t("clearConfirm"))) return;
  try{
    localStorage.clear();
    sessionStorage.clear();

    // Clear Cache Storage (PWA)
    if ("caches" in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // Unregister service workers
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    showToast(t("cleared"));
    setTimeout(()=> location.reload(), 450);
  }catch(e){
    console.error(e);
    alert(t("clearFailed"));
  }
}

// ===== Settings modal =====
function openSettings(){
  const wrap = document.createElement("div");
  wrap.className = "settingsWrap";

  const left = document.createElement("div");
  left.className = "settingsLeft";

  const right = document.createElement("div");
  right.className = "settingsRight";

  // Avatar preview
  const avatarBox = document.createElement("div");
  avatarBox.className = "avatarBox";
  const avatarPreview = document.createElement("div");
  avatarPreview.className = "avatarPreview";
  avatarBox.appendChild(avatarPreview);
  right.appendChild(avatarBox);

  // Avatar button
  const btnAvatar = document.createElement("button");
  btnAvatar.className = "glossBtn";
  btnAvatar.type = "button";
  btnAvatar.textContent = t("avatar");
  btnAvatar.onclick = () => openAvatarPicker(() => renderAvatarPreview(avatarPreview));
  left.appendChild(btnAvatar);

  // Reset profile
  const btnClear = document.createElement("button");
  btnClear.className = "imgBtn sysBtn sysBtnBig";
  btnClear.type = "button";
  btnClear.title = t("clearProfile");
  btnClear.setAttribute("aria-label", t("clearProfile"));
  btnClear.style.alignSelf = "flex-start";
  const img = document.createElement("img");
  img.dataset.btn = "btn_reset_profilu.png";
  img.alt = t("clearProfile");
  img.src = getBtnDir() + mapBtnName("btn_reset_profilu.png");
  btnClear.appendChild(img);
  btnClear.onclick = () => clearProfile();
  left.appendChild(btnClear);

  const warn = document.createElement("div");
  warn.className = "sub";
  warn.style.opacity = ".8";
  warn.textContent = (getLang()==="pl")
    ? "Usuwa nick, pokój i całą lokalną pamięć tej gry na tym urządzeniu."
    : "Removes nickname, room and all local data of this game on this device.";
  left.appendChild(warn);

  wrap.appendChild(left);
  wrap.appendChild(right);

  renderAvatarPreview(avatarPreview);
  modalOpen(t("settings"), wrap);
}

function getAvatar(){
  return (localStorage.getItem(KEY_AVATAR) || "").trim();
}
function setAvatar(val){
  localStorage.setItem(KEY_AVATAR, val);
}
function renderAvatarPreview(el){
  if(!el) return;
  const v = getAvatar() || "👤";
  el.textContent = v;
}

function openAvatarPicker(onPick){
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  const grid = document.createElement("div");
  grid.className = "avatarGrid";

  const options = ["👤","⚽","👑","🐺","🤖","🧟","🐯","🔥","⭐","🎯","🦅","🐉"];
  const current = getAvatar() || "👤";

  options.forEach((ico) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "avatarPick";
    b.textContent = ico;
    if(ico === current) b.classList.add("active");
    b.onclick = () => {
      setAvatar(ico);
      closeModal();
      if(typeof onPick === "function") onPick();
    };
    grid.appendChild(b);
  });

  wrap.appendChild(grid);

  const btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.className = "glossBtn";
  btnClose.textContent = t("close");
  btnClose.onclick = () => closeModal();
  wrap.appendChild(btnClose);

  modalOpen(t("chooseAvatar"), wrap);
}


function getNick(){
  return (localStorage.getItem(KEY_NICK) || "").trim();
}
async function ensureNick(){
  let nick = getNick();
  if(nick) return nick;

  while(!nick){
    const res = await nickModalAsk();
    if(res === null) return null; // cancelled
    nick = (res || "").trim();
    if (nick.length < 3 || nick.length > 16){
      nick = "";
      showToast(t("nickInvalid"));
    }
  }

  localStorage.setItem(KEY_NICK, nick);
  refreshNickLabels();
  return nick;
}

function nickModalAsk(){
  return new Promise((resolve)=>{
    const wrap = document.createElement("div");
    wrap.className = "nickWrap";

    const hero = document.createElement("div");
    hero.className = "nickHero";

    const icon = document.createElement("div");
    icon.className = "nickIcon";
    icon.textContent = "👤";

    const tx = document.createElement("div");
    const title = document.createElement("div");
    title.className = "nickTitle";
    title.textContent = t("addProfileTitle");
    const sub = document.createElement("div");
    sub.className = "nickSub";
    sub.textContent = t("addProfileSub");
    tx.appendChild(title);
    tx.appendChild(sub);

    hero.appendChild(icon);
    hero.appendChild(tx);

    const label = document.createElement("div");
    label.style.fontWeight = "900";
    label.style.opacity = ".85";
    label.textContent = t("nickLabel");

    const row = document.createElement("div");
    row.className = "nickRow";

    const input = document.createElement("input");
    input.className = "nickInput";
    input.type = "text";
    input.maxLength = 16;
    input.placeholder = t("nickPlaceholder");
    input.value = getNick() || "";
    input.autocomplete = "nickname";

    row.appendChild(input);

    const meta = document.createElement("div");
    meta.className = "nickMeta";

    const tip = document.createElement("div");
    tip.textContent = (getLang() === "pl") ? "3–16 znaków • litery/cyfry" : "3–16 chars • letters/numbers";

    const count = document.createElement("div");
    count.className = "nickCount";
    const updateCount = () => { count.textContent = `${(input.value||"").length}/16`; };
    updateCount();
    input.addEventListener("input", updateCount);

    meta.appendChild(tip);
    meta.appendChild(count);

    const btns = document.createElement("div");
    btns.className = "nickBtns";

    const mkImgBtn = (dataBtn, title) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "imgBtn nickImgBtn";
      b.title = title || "";
      const img = document.createElement("img");
      img.alt = title || "";
      img.dataset.btn = dataBtn;
      // src will be set by refreshAllButtonImages()
      b.appendChild(img);
      return b;
    };

    const btnCancel = mkImgBtn("btn_cancel.png", t("cancel"));
    const btnOk = mkImgBtn("btn_ok.png", t("ok"));

    btns.appendChild(btnCancel);
    btns.appendChild(btnOk);

    wrap.appendChild(hero);
    wrap.appendChild(label);
    wrap.appendChild(row);
    wrap.appendChild(meta);
    wrap.appendChild(btns);

    modalOpen(t("addProfileTitle"), wrap);
    refreshAllButtonImages();
  // update fallback text labels for image-buttons (when graphics missing)
  document.querySelectorAll(".btnFallbackLabel[data-i18n]").forEach(sp=>{
    const k = (sp.dataset && sp.dataset.i18n) ? sp.dataset.i18n : "";
    if(k) sp.textContent = t(k);
  });

    const closeBtn = el("modalClose");
    const prevCloseOnClick = closeBtn ? closeBtn.onclick : null;

    setTimeout(()=>{ try{ input.focus(); input.select(); }catch(e){} }, 50);

    const closeAndResolve = (val)=>{
      if(closeBtn){
        closeBtn.onclick = prevCloseOnClick || (()=> modalClose());
      }
      modalClose();
      resolve(val);
    };

    if(closeBtn){
      // Keep the close button as an image; only override action to cancel for this modal
      closeBtn.onclick = () => closeAndResolve(null);
    }

    btnCancel.onclick = ()=> closeAndResolve(null);

    const submit = ()=>{
      const v = (input.value || "").trim();
      if(!v){
        showToast(t("nickRequired"));
        try{ input.focus(); }catch(e){}
        return;
      }
      closeAndResolve(v);
    };
    btnOk.onclick = submit;

    input.addEventListener("keydown",(e)=>{
      if(e.key === "Enter"){ e.preventDefault(); submit(); }
      if(e.key === "Escape"){ e.preventDefault(); closeAndResolve(null); }
    });
  });
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

let matchesCache = [];
let picksCache = {};
let picksCompleteSuppressed = false; // gdy klikniesz Cofnij, chowamy pasek zapisu do czasu kolejnej zmiany typu
let picksDirty = false; // true gdy użytkownik zmienił typy od ostatniego wczytania/zapisu

let picksDocByUid = {};
let submittedByUid = {};
let lastPlayers = [];

let pointsByUid = {};
let myPoints = null;

function roomRef(code){ return boot.doc(db, "rooms", code); }
function playersCol(code){ return boot.collection(db, "rooms", code, "players"); }
function matchesCol(code){ return boot.collection(db, "rooms", code, "matches"); }
function picksCol(code){ return boot.collection(db, "rooms", code, "picks"); }
function roundsCol(code){ return boot.collection(db, "rooms", code, "rounds"); }
function leagueCol(code){ return boot.collection(db, "rooms", code, "league"); }

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

  // HOME: settings
  const btnSet = el("btnHomeSettings");
  if(btnSet) btnSet.onclick = () => openSettings();


  // HOME language flags
  const langPL = el("btnLangPL");
  const langEN = el("btnLangEN");
  const bindLang = (node, langVal) => {
    if(!node) return;
    const go = (e) => { if(e) e.preventDefault(); setLang(langVal); refreshAllButtonImages(); updateHomeButtonsImages(); updateLangButtonsVisual(); };
    node.addEventListener("click", go);
    node.addEventListener("touchstart", go, {passive:false});
  };
  bindLang(langPL, "pl");
  bindLang(langEN, "en");


  // HOME
  const __b1 = el("btnHomeRooms");
  if(__b1) __b1.onclick = async ()=>{    if(!getNick()){ const n = await ensureNick(); if(!n) return; }
    openRoomsChoiceModal();
  };

  const __b2 = el("btnHomeStats");
  if(__b2) __b2.onclick = async ()=>{    if(!getNick()){ const n = await ensureNick(); if(!n) return; }
    const saved = getSavedRoom();
    if(saved && saved.length === 6){
      await openLeagueTable(saved);
      return;
    }
    showToast(getLang()==="en" ? "Join a room first" : "Najpierw wybierz / dołącz do pokoju");
    showScreen("rooms");
  };

  const __b3 = el("btnHomeExit");
  if(__b3) __b3.onclick = ()=> showToast(getLang()==="en" ? "You can close the browser tab." : "Możesz zamknąć kartę przeglądarki.");
  // CONTINUE
  const __b4 = el("btnContYes");
  if(__b4) __b4.onclick = async ()=>{    const code = getSavedRoom();
    if(!code) { showScreen("rooms"); return; }
    await openRoom(code, { force:true });
  };
  const __b5 = el("btnContNo");
  if(__b5) __b5.onclick = ()=> showScreen("rooms");  const __b6 = el("btnContForget");
  if(__b6) __b6.onclick = ()=>{    clearSavedRoom();
    showToast(getLang()==="en" ? "Room forgotten" : "Zapomniano pokój");
    showScreen("rooms");
  };

  // ROOMS
  const __b7 = el("btnBackHomeFromRooms");
  if(__b7) __b7.onclick = ()=> showScreen("home");  const __b8 = el("btnChangeNickRooms");
  if(__b8) __b8.onclick = async ()=>{    localStorage.removeItem(KEY_NICK);
  const n = await ensureNick(); if(!n) return;
    showToast(getLang()==="en" ? "Nick changed" : "Zmieniono nick");
  };
  const __b9 = el("btnCreateRoom");
  if(__b9) __b9.onclick = async ()=>{    if(!getNick()){ const n = await ensureNick(); if(!n) return; }
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){ showToast(getLang()==="en" ? "Enter room name" : "Podaj nazwę pokoju"); return; }
    await createRoom(name);
  };
  const __b10 = el("btnJoinRoom");
  if(__b10) __b10.onclick = async ()=>{    if(!getNick()){ const n = await ensureNick(); if(!n) return; }
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){ showToast(getLang()==="en" ? "Code must be 6 chars" : "Kod musi mieć 6 znaków"); return; }
    await joinRoom(code);
  };

  // ROOM
  // Back-from-room action is now attached to the right-bottom "Wyjście" button.
  // (Leaving the room is handled by the "Opuść" button under the room code.)
  const __goHomeFromRoom = ()=> showScreen("home");
  const __btnBackFromRoom = el("btnBackFromRoom");
  if(__btnBackFromRoom) __btnBackFromRoom.onclick = __goHomeFromRoom;

  const __btnCopyCode = el("btnCopyCode");
  if(__btnCopyCode) __btnCopyCode.onclick = async ()=>{
    if(!currentRoomCode) return;
    try{
      await navigator.clipboard.writeText(currentRoomCode);
      showToast(getLang()==="en" ? "Code copied" : "Skopiowano kod");
    }catch{ showToast(getLang()==="en" ? "Copy failed" : "Nie udało się skopiować"); }
  };

  const __btnLeave = el("btnLeave");
  if(__btnLeave) __btnLeave.onclick = async ()=>{ await leaveRoom(); };

  // dodatkowy przycisk „Wyjście” po prawej stronie (obok „Tabela typerów”)
  const __btnExitFromRoomRight = el("btnExitFromRoomRight");
  if(__btnExitFromRoomRight) __btnExitFromRoomRight.onclick = __goHomeFromRoom;
  const __btnRefresh = el("btnRefresh");
  if(__btnRefresh) __btnRefresh.onclick = async ()=>{ if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true}); };

  const __b11 = el("btnModalSavePicks");
  if(__b11) __b11.onclick = async ()=>{ await saveAllPicks(); hidePicksCompleteModal(true); };  const backBtn = el("btnModalBackPicks");
  if(backBtn){
    backBtn.onclick = ()=>{
      suppressPicksCompleteModal();
      // zostajemy w edycji typów
    };
  }

  // END ROUND CONFIRM MODAL BUTTONS
  const __endOk = el("btnEndRoundOk");
  if(__endOk) __endOk.onclick = ()=> resolveEndRoundModal(true);
  const __endCancel = el("btnEndRoundCancel");
  if(__endCancel) __endCancel.onclick = ()=> resolveEndRoundModal(false);
  const __endOverlay = el("endRoundModal");
  if(__endOverlay) __endOverlay.addEventListener("click", (e)=>{
    if(e && e.target && e.target.id === "endRoundModal") resolveEndRoundModal(false);
  });

  // ADMIN
  const __b12 = el("btnEnterResults");
  if(__b12) __b12.onclick = async ()=>{    if(!isAdmin()) { showToast(getLang()==="en" ? "Admin only" : "Tylko admin"); return; }
    if(!matchesCache.length){ showToast(getLang()==="en" ? "No matches" : "Brak meczów"); return; }
    openResultsScreen();
  };

  const __b13 = el("btnEndRound");
  if(__b13) __b13.onclick = async ()=>{    await endRoundConfirmAndArchive();
  };

  const __b14 = el("btnAddQueue");
  if(__b14) __b14.onclick = ()=>{ openAddQueueModal(); };  // ADD QUEUE MODAL (v1001)
  const __btnQM = el("btnQueueManual");
  const __btnQA = el("btnQueueAuto");
  const __btnQB = el("btnQueueBack");
  const __btnQMB = el("btnQueueManualBack");
  const __btnQSave = el("btnQueueSaveManual");

  if(__btnQB) __btnQB.onclick = ()=> closeAddQueueModal({restoreAddBtn:true});
  if(__btnQM) __btnQM.onclick = ()=>{
    const s1 = el("queueModalStep1");
    const man = el("queueModalManual");
    if(s1) s1.style.display = "none";
    if(man) man.style.display = "flex";
    renderManualBuilder();
  };
  if(__btnQMB) __btnQMB.onclick = ()=>{
    const s1 = el("queueModalStep1");
    const man = el("queueModalManual");
    if(man) man.style.display = "none";
    if(s1) s1.style.display = "flex";
  };
  if(__btnQA) __btnQA.onclick = async ()=>{
    try{
      const pairs = buildRandomPairs();
      await addQueuePairs(pairs);
      closeAddQueueModal({restoreAddBtn:false});
      if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true});
    }catch(e){
      console.error(e);
      showToast(getLang()==="en" ? "Auto add failed" : "Nie udało się dodać (auto)");
      // allow retry
      closeAddQueueModal({restoreAddBtn:true});
    }
  };
  if(__btnQSave) __btnQSave.onclick = async ()=>{
    try{
      const pairs = collectManualPairs();
      await addQueuePairs(pairs);
      closeAddQueueModal({restoreAddBtn:false});
      if(currentRoomCode) await openRoom(currentRoomCode, {silent:true, force:true});
    }catch(e){
      console.error(e);
      showToast(getLang()==="en" ? "Fix manual matches" : "Popraw mecze ręczne");
    }
  };

  const __btnMyQueue = el("btnMyQueue"); if(__btnMyQueue) __btnMyQueue.onclick = ()=>{ showToast(getLang()==="en" ? "My fixture – coming next" : "Własna kolejka – dopinamy dalej"); };

  // RESULTS
  const __b15 = el("btnResBack");
  if(__b15) __b15.onclick = ()=> showScreen("room");  const __b16 = el("btnResSave");
  if(__b16) __b16.onclick = async ()=>{ await saveResults(); };
  // League from room
  const __b17 = el("btnLeagueFromRoom");
  if(__b17) __b17.onclick = async ()=>{    if(!currentRoomCode) return;
    await openLeagueTable(currentRoomCode);
  };

  // League
  const __b18 = el("btnLeagueBack");
  if(__b18) __b18.onclick = ()=>{ if(currentRoomCode) showScreen("room"); else showScreen("home"); };  const __b19 = el("btnLeagueRefresh");
  if(__b19) __b19.onclick = async ()=>{    if(!leagueState.roomCode) return;
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
      showToast(getLang()==="en" ? "Saved room not found" : "Zapisany pokój nie istnieje");
      showScreen("rooms");
      return;
    }
    const room = snap.data();
    el("contNick").textContent = getNick() || "—";
    el("contRoomName").textContent = room?.name || "—";
    showScreen("continue");
  }catch{
    showToast(getLang()==="en" ? "Cannot check room" : "Nie udało się sprawdzić pokoju");
    showScreen("rooms");
  }
}

// ===== ROOMS LOGIC =====
async function createRoom(roomName){
  const nick = getNick();
  el("debugRooms").textContent = (getLang()==="en") ? "Creating room…" : "Tworzę pokój…";

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

    el("debugRooms").textContent = (getLang()==="en") ? `Room created ${code}` : `Utworzono pokój ${code}`;
    await openRoom(code);
    return;
  }
  el("debugRooms").textContent = (getLang()==="en")
    ? "Could not generate a free code (try again)."
    : "Nie udało się wygenerować wolnego kodu (spróbuj ponownie).";
}

async function joinRoom(code){
  const nick = getNick();
  el("debugRooms").textContent = (getLang()==="en") ? "Joining…" : "Dołączam…";

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if(!snap.exists()){
    el("debugRooms").textContent = (getLang()==="en") ? "Room not found." : "Nie ma takiego pokoju.";
    showToast(getLang()==="en" ? "Room not found" : "Nie ma takiego pokoju");
    return;
  }

  await boot.setDoc(boot.doc(db, "rooms", code, "players", userUid), {
    nick, uid: userUid, joinedAt: boot.serverTimestamp()
  }, { merge:true });

  localStorage.setItem(KEY_ACTIVE_ROOM, code);
  pushRoomHistory(code);

  el("debugRooms").textContent = (getLang()==="en") ? `Joined ${code}` : `Dołączono do ${code}`;
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
  showToast(getLang()==="en" ? "Left room" : "Opuszczono pokój");
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
  el("roundLabel").textContent = `${t("round")} ${currentRoundNo}`;

  el("roomName").textContent = currentRoom.name || "—";
  el("roomAdmin").textContent = currentRoom.adminNick || "—";
  el("roomCode").textContent = code;

  refreshNickLabels();

  const adm = isAdmin();
  updateAddQueueButtonUI();
  const __myQ1 = el("btnMyQueue"); if(__myQ1) __myQ1.style.display = adm ? "block" : "none";
  el("btnEnterResults").style.display = adm ? "block" : "none";
  el("btnEndRound").style.display = adm ? "block" : "none";
  el("btnEndRound").disabled = true;

  unsubRoomDoc = boot.onSnapshot(ref, (d)=>{
    if(!d.exists()) return;
    currentRoom = d.data();
    el("roomName").textContent = currentRoom.name || "—";
    el("roomAdmin").textContent = currentRoom.adminNick || "—";
    currentRoundNo = currentRoom?.currentRoundNo || 1;
    el("roundLabel").textContent = `${t("round")} ${currentRoundNo}`;

    const adm2 = isAdmin();
    updateAddQueueButtonUI();
    const __myQ2 = el("btnMyQueue"); if(__myQ2) __myQ2.style.display = adm2 ? "block" : "none";
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

    // Admin can enter results only after saving own picks (requested behavior)
    const er = el("btnEnterResults");
    if(er) er.disabled = !isAdmin() || !matchesCache.length || !iAmSubmitted();
  });

  const mq = boot.query(matchesCol(code), boot.orderBy("idx","asc"));
  unsubMatches = boot.onSnapshot(mq, async (qs)=>{
    const arr = [];
    qs.forEach(docu=>{
      arr.push({ id: docu.id, ...docu.data() });
    });
    matchesCache = arr;

    updateAddQueueButtonUI();

    recomputeSubmittedMap();
    recomputePoints();

    renderPlayers(lastPlayers);

    await loadMyPicks();
    renderMatches();

    // Admin can enter results only after saving own picks (requested behavior)
    if(el("btnEnterResults")) el("btnEnterResults").disabled = !isAdmin() || !matchesCache.length || !iAmSubmitted();
    if(el("btnEndRound")) el("btnEndRound").disabled = !(isAdmin() && matchesCache.length && allResultsComplete());
  });

  if(!silent) showToast((getLang()==="en") ? `In room: ${code}` : `W pokoju: ${code}`);
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
    showToast(getLang()==="en" ? "No matches" : "Brak meczów");
    return;
  }
  if(!allMyPicksFilled()){
    showToast(getLang()==="en" ? "Fill all picks" : "Uzupełnij wszystkie typy");
    return;
  }

  const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
  await boot.setDoc(ref, {
    uid: userUid,
    nick: getNick(),
    updatedAt: boot.serverTimestamp(),
    picks: picksCache
  }, { merge:true });

  showToast(getLang()==="en" ? "Picks saved ✅" : "Zapisano typy ✅");

  picksDirty = false;
  picksCompleteSuppressed = true;
  hidePicksCompleteModal(false);

  // Make UI react instantly (before Firestore snapshot arrives)
  submittedByUid[userUid] = true;
  const er = el("btnEnterResults");
  if(er) er.disabled = !isAdmin() || !matchesCache.length || !iAmSubmitted();

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
    status.title = ok ? "Picks saved" : "Missing";
    if(getLang()==="pl") status.title = ok ? "Typy zapisane" : "Brak zapisanych typów";

    left.appendChild(name);
    left.appendChild(status);

    const right = document.createElement("div");
    right.className = "row";
    right.style.gap = "8px";

    if(resultsOk && isCompletePicksObject(picksDocByUid[p.uid])){
      const pts = pointsByUid[p.uid] ?? 0;
      const ptsBadge = document.createElement("div");
      ptsBadge.className = "badge";
      ptsBadge.textContent = (getLang()==="en") ? `${pts} pts` : `${pts} pkt`;
      right.appendChild(ptsBadge);
    }

    const eye = document.createElement("button");
    eye.className = "eyeBtn";
    eye.textContent = "👁";
    eye.title = myOk
      ? (getLang()==="en" ? "Preview picks" : "Podgląd typów")
      : (getLang()==="en" ? "Save your picks to preview others" : "Zapisz swoje typy, aby podglądać innych");
    eye.disabled = !myOk;
    eye.onclick = ()=> openPicksPreview(p.uid, p.nick || "—");
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
      b2.textContent = (getLang()==="en") ? "YOU" : "TY";
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

  if(el("btnEndRound")) el("btnEndRound").disabled = !(isAdmin() && matchesCache.length && allResultsComplete());

  if(!matchesCache.length){
    const info = document.createElement("div");
    info.className = "sub";
    info.textContent = (getLang()==="en")
      ? "No active round. Admin can add a fixture."
      : "Brak aktywnej kolejki. Admin może dodać własną kolejkę.";
    list.appendChild(info);
    // po renderze traktujemy stan jako zsynchronizowany (brak niezapisanych zmian)
  picksDirty = false;
  picksCompleteSuppressed = false;
  picksWasFilled = allMyPicksFilled();
  hidePicksCompleteModal(false);
  // nie pokazujemy modala tylko dlatego, że wartości są już wypełnione

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
      picksDirty = true;
      picksCompleteSuppressed = false;
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
      picksDirty = true;
      picksCompleteSuppressed = false;
      updateSaveButtonState();
      };

    score.appendChild(inpH);
    score.appendChild(sep);
    score.appendChild(inpA);

    if(Number.isInteger(m.resultH) && Number.isInteger(m.resultA)){
      const rp = document.createElement("div");
      rp.className = "resultPill";
      rp.textContent = (getLang()==="en")
        ? `Result: ${m.resultH}:${m.resultA}`
        : `Wynik: ${m.resultH}:${m.resultA}`;
      score.appendChild(rp);
    }

    card.appendChild(leftTeam);
    card.appendChild(score);
    card.appendChild(rightTeam);
    list.appendChild(card);
  }

  // po renderze traktujemy stan jako zsynchronizowany (brak niezapisanych zmian)
  picksDirty = false;
  picksCompleteSuppressed = false;
  picksWasFilled = allMyPicksFilled();
  hidePicksCompleteModal(false);
  // nie pokazujemy modala tylko dlatego, że wartości są już wypełnione

}


let picksWasFilled = false;
let picksModalTimer = null;

function schedulePicksCompleteModal(){
  if(picksModalTimer) clearTimeout(picksModalTimer);
  picksModalTimer = setTimeout(()=>{
    if(!picksDirty) return;
    const filledNow = allMyPicksFilled();
    const modal = el("picksCompleteModal");
    const visible = modal && modal.style.display === "flex";
    if(filledNow && !picksCompleteSuppressed && !visible){
      showPicksCompleteModal();
    }
  }, 350);
}

function showPicksCompleteModal(){
  const modal = el("picksCompleteModal");
  if(!modal) return;
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden","false");
}
function hidePicksCompleteModal(persistSuppress=false){
  const modal = el("picksCompleteModal");
  if(!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden","true");
  if(persistSuppress) picksCompleteSuppressed = true;
}
function suppressPicksCompleteModal(){
  // user wants to continue editing without saving
  picksCompleteSuppressed = true;
  hidePicksCompleteModal(false);
}

// ===== END ROUND CONFIRM (custom modal instead of window.confirm) =====
let endRoundModalResolver = null;
function showEndRoundModal(message){
  const modal = el("endRoundModal");
  const textEl = el("endRoundModalText");
  if(!modal || !textEl) return Promise.resolve(false);

  // cancel previous pending modal
  endRoundModalResolver = null;

  textEl.textContent = String(message || "");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden","false");

  return new Promise((resolve)=>{ endRoundModalResolver = resolve; });
}
function hideEndRoundModal(){
  const modal = el("endRoundModal");
  if(!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden","true");
}
function resolveEndRoundModal(val){
  hideEndRoundModal();
  const r = endRoundModalResolver;
  endRoundModalResolver = null;
  if(typeof r === "function") r(!!val);
}

function updateSaveButtonState(){
  const filled = allMyPicksFilled();

  // jeśli nie ma niezapisanych zmian, nie pokazujemy modala
  if(!picksDirty){
    hidePicksCompleteModal(false);
    picksWasFilled = filled;
    return;
  }

  if(!filled){
    picksWasFilled = false;
    picksCompleteSuppressed = false;
    hidePicksCompleteModal(false);
    return;
  }

  // filled
  if(!picksWasFilled){
    picksWasFilled = true;
    if(!picksCompleteSuppressed){
      showPicksCompleteModal();
    }
    return;
  }

  // już było wypełnione — po edycji pokaż ponownie (z krótkim opóźnieniem)
  if(!picksCompleteSuppressed){
    schedulePicksCompleteModal();
  }
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
  titleChip.textContent = (getLang()==="en") ? `Player: ${nick}` : `Gracz: ${nick}`;

  const roundChip = document.createElement("div");
  roundChip.className = "chip";
  roundChip.textContent = `${t("round")} ${currentRoundNo}`;

  const ptsChip = document.createElement("div");
  ptsChip.className = "chip";
  if(allResultsComplete() && hasPicks){
    const pts = pointsByUid[uid] ?? 0;
    ptsChip.textContent = (getLang()==="en") ? `POINTS: ${pts}` : `PUNKTY: ${pts}`;
  }else{
    ptsChip.textContent = (getLang()==="en") ? `POINTS: —` : `PUNKTY: —`;
  }

  top.appendChild(titleChip);
  top.appendChild(roundChip);
  top.appendChild(ptsChip);
  wrap.appendChild(top);

  if(!hasPicks){
    const info = document.createElement("div");
    info.className = "sub";
    info.textContent = (getLang()==="en")
      ? "This player has not saved picks for this round."
      : "Ten gracz nie ma jeszcze zapisanych typów w tej kolejce.";
    wrap.appendChild(info);
    modalOpen((getLang()==="en") ? "Picks preview" : "Podgląd typów", wrap);
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
    pickPill.textContent = (getLang()==="en") ? `Pick: ${p.h}:${p.a}` : `Typ: ${p.h}:${p.a}`;
    score.appendChild(pickPill);

    const resOk = Number.isInteger(m.resultH) && Number.isInteger(m.resultA);
    const dot = document.createElement("span");
    dot.className = "dot " + (resOk ? dotClassFor(p.h,p.a,m.resultH,m.resultA) : "gray");

    const resPill = document.createElement("div");
    resPill.className = "resultPill";
    resPill.textContent = resOk
      ? ((getLang()==="en") ? `Result: ${m.resultH}:${m.resultA}` : `Wynik: ${m.resultH}:${m.resultA}`)
      : ((getLang()==="en") ? "Result: —" : "Wynik: —");

    const pts = resOk ? scoreOneMatch(p.h,p.a,m.resultH,m.resultA) : null;
    const ptsPill = document.createElement("div");
    ptsPill.className = "resultPill";
    ptsPill.textContent = (pts === null)
      ? ((getLang()==="en") ? "pts: —" : "pkt: —")
      : ((getLang()==="en") ? `pts: ${pts}` : `pkt: ${pts}`);

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

  modalOpen((getLang()==="en") ? "Picks preview" : "Podgląd typów", wrap);
}

// ===== RESULTS SCREEN (ADMIN) =====
const resultsDraft = {}; // matchId -> {h,a}

function openResultsScreen(){
  if(!currentRoomCode) return;
  if(!isAdmin()) return;

  el("resRoomName").textContent = currentRoom?.name || "—";
  el("resRound").textContent = `${t("round")} ${currentRoundNo}`;

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
  if(!isAdmin()) { showToast(getLang()==="en" ? "Admin only" : "Tylko admin"); return; }
  if(!matchesCache.length) { showToast(getLang()==="en" ? "No matches" : "Brak meczów"); return; }

  for(const m of matchesCache){
    const d = resultsDraft[m.id];
    if(!d || !Number.isInteger(d.h) || !Number.isInteger(d.a)){
      showToast(getLang()==="en" ? "Fill all results (0–20)" : "Uzupełnij wszystkie wyniki (0–20)");
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

  showToast(getLang()==="en" ? "Results saved ✅" : "Zapisano wyniki ✅");
  showScreen("room");
}

// ===== ARCHIWUM KOLEJEK (HISTORIA) =====
async function endRoundConfirmAndArchive(){
  if(!currentRoomCode) return;
  if(!isAdmin()) { showToast(getLang()==="en" ? "Admin only" : "Tylko admin"); return; }
  if(!matchesCache.length){ showToast(getLang()==="en" ? "No matches" : "Brak meczów"); return; }
  if(!allResultsComplete()){ showToast(getLang()==="en" ? "Enter all results first" : "Najpierw wpisz komplet wyników"); return; }

  const msg = (getLang()==="en")
    ? `End ROUND ${currentRoundNo} and save it to history?\n\nAfter ending: matches/picks will be archived and the app moves to ROUND ${currentRoundNo+1}.`
    : `Zakończyć KOLEJKĘ ${currentRoundNo} i zapisać do historii?\n\nPo zakończeniu: mecze/typy tej kolejki zostaną zarchiwizowane, a aplikacja przejdzie do KOLEJKI ${currentRoundNo+1}.`;

  const ok = await showEndRoundModal(msg);
  if(!ok) return;

  await archiveCurrentRound();
}

async function archiveCurrentRound(){
  const code = currentRoomCode;
  const roundNo = currentRoundNo;

  const picksSnap = await boot.getDocs(picksCol(code));
  const picksByUid = {};
  const nickByUid = {};
  picksSnap.forEach(d=>{
    const data = d.data();
    picksByUid[d.id] = data?.picks || {};
    if(data?.nick) nickByUid[d.id] = data.nick;
  });

  const matches = matchesCache.map(m=>({
    id: m.id,
    idx: Number.isInteger(m.idx) ? m.idx : 0,
    home: m.home || "",
    away: m.away || "",
    resultH: m.resultH,
    resultA: m.resultA
  }));

  const pointsMap = {};
  for(const [uid, picksObj] of Object.entries(picksByUid)){
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
  }

  const b = boot.writeBatch(db);

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
    picksByUid,
    pointsByUid: pointsMap,
    nickByUid
  }, { merge:false });

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

  b.update(roomRef(code), {
    currentRoundNo: roundNo + 1,
    updatedAt: boot.serverTimestamp()
  });

  for(const m of matchesCache){
    b.delete(boot.doc(db, "rooms", code, "matches", m.id));
  }
  picksSnap.forEach(d=>{
    b.delete(boot.doc(db, "rooms", code, "picks", d.id));
  });

  await b.commit();

  // New round unlocked -> allow adding next queue
  setAddQueueLocked(false);

  showToast(getLang()==="en" ? `ROUND ${roundNo} ended ✅` : `Zakończono KOLEJKĘ ${roundNo} ✅`);
}

// ===== ADD QUEUE (v1000) =====
const TEAMS_V1000 = [
  "Jagiellonia","Piast","Lechia","Legia","Wisla Plock","Radomiak","GKS Katowice","Gornik",
  "Arka","Cracovia","Lech","Pogon","Motor","Rakow","Korona","Widzew","Slask","Zaglebie",
  "Stal Mielec","Puszcza"
];

function showQueueModal(){
  const m = el("queueModal");
  if(!m) return;
  m.style.display = "flex";
  m.setAttribute("aria-hidden","false");
}
function hideQueueModal(){
  const m = el("queueModal");
  if(!m) return;
  m.style.display = "none";
  m.setAttribute("aria-hidden","true");
}

function openAddQueueModal(){
  if(!currentRoomCode) return;
  if(!isAdmin()){ showToast(getLang()==="en" ? "Admin only" : "Tylko admin"); return; }
  if(matchesCache.length){ showToast(getLang()==="en" ? "Round already has matches" : "Ta kolejka ma już mecze"); return; }

  // Lock/hide the add button right away; it will come back only on "Cofnij" or after ending the round.
  setAddQueueLocked(true);

  const s1 = el("queueModalStep1");
  const man = el("queueModalManual");
  if(s1) s1.style.display = "flex";
  if(man) man.style.display = "none";

  addQueueModalState.modalOpen = true;
  showQueueModal();
}

function closeAddQueueModal({restoreAddBtn}={}){
  hideQueueModal();
  addQueueModalState.modalOpen = false;

  if(restoreAddBtn){
    setAddQueueLocked(false);
  }
}

function shuffleInPlace(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function buildRandomPairs(){
  const teams = shuffleInPlace([...TEAMS_V1000]);
  const pairs = [];
  for(let i=0;i<teams.length;i+=2){
    const home = teams[i];
    const away = teams[i+1];
    if(!home || !away) break;
    pairs.push([home, away]);
  }
  return pairs.slice(0,10);
}

async function addQueuePairs(pairs){
  if(!currentRoomCode) return;
  if(!isAdmin()){ showToast(getLang()==="en" ? "Admin only" : "Tylko admin"); return; }
  if(!Array.isArray(pairs) || pairs.length!==10){
    throw new Error("pairs must have length 10");
  }
  const b = boot.writeBatch(db);
  pairs.forEach((pair, idx)=>{
    const id = `m_${Date.now()}_${idx}_${Math.floor(Math.random()*1e6)}`;
    const ref = boot.doc(db, "rooms", currentRoomCode, "matches", id);
    b.set(ref, {
      idx,
      home: pair[0],
      away: pair[1],
      createdAt: boot.serverTimestamp()
    });
  });
  await b.commit();
  showToast(getLang()==="en" ? "Fixture added ✅" : "Dodano kolejkę ✅");
}

function renderManualBuilder(defaultPairs){
  const wrap = el("manualMatches");
  if(!wrap) return;
  wrap.innerHTML = "";

  const pairs = (Array.isArray(defaultPairs) && defaultPairs.length===10) ? defaultPairs : buildRandomPairs();

  const mkSelect = (kind,i)=>{
    const s = document.createElement("select");
    s.className = "scoreInput";
    s.style.width = "220px";
    s.style.padding = "10px 12px";
    s.style.borderRadius = "14px";
    s.style.border = "1px solid rgba(255,255,255,.15)";
    s.style.background = "rgba(0,0,0,.22)";
    s.style.color = "rgba(255,255,255,.92)";
    s.dataset.kind = kind;
    s.dataset.i = String(i);
    TEAMS_V1000.forEach(tn=>{
      const o = document.createElement("option");
      o.value = tn;
      o.textContent = tn;
      s.appendChild(o);
    });
    return s;
  };

  for(let i=0;i<10;i++){
    const row = document.createElement("div");
    row.className = "row";
    row.style.gap = "10px";
    row.style.alignItems = "center";

    const idxBadge = document.createElement("div");
    idxBadge.className = "chip";
    idxBadge.style.padding = "8px 10px";
    idxBadge.textContent = String(i+1);

    const selH = mkSelect("home", i);
    const selA = mkSelect("away", i);

    const sep = document.createElement("div");
    sep.className = "chip";
    sep.style.padding = "8px 10px";
    sep.textContent = "vs";

    selH.value = pairs[i]?.[0] || TEAMS_V1000[0];
    selA.value = pairs[i]?.[1] || TEAMS_V1000[1];

    row.appendChild(idxBadge);
    row.appendChild(selH);
    row.appendChild(sep);
    row.appendChild(selA);
    wrap.appendChild(row);
  }
}


function collectManualPairs(){
  const wrap = el("manualMatches");
  if(!wrap) throw new Error("manualMatches missing");
  const selects = Array.from(wrap.querySelectorAll("select"));
  if(selects.length < 20) throw new Error("need 20 selects");
  const pairs = [];
  const used = new Set();
  for(let i=0;i<10;i++){
    const homeSel = wrap.querySelector(`select[data-kind="home"][data-i="${i}"]`);
    const awaySel = wrap.querySelector(`select[data-kind="away"][data-i="${i}"]`);
    const home = homeSel ? homeSel.value : "";
    const away = awaySel ? awaySel.value : "";
    if(!home || !away) throw new Error("empty");
    if(home === away) throw new Error("same team");
    // enforce uniqueness across the whole round (20 teams max)
    if(used.has(home) || used.has(away)) throw new Error("duplicate team");
    used.add(home); used.add(away);
    pairs.push([home, away]);
  }
  if(pairs.length !== 10) throw new Error("pairs != 10");
  return pairs;
}


// ===== TEST QUEUE =====
async function addTestQueue(){
  if(!currentRoomCode) return;
  if(!isAdmin()){
    showToast(getLang()==="en" ? "Admin only" : "Tylko admin");
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
  showToast(getLang()==="en" ? "Fixture added (test)" : "Dodano kolejkę (test)");
}

// ===== LEAGUE (prawdziwa) =====
const leagueState = {
  roomCode: null,
  roomName: null,
  afterRound: 0,
  selectedRound: 0,
  players: [],
  archives: [],
  finishedRounds: [],
  rows: []
};

async function openLeagueTable(roomCode, opts={}) {
  const { silent=false } = opts;
  roomCode = (roomCode||"").trim().toUpperCase();
  if(roomCode.length !== 6){
    showToast(getLang()==="en" ? "No room" : "Brak pokoju");
    return;
  }

  try{
    const snap = await boot.getDoc(roomRef(roomCode));
    if(!snap.exists()){
      showToast(getLang()==="en" ? "Room not found" : "Pokój nie istnieje");
      return;
    }
    const room = snap.data();
    leagueState.roomCode = roomCode;
    leagueState.roomName = room?.name || "—";
    leagueState.afterRound = (room?.currentRoundNo ? Math.max(0, room.currentRoundNo - 1) : 0);
    leagueState.selectedRound = leagueState.afterRound;

    el("leagueRoomName").textContent = leagueState.roomName;
    // (legacy span kept hidden in HTML for compatibility)
    el("leagueAfterRound").textContent = String(leagueState.selectedRound);

    // load finished rounds (archive)
    await loadLeagueArchives(roomCode);
    setupLeagueRoundSelect();

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

    // keep base player list (nicks) from league collection
    leagueState.players = arr;

    // compute table for selected finished round (or fallback to current totals if no archives)
    recomputeLeagueRowsForSelectedRound();
    renderLeagueTable();
    showScreen("league");
    if(!silent) showToast(getLang()==="en" ? "League table" : "Tabela ligi");
  }catch(e){
    console.error(e);
    showToast(getLang()==="en" ? "Cannot open league table" : "Nie udało się otworzyć tabeli");
  }
}


async function loadLeagueArchives(code){
  try{
    const q = boot.query(roundsCol(code), boot.orderBy("roundNo","asc"));
    const qs = await boot.getDocs(q);
    const archives = [];
    qs.forEach(d=>{
      const data = d.data() || {};
      const rn = Number(data.roundNo ?? 0);
      if(rn > 0){
        archives.push({
          roundNo: rn,
          pointsByUid: data.pointsByUid || {}
        });
      }
    });
    archives.sort((a,b)=>a.roundNo-b.roundNo);
    leagueState.archives = archives;
    leagueState.finishedRounds = archives.map(a=>a.roundNo);
  }catch(e){
    console.error(e);
    leagueState.archives = [];
    leagueState.finishedRounds = [];
  }
}

function setupLeagueRoundSelect(){
  const sel = el("leagueRoundSelect");
  if(!sel) return;

  sel.innerHTML = "";

  if(!leagueState.finishedRounds.length){
    const opt = document.createElement("option");
    opt.value = "0";
    opt.textContent = "—";
    sel.appendChild(opt);
    sel.disabled = true;
    // still show legacy text
    el("leagueAfterRound").textContent = "0";
    return;
  }

  // default: last finished round (usually currentRoundNo-1)
  const maxFinished = Math.max(...leagueState.finishedRounds);
  if(!leagueState.finishedRounds.includes(leagueState.selectedRound)){
    leagueState.selectedRound = maxFinished;
  }

  // show newest first
  const roundsDesc = [...leagueState.finishedRounds].sort((a,b)=>b-a);
  for(const rn of roundsDesc){
    const opt = document.createElement("option");
    opt.value = String(rn);
    opt.textContent = String(rn);
    sel.appendChild(opt);
  }
  sel.value = String(leagueState.selectedRound);
  sel.disabled = false;

  sel.onchange = ()=>{
    const rn = parseInt(sel.value, 10);
    leagueState.selectedRound = Number.isFinite(rn) ? rn : maxFinished;
    el("leagueAfterRound").textContent = String(leagueState.selectedRound);
    recomputeLeagueRowsForSelectedRound();
    renderLeagueTable();
  };

  el("leagueAfterRound").textContent = String(leagueState.selectedRound);
}

function recomputeLeagueRowsForSelectedRound(){
  // if no archives, fallback to current totals from leagueState.players (already sorted later)
  if(!leagueState.finishedRounds.length){
    leagueState.rows = (leagueState.players || []).map(p=>({
      uid: p.uid, nick: p.nick, rounds: p.rounds, points: p.points
    }));
    return;
  }

  const target = leagueState.selectedRound;
  const base = new Map();

  // seed with known players (nicks)
  (leagueState.players || []).forEach(p=>{
    base.set(p.uid, { uid: p.uid, nick: p.nick, rounds: 0, points: 0 });
  });

  for(const arc of (leagueState.archives || [])){
    if(arc.roundNo > target) break;
    const pbu = arc.pointsByUid || {};
    for(const [uid, pts] of Object.entries(pbu)){
      if(!base.has(uid)){
        base.set(uid, { uid, nick: uid, rounds: 0, points: 0 });
      }
      const row = base.get(uid);
      row.rounds += 1;
      row.points += Number(pts ?? 0);
    }
  }

  leagueState.rows = Array.from(base.values());
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
    tr.innerHTML = `<td colspan="4" style="color:rgba(255,255,255,.75)">${getLang()==="en" ? "No data…" : "Brak danych…"}</td>`;
    body.appendChild(tr);
    return;
  }

  rows.forEach((r, idx)=>{
    const tr = document.createElement("tr");
    tr.className = "linkRow";
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(r.nick)}${(r.uid===userUid) ? (getLang()==="en" ? " (YOU)" : " (TY)") : ""}</td>
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

  const q = boot.query(roundsCol(code), boot.orderBy("roundNo","desc"));
  const qs = await boot.getDocs(q);

  const wrap = document.createElement("div");
  wrap.style.display="flex";
  wrap.style.flexDirection="column";
  wrap.style.gap="10px";

  const head = document.createElement("div");
  head.className="row";
  head.style.flexWrap="wrap";
  head.appendChild(chip(`${t("room")}: ${leagueState.roomName}`));
  head.appendChild(chip((getLang()==="en") ? `Player: ${nick}` : `Gracz: ${nick}`));
  wrap.appendChild(head);

  if(qs.empty){
    const info = document.createElement("div");
    info.className="sub";
    info.textContent = (getLang()==="en")
      ? "No finished rounds in history."
      : "Brak zakończonych kolejek w historii.";
    wrap.appendChild(info);
    modalOpen((getLang()==="en") ? "Player stats" : "Statystyki gracza", wrap);
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
    left.innerHTML = `<div style="font-weight:1000">${t("round")} ${rn}</div>
                      <div class="sub">${played ? (getLang()==="en" ? "Played" : "Zagrana") : (getLang()==="en" ? "No picks / incomplete" : "Brak typów / niepełne")}</div>`;

    const right = document.createElement("div");
    right.className="row";

    const ptsChip = document.createElement("div");
    ptsChip.className="chip";
    ptsChip.textContent = (getLang()==="en") ? `Points: ${played ? pts : "—"}` : `Punkty: ${played ? pts : "—"}`;

    const btn = document.createElement("button");
    btn.className="btn btnSmall";
    btn.textContent = (getLang()==="en") ? "Preview" : "Podgląd";
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

  modalOpen((getLang()==="en") ? "Player stats" : "Statystyki gracza", wrap);
}

async function openArchivedPicksPreview(code, roundNo, uid, nick){
  const rd = await boot.getDoc(roundDocRef(code, roundNo));
  if(!rd.exists()){ showToast(getLang()==="en" ? "Round archive missing" : "Brak archiwum tej kolejki"); return; }
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
  top.appendChild(chip((getLang()==="en") ? `Player: ${nick}` : `Gracz: ${nick}`));
  top.appendChild(chip(`${t("round")} ${roundNo}`));
  const pts = data?.pointsByUid?.[uid];
  top.appendChild(chip((getLang()==="en") ? `POINTS: ${pts ?? "—"}` : `PUNKTY: ${pts ?? "—"}`));
  wrap.appendChild(top);

  if(!picksObj){
    const info = document.createElement("div");
    info.className="sub";
    info.textContent = (getLang()==="en")
      ? "No saved picks in this round."
      : "Brak zapisanych typów w tej kolejce.";
    wrap.appendChild(info);
    modalOpen((getLang()==="en") ? "Archive preview" : "Podgląd (archiwum)", wrap);
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
    pickPill.textContent = p
      ? ((getLang()==="en") ? `Pick: ${p.h}:${p.a}` : `Typ: ${p.h}:${p.a}`)
      : ((getLang()==="en") ? "Pick: —" : "Typ: —");
    score.appendChild(pickPill);

    const resOk = Number.isInteger(m.resultH) && Number.isInteger(m.resultA) && p;
    const dot = document.createElement("span");
    dot.className = "dot " + (resOk ? dotClassFor(p.h,p.a,m.resultH,m.resultA) : "gray");

    const resPill = document.createElement("div");
    resPill.className="resultPill";
    resPill.textContent = (getLang()==="en") ? `Result: ${m.resultH}:${m.resultA}` : `Wynik: ${m.resultH}:${m.resultA}`;

    const ptsOne = resOk ? scoreOneMatch(p.h,p.a,m.resultH,m.resultA) : null;
    const ptsPill = document.createElement("div");
    ptsPill.className="resultPill";
    ptsPill.textContent = (ptsOne===null)
      ? ((getLang()==="en") ? "pts: —" : "pkt: —")
      : ((getLang()==="en") ? `pts: ${ptsOne}` : `pkt: ${ptsOne}`);

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

  modalOpen((getLang()==="en") ? "Archive preview" : "Podgląd (archiwum)", wrap);
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

    // zastosuj język od razu
    applyLangToUI();

    showScreen("home");
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();

// Backward-compat helper (some cached HTML may call closeModal)
window.closeModal = function(){
  try{ document.querySelectorAll('.modal.active').forEach(m=>m.classList.remove('active')); }catch(e){}
};
