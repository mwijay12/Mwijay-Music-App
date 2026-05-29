
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, 
    Wind, 
    Play, 
    Pause, 
    SkipBack, 
    SkipForward, 
    Music, 
    Volume2, 
    Search, 
    X, 
    Upload,
    VolumeX,
    Maximize2,
    Minimize2,
    Mic,
    ListMusic,
    ChevronDown
} from 'lucide-react';
import { getZenContent, textToSpeech } from '../services/geminiService.ts';
import { zenContent } from '../data/content.ts';
import { decode } from '../utils/audioUtils.ts';
import { Song } from '../types';

interface ZenModeScreenProps {
    onBack: () => void;
    userTracks: Song[];
    onAddTracks: (tracks: Song[]) => void;
    onPlayTrack: (track: Song) => void;
}

const archiveLibrary = [
    { id: 'arc-1', title: 'Deep Meditation', artist: 'Zen Master', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', source: 'Zen Stream' },
    { id: 'arc-2', title: 'Rainy Night', artist: 'Nature Sounds', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', source: 'Nature Stream' },
    { id: 'arc-3', title: 'Indian Flute Meditation', artist: 'Vedic Echoes', url: 'https://archive.org/download/indian-flute-music-meditation/Indian%20Flute.mp3', source: 'Indian Space' },
    { id: 'arc-4', title: 'Sitar Calm', artist: 'Raga Soul', url: 'https://archive.org/download/sitar-meditation-ambient/Sitar%20Calm.mp3', source: 'Indian Space' },
    { id: 'arc-5', title: 'Tabla Rhythm', artist: 'Ganges Flow', url: 'https://archive.org/download/tabla-beats-zen/Tabla%20Rhythm.mp3', source: 'Indian Space' },
    { id: 'arc-6', title: 'Celestial Space', artist: 'Ambient', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', source: 'Ambient Stream' },
];

const BreathingExercise = ({ onClose }: { onClose: () => void }) => {
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [timer, setTimer] = useState(4);

    useEffect(() => {
        let currentTimer = 4;
        let currentPhase: 'inhale' | 'hold' | 'exhale' = 'inhale';

        const interval = setInterval(() => {
            currentTimer -= 1;
            if (currentTimer <= 0) {
                currentTimer = 4;
                if (currentPhase === 'inhale') {
                    currentPhase = 'hold';
                } else if (currentPhase === 'hold') {
                    currentPhase = 'exhale';
                } else {
                    currentPhase = 'inhale';
                }
                setPhase(currentPhase);
            }
            setTimer(currentTimer);
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
        >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/50 hover:text-white">
                <X size={32} />
            </button>
            <div className="text-center">
                <motion.div 
                    animate={{ 
                        scale: phase === 'inhale' ? 1.4 : phase === 'exhale' ? 0.95 : 1.4,
                        opacity: phase === 'hold' ? 0.75 : 1
                    }}
                    transition={{ 
                        scale: {
                            type: "spring",
                            stiffness: 25,
                            damping: 12,
                            mass: 1.5,
                            restSpeed: 0.001,
                            restDelta: 0.001
                        },
                        opacity: { duration: 1.5, ease: "easeInOut" }
                    }}
                    className="w-64 h-64 rounded-full border-4 border-amber-400/30 flex items-center justify-center relative"
                >
                    <div className="absolute inset-0 rounded-full bg-amber-400/10 animate-pulse" />
                    <span className="text-4xl font-light text-amber-400 uppercase tracking-widest">
                        {phase}
                    </span>
                </motion.div>
                <p className="mt-12 text-white/60 text-xl font-light">
                    {timer} seconds remaining
                </p>
            </div>
        </motion.div>
    );
};

const MusicPlayerWidget = ({ userTracks, onAddTracks }: { userTracks: Song[], onAddTracks: (tracks: Song[]) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isQueueVisible, setIsQueueVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<any>(archiveLibrary[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const filteredTracks = useMemo(() => {
        const all = [...archiveLibrary, ...userTracks];
        return all.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, userTracks]);

    const handleNextRef = useRef<() => void>(() => {});

    const playTrack = useCallback((track: any) => {
        if (!track || !track.url) {
            console.error('Invalid track or URL');
            return;
        }
        
        // Ensure the URL is valid and supported
        const isSupported = track.url.match(/\.(mp3|wav|ogg|m4a)$|archive\.org|soundhelix\.com/i);
        if (!isSupported && !track.url.startsWith('blob:')) {
            console.warn('Potentially unsupported audio format:', track.url);
        }

        setCurrentTrack(track);
        setIsPlaying(true);
        setPlaybackError(null);

        if (audioRef.current) {
            try {
                // Reset audio state
                audioRef.current.pause();
                audioRef.current.src = track.url;
                audioRef.current.load();
                
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        if (error.name === 'NotSupportedError') {
                            console.error("Audio format not supported or no source found:", error);
                            setPlaybackError("This audio format is not supported by your browser. Trying next...");
                        } else {
                            console.error("Playback failed:", error);
                            setPlaybackError("This source is currently unavailable. Trying next...");
                        }
                        setIsPlaying(false);
                        // Auto-play next after a delay if it fails
                        setTimeout(() => handleNextRef.current(), 2000);
                    });
                }
            } catch (err) {
                console.error('Error setting audio src:', err);
                setPlaybackError("Failed to load audio source.");
                setIsPlaying(false);
            }
        }
    }, []);

    const handleNext = useCallback(() => {
        const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % filteredTracks.length;
        playTrack(filteredTracks[nextIndex]);
    }, [filteredTracks, currentTrack, playTrack]);

    useEffect(() => {
        handleNextRef.current = handleNext;
    }, [handleNext]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                if (!audioRef.current.src || audioRef.current.src === window.location.href) {
                    // If no src is set, try to play the current track
                    playTrack(currentTrack);
                    return;
                }
                audioRef.current.play().catch((err) => {
                    console.error('Playback error:', err);
                    setIsPlaying(false);
                });
                setIsPlaying(true);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowRight') {
                handleNext();
            } else if (e.code === 'ArrowLeft') {
                const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
                const prevIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
                playTrack(filteredTracks[prevIndex]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, handleNext, filteredTracks, currentTrack.id, playTrack]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const newTrack: Song = {
                id: `local-${Date.now()}`,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Local Upload',
                url: url,
                albumArtUrl: 'https://picsum.photos/seed/music/200/200'
            };
            onAddTracks([newTrack]);
            playTrack(newTrack);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-40">
            {playbackError && (
                <div className="absolute bottom-full mb-4 right-0 w-64 z-50">
                    <motion.div 
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-red-500/20 border border-red-500/50 backdrop-blur-md text-red-200 px-4 py-2 rounded-xl text-xs text-center shadow-lg"
                    >
                        {playbackError}
                    </motion.div>
                </div>
            )}

            <audio 
                ref={audioRef} 
                onEnded={handleNext} 
                onError={(e) => {
                    console.error("Audio element error event:", e);
                    setPlaybackError("The audio source could not be loaded.");
                    setIsPlaying(false);
                }}
            />
            
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-20 right-0 w-80 bg-slate-900/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-white font-medium">Zen Soundscape</h3>
                                <button onClick={() => setIsExpanded(false)} className="text-white/40 hover:text-white">
                                    <ChevronLeft className="rotate-270" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-400">
                                    <Music size={32} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{currentTrack.title}</p>
                                    <p className="text-white/40 text-sm truncate">{currentTrack.artist}</p>
                                </div>
                                {/* Playback icons removed as per user request - using gestures/space instead */}
                            </div>

                            <div className="relative mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <button 
                                        onClick={() => setIsQueueVisible(!isQueueVisible)}
                                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-amber-400 transition-colors group"
                                    >
                                        <ListMusic size={14} className="group-hover:scale-110 transition-transform" />
                                        <span>Queue</span>
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isQueueVisible ? 'rotate-180' : ''}`} />
                                    </button>
                                    <span className="text-[10px] text-white/20">{filteredTracks.length} tracks</span>
                                </div>
                                
                                <AnimatePresence>
                                    {isQueueVisible && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar"
                                        >
                                            {filteredTracks.map(track => (
                                                <button 
                                                    key={track.id}
                                                    onClick={() => playTrack(track)}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${currentTrack.id === track.id ? 'bg-amber-400/10 text-amber-400' : 'hover:bg-white/5 text-white/60'}`}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <Music size={14} />
                                                    </div>
                                                    <span className="text-sm truncate flex-1 text-left">{track.title}</span>
                                                    {currentTrack.id === track.id && isPlaying && <div className="w-1 h-1 rounded-full bg-amber-400 animate-ping" />}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input 
                                    type="text"
                                    placeholder="Search tracks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-amber-400/50"
                                />
                            </div>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-xl text-white/40 text-sm flex items-center justify-center gap-2 hover:border-amber-400/50 hover:text-white transition-all"
                            >
                                <Upload size={16} />
                                Upload My Music
                            </button>
                            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${isPlaying ? 'bg-amber-400 text-black' : 'bg-slate-800 text-white border border-white/10'}`}
            >
                {isPlaying ? (
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <Music size={28} />
                    </motion.div>
                ) : (
                    <Music size={28} />
                )}
            </motion.button>
        </div>
    );
};

export const ZenModeScreen = ({ onBack, userTracks, onAddTracks, onPlayTrack }: ZenModeScreenProps) => {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [showBreathing, setShowBreathing] = useState(false);
    const [isReading, setIsReading] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        try {
            const topics = ['mindfulness', 'inner peace', 'gratitude', 'resilience', 'focus'];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            let aiContent = await getZenContent(randomTopic);
            
            // Clean markdown code blocks if present
            aiContent = aiContent.replace(/```html|```/g, '').trim();
            
            if (!aiContent || aiContent.length < 20) {
                const fallback = zenContent[Math.floor(Math.random() * zenContent.length)];
                setContent(fallback.content);
            } else {
                setContent(aiContent);
            }
        } catch (error) {
            const fallback = zenContent[Math.floor(Math.random() * zenContent.length)];
            setContent(fallback.content);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContent();
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            sourceRef.current?.stop();
        };
    }, [fetchContent]);

    const handleReadAloud = async () => {
        if (isReading) {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            sourceRef.current?.stop();
            setIsReading(false);
            return;
        }

        setIsReading(true);
        try {
            // Strip HTML for TTS
            const plainText = content.replace(/<[^>]*>/g, '').trim();
            const base64Audio = await textToSpeech(plainText);
            
            if (base64Audio) {
                const buffer = await decode(base64Audio);
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                
                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                sourceRef.current = audioContextRef.current.createBufferSource();
                sourceRef.current.buffer = buffer;
                sourceRef.current.connect(audioContextRef.current.destination);
                sourceRef.current.onended = () => setIsReading(false);
                sourceRef.current.start();
            } else {
                // Fallback to offline browser/native mobile TTS
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(plainText);
                    utterance.onend = () => {
                        setIsReading(false);
                    };
                    utterance.onerror = (e) => {
                        console.error("SpeechSynthesis error:", e);
                        setIsReading(false);
                    };
                    window.speechSynthesis.speak(utterance);
                } else {
                    console.warn("Speech synthesis not supported in this browser.");
                    setIsReading(false);
                }
            }
        } catch (error) {
            console.error("TTS Error, using speech synthesis fallback:", error);
            try {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const plainText = content.replace(/<[^>]*>/g, '').trim();
                    const utterance = new SpeechSynthesisUtterance(plainText);
                    utterance.onend = () => setIsReading(false);
                    utterance.onerror = () => setIsReading(false);
                    window.speechSynthesis.speak(utterance);
                } else {
                    setIsReading(false);
                }
            } catch (err) {
                setIsReading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-black to-slate-900 overflow-hidden flex flex-col">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.05, 0.1, 0.05],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-amber-400/5 rounded-full blur-[100px]"
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.03, 0.08, 0.03],
                        rotate: [0, -120, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-400/5 rounded-full blur-[100px]"
                />
            </div>

            {/* Header */}
            <div className="p-6 flex items-center justify-between z-10">
                <button 
                    onClick={onBack}
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowBreathing(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-400/10 border border-amber-400/30 rounded-full text-amber-400 hover:bg-amber-400/20 transition-all"
                    >
                        <Wind size={20} />
                        <span className="font-medium">Breathe</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-6 py-12 flex flex-col items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={content}
                    className="max-w-2xl w-full"
                >
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-8 bg-white/5 rounded-lg w-3/4 mx-auto" />
                            <div className="h-4 bg-white/5 rounded-lg w-full" />
                            <div className="h-4 bg-white/5 rounded-lg w-5/6 mx-auto" />
                            <div className="h-4 bg-white/5 rounded-lg w-4/5 mx-auto" />
                        </div>
                    ) : (
                        <div className="text-center space-y-8">
                            <div 
                                className="prose prose-invert prose-amber max-w-none text-white/80 leading-relaxed text-lg"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />
                            
                            <div className="flex items-center justify-center gap-6 pt-8">
                                <button 
                                    onClick={handleReadAloud}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${isReading ? 'bg-amber-400 text-black' : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                                >
                                    <Volume2 size={20} />
                                    <span>{isReading ? 'Stop Reading' : 'Read Aloud'}</span>
                                </button>
                                <button 
                                    onClick={fetchContent}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white/60 rounded-full hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <Sparkles size={20} />
                                    <span>New Insight</span>
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Footer / Decorative */}
            <div className="p-12 text-center text-white/20 text-sm font-light tracking-widest uppercase">
                Find your center
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
            </AnimatePresence>

            {/* Music Widget */}
            <MusicPlayerWidget userTracks={userTracks} onAddTracks={onAddTracks} />

            <style>{`
                .prose h2 {
                    font-size: 2.25rem;
                    font-weight: 300;
                    color: white;
                    margin-bottom: 2rem;
                    letter-spacing: -0.02em;
                }
                .prose p {
                    margin-bottom: 1.5rem;
                }
                .prose ul {
                    list-style-type: none;
                    padding: 0;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 1rem;
                }
                .prose li {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 0.5rem 1.5rem;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    color: #fbbf24;
                    border: 1px solid rgba(251, 191, 36, 0.2);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

const Sparkles = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
);
