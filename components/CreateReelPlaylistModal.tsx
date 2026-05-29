import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import type { Video, ReelPlaylist } from '../types.ts';
import { getRandomCoverArt } from '../constants.ts';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';

interface CreateReelPlaylistModalProps {
    videos: Video[];
    onSave: (playlist: ReelPlaylist) => void;
    onClose: () => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const CreateReelPlaylistModal: React.FC<CreateReelPlaylistModalProps> = ({ videos, onSave, onClose, showNotification }) => {
    const [name, setName] = useState('');
    const [coverImage, setCoverImage] = useState(getRandomCoverArt());
    const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    const toggleVideoSelection = (videoId: string) => {
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
        return videos.filter(video => 
            video.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [videos, searchTerm]);

    const handleSave = () => {
        if (!name.trim() || selectedVideoIds.size === 0) {
            showNotification('Please provide a name and select at least one reel.', 'error');
            return;
        }
        const newPlaylist: ReelPlaylist = {
            id: `reel-playlist-${Date.now()}`,
            name,
            coverImage,
            videoIds: Array.from(selectedVideoIds),
        };
        onSave(newPlaylist);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
                <div className="liquid-glass-pane rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                    <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                        <h2 className="font-bold text-lg">Create Reel Playlist</h2>
                        <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><X size={24} /></button>
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
                            <div className="cosmic-search mb-2">
                                <input type="text" placeholder="Search reels to add..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 rounded-full py-2 px-5 text-white placeholder-white/50 border-2 border-transparent outline-none focus:outline-none" />
                            </div>
                            <div className="max-h-60 overflow-y-auto scroll-container border border-[var(--chip-bg)] rounded-lg p-2 space-y-2">
                                {filteredVideos.map(video => (
                                    <div key={video.id} onClick={() => toggleVideoSelection(video.id)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedVideoIds.has(video.id) ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}>
                                        <div className="w-10 h-16 rounded bg-black flex-shrink-0 flex items-center justify-center"><img src={video.thumbnailUrl || coverImage} className="w-full h-full object-cover rounded"/></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold truncate">{video.title}</p>
                                        </div>
                                        {selectedVideoIds.has(video.id) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
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
            {isPickerOpen && (
                <CoverArtPickerModal
                    onClose={() => setIsPickerOpen(false)}
                    onSelect={setCoverImage}
                />
            )}
        </>
    );
};

export default CreateReelPlaylistModal;