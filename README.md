# ConnectIN – LinkedIn, Twitter & Instagram Outreach Extension (MV3)

Automate personalized messaging and post engagement on **LinkedIn**, **Twitter/X**, **Instagram** with AI-generated text (Claude, Gemini, etc.).

---

## ✨ Features

| Platform   | Task     | Action                                                               |
|------------|----------|----------------------------------------------------------------------|
| LinkedIn   | Message  | DM each profile with persona-styled text                             |
| LinkedIn   | Comment  | Comment on each post                                                 |
| LinkedIn   | **Scrape** | **One-click scrape of all profile URLs on the current LinkedIn page** |
| Twitter    | DM       | Direct-message each profile                                          |
| Twitter    | Reply    | Reply to each tweet                                                  |
| Instagram  | Message  | DM each profile (INBOX) with persona-styled text                     |
| Instagram  | Comment  | Comment on each post                                                 |

---

## 📁 Folder Layout

```
connectai/
├─ manifest.json
├─ popup.{html,js,css}
├─ personas.json               # persona definitions
├─ background/
│  ├─ index.js                 # dispatcher / messaging queue
│  ├─ logger.js
│  ├─ utils.js                 # delay, callClaude/Gemini, helpers
│  ├─ linkedin/
│  │   ├─ message.js           # LinkedIn DM logic
│  │   ├─ comment.js           # LinkedIn post-comment logic
│  │   └─ scrape.js            # extracts visible profile URLs
│  ├─ twitter/
│  │   ├─ message.js           # Twitter DM logic
│  │   └─ comment.js           # Twitter reply logic
│  └─ instagram/
│      ├─ message.js           # Instagram DM logic
│      └─ comment.js           # Instagram post-comment logic
└─ README.md
```

---

## ⚙️ Install

1. Clone or unzip the repo  
2. Open **Chrome** and navigate to `chrome://extensions`  
3. Enable **Developer mode** (top-right toggle)  
4. Click **Load unpacked**, then select the `connectai/` folder  
5. When prompted, grant the requested permissions

---

## 🔧 Configuration

| Setting         | Where                               | Notes                                               |
|-----------------|-------------------------------------|-----------------------------------------------------|
| **API Key**     | Popup → *Settings* tab              | Masked on screen, persisted with `chrome.storage`   |
| **Personas**    | `personas.json`                     | Each persona defines `tone`, `goal`, `background`   |
| **Delays**      | `background/utils.js`               | Adjust `MIN_DELAY_MS` and `MAX_DELAY_MS`            |
| **IG Cookies**  | Your browser session                | Extension reuses logged-in Instagram web session    |

---

## 🚀 Usage

### Option A – Upload a URL file

1. Prepare a `.csv` or `.json` list of profile/post URLs for the chosen platform  
2. Open the popup and select **Platform**, **Task**, **Persona**  
3. Upload the file  
4. Choose **Run automation** or **Dry-run** (generates drafts only)

### Option B – LinkedIn Auto-Scrape (no file needed)

If **Platform = LinkedIn** and **Task = Message** *and* **no file is uploaded**:

1. Navigate to any LinkedIn page that lists people (search results, “My Network”, company employees, event attendee list, etc.)  
2. Open the popup → select persona → click **Scrape & Run**  
3. The extension collects all visible profile URLs, queues them, and begins DM automation automatically.

You can preview the scraped list before sending or hit **Download CSV** to save it.

---

## 📜 Logs

After a run, click **Download logs** in the popup to save a timestamped `.txt` detailing:

- URL processed  
- Prompt sent to Claude/Gemini  
- Character count & status (drafted / sent / errored)

---

## 🛡️ Permissions

The extension requests:

- `activeTab`, `tabs`, `scripting` – inject scripts for scraping & form-filling  
- `storage` – persist API key, settings, session state  
- Host permissions for `linkedin.com/*`, `twitter.com/*`, `x.com/*`, `instagram.com/*`  
- **No** analytics or external tracking; data is only exchanged with the configured AI API.

---

## 🔄 Development Workflow

```bash
# install deps for local dev (optional)
npm i && npm run build     # bundles background & popup

# fast-reload during edits
npm run watch
```

The MV3 **service-worker** lives in `background/index.js`; hot-reload requires disabling & re-enabling the extension or using Chrome’s **Ctrl/Cmd + R** in the Extensions page.

---

## 🤝 Contributing

PRs are welcome! See `CONTRIBUTING.md` for coding style and commit guidelines.

---

## License

MIT © 2025 – ConnectAI Contributors
