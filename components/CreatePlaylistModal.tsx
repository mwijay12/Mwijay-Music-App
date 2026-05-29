
import React, { useState, useMemo } from 'react';
import type { Song, Playlist, ProfileData } from '../types.ts';
import EmojiPickerModal from './EmojiPickerModal.tsx';
import { emojiToDataUrl } from '../utils/helpers.ts';
import { X, CheckCircle2, Circle } from 'lucide-react';

const colors = [ '#FF6B6B', '#FFD93D', '#6BFFB8', '#3D7EFF', '#FF8C42', '#AE6BFF', '#42E695', '#5EEBFF', '#FAD961', '#C33764', '#155799', '#00C9FF', '#EECDA3' ];

interface CreatePlaylistModalProps {
    songs: Song[];
    onSave: (playlist: Playlist) => void;
    onClose: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ songs, onSave, onClose, profile, onUpdateProfile, showNotification }) => {
    const [name, setName] = useState('');
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [emoji, setEmoji] = useState('🎵');
    const [bgColor, setBgColor] = useState(colors[0]);
    
    const coverImage = useMemo(() => emojiToDataUrl(emoji, 128, bgColor), [emoji, bgColor]);

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
            showNotification('Please provide a name and select at least one song.', 'error');
            return;
        }
        const newPlaylist: Playlist = {
            id: `playlist-${Date.now()}`,
            name,
            coverImage,
            songIds: Array.from(selectedSongIds),
            emoji,
            bgColor,
        };
        onSave(newPlaylist);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
                <div className="liquid-glass-pane glare-effect rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                    <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="font-bold text-lg">Create New Playlist</h2>
                        <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><X size={24} /></button>
                    </header>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsEmojiPickerOpen(true)} className="w-24 h-24 rounded-lg object-cover bg-[var(--chip-bg)] flex items-center justify-center text-5xl flex-shrink-0">
                                <img src={coverImage} alt="Playlist Cover" className="w-full h-full rounded-lg object-cover" />
                            </button>
                            <div className="flex-1 space-y-2">
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Playlist Name" className="w-full bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)]" />
                                <div className="grid grid-cols-7 gap-1">
                                    {colors.map(c => (
                                        <button key={c} onClick={() => setBgColor(c)} className={`w-full aspect-square rounded-full ${bgColor === c ? 'ring-2 ring-white' : ''}`} style={{backgroundColor: c}} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="cosmic-search mb-2">
                                <input type="text" placeholder="Search songs to add..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 rounded-full py-2 px-5 text-white placeholder-white/50 border-2 border-transparent outline-none focus:outline-none" />
                            </div>
                            <div className="max-h-60 overflow-y-auto scroll-container border border-[var(--chip-bg)] rounded-lg p-2 space-y-2">
                                {filteredSongs.map(song => (
                                    <div key={song.id} onClick={() => toggleSongSelection(song.id)} className={`flex items-center gap-4 p-3 rounded-md cursor-pointer ${selectedSongIds.has(song.id) ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}>
                                        <img src={song.albumArtUrl} alt="" className="w-12 h-12 rounded object-cover" />
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <p className="font-bold leading-tight whitespace-nowrap overflow-x-auto scroll-container">{song.title}</p>
                                            <p className={`text-sm truncate ${selectedSongIds.has(song.id) ? 'text-black/70' : 'text-neutral-400'}`}>{song.artist}</p>
                                        </div>
                                        {selectedSongIds.has(song.id) ? <CheckCircle2 className="text-black flex-shrink-0" size={24} /> : <Circle className="text-neutral-500 flex-shrink-0" size={24} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                        <button onClick={onClose} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full">Cancel</button>
                        <button onClick={handleSave} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full">Save Playlist</button>
                    </footer>
                </div>
            </div>
            {isEmojiPickerOpen && (
                <EmojiPickerModal
                    profile={profile}
                    onUpdateProfile={onUpdateProfile}
                    onClose={() => setIsEmojiPickerOpen(false)}
                    onSelect={(e) => { setEmoji(e); setIsEmojiPickerOpen(false); }}
                />
            )}
        </>
    );
};

export default CreatePlaylistModal;
