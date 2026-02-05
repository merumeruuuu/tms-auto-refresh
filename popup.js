// Stop the refresher for the CURRENT tab only
document.getElementById('stop').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  // Clear storage for this tab
  await chrome.storage.local.remove([`settings_${tab.id}`, `timer_${tab.id}`]);
  
  // Reset UI elements
  chrome.action.setBadgeText({ text: "", tabId: tab.id });
  if (countdownInterval) clearInterval(countdownInterval);
  document.getElementById('countdown-box').classList.add('hidden');
  
  // Optional: Reload the popup to reset the UI state
  location.reload(); 
});

// Stop EVERY active refresher across all tabs
document.getElementById('stopAll').addEventListener('click', async () => {
  // Send message to background to handle global cleanup
  chrome.runtime.sendMessage({ type: "STOP_ALL" });
  
  // Reset local Popup UI
  if (countdownInterval) clearInterval(countdownInterval);
  document.getElementById('countdown-box').classList.add('hidden');
  
  // Close the popup
  window.close();
});