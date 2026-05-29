
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { GoogleGenAI } from '@google/genai';
import { Heart, Shuffle, Music, Brain, Sparkles, Radio, AlertTriangle, Loader2 } from 'lucide-react';

import HomeView from './components/HomeView.tsx';
import ReelsView from './components/ReelsView.tsx';
import LibraryView from './components/LibraryView.tsx';
import SettingsView from './components/SettingsView.tsx';
import RadioView from './components/RadioView.tsx';
import CreateView from './components/CreateView.tsx';
import MiniPlayer from './components/MiniPlayer.tsx';
import Nerve from './components/Nerve.tsx';
import { PlayerOverlay } from './components/PlayerOverlay.tsx';
import AssistantView from './components/AssistantView.tsx';
import AppNotification from './components/Notification.tsx';
import ProfileView from './components/ProfileView.tsx';
import CreatePlaylistModal from './components/CreatePlaylistModal.tsx';
import CustomizeAppearanceView from './components/CustomizeAppearanceView.tsx';
import LyricsView from './components/LyricsView.tsx';
import MoodEmojiModal from './components/MoodEmojiModal.tsx';
import EqualizerModal from './components/EqualizerModal.tsx';
import AssistantSettingsView from './components/AssistantSettingsView.tsx';
import HelpView from './components/HelpView.tsx';
import AnalyticsView from './components/AnalyticsView.tsx';
import AddWisdomModal from './components/AddWisdomModal.tsx';
import AddMoodModal from './components/AddMoodModal.tsx';
import OnlineDiscoveryView from './components/OnlineDiscoveryView.tsx';
import ArtistView from './components/ArtistView.tsx';
import ManageRadioHubView from './components/ManageRadioHubView.tsx';
import AdminView from './components/AdminView.tsx';
import RingtoneMakerModal from './components/RingtoneMakerModal.tsx';
import PlaylistView from './components/PlaylistView.tsx';
import ReelPlaylistView from './components/ReelPlaylistView.tsx';
import { MultiStepLoader } from './components/MultiStepLoader.tsx';
import UploadToast from './components/UploadToast.tsx';
import Onboarding from './components/Onboarding.tsx';
import SongDetailsModal from './components/SongDetailsModal.tsx';
import CameraCaptureModal from './components/CameraCaptureModal.tsx';
import AchievementUnlockedToast from './components/AchievementUnlockedToast.tsx';
import TutorialModal from './components/TutorialModal.tsx';
import BriefWelcome from './components/BriefWelcome.tsx';
import SimpleModeSettingsView from './components/SimpleModeSettingsView.tsx';
import ShareablePreviewModal from './components/ShareablePreviewModal.tsx';
import SimpleModeHomeView from './components/SimpleModeHomeView.tsx';
import SimpleMode from './components/SimpleMode.tsx';
import MyContentView from './components/MyContentView.tsx';
import ChatHistoryView from './components/ChatHistoryView.tsx';
import ClearDataModal from './components/ClearDataModal.tsx';
import TtsOverlay from './components/TtsOverlay.tsx';
import MusicQuizView from './components/MusicQuizView.tsx';
import PartyModeView from './components/PartyModeView.tsx';
import FluidBackground from './components/FluidBackground.tsx';
import BackgroundEffects from './components/BackgroundEffects.tsx';
import { ZenModeScreen } from './components/ZenModeScreen.tsx';
import LevelUpToast from './components/LevelUpToast.tsx';
import { addXpClientSide, validateStreakOnLoad, updateStreakClientSide, getLocalDateString, getTitleForLevel } from './utils/gamification.ts';
import { audioEngine } from './services/audioEngine.ts';
import { statusBar } from './services/statusBarService.ts';
import { permissions } from './services/permissionsService.ts';
import { useKeyboardHandler } from './hooks/useKeyboardHandler.ts';
import { smoothPlayer } from './services/smoothAudioPlayer.ts';
import { shareService } from './services/shareService.ts';
import { musicScanner } from './services/musicScanService.ts';

import { useAuth } from './hooks/useAuth.ts';
import { useHistory } from './hooks/useHistory.ts';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { GuestModeBanner } from './components/auth/GuestModeBanner.tsx';
import { ProfilePage } from './components/profile/ProfilePage.tsx';
import { HistoryPage } from './components/history/HistoryPage.tsx';


import { useAssistant, type AppControls } from './hooks/useAssistant.ts';
import { useAudioFx } from './hooks/useAudioFx.ts';
import { useUiSounds } from './hooks/useUiSounds.ts';
import { useBackgroundMedia } from './hooks/useBackgroundMedia.ts';
import { useTtsQueue } from './hooks/useTtsQueue.ts';
import { useShake } from './hooks/useShake.ts';
import { useBackgroundScanner } from './hooks/useBackgroundScanner.ts';

import { initDB, getSongs, getPlaylists, savePlaylists, getProfile, saveProfile, getVideos, getReelPlaylists, saveReelPlaylists, getPlayQueue, savePlayQueue, getRadioPlaylists, saveRadioPlaylists, addOrUpdateSongs, deleteSongFromDB, addOrUpdateVideos, getChatHistory, clearStore, saveArtist, defaultProfile } from './components/db.ts';
import { navItems, fonts, achievements, FAVORITES_PLAYLIST_ID, themePairs, morningTheme, middayTheme, eveningTheme, earlyNightTheme, midnightTheme, lateNightTheme, getRandomCoverArt, defaultMoods, themeCounterparts } from './components/constants.ts';
import { truncate, findSongByTitle, addToTopSongs, addToTopArtists, addToTopRadios, fadeAudio, scanDeviceForMedia, scanFolderForMedia, processAudioFileBuffer, processVideoFileMeta, getDominantColor, emojiToDataUrl, rgbStringToHsl, hslToCss, forceHttps, getPremiumGradientCover } from './utils/helpers.ts';
import type { Song, Notification as NotificationType, Playlist, ProfileData, Achievement, Video, ThemeColors, ReelPlaylist, RadioStation, RadioPlaylist as RadioPlaylistType } from './types.ts';
import EmojiPickerModal from './components/EmojiPickerModal.tsx';
import NeonGlowModal from './components/NeonGlowModal.tsx';

import { auth, db, handleFirestoreError, OperationType } from './services/firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadToCloudinary } from './services/cloudinaryService.ts';

declare global {
  interface Window {
    hasUserInteracted: boolean;
  }
}

const GEMINI_KEYS = (process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : [
    'AIzaSyChoQSjIelaNNgnIZrpfhugSt9_On-kuzQ',
    'AIzaSyA7WFeDV_aK--xVtbXclDkr2q1EQ6TecCc',
    'AIzaSyAZnBentKVIGKDyWtQ41dwIGeJEfiFmItY',
    'AIzaSyDM8zZLuG2AvIxQGL1Twoiw2iWiX51wMpw',
    'AIzaSyBRqaSPUyXfb68sG2GLXfbQpZBg-EQeKEQ',
    'AIzaSyBNfTqY6CjqliFLBM4GssDre1xyt71_sCY',
    'AIzaSyDeGJlwd6zKc1F90HsZweGZk7M-CaA8Ql4',
    'AIzaSyBt4L_Garwq0VC6oDergxc16T7hSEElC0Q'
]).filter(Boolean);

const loadingStates = [
  { text: "🎵 Tuning your vibe..." },
  { text: "🌈 Blending gradients & glow..." },
  { text: "🎧 Personalizing your sound..." },
  { text: "✨ Animating micro‑interactions..." },
  { text: "🔊 Boosting bass & clarity..." },
];

const slideTransition = { initial: { opacity: 0, x: 30 }, in: { opacity: 1, x: 0 }, out: { opacity: 0, x: -30 } };
const fadeTransition = { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } };
const zoomTransition = { initial: { opacity: 0, scale: 0.95 }, in: { opacity: 1, scale: 1 }, out: { opacity: 0, scale: 0.95 } };

const getTransitionForView = (viewName: string) => {
    switch(viewName) {
        case 'Library': case 'Settings': case 'Profile': case 'Analytics': case 'Help': case 'AssistantSettings':
        case 'ManageRadioHub': case 'SimpleModeSettings': case 'Appearance': case 'Create': case 'MyContent':
        case 'MusicQuiz': case 'PartyMode': case 'ZenMode':
            return slideTransition;
        case 'Reels': case 'Explore': return zoomTransition;
        default: return fadeTransition;
    }
};

const pageTransitionConfig = { type: 'tween', ease: 'anticipate', duration: 0.5 } as const;

const NavigationCountdown: React.FC<{ target: string; seconds: number | null }> = ({ target, seconds }) => {
    if (seconds === null) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <motion.div 
                key={seconds}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                className="text-9xl font-bold text-[var(--primary-accent)]"
            >
                {seconds}
            </motion.div>
            <p className="mt-8 text-xl">Taking you to {target}...</p>
        </div>
    );
};

function convertProfileSets(profileData: any): ProfileData {
    if (!profileData) return profileData;
    const usedFeatures = profileData.usedFeatures || {};
    return {
        ...profileData,
        usedFeatures: {
            ...usedFeatures,
            themes: new Set(usedFeatures.themes || []),
            fonts: new Set(usedFeatures.fonts || []),
            nameplateAnimations: new Set(usedFeatures.nameplateAnimations || []),
            visualizers: new Set(usedFeatures.visualizers || []),
            eqPresets: new Set(usedFeatures.eqPresets || []),
            temposChanged: new Set(usedFeatures.temposChanged || []),
            neonStyles: new Set(usedFeatures.neonStyles || []),
            backgroundEffects: new Set(usedFeatures.backgroundEffects || []),
        }
    };
}

function deepSanitize(val: any): any {
    if (val === null || val === undefined) return val;
    if (val instanceof Set || (val && typeof val === 'object' && (val.constructor?.name === 'Set' || typeof val.add === 'function' || val[Symbol.toStringTag] === 'Set'))) {
        return Array.from(val).map(deepSanitize);
    }
    if (Array.isArray(val)) {
        return val.map(deepSanitize);
    }
    if (typeof val === 'object') {
        const copy: any = {};
        for (const key of Object.keys(val)) {
            copy[key] = deepSanitize(val[key]);
        }
        return copy;
    }
    return val;
}

