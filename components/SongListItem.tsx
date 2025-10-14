

import React, { useRef, useState, useEffect } from 'react';
import type { Song } from '../types.ts';

const SongListItem: React.FC<{ 
    song: Song, 
    onPlaySong: () => void, 
    onAddToQueue: () => void,
    onOpenDetails: () => void,
    onViewArtist: (artist: string) => void,
    isNewlyAdded: boolean,
}> = ({ song, onPlaySong, onAddToQueue, onOpenDetails, onViewArtist, isNewlyAdded }) => {
    const ref = useRef<HTMLLIElement>(null);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLParagraphElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);


    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('list-item-fade-in');
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, []);

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
         <li ref={ref} key={song.id} className={`idle-ui-container flex items-center gap-4 p-4 rounded-lg hover:bg-[var(--surface-color)] transition-colors opacity-0 ${isNewlyAdded ? 'newly-added-highlight' : ''}`}>
            <button onClick={onOpenDetails} className="flex-shrink-0 p-0 border-none bg-transparent">
                <img src={song.albumArtUrl} alt={`${song.title} album art`} className="w-16 h-16 rounded-md bg-[var(--chip-bg)] object-cover" />
            </button>
            <div className="flex-1 min-w-0" onClick={onOpenDetails}>
              <div ref={titleContainerRef} className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                <p ref={titleRef} className="marquee-content font-bold text-base leading-normal">{song.title}</p>
              </div>
              <p onClick={(e) => { e.stopPropagation(); onViewArtist(song.artist); }} className="text-sm text-neutral-400 cursor-pointer hover:underline">{song.artist}</p>
            </div>
             <div className="flex items-center flex-shrink-0 idle-ui-fade">
                <button onClick={(e) => { e.stopPropagation(); onAddToQueue(); }} className="w-12 h-12 rounded-full text-neutral-400 hover:text-white flex items-center justify-center" aria-label={`Add ${song.title} to queue`} title="Add to Queue">
                    <i className="fas fa-plus text-lg"></i>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onPlaySong(); }} className="w-12 h-12 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center ml-1" aria-label={`Play ${song.title}`} title={`Play ${song.title}`}>
                    <i className="fas fa-play text-lg"></i>
                </button>
            </div>
          </li>
    );
};

export default SongListItem;
