const BUILD = 2011;

/* =========================
   1) ASSETS / UI CONST
   ========================= */
const Assets = {
  BG_HOME: "img_menu_pc.png",
  BG_APP:  "img_tlo.png",
};

const UI = {
  screens: ["splash","menu","startFlow","rooms","room"],
  el(id){ return document.getElementById(id); },
  showScreen(id){
    UI.screens.forEach(s=>{
      const node = UI.el(s);
      if(node) node.classList.toggle("active", s===id);
    });
    Background.set(id === "menu" || id === "splash" ? Assets.BG_HOME : Assets.BG_APP);
  },
  toast(msg){
    const t = UI.el("toast");
    if(!t){ alert(msg); return; }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(UI._tm);
    UI._tm = setTimeout(()=> t.style.display="none", 2600);
  },
  footer(txt){
    const f = UI.el("footerRight");
    if(f) f.textContent = txt;
  },
  splash(msg){
    const h = UI.el("splashHint");
    if(h) h.textContent = msg;
  }
};

const Background = {
  set(src){
    const bg = UI.el("bg");
    if(bg) bg.style.backgroundImage = `url("${src}")`;
  }
};

/* =========================
   2) STORAGE / PROFILES
   ========================= */
const StorageProfiles = (() => {
  const KEY_PROFILES = "typer_profiles_v2";
  const KEY_ACTIVE   = "typer_active_profile_v2";

  function uid6(){
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY_PROFILES);
      if(!raw) return [];
      const arr = JSON.parse(raw);
      if(!Array.isArray(arr)) return [];
      return arr.filter(p => p && p.id);
    }catch{ return []; }
  }
  function save(arr){ localStorage.setItem(KEY_PROFILES, JSON.stringify(arr)); }
  function getActiveId(){ return localStorage.getItem(KEY_ACTIVE) || ""; }
  function setActiveId(id){ localStorage.setItem(KEY_ACTIVE, id); }

  function ensure(){
    let profiles = load();
    let activeId = getActiveId();

    if(profiles.length === 0){
      const p = { id: uid6(), nick:"", lang:"pl", lastRoom:"", lastRoomName:"", pinHash:"" };
      profiles = [p];
      save(profiles);
      setActiveId(p.id);
      activeId = p.id;
    }

    if(!profiles.some(p=>p.id===activeId)){
      setActiveId(profiles[0].id);
    }
    return profiles;
  }

  function active(){
    const profiles = ensure();
    const id = getActiveId();
    return profiles.find(p=>p.id===id) || profiles[0];
  }

  function update(patch){
    const profiles = ensure();
    const id = getActiveId();
    const idx = profiles.findIndex(p=>p.id===id);
    if(idx<0) return;
    profiles[idx] = { ...profiles[idx], ...patch };
    save(profiles);
  }

  return { ensure, active, update };
})();

/* =========================
   3) I18N (PL/EN)
   ========================= */
