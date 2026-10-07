const fs = require('fs');

let js = fs.readFileSync('public/renderer.js', 'utf8');

// Replace loadAppData
js = js.replace(/await window\.api\.loadAppData\(\)/g, "JSON.parse(localStorage.getItem('fng_data') || 'null')");

// Save App Data implementation
// Let's find saveAppData function.
// Actually, I can just inject window.api polyfill at the very top of renderer.js
const polyfill = `
window.api = {
  loadAppData: async () => JSON.parse(localStorage.getItem('fng_data') || 'null'),
  saveAppData: async (data) => localStorage.setItem('fng_data', JSON.stringify(data)),
  searchMusic: async (params) => {
    const res = await fetch('/api/search?' + new URLSearchParams({ query: params.query, sources: params.sources.join(',') }));
    return res.json();
  },
  generateMoodPlaylist: async (params) => {
    // Stub or call API
    alert('AI Generator is building a playlist...');
    return [];
  },
  exportPlaylistToFolder: async () => alert('Экспорт на мобильном пока не поддерживается'),
  selectWallpaper: async () => {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },
  updateHotkeys: async () => ({success: true}),
  minimizeWindow: () => {},
  closeWindow: () => {},
  toggleMiniMode: () => {
    document.getElementById('normalContainer').style.display = 'none';
    document.getElementById('miniContainer').style.display = 'flex';
  },
  openSpotify: () => window.open('https://open.spotify.com', '_blank'),
  onTogglePlayPause: () => {},
  onNextTrack: () => {},
  onPrevTrack: () => {},
  onModeChanged: () => {},
  onVoiceMemoHotkey: () => {}
};
`;

js = polyfill + js;

// Replace any ipcRenderer calls if they exist, though it looks like it uses window.api
fs.writeFileSync('public/renderer.js', js);
console.log('renderer.js polyfilled!');
