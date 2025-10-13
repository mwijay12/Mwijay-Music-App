import React, { useState } from 'react';
import type { Song } from '../types.ts';

const cardStyles = [
    { type: 'now_streaming', name: 'Streaming' },
    { type: 'artist', name: 'Artist' },
    { type: 'motto', name: 'Brand' },
];

const ShareablePreviewModal: React.FC<{
    song: Song;
    onClose: () => void;
}> = ({ song, onClose }) => {
    const [activeStyle, setActiveStyle] = useState('now_streaming');

    const renderCardContent = (cardType: string) => {
        switch (cardType) {
            case 'now_streaming':
                return (
                    <>
                        <div className="flex items-center gap-2 mb-4 self-start">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center font-bold text-[var(--primary-accent)]">M</div>
                            <span className="font-semibold">Now Streaming</span>
                        </div>
                        <img src={song.albumArtUrl} alt={song.title} className="w-48 h-48 rounded-2xl shadow-lg mb-4" />
                        <h2 className="text-2xl font-bold text-center">{song.title}</h2>
                        <p className="text-lg text-neutral-300 text-center">{song.artist}</p>
                    </>
                );
            case 'artist':
                return (
                    <>
                        <div className="flex items-center gap-2 mb-4 self-start">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center font-bold text-[var(--primary-accent)]">M</div>
                            <span className="font-semibold">Artist on Mwijay Music</span>
                        </div>
                        <img src={song.albumArtUrl} alt={song.artist} className="w-48 h-48 rounded-full shadow-lg mb-4 object-cover" />
                        <h2 className="text-2xl font-bold text-center">{song.artist}</h2>
                    </>
                );
            case 'motto':
                 return (
                    <>
                        <div className="flex items-center gap-2 mb-4 self-start">
                             <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center font-bold text-[var(--primary-accent)]">M</div>
                            <span className="font-semibold">Mwijay Music App</span>
                        </div>
                        <div className="w-48 h-48 rounded-2xl shadow-lg mb-4 flex items-center justify-center bg-gradient-to-br from-[var(--primary-accent)] to-[var(--secondary-accent-end)] p-4">
                             <p className="text-3xl font-bold text-black text-center leading-tight">Your Music, Your Vibe.</p>
                        </div>
                         <h2 className="text-2xl font-bold text-center">{song.title}</h2>
                        <p className="text-lg text-neutral-300 text-center">{song.artist}</p>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex flex-col" onClick={onClose}>
            <div 
                className="absolute inset-0 bg-cover bg-center blur-3xl scale-110"
                style={{ backgroundImage: `url(${song.albumArtUrl})` }}
            />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center p-8 text-white" onClick={e => e.stopPropagation()}>
                <div className="w-full max-w-xs bg-white/10 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center">
                    {renderCardContent(activeStyle)}
                </div>
            </div>

            <div className="relative z-20 flex flex-col items-center gap-4 px-4 pb-8" onClick={e => e.stopPropagation()}>
                <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-full flex items-center gap-1">
                    {cardStyles.map(style => (
                        <button 
                            key={style.type}
                            onClick={() => setActiveStyle(style.type)}
                            className={`py-2 px-5 text-sm font-bold rounded-full transition-colors ${activeStyle === style.type ? 'bg-white text-black' : 'text-white'}`}
                        >
                            {style.name}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => alert('Share functionality is not implemented yet!')}
                    className="w-full max-w-xs bg-[var(--primary-accent)] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2"
                >
                    <i className="fas fa-share-alt"></i> Share
                </button>
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 text-white bg-black/50 w-10 h-10 rounded-full z-20 flex items-center justify-center" aria-label="Close modal"><i className="fas fa-times"></i></button>
        </div>
    );
};

export default ShareablePreviewModal;