const BUILD = 2003;

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

// ====== i18n (PL/EN) ======
const I18N = {
  pl: {
    // Settings
    settings_title: "Ustawienia",
    settings_sub: "Nick, język, profile (współdzielenie)",
    settings_close: "Zamknij",

    settings_profile_title: "Profil gracza (współdzielenie)",
    settings_profile_desc:
      "Jeśli kilka osób gra na jednym komputerze – każdy ma swój profil.\nProfil trzyma osobno: nick, ostatni pokój i język.",
    settings_profile_switch: "Przełącz",
    settings_profile_add: "Dodaj",
    settings_profile_remove: "Usuń",
    settings_nick_save: "Zapisz nick",
    settings_nick_ph: "Nick (3–16)",

    settings_lang_title: "Język",
    settings_lang_pl: "🇵🇱 Polski",
    settings_lang_en: "🇬🇧 English",
    settings_lang_current: "Aktualny:",

    settings_local_title: "Dane lokalne",
    settings_local_desc:
      "Wyczyści: nick, ostatni pokój, język, profile (czyli reset przeglądarki dla tej gry).",
    settings_local_clear: "Wyczyść dane lokalne",
    settings_cancel: "Anuluj",

    // Home
    home_stats_soon: "Statystyki: wkrótce (podłączymy).",
    home_exit_info: "Wyjście: w web nie zamkniemy karty automatycznie 🙂",

    // Rooms screen
    rooms_league: "Liga",
    rooms_nick: "Nick:",
    rooms_back: "Wróć",
    rooms_new_room: "Nowy pokój",
    rooms_join_room: "Dołącz do pokoju",
    rooms_create: "Utwórz",
    rooms_join: "Dołącz",
    rooms_roomname_ph: "Nazwa pokoju (np. Domowy)",
    rooms_code_ph: "Wpisz kod (np. AB12CD)",

    // Room screen
    room_title_matches: "Spotkania",
    room_sub_matches: "Uzupełnij typy (0–20). Wyniki admin wpisze osobno.",
    room_matches_count: "Mecze:",
    room_players_title: "Gracze",
    room_players_sub: "Zielone ✓ = typy zapisane, czerwone ✗ = brak.",
    room_actions_title: "Akcje",
    room_actions_sub: "Zapisz typy dopiero, gdy uzupełnisz wszystkie mecze.",
    room_save_picks: "Zapisz typy",
    room_add_queue_test: "Dodaj kolejkę (test)",
    room_copy: "Kopiuj",
    room_leave: "Opuść",
    room_refresh: "Odśwież",
    room_back: "Wróć",

    // Toasts / prompts
    toast_need_roomname: "Podaj nazwę pokoju",
    toast_join_bad_code: "Kod musi mieć 6 znaków",
    toast_no_room: "Nie ma takiego pokoju",
    toast_copied: "Skopiowano kod",
    toast_copy_fail: "Nie udało się skopiować",
    toast_left_room: "Opuszczono pokój",
    toast_only_admin: "Tylko admin",
    toast_added_queue: "Dodano kolejkę (test)",
    toast_saved_picks: "Zapisano typy ✅",
    toast_fill_all: "Uzupełnij wszystkie typy",
    toast_no_matches: "Brak meczów",
    toast_in_room: "W pokoju:",
    toast_profile_added: "Dodano profil:",
    toast_profile_switched: "Przełączono profil",
    toast_profile_deleted: "Profil usunięty",
    toast_profile_cant_last: "Nie można usunąć ostatniego profilu",
    toast_nick_saved: "Zapisano nick",
    toast_nick_bad: "Nick 3–16 znaków",
    toast_lang_pl: "Język: Polski",
    toast_lang_en: "Language: English",
    toast_cleared: "Wyczyszczono dane. Odświeżam…",

    prompt_profile_name: "Nazwa profilu (np. Ania):",
    prompt_nick: "Podaj nick (3–16 znaków):",
    alert_nick_bad: "Nick musi mieć 3–16 znaków.",
    confirm_delete_profile: "Usunąć profil",
    confirm_delete_profile_tail: "(Usunie nick/pokój/język tego profilu)",
    confirm_clear_local: "Na pewno wyczyścić dane lokalne?\n(Nick, pokój, język, profile)",
  },

  en: {
    // Settings
    settings_title: "Settings",
    settings_sub: "Nickname, language, profiles (shared PC)",
    settings_close: "Close",

    settings_profile_title: "Player profile (shared PC)",
    settings_profile_desc:
      "If multiple people play on one computer — each should use a profile.\nA profile stores separately: nickname, last room and language.",
    settings_profile_switch: "Switch",
    settings_profile_add: "Add",
    settings_profile_remove: "Remove",
    settings_nick_save: "Save nickname",
    settings_nick_ph: "Nickname (3–16)",

    settings_lang_title: "Language",
    settings_lang_pl: "🇵🇱 Polish",
    settings_lang_en: "🇬🇧 English",
    settings_lang_current: "Current:",

    settings_local_title: "Local data",
    settings_local_desc:
      "This will clear: nickname, last room, language, profiles (browser reset for this game).",
    settings_local_clear: "Clear local data",
    settings_cancel: "Cancel",

    // Home
    home_stats_soon: "Stats: coming soon.",
    home_exit_info: "Exit: on the web we can't close the tab automatically 🙂",

    // Rooms screen
    rooms_league: "League",
    rooms_nick: "Nick:",
    rooms_back: "Back",
    rooms_new_room: "Create room",
    rooms_join_room: "Join room",
    rooms_create: "Create",
    rooms_join: "Join",
    rooms_roomname_ph: "Room name (e.g. Home)",
    rooms_code_ph: "Enter code (e.g. AB12CD)",

    // Room screen
    room_title_matches: "Matches",
    room_sub_matches: "Enter your picks (0–20). Admin enters results separately.",
    room_matches_count: "Matches:",
    room_players_title: "Players",
    room_players_sub: "Green ✓ = submitted, red ✗ = missing.",
    room_actions_title: "Actions",
    room_actions_sub: "Submit picks only after filling all matches.",
    room_save_picks: "Submit picks",
    room_add_queue_test: "Add round (test)",
    room_copy: "Copy",
    room_leave: "Leave",
    room_refresh: "Refresh",
    room_back: "Back",

    // Toasts / prompts
    toast_need_roomname: "Enter room name",
    toast_join_bad_code: "Code must be 6 characters",
    toast_no_room: "Room not found",
    toast_copied: "Code copied",
    toast_copy_fail: "Copy failed",
    toast_left_room: "Left the room",
    toast_only_admin: "Admin only",
    toast_added_queue: "Round added (test)",
    toast_saved_picks: "Picks saved ✅",
    toast_fill_all: "Fill all picks",
    toast_no_matches: "No matches",
    toast_in_room: "In room:",
    toast_profile_added: "Profile added:",
    toast_profile_switched: "Profile switched",
    toast_profile_deleted: "Profile removed",
    toast_profile_cant_last: "Can't remove the last profile",
    toast_nick_saved: "Nickname saved",
    toast_nick_bad: "Nickname must be 3–16 chars",
    toast_lang_pl: "Language: Polish",
    toast_lang_en: "Language: English",
    toast_cleared: "Local data cleared. Reloading…",

    prompt_profile_name: "Profile name (e.g. Anna):",
    prompt_nick: "Enter nickname (3–16 chars):",
    alert_nick_bad: "Nickname must be 3–16 characters.",
    confirm_delete_profile: "Remove profile",
    confirm_delete_profile_tail: "(This will remove nickname/room/language for that profile)",
    confirm_clear_local: "Clear local data?\n(Nickname, room, language, profiles)",
  }
};

