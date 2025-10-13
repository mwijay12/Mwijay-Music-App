


import React from 'react';
import SettingsToggle from './SettingsToggle.tsx';
import type { ProfileData } from '../types.ts';


interface AssistantSettingsViewProps {
    onBack: () => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
}

const CommandCategory: React.FC<{ title: string; commands: { command: string, description: string }[] }> = ({ title, commands }) => (
    <div className="bg-[var(--surface-color)] p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{title}</h2>
        <div className="space-y-3">
            {commands.map(({ command, description }) => (
                <div key={command} className="border-b border-[var(--surface-border-color)] pb-3 last:border-b-0 last:pb-0">
                    <p className="font-mono text-sm text-[var(--primary-accent)]">"{command}"</p>
                    <p className="text-sm text-neutral-300 mt-1">{description}</p>
                </div>
            ))}
        </div>
    </div>
);

const AssistantSettingsView: React.FC<AssistantSettingsViewProps> = ({ onBack, profile, onUpdateProfile }) => {

    const commandList = {
        "Playback Control": [
            { command: "play music / pause music", description: "Toggles playback of the current track." },
            { command: "next song / skip", description: "Skips to the next song in the queue." },
            { command: "previous song / back", description: "Goes back to the previous song." },
            { command: "play radio", description: "Starts a random popular radio station." },
        ],
        "Information & General": [
            { command: "what's playing?", description: "Tells you the current song and artist." },
            { command: "how do I [feature]?", description: "Explains how to use features like the equalizer or reels." },
            { command: "show my top songs", description: "Gives a summary of your listening habits." },
            { command: "who are you?", description: "Shares info about the app and its developer." },
            { command: "analyze this image", description: "(Online Mode) Upload an image and ask a question about it." },
        ],
        "UI & Settings Control (Online Mode)": [
            { command: "enable simple mode", description: "Switches to the high-contrast Wisdom Card UI." },
            { command: "light theme / dark theme", description: "Toggles between light and dark visual modes." },
            { command: "I want a pink theme", description: "Generates and applies a custom color theme based on your description." },
            { command: "change font to [font name]", description: "Example: \"change font to Inter\"" },
            { command: "set sleep timer for [x] minutes/songs", description: "e.g., \"set sleep timer for 3 songs\"." },
        ],
    };
    
    const handleVoiceToggle = () => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                assistantVoice: {
                    ...p.settings.assistantVoice,
                    enabled: !p.settings.assistantVoice.enabled
                }
            }
        }));
    };

    return (
        <main className="h-full w-full home-gradient-bg overflow-y-auto scroll-container p-6 pb-40">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-2xl" aria-label="Back to Settings"><i className="fas fa-arrow-left"></i></button>
                <div>
                    <h1 className="text-3xl font-bold">Mwijay Assistant Prompts</h1>
                    <p className="text-neutral-400">Here's what you can ask Mwijay.</p>
                </div>
            </header>

            <div className="space-y-6">
                <div className="bg-[var(--surface-color)] p-4 rounded-2xl">
                     <SettingsToggle 
                        label="Enable Assistant Voice (TTS)" 
                        description="Let the assistant speak its responses out loud." 
                        isChecked={profile.settings.assistantVoice.enabled} 
                        onToggle={handleVoiceToggle} 
                    />
                </div>
                {Object.entries(commandList).map(([category, commands]) => (
                    <CommandCategory key={category} title={category} commands={commands} />
                ))}
            </div>
        </main>
    );
};

export default AssistantSettingsView;