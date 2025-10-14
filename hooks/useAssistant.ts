declare var process: any;
import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import type { ChatMessage, Song, ProfileData } from '../types.ts';
import { assistantKnowledge } from './assistantKnowledge.ts';
import { fonts } from '../constants.ts';

// Helper to convert File to base64
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
    profile: ProfileData;
}

interface AppControls {
    togglePlay: () => void;
    playNext: () => void;
    playPrev: () => void;
    setSimpleMode: (val: boolean) => void;
    playRadio: (query?: string) => void;
    toggleInputView: () => void;
    setThemeMode: (mode: 'light' | 'dark') => void;
    setSleepTimer: (mode: 'duration' | 'songs', value: number) => void;
    changeFont: (fontName: string) => void;
    applyCustomTheme: (colors: ProfileData['customThemeColors']) => void;
    toggleFavorite: () => void;
    playSongFromLibrary: (songTitle: string) => void;
    addToQueue: (songTitle: string) => void;
    navigateToView: (viewName: string) => void;
    openAudioEffects: () => void;
    setBackgroundEffect: (enabled: boolean, style?: ProfileData['settings']['backgroundEffects']['style']) => void;
    searchOnlineMusic: (query: string) => void;
    playAiPlaylist: () => void;
    toggleShuffle: () => void;
    cycleRepeat: () => void;
}

interface UseAssistantProps {
    getAppState: () => AppState;
    controls: AppControls;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

// --- Gemini Tools Definition ---
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'togglePlayPause',
    description: 'Plays or pauses the music. Use this if the user asks to play, pause, or stop the music.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'playNext',
    description: 'Skips to the next song in the queue or playlist.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'playPrevious',
    description: 'Goes back to the previous song.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'playRadio',
    description: 'Tunes into a radio station. If a genre or search term is provided, it will search for that. Otherwise, it plays a random popular station.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { 
          type: Type.STRING, 
          description: 'The genre, country, or name of the station to search for. e.g., "rock", "afrobeats gospel", "BBC Radio 1"' 
        }
      }
    }
  },
  {
    name: 'setSimpleMode',
    description: 'Enables or disables the simplified "Sound Vibe" UI.',
    parameters: {
      type: Type.OBJECT,
      properties: { enabled: { type: Type.BOOLEAN, description: 'Whether to enable or disable simple mode.' } },
      required: ['enabled']
    }
  },
  {
    name: 'setThemeMode',
    description: 'Switches the app\'s visual theme.',
    parameters: {
      type: Type.OBJECT,
      properties: { mode: { type: Type.STRING, description: 'The theme to switch to, either "light" or "dark".' } },
      required: ['mode']
    }
  },
  {
    name: 'setSleepTimer',
    description: 'Sets a timer to stop music playback after a certain duration or number of songs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, description: 'The type of timer, either "duration" (for minutes) or "songs".' },
        value: { type: Type.NUMBER, description: 'The number of minutes or songs.' }
      },
      required: ['mode', 'value']
    }
  },
  {
    name: 'changeFont',
    description: 'Changes the main application font.',
    parameters: {
      type: Type.OBJECT,
      properties: { fontName: { type: Type.STRING, description: `The name of the font to switch to. Must be one of: ${fonts.map(f => f.name).join(', ')}` } },
      required: ['fontName']
    }
  },
   {
    name: 'setCustomTheme',
    description: 'Applies a new custom color theme based on a color description provided by the user.',
    parameters: {
      type: Type.OBJECT,
      properties: { 
        colorDescription: { 
          type: Type.STRING, 
          description: 'A description of the desired color theme, e.g., "pink", "a calming ocean blue", "dark and fiery red".' 
        }
      },
      required: ['colorDescription']
    }
  },
  {
    name: 'toggleFavorite',
    description: 'Adds or removes the currently playing song from the user\'s favorites list.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'playSongFromLibrary',
    description: 'Searches the user\'s library for a song by its title and plays it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        songTitle: { type: Type.STRING, description: 'The title of the song to search for and play.' }
      },
      required: ['songTitle']
    }
  },
  {
    name: 'addToQueue',
    description: 'Searches the user\'s library for a song by its title and adds it to the end of the play queue.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        songTitle: { type: Type.STRING, description: 'The title of the song to search for and add to the queue.' }
      },
      required: ['songTitle']
    }
  },
  {
    name: 'navigateToView',
    description: 'Navigates to a specific screen or view within the app.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        viewName: { type: Type.STRING, description: 'The name of the view to navigate to. Must be one of: Home, Library, Reels, Radio, Settings, Explore, Profile, Create.' }
      },
      required: ['viewName']
    }
  },
  {
    name: 'openAudioEffects',
    description: 'Opens the Audio FX panel, which includes the equalizer, reverb, and other sound settings for the currently playing song.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'setBackgroundEffect',
    description: 'Changes the ambient background animation.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN, description: 'Turn the effect on or off.' },
            style: { type: Type.STRING, description: "Optional. The style of effect. One of: none, constellationDrift, spiritRise, warpPulse, fallingNotes, cosmicDust, fireflies, bubbles, hexPulse, stardust, energyFlow, polygons" }
        },
        required: ['enabled']
    }
  },
   {
    name: 'searchOnlineMusic',
    description: 'Searches online sources for songs by a specific artist or title. Use this to find music not in the user\'s local library.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The artist name or song title to search for online.' }
      },
      required: ['query']
    }
  },
  {
    name: 'playAiPlaylist',
    description: 'Generates a new playlist based on the user\'s listening history and starts playing it. Use this for general requests like "play something I would like" or "make a playlist for me".',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'toggleShuffle',
    description: 'Toggles shuffle mode for the current playlist or queue.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'cycleRepeatMode',
    description: 'Cycles through repeat modes: none, repeat all, and repeat one.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
];


