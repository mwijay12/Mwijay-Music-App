import React from 'react';
import type { Song } from '../types.ts';

import { getPremiumGradientCover } from '../utils/helpers.ts';

interface HorizontalSongScrollerProps {
    title: string;
    songs: Song[];
    onPlaySong: (song: Song, context: Song[]) => void;
    emptyMessage?: string;
}

const HorizontalSongScroller: React.FC<HorizontalSongScrollerProps> = ({ title, songs, onPlaySong, emptyMessage }) => {
    if (songs.length === 0 && !emptyMessage) return null;

    const handlePlay = (song: Song) => {
        onPlaySong(song, songs);
    }

    return (
        <section className="mb-8 -mx-6 px-6 lg:mx-0 lg:px-0">
            <h2 className="text-xl font-black tracking-tight mb-4">{title}</h2>
            {songs.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 scroll-container pb-2 no-scrollbar">
                    {songs.map(song => (
                        <button key={song.id} onClick={() => handlePlay(song)} className="flex-shrink-0 w-32 text-left group" title={`Play ${song.title}`}>
                            <img 
                                src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} 
                                alt={song.title} 
                                className="w-32 h-32 rounded-lg object-cover mb-2 transition-transform group-hover:scale-105" 
                                onError={(e) => { 
                                    if (!e.currentTarget.dataset.fallbackApplied) {
                                        e.currentTarget.dataset.fallbackApplied = 'true';
                                        e.currentTarget.src = getPremiumGradientCover(song.title, song.artist);
                                    }
                                }}
                            />
                            <p className="text-sm font-bold truncate">{song.title}</p>
                            <p className="text-xs text-neutral-300 truncate">{song.artist}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center text-sm text-neutral-400 bg-[var(--chip-bg)] p-4 rounded-lg">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </section>
    );
};

export default HorizontalSongScroller;
