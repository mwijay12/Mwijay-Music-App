
import React, { useRef, useState, useEffect, memo } from 'react';
import { Plus, Play, PenLine } from 'lucide-react';
import type { Song } from '../types.ts';
import AnimatedCoverArt from './AnimatedCoverArt.tsx';
import { getPremiumGradientCover } from '../utils/helpers.ts';
import { MarqueeText } from './MarqueeText.tsx';

const SongListItem: React.FC<{ 
    song: Song, 
    onPlaySong: () => void, 
    onAddToQueue: () => void, 
    onOpenDetails: () => void,
    onViewArtist: (artist: string) => void,
    onOpenLyrics?: () => void,
    isHighlighted: boolean,
    nowPlaying: Song | null;
    isPlaying: boolean;
    showActions?: boolean;
    domId?: string;
}> = memo(({ song, onPlaySong, onAddToQueue, onOpenDetails, onViewArtist, onOpenLyrics, isHighlighted, nowPlaying, isPlaying, showActions = true, domId }) => {
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

    const isCurrentlyPlaying = nowPlaying?.id === song.id && isPlaying;
    const hasLyricsOrTranscription = song.lyrics || song.transcription;

    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                const isOverflowing = titleRef.current.scrollWidth > titleContainerRef.current.clientWidth;
                setIsTitleOverflowing(isOverflowing);
            }
        };

        const timeoutId = setTimeout(checkOverflow, 50); // Delay to allow rendering
        window.addEventListener('resize', checkOverflow);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [song.title]);
    

    return (
         <li id={domId} key={song.id} className={`song-list-item w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors ${isHighlighted ? 'newly-added-highlight' : ''}`}>
            <button onClick={onOpenDetails} className="relative flex-shrink-0 p-0 border-none bg-transparent w-12 h-12 rounded-md overflow-hidden">
                <img 
                    src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                    alt={`${song.title} album art`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { 
                        if (!e.currentTarget.dataset.fallbackApplied) {
                            e.currentTarget.dataset.fallbackApplied = 'true';
                            e.currentTarget.src = getPremiumGradientCover(song.title, song.artist);
                        }
                    }}
                />
                {isCurrentlyPlaying && (
                    <div className="playing-indicator-overlay">
                         <div className="mini-visualizer">
                            <span style={{ animationDelay: '0.1s' }} />
                            <span style={{ animationDelay: '0.3s' }}/>
                            <span style={{ animationDelay: '0.2s' }}/>
                        </div>
                    </div>
                )}
            </button>
            <div className="flex-1 min-w-0" onClick={onOpenDetails}>
              <div className="flex items-center gap-1.5 w-full min-w-0 flex-1">
                <div className="flex-1 min-w-0">
                  <MarqueeText
                    text={song.title}
                    className={`font-bold text-sm leading-normal ${isCurrentlyPlaying ? 'text-[var(--primary-accent)]' : 'text-[var(--text-primary)]'}`}
                    isActive={isCurrentlyPlaying}
                    speed={35}
                  />
                </div>
                {onOpenLyrics && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenLyrics(); }}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors flex items-center justify-center flex-shrink-0"
                        title="Lyrics & Transcription"
                    >
                        <PenLine size={12} className={`${hasLyricsOrTranscription ? 'text-[var(--primary-accent)]' : 'text-neutral-500'} flex-shrink-0`} />
                    </button>
                )}
              </div>
              <div className="w-full min-w-0" onClick={(e) => { e.stopPropagation(); onViewArtist(song.artist); }}>
                <MarqueeText
                  text={song.artist}
                  className="text-xs text-neutral-400 cursor-pointer hover:underline"
                  isActive={isCurrentlyPlaying}
                  speed={30}
                />
              </div>
            </div>
            {showActions && (
                  <div className="flex items-center flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); onAddToQueue(); }} className="w-10 h-10 rounded-full text-neutral-400 hover:text-white flex items-center justify-center" aria-label={`Add ${song.title} to queue`} title="Add to Queue">
                        <Plus size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onPlaySong(); }} className="w-10 h-10 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center ml-1" aria-label={`Play ${song.title}`} title={`Play ${song.title}`}>
                        <Play size={18} fill="currentColor" />
                    </button>
                </div>
            )}
          </li>
    );
});

export default SongListItem;
