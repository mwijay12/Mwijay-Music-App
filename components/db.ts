
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { Song, Playlist, ProfileData, Video, ReelPlaylist, RadioPlaylist, Artist, Reminder, ChatMessage } from '../types.ts';
import { user, getRandomCoverArt } from './constants.ts'; 
import { forceHttps, getPremiumGradientCover } from '../utils/helpers.ts';

const universalFetch = async (url: string, options?: any) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const method = options?.method || 'GET';
            const response = await CapacitorHttp.request({
                url,
                method,
                headers: options?.headers,
                data: options?.body
            });
            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                statusText: String(response.status),
                json: async () => typeof response.data === 'string' ? JSON.parse(response.data) : response.data,
                text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
            };
        } catch (e) {
            console.error('[universalFetch] Native CapacitorHttp request failed, falling back to fetch', e);
        }
    }
    return fetch(url, options);
};

const DB_NAME = 'MwijayMusicDB';
const DB_VERSION = 24; 
let db: IDBDatabase;

export interface ChatHistoryItem {
    id: string;
    title: string;
    messages: ChatMessage[];
    timestamp: number;
}

export const defaultProfile: ProfileData = {
    name: user.name,
    avatarUrl: user.avatarUrl,
    aboutMe: '',
    onboarded: false,
    apiKey: '',
    customEmojis: [],
    settings: {
        fontSizeMultiplier: 1,
        greetingStyle: 'time-based',
        scannerSettings: { 
            backgroundScanningEnabled: false,
            minFileSizeMB: 0.1, 
            minSongDurationSeconds: 15, 
            excludedFolders: ['/Ringtones', '/Notifications', '/Alarms', '/Android/media/com.whatsapp'],
        },
        simpleMode: { enabled: false, style: 'rotate' },
        aiDjMode: false, 
        transitionDuration: 4,
        transitionStyle: 'crossfade',
        gapless: true,
        volumeNormalization: false,
        notificationsEnabled: true,
        hapticsEnabled: true,
        showNavigationBar: true,
        showExtraControls: false,
        visibleNavItems: ['Home', 'Explore', 'Create', 'Library', 'Reels', 'Settings'],
        reelsAutoScrollLoops: 2,
        reelGestureMode: 'default',
        reelSeekDuration: 10,
        dynamicThemeEnabled: false,
        dynamicThemeMode: 'off',
        visualDjMode: false,
        aiDjTransitions: false,
        dataSaverMode: true,
        audioEffectsEnabled: true,
        visualizerSettings: { type: 'spectral', spinSpeed: 8, albumArtShape: 'circle', albumArtSize: 0.9, useAlbumArtColor: false, beatSync: false },
        lyricsSettings: { fontSize: 20, fontFamily: 'Satoshi', animation: 'scroll', animationSpeed: 10 },
        equalizer: { bands: [0, 0, 0, 0, 0], preamp: 1 },
        maximizer: { bassBoost: 0, volume: 1 },
        reverb: { delay: 0, feedback: 0 },
        creative: { tempo: 1, filter: 0 },
        metronome: { enabled: false, bpm: 120, timeSignature: 4, subdivision: 1, soundType: 'beep' },
        nameplateAnimation: 'fade-in',
        playerIdleUiEnabled: false,
        aiCoverArtEnabled: false,
        collapsedSections: { library: true, assistant: true, permissions: true, dynamicTheme: true, theme_Vibrant: true, theme_Colorful: true, theme_Dark: true, theme_Light: true, fonts: true, effects: true, customTheme: true, nameplate: true, asst_personality: true, asst_voices: true, asst_playbackcontrol: true, asst_libraryaudio: true, asst_uisettingscontrol: true, asst_informationgeneral: true, asst_onlineonlyfeatures: true, myContent: true },
        neonGlow: { enabled: true, style: 'rotate', speed: 5 },
        backgroundEffects: { enabled: true, style: 'aurora' },
        edgeLighting: { enabled: false, depth: 2, radius: 20, speed: 5 },
        assistant: { voice: 'Zephyr', audibleGreeting: true, personality: 'friendly', readResponses: true },
        showTrendingCharts: true,
    },
    analytics: { listenTime: 0, radioListenTime: 0, songsUploaded: 0, songsPlayed: 0, reelsWatched: 0, songsShuffled: 0, assistantUses: 0, songsDownloaded: 0, metronomeUsageTime: 0, songsEdited: 0, topSongs: [], topArtists: [], topRadios: [], weeklyActivity: [0, 0, 0, 0, 0, 0, 0] },
    unlockedAchievements: [],
    activeThemePair: 'Default Dark',
    themeMode: 'dark',
    activeFont: 'Satoshi',
    nameplateFont: 'Dancing Script',
    customThemeColors: { primary: '#C8F052', secondary: '#A050FF', accent: '#6955FF', bgColor: '#0D0D0D', surfaceColor: '#1A1A1A' },
    recentlyPlayed: [],
    recentlyPlayedOnline: [],
    recentlyPlayedRadios: [],
    usedFeatures: { themes: new Set(), fonts: new Set(), nameplateAnimations: new Set(), visualizers: new Set(), lyricsViewed: false, eqPresets: new Set(), sharedSong: false, temposChanged: new Set(), biographer: false, neonStyles: new Set(), backgroundEffects: new Set() },
    customMoods: [],
    customWisdom: [],
    likedWisdoms: [],
    favoriteRadioStations: [],
    favoriteRadioRegions: [],
    favoriteRadioGenres: [],
    xp: 0,
    level: 1,
    streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastListenDate: '',
        freezeCount: 2,
        calendar: [],
        dailySeconds: {}
    },
};


