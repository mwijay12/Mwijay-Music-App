import type { Song, Playlist, ProfileData, Video, ReelPlaylist, RadioPlaylist, RadioStation, Artist, Reminder } from '../types.ts';
import { user, getRandomCoverArt } from '../constants.ts'; // For default profile

const DB_NAME = 'MwijayMusicDB';
const DB_VERSION = 20; // Incremented version for schema change
let db: IDBDatabase;

export const defaultProfile: ProfileData = {
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
    customThemeColors: { primary: '#C8F052', secondary: '#A050FF', accent: '#7CFC00' },
    recentlyPlayed: [],
    lastPlayedSongId: undefined,
    lastPlayedProgress: 0,
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
            if (event.oldVersion < 4) {
                 if (!dbInstance.objectStoreNames.contains('reelPlaylists')) {
                    dbInstance.createObjectStore('reelPlaylists', { keyPath: 'id' });
                }
            }
            if (event.oldVersion < 5) {
                 if (!dbInstance.objectStoreNames.contains('playQueue')) {
                    dbInstance.createObjectStore('playQueue', { keyPath: 'id' });
                }
            }
            if (event.oldVersion < 6) {
                 if (!dbInstance.objectStoreNames.contains('radioPlaylists')) {
                    dbInstance.createObjectStore('radioPlaylists', { keyPath: 'id' });
                }
            }
             if (event.oldVersion < 12) {
                if (!dbInstance.objectStoreNames.contains('radioCache')) {
                    dbInstance.createObjectStore('radioCache', { keyPath: 'path' });
                }
            }
             if (event.oldVersion < 14) {
                 if (!dbInstance.objectStoreNames.contains('artists')) {
                    dbInstance.createObjectStore('artists', { keyPath: 'name' });
                }
            }
            if (event.oldVersion < 15) {
                if (!dbInstance.objectStoreNames.contains('reminders')) {
                    dbInstance.createObjectStore('reminders', { keyPath: 'id' });
                }
            }
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(true);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
            reject(false);
        };
    });
};

const getStore = (storeName: string, mode: IDBTransactionMode) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
};

// --- Songs ---
export const saveSongs = (songs: Song[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('songs', 'readwrite');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            songs.forEach(song => {
                // We don't save the temporary URL
                const { url, ...songToSave } = song;
                if (url && !url.startsWith('blob:')) {
                    (songToSave as any).url = url; // Keep remote URLs (like for radio)
                }
                store.put(songToSave);
            });
            clearRequest.transaction.oncomplete = () => resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
    });
};

