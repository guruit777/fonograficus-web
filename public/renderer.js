
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
      const jsonStr = text.replace(/\x60{3}json/g, '').replace(/\x60{3}/g, '');
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
      const jsonStr = txt.replace(/\x60{3}json/g, '').replace(/\x60{3}/g, '');
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
// ==========================================
// FONOGRAFICUS — RENDERER APPLICATION CONTROLLER
// ==========================================

// Global Application State
let appData = {
  theme: 'theme-ocean-sand',
  customWallpaper: '',
  blurWallpaper: 15,
  wallpaperOpacity: 25,
  hotkeys: {
    playPause: 'F9',
    next: 'Ctrl+Right',
    prev: 'Ctrl+Left'
  },
  activeSource: 'promodj',
  geminiApiKey: '',
  favorites: [],
  history: []
};

let currentPlaylist = [];
let currentTrackIndex = -1;
let currentPlayingTrack = null;
let isPlaying = false;
let currentTab = 'search';

// DOM Elements
const audio = document.getElementById('audioPlayer');
const normalContainer = document.getElementById('normalContainer');
const miniContainer = document.getElementById('miniContainer');
const wallpaperBackdrop = document.getElementById('wallpaperBackdrop');
const toast = document.getElementById('toast');
const sourceBadge = document.getElementById('sourceBadge');

// Tabs
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanes = {
  search: document.getElementById('tabSearch'),
  favorites: document.getElementById('tabFavorites'),
  playlists: document.getElementById('tabPlaylists'),
  notes: document.getElementById('tabNotes'),
  ai: document.getElementById('tabAi'),
  settings: document.getElementById('tabSettings')
};
const favCountBadge = document.getElementById('favCount');

// Playlists (AI Text & Mood & USB) Elements
const playlistThemeInput = document.getElementById('playlistThemeInput');
const playlistCountSelect = document.getElementById('playlistCountSelect');
const btnBuildPlaylist = document.getElementById('btnBuildPlaylist');
const playlistExportBar = document.getElementById('playlistExportBar');
const playlistSummaryTitle = document.getElementById('playlistSummaryTitle');
const playlistSummaryMeta = document.getElementById('playlistSummaryMeta');
const btnExportToUsb = document.getElementById('btnExportToUsb');
const playlistBuildingIndicator = document.getElementById('playlistBuildingIndicator');
const playlistIndicatorText = document.getElementById('playlistIndicatorText');
const builtPlaylistTracks = document.getElementById('builtPlaylistTracks');
const emptyPlaylistState = document.getElementById('emptyPlaylistState');
const vibeDetectedCard = document.getElementById('vibeDetectedCard');
const vibeTitleText = document.getElementById('vibeTitleText');
const vibeDescText = document.getElementById('vibeDescText');
const vibeQueriesPills = document.getElementById('vibeQueriesPills');
const btnPasteFromNotes = document.getElementById('btnPasteFromNotes');
const quickPresetChips = document.getElementById('quickPresetChips');
let currentBuiltPlaylist = [];
let currentDetectedVibe = null;

// Voice Notes & Memos Elements
const btnManualRecord = document.getElementById('btnManualRecord');
const recBtnText = document.getElementById('recBtnText');
const noteDirectInput = document.getElementById('noteDirectInput');
const btnSaveTextNote = document.getElementById('btnSaveTextNote');
const notesList = document.getElementById('notesList');
const emptyNotes = document.getElementById('emptyNotes');
let mediaRecorder = null;
let audioChunks = [];
let isRecordingVoice = false;

// Search Tab
const searchInput = document.getElementById('searchInput');
const btnSearchClear = document.getElementById('btnSearchClear');
const quickTags = document.getElementById('quickTags');
const searchResultsMetaBar = document.getElementById('searchResultsMetaBar');
const searchResultsCountText = document.getElementById('searchResultsCountText');
const tracklistContainer = document.getElementById('tracklistContainer');
const tracksList = document.getElementById('tracksList');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const btnLoadMoreTracks = document.getElementById('btnLoadMoreTracks');
const loadMoreBtnText = document.getElementById('loadMoreBtnText');

let currentSearchQuery = 'Chillout';
let currentSearchPage = 1;

// Favorites Tab
const favoritesList = document.getElementById('favoritesList');
const emptyFavorites = document.getElementById('emptyFavorites');

// AI Tab
const btnGenerateAi = document.getElementById('btnGenerateAi');
const aiLoading = document.getElementById('aiLoading');
const aiSuggestionsList = document.getElementById('aiSuggestionsList');
const aiChipsContainer = document.getElementById('aiChipsContainer');

// Settings & Source Elements
const sourceCheckboxes = document.querySelectorAll('.source-checkbox');
const btnSelectAllSources = document.getElementById('btnSelectAllSources');
const btnDeselectAllSources = document.getElementById('btnDeselectAllSources');
const searchSourceChips = document.querySelectorAll('#searchSourceChips .source-toggle-chip');
const btnToggleAllSourcesFast = document.getElementById('btnToggleAllSourcesFast');
const themeChips = document.querySelectorAll('.theme-chip');
const btnUploadWallpaper = document.getElementById('btnUploadWallpaper');
const btnClearWallpaper = document.getElementById('btnClearWallpaper');
const blurSlider = document.getElementById('blurSlider');
const blurVal = document.getElementById('blurVal');
const opacitySlider = document.getElementById('opacitySlider');
const opacityVal = document.getElementById('opacityVal');
const inputPlayPauseKey = document.getElementById('inputPlayPauseKey');
const btnRecordPlayPause = document.getElementById('btnRecordPlayPause');
const inputNextKey = document.getElementById('inputNextKey');
const btnRecordNext = document.getElementById('btnRecordNext');
const hotkeyPresetChips = document.querySelectorAll('.hotkey-preset-chip');
const btnSaveHotkeys = document.getElementById('btnSaveHotkeys');
const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
const btnSaveApiKey = document.getElementById('btnSaveApiKey');
const activeHotkeyBadge = document.getElementById('activeHotkeyBadge');
const hotkeyBadgeHint = document.getElementById('hotkeyBadgeHint');

// Player Elements (Normal)
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');
const btnMiniMode = document.getElementById('btnMiniMode');
const btnSettingsTab = document.getElementById('btnSettingsTab');
const btnExpandMode = document.getElementById('btnExpandMode');
const btnMiniClose = document.getElementById('btnMiniClose');

// Quick Titlebar Sleep Timer
const btnQuickSleepTimer = document.getElementById('btnQuickSleepTimer');
const quickSleepBadge = document.getElementById('quickSleepBadge');

// Sleep Grace Alert Banner
const sleepGraceWarningBanner = document.getElementById('sleepGraceWarningBanner');
const graceTitleText = document.getElementById('graceTitleText');
const graceDescText = document.getElementById('graceDescText');
const btnCancelSleepGrace = document.getElementById('btnCancelSleepGrace');

const btnMainPlay = document.getElementById('btnMainPlay');
const playIconMain = document.getElementById('playIconMain');
const pauseIconMain = document.getElementById('pauseIconMain');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnShuffle = document.getElementById('btnShuffle');
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const btnCurrentFav = document.getElementById('btnCurrentFav');
const btnCurrentDownload = document.getElementById('btnCurrentDownload');
const volumeSlider = document.getElementById('volumeSlider');

// Live Radio Metadata Elements
const liveBadge = document.getElementById('liveBadge');
const btnSearchLiveTrack = document.getElementById('btnSearchLiveTrack');
const btnCopyLiveTrack = document.getElementById('btnCopyLiveTrack');
let currentLiveTrackTitle = '';
let liveRadioWatcherInterval = null;

// Player Elements (Mini Dock)
const btnMiniPlay = document.getElementById('btnMiniPlay');
const miniPlayIcon = document.getElementById('miniPlayIcon');
const miniPauseIcon = document.getElementById('miniPauseIcon');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const btnMiniFav = document.getElementById('btnMiniFav');
const btnMiniShuffle = document.getElementById('btnMiniShuffle');
const btnMiniCopyLiveTrack = document.getElementById('btnMiniCopyLiveTrack');
const soundWave = document.getElementById('soundWave');

