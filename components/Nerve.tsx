
import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import type { ProfileData } from '../types.ts';

interface NavItem {
    name: string;
    icon: string;
}

interface NerveProps {
    items: NavItem[];
    activeItem: string;
    onItemClick: (name: string) => void;
    isHidden?: boolean;
    profile: ProfileData | null;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const Nerve: React.FC<NerveProps> = ({ items, activeItem, onItemClick, isHidden = false, profile, isCollapsed = false, onToggleCollapse }) => {
    // Extract neon settings
    const neonSettings = profile?.settings?.neonGlow || { enabled: false, style: 'rotate', speed: 5 };
    const { enabled: isNeonEnabled, style: neonStyle, speed: neonSpeed } = neonSettings;
    const animationDuration = (11 - neonSpeed) * 0.5;

    const renderIcon = (iconName: string, className: string) => {
        const IconComponent = (Icons as any)[iconName];
        return IconComponent ? <IconComponent className={className} /> : <Icons.HelpCircle className={className} />;
    };

    return (
        <>
            {/* Desktop Sidebar (Nerve) */}
            <div className={`hidden lg:flex flex-col h-full bg-black/60 border-r border-white/5 pt-safe-top pb-4 z-[150] flex-shrink-0 backdrop-blur-xl transition-all duration-300 ${isCollapsed ? 'w-20 px-2' : 'w-64 px-4'} ${isHidden ? 'lg:hidden' : ''}`}>
                <div className={`mb-8 pt-8 flex items-center ${isCollapsed ? 'flex-col gap-4 justify-center' : 'justify-between pl-4 pr-2'}`}>
                    {!isCollapsed ? (
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--primary-accent)] drop-shadow-md" style={{ fontFamily: "'Lobster', cursive" }}>Mwijay</h1>
                            <p className="text-xs text-white/70 tracking-widest uppercase font-semibold">Music App</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <h1 className="text-3xl font-black text-[var(--primary-accent)] drop-shadow-md" style={{ fontFamily: "'Lobster', cursive" }}>M</h1>
                        </div>
                    )}
                    {onToggleCollapse && (
                        <button 
                            onClick={onToggleCollapse} 
                            className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-200 hover:text-white transition-all active:scale-95 ${isCollapsed ? 'mt-2' : ''}`}
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <Icons.ChevronRight size={18} /> : <Icons.ChevronLeft size={18} />}
                        </button>
                    )}
                </div>
                <nav className="space-y-2 flex-1">
                    {items.map(item => (
                        <button
                            key={item.name}
                            onClick={() => onItemClick(item.name)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isCollapsed ? 'justify-center px-0' : ''} ${activeItem === item.name ? 'bg-[var(--primary-accent)] text-black font-bold shadow-lg shadow-[var(--primary-accent)]/20' : 'text-neutral-200 font-medium hover:text-white hover:bg-white/5'}`}
                            title={isCollapsed ? item.name : undefined}
                        >
                            {renderIcon(item.icon, "w-6 h-6 flex-shrink-0")}
                            {!isCollapsed && <span className="text-base truncate">{item.name}</span>}
                        </button>
                    ))}
                </nav>
                {profile && (
                    <div className="mt-auto pt-4 border-t border-white/5">
                        <button 
                            onClick={() => onItemClick('Profile')} 
                            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-white/5 transition-colors text-left group ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? "View Profile" : undefined}
                        >
                            {profile.avatarUrl && !profile.avatarUrl.startsWith('http') && !profile.avatarUrl.startsWith('data:') && !profile.avatarUrl.startsWith('/') ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent-start)]/20 border-2 border-transparent group-hover:border-[var(--primary-accent)] flex items-center justify-center text-xl select-none flex-shrink-0 transition-colors">
                                    {profile.avatarUrl}
                                </div>
                            ) : (
                                <img 
                                    src={profile.avatarUrl || 'https://via.placeholder.com/150'} 
                                    className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-[var(--primary-accent)] transition-colors object-cover flex-shrink-0" 
                                    alt="Profile" 
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent && !parent.querySelector('.sidebar-avatar-fallback')) {
                                            const fallbackDiv = document.createElement('div');
                                            fallbackDiv.className = "sidebar-avatar-fallback w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary-accent)]/20 to-[var(--secondary-accent-start)]/20 border-2 border-transparent group-hover:border-[var(--primary-accent)] flex items-center justify-center text-sm font-black select-none flex-shrink-0 transition-colors";
                                            fallbackDiv.innerText = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
                                            parent.appendChild(fallbackDiv);
                                        }
                                    }}
                                />
                            )}
                            {!isCollapsed && (
                                <div className="min-w-0">
                                    <span className="font-bold text-sm truncate block text-white">{profile.name}</span>
                                    <span className="text-xs text-neutral-300 font-medium truncate block">View Profile</span>
                                </div>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Nav (Nerve) */}
            <div 
                className={`fixed left-1/2 -translate-x-1/2 z-[150] w-[95%] max-w-sm rounded-full overflow-hidden transition-all duration-300 ease-in-out lg:hidden ${isHidden ? 'translate-y-32 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`} 
                style={{ 
                    height: 'var(--footer-height)',
                    bottom: 'calc(env(safe-area-inset-bottom, 0rem) + 1rem)'
                }}
            >
                <div 
                    className={`neon-glow-container w-full h-full rounded-full ${isNeonEnabled ? `active style-${neonStyle}` : ''}`} 
                    style={{ '--animation-duration': `${animationDuration}s` } as React.CSSProperties}
                >
                    <nav
                        className={`glass-nav relative flex justify-around items-center rounded-full p-2 h-full`}
                    >
                        {items.map((item) => {
                            const isActive = activeItem === item.name;
                            return (
                                <motion.button
                                    key={item.name}
                                    className={`relative flex items-center justify-center w-10 h-10 min-[360px]:w-12 min-[360px]:h-12 rounded-full transition-colors duration-300`}
                                    aria-label={item.name}
                                    title={item.name}
                                    onClick={() => onItemClick(item.name)}
                                    style={{ color: isActive ? 'black' : 'rgba(255, 255, 255, 0.5)' }}
                                    whileTap={{ scale: 0.9 }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeMobileTab"
                                            className="absolute inset-0 bg-[var(--primary-accent)] rounded-full shadow-lg shadow-[var(--primary-accent)]/30"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    {renderIcon(item.icon, "w-6 h-6 z-10 relative")}
                                </motion.button>
                            )
                        })}
                    </nav>
                </div>
            </div>
        </>
    );
};

export default Nerve;
