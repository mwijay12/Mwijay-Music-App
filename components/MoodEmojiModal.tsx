
import React, { useState, useRef } from 'react';
import type { Song } from '../types.ts';
import { GoogleGenAI, Modality } from '@google/genai';
import { blobToBase64 } from '../utils/helpers.ts';
import { Camera, Loader2, Plus } from 'lucide-react';

interface Mood {
    name: string;
    emoji: string;
    color: string;
}

interface MoodEmojiModalProps {
    song: Song;
    onClose: () => void;
    onSetMood: (songId: string, emoji: string) => void;
    onAddMood: () => void;
    allMoods: Mood[];
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const MoodEmojiModal: React.FC<MoodEmojiModalProps> = ({ song, onClose, onSetMood, onAddMood, allMoods, showNotification }) => {
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showCamera, setShowCamera] = useState(false);

    const handleSelect = (emoji: string) => {
        onSetMood(song.id, emoji);
        onClose();
    };

    const handleStartScan = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (e) {
            console.error(e);
            showNotification("Camera access denied.", "error");
            setShowCamera(false);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const context = canvasRef.current.getContext('2d');
        if (context) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            
            const blob = await new Promise<Blob | null>(r => canvasRef.current?.toBlob(r, 'image/jpeg'));
            if (!blob) return;

            // Stop Camera
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            setShowCamera(false);
            setIsScanning(true);

            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                showNotification("API Key required for Mood Scanner.", "error");
                setIsScanning(false);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey });
                const base64 = await blobToBase64(blob);
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        { text: "Analyze the facial expression in this image and return a single emoji that best represents the mood. Just the emoji." },
                        { inlineData: { mimeType: 'image/jpeg', data: base64 } }
                    ]
                });
                
                const emoji = response.text?.trim() || '😐';
                handleSelect(emoji);
                showNotification(`Mood detected: ${emoji}`, "success");
            } catch (e) {
                console.error("Mood scan failed", e);
                showNotification("Could not detect mood.", "error");
            } finally {
                setIsScanning(false);
            }
        }
    };

    const moodsToDisplay = allMoods.slice(0, 11);

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane glare-effect w-full max-w-md rounded-2xl p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center mb-1">Set the mood for:</h3>
                <p className="text-sm text-center text-neutral-400 mb-4 truncate">{song.title}</p>
                
                {showCamera ? (
                    <div className="relative mb-4 rounded-xl overflow-hidden aspect-square bg-black">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        <button onClick={handleCapture} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black font-bold py-2 px-6 rounded-full shadow-lg">
                            Snap & Detect
                        </button>
                    </div>
                ) : (
                    <button onClick={handleStartScan} disabled={isScanning} className="w-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] py-3 rounded-xl mb-4 flex items-center justify-center gap-2 font-bold text-sm">
                        {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                        {isScanning ? "Scanning..." : "Scan Mood from Selfie"}
                    </button>
                )}

                <div className="grid grid-cols-6 gap-2">
                    {moodsToDisplay.map(mood => (
                        <button 
                            key={mood.emoji}
                            onClick={() => handleSelect(mood.emoji)}
                            className={`aspect-square text-3xl rounded-lg transition-transform hover:scale-110 ${song.moodEmoji === mood.emoji ? 'bg-[var(--primary-accent)]' : 'bg-white/10'}`}
                            title={mood.name}
                        >
                            {mood.emoji}
                        </button>
                    ))}
                    <button 
                        onClick={onAddMood}
                        className={`aspect-square text-3xl rounded-lg transition-transform hover:scale-110 bg-white/5 flex items-center justify-center`}
                        title="Add new mood"
                    >
                        <Plus className="text-neutral-400" size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoodEmojiModal;
