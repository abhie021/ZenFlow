// --- DOM ELEMENTS ---
const timerDisplay = document.getElementById('timer-display');
const minutesInput = document.getElementById('minutes-input');
const startStopBtn = document.getElementById('start-stop-btn');
const siteInput = document.getElementById('site-input');
const addButton = document.getElementById('add-button');
const sitesList = document.getElementById('sites-list');
const optionsLink = document.getElementById('options-link');

// --- TIMER LOGIC ---
let countdown;

function updateTimerDisplay() {
  chrome.storage.local.get(['sessionEndTime'], (res) => {
    if (res.sessionEndTime && res.sessionEndTime > Date.now()) {
      const remaining = res.sessionEndTime - Date.now();
      const minutes = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
      const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${minutes}:${seconds}`;
      startStopBtn.textContent = 'Stop Session';
      startStopBtn.style.backgroundColor = 'var(--danger)';
      minutesInput.disabled = true;
    } else {
      resetTimerUI();
    }
  });
}

function resetTimerUI() {
  clearInterval(countdown);
  timerDisplay.textContent = `${minutesInput.value.padStart(2, '0')}:00`;
  startStopBtn.textContent = 'Start Focus Session';
  startStopBtn.style.backgroundColor = 'var(--primary)';
  minutesInput.disabled = false;
}

startStopBtn.addEventListener('click', () => {
  chrome.storage.local.get(['sessionEndTime'], (res) => {
    if (res.sessionEndTime && res.sessionEndTime > Date.now()) { // Stop the session
      chrome.alarms.clear('focusSessionEnd');
      chrome.storage.local.remove(['sessionEndTime', 'sessionMinutes']);
      resetTimerUI();
    } else { // Start a new session
      const minutes = parseInt(minutesInput.value, 10);
      if (minutes > 0) {
        const endTime = Date.now() + minutes * 60 * 1000;
        chrome.storage.local.set({ sessionEndTime: endTime, sessionMinutes: minutes });
        chrome.alarms.create('focusSessionEnd', { delayInMinutes: minutes });
        countdown = setInterval(updateTimerDisplay, 1000);
        updateTimerDisplay();
      }
    }
  });
});

minutesInput.addEventListener('change', () => {
    chrome.storage.local.get(['sessionEndTime'], (res) => {
        if (!res.sessionEndTime || res.sessionEndTime <= Date.now()) {
            timerDisplay.textContent = `${minutesInput.value.padStart(2, '0')}:00`;
        }
    });
});

// --- SITE LIST LOGIC ---
function renderSites() {
  chrome.storage.sync.get(['sites'], (res) => {
    sitesList.innerHTML = '';
    const sites = res.sites || [];
    sites.forEach(site => {
      const li = document.createElement('li');
      const siteText = document.createElement('span');
      siteText.textContent = site;
      li.appendChild(siteText);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      // *** THIS IS THE FIX FOR THE BROKEN ICON ***
      removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg>`;
      removeBtn.onclick = () => removeSite(site);
      li.appendChild(removeBtn);
      
      sitesList.appendChild(li);
    });
  });
}

function addSite() {
  const newSite = siteInput.value.trim();
  if (newSite) {
    chrome.storage.sync.get(['sites'], (res) => {
      const sites = res.sites || [];
      if (!sites.includes(newSite)) {
        sites.push(newSite);
        chrome.storage.sync.set({ sites }, () => {
          siteInput.value = '';
          renderSites();
        });
      }
    });
  }
}

function removeSite(siteToRemove) {
  chrome.storage.sync.get(['sites'], (res) => {
    const sites = res.sites.filter(site => site !== siteToRemove);
    chrome.storage.sync.set({ sites }, renderSites);
  });
}

addButton.addEventListener('click', addSite);
siteInput.addEventListener('keypress', (e) => e.key === 'Enter' && addSite());

// --- OPTIONS PAGE LINK ---
optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  renderSites();
  updateTimerDisplay();
  countdown = setInterval(updateTimerDisplay, 1000);
});