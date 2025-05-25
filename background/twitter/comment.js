// background/twitter/comment.js
import { callClaude } from '../utils.js';
import * as L from '../logger.js';

export async function runTwitterComment(
  { personaKey, personaMeta, urls, dryRun },
  { delay, randomDelay, waitForTabLoad }
) {
  L.log(`Twitter comment – persona: ${personaKey}, urls: ${urls.length}`);

  for (const url of urls) {
    await delay(randomDelay());
    const { id } = await chrome.tabs.create({ url, active: false });
    await waitForTabLoad(id);

    const [{ result: ctx }] = await chrome.scripting.executeScript({
      target: { tabId: id },
      func: scrapeTweetContext,
      world: 'MAIN'
    });

    if (!ctx.tweetText) { L.warn('no text', url); continue; }

    const prompt = buildPrompt(personaKey, personaMeta, ctx);
    const text = await callClaude(prompt).catch(e => (L.error('Claude', e), null));
    if (!text) continue;

    const pageFn = dryRun ? fillTwitterComment : submitTwitterComment;
    await chrome.scripting.executeScript({
      target: { tabId: id },
      func: pageFn,
      args: dryRun ? [text] : [text, 1000],
      world: 'MAIN'
    });

    L.log('done', url);
  }
  L.log('Twitter comment run finished');
}

function buildPrompt(key, { tone = 'friendly', goal = '', background = '' } = {}, { tweetText = '' }) {
  return `You are persona ${key}. Tone: ${tone}. Goal: ${goal}. Background: ${background}.
Reply (≤140 chars) to:
${tweetText}`;
}

function scrapeTweetContext() {
  const waitFor = (sels, t = 0) =>
    new Promise(r => (function p() {
      const el = sels.map(s => document.querySelector(s)).find(Boolean);
      if (el || t >= 6000) return r(el);
      setTimeout(() => p(t + 200), 200);
    })());

  return waitFor(['div[data-testid="tweetText"]', 'article div[lang]'])
    .then(n => ({ tweetText: n?.innerText.trim() || '' }));
}

async function submitTwitterComment(comment, pause = 1000) {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = (q, t = 0) =>
    new Promise(r => (function p() {
      const el = typeof q === 'function' ? q() : document.querySelector(q);
      if (el || t >= 6000) return r(el);
      setTimeout(() => p(t + 200), 200);
    })());

  const replyBtn = await waitFor('div[data-testid="reply"], button[aria-label*="Reply"]');
  if (!replyBtn) return false;
  replyBtn.click(); await delay(600);

  const editor = await waitFor('div[role="textbox"][data-testid="tweetTextarea_0"], div[aria-label="Tweet text"][contenteditable="true"]');
  if (!editor) return false;

  editor.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, comment);
  editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  await delay(pause);

  const dialog = editor.closest('div[role="dialog"]') || document;
  const sendBtn = await waitFor(() => dialog.querySelector('button[data-testid="tweetButton"]:not([disabled])'));
  if (!sendBtn) return false;

  editor.blur(); await delay(100);
  sendBtn.click();
  return true;
}

async function fillTwitterComment(comment) {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const waitFor = (q, t = 0) =>
    new Promise(r => (function p() {
      const el = typeof q === 'function' ? q() : document.querySelector(q);
      if (el || t >= 6000) return r(el);
      setTimeout(() => p(t + 200), 200);
    })());

  const replyBtn = await waitFor('div[data-testid="reply"], button[aria-label*="Reply"]');
  if (!replyBtn) return false;
  replyBtn.click(); await delay(600);

  const editor = await waitFor('div[role="textbox"][data-testid="tweetTextarea_0"], div[aria-label="Tweet text"][contenteditable="true"]');
  if (!editor) return false;

  editor.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, comment);
  editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  console.log('drafted');
  return true;
}
