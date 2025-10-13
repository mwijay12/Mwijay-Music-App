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
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length of fmt data
    setUint16(1); // PCM - integer samples
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit samples
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
};


interface RingtoneMakerModalProps {
    song: Song;
    onClose: () => void;
    showNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

const RingtoneMakerModal: React.FC<RingtoneMakerModalProps> = ({ song, onClose, showNotification }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(30);
    
    useEffect(() => {
        if (!song.audioData) {
            showNotification("Song data not available for trimming.", 'error');
            onClose();
            return;
        }
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContextRef.current.state === 'suspended') {
                 audioContextRef.current.resume();
            }
            // Use slice(0) to create a copy, preventing modification of the original ArrayBuffer
            audioContextRef.current.decodeAudioData(song.audioData.slice(0))
                .then(buffer => {
                    audioBufferRef.current = buffer;
                    setIsLoading(false);
                    setEndTime(Math.min(30, buffer.duration));
                })
                .catch(err => {
                    console.error("Error decoding audio data:", err);
                    showNotification("Could not process this audio file. It might be corrupted.", 'error');
                    onClose();
                });
        } catch (e) {
            console.error("AudioContext error:", e);
            showNotification("Browser does not support audio processing.", 'error');
            onClose();
        }
        
        return () => {
             previewSourceRef.current?.stop();
             audioContextRef.current?.close().catch(e => console.warn("Error closing audio context", e));
        }
    }, [song, onClose, showNotification]);
    
    useEffect(() => {
        if (!isLoading && audioBufferRef.current && canvasRef.current) {
            const primaryAccent = getComputedStyle(document.documentElement).getPropertyValue('--primary-accent').trim();
            drawWaveform(canvasRef.current, audioBufferRef.current, startTime, endTime, primaryAccent);
        }
    }, [isLoading, startTime, endTime]);

    const handlePreview = () => {
        const audioBuffer = audioBufferRef.current;
        const context = audioContextRef.current;
        if (!audioBuffer || !context || context.state !== 'running') return;
        
        if (previewSourceRef.current) {
            try { previewSourceRef.current.stop(); } catch(e) {}
        }

        const duration = endTime - startTime;
        if (duration <= 0) return;

        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start(0, startTime, duration);
        previewSourceRef.current = source;
    };
    
    const handleDownload = () => {
        const audioBuffer = audioBufferRef.current;
        const context = audioContextRef.current;
        if (!audioBuffer || !context) {
            showNotification("Audio data not ready.", 'error');
            return;
        }

        const duration = endTime - startTime;
        if (duration <= 0) {
            showNotification("Selected duration is zero.", 'error');
            return;
        }
        
        try {
            const frameCount = Math.floor(duration * audioBuffer.sampleRate);
            const startOffset = Math.floor(startTime * audioBuffer.sampleRate);

            const newBuffer = context.createBuffer(
                audioBuffer.numberOfChannels,
                frameCount,
                audioBuffer.sampleRate
            );

            for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                const channel = newBuffer.getChannelData(i);
                const originalChannel = audioBuffer.getChannelData(i);
                const slicedData = originalChannel.subarray(startOffset, startOffset + frameCount);
                channel.set(slicedData);
            }

            const wavBlob = bufferToWave(newBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}_ringtone.wav`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            a.remove();
            showNotification("Ringtone downloaded!", 'success');
        } catch (e) {
            console.error("Error creating ringtone:", e);
            showNotification("Failed to create ringtone file.", 'error');
        }
    };
    
    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = parseFloat(e.target.value);
        if (newStart < endTime) setStartTime(newStart);
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = parseFloat(e.target.value);
        if (newEnd > startTime) setEndTime(newEnd);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-lg">Create Ringtone</h2>
                        <p className="text-sm text-neutral-400 truncate">{song.title}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
                </header>

                <div className="p-4">
                    {isLoading ? (
                        <div className="h-40 flex items-center justify-center text-center">
                             <i className="fas fa-spinner fa-spin text-2xl mr-2"></i> Loading Audio...
                        </div>
                    ) : (
                        <div>
                            <div className="bg-black/20 rounded-md p-2">
                                <canvas ref={canvasRef} width="400" height="100" className="w-full h-24" />
                                <div className="range-slider-container h-12 -mt-28">
                                    <input type="range" min="0" max={audioBufferRef.current?.duration || 0} value={startTime} onChange={handleStartChange} step="0.1" />
                                    <input type="range" min="0" max={audioBufferRef.current?.duration || 0} value={endTime} onChange={handleEndChange} step="0.1" />
                                </div>
                            </div>
                            <div className="flex justify-between text-sm font-mono mt-2">
                                <span>Start: {startTime.toFixed(1)}s</span>
                                <span className="font-bold">Duration: {(endTime - startTime).toFixed(1)}s</span>
                                <span>End: {endTime.toFixed(1)}s</span>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-white/10 flex-shrink-0 flex justify-end gap-3">
                    <button onClick={handlePreview} disabled={isLoading} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-5 rounded-full disabled:opacity-50">Preview</button>
                    <button onClick={handleDownload} disabled={isLoading} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-5 rounded-full disabled:opacity-50">Download</button>
                </footer>
            </div>
        </div>
    );
};

export default RingtoneMakerModal;