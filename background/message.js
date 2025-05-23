import { callClaude } from './utils.js';

/* exported to index.js */
export async function runMessageAutomation(
  { personaKey, personaMeta, urls },
  { delay, randomDelay, waitForTabLoad }
) {
  for (const url of urls) {
    await delay(randomDelay());
    const { id } = await chrome.tabs.create({ url, active:false });
    await waitForTabLoad(id);
    console.log("Hello");

    const [{ result: ctx }] = await chrome.scripting.executeScript({
      target:{ tabId:id }, func:scrapeProfileContext, world:'MAIN'
    });

    console.log(ctx);

    const prompt = buildPrompt(personaKey, personaMeta, ctx, 'message');
    const text   = await callClaude(prompt);

    await chrome.scripting.executeScript({
      target:{ tabId:id },
      func : performAction,
      args : [text],
      world: 'MAIN'
    });
  }
}

/* --- helpers (only DM needs these) ---------------- */

function buildPrompt(key,{ tone='friendly',goal='',background='' }={},ctx={}){
  const name=ctx.name||'this LinkedIn member';
  const bul=[
    ['Headline',ctx.headline],['Location',ctx.location],
    ['About',(ctx.about||'').slice(0,350)],
    ['Recent experience',(ctx.topExperience||'').slice(0,200)]
  ].filter(([,v])=>v?.trim()).map(([k,v])=>`• ${k}: ${v.trim()}`).join('\n')||'• (No public details visible)';
  return `You are acting as a **${key}**.
Tone: ${tone}. Goal: ${goal}. Background: ${background}.

Compose a LinkedIn direct message to **${name}**.
Profile snapshot:
${bul}

Write ≤120 words, reference at least one detail, end with an engaging question.`;
}

function scrapeProfileContext () {
  /* helper: find the <section> whose first <h2> text starts with label */
  const findSection = label => {
    return Array.from(document.querySelectorAll('section'))
      .find(sec => {
        const h2 = sec.querySelector('h2, h3, header');
        return h2 && h2.textContent.trim().toLowerCase()
                   .startsWith(label.toLowerCase());
      }) || null;
  };

  const txt = sel => document.querySelector(sel)?.innerText.trim() || '';

  const aboutSec = findSection('About');
  const expSec   = findSection('Experience');

  /* expand “see more” buttons if present */
  aboutSec?.querySelector('button[aria-expanded="false"]')?.click();
  expSec?.querySelector  ('button[aria-expanded="false"]')?.click();

  return {
    name : txt('[data-test-modal-profile-full-name], .text-heading-xlarge'),
    headline : txt('.pv-text-details__left-panel h2, .text-body-medium'),
    location : txt('.pv-text-details__left-panel li'),
    about    : aboutSec?.querySelector('span[aria-hidden="true"]')?.innerText.trim() || '',
    topExperience : expSec?.querySelector('li span[aria-hidden="true"]')?.innerText.trim() || ''
  };
}

function performAction(text){
  const btn=document.querySelector('button[aria-label^="Message"],a[href*="messaging?"]');
  if(!btn) return;
  btn.click();
  const waitBox=(cb,t=0)=>{
    const box=document.querySelector('[contenteditable="true"][role="textbox"].msg-form__contenteditable');
    box?cb(box):t<5000&&setTimeout(()=>waitBox(cb,t+200),200);
  };
  waitBox(box=>{
    box.focus();
    document.execCommand('selectAll',false,null);
    document.execCommand('insertText',false,text);
    box.dispatchEvent(new Event('input',{bubbles:true}));
    const waitSend=(t=0)=>{
      const send=document.querySelector('button.msg-form__send-button,button[aria-label="Send now"]');
      send&&!send.disabled?send.click():t<5000&&setTimeout(()=>waitSend(t+200),200);
    };
    waitSend();
  });
}
