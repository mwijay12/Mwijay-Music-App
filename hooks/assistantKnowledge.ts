
import type { Song, ProfileData } from '../types.ts';
import { fonts, achievements } from '../constants.ts';

// --- Type definitions for the knowledge base ---
interface CommandContext {
    appState: {
        nowPlaying: Song | null;
        isPlaying: boolean;
        librarySongs: Song[];
        isSimpleMode: boolean;
        profile: ProfileData;
    };
    controls: {
        togglePlay: () => void;
        playNext: () => void;
        playPrev: () => void;
        setSimpleMode: (val: boolean) => void;
        playRadio: (query?: string) => void;
        toggleInputView: () => void;
        setThemeMode: (mode: 'light' | 'dark') => void;
        setSleepTimer: (mode: 'duration' | 'songs', value: number) => void;
        changeFont: (fontName: string) => void;
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
    };
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    command: string;
}

type ResponseGenerator = (context: CommandContext) => string | Promise<string>;

const commandAliases: Record<string, string> = {
    "play": "play music",
    "pause": "pause music",
    "stop": "stop music",
    "next": "next song",
    "previous": "previous song",
    "back": "previous song",
    "skip": "next song",
    "radio": "play radio",
    "what song is this": "what's playing",
    "what is this song": "what's playing",
    "what song is playing": "what's playing",
    "who is this": "what's playing",
    "current song": "what's playing",
    "show lyrics": "lyrics",
    "what are my achievements": "achievements",
    "show my achievements": "achievements",
    "how many achievements": "achievements",
    "top songs": "my top song",
    "my top songs": "my top song",
    "what is my top song": "my top song",
    "what music do I like": "my top song",
    "top artists": "analytics",
    "my stats": "analytics",
    "what is my listen time": "analytics",
    "show my stats": "analytics",
    "top radios": "analytics",
    "who are you": "about the developer",
    "who made this app": "about the developer",
    "who made you": "about the developer",
    "developer": "about the developer",
    "contact": "about the developer",
    "hello": "hi",
    "hey": "hi",
    "favorite": "favorite this song",
    "add to favorites": "favorite this song",
    "like this song": "favorite this song",
    "equalizer": "open equalizer",
    "audio effects": "open equalizer",
    "fx": "open equalizer",
    "ai playlist": "ai playlist",
    "play something i like": "ai playlist",
    "make a playlist for me": "ai playlist",
    "search online": "search online",
    "shuffle": "toggle shuffle",
    "repeat": "cycle repeat",
};

const findCommandMatch = (command: string): string | null => {
    const normalizedCommand = command.toLowerCase().trim();
    
    // Check for complex commands with arguments first
    if (normalizedCommand.startsWith("play ")) return "play song";
    if (normalizedCommand.startsWith("add ")) return "add to queue";
    if (normalizedCommand.startsWith("go to") || normalizedCommand.startsWith("navigate to") || normalizedCommand.startsWith("show me") || normalizedCommand.startsWith("open ")) return "navigate";
    if (normalizedCommand.startsWith("change font to")) return "change font";
    if (normalizedCommand.startsWith("set sleep timer")) return "set sleep timer";
    if (normalizedCommand.includes("background effect")) return "background effect";
    if (normalizedCommand.startsWith("search online for")) return "search online";
    
    // Check for exact matches and aliases
    if (assistantKnowledge.questions[normalizedCommand]) {
        return normalizedCommand;
    }
    if (commandAliases[normalizedCommand]) {
        return commandAliases[normalizedCommand];
    }
    
    // Check for keyword matches in the main knowledge base (less specific)
    const mainKeys = Object.keys(assistantKnowledge.questions);
    for (const key of mainKeys) {
        if (normalizedCommand.includes(key.toLowerCase())) {
            return key;
        }
    }
    
    // Check for aliases that might be part of a longer command
    for (const alias in commandAliases) {
        if (normalizedCommand.includes(alias)) {
            return commandAliases[alias];
        }
    }
    
    return null;
}


