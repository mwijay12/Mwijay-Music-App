import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipForward, SkipBack, Info, BookOpen, 
  Award, Bell, Volume2, Globe, Clock, ChevronDown, Check, LogOut 
} from 'lucide-react';
import { DailyQuote } from './DailyQuote.tsx';
import { quotesService } from '../services/quotesService.ts';
import { wikipediaService, WikiSummary } from '../services/wikipediaService.ts';
import { notificationService, NotificationSettings } from '../services/notificationService.ts';
import { getLocalDateString } from '../utils/gamification.ts';

// Local storage key for Tanzania #1 Chart item cache to save network on mount
const TZ_CHART_CACHE_KEY = 'mwijay_tz_chart_cache';

export const SimpleMode: React.FC = () => {
  // 1. Reactive Audio / Control States
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeText, setCurrentTimeText] = useState<string>('');
  const [greetingText, setGreetingText] = useState<string>('');

  // 2. Wikipedia Artist States
  const [wikiSummary, setWikiSummary] = useState<WikiSummary | null>(null);
  const [wikiLoading, setWikiLoading] = useState<boolean>(false);
  const [lastWikiArtist, setLastWikiArtist] = useState<string>('');

  // 3. iTunes Tanzania #1 State
  const [chartSong, setChartSong] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(true);
  const [previewPlaying, setPreviewPlaying] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // 4. Local Notification Settings States
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    dailyQuote: false,
    quoteTime: "08:00",
    enabled: false
  });
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [notifSuccess, setNotifSuccess] = useState<boolean>(false);

  // Synchronize React state with the global audioEngine / window controls
  const updateGlobalStates = () => {
    if ((window as any).mwijayControls) {
      const controls = (window as any).mwijayControls;
      setNowPlaying(controls.nowPlaying);
      setIsPlaying(controls.isPlaying);
    }
  };

  useEffect(() => {
    updateGlobalStates();

    // Listen to mwijay global audio states
    window.addEventListener('mwijay-audio-state', updateGlobalStates);
    return () => {
      window.removeEventListener('mwijay-audio-state', updateGlobalStates);
    };
  }, []);

  // Update dates & time-based greetings
  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const d = new Date();
      const hour = d.getHours();
      
      // Greetings logic
      if (hour >= 5 && hour < 12) {
        setGreetingText("Good Morning ☀️");
      } else if (hour >= 12 && hour < 17) {
        setGreetingText("Good Afternoon 🌤");
      } else if (hour >= 17 && hour < 21) {
        setGreetingText("Good Evening 🌅");
      } else {
        setGreetingText("Good Night 🌙");
      }

      // Format current Date nicely (e.g. Wednesday, January 15, 2025)
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setCurrentTimeText(d.toLocaleDateString('en-US', options));
    };

    updateTimeAndGreeting();
    const interval = setInterval(updateTimeAndGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load Wikipedia artist bio when artist changes
  useEffect(() => {
    const loadArtistBio = async () => {
      if (!nowPlaying) {
        setWikiSummary(null);
        setLastWikiArtist('');
        return;
      }

      const artist = nowPlaying.artist || 'Unknown Artist';
      if (artist === lastWikiArtist) return;

      setLastWikiArtist(artist);
      setWikiLoading(true);
      try {
        const bio = await wikipediaService.getArtistBio(artist);
        setWikiSummary(bio);
      } catch (e) {
        console.error("Failed to load Wikipedia artist bio:", e);
      } finally {
        setWikiLoading(false);
      }
    };

    loadArtistBio();
  }, [nowPlaying, lastWikiArtist]);

  // Load Tanzania Top 1 iTunes Chart on mount
  useEffect(() => {
    const loadTzChart = async () => {
      // 1. Try local cache first
      try {
        const cached = localStorage.getItem(TZ_CHART_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          // 30 mins TTL
          if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            setChartSong(parsed.song);
            setChartLoading(false);
            return;
          }
        }
      } catch (e) {}

      // 2. Fetch fresh top song
      try {
        const url = 'https://itunes.apple.com/tz/rss/topsongs/limit=1/json';
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (response.ok) {
          const data = await response.json();
          const entry = Array.isArray(data.feed.entry) ? data.feed.entry[0] : data.feed.entry;
          
          if (entry) {
            const links = Array.isArray(entry.link) ? entry.link : [entry.link];
            const previewUrl = links.find((l: any) => l.attributes?.rel === 'enclosure')?.attributes?.href || '';
            const images = entry['im:image'] || [];
            const highResArt = images.length > 0 ? images[images.length - 1].label : '';

            const song = {
              title: entry['im:name']?.label || 'Untitled Top Track',
              artist: entry['im:artist']?.label || 'Unknown Artist',
              albumArtUrl: highResArt,
              previewUrl,
            };

            setChartSong(song);
            localStorage.setItem(TZ_CHART_CACHE_KEY, JSON.stringify({ song, timestamp: Date.now() }));
          }
        }
      } catch (e) {
        console.warn("Failed to fetch iTunes charts, using local chart fallback:", e);
        // Fallback Tanzanian chart top-song details
        setChartSong({
          title: "Single Again",
          artist: "Harmonize",
          albumArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/bf/25/71/bf2571b0-13f5-79ad-8032-4d7a46ad4775/cover.jpg/100x100bb.jpg",
          previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/4a/1c/eb/4a1ceba9-2d1e-9764-f655-e4f6dfbf466a/m4a.audiopreview.medium.plus.aac.p.m4a"
        });
      } finally {
        setChartLoading(false);
      }
    };

    loadTzChart();
  }, []);

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // Toggle play for Tanzanian Top 1 preview
  const handleTogglePreview = () => {
    if (!chartSong?.previewUrl) return;

    if (previewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewPlaying(false);
    } else {
      // Pause main player first if it's playing
      const controls = (window as any).mwijayControls;
      if (controls && isPlaying) {
        controls.togglePlay();
      }

      if (!previewAudioRef.current) {
        const audio = new Audio(chartSong.previewUrl);
        audio.onended = () => {
          setPreviewPlaying(false);
        };
        previewAudioRef.current = audio;
      }

      previewAudioRef.current.play().catch(e => {
        console.error("Preview playback failed:", e);
      });
      setPreviewPlaying(true);
    }
  };

  // Load notification permissions and settings on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const settings = await notificationService.getSettings();
        setNotifSettings(settings);
        setHasPermission(settings.enabled);
      } catch (e) {
        console.error("Failed to load notification settings:", e);
      }
    };

    loadNotifications();
  }, []);

  // Request notifications permission from within UI
  const handleRequestPermission = async () => {
    const permitted = await notificationService.requestPermission();
    setHasPermission(permitted);
    if (permitted) {
      const current = await notificationService.getSettings();
      const updated = { ...current, enabled: true, dailyQuote: true };
      setNotifSettings(updated);
      await notificationService.saveSettings(updated);
      showNotifSuccessToast();
    }
  };

  // Toggle notification preference
  const handleToggleNotif = async () => {
    if (!hasPermission) {
      await handleRequestPermission();
      return;
    }

    const updated = {
      ...notifSettings,
      dailyQuote: !notifSettings.dailyQuote
    };
    setNotifSettings(updated);
    await notificationService.saveSettings(updated);
    showNotifSuccessToast();
  };

  // Update daily quote reminder time
  const handleTimeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const time = e.target.value;
    const updated = {
      ...notifSettings,
      quoteTime: time
    };
    setNotifSettings(updated);
    await notificationService.saveSettings(updated);
    showNotifSuccessToast();
  };

  const showNotifSuccessToast = () => {
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2000);
  };

  // Player handlers
  const handlePlayPause = () => {
    // If a preview is currently playing, stop it first
    if (previewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
    }

    const controls = (window as any).mwijayControls;
    if (controls) {
      controls.togglePlay();
    }
  };

  const handleNextTrack = () => {
    const controls = (window as any).mwijayControls;
    if (controls) {
      controls.playNext();
    }
  };

  const handlePrevTrack = () => {
    const controls = (window as any).mwijayControls;
    if (controls) {
      controls.playPrev();
    }
  };

  const handleExitSimpleMode = () => {
    const controls = (window as any).mwijayControls;
    if (controls) {
      controls.exitSimpleMode();
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black/95 text-white p-6 pb-24 overflow-y-auto font-sans flex flex-col gap-6 selection:bg-purple-500/30">
      
      {/* Background soft lighting overlays */}
      <div className="absolute right-[10%] top-[5%] h-80 w-80 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute left-[5%] bottom-[15%] h-80 w-80 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between w-full border-b border-white/5 pb-4 z-10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white/90">{greetingText}</h2>
          <p className="text-xs text-neutral-400 font-medium mt-1 uppercase tracking-wider">{currentTimeText}</p>
        </div>
        <button
          onClick={handleExitSimpleMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] active:scale-95 transition-all"
        >
          <LogOut size={12} className="text-purple-400" />
          <span>Exit Simple</span>
        </button>
      </div>

      {/* CARD 1: DAILY QUOTE OF THE DAY */}
      <div className="w-full max-w-lg mx-auto z-10">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
          <span>💬 Quote of the Day</span>
        </div>
        <DailyQuote size="large" showControls={true} autoRefresh={false} />
      </div>

      {/* CARD 2: NOW PLAYING PLAYER */}
      <div className="w-full max-w-lg mx-auto z-10">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
          <span>🎵 Now Playing</span>
        </div>
        
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl hover:border-white/20 transition-all duration-300">
          <div className="flex items-center gap-4 w-full">
            {/* Album Art */}
            <div className="h-16 w-16 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-neutral-900 shadow-md">
              {nowPlaying?.albumArtUrl ? (
                <img 
                  src={nowPlaying.albumArtUrl} 
                  alt={nowPlaying.title} 
                  className={`h-full w-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
                  <span className="text-xl">🎵</span>
                </div>
              )}
            </div>

            {/* Song Meta info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                {nowPlaying ? nowPlaying.title : "No Song Playing"}
              </h3>
              <p className="text-xs text-purple-300 mt-0.5 truncate font-medium">
                {nowPlaying ? nowPlaying.artist : "Select a song from Explore or Library"}
              </p>
            </div>

            {/* Simple Native Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevTrack}
                disabled={!nowPlaying}
                className="p-2.5 rounded-full bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <SkipBack size={18} />
              </button>

              <button 
                onClick={handlePlayPause}
                disabled={!nowPlaying}
                className="p-3 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                {isPlaying ? <Pause size={20} className="fill-white" /> : <Play size={20} className="fill-white ml-0.5" />}
              </button>

              <button 
                onClick={handleNextTrack}
                disabled={!nowPlaying}
                className="p-2.5 rounded-full bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <SkipForward size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: WIKIPEDIA ARTIST BIO */}
      <AnimatePresence mode="wait">
        {nowPlaying && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-lg mx-auto z-10"
          >
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
              <span>📖 Artist Info</span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl hover:border-white/20 transition-all duration-300">
              {wikiLoading ? (
                // SKELETON LOADER
                <div className="flex flex-col gap-3 animate-pulse">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-white/10 rounded" />
                      <div className="h-3 w-20 bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <div className="h-3.5 w-full bg-white/10 rounded" />
                    <div className="h-3.5 w-5/6 bg-white/10 rounded" />
                    <div className="h-3.5 w-4/6 bg-white/10 rounded" />
                  </div>
                </div>
              ) : wikiSummary ? (
                // BIO CARD RENDER
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-4">
                    {wikiSummary.image && (
                      <img 
                        src={wikiSummary.image} 
                        alt={wikiSummary.title}
                        className="h-12 w-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                      />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{wikiSummary.title}</span>
                        {wikiSummary.found && <BookOpen size={12} className="text-purple-400" />}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">{wikiSummary.description}</p>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-neutral-300 leading-relaxed font-light mt-1">
                    {wikiSummary.shortBio}
                  </p>

                  <div className="flex justify-end w-full border-t border-white/5 pt-3 mt-1">
                    <button
                      onClick={() => window.open(wikiSummary.wikiUrl, '_blank')}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <span>Read More</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 text-center py-4">
                  Select a song to discover biography details about the artist.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD 4: TANZANIA CHART #1 TODAY */}
      <div className="w-full max-w-lg mx-auto z-10">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
          <span>📊 Tanzania Chart #1 Today</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl hover:border-white/20 transition-all duration-300">
          {chartLoading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-14 w-14 bg-white/10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-white/10 rounded" />
                <div className="h-3 w-16 bg-white/10 rounded" />
              </div>
              <div className="h-10 w-10 bg-white/10 rounded-full" />
            </div>
          ) : chartSong ? (
            <div className="flex items-center gap-4 w-full">
              {/* Ranking badge */}
              <div className="text-base font-bold bg-gradient-to-br from-yellow-400 to-amber-500 text-black px-2 py-0.5 rounded-md flex items-center justify-center shadow-md">
                #1
              </div>

              {/* Cover Art */}
              <div className="h-14 w-14 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-neutral-900 shadow-md">
                {chartSong.albumArtUrl ? (
                  <img src={chartSong.albumArtUrl} alt={chartSong.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-indigo-900 flex items-center justify-center">🏆</div>
                )}
              </div>

              {/* Title & Artist */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{chartSong.title}</h4>
                <p className="text-xs text-neutral-400 mt-0.5 truncate">{chartSong.artist}</p>
              </div>

              {/* Preview play button */}
              {chartSong.previewUrl && (
                <button
                  onClick={handleTogglePreview}
                  className={`p-3 rounded-full shadow-lg transition-all active:scale-90 flex-shrink-0 ${
                    previewPlaying 
                      ? 'bg-purple-500 text-white shadow-purple-500/20 animate-pulse' 
                      : 'bg-white/[0.04] text-purple-400 border border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  {previewPlaying ? <Pause size={16} className="fill-white" /> : <Play size={16} className="fill-purple-400 ml-0.5" />}
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-neutral-400 text-center py-2">
              Failed to load hot Tanzanian charts. Check internet connection.
            </div>
          )}
        </div>
      </div>

      {/* CARD 5: DAILY QUOTE NOTIFICATIONS */}
      <div className="w-full max-w-lg mx-auto z-10">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400 px-1">
          <span>🔔 Daily Quote Reminder</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-xl backdrop-blur-xl hover:border-white/20 transition-all duration-300 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Get inspired every morning</h4>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Schedule a fresh local quote to be pushed automatically directly to your device offline.
              </p>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggleNotif}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                hasPermission && notifSettings.dailyQuote ? 'bg-purple-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  hasPermission && notifSettings.dailyQuote ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Time Picker and status */}
          <div className="flex items-center justify-between w-full border-t border-white/5 pt-3 mt-1 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Clock size={12} className="text-purple-400" />
              <span>Reminder Time:</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Permission/Time dropdown wrapper */}
              {!hasPermission ? (
                <button
                  onClick={handleRequestPermission}
                  className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 font-bold hover:bg-purple-500/30 active:scale-95 transition-all"
                >
                  Enable First
                </button>
              ) : (
                <div className="relative">
                  <select
                    value={notifSettings.quoteTime}
                    onChange={handleTimeChange}
                    className="appearance-none bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 pr-8 font-semibold text-neutral-200 focus:outline-none focus:border-purple-500/50 cursor-pointer text-xs"
                  >
                    {[
                      "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
                      "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
                      "18:00", "19:00", "20:00", "21:00", "22:00"
                    ].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success notification popup */}
      <AnimatePresence>
        {notifSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-purple-500/30 bg-purple-950/80 text-xs font-semibold text-purple-200 shadow-lg shadow-purple-950/40 backdrop-blur-md"
          >
            <Check size={12} className="text-green-400" />
            <span>Reminder settings updated!</span>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default SimpleMode;
