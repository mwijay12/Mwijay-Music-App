import React, { useState, useEffect, useRef } from 'react';

interface CreativeEffectsProps {
    onClose: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const CreativeEffects: React.FC<CreativeEffectsProps> = ({ onClose, audioRef }) => {
    const [filterValue, setFilterValue] = useState(0); // -1 for LPF, 0 for neutral, 1 for HPF
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const lpfRef = useRef<BiquadFilterNode | null>(null);
    const hpfRef = useRef<BiquadFilterNode | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (!audioContextRef.current) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = context;
            
            // Ensure we don't create multiple sources for the same element
            if (!sourceRef.current || sourceRef.current.mediaElement !== audio) {
                sourceRef.current = context.createMediaElementSource(audio);
            }

            const lpf = context.createBiquadFilter();
            lpf.type = 'lowpass';
            lpfRef.current = lpf;

            const hpf = context.createBiquadFilter();
            hpf.type = 'highpass';
            hpfRef.current = hpf;

            sourceRef.current.connect(lpf).connect(hpf).connect(context.destination);
        }
        
        return () => {
            // We don't close the context, as it might be used by other features.
            // Disconnecting nodes can be tricky if the audio element is persistent.
        }
    }, [audioRef]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setFilterValue(value);
        
        const context = audioContextRef.current;
        const lpf = lpfRef.current;
        const hpf = hpfRef.current;
        if (!context || !lpf || !hpf) return;

        // The human ear's frequency perception is logarithmic
        const maxFreq = context.sampleRate / 2;
        
        if (value < 0) { // Applying LPF
            // Slide from max freq down to a low value
            const lpfFreq = Math.pow(10, (1 + value) * 3 + 1); // maps [-1, 0] to [10, 20000] logarithmically
            lpf.frequency.setTargetAtTime(lpfFreq, context.currentTime, 0.01);
            hpf.frequency.setTargetAtTime(10, context.currentTime, 0.01); // Reset HPF
        } else if (value > 0) { // Applying HPF
            // Slide from low freq up to a high value
            const hpfFreq = Math.pow(10, value * 3 + 1); // maps [0, 1] to [10, 10000] logarithmically
            hpf.frequency.setTargetAtTime(hpfFreq, context.currentTime, 0.01);
            lpf.frequency.setTargetAtTime(maxFreq, context.currentTime, 0.01); // Reset LPF
        } else { // Neutral
            lpf.frequency.setTargetAtTime(maxFreq, context.currentTime, 0.01);
            hpf.frequency.setTargetAtTime(10, context.currentTime, 0.01);
        }
    };


    return (
         <div className="absolute inset-x-4 bottom-24 bg-black/80 backdrop-blur-md p-4 rounded-xl z-20" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Creative Filter</h3>
                <button onClick={onClose}><i className="fas fa-times"></i></button>
            </div>

            <div className="bg-white/10 p-3 rounded-lg">
                <div className="flex justify-between text-xs font-bold text-neutral-300 mb-2">
                    <span>Muffled</span>
                    <span>Neutral</span>
                    <span>Thin</span>
                </div>
                 <input 
                    type="range" 
                    min="-1" 
                    max="1" 
                    step="0.05" 
                    value={filterValue} 
                    onChange={handleFilterChange} 
                    className="w-full"
                />
            </div>
        </div>
    );
};

export default CreativeEffects;
