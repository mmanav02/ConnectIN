import { callClaude } from "../utils.js";
import * as L from '../logger.js';


export async function runInstagramDM(
  { personaKey, personaMeta, urls, dryRun },
  { delay, randomDelay, waitForTabLoad }
) {
  L.log(`DM run started – persona: ${personaKey}, urls: ${urls.length}`);

  for (const url of urls) {
    await delay(randomDelay());
    L.log("opening profile", url);

    const { id } = await chrome.tabs.create({ url, active: false });
    await waitForTabLoad(id);

    const [{ result: ctx }] = await chrome.scripting.executeScript({
      target: { tabId: id },
      func: scrapeProfileContext,
      world: "MAIN",
    });

    const prompt = buildPrompt(personaKey, personaMeta, ctx);
    const text = await callClaude(prompt).catch((err) => {
      L.error("Claude error", err);
      return null;
    });
    if (!text) continue;

    await delay(2000);

    await chrome.scripting.executeScript({
      target: { tabId: id },
      func: openMessagePanel,
      world: "MAIN",
    });

    const func = dryRun ? fillMessage : sendMessage;
    await chrome.scripting.executeScript({
      target: { tabId: id },
      func,
      args: [text],
      world: "MAIN",
    });

    L.log(dryRun ? "DM filled for" : "DM sent to", url);
  }

  L.log("DM run finished.");
}

function buildPrompt(
  key,
  { tone = "friendly", goal = "", background = "" } = {},
  ctx = {}
) {
  return `You are acting as a **${key}**.
Tone: ${tone}. Goal: ${goal}. Background: ${background}.

Write a concise, warm Instagram DM to the following user.
Context you have:

• Name     : ${ctx.name || "(unknown)"}  
• Username : ${ctx.username || "(unknown)"}  
• Bio      : ${ctx.bio || "(none provided)"}  

Keep it under 120 words and end with an inviting question.`;
}

function scrapeProfileContext() {
  const username =
    document.querySelector("header h2")?.innerText ||
    document.querySelector("header h1")?.innerText ||
    document.querySelector('meta[property="og:title"]')?.content?.split("•")[0] ||
    "";

  const name =
    document
      .querySelector("header section span[title]")?.title ||
    document
      .querySelector("header section h1, header section h2")?.innerText ||
    "";

  const bio =
    document
      .querySelector("header section > div > h1 + div")?.innerText?.trim() ||
    document.querySelector('meta[name="description"]')?.content?.split("\n")?.pop() ||
    "";

  return { username: username.trim(), name: name.trim(), bio: bio.trim() };
}

function openMessagePanel() {
  const clickBtn = () => {
    const btn = [...document.querySelectorAll('div[role="button"]')].find(
      (b) => /message/i.test(b.innerText)
    );
    btn?.click();
  };
  clickBtn();
}

/* ------------------- sendMessage (text → click Send) ------------------- */
function sendMessage(text) {
  const waitTextbox = (cb, t = 0) => {
    const box = document.querySelector(
      'div[role="textbox"][aria-label="Message"],' +
      'div[role="textbox"][aria-placeholder="Message..."]'
    );
    box ? cb(box) : t < 6000 && setTimeout(() => waitTextbox(cb, t + 200), 200);
  };

  waitTextbox((box) => {
    const proceed = window.confirm(
      "Do you want to send the message automatically?"
    );
    if (!proceed) {
      console.log("User declined to fill message.");
      return;
    }
    box.focus();
    document.execCommand("insertText", false, text);
    box.dispatchEvent(new InputEvent("input", { bubbles: true }));

    // Simulate pressing Enter key to send
    const enterEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      which: 13,
      keyCode: 13
    });
    box.dispatchEvent(enterEvent);
    setTimeout(() => {
      const sendBtn = [...document.querySelectorAll('div[role="button"]')]
        .find((btn) => btn.textContent.trim().toLowerCase() === "send" && !btn.disabled);
      sendBtn?.click();
    }, 300); // small delay to let any synthetic key event settle
  });
}




function fillMessage(text) {
  const waitTextbox = (cb, t = 0) => {
    const box = document.querySelector(
      'div[role="textbox"][aria-label="Message"],' +
      'div[role="textbox"][aria-placeholder="Message..."]'
    );
    box ? cb(box) : t < 5000 && setTimeout(() => waitTextbox(cb, t + 200), 200);
  };

  waitTextbox((box) => {
    const proceed = window.confirm(
      "Do you want to fill the message automatically?"
    );
    if (!proceed) {
      console.log("User declined to fill message.");
      return;
    }
    box.focus();
    document.execCommand("insertText", false, text);
    box.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
}