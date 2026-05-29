
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Song, ProfileData, RadioStation, AudioFxNodes } from '../types.ts';
import UpNextQueue from './UpNextQueue.tsx';
import SleepTimerModal from './SleepTimerModal.tsx';
import VisualizerModal from './VisualizerModal.tsx';
import WisdomCardView from './WisdomCardView.tsx';
import Visualizer from './Visualizer.tsx';
import TranscriptionView from './TranscriptionView.tsx';
import AudioFxModal from './AudioFxModal.tsx';
import { fetchFromJamendo, fetchFromArchive } from './db.ts';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { 
    ChevronDown, Play, Pause, SkipForward, SkipBack, Heart, Sparkles, 
    Loader2, SlidersHorizontal, Sliders, ChevronUp, Music, Paintbrush, 
    Clock, Download, Mic2, Share2, Smile, ListMusic, Wand2,
    PenLine, Settings2, Shuffle, Users, X
} from 'lucide-react';
import { analyzeMedia } from '../services/geminiService.ts';
import { ImpactStyle } from '@capacitor/haptics';
import { getRandomCoverArt, fonts } from './constants.ts';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';
import AnimatedCoverArt from './AnimatedCoverArt.tsx';
import { getPremiumGradientCover, shareTextOrUrl } from '../utils/helpers.ts';

interface PlayerOverlayProps {
    isVisible: boolean;
    song: Song | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    currentSessionRadioTime: number;
    onClose: (e?: React.MouseEvent) => void;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
    onSeekBy: (delta: number) => void;
    onToggleFavorite: (songId: string) => void;
    playQueue: Song[];
    currentQueueIndex: number;
    setPlayQueue: React.Dispatch<React.SetStateAction<Song[]>>;
    onPlayFromQueue: (song: Song) => void;
    repeatMode: 'none' | 'one' | 'all';
    isShuffled: boolean;
    onCycleRepeat: () => void;
    onToggleShuffle: () => void;
    onSetSleepTimer: (mode: 'duration' | 'songs' | 'off', value: number) => void;
    sleepTimer: { mode: 'off' | 'duration' | 'songs'; value: number, timeoutId: number | null };
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onToggleLyrics: (forceOpen?: 'full' | 'minimized' | 'closed') => void;
    onOpenMoodModal: () => void;
    onOpenEqualizer: () => void;
    isLyricsMinimized: boolean;
    isLyricsVisible: boolean;
    favoriteStations: RadioStation[];
    onToggleFavoriteStation: (station: RadioStation) => void;
    isQueueFlashing: boolean;
    onExitSimpleMode: () => void;
    visualizerColor?: string | null;
    playHapticImpact: (style?: ImpactStyle) => void;
    onToggleTranscription: () => void;
    isTranscriptionVisible: boolean;
    onSaveRadioNotes: (songId: string, notes: string) => void;
    onSaveNotes: (songId: string, notes: string) => void;
    isSongLoading: boolean;
    audioFx: AudioFxNodes | null;
    isDjSessionActive: boolean;
    isTtsSpeaking: boolean;
    audioRef: React.RefObject<HTMLAudioElement>;
    showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity || seconds < 0) return '0:00';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const MinimizedLyrics: React.FC<{ song: Song, onExpand: () => void, settings: ProfileData['settings']['lyricsSettings'], isPlaying: boolean }> = ({ song, onExpand, settings, isPlaying }) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useInterruptibleScroll(scrollerRef, contentRef, 'vertical');

    useEffect(() => {
        const content = contentRef.current;
        if (content && settings.animation === 'scroll') {
            const lineCount = (song.lyrics?.match(/\n/g) || []).length + 1;
            const speedMultiplier = 20.5 - settings.animationSpeed;
            const duration = Math.max(20, lineCount * speedMultiplier * 0.1);
            content.style.animation = `lyrics-scroll-anim ${duration}s linear infinite`;
            content.style.animationPlayState = isPlaying ? 'running' : 'paused';
        } else if (content) {
            content.style.animation = 'none';
        }
    }, [song.lyrics, settings.animation, settings.animationSpeed, isPlaying]);

    return (
        <div className="bg-white/5 rounded-lg p-4 h-full flex flex-col backdrop-blur-md border border-white/10">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="font-bold text-sm text-neutral-300">Lyrics</h3>
                <button onClick={onExpand} className="text-neutral-300 hover:text-white"><ChevronUp size={20} /></button>
            </div>
            <div ref={scrollerRef} className="flex-1 overflow-hidden text-sm text-neutral-300 whitespace-pre-wrap text-center">
                <div ref={contentRef} style={{
                    fontFamily: fonts.find(f => f.name === settings.fontFamily)?.family || 'Satoshi',
                    fontSize: `${settings.fontSize}px`
                }}>
                    <p>{song.lyrics || "No lyrics available for this song."}</p>
                    {settings.animation === 'scroll' && <p className="mt-8">{song.lyrics || ""}</p>}
                </div>
            </div>
        </div>
    );
};

const MinimizedNotes: React.FC<{ song: Song, onSave: (notes: string) => void }> = ({ song, onSave }) => {
    const [notes, setNotes] = useState(song.notes || '');
    const saveTimeout = useRef<number | null>(null);

    useEffect(() => {
        setNotes(song.notes || '');
    }, [song.id, song.notes]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = window.setTimeout(() => {
            onSave(e.target.value);
        }, 1000);
    };

    return (
         <div className="bg-white/5 rounded-lg p-4 h-full flex flex-col backdrop-blur-md border border-white/10">
            <h3 className="font-bold text-sm text-neutral-300 mb-2">Session Notes</h3>
            <textarea
                value={notes}
                onChange={handleChange}
                className="w-full flex-1 bg-transparent resize-none text-sm text-neutral-200 outline-none"
                placeholder="Jot down notes for this live session..."
            />
        </div>
    );
};

