
import React from 'react';
import SettingsToggle from './SettingsToggle.tsx';
import type { ProfileData } from '../types.ts';

const SettingsSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <section className={`mb-6 ${className}`}>
        <h2 className="text-lg font-bold mb-3 text-neutral-400 border-b border-[var(--chip-bg)] pb-2">{title}</h2>
        <div className="space-y-4">{children}</div>
    </section>
);

interface SettingsViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onOpenNeonGlowModal: () => void;
    onNavigate: (view: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ profile, onUpdateProfile, onOpenNeonGlowModal, onNavigate }) => {
    
    const handleToggle = () => {
        onUpdateProfile(p => ({
            ...p,
            settings: { ...p.settings, simpleMode: { ...p.settings.simpleMode, enabled: !p.settings.simpleMode.enabled } }
        }));
    };
    
    const handleSliderChange = (key: keyof ProfileData['settings'], value: number) => {
         onUpdateProfile(p => ({
            ...p,
            settings: { ...p.settings, [key]: value }
        }));
    };

    return (
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40 text-[var(--text-primary)] home-gradient-bg">
            <header className="mb-4">
                 <h1 className="text-2xl font-bold">Settings</h1>
                 <p className="text-neutral-400">Configure your Mwijay Music experience</p>
            </header>

            <div className="max-w-2xl mx-auto">
                <SettingsSection title="General">
                    <SettingsToggle 
                        label="Enable Simple Mode" 
                        description="A simplified, large-card interface for easy access." 
                        isChecked={profile.settings.simpleMode.enabled} 
                        onToggle={handleToggle} 
                    />
                    <div className="flex items-center justify-between bg-[var(--surface-color)] p-3 rounded-lg">
                        <div>
                            <p className="font-bold">Simple Mode Settings</p>
                            <p className="text-xs text-neutral-400 mt-1">Customize the card style and wisdom topics.</p>
                        </div>
                        <button onClick={() => onNavigate('SimpleModeSettings')} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-4 rounded-full text-sm" title="Customize simple mode">
                            Customize
                        </button>
                    </div>
                </SettingsSection>

                <SettingsSection title="Audio & Playback">
                     <SettingsToggle 
                        label="Volume Normalizer" 
                        description="Balances loudness across all songs to prevent sudden volume changes." 
                        isChecked={profile.settings.volumeNormalization} 
                        onToggle={() => onUpdateProfile(p => ({...p, settings: {...p.settings, volumeNormalization: !p.settings.volumeNormalization}}))}
                    />
                     <div className="bg-[var(--surface-color)] p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                               <p className="font-bold">Crossfade Duration</p>
                               <p className="text-xs text-neutral-400 mt-1">Seamless, DJ-style transitions between songs.</p>
                            </div>
                            <span className="font-bold text-sm text-[var(--primary-accent)] w-12 text-center">{profile.settings.crossfadeDuration}s</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="12"
                            step="1"
                            value={profile.settings.crossfadeDuration}
                            onChange={(e) => handleSliderChange('crossfadeDuration', parseInt(e.target.value, 10))}
                            className="w-full mt-2 themed-slider"
                            style={{ backgroundSize: `${(profile.settings.crossfadeDuration / 12) * 100}% 100%` }}
                        />
                    </div>
                </SettingsSection>
                
                <SettingsSection title="Reels">
                    <div className="bg-[var(--surface-color)] p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                               <p className="font-bold">Auto-Scroll Loops</p>
                               <p className="text-xs text-neutral-400 mt-1">Times a reel plays before scrolling to the next.</p>
                            </div>
                            <span className="font-bold text-sm text-[var(--primary-accent)] w-12 text-center">{profile.settings.reelsAutoScrollLoops === 0 ? 'Off' : profile.settings.reelsAutoScrollLoops}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="1"
                            value={profile.settings.reelsAutoScrollLoops}
                            onChange={(e) => handleSliderChange('reelsAutoScrollLoops', parseInt(e.target.value, 10))}
                            className="w-full mt-2 themed-slider"
                            style={{ backgroundSize: `${(profile.settings.reelsAutoScrollLoops / 5) * 100}% 100%` }}
                        />
                    </div>
                </SettingsSection>

                <SettingsSection title="Mwijay Assistant">
                     <div className="flex items-center justify-between bg-[var(--surface-color)] p-3 rounded-lg">
                        <div>
                            <p className="font-bold">Mwijay Assistant Prompts</p>
                            <p className="text-xs text-neutral-400 mt-1">See a list of prompts you can ask Mwijay.</p>
                        </div>
                        <button onClick={() => onNavigate('AssistantSettings')} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-4 rounded-full text-sm" title="View all assistant prompts">
                            View Prompts
                        </button>
                    </div>
                </SettingsSection>

                <SettingsSection title="Visuals & Effects">
                    <div className="flex items-center justify-between bg-[var(--surface-color)] p-3 rounded-lg">
                        <div>
                            <p className="font-bold">Neon Glow Effect</p>
                            <p className="text-xs text-neutral-400 mt-1">Customize the animated glow on UI elements.</p>
                        </div>
                        <button onClick={onOpenNeonGlowModal} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-4 rounded-full text-sm" title="Customize neon glow effect">
                            Customize
                        </button>
                    </div>
                     <div className="flex items-center justify-between bg-[var(--surface-color)] p-3 rounded-lg">
                        <div>
                            <p className="font-bold">Background Effects</p>
                            <p className="text-xs text-neutral-400 mt-1">Adds subtle, ambient background animations.</p>
                        </div>
                        <button onClick={() => onNavigate('CustomizeParticles')} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-4 rounded-full text-sm" title="Customize background effects">
                            Customize
                        </button>
                    </div>
                </SettingsSection>
            </div>
        </main>
    );
};

export default SettingsView;