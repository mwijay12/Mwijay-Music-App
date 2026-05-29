
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Delete, Search, Music, Heart, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1 } from 'lucide-react';
import type { Song } from '../types.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { getPremiumGradientCover } from '../utils/helpers.ts';
import { getRandomCoverArt } from './constants.ts';

interface PartyModeViewProps {
    onBack: () => void;
    onAddToQueue: (song: Song) => void;
    librarySongs: Song[];
    onNext?: () => void;
    onPrev?: () => void;
    onTogglePlay?: () => void;
    isPlaying?: boolean;
    nowPlaying?: Song | null;
    onToggleFavorite?: (id: string) => void;
    onToggleShuffle?: () => void;
    onCycleRepeat?: () => void;
    isShuffled?: boolean;
    repeatMode?: 'none' | 'all' | 'one';
}

const PartyModeView: React.FC<PartyModeViewProps> = ({ onBack, onAddToQueue, librarySongs, onNext, onPrev, onTogglePlay, isPlaying, nowPlaying, onToggleFavorite, onToggleShuffle, onCycleRepeat, isShuffled, repeatMode }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [requestsCount, setRequestsCount] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    
    // Security State
    const [isSettingPin, setIsSettingPin] = useState(false); 
    const [pin, setPin] = useState('');
    const [inputPin, setInputPin] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Check for existing lock on mount
    useEffect(() => {
        const storedPin = localStorage.getItem('mwijay_guest_pin');
        const isLocked = localStorage.getItem('mwijay_guest_lock') === 'true';
        
        if (!isLocked || !storedPin) {
            setIsSettingPin(true);
        } else {
            setPin(storedPin);
        }
    }, []);

    const filteredSongs = librarySongs.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleRequest = (song: Song) => {
        onAddToQueue(song);
        setRequestsCount(prev => prev + 1);
        showToast(`Queued: ${song.title}`);
    };

    const handleSetPin = () => {
        if (inputPin.length < 4) {
            setErrorMsg("PIN must be 4 digits.");
            return;
        }
        setPin(inputPin);
        localStorage.setItem('mwijay_guest_pin', inputPin);
        localStorage.setItem('mwijay_guest_lock', 'true');
        
        setInputPin('');
        setIsSettingPin(false);
        setErrorMsg('');
    };

    const handleUnlockAttempt = () => {
        if (inputPin === pin) {
            localStorage.removeItem('mwijay_guest_lock');
            localStorage.removeItem('mwijay_guest_pin');
            onBack();
        } else {
            setErrorMsg("Incorrect PIN");
            setInputPin('');
            setTimeout(() => setErrorMsg(''), 2000);
        }
    };

    const handlePinInput = (num: string) => {
        if (inputPin.length < 4) {
            setInputPin(prev => prev + num);
        }
    };
    
    const handleGuestLike = () => {
        if (nowPlaying && onToggleFavorite) {
            onToggleFavorite(nowPlaying.id);
            showToast(nowPlaying.isFavorite ? "Removed from Favorites" : "Added to Favorites");
        }
    };

    // Setup View (Set PIN)
    if (isSettingPin) {
        return (
            <div className="h-full w-full bg-black flex flex-col items-center justify-center p-6 z-50 fixed inset-0">
                <Lock className="text-4xl text-purple-500 mb-6" size={48} />
                <h2 className="text-2xl font-bold text-white mb-2">Secure Guest Mode</h2>
                <p className="text-neutral-400 text-center mb-8">Set a 4-digit PIN to lock the app. Only you can exit.</p>
                
                <div className="flex gap-4 mb-8">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full border border-white ${inputPin.length > i ? 'bg-white' : 'bg-transparent'}`} />
                    ))}
                </div>
                {errorMsg && <p className="text-red-500 mb-4 animate-shake">{errorMsg}</p>}

                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} onClick={() => handlePinInput(num.toString())} className="w-16 h-16 rounded-full bg-white/10 text-white text-xl font-bold hover:bg-white/20">{num}</button>
                    ))}
                    <div />
                    <button onClick={() => handlePinInput('0')} className="w-16 h-16 rounded-full bg-white/10 text-white text-xl font-bold hover:bg-white/20">0</button>
                    <button onClick={() => setInputPin(prev => prev.slice(0, -1))} className="w-16 h-16 rounded-full bg-transparent text-white text-xl font-bold flex items-center justify-center"><Delete size={24} /></button>
                </div>

                <button onClick={handleSetPin} className="w-full max-w-xs bg-purple-600 text-white font-bold py-4 rounded-full">Start Session</button>
                <button onClick={onBack} className="mt-4 text-neutral-400">Cancel</button>
            </div>
        );
    }

    // Unlock View
    if (isUnlocking) {
        return (
            <div className="h-full w-full bg-black/95 backdrop-blur-xl absolute inset-0 flex flex-col items-center justify-center p-6 z-[60]">
                <h2 className="text-2xl font-bold text-white mb-8">Enter PIN to Exit</h2>
                <div className="flex gap-4 mb-8">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full border border-white ${inputPin.length > i ? 'bg-white' : 'bg-transparent'}`} />
                    ))}
                </div>
                {errorMsg && <p className="text-red-500 mb-4 animate-shake">{errorMsg}</p>}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} onClick={() => handlePinInput(num.toString())} className="w-16 h-16 rounded-full bg-white/10 text-white text-xl font-bold hover:bg-white/20">{num}</button>
                    ))}
                    <div />
                    <button onClick={() => handlePinInput('0')} className="w-16 h-16 rounded-full bg-white/10 text-white text-xl font-bold hover:bg-white/20">0</button>
                    <button onClick={() => setInputPin(prev => prev.slice(0, -1))} className="w-16 h-16 rounded-full bg-transparent text-white text-xl font-bold flex items-center justify-center"><Delete size={24} /></button>
                </div>
                <div className="flex gap-4 w-full max-w-xs">
                    <button onClick={() => { setIsUnlocking(false); setInputPin(''); }} className="flex-1 bg-white/10 text-white font-bold py-3 rounded-full">Back</button>
                    <button onClick={handleUnlockAttempt} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-full">Unlock</button>
                </div>
            </div>
        );
    }

    // Main Guest Mode View
    return (
        <main className="h-full w-full bg-black flex flex-col relative overflow-hidden font-sans fixed inset-0 z-40">
            {/* Background */}
            <div className="absolute inset-0 opacity-30 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-purple-900 via-black to-black pointer-events-none"></div>
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-2 rounded-full font-bold z-50 shadow-lg pointer-events-none"
                    >
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Header */}
            <header className="p-6 flex items-center justify-between z-10 border-b border-white/10 bg-black/80 backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                        <Lock className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wide">Guest Mode</h1>
                        <p className="text-xs text-neutral-400 font-mono">REQUESTS: <span className="text-purple-400 font-bold">{requestsCount}</span></p>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsUnlocking(true)}
                    className="bg-white/10 text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 hover:bg-white/20"
                >
                    Exit
                </button>
            </header>

            {/* Search & Content */}
            <div className="flex-1 flex flex-col px-4 pt-6 z-10 overflow-hidden">
                <div className="relative mb-6">
                    <input 
                        type="text" 
                        placeholder="Search for a song..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-lg border border-white/10 focus:border-purple-500 focus:bg-white/15 outline-none placeholder-neutral-500 transition-all"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={20} />
                </div>

                <div className="flex-1 overflow-y-auto scroll-container pb-24">
                    {filteredSongs.length > 0 ? (
                        <ul className="space-y-3">
                            {filteredSongs.slice(0, 100).map(song => (
                                <li key={song.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <img src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} alt={song.title} className="w-12 h-12 rounded-md object-cover bg-black/50" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white truncate">{song.title}</p>
                                        <p className="text-sm text-neutral-400 truncate">{song.artist}</p>
                                    </div>
                                    <button onClick={() => handleRequest(song)} className="bg-purple-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-purple-500 transition-all">
                                        Request
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-neutral-500 mt-10">
                            <Music className="mb-4 opacity-50 mx-auto" size={48} />
                            <p>No songs found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Guest Playback Controls */}
            {nowPlaying && (
                <footer className="p-4 pb-8 z-20 bg-black/80 backdrop-blur-xl border-t border-white/10 absolute bottom-0 left-0 right-0">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="text-white font-bold truncate">{nowPlaying.title}</p>
                            <p className="text-xs text-neutral-400 truncate">{nowPlaying.artist}</p>
                        </div>
                        <button onClick={handleGuestLike} className={`text-2xl ${nowPlaying.isFavorite ? 'text-red-500' : 'text-neutral-500 hover:text-white'}`}>
                            <Heart size={24} fill={nowPlaying.isFavorite ? "currentColor" : "none"} />
                        </button>
                    </div>
                    
                    <div className="flex justify-center items-center gap-8">
                        <button onClick={onToggleShuffle} className={`text-xl transition-colors ${isShuffled ? 'text-purple-500' : 'text-neutral-600 hover:text-white'}`}>
                            <Shuffle size={20} />
                        </button>
                        <button onClick={onPrev} className="text-white text-2xl hover:text-purple-400"><SkipBack size={24} fill="currentColor" /></button>
                        <button onClick={onTogglePlay} className="w-16 h-16 bg-white text-black rounded-full text-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform">
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                        </button>
                        <button onClick={onNext} className="text-white text-2xl hover:text-purple-400"><SkipForward size={24} fill="currentColor" /></button>
                        <button onClick={onCycleRepeat} className={`text-xl transition-colors ${repeatMode !== 'none' ? 'text-purple-500' : 'text-neutral-600 hover:text-white'}`}>
                            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                        </button>
                    </div>
                </footer>
            )}
        </main>
    );
};

export default PartyModeView;
