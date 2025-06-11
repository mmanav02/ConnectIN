# ConnectAI – LinkedIn & Twitter Outreach Extension (MV3)

Automate personalized messaging and post engagement on **LinkedIn** and **Twitter/X** with AI‑generated text (Claude, Gemini, etc.).

---

## ✨ Features

| Platform | Task     | Action                                           |
|----------|----------|--------------------------------------------------|
| LinkedIn | Message  | DM each profile with persona‑styled text         |
| LinkedIn | Comment  | Comment on each post                             |
| Twitter  | DM       | Direct‑message each profile                      |
| Twitter  | Reply    | Reply to each tweet                              |



---

## 📁 Folder Layout

```
connectai/
├─ manifest.json
├─ popup.{html,js,css}
├─ personas.json
├─ background/
│  ├─ index.js          # dispatcher / messaging queue
│  ├─ logger.js
│  ├─ utils.js
│  ├─ linkedin/
│  │   ├─ message.js    # LinkedIn DM logic
│  │   └─ comment.js    # LinkedIn comment logic
│  └─ twitter/
│      ├─ message.js    # Twitter DM logic
│      └─ comment.js    # Twitter reply logic
```

---

## ⚙️ Install

1. Clone or unzip the repo  
2. Go to `chrome://extensions`  
3. Enable **Developer mode**  
4. Click **Load unpacked**, then select the `connectai/` folder  
5. Grant required permissions when prompted

---

## 🔧 Configuration

- **API Key** – paste in popup (masked, stored locally)  
- **Personas** – define in `personas.json` (tone, goal, background)  
- **Delay Logic** – tweak random delay range in `background/utils.js`

---

## 🚀 Usage

### Option 1: Manual File Upload
1. Prepare a `.csv` or `.json` list of profile/post URLs  
2. Select platform, task, persona in popup  
3. Upload your file  
4. Click **Run automation** or **Dry-run**

### Option 2: Streamlined Page Extraction
If:
- Platform = `LinkedIn`
- Task = `Message`
- **No file is uploaded**

🔎 The extension will **automatically extract LinkedIn profile URLs** from the current page and run the task.

---

## 📝 Logs

After execution, click **Download logs** in the popup to save a timestamped `.txt` of actions taken.

---

## 🛡️ Permissions

This extension uses `scripting`, `storage`, and access to `linkedin.com`, `twitter.com` tabs. It does **not** collect or send data externally beyond Anthropic or Gemini APIs.

---

## License

MIT © 2025
