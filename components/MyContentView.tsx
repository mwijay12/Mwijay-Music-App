import React, { useState } from 'react';
import type { Song } from '../types.ts';
import { getPremiumGradientCover } from '../utils/helpers.ts';
import { getRandomCoverArt } from './constants.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Feather, PenLine } from 'lucide-react';

interface MyContentViewProps {
    onBack: () => void;
    librarySongs: Song[];
    onOpenSongDetails: (song: Song) => void;
    onOpenLyrics?: (song: Song) => void;
}

const MyContentView: React.FC<MyContentViewProps> = ({ onBack, librarySongs, onOpenSongDetails, onOpenLyrics }) => {
    const songsWithLyrics = librarySongs.filter(song => song.lyrics).sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    const songsWithNotes = librarySongs.filter(song => song.notes).sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    
    const lyricsCount = songsWithLyrics.length;
    const notesCount = songsWithNotes.length;

    const [activeTab, setActiveTab] = useState<'lyrics' | 'notes'>(lyricsCount > 0 || notesCount === 0 ? 'lyrics' : 'notes');
    const [isScrolled, setIsScrolled] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const renderList = (songs: Song[], type: 'lyrics' | 'notes') => {
        if (songs.length === 0) {
            return (
                <div className="h-full flex items-center justify-center text-center text-neutral-400 py-16">
                    <div>
                        <div className="flex justify-center mb-4">
                            {type === 'lyrics' ? <Feather size={48} /> : <PenLine size={48} />}
                        </div>
                        <p>No songs with saved {type} yet.</p>
                        <p className="text-sm">You can add {type} from the full-screen player.</p>
                    </div>
                </div>
            );
        }
        return (
            <ul className="space-y-2">
                {songs.map(song => (
                    <li key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-left cursor-pointer list-item-fade-in group">
                        <img src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} alt={song.title} onClick={() => onOpenSongDetails(song)} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0" onClick={() => onOpenSongDetails(song)}>
                            <p className="font-bold text-sm truncate">{song.title}</p>
                            <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
                        </div>
                        {onOpenLyrics && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onOpenLyrics(song); }}
                                className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary-accent)] transition-colors opacity-0 group-hover:opacity-100"
                                title="Open Lyrics"
                            >
                                <PenLine size={18} />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <main onScroll={handleScroll} className="h-full w-full flex flex-col home-gradient-bg overflow-y-auto scroll-container gpu-accelerated-scroll">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">My Content</h1>
                <h2 className="header-small-title">Content</h2>
                <div className="header-actions-right">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] flex items-center justify-center text-[var(--text-primary)]" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>

            <div className="px-6 pb-40 scroll-content-with-header">
                <div className="mb-4 mt-4">
                    <div className="flex gap-1 p-1 bg-[var(--surface-color)] rounded-full">
                        <button onClick={() => setActiveTab('lyrics')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'lyrics' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`}>
                            Lyrics ({lyricsCount})
                        </button>
                         <button onClick={() => setActiveTab('notes')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'notes' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`}>
                            Notes ({notesCount})
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'lyrics' ? renderList(songsWithLyrics, 'lyrics') : renderList(songsWithNotes, 'notes')}
                    </motion.div>
                </AnimatePresence>
            </div>
        </main>
    );
};

export default MyContentView;
