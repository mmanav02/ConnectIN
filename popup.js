let personas = {};

/* load personas.json → build dropdown */
(async () => {
  try {
    const data = await fetch(chrome.runtime.getURL('personas.json')).then(r => r.json());
    personas = data;
    const sel = document.getElementById('persona');
    Object.keys(personas).forEach(k => {
      const opt   = document.createElement('option');
      opt.value   = opt.textContent = k.trim();
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error(e); log('❌ could not load personas.json');
  }
})();

const logEl = document.getElementById('log');
const log   = m => {
  logEl.textContent += m + '\n';
  logEl.scrollTop    = logEl.scrollHeight;
};

/* buttons */
document.getElementById('run').onclick = () => start(0);
document.getElementById('dry').onclick = () => start(1);
// document.getElementById('run').onclick = start;
// document.getElementById('dry').onclick = startDry;
document.getElementById('downloadLog').onclick = () =>
chrome.runtime.sendMessage({ cmd: 'downloadLog' });

async function startDry(){
  const apiKey  = document.getElementById('apiKey').value.trim();
  const task    = document.getElementById('task').value;
  const platform = document.getElementById('platform').value;
  const persona = document.getElementById('persona').value.trim();
  const file    = document.getElementById('fileInput').files[0];
  const dryRun = 1;
  if (!apiKey || !file) return log('⚠️  API key and file required');

  const raw  = await file.text();
  const urls = file.name.endsWith('.json')
    ? JSON.parse(raw)
    : raw.split(/[\n,]/).map(u => u.trim()).filter(Boolean);

  const meta = personas[persona];
  if (!meta) return log(`❌ persona “${persona}” not found`);

  chrome.storage.local.set({ apiKey });
  chrome.runtime.sendMessage(
    { cmd: 'queue', platform, task, personaKey: persona, personaMeta: meta, urls , dryRun},
    res => log(res?.msg || 'queued')
  );
}

async function start(dryRun = 0) {
  const apiKey   = document.getElementById('apiKey').value.trim();
  const task     = document.getElementById('task').value;
  const platform = document.getElementById('platform').value;
  const persona  = document.getElementById('persona').value.trim();
  const file     = document.getElementById('fileInput').files[0];

  if (!apiKey) return log('⚠️  API key is required');
  const meta = personas[persona];
  if (!meta) return log(`❌ persona “${persona}” not found`);

  let urls = [];

  if (!file && platform === 'linkedin' && task === 'message') {
    urls = await extractUrlsFromPage();
  } else if (file) {
    const raw = await file.text();
    urls = file.name.endsWith('.json')
      ? JSON.parse(raw)
      : raw.split(/[\n,]/).map(u => u.trim()).filter(Boolean);
  } else {
    return log('⚠️ Upload a file or use LinkedIn extractor mode.');
  }

  if (!urls.length) return;

  chrome.storage.local.set({ apiKey });
  chrome.runtime.sendMessage(
    { cmd: 'queue', platform, task, personaKey: persona, personaMeta: meta, urls, dryRun },
    res => log(res?.msg || '✅ Queued')
  );
}


async function extractUrlsFromPage() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ cmd: 'extractUrls' }, res => {
      if (res?.urls?.length) resolve(res.urls);
      else {
        log('❌ No LinkedIn URLs found on the page');
        resolve([]);
      }
    });
  });
}



/* restore saved key */
chrome.storage.local.get('apiKey', d => {
  if (d.apiKey) document.getElementById('apiKey').value = d.apiKey;
});