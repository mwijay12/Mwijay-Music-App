
import React, { useState, useRef, useEffect, memo } from 'react';
import { GripVertical, X, Trash2, ListMusic, List, SortDesc, SortAsc, User, Shuffle } from 'lucide-react';
import type { Song } from '../types.ts';
import AnimatedCoverArt from './AnimatedCoverArt.tsx';

interface QueueItemProps {
    song: Song;
    isPlaying: boolean;
    onPlayFromQueue: (song: Song) => void;
    handleRemove: (e: React.MouseEvent, queueId?: string) => void;
    handleDragStart: (position: number) => void;
    handleDragEnter: (position: number) => void;
    handleDrop: () => void;
    index: number;
    currentItemRef: React.RefObject<HTMLLIElement> | null;
}

const QueueItem: React.FC<QueueItemProps> = memo(({
    song, isPlaying, onPlayFromQueue, handleRemove, handleDragStart, handleDragEnter, handleDrop, index, currentItemRef
}) => {
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                setIsTitleOverflowing(titleRef.current.scrollWidth > titleContainerRef.current.clientWidth);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [song.title]);
    
    return (
    <li
        ref={isPlaying ? currentItemRef : null}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragEnter={() => handleDragEnter(index)}
        onDragEnd={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => onPlayFromQueue(song)}
        className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer flex-shrink-0 
            ${isPlaying ? 'bg-[var(--primary-accent)]/20 border border-[var(--primary-accent)]/30' : 'hover:bg-white/5 border border-transparent'}
            lg:w-64 lg:flex-col lg:items-start lg:gap-2 lg:p-4
        `}
    >
        <div className="flex items-center gap-3 w-full">
            <GripVertical className="text-[var(--text-secondary)] cursor-grab drag-handle lg:hidden" size={20} />
            <div className="relative flex-shrink-0 w-12 h-12 lg:w-full lg:h-32 rounded-xl overflow-hidden shadow-lg">
                {song.albumArtUrl && !imgError ? (
                    <img 
                        src={song.albumArtUrl} 
                        alt={song.title} 
                        className="w-full h-full object-cover" 
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full">
                        <AnimatedCoverArt id={song.id} shape="square" />
                    </div>
                )}
                {isPlaying && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="mini-visualizer">
                            <span style={{ animationDelay: '0.1s' }} />
                            <span style={{ animationDelay: '0.3s' }}/>
                            <span style={{ animationDelay: '0.2s' }}/>
                        </div>
                    </div>
                )}
            </div>
            <button onClick={(e) => handleRemove(e, song.queueId)} className="text-[var(--text-secondary)] hover:text-red-500 px-2 ml-auto lg:hidden">
                <X size={20} />
            </button>
        </div>
        
        <div ref={titleContainerRef} className="flex-1 min-w-0 w-full">
            <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                <p ref={titleRef} title={song.title} className={`marquee-content text-sm font-bold whitespace-nowrap ${isPlaying ? 'text-[var(--primary-accent)]' : 'text-[var(--text-primary)]'}`}>
                    {song.title}
                </p>
            </div>
            <p className="text-xs text-[var(--text-secondary)] truncate font-medium">{song.artist}</p>
        </div>

        <div className="hidden lg:flex items-center justify-between w-full mt-2">
            <GripVertical className="text-white/20 cursor-grab drag-handle hover:text-white/40 transition-colors" size={16} />
            <button onClick={(e) => handleRemove(e, song.queueId)} className="text-white/20 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
            </button>
        </div>
    </li>
)
});


interface UpNextQueueProps {
    queue: Song[];
    currentQueueIndex: number;
    setPlayQueue: React.Dispatch<React.SetStateAction<Song[]>>;
    onPlayFromQueue: (song: Song) => void;
    isFlashing?: boolean;
}

const UpNextQueue: React.FC<UpNextQueueProps> = ({ queue, currentQueueIndex, setPlayQueue, onPlayFromQueue, isFlashing }) => {
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);
    const currentItemRef = useRef<HTMLLIElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
                setIsSortMenuOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside, { capture: true });
        document.addEventListener("touchstart", handleClickOutside, { capture: true });
        return () => {
            document.removeEventListener("click", handleClickOutside, { capture: true });
            document.removeEventListener("touchstart", handleClickOutside, { capture: true });
        };
    }, [sortMenuRef]);

    useEffect(() => {
        if (currentItemRef.current) {
            currentItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [currentQueueIndex]);

    const handleDragStart = (position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (position: number) => {
        dragOverItem.current = position;
    };

    const handleDrop = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }

        setPlayQueue(oldQueue => {
            const newQueue = [...oldQueue];
            const dragItemContent = newQueue.splice(dragItem.current!, 1)[0];
            newQueue.splice(dragOverItem.current!, 0, dragItemContent);
            dragItem.current = null;
            dragOverItem.current = null;
            return newQueue;
        });
    };

    const handleRemove = (e: React.MouseEvent, queueId?: string) => {
        e.stopPropagation();
        if (!queueId) return;
        setPlayQueue(oldQueue => oldQueue.filter(song => song.queueId !== queueId));
    };
    
    const handleSort = (type: 'az' | 'za' | 'artist' | 'shuffle') => {
        let sortedQueue = [...queue];
        switch (type) {
            case 'az':
                sortedQueue.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'za':
                sortedQueue.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'artist':
                sortedQueue.sort((a, b) => a.artist.localeCompare(b.artist));
                break;
            case 'shuffle':
                sortedQueue.sort(() => Math.random() - 0.5);
                break;
        }
        setPlayQueue(sortedQueue);
        setIsSortMenuOpen(false);
    };

    if (queue.length === 0) {
        return (
            <div className="text-center text-[var(--text-secondary)] h-full flex flex-col justify-center items-center">
                <ListMusic size={32} className="mb-2" />
                <p>The queue is empty.</p>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col bg-black/20 backdrop-blur-md rounded-2xl overflow-hidden ${isFlashing ? 'queue-flash-anim' : ''} border border-white/5`}>
            <div className="flex-1 overflow-y-auto lg:overflow-x-auto lg:overflow-y-hidden scroll-container p-4">
                <header className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <List size={16} className="text-[var(--primary-accent)]" />
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/50">Up Next</h3>
                    </div>
                    <div className="relative">
                        <button onClick={() => setIsSortMenuOpen(true)} className="text-white/40 hover:text-white px-2 transition-colors">
                            <SortDesc size={18} />
                        </button>
                        {isSortMenuOpen && (
                            <div ref={sortMenuRef} className="absolute top-full right-0 mt-2 w-40 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 text-sm overflow-hidden backdrop-blur-xl">
                                <button onClick={() => handleSort('az')} className="w-full text-left px-4 py-3 hover:bg-white/5 text-white transition-colors flex items-center gap-2"><SortAsc size={16} /> Title (A-Z)</button>
                                <button onClick={() => handleSort('za')} className="w-full text-left px-4 py-3 hover:bg-white/5 text-white transition-colors flex items-center gap-2"><SortDesc size={16} /> Title (Z-A)</button>
                                <button onClick={() => handleSort('artist')} className="w-full text-left px-4 py-3 hover:bg-white/5 text-white transition-colors flex items-center gap-2"><User size={16} /> Artist</button>
                                <button onClick={() => handleSort('shuffle')} className="w-full text-left px-4 py-3 hover:bg-white/5 text-white transition-colors flex items-center gap-2"><Shuffle size={16} /> Shuffle</button>
                            </div>
                        )}
                    </div>
                </header>
                {/* Adjusted bottom padding: large on mobile to clear bottom controls, small on desktop where queue is side-by-side */}
                <ul className="flex flex-col lg:flex-row gap-3 pb-32 lg:pb-0"> 
                    {queue.map((song, index) => (
                        <QueueItem
                            key={song.queueId || song.id}
                            song={song}
                            isPlaying={index === currentQueueIndex}
                            onPlayFromQueue={onPlayFromQueue}
                            handleRemove={handleRemove}
                            handleDragStart={handleDragStart}
                            handleDragEnter={handleDragEnter}
                            handleDrop={handleDrop}
                            index={index}
                            currentItemRef={currentItemRef}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default UpNextQueue;
