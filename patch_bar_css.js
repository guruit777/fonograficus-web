const fs = require('fs');

let css = fs.readFileSync('public/styles.css', 'utf8');

const mobileAndBarCSS = `
/* ======================================================== */
/* ENHANCED DYNAMIC NOW-PLAYING BAR & MOBILE VIEWPORT FIXES */
/* ======================================================== */

html {
  height: 100%;
  height: 100dvh;
}

body {
  width: 100vw;
  height: 100%;
  height: 100dvh;
  margin: 0;
  padding: 6px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Ensure container takes exact viewport and doesn't push player off-screen */
.normal-view {
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}

/* Inner tab panes must flex and scroll properly */
.tab-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tracklist-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 16px 16px;
}

.settings-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* DYNAMIC NOW-PLAYING BAR */
.now-playing-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  flex-shrink: 0;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-top: 1px solid rgba(220, 210, 195, 0.5);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.08), 0 -2px 6px rgba(0, 0, 0, 0.02);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  transition: all 0.25s ease;
}

/* Top Progress / Stream Bar */
.player-progress-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.06);
  cursor: pointer;
  z-index: 10;
  transition: height 0.15s ease;
}

.player-progress-track:hover {
  height: 5px;
}

.player-progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  box-shadow: 0 0 8px var(--primary-glow);
  transition: width 0.15s linear;
}

.player-progress-bar.is-live {
  width: 100% !important;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981, #0ea5e9, #8b5cf6, #ef4444);
  background-size: 200% 100%;
  animation: liveWaveShimmer 3s linear infinite;
}

@keyframes liveWaveShimmer {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}

/* Active Cover Art Breathing Animation */
.cover-wrapper.is-playing {
  box-shadow: 0 0 12px var(--primary-glow);
  border: 1px solid var(--primary);
  animation: pulseCoverPlay 2.5s ease-in-out infinite;
}

@keyframes pulseCoverPlay {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Red Heart / Favorite active button state */
.meta-action-btn.is-fav {
  color: #ef4444 !important;
}

.meta-action-btn.is-fav svg {
  fill: #ef4444 !important;
  stroke: #ef4444 !important;
  transform: scale(1.15);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Active Shuffle Pill Button */
.ctrl-btn.active, #btnShuffle.active {
  color: var(--primary) !important;
  background: var(--pill-bg) !important;
  border-radius: 8px;
  box-shadow: 0 0 10px var(--primary-glow);
}

/* Main Play Button */
.main-play-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px var(--primary-glow);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.main-play-btn:active {
  transform: scale(0.92);
}

/* ======================================================== */
/* RESPONSIVE MOBILE ADAPTATION (< 768px)                   */
/* Matches the compact floating player bar screenshot       */
/* ======================================================== */
@media (max-width: 768px) {
  body {
    padding: 0;
  }

  .normal-view {
    border-radius: 0;
    border: none;
  }

  .now-playing-bar {
    padding: 8px 12px;
    padding-bottom: max(10px, env(safe-area-inset-bottom, 12px));
    gap: 6px;
  }

  /* Hide desktop-only controls on mobile (Volume slider & F9 badge) */
  .extra-controls {
    display: none !important;
  }

  .track-info {
    gap: 7px;
    flex: 1;
    min-width: 0;
  }

  .cover-wrapper {
    width: 34px;
    height: 34px;
    border-radius: 8px;
  }

  .track-title {
    font-size: 11.5px;
    font-weight: 700;
    max-width: 140px;
  }

  .track-artist {
    font-size: 10px;
    max-width: 140px;
  }

  .meta-action-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
  }

  .playback-controls {
    gap: 4px;
    flex-shrink: 0;
  }

  .ctrl-btn {
    padding: 5px;
  }

  .main-play-btn {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .track-title {
    max-width: 105px;
  }

  .track-artist {
    max-width: 105px;
  }

  #btnCurrentDownload {
    display: none !important;
  }
}

@media (max-width: 375px) {
  .track-title {
    max-width: 80px;
  }

  .track-artist {
    max-width: 80px;
  }

  #btnCopyLiveTrack {
    display: none !important;
  }
}
`;

css += '\n' + mobileAndBarCSS;
fs.writeFileSync('public/styles.css', css);
console.log('styles.css updated with responsive and sticky player bar styles');
