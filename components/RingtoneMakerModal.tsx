import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Song } from '../types.ts';

// Helper to draw waveform
const drawWaveform = (canvas: HTMLCanvasElement, buffer: AudioBuffer, startTime: number, endTime: number, themeColor: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = themeColor;

    const samplesPerPixel = Math.floor(data.length / width);
    for (let x = 0; x < width; x++) {
        const start = x * samplesPerPixel;
        let min = 1.0;
        let max = -1.0;
        for (let i = 0; i < samplesPerPixel; i++) {
            const sample = data[start + i];
            if (sample < min) min = sample;
            if (sample > max) max = sample;
        }
        const y = (1 + min) * amp;
        const h = Math.max(1, (max - min) * amp);
        ctx.fillRect(x, y, 1, h);
    }
    
    // Draw selection overlay
    const startX = (startTime / buffer.duration) * width;
    const endX = (endTime / buffer.duration) * width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(startX, 0, endX - startX, height);
};

// Helper to convert AudioBuffer to WAV
const bufferToWave = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    // RIFF header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"

    // "fmt " sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 16 for PCM
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numOfChan * 2); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // "data" sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    // write the PCM data
    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
        if (offset >= buffer.length) break;
    }

    return new Blob([view], { type: 'audio/wav' });
};

interface RingtoneMakerModalProps {
    song: Song;
    onClose: () => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const RingtoneMakerModal: React.FC<RingtoneMakerModalProps> = ({ song, onClose, showNotification }) => {
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(15);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Decode audio data
    useEffect(() => {
        if (song.audioData) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current.decodeAudioData(song.audioData.slice(0))
                .then(buffer => setAudioBuffer(buffer))
                .catch(err => {
                    console.error("Error decoding audio data:", err);
                    showNotification("Could not load audio for trimming.", 'error');
                });
        } else {
             showNotification("This song cannot be used for ringtones (no local data).", 'error');
             onClose();
        }
        return () => {
            audioContextRef.current?.close().catch(e => console.error(e));
        }
    }, [song.audioData, showNotification, onClose]);

    // Draw waveform
    useEffect(() => {
        if (audioBuffer && canvasRef.current) {
            const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-accent').trim() || '#C8F052';
            drawWaveform(canvasRef.current, audioBuffer, startTime, endTime, themeColor);
        }
    }, [audioBuffer, startTime, endTime]);

    const handlePlayPreview = useCallback(() => {
        if (!audioBuffer || !audioContextRef.current) return;
        if (previewSourceRef.current) {
            previewSourceRef.current.stop();
        }
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0, startTime, endTime - startTime);
        source.onended = () => setIsPlayingPreview(false);
        previewSourceRef.current = source;
        setIsPlayingPreview(true);
    }, [audioBuffer, startTime, endTime]);

    const handleStopPreview = useCallback(() => {
        if (previewSourceRef.current) {
            previewSourceRef.current.stop();
            setIsPlayingPreview(false);
        }
    }, []);
    
    const handleDownload = () => {
        if (!audioBuffer || !audioContextRef.current) return;
        
        const startSample = Math.floor(startTime * audioBuffer.sampleRate);
        const endSample = Math.floor(endTime * audioBuffer.sampleRate);
        const slicedLength = endSample - startSample;
        
        if (slicedLength <= 0) {
            showNotification("Please select a valid time range.", 'error');
            return;
        }

        const slicedBuffer = audioContextRef.current.createBuffer(
            audioBuffer.numberOfChannels,
            slicedLength,
            audioBuffer.sampleRate
        );

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            const channelData = audioBuffer.getChannelData(i);
            const slicedData = slicedBuffer.getChannelData(i);
            slicedData.set(channelData.subarray(startSample, endSample));
        }

        const wavBlob = bufferToWave(slicedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}_ringtone.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("Ringtone download started!", 'success');
    };

    const maxDuration = audioBuffer?.duration || 30;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Create Ringtone</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
                </header>
                
                <div className="p-4 space-y-4">
                     <canvas ref={canvasRef} width="500" height="100" className="w-full h-24 bg-black/20 rounded-lg"></canvas>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-neutral-400">Start Time</label>
                            <input type="number" value={startTime.toFixed(2)} onChange={e => setStartTime(Math.max(0, parseFloat(e.target.value)))} className="w-full bg-white/10 p-2 rounded-md" />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-neutral-400">End Time</label>
                            <input type="number" value={endTime.toFixed(2)} onChange={e => setEndTime(Math.min(maxDuration, parseFloat(e.target.value)))} className="w-full bg-white/10 p-2 rounded-md" />
                        </div>
                    </div>
                     <p className="text-center text-sm text-neutral-300">Duration: <strong>{(endTime - startTime).toFixed(2)}s</strong></p>
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex items-center justify-between">
                     <button onClick={isPlayingPreview ? handleStopPreview : handlePlayPreview} className="bg-white/10 font-bold py-2 px-5 rounded-full flex items-center gap-2">
                        <i className={`fas ${isPlayingPreview ? 'fa-stop' : 'fa-play'}`}></i>
                        {isPlayingPreview ? 'Stop' : 'Preview'}
                    </button>
                    <button onClick={handleDownload} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full flex items-center gap-2">
                         <i className="fas fa-download"></i>
                        Download .wav
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default RingtoneMakerModal;
