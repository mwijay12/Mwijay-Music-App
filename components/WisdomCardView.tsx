
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Song, ProfileData } from '../types.ts';
import { allWisdom } from './constants.ts';
import { GoogleGenAI } from '@google/genai';
import TextGenerateEffect from './TextGenerateEffect.tsx';
import AnimatedCoverArt from './AnimatedCoverArt.tsx';
import { 
    X, 
    Loader2, 
    Quote, 
    ThumbsUp, 
    RefreshCw, 
    Heart, 
    SkipBack, 
    SkipForward, 
    Play, 
    Pause 
} from 'lucide-react';

const wisdomCache = new Map<string, { wisdom: string; sources: any[] | null; timestamp: number }>();
const CACHE_EXPIRATION_MS = 10 * 60 * 1000;
let lastApiErrorTime = 0; // Global throttle for API errors
const API_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes backoff on quota error

interface WisdomCardViewProps {
    song: Song;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onExit: () => void;
    onToggleSongFavorite: (songId: string) => void;
}

const WisdomCardView: React.FC<WisdomCardViewProps> = ({ song, isPlaying, onTogglePlay, onNext, onPrev, profile, onUpdateProfile, onExit, onToggleSongFavorite }) => {
    const [wisdomText, setWisdomText] = useState('');
    const [sources, setSources] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWisdomLiked, setIsWisdomLiked] = useState(false);
    const [isHeartBeating, setIsHeartBeating] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false); // Track card flip state
    const aiRef = useRef<GoogleGenAI | null>(null);
    const isMounted = useRef(true);
    const titleContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const checkOverflow = () => {
            if (titleRef.current && titleContainerRef.current) {
                const isOverflowing = titleRef.current.scrollWidth > titleContainerRef.current.clientWidth;
                setIsTitleOverflowing(isOverflowing);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [song.title]);

    const combinedWisdom = useMemo(() => {
        return [...new Set([...allWisdom, ...(profile?.customWisdom || [])])];
    }, [profile?.customWisdom]);

    const getNewWisdom = useCallback(async (forceRefresh = false) => {
        if (!isMounted.current || !profile) return;
        setIsLoading(true);
        setWisdomText('');
        setSources(null);
        setIsWisdomLiked(false);

        const selectedTopics = profile.settings.simpleMode.selectedTopics || [];
        const cacheKey = JSON.stringify(selectedTopics);
        
        // 1. Check Cache
        if (!forceRefresh) {
            const cached = wisdomCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION_MS)) {
                if (isMounted.current) { 
                    setWisdomText(cached.wisdom); 
                    setSources(cached.sources);
                    setIsLoading(false); 
                }
                return;
            }
        }
        
        const fallbackToOffline = () => {
            if (isMounted.current) {
                const randomIndex = Math.floor(Math.random() * combinedWisdom.length);
                setWisdomText(combinedWisdom[randomIndex]);
                setIsLoading(false);
            }
        };

        // 2. Check Throttle (Backoff)
        if (Date.now() - lastApiErrorTime < API_BACKOFF_MS) {
            fallbackToOffline();
            return;
        }

        const apiKey = process.env.API_KEY;
        if (navigator.onLine && apiKey) {
            if (!aiRef.current) {
                try { aiRef.current = new GoogleGenAI({ apiKey }); } 
                catch (e) { console.error("Failed to initialize GoogleGenAI", String(e)); }
            }
            if (aiRef.current) {
                try {
                    const topicsPrompt = selectedTopics.length > 0
                        ? `related to one of these topics: ${selectedTopics.join(', ')}`
                        : "that is inspirational, a surprising science fact, or a music fact";

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

                    const response = await aiRef.current.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: `Generate a compelling, short piece of wisdom (1-2 sentences MAX) ${topicsPrompt}.`,
                        config: {
                             systemInstruction: "You are an AI for a music app in the year 2026. Your task is to provide a single piece of wisdom (a fact, quote, or thought) that feels futuristic, insightful, or deeply human. Your response MUST be only the text of the vibe itself, with no extra formatting, quotes, or conversational text.",
                             tools: [{googleSearch: {}}]
                        }
                    });
                    
                    clearTimeout(timeoutId);

                    if (!isMounted.current) return;
                    if (response.text) {
                        const newWisdom = response.text.trim().replace(/^"|"$/g, '');
                        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || null;
                        if (newWisdom) {
                            setWisdomText(newWisdom);
                            setSources(groundingChunks);
                            wisdomCache.set(cacheKey, { wisdom: newWisdom, sources: groundingChunks, timestamp: Date.now() });
                            setIsLoading(false);
                            return;
                        }
                    }
                } catch (error) {
                    const errorStr = String(error);
                    // Explicitly check for Quota/Rate Limit errors to trigger backoff
                    if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
                        lastApiErrorTime = Date.now();
                        console.warn("AI Quota exceeded. Switching to offline mode for 5 minutes.");
                    } else {
                        console.error("AI wisdom generation failed (falling back to offline):", errorStr);
                    }
                    fallbackToOffline();
                    return;
                }
            }
        }
        fallbackToOffline();
    }, [profile?.settings.simpleMode.selectedTopics, combinedWisdom]);

    useEffect(() => { getNewWisdom(); }, [getNewWisdom]);

    const handleLikeWisdom = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!wisdomText) return;
        onUpdateProfile(p => {
            const currentLiked = p.likedWisdoms || [];
            const isAlreadyLiked = currentLiked.includes(wisdomText);
            const newLiked = isAlreadyLiked ? currentLiked.filter(w => w !== wisdomText) : [...currentLiked, wisdomText].slice(-10);
            setIsWisdomLiked(!isAlreadyLiked);
            return { ...p, likedWisdoms: newLiked };
        });
        getNewWisdom(true);
    };

    const handleLikeSong = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsHeartBeating(true);
        setTimeout(() => setIsHeartBeating(false), 500);
        onToggleSongFavorite(song.id);
    };
    
    useEffect(() => { setIsWisdomLiked((profile?.likedWisdoms || []).includes(wisdomText)); }, [wisdomText, profile?.likedWisdoms]);

    const { speed: neonSpeed } = profile?.settings.neonGlow || { enabled: false, style: 'rotate', speed: 5 };
    const animationDuration = (11 - neonSpeed) * 0.5;

    // Flip Card Mode
    return (
        <div className="fixed inset-0 bg-black flex flex-col p-6 text-white overflow-hidden items-center justify-center z-[200]">
            {/* Blurred Background */}
            <div 
                className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000"
                style={{ backgroundImage: `url(${song.albumArtUrl})`, filter: 'blur(40px) brightness(0.4)', transform: 'scale(1.2)' }}
            />
            
            {/* Absolute Exit Button - Guaranteed Visibility */}
            <button 
                onClick={onExit} 
                className="absolute top-6 right-6 z-[250] text-2xl text-white bg-black/40 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center backdrop-blur-md shadow-lg border border-white/10 transition-colors" 
                aria-label="Exit Simple Mode"
            >
                <X size={24} />
            </button>

            {/* Header */}
             <div className="relative z-10 flex justify-between items-center flex-shrink-0 self-stretch mb-4 pt-2">
                <h1 className="font-bold text-lg text-white/90 drop-shadow-md bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Mwijay Music <span className="text-[10px] opacity-50 ml-1">2026</span></h1>
            </div>

            {/* Main Card Area */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full h-full py-4 perspective-1000">
                <div 
                    className={`wisdom-flip-card w-full max-w-[340px] aspect-[3/4] cursor-pointer transition-transform duration-700 transform-style-3d relative ${isFlipped ? 'flipped' : ''}`}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Front Face: Album Art & Info */}
                    <div className="wisdom-flip-card-front absolute inset-0 backface-hidden rounded-[2.5rem] overflow-hidden shadow-2xl bg-black">
                         <div className="premium-gradient-card h-full">
                            <div className="premium-gradient-card-content relative h-full flex flex-col">
                                 {song.albumArtUrl ? (
                                    <img src={song.albumArtUrl} alt={song.title} className="absolute inset-0 w-full h-full object-cover opacity-90" onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : null}
                                <div className={`absolute inset-0 w-full h-full ${song.albumArtUrl ? 'hidden' : 'block'}`}>
                                    <AnimatedCoverArt id={song.id} shape="square" />
                                </div>
                                
                                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 pointer-events-none">
                                    <div ref={titleContainerRef} className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                                        <h2 ref={titleRef} className="marquee-content text-4xl font-extrabold text-white leading-tight drop-shadow-lg mb-2" title={song.title}>{song.title}</h2>
                                    </div>
                                    <p className="text-xl font-medium text-white/80 drop-shadow-md">{song.artist}</p>
                                    <div className="mt-4 flex gap-2">
                                        <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">Tap to Flip</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Back Face: Wisdom / Daily Vibe */}
                    <div className="wisdom-flip-card-back absolute inset-0 backface-hidden rounded-[2.5rem] overflow-hidden shadow-2xl bg-[var(--surface-color)] rotate-y-180 flex flex-col border-2 border-[var(--primary-accent)]/30">
                         <div className="premium-gradient-card h-full">
                            <div className="premium-gradient-card-content p-8 flex flex-col h-full items-center justify-center text-center relative" style={{ background: 'var(--surface-color)', color: 'var(--text-primary)' }}>
                                <div className="absolute top-6 left-0 right-0 flex justify-center">
                                    <span className="bg-[var(--primary-accent)] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Daily Vibe</span>
                                </div>
                                
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    {isLoading ? (
                                        <Loader2 size={32} className="animate-spin text-[var(--primary-accent)]" />
                                    ) : (
                                        <div className="text-xl font-medium leading-relaxed italic font-serif">
                                            <Quote size={24} className="text-[var(--primary-accent)]/50 absolute top-0 left-0 -translate-x-4 -translate-y-4 rotate-180" />
                                            <TextGenerateEffect words={wisdomText} />
                                            <Quote size={24} className="text-[var(--primary-accent)]/50 absolute bottom-0 right-0 translate-x-4 translate-y-4" />
                                        </div>
                                    )}
                                </div>

                                {sources && sources.length > 0 && (
                                    <div className="text-xs text-[var(--text-secondary)] mt-4 border-t border-[var(--surface-border-color)] pt-3 w-full">
                                        Source: <a href={sources[0].web.uri} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-primary)]" onClick={e => e.stopPropagation()}>{sources[0].web.title}</a>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-8 pt-6 w-full">
                                    <button onClick={(e) => { e.stopPropagation(); handleLikeWisdom(e); }} className={`transition-all active:scale-95 p-3 rounded-full bg-[var(--chip-bg)] ${isWisdomLiked ? 'text-[var(--primary-accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="Like this vibe">
                                        <ThumbsUp size={24} className={isWisdomLiked ? 'fill-current' : ''} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); getNewWisdom(true); }} title="Next vibe" className="transition-all active:scale-95 p-3 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                        <RefreshCw size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Controls */}
            <footer className="relative z-10 flex-shrink-0 pt-4 w-full max-w-lg flex items-center justify-center gap-8 md:gap-12 pb-6 px-6">
                <button className="text-white/60 hover:text-white transition-transform active:scale-90" onClick={onPrev} disabled={song.duration === Infinity} aria-label="Previous song">
                    <SkipBack size={36} fill="currentColor" />
                </button>
                <button className="w-16 h-16 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary-accent)]/40 transition-transform active:scale-95 hover:scale-105" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={handleLikeSong} className="transition-transform active:scale-90 drop-shadow-lg">
                    <Heart size={36} className={`${isHeartBeating ? 'heart-beat-anim' : ''} ${song.isFavorite ? 'text-red-500 fill-red-500' : 'text-white/70 hover:text-white'}`} />
                </button>
                <button className="text-white/60 hover:text-white transition-transform active:scale-90" onClick={onNext} disabled={song.duration === Infinity} aria-label="Next song">
                    <SkipForward size={36} fill="currentColor" />
                </button>
            </footer>
        </div>
    );
};

export default WisdomCardView;
