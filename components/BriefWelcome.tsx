
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProfileData } from '../types';
import { fonts } from './constants.ts';

const BriefWelcome: React.FC<{ profile: ProfileData, onDismiss: () => void, isVisible: boolean }> = ({ profile, onDismiss, isVisible }) => {
    const nameplateFontFamily = fonts.find(f => f.name === profile.nameplateFont)?.family || "'Satoshi', sans-serif";
    const displayName = profile.name;
    const nameplateAnimationClass = `name-anim-${profile.settings.nameplateAnimation || 'none'}`;
    
    const nameplateStyle = {
        fontFamily: nameplateFontFamily,
        '--char-count': displayName.length,
    } as React.CSSProperties;

    // Auto-dismiss logic is handled in App.tsx via setTimeout, but let's ensure the overlay itself handles clicks too.

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black cursor-pointer overflow-hidden"
                    onClick={onDismiss}
                >
                    {/* Cinematic Background Elements */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-accent)]/20 via-transparent to-[var(--secondary-accent-start)]/20 opacity-50 mix-blend-screen" />
                    <div className="absolute w-[500px] h-[500px] bg-[var(--primary-accent)] rounded-full blur-[150px] opacity-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '4s' }} />

                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                        className="text-center relative z-10"
                    >
                         <h2 className="text-2xl md:text-4xl font-light text-white/60 tracking-[0.2em] uppercase mb-4">Welcome Back</h2>
                         <div className="overflow-hidden">
                             <p 
                                className={`text-6xl md:text-9xl font-bold text-white drop-shadow-2xl ${nameplateAnimationClass}`} 
                                style={nameplateStyle}
                                data-text={displayName}
                            >
                                {['wavy', 'text-rotate'].includes(profile.settings.nameplateAnimation)
                                    ? displayName.split('').map((char, i) => <span key={i} style={{'--char-index': i} as React.CSSProperties}>{char === ' ' ? '\u00A0' : char}</span>)
                                    : displayName
                                }
                            </p>
                        </div>
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="absolute bottom-12 text-white/30 text-sm tracking-widest uppercase"
                    >
                        Initializing Audio Engine...
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BriefWelcome;