// Power Timer & Watchdog Elements
const powerTimerSettingsCard = document.getElementById('powerTimerSettingsCard');
const powerTimerStatusBadge = document.getElementById('powerTimerStatusBadge');
const btnCancelPowerTimerDirect = document.getElementById('btnCancelPowerTimerDirect');
const powerModeTabs = document.querySelectorAll('.power-mode-tab');
const powerSubpaneCountdown = document.getElementById('powerSubpaneCountdown');
const powerSubpaneWatchdog = document.getElementById('powerSubpaneWatchdog');
const powerPresetChips = document.querySelectorAll('.power-preset-chip');
const inputPowerMinutes = document.getElementById('inputPowerMinutes');
const procPresetChips = document.querySelectorAll('.proc-preset-chip');
const inputWatchdogProcess = document.getElementById('inputWatchdogProcess');
const btnRefreshProcesses = document.getElementById('btnRefreshProcesses');
const liveProcessesPillsRow = document.getElementById('liveProcessesPillsRow');
const condChips = document.querySelectorAll('.cond-chip');
const watchdogThresholdRow = document.getElementById('watchdogThresholdRow');
const threshChips = document.querySelectorAll('.thresh-chip');
const actionChips = document.querySelectorAll('.action-chip');
const powerActiveStatusBox = document.getElementById('powerActiveStatusBox');
const powerActiveHeadline = document.getElementById('powerActiveHeadline');
const powerActiveCountdown = document.getElementById('powerActiveCountdown');
const powerActiveSubtext = document.getElementById('powerActiveSubtext');
const btnStartPowerTimer = document.getElementById('btnStartPowerTimer');
const startPowerBtnLabel = document.getElementById('startPowerBtnLabel');
const btnCancelPowerTimer = document.getElementById('btnCancelPowerTimer');

// Playback state
let isShuffle = false;
let playbackHistory = [];

// Power timer selections
let selectedPowerMode = 'countdown'; // 'countdown' | 'watchdog'
let selectedPowerAction = 'sleep';    // 'sleep' | 'shutdown'
let selectedWatchdogCondition = 'idle'; // 'idle' | 'exit'
let selectedWatchdogThreshold = 3;   // minutes

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  // Load saved config
  const savedData = await window.api.loadAppData();
  if (savedData) {
    appData = { ...appData, ...savedData };
  }

  // Ensure activeSources array is populated
  if (!appData.activeSources || !Array.isArray(appData.activeSources) || appData.activeSources.length === 0) {
    appData.activeSources = ['promodj', 'stations', 'zaycev', 'radio', 'banana', 'garden'];
  } else {
    if (!appData.activeSources.includes('banana')) appData.activeSources.push('banana');
    if (!appData.activeSources.includes('garden')) appData.activeSources.push('garden');
  }
  // Ensure hotkeys object and Ctrl+End default
  if (!appData.hotkeys) {
    appData.hotkeys = { playPause: 'Ctrl+End', next: 'Ctrl+Right', prev: 'Ctrl+Left' };
  } else if (!appData.hotkeys.playPause) {
    appData.hotkeys.playPause = 'Ctrl+End';
  }

  applyTheme(appData.theme || 'theme-ocean-sand');
  applyWallpaperSettings();
  applySettingsFormValues();
  updateFavCount();

  isShuffle = !!appData.isShuffle;
  updateShuffleUI();

  setupEventListeners();

  // Execute initial search
  executeSearch('Chillout');
});

