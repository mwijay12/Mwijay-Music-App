import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Circle, Square } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import { visualizers } from './constants.ts';
import SettingsToggle from './SettingsToggle.tsx';

interface VisualizerModalProps {
    onClose: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
}

const VisualizerModal: React.FC<VisualizerModalProps> = ({ onClose, profile, onUpdateProfile }) => {

    const handleUpdate = <K extends keyof ProfileData['settings']['visualizerSettings']>(
        key: K,
        value: ProfileData['settings']['visualizerSettings'][K]
    ) => {
        onUpdateProfile(p => {
            const newSettings = {
                ...p.settings,
                visualizerSettings: {
                    ...p.settings.visualizerSettings,
                    [key]: value
                }
            };

            if (key === 'type') {
                 const newVisualizers = new Set(p.usedFeatures.visualizers).add(value as string);
                 return { ...p, settings: newSettings, usedFeatures: { ...p.usedFeatures, visualizers: newVisualizers }};
            }
            return { ...p, settings: newSettings };
        });
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSpeed = 20 - parseInt(e.target.value, 10); // Invert for intuitive slider (left is slow)
        handleUpdate('spinSpeed', newSpeed);
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseFloat(e.target.value);
        handleUpdate('albumArtSize', newSize);
    };
    
    const { type: currentType, spinSpeed: currentSpeed, albumArtShape: currentShape, albumArtSize, useAlbumArtColor, beatSync } = profile.settings.visualizerSettings;

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane glare-effect w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-3 max-h-[75vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center mb-4">Visualizer Style</h3>
                
                <div>
                    <div className="max-h-36 overflow-y-auto scroll-container grid grid-cols-4 gap-2 pr-2 -mr-2">
                        {visualizers.map(vis => (
                            <button
                                key={vis.id}
                                onClick={() => handleUpdate('type', vis.id)}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-center transition-colors aspect-square ${currentType === vis.id ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                 {(() => {
                                    const IconComponent = (LucideIcons as any)[vis.icon];
                                    return IconComponent ? <IconComponent size={24} /> : null;
                                })()}
                                <span className="text-[10px] font-semibold">{vis.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <SettingsToggle 
                    label="Use Album Art Color"
                    description="The visualizer will use the dominant color from the album art."
                    isChecked={useAlbumArtColor}
                    onToggle={() => handleUpdate('useAlbumArtColor', !useAlbumArtColor)}
                />

                <SettingsToggle 
                    label="Beat Sync"
                    description="Syncs visualizer to the music's beat. Requires more processing power."
                    isChecked={beatSync}
                    onToggle={() => handleUpdate('beatSync', !beatSync)}
                />

                <div className="bg-white/5 p-4 rounded-lg">
                     <h4 className="font-bold mb-3 text-center">Album Art Style</h4>
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleUpdate('albumArtShape', 'circle')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${currentShape === 'circle' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                           <Circle size={18} /> Circle
                        </button>
                         <button onClick={() => handleUpdate('albumArtShape', 'square')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${currentShape === 'square' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                           <Square size={18} /> Square
                        </button>
                    </div>
                </div>
                 <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                         <h4 className="font-bold">Album Art Size</h4>
                         <span className="text-xs text-neutral-400">{Math.round(albumArtSize * 100)}%</span>
                    </div>
                    <input type="range" min="0.5" max="1.3" step="0.05" value={albumArtSize} onChange={handleSizeChange} className="w-full mt-1 themed-slider" style={{ backgroundSize: `${((albumArtSize - 0.5) / 0.8) * 100}% 100%` }} />
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                         <h4 className="font-bold">Spin Speed</h4>
                         <span className="text-xs text-neutral-400">{(20 - currentSpeed).toFixed(1)}</span>
                    </div>
                     <div className="flex justify-between items-center text-xs text-neutral-400">
                        <span>Slow</span>
                        <span>Fast</span>
                    </div>
                    <input
                        type="range"
                        min="1" max="19" step="1"
                        value={20 - currentSpeed}
                        onChange={handleSpeedChange}
                        className="w-full mt-1 themed-slider"
                        style={{ backgroundSize: `${((20 - currentSpeed - 1) / 18) * 100}% 100%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default VisualizerModal;