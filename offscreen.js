chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "START_TIMER") {
    // Standard JS setTimeout works here even for 1s, 5s, etc.
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "RELOAD_ACTION", tabId: message.tabId });
    }, message.delayMs);
  }
});