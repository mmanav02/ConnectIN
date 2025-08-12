// content/bridge.js — stateless check on every message
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  // Always read the latest mode before forwarding
  chrome.storage.local.get({ popupMode: "manual" }, ({ popupMode }) => {
    if (popupMode === "manual") {
      console.log("Manual Mode Detected.");
      return; // block in manual
    }
    const data = event.data;
    if(data && data.type==="LOG"){
      chrome.runtime.sendMessage({ type: 'LOG', message: data.message });
    }
    if (data && data.type === "TO_EXTENSION") {
      chrome.runtime.sendMessage({ type: 'LOG', message: '"Added Urls to the Queue"' });
      chrome.runtime.sendMessage({
        type: "FROM_CONTENT",
        payload: data.payload,
      });
    }
  });
});
