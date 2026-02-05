let countdownInterval;

// Helper to refresh the list of active tabs in the UI
async function refreshActiveList() {
  const container = document.getElementById('active-list');
  const allData = await chrome.storage.local.get(null);
  const activeKeys = Object.keys(allData).filter(k => k.startsWith('settings_'));

  if (activeKeys.length === 0) {
    container.innerHTML = '<div style="color: #999; text-align: center;">No active refreshers</div>';
    return;
  }

  container.innerHTML = ''; 
  for (const key of activeKeys) {
    const tabId = parseInt(key.split('_')[1]);
    try {
      const tab = await chrome.tabs.get(tabId);
      const div = document.createElement('div');
      div.style = "display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f9f9f9; align-items: center;";
      div.innerHTML = `
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; color: #444;">
          ${tab.title || 'Tab ' + tabId}
        </span>
        <span style="color: #26cf96; font-weight: bold; font-size: 9px; text-transform: uppercase;">Running</span>
      `;
      container.appendChild(div);
    } catch (e) {
      chrome.storage.local.remove([`settings_${tabId}`, `timer_${tabId}`]);
    }
  }
}

function toggleUIMode() {
  const isRandom = document.getElementById('enableFuzz').checked;
  document.getElementById('fixedSection').classList.toggle('disabled-section', isRandom);
  document.getElementById('fuzzContainer').classList.toggle('hidden', !isRandom);
}

function updateCountdownUI(targetTime) {
  const box = document.getElementById('countdown-box');
  const display = document.getElementById('countdown');
  box.classList.remove('hidden');
  if (countdownInterval) clearInterval(countdownInterval);
  const tick = () => {
    const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
    display.innerText = remaining + "s";
  };
  tick();
  countdownInterval = setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const data = await chrome.storage.local.get([`settings_${tab.id}`, `timer_${tab.id}`]);
  
  if (data[`settings_${tab.id}`]) {
    const s = data[`settings_${tab.id}`];
    document.getElementById('enableFuzz').checked = s.useFuzz;
    document.getElementById('fuzzMin').value = s.min || 5;
    document.getElementById('fuzzMax').value = s.max || 30;
    toggleUIMode();
    if (data[`timer_${tab.id}`] > Date.now()) updateCountdownUI(data[`timer_${tab.id}`]);
  }
  refreshActiveList();
});

document.getElementById('enableFuzz').addEventListener('change', toggleUIMode);

document.getElementById('start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  await chrome.alarms.clear(`refresh_${tab.id}`); // Clear old alarms

  const useFuzz = document.getElementById('enableFuzz').checked;
  const selected = document.querySelector('input[name="interval"]:checked');
  const baseSecs = selected.value === "custom" ? parseFloat(document.getElementById('custom-secs').value) : parseFloat(selected.value);
  
  const settings = { 
    base: baseSecs, 
    useFuzz, 
    min: parseFloat(document.getElementById('fuzzMin').value), 
    max: parseFloat(document.getElementById('fuzzMax').value), 
    active: true 
  };
  
  const delay = useFuzz ? Math.floor(Math.random() * (settings.max - settings.min + 1) + settings.min) : baseSecs;
  const targetTime = Date.now() + (delay * 1000);

  await chrome.storage.local.set({ [`settings_${tab.id}`]: settings, [`timer_${tab.id}`]: targetTime });
  chrome.alarms.create(`refresh_${tab.id}`, { delayInMinutes: delay / 60 });
  
  updateCountdownUI(targetTime);
  refreshActiveList();
});

document.getElementById('stop').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  chrome.alarms.clear(`refresh_${tab.id}`);
  await chrome.storage.local.remove([`settings_${tab.id}`, `timer_${tab.id}`]);
  chrome.action.setBadgeText({ text: "", tabId: tab.id });
  
  document.getElementById('countdown-box').classList.add('hidden');
  if (countdownInterval) clearInterval(countdownInterval);
  refreshActiveList();
});

document.getElementById('stopAll').addEventListener('click', async () => {
  const alarms = await chrome.alarms.getAll();
  const keysToRemove = [];
  for (const alarm of alarms) {
    if (alarm.name.startsWith("refresh_")) {
      const tabId = parseInt(alarm.name.split("_")[1]);
      chrome.alarms.clear(alarm.name);
      chrome.action.setBadgeText({ text: "", tabId: tabId });
      keysToRemove.push(`settings_${tabId}`, `timer_${tabId}`);
    }
  }
  await chrome.storage.local.remove(keysToRemove);
  document.getElementById('countdown-box').classList.add('hidden');
  if (countdownInterval) clearInterval(countdownInterval);
  refreshActiveList();
});