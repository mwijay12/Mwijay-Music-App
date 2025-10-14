
import type { Song, Playlist, ProfileData, Video, ReelPlaylist, RadioPlaylist, RadioStation, Artist, Reminder } from '../types.ts';
import { user, getRandomCoverArt } from '../constants.ts'; // For default profile

const DB_NAME = 'MwijayMusicDB';
const DB_VERSION = 20; // Incremented version for schema change
let db: IDBDatabase;

const defaultProfile: ProfileData = {
    name: user.name,
    avatarUrl: user.avatarUrl,
    onboarded: false,
    settings: {
        simpleMode: { enabled: false, style: 'rotate' },
        aiDjMode: false, crossfadeDuration: 4, gapless: true,
        volumeNormalization: false,
        reelsAutoScrollLoops: 2,
        dynamicThemeEnabled: false,
        backgroundEffects: { 
            enabled: true,
            style: 'constellationDrift',
        },
        neonGlow: {
            enabled: true,
            style: 'rotate',
            speed: 5,
        },
        visualizerSettings: { type: 'spectral', spinSpeed: 8, albumArtShape: 'circle', albumArtSize: 0.9, useAlbumArtColor: false },
        lyricsSettings: { fontSize: 20, fontFamily: 'Satoshi', animation: 'karaoke', animationSpeed: 10 },
        equalizer: { bands: [0, 0, 0, 0, 0], preamp: 1 },
        maximizer: { bassBoost: 0, volume: 1 },
        reverb: { delay: 0, feedback: 0 },
        creative: { tempo: 1, filter: 0 },
        metronome: { enabled: false, bpm: 120, timeSignature: 4, subdivision: 1, soundType: 'beep' },
        nameplateAnimation: 'fade-in',
        assistantVoice: { enabled: true },
    },
    analytics: {
        listenTime: 0,
        radioListenTime: 0,
        songsUploaded: 0, songsPlayed: 0,
        reelsWatched: 0, songsShuffled: 0, assistantUses: 0,
        songsDownloaded: 0,
        metronomeUsageTime: 0,
        songsEdited: 0,
        topSongs: [], topArtists: [], topRadios: [],
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    },
    unlockedAchievements: [],
    activeThemePair: 'Custom',
    themeMode: 'dark',
    activeFont: 'Satoshi',
    nameplateFont: 'Dancing Script',
    customThemeColors: { primary: '#C8F052', secondary: '#A050FF', accent: '#FFFFFF' },
    recentlyPlayed: [],
    recentlyPlayedOnline: [],
    recentlyPlayedRadios: [],
    usedFeatures: {
        themes: new Set(),
        fonts: new Set(),
        neonStyles: new Set(),
        nameplateAnimations: new Set(),
        visualizers: new Set(),
        lyricsViewed: false,
        backgroundEffects: new Set(),
        eqPresets: new Set(),
        sharedSong: false,
        temposChanged: new Set(),
    },
    customMoods: [],
    customWisdom: [],
    likedWisdoms: [],
    favoriteRadioStations: [],
    favoriteRadioRegions: [],
    favoriteRadioGenres: [],
};

