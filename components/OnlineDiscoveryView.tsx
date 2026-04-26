
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Song, ProfileData } from '../types.ts';
import { fetchFromAudius, fetchFromArchive, fetchFromJamendo } from './db.ts';
import OnlineSearchLoader from './OnlineSearchLoader.tsx';
import SongDetailsModal from './SongDetailsModal.tsx';

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
        const cleanedTerm = term.trim();
        if (!cleanedTerm) return;

        setHistory(prev => {
            const newHistory = [cleanedTerm, ...prev.filter(item => item.toLowerCase() !== cleanedTerm.toLowerCase())].slice(0, 8);
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(newHistory));
            } catch (error) {
                console.error("Error saving search history to localStorage", error);
            }
            return newHistory;
        });
    }, [storageKey]);
    
    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            window.localStorage.removeItem(storageKey);
        } catch (error) {
            console.error("Error clearing search history from localStorage", error);
        }
    }, [storageKey]);

    return { history, addSearchTerm, clearHistory };
};

const SearchHistory: React.FC<{ history: string[]; onSelect: (term: string) => void; onClear: () => void; }> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) return null;

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-color)] border border-[var(--surface-border-color)] rounded-2xl shadow-lg z-20 p-2">
            <div className="flex justify-between items-center px-2 pb-1 mb-1 border-b border-[var(--surface-border-color)]">
                <h3 className="text-xs font-bold text-neutral-400">Recent Searches</h3>
                <button onClick={onClear} className="text-xs text-red-400 hover:text-red-500">Clear</button>
            </div>
            <ul className="max-h-48 overflow-y-auto scroll-container">
                {history.map(term => (
                    <li key={term}>
                        <button onClick={() => onSelect(term)} className="w-full text-left p-2 rounded-md hover:bg-white/10 flex items-center gap-3">
                            <i className="fas fa-history text-neutral-400"></i>
                            <span>{term}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
interface OnlineDiscoveryViewProps {
    profile: ProfileData | null;
    librarySongs: Song[];
    onPlaySong: (song: Song, context: Song[]) => void;
    onAddSongs: (songs: Song[]) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error', icon?: string) => void;
    onNavigate: (view: string) => void;
    onPlayAiPlaylist: () => void;
    isGeneratingAiPlaylist: boolean;
    isAiDisabled?: boolean;
    initialSearchQuery?: string;
    onClearInitialSearch?: () => void;
    onOpenSongDetails: (song: Song) => void;
}

const SkeletonLoader: React.FC = () => (
    <div className="flex items-center gap-4 p-2">
        <div className="w-14 h-14 rounded-md bg-white/10 animate-pulse"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse"></div>
            <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse"></div>
        </div>
    </div>
);

const truncate = (str: string, len: number) => str.length > len ? `${str.substring(0, len)}...` : str;

const SongRow: React.FC<{ song: Song; onPlay: () => void; onDownload: () => void; isDownloading: boolean; onOpenDetails: () => void; }> = ({ song, onPlay, onDownload, isDownloading, onOpenDetails }) => {
    const ref = useRef<HTMLDivElement>(null);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('list-item-fade-in');
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.1 });
        if (ref.current) observer.observe(ref.current);
        return () => { if (ref.current) observer.unobserve(ref.current); };
    }, []);

     useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                const isOverflowing = titleRef.current.scrollWidth > titleContainerRef.current.clientWidth;
                setIsTitleOverflowing(isOverflowing);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => { clearTimeout(timeoutId); window.removeEventListener('resize', checkOverflow); };
    }, [song.title]);

    return (
        <div ref={ref} className="idle-ui-container flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--surface-color)] transition-colors opacity-0">
            <button onClick={onOpenDetails} className="p-0 border-none bg-transparent rounded-md flex-shrink-0">
                <img src={song.albumArtUrl} alt={song.title} className="w-14 h-14 rounded-md bg-[var(--chip-bg)] object-cover" />
            </button>
            <div className="flex-1 min-w-0" onClick={onPlay}>
                <div ref={titleContainerRef} className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                    <p ref={titleRef} className="marquee-content font-bold cursor-pointer leading-tight">{song.title}</p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-neutral-400 cursor-pointer truncate">{song.artist}</p>
                    <span className="text-[10px] text-neutral-500 bg-black/20 px-1.5 py-0.5 rounded-full truncate flex-shrink-0">from {song.source}</span>
                </div>
            </div>
             <div className="flex items-center idle-ui-fade">
                {isDownloading ? (
                    <div className="w-12 h-12 rounded-full text-neutral-400 flex items-center justify-center" aria-label={`Downloading ${song.title}`}>
                        <i className="fas fa-spinner fa-spin text-lg"></i>
                    </div>
                ) : (
                    <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="w-12 h-12 rounded-full text-neutral-400 hover:text-white flex items-center justify-center" aria-label={`Download ${song.title}`} title={`Download to Library`}>
                        <i className="fas fa-download text-lg"></i>
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="w-12 h-12 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center ml-1" aria-label={`Play ${song.title}`} title={`Play ${song.title}`}>
                    <i className="fas fa-play text-lg"></i>
                </button>
            </div>
        </div>
    );
};

const OnlineDiscoveryView: React.FC<OnlineDiscoveryViewProps> = ({ profile, librarySongs, onPlaySong, onAddSongs, showNotification, onNavigate, onPlayAiPlaylist, isGeneratingAiPlaylist, isAiDisabled, initialSearchQuery, onClearInitialSearch, onOpenSongDetails }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pages, setPages] = useState({ audius: 1, archive: 1, jamendo: 1 });
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef(null);
    const searchRef = useRef('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { history, addSearchTerm, clearHistory } = useSearchHistory('onlineDiscoverySearchHistory');
    const [error, setError] = useState<string | null>(null);
    const [viewAllRecentlyPlayed, setViewAllRecentlyPlayed] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [detailsSong, setDetailsSong] = useState<Song | null>(null);

    useEffect(() => {
        if (initialSearchQuery && onClearInitialSearch) {
            setSearchTerm(initialSearchQuery);
            onClearInitialSearch();
        }
    }, [initialSearchQuery, onClearInitialSearch]);

    const moods = [
        { name: 'Happy', emoji: '😊', query: 'happy upbeat' }, { name: 'Sad', emoji: '😢', query: 'sad emotional' },
        { name: 'Energetic', emoji: '🔥', query: 'energetic workout' }, { name: 'Chill', emoji: '❄️', query: 'chill relax' },
        { name: 'Focus', emoji: '🧠', query: 'focus instrumental' }, { name: 'Party', emoji: '🎉', query: 'party dance' },
    ];

    const search = useCallback(async (query: string, page: number = 1) => {
        if (!query) return;
        setIsLoading(true);
        setError(null);
        if (page === 1) setResults([]);
        setHasMore(true);

        try {
            const [audius, archive, jamendo] = await Promise.all([
                fetchFromAudius(query, page, 15),
                fetchFromArchive(query, page, 10),
                fetchFromJamendo(query, page, 15)
            ]);

            if (audius.length === 0 && archive.length === 0 && jamendo.length === 0) {
                setHasMore(false);
            }
            
            const maxLength = Math.max(audius.length, archive.length, jamendo.length);
            const interleaved: Song[] = [];
            for (let i = 0; i < maxLength; i++) {
                if (jamendo[i]) interleaved.push(jamendo[i]);
                if (audius[i]) interleaved.push(audius[i]);
                if (archive[i]) interleaved.push(archive[i]);
            }
            
            setResults(prev => page === 1 ? interleaved : [...prev, ...interleaved]);
        } catch (err) {
            setError("Search failed. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm !== searchRef.current) {
                searchRef.current = searchTerm;
                if (searchTerm) addSearchTerm(searchTerm);
                setPages({ audius: 1, archive: 1, jamendo: 1 });
                search(searchTerm, 1);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm, search, addSearchTerm]);

    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading && hasMore && searchTerm) {
            const nextPage = Math.max(pages.audius, pages.archive, pages.jamendo) + 1;
            setPages({ audius: nextPage, archive: nextPage, jamendo: nextPage });
            search(searchTerm, nextPage);
        }
    }, [isLoading, hasMore, searchTerm, pages, search]);

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, { root: null, rootMargin: "20px", threshold: 1.0 });
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
    }, [handleObserver]);

    const handleMoodClick = (query: string) => {
        setSearchTerm(query);
    };

    const handleDownloadSong = async (songToDownload: Song) => {
        if (!songToDownload.url || downloadingId) return;
        
        setDownloadingId(songToDownload.id);
        showNotification(`Downloading "${truncate(songToDownload.title, 20)}"...`, 'info', 'fa-download');
        try {
            const response = await fetch(songToDownload.url);
            if (!response.ok) throw new Error("Network response was not ok.");
            const audioData = await response.arrayBuffer();

            const existingSongInLibrary = librarySongs.find(s => s.id === songToDownload.id);

            const newSong: Song = {
                ...songToDownload,
                isFavorite: existingSongInLibrary?.isFavorite || songToDownload.isFavorite || false,
                audioData,
                dateAdded: Date.now(),
            };
            delete newSong.url; 

            onAddSongs([newSong]);
            showNotification(`"${truncate(newSong.title, 20)}" added!`, 'success', 'fa-check-circle');
            onNavigate('Library');
        } catch (error) {
            console.error("Download failed:", String(error));
            showNotification("Failed to download song.", 'error', 'fa-exclamation-triangle');
        } finally {
            setDownloadingId(null);
        }
    };

    const renderError = (message: string) => (
        <div className="text-center py-16 text-neutral-400">
            <i className="fas fa-wifi-slash text-4xl mb-4 text-red-400"></i>
            <p className="font-bold">{message}</p>
            <p className="text-sm mt-2">Please check your internet connection and try again.</p>
        </div>
    );
    
    const recentlyPlayedOnlineSongs = profile?.recentlyPlayedOnline || [];

    return (
      <>
        <main className="h-full w-full home-gradient-bg flex flex-col">
            <div className="flex-shrink-0 p-4 sticky top-0 bg-[var(--bg-color)]/80 backdrop-blur-md z-10">
                <header className="mb-4">
                    <h1 className="text-2xl font-bold">Explore Online</h1>
                    <p className="text-sm text-neutral-400">Discover new music with Mwijay Music</p>
                </header>
                <div 
                    className="relative"
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setIsSearchFocused(false);
                            addSearchTerm(searchTerm);
                        }
                    }}
                >
                    <input type="text" placeholder="Search Audius, Jamendo, Archive.org..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} className="w-full bg-[var(--chip-bg)] rounded-full py-2.5 pl-12 pr-4 text-white placeholder-neutral-400 border-2 border-transparent focus:outline-none cosmic-search" />
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"></i>
                    {isSearchFocused && searchTerm.length === 0 && (
                        <SearchHistory 
                            history={history}
                            onSelect={(term) => { setSearchTerm(term); setIsSearchFocused(false); }}
                            onClear={clearHistory}
                        />
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto scroll-container px-4 pb-40">
                {searchTerm ? (
                     <>
                        {isLoading && results.length === 0 ? (
                            <OnlineSearchLoader />
                        ) : (
                             results.length > 0 && (
                                <div className="space-y-2 py-2">
                                    {results.map(song => <SongRow key={song.id} song={song} onPlay={() => onPlaySong(song, results)} onDownload={() => handleDownloadSong(song)} isDownloading={song.id === downloadingId} onOpenDetails={() => setDetailsSong(song)} />)}
                                </div>
                            )
                        )}
                        
                        {isLoading && results.length > 0 && (
                             <div className="space-y-2 py-2">
                                {Array.from({ length: 3 }).map((_, i) => <SkeletonLoader key={i} />)}
                            </div>
                        )}
                        
                        {!isLoading && results.length === 0 && !error && (
                            <div className="text-center py-16 text-neutral-400">
                                <i className="fas fa-compact-disc text-4xl mb-4"></i>
                                <p>No results found for "{searchTerm}".</p>
                            </div>
                        )}
                        {error && renderError(error)}
                        <div ref={loaderRef} />
                    </>
                ) : (
                    <div className="py-4 space-y-8">
                         <section>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => onNavigate('Radio')} className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-lg flex items-center gap-4 transition-transform hover:scale-105">
                                    <i className="fas fa-tower-broadcast text-3xl"></i>
                                    <span className="font-bold">Live Radio</span>
                                </button>
                                {!isAiDisabled && (
                                    <button onClick={onPlayAiPlaylist} disabled={isGeneratingAiPlaylist} className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 rounded-lg flex items-center gap-4 transition-transform hover:scale-105 disabled:opacity-70">
                                        {isGeneratingAiPlaylist ? <i className="fas fa-spinner fa-spin text-3xl"></i> : <i className="fas fa-wand-magic-sparkles text-3xl"></i>}
                                        <span className="font-bold">{isGeneratingAiPlaylist ? 'Creating...' : 'AI Playlist'}</span>
                                    </button>
                                )}
                            </div>
                        </section>
                        
                        {viewAllRecentlyPlayed ? (
                             <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">Recently Played Online</h2>
                                    <button onClick={() => setViewAllRecentlyPlayed(false)} className="text-sm font-bold text-[var(--primary-accent)]">Show Less</button>
                                </div>
                                <div className="space-y-2">
                                    {recentlyPlayedOnlineSongs.map(song => <SongRow key={song.id} song={song} onPlay={() => onPlaySong(song, recentlyPlayedOnlineSongs)} onDownload={() => handleDownloadSong(song)} isDownloading={song.id === downloadingId} onOpenDetails={() => setDetailsSong(song)} />)}
                                </div>
                            </section>
                        ) : (
                            recentlyPlayedOnlineSongs.length > 0 && (
                                <section>
                                    <h2 className="text-xl font-bold mb-4">Recently Played Online</h2>
                                    <div className="flex overflow-x-auto gap-4 -mx-4 px-4 pb-2 scroll-container">
                                        {recentlyPlayedOnlineSongs.slice(0, 8).map(song => (
                                            <button key={song.id} onClick={() => onPlaySong(song, recentlyPlayedOnlineSongs)} className="flex-shrink-0 w-32 text-left group" title={`Play ${song.title}`}>
                                                <img src={song.albumArtUrl} alt={song.title} className="w-32 h-32 rounded-lg object-cover mb-2 transition-transform group-hover:scale-105" />
                                                <p className="text-sm font-bold truncate">{song.title}</p>
                                                <p className="text-xs text-neutral-300 truncate">{song.artist}</p>
                                            </button>
                                        ))}
                                        {recentlyPlayedOnlineSongs.length > 8 && (
                                             <button onClick={() => setViewAllRecentlyPlayed(true)} className="flex-shrink-0 w-32 h-32 rounded-lg bg-[var(--chip-bg)] flex flex-col items-center justify-center text-center p-2 group transition-colors hover:bg-[var(--surface-color)]" title="View all recently played online music">
                                                 <i className="fas fa-arrow-right text-3xl text-[var(--primary-accent)]"></i>
                                                 <p className="font-bold mt-3 text-sm">View All</p>
                                            </button>
                                        )}
                                    </div>
                                </section>
                            )
                        )}
                        
                        <section>
                             <h2 className="text-xl font-bold mb-4">Browse by Mood</h2>
                             <div className="grid grid-cols-2 gap-4">
                                {moods.map(mood => (
                                    <button key={mood.name} onClick={() => handleMoodClick(mood.query)} className="bg-[var(--surface-color)] p-4 rounded-lg flex items-center gap-4 transition-transform hover:scale-105">
                                        <span className="text-3xl">{mood.emoji}</span>
                                        <span className="font-bold">{mood.name}</span>
                                    </button>
                                ))}
                             </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
        {detailsSong && (
            <SongDetailsModal
                song={detailsSong}
                onClose={() => setDetailsSong(null)}
                isOnlineSong={true}
                onSave={(updatedSong) => {
                    handleDownloadSong(updatedSong);
                    setDetailsSong(null);
                }}
                onSharePreview={() => {
                    if (detailsSong) onOpenSongDetails(detailsSong);
                }}
            />
        )}
      </>
    );
};

export default OnlineDiscoveryView;
