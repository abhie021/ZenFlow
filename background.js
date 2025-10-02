// --- STATE MANAGEMENT ---
// Default settings that are applied on the first installation.
const DEFAULT_SETTINGS = {
  sites: ['www.youtube.com', 'www.facebook.com', 'www.instagram.com', 'x.com', 'www.reddit.com'],
  blockingMode: 'blacklist', // Can be 'blacklist' or 'whitelist'
  schedules: [],
  stats: { totalFocusMinutes: 0, sessionsCompleted: 0, distractionsBlocked: 0 }
};

// --- INITIALIZATION ---
// This listener runs once when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  // Check if any settings already exist; if not, set the defaults.
  chrome.storage.sync.get(null, (settings) => {
    if (Object.keys(settings).length === 0) {
      chrome.storage.sync.set(DEFAULT_SETTINGS);
    }
  });
  // Create a recurring alarm that will fire every minute to check schedules.
  chrome.alarms.create('scheduleChecker', { periodInMinutes: 1 });
});

// --- ALARM HANDLING ---
// This listener waits for any alarms created by the extension to fire.
chrome.alarms.onAlarm.addListener(alarm => {
  // If it's the end of a manually started focus session:
  if (alarm.name === 'focusSessionEnd') {
    // Update the statistics for total time and completed sessions.
    chrome.storage.local.get(['sessionMinutes'], (res) => {
      updateStats('totalFocusMinutes', res.sessionMinutes || 0);
      updateStats('sessionsCompleted', 1);
    });
    // Clean up the session data from temporary local storage.
    chrome.storage.local.remove(['sessionEndTime', 'sessionMinutes']);
  } 
  // If it's the periodic schedule checker:
  else if (alarm.name === 'scheduleChecker') {
    checkSchedules();
  }
});

// --- SCHEDULING LOGIC ---
// Checks if the current time falls within any user-defined schedules.
async function checkSchedules() {
  const { schedules } = await chrome.storage.sync.get('schedules');
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun, 1=Mon, etc.
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  let isScheduleActive = false;
  if (schedules && schedules.length > 0) {
    for (const schedule of schedules) {
      // Check if today is a scheduled day and if the time is within the range.
      if (schedule.days.includes(currentDay) && currentTime >= schedule.start && currentTime < schedule.end) {
        isScheduleActive = true;
        break; // Exit the loop as soon as one active schedule is found.
      }
    }
  }
  // Store the result in local storage for quick access by the blocking logic.
  chrome.storage.local.set({ isScheduleActive });
}

// --- CORE BLOCKING LOGIC ---
// This listener fires every time a tab is updated.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // We only care about when the tab is loading and has a URL.
  if (changeInfo.status !== 'loading' || !tab.url) return;

  const { sessionEndTime, isScheduleActive } = await chrome.storage.local.get(['sessionEndTime', 'isScheduleActive']);

  // Check if we should be blocking: either a manual session is active OR a schedule is active.
  if ((sessionEndTime && sessionEndTime > Date.now()) || isScheduleActive) {
    const { sites, blockingMode } = await chrome.storage.sync.get(['sites', 'blockingMode']);
    const url = new URL(tab.url);
    const hostname = url.hostname;

    const isListed = sites.some(site => hostname.includes(site));

    // Determine if the site should be blocked based on the current mode.
    const shouldBlock = (blockingMode === 'blacklist' && isListed) || (blockingMode === 'whitelist' && !isListed);

    if (shouldBlock) {
      // Redirect the tab to our custom block page.
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
      updateStats('distractionsBlocked', 1);
    }
  }
});

// --- UTILITY FUNCTIONS ---
// Safely updates a specific key in the stats object in storage.
async function updateStats(key, value) {
  const data = await chrome.storage.sync.get('stats');
  // This ensures that if 'stats' doesn't exist yet, we start with a default object.
  const stats = data.stats || { ...DEFAULT_SETTINGS.stats };
  
  // Increment the specific stat.
  stats[key] = (stats[key] || 0) + value;

  // Save the updated stats object back to storage.
  chrome.storage.sync.set({ stats });
}