function t(key){
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) ? I18N[lang][key] : (I18N.pl[key] || key);
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
  const tEl = el("toast");
  if (!tEl) return;
  tEl.textContent = msg;
  tEl.style.display = "block";
  clearTimeout(showToast._tm);
  showToast._tm = setTimeout(()=> tEl.style.display="none", 2600);
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

// ====== i18n apply (podmienia teksty w UI) ======
function applyI18n(){
  // Settings
  if (el("settingsTitle")) el("settingsTitle").textContent = t("settings_title");
  if (el("settingsSub")) el("settingsSub").textContent = t("settings_sub");
  if (el("btnSettingsClose")) el("btnSettingsClose").textContent = t("settings_close");

  // sekcje w settings: bierzemy z DOM (nagłówki są w HTML) więc podmieniamy przez selektory:
  // (bezpiecznie – jak ktoś zmieni HTML, nie wywali)
  const blocks = el("settingsModal")?.querySelectorAll(".cardBlock") || [];
  // 0: profile, 1: lang, 2: local (wg naszego index.html)
  if(blocks[0]){
    const title = blocks[0].querySelector(".title");
    const desc = blocks[0].querySelector(".hintTxt");
    if(title) title.textContent = t("settings_profile_title");
    if(desc) desc.textContent = t("settings_profile_desc");
  }
  if(blocks[1]){
    const title = blocks[1].querySelector(".title");
    if(title) title.textContent = t("settings_lang_title");
  }
  if(blocks[2]){
    const title = blocks[2].querySelector(".title");
    const desc = blocks[2].querySelector(".hintTxt");
    if(title) title.textContent = t("settings_local_title");
    if(desc) desc.textContent = t("settings_local_desc");
  }

  // Settings buttons/inputs
  if (el("btnProfileSwitch")) el("btnProfileSwitch").textContent = t("settings_profile_switch");
  if (el("btnProfileAdd")) el("btnProfileAdd").textContent = t("settings_profile_add");
  if (el("btnProfileRemove")) el("btnProfileRemove").textContent = t("settings_profile_remove");
  if (el("btnNickSave")) el("btnNickSave").textContent = t("settings_nick_save");
  if (el("inpNickSettings")) el("inpNickSettings").placeholder = t("settings_nick_ph");

  if (el("btnLangPL")) el("btnLangPL").textContent = t("settings_lang_pl");
  if (el("btnLangEN")) el("btnLangEN").textContent = t("settings_lang_en");
  // “Aktualny: …”
  const langLabel = el("langLabel");
  if(langLabel){
    const l = getLang()==="en" ? "English" : "Polski";
    langLabel.textContent = l;
  }
  // chip “Aktualny: …” to jest tekst w HTML “Aktualny: ” + span,
  // więc podmieniamy sam napis w chipie:
  const langChip = el("settingsModal")?.querySelector(".chip");
  if(langChip){
    // chip ma format: "Aktualny: " + <span id="langLabel">
    const span = el("langLabel");
    if(span){
      langChip.innerHTML = `${t("settings_lang_current")} <span id="langLabel">${span.textContent}</span>`;
    }
  }

  if (el("btnClearLocal")) el("btnClearLocal").textContent = t("settings_local_clear");
  if (el("btnClearLocalCancel")) el("btnClearLocalCancel").textContent = t("settings_cancel");

  // Rooms screen
  const roomsTopChips = el("rooms")?.querySelectorAll(".chip") || [];
  if(roomsTopChips[0]) roomsTopChips[0].textContent = t("rooms_league");
  if(roomsTopChips[1]){
    // "Nick: <span>"
    const span = el("nickLabelRooms");
    roomsTopChips[1].innerHTML = `${t("rooms_nick")} <span id="nickLabelRooms">${span?.textContent || "—"}</span>`;
  }

  if (el("btnBackHome")) el("btnBackHome").textContent = t("rooms_back");
  // panele “Nowy pokój” / “Dołącz do pokoju”
  const roomsPanels = el("rooms")?.querySelectorAll(".panel") || [];
  // roomsPanels[1] = Nowy pokój, roomsPanels[2] = Dołącz (wg index.html)
  if(roomsPanels[1]){
    const tt = roomsPanels[1].querySelector(".title");
    if(tt) tt.textContent = t("rooms_new_room");
  }
  if(roomsPanels[2]){
    const tt = roomsPanels[2].querySelector(".title");
    if(tt) tt.textContent = t("rooms_join_room");
  }
  if (el("btnCreateRoom")) el("btnCreateRoom").textContent = t("rooms_create");
  if (el("btnJoinRoom")) el("btnJoinRoom").textContent = t("rooms_join");
  if (el("inpRoomName")) el("inpRoomName").placeholder = t("rooms_roomname_ph");
  if (el("inpJoinCode")) el("inpJoinCode").placeholder = t("rooms_code_ph");

  // Room screen
  const midTitle = el("room")?.querySelector(".midHead .title");
  const midSub = el("room")?.querySelector(".midHead .sub");
  if(midTitle) midTitle.textContent = t("room_title_matches");
  if(midSub) midSub.textContent = t("room_sub_matches");

  const matchesChip = el("room")?.querySelector(".midHead .chip");
  if(matchesChip){
    const count = el("matchesCount")?.textContent || "0";
    matchesChip.innerHTML = `${t("room_matches_count")} <span id="matchesCount">${count}</span>`;
  }

  const rightTitle = el("room")?.querySelector(".rightBar .title");
  const rightSub = el("room")?.querySelector(".rightBar .sub");
  if(rightTitle) rightTitle.textContent = t("room_players_title");
  if(rightSub) rightSub.textContent = t("room_players_sub");

  // Left action texts/buttons
  const leftPanels = el("room")?.querySelectorAll(".leftBar .panel") || [];
  // leftPanels[1] = room info panel, leftPanels[2] = actions panel (wg index.html)
  if(leftPanels[2]){
    const tt = leftPanels[2].querySelector(".title");
    const ss = leftPanels[2].querySelector(".sub");
    if(tt) tt.textContent = t("room_actions_title");
    if(ss) ss.textContent = t("room_actions_sub");
  }

  if (el("btnSaveAll")) el("btnSaveAll").textContent = t("room_save_picks");
  if (el("btnAddQueue")) el("btnAddQueue").textContent = t("room_add_queue_test");
  if (el("btnCopyCode")) el("btnCopyCode").textContent = t("room_copy");
  if (el("btnLeave")) el("btnLeave").textContent = t("room_leave");
  if (el("btnRefresh")) el("btnRefresh").textContent = t("room_refresh");
  if (el("btnBackFromRoom")) el("btnBackFromRoom").textContent = t("room_back");
}

