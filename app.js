/* Typer PWA - wersja cache-bust */
const APP_VERSION = "20260202-01";

const NICK_KEY = "typer.nick.v1";
const ROOM_KEY = "typer.room.v1"; // {code,name,admin,players[]}

const IMG_MENU_PHONE = "img_menu.png";
const IMG_MENU_PC = "img_menu_pc.png";
const IMG_SPLASH = "img_starter.png";

const $ = (id) => document.getElementById(id);

const bgImg = $("bgImg");
const titleLeft = $("titleLeft");
const subLeft = $("subLeft");
const nickText = $("nickText");
const nickBox = $("nickBox");
const btnChangeNick = $("btnChangeNick");
const btnBack = $("btnBack");
const menuButtons = $("menuButtons");
const roomGrid = $("roomGrid");
const playersBox = $("playersBox");
const roomName = $("roomName");
const roomAdmin = $("roomAdmin");
const roomCode = $("roomCode");
const btnCopy = $("btnCopy");
const btnLeaveRoom = $("btnLeaveRoom");
const statusPill = $("statusPill");
const btnFix = $("btnFix");

const modalBack = $("modalBack");
const modalTitle = $("modalTitle");
const modalDesc = $("modalDesc");
const modalInput = $("modalInput");
const modalOk = $("modalOk");
const modalCancel = $("modalCancel");

function isLandscape(){
  return window.matchMedia && window.matchMedia("(orientation: landscape)").matches;
}
function pickMenuBg(){
  // PC/poziom -> PC obraz, inaczej telefon
  return isLandscape() ? IMG_MENU_PC : IMG_MENU_PHONE;
}

function loadNick(){
  return (localStorage.getItem(NICK_KEY) || "").trim();
}
function saveNick(nick){
  localStorage.setItem(NICK_KEY, nick.trim());
}
function loadRoom(){
  try { return JSON.parse(localStorage.getItem(ROOM_KEY) || "null"); } catch { return null; }
}
function saveRoom(room){
  localStorage.setItem(ROOM_KEY, JSON.stringify(room));
}
function clearRoom(){
  localStorage.removeItem(ROOM_KEY);
}

function setBg(src){
  // twardy cache-bust na obrazach też
  bgImg.src = `${src}?v=${encodeURIComponent(APP_VERSION)}&t=${Date.now()}`;
  bgImg.onerror = () => { /* jak obraz nie dojdzie, zostaw tło */ };
}

function showMenu(){
  titleLeft.textContent = "Menu";
  subLeft.textContent = "Wybierz opcję";
  btnBack.style.display = "none";

  setBg(pickMenuBg());
  menuButtons.style.display = "flex";
  roomGrid.style.display = "none";

  statusPill.textContent = "Gotowe";
}
function showRoom(room){
  titleLeft.textContent = "Pokój";
  subLeft.textContent = "";
  btnBack.style.display = "inline-block";

  setBg(pickMenuBg());
  menuButtons.style.display = "none";
  roomGrid.style.display = "grid";

  roomName.textContent = room.name || "—";
  roomAdmin.textContent = `Admin: ${room.admin || "—"}`;
  roomCode.textContent = room.code || "------";

  renderPlayers(room);
  statusPill.textContent = "Pokój aktywny";
}

function renderPlayers(room){
  const nick = loadNick() || "Gracz";
  const players = Array.isArray(room.players) ? room.players : [nick];
  // prosto: lista, na razie lokalnie
  playersBox.innerHTML = `
    <div class="kv"><div class="k">Gracz:</div><div class="v">${escapeHtml(nick)}</div></div>
    <div style="margin-top:10px; color:rgba(255,255,255,.55); font-size:12px;">
      (Na razie lokalnie. Multiplayer dołożymy później.)
    </div>
  `;
}

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function openModal({title, desc, placeholder, value, okText="OK"}){
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalDesc.textContent = desc;
    modalInput.placeholder = placeholder || "";
    modalInput.value = value || "";
    modalOk.textContent = okText;

    modalBack.style.display = "flex";
    setTimeout(() => modalInput.focus(), 10);

    const close = (val) => {
      modalBack.style.display = "none";
      modalOk.onclick = null;
      modalCancel.onclick = null;
      modalBack.onclick = null;
      resolve(val);
    };

    modalOk.onclick = () => close(modalInput.value.trim());
    modalCancel.onclick = () => close(null);
    modalBack.onclick = (e) => { if (e.target === modalBack) close(null); };

    modalInput.onkeydown = (e) => {
      if (e.key === "Enter") modalOk.click();
      if (e.key === "Escape") close(null);
    };
  });
}

function genCode6(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

async function ensureNick(){
  let nick = loadNick();
  if (nick) return nick;

  const v = await openModal({
    title: "Podaj nick",
    desc: "Ustaw nick (będzie widoczny w lidze i pokojach).",
    placeholder: "np. Mariusz",
    value: "",
    okText: "Zapisz"
  });

  if (!v) return null;
  saveNick(v);
  updateNickUI();
  return v;
}

async function createRoomFlow(){
  const nick = await ensureNick();
  if (!nick) return;

  const name = await openModal({
    title: "Nowy pokój",
    desc: "Nadaj nazwę pokoju (będzie widoczna po prawej).",
    placeholder: "np. szkoła / rodzina",
    value: "",
    okText: "Utwórz"
  });

  if (!name) return;

  const room = {
    code: genCode6(),
    name,
    admin: nick,
    players: [nick]
  };
  saveRoom(room);
  location.hash = "#pokoj";
  showRoom(room);
}

async function joinRoomFlow(){
  const nick = await ensureNick();
  if (!nick) return;

  const code = await openModal({
    title: "Dołącz do pokoju",
    desc: "Wpisz 6-znakowy kod pokoju.",
    placeholder: "np. AB12CD",
    value: "",
    okText: "Dołącz"
  });
  if (!code) return;

  // na razie „join” lokalny – zapisujemy, że jesteś w pokoju o takim kodzie
  const room = {
    code: code.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6),
    name: "(dołączony pokój)",
    admin: "(nieznany)",
    players: [nick]
  };
  saveRoom(room);
  location.hash = "#pokoj";
  showRoom(room);
}

