// --- DOM ELEMENTS ---
const modeRadios = document.querySelectorAll('input[name="mode"]');
const scheduleList = document.getElementById('schedule-list');
const daySelect = document.getElementById('day-select');
const addScheduleBtn = document.getElementById('add-schedule-btn');

// Start time inputs for scheduling
const startHourInput = document.getElementById('start-hour');
const startMinuteInput = document.getElementById('start-minute');
const startAmPmSelect = document.getElementById('start-ampm');
// End time inputs for scheduling
const endHourInput = document.getElementById('end-hour');
const endMinuteInput = document.getElementById('end-minute');
const endAmPmSelect = document.getElementById('end-ampm');

// --- STATS ELEMENTS ---
const totalFocusTimeEl = document.getElementById('total-focus-time');
const sessionsCompletedEl = document.getElementById('sessions-completed');
const distractionsBlockedEl = document.getElementById('distractions-blocked');

// --- HELPER FUNCTIONS ---
/** Converts 12-hour format from the inputs into a 24-hour "HH:mm" string for storage. */
function to24HourFormat(hour, minute, ampm) {
  hour = parseInt(hour, 10);
  minute = parseInt(minute, 10);
  if (ampm === 'PM' && hour !== 12) hour += 12; // Add 12 for PM hours (except 12 PM)
  if (ampm === 'AM' && hour === 12) hour = 0;   // 12 AM is 00:00
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/** Converts a 24-hour "HH:mm" string from storage into a readable 12-hour format for display. */
function to12HourFormat(time24) {
  const [hour24, minute] = time24.split(':').map(n => parseInt(n, 10));
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12; // 00:xx and 12:xx should display as 12
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// --- LOAD AND SAVE SETTINGS ---
// Saves the currently selected blocking mode to storage.
function saveSettings() {
  const blockingMode = document.querySelector('input[name="mode"]:checked').value;
  chrome.storage.sync.set({ blockingMode });
}

// Loads all settings from storage and updates the UI accordingly.
function loadSettings() {
  chrome.storage.sync.get(['blockingMode', 'schedules', 'stats'], (res) => {
    // Set the correct radio button for the blocking mode.
    document.querySelector(`input[value="${res.blockingMode || 'blacklist'}"]`).checked = true;
    
    // Render the list of saved schedules.
    renderSchedules(res.schedules || []);
    
    // Display the latest statistics.
    const stats = res.stats || { totalFocusMinutes: 0, sessionsCompleted: 0, distractionsBlocked: 0 };
    totalFocusTimeEl.textContent = `${stats.totalFocusMinutes} min`;
    sessionsCompletedEl.textContent = stats.sessionsCompleted;
    distractionsBlockedEl.textContent = stats.distractionsBlocked;
  });
}

// Add event listeners to the mode radio buttons to save on change.
modeRadios.forEach(radio => radio.addEventListener('change', saveSettings));

// --- SCHEDULE LOGIC ---
const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Clears and redraws the list of schedules based on data from storage.
function renderSchedules(schedules) {
  scheduleList.innerHTML = '';
  schedules.forEach((schedule, index) => {
    const li = document.createElement('li');
    const days = schedule.days.map(d => dayMap[d]).join(', ');
    const start12 = to12HourFormat(schedule.start);
    const end12 = to12HourFormat(schedule.end);

    li.innerHTML = `
      <span>${days} from ${start12} to ${end12}</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    scheduleList.appendChild(li);
  });
  
  // Add click listeners to all the newly created "Remove" buttons.
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => removeSchedule(parseInt(e.target.dataset.index, 10)));
  });
}

// Handles the "Add Schedule" button click.
addScheduleBtn.addEventListener('click', () => {
  const days = Array.from(daySelect.selectedOptions).map(opt => parseInt(opt.value, 10));
  const start = to24HourFormat(startHourInput.value, startMinuteInput.value, startAmPmSelect.value);
  const end = to24HourFormat(endHourInput.value, endMinuteInput.value, endAmPmSelect.value);

  // Basic validation before saving.
  if (days.length > 0 && start && end && start < end) {
    chrome.storage.sync.get('schedules', (res) => {
      const schedules = res.schedules || [];
      schedules.push({ days, start, end });
      chrome.storage.sync.set({ schedules }, () => loadSettings()); // Save and reload the list.
    });
  } else {
    alert('Please select at least one day and a valid time range (start time must be before end time).');
  }
});

// Removes a schedule from the array in storage by its index.
function removeSchedule(indexToRemove) {
  chrome.storage.sync.get('schedules', (res) => {
    const schedules = res.schedules.filter((_, index) => index !== indexToRemove);
    chrome.storage.sync.set({ schedules }, () => loadSettings()); // Save and reload the list.
  });
}

// --- INITIALIZATION ---
// Load all settings as soon as the DOM is ready.
document.addEventListener('DOMContentLoaded', loadSettings);

