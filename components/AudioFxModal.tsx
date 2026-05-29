
import React from 'react';
import { X, Sliders, Volume2, Wind, Zap, RotateCcw } from 'lucide-react';
import type { ProfileData } from '../types.ts';

interface AudioFxModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: ProfileData;
    onUpdateSettings: (settings: Partial<ProfileData['settings']>) => void;
}

const AudioFxModal: React.FC<AudioFxModalProps> = ({ isOpen, onClose, profile, onUpdateSettings }) => {
    if (!isOpen) return null;

    const { equalizer, maximizer, reverb, creative } = profile.settings;

    const handleEqChange = (index: number, value: number) => {
        const newBands = [...equalizer.bands];
        newBands[index] = value;
        onUpdateSettings({
            equalizer: { ...equalizer, bands: newBands }
        });
    };

    const resetEq = () => {
        onUpdateSettings({
            equalizer: { ...equalizer, bands: [0, 0, 0, 0, 0], preamp: 1 }
        });
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-md bg-[var(--surface-color)] rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-bottom border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary-accent)]/20 flex items-center justify-center text-[var(--primary-accent)]">
                            <Sliders size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Audio FX</h2>
                            <p className="text-xs text-neutral-400">Professional sound tuning</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Equalizer Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                                <Zap size={14} /> Equalizer
                            </h3>
                            <button 
                                onClick={resetEq}
                                className="text-xs text-[var(--primary-accent)] hover:underline flex items-center gap-1"
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        </div>
                        <div className="flex justify-between items-end h-40 gap-2 mb-2">
                            {equalizer.bands.map((gain, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                                    <div className="relative w-full h-full bg-white/5 rounded-full overflow-hidden flex flex-col justify-end">
                                        <input
                                            type="range"
                                            min="-12"
                                            max="12"
                                            step="0.1"
                                            value={gain}
                                            onChange={(e) => handleEqChange(i, parseFloat(e.target.value))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            style={{ transform: 'rotate(-90deg)', width: '160px', left: '-60px', top: '60px' }}
                                        />
                                        <div 
                                            className="w-full bg-[var(--primary-accent)] transition-all duration-100 rounded-full"
                                            style={{ height: `${((gain + 12) / 24) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-neutral-500">
                                        {['60', '230', '910', '3k', '14k'][i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Bass & Volume Section */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                                <Wind size={16} className="text-blue-400" />
                                <span>Bass Boost</span>
                            </div>
                            <input 
                                type="range"
                                min="0"
                                max="12"
                                step="0.5"
                                value={maximizer.bassBoost}
                                onChange={(e) => onUpdateSettings({ maximizer: { ...maximizer, bassBoost: parseFloat(e.target.value) } })}
                                className="w-full accent-[var(--primary-accent)]"
                            />
                            <div className="flex justify-between mt-1 text-[10px] text-neutral-500 font-mono">
                                <span>0dB</span>
                                <span>{maximizer.bassBoost}dB</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                                <Volume2 size={16} className="text-green-400" />
                                <span>Preamp</span>
                            </div>
                            <input 
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.05"
                                value={maximizer.volume}
                                onChange={(e) => onUpdateSettings({ maximizer: { ...maximizer, volume: parseFloat(e.target.value) } })}
                                className="w-full accent-[var(--primary-accent)]"
                            />
                            <div className="flex justify-between mt-1 text-[10px] text-neutral-500 font-mono">
                                <span>0.5x</span>
                                <span>{maximizer.volume.toFixed(2)}x</span>
                            </div>
                        </div>
                    </section>

                    {/* Reverb Section */}
                    <section className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <RotateCcw size={16} className="text-purple-400" /> Spatial Reverb
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-neutral-400">Delay Time</span>
                                    <span className="font-mono text-[var(--primary-accent)]">{(reverb.delay * 1000).toFixed(0)}ms</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0"
                                    max="0.5"
                                    step="0.01"
                                    value={reverb.delay}
                                    onChange={(e) => onUpdateSettings({ reverb: { ...reverb, delay: parseFloat(e.target.value) } })}
                                    className="w-full accent-[var(--primary-accent)]"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs mb-2">
                                    <span className="text-neutral-400">Feedback</span>
                                    <span className="font-mono text-[var(--primary-accent)]">{(reverb.feedback * 100).toFixed(0)}%</span>
                                </div>
                                <input 
                                    type="range"
                                    min="0"
                                    max="0.9"
                                    step="0.01"
                                    value={reverb.feedback}
                                    onChange={(e) => onUpdateSettings({ reverb: { ...reverb, feedback: parseFloat(e.target.value) } })}
                                    className="w-full accent-[var(--primary-accent)]"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Creative Section */}
                    <section className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-orange-400">
                            <Zap size={16} /> Creative Filter
                        </h3>
                        <div>
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-neutral-400">Filter Tone</span>
                                <span className="font-mono text-[var(--primary-accent)]">
                                    {creative.filter > 0.05 
                                        ? `Tinny (High-pass: ${Math.round(creative.filter * 100)}%)` 
                                        : creative.filter < -0.05 
                                            ? `Muffled (Low-pass: ${Math.round(Math.abs(creative.filter) * 100)}%)` 
                                            : 'Neutral 🎵'
                                    }
                                </span>
                            </div>
                            <input 
                                type="range"
                                min="-1"
                                max="1"
                                step="0.05"
                                value={creative.filter}
                                onChange={(e) => onUpdateSettings({ creative: { ...creative, filter: parseFloat(e.target.value) } })}
                                className="w-full accent-[var(--primary-accent)]"
                            />
                        </div>
                    </section>

                    {/* Online Voice & Sound Modulations Preset Grid */}
                    <section className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-pink-400">
                            <Wind size={16} /> Online Voice Modulators (Pedalboard)
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'none', label: 'Normal 🎵', desc: 'No voice effects' },
                                { id: 'chipmunk', label: 'Chipmunk 🐿️', desc: 'High pitch voice' },
                                { id: 'deep_voice', label: 'Deep Voice 🦁', desc: 'Heavy bass pitch' },
                                { id: 'robot', label: 'Robot 🤖', desc: 'Metallic vocoder' },
                                { id: 'slowed_reverb', label: 'Slow & Reverb 🌌', desc: 'Dreamy TikTok style' },
                                { id: 'lofi', label: 'Lofi Vibes 📻', desc: 'Warm vinyl filters' },
                                { id: 'telephone', label: 'Telephone 📞', desc: 'Vintage radio voice' },
                                { id: 'underwater', label: 'Underwater 🌊', desc: 'Muffled sound sweeps' },
                            ].map(effect => {
                                // Safe settings checking
                                const currentEffect = (profile.settings as any).voiceEffect || 'none';
                                const isSelected = currentEffect === effect.id;
                                return (
                                    <button
                                        key={effect.id}
                                        onClick={() => {
                                            onUpdateSettings({ voiceEffect: effect.id } as any);
                                        }}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            isSelected 
                                                ? 'bg-[var(--primary-accent)]/20 border-[var(--primary-accent)] text-[var(--primary-accent)]' 
                                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-neutral-300'
                                        }`}
                                    >
                                        <div className="font-bold text-xs">{effect.label}</div>
                                        <div className="text-[9px] text-neutral-400 mt-0.5 truncate">{effect.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[9px] text-neutral-500 mt-3 text-center italic">
                            * Custom DSP processes are executed on your AWS EC2 VPS server.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/20 text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">
                        Real-time DSP Processing Active
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AudioFxModal;
