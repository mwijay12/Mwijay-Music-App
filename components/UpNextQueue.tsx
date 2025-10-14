import React, { useState, useRef, useEffect } from 'react';
import type { Song } from '../types.ts';

interface UpNextQueueProps {
    queue: Song[];
    currentQueueIndex: number;
    setPlayQueue: React.Dispatch<React.SetStateAction<Song[]>>;
    onPlayFromQueue: (song: Song) => void;
    isFlashing?: boolean;
}

const UpNextQueue: React.FC<UpNextQueueProps> = ({ queue, currentQueueIndex, setPlayQueue, onPlayFromQueue, isFlashing }) => {
    const [draggedItem, setDraggedItem] = useState<Song | null>(null);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);
    const currentItemRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
                setIsSortMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
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


    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, item: Song) => {
        setDraggedItem(item);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, targetItem: Song) => {
        if (draggedItem && draggedItem.queueId !== targetItem.queueId) {
            setPlayQueue(oldQueue => {
                let newQueue = [...oldQueue];
                const draggedIndex = newQueue.findIndex(s => s.queueId === draggedItem.queueId);
                const targetIndex = newQueue.findIndex(s => s.queueId === targetItem.queueId);
                
                if (draggedIndex === -1 || targetIndex === -1) return oldQueue;

                const [removed] = newQueue.splice(draggedIndex, 1);
                newQueue.splice(targetIndex, 0, removed);
                return newQueue;
            });
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
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
            <div className="text-center text-sm text-neutral-400 py-2">
                Queue is empty
            </div>
        );
    }
    
    return (
        <div className={`bg-white/5 rounded-lg p-2 max-h-64 overflow-y-auto scroll-container ${isFlashing ? 'queue-flash-anim' : ''}`}>
            <div className="flex justify-between items-center px-2 pb-1 relative">
                <h3 className="font-bold text-sm text-neutral-300 flex items-center gap-2">
                    <i className="fas fa-list-ol"></i> Up Next
                </h3>
                <div ref={sortMenuRef}>
                    <button onClick={() => setIsSortMenuOpen(prev => !prev)} className="text-neutral-300 hover:text-white w-8 h-8 rounded-full flex items-center justify-center">
                        <i className="fas fa-sort"></i>
                    </button>
                    {isSortMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--surface-color)] border border-[var(--surface-border-color)] rounded-lg shadow-lg z-20 text-sm">
                            <button onClick={() => handleSort('az')} className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-t-lg">Title (A-Z)</button>
                            <button onClick={() => handleSort('za')} className="w-full text-left px-4 py-2 hover:bg-white/10">Title (Z-A)</button>
                            <button onClick={() => handleSort('artist')} className="w-full text-left px-4 py-2 hover:bg-white/10">Artist</button>
                            <button onClick={() => handleSort('shuffle')} className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-b-lg">Shuffle</button>
                        </div>
                    )}
                </div>
            </div>
            <ul onDragEnd={handleDragEnd}>
                {queue.map((song, index) => {
                    const isPlaying = index === currentQueueIndex;
                    return (
                        <li
                            key={song.queueId}
                            ref={isPlaying ? currentItemRef : null}
                            draggable
                            onDragStart={(e) => handleDragStart(e, song)}
                            onDragEnter={(e) => handleDragEnter(e, song)}
                            onClick={() => onPlayFromQueue(song)}
                            className={`flex items-center gap-4 p-3 rounded-md transition-colors cursor-pointer 
                                ${draggedItem?.queueId === song.queueId ? 'bg-white/20' : ''}
                                ${isPlaying ? 'bg-[var(--primary-accent)]/20' : 'hover:bg-white/10'}
                            `}
                        >
                            <i className="fas fa-grip-vertical text-neutral-400 cursor-grab drag-handle"></i>
                            <div className="relative flex-shrink-0">
                                <img src={song.albumArtUrl} alt={song.title} className="w-12 h-12 rounded object-cover" />
                                {isPlaying && (
                                    <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                        <div className="mini-visualizer">
                                            <span style={{ animationDelay: '0.1s' }} />
                                            <span style={{ animationDelay: '0.3s' }}/>
                                            <span style={{ animationDelay: '0.2s' }}/>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-base font-bold truncate ${isPlaying ? 'text-[var(--primary-accent)]' : ''}`}>{song.title}</p>
                                <p className="text-sm text-neutral-400 truncate">{song.artist}</p>
                            </div>
                            <button onClick={(e) => handleRemove(e, song.queueId)} className="text-neutral-400 hover:text-white px-2">
                                <i className="fas fa-times"></i>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    );
};

export default UpNextQueue;