export const useAssistant = ({ getAppState, controls, showNotification }: UseAssistantProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualOffline, setIsManualOffline] = useState(false);
    const chatHistoryRef = useRef<any[]>([]);
    const aiRef = useRef<GoogleGenAI | null>(null);

    // Initialize Gemini AI
    useEffect(() => {
        // FIX: Use process.env.API_KEY as per Gemini API guidelines.
        const apiKey = process.env.API_KEY;
        if (apiKey) {
            try {
                aiRef.current = new GoogleGenAI({ apiKey });
            } catch(e) {
                console.error("Failed to initialize GoogleGenAI:", String(e));
            }
        }
    }, []);

    // Listen to online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true && !isManualOffline);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isManualOffline]);

    const toggleOnlineMode = () => {
        const newManualState = !isManualOffline;
        setIsManualOffline(newManualState);
        setIsOnline(navigator.onLine && !newManualState);
        showNotification(newManualState ? 'Switched to Local Assistant' : 'Switched to Online Assistant', 'info');
    };

    const addMessage = (sender: ChatMessage['sender'], text: string, file?: ChatMessage['file']) => {
        setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), sender, text, file }]);
    };
    
    const generateThemeColors = async (colorDescription: string): Promise<{primary: string, secondary: string, accent: string} | null> => {
        if (!aiRef.current) return null;
        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Generate a web color theme palette based on the description: "${colorDescription}".
                The palette must have three colors: a vibrant primary accent, a complementary secondary color, and a tertiary accent.
                Provide the response as a JSON object with keys "primary", "secondary", and "accent", with hex color codes as values.
                Example for "ocean blue": {"primary": "#3498db", "secondary": "#2980b9", "accent": "#85c1e9"}.
                Only return the JSON object, nothing else.`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            primary: { type: Type.STRING, description: "Primary hex color, e.g., #C8F052" },
                            secondary: { type: Type.STRING, description: "Secondary hex color, e.g., #A050FF" },
                            accent: { type: Type.STRING, description: "Tertiary accent hex color, e.g., #6955FF" },
                        },
                        required: ["primary", "secondary", "accent"],
                    }
                }
            });
            const jsonText = (response.text ?? '').trim();
            try {
                const colors = JSON.parse(jsonText);
                return colors;
            } catch (e) {
                console.error("Color generation failed: could not parse JSON.", String(e), "Received:", jsonText);
                return null;
            }
        } catch (e) {
            console.error("Color generation failed:", String(e));
            return null;
        }
    };

    const sendMessage = useCallback(async (text: string, file?: File) => {
        if (!text.trim() && !file) return;

        let fileData: { data: string; mimeType: string; } | undefined;
        if (file) {
            try {
                fileData = await fileToBase64(file);
            } catch (error) {
                showNotification('Could not read the file.', 'error');
                return;
            }
        }

        addMessage('user', text, fileData);
        addMessage('loading', '...');
        
        const isGeminiAvailable = isOnline && !isManualOffline && aiRef.current;
        
        if (isGeminiAvailable) {
            try {
                const { nowPlaying, isPlaying, profile, librarySongs } = getAppState();
                
                const currentSongInfo = nowPlaying ? `The current song is "${nowPlaying.title}" by "${nowPlaying.artist}". Music is currently ${isPlaying ? 'playing' : 'paused'}.` : "No song is currently playing.";
                const topSong = profile.analytics.topSongs?.[0];
                const topSongInfo = topSong ? `The user's top song is '${topSong.title}' by '${topSong.artist}'.` : '';
                const topArtist = profile.analytics.topArtists?.[0];
                const topArtistInfo = topArtist ? `Their top artist is ${topArtist.name}.` : '';
                const themeInfo = `The user is using the '${profile.activeThemePair}' theme in ${profile.themeMode} mode, with the '${profile.activeFont}' font.`;
                const libraryInfo = `The user has ${librarySongs.length} songs in their library.`;

                const systemContext = `---
**Current User & App Context:**
*   **Playback:** ${currentSongInfo}
*   **User Taste:** ${topSongInfo} ${topArtistInfo}
*   **Preferences:** ${themeInfo} Simple Mode is ${profile.settings.simpleMode.enabled ? 'ON' : 'OFF'}.
*   **Library:** ${libraryInfo}
---`;
                
                const systemInstruction = `You are Mwijay Assistant, a brilliant and helpful AI integrated into the Mwijay Music app. Your personality is cool, friendly, and knowledgeable about music.

Your two primary capabilities are:
1.  **Answering Questions**: When a user asks "how to do something" or a general knowledge question (e.g., "what is my top song?"), provide a clear, helpful text response. **Use the 'Current User & App Context' provided above to answer these questions accurately.**
2.  **Controlling the App**: When a user asks you TO DO something (e.g., "play music", "change the theme", "search online for..."), you MUST prioritize calling the appropriate function from your tools. Do not ask for confirmation; just perform the action.

${systemContext}

**Mwijay Music App Knowledge Base:**

*   **My Library**: User's personal collection of uploaded audio. You can control playback, search for songs with \`playSongFromLibrary\`, add to queue with \`addToQueue\`, and favorite the current song with \`toggleFavorite\`. To add songs, the user must use the 'Upload' button in the 'Library' view.
*   **Explore Online**: Users can search for music from free online sources (Jamendo, Audius, Archive.org). You can trigger this with the \`searchOnlineMusic\` tool. You can also generate an AI playlist based on their taste with \`playAiPlaylist\`.
*   **Live Radio**: Access to thousands of live stations. Use the 'playRadio' tool to start a station, randomly or by search. You can also create a radio station based on a library playlist.
*   **Reels**: A short-form video player. Player gestures include double-tap in the center to play/pause and hold on the sides to seek. You can explain this but cannot control it.
*   **Audio FX Panel**: Found via the sliders icon in the full-screen player, or by asking you to \`openAudioEffects\`. It includes a 5-band Equalizer, Maximizer (bass/volume), Reverb, Creative effects (tempo/filter), and a Metronome.
*   **Appearance & Navigation**:
    *   **Themes, Fonts, Custom Colors**: Change these via your tools (\`setThemeMode\`, \`changeFont\`, \`setCustomTheme\`). The user can also find these settings in their Profile.
    *   **Background Effects**: Add subtle animated backgrounds like 'Cosmic Dust' or 'Stardust'. Controllable via \`setBackgroundEffect\` or in Settings.
    *   **Dynamic Theming**: An option in Profile that matches the app's accent color to the current song's cover art.
    *   **Simple Mode**: A simplified "Sound Vibe" UI. Use \`setSimpleMode\` to toggle it.
    *   **Navigation**: You can switch views for the user with \`navigateToView\`. Valid views are: Home, Library, Reels, Radio, Settings, Explore, Profile, Create.
*   **Creative Tools**:
    *   **Ringtone Maker**: In the song details modal (from Library), users can trim any local song to create a ringtone. You can't do this for them, but you can explain how.
    *   **Share Preview**: From song details, users can create an animated social media story.
    *   **Artist Pages**: Artist names are clickable. Users can edit artist bios and images on their pages.
*   **Developer Info**: The app was made by Mwijay in Tanzania. Contact: Phone: +255 620 275 540, WhatsApp: +255 645 484 78, IG: @mwijay.davie.
---
**CRITICAL INSTRUCTION**: Prioritize using tools for direct commands. Provide text answers for "how-to" questions or information requests based on the provided context.
- "play blinding lights" -> \`playSongFromLibrary\` with \`songTitle: "blinding lights"\`
- "search online for limoblaze" -> \`searchOnlineMusic\` with \`query: "limoblaze"\`
- "play something I'd like" -> \`playAiPlaylist\`
- "open the equalizer" -> \`openAudioEffects\`
- "go to my library" -> \`navigateToView\` with \`viewName: "Library"\`
- "how do I share a song?" -> Explain the 'Share Preview' feature from the song details modal.
- "what is my top song?" -> Answer using the provided context.`;


                const userParts: any[] = [];
                if (text) userParts.push({ text });
                if (fileData) userParts.push({ inlineData: { mimeType: fileData.mimeType, data: fileData.data } });

                chatHistoryRef.current.push({ role: 'user', parts: userParts });

                const response = await aiRef.current!.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: chatHistoryRef.current,
                    config: {
                        tools: [{ functionDeclarations }],
                        systemInstruction,
                    }
                });

                setMessages(prev => prev.filter(m => m.sender !== 'loading'));
                
                let assistantResponseText = "An unexpected error occurred.";

                if (response.functionCalls && response.functionCalls.length > 0) {
                    let confirmationText = "Done!";
                    for (const fc of response.functionCalls) {
                        switch (fc.name) {
                            case 'togglePlayPause':
                                controls.togglePlay();
                                confirmationText = `Okay, ${getAppState().isPlaying ? 'pausing' : 'playing'} the music.`;
                                break;
                            case 'playNext':
                                controls.playNext();
                                confirmationText = "Skipping to the next track.";
                                break;
                            case 'playPrevious':
                                controls.playPrev();
                                confirmationText = "Going back to the previous track.";
                                break;
                            case 'toggleShuffle':
                                controls.toggleShuffle();
                                confirmationText = "Toggled shuffle mode.";
                                break;
                            case 'cycleRepeatMode':
                                controls.cycleRepeat();
                                confirmationText = "Changed repeat mode.";
                                break;
                            case 'playRadio':
                                const query = fc.args?.query as string | undefined;
                                controls.playRadio(query);
                                confirmationText = query ? `Searching for "${query}" radio...` : "Tuning into a random station for you!";
                                break;
                            case 'searchOnlineMusic':
                                const searchQuery = (fc.args?.query as string) ?? '';
                                controls.searchOnlineMusic(searchQuery);
                                confirmationText = `Okay, searching online for "${searchQuery}"...`;
                                break;
                            case 'setSimpleMode':
                                const enableSimple = (fc.args?.enabled as boolean) ?? false;
                                controls.setSimpleMode(enableSimple);
                                confirmationText = `Simple Mode has been ${enableSimple ? 'enabled' : 'disabled'}.`;
                                break;
                            case 'setThemeMode':
                                const mode = (fc.args?.mode as 'light' | 'dark') ?? 'dark';
                                controls.setThemeMode(mode);
                                confirmationText = `Switched to ${mode} theme!`;
                                break;
                            case 'setSleepTimer':
                                const timerMode = (fc.args?.mode as 'duration' | 'songs') ?? 'duration';
                                const timerValue = (fc.args?.value as number) ?? 0;
                                controls.setSleepTimer(timerMode, timerValue);
                                confirmationText = `Okay, sleep timer set for ${timerValue} ${timerMode === 'duration' ? 'minutes' : 'songs'}.`;
                                break;
                            case 'changeFont':
                                const fontName = (fc.args?.fontName as string) ?? '';
                                controls.changeFont(fontName);
                                confirmationText = `Font changed to ${fontName}.`;
                                break;
                            case 'setCustomTheme':
                                const colorDesc = (fc.args?.colorDescription as string) ?? '';
                                addMessage('assistant', `One moment, creating a new ${colorDesc} theme for you...`);
                                generateThemeColors(colorDesc).then(colors => {
                                    if (colors) {
                                        controls.applyCustomTheme(colors);
                                        addMessage('assistant', `✨ All done! Enjoy your new ${colorDesc} theme.`);
                                    } else {
                                        addMessage('assistant', `I couldn't generate a theme for "${colorDesc}". Please try another color.`);
                                    }
                                });
                                // Prevent default confirmation text for this async operation
                                confirmationText = '';
                                break;
                            case 'toggleFavorite':
                                controls.toggleFavorite();
                                confirmationText = `Okay, I've updated your favorites.`;
                                break;
                            case 'playSongFromLibrary':
                                const songTitleToPlay = (fc.args?.songTitle as string) ?? '';
                                controls.playSongFromLibrary(songTitleToPlay);
                                confirmationText = `Searching your library for "${songTitleToPlay}"...`;
                                break;
                            case 'addToQueue':
                                const songTitleToQueue = (fc.args?.songTitle as string) ?? '';
                                controls.addToQueue(songTitleToQueue);
                                confirmationText = `Adding "${songTitleToQueue}" to the queue.`;
                                break;
                            case 'navigateToView':
                                const viewName = (fc.args?.viewName as string) ?? '';
                                controls.navigateToView(viewName);
                                confirmationText = `Navigating to ${viewName}.`;
                                break;
                            case 'openAudioEffects':
                                controls.openAudioEffects();
                                confirmationText = "Opening the Audio FX panel.";
                                break;
                            case 'setBackgroundEffect':
                                const enabled = (fc.args?.enabled as boolean) ?? false;
                                const style = fc.args?.style as ProfileData['settings']['backgroundEffects']['style'] | undefined;
                                controls.setBackgroundEffect(enabled, style);
                                confirmationText = style ? `Set background effect to ${style}.` : `Background effects turned ${enabled ? 'on' : 'off'}.`;
                                break;
                            case 'playAiPlaylist':
                                controls.playAiPlaylist();
                                confirmationText = "🤖 Creating a personalized playlist for you now...";
                                break;
                            default:
                                confirmationText = "Sorry, I can't do that right now.";
                        }
                    }
                    assistantResponseText = response.text ?? confirmationText;
                } else {
                    assistantResponseText = response.text ?? '';
                }

                if (assistantResponseText) {
                    chatHistoryRef.current.push({ role: 'model', parts: [{ text: assistantResponseText }] });
                    addMessage('assistant', assistantResponseText);
                }

            } catch (error) {
                 console.error("Gemini API Error:", String(error));
                 const errorMessage = "I'm having trouble connecting to my online brain right now. Switching to local mode. Please try again.";
                 setMessages(prev => {
                    const newMessages = prev.filter(m => m.sender !== 'loading');
                    return [...newMessages, { id: Date.now().toString(), sender: 'assistant', text: errorMessage }];
                });
                // Fallback to offline mode
                setIsManualOffline(true);
                setIsOnline(false);
            }
        } else {
            // --- Offline Mode ---
            const context = {
                appState: getAppState(),
                controls,
                showNotification,
                command: text.toLowerCase(),
            };
            const response = await assistantKnowledge.processCommand(text, context);
            setTimeout(() => {
                setMessages(prev => {
                    const newMessages = prev.filter(m => m.sender !== 'loading');
                    return [...newMessages, { id: Date.now().toString(), sender: 'assistant', text: response }];
                });
            }, 500 + Math.random() * 500);
        }

    }, [isOnline, isManualOffline, getAppState, controls, showNotification]);

    return {
        messages,
        sendMessage,
        isOnline: isOnline && !isManualOffline,
        toggleOnlineMode,
    };
};