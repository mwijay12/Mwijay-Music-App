import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { ProfileData, Song } from '../types.ts';
import { equalizerPresets, metronomeSounds } from '../constants.ts';
import { motion } from 'framer-motion';

const Slider: React.FC<{
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ value, onChange }) => (
    <div className="relative h-40 w-10 bg-[var(--chip-bg)] rounded-full overflow-hidden">
        <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--primary-accent)] to-[var(--secondary-accent-end)]"
            style={{ height: `${((value + 12) / 24) * 100}%` }}
        ></div>
        <input
            type="range"
            min="-12" max="12" step="0.5"
            value={value}
            onChange={onChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        />
    </div>
);

const EqualizerTab: React.FC<{ 
    settings: ProfileData['settings']['equalizer'], 
    onUpdate: (bands: number[]) => void,
}> = memo(({ settings, onUpdate }) => {
    
    const handleSliderChange = (index: number, value: number) => {
        const newBands = [...settings.bands];
        newBands[index] = value;
        onUpdate(newBands);
    };
    
    return (
        <div className="flex flex-col items-center py-6">
            <div className="flex justify-center gap-3 sm:gap-6 w-full px-2">
                {settings.bands.map((gain, index) => (
                    <div key={index} className="flex flex-col-reverse items-center gap-3">
                        <span className="text-sm font-bold text-neutral-400">{['60', '250', '1k', '4k', '16k'][index]}</span>
                        <Slider
                            value={gain}
                            onChange={(e) => handleSliderChange(index, parseFloat(e.target.value))}
                        />
                        <span className="text-sm font-bold text-white bg-black/30 px-2 py-0.5 rounded-full w-14 text-center">{gain.toFixed(1)}</span>
                    </div>
                ))}
            </div>
            <div className="mt-6 w-full px-2">
                <h4 className="font-bold text-center text-sm mb-3 text-neutral-300">Presets</h4>
                <div className="flex overflow-x-auto gap-2 scroll-container pb-2 -mx-2 px-2">
                    {Object.keys(equalizerPresets).map(name => (
                        <button key={name} onClick={() => onUpdate(equalizerPresets[name])} className="flex-shrink-0 text-sm font-bold px-4 py-2 rounded-full bg-[var(--chip-bg)] transition-colors hover:bg-white/20">
                            {name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});

const MaximizerTab: React.FC<{ settings: ProfileData['settings']['maximizer'], onUpdate: (key: string, value: any) => void }> = memo(({ settings, onUpdate }) => (
    <div className="p-6 space-y-6">
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="font-bold">Bass Booster</label>
                <span className="text-sm font-mono text-[var(--primary-accent)]">+{settings.bassBoost.toFixed(1)} dB</span>
            </div>
            <input type="range" min="0" max="12" step="0.5" value={settings.bassBoost} onChange={e => onUpdate('bassBoost', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${(settings.bassBoost / 12) * 100}% 100%` }} />
        </div>
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="font-bold">Volume Amplifier</label>
                 <span className="text-sm font-mono text-[var(--primary-accent)]">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" value={settings.volume} onChange={e => onUpdate('volume', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${(settings.volume / 2) * 100}% 100%` }} />
        </div>
    </div>
));

const ReverbTab: React.FC<{ settings: ProfileData['settings']['reverb'], onUpdate: (key: string, value: any) => void }> = memo(({ settings, onUpdate }) => (
    <div className="p-6 space-y-6">
         <div>
            <div className="flex justify-between items-center mb-1">
                <label className="font-bold">Echo Time (Delay)</label>
                <span className="text-sm font-mono text-[var(--primary-accent)]">{settings.delay.toFixed(2)}s</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={settings.delay} onChange={e => onUpdate('delay', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${settings.delay * 100}% 100%` }} />
        </div>
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="font-bold">Echo Feedback</label>
                 <span className="text-sm font-mono text-[var(--primary-accent)]">{Math.round(settings.feedback * 100)}%</span>
            </div>
            <input type="range" min="0" max="0.9" step="0.05" value={settings.feedback} onChange={e => onUpdate('feedback', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${(settings.feedback / 0.9) * 100}% 100%` }} />
        </div>
    </div>
));

const CreativeTab: React.FC<{ settings: ProfileData['settings']['creative'], onUpdate: (key: string, value: any) => void }> = memo(({ settings, onUpdate }) => (
     <div className="p-6 space-y-6">
         <div>
            <div className="flex justify-between items-center mb-1">
                <label className="font-bold">Playback Speed (Tempo)</label>
                <span className="text-sm font-mono text-[var(--primary-accent)]">{settings.tempo.toFixed(1)}x</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.1" value={settings.tempo} onChange={e => onUpdate('tempo', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((settings.tempo - 0.5) / 1.5) * 100}% 100%` }} />
        </div>
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="font-bold">Creative Filter</label>
                <span className="text-sm font-mono text-[var(--primary-accent)]">{settings.filter > 0.05 ? 'High-Pass' : settings.filter < -0.05 ? 'Low-Pass' : 'Neutral'}</span>
            </div>
            <input type="range" min="-1" max="1" step="0.05" value={settings.filter} onChange={e => onUpdate('filter', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((settings.filter + 1) / 2) * 100}% 100%` }} />
             <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>Muffled / Bass</span>
                <span>Thin / Treble</span>
            </div>
        </div>
    </div>
));

const truncate = (str: string, len: number) => str.length > len ? `${str.substring(0, len)}...` : str;

const MetronomeTab: React.FC<{ 
    song: Song, 
    onUpdateSong: (song: Song) => void,
    settings: ProfileData['settings']['metronome'],
    onUpdate: (key: string, value: any) => void,
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void 
}> = memo(({ song, onUpdateSong, settings, onUpdate, showNotification }) => {
    const tapTimestamps = useRef<number[]>([]);
    
    useEffect(() => {
        if (song.bpm) {
            onUpdate('bpm', song.bpm);
        }
    }, [song.id, song.bpm, onUpdate]);

    const tapBpm = () => {
        const now = performance.now();
        tapTimestamps.current.push(now);
        if (tapTimestamps.current.length > 4) tapTimestamps.current.shift();
        if (tapTimestamps.current.length > 1) {
            const intervals = [];
            for (let i = 1; i < tapTimestamps.current.length; i++) intervals.push(tapTimestamps.current[i] - tapTimestamps.current[i - 1]);
            const average = intervals.reduce((a, b) => a + b) / intervals.length;
            const newBpm = Math.round(60000 / average);
            if (newBpm > 40 && newBpm < 240) onUpdate('bpm', newBpm);
        }
    };
    
    const handleSaveBpm = () => {
        onUpdateSong({ ...song, bpm: settings.bpm });
        showNotification(`BPM for "${truncate(song.title, 20)}" saved as ${settings.bpm}`, 'success');
    };

    return (
        <div className="p-6 space-y-4">
            <div>
                <div className="flex justify-between items-center mb-1"><label className="font-bold">Metronome</label><span className="text-sm font-mono text-[var(--primary-accent)]">{settings.bpm} BPM</span></div>
                 <div className="flex items-center gap-4">
                    <button onClick={() => onUpdate('enabled', !settings.enabled)} className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors ${settings.enabled ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10 text-white'}`}><i className={`fas ${settings.enabled ? 'fa-pause' : 'fa-play'}`}></i></button>
                    <input type="range" min="40" max="240" step="1" value={settings.bpm} onChange={e => onUpdate('bpm', parseInt(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((settings.bpm - 40) / 200) * 100}% 100%` }} />
                </div>
            </div>
            <div>
                <h4 className="font-bold text-sm mb-2">Sound</h4>
                <div className="flex overflow-x-auto gap-2 scroll-container pb-2 -mx-4 px-4">
                    {metronomeSounds.map(sound => (
                        <button key={sound.type} onClick={() => onUpdate('soundType', sound.type)} className={`flex-shrink-0 text-xs py-2 px-3 rounded-full flex items-center gap-2 ${settings.soundType === sound.type ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                           <i className={`fas ${sound.icon}`}></i> <span>{sound.name}</span>
                        </button>
                    ))}
                </div>
            </div>
             <div className="flex gap-2">
                <button onClick={tapBpm} className="flex-1 bg-white/10 p-3 rounded-lg font-bold">Tap BPM</button>
                <button onClick={handleSaveBpm} className="flex-1 bg-[var(--primary-accent)] text-black p-3 rounded-lg font-bold">Save to Song</button>
            </div>
        </div>
    );
});

interface EqualizerModalProps {
    profile: ProfileData;
    song: Song;
    onClose: () => void;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onUpdateSong: (song: Song) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const EqualizerModal: React.FC<EqualizerModalProps> = ({ profile, song, onClose, onUpdateProfile, onUpdateSong, showNotification }) => {
    const [activeTab, setActiveTab] = useState('Equalizer');

    const handleUpdate = useCallback((section: keyof ProfileData['settings'], key: string, value: any) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                [section]: {
                    // @ts-ignore
                    ...p.settings[section],
                    [key]: value
                }
            }
        }));
    }, [onUpdateProfile]);

    const tabs = [
        { name: 'Equalizer', icon: 'fa-sliders' },
        { name: 'Maximizer', icon: 'fa-expand-arrows-alt' },
        { name: 'Reverb', icon: 'fa-dungeon' },
        { name: 'Creative', icon: 'fa-pencil-alt' },
        { name: 'Metronome', icon: 'fa-stopwatch' },
    ];

    const isCompactTab = ['Maximizer', 'Reverb', 'Creative'].includes(activeTab);
    
    const renderActiveTab = () => {
        switch(activeTab) {
            case 'Equalizer':
                return <EqualizerTab settings={profile.settings.equalizer} onUpdate={(bands) => handleUpdate('equalizer', 'bands', bands)} />;
            case 'Maximizer':
                return <MaximizerTab settings={profile.settings.maximizer} onUpdate={(key, val) => handleUpdate('maximizer', key, val)} />;
            case 'Reverb':
                return <ReverbTab settings={profile.settings.reverb} onUpdate={(key, val) => handleUpdate('reverb', key, val)} />;
            case 'Creative':
                return <CreativeTab settings={profile.settings.creative} onUpdate={(key, val) => handleUpdate('creative', key, val)} />;
            case 'Metronome':
                 return <MetronomeTab song={song} onUpdateSong={onUpdateSong} settings={profile.settings.metronome} onUpdate={(key, val) => handleUpdate('metronome', key, val)} showNotification={showNotification} />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end justify-center" onClick={onClose}>
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className={`liquid-glass-pane w-full max-w-lg rounded-t-2xl shadow-2xl flex flex-col ${isCompactTab ? 'max-h-[65vh]' : 'max-h-[85vh]'}`}
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-4">
                     <div className="w-8"></div>
                    <h2 className="font-bold text-lg text-center">Audio FX</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white w-8 h-8 rounded-full bg-black/20 flex items-center justify-center" aria-label="Close modal"><i className="fas fa-times text-lg"></i></button>
                </header>

                <div className={`flex-1 overflow-y-auto scroll-container transition-all duration-300 ${!isCompactTab ? 'min-h-[300px]' : ''}`}>
                    {renderActiveTab()}
                </div>

                <footer className="flex-shrink-0 flex justify-around items-center border-t border-white/10 p-2 bg-black/20">
                    {tabs.map(tab => (
                        <button key={tab.name} onClick={() => setActiveTab(tab.name)} className={`flex flex-col items-center gap-1 p-2 rounded-lg w-20 transition-colors ${activeTab === tab.name ? ' text-[var(--primary-accent)]' : 'text-neutral-400 hover:bg-white/10'}`}>
                            <i className={`fas ${tab.icon} text-2xl`}></i>
                            <span className="text-[10px] font-bold">{tab.name}</span>
                        </button>
                    ))}
                </footer>
            </motion.div>
        </div>
    );
};

export default EqualizerModal;