import { delay, randomDelay, waitForTabLoad } from './utils.js';
import { runMessageAutomation }              from './linkedin/message.js';
import { runCommentAutomation }              from './linkedin/comment.js';
import * as L                                from './logger.js';
import { runTwitterDM }               from './twitter/message.js';
import { runTwitterComment }          from './twitter/comment.js';
import { runInstagramComment } from './instagram/comment.js';
import { runInstagramDM } from './instagram/message.js';

const { downloadLog } = L;

/* message listener */
chrome.runtime.onMessage.addListener((msg, _src, res) => {
  if (msg?.cmd === 'queue') {
    enqueue(msg)
      .then(() => res({ msg: `queued ${msg.urls.length}` }))
      .catch(e  => res({ msg: e.message }));
    return true;
  }

  if (msg?.cmd === 'downloadLog') {
    downloadLog();
    return true;
  }
});

/* FIFO queue */
let busy = false;
const q  = [];

async function enqueue(job) {
  L.log('job enqueued', job.task, job.urls.length);
  q.push(job);
  if (!busy) drain();
}

async function drain() {
  busy = true;
  L.log('drain started, jobs:', q.length);

  while (q.length) {
    const job = q.shift();
    try {
      if (job.platform === 'twitter') {
        if (job.task === 'message') {
          console.log("Sending X message");
          await runTwitterDM(job, { delay, randomDelay, waitForTabLoad });
        } else if (job.task === 'comment') {
          await runTwitterComment(job, { delay, randomDelay, waitForTabLoad });
        }
    } else if(job.platform === "linkedin") {
        if (job.task === 'message') {
          await runMessageAutomation(job, { delay, randomDelay, waitForTabLoad });
        } else if (job.task === 'comment') {
          await runCommentAutomation(job, { delay, randomDelay, waitForTabLoad });
        }
    } else if(job.platform === "instagram"){
        if(job.task === 'message'){  
          await runInstagramDM(job, { delay, randomDelay, waitForTabLoad })
        } else if(job.task === "comment"){
          await runInstagramComment(job, { delay, randomDelay, waitForTabLoad })
        }
    } else {
        L.warn('unknown task', job.task);
      }
    } catch (e) { L.error('runner error: ', e.message || e); }
  }

  busy = false;
  L.log('drain finished');
}