const App = () => {
  const keyboard = useKeyboardHandler();
  
  const { user, profile: authProfile, isGuest, loading: authLoading, continueAsGuest } = useAuth();
  const { trackPlayStart, trackPlayEnd } = useHistory();

  const [activeView, setActiveView] = useState('Home');
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [reelPlaylists, setReelPlaylists] = useState<ReelPlaylist[]>([]);
  const [radioPlaylists, setRadioPlaylists] = useState<RadioPlaylistType[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const [playQueue, setPlayQueue] = useState<Song[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerOverlayVisible, setIsPlayerOverlayVisible] = useState(false);
  const [isAssistantVisible, setIsAssistantVisible] = useState(false);
  const [assistantView, setAssistantView] = useState<'chat' | 'history'>('chat');
  const [isAssistantOpening, setIsAssistantOpening] = useState(false);
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
  const [isMiniPlayerHidden, setIsMiniPlayerHidden] = useState(false);
  const [viewHistory, setViewHistory] = useState(['Home']);
  const [artistToView, setArtistToView] = useState<string | null>(null);
  const [playlistToView, setPlaylistToView] = useState<Playlist | null>(null);
  const [reelPlaylistToView, setReelPlaylistToView] = useState<ReelPlaylist | null>(null);
  const [initialReelId, setInitialReelId] = useState<string | null>(null);
  const [isQueueFlashing, setIsQueueFlashing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [showWelcomeCelebration, setShowWelcomeCelebration] = useState(false);
  const [showBriefWelcome, setShowBriefWelcome] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState<string>('');
  const [isSeeking, setIsSeeking] = useState(false);
  const [songForDetails, setSongForDetails] = useState<Song | null>(null);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number; title: string; rewards: string[] } | null>(null);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isTranscriptionVisible, setIsTranscriptionVisible] = useState(false);
  const [isSongLoading, setIsSongLoading] = useState(false);
  const [isGeneratingAiPlaylist, setIsGeneratingAiPlaylist] = useState(false);
  const [currentSessionRadioTime, setCurrentSessionRadioTime] = useState(0);
  const [isNeonGlowModalOpen, setIsNeonGlowModalOpen] = useState(false);
  const [isDjSessionActive, setIsDjSessionActive] = useState(false);
  const [isDjSessionStarting, setIsDjSessionStarting] = useState(false);
  const [navCountdown, setNavCountdown] = useState<{ target: string, seconds: number } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isManualUploading, setIsManualUploading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
      return localStorage.getItem('mwijay_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
      setIsSidebarCollapsed(prev => {
          const next = !prev;
          localStorage.setItem('mwijay_sidebar_collapsed', String(next));
          return next;
      });
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const { audioFx, initializeAudioFx, applySettings } = useAudioFx();
  const blobUrlCache = useRef(new Map<string, string>());
  const { playNotificationSound, playToggleSound, playAchievementSound } = useUiSounds();
  
  const { queueSpeech, isSpeaking: isTtsSpeaking, isPaused: isTtsPaused, currentType: ttsType, pause: pauseTts, resume: resumeTts, stop: stopTts } = useTtsQueue({ profile });
  
  const updateProfileRef = useRef<((updater: (prev: ProfileData) => ProfileData) => void) | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const nowPlayingRef = useRef(nowPlaying);
  const lastListenTimeUpdate = useRef<number | null>(null);
  const lastTopChartUpdate = useRef<number | null>(null);
  const isNewPlayRequest = useRef(false);
  const isMounted = useRef(true);
  const radioTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const wasPlayingBeforeTts = useRef(false);
  const originalVolumeRef = useRef(1);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    }
  }, [authProfile]);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  }, [user]);

  // Automatic listening history tracking effect
  useEffect(() => {
    if (nowPlaying && isPlaying) {
      trackPlayStart(nowPlaying);
    } else {
      trackPlayEnd();
    }
    return () => {
      trackPlayEnd();
    };
  }, [nowPlaying?.id, isPlaying, trackPlayStart, trackPlayEnd]);

  useEffect(() => {
      const handleUserInteraction = () => {
          window.hasUserInteracted = true;
          // Clean up listener after first interaction
          window.removeEventListener('click', handleUserInteraction);
          window.removeEventListener('keydown', handleUserInteraction);
          window.removeEventListener('touchstart', handleUserInteraction);
      };

      window.addEventListener('click', handleUserInteraction);
      window.addEventListener('keydown', handleUserInteraction);
      window.addEventListener('touchstart', handleUserInteraction);

      return () => {
          window.removeEventListener('click', handleUserInteraction);
          window.removeEventListener('keydown', handleUserInteraction);
          window.removeEventListener('touchstart', handleUserInteraction);
      };
  }, []);

  // Shake to Shuffle
  const handleShake = useCallback(() => {
      if (profile && profile.settings.hapticsEnabled) {
          Haptics.impact({ style: ImpactStyle.Heavy });
      }
      const newShuffle = !isShuffled;
      setIsShuffled(newShuffle);
      
      if (newShuffle && playQueue.length > 0) {
          const indices = playQueue.map((_, i) => i);
          const currentSongIndex = indices.splice(currentQueueIndex, 1)[0];
          const shuffledIndices = indices.sort(() => Math.random() - 0.5);
          setShuffleOrder([currentSongIndex, ...shuffledIndices]);
      } else {
          setShuffleOrder([]);
      }
      playToggleSound();
  }, [isShuffled, playQueue, currentQueueIndex, profile, playToggleSound]);

  useShake(handleShake);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);

  useEffect(() => {
    if (nowPlaying && profile?.settings?.notificationsEnabled) {
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.schedule({
          notifications: [
            {
              title: "Mwijay Music 🎵",
              body: `Now Playing: ${nowPlaying.title} - ${nowPlaying.artist}`,
              id: 2,
              silent: true
            }
          ]
        }).catch(err => console.error("Failed to show native notification:", err));
      } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Mwijay Music 🎵", {
          body: `Now Playing: ${nowPlaying.title} - ${nowPlaying.artist}`,
          icon: nowPlaying.albumArtUrl || '/favicon.ico',
          silent: true
        });
      }
    }
  }, [nowPlaying?.id, profile?.settings?.notificationsEnabled]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Synchronize Tone.js client-side audio engine settings with profile settings
  useEffect(() => {
    if (audioRef.current && profile?.settings) {
      // 1. Ensure audio engine is initialized with the current audio element
      audioEngine.init(audioRef.current);
      audioEngine.setCurrentSong(nowPlaying);
      audioEngine.setIsPlaying(isPlaying);

      // 2. Synchronize Equalizer bands (average 5 bands to 3)
      const eq = profile.settings.equalizer;
      const bass = typeof eq?.bands?.[0] === 'number' && !isNaN(eq.bands[0]) ? eq.bands[0] : 0;
      const mid = typeof eq?.bands?.[2] === 'number' && !isNaN(eq.bands[2]) ? eq.bands[2] : 0;
      const treble = typeof eq?.bands?.[4] === 'number' && !isNaN(eq.bands[4]) ? eq.bands[4] : 0;
      audioEngine.setEqualizer(bass, mid, treble);

      // 3. Synchronize Creative Playback Speed & Voice Preset
      const creative = profile.settings.creative;
      const currentPreset = (profile.settings as any).voiceEffect || 'none';
      if (currentPreset === 'none') {
        const tempo = typeof creative?.tempo === 'number' && !isNaN(creative.tempo) && isFinite(creative.tempo) ? Math.max(0.25, Math.min(4.0, creative.tempo)) : 1.0;
        const rawFilter = typeof creative?.filter === 'number' && !isNaN(creative.filter) && isFinite(creative.filter) ? creative.filter : 0.0;
        const filterVal = Math.max(-1.0, Math.min(1.0, rawFilter)); // Clamp to [-1, 1]
        audioEngine.setSpeed(tempo);
        audioEngine.setPitch(filterVal * 12); // Semitones: -12 to +12
      } else {
        audioEngine.applyPreset(currentPreset);
      }
    }
  }, [
    profile?.settings?.equalizer?.bands,
    profile?.settings?.maximizer?.volume,
    profile?.settings?.maximizer?.bassBoost,
    profile?.settings?.creative?.tempo,
    profile?.settings?.creative?.filter,
    (profile?.settings as any)?.voiceEffect,
    nowPlaying?.id,
    isPlaying
  ]);

  useEffect(() => {
    let idleTimeout: number;

    const resetIdleTimer = () => {
        if (document.body.classList.contains('user-idle')) {
            document.body.classList.remove('user-idle');
        }
        clearTimeout(idleTimeout);
        idleTimeout = window.setTimeout(() => {
            document.body.classList.add('user-idle');
        }, 5000);
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer, { passive: true }));

    resetIdleTimer();

    return () => {
        events.forEach(event => window.removeEventListener(event, resetIdleTimer));
        clearTimeout(idleTimeout);
    };
  }, []);

  const getTransitionDuration = useCallback(() => {
      return (profile?.settings.transitionDuration || 2) * 200;
  }, [profile?.settings.transitionDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if(audio) {
        initializeAudioFx(audio);
    }
  }, [initializeAudioFx]);

  useEffect(() => {
    if (profile && audioFx) {
        applySettings(profile.settings);
    }
  }, [profile?.settings, audioFx, applySettings]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Request Storage and Notification permissions on app startup for mobile/native platforms
        if (Capacitor.isNativePlatform()) {
            try {
                const storagePerm = await Filesystem.checkPermissions();
                if (storagePerm.publicStorage !== 'granted') {
                    await Filesystem.requestPermissions();
                }
                const notifPerm = await LocalNotifications.checkPermissions();
                if (notifPerm.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
            } catch (pErr) {
                console.warn("Startup permissions request failed:", pErr);
            }
        }

        await initDB();
        
        let [
            songsData, videosData, playlistsData, reelPlaylistsData, queueData, radioPlaylistsData
        ] = await Promise.all([
            getSongs(), getVideos(), getPlaylists(), getReelPlaylists(), getPlayQueue(), getRadioPlaylists()
        ]);

        const favoritedSongIds = new Set(songsData.filter(s => s.isFavorite).map(s => s.id));
        let favoritesPlaylist = playlistsData.find(p => p.id === FAVORITES_PLAYLIST_ID);
        let playlistsDirty = false;

        if (favoritedSongIds.size > 0 && !favoritesPlaylist) {
            favoritesPlaylist = {
                id: FAVORITES_PLAYLIST_ID,
                name: 'Favorite Playlist',
                coverImage: emojiToDataUrl('❤️', 128, '#b91c1c'),
                songIds: Array.from(favoritedSongIds),
                emoji: '❤️',
                bgColor: '#b91c1c'
            };
            playlistsData.push(favoritesPlaylist);
            playlistsDirty = true;
        }

        if (favoritesPlaylist) {
            const newFavIds = Array.from(new Set(favoritesPlaylist.songIds.filter(id => favoritedSongIds.has(id))));
            favoritedSongIds.forEach(id => {
                if (!newFavIds.includes(id)) newFavIds.push(id);
            });
            if (newFavIds.length !== favoritesPlaylist.songIds.length || !newFavIds.every(id => favoritesPlaylist!.songIds.includes(id))) {
                favoritesPlaylist.songIds = newFavIds;
                playlistsData = playlistsData.map(p => p.id === FAVORITES_PLAYLIST_ID ? favoritesPlaylist! : p);
                playlistsDirty = true;
            }
        }
        
        if (playlistsDirty) {
            await savePlaylists(playlistsData);
        }

        if (isMounted.current) {
            setLibrarySongs(songsData);
            setVideos(videosData);
            setPlaylists(playlistsData);
            setReelPlaylists(reelPlaylistsData);
            setRadioPlaylists(radioPlaylistsData);
            
            // Try loading profile, if fails, use default
            let loadedProfile = null;
            try {
                loadedProfile = await getProfile();
                if (loadedProfile) {
                    loadedProfile = validateStreakOnLoad(loadedProfile);
                }
            } catch (pErr) {
                console.warn("Profile load failed, using default:", pErr);
                loadedProfile = defaultProfile;
            }
            
            // Deduplicate achievements on load
            if (loadedProfile && loadedProfile.unlockedAchievements) {
                const seen = new Set();
                loadedProfile.unlockedAchievements = loadedProfile.unlockedAchievements.filter((a: any) => {
                    if (seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true;
                });
            }
            
            if (loadedProfile && loadedProfile.settings && !loadedProfile.settings.visibleNavItems?.includes('Settings')) {
                loadedProfile.settings.visibleNavItems = [...(loadedProfile.settings.visibleNavItems || ['Home', 'Explore', 'Create', 'Library', 'Reels']), 'Settings'];
            }
            
            setProfile(loadedProfile);

            if (queueData.length > 0) {
                const lastIndex = parseInt(localStorage.getItem('mwijayMusic_currentQueueIndex') || '0', 10);
                setPlayQueue(queueData);
                setCurrentQueueIndex(lastIndex < queueData.length ? lastIndex : 0);
            }
            
            const isGuestLocked = localStorage.getItem('mwijay_guest_lock') === 'true';
            if (isGuestLocked) {
                setActiveView('PartyMode');
            }

            if (loadedProfile && !isGuestLocked && loadedProfile.onboarded) {
                const today = new Date();
                const month = today.getMonth() + 1;
                const day = today.getDate();
                
                let holidayThemeName = '';
                if (month === 7 && day === 7) holidayThemeName = 'Saba Saba';
                else if (month === 8 && day === 8) holidayThemeName = 'Nane Nane';
                else if (month === 4 && day === 26) holidayThemeName = 'Union Day';
                else if (month === 12 && day === 25) holidayThemeName = 'Christmas';
                else if (month === 10 && day === 14) holidayThemeName = 'Nyerere Day';
                else if (month === 1 && day === 1) holidayThemeName = 'New Year';

                if (holidayThemeName && loadedProfile.activeThemePair !== holidayThemeName) {
                    queueSpeech(`Happy ${holidayThemeName}! I've enabled the festive theme for you.`, 'greeting');
                    const match = themePairs.find(t => t.name === holidayThemeName);
                    if (match) {
                         updateProfile(p => ({
                            ...p, 
                            activeThemePair: match.name,
                            settings: { ...p.settings, dynamicThemeMode: 'off', backgroundEffects: { ...p.settings.backgroundEffects, enabled: true, style: match.effect || 'none' } } 
                        }));
                    }
                }
            }
        }
      } catch (err) {
        console.error("Initialization error:", String(err));
        // Fallback for profile to avoid blank screen if init failed partially
        if (isMounted.current) {
             setProfile(defaultProfile);
        }
      } finally {
        if (isMounted.current) {
            setIsLoaded(true);
            // Check launch logic if profile exists
            if (profile?.onboarded || defaultProfile.onboarded) { // Check against whatever profile we have
                 const launchedBefore = localStorage.getItem('mwijayMusic_launchedBefore');
                 if (launchedBefore) {
                    setShowBriefWelcome(true);
                    setTimeout(() => {
                        if (isMounted.current) setShowBriefWelcome(false);
                    }, 2500);
                }
            }
        }
      }
    };

    loadData();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
            // Try to load cloud profile
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const cloudProfile = convertProfileSets(userDoc.data());
                    // Merge with local if needed, but cloud is source of truth for logged in users
                    setProfile(prev => ({
                        ...prev,
                        ...cloudProfile,
                        id: user.uid, // Ensure ID is correct
                        // Always sync latest Google profile photo if available
                        avatarUrl: user.photoURL || cloudProfile.avatarUrl || prev?.avatarUrl || '🎵',
                        name: user.displayName || cloudProfile.name || prev?.name || 'Mwijay User',
                        onboarded: true
                    }));
                } else {
                    // It's a new cloud user, save the current local profile to Firestore!
                    setProfile(prev => {
                        if (!prev) return prev;
                        const newProfile = {
                            ...prev,
                            id: user.uid,
                            name: user.displayName || prev.name || 'Mwijay User',
                            avatarUrl: user.photoURL || prev.avatarUrl || '🎵',
                            onboarded: true
                        };
                        const sanitized = deepSanitize(newProfile);
                        setDoc(doc(db, 'users', user.uid), sanitized)
                            .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
                        return newProfile;
                    });
                }
            } catch (error) {
                handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
                // Even if Firestore fails, update avatar from auth
                if (user.photoURL) {
                    setProfile(prev => prev ? { ...prev, avatarUrl: user.photoURL!, name: user.displayName || prev.name } : prev);
                }
            }
        }
    });

    return () => {
        isMounted.current = false;
        unsubscribeAuth();
    };
  }, []);

  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info', icon?: React.ReactNode) => {
      const newNotification = { id: Date.now(), message, type, icon };
      setNotification(newNotification);
      if(profile?.settings.notificationsEnabled) {
          playNotificationSound(type);
      }
      setTimeout(() => setNotification(prev => (prev?.id === newNotification.id ? null : prev)), 3000);
  }, [playNotificationSound, profile?.settings.notificationsEnabled]);

  // Status Bar initial setup and theme coloration
  useEffect(() => {
    statusBar.initialize().catch(err => console.warn('[StatusBar] Init failed:', err));
  }, []);

  useEffect(() => {
    if (activeView === 'PartyMode' || activeView === 'ZenMode') {
      statusBar.setThemeColor('#000000').catch(() => {});
    } else if (nowPlaying && isPlayerOverlayVisible) {
      statusBar.setThemeColor(dominantColor || '#000000').catch(() => {});
    } else {
      statusBar.setThemeColor('#1e1b4b').catch(() => {});
    }
  }, [activeView, nowPlaying, isPlayerOverlayVisible, dominantColor]);

  // Global listener for background/helper notification toast requests
  useEffect(() => {
    const handleShowToast = (e: any) => {
      if (e.detail) {
        showNotification(e.detail.message, e.detail.type || 'info');
      }
    };
    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, [showNotification]);

  // Bind active audio element to smooth preloader optimization attributes
  useEffect(() => {
    if (audioRef.current) {
      smoothPlayer.setMainAudioElement(audioRef.current);
    }
  }, []);

  // Pre-load next queue track into memory in the background for smooth transitions
  useEffect(() => {
    if (playQueue.length > 0 && currentQueueIndex >= 0 && currentQueueIndex < playQueue.length) {
      const nextIndex = (currentQueueIndex + 1) % playQueue.length;
      const nextTrack = playQueue[nextIndex];
      if (nextTrack && nextTrack.url && nextTrack.duration !== Infinity) {
        smoothPlayer.preloadNext(forceHttps(nextTrack.url));
      }
    }
  }, [currentQueueIndex, playQueue]);

  const checkAchievements = useCallback((currentProfile: ProfileData, type: string, value: any) => {
    const newlyUnlocked: Achievement[] = [];
    const currentUnlockedIds = new Set(currentProfile.unlockedAchievements.map(a => a.id));
    
    achievements.forEach(ach => {
        if (!currentUnlockedIds.has(ach.id) && ach.criteria({ ...currentProfile, librarySongs, playlists }, type, value)) {
            newlyUnlocked.push(ach);
        }
    });

    if (newlyUnlocked.length > 0) {
        updateProfileRef.current?.(p => {
            const existingIds = new Set(p.unlockedAchievements.map(a => a.id));
            const uniqueNew = newlyUnlocked
                .filter(ach => !existingIds.has(ach.id))
                .map(ach => ({ id: ach.id, date: Date.now() }));
            
            if (uniqueNew.length === 0) return p;
            
            let updatedProfile = { 
                ...p, 
                unlockedAchievements: [...p.unlockedAchievements, ...uniqueNew] 
            };

            const totalXpReward = newlyUnlocked
                .filter(ach => !existingIds.has(ach.id))
                .reduce((sum, ach) => sum + (ach.xpReward || 50), 0);

            if (totalXpReward > 0) {
                updatedProfile = addXpClientSide(
                    updatedProfile,
                    totalXpReward,
                    `Unlocked Achievements: ${newlyUnlocked.map(a => a.name).join(', ')}`,
                    (newLvl, rewards) => {
                        const rankTitle = getTitleForLevel(newLvl);
                        setLevelUpData({ level: newLvl, title: rankTitle, rewards });
                        if (p.settings.notificationsEnabled) {
                            playAchievementSound();
                        }
                        const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
                        queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
                    }
                );
            }
            return updatedProfile;
        });

        newlyUnlocked.forEach((ach, index) => {
            setTimeout(() => {
                setAchievementToast(ach);
                 if (currentProfile.settings.assistant.readResponses) {
                    queueSpeech(`Achievement unlocked: ${ach.name}.`, 'achievement');
                }
                if (currentProfile.settings.notificationsEnabled) {
                    playAchievementSound();
                }
                setTimeout(() => setAchievementToast(null), 4000);
            }, index * 4500);
        });
    }
  }, [librarySongs, playlists, queueSpeech, playAchievementSound]);
  
  const updateProfile = useCallback((updater: (prev: ProfileData) => ProfileData) => {
      setProfile(prevProfile => {
          if (!prevProfile) return null;
          const wasSimpleMode = prevProfile.settings.simpleMode.enabled;
          const newProfile = updater(prevProfile);
          const isSimpleModeNow = newProfile.settings.simpleMode.enabled;
          
          if(isSimpleModeNow && !wasSimpleMode && nowPlaying) setIsPlayerOverlayVisible(true);
          
          saveProfile(newProfile).catch(err => console.error('Failed to save profile:', String(err)));
          
          if (auth.currentUser) {
              const sanitized = deepSanitize(newProfile);
              setDoc(doc(db, 'users', auth.currentUser.uid), { ...sanitized, id: auth.currentUser.uid })
                  .catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}`));
          }

          checkAchievements(newProfile, 'profileUpdate', newProfile);
          return newProfile;
      });
  }, [nowPlaying, checkAchievements]);
  
  useEffect(() => {
    updateProfileRef.current = updateProfile;
  }, [updateProfile]);

  const addXp = useCallback((amount: number, reason: string) => {
      updateProfile(p => {
          if (!p) return p;
          return addXpClientSide(p, amount, reason, (newLvl, rewards) => {
              const rankTitle = getTitleForLevel(newLvl);
              setLevelUpData({ level: newLvl, title: rankTitle, rewards });
              if (p.settings.notificationsEnabled) {
                  playAchievementSound();
              }
              const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
              queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
          });
      });
  }, [updateProfile, playAchievementSound, queueSpeech]);

  const getAppState = useCallback(() => ({
    nowPlaying,
    isPlaying,
    librarySongs,
    isSimpleMode: profile?.settings.simpleMode.enabled ?? false,
    profile: profile,
    isShuffled,
    repeatMode,
    playQueue,
    currentQueueIndex,
  }), [nowPlaying, isPlaying, librarySongs, profile, isShuffled, repeatMode, playQueue, currentQueueIndex]);

  const playHapticImpact = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
      if (profile?.settings.hapticsEnabled && Capacitor.isNativePlatform()) {
        try { await Haptics.impact({ style }); } catch (e) {}
      }
  }, [profile?.settings.hapticsEnabled]);
  
  // ... [Handlers: handleNext, handlePrev, handlePause, handlePlay, handleTogglePlay, etc.] ...
  const handleNext = useCallback(() => {
      if (playQueue.length === 0) return;
      playHapticImpact();

      if (isShuffled && shuffleOrder.length > 0) {
          const currentShuffleIndex = shuffleOrder.indexOf(currentQueueIndex);
          const nextShuffleIndex = (currentShuffleIndex + 1) % shuffleOrder.length;
          setCurrentQueueIndex(shuffleOrder[nextShuffleIndex]);
      } else {
          setCurrentQueueIndex(prev => (prev + 1) % playQueue.length);
      }
  }, [playQueue.length, currentQueueIndex, playHapticImpact, isShuffled, shuffleOrder]);

  const handlePrev = useCallback(() => {
    if (playQueue.length === 0) return;
    playHapticImpact();

    if (isShuffled && shuffleOrder.length > 0) {
        const currentShuffleIndex = shuffleOrder.indexOf(currentQueueIndex);
        const prevShuffleIndex = (currentShuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length;
        setCurrentQueueIndex(shuffleOrder[prevShuffleIndex]);
    } else {
        setCurrentQueueIndex(prev => (prev - 1 + playQueue.length) % playQueue.length);
    }
  }, [playQueue.length, currentQueueIndex, playHapticImpact, isShuffled, shuffleOrder]);

  const handlePause = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      setIsPlaying(false);
      if (radioTimerRef.current) {
          clearInterval(radioTimerRef.current);
          radioTimerRef.current = null;
      }
      fadeAudio(audio, 0, getTransitionDuration(), () => audio.pause());
  }, [getTransitionDuration]);
  
  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !nowPlaying) return;
     if (!audio.src || audio.src === window.location.href) {
      handleNext();
      return;
    }
    // Resume context on play
    audioEngine.resumeContext().catch(e => console.warn("Failed to resume Tone context", e));
    const context = audioFx?.context;
    if (context && context.state === 'suspended') {
      context.resume().catch(e => console.error("Error resuming audio context:", String(e)));
    }
    if (audio.paused) {
        audio.volume = 0;
        fadeAudio(audio, originalVolumeRef.current, getTransitionDuration());
    }
    
    // Safety Wrapper for Play Request
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // Silence "The play() request was interrupted by a new load request"
            if (error.name === 'AbortError' || error.message?.includes('interrupted')) {
                return;
            }
            console.error("Play failed", String(error));
        });
    }
    
    setIsPlaying(true);
    if (nowPlaying?.duration === Infinity && !radioTimerRef.current) {
        radioTimerRef.current = window.setInterval(() => {
            setCurrentSessionRadioTime(prev => prev + 1);
        }, 1000);
    }
  }, [nowPlaying, audioFx, handleNext, getTransitionDuration]);

  const handleTogglePlay = useCallback(async () => {
    playHapticImpact();
    // Synchronously resume Tone.js AudioContext within direct user click thread
    audioEngine.resumeContext().catch(e => console.warn("Failed to resume Tone context on toggle play:", e));
    if (!hasPlaybackStarted) setHasPlaybackStarted(true);
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [playHapticImpact, hasPlaybackStarted, isPlaying, handlePause, handlePlay]);

  const handleSeekBy = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
      audio.currentTime = newTime;
      setProgress(newTime);
    }
  }, [duration]);

  useBackgroundMedia(nowPlaying, isPlaying, progress, duration, {
    onPlay: handlePlay,
    onPause: handlePause,
    onNext: handleNext,
    onPrev: handlePrev,
    onSeekForward: (details) => handleSeekBy(details.seekOffset || 10),
    onSeekBackward: (details) => handleSeekBy(-(details.seekOffset || 10)),
    onSeekTo: (details) => {
        if (details.seekTime && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setProgress(details.seekTime);
        }
    },
  });

  useBackgroundScanner({
    enabled: profile?.settings.scannerSettings.backgroundScanningEnabled ?? false,
    existingSongs: librarySongs,
    scannerSettings: profile?.settings.scannerSettings ?? defaultProfile.settings.scannerSettings,
    onNewSongsFound: (newSongs) => {
        setLibrarySongs(prev => [...prev, ...newSongs]);
        addOrUpdateSongs(newSongs);
        showNotification(`Found ${newSongs.length} new songs in background!`, 'success');
    }
  });

  // ... [Other handlers truncated for brevity, they remain unchanged but must exist] ...
  // [handleSetSleepTimer, handleToggleFavorite, handleAddToQueue, handleNavigate, etc.]
  const handleSetSleepTimer = (mode: 'duration' | 'songs' | 'off', value: number) => {
      if (sleepTimer.timeoutId) clearTimeout(sleepTimer.timeoutId);
      if (mode === 'off') {
          setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
          showNotification('Sleep timer cancelled.', 'info');
          return;
      }
      if (mode === 'duration') {
          const timeoutId = window.setTimeout(() => {
              handlePause();
              showNotification('Sleep timer finished.', 'info');
              setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
          }, value * 60 * 1000);
          const endTime = Date.now() + value * 60 * 1000;
          setSleepTimer({ mode: 'duration', value, timeoutId, songCount: 0, endTime });
          showNotification(`Sleep timer set for ${value} minutes.`, 'success');
      } else {
          setSleepTimer({ mode: 'songs', value, timeoutId: null, songCount: value });
          showNotification(`Playback will stop after ${value} more songs.`, 'success');
      }
  };
  
  const handleToggleFavorite = useCallback((songId?: string) => {
    const idToToggle = songId || nowPlaying?.id;
    if (!idToToggle) return;
    playHapticImpact();

    const song = librarySongs.find(s => s.id === idToToggle) || (nowPlaying?.id === idToToggle ? nowPlaying : null);
    if (!song) return;

    const isCurrentlyFavorite = !!song.isFavorite;
    const isFavoriting = !isCurrentlyFavorite;

    showNotification(isFavoriting ? `Added to Favorites` : `Removed from Favorites`, 'info', <Heart size={18} fill={isFavoriting ? "currentColor" : "none"} />);
    
    const updatedSongs = librarySongs.map(s => s.id === idToToggle ? { ...s, isFavorite: isFavoriting } : s);
    setLibrarySongs(updatedSongs);
    addOrUpdateSongs(updatedSongs);

    if (nowPlaying?.id === idToToggle) {
        setNowPlaying(p => p ? { ...p, isFavorite: isFavoriting } : null);
    }

    setPlaylists(prev => {
        let favoritesPlaylist = prev.find(p => p.id === FAVORITES_PLAYLIST_ID);
        let updatedPlaylists = [...prev];

        if (isFavoriting) {
            if (!favoritesPlaylist) {
                favoritesPlaylist = {
                    id: FAVORITES_PLAYLIST_ID,
                    name: 'Favorite Playlist',
                    coverImage: emojiToDataUrl('❤️', 128, '#b91c1c'),
                    songIds: [idToToggle],
                    emoji: '❤️',
                    bgColor: '#b91c1c'
                };
                updatedPlaylists.push(favoritesPlaylist);
            } else {
                updatedPlaylists = prev.map(p => {
                    if (p.id === FAVORITES_PLAYLIST_ID) {
                        const newSongIds = Array.from(new Set([...p.songIds, idToToggle]));
                        return { ...p, songIds: newSongIds };
                    }
                    return p;
                });
            }
        } else { 
            if (favoritesPlaylist) {
                updatedPlaylists = prev.map(p => {
                    if (p.id === FAVORITES_PLAYLIST_ID) {
                        const newSongIds = p.songIds.filter(id => id !== idToToggle);
                        return { ...p, songIds: newSongIds };
                    }
                    return p;
                });
            }
        }
        
        savePlaylists(updatedPlaylists);
        return updatedPlaylists;
    });

    if (isFavoriting && profile) {
        checkAchievements(profile, 'favorite1', 1);
        addXp(10, "Favorited a song");
    }
  }, [librarySongs, nowPlaying, playHapticImpact, showNotification, profile, checkAchievements]);
  
  const handleAddToQueue = useCallback((songOrTitle: Song | string) => {
      playHapticImpact();
      const songToAdd = typeof songOrTitle === 'string'
          ? findSongByTitle(songOrTitle, librarySongs)
          : songOrTitle;
      
      if (songToAdd) {
          const newQueue = [...playQueue, { ...songToAdd, queueId: `q-${Date.now()}-${Math.random()}` }];
          setPlayQueue(newQueue);
          setIsQueueFlashing(true);
          setTimeout(() => setIsQueueFlashing(false), 600);
          showNotification(`Added "${truncate(songToAdd.title, 20)}" to queue!`, 'success');
          if (profile) checkAchievements(profile, 'queue', 1);
      } else {
          showNotification(`Could not find song.`, 'error');
      }
    }, [playQueue, librarySongs, playHapticImpact, showNotification, profile, checkAchievements]);
  
  const handleNavigate = (view: string) => {
      if (view === activeView) return;
      playHapticImpact();
      setViewHistory(prev => [...prev, view]);
      setActiveView(view);
    };
    
  const handleToggleShuffle = () => {
      playHapticImpact();
      const newShuffleState = !isShuffled;
      setIsShuffled(newShuffleState);
      if (newShuffleState && playQueue.length > 0) {
          const indices = playQueue.map((_, i) => i);
          const currentSongIndex = indices.splice(currentQueueIndex, 1)[0];
          const shuffledIndices = indices.sort(() => Math.random() - 0.5);
          setShuffleOrder([currentSongIndex, ...shuffledIndices]);
      } else {
          setShuffleOrder([]);
      }
      showNotification(`Shuffle: ${newShuffleState ? 'On' : 'Off'}`, 'info', <Shuffle size={18} />);
  };

  const handleCycleRepeat = () => {
      playHapticImpact();
      const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
      const currentIndex = modes.indexOf(repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      setRepeatMode(nextMode);
      showNotification(`Repeat mode: ${nextMode}`, 'info', <Music size={18} />);
  };

  const handleScanForMedia = async () => {
      if (!profile) return;
      setUploadProgress({ current: 0, total: 1, fileName: 'Starting scan...' });
      try {
          const { songs: newSongs, videos: newVideos } = await scanDeviceForMedia( (current, total, fileName) => setUploadProgress({ current, total, fileName }), profile.settings.scannerSettings );
          if (newSongs.length > 0) {
              await addOrUpdateSongs(newSongs);
              setLibrarySongs(prev => [...prev.filter(s => !newSongs.some(ns => ns.id === s.id)), ...newSongs]);
              updateProfile(p => {
                  if (!p) return p;
                  const updatedProfile = { 
                      ...p, 
                      analytics: { 
                          ...p.analytics, 
                          songsUploaded: (p.analytics.songsUploaded || 0) + newSongs.length 
                      } 
                  };
                  return addXpClientSide(
                      updatedProfile,
                      20 * newSongs.length,
                      `Uploaded ${newSongs.length} local songs`,
                      (newLvl, rewards) => {
                          const rankTitle = getTitleForLevel(newLvl);
                          setLevelUpData({ level: newLvl, title: rankTitle, rewards });
                          if (p.settings.notificationsEnabled) {
                              playAchievementSound();
                          }
                          const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
                          queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
                      }
                  );
              });
          }
          if (newVideos.length > 0) {
              await addOrUpdateVideos(newVideos);
              setVideos(prev => [...prev.filter(v => !newVideos.some(nv => nv.id === v.id)), ...newVideos]);
          }
          showNotification(`Found ${newSongs.length} new songs and ${newVideos.length} new videos!`, 'success');
      } catch (e) {
          showNotification('Failed to scan for media. Please check permissions.', 'error');
          console.error("Failed to scan for media:", String(e));
      } finally {
          setUploadProgress(null);
      }
  };

  const handleScanFolder = async () => {
      if (!profile) return;
      try {
          const files = await scanFolderForMedia((msg) => setUploadProgress({ current: 0, total: 1, fileName: msg }));
          if (files.length === 0) {
              showNotification("No media files found in selected folder.", 'info');
              return;
          }
          
          setUploadProgress({ current: 0, total: files.length, fileName: 'Processing files...' });
          const newSongs: Song[] = [];
          const newVideos: Video[] = [];
          
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
              
              if (file.type.startsWith('audio/')) {
                  const buffer = await file.arrayBuffer();
                  const song = await processAudioFileBuffer(buffer, file.name, `manual-${file.name}`, file.lastModified);
                  if (song) newSongs.push(song);
              } else if (file.type.startsWith('video/')) {
                  const video = processVideoFileMeta(file.name, `manual-${file.name}`, file.lastModified);
                  newVideos.push(video);
              }
          }
          
          if (newSongs.length > 0) {
              await addOrUpdateSongs(newSongs);
              setLibrarySongs(prev => [...prev.filter(s => !newSongs.some(ns => ns.id === s.id)), ...newSongs]);
          }
          if (newVideos.length > 0) {
              await addOrUpdateVideos(newVideos);
              setVideos(prev => [...prev.filter(v => !newVideos.some(nv => nv.id === v.id)), ...newVideos]);
          }
          showNotification(`Imported ${newSongs.length} songs and ${newVideos.length} videos from folder!`, 'success');
      } catch (e) {
          if (String(e).includes('AbortError')) return;
          showNotification('Failed to scan folder.', 'error');
          console.error("Failed to scan folder:", String(e));
      } finally {
          setUploadProgress(null);
      }
  };
  
  const handleUpdateSong = (updatedSong: Song) => {
      const newLibrarySongs = librarySongs.map(s => s.id === updatedSong.id ? updatedSong : s);
      setLibrarySongs(newLibrarySongs);
      addOrUpdateSongs([updatedSong]);

      if (nowPlaying?.id === updatedSong.id) setNowPlaying(updatedSong);
      setPlayQueue(q => q.map(s => s.id === updatedSong.id ? updatedSong : s));
  };
  
  const handleAddSongs = useCallback((songsToAdd: Song[]) => {
      if (songsToAdd.length === 0) return;
      addOrUpdateSongs(songsToAdd).then(() => {
          setLibrarySongs(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const newSongs = songsToAdd.filter(s => !existingIds.has(s.id));
              return [...prev, ...newSongs];
          });
          updateProfile(p => ({
              ...p, 
              analytics: {
                  ...p.analytics, 
                  songsDownloaded: (p.analytics.songsDownloaded || 0) + songsToAdd.length
              }
          }));
      });
  }, [updateProfile]);

  const handleSaveNotes = (songId: string, notes: string) => {
      const updater = (song: Song) => song.id === songId ? { ...song, notes } : song;
      setLibrarySongs(prev => prev.map(updater));
      const songToUpdate = librarySongs.find(s => s.id === songId);
      if (songToUpdate) addOrUpdateSongs([{...songToUpdate, notes}]);
      setNowPlaying(prev => prev ? updater(prev) : null);
      setPlayQueue(prev => prev.map(updater));
      showNotification("Notes saved!", 'success');
  };
  
  const handleSaveRadioNotes = (songId: string, notes: string) => {
      const updater = (song: Song) => song.id === songId ? { ...song, notes } : song;
      setNowPlaying(prev => prev ? updater(prev) : null);
      setPlayQueue(prev => prev.map(updater));
      showNotification("Notes for radio station saved for this session.", 'success');
  };

  const handlePlaySong = useCallback((song: Song, context?: Song[]) => {
      playHapticImpact();
      // Synchronously resume Tone.js AudioContext within direct user click thread
      audioEngine.resumeContext().catch(e => console.warn("Failed to resume Tone context on play song:", e));
      if (!hasPlaybackStarted) setHasPlaybackStarted(true);
      if (song.id === nowPlaying?.id) { handleTogglePlay(); return; }
      
      isNewPlayRequest.current = true;
      const newQueue = context ? [...context] : [song];
      const songIndexInQueue = newQueue.findIndex(s => s.id === song.id);
      
      setPlayQueue(newQueue.map(s => ({...s, queueId: s.queueId || `q-${Date.now()}-${Math.random()}`})));
      setCurrentQueueIndex(songIndexInQueue);
      setIsPlaying(true);
  }, [playHapticImpact, nowPlaying, handleTogglePlay, hasPlaybackStarted]);
  
  const handlePlayArtist = useCallback((artistName: string) => {
      const artistSongs = librarySongs.filter(s => s.artist.toLowerCase().includes(artistName.toLowerCase()));
      if (artistSongs.length > 0) {
          const shuffled = [...artistSongs].sort(() => Math.random() - 0.5);
          handlePlaySong(shuffled[0], shuffled);
          showNotification(`Playing songs by ${artistSongs[0].artist}`, 'success');
      } else {
          showNotification(`No songs found by "${artistName}".`, 'error');
      }
  }, [librarySongs, handlePlaySong, showNotification]);

  const handlePlayRadioStation = useCallback((station: RadioStation) => {
      const songFromStation: Song = {
          id: station.stationuuid,
          url: station.url_resolved,
          title: station.name,
          artist: station.country,
          albumArtUrl: forceHttps(station.favicon) || getRandomCoverArt(),
          duration: Infinity,
          isFavorite: profile?.favoriteRadioStations?.some(s => s.stationuuid === station.stationuuid) || false,
      };
      handlePlaySong(songFromStation, [songFromStation]);
      if (profile) {
          updateProfile(p => ({
              ...p,
              recentlyPlayedRadios: [station, ...(p.recentlyPlayedRadios || []).filter(s => s.stationuuid !== station.stationuuid)].slice(0, 20)
          }));
      }
  }, [handlePlaySong, profile, updateProfile]);

  const handleManualFileUploads = async (files: FileList) => {
      if (!files.length) return;
      setUploadProgress({ current: 0, total: files.length, fileName: '' });
      const newSongs: Song[] = [];
      const newVideos: Video[] = [];

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
          try {
              const buffer = await file.arrayBuffer();
              const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name);
              const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(file.name);

              if (isAudio) {
                  try {
                      const song = await processAudioFileBuffer(buffer, file.name, `manual-${file.name}`, file.lastModified);
                      if (song) newSongs.push(song);
                  } catch (err) {
                      console.error(`Error processing audio file ${file.name}:`, err);
                      showNotification(`Failed to process ${file.name}`, 'error');
                  }
              } else if (isVideo) {
                  const video = processVideoFileMeta(file.name, `manual-${file.name}`, file.lastModified);
                  video.videoData = buffer;
                  newVideos.push(video);
              }
          } catch(e) { console.error(`Failed to process manual upload:`, String(e)); }
      }

      if (newSongs.length > 0) {
          await addOrUpdateSongs(newSongs);
          setLibrarySongs(prev => [...prev.filter(s => !newSongs.some(ns => ns.id === s.id)), ...newSongs]);
          updateProfile(p => {
              if (!p) return p;
              const updatedProfile = { 
                  ...p, 
                  analytics: { 
                      ...p.analytics, 
                      songsUploaded: (p.analytics.songsUploaded || 0) + newSongs.length 
                  } 
              };
              return addXpClientSide(
                  updatedProfile,
                  20 * newSongs.length,
                  `Uploaded ${newSongs.length} local songs`,
                  (newLvl, rewards) => {
                      const rankTitle = getTitleForLevel(newLvl);
                      setLevelUpData({ level: newLvl, title: rankTitle, rewards });
                      if (p.settings.notificationsEnabled) {
                          playAchievementSound();
                      }
                      const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
                      queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
                  }
              );
          });
      }
      if (newVideos.length > 0) {
          await addOrUpdateVideos(newVideos);
          setVideos(prev => [...prev.filter(v => !newVideos.some(nv => nv.id === v.id)), ...newVideos]);
      }
      setUploadProgress(null);
      if (newSongs.length > 0 || newVideos.length > 0) showNotification(`${newSongs.length} songs and ${newVideos.length} videos imported!`, 'success');
      else if (files.length > 0) showNotification("No valid media files imported.", 'info');
  };

  const handlePlayAiPlaylist = useCallback(() => {
        if (!profile || librarySongs.length < 10) {
            showNotification('Need at least 10 songs in your library to generate an AI playlist.', 'info');
            return;
        }
        setIsGeneratingAiPlaylist(true);
        showNotification('Crafting an AI playlist for you...', 'info', <Brain size={18} />);

        const topSongIds = new Set(profile.analytics.topSongs.map(s => s.id));
        const topArtistNames = new Set(profile.analytics.topArtists.map(a => a.name));
        const recentIds = new Set(profile.recentlyPlayed);

        const scoredSongs = librarySongs.map(song => {
            let score = 1;
            if (song.isFavorite) score += 5;
            if (topSongIds.has(song.id)) score += 4;
            if (topArtistNames.has(song.artist)) score += 3;
            if (recentIds.has(song.id)) score += 2;
            score += Math.random() * 2;
            return { song, score };
        });

        scoredSongs.sort((a, b) => b.score - a.score);
        const playlistPool = scoredSongs.slice(0, 50).map(item => item.song);
        const shuffled = playlistPool.sort(() => 0.5 - Math.random());
        const aiPlaylist = shuffled.slice(0, 20);

        if (aiPlaylist.length > 0) {
            handlePlaySong(aiPlaylist[0], aiPlaylist);
        } else {
            showNotification('Could not generate an AI playlist with your current library.', 'error');
        }
        setIsGeneratingAiPlaylist(false);
    }, [profile, librarySongs, showNotification, handlePlaySong]);
    
    const handleToggleLyrics = (force?: 'full' | 'minimized' | 'closed') => {
        if (force === 'full') {
            setIsLyricsVisible(true);
            setIsLyricsMinimized(false);
        } else if (force === 'minimized') {
            setIsLyricsVisible(false);
            setIsLyricsMinimized(true);
        } else if (force === 'closed') {
            setIsLyricsVisible(false);
            setIsLyricsMinimized(false);
        } else {
            if (isLyricsVisible) {
                setIsLyricsVisible(false);
                setIsLyricsMinimized(false);
            } else if (isLyricsMinimized) {
                setIsLyricsVisible(true);
                setIsLyricsMinimized(false);
            } else {
                setIsLyricsVisible(false);
                setIsLyricsMinimized(true);
            }
        }
    };

    const handleOpenLyrics = useCallback((song: Song) => {
        if (nowPlaying?.id !== song.id) {
            handlePlaySong(song, librarySongs);
        }
        setIsLyricsVisible(true);
        setIsLyricsMinimized(false);
    }, [nowPlaying, handlePlaySong, librarySongs]);

    const handleOnPlaySongFromAssistant = useCallback(({ query, source = 'any' }: { query: string; source?: 'any' | 'local' | 'online' }) => {
        const songToPlay = findSongByTitle(query, librarySongs);
        if (source === 'local') {
            if(songToPlay) {
                handlePlaySong(songToPlay, librarySongs);
                return `Playing "${songToPlay.title}".`;
            }
            return `Sorry, I couldn't find "${query}" in your library.`;
        }
        if(songToPlay) {
            handlePlaySong(songToPlay, librarySongs);
            return `Playing "${songToPlay.title}" from your library.`;
        }
        setInitialSearchQuery(query);
        handleNavigate('Explore');
        return `I couldn't find "${query}" in your library, but I'm searching online for you.`;
    }, [librarySongs, handlePlaySong]);

  const handleCreatePlaylistProgrammatic = useCallback(({ name }: { name: string }) => {
      const newPlaylist: Playlist = {
          id: `playlist-${Date.now()}`,
          name,
          coverImage: getRandomCoverArt(),
          songIds: [],
          emoji: '🎵',
          bgColor: '#C8F052'
      };
      setPlaylists(prev => {
          const updated = [...prev, newPlaylist];
          savePlaylists(updated);
          return updated;
      });
      showNotification(`Playlist "${name}" created!`, 'success');
      return `Created playlist "${name}".`;
  }, [showNotification]);

  const handleAddSongToPlaylistProgrammatic = useCallback(({ songTitle, playlistName }: { songTitle: string, playlistName: string }) => {
      const song = findSongByTitle(songTitle, librarySongs);
      if (!song) return `Could not find song "${songTitle}".`;
      
      const playlistIndex = playlists.findIndex(p => p.name.toLowerCase() === playlistName.toLowerCase());
      if (playlistIndex === -1) return `Could not find playlist "${playlistName}".`;

      const playlist = playlists[playlistIndex];
      if (playlist.songIds.includes(song.id)) return `"${song.title}" is already in "${playlist.name}".`;

      const updatedPlaylist = { ...playlist, songIds: [...playlist.songIds, song.id] };
      const newPlaylists = [...playlists];
      newPlaylists[playlistIndex] = updatedPlaylist;
      
      setPlaylists(newPlaylists);
      savePlaylists(newPlaylists);
      
      showNotification(`Added "${song.title}" to "${playlist.name}"`, 'success');
      return `Added "${song.title}" to playlist "${playlist.name}".`;
  }, [librarySongs, playlists, showNotification]);

  const performSongDeletion = useCallback(async (songId: string) => {
      try {
          await deleteSongFromDB(songId);
          setLibrarySongs(prev => prev.filter(s => s.id !== songId));

          let wasPlaying = nowPlaying?.id === songId;
          let updatedQueue = playQueue.filter(s => s.id !== songId);
          setPlayQueue(updatedQueue);

          if (wasPlaying) {
              if (updatedQueue.length > 0) {
                  const nextIndex = currentQueueIndex < updatedQueue.length ? currentQueueIndex : 0;
                  const nextSong = updatedQueue[nextIndex];
                  handlePlaySong(nextSong, updatedQueue);
              } else {
                  handlePause();
                  setNowPlaying(null);
                  setIsPlaying(false);
              }
          } else {
              if (nowPlaying) {
                  const newIndex = updatedQueue.findIndex(s => s.id === nowPlaying.id);
                  setCurrentQueueIndex(newIndex);
              }
          }

          const updatedPlaylists = playlists.map(pl => {
              if (pl.songIds.includes(songId)) {
                  return { ...pl, songIds: pl.songIds.filter(id => id !== songId) };
              }
              return pl;
          });
          setPlaylists(updatedPlaylists);
          await savePlaylists(updatedPlaylists);

          showNotification('Song completely deleted from library, queues, and playlists.', 'success');
      } catch (error) {
          console.error('Failed complete song deletion:', error);
          showNotification('Failed to completely delete song.', 'error');
      }
  }, [librarySongs, playQueue, nowPlaying, currentQueueIndex, playlists, handlePlaySong, handlePause, showNotification]);

  const handleDownloadOnlineSong = useCallback(async (song: Song) => {
      if (!song.url) {
          showNotification("No URL found to download this song.", "error");
          return;
      }
      showNotification(`Downloading "${song.title}" to library...`, "info");
      try {
          const response = await fetch(song.url);
          if (!response.ok) throw new Error("Network response was not OK");
          const buffer = await response.arrayBuffer();

          const localId = `local-${Date.now()}`;
          const fileName = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
          
          let downloadedSong: Song | null = null;
          
          if (Capacitor.isNativePlatform()) {
              const uint8 = new Uint8Array(buffer);
              let binary = '';
              const len = uint8.byteLength;
              for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(uint8[i]);
              }
              const base64 = btoa(binary);
              
              try {
                  await Filesystem.mkdir({
                      path: 'MwijayMusic',
                      directory: Directory.ExternalStorage || Directory.Documents,
                      recursive: true
                  });
              } catch (dirErr) {
                  // Ignore if exists
              }

              const path = `MwijayMusic/${fileName}`;
              await Filesystem.writeFile({
                  path,
                  data: base64,
                  directory: Directory.ExternalStorage || Directory.Documents
              });
              
              const uriResult = await Filesystem.getUri({
                  path,
                  directory: Directory.ExternalStorage || Directory.Documents
              });

              downloadedSong = {
                  ...song,
                  id: localId,
                  url: uriResult.uri,
                  nativeUrl: uriResult.uri,
                  dateAdded: Date.now(),
                  isFavorite: false
              };
          } else {
              downloadedSong = await processAudioFileBuffer(buffer, fileName, localId, Date.now());
          }

          if (downloadedSong) {
              downloadedSong.title = downloadedSong.title || song.title;
              downloadedSong.artist = downloadedSong.artist || song.artist;
              downloadedSong.albumArtUrl = downloadedSong.albumArtUrl || song.albumArtUrl;
              
              await addOrUpdateSongs([downloadedSong]);
              setLibrarySongs(prev => [downloadedSong!, ...prev]);
              
              updateProfile(p => ({
                  ...p,
                  analytics: {
                      ...p.analytics,
                      songsDownloaded: (p.analytics.songsDownloaded || 0) + 1
                  }
              }));
              addXp(30, `Downloaded "${song.title}"`);
              showNotification(`"${song.title}" successfully added to local library!`, "success");
          } else {
              throw new Error("Failed to process downloaded audio buffer");
          }
      } catch (err) {
          console.error("Online download failed:", err);
          showNotification(`Failed to download "${song.title}". Check your connection.`, "error");
      }
  }, [librarySongs, updateProfile, addXp, showNotification]);

  const handleDeleteSong = useCallback((songTitle: string) => {
      const song = findSongByTitle(songTitle, librarySongs);
      if (!song) return `Could not find song "${songTitle}".`;
      setLibrarySongs(prev => prev.filter(s => s.id !== song.id));
      deleteSongFromDB(song.id);
      if (nowPlaying?.id === song.id) handleNext();
      showNotification(`Deleted "${song.title}" from library.`, 'info');
      return `Deleted "${song.title}".`;
  }, [librarySongs, nowPlaying, handleNext, showNotification]);

  const handleNavigateWithCountdown = useCallback((viewName: string) => {
      let seconds = 3;
      setNavCountdown({ target: viewName, seconds });
      const interval = setInterval(() => {
          seconds--;
          if (seconds <= 0) {
              clearInterval(interval);
              setNavCountdown(null);
              handleNavigate(viewName);
          } else {
              setNavCountdown({ target: viewName, seconds });
          }
      }, 1000);
      return `Navigating to ${viewName} in 3 seconds...`;
  }, [handleNavigate]);

  const appControls: AppControls = useMemo(() => ({
      togglePlay: handleTogglePlay,
      playNext: handleNext,
      playPrev: handlePrev,
      onPlaySong: handleOnPlaySongFromAssistant,
      setSimpleMode: ({ enabled }) => updateProfile(p => ({ ...p, settings: { ...p.settings, simpleMode: { ...p.settings.simpleMode, enabled } }})),
      playRadio: ({ query }) => {
          if (query) setInitialSearchQuery(query);
          handleNavigate('Radio');
      },
      setVolumeNormalization: ({ enabled }) => updateProfile(p => ({ ...p, settings: { ...p.settings, volumeNormalization: enabled }})),
      setCrossfade: ({ value }) => updateProfile(p => ({ ...p, settings: { ...p.settings, transitionDuration: value }})),
      setThemeMode: ({ mode }) => updateProfile(p => ({ ...p, themeMode: mode })),
      applyThemeByName: ({ themeName }) => {
           const themes = themePairs.map(t => t.name);
           const normalizedInput = themeName.toLowerCase().replace(/[^a-z0-9]/g, '');
           const matchedTheme = themes.find(t => t.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedInput) || 
                                themes.find(t => t.toLowerCase().includes(normalizedInput));

           if (matchedTheme) {
               updateProfile(p => ({...p, activeThemePair: matchedTheme, settings: {...p.settings, dynamicThemeMode: 'off'} }));
               showNotification(`Theme changed to ${matchedTheme}`, 'success');
               return `Applied ${matchedTheme} theme.`;
           }
           return `Could not find theme "${themeName}".`;
      },
      setSleepTimer: ({ mode, value }) => handleSetSleepTimer(mode, value),
      changeFont: ({ fontName }) => {
          updateProfile(p => ({ ...p, activeFont: fontName }));
          showNotification(`Font changed to ${fontName}`, 'success');
      },
      applyCustomTheme: (colors) => updateProfile(p => ({ ...p, customThemeColors: colors, activeThemePair: 'Custom' })),
      toggleFavorite: () => handleToggleFavorite(),
      addToQueue: ({ songTitle }) => handleAddToQueue(songTitle),
      navigateToView: ({ viewName }) => handleNavigate(viewName),
      openAudioEffects: () => setActiveModal('equalizer'),
      playAiPlaylist: handlePlayAiPlaylist,
      toggleShuffle: handleToggleShuffle,
      cycleRepeat: handleCycleRepeat,
      scanForMedia: handleScanForMedia,
      getPlaybackStatus: () => {
          const { isPlaying, isShuffled, repeatMode, nowPlaying } = getAppState();
          const songInfo = nowPlaying ? `Currently playing "${nowPlaying.title}".` : "Nothing is playing.";
          return `${songInfo} Playback is ${isPlaying ? 'active' : 'paused'}. Shuffle is ${isShuffled ? 'ON' : 'OFF'}. Repeat mode is '${repeatMode}'.`;
      },
      createPlaylist: ({ name }) => handleCreatePlaylistProgrammatic({ name }),
      addSongToPlaylist: ({ songTitle, playlistName }) => handleAddSongToPlaylistProgrammatic({ songTitle, playlistName }),
      playArtist: ({ artistName }) => handlePlayArtist(artistName),
      deleteSong: ({ songTitle }) => handleDeleteSong(songTitle),
      toggleSetting: ({ settingName, value }) => {
          updateProfile(p => {
              if (settingName === 'playerIdleUiEnabled') return { ...p, settings: { ...p.settings, playerIdleUiEnabled: value } };
              if (settingName === 'aiCoverArtEnabled') return { ...p, settings: { ...p.settings, aiCoverArtEnabled: value } };
              if (settingName.startsWith('assistant.')) {
                  const key = settingName.split('.')[1] as keyof ProfileData['settings']['assistant'];
                  return { ...p, settings: { ...p.settings, assistant: { ...p.settings.assistant, [key]: value } } };
              }
              return p;
          });
          return `${settingName} set to ${value}.`;
      },
      setReelsAutoScroll: ({ loops }) => {
          updateProfile(p => ({ ...p, settings: { ...p.settings, reelsAutoScrollLoops: loops } }));
          return `Reels auto-scroll set to ${loops} loops.`;
      },
      getAnalytics: ({ type }) => {
          if (!profile) return "No profile data.";
          if (type === 'summary') {
              return `You've listened for ${(profile.analytics.listenTime / 3600).toFixed(1)} hours, played ${profile.analytics.songsPlayed} songs, and collected ${profile.unlockedAchievements.length} achievements.`;
          }
          return "Stats retrieved.";
      },
      managePlaylist: ({ action, name, song }) => {
          if (action === 'create') return handleCreatePlaylistProgrammatic({ name });
          if (action === 'add' && song) return handleAddSongToPlaylistProgrammatic({ songTitle: song, playlistName: name });
          if (action === 'delete') {
              return "Deleting playlists via voice is not fully supported yet for safety.";
          }
          return "Invalid playlist action.";
      },
      navigateToViewWithCountdown: ({ viewName }) => handleNavigateWithCountdown(viewName),
      startMusicQuiz: () => { handleNavigate('MusicQuiz'); },
      startPartyMode: () => { handleNavigate('PartyMode'); },
      toggleLyrics: () => { handleToggleLyrics(); },
      setVisualizerType: ({ type }) => { updateProfile(p => ({...p, settings: {...p.settings, visualizerSettings: {...p.settings.visualizerSettings, type }}})); },
      clearQueue: () => { setPlayQueue([]); showNotification("Queue cleared.", "info"); if(isPlaying) { setIsPlaying(false); if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } } },
      openProfile: () => { handleNavigate('Profile'); },
      openVisualizerSettings: () => { setActiveModal('visualizer'); },
      setEqualizer: ({ low, mid, high }) => {
          return `EQ adjusted: Low ${low}, Mid ${mid}, High ${high}.`; 
      },
      explainLyrics: async () => {
          const song = nowPlaying;
          if (!song) return "No song is currently playing. Please play a track first!";
          
          const lyricsToAnalyze = song.lyrics || "";
          const apiKey = profile?.apiKey || process.env.API_KEY;
          
          if (!apiKey) {
              if (lyricsToAnalyze) {
                  return `Here are the lyrics for "${song.title}":\n\n${lyricsToAnalyze.slice(0, 300)}...\n\n(For a deep neural explanation, please set your Gemini API Key in Settings!)`;
              }
              return `I don't have lyrics stored for "${song.title}", and there's no Gemini API Key in Settings to generate an explanation online.`;
          }

          try {
              const ai = new GoogleGenAI({ apiKey });
              const prompt = lyricsToAnalyze 
                  ? `Explain the meaning, vibe, and narrative of the following lyrics from "${song.title}" by ${song.artist}:\n\n${lyricsToAnalyze}`
                  : `Explain the general meaning, vibe, and artistic story of the song "${song.title}" by ${song.artist}. Since no lyrics are locally stored, provide a broad contextual breakdown of this track.`;
                  
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return response.text || "I processed the request but received an empty response.";
          } catch (e) {
              console.error("Lyrics explanation failed:", e);
              return `Failed to explain lyrics online: ${String(e)}`;
          }
      },
      translateLyrics: async ({ targetLanguage }) => {
          const song = nowPlaying;
          if (!song) return "Please play a song first!";
          
          const lyricsToTranslate = song.lyrics || "";
          const apiKey = profile?.apiKey || process.env.API_KEY;

          if (!lyricsToTranslate) {
              return `I don't have lyrics stored for "${song.title}" to translate.`;
          }
          
          if (!apiKey) {
              return `Please configure your Gemini API Key in Settings to translate lyrics online.`;
          }

          try {
              const ai = new GoogleGenAI({ apiKey });
              const prompt = `Translate the following lyrics of the song "${song.title}" by ${song.artist} to ${targetLanguage}. Preserve the poetic structure and provide high-fidelity translations. Highlight any traditional Swahili terms if present:\n\n${lyricsToTranslate}`;
                  
              const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: prompt
              });
              return response.text || "Empty translation response.";
          } catch (e) {
              console.error("Translation failed:", e);
              return `Failed to translate lyrics online: ${String(e)}`;
          }
      }
  }), [handleTogglePlay, handleNext, handlePrev, updateProfile, handleNavigate, handleSetSleepTimer, handleToggleFavorite, handleAddToQueue, handleToggleShuffle, handleCycleRepeat, handleScanForMedia, getAppState, handleOnPlaySongFromAssistant, handlePlayAiPlaylist, handleCreatePlaylistProgrammatic, handleAddSongToPlaylistProgrammatic, showNotification, handlePlayArtist, handleDeleteSong, handleNavigateWithCountdown, nowPlaying, profile]);
  
  const { messages, sendMessage, isOnline, toggleOnlineMode, resetToGreeting, loadChat } = useAssistant({
      getAppState,
      controls: appControls,
      showNotification,
      onMicStart: () => {
          const wasPlaying = isPlaying;
          if (wasPlaying) handlePause();
          return wasPlaying;
      },
      onMicEnd: (wasPlaying) => {
          if (wasPlaying) handlePlay();
      },
      onAssistantResponse: (text) => {
          if (profile?.settings.assistant.readResponses) {
              queueSpeech(text, 'response');
          }
      },
      initialMessages: undefined,
      chatId: null,
  });
    
  const handleOpenAssistant = () => {
    resetToGreeting();
    setAssistantView('chat');
    playHapticImpact();
    setIsAssistantOpening(true);
    setTimeout(() => {
      setIsAssistantVisible(true);
      setTimeout(() => setIsAssistantOpening(false), 500);
    }, 2000);
  };
  const handleCloseAssistant = () => setIsAssistantVisible(false);

   const handleLoadChat = async (chatIdToLoad: string) => {
        const history = await getChatHistory();
        const chatToLoad = history.find(c => c.id === chatIdToLoad);
        if (chatToLoad) {
            loadChat(chatToLoad.messages, chatToLoad.id);
            setAssistantView('chat');
        }
    };
    
  useEffect(() => {
        if (!profile) return;
        const root = document.documentElement;
        let activeTheme: ThemeColors | undefined;

        if (profile.settings.dynamicThemeMode === 'off') {
            const themePair = themePairs.find(t => t.name === profile.activeThemePair) || themePairs.find(t => t.name === 'Default Dark')!;
            activeTheme = profile.themeMode === 'light' ? themePair.light : themePair.dark;
        } else if (profile.settings.dynamicThemeMode === 'cover' && nowPlaying?.albumArtUrl) {
            getDominantColor(nowPlaying.albumArtUrl).then(color => {
                if(color) {
                    const hsl = rgbStringToHsl(color);
                    if (hsl) {
                        const [h, s, l] = hsl;
                        const isDark = l < 0.5;
                        root.style.setProperty('--primary-accent', hslToCss(h, s, isDark ? 0.7 : 0.45));
                        root.style.setProperty('--secondary-accent-start', hslToCss((h + 30) % 360, s * 0.8, isDark ? 0.6 : 0.55));
                        root.style.setProperty('--secondary-accent-end', hslToCss((h - 30 + 360) % 360, s, isDark ? 0.5 : 0.65));
                        root.style.setProperty('--bg-color', isDark ? hslToCss(h, s * 0.4, 0.1) : hslToCss(h, s * 0.2, 0.95));
                        root.style.setProperty('--surface-color', isDark ? hslToCss(h, s * 0.4, 0.15) : hslToCss(h, s * 0.2, 0.98));
                        root.style.setProperty('--text-primary', isDark ? '#FFFFFF' : '#000000');
                        root.style.setProperty('--text-secondary', isDark ? '#B3B3B3' : '#555555');
                    }
                }
            });
        } else if (profile.settings.dynamicThemeMode === 'time') {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 10) activeTheme = morningTheme;
            else if (hour >= 10 && hour < 17) activeTheme = middayTheme;
            else if (hour >= 17 && hour < 20) activeTheme = eveningTheme;
            else if (hour >= 20 && hour < 23) activeTheme = earlyNightTheme;
            else if (hour >= 23 || hour < 1) activeTheme = midnightTheme;
            else activeTheme = lateNightTheme;
        } else if (profile.settings.dynamicThemeMode === 'mood' && nowPlaying?.moodEmoji) {
            const mood = [...defaultMoods, ...(profile.customMoods || [])].find(m => m.emoji === nowPlaying.moodEmoji);
            if(mood?.themeColor) {
                 const color = mood.themeColor;
                 const isDark = profile.themeMode === 'dark';
                 root.style.setProperty('--primary-accent', color);
                 root.style.setProperty('--secondary-accent-start', `color-mix(in srgb, ${color}, ${isDark ? 'white' : 'black'} 20%)`);
                 root.style.setProperty('--secondary-accent-end', `color-mix(in srgb, ${color}, ${isDark ? 'white' : 'black'} 40%)`);
            }
        }
        
        if (activeTheme) {
            Object.entries(activeTheme).forEach(([key, value]) => root.style.setProperty(key, value));
        } else if (profile.activeThemePair === 'Custom' && profile.customThemeColors?.primary) {
            root.style.setProperty('--primary-accent', profile.customThemeColors.primary);
            root.style.setProperty('--secondary-accent-start', profile.customThemeColors.secondary);
            root.style.setProperty('--secondary-accent-end', profile.customThemeColors.accent);
            root.style.setProperty('--bg-color', profile.customThemeColors.bgColor);
            root.style.setProperty('--surface-color', profile.customThemeColors.surfaceColor);
        }
        const themePair = themePairs.find(t => t.name === profile.activeThemePair);
        const fontStyle = themePair && themePair.category === 'Holiday' && themePair.light['--font-family']
            ? themePair.light['--font-family'] 
            : fonts.find(f => f.name === profile.activeFont)?.family;

        if (fontStyle) root.style.setProperty('--font-family', fontStyle);
        else root.style.removeProperty('--font-family');
        root.style.setProperty('--font-size-multiplier', String(profile.settings.fontSizeMultiplier || 1));
  }, [profile?.activeThemePair, profile?.themeMode, profile?.customThemeColors, profile?.activeFont, profile?.settings.fontSizeMultiplier, profile?.settings.dynamicThemeMode, nowPlaying]);
  
  const handleToggleTheme = () => {
    playToggleSound();
    updateProfile(p => {
        if (!p) return p;
        const currentTheme = p.activeThemePair;
        const counterpart = themeCounterparts[currentTheme];
        const targetMode = p.themeMode === 'light' ? 'dark' : 'light';
        
        if (counterpart) {
             return { ...p, activeThemePair: counterpart, themeMode: targetMode };
        }
        return { ...p, themeMode: targetMode };
    });
  };

  const handleBack = () => {
    playHapticImpact();
    if (viewHistory.length > 1) {
        const newHistory = [...viewHistory];
        newHistory.pop();
        const lastView = newHistory[newHistory.length - 1];
        
        if (activeView === 'Artist') setArtistToView(null);
        if (activeView === 'Playlist') setPlaylistToView(null);
        if (activeView === 'ReelPlaylist') setReelPlaylistToView(null);
        
        if (activeView === 'Reels') {
            setIsBottomNavHidden(false);
            setIsMiniPlayerHidden(false);
        }

        setViewHistory(newHistory);
        setActiveView(lastView);
    }
  };

  // Native back button gesture interception
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (isLyricsVisible) {
        handleToggleLyrics('closed');
      } else if (isPlayerOverlayVisible) {
        setIsPlayerOverlayVisible(false);
      } else if (isAssistantVisible) {
        setIsAssistantVisible(false);
      } else if (songForDetails) {
        setSongForDetails(null);
      } else if (activeModal) {
        setActiveModal(null);
      } else if (viewHistory.length > 1) {
        handleBack();
      } else {
        setActiveModal('exitConfirm');
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [
    isLyricsVisible,
    isPlayerOverlayVisible,
    isAssistantVisible,
    songForDetails,
    activeModal,
    viewHistory,
    handleBack
  ]);

    useEffect(() => {
        savePlayQueue(playQueue);
        localStorage.setItem('mwijayMusic_currentQueueIndex', currentQueueIndex.toString());
    }, [playQueue, currentQueueIndex]);
    
    const resolveAndPlay = useCallback(async () => {
        setIsSongLoading(true);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryCountRef.current = 0;

        if (playQueue.length === 0 || currentQueueIndex < 0 || currentQueueIndex >= playQueue.length) {
            setNowPlaying(null);
            setIsSongLoading(false);
            return;
        }
        let nextSong = playQueue[currentQueueIndex];
        if (!nextSong) { setNowPlaying(null); setIsSongLoading(false); return; }

        if (nextSong.source === 'Archive.org' && !nextSong.url) {
            const identifier = nextSong.id.replace('archive-', '');
            try {
                const metadataResponse = await fetch(`https://archive.org/metadata/${identifier}`);
                if (!metadataResponse.ok) throw new Error(`Metadata fetch failed: ${metadataResponse.status}`);
                const metadata = await metadataResponse.json();
                
                // Prioritize VBR MP3 > MP3 > OGG
                let audioFile = metadata.files.find((f: any) => f.format === 'VBR MP3');
                if (!audioFile) audioFile = metadata.files.find((f: any) => f.format === 'MP3');
                if (!audioFile) audioFile = metadata.files.find((f: any) => f.format === 'Ogg Vorbis');
                if (!audioFile) audioFile = metadata.files.find((f: any) => ['MP3', 'OGG', 'FLAC', 'WAV'].some((ext: string) => f.name.toUpperCase().endsWith(ext)));

                if (audioFile) {
                    // Important: Encode components to handle spaces and special chars
                    const newUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(audioFile.name)}`;
                    const updatedSong = { ...nextSong, url: newUrl };
                    // Update in queue to avoid re-fetching
                    setPlayQueue(q => q.map(s => s.queueId === nextSong.queueId ? updatedSong : s));
                    nextSong = updatedSong; 
                } else {
                    showNotification(`No playable audio format found for "${truncate(nextSong.title, 20)}". Skipping.`, 'error');
                    handleNext();
                    return;
                }
            } catch (e) {
                console.error("Archive fetch error:", e);
                showNotification(`Network error for "${truncate(nextSong.title, 20)}". Skipping.`, 'error');
                handleNext();
                return;
            }
        }
        
        const shouldPlay = isPlayingRef.current || isNewPlayRequest.current;
        if (nowPlaying?.queueId === nextSong.queueId && !isNewPlayRequest.current) {
            setIsSongLoading(false);
            return;
        }
        isNewPlayRequest.current = false;

        setNowPlaying(nextSong);
        if (nextSong.albumArtUrl) getDominantColor(nextSong.albumArtUrl).then(color => setDominantColor(color));
        
        // Award 5 XP for starting a song, and increment songsPlayed count!
        updateProfile(p => {
            if (!p) return p;
            const updatedSongsPlayed = {
                ...p,
                analytics: {
                    ...p.analytics,
                    songsPlayed: (p.analytics?.songsPlayed || 0) + 1
                }
            };
            return addXpClientSide(
                updatedSongsPlayed, 
                5, 
                `Started playing: ${nextSong.title}`,
                (newLvl, rewards) => {
                    const rankTitle = getTitleForLevel(newLvl);
                    setLevelUpData({ level: newLvl, title: rankTitle, rewards });
                    if (p.settings.notificationsEnabled) {
                        playAchievementSound();
                    }
                    const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
                    queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
                }
            );
        });

        const audio = audioRef.current;
        if (!audio) return;

        let newSrc = '';
        if (nextSong.nativeUrl && Capacitor.isNativePlatform()) {
            newSrc = Capacitor.convertFileSrc(nextSong.nativeUrl);
        } else if (nextSong.audioData) {
            if (blobUrlCache.current.has(nextSong.id)) newSrc = blobUrlCache.current.get(nextSong.id)!;
            else { const blob = new Blob([nextSong.audioData], { type: nextSong.mimeType || 'audio/mpeg' }); newSrc = URL.createObjectURL(blob); blobUrlCache.current.set(nextSong.id, newSrc); }
        } else if (nextSong.url) {
            if (nextSong.duration === Infinity) {
                newSrc = nextSong.url;
            } else {
                newSrc = forceHttps(nextSong.url);
            }
        }

        if (!newSrc) {
            showNotification(`"${truncate(nextSong.title, 20)}" has no audio source. Skipping.`, 'error');
            handleNext();
            return;
        }

        // Dynamically toggle CORS based on source to resolve "no audio" CORS blockade
        if (nextSong.duration === Infinity) {
            // Non-CORS sources (like radio stations) are loaded natively without CORS pre-flight
            audio.removeAttribute('crossorigin');
        } else {
            // All other songs (Jamendo, Cloudinary, Archive.org, local files) require anonymous CORS to prevent silent muting
            audio.crossOrigin = "anonymous";
        }
        
        const wasPlaying = shouldPlay;
        const transitionDuration = getTransitionDuration();
        
        const playNewSrc = () => {
            audio.src = newSrc;
            audio.load();
            if (wasPlaying) {
                if(isDjSessionActive && isTtsSpeaking) {
                    
                } else {
                    audio.volume = 0;
                    fadeAudio(audio, originalVolumeRef.current, transitionDuration);
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            if (isMounted.current) setIsPlaying(true);
                        }).catch(error => {
                            // Specifically ignore interruption error
                            if (error.name === 'AbortError' || error.message?.includes('interrupted')) {
                                return;
                            }
                            if (isMounted.current) {
                                setIsPlaying(false);
                            }
                        });
                    } else {
                        if (isMounted.current) setIsPlaying(true);
                    }
                }
            } else {
                 if (isMounted.current) setIsPlaying(false);
            }
        };

        if (audio.src && !audio.paused && audio.src !== window.location.href) {
             fadeAudio(audio, 0, transitionDuration, playNewSrc);
        } else {
            playNewSrc();
        }
        
        if (radioTimerRef.current) {
            clearInterval(radioTimerRef.current);
            radioTimerRef.current = null;
        }
        setCurrentSessionRadioTime(0);

        if (nextSong.source && ['Audius', 'Archive.org'].includes(nextSong.source)) {
            updateProfile(p => !p ? p : { ...p, recentlyPlayedOnline: [nextSong, ...(p.recentlyPlayedOnline || []).filter(s => s.id !== nextSong.id)].slice(0, 20) });
        } else if (nextSong.duration !== Infinity) {
            updateProfile(p => !p ? p : { ...p, recentlyPlayed: [nextSong.id, ...(p.recentlyPlayed || []).filter(id => id !== nextSong.id)].slice(0, 20) });
        }
    }, [currentQueueIndex, playQueue, profile, handleNext, showNotification, updateProfile, nowPlaying, getTransitionDuration, isDjSessionActive, isTtsSpeaking]);

    useEffect(() => {
        resolveAndPlay();
    }, [currentQueueIndex, playQueue, resolveAndPlay]);

    const retryPlayback = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !nowPlayingRef.current) return;
        
        console.log(`Retrying playback for "${nowPlayingRef.current.title}", attempt ${retryCountRef.current + 1}`);
        audio.load();
        audio.play().catch(e => {
            console.warn('Retry play failed:', e.name);
        });
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if(!audio) return;

        const timeUpdateHandler = () => { 
            if (!isSeeking) {
                setProgress(audio.currentTime || 0);
            }
            if (isPlayingRef.current && nowPlayingRef.current && !audio.paused) {
                const now = Date.now();
                if (!lastListenTimeUpdate.current || now - lastListenTimeUpdate.current >= 1000) {
                    lastListenTimeUpdate.current = now;
                    updateProfile(p => {
                        if (!p) return p;
                        const isRadio = nowPlayingRef.current?.duration === Infinity;
                        const newAnalytics = { ...p.analytics };
                        if (isRadio) { newAnalytics.radioListenTime = (newAnalytics.radioListenTime || 0) + 1; } 
                        else { newAnalytics.listenTime = (newAnalytics.listenTime || 0) + 1; }
                        
                        // Weekly Activity Tracking
                        const todayIndex = new Date().getDay(); // 0 (Sun) to 6 (Sat)
                        const newWeekly = [...(newAnalytics.weeklyActivity || [0,0,0,0,0,0,0])];
                        // If array is not length 7, reset it
                        if (newWeekly.length !== 7) {
                             while(newWeekly.length < 7) newWeekly.push(0);
                        }
                        newWeekly[todayIndex] = (newWeekly[todayIndex] || 0) + 1; // Increment seconds
                        newAnalytics.weeklyActivity = newWeekly;

                        // Daily Streak Seconds Tracking
                        const todayStr = getLocalDateString();
                        const streak = p.streak || {
                            currentStreak: 0,
                            longestStreak: 0,
                            lastListenDate: '',
                            freezeCount: 2,
                            calendar: [],
                            dailySeconds: {}
                        };
                        const dailySeconds = { ...(streak.dailySeconds || {}) };
                        const prevSeconds = dailySeconds[todayStr] || 0;
                        const newSeconds = prevSeconds + 1;
                        dailySeconds[todayStr] = newSeconds;

                        let updatedProfile = { 
                            ...p, 
                            analytics: newAnalytics,
                            streak: {
                                ...streak,
                                dailySeconds: dailySeconds
                            }
                        };

                        // Award 1 XP for every minute of continuous playback (when seconds % 60 === 0)
                        if (newSeconds % 60 === 0) {
                            updatedProfile = addXpClientSide(updatedProfile, 1, "Continuous listening");
                        }

                        if (newSeconds === 300) {
                            // Hit exactly 5 minutes! Extend streak and award 50 XP
                            updatedProfile = updateStreakClientSide(updatedProfile);
                            updatedProfile = addXpClientSide(
                                updatedProfile, 
                                50, 
                                "Daily listening goal achieved (5 minutes)",
                                (newLvl, rewards) => {
                                    const rankTitle = getTitleForLevel(newLvl);
                                    setLevelUpData({ level: newLvl, title: rankTitle, rewards });
                                    if (p.settings.notificationsEnabled) {
                                        playAchievementSound();
                                    }
                                    const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
                                    queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
                                }
                            );
                            
                            setTimeout(() => {
                                showNotification("Daily Goal Met! Streak Extended! 🔥 (+50 XP)", "success");
                            }, 500);
                        }

                        return updatedProfile;
                    });
                }
        
                if (!lastTopChartUpdate.current || now - lastTopChartUpdate.current >= 60000) {
                    lastTopChartUpdate.current = now;
                    updateProfile(p => {
                        if (!p || !nowPlayingRef.current) return p;
                        const newAnalytics = { ...p.analytics };
                        if (nowPlayingRef.current.duration === Infinity) { newAnalytics.topRadios = addToTopRadios(newAnalytics.topRadios, nowPlayingRef.current.id, nowPlayingRef.current.title); } 
                        else {
                            newAnalytics.topSongs = addToTopSongs(newAnalytics.topSongs, nowPlayingRef.current);
                            newAnalytics.topArtists = addToTopArtists(newAnalytics.topArtists, nowPlayingRef.current.artist, nowPlayingRef.current.albumArtUrl);
                        }
                        return { ...p, analytics: newAnalytics };
                    });
                }
            }
        };
        const loadedMetadataHandler = () => setDuration(isFinite(audio.duration || 0) ? audio.duration || 0 : Infinity);
        
        const endedHandler = () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryCountRef.current = 0;

            if (sleepTimer.mode === 'songs' && sleepTimer.songCount > 0) {
                const newCount = sleepTimer.songCount - 1;
                if (newCount <= 0) {
                    handlePause();
                    showNotification('Sleep timer finished.', 'info');
                    setSleepTimer({ mode: 'off', value: 0, timeoutId: null, songCount: 0 });
                    return;
                }
                setSleepTimer(prev => ({ ...prev, songCount: newCount }));
            }

            if (repeatMode === 'one') {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } else if (currentQueueIndex === playQueue.length - 1 && repeatMode !== 'all' && !isDjSessionActive) {
                setIsPlaying(false);
            } else {
                handleNext();
            }
        };

        const errorHandler = () => {
            setIsSongLoading(false);
            if (!hasPlaybackStarted) return;
            const error = audio.error;
            // Ignore if aborted
            if (!error || error.code === MediaError.MEDIA_ERR_ABORTED) return;
        
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

            const songTitle = nowPlayingRef.current?.title || "the track";
            console.error(`Audio play failed for "${songTitle}": Code ${error.code}, Message: ${error.message}`);
            
            if (retryCountRef.current < 6) { 
                retryCountRef.current += 1;
                // showNotification(`Playback error. Retrying... (${retryCountRef.current}/6)`, 'error');
                retryTimeoutRef.current = window.setTimeout(retryPlayback, 5000);
            } else {
                showNotification(`Could not play "${truncate(songTitle, 20)}". Skipping.`, 'error');
                retryCountRef.current = 0;
                handleNext();
            }
        };

        const canPlayHandler = () => {
            setIsSongLoading(false);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryCountRef.current = 0;
        };
        
        const playHandler = () => {
            // Important: Resume Audio Context on user interaction (play event)
            if (audioFx?.context && audioFx.context.state === 'suspended') {
                audioFx.context.resume().catch(e => console.error("Failed to resume context on play", e));
            }

            if(audio.volume < originalVolumeRef.current && !isTtsSpeaking) {
                fadeAudio(audio, originalVolumeRef.current, getTransitionDuration());
            }
        };

        audio.addEventListener('timeupdate', timeUpdateHandler);
        audio.addEventListener('loadedmetadata', loadedMetadataHandler);
        audio.addEventListener('ended', endedHandler);
        audio.addEventListener('error', errorHandler);
        audio.addEventListener('canplay', canPlayHandler);
        audio.addEventListener('play', playHandler);
        
        return () => {
            audio.removeEventListener('timeupdate', timeUpdateHandler);
            audio.removeEventListener('loadedmetadata', loadedMetadataHandler);
            audio.removeEventListener('ended', endedHandler);
            audio.removeEventListener('error', errorHandler);
            audio.removeEventListener('canplay', canPlayHandler);
            audio.removeEventListener('play', playHandler);
        };
    }, [playQueue, currentQueueIndex, handleNext, handlePause, setSleepTimer, repeatMode, showNotification, sleepTimer, updateProfile, isSeeking, hasPlaybackStarted, checkAchievements, profile, getTransitionDuration, retryPlayback, isTtsSpeaking, isDjSessionActive, audioFx]);

    const handlePlayReelAsAudio = useCallback((video: Video) => {
        const songFromReel: Song = {
            id: video.id,
            url: video.url,
            nativeUrl: video.nativeUrl,
            title: video.title,
            artist: video.uploader || "Mwijay Reels",
            albumArtUrl: video.thumbnailUrl || getRandomCoverArt(),
            isFavorite: video.isFavorite,
            isFromReel: true,
            audioData: video.videoData,
        };
        handlePlaySong(songFromReel, [songFromReel, ...librarySongs]);
    }, [handlePlaySong, librarySongs]);
    
    const handleOnboardComplete = (data: { name: string, userId?: string, avatarUrl?: string }) => {
        const updatedProfile = {
            ...profile!,
            name: data.name,
            avatarUrl: data.avatarUrl || profile!.avatarUrl,
            onboarded: true,
            id: data.userId || 'userProfile'
        };
        updateProfile(() => updatedProfile);
        
        setShowWelcomeCelebration(true);
        if(isMounted.current) setIsTutorialModalOpen(true);
        setTimeout(() => { if (isMounted.current) setShowWelcomeCelebration(false); }, 5000);

        if (updatedProfile.settings.assistant.audibleGreeting) {
            queueSpeech(`Welcome, ${data.name}! Enjoy the new music experience by Mwijay Music App.`, 'greeting');
        }

        localStorage.setItem('mwijayMusic_launchedBefore', 'true');
    };
    
    const handleEmojiSelect = (emoji: string) => {
        updateProfile(p => p ? ({ ...p, avatarUrl: emoji }) : p);
        setActiveModal(null);
    };

    const handleGenerateAiCover = async (song: Song) => {
        const primaryKey = profile?.apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
        const keysToTry = [primaryKey, ...GEMINI_KEYS].filter(Boolean);

        if (keysToTry.length === 0) {
            showNotification('Please set your Gemini API key in Settings to use AI features.', 'error');
            return;
        }

        showNotification('Generating AI cover art...', 'info', <Sparkles size={18} />);
        
        for (const key of keysToTry) {
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: `Album cover for a song titled "${song.title}" by the artist "${song.artist}".`,
                    config: { numberOfImages: 1 }
                });
                const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
                if (base64Image) {
                    const updatedSong = { ...song, albumArtUrl: `data:image/png;base64,${base64Image}` };
                    handleUpdateSong(updatedSong);
                    showNotification('AI Cover Art generated and applied!', 'success');
                    return; // Success!
                }
            } catch (error) {
                console.warn(`Gemini key failed for cover art:`, error);
            }
        }
        showNotification('Failed to generate AI cover art with all available keys.', 'error');
    };

    const handleReelActiveChange = useCallback((isActive: boolean) => {
        if (isActive && isPlaying) {
             handlePause(); 
        }
    }, [isPlaying, handlePause]);
    
    const handleToggleReelsUiVisibility = useCallback(() => {
        setIsBottomNavHidden(prev => !prev);
        setIsMiniPlayerHidden(prev => !prev);
    }, []);

    const handleStartDjSession = useCallback(async () => {
        if (!profile || librarySongs.length < 10) {
            showNotification('Need at least 10 songs in your library for AI DJ mode.', 'info');
            return;
        }
        
        const primaryKey = profile.apiKey || process.env.API_KEY || '';
        const keysToTry = [primaryKey, ...GEMINI_KEYS].filter(Boolean);

        if (keysToTry.length === 0) {
            showNotification('Please set your Gemini API key in Settings for AI DJ mode.', 'error');
            return;
        }

        setIsDjSessionStarting(true);
        showNotification('Starting your AI DJ session...', 'info', <Radio size={18} />);

        for (const key of keysToTry) {
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const topSongsList = profile.analytics.topSongs.slice(0, 5).map(s => `"${s.title}" by ${s.artist}`).join(', ');
                const recentSongsList = profile.recentlyPlayed.slice(0, 5)
                    .map(id => librarySongs.find(s => s.id === id))
                    .filter(Boolean)
                    .map(s => `"${s!.title}" by ${s!.artist}`)
                    .join(', ');

                const prompt = `You are an upbeat and friendly radio DJ. Create a personalized playlist of exactly 20 songs for a user named ${profile.name}.
                Their top songs include: ${topSongsList || 'none'}.
                They recently played: ${recentSongsList || 'none'}.
                Based on this, choose 20 songs from the following library.
                Your response must be a JSON array of strings, where each string is just the song title.
                Example: ["Song Title 1", "Song Title 2"]

                User's Library:
                ${librarySongs.map(s => `"${s.title}" by ${s.artist}`).join('\n')}
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' },
                });
                const responseText = response.text;
                const playlistTitles = JSON.parse(typeof responseText === 'string' ? responseText : '[]');

                if (Array.isArray(playlistTitles) && playlistTitles.length > 0) {
                    const djPlaylist = (playlistTitles as unknown[])
                        .map((title) => findSongByTitle(String(title), librarySongs))
                        .filter((s): s is Song => !!s);
                    
                    if (djPlaylist.length > 0) {
                        setIsDjSessionActive(true);
                        queueSpeech(`Hey ${profile.name}, welcome to your personal radio station! I've cooked up a special playlist for you. Kicking things off with this banger!`, 'response');
                        handlePlaySong(djPlaylist[0], djPlaylist);
                        setIsDjSessionStarting(false);
                        return; // Success!
                    } else {
                        throw new Error("AI couldn't find matching songs.");
                    }
                } else {
                    throw new Error("AI did not return a valid playlist.");
                }
            } catch (error) {
                console.warn(`Gemini key failed for AI DJ session:`, error);
            }
        }

        setIsDjSessionStarting(false);
        showNotification('Could not start AI DJ session with all available keys.', 'error');
    }, [profile, librarySongs, showNotification, handlePlaySong, queueSpeech]);

    const handleFullRestore = useCallback(async (data: any) => {
        if (data.profile) setProfile(data.profile);
        if (data.playlists) {
            setPlaylists(data.playlists);
            savePlaylists(data.playlists);
        }
        if (data.songsMetadata) {
            const existingIds = new Set(librarySongs.map(s => s.id));
            const newSongs = data.songsMetadata.filter((s: Song) => !existingIds.has(s.id));
            if (newSongs.length > 0) {
                await addOrUpdateSongs(newSongs);
                setLibrarySongs(prev => [...prev, ...newSongs]);
            }
        }
        showNotification("Full backup restored successfully!", "success");
    }, [librarySongs, savePlaylists, showNotification]);

    const handleRequestPermission = useCallback(async (type: 'media' | 'mic' | 'camera') => {
        try {
            if (type === 'media') {
                if (Capacitor.isNativePlatform()) {
                    const permStatus = await Filesystem.checkPermissions();
                    if (permStatus.publicStorage !== 'granted') {
                        const request = await Filesystem.requestPermissions();
                        if (request.publicStorage === 'granted') {
                            showNotification("Storage access granted! You can now scan local music files.", "success");
                        } else {
                            showNotification("Storage permission denied. Please allow it in settings.", "error");
                        }
                    } else {
                        showNotification("Storage permission is already granted!", "success");
                    }
                } else {
                    showNotification("Storage scanning is only available on mobile devices.", "info");
                }
            } else if (type === 'camera') {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(track => track.stop());
                    showNotification("Camera access granted successfully!", "success");
                } else {
                    showNotification("Camera access is not supported on this browser/device.", "error");
                }
            } else if (type === 'mic') {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    showNotification("Microphone access granted successfully!", "success");
                } else {
                    showNotification("Microphone access is not supported on this browser/device.", "error");
                }
            }
        } catch (error) {
            console.error(`Error requesting permission for ${type}:`, error);
            showNotification(`Could not obtain ${type} permission: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
    }, [showNotification]);

    const handleOpenClearDataModal = () => setActiveModal('clearData');
    
    const handleClearSongs = async () => {
        await clearStore('songs');
        await clearStore('playlists');
        setLibrarySongs([]);
        setPlaylists([]);
        updateProfile(p => ({ ...p, analytics: { ...p.analytics, listenTime: 0, songsPlayed: 0, songsUploaded: 0, topArtists: [], topSongs: [] }}));
        showNotification('All songs and playlists have been cleared.', 'success');
        setActiveModal(null);
    };

    const handleClearContent = async (contentType: 'lyrics' | 'notes') => {
        const updatedSongs = librarySongs.map(s => ({ ...s, [contentType]: undefined }));
        await addOrUpdateSongs(updatedSongs);
        setLibrarySongs(updatedSongs);
        showNotification(`All saved ${contentType} have been cleared.`, 'success');
        setActiveModal(null);
    };

    const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsManualUploading(true);
        const newSongs: Song[] = [];
        let uploadFailedCount = 0;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
                
                // Helper to read the file buffer locally
                const fileReadPromise = () => new Promise<ArrayBuffer>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as ArrayBuffer);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsArrayBuffer(file);
                });

                let buffer: ArrayBuffer | null = null;
                let parsedSong: Song | null = null;

                try {
                    buffer = await fileReadPromise();
                    parsedSong = await processAudioFileBuffer(buffer, file.name, '', Date.now());
                } catch (readErr) {
                    console.error("Local file reading or metadata extraction failed", readErr);
                }

                const extractedTitle = parsedSong?.title || file.name.replace(/\.[^/.]+$/, "");
                const extractedArtist = parsedSong?.artist || "Unknown Artist";
                const extractedAlbumArt = parsedSong?.albumArtUrl || getPremiumGradientCover(extractedTitle, extractedArtist);
                
                try {
                    // Try to upload to Cloudinary (online sync)
                    const uploadResult = await uploadToCloudinary(file);
                    
                    const songId = `cloud-${Date.now()}-${i}`;
                    const newSong: Song = {
                        id: songId,
                        title: extractedTitle,
                        artist: extractedArtist,
                        url: uploadResult.secure_url,
                        duration: uploadResult.duration || parsedSong?.duration || 0,
                        albumArtUrl: extractedAlbumArt,
                        dateAdded: Date.now(),
                        source: 'Cloudinary',
                    };
                    newSongs.push(newSong);

                    // Sync to Firestore if logged in
                    if (auth.currentUser) {
                        const songRef = doc(db, 'songs', songId);
                        await setDoc(songRef, { ...newSong, userId: auth.currentUser.uid });
                    }
                } catch (cloudinaryError) {
                    console.warn("Cloudinary upload failed, falling back to local file parsing:", cloudinaryError);
                    // Fallback to offline IndexedDB
                    if (parsedSong) {
                        newSongs.push(parsedSong);
                    } else if (buffer) {
                        const song = await processAudioFileBuffer(buffer, file.name, '', Date.now());
                        if (song) {
                            newSongs.push(song);
                        } else {
                            uploadFailedCount++;
                        }
                    } else {
                        uploadFailedCount++;
                    }
                }
            }
            
            if (newSongs.length > 0) {
                await addOrUpdateSongs(newSongs);
                setLibrarySongs(prev => [...newSongs, ...prev]);
                updateProfile(p => {
                    if (!p) return p;
                    const updatedProfile = { 
                        ...p, 
                        analytics: { 
                            ...p.analytics, 
                            songsUploaded: (p.analytics.songsUploaded || 0) + newSongs.length 
                        } 
                    };
                    return addXpClientSide(
                        updatedProfile,
                        20 * newSongs.length,
                        `Uploaded ${newSongs.length} local songs`,
                        (newLvl, rewards) => {
                            const rankTitle = getTitleForLevel(newLvl);
                            setLevelUpData({ level: newLvl, title: rankTitle, rewards });
                            if (p.settings.notificationsEnabled) {
                                playAchievementSound();
                            }
                            const cleanTitle = rankTitle.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
                            queueSpeech(`Congratulations! You leveled up to level ${newLvl}. You are now a ${cleanTitle}! Keep the music playing!`, 'achievement');
                        }
                    );
                });
                
                if (uploadFailedCount === 0) {
                    showNotification(`Successfully imported ${newSongs.length} song(s) to Library!`, 'success');
                } else {
                    showNotification(`Imported ${newSongs.length} song(s) locally. ${uploadFailedCount} file(s) failed.`, 'info');
                }
            } else {
                showNotification("Failed to upload/import selected files.", "error");
            }
            
        } catch (error) {
            console.error("Upload process failed", error);
            showNotification("Some files failed to upload. Please try again.", "error");
        } finally {
            setIsManualUploading(false);
            setUploadProgress(null);
            if (e.target) e.target.value = '';
        }
    };

  // Expose play controls and states globally for prop-less screens like SimpleMode
  useEffect(() => {
    (window as any).mwijayControls = {
      playNext: handleNext,
      playPrev: handlePrev,
      togglePlay: handleTogglePlay,
      toggleFavorite: () => handleToggleFavorite(nowPlaying?.id),
      exitSimpleMode: () => updateProfile(p => ({...p, settings: {...p.settings, simpleMode: {...p.settings.simpleMode, enabled: false}}})),
      nowPlaying,
      isPlaying,
      profile,
      updateProfile,
    };
    window.dispatchEvent(new CustomEvent('mwijay-audio-state'));
  }, [handleNext, handlePrev, handleTogglePlay, handleToggleFavorite, nowPlaying, isPlaying, profile, updateProfile]);

    if (isLoaded && !profile) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--bg-color)] text-[var(--text-primary)] p-6 text-center z-[100]">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Initialization Error</h2>
                <p className="text-[var(--text-secondary)] mb-6">We encountered an issue loading your profile. Please try reloading.</p>
                <button onClick={() => window.location.reload()} className="bg-[var(--primary-accent)] text-black font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform">
                    Reload App
                </button>
            </div>
        );
    }

    if (!isLoaded || !profile) {
        return <MultiStepLoader loading={!isLoaded} loadingStates={loadingStates} />;
    }

    const currentView = () => {
        const transition = getTransitionForView(activeView);
        const animationProps = {
            initial: transition.initial,
            animate: "in",
            exit: transition.out,
            variants: { in: transition.in, out: transition.out },
            transition: pageTransitionConfig,
        };

        switch (activeView) {
            case 'Create': return <motion.div key="create" {...animationProps} className="w-full h-full"><CreateView librarySongs={librarySongs} showNotification={showNotification} onGenerate={() => checkAchievements(profile, 'ai-art-director', 1)} profile={profile} onSongUpdate={handleUpdateSong} nowPlaying={nowPlaying} /></motion.div>;
            case 'Explore': return <motion.div key="explore" {...animationProps} className="w-full h-full"><OnlineDiscoveryView profile={profile} librarySongs={librarySongs} onPlaySong={handlePlaySong} onAddSongs={handleAddSongs} showNotification={showNotification} onNavigate={handleNavigate} onPlayAiPlaylist={handlePlayAiPlaylist} isGeneratingAiPlaylist={isGeneratingAiPlaylist} initialSearchQuery={initialSearchQuery} onClearInitialSearch={() => setInitialSearchQuery('')} onOpenSongDetails={setSongForDetails} nowPlaying={nowPlaying} isPlaying={isPlaying} onPlayRadioStation={handlePlayRadioStation} onOpenLyrics={handleOpenLyrics} /></motion.div>;
            case 'Library': {
                const recentlyPlayedSongs = profile.recentlyPlayed.map(id => librarySongs.find(s => s.id === id)).filter(Boolean) as Song[];
                const mostPlayedSongs = profile.analytics.topSongs.map(ts => librarySongs.find(s => s.id === ts.id)).filter(Boolean) as Song[];
                return (
                    <motion.div key="library" {...animationProps} className="w-full h-full">
                        <LibraryView 
                            songs={librarySongs} 
                            playlists={playlists} 
                            recentlyPlayedSongs={recentlyPlayedSongs}
                            mostPlayedSongs={mostPlayedSongs}
                            videos={videos}
                            onPlayVideo={(videoId) => {
                                setInitialReelId(videoId);
                                handleNavigate('Reels');
                            }}
                            onPlaySong={handlePlaySong} 
                            onAddToQueue={handleAddToQueue} 
                            onCreatePlaylist={() => setActiveModal('createPlaylist')} 
                            onViewPlaylist={(id) => { setPlaylistToView(playlists.find(p => p.id === id) || null); handleNavigate('Playlist'); }} 
                            onOpenSongDetails={setSongForDetails} 
                            onViewArtist={(name) => { setArtistToView(name); handleNavigate('Artist');}} 
                            recentlyAddedSongId={null} 
                            onScanDevice={handleScanForMedia} 
                            onScanFolder={handleScanFolder} 
                            onAddSongs={() => document.getElementById('manual-upload-input')?.click()}
                            onNavigate={handleNavigate}
                            onOpenMusicQuiz={() => handleNavigate('MusicQuiz')}
                            nowPlaying={nowPlaying} 
                            isPlaying={isPlaying} 
                            onDeletePlaylist={(id) => {const newPlaylists = playlists.filter(pl => pl.id !== id); setPlaylists(newPlaylists); savePlaylists(newPlaylists); handleBack();}} 
                            onOpenLyrics={handleOpenLyrics} 
                        />
                    </motion.div>
                );
            }            case 'Reels': return <motion.div key="reels" {...animationProps} className="w-full h-full"><ReelsView videos={videos} reelPlaylists={reelPlaylists} onUpdate={(updater) => setVideos(updater)} onUpdateReelPlaylists={(p) => { setReelPlaylists(p); saveReelPlaylists(p); }} onReelActiveChange={handleReelActiveChange} showNotification={showNotification} profile={profile} onUpdateProfile={updateProfile} onPlayReelAsAudio={handlePlayReelAsAudio} nowPlaying={nowPlaying} onOpenAssistant={handleOpenAssistant} isAssistantOnline={isOnline} onViewReelPlaylist={(id) => { setReelPlaylistToView(reelPlaylists.find(p=>p.id === id) || null); handleNavigate('ReelPlaylist'); }} initialVideoId={initialReelId} onScanDevice={handleScanForMedia} onUploadProgress={() => {}} onToggleReelsUiVisibility={handleToggleReelsUiVisibility} isBottomNavHidden={isBottomNavHidden} /></motion.div>;
            case 'Settings': return <motion.div key="settings" {...animationProps} className="w-full h-full"><SettingsView profile={profile} onUpdateProfile={updateProfile} onNavigate={handleNavigate} showNotification={showNotification} handleManualFileUploads={handleManualFileUploads} onRequestPermission={handleRequestPermission} librarySongs={librarySongs} playlists={playlists} onOpenSongDetails={setSongForDetails} onOpenClearDataModal={handleOpenClearDataModal} onFullRestore={handleFullRestore} /></motion.div>;
            case 'Profile': return <motion.div key="profile" {...animationProps} className="w-full h-full"><ProfileView profile={profile} onUpdateProfile={updateProfile} onOpenAppearance={() => handleNavigate('Appearance')} onBack={handleBack} onNavigate={handleNavigate} onOpenCameraModal={() => setIsCameraModalOpen(true)} onOpenEmojiPicker={() => setActiveModal('emojiPicker')} /></motion.div>;
            case 'History': return <motion.div key="history" {...animationProps} className="w-full h-full"><HistoryPage onBack={handleBack} onPlaySong={handlePlaySong} showNotification={showNotification} /></motion.div>;
            case 'Appearance': return <motion.div key="appearance" {...animationProps} className="w-full h-full"><CustomizeAppearanceView profile={profile} onClose={handleBack} onUpdateProfile={updateProfile} showNotification={showNotification} /></motion.div>;
            case 'Artist': return artistToView ? <motion.div key="artist" {...animationProps} className="w-full h-full"><ArtistView artistName={artistToView} allSongs={librarySongs} onPlaySong={handlePlaySong} onBack={handleBack} onSaveArtist={(artist) => { saveArtist(artist); updateProfile(p => ({...p, usedFeatures: {...p.usedFeatures, biographer: true}})); }} onAddSongs={handleAddSongs} showNotification={showNotification} nowPlaying={nowPlaying} apiKey={profile.apiKey} onOpenLyrics={handleOpenLyrics} /></motion.div> : null;
            case 'Playlist': return playlistToView ? <motion.div key="playlist" {...animationProps} className="w-full h-full"><PlaylistView playlist={playlistToView} allSongs={librarySongs} onPlaySong={handlePlaySong} onBack={handleBack} onUpdatePlaylist={(p) => { const newPlaylists = playlists.map(pl => pl.id === p.id ? p : pl); setPlaylists(newPlaylists); savePlaylists(newPlaylists); setPlaylistToView(p);}} onDeletePlaylist={(id) => { const newPlaylists = playlists.filter(pl => pl.id !== id); setPlaylists(newPlaylists); savePlaylists(newPlaylists); handleBack(); }} nowPlaying={nowPlaying} isPlaying={isPlaying} onOpenLyrics={handleOpenLyrics} onOpenSongDetails={setSongForDetails} onAddToQueue={handleAddToQueue} onViewArtist={(name) => { setArtistToView(name); handleNavigate('Artist'); }} activeModal={activeModal} setActiveModal={setActiveModal} /></motion.div> : null;
            case 'ReelPlaylist': return reelPlaylistToView ? <motion.div key="reelplaylist" {...animationProps} className="w-full h-full"><ReelPlaylistView playlist={reelPlaylistToView} allVideos={videos} onPlayReel={(id) => { setInitialReelId(id); handleNavigate('Reels'); }} onBack={handleBack} onUpdatePlaylist={(p) => {const newPlaylists = reelPlaylists.map(pl=>pl.id===p.id?p:pl); setReelPlaylists(newPlaylists); saveReelPlaylists(newPlaylists); setReelPlaylistToView(p);}} onDeletePlaylist={(id) => {const newPlaylists = reelPlaylists.filter(pl=>pl.id !== id); setReelPlaylists(newPlaylists); saveReelPlaylists(newPlaylists); handleBack();}} /></motion.div> : null;
            case 'Radio': return <motion.div key="radio" {...animationProps} className="w-full h-full"><RadioView profile={profile} onPlayStation={handlePlayRadioStation} favoriteStations={profile.favoriteRadioStations || []} onToggleFavorite={(station) => updateProfile(p => ({...p, favoriteRadioStations: (p.favoriteRadioStations || []).some(s=>s.stationuuid===station.stationuuid) ? (p.favoriteRadioStations || []).filter(s=>s.stationuuid!==station.stationuuid) : [...(p.favoriteRadioStations || []), station]}))} radioPlaylists={radioPlaylists} onUpdateRadioPlaylists={(p) => {setRadioPlaylists(p); saveRadioPlaylists(p);}} onNavigate={handleNavigate} showNotification={showNotification} /></motion.div>;
            case 'Help': return <motion.div key="help" {...animationProps} className="w-full h-full"><HelpView onBack={handleBack} profile={profile} onQueueSpeech={queueSpeech} isTtsSpeaking={isTtsSpeaking} /></motion.div>;
            case 'AssistantSettings': return <motion.div key="assistantsettings" {...animationProps} className="w-full h-full"><AssistantSettingsView profile={profile} onUpdateProfile={updateProfile} onBack={handleBack} /></motion.div>;
            case 'Analytics': return <motion.div key="analytics" {...animationProps} className="w-full h-full"><AnalyticsView profile={profile} onBack={handleBack} /></motion.div>;
            case 'ManageRadioHub': return <motion.div key="manageradio" {...animationProps} className="w-full h-full"><ManageRadioHubView profile={profile} onUpdateProfile={updateProfile} onBack={handleBack} /></motion.div>;
            case 'SimpleModeSettings': return <motion.div key="simplemodesettings" {...animationProps} className="w-full h-full"><SimpleModeSettingsView profile={profile} onUpdateProfile={updateProfile} onBack={handleBack} onAddWisdom={() => setActiveModal('addWisdom')} /></motion.div>;
            case 'MyContent': return <motion.div key="mycontent" {...animationProps} className="w-full h-full"><MyContentView onBack={handleBack} librarySongs={librarySongs} onOpenSongDetails={setSongForDetails} onOpenLyrics={handleOpenLyrics} /></motion.div>;
            case 'MusicQuiz': return <motion.div key="musicquiz" {...animationProps} className="w-full h-full"><MusicQuizView librarySongs={librarySongs} onBack={handleBack} profile={profile} onAddXp={addXp} /></motion.div>;
            case 'PartyMode': return <motion.div key="partymode" {...animationProps} className="w-full h-full"><PartyModeView 
                onBack={handleBack} 
                onAddToQueue={handleAddToQueue} 
                librarySongs={librarySongs} 
                onNext={handleNext} 
                onPrev={handlePrev} 
                onTogglePlay={handleTogglePlay}
                isPlaying={isPlaying}
                nowPlaying={nowPlaying}
                onToggleFavorite={() => handleToggleFavorite(nowPlaying?.id)}
                onToggleShuffle={handleToggleShuffle}
                onCycleRepeat={handleCycleRepeat}
                isShuffled={isShuffled}
                repeatMode={repeatMode}
            /></motion.div>;
            case 'Admin': return currentUser?.email === 'davidbyanmwijage@gmail.com' ? <motion.div key="admin" {...animationProps} className="w-full h-full"><AdminView onBack={handleBack} profile={profile} librarySongs={librarySongs} playlists={playlists} showNotification={showNotification} /></motion.div> : null;
            case 'ZenMode': return <motion.div key="zenmode" {...animationProps} className="w-full h-full"><ZenModeScreen onBack={handleBack} userTracks={librarySongs} onAddTracks={handleAddSongs} onPlayTrack={(track) => handlePlaySong(track, librarySongs)} /></motion.div>;
            default: 
                if (profile.settings.simpleMode.enabled) {
                    return (
                        <motion.div key="simple-home" {...animationProps} className="w-full h-full">
                            <SimpleMode />
                        </motion.div>
                    );
                }
                return <motion.div key="home" {...animationProps} className="w-full h-full"><HomeView profile={profile} librarySongs={librarySongs} onNavigate={handleNavigate} onPlaySong={handlePlaySong} onOpenAssistant={handleOpenAssistant} onToggleTheme={handleToggleTheme} onOpenAddMoodModal={() => setActiveModal('addMood')} isAssistantOpening={isAssistantOpening} onStartDjSession={handleStartDjSession} isDjSessionStarting={isDjSessionStarting} /></motion.div>;
        }
    };
  
    if (authLoading || !profile) {
      return (
        <div className="fixed inset-0 z-[999] bg-[#0d0d0d] flex flex-col items-center justify-center text-white">
          <Loader2 className="animate-spin text-[var(--primary-accent)]" size={36} />
          <p className="mt-4 text-sm text-neutral-400 font-bold uppercase tracking-widest animate-pulse">Loading...</p>
        </div>
      );
    }

    if (!user && !isGuest) {
      return (
        <>
          <FluidBackground />
          <AuthModal 
            onClose={() => {}} 
            showNotification={showNotification} 
            required={true}
          />
        </>
      );
    }

    return (
    <>
      <audio ref={audioRef} crossOrigin="anonymous" />
      <input 
        id="manual-upload-input"
        type="file" 
        multiple 
        accept="audio/*" 
        className="hidden" 
        onChange={handleManualUpload}
      />
      
      <NavigationCountdown target={navCountdown?.target || ''} seconds={navCountdown?.seconds || null} />
      
      {/* Background System */}
      <FluidBackground />
      {profile && <BackgroundEffects settings={profile.settings.backgroundEffects} />}

      {ttsType !== 'greeting' && (
          <TtsOverlay 
              isSpeaking={isTtsSpeaking}
              isPaused={isTtsPaused}
              onPause={pauseTts}
              onResume={resumeTts}
              onStop={stopTts}
          />
      )}

      {profile && <BriefWelcome profile={profile} isVisible={showBriefWelcome} onDismiss={() => setShowBriefWelcome(false)} />}
      
      <AnimatePresence>
        {!profile.onboarded && (
            <motion.div
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <Onboarding 
                    onComplete={handleOnboardComplete} 
                    onOpenEmojiPicker={() => setActiveModal('emojiPicker')} 
                    avatarUrl={profile.avatarUrl}
                    onAvatarChange={(url) => {
                        updateProfile(p => p ? { ...p, avatarUrl: url } : p);
                    }}
                    themeMode={profile.themeMode}
                    onToggleTheme={handleToggleTheme}
                />
            </motion.div>
        )}
       </AnimatePresence>
      
      {profile.onboarded && (
        <div className="flex h-full w-full overflow-hidden">
            <Nerve 
                items={(() => {
                    const base = navItems.filter(item => (profile.settings.visibleNavItems || ['Home', 'Explore', 'Create', 'Library', 'Reels', 'Settings']).includes(item.name));
                    if (currentUser?.email === 'davidbyanmwijage@gmail.com' && !base.some(b => b.name === 'Admin')) {
                        base.push({ name: 'Admin', icon: 'ShieldAlert' });
                    }
                    return base;
                })()} 
                activeItem={activeView} 
                onItemClick={handleNavigate} 
                isHidden={isBottomNavHidden || !profile.settings.showNavigationBar || isPlayerOverlayVisible || activeView === 'ZenMode' || activeView === 'PartyMode' || keyboard.isOpen} 
                profile={profile}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
            />
            <div className="flex-1 relative h-full overflow-hidden">
                <AnimatePresence mode="wait">{currentView()}</AnimatePresence>
                
                <AnimatePresence>
                    {!isMiniPlayerHidden && nowPlaying && !isPlayerOverlayVisible && !profile.settings.simpleMode.enabled && activeView !== 'PartyMode' && activeView !== 'ZenMode' && !keyboard.isOpen && (
                        <MiniPlayer 
                            song={nowPlaying} 
                            isPlaying={isPlaying} 
                            progress={progress} 
                            duration={duration} 
                            onTogglePlay={handleTogglePlay} 
                            onShowPlayer={() => setIsPlayerOverlayVisible(true)} 
                            onToggleFavorite={() => handleToggleFavorite(nowPlaying.id)} 
                            onNext={handleNext} 
                            isFooterHidden={isBottomNavHidden || !profile.settings.showNavigationBar || isPlayerOverlayVisible || activeView === 'ZenMode' || activeView === 'PartyMode'}
                            onToggleFooter={() => setIsBottomNavHidden(prev => !prev)}
                            profile={profile}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
      )}

      {/* Modals and Overlays */}
      <AnimatePresence>
          {isPlayerOverlayVisible && nowPlaying && (
              <PlayerOverlay 
                  isVisible={isPlayerOverlayVisible} 
                  song={nowPlaying}
                  isPlaying={isPlaying} 
                  progress={progress}
                  duration={duration}
                  currentSessionRadioTime={currentSessionRadioTime} 
                  onClose={() => setIsPlayerOverlayVisible(false)}
                  onTogglePlay={handleTogglePlay}
                  onNext={handleNext} 
                  onPrev={handlePrev}
                  onSeek={(e) => { const newTime = parseFloat(e.target.value); if(audioRef.current) audioRef.current.currentTime = newTime; setProgress(newTime); }}
                  onSeekStart={() => { setIsSeeking(true); setIsSongLoading(true); }}
                  onSeekEnd={() => { setIsSeeking(false); setIsSongLoading(false); }}
                  onSeekBy={handleSeekBy}
                  onToggleFavorite={handleToggleFavorite}
                  playQueue={playQueue}
                  currentQueueIndex={currentQueueIndex}
                  setPlayQueue={setPlayQueue}
                  onPlayFromQueue={(song) => handlePlaySong(song, playQueue)}
                  repeatMode={repeatMode}
                  isShuffled={isShuffled}
                  onCycleRepeat={handleCycleRepeat}
                  onToggleShuffle={handleToggleShuffle}
                  onSetSleepTimer={handleSetSleepTimer}
                  sleepTimer={sleepTimer}
                  profile={profile}
                  onUpdateProfile={updateProfile}
                  onToggleLyrics={handleToggleLyrics}
                  onOpenMoodModal={() => setActiveModal('mood')}
                  onOpenEqualizer={() => setActiveModal('equalizer')}
                  isLyricsVisible={isLyricsVisible}
                  isLyricsMinimized={isLyricsMinimized}
                  favoriteStations={profile.favoriteRadioStations || []}
                  onToggleFavoriteStation={(station) => updateProfile(p => ({...p, favoriteRadioStations: (p.favoriteRadioStations || []).some(s=>s.stationuuid===station.stationuuid) ? (p.favoriteRadioStations || []).filter(s=>s.stationuuid!==station.stationuuid) : [...(p.favoriteRadioStations || []), station]}))}
                  isQueueFlashing={isQueueFlashing}
                  onExitSimpleMode={() => updateProfile(p => ({...p, settings: {...p.settings, simpleMode: {...p.settings.simpleMode, enabled: false}}}))}
                  visualizerColor={dominantColor}
                  playHapticImpact={playHapticImpact}
                  onToggleTranscription={() => setIsTranscriptionVisible(v => !v)}
                  isTranscriptionVisible={isTranscriptionVisible}
                  onSaveRadioNotes={handleSaveRadioNotes}
                  onSaveNotes={handleSaveNotes}
                  isSongLoading={isSongLoading}
                  audioFx={audioFx}
                  isDjSessionActive={isDjSessionActive}
                  isTtsSpeaking={isTtsSpeaking}
                  audioRef={audioRef}
                  showNotification={showNotification}
              />
          )}
      </AnimatePresence>
       <AnimatePresence>
          {isAssistantVisible && (
              assistantView === 'chat' ? (
                  <AssistantView
                      messages={messages}
                      onSendMessage={sendMessage}
                      onClose={handleCloseAssistant}
                      showNotification={showNotification}
                      isOnline={isOnline}
                      toggleOnlineMode={toggleOnlineMode}
                      onShowHistory={() => setAssistantView('history')}
                      isTtsSpeaking={isTtsSpeaking}
                  />
              ) : (
                  <ChatHistoryView
                      onLoadChat={handleLoadChat}
                      onBack={() => setAssistantView('chat')}
                  />
              )
          )}
      </AnimatePresence>
      <AnimatePresence>
          {notification && <AppNotification message={notification.message} type={notification.type} icon={notification.icon} />}
      </AnimatePresence>
      {isTutorialModalOpen && <TutorialModal userName={profile.name} onYes={() => {setIsTutorialModalOpen(false); handleNavigate('Help');}} onNo={() => setIsTutorialModalOpen(false)} showCelebration={showWelcomeCelebration} />}
      
      {activeModal === 'createPlaylist' && <CreatePlaylistModal profile={profile} onUpdateProfile={updateProfile} songs={librarySongs} onSave={(p) => { const newPlaylists = [...playlists, p]; setPlaylists(newPlaylists); savePlaylists(newPlaylists); setActiveModal(null); showNotification(`Playlist "${p.name}" created!`, 'success'); addXp(30, "Created a playlist"); }} onClose={() => setActiveModal(null)} showNotification={showNotification} />}
      {activeModal === 'mood' && nowPlaying && <MoodEmojiModal song={nowPlaying} onClose={() => setActiveModal(null)} onSetMood={(id, emoji) => { const song = librarySongs.find(s=>s.id===id); if(song) handleUpdateSong({...song, moodEmoji: emoji}); else if(nowPlaying) setNowPlaying({...nowPlaying, moodEmoji: emoji}); }} onAddMood={() => setActiveModal('addMood')} allMoods={[...defaultMoods, ...(profile.customMoods || [])]} showNotification={showNotification} />}
      {activeModal === 'addMood' && <AddMoodModal onClose={() => setActiveModal(null)} onSave={(mood) => { updateProfile(p => ({...p, customMoods: [...(p.customMoods || []), { ...mood, themeColor: '#8B5CF6' }]})); addXp(20, "Added custom mood"); }} showNotification={showNotification} />}
      {activeModal === 'addWisdom' && <AddWisdomModal onClose={() => setActiveModal(null)} onSave={(wisdom) => { updateProfile(p => ({...p, customWisdom: [...(p.customWisdom || []), wisdom]})); addXp(20, "Added custom wisdom"); }} showNotification={showNotification} />}
      {activeModal === 'equalizer' && nowPlaying && <EqualizerModal profile={profile} song={nowPlaying} onClose={() => setActiveModal(null)} onUpdateProfile={updateProfile} onUpdateSong={handleUpdateSong} showNotification={showNotification} />}
      {activeModal === 'clearData' && <ClearDataModal onClose={() => setActiveModal(null)} onClearSongs={handleClearSongs} onClearLyrics={() => handleClearContent('lyrics')} onClearNotes={() => handleClearContent('notes')} />}
      {isLyricsVisible && nowPlaying && <LyricsView song={nowPlaying} profile={profile} onClose={() => handleToggleLyrics('closed')} onMinimize={() => handleToggleLyrics('minimized')} onUpdateSong={handleUpdateSong} onUpdateProfile={updateProfile} progress={progress} duration={duration} isPlaying={isPlaying} onSaveNotes={handleSaveNotes} onSaveRadioNotes={handleSaveRadioNotes} isLive={nowPlaying.duration === Infinity} audioRef={audioRef} showNotification={showNotification} />}
      <div className="fixed top-0 left-0 right-0 z-[500] flex justify-center">
        <AnimatePresence>
            {uploadProgress && <UploadToast progress={uploadProgress} onDismiss={() => setUploadProgress(null)} />}
        </AnimatePresence>
      </div>
      {isCameraModalOpen && <CameraCaptureModal onCapture={(dataUrl) => { updateProfile(p => ({...p, avatarUrl: dataUrl})); setIsCameraModalOpen(false); }} onClose={() => setIsCameraModalOpen(false)} />}
      <AnimatePresence>{achievementToast && <AchievementUnlockedToast achievement={achievementToast} />}</AnimatePresence>
      <AnimatePresence>
          {levelUpData && (
              <LevelUpToast 
                  level={levelUpData.level} 
                  title={levelUpData.title} 
                  rewards={levelUpData.rewards} 
                  onClose={() => setLevelUpData(null)} 
              />
          )}
      </AnimatePresence>
      {songForDetails && <SongDetailsModal song={songForDetails} onClose={() => setSongForDetails(null)} onSave={(song) => {handleUpdateSong(song); updateProfile(p => ({...p, analytics: {...p.analytics, songsEdited: (p.analytics.songsEdited || 0) + 1}}));}} profile={profile} onViewArtist={(name) => { setSongForDetails(null); setArtistToView(name); handleNavigate('Artist');}} onPlayNow={() => {handlePlaySong(songForDetails, librarySongs); setSongForDetails(null);}} onAddToQueue={() => {handleAddToQueue(songForDetails); setSongForDetails(null);}} onDelete={() => {performSongDeletion(songForDetails.id); setSongForDetails(null);}} onDownloadFile={() => handleDownloadOnlineSong(songForDetails)} isOnlineSong={!librarySongs.some(s => s.id === songForDetails.id) && !songForDetails.audioData} onOpenRingtoneMaker={() => {setModalData(songForDetails); setActiveModal('ringtoneMaker'); setSongForDetails(null);}} onSharePreview={() => {setModalData(songForDetails); setActiveModal('sharePreview'); setSongForDetails(null);}} onGenerateAiCover={handleGenerateAiCover} showNotification={showNotification} />}
      {activeModal === 'exitConfirm' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
              <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="liquid-glass-pane glare-effect rounded-3xl p-6 w-full max-w-sm border border-white/10 text-center text-white"
                  onClick={e => e.stopPropagation()}
              >
                  <h3 className="text-xl font-black mb-2">Exit Mwijay Music?</h3>
                  <p className="text-sm text-neutral-400 mb-6">Are you sure you want to exit the app?</p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setActiveModal(null)} 
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 rounded-xl transition-all"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={() => CapacitorApp.exitApp()} 
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all"
                      >
                          Exit App
                      </button>
                  </div>
              </motion.div>
          </div>
      )}
      {activeModal === 'ringtoneMaker' && modalData && <RingtoneMakerModal song={modalData} onClose={() => setActiveModal(null)} showNotification={showNotification} />}
      {activeModal === 'sharePreview' && modalData && (
        <ShareablePreviewModal 
          song={modalData} 
          onClose={() => setActiveModal(null)} 
          showNotification={showNotification} 
          userAvatar={profile?.avatarUrl || undefined}
          userName={profile?.name || undefined}
        />
      )}
      {activeModal === 'emojiPicker' && <EmojiPickerModal profile={profile} onUpdateProfile={updateProfile} onSelect={handleEmojiSelect} onClose={() => setActiveModal(null)} />}
      {isNeonGlowModalOpen && <NeonGlowModal onClose={() => setIsNeonGlowModalOpen(false)} profile={profile} onUpdateProfile={updateProfile} />}
      {activeModal === 'auth' && <AuthModal onClose={() => setActiveModal(null)} showNotification={showNotification} />}
      <GuestModeBanner onTriggerAuth={() => setActiveModal('auth')} />
    </>
  );
};

export default App;
