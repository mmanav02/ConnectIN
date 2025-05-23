import { callClaude } from './utils.js';
import * as L         from './logger.js';

/* exported to index.js */
export async function runCommentAutomation(
  { personaKey, personaMeta, urls },
  { delay, randomDelay, waitForTabLoad }
) {
  L.log(`Comment run started – persona: ${personaKey}, urls: ${urls.length}`);

  for (const url of urls) {
    await delay(randomDelay());
    L.log('opening post', url);

    const { id } = await chrome.tabs.create({ url, active: false });
    await waitForTabLoad(id);

    const [{ result: ctx }] = await chrome.scripting.executeScript({
      target: { tabId: id },
      func  : scrapePostContext,
      world : 'MAIN'
    });
    if (!ctx?.postText) L.warn('post text empty for', url);

    const prompt = buildPrompt(personaKey, personaMeta, ctx);
    const text   = await callClaude(prompt)
                         .catch(err => (L.error('Claude error', err), null));
    if (!text) continue;

    await chrome.scripting.executeScript({
      target: { tabId: id },
      func  : submitLinkedInComment,
      args  : [text],
      world : 'MAIN'
    });

    L.log('comment posted on', url);
  }

  L.log('Comment run finished.');
}

/*  helpers (comment flow)  */

function buildPrompt(key, { tone = 'friendly', goal = '', background = '' } = {}, ctx = {}) {
  const post = (ctx.postText || '').slice(0, 500);
  return `You are acting as a **${key}**.
Tone: ${tone}. Goal: ${goal}. Background: ${background}.

Write a thoughtful ≤120-word comment on this post:
“${post}”
End with an inviting question.`;
}

function scrapePostContext() {
  const txt = document.querySelector(
    'div.update-components-text, div.feed-shared-update-v2__description'
  )?.innerText?.trim() || '';
  return { postText: txt };
}

function submitLinkedInComment(comment) {
  document.querySelector(
    'button[data-control-name="reply_toggle"], button[aria-label*="Comment"]'
  )?.click();

  const waitEd = (cb, t = 0) => {
    const ed = [...document.querySelectorAll('div[role="textbox"][contenteditable="true"]')]
      .find(el => el.offsetParent !== null);
    ed ? cb(ed) : t < 4000 && setTimeout(() => waitEd(cb, t + 200), 200);
  };

  waitEd(ed => {
    ed.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, comment);
    ed.dispatchEvent(new InputEvent('input', { bubbles: true }));

    setTimeout(() => {
      const form = ed.closest('form');
      const btn  = [...form.querySelectorAll('button[type="submit"]:not([disabled])')][0];
      btn ? btn.click()
          : form.requestSubmit ? form.requestSubmit()
                               : form.submit();
      L.log('comment submit triggered');
    }, 1500);
  });
}
