const CONFIG_URL = new URL('./config.json', import.meta.url);
let configPromise = null;

async function loadConfig(){
  if(!configPromise){
    configPromise = fetch(`${CONFIG_URL.href}?v=${Date.now()}`, { cache: 'no-store' })
      .then((response) => {
        if(!response.ok) throw new Error(`Event config HTTP ${response.status}`);
        return response.json();
      })
      .catch(() => ({
        id: 'world-cup-2026',
        moduleVersion: 1,
        compatibilityMode: 'legacy-worldcup-v1'
      }));
  }
  return configPromise;
}

export async function openEvent(context = {}){
  const config = await loadConfig();
  if(typeof context.openLegacyWorldCup !== 'function'){
    throw new Error('Brak mostu zgodności dla Eventu MŚ 2026.');
  }
  return context.openLegacyWorldCup(config);
}

export async function getEventInfo(){
  return loadConfig();
}

export default { openEvent, getEventInfo };
