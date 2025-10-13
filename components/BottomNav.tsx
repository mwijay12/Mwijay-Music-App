import React from 'react';
import type { ProfileData } from '../types.ts';

interface NavItem {
    name: string;
    icon: string;
}

interface BottomNavProps {
    items: NavItem[];
    activeItem: string;
    onItemClick: (name: string) => void;
    isHidden?: boolean;
    profile: ProfileData | null;
}

const BottomNav: React.FC<BottomNavProps> = ({ items, activeItem, onItemClick, isHidden = false, profile }) => {
    const { enabled, style, speed } = profile?.settings.neonGlow ?? { enabled: true, style: 'rotate', speed: 5 };
    // Slower animation for higher speed value, so we invert it. Base duration 10s.
    const animationDuration = (11 - speed) * 0.5;

    return (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-sm transition-transform duration-300 ease-in-out ${isHidden ? 'translate-y-32' : 'translate-y-0'}`} style={{ height: 'var(--footer-height)' }}>
            <div
                className={`neon-glow-container ${enabled ? `active style-${style}` : ''}`}
                style={{ borderRadius: '9999px', '--animation-duration': `${animationDuration}s` } as React.CSSProperties}
            >
                <nav
                    className={`glass-nav relative flex justify-around items-center rounded-full p-2 h-full`}
                >
                   {items.map((item) => {
                       const isActive = activeItem === item.name;
                       return (
                           <button
                                key={item.name}
                                className={`nav-item relative text-2xl p-2 bg-transparent border-none transition-all duration-200`}
                                aria-label={item.name}
                                title={item.name}
                                onClick={() => onItemClick(item.name)}
                                style={{ color: isActive ? 'var(--primary-accent)' : 'var(--text-secondary)' }}
                            >
                                <i className={`fas ${item.icon}`}></i>
                            </button>
                       )
                   })}
                </nav>
            </div>
        </div>
    );
};

export default BottomNav;
