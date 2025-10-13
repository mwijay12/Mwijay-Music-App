// FIX: Added missing type definitions for Song, Playlist, Video, and many others.
export interface Song {
    id: string;
    url?: string;
    title: string;
    artist: string;
    albumArtUrl: string;
    duration?: number;
    isFavorite?: boolean;
    audioData?: ArrayBuffer;
    mimeType?: string;
    dateAdded?: number;
    queueId?: string; // for queue management
    streamTitle?: string; // for radio streams
    moodEmoji?: string;
    isFromReel?: boolean;
    source?: string; // e.g., Jamendo, Audius
    lyrics?: string;
    bpm?: number;
}

export interface Playlist {
    id: string;
    name: string;
    coverImage: string;
    songIds: string[];
}

export interface Comment {
    id: string;
    userName: string;
    userAvatar: string;
    text: string;
    timestamp: number;
    isEditing?: boolean;
}

export interface Video {
    id: string;
    url?: string;
    title: string;
    uploader?: string;
    isFavorite: boolean;
    videoData?: ArrayBuffer;
    thumbnailUrl?: string;
    comments?: Comment[];
}

export interface ReelPlaylist {
    id: string;
    name: string;
    coverImage: string;
    videoIds: string[];
}

export interface RadioStation {
    stationuuid: string;
    name: string;
    url_resolved: string;
    favicon: string;
    country: string;
    countrycode: string;
    bitrate: number;
}

export interface RadioPlaylist {
    id: string;
    name: string;
    stationIds: string[];
}

export interface RadioCategory {
    name: string;
    image: string;
    type: 'genre' | 'region';
}

export interface ThemeColors {
    [key: string]: string;
}

export interface ThemePair {
    name: string;
    category: string;
    light: ThemeColors;
    dark: ThemeColors;
}

export interface Font {
    name: string;
    family: string;
    category: string;
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'assistant' | 'loading';
    text: string;
    file?: {
        data: string;
        mimeType: string;
    };
}

export interface Artist {
    name: string;
    avatarUrl: string;
    bannerUrl: string;
    bio: string;
}

export interface MusicianToolsState {
    tempo: number;
    metronome: {
        isPlaying: boolean;
        bpm: number;
    };
    loopA: { time: number; active: boolean };
    loopB: { time: number; active: boolean };
}

export interface Notification {
    id: number;
    message: string;
    type: 'success' | 'info' | 'error';
    icon?: string;
}


// FIX: Added missing User interface
export interface User {
    name: string;
    avatarUrl: string;
}

export type NameplateAnimationStyle = 'none' | 'typewriter' | 'glitch' | 'fade-in' | 'neon-glow' | 'slide-in-left' | 'slide-up' | 'zoom-in' | 'bounce-in' | 'pulse' | 'wavy' | 'shadow-pop' | 'blur-in' | 'flip-in-x' | 'rotate-in' | 'color-cycle';

export interface NameplateAnimation {
    id: NameplateAnimationStyle;
    name: string;
}

export interface Reminder {
    id: number;
    time: number;
    text: string;
    timeoutId: number | null;
}

export type LyricsAnimation = 'scroll' | 'typewriter' | 'fade-in' | 'karaoke';

// FIX: Expanded ProfileData to include all missing properties used throughout the app.
export interface ProfileData {
    name: string;
    avatarUrl: string;
    onboarded: boolean;
    settings: {
        // FIX: Changed simpleMode to be an object to match its usage across components.
        simpleMode: {
            enabled: boolean;
            style: 'rotate' | 'static';
        };
        aiDjMode: boolean;
        crossfadeDuration: number;
        gapless: boolean;
        volumeNormalization: boolean;
        reelsAutoScrollLoops: number;
        dynamicThemeEnabled: boolean;
        backgroundEffects: {
            enabled: boolean;
            style: 'none' | 'constellationDrift' | 'spiritRise' | 'warpPulse' | 'fallingNotes' | 'cosmicDust' | 'fireflies' | 'bubbles' | 'hexPulse' | 'stardust' | 'energyFlow' | 'polygons';
        };
        neonGlow: {
            enabled: boolean;
            style: 'wave' | 'rotate' | 'flame';
            speed: number; // e.g., 1 to 10
        };
        visualizerSettings: {
            type: string;
            spinSpeed: number;
            albumArtShape: 'square' | 'circle';
            albumArtSize: number;
            useAlbumArtColor: boolean;
        };
        lyricsSettings: {
            fontSize: number;
            fontFamily: string;
            animation: LyricsAnimation;
            animationSpeed: number; // 0.5 (slow) to 20 (fast)
        };
        // Consolidated Audio FX
        equalizer: {
            bands: number[]; // 5 bands, gains from -12 to 12 dB
            preamp: number;
        };
        maximizer: {
            bassBoost: number; // gain in dB
            volume: number; // 0 to 2
        };
        reverb: {
            delay: number; // in seconds
            feedback: number; // 0 to 1
        };
        creative: {
            tempo: number;
            filter: number;
        };
        metronome: {
            enabled: boolean;
            bpm: number;
            timeSignature: number;
            subdivision: number;
            soundType: string;
        };
        nameplateAnimation: NameplateAnimationStyle;
        assistantVoice: {
            enabled: boolean;
        };
    };
    analytics: {
        listenTime: number;
        radioListenTime: number;
        songsUploaded: number;
        songsPlayed: number;
        reelsWatched: number;
        songsShuffled: number;
        assistantUses: number;
        songsDownloaded: number;
        metronomeUsageTime: number;
        songsEdited: number;
        topSongs: { id: string; title: string; artist: string; albumArtUrl: string; playCount: number }[];
        topArtists: { name: string; playCount: number; albumArtUrl: string }[];
        topRadios: { stationId: string; name: string; playCount: number }[];
        weeklyActivity: number[];
    };
    unlockedAchievements: { id: string; date: number }[];
    activeThemePair: string;
    themeMode: 'light' | 'dark';
    activeFont: string;
    nameplateFont: string;
    customThemeColors: {
        primary: string;
        secondary: string;
        accent: string;
    };
    recentlyPlayed: string[];
    // --- NEW: Added properties to save last playback state ---
    lastPlayedSongId?: string;
    lastPlayedProgress?: number;
    // --- NEW: For 'Recently Played Online' feature ---
    recentlyPlayedOnline: Song[];
    recentlyPlayedRadios: RadioStation[];
    usedFeatures: {
        themes: Set<string>;
        fonts: Set<string>;
        neonStyles: Set<string>;
        nameplateAnimations: Set<string>;
        visualizers: Set<string>;
        lyricsViewed: boolean;
        backgroundEffects: Set<string>;
        eqPresets: Set<string>;
        sharedSong: boolean;
        temposChanged: Set<string>;
    };
    customMoods: { name: string; emoji: string; color: string }[];
    customWisdom: string[];
    likedWisdoms: string[];
    favoriteRadioStations: RadioStation[];
    favoriteRadioRegions: string[];
    favoriteRadioGenres: string[];
}


export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    emoji: string;
    criteria: (profile: ProfileData & { librarySongs: Song[] }, type: string, value: any) => boolean;
}