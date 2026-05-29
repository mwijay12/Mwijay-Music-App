import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ImportPlaylistModalProps {
    onClose: () => void;
    onImport: (name: string, text: string) => void;
    isLoading: boolean;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const ImportPlaylistModal: React.FC<ImportPlaylistModalProps> = ({ onClose, onImport, isLoading, showNotification }) => {
    const [name, setName] = useState('');
    const [text, setText] = useState('');

    const handleImport = () => {
        if (!name.trim() || !text.trim()) {
            showNotification('Please provide a name and paste the playlist content.', 'error');
            return;
        }
        onImport(name, text);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Import Playlist</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><X size={24} /></button>
                </header>

                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <p className="text-sm text-neutral-400">
                        Give your new playlist a name, then paste a list of songs (e.g., copied from Spotify). We'll use AI to find matching tracks in your library.
                    </p>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="New Playlist Name" 
                        className="w-full bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)]" 
                    />
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={"Blinding Lights - The Weeknd\nWatermelon Sugar - Harry Styles\n..."}
                        className="w-full h-48 bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] resize-none"
                    />
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full">Cancel</button>
                    <button onClick={handleImport} disabled={isLoading} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full flex items-center justify-center gap-2 disabled:opacity-50">
                         {isLoading ? <><Loader2 className="animate-spin" size={18} /> Importing...</> : 'Import'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ImportPlaylistModal;
