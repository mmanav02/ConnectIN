# LinkedIn AI Outreach Extension

Automate LinkedIn cold‑outreach and post engagement with **Anthropic Claude**‑generated text.

| Mode | What it does |
|------|--------------|
| **Message** | Opens each profile URL, scrapes basic details, asks Claude for a persona prompt, pastes and sends a personalized DM. |
| **Comment** | Opens each post URL, scrapes the post text, asks Claude for a persona‑styled comment, pastes and submits it. |

---

## Folder layout

```
linkedin-ai-outreach/
├─ popup.html            – popup UI
├─ popup.js
├─ styles.css
├─ personas.json         – persona definitions
│
├─ background/           – service‑worker modules
│   ├─ index.js          – queue + dispatcher (entry)
│   ├─ utils.js          – shared helpers (delay, callClaude…)
│   ├─ message.js        – profile DM logic
│   └─ comment.js        – post‑comment logic
│
└─ manifest.json         – MV3 manifest (`type: "module"`)
```

---

## 1 · Install

```bash
git clone https://github.com/your-org/linkedin-ai-outreach.git
cd linkedin-ai-outreach
```

1. Open **chrome://extensions**
2. Toggle **Developer mode**
3. Click **“Load unpacked”** and select this folder
4. Ensure the *Service worker* shows **(running)** without errors.

---

## 2 · Configure personas

Edit **`personas.json`**:

```json
{
  "Sales Rep": {
    "tone": "friendly",
    "goal": "pitch an AI‑powered product",
    "background": "5 years SaaS experience"
  },
  "Technical Recruiter": {
    "tone": "professional",
    "goal": "invite candidate to apply",
    "background": "hiring for Series‑B startups"
  }
}
```

Add or tweak personas freely.


## 4 · Prepare URL files

* **message** mode → list of **profile** URLs  
* **comment** mode → list of **post** URLs  

Accepted formats:

* `.txt` – one URL per line  
* `.json` – JSON array

```json
[
  "https://www.linkedin.com/in/jane-doe/",
  "https://www.linkedin.com/in/john-smith/"
]
```

---

## 5 · Run

1. Click the extension icon.
2. Confirm API key.
3. **Function**: `message` or `comment`.
4. **Persona**: choose from dropdown.
5. **File**: select the URL list.
6. Click **Run**.

Tabs open in the background; progress logs in the popup.

---

## 6 · How it works

1. `popup.js` sends `{ cmd:"queue", task, personaMeta, urls }` to the service worker.
2. `background/index.js` enqueues jobs (FIFO).
3. Dispatcher calls **`message.js`** *or* **`comment.js`**.
4. Each runner:
   1. Opens URL → waits for load
   2. Injects scraper → collects context
   3. Builds prompt → calls Claude
   4. Injects DOM action → pastes & sends
5. Shared helpers are in `background/utils.js`.

---

## 8 · Customization ideas

* Add more personas in **`personas.json`**
* Adjust throttling in `randomDelay()` inside **`utils.js`**
* Swap Claude for another model – rewrite `callClaude()`
* Extend scrapers for education, skills, etc.

---