export const initDB = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(true);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains('songs')) {
                dbInstance.createObjectStore('songs', { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains('playlists')) {
                dbInstance.createObjectStore('playlists', { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains('profile')) {
                const profileStore = dbInstance.createObjectStore('profile', { keyPath: 'id' });
                profileStore.add({ id: 'userProfile', ...defaultProfile });
            }
            if (!dbInstance.objectStoreNames.contains('videos')) {
                dbInstance.createObjectStore('videos', { keyPath: 'id' });
            }
            if (event.oldVersion < 16 && !dbInstance.objectStoreNames.contains('reelPlaylists')) {
                dbInstance.createObjectStore('reelPlaylists', { keyPath: 'id' });
            }
            if (event.oldVersion < 17 && !dbInstance.objectStoreNames.contains('playQueue')) {
                dbInstance.createObjectStore('playQueue', { keyPath: 'id' });
            }
            if (event.oldVersion < 18 && !dbInstance.objectStoreNames.contains('radioPlaylists')) {
                dbInstance.createObjectStore('radioPlaylists', { keyPath: 'id' });
            }
            if (event.oldVersion < 19 && !dbInstance.objectStoreNames.contains('artists')) {
                dbInstance.createObjectStore('artists', { keyPath: 'name' });
            }
            if (event.oldVersion < 20 && !dbInstance.objectStoreNames.contains('reminders')) {
                dbInstance.createObjectStore('reminders', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(true);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject(false);
        };
    });
};

// Generic request handler
const dbRequest = <T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = action(store);

        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
};

const dbRequestMultiple = (storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        action(store);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// --- Songs ---
export const getSongs = (): Promise<Song[]> => dbRequest<Song[]>('songs', 'readonly', store => store.getAll());
export const saveSongs = (songs: Song[]): Promise<void> => dbRequestMultiple('songs', 'readwrite', store => {
    store.clear();
    songs.forEach(song => store.put(song));
});

// --- Videos ---
export const getVideos = (): Promise<Video[]> => dbRequest<Video[]>('videos', 'readonly', store => store.getAll());
export const saveVideos = (videos: Video[]): Promise<void> => dbRequestMultiple('videos', 'readwrite', store => {
    store.clear();
    videos.forEach(video => store.put(video));
});

// --- Playlists ---
export const getPlaylists = (): Promise<Playlist[]> => dbRequest<Playlist[]>('playlists', 'readonly', store => store.getAll());
export const savePlaylists = (playlists: Playlist[]): Promise<void> => dbRequestMultiple('playlists', 'readwrite', store => {
    store.clear();
    playlists.forEach(playlist => store.put(playlist));
});

// --- Reel Playlists ---
export const getReelPlaylists = (): Promise<ReelPlaylist[]> => dbRequest<ReelPlaylist[]>('reelPlaylists', 'readonly', store => store.getAll());
export const saveReelPlaylists = (playlists: ReelPlaylist[]): Promise<void> => dbRequestMultiple('reelPlaylists', 'readwrite', store => {
    store.clear();
    playlists.forEach(playlist => store.put(playlist));
});

// --- Radio Playlists ---
export const getRadioPlaylists = (): Promise<RadioPlaylist[]> => dbRequest<RadioPlaylist[]>('radioPlaylists', 'readonly', store => store.getAll());
export const saveRadioPlaylists = (playlists: RadioPlaylist[]): Promise<void> => dbRequestMultiple('radioPlaylists', 'readwrite', store => {
    store.clear();
    playlists.forEach(playlist => store.put(playlist));
});

// --- Profile ---
export const getProfile = async (): Promise<ProfileData> => {
    const profile = await dbRequest<ProfileData | undefined>('profile', 'readonly', store => store.get('userProfile'));
    if (profile) {
        // Sets are not stored in IndexedDB, so we need to reconstruct them
        const features = profile.usedFeatures || {};
        profile.usedFeatures = {
            themes: new Set(Array.isArray(features.themes) ? features.themes : []),
            fonts: new Set(Array.isArray(features.fonts) ? features.fonts : []),
            neonStyles: new Set(Array.isArray(features.neonStyles) ? features.neonStyles : []),
            nameplateAnimations: new Set(Array.isArray(features.nameplateAnimations) ? features.nameplateAnimations : []),
            visualizers: new Set(Array.isArray(features.visualizers) ? features.visualizers : []),
            lyricsViewed: features.lyricsViewed || false,
            backgroundEffects: new Set(Array.isArray(features.backgroundEffects) ? features.backgroundEffects : []),
            eqPresets: new Set(Array.isArray(features.eqPresets) ? features.eqPresets : []),
            sharedSong: features.sharedSong || false,
            temposChanged: new Set(Array.isArray(features.temposChanged) ? features.temposChanged : []),
        };
        return profile;
    }
    return defaultProfile;
};

export const saveProfile = (profile: ProfileData): Promise<void> => {
    const storableProfile: any = {
        ...profile,
        usedFeatures: {
            ...profile.usedFeatures,
            themes: Array.from(profile.usedFeatures.themes),
            fonts: Array.from(profile.usedFeatures.fonts),
            neonStyles: Array.from(profile.usedFeatures.neonStyles),
            nameplateAnimations: Array.from(profile.usedFeatures.nameplateAnimations),
            visualizers: Array.from(profile.usedFeatures.visualizers),
            backgroundEffects: Array.from(profile.usedFeatures.backgroundEffects),
            eqPresets: Array.from(profile.usedFeatures.eqPresets),
            temposChanged: Array.from(profile.usedFeatures.temposChanged),
        },
        id: 'userProfile'
    };
    return dbRequest<void>('profile', 'readwrite', store => store.put(storableProfile));
};

// --- Artists ---
export const getArtists = (): Promise<Artist[]> => dbRequest<Artist[]>('artists', 'readonly', store => store.getAll());
export const getArtist = (name: string): Promise<Artist | undefined> => dbRequest<Artist | undefined>('artists', 'readonly', store => store.get(name));
export const saveArtist = (artist: Artist): Promise<void> => dbRequest<void>('artists', 'readwrite', store => store.put(artist));

// --- Play Queue ---
export const getPlayQueue = (): Promise<Song[]> => dbRequest<Song[]>('playQueue', 'readonly', store => store.getAll());
export const savePlayQueue = (queue: Song[]): Promise<void> => dbRequestMultiple('playQueue', 'readwrite', store => {
    store.clear();
    queue.forEach(song => store.put(song));
});

// --- Reminders ---
export const getReminders = (): Promise<Reminder[]> => dbRequest<Reminder[]>('reminders', 'readonly', store => store.getAll());
export const saveReminder = (reminder: Reminder): Promise<void> => dbRequest<void>('reminders', 'readwrite', store => store.put(reminder));
export const deleteReminder = (id: number): Promise<void> => dbRequest<void>('reminders', 'readwrite', store => store.delete(id));


// --- External APIs ---
const RADIO_API_BASE = 'https://de1.api.radio-browser.info/json';

export const fetchRadioAPI = async (path: string) => {
    try {
        const response = await fetch(`${RADIO_API_BASE}${path}`);
        if (!response.ok) throw new Error(`Radio API request failed with status ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching from Radio API, trying fallback:", error);
        try {
            const fallbackResponse = await fetch(`https://at1.api.radio-browser.info/json${path}`);
            if (!fallbackResponse.ok) throw new Error('Fallback failed too');
            return await fallbackResponse.json();
        } catch (fallbackError) {
             console.error("Fallback Radio API fetch failed:", fallbackError);
             throw fallbackError;
        }
    }
};

export const fetchFromJamendo = async (query: string, page: number = 1, limit: number = 20): Promise<Song[]> => {
    try {
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=c8280634&format=json&limit=${limit}&search=${encodeURIComponent(query)}&include=musicinfo&offset=${(page - 1) * limit}`);
        const data = await response.json();
        return (data.results || []).map((track: any): Song => ({
            id: `jamendo-${track.id}`,
            title: track.name,
            artist: track.artist_name,
            albumArtUrl: track.image.replace(/width=\d+/, 'width=600'),
            url: track.audio,
            duration: track.duration,
            source: 'Jamendo',
        }));
    } catch (error) {
        console.error("Error fetching from Jamendo:", error);
        return [];
    }
};

export const fetchFromAudius = async (query: string, page: number = 1, limit: number = 20): Promise<Song[]> => {
    try {
        const response = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=MwijayMusic&page=${page}&limit=${limit}`);
        const data = await response.json();
        return (data.data || []).map((track: any): Song => ({
            id: `audius-${track.id}`,
            title: track.title,
            artist: track.user.name,
            albumArtUrl: track.artwork['480x480'],
            url: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=MwijayMusic`,
            duration: track.duration,
            source: 'Audius',
        }));
    } catch (error) {
        console.error("Error fetching from Audius:", error);
        return [];
    }
};

export const fetchFromArchive = async (query: string, page: number = 1, limit: number = 20): Promise<Song[]> => {
    try {
        const response = await fetch(`https://archive.org/advancedsearch.php?q=(${encodeURIComponent(query)}) AND mediatype:(audio)&fl[]=identifier,title,creator,duration&sort[]=downloads+desc&rows=${limit}&page=${page}&output=json`);
        const data = await response.json();
        const docs = data.response.docs || [];
        return docs.map((item: any): Song => {
            // duration can be a string like "hh:mm:ss" or just seconds
            let durationInSeconds = 0;
            if (typeof item.duration === 'string') {
                const parts = item.duration.split(':').map(Number);
                if (parts.length === 3) durationInSeconds = parts[0]*3600 + parts[1]*60 + parts[2];
                else if (parts.length === 2) durationInSeconds = parts[0]*60 + parts[1];
                else durationInSeconds = parts[0];
            } else if (typeof item.duration === 'number') {
                durationInSeconds = item.duration;
            }

            return {
                id: `archive-${item.identifier}`,
                title: item.title,
                artist: item.creator || 'Unknown Artist',
                albumArtUrl: `https://archive.org/services/get-item-image.php?identifier=${item.identifier}`,
                url: `https://archive.org/download/${item.identifier}/${item.identifier}.mp3`,
                duration: durationInSeconds,
                source: 'Archive.org',
            };
        });
    } catch (error) {
        console.error("Error fetching from Archive.org:", error);
        return [];
    }
};