function setupEventListeners() {
  // Window buttons
  btnMinimize.addEventListener('click', () => window.api.minimizeWindow());
  btnClose.addEventListener('click', () => window.api.closeWindow());
  btnMiniClose.addEventListener('click', () => window.api.closeWindow());
  btnMiniMode.addEventListener('click', () => window.api.toggleMiniMode());
  btnExpandMode.addEventListener('click', () => window.api.toggleMiniMode());
  btnSettingsTab.addEventListener('click', () => switchTab('settings'));

  // Global hotkeys from Electron
  window.api.onTogglePlayPause(() => togglePlayPause());
  window.api.onNextTrack(() => playNext());
  window.api.onPrevTrack(() => playPrev());

  window.api.onModeChanged((mode) => {
    if (mode === 'mini') {
      normalContainer.style.display = 'none';
      miniContainer.style.display = 'flex';
    } else {
      miniContainer.style.display = 'none';
      normalContainer.style.display = 'flex';
    }
  });

  // Nav Tabs Switching
  navTabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tabId = tabBtn.dataset.tab;
      switchTab(tabId);
    });
  });

  // Playback Buttons
  btnMainPlay.addEventListener('click', togglePlayPause);
  btnMiniPlay.addEventListener('click', togglePlayPause);
  btnNext.addEventListener('click', playNext);
  btnPrev.addEventListener('click', playPrev);
  if (btnShuffle) btnShuffle.addEventListener('click', toggleShuffle);
  if (btnMiniShuffle) btnMiniShuffle.addEventListener('click', toggleShuffle);

  initPowerTimerControls();

  // Current track actions
  btnCurrentFav.addEventListener('click', toggleCurrentTrackFav);
  btnMiniFav.addEventListener('click', toggleCurrentTrackFav);
  btnCurrentDownload.addEventListener('click', downloadCurrentTrack);

  // Live Radio Track Quick Search and Copy
  if (btnSearchLiveTrack) {
    btnSearchLiveTrack.addEventListener('click', () => {
      if (currentLiveTrackTitle) {
        switchTab('search');
        searchInput.value = currentLiveTrackTitle;
        btnSearchClear.style.display = 'block';
        document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
        showToast(`🔍 Ищу «${currentLiveTrackTitle}» во всех сервисах...`);
        executeSearch(currentLiveTrackTitle);
      }
    });
  }

  if (btnCopyLiveTrack) {
    btnCopyLiveTrack.addEventListener('click', () => {
      if (currentLiveTrackTitle) {
        navigator.clipboard.writeText(currentLiveTrackTitle);
        showToast(`📋 Название скопировано: ${currentLiveTrackTitle}`);
      }
    });
  }

  if (btnMiniCopyLiveTrack) {
    btnMiniCopyLiveTrack.addEventListener('click', () => {
      if (currentLiveTrackTitle) {
        navigator.clipboard.writeText(currentLiveTrackTitle);
        showToast(`📋 Скопировано: ${currentLiveTrackTitle}`);
      }
    });
  }

  // Volume
  volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
  });
  audio.volume = parseFloat(volumeSlider.value);

  // Audio element events
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

  // Search input events
  let searchDebounce = null;
  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    btnSearchClear.style.display = val.length > 0 ? 'block' : 'none';

    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      if (val.length >= 2) {
        document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
        executeSearch(val);
      }
    }, 500);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounce);
      executeSearch(searchInput.value.trim());
    }
  });

  btnSearchClear.addEventListener('click', () => {
    searchInput.value = '';
    btnSearchClear.style.display = 'none';
    searchInput.focus();
  });

  // Quick Genre Pills
  document.querySelectorAll('.tag-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const query = pill.dataset.query;
      searchInput.value = '';
      btnSearchClear.style.display = 'none';
      executeSearch(query);
    });
  });

  // Load More Tracks Button
  if (btnLoadMoreTracks) {
    btnLoadMoreTracks.addEventListener('click', () => {
      loadMoreTracks();
    });
  }

  // AI Recommender Button
  btnGenerateAi.addEventListener('click', generateAiSuggestions);

  // Settings: Source change via checkboxes
  sourceCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const src = cb.dataset.source;
      if (cb.checked) {
        if (!appData.activeSources.includes(src)) appData.activeSources.push(src);
      } else {
        appData.activeSources = appData.activeSources.filter(s => s !== src);
        if (appData.activeSources.length === 0) {
          appData.activeSources = [src];
          cb.checked = true;
          showToast('Хотя бы один сервис должен быть выбран');
        }
      }
      saveAppData();
      syncSourceSelectors();
      executeSearch(searchInput.value || 'Chillout');
    });
  });

  if (btnSelectAllSources) {
    btnSelectAllSources.addEventListener('click', () => {
      appData.activeSources = ['promodj', 'stations', 'zaycev', 'radio', 'banana', 'garden'];
      saveAppData();
      syncSourceSelectors();
      showToast('✓ Все сервисы подключены к поиску!');
      executeSearch(searchInput.value || 'Chillout');
    });
  }

  if (btnDeselectAllSources) {
    btnDeselectAllSources.addEventListener('click', () => {
      appData.activeSources = ['promodj'];
      saveAppData();
      syncSourceSelectors();
      showToast('Оставлен только PromoDJ');
      executeSearch(searchInput.value || 'Chillout');
    });
  }

  // Search Tab Chips
  searchSourceChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const src = chip.dataset.source;
      if (appData.activeSources.includes(src)) {
        if (appData.activeSources.length <= 1) {
          showToast('Хотя бы один сервис должен быть активен');
          return;
        }
        appData.activeSources = appData.activeSources.filter(s => s !== src);
      } else {
        appData.activeSources.push(src);
      }
      saveAppData();
      syncSourceSelectors();
      executeSearch(searchInput.value || 'Chillout');
    });
  });

  if (btnToggleAllSourcesFast) {
    btnToggleAllSourcesFast.addEventListener('click', () => {
      if (appData.activeSources.length === 6) {
        showToast('Все 6 сервисов уже активны');
      } else {
        appData.activeSources = ['promodj', 'stations', 'zaycev', 'radio', 'banana', 'garden'];
        saveAppData();
        syncSourceSelectors();
        showToast('✓ Все сервисы подключены к поиску!');
        executeSearch(searchInput.value || 'Chillout');
      }
    });
  }

  // Spotify Connect Button
  const btnOpenSpotify = document.getElementById('btnOpenSpotify');
  if (btnOpenSpotify) {
    btnOpenSpotify.addEventListener('click', async () => {
      showToast('Открываю Spotify Web Player...');
      await window.api.openSpotify();
    });
  }

  // Settings: Theme chips
  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      themeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const chosenTheme = chip.dataset.theme;
      applyTheme(chosenTheme);
      appData.theme = chosenTheme;
      saveAppData();
      showToast('Тема обновлена');
    });
  });

  // Settings: Wallpaper
  btnUploadWallpaper.addEventListener('click', async () => {
    const base64 = await window.api.selectWallpaper();
    if (base64) {
      appData.customWallpaper = base64;
      applyWallpaperSettings();
      saveAppData();
      showToast('Обои успешно установлены!');
    }
  });

  btnClearWallpaper.addEventListener('click', () => {
    appData.customWallpaper = '';
    applyWallpaperSettings();
    saveAppData();
    showToast('Фон удалён');
  });

  blurSlider.addEventListener('input', (e) => {
    appData.blurWallpaper = parseInt(e.target.value, 10);
    blurVal.textContent = `${appData.blurWallpaper}px`;
    applyWallpaperSettings();
    saveAppData();
  });

  opacitySlider.addEventListener('input', (e) => {
    appData.wallpaperOpacity = parseInt(e.target.value, 10);
    opacityVal.textContent = `${appData.wallpaperOpacity}%`;
    applyWallpaperSettings();
    saveAppData();
  });

  // Hotkey Recorder
  let activeRecordingTarget = null; // 'playPause' | 'next' | null

  function startRecordingHotkey(target) {
    activeRecordingTarget = target;
    const isPlayPause = (target === 'playPause');
    const inputEl = isPlayPause ? inputPlayPauseKey : inputNextKey;
    const btnEl = isPlayPause ? btnRecordPlayPause : btnRecordNext;
    const otherBtn = isPlayPause ? btnRecordNext : btnRecordPlayPause;

    if (otherBtn) {
      otherBtn.classList.remove('recording');
      const otherLbl = otherBtn.querySelector('.rec-btn-label');
      if (otherLbl) otherLbl.textContent = 'Записать клавиши';
    }

    btnEl.classList.add('recording');
    const lbl = btnEl.querySelector('.rec-btn-label');
    if (lbl) lbl.textContent = 'Нажмите клавиши...';
    inputEl.value = 'Слушаю клавиатуру...';
    inputEl.focus();
    showToast('Нажмите комбинацию (например Control End или F9)...');
  }

  function stopRecordingHotkey() {
    activeRecordingTarget = null;
    if (btnRecordPlayPause) {
      btnRecordPlayPause.classList.remove('recording');
      const lbl = btnRecordPlayPause.querySelector('.rec-btn-label');
      if (lbl) lbl.textContent = 'Записать клавиши';
    }
    if (btnRecordNext) {
      btnRecordNext.classList.remove('recording');
      const lbl = btnRecordNext.querySelector('.rec-btn-label');
      if (lbl) lbl.textContent = 'Записать клавиши';
    }
  }

  if (btnRecordPlayPause) {
    btnRecordPlayPause.addEventListener('click', () => {
      if (activeRecordingTarget === 'playPause') {
        stopRecordingHotkey();
        inputPlayPauseKey.value = appData.hotkeys.playPause || 'Ctrl+End';
      } else {
        startRecordingHotkey('playPause');
      }
    });
  }

  if (btnRecordNext) {
    btnRecordNext.addEventListener('click', () => {
      if (activeRecordingTarget === 'next') {
        stopRecordingHotkey();
        inputNextKey.value = appData.hotkeys.next || 'Ctrl+Right';
      } else {
        startRecordingHotkey('next');
      }
    });
  }

  // Keyboard capture for recorder
  window.addEventListener('keydown', (e) => {
    if (!activeRecordingTarget) return;

    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      const isPlayPause = (activeRecordingTarget === 'playPause');
      const inputEl = isPlayPause ? inputPlayPauseKey : inputNextKey;
      inputEl.value = isPlayPause ? (appData.hotkeys.playPause || 'Ctrl+End') : (appData.hotkeys.next || 'Ctrl+Right');
      stopRecordingHotkey();
      showToast('Запись отменена');
      return;
    }

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Win');

    let mainKey = e.key;
    if (e.code === 'Space' || mainKey === ' ') mainKey = 'Space';
    else if (mainKey === 'ArrowRight') mainKey = 'Right';
    else if (mainKey === 'ArrowLeft') mainKey = 'Left';
    else if (mainKey === 'ArrowUp') mainKey = 'Up';
    else if (mainKey === 'ArrowDown') mainKey = 'Down';
    else if (mainKey === 'Enter') mainKey = 'Enter';
    else if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(mainKey)) mainKey = mainKey.toUpperCase();
    else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
    else if (mainKey.length > 1) mainKey = mainKey.charAt(0).toUpperCase() + mainKey.slice(1);

    if (!parts.includes(mainKey)) {
      parts.push(mainKey);
    }

    const combo = parts.join('+');
    const isPlayPause = (activeRecordingTarget === 'playPause');
    const inputEl = isPlayPause ? inputPlayPauseKey : inputNextKey;
    inputEl.value = combo;
    stopRecordingHotkey();
    showToast(`Зафиксировано: ${combo}. Нажмите «Применить»!`);
  }, true);

  // Quick preset chips
  hotkeyPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const target = chip.dataset.target;
      const combo = chip.dataset.combo;
      if (target === 'playPause') {
        inputPlayPauseKey.value = combo;
      } else if (target === 'next') {
        inputNextKey.value = combo;
      }
      showToast(`Выбрано: ${combo}. Нажмите «Применить»`);
    });
  });

  // Save Hotkeys button
  if (btnSaveHotkeys) {
    btnSaveHotkeys.addEventListener('click', async () => {
      const playPauseVal = inputPlayPauseKey.value.trim() || 'Ctrl+End';
      const nextVal = inputNextKey.value.trim() || 'Ctrl+Right';

      appData.hotkeys.playPause = playPauseVal;
      appData.hotkeys.next = nextVal;

      const res = await window.api.updateHotkeys(appData.hotkeys);
      saveAppData();

      activeHotkeyBadge.textContent = appData.hotkeys.playPause;
      if (res && res.success) {
        showToast(`Горячая клавиша [${appData.hotkeys.playPause}] активирована глобально!`);
      } else {
        showToast(`Горячая клавиша сохранена: ${appData.hotkeys.playPause}`);
      }
    });
  }

  hotkeyBadgeHint.addEventListener('click', () => switchTab('settings'));

  // Settings: Gemini API Key
  btnSaveApiKey.addEventListener('click', () => {
    appData.geminiApiKey = geminiApiKeyInput.value.trim();
    saveAppData();
    showToast('Gemini API ключ сохранён!');
  });

  // Hotkey trigger from main for Voice Memo (F8)
  window.api.onVoiceMemoHotkey(() => {
    toggleVoiceRecording();
  });

  // Manual record button in Notes tab
  btnManualRecord.addEventListener('click', () => {
    toggleVoiceRecording();
  });

  // Save manual text note
  btnSaveTextNote.addEventListener('click', () => {
    const txt = noteDirectInput.value.trim();
    if (txt) {
      addNote(txt);
      noteDirectInput.value = '';
    }
  });

  // Preset chips click
  if (quickPresetChips) {
    quickPresetChips.querySelectorAll('.preset-chip:not(#btnPasteFromNotes)').forEach(chip => {
      chip.addEventListener('click', () => {
        quickPresetChips.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        playlistThemeInput.value = chip.dataset.preset;
      });
    });
  }

  // Paste from notes
  if (btnPasteFromNotes) {
    btnPasteFromNotes.addEventListener('click', () => {
      if (!appData.notes || appData.notes.length === 0) {
        showToast('В блокноте пока нет заметок. Надиктуйте (F8) или напишите заметку!');
        return;
      }
      const latestNote = appData.notes[0];
      playlistThemeInput.value = latestNote.text;
      playlistThemeInput.focus();
      showToast('📋 Вставлен текст из последней заметки!');
    });
  }

  // Build AI Playlist from text / thoughts
  btnBuildPlaylist.addEventListener('click', () => {
    generateAiMoodPlaylist();
  });

  // Export Playlist to Folder / USB
  btnExportToUsb.addEventListener('click', () => {
    exportCurrentPlaylistToUsb();
  });
}