// --- Knowledge Base ---
export const assistantKnowledge: {
    questions: Record<string, ResponseGenerator>;
    developerInfo: (() => string)[];
    getFullAchievementName: (id: string) => string;
    processCommand: (text: string, context: CommandContext) => Promise<string>;
} = {
    questions: {
        "hi": ({ appState }) => `Hello ${appState.profile.name}! What can I help you with today?`,
        // --- Playback ---
        "play music": ({ controls, appState }) => {
            if (!appState.isPlaying) controls.togglePlay();
            return `▶️ Playing: ${appState.nowPlaying?.title || 'your music'}.`;
        },
        "pause music": ({ controls, appState }) => {
            if (appState.isPlaying) controls.togglePlay();
            return 'Music paused.';
        },
        "stop music": ({ controls, appState }) => {
            if (appState.isPlaying) controls.togglePlay();
            return 'Playback stopped.';
        },
        "next song": ({ controls }) => {
            controls.playNext();
            return 'Skipping to the next song.';
        },
        "previous song": ({ controls }) => {
            controls.playPrev();
            return 'Going back to the previous song.';
        },
        "toggle shuffle": ({ controls }) => {
            controls.toggleShuffle();
            return 'Toggled shuffle mode.';
        },
        "cycle repeat": ({ controls }) => {
            controls.cycleRepeat();
            return 'Changed repeat mode.';
        },
        "play radio": ({ controls, command }) => {
            const query = command.replace('play radio', '').trim();
            controls.playRadio(query || undefined);
            return query ? `Tuning into radio stations matching "${query}"...` : 'Playing a popular radio station for you.';
        },
        "play song": ({ controls, command }) => {
            const songTitle = command.replace('play', '').trim();
            controls.playSongFromLibrary(songTitle);
            return `Searching your library for "${songTitle}"...`;
        },
        "add to queue": ({ controls, command }) => {
            const songTitle = command.replace('add', '').replace('to queue', '').trim();
            controls.addToQueue(songTitle);
            return `Okay, I'll add "${songTitle}" to the queue.`;
        },

        // --- Information ---
        "what's playing": ({ appState }) => {
            if (appState.nowPlaying) {
                return `You're listening to "${appState.nowPlaying.title}" by ${appState.nowPlaying.artist}.`;
            }
            return "Nothing is playing right now.";
        },
        "my top song": ({ appState }) => {
            const topSong = appState.profile.analytics.topSongs[0];
            if (topSong) {
                return `Your most played song is "${topSong.title}" by ${topSong.artist}, with ${topSong.playCount} plays!`;
            }
            return "You don't have a top song yet. Keep listening!";
        },
        "analytics": ({ appState }) => {
            const { listenTime, songsPlayed, topArtists } = appState.profile.analytics;
            const hours = Math.floor(listenTime / 3600);
            const topArtist = topArtists[0];
            return `You've listened for over ${hours} hours and played ${songsPlayed} songs. Your favorite artist seems to be ${topArtist ? topArtist.name : 'undetermined'}. You can see more details in your Profile.`;
        },
        "achievements": ({ appState }) => {
            const total = achievements.length;
            const unlocked = appState.profile.unlockedAchievements.length;
            return `You've unlocked ${unlocked} out of ${total} achievements. You can view them all from your Profile page.`;
        },

        // --- UI & Settings ---
        "simple mode": ({ controls, appState }) => {
            controls.setSimpleMode(!appState.isSimpleMode);
            return `Okay, turning Simple Mode ${!appState.isSimpleMode ? 'on' : 'off'}.`;
        },
        "light theme": ({ controls }) => {
            controls.setThemeMode('light');
            return 'Switched to light theme.';
        },
        "dark theme": ({ controls }) => {
            controls.setThemeMode('dark');
            return 'Switched to dark theme.';
        },
        "change font": ({ command, controls }) => {
            const requestedFont = command.replace('change font to', '').trim();
            const foundFont = fonts.find(f => f.name.toLowerCase() === requestedFont.toLowerCase());
            if (foundFont) {
                controls.changeFont(foundFont.name);
                return `Font changed to ${foundFont.name}.`;
            }
            return `I couldn't find a font called "${requestedFont}".`;
        },
        "set sleep timer": ({ command, controls }) => {
            const parts = command.split(' ');
            const valueIndex = parts.findIndex(p => !isNaN(parseInt(p)));
            if (valueIndex === -1) return "Please specify a duration (e.g., '15 minutes') or number of songs.";
            
            const value = parseInt(parts[valueIndex]);
            if (command.includes('song')) {
                controls.setSleepTimer('songs', value);
                return `Okay, music will stop after ${value} songs.`;
            } else {
                controls.setSleepTimer('duration', value);
                return `Okay, sleep timer set for ${value} minutes.`;
            }
        },
        "navigate": ({ command, controls }) => {
            const viewName = command.replace(/go to|navigate to|show me|open/g, '').trim();
            const validViews = ['home', 'library', 'reels', 'radio', 'settings', 'explore', 'profile', 'create', 'analytics', 'help'];
            if (validViews.includes(viewName)) {
                const capitalizedView = viewName.charAt(0).toUpperCase() + viewName.slice(1);
                controls.navigateToView(capitalizedView);
                return `Navigating to ${capitalizedView}.`;
            }
            return `I can't navigate to "${viewName}". Try one of: Home, Library, Reels, etc.`;
        },

        // --- Features ---
        "ai playlist": () => 'Creating AI playlists requires an internet connection. Please switch to Online Mode in the assistant.',
        "search online": ({ command, controls: _controls }) => {
             const query = command.replace('search online for', '').trim();
            if (query) {
                 return 'Online search requires an internet connection. Please switch to Online Mode.';
            }
             return 'Online search requires an internet connection. Please switch to Online Mode.';
        },
        "favorite this song": ({ controls, appState }) => {
            if (appState.nowPlaying) {
                controls.toggleFavorite();
                return 'Done! I updated your favorites.';
            }
            return 'A song needs to be playing to add it to your favorites.';
        },
        "open equalizer": ({ controls, appState }) => {
            if (appState.nowPlaying) {
                controls.openAudioEffects();
                return 'Opening the Audio FX panel.';
            }
            return 'You need to be playing a song to open the audio effects.';
        },
        "background effect": ({ command, controls }) => {
            const styles: ProfileData['settings']['backgroundEffects']['style'][] = ['constellationDrift', 'spiritRise', 'warpPulse', 'fallingNotes', 'cosmicDust', 'fireflies', 'bubbles', 'hexPulse', 'stardust', 'energyFlow', 'polygons'];
            const styleMatch = styles.find(s => command.toLowerCase().includes(s.toLowerCase()));

            if (styleMatch) {
                controls.setBackgroundEffect(true, styleMatch);
                return `Background effect set to ${styleMatch}.`;
            }
            if (command.includes("on")) {
                controls.setBackgroundEffect(true);
                return 'Okay, background effects are on.';
            }
            if (command.includes("off")) {
                controls.setBackgroundEffect(false, 'none');
                return 'Background effects turned off.';
            }
            return "I can turn background effects 'on' or 'off', or set a style like 'cosmic dust'. What would you like to do?";
        },

        // --- Meta ---
        "about the developer": () => {
            return `I was created by Mwijay, a developer from Tanzania! You can find his contact info on the Profile page.`;
        },
        "help": () => {
            return "You can ask me to play music, change themes, or tell you what's playing. Try saying 'play some radio' or 'switch to light theme'. You can find more commands on the Help screen in your Profile.";
        },
    },

    developerInfo: [
        () => `Mwijay is a developer from Tanzania 🇹🇿`,
        () => `The app is built with React, TypeScript, and Tailwind CSS.`,
        () => `For comments or to say hi: mwijaydavie@gmail.com`,
    ],

    getFullAchievementName: (id: string) => {
        return achievements.find(a => a.id === id)?.name || "an unknown achievement";
    },

    processCommand: async (text: string, context: CommandContext): Promise<string> => {
        const matchedCommand = findCommandMatch(text);

        if (matchedCommand && assistantKnowledge.questions[matchedCommand]) {
            try {
                const response = await Promise.resolve(assistantKnowledge.questions[matchedCommand](context));
                return response;
            } catch (error) {
                console.error("Error processing command:", error);
                return "I ran into a problem trying to do that.";
            }
        }
        
        return "Sorry, I'm not sure how to help with that. Try asking me to 'play music' or ask 'what's playing?'. For more, check the Help section in your Profile.";
    },
};
