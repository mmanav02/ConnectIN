/* ───────────────────────────── imports ───────────────────────────── */
import { delay, randomDelay, waitForTabLoad } from './utils.js';
import { runMessageAutomation }               from './linkedin/message.js';
import { runCommentAutomation }               from './linkedin/comment.js';
import * as L                                 from './logger.js';
import { runTwitterDM }                       from './twitter/message.js';
import { runTwitterComment }                  from './twitter/comment.js';
import { runInstagramComment }                from './instagram/comment.js';
import { runInstagramDM }                     from './instagram/message.js';

const { downloadLog } = L;

/* ───────────────── message listener (queue + log download) ───────── */
chrome.runtime.onMessage.addListener((msg, _src, res) => {
  if (msg?.cmd === 'queue') {
    enqueue(msg)
      .then(() => res({ msg: `queued ${msg.urls.length}` }))
      .catch(e  => res({ msg: e.message }));
    return true;                       // keep the channel open
  }

  if (msg?.cmd === 'downloadLog') {
    downloadLog();
    return true;
  }
});

/* ───────────────────────────── FIFO queue ────────────────────────── */
let busy = false;
const q  = [];

async function enqueue(job) {
  L.log('job enqueued', job.platform, job.task, job.urls.length);
  q.push(job);
  if (!busy) drain();
}

async function drain() {
  busy = true;
  L.log('drain started, jobs:', q.length);

  while (q.length) {
    const job = q.shift();
    try {
      /* ——— Twitter ——— */
      if (job.platform === 'twitter') {
        if (job.task === 'message') {
          await runTwitterDM(job, { delay, randomDelay, waitForTabLoad });
        } else if (job.task === 'comment') {
          await runTwitterComment(job, { delay, randomDelay, waitForTabLoad });
        } else {
          L.warn('unknown twitter task', job.task);
        }

      /* ——— LinkedIn ——— */
      } else if (job.platform === 'linkedin') {
        if (job.task === 'message') {
          await runMessageAutomation(job, { delay, randomDelay, waitForTabLoad });
        } else if (job.task === 'comment') {
          await runCommentAutomation(job, { delay, randomDelay, waitForTabLoad });
        } else {
          L.warn('unknown linkedin task', job.task);
        }

      /* ——— Instagram ——— */
      } else if (job.platform === 'instagram') {
        if (job.task === 'message') {
          await runInstagramDM(job, { delay, randomDelay, waitForTabLoad });

        } else if (job.task === 'comment') {
          await runInstagramComment(job, { delay, randomDelay, waitForTabLoad });

        } else if (job.task === 'posts') {
          /* Scraping already happened in popup – nothing else to run */
          L.log('📸 scraped', job.urls.length, 'post URLs');

        } else if (job.task === 'comment-profiles') {
          /* Likewise, scraping done; these URLs can be exported or queued later */
          L.log('🗣️ scraped', job.urls.length, 'profile URLs from comments');

        } else {
          L.warn('unknown instagram task', job.task);
        }

      } else {
        L.warn('unknown platform', job.platform);
      }
    } catch (e) {
      L.error('runner error:', e.message || e);
    }
  }

  busy = false;
  L.log('drain finished');
}

/* ────────────────────────── URL extractors ───────────────────────── */

/* ——— LinkedIn profile extractor ——— */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.cmd !== 'extractUrlsLinkedin') return;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) return sendResponse({ urls: [] });

    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func  : () => {
          const anchors = [...document.querySelectorAll('a[href*="linkedin.com/in/"]')];
          return [...new Set(
            anchors.map(a => a.href.trim()).filter(h =>
              /^https?:\/\/(www\.)?linkedin\.com\/in\//.test(h)
            )
          )];
        }
      });
      sendResponse({ urls: result });
    } catch (err) {
      console.error('LinkedIn extraction failed:', err);
      sendResponse({ urls: [] });
    }
  });

  return true;   // keep async sendResponse alive
});

