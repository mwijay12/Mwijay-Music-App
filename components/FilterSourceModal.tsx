import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import type { Song } from '../types';

// More specific source folders
const COMMON_SOURCES = ['download', 'music', 'recordings', 'whatsapp', 'dcim', 'ringtones', 'notifications', 'alarms'];

const extractSourceFromUrl = (url: string): string | null => {
    if (!url) return null;
    const parts = url.toLowerCase().split('/');
    // Find the last common source folder in the path
    for (let i = parts.length - 2; i >= 0; i--) {
        if (COMMON_SOURCES.includes(parts[i])) {
            return parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
        }
    }
    return null;
};

interface FilterSourceModalProps {
    songs: Song[];
    activeFilter: string | null;
    onSelectFilter: (source: string | null) => void;
    onClose: () => void;
}

const FilterSourceModal: React.FC<FilterSourceModalProps> = ({ songs, activeFilter, onSelectFilter, onClose }) => {
    const sources = useMemo(() => {
        const sourceSet = new Set<string>();
        songs.forEach(song => {
            if (song.nativeUrl) {
                const source = extractSourceFromUrl(song.nativeUrl);
                if (source) {
                    sourceSet.add(source);
                }
            }
        });
        return Array.from(sourceSet).sort();
    }, [songs]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="liquid-glass-pane glare-effect rounded-2xl flex flex-col w-full max-w-xs max-h-[70vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Filter by Source</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><X size={20} /></button>
                </header>

                <div className="flex-1 p-2 overflow-y-auto scroll-container">
                    <button
                        onClick={() => onSelectFilter(null)}
                        className={`w-full text-left p-3 rounded-md text-sm font-bold transition-colors ${!activeFilter ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10'}`}
                    >
                        All Sources
                    </button>
                    {sources.map(source => (
                        <button
                            key={source}
                            onClick={() => onSelectFilter(source)}
                            className={`w-full text-left p-3 rounded-md text-sm transition-colors ${activeFilter === source ? 'bg-[var(--primary-accent)] text-black font-bold' : 'hover:bg-white/10'}`}
                        >
                            {source}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FilterSourceModal;