import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';
import type { RadioStation, RadioPlaylist } from '../types.ts';

interface CreateRadioPlaylistModalProps {
    favoriteStations: RadioStation[];
    onSave: (playlist: RadioPlaylist) => void;
    onClose: () => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const CreateRadioPlaylistModal: React.FC<CreateRadioPlaylistModalProps> = ({ favoriteStations, onSave, onClose, showNotification }) => {
    const [name, setName] = useState('');
    const [selectedStationIds, setSelectedStationIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const toggleStationSelection = (stationId: string) => {
        setSelectedStationIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(stationId)) {
                newSet.delete(stationId);
            } else {
                newSet.add(stationId);
            }
            return newSet;
        });
    };

    const filteredStations = useMemo(() => {
        return favoriteStations.filter(station =>
            station.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [favoriteStations, searchTerm]);

    const handleSave = () => {
        if (!name.trim() || selectedStationIds.size === 0) {
            showNotification('Please provide a name and select at least one station.', 'error');
            return;
        }
        const newPlaylist: RadioPlaylist = {
            id: `radio-playlist-${Date.now()}`,
            name,
            stationIds: Array.from(selectedStationIds),
        };
        onSave(newPlaylist);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Create Radio Playlist</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><X size={24} /></button>
                </header>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Playlist Name" className="w-full bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)]" />

                    <div>
                        <input type="text" placeholder="Search your favorite stations to add..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 rounded-full py-2 px-5 text-white placeholder-white/50 border-none outline-none focus:ring-2 focus:ring-[var(--primary-accent)] mb-2" />
                        <div className="max-h-60 overflow-y-auto scroll-container border border-[var(--chip-bg)] rounded-lg p-2 space-y-2">
                            {filteredStations.length > 0 ? filteredStations.map(station => (
                                <div key={station.stationuuid} onClick={() => toggleStationSelection(station.stationuuid)} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${selectedStationIds.has(station.stationuuid) ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}>
                                    <img src={station.favicon || 'https://i.imgur.com/vB62j5K.png'} alt={station.name} className="w-10 h-10 rounded object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate">{station.name}</p>
                                        <p className={`text-xs truncate ${selectedStationIds.has(station.stationuuid) ? 'text-black/70' : 'text-neutral-400'}`}>{station.country}</p>
                                    </div>
                                    {selectedStationIds.has(station.stationuuid) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                </div>
                            )) : <p className="text-center text-sm text-neutral-400 p-4">No favorite stations found. Add some stations to your favorites to create a playlist.</p>}
                        </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full">Cancel</button>
                    <button onClick={handleSave} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full">Save Playlist</button>
                </footer>
            </div>
        </div>
    );
};

export default CreateRadioPlaylistModal;