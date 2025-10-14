import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Song, ProfileData } from '../types.ts';
import { allWisdom } from '../constants.ts';
import { GoogleGenAI } from '@google/genai';
import TextGenerateEffect from './TextGenerateEffect.tsx';

const wisdomCache = new Map<string, { wisdom: string; timestamp: number }>();
const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

interface WisdomCardViewProps {
    song: Song;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrev: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onExit: () => void;
    onToggleSongFavorite: () => void;
}

const WisdomCardView: React.FC<WisdomCardViewProps> = ({ song, isPlaying, onTogglePlay, onNext, onPrev, profile, onUpdateProfile, onExit, onToggleSongFavorite }) => {
    const [wisdomText, setWisdomText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isWisdomLiked, setIsWisdomLiked] = useState(false);
    const [isHeartBeating, setIsHeartBeating] = useState(false);
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
        return [...new Set([...allWisdom, ...(profile.customWisdom || [])])];
    }, [profile.customWisdom]);

    const getNewWisdom = useCallback(async () => {
        if (!isMounted.current) return;
        setIsLoading(true);
        setWisdomText('');
        setIsWisdomLiked(false);
        const cacheKey = JSON.stringify(profile.likedWisdoms || []);
        
        const cached = wisdomCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION_MS)) {
            if (isMounted.current) { setWisdomText(cached.wisdom); setIsLoading(false); }
            return;
        }
        
        const fallbackToOffline = () => {
            if (isMounted.current) {
                const randomIndex = Math.floor(Math.random() * combinedWisdom.length);
                setWisdomText(combinedWisdom[randomIndex]);
                setIsLoading(false);
            }
        };
        
        // FIX: Use process.env.API_KEY as per Gemini API guidelines.
        const apiKey = process.env.API_KEY;
        if (navigator.onLine && apiKey) {
            if (!aiRef.current) {
                try { aiRef.current = new GoogleGenAI({ apiKey }); } 
                catch (e) { console.error("Failed to initialize GoogleGenAI", String(e)); }
            }
            if (aiRef.current) {
                try {
                    const likedWisdoms = profile.likedWisdoms || [];
                    const prompt = `You are an AI for a music app's "Sound Vibe" feature, which displays a single piece of wisdom on a card while music plays. Your task is to generate a compelling, short text (1-2 sentences MAX). It can be a fascinating fact (music, science, history), a profound quote, or a surprising thought. The user's taste, based on previously 'liked' vibes, is: ${likedWisdoms.length > 0 ? `"${likedWisdoms.join('", "')}"` : 'inspirational quotes and surprising science facts'}. Generate a new vibe that aligns with this taste. CRITICAL: Your response MUST be only the text of the vibe itself. NO quotation marks, NO labels like "Fact:", NO extra conversational text.`;

                    const response = await aiRef.current.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                    if (!isMounted.current) return;
                    const newWisdom = (response.text || '').trim().replace(/^"|"$/g, '');
                    if (newWisdom) {
                        setWisdomText(newWisdom);
                        wisdomCache.set(cacheKey, { wisdom: newWisdom, timestamp: Date.now() });
                        setIsLoading(false);
                        return;
                    }
                } catch (error) {
                    console.error("AI wisdom generation failed (falling back to offline):", String(error));
                }
            }
        }
        fallbackToOffline();
    }, [profile.likedWisdoms, combinedWisdom]);

    useEffect(() => { getNewWisdom(); }, [getNewWisdom, song]);

    const handleLikeWisdom = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!wisdomText) return;
        onUpdateProfile(p => {
            const currentLiked = p.likedWisdoms || [];
            const isAlreadyLiked = currentLiked.includes(wisdomText);
            const newLiked = isAlreadyLiked ? currentLiked.filter(w => w !== wisdomText) : [...currentLiked, wisdomText].slice(-10); // Keep last 10 for context
            setIsWisdomLiked(!isAlreadyLiked);
            return { ...p, likedWisdoms: newLiked };
        });
    };

    const handleLikeSong = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsHeartBeating(true);
        setTimeout(() => setIsHeartBeating(false), 500);
        onToggleSongFavorite();
    };
    
    useEffect(() => { setIsWisdomLiked((profile.likedWisdoms || []).includes(wisdomText)); }, [wisdomText, profile.likedWisdoms]);

    if (profile.settings.simpleMode.style === 'static') {
        return (
            <div className="fixed inset-0 bg-black flex flex-col p-4 text-white overflow-hidden justify-between">
                <div className="relative z-10 flex justify-between items-center flex-shrink-0">
                    <button className="text-2xl text-white/80 hover:text-white" aria-label="Add to playlist (not implemented)">
                        <i className="fas fa-plus"></i>
                    </button>
                    <button onClick={onExit} className="text-2xl text-white/80 hover:text-white" aria-label="Exit Simple Mode">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 py-4">
                    <div className="w-full max-w-xs">
                        <div className="relative w-full aspect-[1/1.1] rounded-2xl overflow-hidden shadow-2xl">
                            <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6">
                                <p className="text-sm font-semibold text-white/80 uppercase tracking-widest">{song.artist}</p>
                                <div ref={titleContainerRef} className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                                    <h2 ref={titleRef} className="marquee-content text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>{song.title}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1C1C1E] rounded-2xl p-6 mt-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg" style={{ color: 'var(--primary-accent)' }}>Mwijay Music App</h3>
                                <div className="flex items-center gap-4 text-neutral-400">
                                    <button onClick={handleLikeWisdom} className={`transition-colors ${isWisdomLiked ? 'text-[var(--primary-accent)]' : 'hover:text-white'}`} title="Like this vibe">
                                        <i className={`${isWisdomLiked ? 'fas' : 'far'} fa-thumbs-up text-xl`}></i>
                                    </button>
                                    <button onClick={getNewWisdom} className="hover:text-white" title="Next vibe">
                                        <i className="fas fa-sync-alt text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="min-h-[4rem] text-md text-neutral-200 mt-2 flex items-center">
                                {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <TextGenerateEffect words={wisdomText} />}
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="relative z-10 flex-shrink-0 w-full max-w-sm mx-auto pb-4 flex flex-col items-center gap-4">
                    <button onClick={handleLikeSong} className="text-3xl">
                        <i className={`${isHeartBeating ? 'heart-beat-anim' : ''} ${song.isFavorite ? 'fas text-red-500' : 'far'} fa-heart`}></i>
                    </button>
                    <div className="flex justify-around items-center w-full">
                        <button className="text-3xl text-neutral-200 w-16 h-16" onClick={onPrev} disabled={song.duration === Infinity} aria-label="Previous song">
                            <i className="fas fa-backward-step"></i>
                        </button>
                        <button className="w-20 h-20 bg-[var(--primary-accent)] text-black rounded-full text-4xl flex items-center justify-center shadow-lg" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button className="text-3xl text-neutral-200 w-16 h-16" onClick={onNext} disabled={song.duration === Infinity} aria-label="Next song">
                            <i className="fas fa-forward-step"></i>
                        </button>
                    </div>
                </footer>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black flex flex-col p-6 text-white overflow-hidden items-center justify-center">
            <div 
                className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000"
                style={{ backgroundImage: `url(${song.albumArtUrl})`, filter: 'blur(40px) brightness(0.4)', transform: 'scale(1.2)' }}
            />
             <div className="relative z-10 flex justify-between items-center flex-shrink-0 self-stretch">
                <h1 className="font-bold text-lg">Mwijay Music App</h1>
                <button onClick={onExit} className="text-2xl text-neutral-400 hover:text-white" aria-label="Exit Simple Mode">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
                <div className="wisdom-flip-card">
                    <div className="wisdom-flip-card-inner">
                        <div className="wisdom-flip-card-front">
                             <img src={song.albumArtUrl} alt={song.title} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6">
                                <p className="text-sm font-semibold text-white/80 uppercase tracking-widest">{song.artist}</p>
                                <div ref={titleContainerRef} className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                                    <h2 ref={titleRef} className="marquee-content text-5xl font-extrabold text-white leading-tight" title={song.title}>{song.title}</h2>
                                </div>
                            </div>
                        </div>
                        <div className="wisdom-flip-card-back p-4">
                            <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-accent)'}}>Mwijay Music App</h2>
                            <div className="flex-1 flex items-center justify-center px-2">
                                {isLoading ? <i className="fas fa-spinner fa-spin text-2xl"></i> : <p className="text-center"><TextGenerateEffect words={wisdomText} /></p>}
                            </div>
                            <div className="flex items-center gap-8 text-neutral-300">
                                <button onClick={handleLikeWisdom} className={`transition-colors ${isWisdomLiked ? 'text-[var(--primary-accent)]' : ''}`} title="Like this vibe">
                                    <i className={`${isWisdomLiked ? 'fas' : 'far'} fa-thumbs-up text-2xl`}></i>
                                </button>
                                <button onClick={getNewWisdom} title="Next vibe">
                                    <i className="fas fa-sync-alt text-2xl"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 flex-shrink-0 pt-6 w-full max-w-sm flex flex-col items-center gap-4">
                <button onClick={handleLikeSong} className="text-3xl">
                    <i className={`${isHeartBeating ? 'heart-beat-anim' : ''} ${song.isFavorite ? 'fas text-red-500' : 'far'} fa-heart`}></i>
                </button>
                <div className="flex justify-around items-center w-full">
                    <button className="text-3xl text-neutral-200 w-16 h-16" onClick={onPrev} disabled={song.duration === Infinity} aria-label="Previous song">
                        <i className="fas fa-backward-step"></i>
                    </button>
                    <button className="w-20 h-20 bg-[var(--primary-accent)] text-black rounded-full text-4xl flex items-center justify-center shadow-lg" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <button className="text-3xl text-neutral-200 w-16 h-16" onClick={onNext} disabled={song.duration === Infinity} aria-label="Next song">
                        <i className="fas fa-forward-step"></i>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default WisdomCardView;