import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Sparkles, Loader2, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import Header from './Header.tsx';
import MwijayAssistantButton from './MwijayAssistantButton.tsx';
import type { ProfileData, Song } from '../types.ts';
import { defaultMoods, fonts } from './constants.ts';
import HorizontalSongScroller from './HorizontalSongScroller.tsx';

interface HomeViewProps {
    profile: ProfileData;
    librarySongs: Song[];
    onNavigate: (view: string) => void;
    onPlaySong: (song: Song, context: Song[]) => void;
    onOpenAssistant: () => void;
    onToggleTheme: () => void;
    onOpenAddMoodModal: () => void;
    isAssistantOpening: boolean;
    onStartDjSession: () => void;
    isDjSessionStarting: boolean;
}

const MoodCard: React.FC<{ title: string, emoji: string, color: string, onClick: () => void }> = ({ title, emoji, color, onClick }) => (
    <button 
        onClick={onClick} 
        className={`relative flex-shrink-0 w-36 h-24 rounded-[2rem] overflow-hidden text-sm flex flex-col items-center justify-center p-4 transition-all hover:scale-105 active:scale-95 shadow-xl border border-white/10 ${color}`}
    >
        <span className="z-10 font-black text-lg leading-tight tracking-tight text-white drop-shadow-md">{title}</span>
        <span className="absolute -right-1 -bottom-2 text-6xl opacity-30 z-0 select-none transform rotate-12 filter blur-[1px]">{emoji}</span>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
    </button>
);

const scrollRevealVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { 
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number] // Custom premium easeOutExpo curve
        } 
    }
};

