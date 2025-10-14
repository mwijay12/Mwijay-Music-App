import React, { useState, useMemo, useRef } from 'react';
import type { Song, Playlist } from '../types.ts';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';

interface EditPlaylistModalProps {
    playlist: Playlist;
    songs: Song[];
    onSave: (playlist: Playlist) => void;
    onClose: () => void;
}

const EditPlaylistModal: React.FC<EditPlaylistModalProps> = ({ playlist, songs, onSave, onClose }) => {
    const [name, setName] = useState(playlist.name);
    const [coverImage, setCoverImage] = useState(playlist.coverImage);
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set(playlist.songIds));
    const [searchTerm, setSearchTerm] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const toggleSongSelection = (songId: string) => {
        setSelectedSongIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(songId)) {
                newSet.delete(songId);
            } else {
                newSet.add(songId);
            }
            return newSet;
        });
    };
    
    const filteredSongs = useMemo(() => {
        return songs.filter(song => 
            song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [songs, searchTerm]);

    const handleSave = () => {
        if (!name.trim() || selectedSongIds.size === 0) {
            alert('A playlist must have a name and at least one song.');
            return;
        }
        const updatedPlaylist: Playlist = {
            ...playlist,
            name,
            coverImage,
            songIds: Array.from(selectedSongIds),
        };
        onSave(updatedPlaylist);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
                <div className="liquid-glass-pane rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                    <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="font-bold text-lg">Edit Playlist</h2>
                        <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><i className="fas fa-times text-2xl"></i></button>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        <div className="flex items-center gap-4">
                            <img src={coverImage} alt="Playlist cover" className="w-24 h-24 rounded-lg object-cover bg-[var(--chip-bg)]"/>
                            <div className="flex-1 space-y-2">
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Playlist Name" className="w-full bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)]" />
                                <button onClick={() => setIsPickerOpen(true)} className="w-full bg-[var(--chip-bg)] text-white font-bold py-2 px-4 rounded-md hover:bg-white/20">Change Cover</button>
                            </div>
                        </div>

                        <div>
                            <input type="text" placeholder="Search songs to add/remove..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 rounded-full py-2 px-5 text-white placeholder-white/50 border-2 border-transparent outline-none focus:outline-none cosmic-search mb-2" />
                            <div className="max-h-60 overflow-y-auto scroll-container border border-[var(--chip-bg)] rounded-lg p-2 space-y-2">
                                {filteredSongs.map(song => (
                                    <div key={song.id} onClick={() => toggleSongSelection(song.id)} className={`flex items-center gap-4 p-3 rounded-md cursor-pointer ${selectedSongIds.has(song.id) ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}>
                                        <img src={song.albumArtUrl} alt="" className="w-12 h-12 rounded object-cover" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold leading-tight">{song.title}</p>
                                            <p className={`text-sm ${selectedSongIds.has(song.id) ? 'text-black/70' : 'text-neutral-400'}`}>{song.artist}</p>
                                        </div>
                                        <i className={`fas ${selectedSongIds.has(song.id) ? 'fa-check-circle' : 'fa-circle'} text-xl`}></i>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                        <button onClick={onClose} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full">Cancel</button>
                        <button onClick={handleSave} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full">Save Changes</button>
                    </footer>
                </div>
            </div>
            {isPickerOpen && (
                <CoverArtPickerModal
                    onClose={() => setIsPickerOpen(false)}
                    onSelect={setCoverImage}
                />
            )}
        </>
    );
};

export default EditPlaylistModal;