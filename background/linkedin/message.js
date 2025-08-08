import * as L           from '../logger.js';
import { callClaude }   from '../utils.js';

/* exported to index.js */
export async function runMessageAutomation(
  { personaKey, personaMeta, urls, dryRun },
  { delay, randomDelay, waitForTabLoad }
) {
  L.log(`DM run started - persona: ${personaKey}, urls: ${urls.length}`);

  for (const url of urls) {
    await delay(randomDelay());
    L.log('opening profile', url);

    const { id } = await chrome.tabs.create({ url, active: false });
    await waitForTabLoad(id);

    const [{ result: ctx }] = await chrome.scripting.executeScript({
      target: { tabId: id },
      func  : scrapeProfileContext,
      world : 'MAIN'
    });
    if (!ctx || !ctx.name) L.warn('context empty for', url);

    const prompt = buildPrompt(personaKey, personaMeta, ctx);
    const text   = await callClaude(prompt)
                         .catch(err => (L.error('Claude error', err), null));
    if (!text) continue;

    if(!dryRun)
    {
      await chrome.scripting.executeScript({
      target: { tabId: id },
      func  : sendMessage,
      args  : [text],
      world : 'MAIN'
    });}
    else{
      await chrome.scripting.executeScript({
      target: { tabId: id },
      func  : fillMessage,
      args  : [text],
      world : 'MAIN'
    });
    }

    L.log('DM sent to', url);
  }

  L.log('DM run finished.');
}

/* helpers (DM only) */

function buildPrompt(key, { tone = 'friendly', goal = '', background = '' } = {}, ctx = {}) {
  const name = ctx.name || 'this LinkedIn member';
  const bullets = [
    ['Headline',          ctx.headline],
    ['Location',          ctx.location],
    ['About',             (ctx.about || '').slice(0, 350)],
    ['Recent experience', (ctx.topExperience || '').slice(0, 200)]
  ]
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `• ${k}: ${v.trim()}`)
    .join('\n') || '• (No public details visible)';

  return `You are acting as a **${key}**.
  Tone: ${tone}. Goal: ${goal}. Background: ${background}.

  Compose a LinkedIn direct message to **${name}**.
  Profile snapshot:
  ${bullets}

  Write ≤120 words, reference at least one detail, end with an engaging question.`;
}

function scrapeProfileContext() {
  const sel = s => document.querySelector(s)?.innerText.trim() || '';

  /* find section by heading text */
  const findSec = label =>
    [...document.querySelectorAll('section')].find(sec => {
      const h = sec.querySelector('h2, h3, header');
      return h && h.textContent.trim().toLowerCase().startsWith(label.toLowerCase());
    });

  const aboutSec = findSec('About');
  const expSec   = findSec('Experience');
  aboutSec?.querySelector('button[aria-expanded="false"]')?.click();
  expSec?.querySelector  ('button[aria-expanded="false"]')?.click();

  return {
    name         : sel('[data-test-modal-profile-full-name], .text-heading-xlarge'),
    headline     : sel('.pv-text-details__left-panel h2, .text-body-medium'),
    location     : sel('.pv-text-details__left-panel li'),
    about        : aboutSec?.querySelector('span[aria-hidden="true"]')?.innerText.trim() || '',
    topExperience: expSec?.querySelector ('li span[aria-hidden="true"]')?.innerText.trim() || ''
  };
}

function sendMessage(text) {
  const btn = document.querySelector('button[aria-label^="Message"], a[href*="messaging?"]');
  if (!btn) { console.warn('Message button not found'); return; }

  btn.click();
  const waitBox = (cb, t = 0) => {
    const box = document.querySelector('[contenteditable="true"][role="textbox"].msg-form__contenteditable');
    box ? cb(box) : t < 5000 && setTimeout(() => waitBox(cb, t + 200), 200);
  };

  waitBox(box => {
    box.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    box.dispatchEvent(new Event('input', { bubbles: true }));

    const waitSend = (t = 0) => {
      const send = document.querySelector('button.msg-form__send-button, button[aria-label="Send now"]');
      if (send && !send.disabled) {
        send.click();
        console.log('DM clicked send');
      } else if (t < 5000) setTimeout(() => waitSend(t + 200), 200);
      else L.warn('Send button still disabled after 5 s');
    };
    waitSend();
  });
}

function fillMessage(text) {
  console.log("Here");
  const btn = document.querySelector('button[aria-label^="Message"], a[href*="messaging?"]');
  if (!btn) {
    console.warn('Message button not found');
    return;
  }
  btn.click();

  const waitBox = (cb, t = 0) => {
    const box = document.querySelector(
      '[contenteditable="true"][role="textbox"].msg-form__contenteditable'
    );
    if (box) return cb(box);
    if (t < 5000) setTimeout(() => waitBox(cb, t + 200), 200);
  };

  waitBox(box => {
    box.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('DM text inserted – waiting for manual review before sending');
  });
}

/* Linkedin Automated Message received from site */
export async function linkedinUrlsMessageAutomation(
  { profiles, dryRun, delay, randomDelay, waitForTabLoad, persona }
) {
  dryRun = 1
  L.log(`DM run started, urls: ${profiles.length}`);

  for (const profile of profiles) {
    try{
      await delay(randomDelay());
      const url = profile.url;
      const text = profile.message;
      L.log('opening profile URL at: ', url);

      L.log("📍Creating new tab...");
      const { id } = await chrome.tabs.create({ url, active: false });
      await waitForTabLoad(id);

      L.log("📍Tab loaded...");

      // const [{ result: ctx }] = await chrome.scripting.executeScript({
      // target: { tabId: id },
      // func  : scrapeProfileContext,
      // world : 'MAIN'
      // });
      // if (!ctx || !ctx.name) L.warn('context empty for', url);

      // const personaKey = "User"
      
      // const prompt = buildPrompt(personaKey, persona, ctx);
      // const text   = await callClaude(prompt)
      //                     .catch(err => (L.error('Claude error', err), null));
      // console.log("Message Text: ",text);
      // if (!text) continue;

      await delay(randomDelay());

      if(!dryRun)
      {
        await chrome.scripting.executeScript({
        target: { tabId: id },
        func  : sendMessage,
        args  : [text],
        world : 'MAIN'
        });
      }
      else{
        
        await chrome.scripting.executeScript({
        target: { tabId: id },
        func  : fillMessage,
        args  : [text],
        world : 'MAIN'
      }).catch(e => console.error('❌ executeScript failed:', e));
      }

      L.log('DM sent to', url);
    } catch(e){
      console.error("Error sending message to", url, e);
    }
  }

  L.log('DM run finished.');
}