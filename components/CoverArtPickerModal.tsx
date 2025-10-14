import React, { useRef } from 'react';
import { defaultCoverArt } from '../constants.ts';

interface CoverArtPickerModalProps {
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
}

const CoverArtPickerModal: React.FC<CoverArtPickerModalProps> = ({ onClose, onSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                onSelect(url);
                onClose();
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Choose Cover Art</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
                </header>

                <div className="flex-1 p-4 overflow-y-auto scroll-container">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square w-full rounded-lg bg-[var(--chip-bg)] flex flex-col items-center justify-center text-center p-2 group transition-all duration-300 hover:bg-white/20"
                        >
                            <i className="fas fa-upload text-3xl text-[var(--primary-accent)]"></i>
                            <p className="font-bold mt-2 text-xs">Upload Image</p>
                        </button>
                        {defaultCoverArt.map((url) => (
                            <button key={url} onClick={() => { onSelect(url); onClose(); }} className="aspect-square w-full rounded-lg overflow-hidden group">
                                <img src={url} alt="Default cover art" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            </button>
                        ))}
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
        </div>
    );
};

export default CoverArtPickerModal;