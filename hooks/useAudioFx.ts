

import { useRef, useCallback, useState } from 'react';
import type { ProfileData } from '../types.ts';

type AudioFxNodes = {
    context: AudioContext;
    sources: Map<HTMLMediaElement, MediaElementAudioSourceNode>;
    preamp: GainNode;
    eqBands: BiquadFilterNode[];
    bassBoost: BiquadFilterNode;
    volume: GainNode;
    delay: DelayNode;
    feedback: GainNode;
    lpf: BiquadFilterNode;
    hpf: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    analyser: AnalyserNode;
    output: GainNode;
};

const EQ_FREQUENCIES = [60, 250, 1000, 4000, 16000];

export const useAudioFx = () => {
    const audioFxRef = useRef<AudioFxNodes | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const initializeAudioFx = useCallback((audioElement: HTMLMediaElement) => {
        if (!audioElement || (audioFxRef.current && audioFxRef.current.sources.has(audioElement))) {
            return;
        }

        if (!audioFxRef.current) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            const preamp = context.createGain();
            const eqBands = EQ_FREQUENCIES.map(frequency => {
                const filter = context.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = frequency;
                filter.Q.value = 1.0;
                filter.gain.value = 0;
                return filter;
            });
            const bassBoost = context.createBiquadFilter();
            bassBoost.type = 'lowshelf';
            bassBoost.frequency.value = 200;
            const volume = context.createGain();
            
            const lpf = context.createBiquadFilter();
            lpf.type = 'lowpass';
            const hpf = context.createBiquadFilter();
            hpf.type = 'highpass';

            const compressor = context.createDynamicsCompressor();
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;

            const delay = context.createDelay(1.0);
            const feedback = context.createGain();
            feedback.gain.value = 0;
            
            const output = context.createGain();

            // --- REBUILT AUDIO GRAPH (Serial Chain for stability) ---
            
            // 1. Connect preamp to analyser in parallel (safe for visuals, no audio output)
            preamp.connect(analyser);

            // 2. Build the main serial effects chain
            preamp.connect(eqBands[0]);
            for (let i = 0; i < eqBands.length - 1; i++) {
                eqBands[i].connect(eqBands[i + 1]);
            }
            const lastEq = eqBands[eqBands.length - 1];
            
            lastEq.connect(bassBoost);
            bassBoost.connect(volume);
            volume.connect(lpf);
            lpf.connect(hpf);
            hpf.connect(compressor);
            compressor.connect(delay); // Reverb/Delay is now in the main chain
            delay.connect(output);
            output.connect(context.destination);

            // 3. Create the feedback loop for the delay/reverb effect
            delay.connect(feedback);
            feedback.connect(delay);

            audioFxRef.current = {
                context, sources: new Map(), preamp, eqBands, bassBoost,
                volume, delay, feedback, lpf, hpf, compressor, analyser,
                output,
            };
             setIsInitialized(true);
        }
        
        const source = audioFxRef.current.context.createMediaElementSource(audioElement);
        source.connect(audioFxRef.current.preamp);
        audioFxRef.current.sources.set(audioElement, source);

    }, []);

    const applySettings = useCallback((settings: ProfileData['settings']) => {
        if (!audioFxRef.current) return;
        
        const { equalizer, maximizer, reverb, creative, volumeNormalization } = settings;
        const { context, preamp, eqBands, bassBoost, volume, delay, feedback, sources, lpf, hpf, compressor } = audioFxRef.current;
        const now = context.currentTime;

        preamp.gain.setTargetAtTime(equalizer.preamp, now, 0.01);
        eqBands.forEach((band, index) => {
            band.gain.setTargetAtTime(equalizer.bands[index], now, 0.01);
        });
        bassBoost.gain.setTargetAtTime(maximizer.bassBoost, now, 0.01);
        volume.gain.setTargetAtTime(maximizer.volume, now, 0.01);

        sources.forEach((source) => {
            source.mediaElement.playbackRate = creative.tempo;
        });

        const filterValue = creative.filter;
        const maxFreq = context.sampleRate / 2;
        if (filterValue < 0) { // Low-pass
            const freq = Math.pow(10, (1 + filterValue) * 3 + 1.3);
            lpf.frequency.setTargetAtTime(freq, now, 0.015);
            hpf.frequency.setTargetAtTime(10, now, 0.015);
        } else if (filterValue > 0) { // High-pass
            const freq = Math.pow(10, filterValue * 3 + 1);
            hpf.frequency.setTargetAtTime(freq, now, 0.015);
            lpf.frequency.setTargetAtTime(maxFreq, now, 0.015);
        } else { // Neutral
            lpf.frequency.setTargetAtTime(maxFreq, now, 0.015);
            hpf.frequency.setTargetAtTime(10, now, 0.015);
        }

        delay.delayTime.setTargetAtTime(reverb.delay, now, 0.01);
        feedback.gain.setTargetAtTime(reverb.feedback, now, 0.01);
        
        if (volumeNormalization) {
            compressor.threshold.setTargetAtTime(-50, now, 0.01);
            compressor.knee.setTargetAtTime(40, now, 0.01);
            compressor.ratio.setTargetAtTime(12, now, 0.01);
            compressor.attack.setTargetAtTime(0, now, 0.01);
            compressor.release.setTargetAtTime(0.25, now, 0.01);
        } else {
            compressor.threshold.setTargetAtTime(0, now, 0.01);
            compressor.knee.setTargetAtTime(0, now, 0.01);
            compressor.ratio.setTargetAtTime(1, now, 0.01);
        }

    }, []);

    return { audioFx: audioFxRef.current, initializeAudioFx, applySettings };
};