chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("refresh_")) {
    const tabId = parseInt(alarm.name.split("_")[1]);
    
    // Always get fresh settings to ensure we use the current mode
    const data = await chrome.storage.local.get(`settings_${tabId}`);
    const settings = data[`settings_${tabId}`];

    if (!settings || !settings.active) return;

    // 1. Calculate the NEXT random delay IMMEDIATELY
    let nextDelay = settings.useFuzz 
      ? Math.floor(Math.random() * (settings.max - settings.min + 1) + settings.min) 
      : settings.base;

    const nextRunTime = Date.now() + (nextDelay * 1000);
    
    // 2. Schedule the next alarm right now (don't wait for reload to finish)
    await chrome.storage.local.set({ [`timer_${tabId}`]: nextRunTime });
    chrome.alarms.create(`refresh_${tabId}`, { delayInMinutes: nextDelay / 60 });

    // 3. Update Badge and Trigger Reload
    chrome.action.setBadgeText({ text: nextDelay + "s", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#26cf96", tabId: tabId });

    chrome.tabs.reload(tabId, { bypassCache: true });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.alarms.clear(`refresh_${tabId}`);
  chrome.storage.local.remove([`settings_${tabId}`, `timer_${tabId}`]);
});