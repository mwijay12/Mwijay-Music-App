import React from 'react';
import type { ProfileData } from '../types.ts';
import SettingsToggle from './SettingsToggle.tsx';

interface SimpleModeSettingsViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onBack: () => void;
    onAddWisdom: () => void;
}

const SimpleModeSettingsView: React.FC<SimpleModeSettingsViewProps> = ({ profile, onUpdateProfile, onBack, onAddWisdom }) => {
    const settings = profile.settings.simpleMode;

    const handleUpdate = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                simpleMode: {
                    ...p.settings.simpleMode,
                    [key]: value
                }
            }
        }));
    };

    return (
        <main className="h-full w-full bg-[var(--bg-color)] overflow-y-auto scroll-container p-6 pb-40 text-white">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-2xl" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                <div>
                    <h1 className="text-2xl font-bold">Simple Mode Settings</h1>
                    <p className="text-neutral-400">Customize the Sound Vibe experience</p>
                </div>
            </header>

            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <SettingsToggle
                        label="Enable Simple Mode"
                        isChecked={settings.enabled}
                        onToggle={() => handleUpdate('enabled', !settings.enabled)}
                    />
                </div>

                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <h3 className="font-bold mb-3 text-center">Card Style</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleUpdate('style', 'rotate')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${settings.style === 'rotate' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                            <i className="fas fa-sync-alt"></i> Rotate
                        </button>
                        <button onClick={() => handleUpdate('style', 'static')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${settings.style === 'static' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                           <i className="fas fa-square"></i> Static
                        </button>
                    </div>
                </div>

                <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                         <h3 className="font-bold">Your Custom Wisdoms</h3>
                         <button onClick={onAddWisdom} className="bg-[var(--chip-bg)] text-sm font-bold py-2 px-3 rounded-full">Add New</button>
                    </div>
                    {profile.customWisdom && profile.customWisdom.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto scroll-container space-y-2">
                           {profile.customWisdom.map((wisdom, index) => (
                               <div key={index} className="bg-white/5 p-2 rounded text-sm italic text-neutral-300">"{wisdom}"</div>
                           ))}
                        </div>
                    ) : (
                        <p className="text-center text-sm text-neutral-400 py-4">You haven't added any custom quotes or facts yet.</p>
                    )}
                </div>
            </div>
        </main>
    );
};

export default SimpleModeSettingsView;