// content.js — MAIN world
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data && event.data.type === "FROM_PAGE") {
    // Relay to bridge.js using window.postMessage (bridge will have chrome.runtime)
    window.postMessage({
      type: "TO_EXTENSION",
      payload: event.data.payload
    }, "*");
  }
});
