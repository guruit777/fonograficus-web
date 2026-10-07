const fs = require('fs');

let js = fs.readFileSync('public/renderer.js', 'utf8');

// 1. Add progress bar handling & timeupdate inside setupEventListeners
const oldAudioEvents = `  // Audio element events
  audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseUI();
  });
  audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseUI();
  });
  audio.addEventListener('ended', () => playNext());
  audio.addEventListener('error', () => {
    showToast('Ошибка потока, пробую следующий...');
    setTimeout(() => playNext(), 1500);
  });`;

const newAudioEvents = `  // Audio element events
  audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseUI();
  });
  audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayPauseUI();
  });
  audio.addEventListener('ended', () => playNext());
  audio.addEventListener('error', () => {
    showToast('Ошибка потока, пробую следующий...');
    setTimeout(() => playNext(), 1500);
  });

  // Dynamic Progress bar & stream tracking
  const playerProgressBar = document.getElementById('playerProgressBar');
  const playerProgressTrack = document.getElementById('playerProgressTrack');

  audio.addEventListener('timeupdate', () => {
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      if (playerProgressBar) {
        playerProgressBar.classList.remove('is-live');
        const pct = (audio.currentTime / audio.duration) * 100;
        playerProgressBar.style.width = pct + '%';
      }
    } else if (isPlaying) {
      if (playerProgressBar && !playerProgressBar.classList.contains('is-live')) {
        playerProgressBar.classList.add('is-live');
      }
    }
  });

  if (playerProgressTrack) {
    playerProgressTrack.addEventListener('click', (e) => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        const rect = playerProgressTrack.getBoundingClientRect();
        const clickRatio = (e.clientX - rect.left) / rect.width;
        audio.currentTime = clickRatio * audio.duration;
      }
    });
  }`;

if (js.includes(oldAudioEvents)) {
  js = js.replace(oldAudioEvents, newAudioEvents);
}

// 2. Add cover breathing animation in updatePlayPauseUI
const oldPlayPauseUI = `function updatePlayPauseUI() {
  if (isPlaying) {
    playIconMain.style.display = 'none';
    pauseIconMain.style.display = 'block';
    miniPlayIcon.style.display = 'none';
    miniPauseIcon.style.display = 'block';
    soundWave.classList.add('playing');
  } else {
    playIconMain.style.display = 'block';
    pauseIconMain.style.display = 'none';
    miniPlayIcon.style.display = 'block';
    miniPauseIcon.style.display = 'none';
    soundWave.classList.remove('playing');
  }
}`;

const newPlayPauseUI = `function updatePlayPauseUI() {
  if (isPlaying) {
    playIconMain.style.display = 'none';
    pauseIconMain.style.display = 'block';
    miniPlayIcon.style.display = 'none';
    miniPauseIcon.style.display = 'block';
    soundWave.classList.add('playing');
  } else {
    playIconMain.style.display = 'block';
    pauseIconMain.style.display = 'none';
    miniPlayIcon.style.display = 'block';
    miniPauseIcon.style.display = 'none';
    soundWave.classList.remove('playing');
  }

  const currentCover = document.getElementById('currentCover');
  if (currentCover) {
    currentCover.classList.toggle('is-playing', isPlaying);
  }

  const playerProgressBar = document.getElementById('playerProgressBar');
  if (playerProgressBar && !isPlaying) {
    playerProgressBar.classList.remove('is-live');
  }
}`;

if (js.includes(oldPlayPauseUI)) {
  js = js.replace(oldPlayPauseUI, newPlayPauseUI);
}

// 3. Add MediaSession integration inside playTrack
const oldPlayTrackStream = `  // Stream audio
  audio.src = track.streamUrl;
  audio.play().catch(e => console.warn(e));`;

const newPlayTrackStream = `  // Stream audio
  audio.src = track.streamUrl;
  audio.play().catch(e => console.warn(e));

  // Sync with mobile lock-screen & control center (MediaSession API)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'FONOGRAFICUS',
        artist: track.author || 'Live Music Stream',
        album: (track.source || 'FONOGRAFICUS').toUpperCase(),
        artwork: [
          { src: '/icon.png', sizes: '512x512', type: 'image/png' }
        ]
      });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    } catch(err) {
      console.warn('MediaSession error', err);
    }
  }`;

if (js.includes(oldPlayTrackStream)) {
  js = js.replace(oldPlayTrackStream, newPlayTrackStream);
}

fs.writeFileSync('public/renderer.js', js);
console.log('renderer.js updated with dynamic player bar enhancements and MediaSession');
