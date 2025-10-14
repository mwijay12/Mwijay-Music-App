import React, { useState, useRef, useEffect } from 'react';
import type { Song, ProfileData, RadioStation } from '../types.ts';
import UpNextQueue from './UpNextQueue.tsx';
import SleepTimerModal from './SleepTimerModal.tsx';
import Visualizer from './Visualizer.tsx';
import VisualizerModal from './VisualizerModal.tsx';
import { fonts } from '../constants.ts';
import WisdomCardView from './WisdomCardView.tsx';


// --- Minimized Lyrics Sub-component ---
const MinimizedLyricsView: React.FC<{
    song: Song,
    profile: ProfileData,
    onExpand: () => void
}> = ({ song, profile, onExpand }) => {
    const lyricsSettings = profile.settings.lyricsSettings;
    const lyricsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = lyricsContainerRef.current;
        if (!container || lyricsSettings.animation !== 'scroll') return;

        let animationFrameId: number;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        if (scrollHeight <= 0) return;
        
        const speedValue = lyricsSettings.animationSpeed;
        const speedMultiplier = 20 / speedValue;
        const totalDurationMs = (scrollHeight / 40) * 1000 * speedMultiplier;

        let startTime = 0;
        container.scrollTop = 0;

        const animateScroll = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const scrollProgress = Math.min(elapsedTime / totalDurationMs, 1);
            container.scrollTop = scrollHeight * scrollProgress;

            if (scrollProgress < 1) {
                animationFrameId = requestAnimationFrame(animateScroll);
            }
        };
        animationFrameId = requestAnimationFrame(animateScroll);
        
        return () => cancelAnimationFrame(animationFrameId);
    }, [lyricsSettings, song.lyrics]);

    return (
        <div className="bg-white/5 rounded-lg p-2 max-h-64 flex flex-col">
            <div className="flex justify-between items-center px-2 pb-1 flex-shrink-0">
                <h3 className="font-bold text-sm text-neutral-300 flex items-center gap-2">
                    <i className="fas fa-file-alt"></i> Lyrics
                </h3>
                <button onClick={onExpand} className="text-neutral-300 hover:text-white" title="Expand Lyrics"><i className="fas fa-expand-alt"></i></button>
            </div>
            <div ref={lyricsContainerRef} className="overflow-y-auto scroll-container flex-1">
                <div 
                    className="whitespace-pre-wrap text-center leading-relaxed"
                    style={{ 
                        fontFamily: fonts.find(f => f.name === lyricsSettings.fontFamily)?.family || 'Satoshi',
                        fontSize: `${Math.max(12, lyricsSettings.fontSize - 4)}px`,
                    }}
                >
                    {song.lyrics || "No lyrics available."}
                </div>
            </div>
        </div>
    );
};


