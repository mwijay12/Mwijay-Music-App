
import { useRef, useCallback } from 'react';
import type { ProfileData, AudioFxNodes } from '../types.ts';

import * as Tone from 'tone';

// A more detailed internal type for the hook's ref
type InternalAudioFxNodes = AudioFxNodes & {
    audioElement: HTMLMediaElement | null;
    source: MediaElementAudioSourceNode | null;
    reverbWetGain: GainNode;
};

const EQ_FREQUENCIES = [60, 250, 1000, 4000, 16000];

export const useAudioFx = () => {
    const audioFxRef = useRef<InternalAudioFxNodes | null>(null);

    const initializeAudioFx = useCallback((audioElement: HTMLMediaElement) => {
        // Initialize only once, or if the element has changed (rare)
        if (audioFxRef.current && audioFxRef.current.audioElement === audioElement) return;

        const context = Tone.getContext().rawContext as AudioContext;

        // Reuse the MediaElementAudioSourceNode that audioEngine.init() already created.
        // Web Audio ONLY allows ONE MediaElementAudioSourceNode per element — shared here.
        let source = (audioElement as any)._mediaElementSource as MediaElementAudioSourceNode | undefined;
        if (!source) {
            source = context.createMediaElementSource(audioElement);
            (audioElement as any)._mediaElementSource = source;
        }

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
        lpf.frequency.value = context.sampleRate / 2;

        const hpf = context.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 0;

        const compressor = context.createDynamicsCompressor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;

        // Reverb Nodes
        const reverbWetGain = context.createGain();
        reverbWetGain.gain.value = 0;
        const delay = context.createDelay(3.0);
        const feedback = context.createGain();
        feedback.gain.value = 0;

        const output = context.createGain();
        output.gain.value = 1.0;

        // ── Signal chain ───────────────────────────────────────────────────
        // Use AudioNode.prototype.connect.call() instead of source.connect() to bypass
        // Tone.js's patched connect which rejects nodes not in its internal registry.
        // Cast to `any` to force the AudioNode overload (not AudioParam).
        const nativeConnectTo = (src: AudioNode, dst: AudioNode) =>
            (AudioNode.prototype.connect as (this: AudioNode, dest: AudioNode) => AudioNode).call(src, dst);

        // Tap for visualiser analyser (no audio impact)
        nativeConnectTo(source, analyser);

        // Main EQ → compressor → output chain
        nativeConnectTo(source, preamp);
        let lastNode: AudioNode = preamp;
        eqBands.forEach(band => {
            lastNode.connect(band);
            lastNode = band;
        });
        lastNode.connect(bassBoost);
        bassBoost.connect(volume);
        volume.connect(lpf);
        lpf.connect(hpf);
        hpf.connect(compressor);

        // Dry path → output
        compressor.connect(output);

        // Reverb wet path
        compressor.connect(reverbWetGain);
        reverbWetGain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(output);

        // Connect to speakers directly (not through audioEngine — avoids double-chain)
        nativeConnectTo(output, context.destination);

        audioFxRef.current = {
            context, source, audioElement, preamp, eqBands, bassBoost,
            volume, delay, feedback, lpf, hpf, compressor, analyser,
            output, reverbWetGain
        };
    }, []);

    const applySettings = useCallback((settings: ProfileData['settings']) => {
        if (!audioFxRef.current) return;

        const { equalizer, maximizer, reverb, creative, volumeNormalization } = settings;
        const { context, preamp, eqBands, bassBoost, volume, delay, feedback, lpf, hpf, compressor, audioElement, reverbWetGain } = audioFxRef.current;
        const now = context.currentTime;

        // Ensure context is running when settings are changed
        if (context.state === 'suspended') {
            context.resume().catch(e => console.warn("Failed to resume audio context in applySettings", e));
        }

        const preampGain = Math.pow(10, equalizer.preamp / 20);
        preamp.gain.setTargetAtTime(preampGain, now, 0.02);
        eqBands.forEach((band, index) => {
            band.gain.setTargetAtTime(equalizer.bands[index], now, 0.02);
        });
        bassBoost.gain.setTargetAtTime(maximizer.bassBoost, now, 0.02);
        volume.gain.setTargetAtTime(maximizer.volume, now, 0.02);

        if (audioElement) {
            audioElement.playbackRate = creative.tempo;
        }

        const rawFilterValue = creative.filter;
        // Always clamp to [-1, 1] — corrupt localStorage can have huge values
        const filterValue = Math.max(-1.0, Math.min(1.0, typeof rawFilterValue === 'number' && isFinite(rawFilterValue) ? rawFilterValue : 0));
        const maxFreq = Math.min(context.sampleRate / 2, 24000); // Stay within Web Audio nominal range

        if (filterValue < -0.05) {
            const freq = Math.max(100, maxFreq * Math.pow(10, filterValue * 2));
            lpf.frequency.setTargetAtTime(freq, now, 0.1);
            hpf.frequency.setTargetAtTime(0, now, 0.1);
        } else if (filterValue > 0.05) {
            const freq = 5000 * Math.pow(filterValue, 2);
            hpf.frequency.setTargetAtTime(freq, now, 0.1);
            lpf.frequency.setTargetAtTime(maxFreq, now, 0.1);
        } else {
            lpf.frequency.setTargetAtTime(maxFreq, now, 0.1);
            hpf.frequency.setTargetAtTime(0, now, 0.1);
        }

        const delayTime = Math.max(0.01, reverb.delay);
        delay.delayTime.setTargetAtTime(delayTime, now, 0.02);
        feedback.gain.setTargetAtTime(reverb.feedback, now, 0.02);
        const wetGain = reverb.delay > 0.02 ? Math.min(1.0, 0.2 + (reverb.feedback * 0.6)) : 0;
        reverbWetGain.gain.setTargetAtTime(wetGain, now, 0.02);

        if (volumeNormalization) {
            compressor.threshold.setTargetAtTime(-24, now, 0.02);
            compressor.knee.setTargetAtTime(30, now, 0.02);
            compressor.ratio.setTargetAtTime(12, now, 0.02);
            compressor.attack.setTargetAtTime(0.003, now, 0.02);
            compressor.release.setTargetAtTime(0.25, now, 0.02);
        } else {
            compressor.threshold.setTargetAtTime(0, now, 0.02);
            compressor.knee.setTargetAtTime(40, now, 0.02);
            compressor.ratio.setTargetAtTime(1, now, 0.02);
        }

    }, []);

    return { audioFx: audioFxRef.current, initializeAudioFx, applySettings };
};
