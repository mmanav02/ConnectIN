import * as L           from '../logger.js';
import { callClaude }   from '../utils.js';

/* exported to index.js */
export async function runTwitterDM(
  { personaKey, personaMeta, urls, dryRun },
  { delay, randomDelay, waitForTabLoad }
) {
  L.log(`Twitter DM run – persona: ${personaKey}, urls: ${urls.length}`);

  for (const url of urls) {
    await delay(randomDelay());
    const { id } = await chrome.tabs.create({ url, active: false });
    await waitForTabLoad(id);

    await delay(1000);

    /* scrape context inside the page */
    const [{ result: ctx }] = await chrome.scripting.executeScript({
      target: { tabId: id },
      func  : scrapeProfileContext,
      world : 'MAIN'
    });
    console.log(ctx);
    await delay(1000);
    const prompt = buildPrompt(personaKey, personaMeta, ctx);
    const text   = await callClaude(prompt)
                         .catch(err => (L.error('Claude error', err), null));

    if (!dryRun) {
      await chrome.scripting.executeScript({
        target: { tabId: id },
        func  : sendTwitterDM,
        args  : [text],
      });
    } else {
      await chrome.scripting.executeScript({
        target: { tabId: id },
        func  : fillTwitterDM,
        args  : [text],
      });
    }

    L.log('DM sent to', url);
  }

  L.log('Twitter DM run finished.');
}

/* helpers (DM only) */

function buildPrompt(key, { tone = 'friendly', goal = '', background = '' } = {}, ctx = {}) {
  const { name = 'there', bullets = '' } = ctx;

  return `You are persona ${key}. Tone: ${tone}. Goal: ${goal}. Background: ${background}.

  Compose a Twitter direct message to **${name}**.
  Profile snapshot:
  ${bullets}

  Write ≤240 characters, reference at least one detail, end with an engaging question.`;
}

function scrapeProfileContext() {
  const name = document.querySelector('div[data-testid="UserName"] span')?.innerText.trim() ||
               document.querySelector('h2[data-testid="UserName"] span')?.innerText.trim() || '';
  const bio  = document.querySelector('div[data-testid="UserDescription"]')?.innerText.trim() || '';

  const tweets = [...document.querySelectorAll('article div[lang]')]
    .slice(0, 3)
    .map(el => el.innerText.trim())
    .filter(Boolean);

  const bullets = [
    bio && `Bio: ${bio}`,
    ...tweets.map(t => '- ' + t)
  ].filter(Boolean).join('\n');

  return { name, bullets };
}

async function sendTwitterDM(text) {
  console.log('DM function injected');

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = (sel, timeout = 6000, step = 200) =>
    new Promise((res, rej) => {
      const t0 = Date.now();
      (function poll() {
        const el = document.querySelector(sel);
        if (el) return res(el);
        if (Date.now() - t0 >= timeout) return rej('timeout');
        setTimeout(poll, step);
      })();
    });

  const openBtn = await waitFor(
    'button[data-testid="sendDMFromProfile"], div[data-testid="DMButton"], a[href*="/messages/compose"]'
  ).catch(() => null);
  if (!openBtn) { console.warn('DM button not found'); return false; }

  openBtn.click();
  await delay(800);

  const box = await waitFor(
    'div[contenteditable="true"][data-testid="dmComposerTextInput"], ' +
    'div[data-testid="dmComposerTextInputRichTextInputContainer"] div[contenteditable="true"]'
  ).catch(() => null);
  if (!box) { console.warn('DM text box not found'); return false; }

  box.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
  box.dispatchEvent(new InputEvent('input', { bubbles: true }));

  await delay(1500);

  const sendBtn = await waitFor(
    'button[data-testid="dmComposerSendButton"]:not([disabled])'
  ).catch(() => null);
  sendBtn?.click();

  return !!sendBtn;
}

async function fillTwitterDM(text) {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = (sel, timeout = 6000, step = 200) =>
    new Promise((res, rej) => {
      const t0 = Date.now();
      (function poll() {
        const el = document.querySelector(sel);
        if (el) return res(el);
        if (Date.now() - t0 >= timeout) return rej('timeout');
        setTimeout(poll, step);
      })();
    });

  const openBtn = await waitFor(
    'button[data-testid="sendDMFromProfile"], div[data-testid="DMButton"], a[href*="/messages/compose"]'
  ).catch(() => null);
  if (!openBtn) { console.warn('DM button not found'); return false; }

  openBtn.click();
  await delay(800);

  const box = await waitFor(
    'div[contenteditable="true"][data-testid="dmComposerTextInput"], ' +
    'div[data-testid="dmComposerTextInputRichTextInputContainer"] div[contenteditable="true"]'
  ).catch(() => null);
  if (!box) { console.warn('DM text box not found'); return false; }

  box.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
  box.dispatchEvent(new InputEvent('input', { bubbles: true }));
  console.log('DM drafted – review before sending');
  return true;
}
