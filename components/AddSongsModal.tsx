import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import type { Song } from '../types.ts';

interface AddSongsModalProps {
    allSongs: Song[];
    existingSongIds: Set<string>;
    onClose: () => void;
    onAdd: (newSongIds: string[]) => void;
}

const AddSongsModal: React.FC<AddSongsModalProps> = ({ allSongs, existingSongIds, onClose, onAdd }) => {
    const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSelection = (songId: string) => {
        if (existingSongIds.has(songId)) return;
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
        return allSongs.filter(song => 
            song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            song.artist.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allSongs, searchTerm]);
    
    const handleAddClick = () => {
        onAdd(Array.from(selectedSongIds));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Add Songs to Playlist</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X size={24} /></button>
                </header>

                <div className="p-4">
                    <div className="cosmic-search">
                        <input 
                            type="text" 
                            placeholder="Search your library..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full bg-white/10 rounded-full py-2 px-5 text-white placeholder-white/50 border-none outline-none focus:ring-2 focus:ring-[var(--primary-accent)]" 
                        />
                    </div>
                </div>

                <div className="flex-1 px-4 overflow-y-auto scroll-container space-y-2">
                    {filteredSongs.map(song => {
                        const isExisting = existingSongIds.has(song.id);
                        const isSelected = selectedSongIds.has(song.id);
                        return (
                            <div 
                                key={song.id} 
                                onClick={() => toggleSelection(song.id)} 
                                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isExisting ? 'opacity-50' : 'cursor-pointer'} ${isSelected ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}
                            >
                                <img src={song.albumArtUrl} alt="" className="w-12 h-12 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{song.title}</p>
                                    <p className={`text-xs truncate ${isSelected ? 'text-black/70' : 'text-neutral-400'}`}>{song.artist}</p>
                                </div>
                                {isExisting || isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                            </div>
                        );
                    })}
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full">Cancel</button>
                    <button onClick={handleAddClick} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full">Add {selectedSongIds.size} Songs</button>
                </footer>
            </div>
        </div>
    );
};

export default AddSongsModal;