let dbInitPromise: Promise<boolean> | null = null;

export const initDB = (): Promise<boolean> => {
    if (db) return Promise.resolve(true);
    if (dbInitPromise) return dbInitPromise;

    dbInitPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            const stores = ['songs', 'playlists', 'profile', 'videos', 'reelPlaylists', 'playQueue', 'radioPlaylists', 'radioCache', 'artists', 'reminders', 'chatHistory', 'quote_cache', 'wiki_cache', 'notification_settings'];
            stores.forEach(store => {
                if (!dbInstance.objectStoreNames.contains(store)) {
                     dbInstance.createObjectStore(store, { keyPath: store === 'artists' ? 'name' : (store === 'radioCache' ? 'path' : 'id') });
                     if (store === 'profile' && transaction) {
                         transaction.objectStore('profile').add({ id: 'userProfile', ...defaultProfile });
                     }
                }
            });
        };
        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(true);
        };
        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
            dbInitPromise = null;
            reject(false);
        };
    });
    return dbInitPromise;
};

const getStore = (storeName: string, mode: IDBTransactionMode) => {
    if (!db) throw new Error('DB not initialized');
    return db.transaction(storeName, mode).objectStore(storeName);
};

export const clearStore = async (storeName: string): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore(storeName, 'readwrite').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const addOrUpdateSongs = async (songs: Song[]): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('songs', 'readwrite');
        const store = transaction.objectStore('songs');
        songs.forEach(song => {
            const songToSave = { ...song };
            if (songToSave.url && songToSave.url.startsWith('blob:')) delete songToSave.url;
            if (Capacitor.isNativePlatform() && songToSave.nativeUrl && songToSave.audioData) delete songToSave.audioData;
            store.put(songToSave);
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getSongs = async (): Promise<Song[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('songs', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteSongFromDB = async (songId: string): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('songs', 'readwrite').delete(songId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getPlaylists = async (): Promise<Playlist[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('playlists', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const savePlaylists = async (playlists: Playlist[]): Promise<void> => {
    await initDB();
    const transaction = db.transaction('playlists', 'readwrite');
    const store = transaction.objectStore('playlists');
    store.clear();
    playlists.forEach(playlist => store.put(playlist));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getProfile = async (): Promise<ProfileData> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('profile', 'readonly').get('userProfile');
        request.onsuccess = () => {
            const profile = request.result;
            if (profile) {
                // Deep merge settings to ensure new features like neonGlow or backgroundEffects exist
                const mergedSettings = {
                    ...defaultProfile.settings,
                    ...profile.settings,
                    visualizerSettings: { ...defaultProfile.settings.visualizerSettings, ...(profile.settings?.visualizerSettings || {}) },
                    lyricsSettings: { ...defaultProfile.settings.lyricsSettings, ...(profile.settings?.lyricsSettings || {}) },
                    neonGlow: { ...defaultProfile.settings.neonGlow, ...(profile.settings?.neonGlow || {}) },
                    backgroundEffects: { ...defaultProfile.settings.backgroundEffects, ...(profile.settings?.backgroundEffects || {}) },
                    edgeLighting: { ...defaultProfile.settings.edgeLighting, ...(profile.settings?.edgeLighting || {}) },
                    assistant: { ...defaultProfile.settings.assistant, ...(profile.settings?.assistant || {}) },
                    scannerSettings: { ...defaultProfile.settings.scannerSettings, ...(profile.settings?.scannerSettings || {}) },
                    collapsedSections: { ...defaultProfile.settings.collapsedSections, ...(profile.settings?.collapsedSections || {}) },
                };

                const mergedProfile = {
                    ...defaultProfile,
                    ...profile,
                    settings: mergedSettings,
                    analytics: { ...defaultProfile.analytics, ...(profile.analytics || {}) },
                    usedFeatures: { ...defaultProfile.usedFeatures, ...(profile.usedFeatures || {}) },
                    streak: { ...defaultProfile.streak, ...(profile.streak || {}) },
                };

                const usedFeatures = mergedProfile.usedFeatures || {};
                mergedProfile.usedFeatures = {
                    ...usedFeatures,
                    themes: new Set(usedFeatures.themes || []),
                    fonts: new Set(usedFeatures.fonts || []),
                    nameplateAnimations: new Set(usedFeatures.nameplateAnimations || []),
                    visualizers: new Set(usedFeatures.visualizers || []),
                    eqPresets: new Set(usedFeatures.eqPresets || []),
                    temposChanged: new Set(usedFeatures.temposChanged || []),
                    neonStyles: new Set(usedFeatures.neonStyles || []),
                    backgroundEffects: new Set(usedFeatures.backgroundEffects || []),
                };
                resolve(mergedProfile);
            } else {
                resolve(defaultProfile);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveProfile = async (profile: ProfileData): Promise<void> => {
    await initDB();
    const profileToSave = JSON.parse(JSON.stringify(profile, (_key, value) => {
        if (value instanceof Set) return [...value];
        return value;
    }));
    getStore('profile', 'readwrite').put({ ...profileToSave, id: 'userProfile' });
};

export const getVideos = async (): Promise<Video[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('videos', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const addOrUpdateVideos = async (videos: Video[]): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('videos', 'readwrite');
        const store = transaction.objectStore('videos');
        videos.forEach(video => {
            const videoToSave = { ...video };
            if (Capacitor.isNativePlatform() && videoToSave.nativeUrl && videoToSave.videoData) delete videoToSave.videoData;
            store.put(videoToSave);
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getReelPlaylists = async (): Promise<ReelPlaylist[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('reelPlaylists', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const saveReelPlaylists = async (playlists: ReelPlaylist[]): Promise<void> => {
    await initDB();
    const transaction = db.transaction('reelPlaylists', 'readwrite');
    const store = transaction.objectStore('reelPlaylists');
    store.clear();
    playlists.forEach(playlist => store.put(playlist));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getPlayQueue = async (): Promise<Song[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('playQueue', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const savePlayQueue = async (queue: Song[]): Promise<void> => {
    await initDB();
    const transaction = db.transaction('playQueue', 'readwrite');
    const store = transaction.objectStore('playQueue');
    store.clear();
    const uniqueSongs = new Map(queue.map(song => [song.id, song]));
    uniqueSongs.forEach(song => store.put(song));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getRadioPlaylists = async (): Promise<RadioPlaylist[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('radioPlaylists', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const saveRadioPlaylists = async (playlists: RadioPlaylist[]): Promise<void> => {
    await initDB();
    const transaction = db.transaction('radioPlaylists', 'readwrite');
    const store = transaction.objectStore('radioPlaylists');
    store.clear();
    playlists.forEach(playlist => store.put(playlist));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getArtists = async (): Promise<Artist[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('artists', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const getArtist = async (name: string): Promise<Artist | null> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('artists', 'readonly').get(name);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

export const saveArtist = async (artist: Artist): Promise<void> => {
    await initDB();
    getStore('artists', 'readwrite').put(artist);
};

export const getReminders = async (): Promise<Reminder[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('reminders', 'readonly').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const getChatHistory = async (): Promise<ChatHistoryItem[]> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('chatHistory', 'readonly').getAll();
        request.onsuccess = () => {
            const sorted = (request.result || []).sort((a: ChatHistoryItem, b: ChatHistoryItem) => b.timestamp - a.timestamp);
            resolve(sorted);
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveChatHistory = async (historyItem: ChatHistoryItem): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('chatHistory', 'readwrite').put(historyItem);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const deleteChatHistory = async (id: string): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        const request = getStore('chatHistory', 'readwrite').delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const RADIO_API_BASE = 'https://de1.api.radio-browser.info/json';

export const fetchRadioAPI = async <T>(path: string): Promise<T> => {
    try {
        const response = await universalFetch(`${RADIO_API_BASE}${path}`);
        if (!response.ok) throw new Error(`Radio API error: ${response.statusText}`);
        return response.json();
    } catch (e) {
        console.warn("Radio API Fetch Failed:", e);
        return [] as any; // Return empty array to prevent crash
    }
};

export const fetchFromAudius = async (query: string, _page = 1, limit = 200): Promise<Song[]> => {
    try {
        const response = await universalFetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=MwijayMusicApp&page=${_page}&limit=${limit}`);
        if(!response.ok) throw new Error('Audius API error');
        const json = await response.json();
        return (json.data || []).map((track: any): Song => ({
            id: `audius-${track.id}`,
            title: track.title,
            artist: track.user.name,
            albumArtUrl: track.artwork['480x480'] || getRandomCoverArt(),
            url: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`,
            duration: track.duration,
            source: 'Audius',
        }));
    } catch(e) {
        console.warn("Audius Fetch Failed:", e);
        return [];
    }
};

export const fetchFromCcMixter = async (query: string, limit = 50): Promise<Song[]> => {
    try {
        const response = await universalFetch(`http://ccmixter.org/api/query?tags=${encodeURIComponent(query)}&f=json&limit=${limit}`);
        if (!response.ok) throw new Error('ccMixter API error');
        const json = await response.json();
        
        return (json || []).map((track: any): Song => ({
            id: `ccmixter-${track.id}`,
            title: track.item_name,
            artist: track.user_name,
            albumArtUrl: getRandomCoverArt(),
            url: track.files?.[0]?.download_url || '',
            duration: track.duration,
            source: 'ccMixter',
        })).filter((s: Song) => s.url);
    } catch (e) {
        console.warn("ccMixter Fetch Failed:", e);
        return [];
    }
};

export const fetchFromHearThis = async (query: string, limit = 50): Promise<Song[]> => {
    try {
        const response = await universalFetch(`https://hearthis.at/api/search?q=${encodeURIComponent(query)}&count=${limit}&page=1`);
        if (!response.ok) throw new Error('HearThis.at API error');
        const json = await response.json();
        
        if (!Array.isArray(json)) return [];

        return json.map((track: any): Song => ({
            id: `hearthis-${track.id}`,
            title: track.title,
            artist: track.user.username,
            albumArtUrl: track.thumb || getRandomCoverArt(),
            url: track.stream_url,
            duration: parseInt(track.duration),
            source: 'HearThis.at',
        }));
    } catch (e) {
        console.warn("HearThis.at Fetch Failed:", e);
        return [];
    }
};

export const fetchFromArchive = async (
    query: string, 
    page = 1, 
    limit = 200, 
    category?: string,
    options?: { collection?: string; sort?: string; format?: string }
): Promise<Song[]> => {
    try {
        let searchQuery = `(${query})`;
        if (category === 'live') {
            searchQuery += ' AND collection:(etree)';
        } else if (category === '78rpm') {
            searchQuery += ' AND collection:(78rpm)';
        } else if (category === 'swahili') {
            searchQuery = `(taarab OR swahili OR zanzibar OR "coast music")`;
        } else if (category === 'bongoflava') {
            searchQuery = `(tanzania OR "bongo flava" OR bongoflava)`;
        } else if (category === 'classical') {
            searchQuery = `(${query} OR classical) AND collection:(classicalmusi)`;
        } else if (category === 'jazz') {
            searchQuery = `(${query} OR jazz) AND (subject:(jazz) OR collection:(unlockedrecordings))`;
        }
        
        if (options?.collection && options.collection !== 'all') {
            searchQuery += ` AND collection:(${options.collection})`;
        }
        if (options?.format && options.format !== 'all') {
            searchQuery += ` AND format:("${options.format}")`;
        }

        let sortParam = 'downloads+desc';
        if (options?.sort) {
            if (options.sort === 'date desc') sortParam = 'publicdate+desc';
            else if (options.sort === 'title') sortParam = 'title+asc';
            else if (options.sort === 'creator') sortParam = 'creator+asc';
        }
        
        const fields = 'identifier,title,creator,downloads,subject';
        
        const response = await universalFetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=${fields}&sort[]=${sortParam}&rows=${limit}&page=${page}&output=json`);
        if(!response.ok) throw new Error('Archive.org API error');
        const json = await response.json();
        
        return (json.response.docs || []).map((item: any): Song => {
            let artist = 'Unknown Artist';
            if (Array.isArray(item.creator)) {
                artist = item.creator.join(', ');
            } else if (item.creator) {
                artist = item.creator;
            }

            return {
                id: `archive-${item.identifier}`,
                title: item.title || 'Untitled',
                artist: artist,
                albumArtUrl: getPremiumGradientCover(item.title || 'Untitled', artist), 
                source: 'Archive.org',
                mood: Array.isArray(item.subject) ? item.subject[0] : (item.subject || ''),
                // URL resolved later in handleDownload or play
            };
        });
    } catch(e) {
        console.warn("Archive.org Fetch Failed:", e);
        return [];
    }
};

export const fetchFromJamendo = async (query: string, _page = 1, limit = 200): Promise<Song[]> => {
    const keys = ['f28b4a9b', 'a2d99c7d'];
    for (const key of keys) {
        try {
            const response = await universalFetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${key}&format=jsonpretty&limit=${limit}&search=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Jamendo API error');
            const json = await response.json();
            if (!json.results) continue;

            return (json.results || []).map((track: any): Song => ({
                id: `jamendo-${track.id}`,
                title: track.name,
                artist: track.artist_name,
                albumArtUrl: track.image || getRandomCoverArt(),
                url: track.audio,
                duration: track.duration,
                source: 'Jamendo',
            }));
        } catch (e) {
            console.warn(`Jamendo Fetch Failed for key ${key}:`, e);
        }
    }
    return [];
};

export const fetchFromLibriVox = async (query: string, limit = 50): Promise<Song[]> => {
    try {
        const response = await universalFetch(`https://librivox.org/api/feed/audiobooks/?title=~${encodeURIComponent(query)}&format=json`);
        if (!response.ok) throw new Error('LibriVox API error');
        const json = await response.json();
        
        if (!json.books || !Array.isArray(json.books)) return [];

        return json.books.map((book: any): Song => {
            let streamUrl = book.url_zip_file || '';
            let identifier = '';
            if (streamUrl.includes('archive.org/download/')) {
                const parts = streamUrl.split('archive.org/download/');
                if (parts.length > 1) {
                    identifier = parts[1].split('/')[0];
                }
            }

            let finalUrl = '';
            if (identifier) {
                finalUrl = ''; 
            } else {
                finalUrl = book.url_rss || book.url_zip_file || '';
            }

            return {
                id: identifier ? `archive-${identifier}` : `librivox-${book.id}`,
                title: book.title || 'Untitled Book',
                artist: book.authors?.map((a: any) => `${a.first_name} ${a.last_name}`).join(', ') || 'LibriVox Reader',
                albumArtUrl: getRandomCoverArt(),
                source: 'LibriVox',
                duration: book.totallength ? parseInt(book.totallength) : 0,
                url: finalUrl,
            };
        });
    } catch (e) {
        console.warn("LibriVox Fetch Failed:", e);
        return [];
    }
};

export const getFromStore = async (storeName: string, id: string): Promise<any | null> => {
    await initDB();
    return new Promise((resolve, reject) => {
        try {
            const request = getStore(storeName, 'readonly').get(id);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
};

export const saveToStore = async (storeName: string, item: any): Promise<void> => {
    await initDB();
    return new Promise((resolve, reject) => {
        try {
            const request = getStore(storeName, 'readwrite').put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (e) {
            reject(e);
        }
    });
};

