import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Heart } from 'lucide-react';
import type { Song, ProfileData } from '../types.ts';
import { truncate, getPremiumGradientCover } from '../utils/helpers.ts';
import SpeedControlModal from './SpeedControlModal.tsx';
import { usePlaybackSpeed } from '../hooks/usePlaybackSpeed.ts';

interface MiniPlayerProps {
    song: Song;
    isPlaying: boolean;
    progress: number;
    duration: number;
    onTogglePlay: () => void;
    onShowPlayer: () => void;
    onToggleFavorite: () => void;
    onNext: () => void;
    onPrev: () => void;
    isFooterHidden: boolean;
    onToggleFooter: () => void;
    profile: ProfileData | null;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ song, isPlaying, progress, duration, onShowPlayer, onTogglePlay, onToggleFavorite, onNext, onPrev, isFooterHidden }) => {
    const [isDesktop, setIsDesktop] = useState(false);
    const [showSpeedModal, setShowSpeedModal] = useState(false);
    const { speed, isModified } = usePlaybackSpeed();
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('mini_player_collapsed') === 'true';
    });
    const [dragPosition, setDragPosition] = useState(() => ({
        x: parseFloat(localStorage.getItem('mini_player_drag_x') || '0'),
        y: parseFloat(localStorage.getItem('mini_player_drag_y') || '0'),
    }));
    const isLive = song.duration === Infinity;
    const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 5-second auto-collapse timer when expanded
    useEffect(() => {
        if (!isCollapsed) {
            const timer = setTimeout(() => {
                setIsCollapsed(true);
                localStorage.setItem('mini_player_collapsed', 'true');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isCollapsed]);

    const handleClick = (e: React.MouseEvent) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            localStorage.setItem('mini_player_collapsed', 'false');
            return;
        }
        
        // Tapping expanded background on desktop, or album art/metadata launches full player
        const target = e.target as HTMLElement;
        const isOverlayTrigger = isDesktop || target.closest('.mini-art') || target.closest('.mini-metadata');
        if (isOverlayTrigger) {
            onShowPlayer();
        } else {
            setIsCollapsed(true);
            localStorage.setItem('mini_player_collapsed', 'true');
        }
    };

    let displayTitle = song.title;
    let displayArtist = song.artist;
    if (isLive && song.streamTitle) {
        const parts = song.streamTitle.split(' - ');
        displayArtist = parts.length > 1 ? parts[0].trim() : song.title;
        displayTitle = parts.length > 1 ? parts.slice(1).join(' - ').trim() : song.streamTitle;
    }

    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                setIsTitleOverflowing(titleRef.current.scrollWidth > titleContainerRef.current.clientWidth);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 50);
        window.addEventListener('resize', checkOverflow);
        return () => { clearTimeout(timeoutId); window.removeEventListener('resize', checkOverflow); };
    }, [song.title, displayTitle, isCollapsed]);

    const handleControlClick = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        action?.();
    };
    
    const bottomPosition = isFooterHidden ? '1rem' : `calc(var(--footer-height) + 1rem + env(safe-area-inset-bottom, 0rem))`;

    return (
        <>
        <motion.div 
            className={`fixed z-40 w-[95%] max-w-sm flex justify-center lg:max-w-md ${
                isDesktop ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            }`}
            style={{ 
                bottom: bottomPosition,
                ...(isDesktop ? { right: '1.5rem' } : { left: '50%' })
            }}
            initial={false}
            animate={{ 
                x: isDesktop ? dragPosition.x : '-50%', 
                y: isDesktop ? dragPosition.y : 0 
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            drag={isDesktop}
            dragMomentum={false}
            onDragEnd={(_, info) => {
                const newX = dragPosition.x + info.offset.x;
                const newY = dragPosition.y + info.offset.y;
                setDragPosition({ x: newX, y: newY });
                localStorage.setItem('mini_player_drag_x', String(newX));
                localStorage.setItem('mini_player_drag_y', String(newY));
            }}
            onClick={handleClick}
            role="button" tabIndex={0}
            aria-label={`Open full player for ${song.title}`}
        >
            <motion.div 
                className="relative flex items-center shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] bg-[var(--surface-color)]/60 backdrop-blur-xl border border-white/10 overflow-hidden w-full rounded-full h-16"
                animate={{ width: isCollapsed ? '13rem' : '100%' }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
                {/* Visualizer Background */}
                {isPlaying && (
                    <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none opacity-10">
                        <div className="flex items-end justify-around h-full w-full px-6 gap-1">
                            {[...Array(15)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-full bg-[var(--primary-accent)] rounded-t-full"
                                    animate={{ height: ['10%', `${20 + Math.random() * 60}%`, '10%'] }}
                                    transition={{ duration: 0.4 + Math.random() * 0.6, repeat: Infinity, ease: "easeInOut" }}
                                />
                            ))}
                        </div>
                    </div>
                )}
                
                <AnimatePresence mode="wait">
                {isCollapsed ? (
                     <motion.div
                        key="collapsed"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="w-full h-full flex items-center justify-between gap-2 p-2"
                     >
                        <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden relative mini-art">
                            <img 
                                src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                                alt={`Album Art for ${song.title}`}
                                className={`w-full h-full object-cover rotating-art ${isPlaying ? 'playing' : ''}`}
                                onError={(e) => { 
                                    if (!e.currentTarget.dataset.fallbackApplied) {
                                        e.currentTarget.dataset.fallbackApplied = 'true';
                                        e.currentTarget.src = getPremiumGradientCover(song.title, song.artist);
                                    }
                                }}
                            />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p title={displayTitle} className="font-bold text-sm text-[var(--text-primary)] truncate">{truncate(displayTitle, 10)}</p>
                            <p className="text-xs truncate text-[var(--text-secondary)]">{truncate(displayArtist ?? '', 10)}</p>
                        </div>
                        
                        <button 
                            onClick={(e) => handleControlClick(e, onNext)}
                            className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:text-[var(--primary-accent)] flex-shrink-0 mr-1 bg-white/5 rounded-full"
                            aria-label="Next Track"
                        >
                            <SkipForward size={16} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="expanded"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full h-full flex items-center gap-3 p-2"
                    >
                        <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden relative mini-art">
                            <img 
                                src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                                alt={`Album Art for ${song.title}`}
                                className={`w-full h-full object-cover rotating-art ${isPlaying ? 'playing' : ''}`}
                                onError={(e) => { 
                                    if (!e.currentTarget.dataset.fallbackApplied) {
                                        e.currentTarget.dataset.fallbackApplied = 'true';
                                        e.currentTarget.src = getPremiumGradientCover(song.title, song.artist);
                                    }
                                }}
                            />
                        </div>

                        <div className="flex flex-grow items-center min-w-0 justify-between">
                            <div ref={titleContainerRef} className="flex-grow min-w-0 mini-metadata">
                                <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`} style={{ '--container-width': `${titleContainerRef.current?.clientWidth}px` } as React.CSSProperties}>
                                    <p ref={titleRef} title={displayTitle} className="marquee-content font-bold text-base text-[var(--text-primary)]">{displayTitle}</p>
                                </div>
                                <p className="text-sm truncate text-[var(--text-secondary)]">{displayArtist}</p>
                            </div>
                            
                             <div className="controls flex items-center gap-1.5 text-[var(--text-primary)] pl-1 mr-2">
                                 <button onClick={(e) => handleControlClick(e, onPrev)} className="w-9 h-9 flex items-center justify-center hover:text-[var(--primary-accent)] bg-white/5 rounded-full" aria-label="Previous Track">
                                     <SkipBack size={16} />
                                 </button>
                                 <button onClick={(e) => handleControlClick(e, onToggleFavorite)} className="w-9 h-9 flex items-center justify-center hover:text-[var(--primary-accent)] bg-white/5 rounded-full" aria-label={song.isFavorite ? "Unfavorite" : "Favorite"} disabled={isLive}>
                                     <Heart size={16} className={song.isFavorite ? 'text-red-500 fill-red-500' : ''} />
                                 </button>
                                 <button onClick={(e) => handleControlClick(e, onTogglePlay)} className="w-9 h-9 flex items-center justify-center hover:text-[var(--primary-accent)] bg-white/5 rounded-full" aria-label={isPlaying ? "Pause" : "Play"}>
                                     {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                 </button>
                                 {isModified && (
                                     <button
                                         onClick={(e) => { e.stopPropagation(); setShowSpeedModal(true); }}
                                         className="text-[10px] font-bold text-[var(--primary-accent)] bg-[var(--primary-accent)]/10 px-1.5 py-0.5 rounded-full border border-[var(--primary-accent)]/30 flex-shrink-0"
                                         aria-label={`Speed: ${speed}x — tap to change`}
                                     >
                                         {speed.toFixed(2)}x
                                     </button>
                                 )}
                             </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--surface-border-color)]">
                    <div className={`h-full bg-[var(--primary-accent)] ${isLive ? 'live-stream' : ''}`} style={{ width: isLive ? '100%' : `${progressPercentage}%` }} />
                </div>
            </motion.div>
        </motion.div>
        <SpeedControlModal isOpen={showSpeedModal} onClose={() => setShowSpeedModal(false)} />
    </>
    );
};

export default MiniPlayer;
