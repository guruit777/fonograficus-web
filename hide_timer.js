const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace('id="btnQuickSleepTimer" class="icon-btn sleep-timer-btn"', 'id="btnQuickSleepTimer" class="icon-btn sleep-timer-btn" style="display: none;"');
html = html.replace('id="powerTimerSettingsCard"', 'id="powerTimerSettingsCard" style="display: none;"');
fs.writeFileSync('public/index.html', html);
console.log('Timer hidden');
