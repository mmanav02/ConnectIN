# ConnectAI – LinkedIn & Twitter Outreach Extension (MV3)

Automate personalized messaging and post engagement on **LinkedIn** *and* **Twitter/X** with AI‑generated text (Anthropic Claude, Google Gemini, etc.).

---

## Features

| Platform | Task    | Action |
|----------|---------|--------|
| LinkedIn | Message | DM each profile with persona‑styled text. |
| LinkedIn | Comment | Comment on each post. |
| Twitter  | DM      | Direct‑message each profile. |
| Twitter  | Reply   | Reply to each tweet. |

* Platform toggle & personas  
* Dry‑run mode (draft only)  
* Human‑like random delays  
* Session log download

---

## Folder layout

```
connectai/
├─ manifest.json
├─ popup.{html,js,css}
├─ personas.json
├─ background/
│  ├─ index.js          # dispatcher / queue
│  ├─ logger.js
│  ├─ utils.js
│  ├─ linkedin/{message,comment}.js
│  └─ twitter/{message,comment}.js
└─ ...
```

---

## Install

1. Clone or unzip.  
2. `chrome://extensions` ➜ **Developer mode** ➜ **Load unpacked** ➜ choose `connectai/`.  
3. Accept host permissions.

---

## Configure

* **API key** – enter once in popup (masked, stored locally)  
* **Personas** – edit `personas.json` (tone, goal, background)  
* **Delay range** – tweak in `background/utils.js`

---

## Use

1. Prepare CSV/JSON list of URLs matching the task.  
2. In popup: choose platform, task, persona, dry‑run (optional), upload file.  
3. Click **Run automation**.

---

MIT License
