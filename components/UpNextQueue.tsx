
import React, { useRef, useEffect } from 'react';
import type { Song } from '../types.ts';

interface UpNextQueueProps {
    queue: Song[];
    currentQueueIndex: number;
    onPlayFromQueue: (song: Song) => void;
    isFlashing?: boolean;
}

const UpNextQueue = ({ queue, currentQueueIndex, onPlayFromQueue, isFlashing }: UpNextQueueProps) => {
    const currentItemRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        if (currentItemRef.current) {
            currentItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [currentQueueIndex]);

    if (!queue || queue.length <= 1) {
        return (
            <div className="text-center text-sm text-neutral-400 p-4 bg-white/5 rounded-lg">
                <p>Up Next is empty.</p>
            </div>
        );
    }
    
    return (
        <div className={`up-next-queue bg-white/5 rounded-lg p-2 ${isFlashing ? 'flash-bg' : ''}`}>
             <h3 className="font-bold text-sm text-neutral-300 px-2 pb-1">Up Next</h3>
            <ul className="max-h-32 overflow-y-auto scroll-container">
                {queue.map((song, index) => {
                    const isCurrent = index === currentQueueIndex;
                    // Don't show the currently playing song in "Up Next"
                    if (isCurrent) return null;

                    return (
                        <li
                            key={song.queueId || song.id}
                            onClick={() => onPlayFromQueue(song)}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-white/10`}
                        >
                            <img src={song.albumArtUrl} alt={song.title} className="w-10 h-10 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold truncate text-sm`}>{song.title}</p>
                                <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default UpNextQueue;