const I18n = (() => {
  const dict = {
    pl: {
      splashFirebase: "Ładowanie Firebase…",
      settings: "Ustawienia",
      close: "Zamknij",
      nickBad: "Nick musi mieć 3–16 znaków.",
      welcomeTitle: "Witaj ponownie",
      enterRoom: "Wejdź do pokoju",
      changeRoom: "Zmień pokój",
      chooseRoomSub: "Wybierz co chcesz zrobić:",
      roomsTitle: "Pokoje typerów",
      roomsNick: "Nick:",
      create: "Utwórz",
      join: "Dołącz",
      back: "Wróć",
      creating: "Tworzenie pokoju…",
      joining: "Dołączanie…",
      created: "Utworzono pokój",
      joined: "Dołączono do pokoju",
      badCode: "Kod powinien mieć 6 znaków.",
      roomNotFound: "Nie znaleziono pokoju.",
      badRoomName: "Nazwa pokoju: 2–24 znaki.",
      pinSet: "Ustaw PIN (4 cyfry)\nPIN jest lokalny (na tym komputerze).",
      pinEnter: "Podaj PIN (4 cyfry)",
      pinWrong: "Zły PIN.",
      noRoomSaved: "Brak zapisanego pokoju.",
      roomLoading: "Ładowanie pokoju…",
      roomNoLegacy: "Nie wykryto mechaniki typowania.\n\nTo oznacza, że w tej wersji nie ma Twojego starego kodu typowania (openRoom/boot).\n\nWklej działającą wersję typowania do TypingEngine albo dodaj stare funkcje globalne."
    },
    en: {
      splashFirebase: "Loading Firebase…",
      settings: "Settings",
      close: "Close",
      nickBad: "Nickname must be 3–16 characters.",
      welcomeTitle: "Welcome back",
      enterRoom: "Enter room",
      changeRoom: "Change room",
      chooseRoomSub: "Choose what you want to do:",
      roomsTitle: "Rooms",
      roomsNick: "Nick:",
      create: "Create",
      join: "Join",
      back: "Back",
      creating: "Creating room…",
      joining: "Joining…",
      created: "Room created",
      joined: "Joined room",
      badCode: "Code must be 6 characters.",
      roomNotFound: "Room not found.",
      badRoomName: "Room name: 2–24 chars.",
      pinSet: "Set PIN (4 digits)\nPIN is local (this computer).",
      pinEnter: "Enter PIN (4 digits)",
      pinWrong: "Wrong PIN.",
      noRoomSaved: "No saved room.",
      roomLoading: "Loading room…",
      roomNoLegacy: "Typing engine not detected.\n\nThis build doesn't include your previous typing code (openRoom/boot).\n\nPaste the old typing logic into TypingEngine or expose global openRoom function."
    }
  };

  function lang(){ return StorageProfiles.active().lang || "pl"; }
  function t(key){
    const l = lang();
    return dict[l]?.[key] ?? dict.pl[key] ?? key;
  }
  return { t, lang };
})();

/* =========================
   4) PIN
   ========================= */
const Pin = (() => {
  async function sha256(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  function isValid(p){ return /^\d{4}$/.test(String(p||"").trim()); }

  async function ensureSet(){
    const p = StorageProfiles.active();
    if(p.pinHash) return true;

    const pin = prompt(I18n.t("pinSet"));
    if(!isValid(pin)){ UI.toast(I18n.t("pinWrong")); return false; }

    const h = await sha256(String(pin).trim() + "|" + p.id);
    StorageProfiles.update({ pinHash:h });
    return true;
  }

  async function verify(){
    const p = StorageProfiles.active();
    if(!p.pinHash){
      return await ensureSet();
    }
    for(let i=1;i<=3;i++){
      const pin = prompt(`${I18n.t("pinEnter")}\n(${i}/3)`);
      if(!isValid(pin)){ UI.toast(I18n.t("pinWrong")); continue; }
      const h = await sha256(String(pin).trim() + "|" + p.id);
      if(h === p.pinHash) return true;
      UI.toast(I18n.t("pinWrong"));
    }
    return false;
  }

  return { ensureSet, verify };
})();

/* =========================
   5) FIREBASE SERVICE
   ========================= */
const FirebaseService = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
    authDomain: "typer-b3087.firebaseapp.com",
    projectId: "typer-b3087",
    storageBucket: "typer-b3087.firebaseapp.com",
    messagingSenderId: "1032303131493",
    appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
    measurementId: "G-5FBDH5G15N"
  };

  let app, auth, db, userUid = null;
  let _fs = null;

  async function init(){
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
          if(u){ userUid = u.uid; unsub(); resolve(); return; }
          await signInAnonymously(auth);
        }catch(e){ reject(e); }
      });
      setTimeout(()=>reject(new Error("Auth timeout (12s)")), 12000);
    });

    _fs = { doc, setDoc, getDoc, serverTimestamp };
    return _fs;
  }

  function getDb(){ return db; }
  function uid(){ return userUid; }

  return { init, getDb, uid };
})();

/* =========================
   6) ROOMS SERVICE
   ========================= */
