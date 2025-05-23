import * as L from './logger.js';

/* time helpers */
export const delay       = ms => new Promise(r => setTimeout(r, ms));
export const randomDelay = () => Math.floor(Math.random() * 4000) + 4000;

/* wait for chrome.tabs status === 'complete' */
export function waitForTabLoad(id, time = 15000) {
  L.log('waitForTabLoad start', id);
  return new Promise(r => {
    chrome.tabs.get(id, tab => {
      if (chrome.runtime.lastError || tab.status === 'complete') {
        L.log('tab already complete', id);
        return r();
      }
      const listener = (i, info) => {
        if (i === id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(to);
          L.log('tab finished loading', id);
          r();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      const to = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        L.warn('tab timeout', id);
        r();
      }, time);
    });
  });
}

/* Anthropic Claude wrapper */
export async function callClaude(prompt) {
  L.log('Claude request', `${prompt.length} chars`);
  const { apiKey } = await chrome.storage.local.get('apiKey');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'x-api-key'    : apiKey,
        'anthropic-version'                         : '2023-06-01',
        'anthropic-dangerous-direct-browser-access' : 'true'
      },
      body: JSON.stringify({
        model   : 'claude-opus-4-20250514',
        messages: [{ role:'user', content: prompt }],
        max_tokens: 250
      })
    });

    if (!res.ok) {
      const msg = `Claude HTTP ${res.status}`;
      L.error(msg);
      throw new Error(msg);
    }

    const data  = await res.json();
    const reply = data.content?.[0]?.text || '';
    L.log('Claude ok', `${reply.length} chars`);
    return reply;

  } catch (err) {
    L.error('Claude fetch error', err.message || err);
    throw err;
  }
}
