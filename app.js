const BUILD = 2008;

// TŁA:
const BG_HOME = "img_menu_pc.png"; // START
const BG_APP  = "img_tlo.png";     // RESZTA

// STORAGE (profile)
const KEY_PROFILES = "typer_profiles_v1";
const KEY_ACTIVE_PROFILE = "typer_active_profile_v1";

// Firebase config (Twoje)
const firebaseConfig = {
  apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
  authDomain: "typer-b3087.firebaseapp.com",
  projectId: "typer-b3087",
  storageBucket: "typer-b3087.firebaseapp.com",
  messagingSenderId: "1032303131493",
  appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
  measurementId: "G-5FBDH5G15N"
};

// ---------- helpers ----------
const el = (id) => document.getElementById(id);
const setBg = (src) => { const bg = el("bg"); if (bg) bg.style.backgroundImage = `url("${src}")`; };
const setFooter = (txt) => { const f = el("footerRight"); if (f) f.textContent = txt; };

function hardAlert(msg){
  console.log("[ALERT]", msg);
  alert(msg);
}

function showToast(msg){
  const t = el("toast");
  if (!t) { hardAlert(msg); return; }
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

  if(id === "menu" || id === "splash") setBg(BG_HOME);
  else setBg(BG_APP);
}

function setSplash(msg){
  const h = el("splashHint");
  if (h) h.textContent = msg;
  console.log(msg);
}

function safeCall(fn, ...args){
  try{
    if(typeof fn === "function") return fn(...args);
  }catch(e){
    console.error("[safeCall error]", e);
    showToast("Błąd: " + (e?.message || String(e)));
  }
  return undefined;
}

// ---------- i18n ----------
const I18N = {
  pl: {
    settings: "Ustawienia",
    close: "Zamknij",
    profilesTitle: "Profil gracza (współdzielenie)",
    profilesHint: "Jeśli kilka osób gra na jednym komputerze — każdy ma swój profil. Profil trzyma: nick, ostatni pokój i język.",
    switch: "Przełącz",
    add: "Dodaj",
    del: "Usuń",
    saveNick: "Zapisz nick",
    langTitle: "Język",
    current: "Aktualny",
    localTitle: "Dane lokalne",
    localHint: "Wyczyści: nick, ostatni pokój, język, profile (reset tej gry na tym komputerze).",
    clearLocal: "Wyczyść dane lokalne",
    cancel: "Anuluj",
    roomsTitle: "Pokoje typerów",
    roomsNick: "Nick:",
    newRoom: "Nowy pokój",
    newRoomHint: "Kod pokoju ma 6 znaków. Adminem będzie osoba, która tworzy pokój.",
    joinRoom: "Dołącz do pokoju",
    joinHint: "Wpisz kod od admina.",
    back: "Wróć",
    nickBad: "Nick musi mieć 3–16 znaków.",
    cleared: "Wyczyszczono dane lokalne",
    profileAdded: "Dodano profil",
    profileDeleted: "Usunięto profil",
    profileSwitched: "Przełączono profil",
    nickSaved: "Zapisano nick",
    askClear: "Na pewno wyczyścić dane lokalne? (usunie profile, nick, język i ostatni pokój)",
    welcomeBack: "Witaj ponownie",
    lastRoom: "Ostatni pokój",
    enterRoom: "Wejdź do pokoju",
    changeProfile: "Zmień profil gracza",
    detailsBack: "Wróć",
    nickModalTitle: "Podaj swój nick",
    nickModalSub: "Będzie używany w pokojach i tabeli ligi.",
    nickModalDesc: "Wpisz czytelny nick (3–16 znaków). Możesz go zmienić później w Ustawieniach.",
    next: "Dalej",
    noRoom: "Brak zapisanego pokoju w tym profilu.",
    creating: "Tworzenie pokoju…",
    joining: "Dołączanie…",
    created: "Utworzono pokój",
    joined: "Dołączono do pokoju",
    badCode: "Kod powinien mieć 6 znaków.",
    badRoomName: "Nazwa pokoju: 2–24 znaki.",
    roomNotFound: "Nie znaleziono pokoju o takim kodzie.",
    roomOpen: "Otwieram pokój…",
    pinSetTitle: "Ustaw PIN (4 cyfry)",
    pinEnterTitle: "Podaj PIN (4 cyfry)",
    pinWrong: "Zły PIN.",
    pinNeed: "Aby wejść do pokoju, podaj PIN.",
    pinHint: "PIN jest lokalny (na tym komputerze)."
  },
  en: {
    settings: "Settings",
    close: "Close",
    profilesTitle: "Player profile (shared computer)",
    profilesHint: "If multiple people use one computer — each has their own profile. Profile stores: nickname, last room and language.",
    switch: "Switch",
    add: "Add",
    del: "Delete",
    saveNick: "Save nickname",
    langTitle: "Language",
    current: "Current",
    localTitle: "Local data",
    localHint: "Clears: nickname, last room, language, profiles (full reset on this computer).",
    clearLocal: "Clear local data",
    cancel: "Cancel",
    roomsTitle: "Rooms",
    roomsNick: "Nick:",
    newRoom: "Create room",
    newRoomHint: "Room code has 6 chars. The creator becomes admin.",
    joinRoom: "Join room",
    joinHint: "Enter the admin code.",
    back: "Back",
    nickBad: "Nickname must be 3–16 characters.",
    cleared: "Local data cleared",
    profileAdded: "Profile added",
    profileDeleted: "Profile deleted",
    profileSwitched: "Profile switched",
    nickSaved: "Nickname saved",
    askClear: "Clear local data? (removes profiles, nickname, language and last room)",
    welcomeBack: "Welcome back",
    lastRoom: "Last room",
    enterRoom: "Enter room",
    changeProfile: "Switch player profile",
    detailsBack: "Back",
    nickModalTitle: "Enter your nickname",
    nickModalSub: "Used in rooms and league table.",
    nickModalDesc: "Choose a readable nickname (3–16 chars). You can change it later in Settings.",
    next: "Continue",
    noRoom: "No saved room in this profile.",
    creating: "Creating room…",
    joining: "Joining…",
    created: "Room created",
    joined: "Joined room",
    badCode: "Code must be 6 characters.",
    badRoomName: "Room name: 2–24 chars.",
    roomNotFound: "Room not found.",
    roomOpen: "Opening room…",
    pinSetTitle: "Set PIN (4 digits)",
    pinEnterTitle: "Enter PIN (4 digits)",
    pinWrong: "Wrong PIN.",
    pinNeed: "To enter the room, enter your PIN.",
    pinHint: "PIN is local (this computer only)."
  }
};

function t(key){
  const lang = getActiveProfile().lang || "pl";
  return (I18N[lang] && I18N[lang][key]) ? I18N[lang][key] : (I18N.pl[key] || key);
}

// ---------- Profiles ----------
function uid6(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function loadProfiles(){
  try{
    const raw = localStorage.getItem(KEY_PROFILES);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr.filter(p => p && p.id && typeof p.nick === "string");
  }catch{
    return [];
  }
}

function saveProfiles(arr){
  localStorage.setItem(KEY_PROFILES, JSON.stringify(arr));
}

function getActiveProfileId(){
  return localStorage.getItem(KEY_ACTIVE_PROFILE) || "";
}

function setActiveProfileId(id){
  localStorage.setItem(KEY_ACTIVE_PROFILE, id);
}

function ensureProfiles(){
  let profiles = loadProfiles();
  let activeId = getActiveProfileId();

  if(profiles.length === 0){
    const p = { id: uid6(), nick: "", lastRoom: "", lastRoomName: "", lang: "pl", pinHash: "" };
    profiles = [p];
    saveProfiles(profiles);
    setActiveProfileId(p.id);
    activeId = p.id;
  }

  if(!profiles.some(p => p.id === activeId)){
    setActiveProfileId(profiles[0].id);
  }
  return profiles;
}

function getActiveProfile(){
  const profiles = ensureProfiles();
  const activeId = getActiveProfileId();
  return profiles.find(p => p.id === activeId) || profiles[0];
}

function updateActiveProfile(patch){
  const profiles = ensureProfiles();
  const activeId = getActiveProfileId();
  const idx = profiles.findIndex(p => p.id === activeId);
  if(idx < 0) return;
  profiles[idx] = { ...profiles[idx], ...patch };
  saveProfiles(profiles);
}

function setLang(lang){
  updateActiveProfile({ lang });
  applyI18n();
  updateLangButtons();
  showToast(lang === "pl" ? "Polski ✅" : "English ✅");
}

// ---------- PIN (local) ----------
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b=>b.toString(16).padStart(2,"0")).join("");
}
function normPin(p){ return String(p||"").trim(); }
function isPinValid(p){ return /^\d{4}$/.test(normPin(p)); }

async function ensurePinSet(){
  const prof = getActiveProfile();
  if(prof.pinHash) return true;

  const p = prompt(`${t("pinSetTitle")}\n${t("pinHint")}`);
  if(!isPinValid(p)){
    showToast(t("pinWrong"));
    return false;
  }
  const h = await sha256(normPin(p) + "|" + prof.id);
  updateActiveProfile({ pinHash: h });
  return true;
}

async function verifyPin(){
  const prof = getActiveProfile();
  if(!prof.pinHash){
    const ok = await ensurePinSet();
    return ok;
  }

  for(let attempt=1; attempt<=3; attempt++){
    const p = prompt(`${t("pinEnterTitle")}\n${t("pinNeed")}\n(${attempt}/3)`);
    if(!isPinValid(p)){
      showToast(t("pinWrong"));
      continue;
    }
    const h = await sha256(normPin(p) + "|" + prof.id);
    if(h === prof.pinHash) return true;
    showToast(t("pinWrong"));
  }
  return false;
}

// ---------- Firebase / Firestore ----------
let app, auth, db;
let userUid = null;

let _fs = null;
async function fs(){
  if(_fs) return _fs;

  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  const { getFirestore, doc, setDoc, getDoc, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

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

  _fs = { doc, setDoc, getDoc, serverTimestamp };
  return _fs;
}

function normCode(s){
  return (s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function getRoomByCode(code){
  const { doc, getDoc } = await fs();
  const ref = doc(db, "rooms", code);
  const snap = await getDoc(ref);
  if(!snap.exists()) return null;
  return { code, ...snap.data() };
}

async function createRoom(roomName){
  const { doc, setDoc, getDoc, serverTimestamp } = await fs();

  let name = (roomName || "").trim();
  if(!name){
    const nick = (getActiveProfile().nick || "").trim() || "Gracz";
    name = `Pokój ${nick}`;
  }
  if(name.length < 2 || name.length > 24) throw new Error(t("badRoomName"));

  for(let i=0;i<12;i++){
    const code = uid6();
    const ref = doc(db, "rooms", code);
    const snap = await getDoc(ref);
    if(snap.exists()) continue;

    const nick = (getActiveProfile().nick || "").trim();
    await setDoc(ref, {
      code,
      name,
      adminUid: userUid,
      adminNick: nick,
      createdAt: serverTimestamp(),
      status: "open"
    });

    updateActiveProfile({ lastRoom: code, lastRoomName: name });
    return { code, name };
  }
  throw new Error("Nie udało się wygenerować kodu (spróbuj ponownie).");
}

async function joinRoom(codeInput){
  const code = normCode(codeInput);
  if(code.length !== 6) throw new Error(t("badCode"));

  const room = await getRoomByCode(code);
  if(!room) throw new Error(t("roomNotFound"));

  updateActiveProfile({ lastRoom: code, lastRoomName: room.name || "" });
  return { code, name: room.name || "" };
}

// ---------- UI update ----------
function applyI18n(){
  if(el("st_title")) el("st_title").textContent = t("settings");
  if(el("btnSettingsClose")) el("btnSettingsClose").textContent = t("close");
  if(el("st_profilesTitle")) el("st_profilesTitle").textContent = t("profilesTitle");
  if(el("st_profilesHint")) el("st_profilesHint").textContent = t("profilesHint");
  if(el("btnProfileSwitch")) el("btnProfileSwitch").textContent = t("switch");
  if(el("btnProfileAdd")) el("btnProfileAdd").textContent = t("add");
  if(el("btnProfileDelete")) el("btnProfileDelete").textContent = t("del");
  if(el("btnSaveNickSettings")) el("btnSaveNickSettings").textContent = t("saveNick");
  if(el("st_langTitle")) el("st_langTitle").textContent = t("langTitle");
  if(el("st_localTitle")) el("st_localTitle").textContent = t("localTitle");
  if(el("st_localHint")) el("st_localHint").textContent = t("localHint");
  if(el("btnClearLocal")) el("btnClearLocal").textContent = t("clearLocal");
  if(el("btnClearCancel")) el("btnClearCancel").textContent = t("cancel");

  if(el("st_welcomeChip")) el("st_welcomeChip").textContent = t("welcomeBack");
  if(el("btnEnterRoomFromSettings")) el("btnEnterRoomFromSettings").textContent = t("enterRoom");
  if(el("btnChangeProfileFlow")) el("btnChangeProfileFlow").textContent = t("changeProfile");
  if(el("btnBackToWelcome")) el("btnBackToWelcome").textContent = t("detailsBack");

  if(el("rooms_title")) el("rooms_title").textContent = t("roomsTitle");
  if(el("rooms_nickLabel")) el("rooms_nickLabel").textContent = t("roomsNick");
  if(el("rooms_newRoom")) el("rooms_newRoom").textContent = t("newRoom");
  if(el("rooms_newRoomHint")) el("rooms_newRoomHint").textContent = t("newRoomHint");
  if(el("rooms_join")) el("rooms_join").textContent = t("joinRoom");
  if(el("rooms_joinHint")) el("rooms_joinHint").textContent = t("joinHint");
  if(el("btnBackMenu")) el("btnBackMenu").textContent = t("back");

  if(el("inpRoomName")) el("inpRoomName").placeholder = (getActiveProfile().lang === "en")
    ? "Room name (optional)"
    : "Nazwa pokoju (opcjonalnie)";

  if(el("inpJoinCode")) el("inpJoinCode").placeholder = (getActiveProfile().lang === "en")
    ? "Enter code (e.g. AB12CD)"
    : "Wpisz kod (np. AB12CD)";

  if(el("nickTitle")) el("nickTitle").textContent = t("nickModalTitle");
  if(el("nickSub")) el("nickSub").textContent = t("nickModalSub");
  if(el("nickDesc")) el("nickDesc").textContent = t("nickModalDesc");
  if(el("btnNickSave")) el("btnNickSave").textContent = t("next");
  if(el("btnNickCancel")) el("btnNickCancel").textContent = t("cancel");
}

function updateLangButtons(){
  const lang = getActiveProfile().lang || "pl";
  const bPL = el("btnLangPL");
  const bEN = el("btnLangEN");
  if(bPL) bPL.classList.toggle("active", lang === "pl");
  if(bEN) bEN.classList.toggle("active", lang === "en");
  if(el("st_langCurrent")) el("st_langCurrent").textContent = `${t("current")}: ${lang === "pl" ? "Polski" : "English"}`;
}

function refreshNickLabels(){
  const nick = (getActiveProfile().nick || "").trim() || "—";
  if (el("nickLabelRooms")) el("nickLabelRooms").textContent = nick;
}

function renderProfilesSelect(){
  const sel = el("selProfiles");
  if(!sel) return;

  const profiles = ensureProfiles();
  const activeId = getActiveProfileId();

  sel.innerHTML = "";
  for(const p of profiles){
    const opt = document.createElement("option");
    const displayNick = (p.nick || "").trim() || "(bez nicku)";
    const lang = p.lang || "pl";
    opt.value = p.id;
    opt.textContent = `${displayNick}  •  ${p.id}  •  ${lang.toUpperCase()}`;
    if(p.id === activeId) opt.selected = true;
    sel.appendChild(opt);
  }
}

// ---------- Settings welcome/details flow ----------
function showSettingsWelcome(){
  const prof = getActiveProfile();
  const nick = (prof.nick || "").trim();
  const lastRoom = (prof.lastRoom || "").trim().toUpperCase();
  const lastName = (prof.lastRoomName || "").trim();

  if(!nick){
    showSettingsDetails(false);
    return;
  }

  el("settingsWelcome").style.display = "block";
  el("settingsDetails").style.display = "none";
  el("detailsTopBar").style.display = "none";

  el("st_welcomeNick").textContent = nick;

  if(lastRoom){
    const label = lastName ? `${lastRoom} • ${lastName}` : lastRoom;
    el("st_welcomeRoomLine").textContent = `${t("lastRoom")}: ${label}`;
    el("btnEnterRoomFromSettings").disabled = false;
  }else{
    el("st_welcomeRoomLine").textContent = `${t("lastRoom")}: —`;
    el("btnEnterRoomFromSettings").disabled = true;
  }
}

function showSettingsDetails(showBackButton){
  el("settingsWelcome").style.display = "none";
  el("settingsDetails").style.display = "flex";
  el("detailsTopBar").style.display = showBackButton ? "flex" : "none";

  renderProfilesSelect();
  el("inpNickSettings").value = getActiveProfile().nick || "";
  applyI18n();
  updateLangButtons();
  refreshNickLabels();
}

function openSettings(){
  renderProfilesSelect();
  el("inpNickSettings").value = getActiveProfile().nick || "";
  applyI18n();
  updateLangButtons();
  refreshNickLabels();
  showSettingsWelcome();
  el("settingsModal").style.display = "flex";
}
function closeSettings(){
  el("settingsModal").style.display = "none";
}

// ---------- NICK MODAL ----------
let _nickResolve = null;

function openNickModal(){
  return new Promise((resolve)=>{
    _nickResolve = resolve;

    applyI18n();
    const prof = getActiveProfile();
    const lang = prof.lang || "pl";

    el("inpNickModal").value = "";
    el("inpNickModal").placeholder = (lang === "en") ? "Nickname (e.g. Mike)" : "Nick (np. Mariusz)";
    el("nickError").style.display = "none";
    el("nickError").textContent = "";

    el("nickModal").style.display = "flex";
    setTimeout(()=> el("inpNickModal").focus(), 50);
  });
}
function closeNickModal(){
  el("nickModal").style.display = "none";
}
function validateNick(v){
  v = (v || "").trim();
  if(v.length < 3 || v.length > 16) return { ok:false, v };
  return { ok:true, v };
}
async function ensureNickNice(){
  const nick = (getActiveProfile().nick || "").trim();
  if(nick) return nick;

  const ok = await openNickModal();
  if(!ok) return "";

  const pinOk = await ensurePinSet();
  if(!pinOk) return "";

  return (getActiveProfile().nick || "").trim();
}

// ---------- Continue modal ----------
async function showContinueModalForCode(code){
  const modal = el("continueModal");
  const text = el("continueText");
  if (!modal || !text) return;

  const nick = (getActiveProfile().nick || "").trim() || "—";
  let roomName = (getActiveProfile().lastRoomName || "").trim();

  try{
    if(!roomName){
      const room = await getRoomByCode(code);
      roomName = room?.name || "";
      if(roomName) updateActiveProfile({ lastRoomName: roomName });
    }
  }catch{}

  text.textContent =
    `${nick}\n\n` +
    `Grasz w pokoju: ${roomName || "—"}\n` +
    `Kod: ${code}\n\n` +
    `Czy chcesz kontynuować w tym pokoju?\n\n` +
    `${t("pinNeed")}`;

  modal.style.display = "flex";
}

function hideContinueModal(){ el("continueModal").style.display = "none"; }
function clearSavedRoom(){ updateActiveProfile({ lastRoom: "", lastRoomName: "" }); }

// ---------- Rooms open flow ----------
async function handleOpenRooms(){
  const nick = await ensureNickNice();
  if(!nick){ showToast("Anulowano"); return; }
  refreshNickLabels();

  const saved = (getActiveProfile().lastRoom || "").trim().toUpperCase();
  if(saved && saved.length === 6){
    showScreen("rooms");
    await showContinueModalForCode(saved);
    return;
  }
  showScreen("rooms");
  if(el("debugRooms")) el("debugRooms").textContent = "—";
}

// ---------- ROOM: AUTO-WPIĘCIE STAREJ LOGIKI ----------
let CURRENT_ROOM = { code:"", name:"" };

function detectLegacyOpenRoom(){
  // Najbardziej prawdopodobne nazwy z poprzednich wersji:
  const candidates = [];

  // 1) window.boot.*
  if (window.boot){
    candidates.push(
      window.boot.openRoom,
      window.boot.enterRoom,
      window.boot.startRoom,
      window.boot.goRoom,
      window.boot.open,
      window.boot.enter
    );
  }

  // 2) window.Typer / window.TyperApp / window.app
  if (window.Typer){
    candidates.push(window.Typer.openRoom, window.Typer.enterRoom, window.Typer.startRoom);
  }
  if (window.TyperApp){
    candidates.push(window.TyperApp.openRoom, window.TyperApp.enterRoom, window.TyperApp.startRoom);
  }
  if (window.app){
    candidates.push(window.app.openRoom, window.app.enterRoom, window.app.startRoom);
  }

  // 3) global funkcje (czasem były jako window.openRoom)
  candidates.push(
    window.openRoom,
    window.enterRoom,
    window.startRoom,
    window.renderRoom,
    window.showRoom
  );

  // Zwróć pierwszą działającą funkcję
  for(const fn of candidates){
    if(typeof fn === "function") return fn;
  }
  return null;
}

async function openRoomScreen(code){
  const okPin = await verifyPin();
  if(!okPin){
    showToast(t("pinWrong"));
    return;
  }

  showToast(t("roomOpen"));
  showScreen("room");

  try{
    const room = await getRoomByCode(code);
    CURRENT_ROOM = { code, name: room?.name || (getActiveProfile().lastRoomName || "") || "" };
  }catch{
    CURRENT_ROOM = { code, name: (getActiveProfile().lastRoomName || "") || "" };
  }

  // 1) Spróbuj odpalić starą logikę
  const legacyFn = detectLegacyOpenRoom();
  if(legacyFn){
    console.log("[LEGACY] found openRoom fn:", legacyFn.name || "(anonymous)");
    // próbujemy różne sygnatury (code / roomObject)
    const roomObj = {
      code: CURRENT_ROOM.code,
      name: CURRENT_ROOM.name,
      nick: (getActiveProfile().nick || "").trim(),
      profileId: getActiveProfile().id
    };

    // Najpierw klasycznie (code)
    let res = safeCall(legacyFn, CURRENT_ROOM.code);

    // Jeśli legacy oczekuje obiektu (często tak bywa), spróbuj też obiekt
    if(res === undefined){
      res = safeCall(legacyFn, roomObj);
    }

    // Jeśli legacy zwraca Promise i wywali błąd — złapiemy
    if(res && typeof res.then === "function"){
      res.catch(e=>{
        console.error("[LEGACY async error]", e);
        showToast("Błąd w starej logice: " + (e?.message || String(e)));
      });
    }

    // ✅ Jeśli legacyFn istnieje, to zakładamy że sama wyrenderuje ekran typowania.
    // Nie nadpisujemy już placeholderem.
    return;
  }

  // 2) Fallback: pokaż informację (żebyś widział że pokój istnieje)
  const info =
    `Pokój: ${CURRENT_ROOM.name || "—"}\n` +
    `Kod: ${CURRENT_ROOM.code}\n` +
    `Nick: ${(getActiveProfile().nick||"").trim() || "—"}\n\n` +
    `Nie wykryto starej logiki (boot/app).`;

  const holder = el("roomInfoText"); // jeśli masz ten id - pokaże, jak nie masz - nic
  if(holder) holder.textContent = info;
  console.log("[ROOM fallback]", CURRENT_ROOM);
}

// ---------- UI binding ----------
function bindUI(){
  // HOME
  el("btnOpenRooms").onclick = async ()=>{ await handleOpenRooms(); };
  el("btnOpenStats").onclick = ()=>{ showToast("Statystyki — wkrótce"); };
  el("btnExitApp").onclick = ()=>{ showToast("Wyjście — zamknij kartę / aplikację"); };

  // Settings
  el("btnOpenSettings").onclick = ()=> openSettings();
  el("btnSettingsClose").onclick = ()=> closeSettings();
  el("btnClearCancel").onclick = ()=> closeSettings();

  el("btnChangeProfileFlow").onclick = ()=> showSettingsDetails(true);
  el("btnBackToWelcome").onclick = ()=> showSettingsWelcome();

  el("btnEnterRoomFromSettings").onclick = async ()=>{
    const saved = (getActiveProfile().lastRoom || "").trim().toUpperCase();
    if(!saved){ showToast(t("noRoom")); return; }
    closeSettings();
    showScreen("rooms");
    await showContinueModalForCode(saved);
  };

  // Settings language
  el("btnLangPL").onclick = ()=> setLang("pl");
  el("btnLangEN").onclick = ()=> setLang("en");

  // Settings nick
  el("btnSaveNickSettings").onclick = async ()=>{
    const v = (el("inpNickSettings").value || "").trim();
    const check = validateNick(v);
    if(!check.ok){ showToast(t("nickBad")); return; }
    updateActiveProfile({ nick: check.v });
    await ensurePinSet();
    refreshNickLabels();
    renderProfilesSelect();
    showToast(t("nickSaved"));
    showSettingsWelcome();
  };

  // Profiles
  el("btnProfileSwitch").onclick = ()=>{
    const id = el("selProfiles")?.value || "";
    if(!id) return;
    setActiveProfileId(id);
    renderProfilesSelect();
    el("inpNickSettings").value = getActiveProfile().nick || "";
    applyI18n();
    updateLangButtons();
    refreshNickLabels();
    showToast(t("profileSwitched"));
    showSettingsWelcome();
  };

  el("btnProfileAdd").onclick = ()=>{
    const profiles = ensureProfiles();
    const newP = { id: uid6(), nick: "", lastRoom: "", lastRoomName:"", lang: getActiveProfile().lang || "pl", pinHash: "" };
    profiles.push(newP);
    saveProfiles(profiles);
    setActiveProfileId(newP.id);

    renderProfilesSelect();
    el("inpNickSettings").value = "";
    applyI18n();
    updateLangButtons();
    refreshNickLabels();
    showToast(t("profileAdded"));
    showSettingsDetails(true);
  };

  el("btnProfileDelete").onclick = ()=>{
    const profiles = ensureProfiles();
    const activeId = getActiveProfileId();
    if(profiles.length <= 1){ showToast("Musi zostać przynajmniej 1 profil"); return; }
    const left = profiles.filter(p => p.id !== activeId);
    saveProfiles(left);
    setActiveProfileId(left[0].id);

    renderProfilesSelect();
    el("inpNickSettings").value = getActiveProfile().nick || "";
    applyI18n();
    updateLangButtons();
    refreshNickLabels();
    showToast(t("profileDeleted"));
    showSettingsWelcome();
  };

  // Clear local
  el("btnClearLocal").onclick = ()=>{
    if(!confirm(t("askClear"))) return;
    localStorage.removeItem(KEY_PROFILES);
    localStorage.removeItem(KEY_ACTIVE_PROFILE);
    ensureProfiles();
    renderProfilesSelect();
    el("inpNickSettings").value = "";
    applyI18n();
    updateLangButtons();
    refreshNickLabels();
    showToast(t("cleared"));
    showSettingsDetails(false);
  };

  // ROOMS back
  el("btnBackMenu").onclick = ()=> showScreen("menu");

  // ROOMS create/join
  el("btnCreateRoom").onclick = async ()=>{
    try{
      const nick = await ensureNickNice();
      if(!nick) return;

      const name = el("inpRoomName").value || "";
      showToast(t("creating"));

      const r = await createRoom(name);

      if(el("debugRooms")) el("debugRooms").textContent = `Utworzono: ${r.name} / ${r.code}`;

      await showContinueModalForCode(r.code);
      showToast(`${t("created")}: ${r.code}`);
      showSettingsWelcome();
    }catch(e){
      const msg = e?.message || String(e);
      showToast(msg);
      console.error(e);
    }
  };

  el("btnJoinRoom").onclick = async ()=>{
    try{
      const nick = await ensureNickNice();
      if(!nick) return;

      const code = el("inpJoinCode").value || "";
      showToast(t("joining"));

      const r = await joinRoom(code);

      if(el("debugRooms")) el("debugRooms").textContent = `Dołączono: ${r.name} / ${r.code}`;

      await showContinueModalForCode(r.code);
      showToast(`${t("joined")}: ${r.code}`);
      showSettingsWelcome();
    }catch(e){
      const msg = e?.message || String(e);
      showToast(msg);
      console.error(e);
    }
  };

  // continue modal
  el("btnContinueYes").onclick = async ()=>{
    const code = (getActiveProfile().lastRoom || "").trim().toUpperCase();
    hideContinueModal();
    if(code) await openRoomScreen(code);
  };
  el("btnContinueNo").onclick = ()=>{
    hideContinueModal();
    showScreen("rooms");
  };
  el("btnContinueForget").onclick = ()=>{
    clearSavedRoom();
    hideContinueModal();
    showToast("Zapomniano pokój");
    showScreen("rooms");
    showSettingsWelcome();
  };

  // placeholder room back
  el("btnBackFromRoom").onclick = ()=> showScreen("menu");

  // NICK MODAL
  el("btnNickCancel").onclick = ()=>{
    closeNickModal();
    if(_nickResolve){ _nickResolve(false); _nickResolve = null; }
  };
  el("btnNickSave").onclick = ()=>{
    const v = el("inpNickModal").value;
    const check = validateNick(v);
    if(!check.ok){
      el("nickError").style.display = "block";
      el("nickError").textContent = t("nickBad");
      return;
    }
    updateActiveProfile({ nick: check.v });
    closeNickModal();
    if(_nickResolve){ _nickResolve(true); _nickResolve = null; }
  };
  el("inpNickModal").addEventListener("keydown", (e)=>{
    if(e.key === "Enter") el("btnNickSave").click();
    if(e.key === "Escape") el("btnNickCancel").click();
  });
}

// ---------- start ----------
(async()=>{
  try{
    showScreen("splash");
    setSplash(`BUILD ${BUILD}\nŁadowanie Firebase…`);

    ensureProfiles();
    applyI18n();
    updateLangButtons();

    await fs(); // init firebase+auth+db

    setFooter(`BUILD ${BUILD}`);
    refreshNickLabels();
    bindUI();

    showScreen("menu");
  }catch(e){
    console.error(e);
    setSplash("BŁĄD:\n" + (e?.message || String(e)));
    throw e;
  }
})();
