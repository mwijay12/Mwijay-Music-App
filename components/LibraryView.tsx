
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { History, Filter, RefreshCw, Search, Heart, Plus, Gamepad2, FolderOpen, Upload, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LibraryFilters, FilterOption } from './LibraryFilters.tsx';
import type { Song, Playlist, Video } from '../types.ts';
import { FAVORITES_PLAYLIST_ID } from './constants.ts';
import SongListItem from './SongListItem.tsx';
import ScrollToCurrentFab from './ScrollToCurrentFab.tsx';
import HorizontalSongScroller from './HorizontalSongScroller.tsx';
import BubbleButton from './BubbleButton.tsx';

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

const PlaylistCard: React.FC<{ playlist: Playlist; onClick: () => void; isFavorite?: boolean }> = ({ playlist, onClick, isFavorite }) => (
    <button onClick={onClick} className={`playlist-card relative rounded-2xl overflow-hidden text-white flex flex-col items-center justify-center p-2 text-center transition-all hover:scale-105 glare-effect flex-shrink-0 h-28 w-28 md:h-34 md:w-34 border ${isFavorite ? 'bg-gradient-to-br from-red-600 to-pink-700 border-red-400' : 'bg-[var(--surface-color)] border-[var(--surface-border-color)]'}`}>
        {!isFavorite && <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-[var(--primary-accent)] to-transparent pointer-events-none"></div>}
        {isFavorite && <Heart className="z-10 mb-1 fill-white" size={24} />}
        <span className="z-10 font-bold text-base leading-tight truncate w-full px-2">{playlist.name}</span>
        <span className={`z-10 text-xs mt-1 ${isFavorite ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>{playlist.songIds.length} songs</span>
        <span className="absolute right-1 -bottom-2 text-6xl opacity-10 z-0 select-none transform -rotate-12 grayscale">{playlist.emoji}</span>
    </button>
);

const LibraryActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; color?: string }> = ({ icon, label, onClick, color = "text-[var(--text-primary)]" }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 group">
        <div className={`w-14 h-14 rounded-2xl bg-[var(--surface-color)] flex items-center justify-center shadow-md border border-[var(--surface-border-color)] group-active:scale-95 transition-transform ${color}`}>
            {icon}
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
    </button>
);


interface LibraryViewProps {
  songs: Song[];
  playlists: Playlist[];
  recentlyPlayedSongs: Song[];
  mostPlayedSongs: Song[];
  videos: Video[];
  onPlayVideo: (videoId: string) => void;
  onPlaySong: (song: Song, context: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  onCreatePlaylist: () => void;
  onViewPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onOpenSongDetails: (song: Song) => void;
  onViewArtist: (artistName: string) => void;
  onPlayPlaylistRadio?: (playlist: Playlist) => void;
  recentlyAddedSongId: string | null;
  onScanDevice: () => void;
  onScanFolder: () => void;
  onAddSongs: () => void;
  onNavigate: (view: string) => void;
  nowPlaying: Song | null;
  isPlaying: boolean;
  onOpenMusicQuiz?: () => void;
  onOpenLyrics?: (song: Song) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ songs, playlists, recentlyPlayedSongs, mostPlayedSongs, videos, onPlayVideo, onPlaySong, onAddToQueue, onCreatePlaylist, onViewPlaylist, onOpenSongDetails, onViewArtist, recentlyAddedSongId, onScanDevice, onScanFolder, onAddSongs, onNavigate, nowPlaying, isPlaying, onOpenMusicQuiz, onOpenLyrics }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [isSourceFilterOpen, setIsSourceFilterOpen] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { history, addSearchTerm, clearHistory } = useSearchHistory('librarySearchHistory');

    // Advanced sorting and filtering state
    const [sortBy, setSortBy] = useState<'recently-added' | 'most-played' | 'a-z' | 'z-a' | 'longest' | 'shortest'>('recently-added');
    const [filters, setFilters] = useState<FilterOption>({});

    const [quizStats, setQuizStats] = useState({ won: 0, accuracy: 0 });

    useEffect(() => {
        const won = parseInt(localStorage.getItem('mwijay_quiz_games_won') || '0', 10);
        const attempted = parseInt(localStorage.getItem('mwijay_quiz_questions_attempted') || '0', 10);
        const correct = parseInt(localStorage.getItem('mwijay_quiz_questions_correct') || '0', 10);
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
        setQuizStats({ won, accuracy });
    }, []);

    useEffect(() => {
        if (recentlyAddedSongId) {
            setHighlightedSongId(recentlyAddedSongId);
            setTimeout(() => setHighlightedSongId(null), 2000);
        }
    }, [recentlyAddedSongId]);

    // Helper functions for advanced filters
    const COMMON_SOURCES = useMemo(() => ['download', 'music', 'recordings', 'whatsapp', 'dcim', 'ringtones', 'notifications', 'alarms'], []);

    const extractSourceFromUrl = useCallback((url: string): string | null => {
        if (!url) return null;
        const parts = url.toLowerCase().split('/');
        for (let i = parts.length - 2; i >= 0; i--) {
            if (COMMON_SOURCES.includes(parts[i])) {
                return parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
            }
        }
        return null;
    }, [COMMON_SOURCES]);

    const getSongSource = useCallback((song: Song): string => {
        if (song.source) return song.source.toLowerCase();
        if (song.nativeUrl) {
            const source = extractSourceFromUrl(song.nativeUrl);
            if (source) return source.toLowerCase();
            return 'local';
        }
        return 'local';
    }, [extractSourceFromUrl]);

    // Metrics for Favorites premium card
    const favoritesPlaylist = useMemo(() => playlists.find(p => p.id === FAVORITES_PLAYLIST_ID), [playlists]);

    const filteredSongs = useMemo(() => {
        let result = [...songs];
        
        // Search filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(s => s.title.toLowerCase().includes(lower) || s.artist.toLowerCase().includes(lower));
        }
        
        // Source filter
        if (filters.source?.length) {
            result = result.filter(s => filters.source!.includes(getSongSource(s)));
        }
        
        // Liked filter
        if (filters.liked) {
            result = result.filter(s => s.isFavorite || (favoritesPlaylist && favoritesPlaylist.songIds.includes(s.id)));
        }

        // Downloaded filter
        if (filters.downloaded) {
            result = result.filter(s => !!s.nativeUrl);
        }
        
        // Sort
        switch (sortBy) {
            case 'recently-added':
                result.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
                break;
            case 'most-played':
                result.sort((a, b) => {
                    const idxA = mostPlayedSongs.findIndex(s => s.id === a.id);
                    const idxB = mostPlayedSongs.findIndex(s => s.id === b.id);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    return (b.dateAdded || 0) - (a.dateAdded || 0);
                });
                break;
            case 'a-z':
                result.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'z-a':
                result.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'longest':
                result.sort((a, b) => (b.duration || 0) - (a.duration || 0));
                break;
            case 'shortest':
                result.sort((a, b) => (a.duration || 0) - (b.duration || 0));
                break;
            default:
                result.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
                break;
        }
        
        return result;
    }, [songs, searchTerm, filters, sortBy, favoritesPlaylist, mostPlayedSongs, getSongSource]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.source?.length) count += filters.source.length;
        if (filters.genre?.length) count += filters.genre.length;
        if (filters.liked) count++;
        if (filters.downloaded) count++;
        return count;
    }, [filters]);

    const availableSources = useMemo(() => {
        const sourceSet = new Set<string>();
        songs.forEach(song => {
            const src = getSongSource(song);
            if (src) {
                sourceSet.add(src);
            }
        });
        return Array.from(sourceSet).sort();
    }, [songs, getSongSource]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        addSearchTerm(term);
    };

    const handleScrollToCurrent = () => {
        if (nowPlaying) {
            const el = document.getElementById(`library-song-${nowPlaying.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedSongId(nowPlaying.id);
                setTimeout(() => setHighlightedSongId(null), 2000);
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const recentlyAddedSongs = useMemo(() => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return songs.filter(s => (s.dateAdded || 0) > sevenDaysAgo).sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0)).slice(0, 10);
    }, [songs]);

    // Metrics for Favorites premium card
    const favoritesCount = useMemo(() => favoritesPlaylist?.songIds.length || 0, [favoritesPlaylist]);
    const favoritesDurationStr = useMemo(() => {
        if (!favoritesPlaylist) return '0m';
        const favSongs = songs.filter(s => favoritesPlaylist.songIds.includes(s.id));
        const totalSecs = favSongs.reduce((sum, s) => sum + (s.duration || 0), 0);
        if (totalSecs === 0) return '0m';
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.round((totalSecs % 3600) / 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }, [favoritesPlaylist, songs]);

    return (
        <>
        <main 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full w-full home-gradient-bg overflow-y-auto"
        >
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''} max-w-7xl mx-auto w-full`}>
                <h1 className="header-big-title">Your Library</h1>
                <h2 className="header-small-title">Library</h2>
                <div className="header-actions-right flex items-center gap-2">
                    <button onClick={() => setIsSourceFilterOpen(true)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeFilter ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--surface-color)] text-[var(--text-primary)]'}`} title="Filter by source">
                        <Filter size={20} />
                    </button>
                    <button onClick={onScanFolder} className="w-10 h-10 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] hover:bg-white/20" title="Scan folder (Web/Desktop)">
                        <FolderOpen size={20} />
                    </button>
                    <button onClick={onScanDevice} className="w-10 h-10 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] hover:bg-white/20" title="Scan device (Mobile)">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <div className="px-6 pb-40 scroll-content-with-header flex-1 max-w-7xl mx-auto w-full">
                <div className="relative mb-4" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setIsSearchFocused(false); }}}>
                    <div className="cosmic-search">
                        <input 
                            type="text" 
                            placeholder="Search songs, artists..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch(searchTerm)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full bg-[var(--surface-color)] rounded-full py-2.5 pl-10 pr-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)] border-2 border-transparent focus:outline-none"
                        />
                    </div>
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
                    {isSearchFocused && searchTerm.length === 0 && (
                        <SearchHistory history={history} onSelect={(term) => { setSearchTerm(term); setIsSearchFocused(false); }} onClear={clearHistory} />
                    )}
                </div>

                {/* Advanced Sort & Filters controls */}
                <div className="library-controls mb-4 flex items-center justify-between gap-4">
                  <div className="library-sort flex items-center gap-2 flex-1">
                    <label className="library-sort-label text-xs text-[var(--text-secondary)] whitespace-nowrap">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="library-sort-select flex-1 bg-[var(--surface-color)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="recently-added">Recently Added</option>
                      <option value="most-played">Most Played</option>
                      <option value="a-z">Title A-Z</option>
                      <option value="z-a">Title Z-A</option>
                      <option value="longest">Longest First</option>
                      <option value="shortest">Shortest First</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => setIsSourceFilterOpen(true)}
                    className={`library-filter-btn flex items-center gap-2 px-4 py-2 bg-[var(--surface-color)] hover:bg-white/10 border ${activeFilterCount > 0 ? 'border-[var(--primary-accent)] text-[var(--primary-accent)]' : 'border-white/10 text-[var(--text-primary)]'} rounded-xl text-sm transition-colors`}
                    aria-label="Open filters"
                  >
                    <Filter size={16} />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="filter-badge bg-red-500 text-white rounded-full text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Active filters chips */}
                <AnimatePresence>
                  {activeFilterCount > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="active-filters flex flex-wrap gap-2 mb-6 items-center"
                    >
                      {filters.source?.map(s => (
                        <div key={s} className="filter-chip flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white">
                          <span className="capitalize">{s}</span>
                          <button
                            onClick={() => 
                              setFilters(prev => {
                                const newSource = prev.source?.filter(x => x !== s) || [];
                                const newFilters = { ...prev, source: newSource };
                                if (newSource.length > 0) {
                                    setActiveFilter(newSource[0]);
                                } else {
                                    setActiveFilter(null);
                                }
                                return newFilters;
                              })
                            }
                            className="text-white/60 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {filters.liked && (
                        <div className="filter-chip flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white">
                          <span>❤️ Liked</span>
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, liked: false }))}
                            className="text-white/60 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {filters.downloaded && (
                        <div className="filter-chip flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white">
                          <span>📥 Downloaded</span>
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, downloaded: false }))}
                            className="text-white/60 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => {
                            setFilters({});
                            setActiveFilter(null);
                        }}
                        className="clear-all-filters text-red-400 hover:text-red-500 text-xs font-bold px-2 py-1"
                      >
                        Clear all
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ==================== MUSIC UNIVERSE PREMIUM CARDS ROW ==================== */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)]">Music Universe</h3>
                    </div>
                    <div className="flex overflow-x-auto gap-6 pb-6 pt-2 -mx-6 px-6 scroll-container no-scrollbar">
                        
                        {/* 1. FAVORITES CARD */}
                        <div className="card-frame card-favorites cursor-pointer" onClick={() => onViewPlaylist(FAVORITES_PLAYLIST_ID)}>
                            <div className="laser-border"></div>
                            <div className="card-body">
                                <div className="grid-overlay"></div>
                                <div className="sweep"></div>
                                <div className="particles">
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                </div>

                                <div className="card-icon">
                                    <div className="icon-glow"></div>
                                    🤍
                                </div>
                                <span className="card-tag">Collection</span>
                                <div className="card-title">Favorites</div>
                                <p className="card-desc">Your most loved tracks, all in one place. The songs that make your heart skip a beat.</p>

                                <div className="card-stats">
                                    <div className="stat">
                                        <span className="stat-num">{favoritesCount}</span>
                                        <span className="stat-label">Songs</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-num">{favoritesDurationStr}</span>
                                        <span className="stat-label">Duration</span>
                                    </div>
                                    <div className="music-bars">
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                    </div>
                                </div>

                                <button className="card-btn">❤️ Open Favorites</button>
                            </div>
                        </div>

                        {/* 2. MOST LISTENED CARD */}
                        <div className="card-frame card-listened">
                            <div className="laser-border"></div>
                            <div className="card-body">
                                <div className="grid-overlay"></div>
                                <div className="sweep"></div>
                                <div className="particles">
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                </div>

                                <div className="card-icon">
                                    <div className="icon-glow"></div>
                                    🔥
                                </div>
                                <span className="card-tag">Top Charts</span>
                                <div className="card-title">Most Listened</div>

                                <div className="mini-tracks">
                                    {mostPlayedSongs.slice(0, 3).map((song, i) => (
                                        <div key={song.id} className="mini-track cursor-pointer" onClick={() => onPlaySong(song, mostPlayedSongs)}>
                                            <span className="track-num">{`0${i + 1}`}</span>
                                            <div className="track-dot" style={{ background: song.albumArtUrl ? `url(${song.albumArtUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}></div>
                                            <div className="track-info">
                                                <div className="track-name">{song.title}</div>
                                                <div className="track-artist">{song.artist}</div>
                                            </div>
                                            <span className="track-duration">
                                                {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '3:00'}
                                            </span>
                                        </div>
                                    ))}
                                    {mostPlayedSongs.length === 0 && (
                                        <p className="text-[10px] text-white/40 italic py-5 text-center w-full">No play counts yet</p>
                                    )}
                                </div>

                                <button className="card-btn" onClick={() => mostPlayedSongs.length > 0 && onPlaySong(mostPlayedSongs[0], mostPlayedSongs)}>View All Tracks</button>
                            </div>
                        </div>

                        {/* 3. RECENTLY ADDED CARD */}
                        <div className="card-frame card-added">
                            <div className="laser-border"></div>
                            <div className="card-body">
                                <div className="grid-overlay"></div>
                                <div className="sweep"></div>
                                <div className="particles">
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                </div>

                                <div className="card-icon">
                                    <div className="icon-glow"></div>
                                    ✨
                                </div>
                                <span className="card-tag">Fresh Adds</span>
                                <div className="card-title">Recently Added</div>

                                <div className="new-badge">
                                    <div className="badge-dot"></div>
                                    {recentlyAddedSongs.length} new this week
                                </div>

                                <div className="album-grid">
                                    {recentlyAddedSongs.slice(0, 8).map(song => (
                                        <div key={song.id} className="album-thumb cursor-pointer" onClick={() => onPlaySong(song, recentlyAddedSongs)} style={{ background: song.albumArtUrl ? `url(${song.albumArtUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #06b6d4, #0891b2)' }}></div>
                                    ))}
                                    {recentlyAddedSongs.length === 0 && (
                                        <div className="col-span-4 text-center text-[10px] text-white/40 py-5 italic">No recent imports</div>
                                    )}
                                </div>

                                <div className="card-stats">
                                    <div className="stat">
                                        <span className="stat-num">{songs.length}</span>
                                        <span className="stat-label">Tracks</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-num">
                                            {Math.round(songs.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600 * 10) / 10}h
                                        </span>
                                        <span className="stat-label">Total</span>
                                    </div>
                                </div>

                                <button className="card-btn" onClick={() => recentlyAddedSongs.length > 0 && onPlaySong(recentlyAddedSongs[0], recentlyAddedSongs)}>Browse New</button>
                            </div>
                        </div>

                        {/* 4. RECENTLY PLAYED CARD */}
                        <div className="card-frame card-played">
                            <div className="laser-border"></div>
                            <div className="card-body">
                                <div className="grid-overlay"></div>
                                <div className="sweep"></div>
                                <div className="particles">
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                </div>

                                <div className="card-icon">
                                    <div className="icon-glow"></div>
                                    🎵
                                </div>
                                <span className="card-tag">History</span>
                                <div className="card-title">Recently Played</div>

                                {nowPlaying ? (
                                    <div className="now-playing">
                                        <div className="np-disc"></div>
                                        <div className="np-info">
                                            <div className="np-label">Now Playing</div>
                                            <div className="np-track truncate w-28">{nowPlaying.title}</div>
                                            <div className="progress-bar">
                                                <div className="progress-fill"></div>
                                            </div>
                                        </div>
                                        {isPlaying && (
                                            <div className="music-bars">
                                                <div className="bar"></div>
                                                <div className="bar"></div>
                                                <div className="bar"></div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-10 text-[10px] text-white/40 flex items-center justify-center italic">Ready to spin</div>
                                )}

                                <div className="mini-tracks">
                                    {recentlyPlayedSongs.slice(0, 2).map(song => (
                                        <div key={song.id} className="mini-track cursor-pointer" onClick={() => onPlaySong(song, recentlyPlayedSongs)}>
                                            <span className="track-num">●</span>
                                            <div className="track-dot" style={{ background: song.albumArtUrl ? `url(${song.albumArtUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #f97316, #ea580c)' }}></div>
                                            <div className="track-info">
                                                <div className="track-name truncate">{song.title}</div>
                                                <div className="track-artist truncate">{song.artist}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button className="card-btn" onClick={() => recentlyPlayedSongs.length > 0 && onPlaySong(recentlyPlayedSongs[0], recentlyPlayedSongs)}>View History</button>
                            </div>
                        </div>

                        {/* 5. CREATE PLAYLIST CARD */}
                        <div className="card-frame card-create cursor-pointer" onClick={onCreatePlaylist}>
                            <div className="laser-border"></div>
                            <div className="card-body">
                                <div className="grid-overlay"></div>
                                <div className="sweep"></div>
                                <div className="particles">
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                    <div className="particle"></div>
                                </div>
                                <div className="create-deco create-deco-1"></div>
                                <div className="create-deco create-deco-2"></div>

                                <div className="card-icon">
                                    <div className="icon-glow"></div>
                                    ＋
                                </div>
                                <span className="card-tag">New Playlist</span>
                                <div className="card-title">Create New</div>
                                <p className="card-desc">Start fresh. Build your perfect playlist from scratch with your favorite vibes.</p>

                                <button className="card-btn">Create Playlist</button>
                            </div>
                        </div>

                        {/* 6. BEAT QUEST CARD */}
                        {onOpenMusicQuiz && (
                            <div className="card-frame card-game cursor-pointer" onClick={onOpenMusicQuiz}>
                                <div className="laser-border"></div>
                                <div className="card-body">
                                    <div className="grid-overlay"></div>
                                    <div className="sweep"></div>
                                    <div className="particles">
                                        <div className="particle"></div>
                                        <div className="particle"></div>
                                        <div className="particle"></div>
                                        <div className="particle"></div>
                                        <div className="particle"></div>
                                    </div>

                                    <div className="card-icon">
                                        <div className="icon-glow"></div>
                                        🎮
                                    </div>
                                    <span className="card-tag">Music Game</span>
                                    <div className="card-title">Beat Quest</div>
                                    <p className="card-desc">Test your music knowledge. Guess the song, earn XP, unlock achievements!</p>

                                    <div className="xp-section">
                                        <div className="xp-header">
                                            <span className="xp-label">Level 12</span>
                                            <span className="xp-value">7.2k / 10k XP</span>
                                        </div>
                                        <div className="xp-bar">
                                            <div className="xp-fill"></div>
                                        </div>
                                    </div>

                                    <div className="achievements">
                                        <div className="achievement">🏆</div>
                                        <div className="achievement">⚡</div>
                                        <div className="achievement">🎯</div>
                                        <div className="achievement locked">🔒</div>
                                    </div>

                                    <div className="card-stats">
                                        <div className="stat">
                                            <span className="stat-num">{quizStats.won}</span>
                                            <span className="stat-label">Won</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-num">{quizStats.accuracy}%</span>
                                            <span className="stat-label">Acc</span>
                                        </div>
                                    </div>

                                    <button className="card-btn">🎮 Play Now</button>
                                </div>
                            </div>
                        )}

                    </div>
                </section>

                {/* ==================== PLAYLISTS DEDICATED SECTION ==================== */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)]">Your Playlists</h3>
                        <button onClick={onCreatePlaylist} className="text-xs text-[var(--primary-accent)] font-bold flex items-center gap-1">
                            <Plus size={14} /> New
                        </button>
                    </div>
                    <div className="flex overflow-x-auto gap-6 pb-6 pt-2 -mx-6 px-6 scroll-container no-scrollbar">
                        {playlists.filter(p => p.id !== FAVORITES_PLAYLIST_ID).map(playlist => {
                            const plSongs = songs.filter(s => playlist.songIds.includes(s.id));
                            const plSecs = plSongs.reduce((sum, s) => sum + (s.duration || 0), 0);
                            const plDurationStr = plSecs > 0 ? `${Math.round(plSecs / 60)}m` : '0m';
                            return (
                                <div 
                                    key={playlist.id} 
                                    onClick={() => onViewPlaylist(playlist.id)}
                                    className="card-frame card-custom-playlist cursor-pointer"
                                >
                                    <div className="laser-border"></div>
                                    <div className="card-body">
                                        <div className="grid-overlay"></div>
                                        <div className="sweep"></div>
                                        <div className="particles">
                                            <div className="particle"></div>
                                            <div className="particle"></div>
                                            <div className="particle"></div>
                                            <div className="particle"></div>
                                            <div className="particle"></div>
                                        </div>

                                        <div className="card-icon">
                                            <div className="icon-glow"></div>
                                            {playlist.emoji || '🎵'}
                                        </div>
                                        <span className="card-tag">Playlist</span>
                                        <div className="card-title truncate w-full">{playlist.name}</div>
                                        <p className="card-desc">Custom music collection tailored with your selected tracks and mood tags.</p>

                                        <div className="card-stats">
                                            <div className="stat">
                                                <span className="stat-num">{playlist.songIds.length}</span>
                                                <span className="stat-label">Songs</span>
                                            </div>
                                            <div className="stat">
                                                <span className="stat-num">{plDurationStr}</span>
                                                <span className="stat-label">Duration</span>
                                            </div>
                                        </div>

                                        <button className="card-btn">Open Playlist</button>
                                    </div>
                                </div>
                            );
                        })}
                        {playlists.filter(p => p.id !== FAVORITES_PLAYLIST_ID).length === 0 && (
                            <div className="w-full text-center py-10 bg-white/5 border border-white/10 rounded-2xl p-6">
                                <p className="text-sm text-[var(--text-secondary)]">Create your first custom playlist to get started!</p>
                                <button onClick={onCreatePlaylist} className="mt-3 text-xs text-[var(--primary-accent)] font-bold underline">Create Playlist</button>
                            </div>
                        )}
                    </div>
                </section>

                {/* ==================== DEDICATED VIDEOS & REELS SECTION ==================== */}
                {videos && videos.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)]">Reels & Videos</h3>
                            <button onClick={() => onNavigate('Reels')} className="text-xs text-[var(--primary-accent)] font-bold">
                                View All
                            </button>
                        </div>
                        <div className="flex overflow-x-auto gap-5 pb-4 -mx-6 px-6 scroll-container no-scrollbar">
                            {videos.map(video => (
                                <button
                                    key={video.id}
                                    onClick={() => onPlayVideo(video.id)}
                                    className="relative flex-shrink-0 w-48 h-32 rounded-2xl overflow-hidden border border-white/10 transition-transform hover:scale-105 group text-left shadow-lg"
                                >
                                    <div 
                                        className="absolute inset-0 w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                                        style={{ backgroundImage: `url(${video.thumbnailUrl || 'linear-gradient(135deg, #0f172a, #1e293b)'})` }}
                                    ></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                    <div className="absolute inset-0 flex flex-col justify-end p-3">
                                        <h4 className="text-xs font-bold text-white truncate w-full shadow-md">{video.title}</h4>
                                        <p className="text-[10px] text-neutral-300 shadow-md truncate">{video.uploader || "Mwijay Reels"}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs text-white">
                                        ▶
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Compacted manual upload button in blank state */}
                <ul className="space-y-1">
                    {filteredSongs.map(song => (
                        <SongListItem 
                            key={song.id} 
                            domId={`library-song-${song.id}`}
                            song={song} 
                            onPlaySong={() => onPlaySong(song, filteredSongs)} 
                            onAddToQueue={() => onAddToQueue(song)} 
                            onOpenDetails={() => onOpenSongDetails(song)}
                            onViewArtist={onViewArtist}
                            isHighlighted={highlightedSongId === song.id}
                            nowPlaying={nowPlaying}
                            isPlaying={isPlaying}
                            onOpenLyrics={onOpenLyrics ? () => onOpenLyrics(song) : undefined}
                        />
                    ))}
                    {filteredSongs.length === 0 && (
                        <div className="text-center py-16 px-6 bg-[var(--surface-color)] rounded-3xl border-2 border-dashed border-[var(--surface-border-color)]">
                            <div className="w-20 h-20 bg-[var(--primary-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--primary-accent)] animate-pulse">
                                <Search size={40} />
                            </div>
                            <h4 className="text-xl font-bold mb-3">No songs found</h4>
                            <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-sm mx-auto leading-relaxed">
                                {searchTerm || activeFilter 
                                    ? "We couldn't find any songs matching your search or filters. Try a different term or clear filters." 
                                    : "Your library is empty. Start your collection by scanning your device or uploading songs manually."}
                            </p>
                            
                            <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                <button 
                                    onClick={onAddSongs} 
                                    className="w-full h-11 bg-[var(--primary-accent)] hover:opacity-90 active:scale-[0.98] text-black font-extrabold rounded-full transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg shadow-[var(--primary-accent)]/10"
                                >
                                    <Plus size={18} /> Upload Manually
                                </button>
                                <button 
                                    onClick={() => onNavigate('Settings')}
                                    className="w-full py-4 rounded-full bg-white/5 border border-white/10 font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors text-sm"
                                >
                                    <Settings size={18} /> Scanner Permissions
                                </button>
                                {activeFilter && (
                                    <button onClick={() => setActiveFilter(null)} className="mt-2 text-[var(--primary-accent)] text-sm font-bold underline hover:opacity-80">
                                        Clear Active Filter
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </ul>
            </div>
        </main>
        
        <ScrollToCurrentFab 
            nowPlaying={nowPlaying} 
            onScrollToCurrent={handleScrollToCurrent} 
        />

        <AnimatePresence>
            {isSourceFilterOpen && (
                <LibraryFilters
                    currentFilters={filters}
                    onApply={(newFilters) => {
                        setFilters(newFilters);
                        setIsSourceFilterOpen(false);
                        if (newFilters.source && newFilters.source.length > 0) {
                            setActiveFilter(newFilters.source[0]);
                        } else {
                            setActiveFilter(null);
                        }
                    }}
                    onClose={() => setIsSourceFilterOpen(false)}
                    availableSources={availableSources}
                    availableGenres={[]}
                />
            )}
        </AnimatePresence>
        </>
    );
};

export default LibraryView;
