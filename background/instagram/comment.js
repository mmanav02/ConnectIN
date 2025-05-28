import { callClaude } from "../utils.js";
import * as L from  '../logger.js';

export async function runInstagramComment(
    { personaKey, personaMeta, urls, dryRun },
    { delay, randomDelay, waitForTabLoad }
){
    L.log(`Comment run started - persona: ${personaKey}, urls: ${urls.length}`);

    for(const url of urls){
        await delay(randomDelay());
        L.log('opening post', url);

        const { id } = await chrome.tabs.create({url, active: false});
        await waitForTabLoad(id);

        const [{result: ctx}] = await chrome.scripting.executeScript({
            target: {tabId: id},
            func: scrapePostContext,
            world: 'MAIN'
        });

        if(!ctx?.postText) L.warn('post text empty for ',url);

        const prompt = buildPrompt(personaKey, personaMeta, ctx);
        const text = await callClaude(prompt).catch(err => (L.error('Claude error', err), null));
        if(!text) continue;
        console.log(text);

        if(!dryRun){
            await chrome.scripting.executeScript({
                target: { tabId: id },
                func : submitInstagramComment,
                args: [text],
                world: 'MAIN'
            });
        }
        else{
            await chrome.scripting.executeScript({
                target: {tabId: id},
                func: fillInstagramComment,
                args: [text],
                world: 'MAIN'
            });
        }

        L.log('Comment posted on ',url);
        
    }
    L.log('Comment run finished.');
}

function buildPrompt(
  key,
  { tone = "friendly", goal = "", background = "" } = {},
  ctx = {}
) {
  const post = (ctx.postText || "").slice(0, 500);
  return `You are acting as a **${key}**.
Tone: ${tone}. Goal: ${goal}. Background: ${background}.

Write a thoughtful ≤120-word comment on this post:
“${post}”
End with an inviting question.`;
}

function scrapePostContext() {
  const og = document.querySelector('meta[property="og:description"]')?.content;
  if (og) return { postText: og };

  const capSpan = document.querySelector('span._a6hd, span[class*="_a6hd"]');
  if (capSpan?.innerText?.trim()) return { postText: capSpan.innerText.trim() };

  const fallback =
    document.querySelector("article")?.querySelector("span")?.innerText?.trim() ||
    "";
  return { postText: fallback };
}

/* ---------- submitInstagramComment: fill + click Post ---------- */
async function submitInstagramComment(comment) {
  const waitTA = (cb, t = 0) => {
    const ta = document.querySelector(
      'textarea[aria-label^="Add a comment"],' +
      'textarea[placeholder^="Add a comment"]'
    );
    ta ? cb(ta) : t < 5000 && setTimeout(() => waitTA(cb, t + 200), 200);
  };

  waitTA(async (ta) => {
    /* 1 ▪ inject text via insertText so React sees it */
    ta.focus();
    document.execCommand("insertText", false, comment);
    ta.dispatchEvent(new InputEvent("input", { bubbles: true }));

    await delay(2000);

    /* 2 ▪ wait for the enabled Post button and click it */
    const tryClick = (t = 0) => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => /Post/i.test(b.textContent) && !b.disabled
      );
      if (btn) return btn.click();
      if (t < 1000) setTimeout(() => tryClick(t + 200), 200);
    };
    tryClick();
  });
}

/* ---------- fillInstagramComment: dry-run (fill only) ---------- */
function fillInstagramComment(comment) {
  const waitTA = (cb, t = 0) => {
    const ta = document.querySelector(
      'textarea[aria-label^="Add a comment"],' +
      'textarea[placeholder^="Add a comment"]'
    );
    ta ? cb(ta) : t < 5000 && setTimeout(() => waitTA(cb, t + 200), 200);
  };

  waitTA((ta) => {
    ta.focus();
    document.execCommand("insertText", false, comment);
    ta.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
}
