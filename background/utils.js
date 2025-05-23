export const delay        = ms => new Promise(r => setTimeout(r, ms));
export const randomDelay  = () => Math.floor(Math.random() * 4000) + 4000;

export function waitForTabLoad(id, time = 15000) {
  return new Promise(r => {
    chrome.tabs.get(id, tab => {
      if (chrome.runtime.lastError || tab.status === 'complete') return r();
      const listener = (i, info) => {
        if (i === id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(to); r();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      const to = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); r(); }, time);
    });
  });
}

export async function callClaude(prompt) {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key':apiKey,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'
    },
    body:JSON.stringify({
      model:'claude-opus-4-20250514',
      messages:[{ role:'user', content:prompt }],
      max_tokens:250
    })
  });
  if (!res.ok) throw new Error(`Claude ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}