/* ——— Instagram bulk profile-link extractor ———
     Crawls saved IGPostUrls, grabs every <a>, then keeps ONLY /username/ links */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.cmd !== 'bulkExtractCommentProfiles') return;

  chrome.storage.local.get('IGPostUrls', async ({ IGPostUrls = [] }) => {
    if (!IGPostUrls.length) {
      sendResponse({ urls: [] });
      return;
    }

    const ALL    = new Set();                 // raw unique links
    const PROFS  = new Set();                 // profile-only links
    const RESERVED = new Set([
      'p', 'reel', 'tv', 'stories', 'explore', 'tags',
      'about', 'directory', 'legal', 'help', 'developers',
      'web', 'accounts', 'reels', 'direct'
    ]);

    /* hidden tab reused for crawl */
    const { id: tabId } = await chrome.tabs.create({ url:'about:blank', active:false });

    for (const postUrl of IGPostUrls) {
      try {
        await chrome.tabs.update(tabId, { url: postUrl });
        await waitForTabLoad(tabId);

        const [{ result: hrefs }] = await chrome.scripting.executeScript({
          target:{ tabId }, world:'MAIN',
          func: async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));

            /* quick autoscroll to load lazy content */
            let stale=0, last=-1;
            while (stale < 4) {
              window.scrollTo(0, document.body.scrollHeight);
              await sleep(700);
              const y = window.scrollY;
              stale = y === last ? stale+1 : 0;
              last  = y;
            }

            const out = new Set();
            document.querySelectorAll('a[href]').forEach(a=>{
              let h = a.getAttribute('href');
              if(!h || h.startsWith('javascript:') || h.startsWith('#')) return;
              try { h = new URL(h, location.origin).toString(); }
              catch { return; }
              out.add(h);
            });
            return [...out];
          }
        });

        hrefs.forEach(u => ALL.add(u));
        console.log(`Collected ${hrefs.length} links from ${postUrl}`);
      } catch(err) {
        console.error('IG bulk scrape error:', err);
      }
    }

    chrome.tabs.remove(tabId);        // cleanup

    /* ─── profile-only filter ─── */
    ALL.forEach(u => {
      try {
        const url = new URL(u);
        const hostOk = /(^|\.)instagram\.com$/i.test(url.hostname);
        if (!hostOk) return;

        const cleanPath = url.pathname.replace(/\/+/g, '/'); // collapse //
        const segs = cleanPath.split('/').filter(Boolean);   // remove empties
        if (segs.length !== 1) return;                       // more than one segment
        if (RESERVED.has(segs[0].toLowerCase())) return;     // reserved word

        // ensure trailing slash for consistency
        PROFS.add(`https://www.instagram.com/${segs[0]}/`);
      } catch (_) { /* ignore malformed */ }
    });

    const result = [...PROFS];
    console.log(result);
    chrome.storage.local.set({ IGProfileUrls: result }, () => {
      console.log('👤  total profile links kept:', result.length);
      sendResponse({ urls: result });
    });
  });

  return true;   // keep async channel alive
});


/* ——— Instagram post-URL extractor ——— */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.cmd !== 'extractPostsInstagram') return;

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab?.id) return sendResponse({ urls: [] });

    try {
      const [{ result: urls }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world : 'MAIN',
        func  : () => {
          const anchors = [...document.querySelectorAll('a[href^="/p/"]')];
          return [...new Set(
            anchors.map(a => new URL(a.getAttribute('href'), location.origin).toString())
          )];
        }
      });
      /* ⚡️ store (or overwrite) in local memory */
      chrome.storage.local.set({ IGPostUrls: urls }, () => {
        L.log('IGPostUrls saved:', urls.length);
        sendResponse({ urls });            // echo back to caller
      });
    } catch (err) {
      console.error('Instagram post extraction failed:', err);
      sendResponse({ urls: [] });
    }
  });

  return true;
});
