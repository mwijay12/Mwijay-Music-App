import React, { useState, useMemo } from 'react';
import type { Video } from '../types.ts';

interface AddReelsModalProps {
    allVideos: Video[];
    existingVideoIds: Set<string>;
    onClose: () => void;
    onAdd: (newVideoIds: string[]) => void;
}

const AddReelsModal: React.FC<AddReelsModalProps> = ({ allVideos, existingVideoIds, onClose, onAdd }) => {
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const toggleSelection = (videoId: string) => {
        if (existingVideoIds.has(videoId)) return;
        setSelectedVideoIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });
    };

    const filteredVideos = useMemo(() => {
        return allVideos.filter(video => 
            video.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allVideos, searchTerm]);
    
    const handleAddClick = () => {
        onAdd(Array.from(selectedVideoIds));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Add Reels to Playlist</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
                </header>

                <div className="p-4">
                    <input 
                        type="text" 
                        placeholder="Search your reels..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full bg-white/10 rounded-full py-2 px-5 text-white placeholder-white/50 border-none outline-none focus:ring-2 focus:ring-[var(--primary-accent)]" 
                    />
                </div>

                <div className="flex-1 px-4 overflow-y-auto scroll-container space-y-2">
                    {filteredVideos.map(video => {
                        const isExisting = existingVideoIds.has(video.id);
                        const isSelected = selectedVideoIds.has(video.id);
                        return (
                            <div 
                                key={video.id} 
                                onClick={() => toggleSelection(video.id)} 
                                className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isExisting ? 'opacity-50' : 'cursor-pointer'} ${isSelected ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}
                            >
                                <div className="w-12 h-20 bg-black rounded-md flex-shrink-0 overflow-hidden">
                                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{video.title}</p>
                                    <p className={`text-xs truncate ${isSelected ? 'text-black/70' : 'text-neutral-400'}`}>{video.uploader}</p>
                                </div>
                                <i className={`fas ${isExisting || isSelected ? 'fa-check-circle' : 'fa-circle'} text-xl`}></i>
                            </div>
                        );
                    })}
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full">Cancel</button>
                    <button onClick={handleAddClick} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full">Add {selectedVideoIds.size} Reels</button>
                </footer>
            </div>
        </div>
    );
};

export default AddReelsModal;
