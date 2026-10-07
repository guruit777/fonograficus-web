"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Search, 
  Settings, Loader2, Music, Radio, Volume2, Moon
} from 'lucide-react';

const sourceLabels = {
  promodj: 'PromoDJ',
  stations: 'Top Stations',
  zaycev: 'Zaycev.FM',
  radio: 'Radio-Browser',
  banana: 'BananaStreet',
  garden: 'Radio Garden'
};

export default function App() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSources, setActiveSources] = useState(Object.keys(sourceLabels));
  
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const audioRef = useRef(null);

  // Initialize audio and MediaSession
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', handleNext);
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });
      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
    }
  }, []);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.author,
        artwork: [
          { src: currentTrack.avatar || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', playAudio);
      navigator.mediaSession.setActionHandler('pause', pauseAudio);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
    }
  }, [currentTrack]);

  const searchMusic = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() && !query) return;

    setIsLoading(true);
    try {
      const q = query.trim() || 'all';
      const sourcesParam = activeSources.join(',');
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}&sources=${sourcesParam}`);
      const data = await res.json();
      setTracks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async () => {
    try {
      if (audioRef.current && audioRef.current.src) {
        await audioRef.current.play();
      }
    } catch(e) {
      console.error('Play error', e);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) audioRef.current.pause();
  };

  const togglePlay = () => {
    if (isPlaying) pauseAudio();
    else playAudio();
  };

  const playTrack = (track) => {
    if (audioRef.current) {
      audioRef.current.src = track.streamUrl;
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
      setCurrentTrack(track);
    }
  };

  const handleNext = () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    if (idx >= 0 && idx < tracks.length - 1) {
      playTrack(tracks[idx + 1]);
    } else {
      playTrack(tracks[0]);
    }
  };

  const handlePrev = () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    if (idx > 0) {
      playTrack(tracks[idx - 1]);
    }
  };

  const toggleSource = (source) => {
    setActiveSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  return (
    <div className="flex flex-col h-screen w-full relative">
      <div className="animated-bg" />
      
      {/* Header */}
      <header className="glass p-4 flex flex-col gap-3 z-10 sticky top-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xl tracking-wider">
            <Radio className="w-6 h-6" />
            FONOGRAFICUS
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-white/5 rounded-full text-white hover:bg-white/10 transition">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {showSettings && (
          <div className="flex flex-wrap gap-2 py-2">
            {Object.entries(sourceLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleSource(key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                  activeSources.includes(key)
                    ? `source-${key} border-transparent`
                    : 'bg-transparent text-slate-400 border-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={searchMusic} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tracks, artists, styles..."
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 backdrop-blur-md"
          />
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
          <button type="submit" className="absolute right-2 top-2 bg-sky-500 hover:bg-sky-400 text-white p-1.5 rounded-lg transition">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>
      </header>

      {/* Track List */}
      <main className="flex-1 overflow-y-auto p-4 z-0 pb-32">
        {tracks.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 mt-20">
            <Music className="w-16 h-16 opacity-20" />
            <p className="text-center px-8">Discover music across the globe.</p>
            <button onClick={() => { setQuery('all'); searchMusic(); }} className="px-6 py-2 bg-sky-500/20 text-sky-400 rounded-full font-medium">
              Load Top Stations
            </button>
          </div>
        )}

        <div className="grid gap-3">
          {tracks.map((track) => {
            const isPlayingThis = currentTrack?.id === track.id;
            return (
              <div 
                key={track.id} 
                onClick={() => playTrack(track)}
                className={`glass-panel p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition transform active:scale-95 ${isPlayingThis ? 'ring-2 ring-sky-500 bg-slate-800/80' : 'hover:bg-slate-800/50'}`}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-800 relative">
                  {track.avatar ? (
                    <img src={track.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-6 h-6 text-slate-500" />
                    </div>
                  )}
                  {isPlayingThis && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{track.title}</div>
                  <div className="text-xs text-slate-400 truncate">{track.author}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide source-${track.source}`}>
                      {sourceLabels[track.source] || track.source}
                    </span>
                    <span className="text-[10px] text-slate-500">{track.duration}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Bottom Player */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 p-4 pb-safe z-20">
          {/* Progress bar (fake for radio, real for files) */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={currentTrack.avatar || 'https://via.placeholder.com/64'} 
                alt="" 
                className="w-12 h-12 rounded-lg object-cover shadow-lg" 
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{currentTrack.title}</div>
                <div className="text-xs text-slate-400 truncate">{currentTrack.author}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button onClick={handlePrev} className="text-slate-300 hover:text-white p-2">
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-14 h-14 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 active:scale-95 transition"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
              </button>

              <button onClick={handleNext} className="text-slate-300 hover:text-white p-2">
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safe Area bottom padding hack */}
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 1rem); }
      `}} />
    </div>
  );
}
