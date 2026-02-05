// Function to handle global cleanup
async function clearAllRefreshers() {
  const allData = await chrome.storage.local.get();
  const keysToRemove = [];
  
  for (let key in allData) {
    if (key.startsWith('settings_') || key.startsWith('timer_')) {
      const tabId = parseInt(key.split('_')[1]);
      // Remove badge from tab
      chrome.action.setBadgeText({ text: "", tabId: tabId });
      keysToRemove.push(key);
    }
  }
  
  await chrome.storage.local.remove(keysToRemove);

  // Close the offscreen document if no other timers are running
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (contexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// Add a listener for manual stop messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STOP_ALL") {
    clearAllRefreshers();
  }
});