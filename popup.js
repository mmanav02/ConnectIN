let personas = {};

/* ───────── load personas.json + add “Custom message” option ───────── */
(async () => {
  try {
    const data = await fetch(chrome.runtime.getURL('personas.json')).then(r => r.json());
    personas = data;

    const sel = document.getElementById('persona');
    Object.keys(personas).forEach(k => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = k.trim();
      sel.appendChild(opt);
    });

    /* add the custom entry at the end */
    const opt = document.createElement('option');
    opt.value = opt.textContent = 'Custom message';
    opt.dataset.custom = '1';
    sel.appendChild(opt);
  } catch (e) {
    console.error(e);
    log('❌ could not load personas.json');
  }
})();

/* ───────────── UI helpers ───────────── */
const logEl           = document.getElementById('log');
const platformSel     = document.getElementById('platform');
const igTaskSel       = document.getElementById('ig-task');
const igBlock         = document.getElementById('ig-block');
const msgBlock        = document.getElementById('msg-block');
const personaSel      = document.getElementById('persona');
const customMsg       = document.getElementById('customMessage');
const customLabel     = document.getElementById('customLabel');

const log = m => {
  logEl.textContent += m + '\n';
  logEl.scrollTop    = logEl.scrollHeight;
};

/* ───────────── buttons ───────────── */
document.getElementById('run').onclick        = () => start(0);
document.getElementById('dry').onclick        = () => start(1);
document.getElementById('downloadLog').onclick =
  () => chrome.runtime.sendMessage({ cmd: 'downloadLog' });

/* ───────────── dynamic UI toggles ───────────── */
platformSel.addEventListener('change', toggleUi);
igTaskSel.addEventListener('change',   toggleUi);
personaSel.addEventListener('change',  toggleUi);
toggleUi();   // run once on load

function toggleUi() {
  const isIg        = platformSel.value === 'instagram';
  const igTask      = igTaskSel.value;
  const showIgBlock = isIg;
  const showMsgBlk  = !isIg || igTask === 'start-messaging';

  igBlock.classList.toggle('hidden', !showIgBlock);
  msgBlock.classList.toggle('hidden', !showMsgBlk);

  /* custom message textarea */
  const custom      = personaSel.selectedOptions[0]?.dataset.custom === '1';
  customMsg.classList.toggle  ('hidden', !custom);
  customLabel.classList.toggle ('hidden', !custom);
}

/* ───────────── main runner ───────────── */
async function start(dryRun = 0) {
  const apiKey   = document.getElementById('apiKey').value.trim();
  const taskSel  = document.getElementById('task').value;
  const platform = platformSel.value;
  const igTask   = igTaskSel.value;
  const persona  = personaSel.value.trim();
  const file     = document.getElementById('fileInput').files[0];
  const custom   = personaSel.selectedOptions[0]?.dataset.custom === '1';
  const customTxt= customMsg.value.trim();

  if (!apiKey) return log('⚠️  API key is required');
  if (custom && !customTxt) return log('⚠️  Enter your custom message');

  /* determine persona meta */
  let meta;
  if (custom) {
    meta = { prompt: customTxt };
  } else {
    meta = personas[persona];
    if (!meta) return log(`❌ persona “${persona}” not found`);
  }

  /* decide how we’ll get URLs */
  let urls = [];
  const needProfiles =
    (!file && platform === 'instagram' && igTask === 'start-messaging');

  const shouldAutoScrape =
    (!file && platform === 'linkedin'  && taskSel === 'message') ||
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
    return log('⚠️ Upload a file or enable page extractor mode.');
  }

  if (!urls.length) return log('⚠️ No URLs found');

  chrome.storage.local.set({ apiKey });

  const queueTask =
    platform !== 'instagram'
      ? taskSel
      : igTask === 'start-messaging' ? 'message' : igTask;

  chrome.runtime.sendMessage(
    {
      cmd        : 'queue',
      platform,
      task        : queueTask,
      personaKey  : custom ? 'custom' : persona,
      personaMeta : meta,
      urls,
      dryRun
    },
    res => log(res?.msg || '✅ Queued')
  );
}

/* ───────── helper: extract URLs ───────── */
async function extractUrlsFromPage(platform, igTask) {
  if (platform === 'instagram') {
    if (igTask === 'posts')              return send('extractPostsInstagram');
    if (igTask === 'comment-profiles')   return send('bulkExtractCommentProfiles');
    if (igTask === 'start-messaging') {  // pull cached profiles
      const d = await chrome.storage.local.get('IGProfileUrls');
      return (d.IGProfileUrls || []);
    }
  }
  if (platform === 'linkedin')  return send('extractUrlsLinkedin');
  return [];
  function send(cmd) {
    return new Promise(r => {
      chrome.runtime.sendMessage({ cmd }, res => r(res?.urls ?? []));
    });
  }
}

/* ───────── restore saved API key ───────── */
chrome.storage.local.get('apiKey', d => {
  if (d.apiKey) document.getElementById('apiKey').value = d.apiKey;
});
