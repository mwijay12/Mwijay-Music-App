import React from 'react';
import type { ProfileData } from '../types.ts';
import { visualizers } from '../constants.ts';
import SettingsToggle from './SettingsToggle.tsx';

interface VisualizerModalProps {
    onClose: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
}

const VisualizerModal: React.FC<VisualizerModalProps> = ({ onClose, profile, onUpdateProfile }) => {

    const handleSelectVisualizer = (type: string) => {
        onUpdateProfile(p => {
            const newVisualizers = new Set(p.usedFeatures.visualizers).add(type);
            return {
                ...p, 
                settings: { ...p.settings, visualizerSettings: { ...p.settings.visualizerSettings, type } },
                usedFeatures: { ...p.usedFeatures, visualizers: newVisualizers }
            }
        });
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSpeed = 20 - parseInt(e.target.value, 10); // Invert for intuitive slider (left is slow)
        onUpdateProfile(p => ({ ...p, settings: { ...p.settings, visualizerSettings: { ...p.settings.visualizerSettings, spinSpeed: newSpeed } } }));
    };

    const handleShapeChange = (shape: 'square' | 'circle') => {
        onUpdateProfile(p => ({ ...p, settings: { ...p.settings, visualizerSettings: { ...p.settings.visualizerSettings, albumArtShape: shape } } }));
    };
    
    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSize = parseFloat(e.target.value);
        onUpdateProfile(p => ({ ...p, settings: { ...p.settings, visualizerSettings: { ...p.settings.visualizerSettings, albumArtSize: newSize } } }));
    };
    
    const handleUpdate = <K extends keyof ProfileData['settings']['visualizerSettings']>(
        key: K,
        value: ProfileData['settings']['visualizerSettings'][K]
    ) => {
        onUpdateProfile(p => ({
            ...p,
            settings: { ...p.settings, visualizerSettings: { ...p.settings.visualizerSettings, [key]: value } }
        }));
    };

    const { type: currentType, spinSpeed: currentSpeed, albumArtShape: currentShape, albumArtSize, useAlbumArtColor } = profile.settings.visualizerSettings;

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={onClose}>
            <div 
                className="liquid-glass-pane w-full max-w-md rounded-t-2xl p-6 shadow-2xl space-y-3 max-h-[75vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div>
                    <h3 className="font-bold text-lg text-center mb-4">Visualizer Style</h3>
                    <div className="max-h-36 overflow-y-auto scroll-container grid grid-cols-4 gap-2 pr-2 -mr-2">
                        {visualizers.map(vis => (
                            <button
                                key={vis.id}
                                onClick={() => handleSelectVisualizer(vis.id)}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg text-center transition-colors aspect-square ${currentType === vis.id ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10 hover:bg-white/20'}`}
                            >
                                <i className={`fas ${vis.icon} text-xl`}></i>
                                <span className="text-[10px] font-semibold leading-tight">{vis.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                 <SettingsToggle 
                    label="Use Album Art Color"
                    description="Visualizer colors will match the current song's cover."
                    isChecked={useAlbumArtColor}
                    onToggle={() => handleUpdate('useAlbumArtColor', !useAlbumArtColor)}
                />

                <div>
                    <h3 className="font-bold text-lg text-center mb-2">Album Art Style</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleShapeChange('square')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${currentShape === 'square' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                            <i className="far fa-square"></i> Square
                        </button>
                        <button onClick={() => handleShapeChange('circle')} className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${currentShape === 'circle' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                           <i className="far fa-circle"></i> Circle
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <h3 className="font-bold text-center mb-2">Rotation Speed</h3>
                        <div className="bg-white/10 p-3 rounded-lg">
                            <div className="flex justify-between items-center text-xs text-neutral-400">
                               <span>Slow</span>
                               <span>Fast</span>
                            </div>
                            <input
                                type="range"
                                min="4"
                                max="18"
                                value={20 - currentSpeed}
                                onChange={handleSpeedChange}
                                className="w-full mt-1 themed-slider"
                                style={{ backgroundSize: `${((20 - currentSpeed - 4) / 14) * 100}% 100%` }}
                            />
                        </div>
                    </div>
                     <div>
                        <h3 className="font-bold text-center mb-2">Album Art Size</h3>
                        <div className="bg-white/10 p-3 rounded-lg">
                             <div className="flex justify-between items-center text-xs text-neutral-400">
                               <span>Small</span>
                               <span>Large</span>
                            </div>
                            <input
                                type="range"
                                min="0.7" max="1.3" step="0.05"
                                value={albumArtSize || 1}
                                onChange={handleSizeChange}
                                className="w-full mt-1 themed-slider"
                                style={{ backgroundSize: `${(((albumArtSize || 1) - 0.7) / 0.6) * 100}% 100%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisualizerModal;