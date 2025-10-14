import React, { useEffect, useRef } from 'react';
import type { MusicianToolsState } from '../types.ts';

interface MusicianToolsProps {
    tools: MusicianToolsState;
    setTools: React.Dispatch<React.SetStateAction<MusicianToolsState>>;
    onClose: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicianTools: React.FC<MusicianToolsProps> = ({ tools, setTools, onClose, audioRef }) => {
    const metronomeAudioRef = useRef<HTMLAudioElement | null>(null);
    const metronomeIntervalRef = useRef<number | null>(null);

    // Metronome Logic
    useEffect(() => {
        if (typeof Audio !== 'undefined') {
            metronomeAudioRef.current = new Audio('https://cdn.freesound.org/previews/254/254341_4701679-lq.mp3'); // A simple click sound
            if (metronomeAudioRef.current) {
                metronomeAudioRef.current.volume = 0.6;
            }
        }

        return () => {
            if (metronomeIntervalRef.current) {
                clearInterval(metronomeIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (metronomeIntervalRef.current) {
            clearInterval(metronomeIntervalRef.current);
        }
        if (tools.metronome.isPlaying) {
            const interval = (60 / tools.metronome.bpm) * 1000;
            metronomeIntervalRef.current = window.setInterval(() => {
                if (metronomeAudioRef.current) {
                    metronomeAudioRef.current.currentTime = 0;
                    metronomeAudioRef.current.play().catch(e => console.error("Metronome play error:", e));
                }
            }, interval);
        }
    }, [tools.metronome.isPlaying, tools.metronome.bpm]);

    const handleToggleMetronome = () => {
        setTools(t => ({ ...t, metronome: { ...t.metronome, isPlaying: !t.metronome.isPlaying } }));
    };

    // Tempo Logic
    const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTempo = parseFloat(e.target.value);
        setTools(t => ({...t, tempo: newTempo}));
        if(audioRef.current) {
            audioRef.current.playbackRate = newTempo;
        }
    };
    
    // A-B Loop Logic
    const handleSetLoopPoint = (point: 'A' | 'B') => {
        const currentTime = audioRef.current?.currentTime || 0;
        if(point === 'A') {
            setTools(t => ({ ...t, loopA: { time: currentTime, active: true }}));
        } else {
             setTools(t => ({ ...t, loopB: { time: currentTime, active: true }}));
        }
    };
    
    const handleClearLoop = () => {
        setTools(t => ({...t, loopA: { time: 0, active: false }, loopB: { time: 0, active: false }}));
    };
    
    // A-B Loop implementation
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const checkLoop = () => {
            if (tools.loopA.active && tools.loopB.active && tools.loopB.time > tools.loopA.time) {
                if (audio.currentTime > tools.loopB.time || audio.currentTime < tools.loopA.time) {
                    audio.currentTime = tools.loopA.time;
                }
            }
        };
        audio.addEventListener('timeupdate', checkLoop);
        return () => {
            audio.removeEventListener('timeupdate', checkLoop);
        };
    }, [audioRef, tools.loopA, tools.loopB]);

    return (
        <div className="absolute inset-x-4 bottom-24 bg-black/80 backdrop-blur-md p-4 rounded-xl z-20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Musician Tools</h3>
                <button onClick={onClose}><i className="fas fa-times"></i></button>
            </div>
    
            <div className="space-y-4">
                {/* Tempo */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-sm">Tempo</label>
                        <span className="text-xs font-mono text-[var(--primary-accent)]">{tools.tempo.toFixed(2)}x</span>
                    </div>
                    <input type="range" min="0.5" max="2" step="0.05" value={tools.tempo} onChange={handleTempoChange} className="w-full themed-slider" style={{ backgroundSize: `${((tools.tempo - 0.5) / 1.5) * 100}% 100%` }} />
                </div>
    
                {/* A-B Loop */}
                <div>
                    <label className="font-bold text-sm mb-2 block">A-B Loop</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleSetLoopPoint('A')} className={`py-2 text-xs rounded-md font-bold ${tools.loopA.active ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Set A</button>
                        <button onClick={() => handleSetLoopPoint('B')} className={`py-2 text-xs rounded-md font-bold ${tools.loopB.active ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Set B</button>
                        <button onClick={handleClearLoop} className="py-2 text-xs rounded-md font-bold bg-white/10">Clear</button>
                    </div>
                </div>
                
                {/* Metronome */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-sm">Metronome</label>
                        <span className="text-xs font-mono text-[var(--primary-accent)]">{tools.metronome.bpm} BPM</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={handleToggleMetronome} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${tools.metronome.isPlaying ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10 text-white'}`}><i className={`fas ${tools.metronome.isPlaying ? 'fa-pause' : 'fa-play'}`}></i></button>
                        <input type="range" min="40" max="240" step="1" value={tools.metronome.bpm} onChange={e => setTools(t => ({ ...t, metronome: { ...t.metronome, bpm: parseInt(e.target.value) }}))} className="w-full themed-slider" style={{ backgroundSize: `${((tools.metronome.bpm - 40) / 200) * 100}% 100%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicianTools;
