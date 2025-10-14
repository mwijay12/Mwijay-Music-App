import React from 'react';
import type { ProfileData } from '../types.ts';
import { fonts } from '../constants.ts';
import AnimatedThemeToggler from './AnimatedThemeToggler.tsx';
import BlurText from './BlurText.tsx';

interface HeaderProps {
    profile: ProfileData;
    greetingText: string;
    greetingEmoji: string;
    onAvatarClick: () => void;
    onOpenCreateView: () => void;
    onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ profile, greetingText, greetingEmoji, onAvatarClick, onOpenCreateView, onToggleTheme }) => {
    const nameplateFontFamily = fonts.find(f => f.name === profile.nameplateFont)?.family || "'Satoshi', sans-serif";
    const displayName = profile.name;
    const nameplateAnimationClass = `name-anim-${profile.settings.nameplateAnimation || 'none'}`;
    
    const nameplateStyle = {
        fontFamily: nameplateFontFamily,
        '--char-count': displayName.length,
    } as React.CSSProperties;

    return (
        <header className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
                <button onClick={onAvatarClick} className="bg-transparent border-none p-0 rounded-full" aria-label="Open Profile" title="Open Profile">
                    <img
                        src={profile.avatarUrl}
                        alt="User Avatar"
                        className="w-12 h-12 rounded-full object-cover"
                    />
                </button>
                <div>
                    <BlurText
                        text={`${greetingText} ${greetingEmoji}`}
                        delay={60}
                        animateBy="letters"
                        direction="top"
                        className="text-lg font-bold leading-tight"
                    />
                    <p 
                        className={`text-xl font-bold leading-tight text-[var(--primary-accent)] ${nameplateAnimationClass}`} 
                        style={nameplateStyle}
                        data-text={displayName}
                    >
                        {displayName}
                    </p>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                 <AnimatedThemeToggler themeMode={profile.themeMode} onToggle={onToggleTheme} />
                <button onClick={onOpenCreateView} className="text-xl" aria-label="Open AI Lyric Studio" title="Open AI Lyric Studio">
                    <i className="fas fa-wand-magic-sparkles"></i>
                </button>
            </div>
        </header>
    );
};

export default Header;