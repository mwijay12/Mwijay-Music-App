declare var process: any;
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
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
import RingtoneMakerModal from './RingtoneMakerModal';
import { MultiStepLoader } from './MultiStepLoader';
import { useAssistant } from './useAssistant';
import { useAudioFx } from '../hooks/useAudioFx';
// FIX: Added missing imports for fetchFromJamendo and fetchFromAudius
import { initDB, getSongs, saveSongs, getPlaylists, savePlaylists, getProfile, saveProfile, getVideos, saveVideos, getReelPlaylists, saveReelPlaylists, getPlayQueue, savePlayQueue, getRadioPlaylists, saveRadioPlaylists, getArtists, saveArtist, fetchRadioAPI, fetchFromJamendo, fetchFromAudius } from './db';
// FIX: Corrected import path for constants.
import { navItems, themePairs as themes, fonts, achievements, FAVORITES_PLAYLIST_ID, defaultMoods, getRandomCoverArt } from '../constants.ts';
import type { Song, RadioStation, Notification as NotificationType, Playlist, ProfileData, Achievement, Video, ThemeColors, ReelPlaylist, RadioPlaylist, Artist, ThemePair } from '../types';


const loadingStates = [
  { text: "🎵 Tuning your vibe..." },
  { text: "🌈 Blending gradients & glow..." },
  { text: "🎧 Personalizing your sound..." },
  { text: "✨ Animating micro‑interactions..." },
  { text: "🔊 Boosting bass & clarity..." },
];

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


// --- Onboarding Component ---
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