export const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
    isVisible, song, isPlaying, progress, duration, currentSessionRadioTime, onClose, onTogglePlay, onNext, onPrev, onSeek, onSeekStart, onSeekEnd, onSeekBy, onToggleFavorite, playQueue, currentQueueIndex, setPlayQueue, onPlayFromQueue,
    repeatMode, isShuffled, onCycleRepeat, onToggleShuffle, onSetSleepTimer, sleepTimer, profile, onUpdateProfile, onToggleLyrics, onOpenMoodModal, onOpenEqualizer, isLyricsMinimized, isLyricsVisible,
    favoriteStations, onToggleFavoriteStation, isQueueFlashing, onExitSimpleMode, visualizerColor, playHapticImpact, onToggleTranscription, isTranscriptionVisible, onSaveRadioNotes, onSaveNotes, isSongLoading, audioFx, isDjSessionActive, isTtsSpeaking,
    audioRef, showNotification
}) => {
    const [isQueueVisible, setIsQueueVisible] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<'lyrics' | 'story' | 'discover'>('lyrics');
    const [activeTabMobile, setActiveTabMobile] = useState<'none' | 'lyrics' | 'queue'>('lyrics');
    const [notesText, setNotesText] = useState(song?.notes || '');
    const saveTimeoutRef = useRef<number | null>(null);

    const [artistBio, setArtistBio] = useState<{ summary: string; content: string; stats: { listeners: string; playcount: string } | null; tags: string[] } | null>(null);
    const [isBioLoading, setIsBioLoading] = useState(false);

    const [similarTracks, setSimilarTracks] = useState<any[]>([]);
    const [isSimilarLoading, setIsSimilarLoading] = useState(false);
    const [searchingTrackId, setSearchingTrackId] = useState<string | null>(null);

    useEffect(() => {
        if (song) {
            setNotesText(song.notes || '');
            setArtistBio(null);
            setSimilarTracks([]);
        }
    }, [song?.id, song?.notes]);

    const fetchArtistBio = useCallback(async () => {
        if (!song || !song.artist) return;
        setIsBioLoading(true);
        try {
            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(song.artist)}&api_key=3b5fffb881a309d9ab9c7ed625394753&format=json`);
            if (res.ok) {
                const json = await res.json();
                if (json.artist) {
                    const bioSummary = json.artist.bio?.summary || '';
                    const bioContent = json.artist.bio?.content || '';
                    const listeners = json.artist.stats?.listeners || '0';
                    const playcount = json.artist.stats?.playcount || '0';
                    const tags = json.artist.tags?.tag?.map((t: any) => t.name) || [];
                    setArtistBio({
                        summary: bioSummary,
                        content: bioContent,
                        stats: { listeners, playcount },
                        tags
                    });
                }
            }
        } catch (e) {
            console.error("Last.fm artist fetch failed", e);
        } finally {
            setIsBioLoading(false);
        }
    }, [song?.artist]);

    const fetchSimilarTracks = useCallback(async () => {
        if (!song) return;
        setIsSimilarLoading(true);
        try {
            const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(song.artist)}&track=${encodeURIComponent(song.title)}&api_key=3b5fffb881a309d9ab9c7ed625394753&format=json&limit=5`);
            if (res.ok) {
                const json = await res.json();
                if (json.similartracks && json.similartracks.track) {
                    setSimilarTracks(json.similartracks.track);
                }
            }
        } catch (e) {
            console.error("Last.fm similar tracks fetch failed", e);
        } finally {
            setIsSimilarLoading(false);
        }
    }, [song?.artist, song?.title]);

    useEffect(() => {
        if (rightPanelTab === 'story' && !artistBio && song?.artist) {
            fetchArtistBio();
        }
    }, [rightPanelTab, artistBio, song?.artist, fetchArtistBio]);

    useEffect(() => {
        if (rightPanelTab === 'discover' && similarTracks.length === 0 && song) {
            fetchSimilarTracks();
        }
    }, [rightPanelTab, similarTracks.length, song, fetchSimilarTracks]);

    const handleSearchAndPlay = async (trackTitle: string, artistName: string) => {
        const searchId = `${trackTitle}-${artistName}`;
        setSearchingTrackId(searchId);
        showNotification(`Searching streams for "${trackTitle}"...`, 'info');
        try {
            let results = await fetchFromJamendo(`${artistName} ${trackTitle}`, 1, 3);
            if (results.length === 0) {
                results = await fetchFromArchive(`${artistName} ${trackTitle}`, 3);
            }

            if (results.length > 0) {
                const matchedSong = results[0];
                showNotification(`Found stream! Playing "${matchedSong.title}"`, 'success');
                setPlayQueue(prev => {
                    const newQueue = [...prev];
                    newQueue.splice(currentQueueIndex + 1, 0, matchedSong);
                    return newQueue;
                });
                setTimeout(() => {
                    onPlayFromQueue(matchedSong);
                }, 100);
            } else {
                showNotification(`No playable source found on Jamendo or Archive for "${trackTitle}"`, 'error');
            }
        } catch (e) {
            console.error(e);
            showNotification("Failed to fetch matching audio resource.", 'error');
        } finally {
            setSearchingTrackId(null);
        }
    };

    const [activeModal, setActiveModal] = useState<'sleep' | 'visualizer' | 'audiofx' | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showSyncedLyrics, setShowSyncedLyrics] = useState(false);
    const [backgroundMode, setBackgroundMode] = useState<'gradient' | 'album' | 'black'>('gradient');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    const tapTimeoutRef = useRef<number | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [isHeartBeating, setIsHeartBeating] = useState(false);
    const seekIntervalRef = useRef<number | null>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const minSwipeDistance = 50;
    
    // Mobile Queue Toggle State removed - horizontal list is now primary
    
    const isLive = song?.duration === Infinity || duration === Infinity;

    const handleDeepAnalysis = async () => {
        if (isAnalyzing || !song) return;
        setIsAnalyzing(true);
        showNotification(isLive ? "Gnos is capturing live stream for analysis..." : "Gnos is performing Deep Neural Analysis...", "info");
        try {
            let base64Data: string | undefined;
            if (!isLive && song.audioData) {
                const blob = new Blob([song.audioData], { type: song.mimeType || 'audio/mpeg' });
                base64Data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }

            const mediaInput = isLive ? { audio: { audioUrl: song.url } } : { audio: { base64: base64Data, mimeType: song.mimeType } };
            const result = await analyzeMedia(mediaInput as any, {});
            
            // Update the song in the queue
            const updatedSong = { ...song, transcription: result };
            const newQueue = [...playQueue];
            newQueue[currentQueueIndex] = updatedSong;
            setPlayQueue(newQueue);
            
            setShowSyncedLyrics(true);
            showNotification("Analysis Complete", "success");
        } catch (e) { 
            console.error(e);
            showNotification("Analysis failed", "error"); 
        } finally { 
            setIsAnalyzing(false); 
        }
    };

    const currentLyric = song?.transcription?.segments.find((seg, i) => {
        const ts = (s: string) => { 
            const p = s.split(':').map(Number); 
            return p.length === 2 ? p[0]*60+p[1] : p[0]*3600+p[1]*60+p[2]; 
        };
        const start = ts(seg.timestamp);
        const next = song.transcription?.segments[i+1] ? ts(song.transcription.segments[i+1].timestamp) : Infinity;
        return progress >= start && progress < next;
    });

    const startSeek = useCallback((direction: 'forward' | 'backward') => {
        if (isLive) return;
        playHapticImpact(ImpactStyle.Light);
        if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
        
        seekIntervalRef.current = window.setInterval(() => {
            onSeekBy(direction === 'forward' ? 1 : -1); 
        }, 150);
    }, [isLive, playHapticImpact, onSeekBy]);

    const stopSeek = useCallback(() => {
        if (seekIntervalRef.current) {
            clearInterval(seekIntervalRef.current);
            seekIntervalRef.current = null;
        }
    }, []);

    const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100 && info.velocity.y > 200) {
            playHapticImpact(ImpactStyle.Light);
            onClose();
        }
    }, [playHapticImpact, onClose]);
    

    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                const isOverflowing = titleRef.current.scrollWidth > titleContainerRef.current.clientWidth;
                setIsTitleOverflowing(isOverflowing);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [song?.title, isLive, song?.streamTitle]);

    const handleFavoriteClick = useCallback(() => {
        if (!song) return;
        setIsHeartBeating(true);
        setTimeout(() => setIsHeartBeating(false), 500);
        if (isLive) {
            const stationToToggle: RadioStation = {
                stationuuid: song.id, name: song.title, url_resolved: song.url || '',
                favicon: song.albumArtUrl, country: song.artist, countrycode: '', bitrate: 0,
            };
            onToggleFavoriteStation(stationToToggle);
        } else {
            onToggleFavorite(song.id);
        }
    }, [song, isLive, onToggleFavoriteStation, onToggleFavorite]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (isLive) return;
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
    }, [isLive]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (isLive) return;
        setTouchEndX(e.targetTouches[0].clientX);
    }, [isLive]);

    const handleTouchEnd = useCallback(() => {
        if (isLive || !touchStartX || !touchEndX) return;
        const distance = touchStartX - touchEndX;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) onNext();
        else if (isRightSwipe) onPrev();
        
        setTouchStartX(null);
        setTouchEndX(null);
    }, [isLive, touchStartX, touchEndX, onNext, onPrev]);
    
    const handleDoubleTap = useCallback(() => {
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
            onTogglePlay();
        } else {
            tapTimeoutRef.current = window.setTimeout(() => {
                tapTimeoutRef.current = null;
            }, 300);
        }
    }, [onTogglePlay]);
    
    const renderRightPanelContent = useCallback(() => {
        if (!song) return null;
    
        return (
            <div className="bg-white/5 rounded-2xl p-4 h-full flex flex-col backdrop-blur-md border border-white/10 overflow-hidden text-left">
                {/* sleek tab switcher buttons inside container */}
                <div className="flex gap-1 mb-4 bg-black/40 p-1 rounded-full border border-white/5 flex-shrink-0 self-center">
                    <button 
                        onClick={() => setRightPanelTab('lyrics')} 
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${rightPanelTab === 'lyrics' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        {isLive ? 'Notes' : 'Lyrics'}
                    </button>
                    <button 
                        onClick={() => setRightPanelTab('story')} 
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${rightPanelTab === 'story' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        Artist Story
                    </button>
                    <button 
                        onClick={() => setRightPanelTab('discover')} 
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${rightPanelTab === 'discover' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-400 hover:text-white'}`}
                    >
                        AI Discover
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                    {rightPanelTab === 'lyrics' && (
                        <>
                            {isLyricsMinimized ? (
                                (isLive || !song.lyrics) ? (
                                    <div className="h-full flex flex-col justify-between">
                                        <textarea
                                            value={notesText}
                                            onChange={(e) => {
                                                setNotesText(e.target.value);
                                                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                                saveTimeoutRef.current = window.setTimeout(() => {
                                                    isLive ? onSaveRadioNotes(song.id, e.target.value) : onSaveNotes(song.id, e.target.value);
                                                }, 1000);
                                            }}
                                            className="w-full flex-1 bg-transparent resize-none text-sm text-neutral-200 outline-none min-h-[120px]"
                                            placeholder="Jot down notes for this live session..."
                                        />
                                    </div>
                                ) : (
                                    <div className="text-sm text-neutral-300 whitespace-pre-wrap text-center" style={{
                                        fontFamily: fonts.find(f => f.name === profile.settings.lyricsSettings.fontFamily)?.family || 'Satoshi',
                                        fontSize: `${profile.settings.lyricsSettings.fontSize}px`
                                    }}>
                                        <p>{song.lyrics}</p>
                                    </div>
                                )
                            ) : isTranscriptionVisible ? (
                                <TranscriptionView profile={profile} onSave={(text) => {
                                    isLive ? onSaveRadioNotes(song.id, text) : onSaveNotes(song.id, text);
                                }} audioRef={audioRef} song={song} />
                            ) : null}
                        </>
                    )}

                    {rightPanelTab === 'story' && (
                        <div className="space-y-4 text-left">
                            {isBioLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-[var(--primary-accent)] mb-2" size={24} />
                                    <span className="text-xs text-neutral-400">Loading Artist Story...</span>
                                </div>
                            ) : artistBio ? (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {artistBio.tags.slice(0, 4).map(tag => (
                                            <span key={tag} className="text-[10px] font-black uppercase tracking-wider bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] px-2 py-0.5 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {artistBio.stats && (
                                        <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-[var(--primary-accent)]" />
                                                <div>
                                                    <p className="text-neutral-400 font-medium">Listeners</p>
                                                    <p className="font-bold font-mono">{parseInt(artistBio.stats.listeners).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Music size={14} className="text-[var(--primary-accent)]" />
                                                <div>
                                                    <p className="text-neutral-400 font-medium">Scrobbles</p>
                                                    <p className="font-bold font-mono">{parseInt(artistBio.stats.playcount).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="text-xs leading-relaxed text-neutral-300 space-y-2 font-serif italic pr-1" 
                                         dangerouslySetInnerHTML={{ __html: artistBio.summary || "No bio content found." }} 
                                    />
                                    
                                    <p className="text-[9px] text-neutral-500 uppercase tracking-widest mt-2">Source: Last.fm</p>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <span className="text-xs text-neutral-500">Could not retrieve artist story.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {rightPanelTab === 'discover' && (
                        <div className="space-y-4 text-left">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary-accent)] mb-2">Similar tracks on Last.fm</h4>
                            {isSimilarLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-[var(--primary-accent)] mb-2" size={24} />
                                    <span className="text-xs text-neutral-400">Finding recommendations...</span>
                                </div>
                            ) : similarTracks.length > 0 ? (
                                <div className="space-y-2">
                                    {similarTracks.map((track, idx) => {
                                        const searchId = `${track.name}-${track.artist.name}`;
                                        const isSearching = searchingTrackId === searchId;
                                        return (
                                            <div key={idx} className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl transition-all">
                                                <div className="min-w-0 flex-1 pr-3">
                                                    <p className="text-xs font-black text-white truncate uppercase tracking-tight mb-0.5">{track.name}</p>
                                                    <p className="text-[10px] text-white/40 truncate font-bold">{track.artist.name}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleSearchAndPlay(track.name, track.artist.name)}
                                                    disabled={searchingTrackId !== null}
                                                    className="px-3 py-1.5 bg-[var(--primary-accent)] hover:bg-white text-black font-black text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1 transition-all disabled:opacity-50 flex-shrink-0"
                                                >
                                                    {isSearching ? (
                                                        <>
                                                            <Loader2 size={10} className="animate-spin" />
                                                            <span>Seeking...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play size={10} fill="currentColor" />
                                                            <span>Play</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <span className="text-xs text-neutral-500">No recommended tracks found.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }, [song, isLive, isLyricsMinimized, isTranscriptionVisible, notesText, profile, rightPanelTab, isBioLoading, artistBio, isSimilarLoading, similarTracks, searchingTrackId, onSaveRadioNotes, onSaveNotes, showNotification, setPlayQueue, currentQueueIndex, onPlayFromQueue]);


    if (!song || !profile) return null;

    if (profile.settings.simpleMode.enabled && isVisible) {
        return <WisdomCardView song={song} isPlaying={isPlaying} onTogglePlay={onTogglePlay} onNext={onNext} onPrev={onPrev} profile={profile} onUpdateProfile={onUpdateProfile} onExit={onExitSimpleMode} onToggleSongFavorite={() => onToggleFavorite(song.id)} />;
    }

    const isRadioFavorited = isLive && favoriteStations.some(s => s.stationuuid === song.id);
    
    let displayTitle = song.title;
    if (isLive && song.streamTitle) {
        const parts = song.streamTitle.split(' - ');
        displayTitle = parts.length > 1 ? parts.slice(1).join(' - ').trim() : song.streamTitle;
    }
    
    const progressPercentage = (progress / (duration || 1)) * 100;

    const { albumArtShape, albumArtSize, useAlbumArtColor, beatSync } = profile.settings.visualizerSettings;
    const lyricsNotesTitle = isLive ? 'Notes' : 'Lyrics';
    const visualizerColorToUse = useAlbumArtColor ? visualizerColor : null;
    
    const { enabled: isNeonEnabled, style: neonStyle, speed: neonSpeed } = profile.settings.neonGlow;
    const animationDuration = (11 - neonSpeed) * 0.5;

    return (
        <>
        <motion.div 
            className={`fixed inset-0 z-[250] flex flex-col lg:flex-row bg-[var(--bg-color)] overflow-hidden`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            drag={window.innerWidth < 1024 ? "y" : false} 
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
        >
            <div
                className="absolute inset-0 bg-cover bg-center -m-4 filter blur-3xl opacity-30 pointer-events-none"
                style={{ backgroundImage: `url(${song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)})` }}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: visualizerColor ? `linear-gradient(to bottom, ${visualizerColor} -20%, var(--bg-color) 60%)` : 'var(--bg-color)', opacity: 1 }}/>

            {/* Desktop: Left Panel (Artwork & Visualizer) / Mobile: Top Section */}
            <div className="relative z-10 flex flex-col lg:h-full lg:w-1/2 lg:p-12 lg:justify-center">
                
                {/* Desktop-specific Header */}
                <header className="hidden lg:flex flex-shrink-0 items-center justify-between py-4 px-4 pt-[calc(1rem+env(safe-area-inset-top,0rem))] lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:p-8 z-50">
                    <button onClick={onClose} className="text-xl w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors" aria-label="Close player">
                        <ChevronDown size={24} />
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={handleFavoriteClick} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors" title="Favorite">
                            <Heart size={20} className={song.isFavorite || isRadioFavorited ? 'text-red-500 fill-red-500' : 'text-white/60'} />
                        </button>
                        <button onClick={() => setIsQueueVisible(prev => !prev)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors relative" title="Queue">
                            <ListMusic size={20} />
                            {playQueue.length > 0 && (
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--primary-accent)] rounded-full" />
                            )}
                        </button>
                        <button onClick={() => setActiveModal('audiofx')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors" title="Audio Effects">
                            <SlidersHorizontal size={20} />
                        </button>
                        {profile.settings.showExtraControls && (
                            <button 
                                onClick={() => {
                                    if (song) {
                                        shareTextOrUrl(
                                            'Now playing on Mwijay Music',
                                            `Check out "${song.title}" by ${song.artist}!`,
                                            window.location.href,
                                            showNotification
                                        );
                                    }
                                }} 
                                className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors" 
                                title="Share"
                            >
                                <Share2 size={20} />
                            </button>
                        )}
                        <button onClick={() => setActiveModal('visualizer')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors" title="Visualizer Settings">
                            <Settings2 size={20} />
                        </button>
                    </div>
                </header>

                {/* Mobile-specific Header */}
                <header className="flex lg:hidden flex-shrink-0 items-center justify-between py-2 px-4 pt-[calc(0.5rem+env(safe-area-inset-top,0rem))] z-50">
                    <button onClick={onClose} className="text-xl w-9 h-9 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors text-white" aria-label="Close player">
                        <ChevronDown size={22} />
                    </button>
                    
                    <div className="flex flex-col items-center text-center max-w-[50%]">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-neutral-400">
                            {isLive ? 'LIVE RADIO' : 'NOW PLAYING'}
                        </span>
                        <span className="text-[11px] font-bold text-white truncate w-full mt-0.5">
                            {displayTitle}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setActiveModal('sleep')} className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors text-white" title="Sleep Timer">
                            <Clock size={18} />
                        </button>
                        <button onClick={() => setActiveModal('visualizer')} className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors text-white" title="Visualizer Settings">
                            <Settings2 size={18} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-center p-2 lg:p-0 relative w-full h-full lg:max-h-none overflow-hidden">
                    <div className="flex flex-col items-center w-full">
                            <div 
                                className="relative w-full aspect-square max-w-[200px] sm:max-w-[240px] lg:max-w-md mx-auto shadow-2xl rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden border border-white/10"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onClick={handleDoubleTap}
                            >
                                <Visualizer type={profile.settings.visualizerSettings.type} isPlaying={isPlaying} visualizerColor={visualizerColorToUse} audioFx={audioFx} beatSync={beatSync} />
                                
                                <div className="relative z-10 w-full h-full p-0 flex items-center justify-center pointer-events-none">
                                    {albumArtShape === 'square' ? (
                                        <motion.div 
                                            className={`w-full h-full`}
                                            animate={{ scale: albumArtSize }}
                                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                        >
                                            <img 
                                                src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                                                alt={`Album art for ${song.title}`} 
                                                className="w-full h-full shadow-2xl object-cover rounded-[2.5rem]" 
                                                onError={(e) => { 
                                                    if (!e.currentTarget.dataset.fallbackApplied) {
                                                        e.currentTarget.dataset.fallbackApplied = 'true';
                                                        e.currentTarget.src = getPremiumGradientCover(song.title, song.artist);
                                                    }
                                                }}
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.img 
                                            src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                                            alt={`Album art for ${song.title}`} 
                                            className={`w-full h-full shadow-2xl object-cover rounded-full ${isPlaying ? 'spinning-player' : ''}`} 
                                            onError={(e) => { 
                                                if (!e.currentTarget.dataset.fallbackApplied) {
                                                    e.currentTarget.dataset.fallbackApplied = 'true';
                                                    e.currentTarget.src = getPremiumGradientCover(song.title, song.artist);
                                                }
                                            }}
                                            animate={{ scale: albumArtSize }}
                                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                        />
                                    )}
                                </div>

                                {/* Synced Lyrics Overlay */}
                                <AnimatePresence>
                                    {showSyncedLyrics && currentLyric && (
                                        <motion.div 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex items-center justify-center p-8 text-center"
                                        >
                                            <p className="text-xl font-black text-white leading-tight drop-shadow-lg">{currentLyric.content}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {isAnalyzing && (
                                    <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                                        <Loader2 size={48} className="animate-spin text-[var(--primary-accent)]" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Neural Syncing...</span>
                                    </div>
                                )}
                                
                                {isDjSessionActive && isTtsSpeaking && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md p-4 rounded-full flex items-center gap-3 pointer-events-none z-20 border border-white/10"
                                    >
                                        <div className="mini-visualizer">
                                            <span></span><span style={{animationDelay: '0.2s'}}></span><span style={{animationDelay: '0.1s'}}></span>
                                        </div>
                                        <span className="text-sm font-bold text-white">DJ Speaking...</span>
                                    </motion.div>
                                )}

                                <div className="absolute inset-0 z-10" style={{ pointerEvents: isLive ? 'none' : 'auto' }}>
                                    <div 
                                        className="absolute left-0 top-0 h-full w-1/3"
                                        onMouseDown={() => startSeek('backward')}
                                        onMouseUp={stopSeek} onMouseLeave={stopSeek}
                                        onTouchStart={() => startSeek('backward')} onTouchEnd={stopSeek}
                                    />
                                    <div 
                                        className="absolute right-0 top-0 h-full w-1/3"
                                        onMouseDown={() => startSeek('forward')}
                                        onMouseUp={stopSeek} onMouseLeave={stopSeek}
                                        onTouchStart={() => startSeek('forward')} onTouchEnd={stopSeek}
                                    />
                                </div>
                            </div>

                            {/* Song Info below artwork on mobile */}
                            <div className="mt-2 text-center px-6 lg:hidden flex flex-col items-center w-full">
                                <p className="text-xs font-bold opacity-60 truncate mb-2">{song.artist}</p>

                                {/* 5 Quick Controls Row on Mobile */}
                                <div className="flex items-center justify-around w-full max-w-[280px] mb-1 px-1">
                                    <button 
                                        onClick={handleFavoriteClick} 
                                        className="p-1.5 transition-transform active:scale-95 text-white/60 hover:text-white"
                                        title="Favorite"
                                    >
                                        <Heart 
                                            size={22} 
                                            className={song.isFavorite || isRadioFavorited ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''} 
                                        />
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            setActiveTabMobile(prev => prev === 'queue' ? 'none' : 'queue');
                                        }} 
                                        className={`p-1.5 transition-transform active:scale-95 ${activeTabMobile === 'queue' ? 'text-[var(--primary-accent)] drop-shadow-[0_0_8px_var(--primary-accent)]' : 'text-white/60 hover:text-white'}`}
                                        title="Up Next Queue"
                                    >
                                        <ListMusic size={22} />
                                    </button>
                                    
                                    <button 
                                        onClick={() => setActiveModal('audiofx')} 
                                        className="p-1.5 transition-transform active:scale-95 text-white/60 hover:text-white"
                                        title="Equalizer"
                                    >
                                        <SlidersHorizontal size={22} />
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            setActiveTabMobile(prev => prev === 'lyrics' ? 'none' : 'lyrics');
                                        }} 
                                        className={`p-1.5 transition-transform active:scale-95 ${activeTabMobile === 'lyrics' ? 'text-[#a3e635] drop-shadow-[0_0_8px_#a3e635]' : 'text-white/60 hover:text-white'}`}
                                        title="Lyrics"
                                    >
                                        <PenLine size={22} />
                                    </button>
                                    
                                    <button 
                                        onClick={onOpenMoodModal} 
                                        className="p-1.5 transition-transform active:scale-95 text-white/60 hover:text-white"
                                        title="Mood Emoji"
                                    >
                                        <Smile size={22} />
                                    </button>
                                </div>
                            </div>
                        </div>
                </main>
            </div>

            {/* Desktop: Right Panel / Mobile: Bottom Section */}
            <div className="relative z-20 flex-1 flex flex-col lg:h-full lg:w-1/2 lg:p-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent lg:bg-none">
                
                <div className="flex-1 flex flex-col justify-end lg:justify-center px-4 pb-safe-bottom lg:px-0 lg:pb-0 gap-4 lg:gap-6">
                    
                    {/* Song Info (Desktop) */}
                    <div className="hidden lg:flex justify-between items-end gap-4">
                        <div ref={titleContainerRef} className="flex-1 min-w-0">
                            <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''} mb-1`}>
                                 <h2 ref={titleRef} className="marquee-content text-2xl lg:text-5xl font-bold text-white leading-tight" title={displayTitle}>{displayTitle}</h2>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-lg lg:text-2xl text-white/60 truncate">{song.artist}</p>
                                <button onClick={handleFavoriteClick} className="text-white hover:text-red-500 transition-colors" title="Favorite">
                                    <Heart size={24} className={song.isFavorite || isRadioFavorited ? 'text-red-500 fill-red-500' : ''} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Row (Desktop Only) */}
                    <div className="hidden lg:flex items-center justify-between px-2 mb-2">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => onToggleLyrics()} 
                                className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all shadow-lg ${isLyricsVisible || isLyricsMinimized || isTranscriptionVisible ? 'bg-[var(--primary-accent)] text-black font-black' : 'bg-white/10 text-white font-bold border border-white/10'}`}
                            >
                                <Sparkles size={16} />
                                <span className="text-[10px] uppercase tracking-[0.2em]">Lyrics & AI</span>
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button onClick={onOpenMoodModal} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors" title="Mood">
                                <Smile size={20} />
                            </button>
                            <button onClick={() => setActiveModal('visualizer')} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors" title="Settings">
                                <Settings2 size={20} />
                            </button>
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors" aria-label="Close">
                                <ChevronDown size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar - Ensuring spacing */}
                    <div className="py-1.5 lg:py-4">
                        <input 
                            type="range" 
                            min="0" 
                            max={duration || 1} 
                            value={progress} 
                            onInput={onSeek} 
                            onMouseDown={onSeekStart} 
                            onTouchStart={onSeekStart} 
                            onMouseUp={onSeekEnd} 
                            onTouchEnd={onSeekEnd} 
                            disabled={isLive} 
                            className={`w-full themed-slider h-4 lg:h-5 ${isLive ? 'live-stream' : ''} ${isSongLoading ? 'is-loading' : ''}`} 
                            style={{ backgroundSize: `${isLive ? '100%' : progressPercentage}% 100%` }} 
                        />
                        <div className="flex justify-between text-[11px] lg:text-sm font-black text-[var(--primary-accent)] mt-1.5 lg:mt-3 font-mono tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <span>{isLive ? formatTime(currentSessionRadioTime) : formatTime(progress)}</span>
                            <span>{isLive ? 'LIVE' : formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Up Next Preview (Horizontal - Desktop Only) */}
                    <AnimatePresence>
                        {!isLive && playQueue.length > 1 && (
                            <div className="hidden lg:flex flex-col gap-3 mb-6">
                                <div className="flex items-center justify-between px-1">
                                    <button 
                                        onClick={() => setIsQueueVisible(!isQueueVisible)}
                                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[var(--primary-accent)] hover:text-white transition-colors group"
                                    >
                                        <ListMusic size={14} className="group-hover:scale-110 transition-transform" />
                                        <span>Up Next</span>
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isQueueVisible ? 'rotate-180' : ''}`} />
                                    </button>
                                    <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{playQueue.length - currentQueueIndex - 1} more</span>
                                </div>
                                
                                {isQueueVisible && (
                                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 mask-fade-right">
                                        {playQueue.slice(currentQueueIndex + 1, currentQueueIndex + 12).map((qSong, idx) => (
                                            <motion.div 
                                                key={qSong.id + idx} 
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`flex flex-col gap-2 bg-white/5 hover:bg-white/10 p-3 rounded-[2rem] transition-all cursor-pointer flex-shrink-0 border border-white/5 hover:border-[var(--primary-accent)]/30 group/next backdrop-blur-md w-40`} 
                                                onClick={() => onPlayFromQueue(qSong)}
                                            >
                                                <div className="relative aspect-square w-full">
                                                    <img 
                                                        src={qSong.albumArtUrl || getPremiumGradientCover(qSong.title, qSong.artist)} 
                                                        className="w-full h-full rounded-2xl object-cover shadow-lg group-hover/next:scale-105 transition-transform" 
                                                        alt={qSong.title} 
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover/next:opacity-100 transition-opacity">
                                                        <Play size={24} className="text-white fill-white" />
                                                    </div>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover/next:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onPlayFromQueue(qSong);
                                                            }}
                                                            className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[var(--primary-accent)] hover:text-black transition-colors"
                                                            title="Play now"
                                                        >
                                                            <SkipForward size={14} />
                                                        </button>
                                                     </div>
                                                 </div>
                                                 <div className="min-w-0 px-1">
                                                     <p className="text-[12px] font-black text-white truncate uppercase tracking-tight mb-0.5">{qSong.title}</p>
                                                     <p className="text-[10px] text-white/40 truncate font-bold">{qSong.artist}</p>
                                                 </div>
                                             </motion.div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                        )}
                    </AnimatePresence>

                     {/* Dynamic Content Panel for Mobile (Lyrics / Queue) */}
                     <div className="lg:hidden flex-1 flex flex-col mb-2 overflow-hidden min-h-[120px] max-h-[220px]">
                         <AnimatePresence mode="wait">
                             {activeTabMobile === 'lyrics' && (
                                 <motion.div
                                     key="lyrics"
                                     initial={{ opacity: 0, y: 15 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     exit={{ opacity: 0, y: -15 }}
                                     className="flex-1 flex flex-col bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-4 overflow-hidden shadow-xl"
                                 >
                                      <div className="flex justify-between items-center mb-2.5 flex-shrink-0">
                                          <div className="flex items-center gap-2 text-white/80">
                                              <PenLine size={15} />
                                              <span className="text-[10px] font-black uppercase tracking-widest">Lyrics</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <button 
                                                  onClick={() => onToggleLyrics('full')} 
                                                  className="text-white/60 hover:text-[var(--primary-accent)] active:scale-95 transition-all p-1"
                                                  title="Edit / Type Lyrics"
                                              >
                                                  <PenLine size={15} />
                                              </button>
                                              <button 
                                                  onClick={() => onToggleLyrics('full')} 
                                                  className="text-white/60 hover:text-white active:scale-95 transition-transform p-1"
                                                  title="Expand Lyrics"
                                              >
                                                  <ChevronUp size={16} />
                                              </button>
                                          </div>
                                      </div>
                                     <div className="flex-1 overflow-y-auto no-scrollbar pr-1 text-center font-bold text-white text-xs leading-relaxed select-none py-1">
                                         {song.lyrics ? (
                                             <p className="whitespace-pre-wrap leading-loose drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                                 {song.lyrics}
                                             </p>
                                         ) : (
                                             <div className="h-full flex items-center justify-center text-white/40 italic text-[11px]">
                                                 No lyrics available for this song.
                                             </div>
                                         )}
                                     </div>
                                 </motion.div>
                             )}

                             {activeTabMobile === 'queue' && (
                                 <motion.div
                                     key="queue"
                                     initial={{ opacity: 0, y: 15 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     exit={{ opacity: 0, y: -15 }}
                                     className="flex-1 flex flex-col bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 p-4 overflow-hidden shadow-xl"
                                 >
                                     <div className="flex justify-between items-center mb-2.5 flex-shrink-0">
                                         <div className="flex items-center gap-2 text-white/80">
                                             <ListMusic size={15} />
                                             <span className="text-[10px] font-black uppercase tracking-widest">Up Next</span>
                                         </div>
                                         <span className="text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                             {playQueue.length - currentQueueIndex - 1} more
                                         </span>
                                     </div>
                                     
                                     <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                                         {playQueue.length > 1 && currentQueueIndex < playQueue.length - 1 ? (
                                             <ul className="flex flex-col gap-2">
                                                 {playQueue.slice(currentQueueIndex + 1).map((qSong, idx) => (
                                                     <li
                                                         key={qSong.queueId || qSong.id || idx}
                                                         onClick={() => onPlayFromQueue(qSong)}
                                                         className="flex items-center gap-2.5 p-2 rounded-2xl hover:bg-white/5 border border-transparent transition-all cursor-pointer group"
                                                     >
                                                         <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-lg border border-white/5">
                                                             <img
                                                                src={qSong.albumArtUrl || getPremiumGradientCover(qSong.title, qSong.artist)}
                                                                alt={qSong.title}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                onError={(e) => { e.currentTarget.src = getPremiumGradientCover(qSong.title, qSong.artist); }}
                                                             />
                                                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                 <Play size={12} className="text-white fill-white" />
                                                             </div>
                                                         </div>
                                                         <div className="flex-1 min-w-0">
                                                             <p className="text-[11px] font-black text-white truncate uppercase tracking-tight mb-0.5">
                                                                 {qSong.title}
                                                             </p>
                                                             <p className="text-[9px] text-white/40 truncate font-bold">
                                                                 {qSong.artist}
                                                             </p>
                                                         </div>
                                                         <button
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 setPlayQueue(prev => prev.filter(s => s.queueId !== qSong.queueId));
                                                             }}
                                                             className="p-1.5 text-white/30 hover:text-red-400 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                                                             title="Remove from queue"
                                                         >
                                                             <X size={14} />
                                                         </button>
                                                     </li>
                                                 ))}
                                             </ul>
                                         ) : (
                                             <div className="h-full flex flex-col justify-center items-center py-4 text-center text-white/40 text-[11px] gap-1.5">
                                                 <ListMusic size={20} className="opacity-50" />
                                                 <p className="font-bold">Queue is empty</p>
                                             </div>
                                         )}
                                     </div>
                                 </motion.div>
                             )}

                             {activeTabMobile === 'none' && (
                                 <motion.div
                                     key="none"
                                     initial={{ opacity: 0 }}
                                     animate={{ opacity: 1 }}
                                     exit={{ opacity: 0 }}
                                     className="flex-1 flex items-center justify-center text-center text-white/30 text-xs italic py-6"
                                 >
                                     Select Lyrics or Up Next to display content.
                                 </motion.div>
                             )}
                         </AnimatePresence>
                     </div>

                     {/* Floating Bottom Control Bar for Mobile */}
                     <div className="flex lg:hidden items-center justify-between w-full max-w-[320px] mx-auto bg-gradient-to-r from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border border-white/10 rounded-full py-1.5 px-4 shadow-2xl relative mb-2">
                         {/* Shuffle */}
                         <button 
                             onClick={onToggleShuffle} 
                             className={`p-2 transition-colors ${isShuffled ? 'text-[var(--primary-accent)] drop-shadow-[0_0_6px_var(--primary-accent)]' : 'text-white/40 hover:text-white'}`} 
                             disabled={isLive}
                         >
                             <Shuffle size={18} />
                         </button>

                         {/* Prev */}
                         <button 
                             onClick={onPrev} 
                             className="p-2 text-white/80 hover:text-white active:scale-90 transition-transform" 
                             disabled={isLive}
                         >
                             <SkipBack size={18} fill="currentColor" />
                         </button>

                         {/* Play/Pause */}
                         <button 
                             onClick={onTogglePlay} 
                             className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center active:scale-95 transition-transform hover:scale-105 shadow-lg drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] flex-shrink-0"
                         >
                             {isPlaying ? (
                                 <Pause size={18} fill="black" className="text-black" />
                             ) : (
                                 <Play size={18} fill="black" className="text-black ml-0.5" />
                             )}
                         </button>

                         {/* Next */}
                         <button 
                             onClick={onNext} 
                             className="p-2 text-white/80 hover:text-white active:scale-90 transition-transform"
                         >
                             <SkipForward size={18} fill="currentColor" />
                         </button>

                         {/* Repeat */}
                         <button 
                             onClick={onCycleRepeat} 
                             className={`p-2 transition-colors ${repeatMode !== 'none' ? 'text-[#a3e635] drop-shadow-[0_0_6px_#a3e635]' : 'text-white/40 hover:text-white'}`} 
                             disabled={isLive}
                         >
                             <span className="relative flex items-center justify-center">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat">
                                     <path d="m17 2 4 4-4 4"/>
                                     <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
                                     <path d="m7 22-4-4 4-4"/>
                                     <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
                                 </svg>
                                 {repeatMode === 'one' && (
                                     <span className="absolute text-[8px] font-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-black bg-[#a3e635] rounded-full w-3.5 h-3.5 flex items-center justify-center scale-75">1</span>
                                 )}
                             </span>
                         </button>
                     </div>

                     {/* Buttons & Direct Playback Controls (Desktop Only) */}
                     <div className="hidden lg:flex items-center justify-between w-full max-w-lg mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-full py-2 px-6 shadow-2xl relative mb-4">
                         {/* Shuffle */}
                         <button 
                             onClick={onToggleShuffle} 
                             className={`p-3 transition-all duration-300 hover:scale-110 active:scale-95 ${isShuffled ? 'text-[var(--primary-accent)] drop-shadow-[0_0_8px_var(--primary-accent)]' : 'text-white/55 hover:text-white'}`} 
                             disabled={isLive}
                             title="Shuffle"
                         >
                             <Shuffle size={20} />
                         </button>

                         {/* Prev */}
                         <button 
                             onClick={onPrev} 
                             className="p-3 text-white/80 hover:text-white hover:scale-110 active:scale-90 transition-all duration-300" 
                             disabled={isLive}
                             title="Previous Track"
                         >
                             <SkipBack size={20} fill="currentColor" />
                         </button>

                         {/* Play/Pause */}
                         <button 
                             onClick={onTogglePlay} 
                             className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] flex-shrink-0"
                             title={isPlaying ? "Pause" : "Play"}
                         >
                             {isPlaying ? (
                                 <Pause size={20} fill="black" className="text-black" />
                             ) : (
                                 <Play size={20} fill="black" className="text-black ml-0.5" />
                             )}
                         </button>

                         {/* Next */}
                         <button 
                             onClick={onNext} 
                             className="p-3 text-white/80 hover:text-white hover:scale-110 active:scale-90 transition-all duration-300"
                             title="Next Track"
                         >
                             <SkipForward size={20} fill="currentColor" />
                         </button>

                         {/* Repeat */}
                         <button 
                             onClick={onCycleRepeat} 
                             className={`p-3 transition-all duration-300 hover:scale-110 active:scale-95 ${repeatMode !== 'none' ? 'text-[#a3e635] drop-shadow-[0_0_8px_#a3e635]' : 'text-white/55 hover:text-white'}`} 
                             disabled={isLive}
                             title={`Repeat: ${repeatMode}`}
                         >
                             <span className="relative flex items-center justify-center">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat">
                                     <path d="m17 2 4 4-4 4"/>
                                     <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
                                     <path d="m7 22-4-4 4-4"/>
                                     <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
                                 </svg>
                                 {repeatMode === 'one' && (
                                     <span className="absolute text-[8px] font-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-black bg-[#a3e635] rounded-full w-3.5 h-3.5 flex items-center justify-center scale-90">1</span>
                                 )}
                             </span>
                         </button>
                     </div>


                         {/* Desktop Queue / Info Panel - Only show if lyrics/notes/transcription are active */}
                         {(isLyricsMinimized || isTranscriptionVisible) && (
                             <div className="hidden lg:block flex-1 mt-6 bg-black/20 rounded-2xl overflow-hidden border border-white/5">
                                 {renderRightPanelContent()}
                             </div>
                         )}
                </div>
            </div>
            
        </motion.div>

        {activeModal === 'sleep' && <SleepTimerModal onClose={() => setActiveModal(null)} onSetTimer={onSetSleepTimer} activeTimer={sleepTimer} />}
        {activeModal === 'visualizer' && <VisualizerModal onClose={() => setActiveModal(null)} profile={profile} onUpdateProfile={onUpdateProfile} />}
        <AudioFxModal 
            isOpen={activeModal === 'audiofx'} 
            onClose={() => setActiveModal(null)} 
            profile={profile} 
            onUpdateSettings={(settings) => onUpdateProfile(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }))}
        />
        </>
    );
};

export default PlayerOverlay;
