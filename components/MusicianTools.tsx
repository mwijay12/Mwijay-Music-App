
import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause } from 'lucide-react';
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
    
    // Binaural Beats State
    const [binauralMode, setBinauralMode] = useState<'off' | 'focus' | 'relax' | 'sleep'>('off');
    const binauralContext = useRef<AudioContext | null>(null);
    const binauralNodes = useRef<{ oscL: OscillatorNode, oscR: OscillatorNode, merger: ChannelMergerNode, gain: GainNode } | null>(null);

    // Metronome Logic
    useEffect(() => {
        if (typeof Audio !== 'undefined') {
            metronomeAudioRef.current = new Audio('https://cdn.freesound.org/previews/254/254341_4701679-lq.mp3'); 
            metronomeAudioRef.current.volume = 0.6;
        }
        return () => {
            if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
            stopBinaural();
        };
    }, []);

    useEffect(() => {
        if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
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

    const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTempo = parseFloat(e.target.value);
        setTools(t => ({...t, tempo: newTempo}));
        if(audioRef.current) {
            audioRef.current.playbackRate = newTempo;
        }
    };
    
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

    // Binaural Logic
    const startBinaural = (baseFreq: number, beatFreq: number) => {
        stopBinaural();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        binauralContext.current = ctx;
        
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);
        const gain = ctx.createGain();
        
        oscL.frequency.value = baseFreq;
        oscR.frequency.value = baseFreq + beatFreq;
        
        // Connect Left to Channel 0
        oscL.connect(merger, 0, 0);
        // Connect Right to Channel 1
        oscR.connect(merger, 0, 1);
        
        merger.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = 0.1; // Subtle background volume
        
        oscL.start();
        oscR.start();
        
        binauralNodes.current = { oscL, oscR, merger, gain };
    };

    const stopBinaural = () => {
        if (binauralNodes.current) {
            binauralNodes.current.oscL.stop();
            binauralNodes.current.oscR.stop();
            binauralNodes.current.gain.disconnect();
            binauralNodes.current = null;
        }
        if (binauralContext.current) {
            binauralContext.current.close();
            binauralContext.current = null;
        }
    };

    const handleBinauralChange = (mode: 'off' | 'focus' | 'relax' | 'sleep') => {
        setBinauralMode(mode);
        if (mode === 'off') stopBinaural();
        else if (mode === 'focus') startBinaural(400, 40); // Gamma
        else if (mode === 'relax') startBinaural(200, 10); // Alpha
        else if (mode === 'sleep') startBinaural(100, 4);  // Theta
    };

    return (
        <div className="absolute inset-x-4 bottom-24 bg-black/80 backdrop-blur-md p-4 rounded-xl z-20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Musician Tools</h3>
                <button onClick={onClose}><X size={20} /></button>
            </div>

            <div className="space-y-4">
                {/* Metronome */}
                <div className="bg-white/10 p-3 rounded-lg">
                    <p className="font-bold mb-2">Metronome</p>
                    <div className="flex items-center gap-4">
                        <button onClick={handleToggleMetronome} className="w-12 h-12 bg-[var(--primary-accent)] text-black rounded-full flex items-center justify-center">
                            {tools.metronome.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
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

                {/* Binaural Beats */}
                <div className="bg-white/10 p-3 rounded-lg">
                    <p className="font-bold mb-2">Binaural Layer (Headphones req.)</p>
                    <div className="flex justify-between gap-1">
                        {(['off', 'focus', 'relax', 'sleep'] as const).map(m => (
                            <button 
                                key={m}
                                onClick={() => handleBinauralChange(m)}
                                className={`flex-1 py-2 text-xs font-bold rounded capitalize ${binauralMode === m ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/20'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicianTools;
