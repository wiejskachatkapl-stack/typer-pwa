const BUILD = 2005;

// TŁA:
const BG_HOME = "img_menu_pc.png"; // START
const BG_APP  = "img_tlo.png";     // RESZTA

// STORAGE (profile)
const KEY_PROFILES = "typer_profiles_v1";
const KEY_ACTIVE_PROFILE = "typer_active_profile_v1";

// Firebase config (jak miałeś)
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

  if(id === "menu" || id === "splash") setBg(BG_HOME);
  else setBg(BG_APP);
}

function setSplash(msg){
  const h = el("splashHint");
  if (h) h.textContent = msg;
  console.log(msg);
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
    localHint: "Wyczyści: nick, ostatni pokój, język, profile (czyli reset tej gry na tym komputerze).",
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
    noRoom: "Brak zapisanego pokoju w tym profilu."
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
    noRoom: "No saved room in this profile."
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
    const p = { id: uid6(), nick: "", lastRoom: "", lang: "pl" };
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

// ---------- UI update ----------
function applyI18n(){
  // Settings modal texts
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

  // Welcome flow
  if(el("st_welcomeChip")) el("st_welcomeChip").textContent = t("welcomeBack");
  if(el("btnEnterRoomFromSettings")) el("btnEnterRoomFromSettings").textContent = t("enterRoom");
  if(el("btnChangeProfileFlow")) el("btnChangeProfileFlow").textContent = t("changeProfile");
  if(el("btnBackToWelcome")) el("btnBackToWelcome").textContent = t("detailsBack");
  if(el("st_detailsTitle")) el("st_detailsTitle").textContent = "Profil / język";

  // Rooms
  if(el("rooms_title")) el("rooms_title").textContent = t("roomsTitle");
  if(el("rooms_nickLabel")) el("rooms_nickLabel").textContent = t("roomsNick");
  if(el("rooms_newRoom")) el("rooms_newRoom").textContent = t("newRoom");
  if(el("rooms_newRoomHint")) el("rooms_newRoomHint").textContent = t("newRoomHint");
  if(el("rooms_join")) el("rooms_join").textContent = t("joinRoom");
  if(el("rooms_joinHint")) el("rooms_joinHint").textContent = t("joinHint");
  if(el("btnBackMenu")) el("btnBackMenu").textContent = t("back");

  // placeholders
  if(el("inpRoomName")) el("inpRoomName").placeholder = (getActiveProfile().lang === "en")
    ? "Room name (e.g. Home)"
    : "Nazwa pokoju (np. Domowy)";
  if(el("inpJoinCode")) el("inpJoinCode").placeholder = (getActiveProfile().lang === "en")
    ? "Enter code (e.g. AB12CD)"
    : "Wpisz kod (np. AB12CD)";

  // Nick modal texts
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

// ---------- Settings welcome/details flow ----------
function showSettingsWelcome(){
  const prof = getActiveProfile();
  const nick = (prof.nick || "").trim();
  const lastRoom = (prof.lastRoom || "").trim().toUpperCase();

  // jeśli brak nicku => od razu details
  if(!nick){
    showSettingsDetails(false);
    return;
  }

  // pokaż welcome
  el("settingsWelcome").style.display = "block";
  el("settingsDetails").style.display = "none";
  el("detailsTopBar").style.display = "none";

  el("st_welcomeNick").textContent = nick;
  if(lastRoom){
    el("st_welcomeRoomLine").textContent = `${t("lastRoom")}: ${lastRoom}`;
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

  // nowy flow: welcome jeśli jest nick
  showSettingsWelcome();

  const m = el("settingsModal");
  if(m) m.style.display = "flex";
}
function closeSettings(){
  const m = el("settingsModal");
  if(m) m.style.display = "none";
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

// ---------- NICK MODAL (zamiast prompt) ----------
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
  if(!ok) return ""; // anuluj
  return (getActiveProfile().nick || "").trim();
}

// ---------- Continue modal ----------
function showContinueModal({ code, roomName }){
  const modal = el("continueModal");
  const text = el("continueText");
  if (!modal || !text) return;

  const nick = (getActiveProfile().nick || "").trim() || "—";
  text.textContent =
    `${nick}\n\n` +
    `Grasz w pokoju: ${roomName || "—"}\n` +
    `Kod: ${code}\n\n` +
    `Czy chcesz kontynuować w tym pokoju?`;

  modal.style.display = "flex";
}
function hideContinueModal(){
  const modal = el("continueModal");
  if (modal) modal.style.display = "none";
}
function clearSavedRoom(){
  updateActiveProfile({ lastRoom: "" });
}

// ---------- Firebase minimal boot ----------
let app, auth;
let userUid = null;

async function bootFirebase(){
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const { getAuth, onAuthStateChanged, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

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

// ---------- Rooms open flow ----------
async function handleOpenRooms(){
  const nick = await ensureNickNice();
  if(!nick){
    // anulowano
    showToast("Anulowano");
    return;
  }

  refreshNickLabels();

  const saved = (getActiveProfile().lastRoom || "").trim().toUpperCase();
  if(saved && saved.length === 6){
    showScreen("rooms");
    showContinueModal({ code: saved, roomName: "(nazwa pokoju z Firestore)" });
    return;
  }
  showScreen("rooms");
  if(el("debugRooms")) el("debugRooms").textContent = "—";
}

// ---------- UI binding ----------
function bindUI(){
  // HOME
  el("btnOpenRooms").onclick = async ()=>{ await handleOpenRooms(); };
  el("btnOpenStats").onclick = ()=>{ showToast("Statystyki — wkrótce"); };
  el("btnExitApp").onclick = ()=>{ showToast("Wyjście — zamknij kartę / aplikację"); };

  // Settings open
  el("btnOpenSettings").onclick = ()=> openSettings();
  el("btnSettingsClose").onclick = ()=> closeSettings();
  el("btnClearCancel").onclick = ()=> closeSettings();

  // Settings welcome buttons
  el("btnChangeProfileFlow").onclick = ()=>{
    // pokazujemy dopiero teraz wybór profilu/język/czyszczenie
    showSettingsDetails(true);
  };
  el("btnBackToWelcome").onclick = ()=>{
    showSettingsWelcome();
  };
  el("btnEnterRoomFromSettings").onclick = async ()=>{
    const saved = (getActiveProfile().lastRoom || "").trim().toUpperCase();
    if(!saved){
      showToast(t("noRoom"));
      return;
    }
    closeSettings();
    // zachowujemy dotychczasowe zachowanie: rooms + modal kontynuacji
    showScreen("rooms");
    showContinueModal({ code: saved, roomName: "(nazwa pokoju z Firestore)" });
  };

  // Settings: language
  el("btnLangPL").onclick = ()=> setLang("pl");
  el("btnLangEN").onclick = ()=> setLang("en");

  // Settings: save nick
  el("btnSaveNickSettings").onclick = ()=>{
    let v = (el("inpNickSettings").value || "").trim();
    const check = validateNick(v);
    if(!check.ok){
      showToast(t("nickBad"));
      return;
    }
    updateActiveProfile({ nick: check.v });
    refreshNickLabels();
    renderProfilesSelect();
    showToast(t("nickSaved"));
    // po zapisaniu nicku wracamy do welcome (żeby było czytelnie)
    showSettingsWelcome();
  };

  // Settings: profiles
  el("btnProfileSwitch").onclick = ()=>{
    const sel = el("selProfiles");
    const id = sel?.value || "";
    if(!id) return;
    setActiveProfileId(id);

    renderProfilesSelect();
    el("inpNickSettings").value = getActiveProfile().nick || "";
    applyI18n();
    updateLangButtons();
    refreshNickLabels();
    showToast(t("profileSwitched"));

    // po przełączeniu profilu: pokaż welcome lub details (zależnie od nicku)
    showSettingsWelcome();
  };

  el("btnProfileAdd").onclick = ()=>{
    const profiles = ensureProfiles();
    const newP = { id: uid6(), nick: "", lastRoom: "", lang: getActiveProfile().lang || "pl" };
    profiles.push(newP);
    saveProfiles(profiles);
    setActiveProfileId(newP.id);

    renderProfilesSelect();
    el("inpNickSettings").value = "";
    applyI18n();
    updateLangButtons();
    refreshNickLabels();
    showToast(t("profileAdded"));

    // nowy profil nie ma nicku => details
    showSettingsDetails(true);
  };

  el("btnProfileDelete").onclick = ()=>{
    const profiles = ensureProfiles();
    const activeId = getActiveProfileId();
    if(profiles.length <= 1){
      showToast("Musi zostać przynajmniej 1 profil");
      return;
    }
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

  // Settings: clear local
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
    // po czyszczeniu: brak nicku => details
    showSettingsDetails(false);
  };

  // ROOMS back
  el("btnBackMenu").onclick = ()=> showScreen("menu");

  // kontynuacja modal
  el("btnContinueYes").onclick = async ()=>{
    hideContinueModal();
    showToast("Kontynuuj — podłączymy do pokoju w następnym kroku");
    showScreen("rooms");
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

    await bootFirebase();

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
