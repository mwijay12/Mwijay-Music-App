
import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { GEMINI_KEYS } from '../components/constants.ts';
import type { ProfileData } from '../types';
import { decode } from '../utils/helpers.ts';

type TtsType = 'response' | 'greeting' | 'achievement' | 'help';

interface TtsQueueItem {
    text: string;
    type: TtsType;
}

interface UseTtsQueueProps {
    profile: ProfileData | null;
}

export const useTtsQueue = ({ profile }: UseTtsQueueProps) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentType, setCurrentType] = useState<TtsType | null>(null);
    
    const ttsQueue = useRef<TtsQueueItem[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Initialize Audio element
    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio();
        }
    }, []);

    const processQueue = useCallback(async () => {
        if (isSpeaking || isPaused || ttsQueue.current.length === 0) {
            return;
        }

        const item = ttsQueue.current.shift();
        if (!item || !profile) return;

        setIsSpeaking(true);
        setCurrentType(item.type);
        
        const cleanup = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            setCurrentType(null);
            if (audioRef.current) {
                URL.revokeObjectURL(audioRef.current.src);
                audioRef.current.src = '';
            }
            // Process next item if exists
            if (ttsQueue.current.length > 0) {
                processQueue();
            }
        };

        const apiKey = profile.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        const uniqueKeys = Array.from(new Set([
            apiKey,
            ...GEMINI_KEYS
        ].filter(Boolean))) as string[];

        const fallbackToBrowserTts = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    await TextToSpeech.speak({
                        text: item.text,
                        lang: 'en-US',
                        rate: 1.0,
                        pitch: 1.0,
                        volume: 1.0,
                        category: 'ambient'
                    });
                    cleanup();
                } catch (e) {
                    console.error("Capacitor Native speech synthesis error, trying standard browser API:", e);
                    // Fall through to browser Web Speech API as last resort
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(item.text);
                        utterance.onend = cleanup;
                        utterance.onerror = () => cleanup();
                        window.speechSynthesis.speak(utterance);
                    } else {
                        cleanup();
                    }
                }
            } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(item.text);
                utterance.onend = cleanup;
                utterance.onerror = (e) => {
                    console.error("Browser speech synthesis error:", e);
                    cleanup();
                };
                window.speechSynthesis.speak(utterance);
            } else {
                cleanup();
            }
        };

        // Use Google TTS if online and key available
        if (navigator.onLine && uniqueKeys.length > 0) {
            const generateTTS = async () => {
                let lastError = null;
                for (let i = 0; i < uniqueKeys.length; i++) {
                    const activeKey = uniqueKeys[i];
                    for (let retry = 0; retry < 2; retry++) {
                        try {
                            const ai = new GoogleGenAI({ apiKey: activeKey });
                            const { voice } = profile.settings.assistant;
                            
                            const femaleVoices = ['Kore', 'Laomedeia', 'Callirrhoe', 'Autonoe', 'Zephyr'];
                            const maleVoices = ['Puck', 'Charon', 'Fenrir', 'Zubenelgenubi', 'Orus', 'Achernar'];
                            
                            let voiceName = 'Zephyr'; // Default
                            if (femaleVoices.includes(voice) || maleVoices.includes(voice)) {
                                voiceName = voice;
                            }

                            const response = await ai.models.generateContent({
                                model: "gemini-2.5-flash",
                                contents: [{ parts: [{ text: item.text }] }],
                                config: {
                                    responseModalities: [Modality.AUDIO],
                                    speechConfig: {
                                        voiceConfig: {
                                            prebuiltVoiceConfig: { voiceName },
                                        },
                                    },
                                },
                            });
                            return response;
                        } catch (error) {
                            lastError = error;
                            console.warn(`TTS generation failed with key index ${i}, attempt ${retry + 1}`, error);
                            if (retry < 1) {
                                await new Promise(resolve => setTimeout(resolve, 300));
                            }
                        }
                    }
                }
                throw lastError || new Error("All keys exhausted for TTS");
            };

            try {
                const response = await generateTTS();
                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

                if (base64Audio && audioRef.current) {
                    const bytes = decode(base64Audio);
                    
                    // Simple WAV header construction for 24kHz mono (standard for Gemini TTS)
                    const wavHeader = new ArrayBuffer(44);
                    const view = new DataView(wavHeader);
                    const sampleRate = 24000;
                    const numChannels = 1;
                    const byteRate = sampleRate * numChannels * 2; // 16-bit
                    const blockAlign = numChannels * 2;
                    const dataSize = bytes.length;

                    // RIFF chunk descriptor
                    view.setUint32(0, 0x52494646, false); // "RIFF"
                    view.setUint32(4, 36 + dataSize, true); // ChunkSize
                    view.setUint32(8, 0x57415645, false); // "WAVE"
                    // fmt sub-chunk
                    view.setUint32(12, 0x666d7420, false); // "fmt "
                    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
                    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
                    view.setUint16(22, numChannels, true); // NumChannels
                    view.setUint32(24, sampleRate, true); // SampleRate
                    view.setUint32(28, byteRate, true); // ByteRate
                    view.setUint16(32, blockAlign, true); // BlockAlign
                    view.setUint16(34, 16, true); // BitsPerSample
                    // data sub-chunk
                    view.setUint32(36, 0x64617461, false); // "data"
                    view.setUint32(40, dataSize, true); // Subchunk2Size

                    const wavBlob = new Blob([wavHeader, bytes as unknown as BlobPart], { type: 'audio/wav' });
                    const url = URL.createObjectURL(wavBlob);
                    
                    audioRef.current.src = url;
                    audioRef.current.onended = cleanup;
                    audioRef.current.onerror = (e) => {
                        console.error("Audio playback error, falling back to browser TTS", e);
                        fallbackToBrowserTts();
                    };
                    audioRef.current.play().catch(e => {
                        console.error("Audio play failed, falling back to browser TTS", e);
                        fallbackToBrowserTts();
                    });
                } else {
                    console.warn("No base64Audio received from Gemini, falling back to browser TTS");
                    fallbackToBrowserTts();
                }
            } catch (error) {
                console.error("TTS generation failed after retries, falling back to browser TTS:", String(error));
                fallbackToBrowserTts();
            }
        } else {
            fallbackToBrowserTts();
        }
    }, [isSpeaking, isPaused, profile]);

    useEffect(() => {
        if (!isSpeaking && !isPaused && ttsQueue.current.length > 0) {
            processQueue();
        }
    }, [isSpeaking, isPaused, processQueue]);

    const queueSpeech = useCallback((text: string, type: TtsType = 'response') => {
        if (Capacitor.isNativePlatform()) {
            TextToSpeech.stop().catch(console.error);
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        ttsQueue.current.push({ text, type });
        if (!isSpeaking && !isPaused) {
            processQueue();
        }
    }, [processQueue, isSpeaking, isPaused]);

    const pause = useCallback(() => {
        if (audioRef.current && isSpeaking && !isPaused) {
            audioRef.current.pause();
            setIsPaused(true);
        }
    }, [isSpeaking, isPaused]);

    const resume = useCallback(() => {
        if (audioRef.current && isPaused) {
            audioRef.current.play();
            setIsPaused(false);
        }
    }, [isPaused]);

    const stop = useCallback(() => {
        if (Capacitor.isNativePlatform()) {
            TextToSpeech.stop().catch(console.error);
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            // Trigger cleanup manually as 'ended' event won't fire on pause+seek
            setIsSpeaking(false);
            setIsPaused(false);
            setCurrentType(null);
            ttsQueue.current = []; // Clear queue
        }
    }, []);

    return { queueSpeech, isSpeaking, isPaused, currentType, pause, resume, stop };
};