const HomeView: React.FC<HomeViewProps> = ({ profile, librarySongs, onNavigate, onPlaySong, onOpenAssistant, onToggleTheme, onOpenAddMoodModal, isAssistantOpening, onStartDjSession, isDjSessionStarting }) => {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isScrolled, setIsScrolled] = useState(false);

    const nameplateFontFamily = fonts.find(f => f.name === profile.nameplateFont)?.family || "'Satoshi', sans-serif";
    const nameplateAnimationClass = `name-anim-${profile.settings.nameplateAnimation || 'none'}`;
    const nameplateStyle = {
        fontFamily: nameplateFontFamily,
        '--char-count': profile.name.length,
        display: 'inline-block'
    } as React.CSSProperties;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 20);
    };

    const allMoods = useMemo(() => {
        return [...defaultMoods, ...(profile.customMoods ?? [])];
    }, [profile.customMoods]);

    const moodSongs = useMemo(() => {
        if (!selectedMood) return [];
        return librarySongs.filter(s => s.moodEmoji === selectedMood);
    }, [selectedMood, librarySongs]);

    const recentlyPlayedSongs = useMemo(() => {
        return (profile.recentlyPlayed ?? [])
            .map(songId => librarySongs.find(song => song.id === songId))
            .filter((s): s is Song => !!s)
            .slice(0, 10);
    }, [profile.recentlyPlayed, librarySongs]);
    
    // Auto-scroll logic for moods
    const renderMoodList = (suffix: string) => (
        <>
            {allMoods.map((mood, idx) => (
               <MoodCard 
                    key={`${mood.name}-${idx}-${suffix}`}
                    title={mood.name}
                    emoji={mood.emoji}
                    color={mood.color}
                    onClick={() => setSelectedMood(prev => prev === mood.emoji ? null : mood.emoji)}
               />
           ))}
           <button 
                key={`add-mood-${suffix}`}
                onClick={onOpenAddMoodModal}
                className="liquid-glass-pane glare-effect w-36 h-24 p-4 rounded-[2rem] flex-shrink-0 flex flex-col items-center justify-center gap-1 text-center transition-all hover:scale-105 active:scale-95 border border-white/10"
                title="Add a new custom mood"
            >
                <Plus size={24} className="text-[var(--primary-accent)]" />
                <span className="font-black text-xs text-neutral-300 uppercase tracking-tighter">Add Vibe</span>
            </button>
            <button 
                key={`ai-create-${suffix}`}
                onClick={() => onNavigate('Create')}
                className="w-36 h-24 p-4 rounded-[2rem] flex-shrink-0 flex flex-col items-center justify-center gap-1 text-center transition-all hover:scale-105 active:scale-95 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg border border-white/10"
                title="Go to AI Studio"
            >
                <Sparkles size={24} />
                <span className="font-black text-xs uppercase tracking-tighter">AI Studio</span>
            </button>
        </>
    );

    const greetingTime = currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening';

    return (
        <main onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            
            {/* Sticky Header Container */}
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''} max-w-7xl mx-auto w-full z-50`}>
                <Header 
                    profile={profile}
                    onAvatarClick={() => onNavigate('Profile')}
                    onToggleTheme={onToggleTheme}
                    onSettingsClick={() => onNavigate('Settings')}
                />
            </div>

            <div className="px-6 pb-40 pt-4 scroll-content-with-header max-w-7xl mx-auto w-full">
                
                <div className="flex flex-col gap-8">
                    {/* Desktop Hero Section */}
                    <motion.section 
                        className="hidden lg:flex relative w-full h-64 rounded-[2.5rem] overflow-hidden shadow-2xl mb-2 group"
                        variants={scrollRevealVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10"></div>
                        <img 
                            src={recentlyPlayedSongs[0]?.albumArtUrl || profile.avatarUrl} 
                            alt="Hero Background" 
                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2s]"
                        />
                        <div className="relative z-20 p-8 flex flex-col justify-center h-full max-w-2xl">
                            <p className="text-[var(--primary-accent)] font-bold tracking-widest uppercase mb-1 text-sm">Good {greetingTime}</p>
                            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
                                Ready to vibe, <br/>
                                <span 
                                    className={`text-transparent bg-clip-text bg-gradient-to-r from-white to-[var(--primary-accent)] ${nameplateAnimationClass}`}
                                    style={nameplateStyle}
                                    data-text={profile.name}
                                >
                                    {['wavy', 'text-rotate', 'matrix'].includes(profile.settings.nameplateAnimation)
                                        ? profile.name.split('').map((char, i) => <span key={i} style={{'--char-index': i} as React.CSSProperties}>{char === ' ' ? '\u00A0' : char}</span>)
                                        : profile.name
                                    }
                                </span>
                                <span className="text-white">?</span>
                            </h1>
                            <div className="flex gap-4">
                                <button onClick={() => onNavigate('Explore')} className="bg-[var(--primary-accent)] hover:bg-white text-black font-bold py-3 px-8 rounded-full text-base transition-all shadow-[0_0_20px_rgba(200,240,82,0.3)]">
                                    Explore New Music
                                </button>
                            </div>
                        </div>
                    </motion.section>

                    {/* Moods Section - Continuous Scroll */}
                    <motion.section 
                        className="relative group/moods -mx-6 overflow-hidden"
                        variants={scrollRevealVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                    >
                        <div className="px-6 mb-4">
                            <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">What's your mood today?</h2>
                        </div>
                        <div className="w-full px-6">
                            <div className="flex w-fit animate-scroll group-hover/moods:paused gap-4 py-2">
                                {renderMoodList('set1')}
                                {renderMoodList('set2')}
                            </div>
                        </div>
                    </motion.section>

                    {/* Main Action - Assistant Button (Visible on all breakpoints, centered) */}
                    <motion.section 
                        className="flex flex-col items-center justify-center py-2 max-w-md mx-auto w-full"
                        variants={scrollRevealVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                    >
                        <MwijayAssistantButton onClick={onOpenAssistant} isOpening={isAssistantOpening} />
                    </motion.section>

                    
                    {selectedMood && (
                         <motion.div
                            variants={scrollRevealVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                         >
                             <HorizontalSongScroller
                                title={`${selectedMood} Vibe`}
                                songs={moodSongs}
                                onPlaySong={onPlaySong}
                                emptyMessage="No songs match this mood yet."
                             />
                         </motion.div>
                    )}
                    
                    {/* Recently Played */}
                    <motion.div
                        variants={scrollRevealVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                    >
                        <HorizontalSongScroller
                            title="Recently Played"
                            songs={recentlyPlayedSongs}
                            onPlaySong={onPlaySong}
                            emptyMessage={librarySongs.length === 0 ? "Add some songs to get started!" : "Start listening to see recent tracks."}
                        />
                    </motion.div>
                </div>
            </div>
        </main>
    );
};

export default HomeView;
