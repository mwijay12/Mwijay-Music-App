
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, PlayCircle, Sparkles } from 'lucide-react';
import type { ProfileData, Song } from '../types.ts';
import Aurora from './Aurora.tsx';
import BlurText from './BlurText.tsx';

interface SimpleModeHomeViewProps {
    profile: ProfileData;
    onStartDjSession: () => void;
    isDjSessionStarting: boolean;
    onOpenAssistant: () => void;
    onExitSimpleMode: () => void;
    nowPlaying: Song | null;
    onOpenPlayer: () => void;
}

const SimpleModeHomeView: React.FC<SimpleModeHomeViewProps> = ({ 
    profile, 
    onStartDjSession, 
    isDjSessionStarting, 
    onOpenAssistant,
    onExitSimpleMode,
    nowPlaying,
    onOpenPlayer
}) => {
    return (
        <div className="relative h-full w-full overflow-hidden flex flex-col items-center justify-center p-8 text-center bg-black">
            <Aurora position="bottom" speed={0.2} blend={0.8} amplitude={0.5} />
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 flex flex-col items-center gap-12 max-w-md"
            >
                <div className="space-y-4">
                    <BlurText 
                        text={`Welcome back, ${profile.name.split(' ')[0]}`} 
                        className="text-4xl font-bold text-white tracking-tight"
                        delay={50}
                    />
                    <p className="text-neutral-400 text-lg font-medium">
                        Your personal space for music and wisdom.
                    </p>
                </div>

                <div className="flex flex-col gap-6 w-full">
                    <button 
                        onClick={onStartDjSession}
                        disabled={isDjSessionStarting}
                        className="w-full py-6 rounded-[2rem] bg-white text-black font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {isDjSessionStarting ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <PlayCircle />
                        )}
                        {isDjSessionStarting ? 'Tuning In...' : 'Start My Vibe'}
                    </button>

                    {nowPlaying && (
                        <button 
                            onClick={onOpenPlayer}
                            className="w-full py-6 rounded-[2rem] bg-neutral-900 text-white font-bold text-xl border border-white/10 shadow-2xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-1"
                        >
                            <span className="text-xs uppercase tracking-widest text-neutral-500">Now Playing</span>
                            <span className="truncate max-w-[250px]">{nowPlaying.title}</span>
                        </button>
                    )}

                    <button 
                        onClick={onOpenAssistant}
                        className="w-full py-6 rounded-[2rem] bg-indigo-600 text-white font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Sparkles />
                        Ask Mwijay
                    </button>
                </div>

                <button 
                    onClick={onExitSimpleMode}
                    className="mt-8 text-neutral-500 hover:text-white transition-colors text-sm font-medium uppercase tracking-[0.2em]"
                >
                    Exit Simple Mode
                </button>
            </motion.div>

            {/* Subtle 2026 branding */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
                <span className="text-[10px] font-mono tracking-[0.5em] text-white">Mwijay OS // 2026 Edition</span>
            </div>
        </div>
    );
};

export default SimpleModeHomeView;
