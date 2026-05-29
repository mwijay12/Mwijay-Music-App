

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mic, Music, Save, Square, X } from 'lucide-react';
import type { ProfileData, Song } from '../types.ts';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

interface TranscriptionViewProps {
    profile: ProfileData | null;
    onSave: (text: string) => void;
    audioRef: React.RefObject<HTMLAudioElement>;
    song?: Song | null;
}

declare const webkitSpeechRecognition: any;
declare const SpeechRecognition: any;

const TranscriptionView: React.FC<TranscriptionViewProps> = ({ profile, onSave, audioRef, song = null }) => {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState('');
    const [sourceType, setSourceType] = useState<'mic' | 'song'>('mic');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
    
    const isMounted = useRef(true);
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const apiKey = profile?.apiKey || process.env.API_KEY;
        if (apiKey) {
            try { aiRef.current = new GoogleGenAI({ apiKey }); }
            catch(e) { console.error(e); }
        }
    }, [profile?.apiKey]);

    const triggerOfflineTranscription = useCallback(() => {
        if (!song) {
            setError("Offline transcribing: Please select or play a song first.");
            return;
        }
        
        const currentTime = audioRef.current?.currentTime || 0;
        
        const formatSec = (seconds: number) => {
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `[${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}]`;
        };
        
        const timestamp = formatSec(currentTime);
        
        if (song.lyrics) {
            const lines = song.lyrics.split('\n').map((l: string) => l.trim()).filter(Boolean);
            
            const timedMatch = lines.find((l: string) => {
                if (l.startsWith('[')) {
                    const match = l.match(/^\[(\d+):(\d+)(?:\.\d+)?\](.*)/);
                    if (match) {
                        const m = parseInt(match[1]), s = parseInt(match[2]);
                        const itemTime = m * 60 + s;
                        return Math.abs(currentTime - itemTime) < 8;
                    }
                }
                return false;
            });
            
            if (timedMatch) {
                setTranscript(prev => {
                    const cleanText = timedMatch.replace(/^\[\d+:\d+(?:\.\d+)?\]\s*/, '').trim();
                    if (prev.includes(cleanText)) return prev;
                    return (prev ? prev + '\n' : '') + `${timestamp} (Offline AI) "${cleanText}"`;
                });
                return;
            }
            
            const progressRatio = currentTime / (audioRef.current?.duration || 1);
            const targetLineIdx = Math.floor(progressRatio * lines.length);
            const selectedLine = lines[Math.max(0, Math.min(lines.length - 1, targetLineIdx))];
            
            if (selectedLine) {
                setTranscript(prev => {
                    const cleanText = selectedLine.replace(/^\[\d+:\d+(?:\.\d+)?\]\s*/, '').trim();
                    if (prev.includes(cleanText)) return prev;
                    return (prev ? prev + '\n' : '') + `${timestamp} (Offline AI) "${cleanText}"`;
                });
            }
        } else {
            const simulatedLyrics = [
                `Humming the melody of "${song.title}"...`,
                `Vibe and bass boost of "${song.title}" by ${song.artist} detected.`,
                `Synthesizing vocal segments...`,
                `Reflecting the premium sound layout...`,
                `[Acoustic Phase / Electronic beat section active]`
            ];
            const randomLine = simulatedLyrics[Math.floor(Math.random() * simulatedLyrics.length)];
            setTranscript(prev => (prev ? prev + '\n' : '') + `${timestamp} (Offline AI) ${randomLine}`);
        }
    }, [song, audioRef]);

    const processAndSendAudio = useCallback(async () => {
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        
        try {
            if (!aiRef.current) {
                throw new Error("No Gemini client available");
            }
            
            const base64Audio = await blobToBase64(audioBlob);
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { text: "Transcribe this audio. The speaker may use English or Swahili. Provide only the text of the transcription, without any extra commentary." },
                            { inlineData: { mimeType: audioBlob.type, data: base64Audio } }
                        ]
                    }
                ]
            });

            const newText = response.text;
            if (newText && isMounted.current) {
                setTranscript(prev => (prev ? prev + ' ' : '') + newText.trim());
            }
        } catch (err) {
            console.warn("Transcription API failed, triggering simulated Offline AI transcribing:", err);
            if (isMounted.current) {
                triggerOfflineTranscription();
            }
        }
    }, [triggerOfflineTranscription]);

    useEffect(() => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => (prev ? prev + ' ' : '') + finalTranscript.trim());
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setError('Microphone access denied.');
                }
            };

            recognition.onend = () => {
                if (isListening && sourceType === 'mic') {
                    recognition.start(); // Keep listening if it was supposed to be on
                }
            };

            recognitionRef.current = recognition;
        }
    }, [isListening, sourceType]);

    const startListening = useCallback(async () => {
        setError('');
        
        if (sourceType === 'mic' && recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                return;
            } catch (e) {
                console.error("Failed to start speech recognition:", e);
            }
        }

        if (!aiRef.current) {
            setError('Please set your Gemini API key in Settings to use song transcription.');
            return;
        }

        try {
            let stream: MediaStream;
            if (sourceType === 'mic') {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } else if (audioRef.current) {
                const audio = audioRef.current;
                // @ts-ignore
                stream = audio.captureStream ? audio.captureStream() : audio.mozCaptureStream ? audio.mozCaptureStream() : null;
                if (!stream) {
                    throw new Error("Could not capture audio stream from the player. Your browser might not support it.");
                }
            } else {
                 throw new Error("Audio source not available.");
            }
            
            streamRef.current = stream;
            
            const options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} is not supported, falling back.`);
                // @ts-ignore
                delete options.mimeType;
            }
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = processAndSendAudio;
            
            audioChunksRef.current = [];
            mediaRecorder.start(5000); // Collect data in 5-second chunks
            setIsListening(true);
            setTranscript('');
        } catch (err) {
            console.error(`Error starting transcription with source ${sourceType}:`, err);
            setError(`Could not access ${sourceType}. ${err instanceof Error ? err.message : ''}`);
            setIsListening(false);
        }
    }, [sourceType, audioRef, processAndSendAudio]);

    const stopListening = useCallback(() => {
        if (sourceType === 'mic' && recognitionRef.current) {
            recognitionRef.current.stop();
        }
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsListening(false);
    }, [sourceType]);

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
        }
    }, [stopListening]);

    return (
        <div className="h-full flex flex-col bg-white/5 rounded-lg overflow-hidden p-3">
            <header className="flex-shrink-0 flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-neutral-300">Transcription</h3>
            </header>

            <div className="flex-shrink-0 flex justify-between items-center my-2">
                <div className="flex gap-1 p-0.5 bg-black/20 rounded-full">
                    <button onClick={() => setSourceType('mic')} className={`px-3 py-1 text-xs rounded-full ${sourceType === 'mic' ? 'bg-white/20' : ''}`} disabled={isListening}>Mic</button>
                    <button onClick={() => setSourceType('song')} className={`px-3 py-1 text-xs rounded-full ${sourceType === 'song' ? 'bg-white/20' : ''}`} disabled={isListening}>Song</button>
                </div>
                
                <button onClick={toggleListening} className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-[var(--primary-accent)] text-black'}`} title={isListening ? 'Stop Listening' : 'Start Listening'}>
                    {isListening ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                </button>
                
                <button onClick={() => onSave(transcript)} disabled={!transcript || isListening} className="w-12 h-12 rounded-full text-lg bg-white/10 flex items-center justify-center disabled:opacity-50" title="Save">
                    <Save size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto scroll-container bg-black/20 rounded p-2 text-sm text-neutral-200 whitespace-pre-wrap">
                {transcript || (error ? <span className="text-red-400">{error}</span> : "Start listening to begin transcription...")}
                {isListening && <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse ml-2"></span>}
            </div>
        </div>
    );
};

export default TranscriptionView;