import React, { useState } from 'react';
import { X } from 'lucide-react';
import BubbleButton from './BubbleButton.tsx';

interface ClearDataModalProps {
    onClose: () => void;
    onClearSongs: () => void;
    onClearLyrics: () => void;
    onClearNotes: () => void;
}

const ClearDataModal: React.FC<ClearDataModalProps> = ({ onClose, onClearSongs, onClearLyrics, onClearNotes }) => {
    const [confirming, setConfirming] = useState<'songs' | 'lyrics' | 'notes' | null>(null);

    const actions = [
        {
            key: 'songs',
            title: 'Clear All Songs',
            description: 'This will remove all music files from your library, clear all playlists, and reset your listening history. This cannot be undone.',
            handler: onClearSongs,
        },
        {
            key: 'lyrics',
            title: 'Clear All Lyrics',
            description: 'This will remove all saved lyrics from every song in your library. The songs themselves will remain.',
            handler: onClearLyrics,
        },
        {
            key: 'notes',
            title: 'Clear All Notes',
            description: 'This will remove all saved notes from every song in your library. The songs themselves will remain.',
            handler: onClearNotes,
        },
    ] as const;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="liquid-glass-pane glare-effect rounded-2xl flex flex-col w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Data Management</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><X size={20} /></button>
                </header>
                
                <div className="p-4 space-y-3">
                    {actions.map(action => (
                        <div key={action.key} className="bg-white/5 p-3 rounded-lg">
                            <h3 className="font-bold">{action.title}</h3>
                            <p className="text-xs text-neutral-400 mt-1 mb-3">{action.description}</p>
                            {confirming === action.key ? (
                                <div className="flex gap-2">
                                    <button onClick={() => setConfirming(null)} className="flex-1 bg-white/10 py-2 rounded-md text-sm">Cancel</button>
                                    <button onClick={action.handler} className="flex-1 bg-red-600 py-2 rounded-md text-sm font-bold">Confirm Delete</button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirming(action.key)} className="w-full bg-red-500/20 text-red-300 py-2 rounded-md text-sm font-bold">
                                    Clear
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end">
                    <BubbleButton onClick={onClose} className="small">
                        Done
                    </BubbleButton>
                </footer>
            </div>
        </div>
    );
};

export default ClearDataModal;
