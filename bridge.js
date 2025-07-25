// bridge.js — isolated world (can access chrome APIs)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === "TO_EXTENSION") {
    chrome.runtime.sendMessage({
      type: "FROM_CONTENT",
      payload: event.data.payload
    });
  }
});
