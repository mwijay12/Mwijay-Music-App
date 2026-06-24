
import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import type { ProfileData, Song } from '../types.ts';
import { equalizerPresets, metronomeSounds } from './constants.ts';
import { motion, AnimatePresence } from 'framer-motion';
import SettingsToggle from './SettingsToggle.tsx';
import { MousePointer2, X, Bell, Drum, Activity } from 'lucide-react';

interface EqualizerModalProps {
    profile: ProfileData;
    song: Song;
    onClose: () => void;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onUpdateSong: (song: Song) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

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
    onSetPreset: (bands: number[]) => void,
    showNotification: (msg: string, type?: any) => void
}> = memo(({ settings, onUpdate, onSetPreset, showNotification }) => {
    
    const handleSliderChange = (index: number, value: number) => {
        const newBands = [...settings.bands];
        newBands[index] = value;
        onUpdate(newBands);
    };

    const copyPreset = () => {
        navigator.clipboard.writeText(JSON.stringify(settings.bands));
        showNotification("EQ Preset copied to clipboard!", 'success');
    };

    const pastePreset = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const bands = JSON.parse(text);
            if (Array.isArray(bands) && bands.length === 5) {
                onUpdate(bands);
                showNotification("EQ Preset applied!", 'success');
            } else {
                throw new Error();
            }
        } catch(e) {
            showNotification("Invalid preset code.", 'error');
        }
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
            <div className="flex gap-4 mt-4 w-full px-6">
                <button onClick={copyPreset} className="flex-1 bg-white/10 text-xs py-2 rounded font-bold">Copy Code</button>
                <button onClick={pastePreset} className="flex-1 bg-white/10 text-xs py-2 rounded font-bold">Paste Code</button>
            </div>
            <div className="mt-6 w-full px-2">
                <h4 className="font-bold text-center text-sm mb-3 text-neutral-300">Presets</h4>
                <div className="flex overflow-x-auto gap-2 scroll-container pb-2 -mx-2 px-2">
                    {Object.entries(equalizerPresets).map(([name, bands]) => (
                        <button key={name} onClick={() => onSetPreset(bands)} className="flex-shrink-0 text-sm font-bold px-4 py-2 rounded-full bg-[var(--chip-bg)] transition-colors hover:bg-white/20">
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

const VoiceTab: React.FC<{ 
    currentEffect: string, 
    onUpdate: (effectId: string) => void 
}> = memo(({ currentEffect, onUpdate }) => {
    const effects = [
        { id: 'none', label: 'Normal 🎵', desc: 'No voice effects' },
        { id: 'chipmunk', label: 'Chipmunk 🐿️', desc: 'High pitch voice' },
        { id: 'deep_voice', label: 'Deep Voice 🦁', desc: 'Heavy bass pitch' },
        { id: 'robot', label: 'Robot 🤖', desc: 'Metallic vocoder' },
        { id: 'slowed_reverb', label: 'Slow & Reverb 🌌', desc: 'Dreamy TikTok style' },
        { id: 'lofi', label: 'Lofi Vibes 📻', desc: 'Warm vinyl filters' },
        { id: 'telephone', label: 'Telephone 📞', desc: 'Vintage radio voice' },
        { id: 'underwater', label: 'Underwater 🌊', desc: 'Muffled sound sweeps' },
    ];

    return (
        <div className="p-6 space-y-4">
            <h4 className="font-bold text-center text-sm mb-2 text-neutral-300">Online Voice Modulators (Pedalboard)</h4>
            <div className="grid grid-cols-2 gap-3">
                {effects.map(effect => {
                    const isSelected = currentEffect === effect.id;
                    return (
                        <button
                            key={effect.id}
                            onClick={() => onUpdate(effect.id)}
                            className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
                                isSelected 
                                    ? 'bg-[var(--primary-accent)]/20 border-[var(--primary-accent)] text-[var(--primary-accent)] font-black' 
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                            }`}
                        >
                            <div className="font-bold text-xs">{effect.label}</div>
                            <div className="text-[9px] text-neutral-400 mt-0.5 truncate">{effect.desc}</div>
                        </button>
                    );
                })}
            </div>
            <p className="text-[9px] text-neutral-500 mt-2 text-center italic">
                * Custom DSP processes are executed on your AWS EC2 VPS server.
            </p>
        </div>
    );
});

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
        if (tapTimestamps.current.length > 4) {
            tapTimestamps.current.shift();
        }
        if (tapTimestamps.current.length >= 2) {
            const intervals = [];
            for (let i = 1; i < tapTimestamps.current.length; i++) {
                intervals.push(tapTimestamps.current[i] - tapTimestamps.current[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const bpm = Math.round(60000 / avgInterval);
            if (bpm > 40 && bpm < 300) {
                onUpdate('bpm', bpm);
            }
        }
    };
    
    const handleSaveBpmToSong = () => {
        onUpdateSong({ ...song, bpm: settings.bpm });
        showNotification(`BPM (${settings.bpm}) saved to "${truncate(song.title, 20)}"`, 'success');
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-center gap-4">
                 <button onClick={tapBpm} className="w-24 h-24 bg-white/10 rounded-full flex flex-col items-center justify-center font-bold text-center tap-bpm-button">
                    <MousePointer2 className="text-3xl mb-1" />
                    <span className="text-xs">Tap BPM</span>
                </button>
                <div className="text-center">
                    <p className="text-5xl font-mono font-bold">{settings.bpm}</p>
                    <p className="text-sm text-neutral-400">Beats Per Minute</p>
                </div>
            </div>
            <input type="range" min="40" max="300" step="1" value={settings.bpm} onChange={e => onUpdate('bpm', parseInt(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((settings.bpm - 40) / 260) * 100}% 100%` }} />
            <button onClick={handleSaveBpmToSong} className="w-full bg-white/20 font-bold py-3 rounded-full text-sm">Save BPM to Song</button>
             <div className="pt-4 border-t border-white/10">
                 <SettingsToggle isChecked={settings.enabled} onToggle={() => onUpdate('enabled', !settings.enabled)} label="Enable Metronome" description="Plays a click track over the music." />
                <div className="mt-4">
                    <h4 className="font-bold text-center text-sm mb-3 text-neutral-300">Metronome Sound</h4>
                     <div className="flex overflow-x-auto gap-2 scroll-container pb-2 -mx-2 px-2">
                         {metronomeSounds.map(sound => {
                            const Icon = sound.type === 'click' ? Bell : sound.type === 'drum' ? Drum : Activity;
                            return (
                                <button key={sound.type} onClick={() => onUpdate('soundType', sound.type)} className={`flex-shrink-0 text-sm font-bold px-4 py-3 rounded-full capitalize flex items-center ${settings.soundType === sound.type ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--chip-bg)]'}`}>
                                    <Icon size={16} className="mr-2" /> {sound.name}
                                </button>
                            );
                         })}
                    </div>
                </div>
            </div>
        </div>
    );
});

const EqualizerModal: React.FC<EqualizerModalProps> = ({ profile, song, onClose, onUpdateProfile, onUpdateSong, showNotification }) => {
    const [activeTab, setActiveTab] = useState<'eq' | 'maximizer' | 'reverb' | 'creative' | 'voice' | 'metronome'>('eq');
    
    const handleVoiceUpdate = useCallback((effectId: string) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                voiceEffect: effectId
            }
        }));
    }, [onUpdateProfile]);

    const handleUpdate = useCallback((section: keyof ProfileData['settings'], key: string, value: any) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                [section]: {
                    ...(p.settings as any)[section],
                    [key]: value,
                }
            }
        }));
    }, [onUpdateProfile]);
    
    const handleEqUpdate = useCallback((bands: number[]) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                equalizer: { ...p.settings.equalizer, bands }
            }
        }));
    }, [onUpdateProfile]);

    const handleSetPreset = useCallback((bands: number[]) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                equalizer: { ...p.settings.equalizer, bands }
            },
            usedFeatures: {
                ...p.usedFeatures,
                eqPresets: new Set(p.usedFeatures.eqPresets).add(JSON.stringify(bands))
            }
        }));
    }, [onUpdateProfile]);

    const handleCreativeUpdate = useCallback((key: string, value: any) => {
        if (key === 'tempo') {
            onUpdateProfile(p => ({
                ...p,
                settings: { ...p.settings, creative: { ...p.settings.creative, tempo: value } },
                usedFeatures: { ...p.usedFeatures, temposChanged: new Set(p.usedFeatures.temposChanged).add(song.id) }
            }));
        } else {
            handleUpdate('creative', key, value);
        }
    }, [onUpdateProfile, handleUpdate, song.id]);

    return (
         <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane glare-effect w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-white/10">
                    <div>
                        <h3 className="font-bold text-lg">Audio FX</h3>
                        <p className="text-xs text-neutral-400 truncate max-w-xs">{song.title}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-primary)] hover:opacity-70 transition-opacity">
                        <X size={24} />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'eq' && <EqualizerTab settings={profile.settings.equalizer} onUpdate={handleEqUpdate} onSetPreset={handleSetPreset} showNotification={showNotification} />}
                            {activeTab === 'maximizer' && <MaximizerTab settings={profile.settings.maximizer} onUpdate={(k, v) => handleUpdate('maximizer', k, v)} />}
                            {activeTab === 'reverb' && <ReverbTab settings={profile.settings.reverb} onUpdate={(k, v) => handleUpdate('reverb', k, v)} />}
                            {activeTab === 'creative' && <CreativeTab settings={profile.settings.creative} onUpdate={handleCreativeUpdate} />}
                            {activeTab === 'voice' && <VoiceTab currentEffect={(profile.settings as any).voiceEffect || 'none'} onUpdate={handleVoiceUpdate} />}
                            {activeTab === 'metronome' && <MetronomeTab song={song} onUpdateSong={onUpdateSong} settings={profile.settings.metronome} onUpdate={(k, v) => handleUpdate('metronome', k, v)} showNotification={showNotification}/>}
                        </motion.div>
                    </AnimatePresence>
                </div>
                
                <nav className="flex-shrink-0 flex justify-around p-2 bg-black/20 overflow-x-auto no-scrollbar scroll-container">
                    {(['eq', 'maximizer', 'reverb', 'creative', 'voice', 'metronome'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize px-3 py-2 text-xs rounded-md font-bold transition-all flex-shrink-0 ${activeTab === tab ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-400 hover:text-white'}`}>
                            {tab === 'eq' ? 'EQ' : tab}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default EqualizerModal;
