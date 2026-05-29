
import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, Part, Chat } from '@google/genai';
import type { ChatMessage, Song, ProfileData } from '../types.ts';
import { assistantKnowledge } from './assistantKnowledge.ts';

const GEMINI_KEYS = (process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : []).filter(Boolean);
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY || '';
const GEMMA_MODELS = ['gemma-3-27b-it', 'gemma-3-12b-it', 'gemma-3-4b-it'];


const callThirdPartyFallbacks = async (text: string, history: ChatMessage[]): Promise<string> => {
    const formattedMessages = [
        {
            role: "system",
            content: `You are Mwijay, a Super Advanced Music Assistant and tech/business consultant.
            You are created by Mwijay Davie (mwijaydavie@gmail.com, 0620641695, https://www.linkedin.com/in/mwijay-davie/).
            Be casual, witty, and super helpful. Keep answers natural, varied, and conversational.
            If asked about services, pricing, social media strategy, or remote jobs, speak confidently about Mwijay Davie's custom solutions and student remote career advice!
            (Note: You are currently running in a secondary fallback mode, so automatic player controls may be limited, but help the user as best as you can).`
        },
        ...history.filter(m => m.sender === 'user' || m.sender === 'assistant').map(m => ({
            role: m.sender === 'user' ? "user" : "assistant",
            content: m.text
        })),
        { role: "user", content: text }
    ];

    if (OPENROUTER_KEY) {
        for (const model of GEMMA_MODELS) {
            try {
                console.log(`Trying OpenRouter with model: google/${model}...`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENROUTER_KEY}`,
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "Mwijay Music App"
                    },
                    body: JSON.stringify({
                        model: `google/${model}`,
                        messages: formattedMessages,
                        temperature: 0.7
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data?.choices?.[0]?.message?.content;
                    if (content) {
                        console.log("OpenRouter Gemma 3 fallback succeeded!");
                        return content;
                    }
                }
            } catch (err) {
                console.warn(`OpenRouter failed for ${model}:`, err);
            }
        }
    }

    if (GROQ_KEY) {
        const groqModels = ["gemma2-9b-it", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"];
        for (const model of groqModels) {
            try {
                console.log(`Trying Groq with model: ${model}...`);
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${GROQ_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: formattedMessages,
                        temperature: 0.7
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data?.choices?.[0]?.message?.content;
                    if (content) {
                        console.log("Groq fallback succeeded!");
                        return content;
                    }
                }
            } catch (err) {
                console.warn(`Groq failed for ${model}:`, err);
            }
        }
    }

    if (CEREBRAS_KEY) {
        const cerebrasModels = ["llama3.1-8b", "llama3.1-70b"];
        for (const model of cerebrasModels) {
            try {
                console.log(`Trying Cerebras with model: ${model}...`);
                const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${CEREBRAS_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: formattedMessages,
                        temperature: 0.7
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data?.choices?.[0]?.message?.content;
                    if (content) {
                        console.log("Cerebras fallback succeeded!");
                        return content;
                    }
                }
            } catch (err) {
                console.warn(`Cerebras failed for ${model}:`, err);
            }
        }
    }

    throw new Error("All third-party fallbacks exhausted.");
};

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const data = result.split(',')[1];
            resolve({ data, mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });
};

interface AppState {
    nowPlaying: Song | null;
    isPlaying: boolean;
    librarySongs: Song[];
    isSimpleMode: boolean;
    profile: ProfileData | null;
    isShuffled: boolean;
    repeatMode: 'none' | 'one' | 'all';
    playQueue: Song[];
    currentQueueIndex: number;
}

export interface AppControls {
    togglePlay: () => void;
    playNext: () => void;
    playPrev: () => void;
    setSimpleMode: (args: { enabled: boolean }) => void;
    playRadio: (args: { query?: string }) => void;
    setThemeMode: (args: { mode: 'light' | 'dark' }) => void;
    applyThemeByName: (args: { themeName: string }) => any;
    setSleepTimer: (args: { mode: 'duration' | 'songs' | 'off', value: number }) => void;
    changeFont: (args: { fontName: string }) => void;
    applyCustomTheme: (colors: ProfileData['customThemeColors']) => void;
    toggleFavorite: () => void;
    onPlaySong: (options: { query: string; source?: 'any' | 'local' | 'online' }) => void;
    addToQueue: (args: { songTitle: string }) => void;
    navigateToView: (args: { viewName: string }) => void;
    openAudioEffects: () => void;
    playAiPlaylist: () => void;
    toggleShuffle: () => void;
    cycleRepeat: () => void;
    scanForMedia: () => void;
    getPlaybackStatus: () => string;
    setVolumeNormalization: (args: { enabled: boolean }) => void;
    setCrossfade: (args: { value: number }) => void;
    createPlaylist: (args: { name: string }) => void;
    addSongToPlaylist: (args: { songTitle: string, playlistName: string }) => void;
    playArtist: (args: { artistName: string }) => void;
    deleteSong: (args: { songTitle: string }) => string;
    toggleSetting: (args: { settingName: string, value: boolean }) => string;
    setReelsAutoScroll: (args: { loops: number }) => string;
    getAnalytics: (args: { type: string }) => string;
    managePlaylist: (args: { action: string, name: string, song?: string }) => string;
    navigateToViewWithCountdown: (args: { viewName: string }) => string;
    startMusicQuiz: () => void;
    startPartyMode: () => void;
    toggleLyrics: () => void;
    setVisualizerType: (args: { type: string }) => void;
    clearQueue: () => void;
    openProfile: () => void;
    openVisualizerSettings: () => void;
    setEqualizer: (args: { low?: number, mid?: number, high?: number }) => string;
    explainLyrics: () => string | Promise<string>;
    translateLyrics: (args: { targetLanguage: 'English' | 'Swahili' }) => string | Promise<string>;
}

interface UseAssistantProps {
    getAppState: () => AppState;
    controls: AppControls;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    onMicStart: () => boolean;
    onMicEnd: (wasPlaying: boolean) => void;
    onAssistantResponse?: (text: string) => void;
    initialMessages?: ChatMessage[];
    chatId?: string | null;
}

const functionDeclarations: FunctionDeclaration[] = [
  { name: 'togglePlay', description: 'Plays or pauses the music.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'playNext', description: 'Skips to the next song.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'playPrev', description: 'Goes back to the previous song.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'setSimpleMode', description: 'Enables or disables simple mode.', parameters: { type: Type.OBJECT, properties: { enabled: { type: Type.BOOLEAN } }, required: ['enabled'] } },
  { name: 'playRadio', description: 'Starts a radio station.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } } } },
  { name: 'onPlaySong', description: 'Finds and plays a specific song.', parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, source: { type: Type.STRING, enum: ['local', 'online', 'any']} }, required: ['query'] } },
  { name: 'playArtist', description: 'Plays songs by a specific artist.', parameters: { type: Type.OBJECT, properties: { artistName: { type: Type.STRING } }, required: ['artistName'] } },
  { name: 'addToQueue', description: 'Adds a song to queue.', parameters: { type: Type.OBJECT, properties: { songTitle: { type: Type.STRING } }, required: ['songTitle'] } },
  { name: 'navigateToView', description: 'Navigates to a view immediately.', parameters: { type: Type.OBJECT, properties: { viewName: { type: Type.STRING } }, required: ['viewName'] } },
  { name: 'toggleShuffle', description: 'Toggles shuffle.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'cycleRepeat', description: 'Cycles repeat mode.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'scanForMedia', description: 'Scans for media files.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'setThemeMode', description: 'Sets theme mode.', parameters: { type: Type.OBJECT, properties: { mode: { type: Type.STRING, enum: ['light', 'dark'] } }, required: ['mode'] } },
  { name: 'applyThemeByName', description: 'Applies a theme by name.', parameters: { type: Type.OBJECT, properties: { themeName: { type: Type.STRING } }, required: ['themeName'] } },
  { name: 'setSleepTimer', description: 'Sets sleep timer.', parameters: { type: Type.OBJECT, properties: { mode: { type: Type.STRING, enum: ['duration', 'songs'] }, value: { type: Type.NUMBER } }, required: ['mode', 'value'] } },
  { name: 'changeFont', description: 'Changes app font.', parameters: { type: Type.OBJECT, properties: { fontName: { type: Type.STRING } }, required: ['fontName'] } },
  { name: 'toggleFavorite', description: 'Toggles favorite for current song.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'playAiPlaylist', description: 'Generates AI playlist.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'openAudioEffects', description: 'Opens EQ.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'getPlaybackStatus', description: 'Gets info on current song.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'setCrossfade', description: 'Sets crossfade duration.', parameters: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER } }, required: ['value'] } },
  { name: 'setVolumeNormalization', description: 'Toggles volume normalizer.', parameters: { type: Type.OBJECT, properties: { enabled: { type: Type.BOOLEAN } }, required: ['enabled'] } },
  { name: 'deleteSong', description: 'Deletes a song from the library.', parameters: { type: Type.OBJECT, properties: { songTitle: { type: Type.STRING } }, required: ['songTitle'] } },
  { name: 'toggleSetting', description: 'Toggles a boolean setting (e.g., audibleGreeting, aiCoverArtEnabled, playerIdleUiEnabled).', parameters: { type: Type.OBJECT, properties: { settingName: { type: Type.STRING }, value: { type: Type.BOOLEAN } }, required: ['settingName', 'value'] } },
  { name: 'setReelsAutoScroll', description: 'Sets reels loop count.', parameters: { type: Type.OBJECT, properties: { loops: { type: Type.NUMBER } }, required: ['loops'] } },
  { name: 'getAnalytics', description: 'Returns user analytics and achievements.', parameters: { type: Type.OBJECT, properties: { type: { type: Type.STRING } }, required: ['type'] } },
  { name: 'managePlaylist', description: 'Creates, deletes, or adds to playlists.', parameters: { type: Type.OBJECT, properties: { action: { type: Type.STRING, enum: ['create', 'delete', 'add'] }, name: { type: Type.STRING }, song: { type: Type.STRING } }, required: ['action', 'name'] } },
  { name: 'navigateToViewWithCountdown', description: 'Navigates to a view with a 3s countdown.', parameters: { type: Type.OBJECT, properties: { viewName: { type: Type.STRING } }, required: ['viewName'] } },
  { name: 'startMusicQuiz', description: 'Starts the music quiz game.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'startPartyMode', description: 'Enables party/guest mode.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'toggleLyrics', description: 'Shows or hides lyrics.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'setVisualizerType', description: 'Sets the visualizer style.', parameters: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: ['spectral', 'galaxy', 'tunnel', 'particles', 'vortex', 'stardust', 'equalizer', 'flow', 'neon-grid', 'metropolis'] } }, required: ['type'] } },
  { name: 'clearQueue', description: 'Clears the current play queue.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'openProfile', description: 'Opens user profile.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'openVisualizerSettings', description: 'Opens visualizer settings modal.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'setEqualizer', description: 'Adjusts the equalizer. Use values between -12 and 12 for low, mid, high bands.', parameters: { type: Type.OBJECT, properties: { low: { type: Type.NUMBER }, mid: { type: Type.NUMBER }, high: { type: Type.NUMBER } } } },
  { name: 'explainLyrics', description: 'Uses AI to explain the meaning, story, and vibe of the currently playing song\'s lyrics.', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'translateLyrics', description: 'Translates the current song\'s lyrics or title between Swahili and English.', parameters: { type: Type.OBJECT, properties: { targetLanguage: { type: Type.STRING, enum: ['English', 'Swahili'] } }, required: ['targetLanguage'] } },
];

export const useAssistant = ({ getAppState, controls, showNotification, onAssistantResponse, initialMessages, chatId: initialChatId }: UseAssistantProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages || [{ id: `greeting-${Date.now()}`, sender: 'greeting', text: "Hi! I'm Mwijay. How can I help?" }]);
    const [isOnline, setIsOnline] = useState(false);
    const [chatId, setChatId] = useState<string | null>(initialChatId || null);
    const [isProcessing, setIsProcessing] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const hasWarnedLeakedKey = useRef(false);
    
    // Add a queue to manage messages properly and avoid interleaving errors
    const messageQueue = useRef<{type: 'user' | 'tool', payload: any}[]>([]);
    const isProcessingQueue = useRef(false);

    const resetToGreeting = useCallback(() => {
        setMessages([{ id: `greeting-${Date.now()}`, sender: 'greeting', text: "Hi! I'm Mwijay. How can I help?" }]);
        setChatId(null);
        setIsProcessing(false);
        messageQueue.current = [];
        isProcessingQueue.current = false;
        
        const appState = getAppState();
        const apiKey = appState.profile?.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        initChat(apiKey);
    }, [getAppState]);

    const loadChat = (newMessages: ChatMessage[], newChatId: string) => {
        setMessages(newMessages);
        setChatId(newChatId);
    };

    const initChat = useCallback((apiKey?: string) => {
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        tools: [{ functionDeclarations }],
                        systemInstruction: `You are Mwijay, a Super Advanced Music Assistant and professional tech/business consultant.
                        
                        ABOUT MWIJAY DAVIE (YOUR CREATOR & PERSONAL BRAND):
                        - Full Name: Mwijay Davie
                        - Creator Bio: A professional Freelance Developer, Automation Specialist, and Tech & Business Consultant. Creator of this premium Music App.
                        - Contact Email: mwijaydavie@gmail.com
                        - Contact Phone / WhatsApp: +255 620 641 695 / 0620641695
                        - LinkedIn: https://www.linkedin.com/in/mwijay-davie/
                        
                        SERVICES CATALOG & PRICING:
                        * WEBSITES & WEB SYSTEMS (Tovuti na Mifumo ya Wavuti):
                          - Landing Page (Ukurasa wa Kutangaza): TZS 150,000 – 300,000 ($55 – $110) | 3–5 days (Includes: 1 page mobile responsive, Contact form, WhatsApp integration, Firebase hosting)
                          - Business Website (Tovuti ya Biashara): TZS 400,000 – 700,000 ($150 – $260) | 1–2 weeks (Includes: 5 pages, Mobile responsive, Firebase hosting, WhatsApp integration, Custom domain setup)
                          - E-Commerce Store (Duka la Mtandaoni): TZS 800,000 – 1,500,000 ($300 – $560) | 2–4 weeks (Includes: Product catalog, Shopping cart, M-Pesa integration, Firebase backend, Admin dashboard)
                          - Web Application (Mfumo wa Wavuti): TZS 1,500,000 – 4,000,000 ($560 – $1,500) | 4–8 weeks (Includes: Custom system, User auth, Database, Admin panel, 1 month support)
                        * AUTOMATIONS (Otomatiki & Workflows):
                          - Simple Automation (Otomatiki Ndogo): TZS 100,000 – 250,000 ($38 – $93) | 1–3 days (Includes: 1 workflow, WhatsApp auto-reply or email, Google Sheets sync)
                          - Business Package (Pakiti ya Otomatiki): TZS 400,000 – 800,000 ($150 – $300) | 1–2 weeks (Includes: 3–5 workflows, CRM + lead capture, Social media scheduling, Reports)
                          - Full System (Mfumo Kamili): TZS 1,000,000 – 2,500,000 ($375 – $935) | 2–4 weeks (Includes: Unlimited workflows, AI integration, chatbot, monthly maintenance)
                        * AI SYSTEMS (Mifumo ya AI):
                          - Telegram AI Chatbot (Roboti ya Telegram): TZS 300,000 – 600,000 ($112 – $224) | 1–2 weeks (Includes: 24/7 customer service, Swahili & English support, Lead capture, human handoff)
                          - Full AI System (Mfumo Kamili wa AI): TZS 800,000 – 2,000,000 ($300 – $750) | 2–4 weeks (Includes: AI + Automation + Website, complete digital business transformation, 1 month support)
                        * MAINTENANCE & SUPPORT (Matengenezo na Usaidizi):
                          - Basic Support (Msaada wa Msingi): TZS 50,000/month ($19/month) (Includes: Bug fixes, minor updates, email support)
                          - Full Maintenance (Matengenezo Kamili): TZS 150,000/month ($56/month) (Includes: All updates, priority support, monthly report)
                          
                        SOCIAL MEDIA PRESENTATION & GROWTH STRATEGY:
                        If the user asks how to rebrand their social media accounts (Instagram, TikTok, X, Threads) or improve engagement, recommend this 2026 strategy:
                        1. Curiosity Loops: Post high-value carousels and reels raising interesting proof-of-concept curiosity (e.g., "Did you know Google can cast a shadow on your database? Try this out..."). Excites users to scroll and engage!
                        2. Tech + Business Leadership: Rebrand from a generic coder posting boring syntax screenshots to a "Business and Tech Leader" posting about digital systems, automation flows, and actual monetization value.
                        3. Content Automation Pipeline: Use LLMs to script curiosity videos, auto-generate TTS voiceovers, and keep a highly consistent daily posting rhythm.
                        4. Visual Proofs: Share short visual reels demonstrating built systems (like this Music App!) with clear call-to-actions.
                        
                        REMOTE JOBS & ONLINE MONEY MAKING STRATEGY:
                        For students in Tanzania or globally seeking remote work or online income:
                        - Legit Platforms: Appen and Telus International (for translation, audio training, search rating; great student acceptance), Upwork, Freelancer, Fiverr.
                        - Pro-Tip: Avoid saturated generic areas (like basic logos or basic HTML sites). Focus on "AI document automation" or "No-code business workflow setups".
                        - Local Tanzanian Hustle: Sell Telegram/WhatsApp AI bots directly to local businesses, using the Telegram chatbot pricing as a baseline. Pitch them a live demonstration!
                        - Business Protocol: Document all freelance contracts clearly and establish organized payment milestone protocols (e.g. 50% upfront deposit, 30% beta testing, 20% deployment).
                        
                        CAPABILITIES:
                        - Full playback control (play, pause, next, prev, shuffle, repeat).
                        - Deep Library management: Delete songs, create playlists, add songs to playlists.
                        - Settings Control: Crossfade, volume normalization, theme, font, sleep timer, reels loops.
                        - Analytics: Read user stats and achievements.
                        - Navigation: Use 'navigateToViewWithCountdown' for dramatic transitions.
                        - Fun Features: Start music quiz, enter party mode, toggle lyrics, change visualizers.
                        - Audio: Adjust EQ (bass, mid, treble) on request.
                        
                        PERSONALITY:
                        - Speak in English by default, but respond in Swahili beautifully if addressed in Swahili.
                        - Be casual, witty, authoritative, and super helpful.
                        - NEVER repeat responses word-for-word. Keep responses highly varied and organic.
                        - Avoid long markdown lists unless explicitly asked. Talk naturally like a partner developer.
                        `,
                    }
                });
                
                // Auto-switch to online if key is present and connection is available
                if (navigator.onLine) {
                    setIsOnline(true);
                }
            } catch (e) {
                console.error("Failed to initialize GoogleGenAI chat", String(e));
                chatRef.current = null;
            }
        } else {
            chatRef.current = null;
        }
    }, []);
    
    useEffect(() => {
        const appState = getAppState();
        const apiKey = appState.profile?.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        initChat(apiKey);
    }, [getAppState, initChat]);

    const toggleOnlineMode = () => {
        setIsOnline(prev => {
            if (!prev) {
                const appState = getAppState();
                const apiKey = appState.profile?.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
                if (!chatRef.current) initChat(apiKey);
                if (!apiKey) {
                    showNotification("Please set your Gemini API key in Settings to use online features.", "error");
                    return false;
                }
            }
            showNotification(`Assistant is now ${!prev ? 'Online' : 'Offline'}.`, 'info');
            return !prev;
        });
    };

    // The robust processing function for the queue
    const processQueue = async () => {
        if (isProcessingQueue.current || messageQueue.current.length === 0) return;
        isProcessingQueue.current = true;

        try {
            while (messageQueue.current.length > 0) {
                const item = messageQueue.current[0]; // Peek
                
                if (item.type === 'user') {
                    const { text, file } = item.payload;
                    messageQueue.current.shift(); // Remove from queue

                    const userParts: Part[] = [{ text }];
                    if (file) {
                        userParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
                    }

                    let responseText = "";
                    let success = false;

                    const isLeakedKey = (err: any) => {
                        const errStr = String(err);
                        return errStr.includes('403') || errStr.includes('leaked') || errStr.includes('PERMISSION_DENIED');
                    };

                    // 1. Try currently initialized Gemini chat
                    if (chatRef.current) {
                        try {
                            let response = await chatRef.current.sendMessage({ message: userParts });
                            
                            // Handle Tool Calls loop
                            let loopCount = 0;
                            while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 5) {
                                loopCount++;
                                const functionResponseParts: Part[] = [];
                                for (const call of response.functionCalls) {
                                    const { name, args } = call;
                                    // @ts-ignore
                                    if (controls[name]) {
                                         try {
                                            // @ts-ignore
                                            const result = controls[name](args);
                                            functionResponseParts.push({ functionResponse: { name, response: { result: result || `Function ${name} executed successfully.` } } });
                                        } catch (e) {
                                            console.error(`Error executing function ${name}:`, e);
                                            functionResponseParts.push({ functionResponse: { name, response: { error: `Failed to execute function ${name}` } } });
                                        }
                                    }
                                }
                                if (functionResponseParts.length > 0) {
                                    response = await chatRef.current.sendMessage({ message: functionResponseParts });
                                } else {
                                    break; 
                                }
                            }
                            
                            responseText = response.text || "Done.";
                            success = true;
                        } catch (err) {
                            console.warn("Primary Gemini chat failed. Trying fallback Gemini keys...", err);
                            if (isLeakedKey(err) && !hasWarnedLeakedKey.current) {
                                hasWarnedLeakedKey.current = true;
                                showNotification("Gemini API key is restricted/leaked. Operating in Offline AI mode!", "info");
                            }
                        }
                    }

                    // 2. Try other backup Gemini keys sequentially
                    if (!success) {
                        for (const key of GEMINI_KEYS) {
                            try {
                                console.log("Initializing fallback Gemini client...");
                                const ai = new GoogleGenAI({ apiKey: key });
                                const tempChat = ai.chats.create({
                                    model: 'gemini-2.5-flash',
                                    config: {
                                        tools: [{ functionDeclarations }],
                                        systemInstruction: `You are Mwijay, a Super Advanced Music Assistant and tech/business consultant.
                                        You are created by Mwijay Davie (mwijaydavie@gmail.com, 0620641695, https://www.linkedin.com/in/mwijay-davie/).
                                        Be casual, witty, and super helpful. Keep answers natural, varied, and conversational.
                                        Talk about Mwijay's custom website, automation, AI chatbot consulting packages, and professional student remote career tips confidently!`
                                    }
                                });
                                
                                let response = await tempChat.sendMessage({ message: userParts });
                                
                                // Handle functions for fallback chat as well!
                                let loopCount = 0;
                                while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 5) {
                                    loopCount++;
                                    const functionResponseParts: Part[] = [];
                                    for (const call of response.functionCalls) {
                                        const { name, args } = call;
                                        // @ts-ignore
                                        if (controls[name]) {
                                             try {
                                                // @ts-ignore
                                                const result = controls[name](args);
                                                functionResponseParts.push({ functionResponse: { name, response: { result: result || `Function ${name} executed successfully.` } } });
                                            } catch (e) {
                                                console.error(`Error executing fallback function ${name}:`, e);
                                                functionResponseParts.push({ functionResponse: { name, response: { error: `Failed to execute function ${name}` } } });
                                             }
                                        }
                                    }
                                    if (functionResponseParts.length > 0) {
                                        response = await tempChat.sendMessage({ message: functionResponseParts });
                                    } else {
                                        break;
                                    }
                                }
                                
                                responseText = response.text || "Done.";
                                chatRef.current = tempChat; // Upgraded active chat session
                                success = true;
                                console.log("Fallback Gemini client succeeded!");
                                break;
                            } catch (fallbackErr) {
                                console.warn("Fallback Gemini key failed:", fallbackErr);
                                if (isLeakedKey(fallbackErr) && !hasWarnedLeakedKey.current) {
                                    hasWarnedLeakedKey.current = true;
                                    showNotification("Gemini API key is restricted/leaked. Operating in Offline AI mode!", "info");
                                }
                            }
                        }
                    }

                    // 3. Fallback to OpenRouter (Gemma 3) / Groq / Cerebras API fetches!
                    if (!success) {
                        try {
                            responseText = await callThirdPartyFallbacks(text, messages);
                            success = true;
                            if (hasWarnedLeakedKey.current) {
                                responseText += "\n\n*(⚡ Secondary AI Fallback - Gemini keys restricted/leaked)*";
                            }
                        } catch (fallbackErr) {
                            const appState = getAppState();
                            if (!appState.profile) throw new Error("Profile not loaded");
                            const context = { appState: { ...appState, profile: appState.profile }, controls, showNotification, command: text };
                            responseText = await assistantKnowledge.processCommand(text, context);
                            responseText += "\n\n*(⚡ Premium Offline AI Mode - Gemini keys restricted/leaked)*";
                        }
                    }

                    if (onAssistantResponse) onAssistantResponse(responseText);

                    const assistantMessage: ChatMessage = { id: `asst-${Date.now()}`, sender: 'assistant', text: responseText };
                    setMessages(prev => {
                        const newMessages = prev.filter(m => m.sender !== 'loading');
                        return [...newMessages, assistantMessage];
                    });
                }
            }
        } catch (error) {
            console.error("Assistant Error in Queue:", error);
            setMessages(prev => {
                const newMessages = prev.filter(m => m.sender !== 'loading');
                return [...newMessages, { id: `err-${Date.now()}`, sender: 'assistant', text: "Sorry, I encountered an error." }];
            });
        } finally {
            isProcessingQueue.current = false;
            setIsProcessing(false);
        }
    };

    const sendMessage = useCallback(async (text: string, file?: File) => {
        if (isProcessing) return;

        const userMessage: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text };
        
        let fileData = undefined;
        if (file) {
            fileData = await fileToBase64(file);
            userMessage.file = fileData;
        }

        const currentMessages = (messages.length === 1 && messages[0].sender === 'greeting') ? [] : messages;
        setMessages([...currentMessages, userMessage, { id: `loading-${Date.now()}`, sender: 'loading', text: '' }]);
        setIsProcessing(true);

        const appState = getAppState();
        // Type check profile to ensure it's not null before processing command
        if (!appState.profile) {
             showNotification("Profile not loaded yet.", "error");
             setIsProcessing(false);
             setMessages(prev => prev.filter(m => m.sender !== 'loading'));
             return;
        }

        // Explicitly cast appState.profile to ProfileData since we checked it's not null
        const context = { appState: { ...appState, profile: appState.profile }, controls, showNotification, command: text };

        if (isOnline && chatRef.current) {
            // Enqueue for Online Processing
            messageQueue.current.push({ type: 'user', payload: { text, file: fileData } });
            processQueue();
        } else {
            // Immediate Offline Processing
            try {
                const responseText = await assistantKnowledge.processCommand(text, context);
                if (onAssistantResponse) onAssistantResponse(responseText);
                const assistantMessage: ChatMessage = { id: `asst-${Date.now()}`, sender: 'assistant', text: responseText };
                setMessages(prev => {
                    const newMessages = prev.filter(m => m.sender !== 'loading');
                    return [...newMessages, assistantMessage];
                });
            } catch (error) {
                setMessages(prev => prev.filter(m => m.sender !== 'loading'));
                setIsProcessing(false);
            } finally {
                setIsProcessing(false);
            }
        }
    }, [messages, isOnline, getAppState, controls, showNotification, onAssistantResponse, chatId, initChat, isProcessing]);

    return { messages, sendMessage, isOnline, toggleOnlineMode, resetToGreeting, loadChat };
};