async function ensureNick(){
  let nick = getNick();
  while(!nick){
    nick = prompt(t("prompt_nick"), "") || "";
    nick = nick.trim();
    if (nick.length < 3 || nick.length > 16) nick = "";
    if (!nick) alert(t("alert_nick_bad"));
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

  applyI18n();
}

function addProfile(){
  const profiles = loadProfiles();
  let name = prompt(t("prompt_profile_name"), "") || "";
  name = name.trim();
  if(name.length < 2) { showToast("OK"); showToast(t("toast_need_roomname")); return; } // drobne zabezp.
  const id = uid6();
  profiles.push({ id, name });
  saveProfiles(profiles);
  setActiveProfileId(id);
  showToast(`${t("toast_profile_added")} ${name}`);
  refreshNickLabels();
  syncSettingsUI();
}

function removeProfile(){
  const profiles = loadProfiles();
  const active = getActiveProfileId();
  if(profiles.length <= 1){
    showToast(t("toast_profile_cant_last"));
    return;
  }
  const p = profiles.find(x=>x.id===active);
  const ok = confirm(`${t("confirm_delete_profile")} "${p?.name || active}"?\n${t("confirm_delete_profile_tail")}`);
  if(!ok) return;

  // usuń dane profilu
  localStorage.removeItem(kNick(active));
  localStorage.removeItem(kRoom(active));
  localStorage.removeItem(kLang(active));

  const next = profiles.filter(x=>x.id!==active);
  saveProfiles(next);
  setActiveProfileId(next[0].id);

  showToast(t("toast_profile_deleted"));
  refreshNickLabels();
  syncSettingsUI();
}

function switchProfile(){
  const sel = el("selProfile");
  const id = sel.value;
  setActiveProfileId(id);
  showToast(t("toast_profile_switched"));
  refreshNickLabels();
  syncSettingsUI();
}

function saveNickFromSettings(){
  let nick = (el("inpNickSettings").value || "").trim();
  if(nick.length < 3 || nick.length > 16){
    showToast(t("toast_nick_bad"));
    return;
  }
  setNick(nick);
  refreshNickLabels();
  showToast(t("toast_nick_saved"));
}

function setLangUI(lang){
  setLang(lang);
  syncSettingsUI();
  showToast(lang==="en" ? t("toast_lang_en") : t("toast_lang_pl"));
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
async function bootApp(){
  setBg(BG_TLO);
  setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

  ensureProfiles(); // ważne dla współdzielenia
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

  applyI18n();
  syncSettingsUI();

  showScreen("home");
}

// ---------- UI binding ----------
function bindUI(){
  // HOME
  el("btnHomeRooms").onclick = async ()=>{
    if(!getNick()) await ensureNick();
    refreshNickLabels();
    applyI18n();

    showScreen("rooms");
    el("debugRooms").textContent = "—";

    const saved = getSavedRoom();
    if(saved && saved.length===6){
      el("debugRooms").textContent = `${t("toast_in_room")} ${saved}`;
      el("inpJoinCode").value = saved;
    }
  };

  el("btnHomeStats").onclick = ()=>{
    showToast(t("home_stats_soon"));
  };

  el("btnHomeExit").onclick = ()=>{
    showToast(t("home_exit_info"));
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
    const ok = confirm(t("confirm_clear_local"));
    if(!ok) return;
    clearAllLocal();
    showToast(t("toast_cleared"));
    setTimeout(()=> location.reload(), 500);
  };

  // ROOMS
  el("btnBackHome").onclick = ()=> { applyI18n(); showScreen("home"); };

  el("btnCreateRoom").onclick = async ()=>{
    const name = (el("inpRoomName").value || "").trim();
    if(name.length < 2){
      showToast(t("toast_need_roomname"));
      return;
    }
    if(!getNick()) await ensureNick();
    await createRoom(name);
  };

  el("btnJoinRoom").onclick = async ()=>{
    const code = (el("inpJoinCode").value || "").trim().toUpperCase();
    if(code.length !== 6){
      showToast(t("toast_join_bad_code"));
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
      showToast(t("toast_copied"));
    }catch{
      showToast(t("toast_copy_fail"));
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
  el("debugRooms").textContent = "…";

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
    await openRoom(code);
    return;
  }
  el("debugRooms").textContent = "ERROR";
}

async function joinRoom(code){
  const nick = getNick();
  el("debugRooms").textContent = "…";

  const ref = roomRef(code);
  const snap = await boot.getDoc(ref);
  if(!snap.exists()){
    el("debugRooms").textContent = t("toast_no_room");
    showToast(t("toast_no_room"));
    return;
  }

  await boot.setDoc(boot.doc(db, "rooms", code, "players", userUid), {
    nick, uid: userUid, joinedAt: boot.serverTimestamp()
  }, { merge:true });

  setSavedRoom(code);
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
  showToast(t("toast_left_room"));
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

  applyI18n();

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

  if(!silent) showToast(`${t("toast_in_room")} ${code}`);
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
    showToast(t("toast_no_matches"));
    return;
  }
  if(!allMyPicksFilled()){
    showToast(t("toast_fill_all"));
    return;
  }

  const ref = boot.doc(db, "rooms", currentRoomCode, "picks", userUid);
  await boot.setDoc(ref, {
    uid: userUid,
    nick: getNick(),
    updatedAt: boot.serverTimestamp(),
    picks: picksCache
  }, { merge:true });

  showToast(t("toast_saved_picks"));
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
    status.title = ok ? "Submitted" : "Missing";

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
      b2.textContent = (getLang()==="en") ? "YOU" : "TY";
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

  if (el("matchesCount")) el("matchesCount").textContent = String(matchesCache.length || 0);

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
  applyI18n(); // żeby chip “Mecze:” był w dobrym języku nawet po renderze
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
    showToast(t("toast_only_admin"));
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
  showToast(t("toast_added_queue"));
}

// ---------- start ----------
(async()=>{
  try{
    setBg(BG_TLO);
    setSplash(`BUILD ${BUILD}\nŁadowanie…`);
    await bootApp();
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
