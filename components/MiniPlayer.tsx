
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Heart, Eye, EyeOff, Share2 } from 'lucide-react';
import type { Song, ProfileData } from '../types.ts';
import { truncate, getPremiumGradientCover, shareTextOrUrl } from '../utils/helpers.ts';
import AnimatedCoverArt from './AnimatedCoverArt.tsx';

interface MiniPlayerProps {
    song: Song;
    isPlaying: boolean;
    progress: number;
    duration: number;
    onTogglePlay: () => void;
    onShowPlayer: () => void;
    onToggleFavorite: () => void;
    onNext: () => void;
    isFooterHidden: boolean;
    onToggleFooter: () => void;
    profile: ProfileData | null;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ song, isPlaying, progress, duration, onShowPlayer, onTogglePlay, onToggleFavorite, onNext, isFooterHidden, onToggleFooter, profile }) => {
    const [isDesktop, setIsDesktop] = useState(false);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const collapseTimeoutRef = useRef<number | null>(null);
    const hoverTimeoutRef = useRef<number | null>(null);

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

    const resetCollapseTimer = useCallback(() => {
        if (isDesktop) return;
        if (collapseTimeoutRef.current) {
            clearTimeout(collapseTimeoutRef.current);
        }
        collapseTimeoutRef.current = window.setTimeout(() => {
            setIsCollapsed(true);
        }, 5000);
    }, [isDesktop]);

    useEffect(() => {
        if (isDesktop) {
            setIsCollapsed(false);
            return;
        }
        setIsCollapsed(false);
        resetCollapseTimer();
        return () => {
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
            }
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [song, isPlaying, resetCollapseTimer, isDesktop]);

    const handleMouseEnter = () => {
        if (isDesktop) return;
        if (isCollapsed) {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = window.setTimeout(() => {
                setIsCollapsed(false);
                resetCollapseTimer();
            }, 300); // 300ms delay before expanding
        } else {
            resetCollapseTimer();
        }
    };

    const handleMouseLeave = () => {
        if (isDesktop) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        resetCollapseTimer();
    };

    const handleClick = () => {
        if (isDesktop) {
            onShowPlayer();
            return;
        }
        if (isCollapsed) {
            setIsCollapsed(false);
            resetCollapseTimer();
        } else {
            onShowPlayer();
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
        resetCollapseTimer();
    };
    
    const bottomPosition = isFooterHidden ? '1rem' : `calc(var(--footer-height) + 1rem + env(safe-area-inset-bottom, 0rem))`;

    return (
        <motion.div 
            className="absolute left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-sm lg:max-w-lg flex justify-center"
            style={{ bottom: bottomPosition }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            role="button" tabIndex={0}
            aria-label={`Open full player for ${song.title}`}
        >
            <motion.div 
                className={`relative flex items-center shadow-lg bg-[var(--surface-color)]/60 backdrop-blur-xl border border-white/10 overflow-hidden w-full rounded-full h-16`}
                animate={{ width: (isCollapsed && !isDesktop) ? '14rem' : '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
                <AnimatePresence>
                {isCollapsed ? (
                     <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full flex items-center justify-between gap-2 p-2"
                     >
                        <div className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden relative`}>
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
                            <p title={displayTitle} className="font-bold text-base text-[var(--text-primary)] truncate">{truncate(displayTitle, 12)}</p>
                            <p className="text-sm truncate text-[var(--text-secondary)]">{truncate(displayArtist ?? '', 12)}</p>
                        </div>
                        <button onClick={(e) => handleControlClick(e, onNext)} className="w-12 h-12 flex items-center justify-center text-white text-xl flex-shrink-0" aria-label="Next Track">
                           <SkipForward size={20} />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="expanded"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full flex items-center gap-3 p-2"
                    >
                         <div className={`w-12 h-12 rounded-full flex-shrink-0 overflow-hidden relative`}>
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

                        <div className="flex flex-grow items-center min-w-0">
                            <div ref={titleContainerRef} className="flex-grow min-w-0">
                                <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`} style={{ '--container-width': `${titleContainerRef.current?.clientWidth}px` } as React.CSSProperties}>
                                    <p ref={titleRef} title={displayTitle} className="marquee-content font-bold text-base text-[var(--text-primary)]">{displayTitle}</p>
                                </div>
                                <p className="text-sm truncate text-[var(--text-secondary)]">{displayArtist}</p>
                            </div>
                            <div className="controls flex items-center gap-0.5 text-[var(--text-primary)] text-xl pl-1">
                                <button 
                                    onClick={(e) => handleControlClick(e, () => {
                                        shareTextOrUrl(
                                            'Now playing on Mwijay Music',
                                            `Check out "${song.title}" by ${song.artist}!`,
                                            window.location.href
                                        );
                                    })} 
                                    className="w-10 h-10 flex items-center justify-center hover:text-[var(--primary-accent)]" 
                                    aria-label="Share Song"
                                >
                                    <Share2 size={20} />
                                </button>
                                <button onClick={(e) => handleControlClick(e, onToggleFavorite)} className="w-10 h-10 flex items-center justify-center hover:text-[var(--primary-accent)]" aria-label={song.isFavorite ? "Unfavorite" : "Favorite"} disabled={isLive}>
                                    <Heart size={20} className={song.isFavorite ? 'text-red-500 fill-red-500' : ''} />
                                </button>
                                <button onClick={(e) => handleControlClick(e, onTogglePlay)} className="w-10 h-10 flex items-center justify-center hover:text-[var(--primary-accent)]" aria-label={isPlaying ? "Pause" : "Play"}>
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                                </button>
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
    );
};

export default MiniPlayer;
