

import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, StopCircle } from 'lucide-react';

declare const webkitSpeechRecognition: any;
declare const SpeechRecognition: any;

interface TranscriptionModalProps {
    onClose: () => void;
    onSave: (lyrics: string) => void;
}

const TranscriptionModal: React.FC<TranscriptionModalProps> = ({ onClose, onSave }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setError("Your browser doesn't support speech recognition.");
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', String(event.error));
            setError(`Error: ${String(event.error)}`);
            setIsListening(false);
        };
        
        let finalTranscript = '';
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(finalTranscript + interimTranscript);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleToggleListen = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            try {
                recognitionRef.current.start();
            } catch (e) {
                setError("Could not start listening. Please check microphone permissions.");
                console.error("Error starting recognition:", String(e));
            }
        }
    };

    const handleSave = () => {
        onSave(transcript);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane glare-effect w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[70vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Live Transcription</h3>
                    <button onClick={onClose} className="text-white/70 hover:text-white"><X size={24} /></button>
                </header>

                <p className="text-sm text-neutral-400 mb-4 flex-shrink-0">
                    Play the audio out loud and I'll do my best to transcribe it. For best results, use a quiet environment.
                </p>

                <textarea
                    value={transcript}
                    readOnly
                    placeholder="Transcription will appear here..."
                    className="w-full flex-1 bg-black/30 rounded-lg p-4 text-base leading-relaxed resize-none focus:ring-2 focus:ring-[var(--primary-accent)] mb-4"
                />
                {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
                
                <footer className="flex-shrink-0 flex items-center gap-4">
                    <button onClick={handleToggleListen} className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-[var(--primary-accent)] text-black'}`}>
                        {isListening ? <StopCircle size={24} /> : <Mic size={24} />}
                    </button>
                    <button onClick={handleSave} disabled={!transcript.trim()} className="flex-1 bg-white/20 font-bold py-3 rounded-full disabled:opacity-50">
                        Save to Lyrics
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default TranscriptionModal;
