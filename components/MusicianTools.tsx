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
