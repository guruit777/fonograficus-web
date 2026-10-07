const fs = require('fs');

// 1. Patch public/index.html
let html = fs.readFileSync('public/index.html', 'utf8');

// Insert progress bar into now-playing-bar
if (!html.includes('id="playerProgressTrack"')) {
  html = html.replace(
    '<div class="now-playing-bar">',
    `<div class="now-playing-bar" id="nowPlayingBar">
      <!-- Top Dynamic Progress & Stream Bar -->
      <div class="player-progress-track" id="playerProgressTrack" title="Перемотка трека">
        <div class="player-progress-bar" id="playerProgressBar"></div>
      </div>`
  );
}

fs.writeFileSync('public/index.html', html);
console.log('index.html updated with player progress bar');
