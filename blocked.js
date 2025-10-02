const quotes = [
  "The successful warrior is the average man, with laser-like focus.",
  "Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.",
  "The key to success is to focus our conscious mind on things we desire not things we fear.",
  "You don't get paid for the hour. You get paid for the value you bring to the hour.",
  "Discipline is the bridge between goals and accomplishment."
];

// Display a random quote on load
document.getElementById('quote').textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;

// Check for an active timer and display the countdown
const timerDisplay = document.getElementById('timer');
const timeLeftDisplay = document.getElementById('time-left');

function updateTimer() {
    chrome.storage.local.get(['sessionEndTime'], (res) => {
        if (res.sessionEndTime && res.sessionEndTime > Date.now()) {
            timerDisplay.style.display = 'block';
            const remaining = res.sessionEndTime - Date.now();
            const minutes = Math.floor((remaining / 1000 / 60) % 60).toString().padStart(2, '0');
            const seconds = Math.floor((remaining / 1000) % 60).toString().padStart(2, '0');
            timeLeftDisplay.textContent = `${minutes}:${seconds}`;
        } else {
             timerDisplay.style.display = 'none';
        }
    });
}

// Update the timer every second
updateTimer();
setInterval(updateTimer, 1000);