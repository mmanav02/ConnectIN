let personas = {};

// load personas.json ➜ build <select>
(async () => {
  try {
    const resp = await fetch(chrome.runtime.getURL('personas.json'));
    personas = await resp.json();
    const sel = document.getElementById('persona');
    Object.keys(personas).forEach(k => {
      const o = document.createElement('option');
      o.value = o.textContent = k.trim();
      sel.appendChild(o);
    });
  } catch (e) {
    console.error(e); log('❌ could not load personas.json');
  }
})();

/* log helper */
const logEl = document.getElementById('log');
const log   = m => (logEl.textContent += m + '\n', logEl.scrollTop = logEl.scrollHeight);

/* buttons */
document.getElementById('run').onclick     = () => start();

async function start() {
  const apiKey  = document.getElementById('apiKey').value.trim();
  const task    = document.getElementById('task').value;
  const persona = document.getElementById('persona').value.trim();
  const file    = document.getElementById('fileInput').files[0];

  if (!apiKey || !file) return log('⚠️ API key and file required');

  const raw  = await file.text();
  const urls = file.name.endsWith('.json')
    ? JSON.parse(raw)
    : raw.split(/[\n,]/).map(u => u.trim()).filter(Boolean);

  const meta = personas[persona];
  if (!meta) return log(`❌ persona “${persona}” not found`);

  chrome.storage.local.set({ apiKey });
  chrome.runtime.sendMessage(
    { cmd:'queue', task, personaKey:persona, personaMeta:meta, urls},
    res => log(res?.msg || 'queued')
  );
}

/* restore saved key */
chrome.storage.local.get('apiKey', d => {
  if (d.apiKey) document.getElementById('apiKey').value = d.apiKey;
});
