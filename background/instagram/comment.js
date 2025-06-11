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

  waitTA((ta) => {
    ta.focus();
    document.execCommand("insertText", false, comment);
    ta.dispatchEvent(new InputEvent("input", { bubbles: true }));

    // Attempt Enter key
    const enterEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      which: 13,
      keyCode: 13
    });
    ta.dispatchEvent(enterEvent);

    let attempts = 0;
    const tryClick = () => {
      const postBtn = [...document.querySelectorAll('div[role="button"]')].find(
        (btn) =>
          btn.textContent.trim().toLowerCase() === "post" &&
          btn.offsetParent !== null &&
          !btn.getAttribute("aria-disabled")
      );
      if (postBtn) {
        postBtn.click();
      } else if (attempts++ < 10) {
        setTimeout(tryClick, 200);
      }
    };

    setTimeout(tryClick, 300);
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
