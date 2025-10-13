import React from 'react';
import type { ProfileData } from '../types.ts';
import SettingsToggle from './SettingsToggle.tsx';

const backgroundStyles = [
    { id: 'none', name: 'None', icon: 'fa-ban' },
    { id: 'constellationDrift', name: 'Constellation', icon: 'fa-star' },
    { id: 'spiritRise', name: 'Spirit Rise', icon: 'fa-feather-alt' },
    { id: 'warpPulse', name: 'Warp Pulse', icon: 'fa-bullseye' },
    { id: 'fallingNotes', name: 'Falling Notes', icon: 'fa-music' },
    { id: 'cosmicDust', name: 'Cosmic Dust', icon: 'fa-atom' },
    { id: 'fireflies', name: 'Fireflies', icon: 'fa-bug' },
    { id: 'bubbles', name: 'Bubbles', icon: 'fa-circle-notch' },
    { id: 'hexPulse', name: 'Hex Pulse', icon: 'fa-hexagon' },
    { id: 'stardust', name: 'Stardust', icon: 'fa-sparkles' },
    { id: 'energyFlow', name: 'Energy Flow', icon: 'fa-wind' },
    { id: 'polygons', name: 'Polygons', icon: 'fa-shapes' },
] as const;

interface CustomizeParticlesViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onBack: () => void;
}

const CustomizeParticlesView: React.FC<CustomizeParticlesViewProps> = ({ profile, onUpdateProfile, onBack }) => {
    const settings = profile.settings.backgroundEffects;

    const handleUpdate = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
        onUpdateProfile(p => {
            const newSettings = {
                ...p.settings,
                backgroundEffects: {
                    ...p.settings.backgroundEffects,
                    [key]: value
                }
            };
            if (key === 'style') {
                 const newUsedFeatures = new Set(p.usedFeatures.backgroundEffects).add(value as string);
                 return { ...p, settings: newSettings, usedFeatures: { ...p.usedFeatures, backgroundEffects: newUsedFeatures }};
            }
            return { ...p, settings: newSettings };
        });
    };

    return (
        <main className="h-full w-full bg-[var(--bg-color)] overflow-y-auto scroll-container p-6 pb-40 text-white">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-2xl" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                <div>
                    <h1 className="text-2xl font-bold">Background Effects</h1>
                    <p className="text-neutral-400">Add some ambient visuals to the app.</p>
                </div>
            </header>

            <div className="space-y-4 max-w-2xl mx-auto">
                 <SettingsToggle
                    label="Enable Background Effects"
                    isChecked={settings.enabled}
                    onToggle={() => handleUpdate('enabled', !settings.enabled)}
                />

                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                     <h3 className="font-bold text-center mb-4">Effect Style</h3>
                     <div className="grid grid-cols-3 gap-2">
                        {backgroundStyles.map(style => (
                            <button
                                key={style.id}
                                onClick={() => handleUpdate('style', style.id)}
                                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg text-center transition-colors aspect-square ${settings.style === style.id ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                <i className={`fas ${style.icon} text-xl`}></i>
                                <span className="text-xs font-semibold">{style.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
};

export default CustomizeParticlesView;