// Tab Switching
function switchTab(tabId) {
  currentTab = tabId;
  navTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  
  Object.keys(tabPanes).forEach(k => {
    if (tabPanes[k]) {
      tabPanes[k].style.display = (k === tabId) ? 'flex' : 'none';
    }
  });

  if (tabId === 'favorites') {
    renderFavoritesList();
  } else if (tabId === 'notes') {
    renderNotesList();
  }
}

// Search execution
async function executeSearch(query) {
  if (!query) return;

  currentSearchQuery = query;
  currentSearchPage = 1;

  loadingIndicator.style.display = 'flex';
  emptyState.style.display = 'none';
  if (searchResultsMetaBar) searchResultsMetaBar.style.display = 'none';
  if (loadMoreContainer) loadMoreContainer.style.display = 'none';
  tracksList.innerHTML = '';

  try {
    const results = await window.api.searchMusic({
      sources: (appData.activeSources && appData.activeSources.length > 0) ? appData.activeSources : ['promodj', 'stations', 'zaycev', 'radio'],
      query: query,
      page: 1
    });

    loadingIndicator.style.display = 'none';

    if (!results || results.length === 0) {
      emptyState.style.display = 'flex';
      emptyState.querySelector('p').textContent = `Ничего не найдено по запросу "${query}"`;
      if (searchResultsMetaBar) searchResultsMetaBar.style.display = 'none';
      if (loadMoreContainer) loadMoreContainer.style.display = 'none';
      return;
    }

    currentPlaylist = results;
    renderTracklist(currentPlaylist, tracksList);

    // Show results count badge
    if (searchResultsMetaBar && searchResultsCountText) {
      searchResultsMetaBar.style.display = 'flex';
      searchResultsCountText.textContent = `Найдено ${results.length} треков`;
    }

    // Show load more button
    if (loadMoreContainer) {
      loadMoreContainer.style.display = 'flex';
      btnLoadMoreTracks.disabled = false;
      loadMoreBtnText.textContent = 'Загрузить ещё (+50 треков)';
    }
  } catch (err) {
    loadingIndicator.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.querySelector('p').textContent = 'Ошибка загрузки музыки. Попробуйте еще раз.';
  }
}

async function loadMoreTracks() {
  if (!currentSearchQuery) return;

  currentSearchPage++;
  btnLoadMoreTracks.disabled = true;
  loadMoreBtnText.textContent = 'Загрузка ещё треков...';

  try {
    const moreResults = await window.api.searchMusic({
      sources: (appData.activeSources && appData.activeSources.length > 0) ? appData.activeSources : ['promodj', 'stations', 'zaycev', 'radio'],
      query: currentSearchQuery,
      page: currentSearchPage
    });

    if (!moreResults || moreResults.length === 0) {
      loadMoreBtnText.textContent = `Все доступные треки загружены (${currentPlaylist.length})`;
      btnLoadMoreTracks.disabled = true;
      showToast('Больше треков не найдено');
      return;
    }

    const seenUrls = new Set(currentPlaylist.map(t => t.streamUrl));
    const uniqueMore = moreResults.filter(t => !seenUrls.has(t.streamUrl));

    if (uniqueMore.length === 0) {
      loadMoreBtnText.textContent = `Все треки загружены (${currentPlaylist.length})`;
      btnLoadMoreTracks.disabled = true;
      showToast('Все доступные треки уже в списке');
      return;
    }

    currentPlaylist = [...currentPlaylist, ...uniqueMore];
    renderTracklist(currentPlaylist, tracksList);

    if (searchResultsCountText) {
      searchResultsCountText.textContent = `Найдено ${currentPlaylist.length} треков`;
    }

    btnLoadMoreTracks.disabled = false;
    loadMoreBtnText.textContent = 'Загрузить ещё (+50 треков)';
    showToast(`Подгружено ещё +${uniqueMore.length} треков!`);
  } catch (err) {
    btnLoadMoreTracks.disabled = false;
    loadMoreBtnText.textContent = 'Ошибка, нажать чтобы повторить';
  }
}

// Render Track Lists (for search or favorites)
function renderTracklist(list, container) {
  container.innerHTML = '';

  const sourceLabels = {
    promodj: 'PromoDJ',
    stations: 'Топ Радио',
    zaycev: 'Зайцев.FM',
    radio: 'Radio',
    banana: 'BananaStreet',
    garden: 'Garden'
  };

  list.forEach((track, index) => {
    const isFav = isTrackInFavorites(track);
    const srcTag = sourceLabels[track.source] || 'Музыка';
    const item = document.createElement('div');
    item.className = `track-item ${currentPlayingTrack && currentPlayingTrack.streamUrl === track.streamUrl ? 'active' : ''}`;
    
    item.innerHTML = `
      <div class="item-play-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
      <div class="item-meta">
        <div class="item-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
        <div class="item-sub"><span class="track-source-pill source-${escapeHtml(track.source || 'default')}">${srcTag}</span> ${escapeHtml(track.author || 'Трек')} ${track.duration ? '• ' + track.duration : ''}</div>
      </div>
      <div class="item-actions">
        <button class="action-icon-btn fav-btn ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Удалить из избранного' : 'В избранное'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <button class="action-icon-btn dl-btn" title="Скачать трек на диск">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    `;

    // Item click -> play
    item.addEventListener('click', (e) => {
      if (e.target.closest('.action-icon-btn')) return;
      currentPlaylist = list;
      playTrack(index);
    });

    // Favorite toggle
    const favBtn = item.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(track);
      renderTracklist(list, container);
    });

    // Download
    const dlBtn = item.querySelector('.dl-btn');
    dlBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      showToast(`Началась загрузка: ${track.title}...`);
      const res = await window.api.downloadTrack(track);
      if (res.success) {
        showToast(`Файл сохранён в Загрузки!`);
      } else {
        showToast(`Ошибка сохранения: ${res.error}`);
      }
    });

    container.appendChild(item);
  });
}

function renderFavoritesList() {
  if (!appData.favorites || appData.favorites.length === 0) {
    favoritesList.innerHTML = '';
    emptyFavorites.style.display = 'flex';
  } else {
    emptyFavorites.style.display = 'none';
    renderTracklist(appData.favorites, favoritesList);
  }
}

// Playback handling
function playTrack(index) {
  if (index < 0 || index >= currentPlaylist.length) return;

  currentTrackIndex = index;
  const track = currentPlaylist[index];
  currentPlayingTrack = track;

  // Add to playback history for AI training
  logTrackHistory(track);

  // Update UI Titles
  currentTitle.textContent = track.title;
  currentTitle.title = track.title;
  currentArtist.textContent = track.author ? `${track.author} • ${track.source === 'radio' ? 'Radio' : 'PromoDJ'}` : 'FONOGRAFICUS';

  miniTitle.textContent = track.title;
  miniTitle.title = track.title;
  miniArtist.textContent = track.author || 'FONOGRAFICUS';

  updateFavIconStatus();

  // Highlight in lists
  document.querySelectorAll('.track-item').forEach(el => {
    el.classList.toggle('active', el.querySelector('.item-title')?.textContent === track.title);
  });

  // Stream audio
  audio.src = track.streamUrl;
  audio.play().catch(e => console.warn(e));

  // Live Radio metadata detection (ICY StreamTitle)
  const isLiveRadio = track.source === 'stations' || track.source === 'radio' || track.source === 'zaycev' || (track.duration && track.duration.toLowerCase().includes('live'));
  if (isLiveRadio) {
    startLiveRadioWatcher(track.streamUrl, track);
  } else {
    stopLiveRadioWatcher();
  }
}

function togglePlayPause() {
  if (!currentPlayingTrack && currentPlaylist.length > 0) {
    playTrack(0);
    return;
  }
  if (!currentPlayingTrack) return;

  if (audio.paused) {
    audio.play().catch(e => console.warn(e));
  } else {
    audio.pause();
  }
}

function playNext() {
  if (currentPlaylist.length === 0) return;
  if (currentTrackIndex !== -1) {
    playbackHistory.push(currentTrackIndex);
    if (playbackHistory.length > 50) playbackHistory.shift();
  }

  if (isShuffle && currentPlaylist.length > 1) {
    let nextIdx;
    let attempts = 0;
    do {
      nextIdx = Math.floor(Math.random() * currentPlaylist.length);
      attempts++;
    } while (nextIdx === currentTrackIndex && attempts < 10);
    playTrack(nextIdx);
  } else {
    const nextIdx = (currentTrackIndex + 1) % currentPlaylist.length;
    playTrack(nextIdx);
  }
}

function playPrev() {
  if (currentPlaylist.length === 0) return;
  if (playbackHistory.length > 0) {
    const prevIdx = playbackHistory.pop();
    if (prevIdx >= 0 && prevIdx < currentPlaylist.length) {
      playTrack(prevIdx);
      return;
    }
  }
  const prevIdx = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
  playTrack(prevIdx);
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  appData.isShuffle = isShuffle;
  saveAppData();
  updateShuffleUI();
  if (isShuffle) {
    showToast('🔀 Случайный порядок (Shuffle) включён');
  } else {
    showToast('Прямой порядок треков');
  }
}

function updateShuffleUI() {
  if (btnShuffle) btnShuffle.classList.toggle('active', isShuffle);
  if (btnMiniShuffle) btnMiniShuffle.classList.toggle('active', isShuffle);
}

// ================= LIVE RADIO METADATA EXTRACTOR =================
function startLiveRadioWatcher(streamUrl, track) {
  stopLiveRadioWatcher();

  // Show live badge immediately
  if (liveBadge) liveBadge.style.display = 'inline-flex';

  // Fetch immediately
  fetchLiveRadioMetadata(streamUrl, track);

  // Poll every 20 seconds while playing the same stream
  liveRadioWatcherInterval = setInterval(() => {
    if (currentPlayingTrack && currentPlayingTrack.streamUrl === streamUrl) {
      fetchLiveRadioMetadata(streamUrl, track);
    } else {
      stopLiveRadioWatcher();
    }
  }, 20000);
}

function stopLiveRadioWatcher() {
  if (liveRadioWatcherInterval) {
    clearInterval(liveRadioWatcherInterval);
    liveRadioWatcherInterval = null;
  }
  currentLiveTrackTitle = '';
  if (liveBadge) liveBadge.style.display = 'none';
  if (btnSearchLiveTrack) btnSearchLiveTrack.style.display = 'none';
  if (btnCopyLiveTrack) btnCopyLiveTrack.style.display = 'none';
  if (btnMiniCopyLiveTrack) btnMiniCopyLiveTrack.style.display = 'none';
}

async function fetchLiveRadioMetadata(streamUrl, originalTrack) {
  try {
    const meta = await window.api.getRadioMetadata(streamUrl);
    if (!meta || !meta.success || !meta.rawTitle) return;

    // Check if we are still playing this track
    if (!currentPlayingTrack || currentPlayingTrack.streamUrl !== streamUrl) return;

    const newTitle = meta.rawTitle;
    const isNewSong = (currentLiveTrackTitle && currentLiveTrackTitle !== newTitle);
    currentLiveTrackTitle = newTitle;

    // Update Player UI Titles
    currentTitle.textContent = newTitle;
    currentTitle.title = newTitle;

    const stationLabel = meta.stationName || originalTrack.title || 'Live Radio';
    currentArtist.textContent = `${stationLabel} • В эфире`;
    currentArtist.title = stationLabel;

    miniTitle.textContent = newTitle;
    miniTitle.title = newTitle;
    miniArtist.textContent = stationLabel;

    // Show action buttons
    if (liveBadge) liveBadge.style.display = 'inline-flex';
    if (btnSearchLiveTrack) btnSearchLiveTrack.style.display = 'flex';
    if (btnCopyLiveTrack) btnCopyLiveTrack.style.display = 'flex';
    if (btnMiniCopyLiveTrack) btnMiniCopyLiveTrack.style.display = 'flex';

    // Update active track item in the tracklist to show what's currently on air
    const activeEl = document.querySelector('.track-item.active');
    if (activeEl) {
      let liveSub = activeEl.querySelector('.track-item-live-track');
      if (!liveSub) {
        liveSub = document.createElement('div');
        liveSub.className = 'track-item-live-track';
        const metaCont = activeEl.querySelector('.item-meta');
        if (metaCont) metaCont.appendChild(liveSub);
      }
      if (liveSub) {
        liveSub.innerHTML = `<span class="track-item-live-dot"></span><span>${escapeHtml(newTitle)}</span>`;
      }
    }

    if (isNewSong) {
      showToast(`🎵 В эфире: ${newTitle}`);
    }
  } catch (err) {
    console.warn('[RadioMetadata] Error fetching metadata:', err);
  }
}

function updatePlayPauseUI() {
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
}

// Favorites logic
function isTrackInFavorites(track) {
  if (!track || !appData.favorites) return false;
  return appData.favorites.some(f => f.streamUrl === track.streamUrl || (f.id && f.id === track.id));
}

function toggleFavorite(track) {
  if (!appData.favorites) appData.favorites = [];
  const idx = appData.favorites.findIndex(f => f.streamUrl === track.streamUrl || (f.id && f.id === track.id));

  if (idx !== -1) {
    appData.favorites.splice(idx, 1);
    showToast('Удалено из Избранного');
  } else {
    appData.favorites.unshift(track);
    showToast('❤️ Добавлено в Избранное');
  }

  saveAppData();
  updateFavCount();
  updateFavIconStatus();
}

function toggleCurrentTrackFav() {
  if (!currentPlayingTrack) return;
  toggleFavorite(currentPlayingTrack);
}

function updateFavIconStatus() {
  const isFav = isTrackInFavorites(currentPlayingTrack);
  btnCurrentFav.classList.toggle('is-fav', isFav);
  btnMiniFav.classList.toggle('is-fav', isFav);

  const fill = isFav ? 'currentColor' : 'none';
  btnCurrentFav.querySelector('svg').setAttribute('fill', fill);
  btnMiniFav.querySelector('svg').setAttribute('fill', fill);
}

function updateFavCount() {
  const count = appData.favorites ? appData.favorites.length : 0;
  favCountBadge.textContent = count;
}

// Download
async function downloadCurrentTrack() {
  if (!currentPlayingTrack) return;
  showToast(`Скачивание: ${currentPlayingTrack.title}...`);
  const res = await window.api.downloadTrack(currentPlayingTrack);
  if (res.success) {
    showToast(`Файл скачан в папку Загрузки!`);
  } else {
    showToast(`Ошибка скачивания: ${res.error}`);
  }
}