interface PlayerOverlayProps {
    isVisible: boolean;
    song: Song | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    onClose: (e?: React.MouseEvent) => void;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
    onSeekBy: (delta: number) => void;
    onToggleFavorite: () => void;
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
    onToggleLyrics: (forceOpen?: 'full' | 'minimized') => void;
    onOpenMoodModal: () => void;
    onOpenEqualizer: () => void;
    isLyricsMinimized: boolean;
    favoriteStations: RadioStation[];
    onToggleFavoriteStation: (station: RadioStation) => void;
    onViewArtist: (artistName: string) => void;
    isQueueFlashing: boolean;
    onSharePreview: () => void;
    onExitSimpleMode: () => void;
    visualizerColor?: string | null;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return '--:--';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const PlayerOverlay: React.FC<PlayerOverlayProps> = ({
    isVisible, song, isPlaying, progress, duration, onClose, onTogglePlay, onNext, onPrev, onSeek, onSeekStart, onSeekEnd, onSeekBy, onToggleFavorite, playQueue, currentQueueIndex, setPlayQueue, onPlayFromQueue,
    repeatMode, isShuffled, onCycleRepeat, onToggleShuffle, onSetSleepTimer, sleepTimer, profile, onUpdateProfile, onToggleLyrics, onOpenMoodModal, onOpenEqualizer, isLyricsMinimized,
    favoriteStations, onToggleFavoriteStation, onViewArtist, isQueueFlashing, onSharePreview, onExitSimpleMode, visualizerColor
}) => {
    const [activeModal, setActiveModal] = useState<'sleep' | 'visualizer' | null>(null);
    const tapTimeoutRef = useRef<number | null>(null);
    const seekIntervalRef = useRef<number | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const minSwipeDistance = 50;
    
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    const [isHeartBeating, setIsHeartBeating] = useState(false);

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
    }, [song, isVisible]);

    if (!song || !profile) return null;

    if (profile.settings.simpleMode.enabled) {
        return <WisdomCardView song={song} isPlaying={isPlaying} onTogglePlay={onTogglePlay} onNext={onNext} onPrev={onPrev} profile={profile} onUpdateProfile={onUpdateProfile} onExit={onExitSimpleMode} onToggleSongFavorite={onToggleFavorite} />;
    }

    const isLive = song.duration === Infinity || duration === Infinity;
    const isRadioFavorited = isLive && favoriteStations.some(s => s.stationuuid === song.id);
    
    let displayTitle = song.title;
    let displayArtist = song.artist;
    if (isLive && song.streamTitle) {
        const parts = song.streamTitle.split(' - ');
        if (parts.length > 1) {
            displayArtist = parts[0].trim();
            displayTitle = parts.slice(1).join(' - ').trim();
        } else {
            displayTitle = song.streamTitle;
        }
    }

    const handleFavoriteClick = () => {
        setIsHeartBeating(true);
        setTimeout(() => setIsHeartBeating(false), 500);
        if (isLive) {
            const stationToToggle: RadioStation = {
                stationuuid: song.id,
                name: song.title, // Use station name from song object
                url_resolved: song.url || '',
                favicon: song.albumArtUrl,
                country: song.artist, // Use country from song object
                countrycode: '',
                bitrate: 0,
            };
            onToggleFavoriteStation(stationToToggle);
        } else {
            onToggleFavorite();
        }
    };


    const handleTouchStart = (e: React.TouchEvent) => {
        if (isLive) return;
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isLive) return;
        setTouchEndX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (isLive || !touchStartX || !touchEndX) return;
        const distance = touchStartX - touchEndX;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            onNext();
        } else if (isRightSwipe) {
            onPrev();
        }
        
        setTouchStartX(null);
        setTouchEndX(null);
    };
    
    const handleDoubleTap = () => {
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
            onTogglePlay();
        } else {
            tapTimeoutRef.current = window.setTimeout(() => {
                tapTimeoutRef.current = null;
            }, 300);
        }
    };
    
    const handleSeekHoldStart = (direction: 'rewind' | 'forward') => {
        if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
        seekIntervalRef.current = window.setInterval(() => {
            onSeekBy(direction === 'forward' ? 1 : -1);
        }, 100);
    };

    const handleSeekHoldEnd = () => {
        if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
    };

    const handleExpandLyrics = () => {
        onToggleLyrics('full');
    };

    const progressPercentage = (progress / (duration || 1)) * 100;
    const { spinSpeed, albumArtShape, albumArtSize } = profile.settings.visualizerSettings;
    const { enabled: neonEnabled, style: neonStyle, speed: neonSpeed } = profile.settings.neonGlow;
    const animationDuration = (11 - neonSpeed) * 0.5;

    const albumArtClasses = albumArtShape === 'circle' ? 'rounded-full' : 'rounded-2xl';
    const artPadding = 20 * (1.5 - (albumArtSize || 1));
    const shouldSpin = isPlaying && !isLive && albumArtShape !== 'square';
    
    return (
        <div className={`fixed inset-0 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
            <div
                className="absolute inset-0 bg-cover bg-center -m-4 filter blur-3xl opacity-40"
                style={{ backgroundImage: `url(${song.albumArtUrl})` }}
            />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative z-10 flex-1 flex flex-col text-white h-full overflow-hidden">
                <header className="flex-shrink-0 flex justify-between items-center gap-4 p-4">
                    <button onClick={onClose} className="text-2xl flex-shrink-0" aria-label="Close player" title="Close player">
                        <i className="fas fa-chevron-down"></i>
                    </button>
                    <div ref={titleContainerRef} className="text-center min-w-0 flex-1">
                        <p className="text-sm font-bold uppercase text-neutral-400">{isLive ? 'Live Radio' : 'Now Playing'}</p>
                         <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                            <p ref={titleRef} className="marquee-content font-bold text-lg" title={displayTitle}>
                                {displayTitle}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setActiveModal('sleep')} className={`text-2xl flex-shrink-0 transition-colors ${sleepTimer.mode !== 'off' ? 'text-[var(--primary-accent)]' : 'hover:text-white'}`} aria-label="Set sleep timer" title="Set sleep timer">
                        <i className="fas fa-clock"></i>
                    </button>
                </header>

                <main
                    className="flex-1 min-h-0 flex flex-col justify-center items-center text-center gap-4 overflow-hidden relative px-4"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={visualizerColor ? { '--visualizer-color': visualizerColor } as React.CSSProperties : {}}
                >
                    {/* Interaction Layers */}
                    {!isLive && (
                        <>
                            <div title="Hold to rewind" onMouseDown={() => handleSeekHoldStart('rewind')} onMouseUp={handleSeekHoldEnd} onTouchStart={() => handleSeekHoldStart('rewind')} onTouchEnd={handleSeekHoldEnd} onMouseLeave={handleSeekHoldEnd} className="absolute left-0 top-0 h-full w-1/3 z-10" />
                            <div title="Double-tap to play/pause" onClick={handleDoubleTap} className="absolute top-0 h-full w-1/3 left-1/3 z-10" />
                            <div title="Hold to fast-forward" onMouseDown={() => handleSeekHoldStart('forward')} onMouseUp={handleSeekHoldEnd} onTouchStart={() => handleSeekHoldStart('forward')} onTouchEnd={handleSeekHoldEnd} onMouseLeave={handleSeekHoldEnd} className="absolute right-0 top-0 h-full w-1/3 z-10" />
                        </>
                    )}

                    {/* Visualizer and Art Container */}
                    <div
                        className="relative w-full max-w-xs aspect-square flex-shrink-0"
                    >
                        <Visualizer type={profile.settings.visualizerSettings.type} isPlaying={isPlaying} />
                        <div 
                            className="absolute inset-0 flex items-center justify-center double-tap-area"
                            style={{ padding: `${artPadding}%` }}
                        >
                            <img
                                src={song.albumArtUrl}
                                alt={`Album art for ${song.title}`}
                                className={`w-full h-full shadow-2xl object-cover transition-all duration-300 ${albumArtClasses} ${shouldSpin ? 'spinning-player' : ''}`}
                                style={{ animationDuration: `${spinSpeed}s`}}
                            />
                        </div>
                    </div>
                </main>
                
                <footer className="flex-shrink-0 flex flex-col p-4">
                    <div className="flex justify-around items-center text-3xl text-neutral-300 my-4">
                        <button onClick={handleFavoriteClick} className="hover:text-white transition-colors" aria-label="Like" title={song.isFavorite || isRadioFavorited ? "Unlike" : "Like"}>
                            <i className={`${isHeartBeating ? 'heart-beat-anim' : ''} ${song.isFavorite || isRadioFavorited ? 'fas text-red-500' : 'far'} fa-heart`}></i>
                        </button>
                         <button onClick={() => setActiveModal('visualizer')} className="hover:text-white" aria-label="Visualizer Settings" title="Visualizer Settings">
                           <i className="fas fa-wave-square"></i>
                        </button>
                         <button onClick={onOpenEqualizer} className="hover:text-white" aria-label="Equalizer" title="Audio Effects & EQ">
                            <i className="fas fa-sliders-h"></i>
                        </button>
                        <button onClick={() => onToggleLyrics()} className={`hover:text-white transition-colors ${isLyricsMinimized ? 'text-[var(--primary-accent)]' : ''}`} aria-label="Show lyrics" title="Toggle Lyrics Preview" disabled={isLive}>
                            <i className="fas fa-feather-pointed"></i>
                        </button>
                        <button onClick={onOpenMoodModal} className="hover:text-white" aria-label="Set Mood" title={song.moodEmoji ? `Current mood: ${song.moodEmoji}` : "Set Song Mood"} disabled={isLive}>
                             <i className={`fas ${song.moodEmoji ? 'fa-laugh-beam' : 'fa-smile'}`}></i>
                        </button>
                    </div>

                    {!isLive && (
                        <div className="mb-2">
                            <input
                                type="range"
                                min="0"
                                max={duration || 1}
                                value={progress}
                                onChange={onSeek}
                                onMouseDown={onSeekStart}
                                onMouseUp={onSeekEnd}
                                onTouchStart={onSeekStart}
                                onTouchEnd={onSeekEnd}
                                className="w-full themed-slider"
                                style={{ backgroundSize: `${progressPercentage}% 100%` }}
                                aria-label="Song progress"
                            />
                            <div className="flex justify-between text-xs font-mono mt-1 text-neutral-400">
                                <span>{formatTime(progress)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex-shrink-0 fade-bottom-mask mb-2">
                       {isLyricsMinimized && song.lyrics ? (
                           <MinimizedLyricsView song={song} profile={profile} onExpand={handleExpandLyrics} />
                       ) : (
                           <UpNextQueue queue={playQueue} currentQueueIndex={currentQueueIndex} setPlayQueue={setPlayQueue} onPlayFromQueue={onPlayFromQueue} isFlashing={isQueueFlashing} />
                       )}
                    </div>

                    <div
                        className={`flex-shrink-0 neon-glow-container ${neonEnabled ? `active style-${neonStyle}` : ''}`}
                        style={{ borderRadius: '9999px', '--animation-duration': `${animationDuration}s` } as React.CSSProperties}
                    >
                        <div className="liquid-glass-pane flex justify-around items-center relative p-1 rounded-full h-[var(--footer-height)]">
                            <button onClick={onToggleShuffle} className={`text-lg w-12 h-12 transition-colors ${isShuffled ? 'text-[var(--primary-accent)]' : 'text-neutral-400'}`} aria-label="Toggle Shuffle" title="Toggle Shuffle">
                                <i className="fas fa-shuffle"></i>
                            </button>
                            <button onClick={onPrev} disabled={isLive} className="player-control-button text-2xl w-16 h-16 text-neutral-200 disabled:opacity-50" aria-label="Previous song" title="Previous song">
                                <i className="fas fa-backward-step"></i>
                            </button>
                            <button onClick={onTogglePlay} className="player-control-button w-16 h-16 bg-white text-black rounded-full text-3xl flex items-center justify-center shadow-lg" aria-label={isPlaying ? 'Pause' : 'Play'} title={isPlaying ? 'Pause' : 'Play'}>
                                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                            </button>
                            <button onClick={onNext} disabled={isLive} className="player-control-button text-2xl w-16 h-16 text-neutral-200 disabled:opacity-50" aria-label="Next song" title="Next song">
                                <i className="fas fa-forward-step"></i>
                            </button>
                            <button onClick={onCycleRepeat} className={`text-lg w-12 h-12 transition-colors relative ${repeatMode !== 'none' ? 'text-[var(--primary-accent)]' : 'text-neutral-400'}`} aria-label="Cycle repeat mode" title={`Repeat: ${repeatMode}`}>
                                <i className="fas fa-repeat"></i>
                                {repeatMode === 'one' && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold bg-[var(--primary-accent)] text-black w-3 h-3 flex items-center justify-center rounded-full">1</span>}
                                {repeatMode === 'all' && <div className="absolute w-1 h-1 bg-[var(--primary-accent)] rounded-full bottom-2.5 left-1/2 -translate-x-1/2"></div>}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
            {activeModal === 'sleep' && <SleepTimerModal onClose={() => setActiveModal(null)} onSetTimer={onSetSleepTimer} activeTimer={sleepTimer} />}
            {activeModal === 'visualizer' && <VisualizerModal onClose={() => setActiveModal(null)} profile={profile} onUpdateProfile={onUpdateProfile} />}
        </div>
    );
};

export default React.memo(PlayerOverlay);