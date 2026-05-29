import React from 'react';
import type { ProfileData } from '../types.ts';
import SettingsToggle from './SettingsToggle.tsx';

interface NeonGlowModalProps {
    onClose: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
}

const NeonGlowModal: React.FC<NeonGlowModalProps> = ({ onClose, profile, onUpdateProfile }) => {

    const handleUpdate = <K extends keyof ProfileData['settings']['neonGlow']>(
        key: K,
        value: ProfileData['settings']['neonGlow'][K]
    ) => {
        onUpdateProfile(p => {
            const newSettings = { ...p.settings, neonGlow: { ...p.settings.neonGlow, [key]: value } };
            
            // Achievement tracking for 'Neon Dreamer'
            if (key === 'style') {
                const newStyles = new Set(p.usedFeatures.neonStyles).add(value as string);
                return { ...p, settings: newSettings, usedFeatures: { ...p.usedFeatures, neonStyles: newStyles }};
            }

            return { ...p, settings: newSettings };
        });
    };

    const { enabled, style, speed } = profile.settings.neonGlow;

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane glare-effect w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center">Neon Glow Customizer</h3>
                
                <SettingsToggle 
                    label="Enable Neon Glow"
                    isChecked={enabled}
                    onToggle={() => handleUpdate('enabled', !enabled)}
                />

                <div className="bg-white/5 p-4 rounded-lg">
                    <h4 className="font-bold mb-3 text-center">Animation Style</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleUpdate('style', 'wave')} className={`py-2 text-sm rounded-md font-bold ${style === 'wave' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Wave</button>
                        <button onClick={() => handleUpdate('style', 'rotate')} className={`py-2 text-sm rounded-md font-bold ${style === 'rotate' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Rotate</button>
                        <button onClick={() => handleUpdate('style', 'flame')} className={`py-2 text-sm rounded-md font-bold ${style === 'flame' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Flame</button>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                         <h4 className="font-bold">Animation Speed</h4>
                         <span className="text-xs text-neutral-400">{speed.toFixed(1)}</span>
                    </div>
                     <div className="flex justify-between items-center text-xs text-neutral-400">
                        <span>Slow</span>
                        <span>Fast</span>
                    </div>
                    <input
                        type="range"
                        min="1" max="10" step="0.5"
                        value={speed}
                        onChange={(e) => handleUpdate('speed', parseFloat(e.target.value))}
                        className="w-full mt-1 themed-slider"
                        style={{ backgroundSize: `${((speed - 1) / 9) * 100}% 100%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default NeonGlowModal;