
import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
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

// ── MODULE-LEVEL TTS CLEANUP ─────────────────────────────────────────
function cancelAllTts() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
}

if (typeof window !== 'undefined') {
    cancelAllTts();
}

// ── HOOK ─────────────────────────────────────────────────────────────
export const useTtsQueue = ({ profile }: UseTtsQueueProps) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentType, setCurrentType] = useState<TtsType | null>(null);
    
    const ttsQueue = useRef<TtsQueueItem[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const processingRef = useRef(false);
    
    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio();
        }
    }, []);

    const processQueue = useCallback(async () => {
        if (isSpeaking || isPaused || ttsQueue.current.length === 0 || processingRef.current) {
            return;
        }
        processingRef.current = true;

        const item = ttsQueue.current.shift();
        if (!item || !profile) return;

        setIsSpeaking(true);
        setCurrentType(item.type);
        
        const cleanup = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            setCurrentType(null);
            processingRef.current = false;
            if (audioRef.current) {
                URL.revokeObjectURL(audioRef.current.src);
                audioRef.current.src = '';
            }
            if (ttsQueue.current.length > 0) {
                processQueue();
            }
        };

        const apiKey = profile.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        const uniqueKeys = Array.from(new Set([
            apiKey,
            ...GEMINI_KEYS
        ].filter(Boolean))) as string[];

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
                            
                            let voiceName = 'Zephyr';
                            if (femaleVoices.includes(voice) || maleVoices.includes(voice)) {
                                voiceName = voice;
                            }

                            const response = await ai.models.generateContent({
                                model: "gemini-2.5-flash-preview-tts",
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
                    
                    const wavHeader = new ArrayBuffer(44);
                    const view = new DataView(wavHeader);
                    const sampleRate = 24000;
                    const numChannels = 1;
                    const byteRate = sampleRate * numChannels * 2;
                    const blockAlign = numChannels * 2;
                    const dataSize = bytes.length;

                    view.setUint32(0, 0x52494646, false);
                    view.setUint32(4, 36 + dataSize, true);
                    view.setUint32(8, 0x57415645, false);
                    view.setUint32(12, 0x666d7420, false);
                    view.setUint32(16, 16, true);
                    view.setUint16(20, 1, true);
                    view.setUint16(22, numChannels, true);
                    view.setUint32(24, sampleRate, true);
                    view.setUint32(28, byteRate, true);
                    view.setUint16(32, blockAlign, true);
                    view.setUint16(34, 16, true);
                    view.setUint32(36, 0x64617461, false);
                    view.setUint32(40, dataSize, true);

                    const wavBlob = new Blob([wavHeader, bytes as unknown as BlobPart], { type: 'audio/wav' });
                    const url = URL.createObjectURL(wavBlob);
                    
                    audioRef.current.src = url;
                    audioRef.current.onended = cleanup;
                    audioRef.current.onerror = (e) => {
                        console.warn('[TTS] Audio playback error, skipping:', e);
                        cleanup();
                    };
                    audioRef.current.play().catch(e => {
                        console.warn('[TTS] Audio play failed, skipping:', e);
                        cleanup();
                    });
                } else {
                    console.warn("[TTS] No base64Audio from Gemini, skipping");
                    cleanup();
                }
            } catch (error) {
                console.warn('[TTS] Generation failed, skipping audio:', error);
                cleanup();
            }
        } else {
            console.warn('[TTS] No network or API key, skipping audio');
            cleanup();
        }
    }, [isSpeaking, isPaused, profile]);

    useEffect(() => {
        if (!isSpeaking && !isPaused && ttsQueue.current.length > 0) {
            processQueue();
        }
    }, [isSpeaking, isPaused, processQueue]);

    const queueSpeech = useCallback((text: string, type: TtsType = 'response') => {
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

    useEffect(() => {
        return () => {
            cancelAllTts();
            processingRef.current = false;
        };
    }, []);

    const stop = useCallback(() => {
        cancelAllTts();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentType(null);
        processingRef.current = false;
        ttsQueue.current = [];
    }, []);

    return { queueSpeech, isSpeaking, isPaused, currentType, pause, resume, stop };
};
