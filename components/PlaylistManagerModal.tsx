import React from 'react';
import { FileUp, FileDown } from 'lucide-react';

interface PlaylistManagerModalProps {
    onClose: () => void;
    onImportClick: () => void;
    onExportClick: () => void;
}

const PlaylistManagerModal: React.FC<PlaylistManagerModalProps> = ({ onClose, onImportClick, onExportClick }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h2 className="font-bold text-lg text-center">Manage Playlists</h2>
                <button
                    onClick={onImportClick}
                    className="w-full bg-[var(--chip-bg)] text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-3 transition-colors hover:bg-white/20"
                >
                    <FileUp size={20} />
                    <span>Import from Text</span>
                </button>
                <button
                    onClick={onExportClick}
                    className="w-full bg-[var(--chip-bg)] text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-3 transition-colors hover:bg-white/20"
                >
                    <FileDown size={20} />
                    <span>Export All to JSON</span>
                </button>
            </div>
        </div>
    );
};

export default PlaylistManagerModal;