export const getSongs = (): Promise<Song[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('songs', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- Videos ---
export const saveVideos = (videos: Video[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('videos', 'readwrite');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            videos.forEach(video => store.put(video));
            clearRequest.transaction.oncomplete = () => resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
    });
};

export const getVideos = (): Promise<Video[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('videos', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};


// --- Playlists ---
export const savePlaylists = (playlists: Playlist[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('playlists', 'readwrite');
         const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            playlists.forEach(playlist => store.put(playlist));
            clearRequest.transaction.oncomplete = () => resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
    });
};

export const getPlaylists = (): Promise<Playlist[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('playlists', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- Reel Playlists ---
export const saveReelPlaylists = (playlists: ReelPlaylist[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('reelPlaylists', 'readwrite');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            playlists.forEach(playlist => store.put(playlist));
            clearRequest.transaction.oncomplete = () => resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
    });
};

export const getReelPlaylists = (): Promise<ReelPlaylist[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('reelPlaylists', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

// --- Radio Playlists ---
export const saveRadioPlaylists = (playlists: RadioPlaylist[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('radioPlaylists', 'readwrite');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            playlists.forEach(playlist => store.put(playlist));
            clearRequest.transaction.oncomplete = () => resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
    });
};

export const getRadioPlaylists = (): Promise<RadioPlaylist[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('radioPlaylists', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};


// --- Play Queue ---
export const savePlayQueue = (queue: Song[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('playQueue', 'readwrite');
        const request = store.put({ id: 'currentQueue', songs: queue });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getPlayQueue = (): Promise<Song[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('playQueue', 'readonly');
        const request = store.get('currentQueue');
        request.onsuccess = () => resolve(request.result?.songs || []);
        request.onerror = () => reject(request.error);
    });
};

// --- Reminders ---
export const saveReminders = (reminders: Reminder[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('reminders', 'readwrite');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
            reminders.forEach(reminder => {
                const { timeoutId, ...reminderToSave } = reminder; // Don't save timeoutId
                store.put(reminderToSave);
            });
            clearRequest.transaction.oncomplete = () => resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
    });
};

export const getReminders = (): Promise<Reminder[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('reminders', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};


// --- Profile ---
export const saveProfile = (profile: ProfileData): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('profile', 'readwrite');
        const profileToSave = { ...profile, usedFeatures: {
            themes: Array.from(profile.usedFeatures.themes || []),
            fonts: Array.from(profile.usedFeatures.fonts || []),
            neonStyles: Array.from(profile.usedFeatures.neonStyles || []),
            nameplateAnimations: Array.from(profile.usedFeatures.nameplateAnimations || []),
            visualizers: Array.from(profile.usedFeatures.visualizers || []),
            lyricsViewed: profile.usedFeatures.lyricsViewed || false,
            backgroundEffects: Array.from(profile.usedFeatures.backgroundEffects || []),
            eqPresets: Array.from(profile.usedFeatures.eqPresets || []),
            sharedSong: profile.usedFeatures.sharedSong || false,
            temposChanged: Array.from(profile.usedFeatures.temposChanged || []),
        }};
        const request = store.put({ id: 'userProfile', ...profileToSave });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const isObject = (item: any) => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

// A robust function to merge the default profile into the loaded one.
const mergeDefaults = (target: any, source: any) => {
    const output = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (isObject(source[key])) {
                // If the key exists in target and is an object, recurse.
                // Otherwise, just take the whole object from source. This handles cases where target[key] is null, undefined, or not an object.
                if (key in output && isObject(output[key])) {
                    output[key] = mergeDefaults(output[key], source[key]);
                } else {
                    output[key] = JSON.parse(JSON.stringify(source[key])); // deep copy
                }
            } else if (Array.isArray(source[key])) {
                // If target doesn't have the key or it's not an array, take the default array.
                if (!(key in output) || !Array.isArray(output[key])) {
                    output[key] = source[key];
                }
            } else {
                // For primitives, only add if they are missing in the target.
                if (!(key in output)) {
                    output[key] = source[key];
                }
            }
        }
    }
    return output;
};


const runMigrations = (profile: any): ProfileData => {
    // 1. Deep merge defaults into the loaded profile to ensure all properties exist.
    // This is safer than spreading because it handles nested objects and null/undefined values correctly.
    const merged = mergeDefaults(profile || {}, defaultProfile);

    // 2. Re-hydrate Sets for usedFeatures from the original loaded profile data, as Sets are not JSON-serializable.
    const loadedUsedFeatures = profile?.usedFeatures || {};
    merged.usedFeatures = {
        themes: new Set(loadedUsedFeatures.themes || []),
        fonts: new Set(loadedUsedFeatures.fonts || []),
        neonStyles: new Set(loadedUsedFeatures.neonStyles || []),
        nameplateAnimations: new Set(loadedUsedFeatures.nameplateAnimations || []),
        visualizers: new Set(loadedUsedFeatures.visualizers || []),
        lyricsViewed: loadedUsedFeatures.lyricsViewed || false,
        backgroundEffects: new Set(loadedUsedFeatures.backgroundEffects || []),
        eqPresets: new Set(loadedUsedFeatures.eqPresets || []),
        sharedSong: loadedUsedFeatures.sharedSong || false,
        temposChanged: new Set(loadedUsedFeatures.temposChanged || []),
    };

    // 3. Perform specific data transformations for older versions.
    // Convert old string-based achievements to new object format.
    if (merged.unlockedAchievements && merged.unlockedAchievements.length > 0 && typeof merged.unlockedAchievements[0] === 'string') {
        merged.unlockedAchievements = (merged.unlockedAchievements as unknown as string[]).map(id => ({ 
            id, 
            date: Date.now() - Math.floor(Math.random() * 1000 * 3600 * 24 * 30) // Assign a random-ish date
        }));
    }

    // Ensure weeklyActivity has exactly 7 items.
    if (!Array.isArray(merged.analytics.weeklyActivity) || merged.analytics.weeklyActivity.length !== 7) {
        merged.analytics.weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
    }
    
    // Ensure simpleMode is an object
    if (typeof merged.settings.simpleMode !== 'object' || merged.settings.simpleMode === null) {
        merged.settings.simpleMode = { enabled: !!merged.settings.simpleMode, style: 'rotate' };
    }

    return merged as ProfileData;
};


export const getProfile = (): Promise<ProfileData> => {
    return new Promise((resolve, reject) => {
        const store = getStore('profile', 'readonly');
        const request = store.get('userProfile');
        request.onsuccess = () => {
             if (request.result) {
                const migratedProfile = runMigrations(request.result);
                resolve(migratedProfile);
            } else {
                resolve({ ...defaultProfile });
            }
        };
        request.onerror = () => reject(request.error);
    });
};

// --- Artists ---
export const saveArtist = (artist: Artist): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('artists', 'readwrite');
        const request = store.put(artist);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getArtist = (artistName: string): Promise<Artist | undefined> => {
    return new Promise((resolve, reject) => {
        const store = getStore('artists', 'readonly');
        const request = store.get(artistName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getArtists = (): Promise<Artist[]> => {
    return new Promise((resolve, reject) => {
        const store = getStore('artists', 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- Radio Cache ---
export const saveRadioCache = (path: string, data: RadioStation[] | any[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        const store = getStore('radioCache', 'readwrite');
        const request = store.put({ path, timestamp: Date.now(), data });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getRadioCacheByPath = (path: string): Promise<{ path: string, timestamp: number, data: RadioStation[] | any[] } | undefined> => {
    return new Promise((resolve, reject) => {
        const store = getStore('radioCache', 'readonly');
        const request = store.get(path);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- API Fetching Logic ---
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// A robust, shuffled list of Radio Browser API servers to ensure high availability.
// This includes both the new v3 DNS load-balanced endpoints and several community mirrors.
const API_BASE_URLS = [
    // Recommended v3 DNS load-balanced endpoints (highest priority)
    'https://rb.api.v3.radio-browser.info/json',
    'https://rba.api.v3.radio-browser.info/json',

    // Official and community-provided mirrors (compatible paths)
    'https://de1.api.radio-browser.info/json',
    'https://nl1.api.radio-browser.info/json',
    'https://fr1.api.radio-browser.info/json',
    'https://at1.api.radio-browser.info/json',
    'https://de2.api.radio-browser.info/json',
    'https://us.api.radio-browser.info/json',
    'https://ca1.api.radio-browser.info/json',
    'https://br1.api.radio-browser.info/json',
];

const fetchWithFailover = async (path: string): Promise<Response> => {
    // Shuffle to distribute load
    const shuffledUrls = [...API_BASE_URLS].sort(() => Math.random() - 0.5);
    
    for (const baseUrl of shuffledUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                return response;
            }
            console.warn(`Radio API server ${baseUrl} failed with status ${response.status}`);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn(`Radio API server ${baseUrl} timed out.`);
            } else {
                console.warn(`Radio API server ${baseUrl} failed to connect.`, String(error));
            }
        }
    }
    throw new Error('All radio API servers are unreachable.');
};

export const fetchRadioAPI = async (path: string) => {
    const cached = await getRadioCacheByPath(path);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await fetchWithFailover(path);
        const data = await response.json();
        let dataToReturn = data;
        if (window.isSecureContext && Array.isArray(data)) {
            const secureData = data.filter(s => s.url_resolved?.startsWith('https://'));
            if (secureData.length > 0) {
                dataToReturn = secureData;
            }
        }
        await saveRadioCache(path, dataToReturn);
        return dataToReturn;
    } catch (error) {
        console.warn(`Failed to fetch fresh radio data for path: ${path}. Error:`, String(error));
        if (cached) {
            console.log(`Serving stale cache for path: ${path}`);
            return cached.data;
        }
        throw error;
    }
};

// --- ONLINE MUSIC APIs ---

const JAMENDO_CLIENT_ID = 'a42d23c1';

export const fetchFromAudius = async (query: string, page: number, limit: number = 15): Promise<Song[]> => {
    try {
        const response = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=MwijayMusic&page=${page}&limit=${limit}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.data || []).map((track: any): Song => ({
            id: `audius-${track.id}`,
            title: track.title,
            artist: track.user.name,
            albumArtUrl: track.artwork?.['480x480'] || track.artwork?.['150x150'] || getRandomCoverArt(),
            url: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=MwijayMusic`,
            duration: track.duration,
            source: 'Audius',
        }));
    } catch (e) {
        console.error("Audius API Error:", String(e));
        return [];
    }
};

export const fetchFromArchive = async (query: string, page: number, limit: number = 10): Promise<Song[]> => {
    try {
        const searchResponse = await fetch(`https://archive.org/advancedsearch.php?q=title:(${encodeURIComponent(query)}) AND mediatype:(audio)&fl=identifier,title,creator,album&rows=${limit}&page=${page}&output=json`);
        if (!searchResponse.ok) return [];
        const searchData = await searchResponse.json();
        const docs = searchData.response?.docs || [];

        const songPromises = docs.map(async (doc: any) => {
            try {
                const metaResponse = await fetch(`https://archive.org/metadata/${doc.identifier}`);
                if (!metaResponse.ok) return null;
                const metaData = await metaResponse.json();
                const audioFile = metaData.files?.find((f: any) => f.format === "VBR MP3" || f.format.includes("MP3"));
                if (!audioFile) return null;

                return {
                    id: `archive-${doc.identifier}`,
                    title: doc.title || metaData.metadata.title,
                    artist: doc.creator || metaData.metadata.artist || 'Unknown Artist',
                    albumArtUrl: metaData.misc?.image || getRandomCoverArt(),
                    url: `https://archive.org/download/${doc.identifier}/${audioFile.name}`,
                    duration: parseFloat(audioFile.length) || undefined,
                    source: 'Archive.org',
                };
            } catch { return null; }
        });

        return (await Promise.all(songPromises)).filter((s): s is Song => s !== null);
    } catch (e) {
        console.error("Archive.org API Error:", String(e));
        return [];
    }
};

export const fetchFromJamendo = async (query: string, page: number, limit: number = 15): Promise<Song[]> => {
    try {
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&search=${encodeURIComponent(query)}&offset=${(page - 1) * limit}&limit=${limit}`);
        if (!response.ok) return [];
        const data = await response.json();
        return (data.results || []).map((track: any): Song => ({
            id: `jamendo-${track.id}`,
            title: track.name,
            artist: track.artist_name,
            albumArtUrl: (track.album_image || '').replace('1.200.jpg', '1.400.jpg') || getRandomCoverArt(),
            url: track.audio,
            duration: track.duration,
            source: 'Jamendo',
        }));
    } catch(e) {
        console.error("Jamendo API Error:", String(e));
        return [];
    }
};