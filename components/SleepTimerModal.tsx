import React, { useState } from 'react';

interface SleepTimerModalProps {
    onClose: () => void;
    onSetTimer: (mode: 'duration' | 'songs' | 'off', value: number) => void;
    activeTimer: { mode: 'off' | 'duration' | 'songs'; value: number };
}

const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ onClose, onSetTimer, activeTimer }) => {
    const [duration, setDuration] = useState(activeTimer.mode === 'duration' ? activeTimer.value : 30);
    const [songCount, setSongCount] = useState(activeTimer.mode === 'songs' ? activeTimer.value : 5);

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane glare-effect w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center">Sleep Timer</h3>

                {/* Duration Timer */}
                <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="duration-slider" className="font-bold">By Duration</label>
                        <span className="text-sm font-semibold text-[var(--primary-accent)]">{duration} minutes</span>
                    </div>
                    <input
                        id="duration-slider"
                        type="range"
                        min="15" max="90" step="5"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                        className="w-full themed-slider"
                        style={{ backgroundSize: `${((duration - 15) / 75) * 100}% 100%` }}
                    />
                    <button 
                        onClick={() => { onSetTimer('duration', duration); onClose(); }}
                        className="w-full mt-3 bg-[var(--primary-accent)] text-black font-bold py-2 rounded-md"
                    >Set Duration Timer</button>
                </div>

                {/* Song Count Timer */}
                 <div className="bg-white/5 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="song-slider" className="font-bold">By Song Count</label>
                        <span className="text-sm font-semibold text-[var(--primary-accent)]">{songCount} songs</span>
                    </div>
                    <input
                        id="song-slider"
                        type="range"
                        min="1" max="30" step="1"
                        value={songCount}
                        onChange={(e) => setSongCount(parseInt(e.target.value, 10))}
                        className="w-full themed-slider"
                         style={{ backgroundSize: `${((songCount - 1) / 29) * 100}% 100%` }}
                    />
                     <button 
                        onClick={() => { onSetTimer('songs', songCount); onClose(); }}
                        className="w-full mt-3 bg-[var(--primary-accent)] text-black font-bold py-2 rounded-md"
                    >Set Song Count Timer</button>
                </div>

                {activeTimer.mode !== 'off' && (
                     <button 
                        onClick={() => { onSetTimer('off', 0); onClose(); }}
                        className="w-full bg-red-500/20 text-red-400 p-3 rounded-lg font-semibold hover:bg-red-500/40"
                    >
                        Cancel Active Timer
                    </button>
                )}
            </div>
        </div>
    );
};

export default SleepTimerModal;