// AI Music Curator
async function generateAiSuggestions() {
  aiLoading.style.display = 'flex';
  aiSuggestionsList.style.display = 'none';

  const res = await window.api.getAiRecommendations({
    history: appData.history || [],
    favorites: appData.favorites || [],
    apiKey: appData.geminiApiKey || ''
  });

  aiLoading.style.display = 'none';

  if (!res.success) {
    showToast(res.error || 'Не удалось получить рекомендации');
    return;
  }

  aiSuggestionsList.style.display = 'block';
  aiChipsContainer.innerHTML = '';

  (res.queries || []).forEach(q => {
    const chip = document.createElement('button');
    chip.className = 'ai-chip';
    chip.textContent = q;
    chip.addEventListener('click', () => {
      switchTab('search');
      searchInput.value = q;
      executeSearch(q);
    });
    aiChipsContainer.appendChild(chip);
  });
}

// User History Tracking
function logTrackHistory(track) {
  if (!appData.history) appData.history = [];
  appData.history.unshift({
    title: track.title,
    author: track.author,
    playedAt: Date.now()
  });
  if (appData.history.length > 50) appData.history.pop();
  saveAppData();
}

// Theme & Wallpaper Handlers
function applyTheme(themeClass) {
  document.body.className = '';
  document.body.classList.add(themeClass);
}

function applyWallpaperSettings() {
  if (appData.customWallpaper) {
    wallpaperBackdrop.style.backgroundImage = `url(${appData.customWallpaper})`;
    wallpaperBackdrop.style.filter = `blur(${appData.blurWallpaper || 15}px)`;
    wallpaperBackdrop.style.opacity = (appData.wallpaperOpacity || 25) / 100;
    btnClearWallpaper.style.display = 'block';
  } else {
    wallpaperBackdrop.style.backgroundImage = 'none';
    btnClearWallpaper.style.display = 'none';
  }
}

function applySettingsFormValues() {
  // Sync all source checkboxes and chips
  syncSourceSelectors();

  // Themes
  themeChips.forEach(c => {
    c.classList.toggle('active', c.dataset.theme === appData.theme);
  });

  // Wallpaper sliders
  blurSlider.value = appData.blurWallpaper || 15;
  blurVal.textContent = `${blurSlider.value}px`;
  opacitySlider.value = appData.wallpaperOpacity || 25;
  opacityVal.textContent = `${opacitySlider.value}%`;

  // Hotkeys
  if (appData.hotkeys) {
    if (inputPlayPauseKey) inputPlayPauseKey.value = appData.hotkeys.playPause || 'Ctrl+End';
    if (inputNextKey) inputNextKey.value = appData.hotkeys.next || 'Ctrl+Right';
    activeHotkeyBadge.textContent = appData.hotkeys.playPause || 'Ctrl+End';
  }

  // Gemini API Key
  geminiApiKeyInput.value = appData.geminiApiKey || '';
}

function syncSourceSelectors() {
  if (!appData.activeSources || !Array.isArray(appData.activeSources) || appData.activeSources.length === 0) {
    appData.activeSources = ['promodj', 'stations', 'zaycev', 'radio', 'banana', 'garden'];
  }

  // Checkboxes in Settings tab
  sourceCheckboxes.forEach(cb => {
    cb.checked = appData.activeSources.includes(cb.dataset.source);
  });

  // Chips in Search tab
  searchSourceChips.forEach(chip => {
    chip.classList.toggle('active', appData.activeSources.includes(chip.dataset.source));
  });

  // Fast toggle button in search tab
  if (btnToggleAllSourcesFast) {
    if (appData.activeSources.length === 6) {
      btnToggleAllSourcesFast.textContent = '✓ Все подключены';
      btnToggleAllSourcesFast.style.opacity = '1';
    } else {
      btnToggleAllSourcesFast.textContent = `+ Выбрать все (${appData.activeSources.length}/6)`;
      btnToggleAllSourcesFast.style.opacity = '0.85';
    }
  }

  // Header badge
  const map = {
    promodj: 'PromoDJ',
    stations: 'Топ Радио',
    zaycev: 'Зайцев.FM',
    radio: 'Radio-Browser',
    banana: 'BananaStreet',
    garden: 'Radio Garden'
  };
  if (appData.activeSources.length === 6) {
    sourceBadge.textContent = 'Все сервисы (6)';
  } else if (appData.activeSources.length === 1) {
    sourceBadge.textContent = map[appData.activeSources[0]] || appData.activeSources[0];
  } else {
    sourceBadge.textContent = `${appData.activeSources.length} сервиса`;
  }
}

function saveAppData() {
  window.api.saveAppData(appData);
}

// Toast
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// VOICE MEMO & NOTES MODULE (F8 Hotkey)
// ==========================================
async function toggleVoiceRecording() {
  if (isRecordingVoice) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await processRecordedAudio(audioBlob);
    };

    mediaRecorder.start();
    isRecordingVoice = true;

    // Smoothly fade out music or pause
    fadeOutAndPause();

    // UI state
    btnManualRecord.classList.add('recording');
    recBtnText.textContent = 'Идёт запись (Жми F8 или сюда для стопа)...';
    showToast('🎙️ Запись голоса включена (музыка на паузе)');
  } catch (err) {
    console.error('Microphone error:', err);
    showToast('Ошибка микрофона: ' + err.message);
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && isRecordingVoice) {
    mediaRecorder.stop();
    isRecordingVoice = false;
    btnManualRecord.classList.remove('recording');
    recBtnText.textContent = 'Записать голос';
    showToast('Запись остановлена, распознаю речь...');

    // Smoothly resume music
    fadeInAndResume();
  }
}

async function processRecordedAudio(blob) {
  // Convert blob to base64
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const base64Data = reader.result.split(',')[1];
    
    // Call Gemini to transcribe
    const res = await window.api.transcribeAudio({
      audioBase64: base64Data,
      mimeType: blob.type || 'audio/webm',
      apiKey: appData.geminiApiKey || ''
    });

    if (res.success && res.text) {
      addNote(res.text);
      showToast('✅ Мысль сохранена в Блокнот!');
    } else {
      // Fallback: save placeholder or error
      const fallbackText = `Голосовая заметка (${new Date().toLocaleTimeString('ru-RU')}) [Транскрипция: ${res.error || 'Требуется API ключ'}]`;
      addNote(fallbackText);
      showToast(res.error || 'Заметка сохранена');
    }
  };
}

function fadeOutAndPause() {
  if (!audio.paused) {
    let vol = audio.volume;
    const fade = setInterval(() => {
      vol -= 0.15;
      if (vol <= 0.05) {
        clearInterval(fade);
        audio.pause();
        audio.volume = parseFloat(volumeSlider.value);
      } else {
        audio.volume = vol;
      }
    }, 40);
  }
}

function fadeInAndResume() {
  audio.volume = 0.05;
  audio.play().then(() => {
    let targetVol = parseFloat(volumeSlider.value);
    let vol = 0.05;
    const fade = setInterval(() => {
      vol += 0.15;
      if (vol >= targetVol) {
        clearInterval(fade);
        audio.volume = targetVol;
      } else {
        audio.volume = vol;
      }
    }, 50);
  }).catch(e => console.warn(e));
}

function addNote(text) {
  if (!appData.notes) appData.notes = [];
  const note = {
    id: Date.now().toString(),
    text: text,
    createdAt: new Date().toLocaleString('ru-RU')
  };
  appData.notes.unshift(note);
  saveAppData();
  renderNotesList();
}

function renderNotesList() {
  if (!appData.notes || appData.notes.length === 0) {
    notesList.innerHTML = '';
    emptyNotes.style.display = 'flex';
    return;
  }
  emptyNotes.style.display = 'none';
  notesList.innerHTML = '';

  appData.notes.forEach((n, idx) => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <div class="note-card-meta">
        <span>📅 ${escapeHtml(n.createdAt)}</span>
        <button class="action-icon-btn del-note-btn" title="Удалить заметку">&times;</button>
      </div>
      <div class="note-card-text">${escapeHtml(n.text)}</div>
      <div class="note-card-actions">
        <button class="action-btn copy-btn" style="font-size: 11px; padding: 4px 8px;">📋 Копировать</button>
      </div>
    `;

    card.querySelector('.copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(n.text);
      showToast('Скопировано в буфер обмена!');
    });

    card.querySelector('.del-note-btn').addEventListener('click', () => {
      appData.notes.splice(idx, 1);
      saveAppData();
      renderNotesList();
    });

    notesList.appendChild(card);
  });
}

// ==========================================
// UNIVERSAL AI PLAYLIST & USB EXPORT MODULE
// ==========================================
async function generateAiMoodPlaylist() {
  const userText = playlistThemeInput.value.trim() || 'Вечерний Deep House в дорогу, закат за рулём';
  const targetCount = parseInt(playlistCountSelect.value, 10) || 20;

  playlistBuildingIndicator.style.display = 'flex';
  if (playlistIndicatorText) {
    playlistIndicatorText.textContent = 'ИИ анализирует настроение, мысли и вайб...';
  }
  builtPlaylistTracks.innerHTML = '';
  emptyPlaylistState.style.display = 'none';
  playlistExportBar.style.display = 'none';
  if (vibeDetectedCard) vibeDetectedCard.style.display = 'none';

  try {
    // 1. Analyze user text/thoughts via AI
    const vibeRes = await window.api.generatePlaylistFromText({
      text: userText,
      apiKey: appData.geminiApiKey || '',
      count: targetCount
    });

    currentDetectedVibe = vibeRes;

    // Display vibe card if available
    if (vibeDetectedCard && vibeRes.success) {
      vibeTitleText.textContent = vibeRes.vibeTitle || 'Персональный ИИ-Сет';
      vibeDescText.textContent = vibeRes.vibeDesc || 'Музыка под ваше состояние';
      vibeQueriesPills.innerHTML = '';
      (vibeRes.queries || []).forEach(q => {
        const pill = document.createElement('span');
        pill.className = 'vibe-query-pill';
        pill.textContent = q;
        vibeQueriesPills.appendChild(pill);
      });
      vibeDetectedCard.style.display = 'flex';
    }

    if (playlistIndicatorText) {
      const qText = (vibeRes.queries || []).slice(0, 3).join(', ');
      playlistIndicatorText.textContent = `Поиск треков по стилям [${qText}]...`;
    }

    // 2. Fetch tracks across queries
    let collected = [];
    const searchQueries = (vibeRes.queries && vibeRes.queries.length > 0) ? vibeRes.queries : [userText];

    for (const q of searchQueries) {
      if (collected.length >= targetCount) break;
      const results = await window.api.searchMusic({ source: 'promodj', query: q });
      if (results && results.length > 0) {
        for (const t of results) {
          if (!collected.some(c => c.streamUrl === t.streamUrl)) {
            collected.push(t);
            if (collected.length >= targetCount) break;
          }
        }
      }
    }

    // Fallback if PromoDJ yielded fewer tracks
    if (collected.length < 5) {
      const fallbackResults = await window.api.searchMusic({ source: 'stations', query: 'all' });
      if (fallbackResults && fallbackResults.length > 0) {
        for (const t of fallbackResults) {
          if (!collected.some(c => c.streamUrl === t.streamUrl)) {
            collected.push(t);
            if (collected.length >= targetCount) break;
          }
        }
      }
    }

    playlistBuildingIndicator.style.display = 'none';

    if (collected.length === 0) {
      emptyPlaylistState.style.display = 'flex';
      emptyPlaylistState.querySelector('p').textContent = 'Не удалось найти треки для этого сета. Попробуйте скорректировать запрос.';
      return;
    }

    currentBuiltPlaylist = collected;
    playlistSummaryTitle.textContent = vibeRes.vibeTitle || userText.slice(0, 30);
    playlistSummaryMeta.textContent = `${collected.length} треков • Готов к прослушиванию и заливке на USB`;
    playlistExportBar.style.display = 'flex';

    renderTracklist(currentBuiltPlaylist, builtPlaylistTracks);
    showToast(`✨ ИИ собрал сет из ${collected.length} треков под ваше настроение!`);
  } catch (err) {
    playlistBuildingIndicator.style.display = 'none';
    emptyPlaylistState.style.display = 'flex';
    emptyPlaylistState.querySelector('p').textContent = 'Ошибка сборки сета: ' + err.message;
  }
}

// Backward-compat alias
const generateCarPlaylist = generateAiMoodPlaylist;

async function exportCurrentPlaylistToUsb() {
  if (!currentBuiltPlaylist || currentBuiltPlaylist.length === 0) return;

  const folderPath = await window.api.selectFolder();
  if (!folderPath) return;

  const titleForFolder = (currentDetectedVibe && currentDetectedVibe.vibeTitle) 
    ? currentDetectedVibe.vibeTitle 
    : (playlistThemeInput.value.trim() || 'AI_Mood_Playlist');

  const cleanFolderName = titleForFolder.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_').slice(0, 32);

  showToast(`⏳ Начинаю скачивание ${currentBuiltPlaylist.length} треков в ${folderPath}...`);

  const res = await window.api.exportPlaylistToFolder({
    folderPath: folderPath,
    playlistName: cleanFolderName,
    tracks: currentBuiltPlaylist
  });

  if (res.success) {
    showToast(`🎉 Успешно! Скачано ${res.downloadedCount} треков с нумерацией 01, 02... и плейлистом .m3u!`);
  } else {
    showToast(`Ошибка экспорта: ${res.error}`);
  }
}

// ================= POWER TIMER & SMART WATCHDOG CONTROLS =================
function initPowerTimerControls() {
  // Titlebar button jump to timer card
  if (btnQuickSleepTimer) {
    btnQuickSleepTimer.addEventListener('click', () => {
      switchTab('settings');
      setTimeout(() => {
        if (powerTimerSettingsCard) {
          powerTimerSettingsCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          powerTimerSettingsCard.classList.add('pulse-highlight');
          setTimeout(() => powerTimerSettingsCard.classList.remove('pulse-highlight'), 1500);
        }
      }, 50);
    });
  }

  // Cancel grace button on banner
  if (btnCancelSleepGrace) {
    btnCancelSleepGrace.addEventListener('click', async () => {
      await window.api.cancelPowerTimer();
      if (sleepGraceWarningBanner) sleepGraceWarningBanner.style.display = 'none';
      showToast('Таймер сна ПК успешно отменён!');
    });
  }

  // Mode switcher tabs (countdown vs watchdog)
  powerModeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      powerModeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedPowerMode = tab.dataset.mode;

      if (selectedPowerMode === 'countdown') {
        powerSubpaneCountdown.style.display = 'flex';
        powerSubpaneWatchdog.style.display = 'none';
        startPowerBtnLabel.textContent = selectedPowerAction === 'sleep' ? 'Запустить таймер сна' : 'Запустить таймер выключения';
      } else {
        powerSubpaneCountdown.style.display = 'none';
        powerSubpaneWatchdog.style.display = 'flex';
        startPowerBtnLabel.textContent = '👁️ Запустить Watchdog процессов';
      }
    });
  });

  // Countdown preset chips
  powerPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      powerPresetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      inputPowerMinutes.value = chip.dataset.mins;
    });
  });

  inputPowerMinutes.addEventListener('input', () => {
    const val = inputPowerMinutes.value;
    powerPresetChips.forEach(c => c.classList.toggle('active', c.dataset.mins === val));
  });

  // Watchdog process preset chips
  procPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      procPresetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      inputWatchdogProcess.value = chip.dataset.proc;
    });
  });

  // Refresh processes list
  if (btnRefreshProcesses) {
    btnRefreshProcesses.addEventListener('click', async () => {
      btnRefreshProcesses.textContent = 'Поиск...';
      const procs = await window.api.getRunningProcesses();
      btnRefreshProcesses.textContent = '🔄 Процессы';
      renderLiveProcessPills(procs);
    });
  }

  // Condition chips
  condChips.forEach(chip => {
    chip.addEventListener('click', () => {
      condChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedWatchdogCondition = chip.dataset.cond;
      if (watchdogThresholdRow) {
        watchdogThresholdRow.style.display = (selectedWatchdogCondition === 'idle') ? 'flex' : 'none';
      }
    });
  });

  // Threshold chips
  threshChips.forEach(chip => {
    chip.addEventListener('click', () => {
      threshChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedWatchdogThreshold = parseInt(chip.dataset.thresh, 10);
    });
  });

  // Action chips (sleep vs shutdown)
  actionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      actionChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedPowerAction = chip.dataset.action;
      if (selectedPowerMode === 'countdown') {
        startPowerBtnLabel.textContent = selectedPowerAction === 'sleep' ? 'Запустить таймер сна' : 'Запустить таймер выключения';
      }
    });
  });

  // Start Power Timer
  btnStartPowerTimer.addEventListener('click', async () => {
    const minutes = Math.max(1, parseInt(inputPowerMinutes.value, 10) || 15);
    const proc = (inputWatchdogProcess.value || 'python').trim();

    const params = {
      mode: selectedPowerMode,
      action: selectedPowerAction,
      minutes: minutes,
      targetProcess: proc,
      condition: selectedWatchdogCondition,
      idleMinutesThreshold: selectedWatchdogThreshold
    };

    const res = await window.api.startPowerTimer(params);
    if (res && res.success) {
      if (selectedPowerMode === 'countdown') {
        showToast(`🌙 Таймер запущен: ${selectedPowerAction === 'sleep' ? 'сон' : 'выключение'} через ${minutes} мин`);
      } else {
        showToast(`👁️ Watchdog запущен для [${proc}]: ${selectedPowerAction === 'sleep' ? 'сон' : 'выключение'}`);
      }
    }
  });

  // Cancel Power Timer
  btnCancelPowerTimer.addEventListener('click', async () => {
    await window.api.cancelPowerTimer();
    showToast('Таймер питания ПК отменён');
  });

  if (btnCancelPowerTimerDirect) {
    btnCancelPowerTimerDirect.addEventListener('click', async () => {
      await window.api.cancelPowerTimer();
      showToast('Таймер питания ПК отменён');
    });
  }

  // Subscribe to ticks from main process
  window.api.onPowerTimerTick((state) => {
    renderPowerTimerState(state);
  });

  // Subscribe to warnings
  window.api.onPowerTimerWarning((data) => {
    showPowerWarningBanner(data);
  });

  // Sync initial state
  window.api.getPowerTimerStatus().then(renderPowerTimerState);
}

function renderLiveProcessPills(procs) {
  if (!liveProcessesPillsRow) return;
  liveProcessesPillsRow.innerHTML = '';
  if (!procs || procs.length === 0) {
    liveProcessesPillsRow.style.display = 'none';
    return;
  }
  liveProcessesPillsRow.style.display = 'flex';
  procs.forEach(p => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'live-proc-pill';
    pill.textContent = p;
    pill.addEventListener('click', () => {
      inputWatchdogProcess.value = p;
      procPresetChips.forEach(c => c.classList.toggle('active', c.dataset.proc === p));
    });
    liveProcessesPillsRow.appendChild(pill);
  });
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderPowerTimerState(state) {
  if (!state || !state.active) {
    // Inactive
    if (powerTimerStatusBadge) {
      powerTimerStatusBadge.textContent = 'Отключён';
      powerTimerStatusBadge.className = 'timer-status-badge inactive';
    }
    if (powerActiveStatusBox) powerActiveStatusBox.style.display = 'none';
    if (btnCancelPowerTimer) btnCancelPowerTimer.style.display = 'none';
    if (btnCancelPowerTimerDirect) btnCancelPowerTimerDirect.style.display = 'none';
    if (btnStartPowerTimer) btnStartPowerTimer.style.display = 'inline-flex';
    if (sleepGraceWarningBanner) sleepGraceWarningBanner.style.display = 'none';
    if (quickSleepBadge) quickSleepBadge.style.display = 'none';
    if (btnQuickSleepTimer) btnQuickSleepTimer.classList.remove('active-timer');
    return;
  }

  // Active timer
  const actionLabel = state.action === 'sleep' ? 'Сон' : 'Выключение';
  if (btnCancelPowerTimer) btnCancelPowerTimer.style.display = 'inline-flex';
  if (btnCancelPowerTimerDirect) btnCancelPowerTimerDirect.style.display = 'inline-block';
  if (btnStartPowerTimer) btnStartPowerTimer.style.display = 'none';
  if (powerActiveStatusBox) powerActiveStatusBox.style.display = 'flex';

  if (btnQuickSleepTimer) btnQuickSleepTimer.classList.add('active-timer');

  if (state.inGrace) {
    if (powerTimerStatusBadge) {
      powerTimerStatusBadge.textContent = `⚠️ Предупреждение (${state.graceSecondsRemaining}с)`;
      powerTimerStatusBadge.className = 'timer-status-badge warning';
    }
    if (powerActiveHeadline) powerActiveHeadline.textContent = `⚠️ Переход в ${actionLabel} через:`;
    if (powerActiveCountdown) powerActiveCountdown.textContent = formatTime(state.graceSecondsRemaining);
    if (powerActiveSubtext) powerActiveSubtext.textContent = 'Нажмите «Отменить таймер», если хотите продолжить работу';

    if (quickSleepBadge) {
      quickSleepBadge.style.display = 'inline-block';
      quickSleepBadge.textContent = `${state.graceSecondsRemaining}с`;
      quickSleepBadge.style.background = '#ef4444';
    }

    if (sleepGraceWarningBanner) {
      sleepGraceWarningBanner.style.display = 'flex';
      graceTitleText.textContent = `⚠️ ПК перейдёт в ${actionLabel} через ${state.graceSecondsRemaining} сек!`;
      graceDescText.textContent = state.statusText || 'Таймер сработал. Нажмите «Отменить», если вы ещё работаете.';
    }
  } else if (state.mode === 'countdown') {
    if (powerTimerStatusBadge) {
      powerTimerStatusBadge.textContent = `⏳ ${actionLabel} (${formatTime(state.remainingSeconds)})`;
      powerTimerStatusBadge.className = 'timer-status-badge active';
    }
    if (powerActiveHeadline) powerActiveHeadline.textContent = `⏳ До ${actionLabel.toLowerCase()} ПК осталось:`;
    if (powerActiveCountdown) powerActiveCountdown.textContent = formatTime(state.remainingSeconds);
    if (powerActiveSubtext) powerActiveSubtext.textContent = `ПК перейдёт в ${state.action === 'sleep' ? 'режим сна (Suspend)' : 'полное выключение (Shutdown)'}. Музыка плавно затихнет.`;

    if (quickSleepBadge) {
      quickSleepBadge.style.display = 'inline-block';
      const m = Math.ceil(state.remainingSeconds / 60);
      quickSleepBadge.textContent = m >= 60 ? `${Math.floor(m / 60)}ч` : `${m}м`;
      quickSleepBadge.style.background = 'var(--primary)';
    }

    if (sleepGraceWarningBanner) sleepGraceWarningBanner.style.display = 'none';
  } else {
    // Watchdog mode
    if (powerTimerStatusBadge) {
      powerTimerStatusBadge.textContent = `👁️ Watchdog [${state.targetProcess}]`;
      powerTimerStatusBadge.className = 'timer-status-badge active';
    }
    if (powerActiveHeadline) powerActiveHeadline.textContent = `👁️ Наблюдение за [${state.targetProcess}]:`;
    if (powerActiveCountdown) powerActiveCountdown.textContent = state.statusText || 'Мониторинг...';
    if (powerActiveSubtext) powerActiveSubtext.textContent = `При завершении или простое более ${state.idleMinutesThreshold} мин — ПК перейдёт в ${actionLabel.toLowerCase()}.`;

    if (quickSleepBadge) {
      quickSleepBadge.style.display = 'inline-block';
      quickSleepBadge.textContent = 'AI 👁️';
      quickSleepBadge.style.background = '#0ea5e9';
    }

    if (sleepGraceWarningBanner) sleepGraceWarningBanner.style.display = 'none';
  }
}

function showPowerWarningBanner(data) {
  if (sleepGraceWarningBanner) {
    sleepGraceWarningBanner.style.display = 'flex';
    graceTitleText.textContent = `⚠️ Внимание! ПК перейдёт в ${data.action === 'sleep' ? 'режим сна' : 'выключение'} через ${data.graceSecondsRemaining || 60} сек!`;
    graceDescText.textContent = data.message || 'Нажмите «Отменить», если вы ещё работаете за компьютером';
  }

  // Soft audio fade out
  if (audio && !audio.paused && audio.volume > 0.1) {
    const fadeStep = audio.volume / 20;
    const fadeInterval = setInterval(() => {
      if (audio.volume > fadeStep) {
        audio.volume = Math.max(0, audio.volume - fadeStep);
      } else {
        audio.pause();
        clearInterval(fadeInterval);
      }
    }, 1000);
  }
}