async function ligaClick(){
  const nick = await ensureNick();
  if (!nick) return;

  // jeśli jest zapisany pokój -> wchodzimy
  const existing = loadRoom();
  if (existing && existing.code) {
    location.hash = "#pokoj";
    showRoom(existing);
    return;
  }

  // jeśli nie ma pokoju, pokaż ekran wyboru: Nowy / Dołącz
  const choice = await openModal({
    title: "Liga typerów",
    desc: "Wybierz: utworzyć nowy pokój czy dołączyć do istniejącego.",
    placeholder: "Wpisz: nowy / dolacz",
    value: "nowy",
    okText: "Dalej"
  });

  if (!choice) return;
  const c = choice.toLowerCase();
  if (c.startsWith("n")) return createRoomFlow();
  if (c.startsWith("d")) return joinRoomFlow();

  // jeśli ktoś wpisze coś innego – pokaż jeszcze raz prościej:
  const again = await openModal({
    title: "Wybierz opcję",
    desc: "Wpisz dokładnie: nowy albo dolacz",
    placeholder: "nowy / dolacz",
    value: "",
    okText: "OK"
  });
  if (!again) return;
  return again.toLowerCase().startsWith("n") ? createRoomFlow() : joinRoomFlow();
}

function updateNickUI(){
  const n = loadNick();
  nickText.textContent = n || "—";
  nickBox.style.display = "inline-flex";
}

function applyRoute(){
  const hash = (location.hash || "#menu").replace("#","");
  const room = loadRoom();

  if (hash === "pokoj" && room && room.code) {
    showRoom(room);
    return;
  }
  showMenu();
}

/** SUPER WAŻNE: twardy reset SW + cache */
async function hardReset(){
  statusPill.textContent = "Czyszczenie cache…";
  try{
    // unregister service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    }
    // clear caches
    if (window.caches) {
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    }
  }catch(e){
    // nic
  }finally{
    // reload z parametrem aby przeglądarka nie dała starego
    const u = new URL(location.href);
    u.searchParams.set("r", Date.now().toString());
    location.href = u.toString();
  }
}

/** Rejestracja SW – ale tylko jeśli nie jesteśmy w trybie "raw github.com" */
async function registerSW(){
  if (!("serviceWorker" in navigator)) return;
  try{
    // cache-bust sw.js
    const reg = await navigator.serviceWorker.register(`sw.js?v=${encodeURIComponent(APP_VERSION)}`);
    // wymuś update
    reg.update?.();
  }catch(e){
    // jeśli SW nie działa – aplikacja i tak ma działać online
  }
}

/** SPLASH: 7 sekund, potem route */
function runSplash(){
  setBg(IMG_SPLASH);
  titleLeft.textContent = "Start";
  subLeft.textContent = "Ekran startowy (7s)…";
  statusPill.textContent = `Wersja ${APP_VERSION}`;

  menuButtons.style.display = "none";
  roomGrid.style.display = "none";
  btnBack.style.display = "none";

  setTimeout(() => {
    applyRoute();
  }, 7000);
}

/* ======= LISTENERS ======= */
window.addEventListener("hashchange", applyRoute);
window.addEventListener("resize", () => {
  // odśwież tło w zależności od orientacji
  if ((location.hash || "#menu") === "#menu") setBg(pickMenuBg());
  else setBg(pickMenuBg());
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-go]");
  if (!btn) return;
  const go = btn.getAttribute("data-go");

  if (go === "liga") return ligaClick();
  if (go === "stats") {
    alert("Statystyki — zrobimy w następnym kroku.");
    return;
  }
  if (go === "exit") {
    alert("Wyjście: w przeglądarce zamknij kartę; w aplikacji Android dodamy finish().");
    return;
  }
});

btnBack.addEventListener("click", () => {
  location.hash = "#menu";
  showMenu();
});

btnChangeNick.addEventListener("click", async () => {
  const current = loadNick();
  const v = await openModal({
    title: "Zmień nick",
    desc: "Wpisz nowy nick.",
    placeholder: "np. Mariusz",
    value: current || "",
    okText: "Zapisz"
  });
  if (!v) return;
  saveNick(v);
  updateNickUI();

  // jeśli jesteś w pokoju lokalnie – zaktualizuj admina gdy to Ty go stworzyłeś
  const room = loadRoom();
  if (room && room.admin && room.admin !== "(nieznany)" && room.admin !== "(nieznany)") {
    // nic nie ruszamy na siłę, bo to tylko lokalny prototyp
  }
});

btnCopy.addEventListener("click", async () => {
  const code = roomCode.textContent.trim();
  try{
    await navigator.clipboard.writeText(code);
    statusPill.textContent = "Skopiowano kod pokoju.";
    setTimeout(()=>statusPill.textContent="Pokój aktywny", 1400);
  }catch{
    alert("Nie mogę skopiować. Skopiuj ręcznie: " + code);
  }
});

btnLeaveRoom.addEventListener("click", () => {
  clearRoom();
  location.hash = "#menu";
  showMenu();
});

btnFix.addEventListener("click", hardReset);

/* ======= START ======= */
(async function start(){
  updateNickUI();
  await registerSW();
  runSplash();
})();
