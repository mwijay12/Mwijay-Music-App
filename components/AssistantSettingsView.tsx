
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import SettingsToggle from './SettingsToggle.tsx';
import CollapsibleSection from './CollapsibleSection.tsx';
import { TTS_VOICES } from '../constants.ts';

interface AssistantSettingsViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onBack: () => void;
}

const CommandCategory: React.FC<{ commands: { command: string, description: string }[] }> = ({ commands }) => (
    <div className="space-y-3">
        {commands.map(({ command, description }) => (
            <div key={command} className="border-b border-[var(--surface-border-color)] pb-3 last:border-b-0 last:pb-0">
                <p className="font-mono text-sm text-[var(--primary-accent)]">"{command}"</p>
                <p className="text-sm text-neutral-300 mt-1">{description}</p>
            </div>
        ))}
    </div>
);

const AssistantSettingsView: React.FC<AssistantSettingsViewProps> = ({ profile, onUpdateProfile, onBack }) => {

    const handleUpdate = <K extends keyof ProfileData['settings']['assistant']>(key: K, value: ProfileData['settings']['assistant'][K]) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                assistant: {
                    ...p.settings.assistant,
                    [key]: value
                }
            }
        }));
    };

    const handleToggleCollapse = (section: string) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                collapsedSections: {
                    ...p.settings.collapsedSections,
                    [section]: !p.settings.collapsedSections[section],
                }
            }
        }));
    };

    const commandList = {
        "Playback Control": [
            { command: "play / pause / stop music", description: "Toggles playback of the current track." },
            { command: "next / skip song", description: "Skips to the next song in the queue." },
            { command: "previous / back", description: "Goes back to the previous song." },
            { command: "toggle shuffle", description: "Turns shuffle mode on or off." },
            { command: "repeat song / repeat all", description: "Cycles through repeat modes." },
            { command: "favorite this song", description: "Adds or removes the current song from your favorites." },
        ],
        "Library & Radio": [
            { command: "play [song name]", description: "Searches your library and plays a song." },
            { command: "add [song name] to queue", description: "Adds a song from your library to the queue." },
            { command: "scan for media", description: "Scans your device for new music and video files." },
            { command: "play radio [genre/station]", description: "Starts a radio station. (Online connection is required to find new stations)." },
            { command: "create playlist [name]", description: "Creates a new playlist with the given name (e.g. 'Create playlist Vibes')." },
            { command: "add [song] to playlist [name]", description: "Adds a song to a specific playlist (e.g. 'Add Hello to playlist Vibes')." },
        ],
         "UI & Settings Control": [
            { command: "enable / disable simple mode", description: "Switches to the high-contrast Wisdom Card UI." },
            { command: "light theme / dark theme", description: "Toggles between light and dark visual modes." },
            { command: "change theme to [name]", description: "Applies a specific theme (e.g. 'Change theme to Cyber Punch')." },
            { command: "change font to [font name]", description: "Example: \"change font to Inter\"" },
            { command: "set sleep timer for [x] minutes/songs", description: "e.g., \"set sleep timer for 3 songs\"." },
            { command: "go to [page name]", description: "Navigates to a specific page, e.g., 'go to library'." },
            { command: "open audio effects / equalizer", description: "Opens the Audio FX panel for the current song." },
        ],
        "Information & General": [
            { command: "what's playing?", description: "Tells you the current song and artist." },
            { command: "how do I [feature]?", description: "Explains how to use features like the ringtone maker or reels." },
            { command: "show my top songs", description: "Gives a summary of your listening habits." },
            { command: "who are you?", description: "Shares info about the app and its developer." },
        ],
         "Online-Only Features": [
            { command: "I want a pink theme", description: "Generates and applies a custom color theme based on your description." },
            { command: "search online for [artist/song]", description: "Finds new music from online sources to stream or download." },
            { command: "play an AI playlist", description: "Creates a new playlist for you based on your taste." },
            { command: "analyze this image", description: "Upload an image and ask a question about it." },
        ],
    };
    
    const personalities: ProfileData['settings']['assistant']['personality'][] = ['friendly', 'witty', 'professional', 'concise'];

    return (
        <main className="h-full w-full home-gradient-bg overflow-y-auto scroll-container p-6 pb-40">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-2xl" aria-label="Back to Settings"><ArrowLeft size={24} /></button>
                <div>
                    <h1 className="text-2xl font-bold">Mwijay Assistant</h1>
                    <p className="text-neutral-400">Customize your AI experience</p>
                </div>
            </header>

            <div className="space-y-6">
                 <div className="liquid-glass-pane p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">AI Customization</h2>
                    <div className="space-y-4">
                        <SettingsToggle label="Audible Welcome Greeting" isChecked={profile.settings.assistant.audibleGreeting} onToggle={() => handleUpdate('audibleGreeting', !profile.settings.assistant.audibleGreeting)} />
                        <SettingsToggle label="Read Responses Aloud" description="The assistant will speak its responses to you." isChecked={profile.settings.assistant.readResponses} onToggle={() => handleUpdate('readResponses', !profile.settings.assistant.readResponses)} />
                        <CollapsibleSection
                            title="Response Personality"
                            isOpen={!profile.settings.collapsedSections?.asst_personality}
                            onToggle={() => handleToggleCollapse('asst_personality')}
                        >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                               {personalities.map(p => (
                                   <button key={p} onClick={() => handleUpdate('personality', p)} className={`py-2 px-3 rounded-lg text-sm font-bold capitalize ${profile.settings.assistant.personality === p ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                                       {p}
                                   </button>
                               ))}
                           </div>
                        </CollapsibleSection>
                         <CollapsibleSection
                            title="Assistant Voice"
                            isOpen={!profile.settings.collapsedSections?.asst_voices}
                            onToggle={() => handleToggleCollapse('asst_voices')}
                        >
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-bold text-center mb-2">Female</h4>
                                    <div className="space-y-2">
                                        {TTS_VOICES.female.map(v => (
                                            <button key={v.name} onClick={() => handleUpdate('voice', v.name)} className={`w-full text-left p-2 rounded-md ${profile.settings.assistant.voice === v.name ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                                                <p className="font-bold text-sm">{v.name}</p>
                                                <p className="text-xs opacity-80">{v.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-center mb-2">Male</h4>
                                    <div className="space-y-2">
                                        {TTS_VOICES.male.map(v => (
                                            <button key={v.name} onClick={() => handleUpdate('voice', v.name)} className={`w-full text-left p-2 rounded-md ${profile.settings.assistant.voice === v.name ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>
                                                <p className="font-bold text-sm">{v.name}</p>
                                                <p className="text-xs opacity-80">{v.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>
                    </div>
                </div>

                {Object.entries(commandList).map(([category, commands]) => (
                     <CollapsibleSection
                        key={category}
                        title={category}
                        isOpen={!profile.settings.collapsedSections?.[`asst_${category.toLowerCase().replace(/[^a-z0-9]/g, '')}`]}
                        onToggle={() => handleToggleCollapse(`asst_${category.toLowerCase().replace(/[^a-z0-9]/g, '')}`)}
                     >
                        <CommandCategory commands={commands} />
                     </CollapsibleSection>
                ))}
            </div>
        </main>
    );
};

export default AssistantSettingsView;
