import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { usePlaybackSpeed } from '../hooks/usePlaybackSpeed';

interface SpeedControlModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SpeedControlModal: React.FC<SpeedControlModalProps> = ({ isOpen, onClose }) => {
    const {
        speed,
        setSpeed,
        presets,
        isPitchPreserved,
        togglePitch,
        resetSpeed,
        currentPreset,
        isModified,
    } = usePlaybackSpeed();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-md bg-[var(--surface-color)] rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-bottom border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary-accent)]/20 flex items-center justify-center text-[var(--primary-accent)]">
                            <span className="text-lg">⏱️</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Playback Speed</h2>
                            <p className="text-xs text-neutral-400">Fine-tune your tempo</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Speed display */}
                    <div className="text-center">
                        <div className="text-5xl font-black text-white mb-1">
                            {speed.toFixed(2)}x
                        </div>
                        <div className="text-sm text-neutral-400">
                            {currentPreset ? `${currentPreset.emoji} ${currentPreset.label}` : '🎵 Custom'}
                        </div>
                    </div>

                    {/* Slider */}
                    <div className="px-2">
                        <input
                            type="range"
                            min={0.25}
                            max={3.0}
                            step={0.05}
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[var(--primary-accent)]"
                            style={{
                                background: `linear-gradient(to right, var(--primary-accent) ${((speed - 0.25) / 2.75) * 100}%, rgba(255,255,255,0.1) ${((speed - 0.25) / 2.75) * 100}%)`,
                            }}
                            aria-label="Playback speed slider"
                        />
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                            <span>0.25x</span>
                            <span>1x</span>
                            <span>3x</span>
                        </div>
                    </div>

                    {/* Preset buttons */}
                    <div>
                        <p className="text-sm text-neutral-400 mb-3 font-medium">Presets</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {presets.map((preset) => {
                                const isActive = Math.abs(preset.rate - speed) < 0.01;
                                return (
                                    <button
                                        key={preset.rate}
                                        onClick={() => setSpeed(preset.rate)}
                                        className={`
                                            flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[64px]
                                            ${isActive
                                                ? 'bg-[var(--primary-accent)] border-[var(--primary-accent)] text-black'
                                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <span className="text-lg">{preset.emoji}</span>
                                        <span className="text-xs font-bold mt-1">{preset.shortLabel}</span>
                                        <span className="text-[10px] opacity-70 whitespace-nowrap">{preset.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pitch preservation toggle */}
                    <div className="flex items-center justify-between py-4 border-t border-white/5">
                        <div>
                            <p className="text-white font-medium">Preserve Pitch</p>
                            <p className="text-xs text-neutral-400 mt-0.5">Keep voice natural when changing speed</p>
                        </div>
                        <button
                            onClick={() => togglePitch(!isPitchPreserved)}
                            className={`
                                w-12 h-6 rounded-full transition-colors relative flex-shrink-0
                                ${isPitchPreserved ? 'bg-[var(--primary-accent)]' : 'bg-white/10'}
                            `}
                            aria-label="Toggle pitch preservation"
                            role="switch"
                            aria-checked={isPitchPreserved}
                        >
                            <span className={`
                                absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                                ${isPitchPreserved ? 'translate-x-6' : 'translate-x-0.5'}
                            `} />
                        </button>
                    </div>

                    {/* Reset button */}
                    {isModified && (
                        <button
                            onClick={resetSpeed}
                            className="w-full py-3 rounded-xl border border-white/10 text-neutral-300 text-sm font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} />
                            Reset to Normal (1x)
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpeedControlModal;