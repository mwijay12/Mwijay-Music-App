
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { History, Check, Loader2, Download, Play, Brain, Radio, Sparkles, Wand2, Leaf, Search, Crosshair, PenLine, Music, ChevronDown, Flame, TrendingUp } from 'lucide-react';
import type { Song, ProfileData, RadioStation } from '../types.ts';
import { getRandomCoverArt } from './constants.ts';
import { getPremiumGradientCover } from '../utils/helpers.ts';
import { fetchFromAudius, fetchFromArchive, fetchRadioAPI, fetchFromJamendo, fetchFromHearThis, fetchFromLibriVox } from './db.ts';
import OnlineSearchLoader from './OnlineSearchLoader.tsx';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';
import BubbleButton from './BubbleButton.tsx';
import { GoogleGenAI } from '@google/genai';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const useSearchHistory = (storageKey: string) => {
    const [history, setHistory] = useState<string[]>(() => {
        try {
            const storedHistory = window.localStorage.getItem(storageKey);
            return storedHistory ? JSON.parse(storedHistory) : [];
        } catch (error) {
            console.error("Error reading search history from localStorage", String(error));
            return [];
        }
    });

    const addSearchTerm = useCallback((term: string) => {
        if (typeof term !== 'string') return;
        const cleanedTerm = term.trim();
        if (!cleanedTerm) return;

        setHistory(prev => {
            const newHistory = [cleanedTerm, ...prev.filter(item => item.toLowerCase() !== cleanedTerm.toLowerCase())].slice(0, 8);
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(newHistory));
            } catch (error) {
                console.error("Error saving search history to localStorage", String(error));
            }
            return newHistory;
        });
    }, [storageKey]);
    
    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            window.localStorage.removeItem(storageKey);
        } catch (error) {
            console.error("Error clearing search history from localStorage", String(error));
        }
    }, [storageKey]);

    return { history, addSearchTerm, clearHistory };
};

const SearchHistory: React.FC<{ history: string[]; onSelect: (term: string) => void; onClear: () => void; }> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) return null;

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-color)] border border-[var(--surface-border-color)] rounded-2xl shadow-lg z-20 p-2">
            <div className="flex justify-between items-center px-2 pb-1 mb-1 border-b border-[var(--surface-border-color)]">
                <h3 className="text-xs font-bold text-[var(--text-secondary)]">Recent Searches</h3>
                <button onClick={onClear} className="text-xs text-red-400 hover:text-red-500">Clear</button>
            </div>
            <ul className="max-h-48 overflow-y-auto scroll-container">
                {history.map(term => (
                    <li key={term}>
                        <button onClick={() => onSelect(term)} className="w-full text-left p-2 rounded-md hover:bg-white/10 flex items-center gap-3 text-[var(--text-primary)]">
                            <History size={16} className="text-[var(--text-secondary)]" />
                            <span>{term}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

interface OnlineDiscoveryViewProps {
    profile: ProfileData;
    librarySongs: Song[];
    onPlaySong: (song: Song, context: Song[]) => void;
    onAddSongs: (songs: Song[]) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error', icon?: React.ReactNode) => void;
    onNavigate: (view: string) => void;
    onPlayAiPlaylist: () => void;
    isGeneratingAiPlaylist: boolean;
    initialSearchQuery?: string;
    onClearInitialSearch?: () => void;
    onOpenSongDetails: (song: Song) => void;
    nowPlaying: Song | null;
    isPlaying: boolean;
    onPlayRadioStation: (station: RadioStation) => void;
    onOpenLyrics?: (song: Song) => void;
}

const OnlineSongRow: React.FC<{ song: Song; onPlay: () => void; onDownload: () => void; isDownloading: boolean; isDownloaded: boolean; onOpenDetails: () => void; onOpenLyrics?: () => void; }> = ({ song, onPlay, onDownload, isDownloading, isDownloaded, onOpenDetails, onOpenLyrics }) => {
    return (
        <div className="song-list-item flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors list-item-fade-in">
            <button onClick={onOpenDetails} className="p-0 border-none bg-transparent rounded-md flex-shrink-0">
                <img src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} alt={song.title} className="w-14 h-14 rounded-md bg-[var(--chip-bg)] object-cover" onError={(e) => { if (!e.currentTarget.dataset.fallbackApplied) { e.currentTarget.dataset.fallbackApplied = 'true'; e.currentTarget.src = getPremiumGradientCover(song.title, song.artist); }}}/>
            </button>
            <div className="flex-1 min-w-0" onClick={onOpenDetails}>
                <div className="flex items-center gap-2">
                    <p className="font-bold cursor-pointer leading-tight truncate text-[var(--text-primary)]">{song.title}</p>
                    {onOpenLyrics && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenLyrics(); }}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--primary-accent)] transition-colors"
                            title="Lyrics & Transcription"
                        >
                            <PenLine size={14} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-[var(--text-secondary)] cursor-pointer truncate">{song.artist}</p>
                    <span className="text-[10px] text-neutral-500 bg-black/20 px-1.5 py-0.5 rounded-full truncate flex-shrink-0">from {song.source}</span>
                </div>
            </div>
             <div className="flex items-center flex-shrink-0">
                {isDownloaded ? (
                    <div className="w-10 h-10 rounded-full text-green-400 flex items-center justify-center" aria-label={`${song.title} is in your library`}><Check size={20} /></div>
                ) : isDownloading ? (
                    <div className="w-10 h-10 rounded-full text-neutral-400 flex items-center justify-center" aria-label={`Downloading ${song.title}`}><Loader2 size={20} className="animate-spin" /></div>
                ) : (
                    <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="w-10 h-10 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center" aria-label={`Download ${song.title}`} title={`Download to Library`}><Download size={20} /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="w-10 h-10 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center ml-1" aria-label={`Play ${song.title}`} title={`Play ${song.title}`}><Play size={20} fill="currentColor" /></button>
            </div>
        </div>
    );
};

const MoodCard: React.FC<{ title: string, emoji: string, color: string, onClick: () => void }> = ({ title, emoji, color, onClick }) => (
    <button onClick={onClick} className={`relative flex-shrink-0 w-32 h-24 rounded-2xl overflow-hidden text-lg flex flex-col items-center justify-center p-2 transition-all hover:scale-105 ${color}`}>
        <span className="z-10 font-bold">{title}</span>
        <span className="absolute right-2 bottom-1 text-4xl opacity-30 z-0 select-none">{emoji}</span>
    </button>
);
const AIPlaylistCard: React.FC<{ onClick: () => void, isLoading: boolean }> = ({ onClick, isLoading }) => (
    <button onClick={onClick} disabled={isLoading} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
        <div className="z-10">
            <h3 className="text-xl font-bold">AI Playlist</h3>
            <p className="text-sm text-white/80 max-w-xs">{isLoading ? 'Creating your vibe...' : 'Let AI create a vibe for you.'}</p>
        </div>
        {isLoading ? <Loader2 size={32} className="animate-spin z-10" /> : <Brain size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />}
    </button>
);
const RadioCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
     <button onClick={onClick} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
        <div className="z-10">
            <h3 className="text-xl font-bold">Live Radio</h3>
            <p className="text-sm text-white/80 max-w-xs">Tune in to stations worldwide.</p>
        </div>
        <Radio size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
    </button>
);
const AIStudioCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
       <div className="z-10">
           <h3 className="text-xl font-bold">AI Studio</h3>
           <p className="text-sm text-white/80 max-w-xs">Generate lyrics & cover art.</p>
       </div>
       <Wand2 size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
   </button>
);

const BackgroundMusicCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="relative w-full p-6 mt-4 rounded-2xl bg-gradient-to-br from-green-500 to-cyan-600 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
       <div className="z-10">
           <h3 className="text-xl font-bold">Background Music</h3>
           <p className="text-sm text-white/80 max-w-xs">Royalty-free tracks for your projects.</p>
       </div>
       <Leaf size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
   </button>
);


const getCuratedFallbackCharts = (countryCode: string): Song[] => {
    // Curated popular tracks per region — shown only when all network fetches fail.
    // No fake audio URLs: url='' tells the player there's nothing to play yet.
    const fallbackData: Record<string, { title: string; artist: string }[]> = {
        tz: [
            { title: "Ozalima", artist: "Mbosso" },
            { title: "Bhuju", artist: "Alikiba ft. Mbosso" },
            { title: "AYE", artist: "Zuchu" },
            { title: "Happy", artist: "Diamond Platnumz" },
            { title: "Mombasa", artist: "Marioo" },
            { title: "Yazoee", artist: "Harmonize" },
            { title: "Jirani", artist: "Jay Melody" },
            { title: "Nishike", artist: "Zuchu" },
        ],
        ke: [
            { title: "Rapudo", artist: "Prince Indah" },
            { title: "Siaka", artist: "Mejja" },
            { title: "Finale", artist: "Bien ft. Alikiba" },
            { title: "One Time", artist: "Virusi Mbaya ft. Khaligraph Jones" },
            { title: "Banger", artist: "Trio Mio" },
            { title: "Kofi", artist: "H_art The Band" },
        ],
        ng: [
            { title: "Unavailable", artist: "Davido ft. Musa Keys" },
            { title: "Calm Down", artist: "Rema ft. Selena Gomez" },
            { title: "Rush", artist: "Ayra Starr" },
            { title: "Essence", artist: "Wizkid ft. Tems" },
            { title: "Bloody Samaritan", artist: "Ayra Starr" },
            { title: "Bother You", artist: "Rema" },
        ],
        za: [
            { title: "Casablanca Groove", artist: "Noxolo, Semi Tee & Myztro" },
            { title: "Siya Pusha", artist: "Musa Keys, Konke & Divine Vee" },
            { title: "Khanya Njalo", artist: "Kabza De Small" },
            { title: "Mnike", artist: "Tyler ICU & Tumelo.za" },
            { title: "ILLUM KL", artist: "Nandipha808 & CAAZA" },
        ],
        us: [
            { title: "Cruel Summer", artist: "Taylor Swift" },
            { title: "Flowers", artist: "Miley Cyrus" },
            { title: "Kill Bill", artist: "SZA" },
            { title: "Rich Flex", artist: "Drake & 21 Savage" },
            { title: "As It Was", artist: "Harry Styles" },
        ],
        global: [
            { title: "Love Nwantiti", artist: "CKay" },
            { title: "Calm Down", artist: "Rema ft. Selena Gomez" },
            { title: "Essence", artist: "Wizkid ft. Tems" },
            { title: "As It Was", artist: "Harry Styles" },
            { title: "Ojuelegba", artist: "Wizkid" },
        ]
    };

    const list = fallbackData[countryCode] || fallbackData.global;
    return list.map((item, index) => ({
        id: `fallback-${countryCode}-${index}`,
        title: item.title,
        artist: item.artist,
        albumArtUrl: '',
        url: '', // no fake audio — will show "no preview" state in player
        duration: 0,
        source: 'Offline Fallback'
    }));
};


const OnlineDiscoveryView: React.FC<OnlineDiscoveryViewProps> = ({ profile, librarySongs, onPlaySong, onAddSongs, showNotification, onNavigate, onPlayAiPlaylist, isGeneratingAiPlaylist, initialSearchQuery, onClearInitialSearch, onOpenSongDetails, nowPlaying, onPlayRadioStation, onOpenLyrics }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { history, addSearchTerm, clearHistory } = useSearchHistory('onlineDiscoverySearchHistory');
    const [error, setError] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const moodScrollerRef = useRef<HTMLDivElement>(null);
    const moodContentRef = useRef<HTMLDivElement>(null);
    const [isSmartSearch, setIsSmartSearch] = useState(false);
    
    const [localResults, setLocalResults] = useState<Song[]>([]);
    const [onlineResults, setOnlineResults] = useState<Song[]>([]);
    const [isBackgroundMusicSearch, setIsBackgroundMusicSearch] = useState(false);
    const [radioResults, setRadioResults] = useState<RadioStation[]>([]);
    const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);
    const [archiveCollection, setArchiveCollection] = useState('all');
    const [archiveSort, setArchiveSort] = useState('downloads desc');
    const [archiveFormat, setArchiveFormat] = useState('all');
    const [isAdvancedArchiveOpen, setIsAdvancedArchiveOpen] = useState(false);
    
    // States for live trending charts (Phase 2 - Prompts 1 & 3)
    const [activeChartTab, setActiveChartTab] = useState<string>('tz');
    const [chartSongs, setChartSongs] = useState<Song[]>([]);
    const [chartSongsLoading, setChartSongsLoading] = useState<boolean>(false);

    const fetchCharts = useCallback(async (countryCode: string) => {
        setChartSongsLoading(true);
        setChartSongs([]);

        const mapItunesEntry = (e: any, i: number): Song => {
            const images: any[] = Array.isArray(e['im:image']) ? e['im:image'] : [];
            const albumArt = images[images.length - 1]?.label || images[0]?.label || '';
            const links: any[] = Array.isArray(e.link) ? e.link : [e.link].filter(Boolean);
            const enclosure = links.find((l: any) => l?.attributes?.rel === 'enclosure');
            return {
                id: `itunes-${e.id?.attributes?.['im:id'] || i}`,
                title: e['im:name']?.label || 'Unknown Title',
                artist: e['im:artist']?.label || 'Unknown Artist',
                albumArtUrl: albumArt,
                url: enclosure?.attributes?.href || '',
                duration: 30,
                source: `iTunes ${countryCode.toUpperCase()} Charts`,
            };
        };

        const mapDeezerTrack = (t: any, i: number): Song => ({
            id: `deezer-${t.id}`,
            title: t.title || 'Unknown Title',
            artist: t.artist?.name || 'Unknown Artist',
            albumArtUrl: t.album?.cover_xl || t.album?.cover_medium || t.album?.cover || '',
            url: t.preview || '',
            duration: t.duration || 30,
            source: 'Deezer Global Charts',
        });

        const nativeFetch = async (url: string) => {
            if (Capacitor.isNativePlatform()) {
                try {
                    const res = await CapacitorHttp.get({ url });
                    return {
                        ok: res.status >= 200 && res.status < 300,
                        json: async () => res.data
                    };
                } catch (e) {
                    console.error('CapacitorHttp failed, using normal fetch fallback', e);
                }
            }
            return fetch(url);
        };

        // ── Tier 1: Express server proxy (avoids CORS, has caching) ─────────────
        try {
            const endpoint = countryCode === 'global'
                ? `/api/charts/deezer?limit=20`
                : `/api/charts/itunes?country=${countryCode}&limit=20`;

            const res = await fetch(endpoint, { signal: AbortSignal.timeout(7000) });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setChartSongs(data as Song[]);
                    setChartSongsLoading(false);
                    return;
                }
            }
        } catch {
            // Server offline or slow — try browser direct fetch
        }

        // ── Tier 2: Direct browser fetch (with native CORS bypass for mobile) ──
        try {
            let songs: Song[] = [];

            if (countryCode === 'global') {
                const r = await nativeFetch('https://api.deezer.com/chart/0/tracks?limit=20');
                if (r.ok) {
                    const data = await r.json();
                    songs = (data.data || []).map(mapDeezerTrack);
                }
            } else if (['tz', 'ke', 'ng', 'za'].includes(countryCode)) {
                // Fetch real regional Bongo Flava, Afrobeats, and Amapiano hits using Deezer search API
                const searchQueries: Record<string, string[]> = {
                    tz: ['Diamond Platnumz', 'Harmonize', 'Mbosso', 'Zuchu', 'Alikiba'],
                    ke: ['Sauti Sol', 'Otile Brown', 'Willy Paul', 'Bien'],
                    ng: ['Burna Boy', 'Wizkid', 'Davido', 'Rema', 'Asake'],
                    za: ['Amapiano', 'Kabza De Small', 'DJ Maphorisa', 'Tyler ICU']
                };
                
                const queries = searchQueries[countryCode] || ['Diamond Platnumz'];
                // Fetch tracks for top regional artists and combine them
                const allPromises = queries.map(async (query) => {
                    try {
                        const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=8`;
                        const res = await nativeFetch(url);
                        if (res.ok) {
                            const d = await res.json();
                            return (d.data || []).map((t: any) => ({
                                ...mapDeezerTrack(t, 0),
                                source: `${countryCode.toUpperCase()} Hits (${query})`
                            }));
                        }
                    } catch (e) {
                        console.error('Error fetching regional tracks for ' + query, e);
                    }
                    return [];
                });
                
                const results = await Promise.all(allPromises);
                const merged = results.flat();
                
                // Remove duplicates by ID and take the top 20
                const seen = new Set();
                const uniqueSongs = merged.filter((s: Song) => {
                    if (seen.has(s.id)) return false;
                    seen.add(s.id);
                    return true;
                });
                
                songs = uniqueSongs.slice(0, 20);
            } else {
                // US / iTunes
                const countryMap: Record<string, string> = { us: 'us' };
                const cc = countryMap[countryCode] || 'us';
                const r = await nativeFetch(`https://itunes.apple.com/${cc}/rss/topsongs/limit=20/json`);
                if (r.ok) {
                    const data = await r.json();
                    songs = (data?.feed?.entry || []).map(mapItunesEntry);
                }
            }

            if (songs.length > 0) {
                setChartSongs(songs);
                setChartSongsLoading(false);
                return;
            }
        } catch (err) {
            console.error('Error in Tier 2 fetchCharts:', err);
        }

        // ── Tier 3: Curated offline fallback (no fake MP3s) ─────────────────────
        setChartSongs(getCuratedFallbackCharts(countryCode));
        setChartSongsLoading(false);
    }, []);

    useEffect(() => {
        if (!hasSearched) {
            fetchCharts(activeChartTab);
        }
    }, [activeChartTab, hasSearched, fetchCharts]);
    
    useInterruptibleScroll(scrollerRef, contentRef);
    useInterruptibleScroll(moodScrollerRef, moodContentRef); // Use for moods

    const librarySongIds = useMemo(() => new Set(librarySongs.map(s => s.id)), [librarySongs]);
    
    const isNowPlayingInView = useMemo(() => {
        if (!nowPlaying) return false;
        const allResults = [...localResults, ...onlineResults];
        return allResults.some(s => s.id === nowPlaying.id);
    }, [localResults, onlineResults, nowPlaying]);

    const handleJumpToSong = () => {
        if (nowPlaying) {
            const songElement = document.getElementById(`online-song-${nowPlaying.id}`);
            if (songElement) {
                songElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedSongId(nowPlaying.id);
                setTimeout(() => setHighlightedSongId(null), 1500);
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const moodsWithEmojis = [
        { name: 'Chill', emoji: '❄️', color: 'bg-purple-500/80 text-white', term: 'chill lofi' },
        { name: 'Focus', emoji: '🤔', color: 'bg-blue-500/80 text-white', term: 'focus instrumental' },
        { name: 'Party', emoji: '🎉', color: 'bg-pink-500/80 text-white', term: 'party dance' },
        { name: 'Workout', emoji: '💪', color: 'bg-red-600/80 text-white', term: 'workout high energy' },
        { name: 'Happy', emoji: '😊', color: 'bg-yellow-400/80 text-black', term: 'happy upbeat' },
        { name: 'Sad', emoji: '😢', color: 'bg-blue-600/80 text-white', term: 'sad emotional' },
        { name: 'Sleep', emoji: '😴', color: 'bg-indigo-900/80 text-white', term: 'sleep ambient' },
        { name: 'Nature', emoji: '🌿', color: 'bg-green-600/80 text-white', term: 'nature sounds' },
    ];

    const renderMoodList = (suffix: string) => (
        <>
            {moodsWithEmojis.map(mood => (
                <MoodCard key={`${mood.name}-${suffix}`} title={mood.name} emoji={mood.emoji} color={mood.color} onClick={() => handleSearch(mood.term)} />
            ))}
        </>
    );

    useEffect(() => {
        if (initialSearchQuery && !hasSearched) {
            setSearchTerm(initialSearchQuery);
            handleSearch(initialSearchQuery);
            if (onClearInitialSearch) onClearInitialSearch();
        }
    }, [initialSearchQuery, hasSearched, onClearInitialSearch]);

    const performSmartSearch = async (term: string) => {
        const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);
        if (!profile.apiKey && !envKey) {
            showNotification('Smart Search requires a Gemini API Key in Settings.', 'error');
            return null;
        }
        try {
            const apiKey = profile.apiKey || envKey!;
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `You are a music discovery assistant. The user is searching for: "${term}". 
                Convert this vibe, mood, or description into 3 specific, simple search keywords (e.g. genre names, artist names, or standard tags) that are likely to find results in a music database.
                Return strictly a JSON array of strings. Example: ["Jazz", "Lo-Fi", "Piano"]`,
                config: { responseMimeType: 'application/json' }
            });
            return JSON.parse(response.text || '[]');
        } catch (e) {
            console.error("Smart Search failed:", e);
            return null;
        }
    };

    const handleSearch = async (term: string, forceSmart = false, category?: string) => {
        if (!term.trim()) return;
        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        addSearchTerm(term);
        
        // Local Search
        const lowerTerm = term.toLowerCase();
        const local = librarySongs.filter(s => s.title.toLowerCase().includes(lowerTerm) || s.artist.toLowerCase().includes(lowerTerm));
        setLocalResults(local);

        setOnlineResults([]);
        setRadioResults([]);
        
        try {
            // Radio Search (Use original term)
            try {
                const radios = await fetchRadioAPI<RadioStation[]>(`/stations/search?name=${encodeURIComponent(term)}&limit=5&hidebroken=true`);
                setRadioResults(radios);
            } catch (e) { console.error("Radio search failed", e); }

            // Query the new Python FastAPI server
            const isSmart = isSmartSearch || forceSmart;
            const endpoint = isSmart 
                ? `/api/search/smart?q=${encodeURIComponent(term)}`
                : `/api/search?q=${encodeURIComponent(term)}&sources=all&limit=40`;
                
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error("Python backend search request failed");
            }
            const data = await response.json();
            
            // Handle differences in structure between normal and smart search outputs
            const rawSongs = isSmart && data.intent ? data.results : (data.results || data);
            
            // Map Python standardized models directly to React Song schema
            const mappedSongs: Song[] = (rawSongs || []).map((r: any) => ({
                id: r.id || `yt-${Math.random()}`,
                title: r.title,
                artist: r.artist,
                album: r.album || 'Single',
                duration: r.duration || '0:00',
                duration_seconds: r.duration_seconds || 0,
                albumArtUrl: r.thumbnail || '',
                url: r.url || '',
                source: r.source || r.best_source || 'ytmusic'
            }));
            
            setOnlineResults(mappedSongs);
            
            if (isSmart && data.intent) {
                showNotification(`AI Intent: ${data.intent.replace('_', ' ').toUpperCase()}`, 'info', <Brain size={18} />);
            }

        } catch (err) {
            console.error("Python backend offline, falling back to local browser fetches:", err);
            
            // RESILIENT BROWSER FALLBACK: Direct client-side API fetches
            try {
                const promises = [
                    fetchFromAudius(term, 1, 40),
                    fetchFromArchive(term, 1, 100, category, { collection: archiveCollection, sort: archiveSort, format: archiveFormat }),
                    fetchFromHearThis(term, 40),
                    fetchFromJamendo(term, 1, 40),
                    fetchFromLibriVox(term, 40)
                ];

                const results = await Promise.all(promises);
                const combined = results.flat();
                
                // Deduplicate in browser
                const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());
                setOnlineResults(unique);
            } catch (fallbackErr) {
                console.error("Browser fallback search failed also", fallbackErr);
                setError("Failed to fetch online results.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (song: Song) => {
        setDownloadingId(song.id);
        try {
            let songToDownload = { ...song };
            // Resolve URL if needed (e.g. Archive.org)
             if (!songToDownload.url && songToDownload.source === 'Archive.org') {
                 const identifier = song.id.replace('archive-', '');
                 const metadataResponse = await fetch(`https://archive.org/metadata/${identifier}`);
                 if (!metadataResponse.ok) throw new Error('Failed to fetch metadata');
                 const metadata = await metadataResponse.json();
                 const audioFile = metadata.files.find((f: any) => f.format === 'VBR MP3') || metadata.files.find((f: any) => ['MP3', 'OGG', 'FLAC', 'WAV'].includes(f.format));
                 if (!audioFile) throw new Error('No playable file found');
                 songToDownload.url = `https://archive.org/download/${identifier}/${encodeURIComponent(audioFile.name)}`;
            }

            if (!songToDownload.url) throw new Error("No URL found");

            const response = await fetch(songToDownload.url);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();
            
            const newSong = { ...songToDownload, audioData: buffer, dateAdded: Date.now() };
            onAddSongs([newSong]);
            showNotification(`Downloaded "${song.title}"`, 'success');
        } catch (e) {
            console.error("Download failed", e);
            showNotification("Download failed", 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    const renderSearchResults = () => (
        <div className="space-y-6">
            {localResults.length > 0 && (
                <section>
                    <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)]">In Library</h3>
                    <div className="space-y-1">
                        {localResults.map(song => (
                            <OnlineSongRow 
                                key={song.id} 
                                song={song} 
                                onPlay={() => onPlaySong(song, localResults)} 
                                onDownload={() => {}} 
                                isDownloading={false} 
                                isDownloaded={true} 
                                onOpenDetails={() => onOpenSongDetails(song)}
                                onOpenLyrics={onOpenLyrics ? () => onOpenLyrics(song) : undefined}
                            />
                        ))}
                    </div>
                </section>
            )}
            
            {radioResults.length > 0 && (
                <section>
                    <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)]">Live Radio</h3>
                    <div className="space-y-1">
                        {radioResults.map(station => (
                            <div key={station.stationuuid} onClick={() => onPlayRadioStation(station)} className="song-list-item flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors cursor-pointer">
                                <img src={station.favicon || getRandomCoverArt()} alt={station.name} className="w-14 h-14 rounded-md bg-[var(--chip-bg)] object-cover" onError={(e) => {e.currentTarget.src = getRandomCoverArt()}}/>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate text-[var(--text-primary)]">{station.name}</p>
                                    <p className="text-sm text-[var(--text-secondary)] truncate">{station.country}</p>
                                </div>
                                <Radio size={20} className="text-[var(--text-secondary)]" />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)]">Online Results</h3>
                <div className="space-y-1">
                    {onlineResults.map(song => {
                        const isDownloaded = librarySongIds.has(song.id);
                        return (
                            <OnlineSongRow 
                                key={song.id} 
                                song={song} 
                                onPlay={() => onPlaySong(song, onlineResults)} 
                                onDownload={() => handleDownload(song)} 
                                isDownloading={downloadingId === song.id} 
                                isDownloaded={isDownloaded} 
                                onOpenDetails={() => onOpenSongDetails(song)}
                                onOpenLyrics={onOpenLyrics ? () => onOpenLyrics(song) : undefined}
                            />
                        );
                    })}
                    {onlineResults.length === 0 && !isLoading && <p className="text-neutral-400">No online results found.</p>}
                </div>
            </section>
        </div>
    );

    return (
        <main ref={scrollerRef} onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''} max-w-7xl mx-auto w-full`}>
                <h1 className="header-big-title">Explore</h1>
                <h2 className="header-small-title">Discover</h2>
                <div className="header-actions-right">
                    {/* Add any header actions if needed */}
                </div>
            </div>

            <div className="px-6 pb-40 scroll-content-with-header max-w-7xl mx-auto w-full">
                <div className="relative mb-6" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setIsSearchFocused(false); }}}>
                    <div className="cosmic-search">
                        <input 
                            type="text" 
                            placeholder={isSmartSearch ? "Describe a vibe..." : "Search songs, artists..."}
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch(searchTerm)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full bg-[var(--surface-color)] rounded-full py-3 pl-12 pr-24 text-[var(--text-primary)] placeholder-[var(--text-secondary)] border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] transition-all shadow-sm"
                        />
                        {isSmartSearch ? (
                            <Wand2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--primary-accent)] transition-colors" />
                        ) : (
                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] transition-colors" />
                        )}
                        
                        <button 
                            onClick={() => setIsSmartSearch(p => !p)} 
                            className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isSmartSearch ? 'bg-[var(--primary-accent)] text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            title="Toggle Smart Vibe Search"
                            type="button"
                        >
                            <Brain size={20} />
                        </button>
                        
                        <button 
                            onClick={() => setIsAdvancedArchiveOpen(p => !p)} 
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isAdvancedArchiveOpen ? 'bg-[var(--primary-accent)] text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                            title="Advanced Archive.org Filters"
                            type="button"
                        >
                            <Sparkles size={20} />
                        </button>
                    </div>
                    {isAdvancedArchiveOpen && (
                        <div className="mt-3 p-4 rounded-2xl liquid-glass-pane glare-effect border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                            <h3 className="font-black text-xs text-[var(--primary-accent)] uppercase tracking-wider mb-1">Advanced Archive.org Options</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Collection Filter</label>
                                    <div className="relative">
                                        <select 
                                            value={archiveCollection} 
                                            onChange={(e) => setArchiveCollection(e.target.value)}
                                            className="w-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 pr-8 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]/50 appearance-none cursor-pointer font-medium hover:bg-white/5 transition-all"
                                        >
                                            <option value="all">All Archive</option>
                                            <option value="etree">Live Music Archive (etree)</option>
                                            <option value="78rpm">Vintage 78 RPMs</option>
                                            <option value="netlabels">Netlabels (Indie releases)</option>
                                            <option value="classicalmusi">Classical Masters</option>
                                            <option value="smithsonian">Smithsonian Folkways</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Sort Order</label>
                                    <div className="relative">
                                        <select 
                                            value={archiveSort} 
                                            onChange={(e) => setArchiveSort(e.target.value)}
                                            className="w-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 pr-8 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]/50 appearance-none cursor-pointer font-medium hover:bg-white/5 transition-all"
                                        >
                                            <option value="downloads desc">Most Popular (Downloads)</option>
                                            <option value="date desc">Newest Uploads</option>
                                            <option value="title">Title (Alphabetical)</option>
                                            <option value="creator">Artist (Alphabetical)</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Audio Format</label>
                                    <div className="relative">
                                        <select 
                                            value={archiveFormat} 
                                            onChange={(e) => setArchiveFormat(e.target.value)}
                                            className="w-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs rounded-xl p-2.5 pr-8 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)]/50 appearance-none cursor-pointer font-medium hover:bg-white/5 transition-all"
                                        >
                                            <option value="all">All Audio Formats</option>
                                            <option value="MP3">Standard MP3</option>
                                            <option value="FLAC">Lossless FLAC</option>
                                            <option value="Ogg Vorbis">Ogg Vorbis</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {isSearchFocused && searchTerm.length === 0 && (
                        <SearchHistory history={history} onSelect={(term) => { setSearchTerm(term); handleSearch(term); setIsSearchFocused(false); }} onClear={clearHistory} />
                    )}
                </div>
                {hasSearched ? (
                    isLoading ? <OnlineSearchLoader /> : renderSearchResults()
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        {/* PREMIUM LIVE TRENDING CHARTS (Phase 2 - Prompts 1 & 3) */}
                        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-xl hover:border-white/20 transition-all duration-300">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                        <Flame className="text-purple-400 animate-pulse fill-purple-400/20" size={22} />
                                        <span>Live Trending Charts</span>
                                    </h2>
                                    <p className="text-xs text-neutral-400 mt-1">Real chart data via Deezer API (Africa & Global) · iTunes RSS (US) · 30-second previews</p>
                                </div>

                                {/* Country chips */}
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { code: 'tz', flag: '🇹🇿', name: 'Tanzania' },
                                        { code: 'ke', flag: '🇰🇪', name: 'Kenya' },
                                        { code: 'ng', flag: '🇳🇬', name: 'Nigeria' },
                                        { code: 'za', flag: '🇿🇦', name: 'S. Africa' },
                                        { code: 'us', flag: '🇺🇸', name: 'US Hits' },
                                        { code: 'global', flag: '🌐', name: 'Global' }
                                    ].map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => setActiveChartTab(c.code)}
                                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                                                activeChartTab === c.code
                                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                                                    : 'bg-white/[0.04] text-neutral-300 border border-white/5 hover:bg-white/[0.08]'
                                            }`}
                                        >
                                            <span>{c.flag}</span>
                                            <span>{c.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {chartSongsLoading ? (
                                /* SKELETON LOADER */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5">
                                            <div className="h-12 w-12 bg-white/10 rounded-xl" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-32 bg-white/10 rounded" />
                                                <div className="h-3 w-20 bg-white/10 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : chartSongs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {chartSongs.map((song, index) => {
                                        const hasAudio = !!song.url;
                                        return (
                                        <div 
                                            key={song.id} 
                                            className={`group relative flex items-center gap-3 p-3 rounded-2xl bg-white/[0.01] border border-white/5 transition-all duration-300 ${hasAudio ? 'hover:bg-white/[0.05] hover:border-white/10 cursor-pointer' : ''}`}
                                        >
                                            {/* Rank Badge */}
                                            <div className={`text-sm font-black w-6 text-center flex-shrink-0 ${
                                                index === 0 ? 'text-yellow-400' : index === 1 ? 'text-neutral-300' : index === 2 ? 'text-amber-600' : 'text-neutral-500'
                                            }`}>
                                                {index + 1}
                                            </div>

                                            {/* Art */}
                                            <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-neutral-900 shadow-md flex-shrink-0">
                                                <img 
                                                    src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                                                    alt={song.title} 
                                                    className="h-full w-full object-cover animate-in fade-in" 
                                                    onError={(e) => { e.currentTarget.src = getPremiumGradientCover(song.title, song.artist) }}
                                                />
                                                {hasAudio && (
                                                    <button 
                                                        onClick={() => onPlaySong(song, chartSongs.filter(s => !!s.url))}
                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                                                    >
                                                        <Play size={16} className="text-white fill-white ml-0.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Song metadata */}
                                            <div className="flex-1 min-w-0" onClick={() => hasAudio && onPlaySong(song, chartSongs.filter(s => !!s.url))}>
                                                <h4 className={`text-xs font-bold text-white truncate transition-colors ${hasAudio ? 'group-hover:text-purple-300 cursor-pointer' : ''}`}>{song.title}</h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className="text-[10px] text-neutral-400 truncate">{song.artist}</p>
                                                    {song.source && <span className="text-[8px] text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded-full flex-shrink-0 hidden sm:block">{song.source}</span>}
                                                </div>
                                            </div>

                                            {/* Play or No-Preview indicator */}
                                            {hasAudio ? (
                                                <button
                                                    onClick={() => onPlaySong(song, chartSongs.filter(s => !!s.url))}
                                                    className="p-2 rounded-full bg-white/[0.04] text-neutral-400 hover:bg-purple-500 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                                                    title={`Play ${song.title} preview`}
                                                >
                                                    <Play size={12} className="fill-current ml-0.5" />
                                                </button>
                                            ) : (
                                                <span className="text-[9px] text-neutral-600 border border-neutral-700 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap">No Preview</span>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-xs text-neutral-500 text-center py-6">
                                    No live charts available for this region. Check server connection.
                                </div>
                            )}
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><History size={24} className="text-[var(--primary-accent)]" /> Archive & Specialty Sources</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <button onClick={() => { setIsBackgroundMusicSearch(false); handleSearch('audiobook', false); }} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
                                    <div className="z-10">
                                        <h3 className="text-xl font-bold">LibriVox</h3>
                                        <p className="text-sm text-white/80 max-w-xs">Free audiobooks & spoken word.</p>
                                    </div>
                                    <Brain size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
                                </button>
                                <button onClick={() => { setIsBackgroundMusicSearch(false); handleSearch('classical symphony', false, 'classical'); }} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
                                    <div className="z-10">
                                        <h3 className="text-xl font-bold">Classical Masters</h3>
                                        <p className="text-sm text-white/80 max-w-xs">Timeless orchestral works.</p>
                                    </div>
                                    <Music size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
                                </button>
                                <button onClick={() => { setIsBackgroundMusicSearch(false); handleSearch('jazz swing', false, 'jazz'); }} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-800 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
                                    <div className="z-10">
                                        <h3 className="text-xl font-bold">Jazz Archive</h3>
                                        <p className="text-sm text-white/80 max-w-xs">Vintage blues & swing vibes.</p>
                                    </div>
                                    <Radio size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
                                </button>
                                <button onClick={() => { setIsBackgroundMusicSearch(false); handleSearch('lofi', false); }} className="relative w-full p-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
                                    <div className="z-10">
                                        <h3 className="text-xl font-bold">Audius</h3>
                                        <p className="text-sm text-white/80 max-w-xs">Independent artist community.</p>
                                    </div>
                                    <Sparkles size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
                                </button>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles size={24} className="text-[var(--primary-accent)]" /> Discover</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <AIPlaylistCard onClick={onPlayAiPlaylist} isLoading={isGeneratingAiPlaylist} />
                                <RadioCard onClick={() => onNavigate('Radio')} />
                                <AIStudioCard onClick={() => onNavigate('Create')} />
                                <BackgroundMusicCard onClick={() => { setIsBackgroundMusicSearch(true); handleSearch('background music'); }} />
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4">Moods</h2>
                            <div ref={moodScrollerRef} className="prompt-scroller pb-4 gpu-accelerated-scroll -mx-6 px-6">
                                <div ref={moodContentRef} className="slow-scroll-horizontal-content gap-3 w-fit">
                                    {renderMoodList('set1')}
                                    {/* Duplicate for infinite loop effect */}
                                    {renderMoodList('set2')}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
            
            {isNowPlayingInView && (
                <div className="fixed bottom-[calc(var(--footer-height)+6rem)] right-6 z-50">
                    <BubbleButton onClick={handleJumpToSong} className="!p-0 !w-14 !h-14 flex items-center justify-center" title="Jump to current song">
                        <Crosshair size={24} />
                    </BubbleButton>
                </div>
            )}
        </main>
    );
};

export default OnlineDiscoveryView;
