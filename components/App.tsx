import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { AnimatePresence } from 'framer-motion';
import HomeView from './HomeView';
import ReelsView from './ReelsView';
import LibraryView from './LibraryView';
import SettingsView from './SettingsView';
import RadioView from './RadioView';
import CreateView from './CreateView';
import MiniPlayer from './MiniPlayer';
import BottomNav from './BottomNav';
import PlayerOverlay from './PlayerOverlay';
import AssistantView from './AssistantView';
import Notification from './Notification';
import ProfileView from './ProfileView';
import CreatePlaylistModal from './CreatePlaylistModal';
import CustomizeAppearanceView from './CustomizeAppearanceView';
import CustomizeParticlesView from './CustomizeParticlesView';
import LyricsView from './LyricsView';
import MoodEmojiModal from './MoodEmojiModal';
import EqualizerModal from './EqualizerModal';
import NeonGlowModal from './NeonGlowModal';
import AssistantSettingsView from './AssistantSettingsView';
import HelpView from './HelpView';
import AnalyticsView from './AnalyticsView';
import WisdomCardView from './WisdomCardView';
import AddWisdomModal from './AddWisdomModal';
import AddMoodModal from './AddMoodModal';
import OnlineDiscoveryView from './OnlineDiscoveryView';
import ArtistView from './ArtistView';
import ManageRadioHubView from './ManageRadioHubView';
import PlaylistManagerModal from './PlaylistManagerModal';
import ImportPlaylistModal from './ImportPlaylistModal';
import ShareablePreviewModal from './ShareablePreviewModal';
import SimpleModeSettingsView from './SimpleModeSettingsView';
import PlaylistView from './PlaylistView';
import ReelPlaylistView from './ReelPlaylistView';
import { MultiStepLoader } from './MultiStepLoader';
import { useAssistant } from '../hooks/useAssistant';
import { useAudioFx } from '../hooks/useAudioFx';
import { initDB, getSongs, saveSongs, getPlaylists, savePlaylists, getProfile, saveProfile, getVideos, saveVideos, getReelPlaylists, saveReelPlaylists, getPlayQueue, savePlayQueue, getRadioPlaylists, saveRadioPlaylists, getArtists, saveArtist, fetchRadioAPI, fetchFromAudius, fetchFromArchive, fetchFromJamendo, defaultProfile } from './db';
import { navItems, themePairs as themes, fonts, achievements, FAVORITES_PLAYLIST_ID, allWisdom, getRandomCoverArt, defaultMoods } from '../constants';
import type { Song, RadioStation, Notification as NotificationType, Playlist, ProfileData, Achievement, Video, ThemeColors, ReelPlaylist, RadioPlaylist, Artist, ThemePair } from '../types';


const loadingStates = [
  { text: "🎵 Tuning your vibe..." },
  { text: "🌈 Blending gradients & glow..." },
  { text: "🎧 Personalizing your sound..." },
  { text: "✨ Animating micro‑interactions..." },
  { text: "🔊 Boosting bass & clarity..." },
];

const createVideoThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const timeout = 8000;
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Thumbnail generation timed out after ${timeout / 1000}s`));
        }, timeout);

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        
        const canvas = document.createElement('canvas');

        const cleanup = () => {
            clearTimeout(timer);
            video.removeEventListener('error', onError);
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('seeked', onSeeked);
            video.src = '';
            video.remove();
            canvas.remove();
        };

        const onError = () => {
            cleanup();
            reject(new Error('Video load error for thumbnail generation.'));
        };
        
        const onLoadedData = () => {
            video.currentTime = Math.min(1, video.duration / 2); 
        };
        
        const onSeeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                cleanup();
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            cleanup();
            resolve(dataUrl);
        };

        video.addEventListener('error', onError);
        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('seeked', onSeeked);

        video.src = videoUrl;
    });
};


const BackgroundEffects: React.FC<{ settings: ProfileData['settings']['backgroundEffects'] }> = React.memo(({ settings }) => {
    if (!settings.enabled || settings.style === 'none') return null;

    const effectContent = useMemo(() => {
        switch (settings.style) {
            case 'constellationDrift':
                return Array.from({ length: 50 }).map((_, i) => (
                    <div key={i} className="constellation-star" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        // @ts-ignore
                        '--x-end': `${(Math.random() - 0.5) * 80}px`,
                        '--y-end': `${(Math.random() - 0.5) * 80}px`,
                    }} />
                ));
            case 'spiritRise':
                return Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="spirit-particle" style={{
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 5 + 2}px`, height: `${Math.random() * 5 + 2}px`,
                        animationDuration: `${Math.random() * 15 + 10}s`,
                        animationDelay: `${Math.random() * 25}s`,
                    }} />
                ));
            case 'warpPulse':
                return Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="warp-pulse-circle" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 10 + 5}vw`, height: `${Math.random() * 10 + 5}vw`,
                        animationDelay: `${Math.random() * 4}s`,
                    }} />
                ));
            case 'fallingNotes':
                const notes = ['🎵', '🎶', '🎼', '♬'];
                return Array.from({ length: 30 }).map((_, i) => (
                    <span key={i} className="falling-note" style={{
                        left: `${Math.random() * 100}%`,
                        fontSize: `${Math.random() * 12 + 10}px`,
                        animationDuration: `${Math.random() * 8 + 6}s`,
                        animationDelay: `${Math.random() * 14}s`,
                    }}>
                        {notes[i % notes.length]}
                    </span>
                ));
            case 'cosmicDust':
                return Array.from({ length: 70 }).map((_, i) => {
                    const size = Math.random() * 2 + 1;
                    return (
                        <div key={i} className="cosmic-dust-particle" style={{
                            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                            width: `${size}px`, height: `${size}px`,
                            animationDuration: `${Math.random() * 15 + 10}s`,
                            animationDelay: `${Math.random() * 25}s`,
                            // @ts-ignore
                            '--x-end': `${(Math.random() - 0.5) * 200}px`,
                            '--y-end': `${(Math.random() - 0.5) * 200}px`,
                            '--s-end': `${Math.random() * 0.5 + 0.5}`,
                        }} />
                    )
                });
            case 'fireflies':
                return Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className="firefly" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 10 + 5}s`,
                        animationDelay: `${Math.random() * 15}s`,
                         // @ts-ignore
                        '--tx': `${(Math.random() - 0.5) * 80}px`,
                        '--ty': `${(Math.random() - 0.5) * 80}px`,
                    }} />
                ));
            case 'bubbles':
                return Array.from({ length: 20 }).map((_, i) => {
                    const size = Math.random() * 40 + 10;
                    return (
                        <div key={i} className="bubble" style={{
                            left: `${Math.random() * 100}%`,
                            width: `${size}px`, height: `${size}px`,
                            animationDuration: `${Math.random() * 15 + 10}s`,
                            animationDelay: `${Math.random() * 25}s`,
                        }} />
                    )
                });
            case 'hexPulse':
                return Array.from({ length: 30 }).map((_, i) => {
                    const size = Math.random() * 50 + 20;
                    return <div key={i} className="hex-pulse-item" style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        animationDuration: `${Math.random() * 4 + 4}s`,
                        animationDelay: `${Math.random() * 8}s`,
                    }} />
                });
            case 'stardust':
                 return Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="stardust-particle" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 10 + 20}s, ${Math.random() * 4 + 3}s`,
                        animationDelay: `${Math.random() * 30}s, ${Math.random() * 7}s`,
                         // @ts-ignore
                        '--tx': `${(Math.random() - 0.5) * 200}px`,
                        '--ty': `${(Math.random() - 0.5) * 200}px`,
                    }} />
                ));
            case 'energyFlow':
                 return Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="energy-flow-line" style={{
                        top: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 3 + 2}s`,
                        animationDelay: `${Math.random() * 5}s`,
                    }} />
                ));
            case 'polygons':
                const shapes = [
                    'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)', // Pentagon
                    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Hexagon
                    'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)', // Trapezoid
                ];
                 return Array.from({ length: 25 }).map((_, i) => {
                    const size = Math.random() * 40 + 20;
                    return (
                        <div key={i} className="polygon" style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${size}px`, height: `${size}px`,
                            clipPath: shapes[i % shapes.length],
                            animationDuration: `${Math.random() * 10 + 8}s`,
                            animationDelay: `${Math.random() * 18}s`,
                        }} />
                    )
                });
            default:
                return null;
        }
    }, [settings.style]);
    
    return (
        <div className="background-effects-container">
            {effectContent}
        </div>
    );
});


const Onboarding: React.FC<{ onComplete: (data: {name: string, avatarUrl: string}) => void }> = ({ onComplete }) => {
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(getRandomCoverArt());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setAvatarUrl(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = () => {
        if (name.trim()) {
            onComplete({ name, avatarUrl });
        } else {
            const nameInput = document.getElementById('onboarding-name-input');
            nameInput?.classList.add('animate-shake');
            setTimeout(() => nameInput?.classList.remove('animate-shake'), 500);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 text-white onboarding-container">
            <div className="text-center mb-12">
                <h1 className="text-2xl text-white/80 name-anim-fade-in" style={{ animationDelay: '0.2s' }}>Welcome to</h1>
                <h2 className="text-5xl font-bold name-anim-fade-in name-anim-color-cycle" style={{ animationDelay: '0.5s' }}>
                    Mwijay Music
                </h2>
            </div>
            
            <div className="relative mb-8 name-anim-zoom-in" style={{ animationDelay: '0.8s' }}>
                <div className="w-32 h-32 rounded-full pulsing-avatar-ring"></div>
                <img src={avatarUrl} alt="Avatar" className="absolute inset-0 m-auto w-28 h-28 rounded-full object-cover border-4 border-[var(--surface-color)]"/>
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-10 h-10 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--surface-color)]">
                    <i className="fas fa-pen"></i>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden"/>
            </div>
            
            <div className="w-full max-w-sm mb-12 name-anim-slide-up" style={{ animationDelay: '1s' }}>
                 <input 
                    id="onboarding-name-input"
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="What should we call you?" 
                    className="w-full bg-black/30 text-white placeholder:text-white/60 p-4 rounded-full border-2 border-transparent text-center text-lg focus:border-[var(--primary-accent)] focus:ring-0 transition-all" 
                    maxLength={30}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
            </div>

            <button onClick={handleSubmit} className="get-started-button w-full max-w-sm font-bold py-4 rounded-full transition-all duration-300 text-black text-lg flex items-center justify-center gap-2 name-anim-zoom-in" style={{ animationDelay: '1.2s' }}>
                <span>Get Started</span>
                <i className="fas fa-arrow-right"></i>
            </button>
        </div>
    );
};


// --- Helper Functions ---
const truncate = (str: string, len: number) => str.length > len ? `${str.substring(0, len)}...` : str;

const findSongByTitle = (title: string, songs: Song[]): Song | null => {
    if (!title) return null;
    const searchTerm = title.toLowerCase();
    
    let song = songs.find(s => s.title.toLowerCase() === searchTerm);
    if (song) return song;

    song = songs.find(s => s.title.toLowerCase().startsWith(searchTerm));
    if (song) return song;

    song = songs.find(s => s.title.toLowerCase().includes(searchTerm));
    if (song) return song;

    song = songs.find(s => s.artist.toLowerCase().includes(searchTerm));
    if (song) return song;

    return null;
}

const addToTopSongs = (
    topSongs: ProfileData['analytics']['topSongs'], 
    song: Song
): ProfileData['analytics']['topSongs'] => {
    const existing = topSongs.find(s => s.id === song.id);
    if (existing) {
        return topSongs
            .map(s => s.id === song.id ? { ...s, playCount: s.playCount + 1 } : s)
            .sort((a, b) => b.playCount - a.playCount);
    } else {
        return [...topSongs, { id: song.id, title: song.title, artist: song.artist, albumArtUrl: song.albumArtUrl, playCount: 1 }]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 50);
    }
};

const addToTopArtists = (
    topArtists: ProfileData['analytics']['topArtists'],
    artistName: string,
    albumArtUrl: string
): ProfileData['analytics']['topArtists'] => {
    const existing = topArtists.find(a => a.name === artistName);
    if (existing) {
        return topArtists
            .map(a => a.name === artistName ? { ...a, playCount: a.playCount + 1 } : a)
            .sort((a, b) => b.playCount - a.playCount);
    } else {
        return [...topArtists, { name: artistName, playCount: 1, albumArtUrl }]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 50);
    }
};

const addToTopRadios = (
    topRadios: ProfileData['analytics']['topRadios'],
    stationId: string,
    name: string
): ProfileData['analytics']['topRadios'] => {
    const existing = topRadios.find(r => r.stationId === stationId);
    if (existing) {
        return topRadios
            .map(r => r.stationId === stationId ? { ...r, playCount: r.playCount + 1 } : r)
            .sort((a, b) => b.playCount - a.playCount);
    } else {
        return [...topRadios, { stationId, name, playCount: 1 }]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 50);
    }
};

const fadeAudio = (audio: HTMLAudioElement, targetVolume: number, duration: number, onComplete?: () => void) => {
    const startVolume = audio.volume;
    const startTime = performance.now();

    const animateFade = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const newVolume = startVolume + (targetVolume - startVolume) * progress;
        audio.volume = Math.max(0, Math.min(1, newVolume));

        if (progress < 1) {
            requestAnimationFrame(animateFade);
        } else {
            if (onComplete) onComplete();
        }
    };
    requestAnimationFrame(animateFade);
};

const App = () => {
  const [activeView, setActiveView] = useState('Home');
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [reelPlaylists, setReelPlaylists] = useState<ReelPlaylist[]>([]);
  const [radioPlaylists, setRadioPlaylists] = useState<RadioPlaylist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isAssistantVisible, setIsAssistantVisible] = useState(false);
  const [isAssistantOpening, setIsAssistantOpening] = useState(false);
  const [isAssistantInputVisible, setIsAssistantInputVisible] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('all');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [sleepTimer, setSleepTimer] = useState<{ mode: 'off' | 'duration' | 'songs'; value: number, timeoutId: number | null, songCount: number, endTime?: number }>({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [isLyricsMinimized, setIsLyricsMinimized] = useState(false);
  const [isReelViewActive, setIsReelViewActive] = useState(false);
  const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);
  const [viewHistory, setViewHistory] = useState(['Home']);
  const [artistToView, setArtistToView] = useState<string | null>(null);
  const [playlistToViewId, setPlaylistToViewId] = useState<string | null>(null);
  const [reelPlaylistToViewId, setReelPlaylistToViewId] = useState<string | null>(null);
  const [initialReelId, setInitialReelId] = useState<string | null>(null);
  const [isQueueFlashing, setIsQueueFlashing] = useState(false);
  const [isGeneratingAiPlaylist, setIsGeneratingAiPlaylist] = useState(false);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [dynamicThemeOverrides, setDynamicThemeOverrides] = useState<ThemeColors | null>(null);
  const [recentlyAddedSongId, setRecentlyAddedSongId] = useState<string | null>(null);
  const [isUserActive, setIsUserActive] = useState(true);
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null);
  const activityTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();

  const audioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null);
  const [activeAudio, setActiveAudio] = useState<'primary' | 'secondary'>('primary');
  const listenTimeIntervalRef = useRef<number | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);
  const { audioFx, initializeAudioFx, applySettings } = useAudioFx();
  const metronomeContextRef = useRef<AudioContext | null>(null);
  const isCrossfadingRef = useRef(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const resetActivityTimer = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    setIsUserActive(true);
    activityTimeoutRef.current = window.setTimeout(() => {
      setIsUserActive(false);
    }, 5000); // 5 seconds
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'touchstart', 'scroll', 'keydown'];
    events.forEach(event => window.addEventListener(event, resetActivityTimer));
    resetActivityTimer(); // Initial call
    return () => {
      events.forEach(event => window.removeEventListener(event, resetActivityTimer));
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [resetActivityTimer]);

  useEffect(() => {
      if (recentlyAddedSongId) {
          const timer = setTimeout(() => setRecentlyAddedSongId(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [recentlyAddedSongId]);

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info', icon?: string) => {
    const newNotification = { id: Date.now(), message, type, icon };
    setNotification(newNotification);
    setTimeout(() => {
        setNotification(prev => (prev?.id === newNotification.id ? null : prev));
    }, 3000);
  }, []);
  
  const checkAchievements = useCallback((currentProfile: ProfileData | null, type: string, value: any) => {
      if (!currentProfile) return;
      
      const newlyUnlocked: Achievement[] = [];
      const profileWithSongs = { ...currentProfile, librarySongs };
      
      achievements.forEach(ach => {
          const isAlreadyUnlocked = currentProfile.unlockedAchievements.some(unlocked => unlocked.id === ach.id);
          if (!isAlreadyUnlocked && ach.criteria(profileWithSongs, type, value)) {
              newlyUnlocked.push(ach);
          }
      });

      if (newlyUnlocked.length > 0) {
          newlyUnlocked.forEach((ach, index) => {
              setTimeout(() => {
                  showNotification(`🏆 ${ach.name}`, 'success', ach.icon);
              }, index * 500); // Stagger notifications
          });

          setProfile(p => {
              if (!p) return null;
              return {
                ...p,
                unlockedAchievements: [...p.unlockedAchievements, ...newlyUnlocked.map(a => ({ id: a.id, date: Date.now() }))]
              };
          });
      }
  }, [librarySongs, showNotification]);
  
  const updateProfile = useCallback((updater: (prev: ProfileData) => ProfileData) => {
    setProfile(prevProfile => {
        if (!prevProfile) return null;
        const newProfile = updater(prevProfile);
        Object.keys(newProfile.analytics).forEach(key => {
            const analyticKey = key as keyof ProfileData['analytics'];
            if (newProfile.analytics[analyticKey] !== prevProfile.analytics[analyticKey]) {
                checkAchievements(newProfile, key, newProfile.analytics[analyticKey]);
            }
        });
        return newProfile;
    });
  }, [checkAchievements]);

    const handleUpdateSong = useCallback((updatedSong: Song) => {
        setLibrarySongs(s => s.map(song => song.id === updatedSong.id ? updatedSong : song));
    }, []);
    
    const downloadAndSaveSong = useCallback(async (song: Song, andFavorite: boolean = false): Promise<boolean> => {
        if (!song.url) return false;
        
        showNotification(`Downloading "${truncate(song.title, 20)}"...`, 'info', 'fa-download');
        try {
            const response = await fetch(song.url);
            if (!response.ok) throw new Error("Network response was not ok.");
            const audioData = await response.arrayBuffer();
            const mimeType = response.headers.get('content-type') || 'audio/mpeg';

            const newSong: Song = {
                ...song,
                audioData,
                mimeType,
                isFavorite: andFavorite,
                dateAdded: Date.now(),
            };
            delete newSong.url; 
            
            setLibrarySongs(prevSongs => {
                const uniqueNewSongs = [newSong].filter(ns => !prevSongs.some(ls => ls.id === ns.id));
                if (uniqueNewSongs.length > 0) {
                    setRecentlyAddedSongId(uniqueNewSongs[0].id);
                    updateProfile(p => ({ ...p, analytics: { ...p.analytics, songsDownloaded: (p.analytics.songsDownloaded || 0) + 1 }}));
                     if (andFavorite) {
                        checkAchievements(profile, 'favorite1', 1);
                    }
                }
                return [...prevSongs, ...uniqueNewSongs];
            });

            showNotification(`"${truncate(song.title, 20)}" added to library!`, 'success', 'fa-check-circle');
            return true;
        } catch (error) {
            console.error("Download failed:", String(error));
            showNotification("Failed to download song.", 'error', 'fa-exclamation-triangle');
            return false;
        }
    }, [showNotification, updateProfile, checkAchievements, profile]);

    const handleAddSongs = useCallback((newSongs: Song[]) => {
        setLibrarySongs(prevSongs => {
            const uniqueNewSongs = newSongs.filter(ns => !prevSongs.some(ls => ls.id === ns.id));
            if (uniqueNewSongs.length > 0) {
                setRecentlyAddedSongId(uniqueNewSongs[0].id);
                updateProfile(p => ({ ...p, analytics: { ...p.analytics, songsUploaded: p.analytics.songsUploaded + uniqueNewSongs.length }}));
            }
            return [...prevSongs, ...uniqueNewSongs];
        });
    }, [updateProfile]);
  
   const handleUpdatePlaylist = (updatedPlaylist: Playlist) => {
        setPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
        showNotification("Playlist updated!", 'success');
    };

    const handleDeletePlaylist = (playlistId: string) => {
        if(window.confirm(`Are you sure you want to delete this playlist?`)) {
            setPlaylists(p => p.filter(pl => pl.id !== playlistId));
            setPlaylistToViewId(null);
            showNotification("Playlist deleted.", 'success');
        }
    };
    
    const handleUpdateReelPlaylist = (updatedPlaylist: ReelPlaylist) => {
        setReelPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
        showNotification("Reel Playlist updated!", 'success');
    };

    const handleDeleteReelPlaylist = (playlistId: string) => {
        if(window.confirm(`Are you sure you want to delete this reel playlist?`)) {
            setReelPlaylists(p => p.filter(pl => pl.id !== playlistId));
            setReelPlaylistToViewId(null);
            showNotification("Reel Playlist deleted.", 'success');
        }
    };
    
    // --- START: REBUILT PLAYBACK & CROSSFADE LOGIC ---
    const getNextSongIndex = useCallback(() => {
        if (playQueue.length === 0) return -1;

        if (isShuffled) {
            const currentShuffleIndex = shuffleOrder.indexOf(currentQueueIndex);
            const nextShuffleIndex = (currentShuffleIndex + 1) % shuffleOrder.length;
            return shuffleOrder[nextShuffleIndex];
        } else {
            const nextIndex = currentQueueIndex + 1;
            if (nextIndex >= playQueue.length) {
                return repeatMode === 'all' ? 0 : -1;
            }
            return nextIndex;
        }
    }, [playQueue, currentQueueIndex, isShuffled, shuffleOrder, repeatMode]);

    const playNextSong = useCallback((isManualSkip = false) => {
        if (isCrossfadingRef.current && !isManualSkip) return;

        const crossfadeDuration = profile?.settings.crossfadeDuration ?? 0;
        const useCrossfade = crossfadeDuration > 0 && !isManualSkip && playQueue.length > 1;

        const nextIndex = getNextSongIndex();
        
        if (nextIndex === -1) {
            setIsPlaying(false);
            return;
        }

        if (useCrossfade) {
            isCrossfadingRef.current = true;
            const currentAudioEl = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
            const nextAudioEl = activeAudio === 'primary' ? secondaryAudioRef.current : audioRef.current;
            const nextSong = playQueue[nextIndex];
            
            if (!currentAudioEl || !nextAudioEl || !nextSong) {
                isCrossfadingRef.current = false;
                return;
            }

            const onFadeInComplete = () => {
                currentAudioEl.pause();
                currentAudioEl.src = '';
                setActiveAudio(prev => (prev === 'primary' ? 'secondary' : 'primary'));
                isCrossfadingRef.current = false;
            };
            
            const loadAndPlayNext = (url: string) => {
                nextAudioEl.src = url;
                nextAudioEl.load();
                const playPromise = nextAudioEl.play();
                playPromise.then(() => {
                    setCurrentQueueIndex(nextIndex);
                    nextAudioEl.volume = 0;
                    fadeAudio(nextAudioEl, 1, crossfadeDuration * 1000, onFadeInComplete);
                    fadeAudio(currentAudioEl, 0, crossfadeDuration * 1000);
                }).catch(e => {
                    console.error("Crossfade play error:", e);
                    isCrossfadingRef.current = false;
                });
            };

            if (nextSong.audioData) {
                loadAndPlayNext(URL.createObjectURL(new Blob([nextSong.audioData], { type: nextSong.mimeType })));
            } else if (nextSong.url) {
                loadAndPlayNext(nextSong.url);
            }
        } else { // Hard cut / Manual Skip
            [audioRef.current, secondaryAudioRef.current].forEach(audio => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
            isCrossfadingRef.current = false;
            setActiveAudio('primary');
            setCurrentQueueIndex(nextIndex);
        }
    }, [profile, playQueue, getNextSongIndex, activeAudio]);
    
    const handleNext = useCallback(() => playNextSong(true), [playNextSong]);

    const handlePrev = useCallback(() => {
        const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        isCrossfadingRef.current = false;
        [audioRef.current, secondaryAudioRef.current].forEach(a => {
            if (a) { a.pause(); a.src = ''; }
        });
        setActiveAudio('primary');

        let prevIndex;
        if (isShuffled) {
            const currentShuffleIndex = shuffleOrder.indexOf(currentQueueIndex);
            prevIndex = shuffleOrder[(currentShuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length];
        } else {
            prevIndex = (currentQueueIndex - 1 + playQueue.length) % playQueue.length;
        }
        setCurrentQueueIndex(prevIndex);
    }, [currentQueueIndex, isShuffled, shuffleOrder, activeAudio]);
    
    const handleEnded = useCallback(() => {
        if (isCrossfadingRef.current) return;
        
        if (repeatMode === 'one') {
            const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
            if (audio) {
                audio.currentTime = 0;
                audio.play();
            }
        } else {
            playNextSong(false);
        }
    }, [repeatMode, activeAudio, playNextSong]);
    
    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
        if (isSeeking) return;
        
        const audio = e.currentTarget;
        const crossfadeDuration = profile?.settings.crossfadeDuration ?? 0;
        
        if (audio.duration && audio.duration - audio.currentTime <= crossfadeDuration && crossfadeDuration > 0 && !isCrossfadingRef.current && repeatMode !== 'one' && getNextSongIndex() !== -1) {
            playNextSong(false);
        }
        
        setProgress(audio.currentTime);
    };
    // --- END: REBUILT PLAYBACK & CROSSFADE LOGIC ---
  
  const handleTogglePlay = useCallback(() => {
    if (audioFx && audioFx.context.state === 'suspended') {
        audioFx.context.resume().then(() => {
            if (profile) {
                applySettings(profile.settings);
            }
        });
    }
    const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
    if (!audio || !nowPlaying) return;

    if (isPlaying) {
        audio.pause();
    } else {
        audio.play().catch(e => {
            if (e instanceof Error && e.name === 'AbortError') {
            } else {
                console.error("Play error:", String(e));
                showNotification("Playback failed.", "error");
            }
        });
    }
  }, [isPlaying, nowPlaying, audioFx, profile, applySettings, showNotification, activeAudio]);
  
  useEffect(() => {
    if (!profile) return;
    
    const isVibrant = themes.find(t => t.name === profile.activeThemePair)?.category === 'Vibrant';
    
    let activeTheme: ThemeColors;
    if (dynamicThemeOverrides && profile.settings.dynamicThemeEnabled && !isVibrant) {
        activeTheme = dynamicThemeOverrides;
    } else {
        const themePair = themes.find(t => t.name === profile.activeThemePair) || themes.find(t => t.name === 'Custom');
        if (themePair) {
             if (themePair.name === 'Custom') {
                const base = profile.themeMode === 'light' ? themes.find(t => t.name === 'Classic Light')!.light : themes.find(t => t.name === 'Default Dark')!.dark;
                activeTheme = { ...base, '--primary-accent': profile.customThemeColors.primary, '--secondary-accent-start': profile.customThemeColors.secondary, '--secondary-accent-end': profile.customThemeColors.accent };
            } else if (isVibrant) {
                activeTheme = themePair.dark;
            }
            else {
                activeTheme = themePair[profile.themeMode];
            }
        } else {
            activeTheme = themes.find(t => t.name === 'Default Dark')!.dark;
        }
    }
    
    const font = fonts.find(f => f.name === profile.activeFont) || fonts[0];

    Object.entries(activeTheme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
    });
    document.documentElement.style.setProperty('--font-family', font.family);

  }, [profile, dynamicThemeOverrides]);

    useEffect(() => {
        const currentSong = playQueue[currentQueueIndex];
        const songId = currentSong?.id;

        if (isCrossfadingRef.current || !songId) {
            return;
        }

        const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
        if (!audio) return;

        setNowPlaying(currentSong);
        setProgress(0);
        setDuration(currentSong.duration || 0);

        const loadAndPlay = (url: string) => {
            audio.src = url;
            audio.load();
            audio.play().catch(e => console.error("Autoplay failed:", e));
        };

        if (currentSong.audioData) {
            loadAndPlay(URL.createObjectURL(new Blob([currentSong.audioData], { type: currentSong.mimeType })));
        } else if (currentSong.url) {
            loadAndPlay(currentSong.url);
        }

        if (profile) {
            updateProfile(p => {
                if (!p) return p;
                const newRecentlyPlayed = [songId, ...p.recentlyPlayed.filter(id => id !== songId)].slice(0, 20);
                
                let updatedAnalytics = { ...p.analytics, songsPlayed: p.analytics.songsPlayed + 1 };
                if (currentSong.duration !== Infinity) { // Not a radio stream
                    updatedAnalytics = {
                        ...updatedAnalytics,
                        topSongs: addToTopSongs(p.analytics.topSongs, currentSong),
                        topArtists: addToTopArtists(p.analytics.topArtists, currentSong.artist, currentSong.albumArtUrl),
                    };
                } else {
                    const existingRadio = (p.recentlyPlayedRadios || []).find(r => r.stationuuid === songId);
                    if (!existingRadio) {
                         const newStation: RadioStation = { stationuuid: songId, name: currentSong.title, url_resolved: currentSong.url || '', favicon: currentSong.albumArtUrl, country: currentSong.artist, countrycode: '', bitrate: 0 };
                         p.recentlyPlayedRadios = [newStation, ...(p.recentlyPlayedRadios || [])].slice(0, 15);
                    }
                    updatedAnalytics = { ...updatedAnalytics, topRadios: addToTopRadios(p.analytics.topRadios, songId, currentSong.title) };
                }
                return { ...p, recentlyPlayed: newRecentlyPlayed, analytics: updatedAnalytics };
            });
        }
    }, [playQueue[currentQueueIndex]?.id, activeAudio]);
  
  const navigateTo = (view: string) => {
    if (view !== activeView) {
      setViewHistory(prev => [...prev, view]);
      setActiveView(view);
    }
    if (view === 'Reels' && initialReelId) {
        setTimeout(() => setInitialReelId(null), 100);
    }
  };

  const handleBack = () => {
    setViewHistory(prev => {
      if (prev.length <= 1) {
        setActiveView('Home');
        return ['Home'];
      }
      const newHistory = [...prev];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1];
      setActiveView(previousView);
      return newHistory;
    });
  };
  
  const handlePlaySong = useCallback((song: Song, context?: Song[]) => {
    // Hard stop all audio before starting a new context to prevent double playback
    isCrossfadingRef.current = false;
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
    }
    if (secondaryAudioRef.current) {
        secondaryAudioRef.current.pause();
        secondaryAudioRef.current.src = '';
    }
    setActiveAudio('primary');
    
    const newQueue = context ? [...context] : [song];
    const newQueueWithIds = newQueue.map(s => ({...s, queueId: s.queueId || `${s.id}-${Math.random()}`}));
    setPlayQueue(newQueueWithIds);
    
    const songIndex = newQueueWithIds.findIndex(s => s.id === song.id);
    setCurrentQueueIndex(songIndex > -1 ? songIndex : 0);
  }, []);

  const handlePlayFromQueue = useCallback((song: Song) => {
    const index = playQueue.findIndex(s => s.queueId === song.queueId);
    if (index > -1) {
        setCurrentQueueIndex(index);
    }
  }, [playQueue]);
  
  const handleAddToQueue = useCallback((song: Song) => {
    const songWithQueueId = {...song, queueId: `${song.id}-${Math.random()}`};
    setPlayQueue(q => {
        if (q.length === 0) {
            setCurrentQueueIndex(0);
            return [songWithQueueId];
        }
        return [...q, songWithQueueId]
    });
    setIsQueueFlashing(true);
    setTimeout(() => setIsQueueFlashing(false), 500);
    showNotification(`"${truncate(song.title, 20)}" added to queue`, 'info');
    checkAchievements(profile, 'queue', 1);
  }, [profile, checkAchievements, showNotification]);
  
  const handleDurationChange = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration);
  };
  
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = Number(e.target.value);
        setProgress(newTime);
        const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
        if (audio) audio.currentTime = newTime;
    };
    
    const handleSeekStart = () => setIsSeeking(true);
    const handleSeekEnd = () => setIsSeeking(false);

  const handleSeekBy = (delta: number) => {
    const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
    if (audio) {
      audio.currentTime += delta;
    }
  };
  
    const handleToggleFavorite = useCallback(async (songId: string) => {
        const song = librarySongs.find(s => s.id === songId) || playQueue.find(s => s.id === songId);
        if (!song) return;

        if (song.source && !song.audioData) { // It's an online song not in library
            const success = await downloadAndSaveSong(song, true);
            if (success) showNotification("Added to your library & favorites!", 'success');
        } else {
            const wasFavorite = !!song.isFavorite;
            const updatedSong = { ...song, isFavorite: !wasFavorite };
            handleUpdateSong(updatedSong);
            if (!wasFavorite) {
                checkAchievements(profile, 'favorite1', 1);
            }
        }
    }, [librarySongs, playQueue, handleUpdateSong, profile, checkAchievements, downloadAndSaveSong]);

  const cycleRepeatMode = () => {
    setRepeatMode(prev => {
        if (prev === 'none') return 'all';
        if (prev === 'all') return 'one';
        return 'none';
    });
  };

  const handleToggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
        const newIsShuffled = !prev;
        if (newIsShuffled) {
            const shuffled = [...Array(playQueue.length).keys()].sort(() => Math.random() - 0.5);
            setShuffleOrder(shuffled);
            checkAchievements(profile, 'songsShuffled', (profile?.analytics?.songsShuffled || 0) + 1);
        } else {
            setShuffleOrder([]);
        }
        return newIsShuffled;
    });
  }, [playQueue.length, profile, checkAchievements]);
  
  const handleSetSleepTimer = useCallback((mode: 'duration' | 'songs' | 'off', value: number) => {
    if (sleepTimer.timeoutId) clearTimeout(sleepTimer.timeoutId);
    
    if (mode === 'off') {
        setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
        showNotification('Sleep timer cancelled.', 'info');
        return;
    }

    if (mode === 'duration') {
        const endTime = Date.now() + value * 60000;
        const timeoutId = window.setTimeout(() => {
            handleTogglePlay();
            setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
            showNotification('Sleep timer finished!', 'success');
        }, value * 60000);
        setSleepTimer({ mode, value, timeoutId, songCount: 0, endTime });
        showNotification(`Sleep timer set for ${value} minutes.`, 'success');
    } else {
        setSleepTimer({ mode, value, timeoutId: null, songCount: 0 });
        showNotification(`Music will stop after ${value} songs.`, 'success');
    }
  }, [sleepTimer.timeoutId, showNotification, handleTogglePlay]);

  const toggleLyrics = useCallback((forceState?: 'full' | 'minimized' | 'closed') => {
    if (forceState === 'full') {
        setIsLyricsVisible(true);
        setIsLyricsMinimized(false);
    } else if (forceState === 'minimized') {
        setIsLyricsVisible(false);
        setIsLyricsMinimized(true);
    } else if (forceState === 'closed') {
        setIsLyricsVisible(false);
        setIsLyricsMinimized(false);
    } else {
        // Cycle: closed -> minimized -> full -> closed
        if (!isLyricsVisible && !isLyricsMinimized) { // If closed
            setIsLyricsMinimized(true); // Open minimized
        } else if (isLyricsMinimized) { // If minimized
            setIsLyricsVisible(true); // Open full
            setIsLyricsMinimized(false);
        } else { // If full
            setIsLyricsVisible(false); // Close
            setIsLyricsMinimized(false);
        }
    }
    
    if (profile && !profile.usedFeatures.lyricsViewed) {
        updateProfile(p => ({...p, usedFeatures: {...p.usedFeatures, lyricsViewed: true}}));
    }
  }, [isLyricsVisible, isLyricsMinimized, profile, updateProfile]);
  
  const handlePlayRadioStation = useCallback((station: RadioStation) => {
      const radioSong: Song = {
          id: station.stationuuid,
          url: station.url_resolved,
          title: station.name,
          artist: station.country,
          albumArtUrl: station.favicon || getRandomCoverArt(),
          duration: Infinity,
          isFavorite: profile?.favoriteRadioStations?.some(s => s.stationuuid === station.stationuuid),
      };
      setPlayQueue([radioSong]);
      setCurrentQueueIndex(0);
      setIsPlayerVisible(true);
  }, [profile?.favoriteRadioStations]);

  const handleToggleRadioFavorite = useCallback((station: RadioStation) => {
      updateProfile(p => {
          const favs = p.favoriteRadioStations || [];
          const isFav = favs.some(s => s.stationuuid === station.stationuuid);
          const newFavs = isFav ? favs.filter(s => s.stationuuid !== station.stationuuid) : [...favs, station];
          if (!isFav) {
             checkAchievements(p, 'favorite-radio', 1);
          }
          return { ...p, favoriteRadioStations: newFavs };
      });
  }, [updateProfile, checkAchievements]);

  const handlePlayReelAsAudio = useCallback((video: Video) => {
    if (nowPlaying?.id === video.id && nowPlaying?.isFromReel) {
        handleTogglePlay();
        return;
    }
    const reelSong: Song = {
        id: video.id,
        url: URL.createObjectURL(new Blob([video.videoData!], { type: 'video/mp4' })),
        title: video.title,
        artist: video.uploader || 'Mwijay Reels',
        albumArtUrl: video.thumbnailUrl || getRandomCoverArt(),
        isFromReel: true,
    };
    handlePlaySong(reelSong, [reelSong]);
    setIsPlayerVisible(true);
  }, [handlePlaySong, handleTogglePlay, nowPlaying]);
  
  const handleOnboardingComplete = (data: {name: string, avatarUrl: string}) => {
    updateProfile(p => ({
        ...p,
        name: data.name,
        avatarUrl: data.avatarUrl,
        onboarded: true
    }));
  };
  
  const handleCreatePlaylist = (playlist: Playlist) => {
    setPlaylists(p => [...p, playlist]);
    checkAchievements(profile, 'playlists', (profile?.playlists?.length || 0) + 1);
  };
  
  const handleThemePairChange = (themeName: string) => {
    updateProfile(p => {
        const newThemes = new Set(p.usedFeatures.themes).add(themeName);
        return { ...p, activeThemePair: themeName, usedFeatures: {...p.usedFeatures, themes: newThemes} };
    });
  };
  
  const handleFontChange = (fontName: string) => {
    updateProfile(p => {
        const newFonts = new Set(p.usedFeatures.fonts).add(fontName);
        return { ...p, activeFont: fontName, usedFeatures: {...p.usedFeatures, fonts: newFonts} };
    });
  };

  const handleApplyCustomTheme = (colors: ProfileData['customThemeColors']) => {
    updateProfile(p => ({ ...p, customThemeColors: colors, activeThemePair: 'Custom' }));
    checkAchievements(profile, 'customTheme', 1);
  };
  
  const handleSetMood = (songId: string, emoji: string) => {
    const song = librarySongs.find(s => s.id === songId);
    if (song) {
        const newEmoji = song.moodEmoji === emoji ? '' : emoji;
        handleUpdateSong({ ...song, moodEmoji: newEmoji });
        checkAchievements(profile, 'mood-setter', 1);
    }
  };
  
  const handleAddWisdom = (wisdom: string) => {
    updateProfile(p => ({ ...p, customWisdom: [...(p.customWisdom || []), wisdom] }));
    showNotification("Your wisdom has been added!", 'success');
  };
  
  const handleAddMood = (mood: { emoji: string; name: string; color: string }) => {
    updateProfile(p => ({...p, customMoods: [...(p.customMoods || []), mood]}));
    showNotification("New mood added!", 'success');
  };

  const handleSaveArtist = (artist: Artist) => {
      saveArtist(artist).then(() => {
          setArtists(prev => {
              const exists = prev.some(a => a.name === artist.name);
              return exists ? prev.map(a => a.name === artist.name ? artist : a) : [...prev, artist];
          });
          showNotification("Artist profile saved!", 'success');
      });
  };
  
  const handleDeleteSong = (songId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this song?")) {
        setLibrarySongs(s => s.filter(song => song.id !== songId));
        setPlaylists(pls => pls.map(p => ({...p, songIds: p.songIds.filter(id => id !== songId)})));
        showNotification("Song deleted.", 'success');
    }
  };
  
  const playAiPlaylist = useCallback(async () => {}, []);
  const handlePlayPlaylistRadio = useCallback((playlist: Playlist) => {}, []);
  const handleExportPlaylists = useCallback(() => {}, []);
  const handleImportPlaylist = useCallback((name: string, text: string) => {}, []);

  const openAssistant = useCallback(() => {
    setIsAssistantOpening(true);
    setTimeout(() => setIsAssistantVisible(true), 400);
    setTimeout(() => setIsAssistantOpening(false), 1000);
    updateProfile(p => ({...p, analytics: {...p.analytics, assistantUses: p.analytics.assistantUses + 1}}));
  }, [updateProfile]);

  const handleToggleTheme = () => {
    if (!profile) return;
    const isVibrant = themes.find(t => t.name === profile.activeThemePair)?.category === 'Vibrant';
    if(isVibrant) {
        showNotification("Vibrant themes don't have a light/dark mode.", 'info');
        return;
    }
    updateProfile(p => ({ ...p, themeMode: p.themeMode === 'light' ? 'dark' : 'light' }));
  };
  
  const handleResetProfile = () => {
    if (window.confirm("Are you sure you want to reset all settings to their defaults? This will not affect your music library or playlists.")) {
        updateProfile(p => {
             const preserved = {
                name: p.name,
                avatarUrl: p.avatarUrl,
                onboarded: p.onboarded,
                analytics: p.analytics,
                unlockedAchievements: p.unlockedAchievements,
                recentlyPlayed: p.recentlyPlayed,
                recentlyPlayedOnline: p.recentlyPlayedOnline,
                recentlyPlayedRadios: p.recentlyPlayedRadios,
                usedFeatures: p.usedFeatures,
                customMoods: p.customMoods,
                customWisdom: p.customWisdom,
                likedWisdoms: p.likedWisdoms,
                favoriteRadioStations: p.favoriteRadioStations,
                favoriteRadioRegions: p.favoriteRadioRegions,
                favoriteRadioGenres: p.favoriteRadioGenres,
            };
            return { ...defaultProfile, ...preserved };
        });
        showNotification("Settings have been reset to default.", "success");
    }
  };

  const assistantControls = useMemo(() => ({
    togglePlay: handleTogglePlay,
    playNext: handleNext,
    playPrev: handlePrev,
    setSimpleMode: (val: boolean) => updateProfile(p => ({...p, settings: {...p.settings, simpleMode: {...p.settings.simpleMode, enabled: val}}})),
    playRadio: (query?: string) => {
        if (query) {
            fetchRadioAPI(`/stations/search?name=${encodeURIComponent(query)}&limit=1&hidebroken=true`).then(stations => {
                if (stations.length > 0) handlePlayRadioStation(stations[0]);
                else showNotification(`No radio stations found for "${query}".`, 'error');
            });
        } else {
            fetchRadioAPI('/stations/search?limit=1&order=clickcount&reverse=true&hidebroken=true').then(stations => {
                if(stations.length > 0) handlePlayRadioStation(stations[0]);
            });
        }
    },
    toggleInputView: () => setIsAssistantInputVisible(p => !p),
    setThemeMode: (mode: 'light' | 'dark') => updateProfile(p => ({...p, themeMode: mode})),
    setSleepTimer: handleSetSleepTimer,
    changeFont: handleFontChange,
    applyCustomTheme: handleApplyCustomTheme,
    toggleFavorite: () => nowPlaying && handleToggleFavorite(nowPlaying.id),
    playSongFromLibrary: (songTitle: string) => {
        const song = findSongByTitle(songTitle, librarySongs);
        if (song) handlePlaySong(song, librarySongs);
        else showNotification(`Couldn't find "${songTitle}" in your library.`, 'error');
    },
    addToQueue: (songTitle: string) => {
        const song = findSongByTitle(songTitle, librarySongs);
        if (song) handleAddToQueue(song);
        else showNotification(`Couldn't find "${songTitle}" to add to queue.`, 'error');
    },
    navigateToView: (viewName: string) => navigateTo(viewName),
    openAudioEffects: () => setActiveModal('equalizer'),
    setBackgroundEffect: (enabled: boolean, style?: ProfileData['settings']['backgroundEffects']['style']) => {
        updateProfile(p => ({...p, settings: {...p.settings, backgroundEffects: { ...p.settings.backgroundEffects, enabled, ...(style && { style })}}}));
    },
    searchOnlineMusic: (query: string) => {
        setModalData({ initialSearch: query });
        navigateTo('Explore');
    },
    playAiPlaylist: playAiPlaylist,
  }), [handleTogglePlay, handleNext, handlePrev, updateProfile, handleSetSleepTimer, handleFontChange, handleApplyCustomTheme, nowPlaying, handleToggleFavorite, librarySongs, handlePlaySong, handleAddToQueue, handlePlayRadioStation, showNotification, playAiPlaylist]);

  const assistant = useAssistant({
    getAppState: () => ({
        nowPlaying,
        isPlaying,
        librarySongs,
        isSimpleMode: profile?.settings.simpleMode.enabled || false,
        profile: profile!
    }),
    controls: assistantControls,
    showNotification,
  });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await initDB();
                const [
                    loadedProfile, loadedSongs, loadedPlaylists, loadedVideos, loadedReelPlaylists,
                    loadedRadioPlaylists, loadedArtists, savedQueue,
                ] = await Promise.all([
                    getProfile(), getSongs(), getPlaylists(), getVideos(), getReelPlaylists(),
                    getRadioPlaylists(), getArtists(), getPlayQueue(),
                ]);

                setProfile(loadedProfile);
                setLibrarySongs(loadedSongs);
                setPlaylists(loadedPlaylists);
                setReelPlaylists(loadedReelPlaylists);
                setRadioPlaylists(loadedRadioPlaylists);
                setArtists(loadedArtists);
                
                const videosWithThumbnails = await Promise.all(
                    loadedVideos.map(async (video) => {
                        if (!video.thumbnailUrl && video.videoData) {
                            try {
                                const blob = new Blob([video.videoData], { type: 'video/mp4' });
                                const url = URL.createObjectURL(blob);
                                const thumbnailUrl = await createVideoThumbnail(url);
                                URL.revokeObjectURL(url);
                                return { ...video, thumbnailUrl };
                            } catch (e) {
                                console.warn(`Could not generate thumbnail for ${video.title}:`, e);
                                return video;
                            }
                        }
                        return video;
                    })
                );
                setVideos(videosWithThumbnails);
                
                if (savedQueue.length > 0) {
                    setPlayQueue(savedQueue);
                    const lastPlayedIndex = savedQueue.findIndex(s => s.id === loadedProfile.lastPlayedSongId);
                    setCurrentQueueIndex(lastPlayedIndex > -1 ? lastPlayedIndex : 0);
                    setNowPlaying(savedQueue[lastPlayedIndex > -1 ? lastPlayedIndex : 0]);
                    setProgress(loadedProfile.lastPlayedProgress || 0);
                }

            } catch (error) {
                console.error("Failed to load initial data:", error);
                showNotification("Error loading your data. Some features might not work.", "error");
            }
        };
        
        const ensureMinDuration = async () => {
            const minDurationPromise = new Promise(resolve => setTimeout(resolve, 6000));
            const dataPromise = loadInitialData();
            await Promise.all([minDurationPromise, dataPromise]);
            setIsLoaded(true);
        }

        ensureMinDuration();
    }, [showNotification]);

    useEffect(() => {
        if (!isLoaded) return;
        const saveData = async () => {
            if (profile) {
                const profileToSave = { 
                    ...profile, 
                    lastPlayedSongId: nowPlaying?.id,
                    lastPlayedProgress: progress,
                };
                await Promise.all([
                    saveProfile(profileToSave), saveSongs(librarySongs), savePlaylists(playlists),
                    saveVideos(videos), saveReelPlaylists(reelPlaylists), saveRadioPlaylists(radioPlaylists),
                    savePlayQueue(playQueue),
                ]);
            }
        };
        const saveTimer = setTimeout(saveData, 2000);
        return () => clearTimeout(saveTimer);
    }, [profile, librarySongs, playlists, videos, reelPlaylists, radioPlaylists, playQueue, isLoaded, nowPlaying, progress]);

  const playlistsWithFavorites = useMemo(() => {
    const favoriteSongs = librarySongs.filter(s => s.isFavorite);
    const favoritesPlaylist: Playlist = {
      id: FAVORITES_PLAYLIST_ID,
      name: 'Favorites',
      coverImage: favoriteSongs[0]?.albumArtUrl || getRandomCoverArt(),
      songIds: favoriteSongs.map(s => s.id)
    };
    return [favoritesPlaylist, ...playlists];
  }, [librarySongs, playlists]);

   const handlePlayReel = (videoId: string) => {
        setInitialReelId(videoId);
        navigateTo('Reels');
    };

    useEffect(() => {
        if (listenTimeIntervalRef.current) {
            clearInterval(listenTimeIntervalRef.current);
        }
        if (isPlaying) {
            listenTimeIntervalRef.current = window.setInterval(() => {
                updateProfile(p => {
                    if (!p) return p;
                    const isRadio = nowPlaying?.duration === Infinity;
                    const fieldToIncrement = isRadio ? 'radioListenTime' : 'listenTime';
                    
                    const newAnalytics = { ...p.analytics };
                    newAnalytics[fieldToIncrement] = (newAnalytics[fieldToIncrement] || 0) + 1;
                    
                    const dayIndex = new Date().getDay();
                    const newWeeklyActivity = [...newAnalytics.weeklyActivity];
                    newWeeklyActivity[dayIndex] = (newWeeklyActivity[dayIndex] || 0) + 1;
                    newAnalytics.weeklyActivity = newWeeklyActivity;
                    
                    return { ...p, analytics: newAnalytics };
                });
            }, 1000);
        }
        return () => {
            if (listenTimeIntervalRef.current) {
                clearInterval(listenTimeIntervalRef.current);
            }
        };
    }, [isPlaying, nowPlaying, updateProfile]);
    
    useEffect(() => {
        const animate = () => {
            if (audioFx?.analyser) {
                const dataArray = new Uint8Array(audioFx.analyser.frequencyBinCount);
                audioFx.analyser.getByteFrequencyData(dataArray);
                setAnalyserData(dataArray);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying && isPlayerVisible) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            setAnalyserData(null); 
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, isPlayerVisible, audioFx]);
   
   const renderView = () => {
    if (!profile) return null;
    if (activeView === 'Playlist') {
        const playlist = playlists.find(p => p.id === playlistToViewId);
        return playlist ? <PlaylistView playlist={playlist} allSongs={librarySongs} onPlaySong={handlePlaySong} onBack={handleBack} onUpdatePlaylist={handleUpdatePlaylist} onDeletePlaylist={handleDeletePlaylist} /> : null;
    }
    if (activeView === 'ReelPlaylist') {
        const reelPlaylist = reelPlaylists.find(p => p.id === reelPlaylistToViewId);
        return reelPlaylist ? <ReelPlaylistView playlist={reelPlaylist} allVideos={videos} onPlayReel={handlePlayReel} onBack={handleBack} onUpdatePlaylist={handleUpdateReelPlaylist} onDeletePlaylist={handleDeleteReelPlaylist} /> : null;
    }
     if (activeView === 'Artist') {
         return artistToView ? <ArtistView artistName={artistToView} allSongs={librarySongs} onPlaySong={handlePlaySong} onBack={handleBack} onSaveArtist={handleSaveArtist} /> : null;
     }

    switch (activeView) {
        case 'Home':
            const isVibrant = themes.find(t => t.name === profile.activeThemePair)?.category === 'Vibrant';
            return <HomeView profile={profile} librarySongs={librarySongs} onNavigate={navigateTo} onPlaySong={handlePlaySong} onOpenAssistant={openAssistant} onToggleTheme={handleToggleTheme} onOpenAddMoodModal={() => setActiveModal('addMood')} isAssistantOpening={isAssistantOpening} isVibrantTheme={isVibrant} />;
        case 'Explore':
            return <OnlineDiscoveryView profile={profile} onPlaySong={handlePlaySong} onAddSongs={handleAddSongs} showNotification={showNotification} onNavigate={navigateTo} onPlayAiPlaylist={playAiPlaylist} isGeneratingAiPlaylist={isGeneratingAiPlaylist} onUpdateProfile={updateProfile} initialSearchQuery={modalData?.initialSearch} onClearInitialSearch={() => setModalData(null)} />;
        case 'Library':
            return <LibraryView songs={librarySongs} playlists={playlistsWithFavorites} onAddSongs={handleAddSongs} onUpdateSong={handleUpdateSong} onPlaySong={handlePlaySong} onAddToQueue={handleAddToQueue} onCreatePlaylist={() => setActiveModal('createPlaylist')} onToggleFavorite={handleToggleFavorite} onViewPlaylist={(id) => { setPlaylistToViewId(id); navigateTo('Playlist'); }} onDeletePlaylist={handleDeletePlaylist} showNotification={showNotification} onOpenSongDetails={song => setModalData({ songForShare: song })} onOpenPlaylistManager={() => setActiveModal('playlistManager')} onViewArtist={(artistName) => { setArtistToView(artistName); navigateTo('Artist'); }} onDeleteSong={handleDeleteSong} onPlayPlaylistRadio={handlePlayPlaylistRadio} recentlyAddedSongId={recentlyAddedSongId} />;
        case 'Reels':
            return <ReelsView videos={videos} reelPlaylists={reelPlaylists} onUpdate={setVideos} onUpdateReelPlaylists={setReelPlaylists} isLibraryPlaying={isPlaying && !nowPlaying?.isFromReel} onReelActiveChange={setIsReelViewActive} showNotification={showNotification} onToggleNavVisibility={setIsBottomNavHidden} profile={profile} onUpdateProfile={updateProfile} onPlayReelAsAudio={handlePlayReelAsAudio} nowPlaying={nowPlaying} onOpenAssistant={openAssistant} isAssistantOnline={assistant.isOnline} onViewReelPlaylist={(id) => { setReelPlaylistToViewId(id); navigateTo('ReelPlaylist'); }} initialVideoId={initialReelId} />;
        case 'Settings':
            return <SettingsView profile={profile} onUpdateProfile={updateProfile} onOpenNeonGlowModal={() => setActiveModal('neonGlow')} onNavigate={navigateTo} onResetProfile={handleResetProfile} />;
        case 'Radio':
            return <RadioView profile={profile} onPlayStation={handlePlayRadioStation} favoriteStations={profile.favoriteRadioStations || []} onToggleFavorite={handleToggleRadioFavorite} radioPlaylists={radioPlaylists} onUpdateRadioPlaylists={setRadioPlaylists} showNotification={showNotification} onNavigate={navigateTo} />;
        case 'Create':
            return <CreateView librarySongs={librarySongs} onUpdateSong={handleUpdateSong} showNotification={showNotification} onGenerate={() => checkAchievements(profile, 'ai-lyricist', 1)} />;
        case 'Profile':
            return <ProfileView profile={profile} onUpdateProfile={updateProfile} onOpenAppearance={() => navigateTo('CustomizeAppearance')} onBack={handleBack} onPlayTopSong={({ id }) => { const song = librarySongs.find(s => s.id === id); if (song) handlePlaySong(song); }} onNavigate={navigateTo} />;
        case 'CustomizeAppearance':
            return <CustomizeAppearanceView profile={profile} onBack={handleBack} onThemePairChange={handleThemePairChange} onFontChange={handleFontChange} onApplyCustomTheme={handleApplyCustomTheme} />;
        case 'AssistantSettings':
            return <AssistantSettingsView onBack={handleBack} profile={profile} onUpdateProfile={updateProfile} />;
         case 'Help':
            return <HelpView onBack={handleBack} />;
        case 'Analytics':
            return <AnalyticsView profile={profile} onBack={handleBack} />;
        case 'CustomizeParticles':
            return <CustomizeParticlesView profile={profile} onUpdateProfile={updateProfile} onBack={handleBack} />;
        case 'ManageRadioHub':
            return <ManageRadioHubView profile={profile} onUpdateProfile={updateProfile} onBack={handleBack} />;
         case 'SimpleModeSettings':
            return <SimpleModeSettingsView profile={profile} onUpdateProfile={updateProfile} onBack={handleBack} onAddWisdom={() => setActiveModal('addWisdom')} />;
        default:
            return <HomeView profile={profile} librarySongs={librarySongs} onNavigate={navigateTo} onPlaySong={handlePlaySong} onOpenAssistant={openAssistant} onToggleTheme={handleToggleTheme} onOpenAddMoodModal={() => setActiveModal('addMood')} isAssistantOpening={isAssistantOpening} isVibrantTheme={themes.find(t => t.name === profile.activeThemePair)?.category === 'Vibrant'} />;
    }
  };

  if (!isLoaded || !profile) {
     return <MultiStepLoader loadingStates={loadingStates} loading={true} duration={1200} />;
  }
  
  if (!profile.onboarded) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className={`w-full h-full relative overflow-hidden ${!isUserActive ? 'user-inactive' : ''}`}>
        {profile.settings.backgroundEffects.enabled && <BackgroundEffects settings={profile.settings.backgroundEffects} />}
        <AnimatePresence>
            {notification && <Notification {...notification} />}
        </AnimatePresence>

        <div className="w-full h-full">
            {renderView()}
        </div>

        {nowPlaying && !profile.settings.simpleMode.enabled && <MiniPlayer song={nowPlaying} isPlaying={isPlaying} progress={progress} onShowPlayer={() => setIsPlayerVisible(true)} onTogglePlay={handleTogglePlay} onToggleFavorite={() => handleToggleFavorite(nowPlaying.id)} onNext={handleNext} isHidden={isPlayerVisible || isBottomNavHidden} />}
        <BottomNav items={navItems} activeItem={activeView} onItemClick={navigateTo} isHidden={isPlayerVisible || isBottomNavHidden} profile={profile} />

        <PlayerOverlay isVisible={isPlayerVisible} song={nowPlaying} isPlaying={isPlaying} progress={progress} duration={duration} onClose={() => setIsPlayerVisible(false)} onTogglePlay={handleTogglePlay} onNext={handleNext} onPrev={handlePrev} onSeek={handleSeekChange} onSeekStart={handleSeekStart} onSeekEnd={handleSeekEnd} onSeekBy={handleSeekBy} onToggleFavorite={handleToggleFavorite} playQueue={playQueue} currentQueueIndex={currentQueueIndex} setPlayQueue={setPlayQueue} onPlayFromQueue={handlePlayFromQueue} repeatMode={repeatMode} isShuffled={isShuffled} onCycleRepeat={cycleRepeatMode} onToggleShuffle={handleToggleShuffle} onSetSleepTimer={handleSetSleepTimer} sleepTimer={sleepTimer} profile={profile} onUpdateProfile={updateProfile} onToggleLyrics={toggleLyrics} onOpenMoodModal={() => setActiveModal('moodEmoji')} onOpenEqualizer={() => setActiveModal('equalizer')} isLyricsMinimized={isLyricsMinimized} favoriteStations={profile.favoriteRadioStations || []} onToggleFavoriteStation={handleToggleRadioFavorite} onViewArtist={(artistName) => { setIsPlayerVisible(false); setArtistToView(artistName); navigateTo('Artist'); }} isQueueFlashing={isQueueFlashing} onSharePreview={() => setModalData({ songForShare: nowPlaying })} onExitSimpleMode={() => updateProfile(p => ({...p, settings: {...p.settings, simpleMode: {...p.settings.simpleMode, enabled: false}}}))} visualizerColor={dynamicThemeOverrides?.['--visualizer-color'] || null} analyserData={analyserData} />
        {isAssistantVisible && <AssistantView messages={assistant.messages} onSendMessage={assistant.sendMessage} onClose={() => setIsAssistantVisible(false)} onToggleInputView={() => setIsAssistantInputVisible(p => !p)} isInputVisible={isAssistantInputVisible} profile={profile} showNotification={showNotification} isOnline={assistant.isOnline} toggleOnlineMode={assistant.toggleOnlineMode} />}

        {activeModal === 'createPlaylist' && <CreatePlaylistModal songs={librarySongs} onClose={() => setActiveModal(null)} onSave={handleCreatePlaylist} />}
        {isLyricsVisible && nowPlaying && <LyricsView song={nowPlaying} profile={profile} onClose={() => toggleLyrics('closed')} onMinimize={() => toggleLyrics('minimized')} onUpdateSong={handleUpdateSong} onUpdateProfile={updateProfile} progress={progress} duration={duration} showNotification={showNotification} />}
        {activeModal === 'moodEmoji' && nowPlaying && <MoodEmojiModal song={nowPlaying} onClose={() => setActiveModal(null)} onSetMood={handleSetMood} allMoods={[...defaultMoods, ...(profile.customMoods || [])]} onAddMood={() => { setActiveModal(null); setTimeout(() => setActiveModal('addMood'), 100); }} />}
        {activeModal === 'equalizer' && nowPlaying && <EqualizerModal profile={profile} song={nowPlaying} onClose={() => setActiveModal(null)} onUpdateProfile={updateProfile} onUpdateSong={handleUpdateSong} showNotification={showNotification} />}
        {activeModal === 'neonGlow' && <NeonGlowModal profile={profile} onClose={() => setActiveModal(null)} onUpdateProfile={updateProfile} />}
        {activeModal === 'addWisdom' && <AddWisdomModal onClose={() => setActiveModal(null)} onSave={handleAddWisdom} />}
        {activeModal === 'addMood' && <AddMoodModal onClose={() => setActiveModal(null)} onSave={handleAddMood} />}
        {activeModal === 'playlistManager' && <PlaylistManagerModal onClose={() => setActiveModal(null)} onImportClick={() => setActiveModal('importPlaylist')} onExportClick={handleExportPlaylists} />}
        {activeModal === 'importPlaylist' && <ImportPlaylistModal onClose={() => { setActiveModal(null); }} onImport={handleImportPlaylist} isLoading={isImportingPlaylist} />}
        {modalData?.songForShare && <ShareablePreviewModal song={modalData.songForShare} onClose={() => setModalData(null)} />}
        
        <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleDurationChange} onEnded={handleEnded} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" />
        <audio ref={secondaryAudioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleDurationChange} onEnded={handleEnded} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} crossOrigin="anonymous" />
    </div>
  );
};

export default App;