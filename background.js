chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("refresh_")) {
    const tabId = parseInt(alarm.name.split("_")[1]);
    const data = await chrome.storage.local.get(`settings_${tabId}`);
    const settings = data[`settings_${tabId}`];

    if (!settings || !settings.active) return;

    chrome.tabs.reload(tabId, { bypassCache: true }, async () => {
      let nextDelay = settings.useFuzz 
        ? Math.floor(Math.random() * (settings.max - settings.min + 1) + settings.min) 
        : settings.base;

      const nextRunTime = Date.now() + (nextDelay * 1000);
      await chrome.storage.local.set({ [`timer_${tabId}`]: nextRunTime });
      chrome.alarms.create(`refresh_${tabId}`, { delayInMinutes: nextDelay / 60 });
      chrome.action.setBadgeText({ text: nextDelay + "s", tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#26cf96", tabId: tabId });
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.alarms.clear(`refresh_${tabId}`);
  chrome.storage.local.remove([`settings_${tabId}`, `timer_${tabId}`]);
});