import { GoogleGenAI } from '@google/genai';

export const analyzeMedia = async (mediaInput: any, options: any) => {
    try {
        const audioUrl = mediaInput?.audio?.audioUrl;
        const audioBase64 = mediaInput?.audio?.base64;
        const mimeType = mediaInput?.audio?.mimeType;

        const response = await fetch('http://localhost:8000/api/audio/transcribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: audioUrl || null,
                audio_base64: audioBase64 || null,
                mime_type: mimeType || 'audio/mp3'
            })
        });

        if (!response.ok) {
            throw new Error(`Server transcription request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error("AI deep analysis transcription query failed on backend, falling back:", err);
        return {
            lyrics: "AI Transcription Offline. Could not query server transcription service.",
            segments: [
                { timestamp: "00:00", content: "Audio analysis started..." },
                { timestamp: "00:05", content: "AI Transcription engine failed to respond." },
                { timestamp: "00:10", content: "Please verify backend server is active." }
            ]
        };
    }
};

export const getZenContent = async (topic: string) => {
    // Placeholder for getting Zen content
    return `Take a deep breath and focus on the present moment. Let go of the past and the future. Embrace the ${topic}.`;
};

export const textToSpeech = async (text: string) => {
    // Placeholder for TTS, returns an empty base64 string or null for now. 
    // Usually this would call an API that returns audio data.
    return "";
};

