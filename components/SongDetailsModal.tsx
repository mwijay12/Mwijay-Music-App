import React, { useState, useRef, useEffect } from 'react';
import type { Song } from '../types.ts';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';

interface SongDetailsModalProps {
    song: Song;
    onClose: () => void;
    onUpdateSong: (updatedSong: Song) => void;
    onViewArtist: (artistName: string) => void;
    onPlayNow: () => void;
    onAddToQueue: () => void;
    onDelete: () => void;
    onSharePreview: () => void;
    onDownloadFile?: () => void;
}

const SongDetailsModal: React.FC<SongDetailsModalProps> = ({ song, onClose, onUpdateSong, onViewArtist, onPlayNow, onAddToQueue, onDelete, onSharePreview, onDownloadFile }) => {
    const [title, setTitle] = useState(song.title);
    const [artist, setArtist] = useState(song.artist);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    useEffect(() => {
        setTitle(song.title);
        setArtist(song.artist);
    }, [song]);

    const handleCoverArtChange = (newAlbumArtUrl: string) => {
        onUpdateSong({ ...song, albumArtUrl: newAlbumArtUrl, title, artist });
    };
    
    const handleViewArtistClick = () => {
        onViewArtist(song.artist);
        onClose();
    };

    const handleSave = () => {
        onUpdateSong({ ...song, title, artist });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
                <div className="glass-modal-card rounded-2xl flex flex-col w-full max-w-xs max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                    <header className="relative h-32 flex-shrink-0 group">
                        <img src={song.albumArtUrl} alt={title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <button onClick={() => setIsPickerOpen(true)} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Change Cover Art">
                            <i className="fas fa-camera"></i>
                        </button>
                        <button onClick={onClose} className="absolute top-2 right-2 text-white/70 bg-black/50 w-8 h-8 rounded-full z-10" aria-label="Close modal"><i className="fas fa-times"></i></button>
                    </header>

                    <div className="p-4 space-y-3 text-sm flex-1 overflow-y-auto">
                         <div>
                            <label className="text-xs font-bold text-neutral-400">Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-white/20 focus:border-[var(--primary-accent)] focus:ring-0 p-1 text-lg font-bold" />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-neutral-400">Artist</label>
                            <input type="text" value={artist} onChange={e => setArtist(e.target.value)} className="w-full bg-transparent border-0 border-b-2 border-white/20 focus:border-[var(--primary-accent)] focus:ring-0 p-1" />
                        </div>
                         <p onClick={handleViewArtistClick} className="text-xs text-center text-neutral-400 hover:text-[var(--primary-accent)] cursor-pointer pt-1">View all songs by this artist <i className="fas fa-arrow-right"></i></p>
                    </div>
                    
                    <div className="px-4 pb-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={onPlayNow} className="w-full bg-[var(--primary-accent)] text-black font-bold py-2 px-4 rounded-full flex items-center justify-center gap-2 text-sm">
                                <i className="fas fa-play"></i> Play Now
                            </button>
                            <button onClick={onAddToQueue} className="w-full bg-white/10 text-white font-bold py-2 px-4 rounded-full flex items-center justify-center gap-2 text-sm">
                                <i className="fas fa-plus"></i> Queue
                            </button>
                        </div>
                        <div className="flex justify-around items-center pt-3 border-t border-white/10">
                            <button onClick={onSharePreview} className="flex flex-col items-center text-neutral-300 hover:text-white" title="Share a preview">
                                <i className="fas fa-share-alt text-xl"></i><span className="text-xs mt-1">Share</span>
                            </button>
                            <button onClick={onDelete} className="flex flex-col items-center text-red-400 hover:text-red-300" title="Delete from library">
                                <i className="fas fa-trash text-xl"></i><span className="text-xs mt-1">Delete</span>
                            </button>
                        </div>
                    </div>
                     
                    <footer className="p-4 border-t border-white/10 mt-auto">
                        <button onClick={handleSave} className="w-full bg-[var(--primary-accent)] text-black font-bold py-3 px-5 rounded-full hover:brightness-110 transition-all">
                            Save Changes
                        </button>
                    </footer>
                </div>
            </div>
            {isPickerOpen && (
                <CoverArtPickerModal
                    onClose={() => setIsPickerOpen(false)}
                    onSelect={handleCoverArtChange}
                />
            )}
        </>
    );
};

export default SongDetailsModal;