const RoomsService = (() => {
  function normCode(s){
    return (s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  function uid6(){
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }

  async function getRoomByCode(code){
    const fs = await FirebaseService.init();
    const ref = fs.doc(FirebaseService.getDb(), "rooms", code);
    const snap = await fs.getDoc(ref);
    if(!snap.exists()) return null;
    return { code, ...snap.data() };
  }

  async function createRoom(roomName){
    const fs = await FirebaseService.init();

    let name = (roomName || "").trim();
    if(!name){
      const nick = (StorageProfiles.active().nick || "").trim() || "Gracz";
      name = `Pokój ${nick}`;
    }
    if(name.length < 2 || name.length > 24) throw new Error(I18n.t("badRoomName"));

    for(let i=0;i<12;i++){
      const code = uid6();
      const ref = fs.doc(FirebaseService.getDb(), "rooms", code);
      const snap = await fs.getDoc(ref);
      if(snap.exists()) continue;

      await fs.setDoc(ref, {
        code,
        name,
        adminUid: FirebaseService.uid(),
        adminNick: (StorageProfiles.active().nick || "").trim(),
        createdAt: fs.serverTimestamp(),
        status: "open"
      });

      StorageProfiles.update({ lastRoom: code, lastRoomName: name });
      return { code, name };
    }
    throw new Error("Nie udało się wygenerować kodu (spróbuj ponownie).");
  }

  async function joinRoom(codeInput){
    const code = normCode(codeInput);
    if(code.length !== 6) throw new Error(I18n.t("badCode"));

    const room = await getRoomByCode(code);
    if(!room) throw new Error(I18n.t("roomNotFound"));

    StorageProfiles.update({ lastRoom: code, lastRoomName: room.name || "" });
    return { code, name: room.name || "" };
  }

  return { getRoomByCode, createRoom, joinRoom };
})();

/* =========================
   7) TYPING ENGINE (MOST DO STAREJ LOGIKI)
   ========================= */
const TypingEngine = (() => {
  function detectLegacy(){
    const cands = [];

    // boot.*
    if(window.boot){
      if(typeof window.boot.openRoom === "function") cands.push({ name:"boot.openRoom", fn: window.boot.openRoom });
      if(typeof window.boot.enterRoom === "function") cands.push({ name:"boot.enterRoom", fn: window.boot.enterRoom });
      if(typeof window.boot.startRoom === "function") cands.push({ name:"boot.startRoom", fn: window.boot.startRoom });
    }

    // app / Typer
    if(window.app){
      if(typeof window.app.openRoom === "function") cands.push({ name:"app.openRoom", fn: window.app.openRoom });
      if(typeof window.app.enterRoom === "function") cands.push({ name:"app.enterRoom", fn: window.app.enterRoom });
    }
    if(window.Typer){
      if(typeof window.Typer.openRoom === "function") cands.push({ name:"Typer.openRoom", fn: window.Typer.openRoom });
      if(typeof window.Typer.enterRoom === "function") cands.push({ name:"Typer.enterRoom", fn: window.Typer.enterRoom });
    }

    // global
    if(typeof window.openRoom === "function") cands.push({ name:"window.openRoom", fn: window.openRoom });
    if(typeof window.enterRoom === "function") cands.push({ name:"window.enterRoom", fn: window.enterRoom });

    return cands[0] || null;
  }

  function mount(ctx){
    // pokazujemy ekran hosta
    UI.showScreen("room");
    UI.el("room_title").textContent = "Pokój";
    UI.el("room_info").textContent = I18n.t("roomLoading");

    // próbujemy uruchomić starą logikę typowania
    const legacy = detectLegacy();
    if(legacy){
      UI.el("room_info").textContent = `Start: ${legacy.name}\nNick: ${ctx.nick}\nPokój: ${ctx.roomName}\n\n(Jeśli nadal nie widać typowania — stara logika nie renderuje na tym ekranie.)`;

      try{
        // najpierw spróbujmy z samym code, potem z obiektem
        let res = legacy.fn(ctx.roomCode);
        if(res === undefined) res = legacy.fn(ctx);

        // obsługa async
        if(res && typeof res.then === "function"){
          res.catch(err=>{
            console.error(err);
            UI.el("room_info").textContent = "Błąd starej logiki: " + (err?.message || String(err));
          });
        }
        return;
      }catch(e){
        console.error(e);
        UI.el("room_info").textContent = "Błąd starej logiki: " + (e?.message || String(e));
        return;
      }
    }

    // nie znaleziono mechaniki typowania
    UI.el("room_info").textContent = I18n.t("roomNoLegacy");
  }

  return { mount };
})();

/* =========================
   8) APP FLOW / UI
   ========================= */
const App = (() => {
  function validateNick(v){
    v = (v||"").trim();
    return v.length >= 3 && v.length <= 16;
  }

  function refreshRoomsNick(){
    const nick = (StorageProfiles.active().nick||"").trim() || "—";
    UI.el("rooms_nick").textContent = nick;
  }

  async function ensureNickAndPin(){
    const nick = (StorageProfiles.active().nick||"").trim();
    if(nick) return true;

    // uproszczony pierwszy nick (bez modali tu, żeby nie mieszać — masz już swój modal w index, możesz go dopiąć później)
    const v = prompt("Podaj nick (3–16):");
    if(!validateNick(v)){ UI.toast(I18n.t("nickBad")); return false; }
    StorageProfiles.update({ nick:v.trim() });

    const okPin = await Pin.ensureSet();
    return okPin;
  }

  function openWelcomeOrChooseRoom(){
    const prof = StorageProfiles.active();
    const nick = (prof.nick||"").trim();
    if(!nick){ UI.showScreen("menu"); return; }

    const hasRoom = (prof.lastRoom||"").trim().length === 6;

    UI.el("sf_title").textContent = I18n.t("welcomeTitle");
    UI.el("sf_sub").textContent = hasRoom
      ? `${nick}\n\nWejdź do pokoju → ${prof.lastRoomName || "—"}`
      : `${nick}\n\n${I18n.t("chooseRoomSub")}`;

    UI.el("sf_btnA").textContent = hasRoom ? I18n.t("enterRoom") : "Nowy pokój typerów";
    UI.el("sf_btnB").textContent = hasRoom ? I18n.t("changeRoom") : "Wejdź do pokoju";

    UI.el("sf_btnA").onclick = async ()=>{
      if(hasRoom) await enterSavedRoom();
      else { UI.showScreen("rooms"); refreshRoomsNick(); }
    };
    UI.el("sf_btnB").onclick = ()=>{
      UI.showScreen("rooms");
      refreshRoomsNick();
    };

    UI.showScreen("startFlow");
  }

  async function enterSavedRoom(){
    const prof = StorageProfiles.active();
    const code = (prof.lastRoom||"").trim().toUpperCase();
    if(!code){ UI.toast(I18n.t("noRoomSaved")); return; }

    const okPin = await Pin.verify();
    if(!okPin) return;

    const ctx = {
      roomCode: code,
      roomName: prof.lastRoomName || "",
      nick: (prof.nick||"").trim(),
      profileId: prof.id
    };

    TypingEngine.mount(ctx);
  }

  function bindUI(){
    UI.el("btnOpenRooms").onclick = async ()=>{
      const ok = await ensureNickAndPin();
      if(!ok) return;
      openWelcomeOrChooseRoom();
    };
    UI.el("btnOpenStats").onclick = ()=> UI.toast("Statystyki — później");
    UI.el("btnExitApp").onclick = ()=> UI.toast("Wyjście — zamknij kartę / aplikację");

    UI.el("btnRoomsBack").onclick = ()=> UI.showScreen("menu");

    UI.el("btnCreateRoom").onclick = async ()=>{
      try{
        const ok = await ensureNickAndPin();
        if(!ok) return;

        UI.toast(I18n.t("creating"));
        const name = UI.el("inpRoomName").value || "";
        await RoomsService.createRoom(name);
        await enterSavedRoom();
        UI.toast(I18n.t("created"));
      }catch(e){
        UI.toast(e?.message || String(e));
      }
    };

    UI.el("btnJoinRoom").onclick = async ()=>{
      try{
        const ok = await ensureNickAndPin();
        if(!ok) return;

        UI.toast(I18n.t("joining"));
        const code = UI.el("inpJoinCode").value || "";
        await RoomsService.joinRoom(code);
        await enterSavedRoom();
        UI.toast(I18n.t("joined"));
      }catch(e){
        UI.toast(e?.message || String(e));
      }
    };

    UI.el("btnRoomBack").onclick = ()=> UI.showScreen("menu");
  }

  async function start(){
    StorageProfiles.ensure();

    UI.showScreen("splash");
    UI.splash(`BUILD ${BUILD}\n${I18n.t("splashFirebase")}`);

    await FirebaseService.init();

    UI.footer(`BUILD ${BUILD}`);
    bindUI();

    UI.showScreen("menu");
    Background.set(Assets.BG_HOME);
  }

  return { start };
})();

/* =========================
   START
   ========================= */
(async()=>{
  try{
    await App.start();
  }catch(e){
    console.error(e);
    UI.splash("BŁĄD:\n" + (e?.message || String(e)));
  }
})();
