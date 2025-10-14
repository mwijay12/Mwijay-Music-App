import React, { useState, useEffect, useRef } from 'react';
import type { Song } from '../types.ts';

interface MiniPlayerProps {
    song: Song;
    isPlaying: boolean;
    progress: number;
    onTogglePlay: () => void;
    onShowPlayer: () => void;
    onToggleFavorite: () => void;
    onNext: () => void;
    isHidden?: boolean;
}

type DisplayMode = 'expanded' | 'compact' | 'circular';

const MiniPlayer: React.FC<MiniPlayerProps> = ({ song, isPlaying, progress, onShowPlayer, onTogglePlay, onToggleFavorite, onNext, isHidden = false }) => {
    const [mode, setMode] = useState<DisplayMode>('expanded');
    const interactionTimeout = useRef<number | null>(null);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

    const isLive = song.duration === Infinity;

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

    useEffect(() => {
        if (mode !== 'expanded') {
            setIsTitleOverflowing(false);
            return;
        }
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                const isOverflowing = titleRef.current.scrollWidth > titleContainerRef.current.clientWidth;
                setIsTitleOverflowing(isOverflowing);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 50);
        window.addEventListener('resize', checkOverflow);
        return () => { clearTimeout(timeoutId); window.removeEventListener('resize', checkOverflow); };
    }, [song.title, mode, displayTitle]);

    useEffect(() => {
        const resetTimeout = () => {
            if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
            interactionTimeout.current = window.setTimeout(() => {
                if (mode === 'expanded') {
                    setMode('compact');
                }
            }, 5000);
        };
        if (mode === 'expanded') { resetTimeout(); } 
        else { if (interactionTimeout.current) clearTimeout(interactionTimeout.current); }
        return () => { if (interactionTimeout.current) clearTimeout(interactionTimeout.current); };
    }, [mode, song]);

    const handleControlClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        setMode('expanded');
        action();
    };
    
    const handleNextClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNext();
    };

    const handleMainClick = () => {
        if (mode === 'circular') { setMode('expanded'); } 
        else { onShowPlayer(); }
    };
    
    const bottomPosition = 'calc(var(--footer-height) + 1rem)';

    if (mode === 'circular') {
        return (
            <div className={`fixed right-4 z-40 w-14 h-14 transition-transform duration-300 ${isHidden ? 'translate-y-48' : 'translate-y-0'}`} style={{ bottom: bottomPosition }}>
                <div 
                    onClick={handleMainClick} 
                    className="w-full h-full rounded-full bg-[var(--surface-color)]/80 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center relative group"
                    aria-label="Expand player"
                    title="Expand player"
                >
                    <img className={`w-full h-full rounded-full object-cover p-1 ${isPlaying ? 'spinning-player' : ''}`} src={song.albumArtUrl} alt="Album Art" />
                </div>
            </div>
        );
    }
    
    if (mode === 'compact') {
        const truncatedTitle = displayTitle.length > 12 ? `${displayTitle.substring(0, 12)}...` : displayTitle;
        return (
            <div className={`fixed left-4 right-4 z-40 flex justify-center transition-transform duration-300 ${isHidden ? 'translate-y-48' : 'translate-y-0'}`} style={{ bottom: bottomPosition }}>
                 <div 
                    onClick={() => setMode('expanded')}
                    role="button" tabIndex={0}
                    aria-label={`Expand player for ${song.title}`}
                    title="Expand controls"
                    className="flex items-center gap-3 cursor-pointer shadow-lg bg-[var(--surface-color)]/80 backdrop-blur-md border border-white/10 p-2 overflow-hidden rounded-full h-16"
                 >
                     <img className={`w-12 h-12 rounded-full object-cover flex-shrink-0 ${isPlaying ? 'spinning-player' : ''}`} src={song.albumArtUrl} alt={`Album Art for ${song.title}`} />
                     <div className="flex-1 min-w-0">
                        <p title={displayTitle} className="font-bold text-sm text-[var(--text-primary)] truncate">{truncatedTitle}</p>
                        <p className="text-xs truncate text-[var(--text-secondary)]">{displayArtist}</p>
                    </div>
                    <button onClick={handleNextClick} className="w-12 h-12 flex-shrink-0 flex items-center justify-center hover:text-[var(--primary-accent)] text-xl" aria-label="Next song" title="Next song">
                       <i className="fas fa-forward-step"></i>
                   </button>
                 </div>
            </div>
        )
    }

    return (
        <div 
            className={`fixed left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm flex justify-center transition-transform duration-300 ${isHidden ? 'translate-y-48' : 'translate-y-0'}`}
            style={{ bottom: bottomPosition }}
            onClick={onShowPlayer}
        >
            <div 
                className={`relative flex items-center gap-4 cursor-pointer shadow-lg bg-[var(--surface-color)]/80 backdrop-blur-md border border-white/10 p-2 overflow-hidden w-full rounded-full h-16`}
                role="button" tabIndex={0}
                aria-label={`Open full player for ${song.title}`}
                title={`Open full player for ${song.title}`}
            >
                <img className={`w-12 h-12 rounded-full object-cover flex-shrink-0 ${isPlaying ? 'spinning-player' : ''}`} src={song.albumArtUrl} alt={`Album Art for ${song.title}`} />
                <div className="flex flex-grow items-center min-w-0">
                    <div ref={titleContainerRef} className="flex-grow min-w-0">
                        <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                             <p ref={titleRef} title={displayTitle} className="marquee-content font-bold text-base text-[var(--text-primary)]">{displayTitle}</p>
                        </div>
                        <p className="text-sm truncate text-[var(--text-secondary)]">{displayArtist}</p>
                    </div>
                    <div className="controls flex items-center gap-1 text-[var(--text-primary)] text-xl px-1">
                        <button onClick={(e) => handleControlClick(e, onToggleFavorite)} className="w-10 h-10 flex items-center justify-center hover:text-[var(--primary-accent)]" aria-label={song.isFavorite ? "Unfavorite" : "Favorite"} title={song.isFavorite ? "Unfavorite" : "Favorite"} disabled={isLive}>
                           <i className={`${song.isFavorite ? 'fas text-red-500' : 'far'} fa-heart text-lg`}></i>
                       </button>
                        <button onClick={(e) => handleControlClick(e, onTogglePlay)} className="w-10 h-10 flex items-center justify-center hover:text-[var(--primary-accent)]" aria-label={isPlaying ? "Pause" : "Play"} title={isPlaying ? "Pause" : "Play"}>
                           <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                       </button>
                       <button onClick={(e) => handleControlClick(e, () => setMode('circular'))} className="w-10 h-10 flex items-center justify-center hover:text-[var(--primary-accent)]" aria-label="Collapse Player" title="Collapse to icon">
                           <i className="fas fa-times"></i>
                       </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiniPlayer;