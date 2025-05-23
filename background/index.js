import { delay, randomDelay, waitForTabLoad } from './utils.js';
import { runMessageAutomation } from './message.js';
import { runCommentAutomation } from './comment.js';

/* message from popup → enqueue */
chrome.runtime.onMessage.addListener((msg, _, res) => {
  if (msg?.cmd === 'queue') {
    enqueue(msg)
      .then(() => res({ msg: `queued ${msg.urls.length}` }))
      .catch(e  => res({ msg: e.message }));
    return true;
  }
});

/* simple FIFO */
let busy = false;
const q  = [];
async function enqueue(job) { q.push(job); if (!busy) drain(); }
async function drain() {
  busy = true;
  while (q.length) {
    const job = q.shift();
    try {
      if (job.task === 'message')
        await runMessageAutomation(job, { delay, randomDelay, waitForTabLoad });
      else
        await runCommentAutomation(job, { delay, randomDelay, waitForTabLoad });
    } catch (e) { console.error(e); }
  }
  busy = false;
}
