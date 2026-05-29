import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, FolderOpen, VideoOff, Search, Compass, Film, Loader2 } from 'lucide-react';
import type { Video, ReelPlaylist, ProfileData, Song } from '../types.ts';
import { addOrUpdateVideos } from './db.ts';
import VideoPlayer from './VideoPlayer.tsx';
import ManageReelsView from './ManageReelsView.tsx';
import { onlineReelsService } from '../services/onlineReelsService.ts';

interface ReelsViewProps {
    videos: Video[];
    reelPlaylists: ReelPlaylist[];
    onUpdate: (updater: (prev: Video[]) => Video[]) => void;
    onUpdateReelPlaylists: (playlists: ReelPlaylist[]) => void;
    onReelActiveChange: (isActive: boolean) => void;
    showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onPlayReelAsAudio: (video: Video) => void;
    nowPlaying: Song | null;
    onOpenAssistant: () => void;
    isAssistantOnline: boolean;
    onViewReelPlaylist: (playlistId: string) => void;
    initialVideoId?: string | null;
    onUploadProgress: (current: number, total: number, fileName: string) => void;
    onScanDevice: () => void;
    onToggleReelsUiVisibility: () => void;
    isBottomNavHidden: boolean;
}

const ReelsView: React.FC<ReelsViewProps> = ({
    videos,
    reelPlaylists,
    onUpdate,
    onUpdateReelPlaylists,
    onReelActiveChange,
    showNotification,
    profile,
    onUpdateProfile,
    onPlayReelAsAudio,
    nowPlaying,
    onOpenAssistant,
    isAssistantOnline,
    onViewReelPlaylist,
    initialVideoId,
    onScanDevice,
    onToggleReelsUiVisibility,
    isBottomNavHidden,
}) => {
    const [isManaging, setIsManaging] = useState(false);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'local' | 'online'>(() =>
        videos.length > 0 ? 'local' : 'online'
    );
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const headerHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showHeaderBriefly = useCallback(() => {
        setIsHeaderVisible(true);
        if (headerHideTimeout.current) clearTimeout(headerHideTimeout.current);
        headerHideTimeout.current = setTimeout(() => {
            setIsHeaderVisible(false);
        }, 3500);
    }, []);

    // Auto-hide header after 4s on mount
    useEffect(() => {
        headerHideTimeout.current = setTimeout(() => setIsHeaderVisible(false), 4000);
        return () => { if (headerHideTimeout.current) clearTimeout(headerHideTimeout.current); };
    }, []);

    const [onlineVideos, setOnlineVideos] = useState<Video[]>([]);
    const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);
    const [onlineError, setOnlineError] = useState(false);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reelsContainerRef = useRef<HTMLDivElement>(null);

    // ── LOAD ONLINE VIDEOS ──────────────────────────────────────────
    const loadOnlineVideos = useCallback(async (query = '') => {
        setIsSearchingOnline(true);
        setOnlineError(false);
        try {
            const results = await onlineReelsService.getTrending(query);
            setOnlineVideos(results);
            if (results.length === 0) {
                setOnlineError(true);
            }
        } catch (err) {
            console.error('[ReelsView] Load failed:', err);
            // Fallback to built-in samples
            setOnlineVideos(onlineReelsService.getSamples(query));
        } finally {
            setIsSearchingOnline(false);
        }
    }, []);

    // Load on tab switch + initial load if starting on online tab
    useEffect(() => {
        if (activeTab === 'online' && onlineVideos.length === 0) {
            loadOnlineVideos('');
        }
    }, [activeTab, loadOnlineVideos, onlineVideos.length]);

    // Debounced search
    useEffect(() => {
        if (activeTab !== 'online') return;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            loadOnlineVideos(onlineSearchQuery);
        }, 600);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [onlineSearchQuery, activeTab, loadOnlineVideos]);

    useEffect(() => {
        if (initialVideoId) {
            document.getElementById(`reel-${initialVideoId}`)?.scrollIntoView({ behavior: 'auto' });
        }
    }, [initialVideoId]);

    const handleUpdateSingleVideo = useCallback((updatedVideo: Video) => {
        if (activeTab === 'online') {
            setOnlineVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
            return;
        }
        addOrUpdateVideos([updatedVideo]).then(() => {
            onUpdate(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
        }).catch(() => showNotification('Error saving reel update.', 'error'));
    }, [activeTab, onUpdate, showNotification]);

    const activeVideoPool = activeTab === 'local' ? videos : onlineVideos;

    const handlePlaybackComplete = () => {
        const container = reelsContainerRef.current;
        if (container && activeVideoPool.length > 1 && profile.settings.reelsAutoScrollLoops > 0) {
            const nextIndex = (currentVideoIndex + 1) % activeVideoPool.length;
            document.getElementById(`reel-${activeVideoPool[nextIndex].id}`)?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const container = reelsContainerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const index = activeVideoPool.findIndex(v => `reel-${v.id}` === entry.target.id);
                        if (index !== -1) setCurrentVideoIndex(index);
                    }
                });
            },
            { threshold: 0.5 }
        );

        Array.from(container.children).forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [activeVideoPool]);

    const handleVideoContainerClick = useCallback(() => {
        showHeaderBriefly();
    }, [showHeaderBriefly]);

    if (isManaging) {
        return (
            <ManageReelsView
                videos={videos}
                reelPlaylists={reelPlaylists}
                onUpdateVideo={handleUpdateSingleVideo}
                onUpdateReelPlaylists={onUpdateReelPlaylists}
                onBack={() => setIsManaging(false)}
                onPlayReel={(videoId) => {
                    const index = videos.findIndex(v => v.id === videoId);
                    if (index !== -1) {
                        setIsManaging(false);
                        setActiveTab('local');
                        setTimeout(() => document.getElementById(`reel-${videoId}`)?.scrollIntoView(), 0);
                    }
                }}
                showNotification={showNotification}
                onViewReelPlaylist={onViewReelPlaylist}
            />
        );
    }

    return (
        <div className="h-full w-full bg-transparent relative flex flex-col">

            {/* ── HEADER OVERLAY ── */}
            <header
                className="absolute top-0 left-0 right-0 z-40 px-4 pt-2 transition-all duration-500"
                style={{
                    paddingTop: `calc(env(safe-area-inset-top, 0rem) + 0.5rem)`,
                    opacity: isHeaderVisible ? 1 : 0,
                    transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
                    pointerEvents: isHeaderVisible ? 'auto' : 'none',
                }}
            >
                <div className="flex flex-col gap-2 bg-black/60 backdrop-blur-md p-3 rounded-3xl border border-white/10 shadow-2xl">

                    {/* Title + Actions Row */}
                    <div className="flex justify-between items-center">
                        <h1 className="font-black text-lg ml-1 uppercase tracking-widest text-[var(--primary-accent)] flex items-center gap-2">
                            <Film size={18} />
                            <span>Mwijay Reels</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            {activeTab === 'online' && (
                                <button
                                    onClick={() => loadOnlineVideos(onlineSearchQuery)}
                                    disabled={isSearchingOnline}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
                                    title="Refresh online reels"
                                >
                                    <RefreshCw size={14} className={isSearchingOnline ? 'animate-spin text-[var(--primary-accent)]' : 'text-white'} />
                                </button>
                            )}
                            {activeTab === 'local' && (
                                <button
                                    onClick={onScanDevice}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
                                    title="Scan device for reels"
                                >
                                    <RefreshCw size={14} className="text-white" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsManaging(true)}
                                className="w-8 h-8 rounded-full bg-[var(--primary-accent)] flex items-center justify-center transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                                title="Manage Reels"
                            >
                                <FolderOpen size={14} className="text-black" />
                            </button>
                        </div>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex bg-black/40 p-1 rounded-full border border-white/5 w-full">
                        <button
                            onClick={() => setActiveTab('local')}
                            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'local' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <FolderOpen size={12} />
                            <span>Local ({videos.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('online')}
                            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'online' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <Compass size={12} />
                            <span>Surf Online</span>
                        </button>
                    </div>

                    {/* Online Search */}
                    {activeTab === 'online' && (
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={13} />
                            <input
                                type="text"
                                placeholder="Search videos… (Archive, Wikimedia, more)"
                                value={onlineSearchQuery}
                                onChange={e => setOnlineSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-8 pr-10 text-white text-xs focus:outline-none focus:border-[var(--primary-accent)]/60 transition-colors placeholder-neutral-500"
                            />
                            {isSearchingOnline && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--primary-accent)] animate-spin" size={13} />
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* ── VIDEO AREA ── */}
            {activeVideoPool.length > 0 ? (
                <div
                    ref={reelsContainerRef}
                    className="h-full w-full overflow-y-auto snap-y snap-mandatory flex-1"
                >
                    {activeVideoPool.map((video) => (
                        <div
                            key={video.id}
                            id={`reel-${video.id}`}
                            className="h-full w-full snap-start relative flex items-center justify-center bg-black"
                            onClick={handleVideoContainerClick}
                        >
                            <VideoPlayer
                                video={video}
                                onUpdate={handleUpdateSingleVideo}
                                onReelActiveChange={onReelActiveChange}
                                onPlayAsAudio={onPlayReelAsAudio}
                                nowPlaying={nowPlaying}
                                profile={profile}
                                onUpdateProfile={onUpdateProfile}
                                onPlaybackComplete={handlePlaybackComplete}
                                onOpenAssistant={onOpenAssistant}
                                isAssistantOnline={isAssistantOnline}
                                showNotification={showNotification}
                                onToggleReelsUiVisibility={onToggleReelsUiVisibility}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center text-white p-8 bg-black gap-4">
                    {isSearchingOnline ? (
                        <>
                            <Loader2 size={40} className="text-[var(--primary-accent)] animate-spin" />
                            <p className="text-neutral-400 text-sm">Loading online videos…</p>
                        </>
                    ) : (
                        <>
                            <VideoOff size={48} className="text-neutral-600 animate-pulse" />
                            <h2 className="font-bold text-xl uppercase tracking-wide">
                                {activeTab === 'local' ? 'No Local Reels' : 'No Videos Found'}
                            </h2>
                            <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">
                                {activeTab === 'local'
                                    ? 'Scan your device or switch to Surf Online to enjoy free videos.'
                                    : onlineError
                                        ? 'Could not reach video sources. Showing demo content.'
                                        : 'Try a different search term or tap refresh.'
                                }
                            </p>
                            {activeTab === 'online' && (
                                <button
                                    onClick={() => loadOnlineVideos('')}
                                    className="mt-2 bg-[var(--primary-accent)] text-black font-black px-6 py-2.5 rounded-full text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                >
                                    Load Sample Videos
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReelsView;