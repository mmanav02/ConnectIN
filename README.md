# LinkedIn AI Outreach Extension  
Automate cold-outreach DMs and post engagement on LinkedIn with persona-driven, **Anthropic Claude**-generated text—now with an optional **Dry-Run** mode for safe testing.

| Mode       | Action                                                                                                                                  |
|------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| **Message**| Scrapes a profile’s details, asks Claude for a personalized message, **pastes & sends** a DM.                                           |
| **Comment**| Scrapes a post’s text, asks Claude for a persona-appropriate reply, **pastes & posts** the comment.                                     |
| **Dry-Run**| Performs the full flow but **only pastes** the draft (no automatic Send/Post) so you can review before committing.                      |

---

## Folder layout

```
linkedin-ai-outreach/
├─ popup.html            – Popup UI (Run / Dry-Run switch)
├─ popup.js
├─ styles.css
├─ personas.json         – Persona definitions
│
├─ background/           – Service-worker modules
│   ├─ index.js          – Queue + dispatcher
│   ├─ utils.js          – Shared helpers (delay, callClaude, randomDelay …)
│   ├─ message.js        – Profile-DM runner
│   └─ comment.js        – Post-comment runner
│
└─ manifest.json         – MV3 manifest (`type: "module"`)
```

---

## 1 · Install

```bash
git clone https://github.com/mmanav02/ConnectIN.git
cd ConnectIN
```

1. Browse to **chrome://extensions**  
2. Toggle **Developer mode**  
3. Click **“Load unpacked”** → select this folder  
4. Confirm the *Service worker* shows **(running)** without errors.

---

## 2 · Add personas

Edit **`personas.json`** to tailor tone, goal, and background:

```json
{
  "Sales Rep": {
    "tone": "friendly",
    "goal": "pitch an AI-powered product",
    "background": "5 years SaaS experience"
  },
  "Technical Recruiter": {
    "tone": "professional",
    "goal": "invite candidate to apply",
    "background": "hiring for Series-B startups"
  }
}
```

Add as many as you like—the popup will list them automatically.

---

## 3 · Prepare URL files

* **Message** mode → profile URLs  
* **Comment** mode → post URLs  

Accepted formats:

* **`.txt`** – one URL per line  
* **`.json`** – JSON array of URLs

Example `targets.json`:

```json
[
  "https://www.linkedin.com/in/manavv-vakharia/",
  "https://www.linkedin.com/in/some-prospect/"
]
```

---

## 4 · Run

1. Click the extension icon.  
2. Paste your **Anthropic API key** (stored in `chrome.storage`, never sent elsewhere).  
3. Choose **Function**: `message` or `comment`.  
4. Select a **Persona**.  
5. Pick your **URL file**.  
6. **Toggle “Dry-Run”** if you want drafts only.  
7. Click **Run** (or **Dry-Run**).

Tabs open in the background; progress appears in the popup log.

---

## 5 · How it works

1. **`popup.js`** sends `{ task, personaMeta, urls, dryRun }` to the service-worker queue.  
2. **`background/index.js`** dispatches jobs FIFO.  
3. Runner (`message.js` / `comment.js`) opens each URL, injects a scraper, builds a Claude prompt, receives the text, and injects it into the LinkedIn UI.  
4. If `dryRun === false` it also clicks **Send / Post**; otherwise it stops so you can review.

---

## 6 · Customization

| Want to… | Where to change |
|----------|-----------------|
| Add personas | `personas.json` |
| Slow down or randomize timing | `background/utils.js` → `randomDelay()` |
| Use another model provider | Rewrite `callClaude()` in `utils.js` |
| Scrape richer profile data | Edit `scrapeProfileContext()` in `message.js` |
| Turn off auto-close of tabs | Comment out `chrome.tabs.remove(tabId)` in both runners |

---

### Tutorial - Explanation of the Extension
[Explanation Recording Link](https://drive.google.com/file/d/1oXRqofhY6ljW2u-D3lb-B-dZOwlNSjVC/view?usp=drive_link)
