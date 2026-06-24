

export type AudioFxNodes = {
    context: AudioContext;
    preamp: GainNode;
    eqBands: BiquadFilterNode[];
    bassBoost: BiquadFilterNode;
    volume: GainNode;
    delay: DelayNode;
    feedback: GainNode;
    lpf: BiquadFilterNode;
    hpf: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    analyser: AnalyserNode;
    output: GainNode;
};

export interface PlayerOverlayProps {
    audioFx: AudioFxNodes | null;
    // ... other props
}

export interface VisualizerProps {
    audioFx: AudioFxNodes | null;
    // ... other props
}


export interface TranscriptionResponse {
    segments: {
        timestamp: string;
        content: string;
    }[];
    repurposedContent?: {
        moodColor: string;
        summary: string;
        vibe: string;
    };
}

export interface Song {
    id: string;
    url?: string;
    nativeUrl?: string; // Path for files stored on device
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
    transcription?: TranscriptionResponse;
    notes?: string;
    bpm?: number;
    suggestedCoverArt?: string; // For AI-generated cover art
    mood?: string;
}

export interface Playlist {
    id: string;
    name: string;
    coverImage: string;
    songIds: string[];
    emoji?: string;
    bgColor?: string;
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
    nativeUrl?: string; // Path for files stored on device
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

export interface SpeedPreset {
    rate: number;
    label: string;
    emoji: string;
    shortLabel: string;
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
    effect?: string;
}

export interface Font {
    name: string;
    family: string;
    category: string;
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'assistant' | 'loading' | 'greeting';
    text: string;
    file?: {
        data: string;
        mimeType: string;
    };
    sources?: { uri: string; title: string; }[];
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
    icon?: React.ReactNode;
}


export interface User {
    name: string;
    avatarUrl: string;
}

export type NameplateAnimationStyle = 'none' | 'typewriter' | 'glitch' | 'fade-in' | 'neon-glow' | 'slide-in-left' | 'slide-up' | 'zoom-in' | 'bounce-in' | 'pulse' | 'wavy' | 'shadow-pop' | 'blur-in' | 'flip-in-x' | 'rotate-in' | 'color-cycle' | 'matrix' | 'fire' | 'disco' | 'text-rotate' | 'gradient-shift';

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

export interface ProfileData {
    name: string;
    avatarUrl: string;
    aboutMe: string;
    onboarded: boolean;
    apiKey?: string; // For user-provided Gemini API key
    customEmojis?: string[];
    country?: string;
    settings: {
        fontSizeMultiplier: number;
        greetingStyle: 'time-based' | 'welcome';
        autoplay?: boolean;
        scannerSettings: {
            minFileSizeMB: number;
            minSongDurationSeconds: number;
            excludedFolders: string[];
            backgroundScanningEnabled: boolean;
        };
        simpleMode: {
            enabled: boolean;
            style: 'rotate' | 'static';
            selectedTopics?: string[];
        };
        aiDjMode: boolean;
        transitionDuration: number;
        transitionStyle: 'none' | 'crossfade' | 'power-down' | 'the-drop' | 'stutter-out';
        gapless: boolean;
        volumeNormalization: boolean;
        notificationsEnabled: boolean;
        hapticsEnabled: boolean;
        showNavigationBar: boolean;
        showExtraControls: boolean;
        visibleNavItems: string[];
        reelsAutoScrollLoops: number;
        reelGestureMode: 'default' | 'pro';
        reelSeekDuration: 5 | 10 | 15;
        dynamicThemeEnabled: boolean;
        dynamicThemeMode: 'off' | 'cover' | 'time' | 'mood';
        visualDjMode: boolean;
        aiDjTransitions: boolean;
        dataSaverMode: boolean;
        visualizerSettings: {
            type: string;
            spinSpeed: number;
            albumArtShape: 'square' | 'circle';
            albumArtSize: number;
            useAlbumArtColor: boolean;
            beatSync: boolean;
        };
        lyricsSettings: {
            fontSize: number;
            fontFamily: string;
            animation: 'scroll' | 'typewriter' | 'fade-in' | 'karaoke' | 'slide-up' | 'blur-in';
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
        playerIdleUiEnabled: boolean;
        aiCoverArtEnabled: boolean;
        collapsedSections: { [key: string]: boolean };
        neonGlow: {
            enabled: boolean;
            style: 'wave' | 'rotate' | 'flame';
            speed: number;
        };
        backgroundEffects: {
            enabled: boolean;
            style: string;
        };
        edgeLighting: {
            enabled: boolean;
            depth: number;
            radius: number;
            speed: number;
            color1?: string;
            color2?: string;
            color3?: string;
        };
        assistant: {
            voice: string;
            audibleGreeting: boolean;
            personality: 'friendly' | 'witty' | 'professional' | 'concise';
            readResponses: boolean;
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
        bgColor: string;
        surfaceColor: string;
    };
    recentlyPlayed: string[];
    // --- NEW: For 'Recently Played Online' feature ---
    recentlyPlayedOnline: Song[];
    recentlyPlayedRadios: RadioStation[];
    usedFeatures: {
        themes: Set<string>;
        fonts: Set<string>;
        nameplateAnimations: Set<string>;
        visualizers: Set<string>;
        lyricsViewed: boolean;
        eqPresets: Set<string>;
        sharedSong: boolean;
        temposChanged: Set<string>;
        biographer: boolean;
        neonStyles: Set<string>;
        backgroundEffects: Set<string>;
    };
    customMoods: { name: string; emoji: string; color: string; themeColor: string; }[];
    customWisdom: string[];
    likedWisdoms: string[];
    favoriteRadioStations: RadioStation[];
    favoriteRadioRegions: string[];
    favoriteRadioGenres: string[];
    xp: number;
    level: number;
    streak: {
        currentStreak: number;
        longestStreak: number;
        lastListenDate: string;
        freezeCount: number;
        calendar: string[];
        dailySeconds: Record<string, number>;
    };
}


export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    emoji: string;
    xpReward?: number;
    criteria: (profile: ProfileData & { librarySongs: Song[], playlists: Playlist[] }, type: string, value: any) => boolean;
}

export interface MediaSessionActionDetails {
    action: 'play' | 'pause' | 'seekbackward' | 'seekforward' | 'previoustrack' | 'nexttrack' | 'skipad' | 'stop' | 'seekto';
    seekOffset?: number;
    seekTime?: number;
}