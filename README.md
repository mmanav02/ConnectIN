# ConnectIN – LinkedIn, Twitter & Instagram Outreach Extension (MV3)

Automate personalized messaging and post engagement on **LinkedIn**, **Twitter/X**, and **Instagram** with AI‑generated text (Claude, Gemini, etc.).

## ✨ Features

| Platform   | Task     | Action                                                                                               |
|------------|----------|------------------------------------------------------------------------------------------------------|
| LinkedIn   | Message  | DM each profile with persona‑styled text. **Automatically scrapes all visible profile URLs** on the current page—no extra file needed. |
| LinkedIn   | Comment  | Comment on each post                                                                                 |
| Twitter    | DM       | Direct‑message each profile                                                                          |
| Twitter    | Reply    | Reply to each tweet                                                                                  |
| Instagram  | Message  | DM each profile (inbox) with persona‑styled text                                                     |
| Instagram  | Comment  | Comment on each post                                                                                 |

## 📁 Folder Layout

```
connectin/
├─ manifest.json
├─ popup.{html,js,css}
├─ personas.json
├─ background/
│  ├─ index.js          # service worker / dispatcher
│  ├─ logger.js
│  ├─ utils.js          # delay helpers, AI calls
│  ├─ linkedin/
│  │   ├─ message.js    # DM logic + profile scraper
│  │   └─ comment.js    # post-comment logic
│  ├─ twitter/
│  │   ├─ message.js    # DM logic
│  │   └─ comment.js    # tweet-reply logic
│  └─ instagram/
│      ├─ message.js    # DM logic
│      └─ comment.js    # post-comment logic
├─ data/                # sample *.json URL lists for testing
└─ icons/
   ├─ 128.jpg
   └─ ConnectIN.png
```

*(The LinkedIn scraper lives inside `background/linkedin/message.js` as `scrapeProfileContext()`—hence no separate `scrape.js` file.)*

## ⚙️ Install

1. Clone or unzip the repo  
2. Open **Chrome** and navigate to `chrome://extensions`  
3. Enable **Developer mode**  
4. Click **Load unpacked**, then select the project folder (`ConnectIN/`)  
5. Grant requested permissions when prompted  

## 🔧 Configuration

| Setting       | Where                       | Notes                                                 |
|---------------|-----------------------------|-------------------------------------------------------|
| **API Key**   | Popup → *Settings* tab      | Masked, stored with `chrome.storage`                  |
| **Personas**  | `personas.json`             | Define `tone`, `goal`, `background` for each persona  |
| **Delays**    | `background/utils.js`       | Tweak `MIN_DELAY_MS` / `MAX_DELAY_MS`                 |

## 🚀 Usage

### 1) Upload a URL file  
Upload a `.csv` or `.json` list of URLs → choose **Platform**, **Task**, **Persona** → **Run automation** or **Dry‑run**.

### 2) LinkedIn Auto‑Scrape (no file)  
If **Platform = LinkedIn** + **Task = Message** and *no* file is chosen, the extension will:

1. Collect all visible profile links on the current LinkedIn page (search results, "My Network", etc.)  
2. Queue them and start sending DMs with your selected persona text.

You can preview or download the scraped list before sending.

## 📜 Logs

Use **Download logs** (popup) to save a timestamped `.txt` with URL, prompt, length, and status.

## 🛡️ Permissions

- `activeTab`, `tabs`, `scripting` – inject scripts & autofill forms  
- `storage` – persist API key and settings  
- Host permissions: `linkedin.com/*`, `twitter.com/*`, `x.com/*`, `instagram.com/*`  
- No analytics; data flows only to the configured AI API.

## 🔄 Dev Workflow

```bash
npm i && npm run build   # bundle background & popup
npm run watch            # hot‑reload (re‑enable extension after build)
```

## License

MIT © 2025