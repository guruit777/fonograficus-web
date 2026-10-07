const fs = require('fs');

let js = fs.readFileSync('public/renderer.js', 'utf8');

const polyfill = `
window.api = {
  loadAppData: async () => JSON.parse(localStorage.getItem('fng_data') || 'null'),
  saveAppData: async (data) => localStorage.setItem('fng_data', JSON.stringify(data)),
  searchMusic: async (params) => {
    // We proxy it to our next.js /api/search
    const qs = new URLSearchParams();
    if (params.query) qs.set('query', params.query);
    if (params.sources && Array.isArray(params.sources)) qs.set('sources', params.sources.join(','));
    else if (params.source) qs.set('sources', params.source);
    
    const res = await fetch('/api/search?' + qs.toString());
    return res.json();
  },
  
  getAiRecommendations: async (params) => {
    const { apiKey, history, favorites } = params;
    if (!apiKey) return { success: false, error: 'Введите Gemini API ключ в настройках.' };
    
    const prompt = 'Я слушаю такую музыку. История: ' + history.join(', ') + '. Лайки: ' + favorites.map(f => f.title).join(', ') + '. Дай 15 коротких жанров/артистов, которые могут мне понравиться. Формат: строго валидный JSON-массив строк, без маркдауна.';
    
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const jsonStr = text.replace(/\\x60{3}json/g, '').replace(/\\x60{3}/g, '');
      return { success: true, suggestions: JSON.parse(jsonStr) };
    } catch(e) {
      return { success: false, error: e.message };
    }
  },

  generatePlaylistFromText: async (params) => {
    const { apiKey, text, length } = params;
    if (!apiKey) return { success: false, error: 'Введите Gemini API ключ в настройках.' };
    
    const prompt = 'Пользователь описал настроение: "' + text + '". Сгенерируй ' + length + ' поисковых запросов для поиска музыки. Верни JSON-объект: { "title": "Название плейлиста", "desc": "описание вайба", "queries": ["query1", "query2"] }. Без маркдауна.';
    
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const txt = data.candidates[0].content.parts[0].text;
      const jsonStr = txt.replace(/\\x60{3}json/g, '').replace(/\\x60{3}/g, '');
      const parsed = JSON.parse(jsonStr);
      return { success: true, data: parsed };
    } catch(e) {
      return { success: false, error: e.message };
    }
  },

  transcribeAudio: async () => ({ success: false, error: 'Голосовой набор доступен только в приложении Windows.' }),
  getRadioMetadata: async () => ({ title: 'Online Radio', artist: '' }),
  downloadTrack: async () => ({ success: false, error: 'Скачивание недоступно в веб-версии' }),
  exportPlaylistToFolder: async () => ({ success: false, error: 'Экспорт USB недоступен в веб-версии' }),
  selectFolder: async () => null,
  selectWallpaper: async () => {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        if (!e.target.files[0]) return resolve(null);
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(e.target.files[0]);
      };
      input.click();
    });
  },
  
  updateHotkeys: async () => ({ success: false, error: 'Глобальные клавиши работают только в Windows' }),
  minimizeWindow: () => {},
  closeWindow: () => {},
  toggleMiniMode: () => {
    const norm = document.getElementById('normalContainer');
    const mini = document.getElementById('miniContainer');
    if(norm.style.display !== 'none') {
      norm.style.display = 'none';
      mini.style.display = 'flex';
    } else {
      norm.style.display = 'flex';
      mini.style.display = 'none';
    }
  },
  openSpotify: () => window.open('https://open.spotify.com', '_blank'),
  startPowerTimer: async () => ({ success: false, error: 'Таймер выключен в веб-версии' }),
  cancelPowerTimer: async () => {},
  getPowerTimerStatus: async () => ({ active: false }),
  getRunningProcesses: async () => [],
  
  onTogglePlayPause: () => {},
  onNextTrack: () => {},
  onPrevTrack: () => {},
  onModeChanged: () => {},
  onVoiceMemoHotkey: () => {},
  onPowerTimerTick: () => {},
  onPowerTimerWarning: () => {}
};
`;

js = polyfill + js;
fs.writeFileSync('public/renderer.js', js);
console.log('renderer.js properly polyfilled!');
