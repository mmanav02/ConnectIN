// popup.js
let personas = {};
let mode = 'manual'; // 'manual' | 'automation'

/* ───────── load personas.json + add “Custom message” option ───────── */
(async () => {
  try {
    const data = await fetch(chrome.runtime.getURL('personas.json')).then(r => r.json());
    personas = data || {};
    const sel = document.getElementById('persona');
    Object.keys(personas).forEach(k => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = k.trim();
      sel.appendChild(opt);
    });
    const opt = document.createElement('option');
    opt.value = opt.textContent = 'Custom message';
    opt.dataset.custom = '1';
    sel.appendChild(opt);
  } catch (e) {
    console.error(e);
    log('could not load personas.json');
  }
})();

/* ───────── UI refs ───────── */
const logEl       = document.getElementById('log');
const apiInput    = document.getElementById('apiKey');
const platformSel = document.getElementById('platform');
const taskSel     = document.getElementById('task');
const igTaskSel   = document.getElementById('ig-task');
const igBlock     = document.getElementById('ig-block');
const msgBlock    = document.getElementById('msg-block');
const personaSel  = document.getElementById('persona');
const customMsg   = document.getElementById('customMessage');
const customLabel = document.getElementById('customLabel');
const fileInput   = document.getElementById('fileInput');
const runBtn      = document.getElementById('run');
const dryBtn      = document.getElementById('dry');
const dlLogBtn    = document.getElementById('downloadLog');
const modeBtn     = document.getElementById('modeToggleBtn');
const modeLabel   = document.getElementById('modeLabel');
const clearBtn    = document.getElementById('clearLog'); 

/* ───────── utils ───────── */
const log = m => {
  logEl.textContent += m + '\n';
  logEl.scrollTop    = logEl.scrollHeight;
};

/* ───────── wire buttons ───────── */
runBtn.onclick   = () => start(0);
dryBtn.onclick   = () => start(1);
dlLogBtn.onclick = () => chrome.runtime.sendMessage({ cmd: 'downloadLog' });

modeBtn.onclick = async () => {
  mode = (mode === 'manual') ? 'automation' : 'manual';
  document.documentElement.dataset.mode = mode;               // drives CSS
  await chrome.storage.local.set({ popupMode: mode });        // persist
  applyMode();
};

/* ───────── dynamic UI (manual-only controls) ───────── */
platformSel.addEventListener('change', toggleUi);
igTaskSel.addEventListener('change',   toggleUi);
personaSel.addEventListener('change',  toggleUi);

/* ───────── init: read mode + api key, then paint ───────── */
(async function init() {
  const { popupMode, apiKey } = await chrome.storage.local.get(['popupMode', 'apiKey']);
  if (popupMode === 'automation' || popupMode === 'manual') mode = popupMode;

  // reflect mode for CSS (no inline script needed)
  document.documentElement.dataset.mode = mode;

  if (apiKey) apiInput.value = apiKey;
  applyMode();
  toggleUi();
})();

/* ───────── show/hide subsections in MANUAL mode ───────── */
function toggleUi() {
  if (document.documentElement.dataset.mode !== 'manual') return;

  const isIg        = platformSel.value === 'instagram';
  const igTask      = igTaskSel.value;
  const showIgBlock = isIg;
  const showMsgBlk  = !isIg || igTask === 'start-messaging';

  igBlock.classList.toggle('hidden', !showIgBlock);
  msgBlock.classList.toggle('hidden', !showMsgBlk);

  const custom = personaSel.selectedOptions[0]?.dataset.custom === '1';
  customMsg.classList.toggle  ('hidden', !custom);
  customLabel.classList.toggle ('hidden', !custom);
}

/* ───────── apply Manual vs Automation (labels + disable fields) ───────── */
function applyMode() {
  const isAutomation = (mode === 'automation');

  modeBtn.textContent   = isAutomation ? 'Switch to Manual' : 'Switch to Automation';
  log(mode === 'automation'
      ? '🟦 Automation mode: listening for website triggers…'
      : '🟩 Manual mode: ready.');
  modeLabel.textContent = `Current: ${isAutomation ? 'Automation' : 'Manual'}`;

  // Optional: disable manual fields in automation (UI is hidden by CSS anyway)
  const disable = isAutomation;
  [platformSel, taskSel, igTaskSel, personaSel, fileInput, customMsg, apiInput]
    .forEach(el => { if (el) el.disabled = disable; });

  if (isAutomation) log('Waiting for URLs from Streaml…');
}

/* ───────── Manual runner ───────── */
async function start(dryRun = 0) {
  if (document.documentElement.dataset.mode !== 'manual') {
    log('In Automation mode. Switch to Manual to run locally.');
    return;
  }

  const apiKey   = apiInput.value.trim();
  const taskVal  = taskSel.value;
  const platform = platformSel.value;
  const igTask   = igTaskSel.value;
  const persona  = personaSel.value.trim();
  const file     = fileInput.files[0];
  const isCustom = personaSel.selectedOptions[0]?.dataset.custom === '1';
  const customTx = customMsg.value.trim();

  if (!apiKey) return log('  API key is required');
  if (isCustom && !customTx) return log(' Enter your custom message');

  const meta = isCustom ? { prompt: customTx } : personas[persona];
  if (!meta) return log(` persona “${persona}” not found`);

  // figure out URL source
  let urls = [];
  const needProfiles = (!file && platform === 'instagram' && igTask === 'start-messaging');
  const shouldAutoScrape =
    (!file && platform === 'linkedin'  && taskVal === 'message') ||
    (!file && platform === 'instagram' && igTask !== 'start-messaging') ||
    needProfiles;

  if (shouldAutoScrape) {
    urls = await extractUrlsFromPage(platform, igTask);
  } else if (file) {
    const raw = await file.text();
    urls = file.name.endsWith('.json')
      ? JSON.parse(raw)
      : raw.split(/[\n,]/).map(u => u.trim()).filter(Boolean);
  } else {
    return log('Upload a file or enable page extractor mode.');
  }

  if (!urls.length) return log('No URLs found');

  chrome.storage.local.set({ apiKey });

  const queueTask =
    platform !== 'instagram'
      ? taskVal
      : igTask === 'start-messaging' ? 'message' : igTask;

  chrome.runtime.sendMessage(
    {
      cmd         : 'queue',
      platform,
      task        : queueTask,
      personaKey  : isCustom ? 'custom' : persona,
      personaMeta : meta,
      urls,
      dryRun
    },
    res => log(res?.msg || ' Queued')
  );
}

/* ───────── helper: ask background to extract URLs ───────── */
async function extractUrlsFromPage(platform, igTask) {
  if (platform === 'instagram') {
    if (igTask === 'posts')            return send('extractPostsInstagram');
    if (igTask === 'comment-profiles') return send('bulkExtractCommentProfiles');
    if (igTask === 'start-messaging') {
      const d = await chrome.storage.local.get('IGProfileUrls');
      return d.IGProfileUrls || [];
    }
  }
  if (platform === 'linkedin') return send('extractUrlsLinkedin');
  return [];

  function send(cmd) {
    return new Promise(r => {
      chrome.runtime.sendMessage({ cmd }, res => r(res?.urls ?? []));
    });
  }
}

clearBtn.onclick = () => {
  logEl.textContent = '';
};

/* ───────── restore saved API key (compat) ───────── */
chrome.storage.local.get('apiKey', d => {
  if (d.apiKey && !apiInput.value) apiInput.value = d.apiKey;
});
