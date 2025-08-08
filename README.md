# ConnectIN – AI-Powered Outreach Automation (LinkedIn, Twitter, Instagram)

Automate personalized **messaging** and **post engagement** across LinkedIn, Twitter/X, and Instagram — with AI-generated text from providers like Anthropic Claude or Google Gemini.

The extension handles:
- Opening target profile/post URLs
- Scraping contextual text
- Generating messages/comments using AI personas
- Sending them with human-like random delays

---

## ✨ Features

| Platform   | Task         | Action                                                      |
|------------|--------------|-------------------------------------------------------------|
| **LinkedIn** | Message      | Open each profile, scrape details, generate persona-styled DM, and send |
|            | Comment      | Open each post, scrape post text, generate persona-styled comment, and post |
| **Twitter**  | Message      | DM each profile with persona-styled text                   |
|            | Comment      | Reply to each tweet with persona-styled text                |
| **Instagram**| Message      | DM each profile with persona-styled text                   |
|            | Comment      | Comment on posts with persona-styled text                   |
|            | Extract Posts| Scrape all post URLs from the active tab                    |
|            | Extract Profiles from Comments | Crawl saved posts, collect unique profile URLs from comment sections |

---

## 📢 **Major Note on LinkedIn Integration**

> **Direct Streaml Website Integration**  
> The LinkedIn messaging functionality is designed to also accept **profile URLs** and a **personalized message** directly from the [Streaml](https://streaml.ai) website.  
>  
> When triggered, the extension:
> 1. Receives a payload from Streaml containing:
>    - `linkedin_urls`: An array of profile URLs to message
>    - `message`: The personalized message text (can be AI-generated on Streaml's side)
>    - `persona`: The selected persona style
> 2. Queues these for processing in `background/index.js` via the `FROM_CONTENT` listener.
> 3. Executes the `linkedinUrlsMessageAutomation()` function to open each profile and send the given message with human-like delays.

This integration allows **Streaml** to act as the campaign control center, while **ConnectIN** performs the browser-side automation.

---

## 📂 Folder Structure

ConnectIN/
├─ manifest.json # Chrome MV3 manifest
├─ popup.html / popup.js / popup.css # Popup UI
├─ personas.json # Persona definitions for AI prompt styling
├─ background/
│ ├─ index.js # Main dispatcher, queue handling, URL extraction
│ ├─ logger.js # Logging helper
│ ├─ utils.js # Shared helpers (delay, randomDelay, waitForTabLoad, AI calls)
│ ├─ linkedin/
│ │ ├─ message.js # LinkedIn DM logic
│ │ └─ comment.js # LinkedIn comment logic
│ ├─ twitter/
│ │ ├─ message.js # Twitter DM logic
│ │ └─ comment.js # Twitter comment logic
│ └─ instagram/
│ ├─ message.js # Instagram DM logic
│ └─ comment.js # Instagram comment logic


---

## ⚙️ How It Works

1. **Queue system**  
   - Jobs (message/comment tasks) are enqueued and processed in FIFO order.
   - Prevents parallel execution issues by using a single `busy` flag.

2. **Content scripts & background service worker**  
   - Content scripts scrape necessary context from the target profile/post.
   - Background scripts open and control tabs to perform the automation.

3. **Persona-based AI text generation**  
   - `personas.json` defines different tones & styles.
   - Context + persona are passed to the AI API to generate human-like text.

4. **Random delays & throttling**  
   - `delay()` and `randomDelay()` mimic human behavior to reduce detection risk.

5. **Streaml-triggered LinkedIn Campaigns**  
   - Streaml can send ready-to-send campaign data directly into ConnectIN for automated delivery.

---

## 🚀 Installation

1. Clone or download this repository.
2. Open **Chrome** → `chrome://extensions`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** → Select the `ConnectIN/` folder.
5. The extension icon should now appear in your browser.

---

## 🖥 Usage

### **Manual Use (Popup UI)**
1. **Set your API Key & Persona**
   - Open the popup.
   - Enter your AI API key (e.g., Anthropic Claude, Google Gemini).
   - Select a persona (e.g., Sales Rep, Startup Founder).

2. **Choose a Task & Platform**
   - Message or Comment.
   - LinkedIn, Twitter, or Instagram.

3. **Provide Target URLs**
   - Paste profile/post URLs manually, or use the in-page extractor buttons.

4. **Run Automation**
   - Click **Start** to begin processing the queue.
   - Logs will be shown in the console and can be downloaded via the popup.

---

### **Automated Streaml Integration**
When running a campaign from **Streaml**:
- Streaml sends the payload with `linkedin_urls`, `message`, and `persona` to ConnectIN.
- The extension automatically processes the list without needing manual URL input in the popup.

---

## 🛡 Privacy & Security

- API keys are stored locally and never shared with third parties beyond the AI provider you choose.
- All operations run locally in your browser using the Chrome Extension APIs.

---

## ⚠ Disclaimer

This tool automates interactions on social media platforms.  
**Use responsibly and in compliance with the Terms of Service** of LinkedIn, Twitter, and Instagram.  
Excessive automation may result in account restrictions.

---

## 📜 License

MIT License