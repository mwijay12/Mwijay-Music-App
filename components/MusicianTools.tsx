import React, { useState, useEffect, useRef } from 'react';
import type { Song, MusicianToolsState } from '../types.ts';

interface MusicianToolsProps {
    song: Song;
    duration: number;
    tools: MusicianToolsState;
    setTools: React.Dispatch<React.SetStateAction<MusicianToolsState>>;
    onClose: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicianTools: React.FC<MusicianToolsProps> = ({ song, duration, tools, setTools, onClose, audioRef }) => {
    const metronomeAudioRef = useRef<HTMLAudioElement | null>(null);
    const metronomeIntervalRef = useRef<number | null>(null);

    // Metronome Logic
    useEffect(() => {
        if (typeof Audio !== 'undefined') {
            metronomeAudioRef.current = new Audio('https://cdn.freesound.org/previews/254/254341_4701679-lq.mp3'); // A simple click sound
            metronomeAudioRef.current.volume = 0.6;
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
                    metronomeAudioRef.current.play();
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
    
    // This effect should be in the main App component's time update handler, but for simplicity, we mock it here
    // In a real app, you would pass a callback to the main onTimeUpdate handler
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const checkLoop = () => {
            if (tools.loopA.active && tools.loopB.active && audio.currentTime >= tools.loopB.time) {
                audio.currentTime = tools.loopA.time;
            }
        };
        audio.addEventListener('timeupdate', checkLoop);
        return () => audio.removeEventListener('timeupdate', checkLoop);
    }, [tools.loopA, tools.loopB, audioRef]);


    return (
        <div className="absolute inset-x-4 bottom-24 bg-black/80 backdrop-blur-md p-4 rounded-xl z-20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Musician Tools</h3>
                <button onClick={onClose}><i className="fas fa-times"></i></button>
            </div>

            <div className="space-y-4">
                {/* Metronome */}
                <div className="bg-white/10 p-3 rounded-lg">
                    <p className="font-bold mb-2">Metronome</p>
                    <div className="flex items-center gap-4">
                        <button onClick={handleToggleMetronome} className="w-12 h-12 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center">
                            <i className={`fas ${tools.metronome.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <div className="flex-1">
                            <input type="range" min="40" max="240" value={tools.metronome.bpm} onChange={(e) => setTools(t => ({...t, metronome: {...t.metronome, bpm: parseInt(e.target.value)}}))} className="w-full"/>
                            <p className="text-center text-sm">{tools.metronome.bpm} BPM</p>
                        </div>
                    </div>
                </div>

                {/* Tempo */}
                <div className="bg-white/10 p-3 rounded-lg">
                    <p className="font-bold mb-2">Tempo Control</p>
                     <input type="range" min="0.5" max="2.0" step="0.1" value={tools.tempo} onChange={handleTempoChange} className="w-full"/>
                     <p className="text-center text-sm">{tools.tempo.toFixed(1)}x Speed</p>
                </div>
                
                {/* A-B Loop */}
                <div className="bg-white/10 p-3 rounded-lg">
                    <p className="font-bold mb-2">A-B Loop</p>
                    <div className="flex justify-around items-center gap-2">
                        <button onClick={() => handleSetLoopPoint('A')} className={`py-2 px-4 rounded-md font-bold ${tools.loopA.active ? 'bg-green-500' : 'bg-white/20'}`}>Set A</button>
                        <button onClick={() => handleSetLoopPoint('B')} className={`py-2 px-4 rounded-md font-bold ${tools.loopB.active ? 'bg-green-500' : 'bg-white/20'}`}>Set B</button>
                        <button onClick={handleClearLoop} className="py-2 px-4 rounded-md bg-red-500/80 font-bold">Clear</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicianTools;