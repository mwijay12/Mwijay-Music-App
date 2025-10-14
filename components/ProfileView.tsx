

import React, { useState, useMemo, useRef } from 'react';
import type { ProfileData } from '../types.ts';
import { fonts, achievements, nameplateAnimations } from '../constants.ts';
import SettingsToggle from './SettingsToggle.tsx';

const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-[var(--surface-color)] p-6 rounded-2xl ${className}`}>
        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{title}</h2>
        {children}
    </div>
);

const StatItem: React.FC<{ value: string, label: string, icon: string }> = ({ value, label, icon }) => (
    <div className="text-center">
        <i className={`fas ${icon} text-2xl text-[var(--primary-accent)] mb-2`}></i>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-neutral-400">{label}</p>
    </div>
);

const formatListenTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};

// --- Achievements View Component (as requested in screenshot) ---
const AchievementsView: React.FC<{ profile: ProfileData; onBack: () => void }> = ({ profile, onBack }) => {
    const [filter, setFilter] = useState<'All' | 'Unlocked' | 'Locked'>('All');

    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const filteredAchievements = useMemo(() => {
        const unlockedIds = new Set((profile.unlockedAchievements || []).map(a => a.id));
        if (filter === 'Unlocked') {
            return achievements.filter(ach => unlockedIds.has(ach.id));
        }
        if (filter === 'Locked') {
            return achievements.filter(ach => !unlockedIds.has(ach.id));
        }
        return achievements;
    }, [filter, profile.unlockedAchievements]);
    
    const unlockedMap = useMemo(() => 
        new Map((profile.unlockedAchievements || []).map(a => [a.id, a.date])), 
    [profile.unlockedAchievements]);

    return (
        <main className="h-full w-full home-gradient-bg flex flex-col p-6 pb-24">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-2xl" aria-label="Back" title="Back"><i className="fas fa-arrow-left"></i></button>
                <h1 className="text-3xl font-bold">Achievements</h1>
            </header>

            <div className="flex gap-2 mb-6 bg-[var(--surface-color)] p-1 rounded-full">
                {(['All', 'Unlocked', 'Locked'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${filter === f ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`} title={`Filter by ${f}`}>
                        {f}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto scroll-container -mx-6 px-6">
                <div className="grid grid-cols-2 gap-4">
                    {filteredAchievements.map(ach => {
                        const unlockDate = unlockedMap.get(ach.id);
                        const isUnlocked = !!unlockDate;
                        return (
                            <div key={ach.id} className={`p-4 rounded-2xl flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-[var(--surface-color)] border border-white/10 shadow-lg' : 'bg-white/5 opacity-70'}`}>
                                <div className={`text-5xl mb-3 transition-transform ${isUnlocked ? 'scale-100' : 'scale-90 opacity-50'}`}>
                                    {isUnlocked ? ach.emoji : '🔒'}
                                </div>
                                <h3 className="font-bold text-sm leading-tight">{ach.name}</h3>
                                <p className="text-xs text-neutral-400 mt-1 flex-1">{ach.description}</p>
                                {isUnlocked && (
                                    <p className="text-xs text-neutral-500 font-mono mt-3 pt-2 border-t border-white/10 w-full">{formatDate(unlockDate)}</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </main>
    );
};


interface ProfileViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onOpenAppearance: () => void;
    onBack: () => void;
    onNavigate: (view: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdateProfile, onOpenAppearance, onBack, onNavigate }) => {
    const [isAchievementsVisible, setAchievementsVisible] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const avatarUrl = event.target?.result as string;
                onUpdateProfile(p => ({ ...p, avatarUrl }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateProfile(p => ({ ...p, name: e.target.value }));
    };

    const handleNameplateFontChange = (fontName: string) => {
        onUpdateProfile(p => ({ ...p, nameplateFont: fontName }));
    };
    
    const handleNameplateAnimationChange = (animId: ProfileData['settings']['nameplateAnimation']) => {
        onUpdateProfile(p => {
            const newAnims = new Set(p.usedFeatures.nameplateAnimations).add(animId);
            return {
                ...p,
                settings: { ...p.settings, nameplateAnimation: animId },
                usedFeatures: { ...p.usedFeatures, nameplateAnimations: newAnims }
            };
        });
    };

    const specialFonts = fonts.filter(f => f.category === 'Handwriting' || f.category === 'Elegant' || f.category === 'Playful');
    const nameplateFontFamily = fonts.find(f => f.name === profile.nameplateFont)?.family || "'Satoshi', sans-serif";
    const nameplateAnimationClass = `name-anim-${profile.settings.nameplateAnimation || 'none'}`;


    if (isAchievementsVisible) {
        return <AchievementsView profile={profile} onBack={() => setAchievementsVisible(false)} />;
    }

    return (
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40 home-gradient-bg">
            <header className="flex items-center gap-4 mb-8">
                 <button onClick={onBack} className="text-2xl" aria-label="Back" title="Back"><i className="fas fa-arrow-left"></i></button>
                <div>
                     <h1 className="text-2xl font-bold">Hi, {profile.name}!</h1>
                    <p className="text-neutral-400">Manage your profile and appearance</p>
                </div>
            </header>
            
            <div className="space-y-6">
                 <SectionCard title="Your Profile">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img src={profile.avatarUrl} alt="User Avatar" className="w-20 h-20 rounded-full object-cover" />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 -right-1 w-8 h-8 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-[var(--surface-color)]"
                                aria-label="Change profile picture"
                                title="Change profile picture"
                            >
                                <i className="fas fa-pen text-sm"></i>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="userName" className="text-sm font-bold text-neutral-400">Display Name</label>
                            <input 
                                id="userName"
                                type="text" 
                                value={profile.name} 
                                onChange={handleNameChange} 
                                maxLength={30}
                                className="text-xl font-bold bg-transparent border-0 border-b-2 border-[var(--chip-bg)] focus:border-[var(--primary-accent)] focus:ring-0 w-full p-1"
                             />
                        </div>
                    </div>
                </SectionCard>
                
                <SectionCard title="Your Stats">
                    <div className="grid grid-cols-3 gap-4">
                        <StatItem value={formatListenTime(profile.analytics.listenTime + (profile.analytics.radioListenTime || 0))} label="Listen Time" icon="fa-headphones" />
                        <StatItem value={profile.analytics.songsUploaded.toString()} label="Songs in Library" icon="fa-music" />
                        <StatItem value={(profile.unlockedAchievements || []).length.toString()} label="Achievements" icon="fa-trophy" />
                    </div>
                    <button 
                        onClick={() => onNavigate('Analytics')}
                        className="w-full mt-6 bg-[var(--chip-bg)] text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-[var(--surface-color)]"
                        title="View detailed listening analytics"
                    >
                       <span>View Full Analytics</span>
                       <i className="fas fa-arrow-right"></i>
                    </button>
                </SectionCard>
                
                <SectionCard title="Achievements">
                     <p className="text-sm text-neutral-400 mb-4">See the milestones you've reached on your musical journey.</p>
                     <button 
                        onClick={() => setAchievementsVisible(true)}
                        className="w-full bg-[var(--primary-accent)]/20 border-2 border-[var(--primary-accent)] text-[var(--primary-accent)] font-bold py-4 px-6 rounded-xl flex justify-between items-center transition-transform hover:scale-105"
                        title="View all achievements"
                     >
                        <span>View Achievements ({(profile.unlockedAchievements || []).length}/{achievements.length})</span>
                        <i className="fas fa-trophy"></i>
                     </button>
                </SectionCard>

                <SectionCard title="Settings">
                     <p className="text-sm text-neutral-400 mb-4">Configure your Mwijay Music experience, from playback to visuals.</p>
                     <button
                        onClick={() => onNavigate('Settings')}
                        className="w-full bg-[var(--chip-bg)] text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-[var(--surface-color)]"
                        title="Open Settings"
                    >
                       <span>Open Settings</span>
                       <i className="fas fa-arrow-right"></i>
                    </button>
                </SectionCard>
                
                 <SectionCard title="Help & Learn">
                    <p className="text-sm text-neutral-400 mb-4">New to Mwijay Music? Learn about all the cool features available to you.</p>
                    <button 
                        onClick={() => onNavigate('Help')}
                        className="w-full bg-[var(--chip-bg)] text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-[var(--surface-color)]"
                        title="Learn about app features"
                    >
                       <span>Explore Features</span>
                       <i className="fas fa-arrow-right"></i>
                    </button>
                </SectionCard>

                <SectionCard title="Appearance">
                     <p className="text-sm text-neutral-400 mb-4">Change the entire look and feel of the app, from colors to typography.</p>
                     <button 
                        onClick={onOpenAppearance}
                        className="w-full bg-gradient-to-r from-[var(--secondary-accent-start)] to-[var(--secondary-accent-end)] text-white font-bold py-4 px-6 rounded-xl flex justify-between items-center transition-transform hover:scale-105"
                        title="Customize theme and fonts"
                     >
                        <span>Customize Theme & Fonts</span>
                        <i className="fas fa-arrow-right"></i>
                     </button>
                </SectionCard>

                 <SectionCard title="Dynamic Theming">
                     <SettingsToggle 
                        label="Dynamic Accent Colors"
                        description="Automatically change the app's accent colors to match the current song's cover art."
                        isChecked={profile.settings.dynamicThemeEnabled}
                        onToggle={() => onUpdateProfile(p => ({
                            ...p,
                            settings: { ...p.settings, dynamicThemeEnabled: !p.settings.dynamicThemeEnabled }
                        }))}
                    />
                </SectionCard>


                <SectionCard title="Customize Nameplate">
                    <p className="text-sm text-neutral-400 mb-4">Personalize your name on the Home screen.</p>
                    <div className="bg-[var(--chip-bg)] p-6 rounded-xl mb-6 flex items-center justify-center min-h-[80px]">
                        <p 
                            key={profile.settings.nameplateAnimation}
                            className={`text-4xl text-center ${nameplateAnimationClass}`} 
                            style={{ fontFamily: nameplateFontFamily }}
                        >
                            {profile.name}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-md font-bold mb-2 text-neutral-300">Animation Style</h3>
                             <div className="prompt-scroller">
                                <div className="prompt-scroller-content">
                                    {nameplateAnimations.map(anim => (
                                        <button 
                                            key={anim.id} 
                                            onClick={() => handleNameplateAnimationChange(anim.id)}
                                            className={`flex-shrink-0 py-2 px-4 rounded-full text-sm font-bold transition-colors ${profile.settings.nameplateAnimation === anim.id ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--chip-bg)] text-white'}`}
                                            title={`Set animation: ${anim.name}`}
                                        >
                                            {anim.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                         <div>
                            <h3 className="text-md font-bold mb-2 text-neutral-300">Font Style</h3>
                            <div className="prompt-scroller">
                                <div className="prompt-scroller-content">
                                    {specialFonts.map(font => (
                                        <button 
                                            key={font.name} 
                                            onClick={() => handleNameplateFontChange(font.name)}
                                            style={{ fontFamily: font.family }}
                                            className={`flex-shrink-0 py-2 px-5 text-lg rounded-full transition-colors ${profile.nameplateFont === font.name ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--chip-bg)] text-white'}`}
                                            title={`Set font: ${font.name}`}
                                        >
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
                 <SectionCard title="About Mwijay Music">
                    <div className="text-sm text-neutral-300">
                        <p className="mb-2">Mwijay Music is built by Mwijay — blending code, design, and sound.</p>
                        <p className="mb-3">📍 Based in Tanzania, loved worldwide.</p>
                        <div className="space-y-2 text-xs">
                            <a href="tel:+2556201755440" className="flex items-center gap-2 hover:text-[var(--primary-accent)]" title="Call Mwijay"><i className="fas fa-phone-alt w-4 text-center"></i> <span>+255 620 175 5440</span></a>
                            <a href="https://wa.me/25564548478" target="_blank" className="flex items-center gap-2 hover:text-[var(--primary-accent)]" title="Chat on WhatsApp"><i className="fab fa-whatsapp w-4 text-center"></i> <span>+255 645 484 78</span></a>
                            <a href="mailto:mwijaydavie@gmail.com" className="flex items-center gap-2 hover:text-[var(--primary-accent)]" title="Email Mwijay"><i className="fas fa-envelope w-4 text-center"></i> <span>mwijaydavie@gmail.com</span></a>
                            <a href="https://instagram.com/mwijay.davie" target="_blank" className="flex items-center gap-2 hover:text-[var(--primary-accent)]" title="Follow on Instagram"><i className="fab fa-instagram w-4 text-center"></i> <span>@mwijay.davie</span></a>
                        </div>
                        <p className="mt-4 text-center text-neutral-400 italic">Reach me out for comment or say hi 🙂‍↕️</p>
                    </div>
                </SectionCard>
            </div>
        </main>
    );
};

export default ProfileView;
