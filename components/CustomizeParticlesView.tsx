import React from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import { backgroundStyles } from '../constants.ts';
import SettingsToggle from './SettingsToggle.tsx';

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
        <main className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm overflow-y-auto p-6 pb-40" onClick={onBack}>
            <div className="liquid-glass-pane glare-effect p-4 rounded-2xl w-full max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
                <header className="flex items-center gap-4 mb-4">
                    <button onClick={onBack} className="text-2xl" aria-label="Back"><ArrowLeft size={24} /></button>
                    <div>
                        <h1 className="text-xl font-bold">Customize Background</h1>
                        <p className="text-neutral-400 text-sm">Select an effect to see a live preview</p>
                    </div>
                </header>

                <div className="space-y-4">
                    <SettingsToggle 
                        label="Enable Background Effects"
                        isChecked={settings.enabled}
                        onToggle={() => handleUpdate('enabled', !settings.enabled)}
                    />
                     <div className="bg-white/5 p-4 rounded-lg">
                        <h3 className="font-bold mb-3">Effect Style</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                             {backgroundStyles.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => handleUpdate('style', style.id as any)}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-center transition-colors aspect-square customize-particles-button ${settings.style === style.id ? 'active' : ''}`}
                                >
                                     {(() => {
                                        const IconComponent = (LucideIcons as any)[style.icon];
                                        return IconComponent ? <IconComponent size={24} /> : null;
                                    })()}
                                    <span className="text-[10px] font-semibold">{style.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default CustomizeParticlesView;