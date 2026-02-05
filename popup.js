let countdownInterval;

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
    if (data[`timer_${tab.id}`]) updateCountdownUI(data[`timer_${tab.id}`]);
  }
});

document.getElementById('enableFuzz').addEventListener('change', toggleUIMode);

document.getElementById('start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const useFuzz = document.getElementById('enableFuzz').checked;
  const selected = document.querySelector('input[name="interval"]:checked');
  const baseSecs = selected.value === "custom" ? parseFloat(document.getElementById('custom-secs').value) : parseFloat(selected.value);
  const min = parseFloat(document.getElementById('fuzzMin').value);
  const max = parseFloat(document.getElementById('fuzzMax').value);

  const settings = { base: baseSecs, useFuzz, min, max, active: true };
  const delay = useFuzz ? Math.floor(Math.random() * (max - min + 1) + min) : baseSecs;
  const targetTime = Date.now() + (delay * 1000);

  await chrome.storage.local.set({ [`settings_${tab.id}`]: settings, [`timer_${tab.id}`]: targetTime });
  chrome.alarms.create(`refresh_${tab.id}`, { delayInMinutes: delay / 60 });
  updateCountdownUI(targetTime);
});

document.getElementById('stop').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  chrome.alarms.clear(`refresh_${tab.id}`);
  chrome.storage.local.remove([`settings_${tab.id}`, `timer_${tab.id}`]);
  chrome.action.setBadgeText({ text: "", tabId: tab.id });
  location.reload(); 
});

document.getElementById('stopAll').addEventListener('click', async () => {
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith("refresh_")) {
      const tabId = parseInt(alarm.name.split("_")[1]);
      chrome.alarms.clear(alarm.name);
      chrome.storage.local.remove([`settings_${tabId}`, `timer_${tabId}`]);
      chrome.action.setBadgeText({ text: "", tabId: tabId });
    }
  }
  location.reload();
});