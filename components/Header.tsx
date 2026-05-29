

import React, { useState, useEffect, useMemo } from 'react';
import type { ProfileData } from '../types.ts';
import { fonts } from './constants.ts';
import ThemeToggler from './ThemeToggler.tsx';
import { Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface HeaderProps {
    profile: ProfileData;
    onAvatarClick: () => void;
    onToggleTheme: () => void;
    onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ profile, onAvatarClick, onToggleTheme, onSettingsClick }) => {
    const [greetingData, setGreetingData] = useState({
        text: 'Hello',
        emojis: ['☀️'],
    });
    const [currentEmoji, setCurrentEmoji] = useState('☀️');

    useEffect(() => {
        const hour = new Date().getHours();
        let data;
        
        if (profile.settings.greetingStyle === 'welcome') {
             data = {
                text: 'Welcome back',
                emojis: ['👋', '✨', '🎵'],
            };
        } else {
            if (hour >= 5 && hour < 12) {
                data = {
                    text: 'Good Morning',
                    emojis: ['🌞', '🥐', '☕️', '🌅'],
                };
            } else if (hour >= 12 && hour < 18) {
                data = {
                    text: 'Good Afternoon',
                    emojis: ['☀️', '😊', '😎', '👍'],
                };
            } else {
                data = {
                    text: 'Good Evening',
                    emojis: ['🌆', '🌙', '✨', '🌃'],
                };
            }
        }
        setGreetingData(data);
        setCurrentEmoji(data.emojis[0]);
    }, [profile.settings.greetingStyle]);

    useEffect(() => {
        const emojiInterval = setInterval(() => {
            setCurrentEmoji(prev => {
                const currentIndex = greetingData.emojis.indexOf(prev);
                const nextIndex = (currentIndex + 1) % greetingData.emojis.length;
                return greetingData.emojis[nextIndex];
            });
        }, 2500);
        return () => clearInterval(emojiInterval);
    }, [greetingData.emojis]);

    const nameplateFontFamily = fonts.find(f => f.name === profile.nameplateFont)?.family || "'Satoshi', sans-serif";
    const displayName = profile.name;
    const nameplateAnimationClass = `name-anim-${profile.settings.nameplateAnimation || 'none'}`;
    
    const nameplateStyle = {
        fontFamily: nameplateFontFamily,
        '--char-count': displayName.length,
    } as React.CSSProperties;

    return (
        <header className="flex justify-between items-center mb-3 md:mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
                <button onClick={onAvatarClick} className="bg-transparent border-none p-0 rounded-full" aria-label="Open Profile" title="Open Profile">
                    {profile.avatarUrl && !profile.avatarUrl.startsWith('http') && !profile.avatarUrl.startsWith('data:') && !profile.avatarUrl.startsWith('/') ? (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent-start)]/20 border border-[var(--surface-border-color)] flex items-center justify-center text-2xl select-none">
                            {profile.avatarUrl}
                        </div>
                    ) : (
                        <img
                            src={profile.avatarUrl || 'https://via.placeholder.com/150'}
                            alt="User Avatar"
                            className="w-12 h-12 rounded-full object-cover border border-[var(--surface-border-color)]"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                    const fallbackDiv = document.createElement('div');
                                    fallbackDiv.className = "avatar-fallback w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent-start)]/20 border border-[var(--surface-border-color)] flex items-center justify-center text-xl font-black select-none";
                                    fallbackDiv.innerText = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
                                    parent.appendChild(fallbackDiv);
                                }
                            }}
                        />
                    )}
                </button>
                <div>
                     <div className="text-xs md:text-sm font-semibold tracking-wide text-neutral-400/90 leading-tight h-6">
                        <div className="typing-container">
                            <div className="typing-effect" style={{'--char-count': `calc(5 + ${greetingData.text.length})`} as React.CSSProperties}>
                                <p>
                                    <span className="text-[var(--text-primary)] opacity-90">{greetingData.text}</span>
                                </p>
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={currentEmoji}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                                    className="inline-block ml-2 greeting-emoji text-[0.75rem] md:text-[0.875rem]"
                                >
                                    {currentEmoji}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </div>
                    <p 
                        className={`text-base md:text-lg font-black tracking-tight leading-tight text-[var(--primary-accent)] ${nameplateAnimationClass}`} 
                        style={nameplateStyle}
                        data-text={displayName}
                    >
                        {['wavy', 'text-rotate', 'matrix'].includes(profile.settings.nameplateAnimation)
                            ? displayName.split('').map((char, i) => <span key={i} style={{'--char-index': i} as React.CSSProperties}>{char === ' ' ? '\u00A0' : char}</span>)
                            : displayName
                        }
                    </p>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                 <ThemeToggler checked={profile.themeMode === 'dark'} onChange={onToggleTheme} />
                 <button onClick={onSettingsClick} className="hidden lg:flex w-10 h-10 rounded-full bg-white/5 items-center justify-center text-[var(--text-primary)] hover:bg-white/10 transition-colors" aria-label="Settings" title="Settings">
                    <Settings size={20} />
                 </button>
            </div>
        </header>
    );
};

export default React.memo(Header);