// --- Confetti Component ---
const Confetti: React.FC = () => {
    const confetti = Array.from({ length: 150 }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
            transform: `scale(${Math.random() * 0.7 + 0.5})`,
        };
        return <div key={i} className="confetti" style={style}></div>;
    });
    return <div className="confetti-container">{confetti}</div>;
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null);
  const [activeAudio, setActiveAudio] = useState<'primary' | 'secondary'>('primary');
  const listenTimeIntervalRef = useRef<number | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);
  const nowPlayingIdRef = useRef<string | null>(null);
  const { audioFx, initializeAudioFx, applySettings } = useAudioFx();
  const [achievementsToShow, setAchievementsToShow] = useState<Achievement[]>([]);
  const metronomeContextRef = useRef<AudioContext | null>(null);
  const justEndedRef = useRef(false);
  const isCrossfadingRef = useRef(false);
  const idleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
      const resetIdleTimer = () => {
          if (idleTimeoutRef.current) {
              clearTimeout(idleTimeoutRef.current);
          }
          document.body.classList.remove('is-idle');
          idleTimeoutRef.current = window.setTimeout(() => {
              document.body.classList.add('is-idle');
          }, 5000);
      };

      const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll'];
      events.forEach(event => window.addEventListener(event, resetIdleTimer, { passive: true }));
      
      resetIdleTimer(); // Initial call

      return () => {
          events.forEach(event => window.removeEventListener(event, resetIdleTimer));
          if (idleTimeoutRef.current) {
              clearTimeout(idleTimeoutRef.current);
          }
      };
  }, []);

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
          setAchievementsToShow(prev => [...prev, ...newlyUnlocked]);
          setProfile(p => {
              if (!p) return null;
              return {
                ...p,
                unlockedAchievements: [...p.unlockedAchievements, ...newlyUnlocked.map(a => ({ id: a.id, date: Date.now() }))]
              };
          });
      }
  }, [librarySongs]);
  
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
        setPlayQueue(q => q.map(s => (s.id === updatedSong.id ? { ...s, ...updatedSong } : s)));
        setNowPlaying(np => (np && np.id === updatedSong.id) ? { ...np, ...updatedSong } : np);
    }, []);
    
    const handleAddSongs = useCallback((newSongs: Song[]) => {
        setLibrarySongs(prevSongs => {
            const songsToUpdate = new Map<string, Song>();
            const songsToAdd: Song[] = [];

            newSongs.forEach(newSong => {
                if (prevSongs.some(s => s.id === newSong.id)) {
                    songsToUpdate.set(newSong.id, newSong);
                } else {
                    songsToAdd.push(newSong);
                }
            });
            
            let updatedSongs = [...prevSongs];
            if (songsToUpdate.size > 0) {
                updatedSongs = updatedSongs.map(s => songsToUpdate.has(s.id) ? { ...s, ...songsToUpdate.get(s.id) } : s);
            }

            if (songsToAdd.length > 0) {
                 const isDownload = !!songsToAdd[0].source;
                 if (isDownload) {
                     setRecentlyAddedSongId(songsToAdd[0].id);
                     updateProfile(p => ({ ...p, analytics: { ...p.analytics, songsDownloaded: (p.analytics.songsDownloaded || 0) + songsToAdd.length }}));
                 } else {
                     updateProfile(p => ({ ...p, analytics: { ...p.analytics, songsUploaded: p.analytics.songsUploaded + songsToAdd.length }}));
                 }
            }
            
            return [...updatedSongs, ...songsToAdd];
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

  const handleNext = useCallback(() => {
    if (playQueue.length === 0) return;
    let nextIndex;
    if (isShuffled && shuffleOrder.length > 0) {
        const currentShuffleIndex = shuffleOrder.indexOf(currentQueueIndex);
        nextIndex = shuffleOrder[(currentShuffleIndex + 1) % shuffleOrder.length];
    } else {
        nextIndex = (currentQueueIndex + 1) % playQueue.length;
    }
    setCurrentQueueIndex(nextIndex);
  }, [playQueue.length, currentQueueIndex, isShuffled, shuffleOrder]);

  const handlePrev = useCallback(() => {
    const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (playQueue.length === 0) return;
    let prevIndex;
    if (isShuffled && shuffleOrder.length > 0) {
        const currentShuffleIndex = shuffleOrder.indexOf(currentQueueIndex);
        prevIndex = shuffleOrder[(currentShuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length];
    } else {
        prevIndex = (currentQueueIndex - 1 + playQueue.length) % playQueue.length;
    }
    setCurrentQueueIndex(prevIndex);
  }, [playQueue.length, currentQueueIndex, isShuffled, shuffleOrder, activeAudio]);
  
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
        fadeAudio(audio, 0, 500, () => {
            audio.pause();
        });
    } else {
        audio.volume = 0;
        audio.play().then(() => {
             fadeAudio(audio, 1, 500);
        }).catch(e => {
            if (e instanceof Error && e.name === 'AbortError') {
                // This is an expected error when playback is interrupted. Do nothing.
            } else {
                console.error("Play error:", String(e));
                showNotification("Playback failed.", "error");
            }
        });
    }
  }, [isPlaying, nowPlaying, audioFx, activeAudio, showNotification, profile, applySettings]);

    const handleOpenAssistant = useCallback(() => {
        if (isAssistantOpening || isAssistantVisible) return;
        setIsAssistantOpening(true);
        setTimeout(() => {
            setIsAssistantVisible(true);
            setIsAssistantOpening(false);
        }, 1800); // Increased delay for animation
    }, [isAssistantOpening, isAssistantVisible]);
    
    const onCycleRepeat = useCallback(() => setRepeatMode(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'), []);
    const onToggleShuffle = useCallback(() => setIsShuffled(s => !s), []);


  useEffect(() => {
    if (isLoaded) {
      if (audioRef.current) initializeAudioFx(audioRef.current);
      if (secondaryAudioRef.current) initializeAudioFx(secondaryAudioRef.current);
    }
  }, [isLoaded, initializeAudioFx]);
  
  useEffect(() => {
    const songToPlay = playQueue[currentQueueIndex];
    isCrossfadingRef.current = false;

    if (songToPlay && songToPlay.id === nowPlayingIdRef.current) {
        setNowPlaying(songToPlay);
        return;
    }

    nowPlayingIdRef.current = songToPlay?.id || null;

    if (!songToPlay) {
      const primaryAudio = audioRef.current;
      const secondaryAudio = secondaryAudioRef.current;
      if (primaryAudio) { primaryAudio.pause(); primaryAudio.src = ''; }
      if (secondaryAudio) { secondaryAudio.pause(); secondaryAudio.src = ''; }
      setNowPlaying(null);
      setIsPlaying(false);
      return;
    }

    const primaryAudio = audioRef.current;
    const secondaryAudio = secondaryAudioRef.current;

    if (!primaryAudio || !secondaryAudio) return;

    const crossfadeMs = (profile?.settings.crossfadeDuration ?? 0) * 1000;
    const isPrimaryActive = activeAudio === 'primary';
    const fadeOutAudio = isPrimaryActive ? primaryAudio : secondaryAudio;
    const fadeInAudio = isPrimaryActive ? secondaryAudio : primaryAudio;

    const loadAndPlay = async (audioEl: HTMLAudioElement, song: Song, shouldFadeIn: boolean) => {
        if (audioEl.src && audioEl.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioEl.src);
        }
        let newSrc = '';
        if (song.audioData) {
            const blob = new Blob([song.audioData], { type: song.mimeType || 'audio/mpeg' });
            newSrc = URL.createObjectURL(blob);
        } else if (song.url) {
            newSrc = song.url;
        } else {
            showNotification(`"${truncate(song.title, 20)}" is unplayable. Skipping.`, 'error');
            setTimeout(handleNext, 500);
            return;
        }
        audioEl.src = newSrc;
        audioEl.load();

        try {
            if (shouldFadeIn && crossfadeMs > 0) {
                audioEl.volume = 0;
            } else {
                audioEl.volume = 1;
            }
            await audioEl.play();
            if (shouldFadeIn && crossfadeMs > 0) {
                fadeAudio(audioEl, 1, crossfadeMs);
            }
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') {
                console.error("Play error:", String(e));
                setIsPlaying(false);
            }
        }
    };

    setNowPlaying(songToPlay);
    
    if (songToPlay.duration !== Infinity && songToPlay.source) {
        updateProfile(p => ({ ...p, recentlyPlayedOnline: [songToPlay, ...(p.recentlyPlayedOnline || []).filter(s => s.id !== songToPlay.id)].slice(0, 10) }));
    } else if (songToPlay.duration !== Infinity) {
         updateProfile(p => ({ ...p, recentlyPlayed: [songToPlay.id, ...(p.recentlyPlayed || []).filter(id => id !== songToPlay.id)].slice(0, 20) }));
    }

    if (crossfadeMs > 0 && isPlaying && fadeOutAudio && fadeOutAudio.src && !fadeOutAudio.src.endsWith('/')) {
        loadAndPlay(fadeInAudio, songToPlay, true);
        fadeAudio(fadeOutAudio, 0, crossfadeMs, () => {
            if (typeof fadeOutAudio.pause === 'function') {
                fadeOutAudio.pause();
            }
            fadeOutAudio.src = '';
        });
        setActiveAudio(isPrimaryActive ? 'secondary' : 'primary');
    } else {
        const activeEl = isPrimaryActive ? primaryAudio : secondaryAudio;
        const inactiveEl = isPrimaryActive ? secondaryAudio : primaryAudio;
        if (inactiveEl && typeof inactiveEl.pause === 'function') {
            inactiveEl.pause();
            inactiveEl.src = '';
        }
        if (activeEl) {
            loadAndPlay(activeEl, songToPlay, false);
        }
    }

  }, [currentQueueIndex, playQueue, profile?.settings.crossfadeDuration, activeAudio, handleNext, isPlaying, showNotification, updateProfile]);
  
  useEffect(() => {
    const metronomeSettings = profile?.settings.metronome;
    if (!metronomeSettings) return;

    if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
    }

    if (metronomeSettings.enabled) {
        if (!metronomeContextRef.current || metronomeContextRef.current.state === 'closed') {
            metronomeContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const context = metronomeContextRef.current;

        const playSound = (type: string) => {
            if (context.state === 'suspended') context.resume();
            const now = context.currentTime;
            if (type === 'beep') {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.frequency.setValueAtTime(880, now);
                gain.gain.setValueAtTime(1, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'click' || type === 'tick') {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(type === 'click' ? 1200 : 1000, now);
                gain.gain.setValueAtTime(1, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
                osc.start(now);
                osc.stop(now + 0.02);
            } else if (type === 'kick') {
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.connect(gain);
                gain.connect(context.destination);
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(0.001, now + 0.1);
                gain.gain.setValueAtTime(1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'snare') {
                const noise = context.createBufferSource();
                const bufferSize = context.sampleRate;
                const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
                const output = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                noise.buffer = buffer;
                const noiseFilter = context.createBiquadFilter();
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.setValueAtTime(1000, now);
                const noiseGain = context.createGain();
                noise.connect(noiseFilter).connect(noiseGain).connect(context.destination);
                noiseGain.gain.setValueAtTime(1, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                noise.start(now);
                noise.stop(now + 0.1);
                const osc = context.createOscillator();
                const oscGain = context.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.connect(oscGain).connect(context.destination);
                oscGain.gain.setValueAtTime(0.8, now);
                oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'hihat') {
                const noise = context.createBufferSource();
                const bufferSize = context.sampleRate;
                const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
                const output = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                noise.buffer = buffer;
                const noiseFilter = context.createBiquadFilter();
                noiseFilter.type = 'highpass';
                noiseFilter.frequency.setValueAtTime(7000, now);
                const noiseGain = context.createGain();
                noise.connect(noiseFilter).connect(noiseGain).connect(context.destination);
                noiseGain.gain.setValueAtTime(1, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                noise.start(now);
                noise.stop(now + 0.05);
            }
        };
        const interval = (60 / metronomeSettings.bpm) * 1000;
        let beatCount = 0;
        metronomeIntervalRef.current = window.setInterval(() => {
            playSound(metronomeSettings.soundType)
            beatCount++;
            if (beatCount % 60 === 0) { // Update every minute
                updateProfile(p => ({
                    ...p,
                    analytics: { ...p.analytics, metronomeUsageTime: (p.analytics.metronomeUsageTime || 0) + 60 }
                }));
            }
        }, interval);
    }

    return () => {
        if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
        if (metronomeContextRef.current && metronomeContextRef.current.state === 'running') {
            metronomeContextRef.current.close().catch(e => console.error("Error closing metronome context:", String(e)));
            metronomeContextRef.current = null;
        }
    };
}, [profile?.settings.metronome, updateProfile]);

  useEffect(() => {
      if (profile?.settings && audioFx) {
          applySettings(profile.settings);
      }
  }, [profile?.settings, audioFx, applySettings]);

  const handleToggleFavorite = useCallback((songId: string) => {
    const song = librarySongs.find(s => s.id === songId) || (nowPlaying && nowPlaying.id === songId ? nowPlaying : null);
    
    if (!song) {
        showNotification("Cannot favorite this song.", 'error');
        return;
    }
    
    const isSongInLibrary = librarySongs.some(s => s.id === songId);
    const isCurrentlyFavorite = song.isFavorite || false;
    const isNowFavorite = !isCurrentlyFavorite;

    // 1. Add to library if it's not there and is being favorited.
    if (!isSongInLibrary && isNowFavorite) {
        const songToAdd = { ...song, isFavorite: true, dateAdded: Date.now() };
        setLibrarySongs(prev => [...prev, songToAdd]);
    } else {
    // 2. Update the favorite status of the song in the library.
        setLibrarySongs(prev => prev.map(s => s.id === songId ? { ...s, isFavorite: isNowFavorite } : s));
    }

    // 3. Update nowPlaying if it's the current song.
    setNowPlaying(current => (current && current.id === songId) ? { ...current, isFavorite: isNowFavorite } : current);

    // 4. Update the favorites playlist.
    setPlaylists(prev => {
        const favPlaylist = prev.find(p => p.id === FAVORITES_PLAYLIST_ID) || { id: FAVORITES_PLAYLIST_ID, name: 'Favorites', coverImage: getRandomCoverArt(), songIds: [] };
        const otherPlaylists = prev.filter(p => p.id !== FAVORITES_PLAYLIST_ID);
        const newSongIds = isNowFavorite 
            ? [...favPlaylist.songIds, songId]
            : favPlaylist.songIds.filter(id => id !== songId);
        
        return [{ ...favPlaylist, songIds: Array.from(new Set(newSongIds)) }, ...otherPlaylists];
    });

    // 5. Check achievements.
    if (isNowFavorite) {
        checkAchievements(profile, 'favorite1', 1);
    }
}, [librarySongs, nowPlaying, profile, showNotification, checkAchievements]);

  const handleToggleLyrics = useCallback((forceOpen?: 'full' | 'minimized') => {
    if (!nowPlaying) return;
    if (forceOpen === 'full') {
        setIsLyricsVisible(true);
        setIsLyricsMinimized(false);
        return;
    }
     if (forceOpen === 'minimized') {
        setIsLyricsVisible(false);
        setIsLyricsMinimized(true);
        return;
    }
    if (nowPlaying.lyrics) {
        if (isLyricsVisible) {
            setIsLyricsVisible(false);
            setIsLyricsMinimized(true);
        } else {
            setIsLyricsMinimized(m => !m);
        }
        updateProfile(p => {
            if (!p || p.usedFeatures.lyricsViewed) return p;
            return { ...p, usedFeatures: { ...p.usedFeatures, lyricsViewed: true } };
        });
    } else {
        setIsLyricsVisible(true);
        setIsLyricsMinimized(false);
    }
  }, [nowPlaying, isLyricsVisible, updateProfile]);
  
  const handleNavigate = useCallback((view: string) => {
    setActiveView(view);
    setViewHistory(hist => [...hist, view]);
  }, []);

  const handleBack = useCallback(() => {
    if (reelPlaylistToViewId) {
        setReelPlaylistToViewId(null);
        return;
    }
    if (playlistToViewId) {
        setPlaylistToViewId(null);
        return;
    }
    if (artistToView) {
        setArtistToView(null);
        return;
    }
    const history = [...viewHistory];
    history.pop();
    const prevView = history[history.length - 1] || 'Home';
    setActiveView(prevView);
    setViewHistory(history);
  }, [artistToView, playlistToViewId, reelPlaylistToViewId, viewHistory]);

    const handlePlaySong = useCallback((song: Song, context: Song[]) => {
        if (audioFx && audioFx.context.state === 'suspended') {
            audioFx.context.resume().then(() => {
                if (profile) {
                    applySettings(profile.settings);
                }
            });
        }
        const queueWithIds = context.map((s, i) => ({ ...s, queueId: `${s.id}-${Date.now()}-${i}` }));
        const songIndex = queueWithIds.findIndex(s => s.id === song.id);

        // Close any open overlays BEFORE setting the new song to prevent visual glitches
        setIsPlayerVisible(false);
        setActiveModal(null);
        setIsLyricsVisible(false);

        setPlayQueue(queueWithIds);
        setCurrentQueueIndex(songIndex !== -1 ? songIndex : 0);
        setNowPlaying(song);
        
        setIsShuffled(false);
        setShuffleOrder([]);
        setIsPlaying(true);
    }, [audioFx, profile, applySettings]);

  const handlePlayStation = useCallback((station: RadioStation) => {
    if (audioFx && audioFx.context.state === 'suspended') {
        audioFx.context.resume();
    }
    const stationAsSong: Song = {
      id: station.stationuuid,
      title: station.name,
      artist: station.country,
      albumArtUrl: station.favicon || getRandomCoverArt(),
      url: station.url_resolved,
      duration: Infinity,
      isFavorite: false,
    };
    setPlayQueue([stationAsSong]);
    setCurrentQueueIndex(0);
    setNowPlaying(stationAsSong);
    setIsPlayerVisible(false);
    setIsPlaying(true);
    
    updateProfile(p => {
        if (!p) return p;
        const newAnalytics = {
          ...p.analytics,
          topRadios: addToTopRadios(p.analytics.topRadios, station.stationuuid, station.name)
        };
        const newRecentlyPlayedRadios = [station, ...(p.recentlyPlayedRadios || []).filter(r => r.stationuuid !== station.stationuuid)].slice(0, 10);
        return { ...p, analytics: newAnalytics, recentlyPlayedRadios: newRecentlyPlayedRadios };
    });
  }, [updateProfile, audioFx]);
  
    const handlePlayReelAsAudio = useCallback((video: Video) => {
        const isAlreadyPlaying = nowPlaying?.id === video.id && nowPlaying.isFromReel;

        if (isAlreadyPlaying) {
            const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
            if (audio) {
                audio.pause();
                setNowPlaying(null);
                setIsPlaying(false);
            }
            return;
        }

        if (video.videoData) {
            const blob = new Blob([video.videoData], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            const reelAsSong: Song = {
                id: video.id,
                title: video.title,
                artist: video.uploader || 'Reel Audio',
                albumArtUrl: video.thumbnailUrl || getRandomCoverArt(),
                url: url,
                isFromReel: true,
            };
            setPlayQueue(q => [reelAsSong, ...q.filter(s => s.id !== reelAsSong.id)]);
            setCurrentQueueIndex(0);
            setNowPlaying(reelAsSong);
            setIsPlayerVisible(false);
            setIsPlaying(true);
        }
    }, [nowPlaying, activeAudio]);

  const handlePlayPlaylistRadio = useCallback((playlist: Playlist) => {
      const playlistSongs = playlist.songIds.map(id => librarySongs.find(s => s.id === id)).filter((s): s is Song => !!s);
      if (playlistSongs.length === 0) {
          showNotification(`Playlist "${playlist.name}" is empty.`, 'info');
          return;
      }
      const shuffledSongs = [...playlistSongs].sort(() => Math.random() - 0.5);
      handlePlaySong(shuffledSongs[0], shuffledSongs);
      showNotification(`Playing radio from "${playlist.name}"`, 'success', 'fa-tower-broadcast');
  }, [librarySongs, handlePlaySong, showNotification]);

  const handleSetSleepTimer = useCallback((mode: 'duration' | 'songs' | 'off', value: number) => {
    if (sleepTimer.timeoutId) clearTimeout(sleepTimer.timeoutId);
    if (mode === 'off') {
        setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
        showNotification('Sleep timer cancelled.', 'info');
    } else if (mode === 'duration') {
        const timeoutId = window.setTimeout(() => {
            const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
            if (audio) {
                 fadeAudio(audio, 0, 3000, () => audio.pause());
            }
            setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
            showNotification('Sleep timer ended.', 'info', 'fa-bed');
        }, value * 60 * 1000);
        setSleepTimer({ mode: 'duration', value, timeoutId, songCount: 0, endTime: Date.now() + value * 60 * 1000 });
        showNotification(`Sleep timer set for ${value} minutes.`, 'success');
    } else {
        setSleepTimer({ mode: 'songs', value, timeoutId: null, songCount: value });
        showNotification(`Music will stop after ${value} songs.`, 'success');
    }
  }, [showNotification, sleepTimer.timeoutId, activeAudio]);
  
  const ai = useMemo(() => {
    if (process.env.API_KEY) {
      try {
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI", String(e));
        return null;
      }
    }
    return null;
  }, []);
  
  const createLocalAiPlaylist = useCallback(() => {
        if (!profile || librarySongs.length < 5) {
            showNotification("Not enough music in your library for a local playlist.", 'info');
            return;
        }

        const topSongIds = new Set(profile.analytics.topSongs.slice(0, 10).map(s => s.id));
        const topArtistNames = new Set(profile.analytics.topArtists.slice(0, 5).map(a => a.name));

        const topSongs = librarySongs.filter(s => topSongIds.has(s.id));
        const songsFromTopArtists = librarySongs.filter(s => topArtistNames.has(s.artist) && !topSongIds.has(s.id));
        const otherSongs = librarySongs.filter(s => !topSongIds.has(s.id) && !topArtistNames.has(s.artist));

        const shuffle = (arr: Song[]) => arr.sort(() => 0.5 - Math.random());
        
        const finalPlaylist = shuffle([
            ...topSongs,
            ...shuffle(songsFromTopArtists).slice(0, 10),
            ...shuffle(otherSongs).slice(0, 5)
        ]).slice(0, 25);

        if (finalPlaylist.length > 0) {
            showNotification("Created a playlist from your local favorites!", 'success');
            handlePlaySong(finalPlaylist[0], finalPlaylist);
        } else {
             // Fallback if filtering results in empty, just shuffle library
            const shuffledLibrary = shuffle([...librarySongs]).slice(0, 25);
            handlePlaySong(shuffledLibrary[0], shuffledLibrary);
        }
    }, [profile, librarySongs, showNotification, handlePlaySong]);

  const handlePlayAiPlaylist = useCallback(async () => {
    if (!profile) return;
    setIsGeneratingAiPlaylist(true);

    if (!ai || !navigator.onLine) {
        showNotification("AI is offline, creating a local playlist instead.", 'info');
        createLocalAiPlaylist();
        setIsGeneratingAiPlaylist(false);
        return;
    }

    try {
      const topSongTitles = profile.analytics.topSongs.slice(0, 5).map(s => `${s.title} by ${s.artist}`).join(', ');
      
      const prompt = `Based on these songs I like (${topSongTitles.length > 0 ? topSongTitles : "various pop and electronic music"}), generate a playlist of 10 songs with a creative playlist name. The songs should be real songs that exist. Format the response as a JSON object with two keys: "playlistName" (string) and "songs" (an array of strings, where each string is "Song Title by Artist").`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: "application/json" }
      });
      const aiResponse = JSON.parse((response.text || '').trim());

      const playlistName = aiResponse?.playlistName || "AI Generated Playlist";
      const songStrings: string[] = Array.isArray(aiResponse?.songs) ? aiResponse.songs : [];
      
      showNotification("Finding songs online...", 'info', 'fa-search');
      
      const newPlaylistSongs: Song[] = (await Promise.all(songStrings.map(async (songStr) => {
        const query = songStr.replace(' by ', ' ');
        let results = await fetchFromJamendo(query, 1, 1);
        if (results.length > 0) return results[0];
        results = await fetchFromAudius(query, 1, 1);
        if (results.length > 0) return results[0];
        // results = await fetchFromArchive(query, 1, 1);
        // if (results.length > 0) return results[0];
        return null;
      }))).filter((s): s is Song => !!s);
      
      if (newPlaylistSongs.length > 0) {
        showNotification(`Created playlist: ${playlistName}`, 'success', 'fa-wand-magic-sparkles');
        handlePlaySong(newPlaylistSongs[0], newPlaylistSongs);
      } else {
        showNotification("Couldn't find matching songs online, creating a local playlist.", 'info');
        createLocalAiPlaylist();
      }
    } catch (error) {
      console.error("AI Playlist generation failed:", String(error));
      showNotification("Could not create AI playlist, creating a local one instead.", 'error');
      createLocalAiPlaylist();
    } finally {
      setIsGeneratingAiPlaylist(false);
    }
  }, [profile, showNotification, handlePlaySong, ai, createLocalAiPlaylist]);

  const handlePlayRadio = useCallback(async (query?: string) => {
    showNotification("Tuning into the airwaves...", 'info');
    try {
        const path = query 
            ? `/stations/search?name=${encodeURIComponent(query)}&limit=10&order=clickcount&reverse=true&hidebroken=true`
            : '/stations/search?limit=10&order=clickcount&reverse=true&hidebroken=true';
        
        const stations = await fetchRadioAPI(path);
        
        if (stations.length > 0) {
            const station = stations[Math.floor(Math.random() * stations.length)];
            handlePlayStation(station);
        } else {
            showNotification(`Couldn't find any radio stations for "${query || 'your request'}".`, 'error');
        }
    } catch (error) {
        console.error("Error playing radio:", String(error));
        showNotification("Could not connect to radio services.", 'error');
    }
  }, [showNotification, handlePlayStation]);

  const handlePlaySongFromLibrary = useCallback((songTitle: string) => {
    const songToPlay = findSongByTitle(songTitle, librarySongs);
    if (songToPlay) {
        handlePlaySong(songToPlay, [songToPlay, ...librarySongs.filter(s => s.id !== songToPlay.id)]);
        showNotification(`Now playing "${truncate(songToPlay.title, 20)}"`, 'info');
    } else {
        showNotification(`Could not find a song called "${truncate(songTitle, 20)}" in your library.`, 'error');
    }
  }, [librarySongs, handlePlaySong, showNotification]);

  const handleAddToQueueFromAssistant = useCallback((songTitle: string) => {
    const songToAdd = findSongByTitle(songTitle, librarySongs);
    if (songToAdd) {
        setPlayQueue(q => [...q, { ...songToAdd, queueId: `${songToAdd.id}-${Date.now()}` }]);
        setIsQueueFlashing(true);
        setTimeout(() => setIsQueueFlashing(false), 500);
        showNotification(`"${truncate(songToAdd.title, 20)}" added to queue`, 'info', 'fa-plus');
    } else {
        showNotification(`Could not find a song called "${truncate(songTitle, 20)}" in your library.`, 'error');
    }
  }, [librarySongs, showNotification]);
  
  const handleSetBackgroundEffect = useCallback((enabled: boolean, style?: ProfileData['settings']['backgroundEffects']['style']) => {
      updateProfile(p => {
          const newSettings = { ...p.settings.backgroundEffects, enabled };
          if (style) {
              newSettings.style = style;
          }
          const newUsedFeatures = style ? new Set(p.usedFeatures.backgroundEffects).add(style) : p.usedFeatures.backgroundEffects;
          return { 
              ...p, 
              settings: { ...p.settings, backgroundEffects: newSettings },
              usedFeatures: { ...p.usedFeatures, backgroundEffects: newUsedFeatures }
            };
      });
      showNotification(`Background effects updated.`, 'success');
  }, [updateProfile, showNotification]);
  
    const handleThemePairChange = (themeName: string) => {
        const selectedTheme = themes.find(t => t.name === themeName);
        if (!selectedTheme) return;

        updateProfile(p => {
            if (!p) return p;
            
            const newThemes = new Set(p.usedFeatures.themes).add(themeName);
            let newThemeMode = p.themeMode;

            if (selectedTheme.category === 'Light') {
                newThemeMode = 'light';
            } else if (selectedTheme.category === 'Dark') {
                newThemeMode = 'dark';
            }

            return {
                ...p,
                activeThemePair: themeName,
                themeMode: newThemeMode,
                usedFeatures: { ...p.usedFeatures, themes: newThemes }
            };
        });
    };

    const handleFontChange = (fontName: string) => {
        updateProfile(p => {
            if (!p) return p;
            const newFonts = new Set(p.usedFeatures.fonts).add(fontName);
            return {
                ...p,
                activeFont: fontName,
                usedFeatures: { ...p.usedFeatures, fonts: newFonts }
            };
        });
    };

    const handleApplyCustomTheme = (colors: ProfileData['customThemeColors']) => {
        updateProfile(p => {
            if (!p) return p;
            return {
                ...p,
                activeThemePair: 'Custom',
                customThemeColors: colors
            };
        });
        checkAchievements(profile, 'customTheme', 1);
    };
    
    const [initialAssistantSearch, setInitialAssistantSearch] = useState<string | undefined>(undefined);
    
    const handleSearchOnlineMusic = (query: string) => {
        handleNavigate('Explore');
        setInitialAssistantSearch(query);
    };

    const { messages: assistantMessages, sendMessage: sendAssistantMessage, isOnline: isAssistantOnline, toggleOnlineMode } = useAssistant({
      getAppState: () => ({ nowPlaying, isPlaying, librarySongs, isSimpleMode: profile?.settings.simpleMode.enabled ?? false, profile: profile! }),
      controls: {
          togglePlay: handleTogglePlay,
          playNext: handleNext,
          playPrev: handlePrev,
          setSimpleMode: (val: boolean) => updateProfile(p => ({...p, settings: {...p.settings, simpleMode: { ...p.settings.simpleMode, enabled: val }}})),
          playRadio: handlePlayRadio,
          toggleInputView: () => setIsAssistantInputVisible(v => !v),
          setThemeMode: (mode: 'light' | 'dark') => updateProfile(p => ({...p, themeMode: mode})),
          setSleepTimer: handleSetSleepTimer,
          changeFont: (fontName: string) => updateProfile(p => ({...p, activeFont: fontName})),
          applyCustomTheme: (colors: ProfileData['customThemeColors']) => { updateProfile(p => ({...p, activeThemePair: 'Custom', customThemeColors: colors})); },
          playSongFromLibrary: handlePlaySongFromLibrary,
          addToQueue: handleAddToQueueFromAssistant,
          toggleFavorite: () => { if (nowPlaying) handleToggleFavorite(nowPlaying.id) },
          navigateToView: handleNavigate,
          openAudioEffects: () => { if (nowPlaying) setActiveModal('equalizer') },
          setBackgroundEffect: handleSetBackgroundEffect,
          searchOnlineMusic: handleSearchOnlineMusic,
          playAiPlaylist: handlePlayAiPlaylist,
// FIX: Pass toggleShuffle and cycleRepeat to the useAssistant controls to resolve type errors.
          toggleShuffle: onToggleShuffle,
          cycleRepeat: onCycleRepeat,
      },
      showNotification,
  });

  useEffect(() => {
    const loadData = async () => {
      await initDB();
      const [songs, playlists, loadedProfile, videos, reelPlaylists, queue, radioPlaylists, artists] = await Promise.all([
          getSongs(), getPlaylists(), getProfile(), getVideos(), getReelPlaylists(), getPlayQueue(), getRadioPlaylists(), getArtists()
      ]);
      setLibrarySongs(songs.map(s => ({...s, isFavorite: false})));
      setPlaylists(playlists);
      setVideos(videos);
      setReelPlaylists(reelPlaylists);
      setRadioPlaylists(radioPlaylists);
      setPlayQueue(queue);
      setProfile(loadedProfile);
      setArtists(artists);

      const favPlaylist = playlists.find(p => p.id === FAVORITES_PLAYLIST_ID);
      if (favPlaylist) {
          setLibrarySongs(currentSongs => currentSongs.map(s => favPlaylist.songIds.includes(s.id) ? { ...s, isFavorite: true } : s));
      }
      
      setTimeout(() => setIsLoaded(true), 4000);
    };
    loadData();
  }, []);
  
  useEffect(() => {
    const primaryAudio = audioRef.current;
    const secondaryAudio = secondaryAudioRef.current;
    return () => {
        if (primaryAudio?.src && primaryAudio.src.startsWith('blob:')) {
            URL.revokeObjectURL(primaryAudio.src);
        }
        if (secondaryAudio?.src && secondaryAudio.src.startsWith('blob:')) {
            URL.revokeObjectURL(secondaryAudio.src);
        }
    };
  }, []);

  useEffect(() => { if (isLoaded) saveSongs(librarySongs); }, [librarySongs, isLoaded]);
  useEffect(() => { if (isLoaded) saveVideos(videos); }, [videos, isLoaded]);
  useEffect(() => { if (isLoaded) savePlaylists(playlists); }, [playlists, isLoaded]);
  useEffect(() => { if (isLoaded) saveReelPlaylists(reelPlaylists); }, [reelPlaylists, isLoaded]);
  useEffect(() => { if (isLoaded) saveRadioPlaylists(radioPlaylists); }, [radioPlaylists, isLoaded]);
  useEffect(() => { if (isLoaded) savePlayQueue(playQueue); }, [playQueue, isLoaded]);
  useEffect(() => { if (isLoaded && profile) saveProfile(profile); }, [profile, isLoaded]);

  useEffect(() => {
    if (!profile?.settings.dynamicThemeEnabled || !nowPlaying?.albumArtUrl) {
        setDynamicThemeOverrides(null);
        return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = nowPlaying.albumArtUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        try {
            const imageData = ctx.getImageData(0, 0, 64, 64).data;
            const colorCounts: { [key: string]: number } = {};
            let darkestColor = { r: 255, g: 255, b: 255, l: 255 };

            const isGray = (r: number, g: number, b: number, tolerance = 20) => Math.abs(r - g) < tolerance && Math.abs(g - b) < tolerance;
            const getLuminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

            for (let i = 0; i < imageData.length; i += 4 * 4) {
                const r = imageData[i], g = imageData[i+1], b = imageData[i+2];
                const l = getLuminance(r, g, b);
                if (l < darkestColor.l) darkestColor = { r, g, b, l };
                if (imageData[i+3] < 128 || (r > 245 && g > 245 && b > 245) || (r < 10 && g < 10 && b < 10) || isGray(r,g,b)) continue;
                const key = `${r},${g},${b}`;
                colorCounts[key] = (colorCounts[key] || 0) + 1;
            }

            const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
            
            const primary = sortedColors[0] ? `rgb(${sortedColors[0]})` : '#C8F052';
            const secondaryStart = sortedColors[1] ? `rgb(${sortedColors[1]})` : '#A050FF';
            const secondaryEnd = sortedColors[2] ? `rgb(${sortedColors[2]})` : '#6955FF';
            
            const surfaceR = Math.floor(darkestColor.r * 0.4 + 10);
            const surfaceG = Math.floor(darkestColor.g * 0.4 + 10);
            const surfaceB = Math.floor(darkestColor.b * 0.4 + 10);
            const surfaceColor = `rgb(${surfaceR}, ${surfaceG}, ${surfaceB})`;
            
            const surfaceLuminance = getLuminance(surfaceR, surfaceG, surfaceB);
            const textPrimary = surfaceLuminance > 100 ? '#000000' : '#FFFFFF';
            const textSecondary = surfaceLuminance > 100 ? '#333333' : '#B3B3B3';

            setDynamicThemeOverrides({
                '--primary-accent': primary,
                '--secondary-accent-start': secondaryStart,
                '--secondary-accent-end': secondaryEnd,
                '--surface-color': surfaceColor,
                '--bg-color': `rgb(${Math.floor(surfaceR * 0.7)}, ${Math.floor(surfaceG * 0.7)}, ${Math.floor(surfaceB * 0.7)})`,
                '--chip-bg': `rgba(${surfaceR + 20}, ${surfaceG + 20}, ${surfaceB + 20}, 1)`,
                '--text-primary': textPrimary,
                '--text-secondary': textSecondary,
            });
        } catch (e) {
            console.error("Error getting dominant color:", String(e));
            setDynamicThemeOverrides(null);
        }
    };
    img.onerror = () => setDynamicThemeOverrides(null);
}, [nowPlaying?.albumArtUrl, profile?.settings.dynamicThemeEnabled]);


useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    
    const theme = themes.find(t => t.name === profile.activeThemePair);
    let colors: ThemeColors;
    
    if (theme) {
        colors = theme[profile.themeMode];
    } else if (profile.activeThemePair === 'Custom') {
        const base = profile.themeMode === 'light' 
          ? { '--bg-color': '#F9FAFB', '--surface-color': '#FFFFFF', '--text-primary': '#111827', '--text-secondary': '#374151', '--chip-bg': '#E5E7EB', '--surface-border-color': 'rgba(17, 24, 39, 0.1)' }
          : { '--bg-color': '#111827', '--surface-color': '#1F2937', '--text-primary': '#F9FAFB', '--text-secondary': '#D1D5DB', '--chip-bg': '#374151', '--surface-border-color': 'rgba(249, 250, 251, 0.1)' };
        colors = { ...base, '--primary-accent': profile.customThemeColors.primary, '--secondary-accent-start': profile.customThemeColors.secondary, '--secondary-accent-end': profile.customThemeColors.accent, }
    } else {
        const defaultTheme = themes.find(t => t.name === 'Default Dark') as ThemePair;
        colors = defaultTheme[profile.themeMode];
    }

    let finalColors = { ...colors };
    if (profile.settings.dynamicThemeEnabled && dynamicThemeOverrides) {
        finalColors = { ...finalColors, ...dynamicThemeOverrides };
    }

    Object.entries(finalColors).forEach(([key, value]) => { root.style.setProperty(key, value); });

    const font = fonts.find(f => f.name === profile.activeFont);
    if (font) { root.style.setProperty('--font-family', font.family); }
}, [profile?.activeThemePair, profile?.themeMode, profile?.activeFont, profile?.customThemeColors, dynamicThemeOverrides, profile?.settings.dynamicThemeEnabled]);
  
  useEffect(() => {
    if (listenTimeIntervalRef.current) clearInterval(listenTimeIntervalRef.current);
    if (isPlaying && nowPlaying) {
        listenTimeIntervalRef.current = window.setInterval(() => {
            updateProfile(p => {
                if (!p) return p;
                const isRadio = nowPlaying.duration === Infinity;
                const dayIndex = new Date().getDay();
                const newWeeklyActivity = [...p.analytics.weeklyActivity];
                newWeeklyActivity[dayIndex] = (newWeeklyActivity[dayIndex] || 0) + 1;

                return {
                  ...p,
                  analytics: {
                    ...p.analytics,
                    listenTime: isRadio ? p.analytics.listenTime : p.analytics.listenTime + 1,
                    radioListenTime: isRadio ? p.analytics.radioListenTime + 1 : p.analytics.radioListenTime,
                    weeklyActivity: newWeeklyActivity,
                  }
                };
            });
        }, 1000);
    }
    return () => { if (listenTimeIntervalRef.current) clearInterval(listenTimeIntervalRef.current); };
  }, [isPlaying, nowPlaying, updateProfile]);

  const isSeeking = useRef(false);
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
      if (!audio) return;
      const newTime = parseFloat(e.target.value);
      setProgress(newTime);
      audio.currentTime = newTime;
  };
  
  const logSongCompletion = useCallback(() => {
      if (nowPlaying && nowPlaying.duration !== Infinity) {
          updateProfile(p => {
              if (!p) return p;
              const newAnalytics = {
                  ...p.analytics,
                  songsPlayed: p.analytics.songsPlayed + 1,
                  topSongs: addToTopSongs(p.analytics.topSongs, nowPlaying),
                  topArtists: addToTopArtists(p.analytics.topArtists, nowPlaying.artist, nowPlaying.albumArtUrl),
              };
              return { ...p, analytics: newAnalytics };
          });
      }
  }, [nowPlaying, updateProfile]);
  
  const handleEnded = useCallback(() => {
      justEndedRef.current = true;
  
      if (sleepTimer.mode === 'songs' && sleepTimer.songCount > 0) {
          if (sleepTimer.songCount - 1 <= 0) {
              const activeAudioEl = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
              if (activeAudioEl) {
                  fadeAudio(activeAudioEl, 0, 3000, () => activeAudioEl.pause());
              }
              setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
              showNotification('Sleep timer ended.', 'info', 'fa-bed');
              setTimeout(() => { justEndedRef.current = false; }, 500);
              return;
          } else {
              setSleepTimer(s => ({...s, songCount: s.songCount - 1}));
          }
      }
      
      const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
      if (!audio) {
          setTimeout(() => { justEndedRef.current = false; }, 500);
          return;
      }
  
      logSongCompletion();
  
      if (repeatMode === 'one') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
      } else if (currentQueueIndex === playQueue.length - 1 && repeatMode !== 'all') {
          // End of queue.
      } else {
          if (!isCrossfadingRef.current) {
             handleNext();
          }
      }
  
      setTimeout(() => { justEndedRef.current = false; }, 500);
  }, [logSongCompletion, repeatMode, playQueue.length, handleNext, currentQueueIndex, sleepTimer.mode, sleepTimer.songCount, activeAudio, showNotification]);
  
  useEffect(() => {
    const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
    if (!audio) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
        if (justEndedRef.current) return;
        setIsPlaying(false);
    };
    
    const handleTimeUpdate = () => {
        if (isSeeking.current) return;
        setProgress(audio.currentTime);

        const crossfadeDuration = profile?.settings.crossfadeDuration ?? 0;
        if (isFinite(audio.duration)) {
            setDuration(audio.duration);
            if (crossfadeDuration > 0 && !isCrossfadingRef.current && audio.duration - audio.currentTime <= crossfadeDuration) {
                logSongCompletion();
                isCrossfadingRef.current = true;
                handleNext();
            }
        }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeAudio, handleEnded, profile?.settings.crossfadeDuration, handleNext, logSongCompletion]);

  useEffect(() => {
    if (achievementsToShow.length > 0) {
        const [first, ...rest] = achievementsToShow;
        showNotification(`Achievement Unlocked: ${first.name}`, 'success', first.icon);
        setTimeout(() => setAchievementsToShow(rest), 3500);
    }
  }, [achievementsToShow, showNotification]);

    const handleReelActiveChange = useCallback((isActive: boolean) => {
        const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current;
        if(isActive && isPlaying && audio) {
            audio.pause();
        }
    }, [isPlaying, activeAudio]);

    const handleToggleNavVisibility = useCallback((isHidden: boolean) => {
        setIsBottomNavHidden(isHidden);
    }, []);
    
    const handlePlayReelFromPlaylist = useCallback((videoId: string) => {
        setReelPlaylistToViewId(null);
        setActiveView('Reels');
        setInitialReelId(videoId);
        setTimeout(() => setInitialReelId(null), 500);
    }, []);

  const renderCurrentView = () => {
    const playlistToView = playlistToViewId ? playlists.find(p => p.id === playlistToViewId) : null;
    const reelPlaylistToView = reelPlaylistToViewId ? reelPlaylists.find(p => p.id === reelPlaylistToViewId) : null;
    
    if (reelPlaylistToView) {
        return <ReelPlaylistView
            playlist={reelPlaylistToView}
            allVideos={videos}
            onBack={() => setReelPlaylistToViewId(null)}
            onUpdatePlaylist={handleUpdateReelPlaylist}
            onDeletePlaylist={handleDeleteReelPlaylist}
            onPlayReel={handlePlayReelFromPlaylist}
        />
    }
    if (playlistToView) {
        return <PlaylistView 
            playlist={playlistToView} 
            allSongs={librarySongs} 
            onPlaySong={handlePlaySong}
            onBack={() => setPlaylistToViewId(null)}
            onUpdatePlaylist={handleUpdatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
        />
    }
    if (artistToView) {
        return <ArtistView artistName={artistToView} allSongs={librarySongs} onPlaySong={handlePlaySong} onBack={handleBack} onSaveArtist={(artist) => {
           const newArtists = artists.filter(a => a.name !== artist.name).concat(artist);
           setArtists(newArtists);
           saveArtist(artist);
           showNotification("Artist profile saved!", 'success');
        }} />;
    }
    switch(activeView) {
        case 'Library': return <LibraryView songs={librarySongs} playlists={playlists} onAddSongs={handleAddSongs} onUpdateSong={handleUpdateSong} onPlaySong={handlePlaySong} onAddToQueue={(song) => {
            setPlayQueue(q => [...q, { ...song, queueId: `${song.id}-${Date.now()}` }]);
            setIsQueueFlashing(true);
            setTimeout(() => setIsQueueFlashing(false), 500);
            showNotification(`"${truncate(song.title, 20)}" added to queue`, 'info', 'fa-plus');
        }} onCreatePlaylist={() => setActiveModal('create_playlist')} onViewPlaylist={setPlaylistToViewId} onDeletePlaylist={(id) => setPlaylists(p => p.filter(pl => pl.id !== id))} showNotification={showNotification} onOpenSongDetails={(song) => { setModalData(song); setActiveModal('share_preview'); }} onViewArtist={setArtistToView} onOpenPlaylistManager={() => setActiveModal('playlist_manager')} onDeleteSong={(songId) => {
            setLibrarySongs(s => s.filter(song => song.id !== songId));
            showNotification("Song deleted from library.", 'success');
        }} onPlayPlaylistRadio={handlePlayPlaylistRadio} recentlyAddedSongId={recentlyAddedSongId} />;
        case 'Reels': return <ReelsView videos={videos} reelPlaylists={reelPlaylists} onUpdate={setVideos} onUpdateReelPlaylists={setReelPlaylists} isLibraryPlaying={isPlaying && !nowPlaying?.isFromReel} onReelActiveChange={handleReelActiveChange} showNotification={showNotification} onToggleNavVisibility={handleToggleNavVisibility} profile={profile!} onUpdateProfile={updateProfile} onPlayReelAsAudio={handlePlayReelAsAudio} nowPlaying={nowPlaying} onOpenAssistant={handleOpenAssistant} isAssistantOnline={isAssistantOnline} onViewReelPlaylist={setReelPlaylistToViewId} initialVideoId={initialReelId} />;
// FIX: Removed invalid 'onToggleFavorite' prop from RadioView.
        case 'Radio': return <RadioView profile={profile} onPlayStation={handlePlayStation} favoriteStations={profile?.favoriteRadioStations || []} radioPlaylists={radioPlaylists} onUpdateRadioPlaylists={setRadioPlaylists} onNavigate={handleNavigate} />;
        case 'Settings': return <SettingsView profile={profile!} onUpdateProfile={updateProfile} onOpenNeonGlowModal={() => setActiveModal('neon_glow')} onNavigate={handleNavigate} />;
        case 'Create': return <CreateView librarySongs={librarySongs} onUpdateSong={handleUpdateSong} showNotification={showNotification} onGenerate={() => checkAchievements(profile!, 'ai-lyricist', 1)} />;
        case 'Profile': return <ProfileView profile={profile!} onUpdateProfile={updateProfile} onOpenAppearance={() => handleNavigate('Appearance')} onBack={handleBack} onNavigate={handleNavigate} />;
        case 'Analytics': return <AnalyticsView profile={profile!} onBack={handleBack} />;
        case 'Help': return <HelpView onBack={handleBack} />;
        case 'AssistantSettings': return <AssistantSettingsView onBack={handleBack} profile={profile!} onUpdateProfile={updateProfile} />;
        case 'CustomizeParticles': return <CustomizeParticlesView profile={profile!} onUpdateProfile={updateProfile} onBack={handleBack} />;
        case 'ManageRadioHub': return <ManageRadioHubView profile={profile!} onUpdateProfile={updateProfile} onBack={handleBack} />;
        case 'Explore': return <OnlineDiscoveryView profile={profile} librarySongs={librarySongs} onPlaySong={handlePlaySong} onAddSongs={handleAddSongs} showNotification={showNotification} onNavigate={handleNavigate} onPlayAiPlaylist={handlePlayAiPlaylist} isGeneratingAiPlaylist={isGeneratingAiPlaylist} initialSearchQuery={initialAssistantSearch} onClearInitialSearch={() => setInitialAssistantSearch(undefined)} onOpenSongDetails={(song) => { setModalData(song); setActiveModal('share_preview'); }} />;
        case 'SimpleModeSettings': return <SimpleModeSettingsView profile={profile!} onUpdateProfile={updateProfile} onBack={handleBack} onAddWisdom={() => setActiveModal('add_wisdom')} />;
        case 'Appearance': return <CustomizeAppearanceView profile={profile!} onClose={handleBack} onThemePairChange={handleThemePairChange} onFontChange={handleFontChange} onApplyCustomTheme={handleApplyCustomTheme} />;
        case 'Home':
        default:
            return <HomeView profile={profile!} librarySongs={librarySongs} onNavigate={handleNavigate} onPlaySong={handlePlaySong} onOpenAssistant={handleOpenAssistant} onToggleTheme={() => updateProfile(p => ({...p, themeMode: p.themeMode === 'light' ? 'dark' : 'light'}))} onOpenAddMoodModal={() => setActiveModal('add_mood')} isAssistantOpening={isAssistantOpening} />;
    }
  };

  const isSimpleModeActive = profile?.settings.simpleMode.enabled;

  if (!isLoaded || !profile) {
      return <MultiStepLoader loadingStates={loadingStates} loading={true} />;
  }
  
  if (!profile.onboarded) {
      return <Onboarding onComplete={({name, avatarUrl}) => updateProfile(p => ({...p, name, avatarUrl, onboarded: true}))} />;
  }

  return (
    <div className="h-full w-full relative">
        <BackgroundEffects settings={profile.settings.backgroundEffects} />
        
        {isSimpleModeActive && nowPlaying ? (
            <WisdomCardView
                song={nowPlaying}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onNext={handleNext}
                onPrev={handlePrev}
                profile={profile}
                onUpdateProfile={updateProfile}
                onExit={() => updateProfile(p => ({...p, settings: {...p.settings, simpleMode: {...p.settings.simpleMode, enabled: false }}}))}
                onToggleSongFavorite={() => handleToggleFavorite(nowPlaying.id)}
            />
        ) : (
            <>
                <div className="relative z-10 h-full w-full">
                    {renderCurrentView()}
                </div>

                {nowPlaying && (
                    <MiniPlayer
                        song={nowPlaying}
                        isPlaying={isPlaying}
                        onTogglePlay={handleTogglePlay}
                        onShowPlayer={() => setIsPlayerVisible(true)}
                        onToggleFavorite={() => handleToggleFavorite(nowPlaying.id)}
                        onNext={handleNext}
                        isHidden={isPlayerVisible || isSimpleModeActive || isBottomNavHidden}
                    />
                )}
                
                <BottomNav
                    items={navItems}
                    activeItem={activeView}
                    onItemClick={handleNavigate}
                    isHidden={isBottomNavHidden || isPlayerVisible || isSimpleModeActive}
                    profile={profile}
                />
            </>
        )}

        {nowPlaying && (
            <PlayerOverlay
                isVisible={isPlayerVisible}
                song={nowPlaying}
                isPlaying={isPlaying}
                progress={progress}
                duration={duration}
                onClose={() => setIsPlayerVisible(false)}
                onTogglePlay={handleTogglePlay}
                onNext={handleNext}
                onPrev={handlePrev}
                onSeek={handleSeek}
                onSeekStart={() => isSeeking.current = true}
                onSeekEnd={() => isSeeking.current = false}
                onSeekBy={(delta) => { const audio = activeAudio === 'primary' ? audioRef.current : secondaryAudioRef.current; if (audio) audio.currentTime += delta; }}
                onToggleFavorite={() => handleToggleFavorite(nowPlaying.id)}
                playQueue={playQueue}
                currentQueueIndex={currentQueueIndex}
                setPlayQueue={setPlayQueue}
                onPlayFromQueue={(song) => { const index = playQueue.findIndex(s => s.queueId === song.queueId); if (index !== -1) { setCurrentQueueIndex(index); setIsPlaying(true); } }}
                repeatMode={repeatMode}
                isShuffled={isShuffled}
                onCycleRepeat={onCycleRepeat}
                onToggleShuffle={onToggleShuffle}
                onSetSleepTimer={handleSetSleepTimer}
                sleepTimer={{...sleepTimer, value: sleepTimer.mode === 'duration' && sleepTimer.endTime ? Math.max(0, Math.ceil((sleepTimer.endTime - Date.now()) / 60000)) : sleepTimer.value }}
                profile={profile}
                onUpdateProfile={updateProfile}
                onToggleLyrics={handleToggleLyrics}
                onOpenMoodModal={() => setActiveModal('mood')}
                onOpenEqualizer={() => {
                    if (audioFx?.context.state === 'suspended') {
                        audioFx.context.resume().then(() => {
                            if (profile) {
                                applySettings(profile.settings);
                            }
                        });
                    }
                    setActiveModal('equalizer');
                }}
                isLyricsMinimized={isLyricsMinimized}
                favoriteStations={profile.favoriteRadioStations || []}
                onToggleFavoriteStation={(station) => updateProfile(p => ({ ...p, favoriteRadioStations: (p.favoriteRadioStations || []).some(s => s.stationuuid === station.stationuuid) ? (p.favoriteRadioStations || []).filter(s => s.stationuuid !== station.stationuuid) : [...(p.favoriteRadioStations || []), station] }))}
                isQueueFlashing={isQueueFlashing}
                onExitSimpleMode={() => updateProfile(p => ({ ...p, settings: { ...p.settings, simpleMode: { ...p.settings.simpleMode, enabled: false } } }))}
                visualizerColor={profile.settings.visualizerSettings.useAlbumArtColor ? (dynamicThemeOverrides ? dynamicThemeOverrides['--primary-accent'] : null) : null}
            />
        )}

        {isAssistantVisible && <AssistantView messages={assistantMessages} onSendMessage={sendAssistantMessage} onClose={() => setIsAssistantVisible(false)} onToggleInputView={() => setIsAssistantInputVisible(v => !v)} isInputVisible={isAssistantInputVisible} profile={profile} showNotification={showNotification} isOnline={isAssistantOnline} toggleOnlineMode={toggleOnlineMode} />}
        {notification && <Notification message={notification.message} type={notification.type} icon={notification.icon} />}
        <AnimatePresence>
            {achievementsToShow.length > 0 && <Confetti />}
        </AnimatePresence>

        {activeModal === 'create_playlist' && <CreatePlaylistModal songs={librarySongs} onClose={() => setActiveModal(null)} onSave={(playlist) => { setPlaylists(p => [...p, playlist]); setActiveModal(null); showNotification('Playlist created!', 'success'); }} />}
        {activeModal === 'mood' && nowPlaying && <MoodEmojiModal song={nowPlaying} onClose={() => setActiveModal(null)} onSetMood={(_songId, emoji) => handleUpdateSong({ ...nowPlaying, moodEmoji: emoji })} onAddMood={() => { setActiveModal('add_mood'); }} allMoods={[...defaultMoods, ...(profile.customMoods || [])]} />}
        {activeModal === 'add_mood' && <AddMoodModal onClose={() => setActiveModal(null)} onSave={(mood) => updateProfile(p => ({ ...p, customMoods: [...(p.customMoods || []), mood] }))} />}
        {activeModal === 'add_wisdom' && <AddWisdomModal onClose={() => setActiveModal(null)} onSave={(wisdom) => updateProfile(p => ({ ...p, customWisdom: [...(p.customWisdom || []), wisdom] }))} />}
        {activeModal === 'equalizer' && nowPlaying && <EqualizerModal profile={profile} song={nowPlaying} onClose={() => setActiveModal(null)} onUpdateProfile={updateProfile} onUpdateSong={handleUpdateSong} showNotification={showNotification} />}
        {activeModal === 'neon_glow' && <NeonGlowModal profile={profile} onClose={() => setActiveModal(null)} onUpdateProfile={updateProfile} />}
        {activeModal === 'share_preview' && modalData && <ShareablePreviewModal song={modalData} onClose={() => { setActiveModal(null); setModalData(null); }} />}
        {activeModal === 'playlist_manager' && <PlaylistManagerModal onClose={() => setActiveModal(null)} onImportClick={() => { setActiveModal('playlist_manager'); setActiveModal('import_playlist'); }} onExportClick={() => { /* ... export logic ... */ }} />}
        {activeModal === 'import_playlist' && <ImportPlaylistModal onClose={() => setActiveModal(null)} isLoading={isImportingPlaylist} onImport={async (_name, _text) => { setIsImportingPlaylist(true); /* ... import logic ... */ setIsImportingPlaylist(false); }} />}
        {activeModal === 'ringtone_maker' && modalData && <RingtoneMakerModal song={modalData} onClose={() => setActiveModal(null)} showNotification={showNotification} />}
        {isLyricsVisible && nowPlaying && <LyricsView song={nowPlaying} profile={profile} onClose={() => setIsLyricsVisible(false)} onMinimize={() => { setIsLyricsVisible(false); setIsLyricsMinimized(true); }} onUpdateSong={handleUpdateSong} onUpdateProfile={updateProfile} progress={progress} duration={duration} />}

        <audio ref={audioRef} crossOrigin="anonymous"></audio>
        <audio ref={secondaryAudioRef} crossOrigin="anonymous"></audio>
    </div>
  );
};

export default App;