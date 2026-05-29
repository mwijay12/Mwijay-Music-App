
import React, { useState, useEffect, useRef } from 'react';
import { Mic2, Sliders, ArrowLeft } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import CollapsibleSection from './CollapsibleSection.tsx';

const helpSections = [
    {
        id: 'gestures',
        title: '✨ Gestures & Shortcuts',
        content: (
            <>
                <p><strong>Full Music Player:</strong></p>
                <ul>
                    <li><strong>Change Track:</strong> Swipe left or right on the album art to go to the next or previous song.</li>
                    <li><strong>Seek:</strong> Press and hold on the right half of the visualizer area to fast-forward, or the left half to rewind.</li>
                    <li><strong>Play/Pause:</strong> Double-tap the album art to quickly play or pause.</li>
                </ul>
                <p><strong>Reels Viewer:</strong></p>
                <ul>
                    <li><strong>Play/Pause:</strong> Double-tap the center of the video to toggle play/pause. A single tap shows/hides controls.</li>
                    <li><strong>Seek:</strong> Double-tap the right side of the video to seek forward 10s, or the left side to seek backward 10s.</li>
                </ul>
            </>
        )
    },
    {
        id: 'assistant',
        title: '🤖 Mwijay Assistant',
        content: (
             <>
                <p>Your AI companion works both online and offline!</p>
                <ul>
                    <li><strong>Voice Commands:</strong> Tap the microphone in the assistant panel.</li>
                    <li><strong>Offline:</strong> Say "Play music", "Set timer for 20 mins", "Change theme to Cyber Punch", or "Make a ringtone".</li>
                    <li><strong>Online:</strong> Requires API key. Ask "I want a pink theme", "Analyze this image", or "Create an AI playlist".</li>
                </ul>
            </>
        )
    },
    {
        id: 'ai_dj',
        title: '🎙️ AI DJ Mode',
        content: (
            <>
                <p>Experience a personalized radio show hosted by AI!</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Ensure you have at least 10 songs in your library.</li>
                    <li>Add your Gemini API Key in Settings.</li>
                    <li>Go to the <strong>Home</strong> tab and tap "Start AI DJ Session".</li>
                    <li>The DJ will introduce songs, crack jokes, and curate a vibe based on your history.</li>
                </ol>
            </>
        )
    },
    {
        id: 'tools',
        title: '🔔 Ringtones & Transcription',
        content: (
            <>
                <p><strong>Ringtone Maker:</strong> Tap the three dots on any song in your library &gt; "Ringtone". You can visually trim the audio and save it as a .wav file.</p>
                <p><strong>Live Transcription:</strong> In the full player, tap the microphone icon <Mic2 size={16} className="inline-block" />. You can transcribe your voice (Mic) or the song playing (Song). Note: "Song" transcription requires browser support for audio capture.</p>
            </>
        )
    },
    {
        id: 'playlists',
        title: '🎨 Playlists & Covers',
        content: (
            <>
                <ul>
                    <li><strong>Create Playlist:</strong> In Library, tap the colorful "Create New" card.</li>
                    <li><strong>AI Covers:</strong> Enable "AI Cover Art" in Settings. Then, edit any song and tap "AI Generate" to create unique artwork based on the title.</li>
                </ul>
            </>
        )
    },
    {
        id: 'audio',
        title: '🎛️ Audio FX',
        content: (
            <>
                <p>Tap <Sliders size={16} className="inline-block" /> in the player. Features include:</p>
                <ul>
                    <li><strong>5-Band Equalizer</strong> with presets.</li>
                    <li><strong>Maximizer:</strong> Bass Boost and Volume Amp.</li>
                    <li><strong>Creative:</strong> Tempo control (speed) and Filters (Low/High pass).</li>
                    <li><strong>Metronome:</strong> For musicians practicing with tracks.</li>
                </ul>
            </>
        )
    }
];

const HelpView: React.FC<{ onBack: () => void; profile: ProfileData; onQueueSpeech: (text: string, type: 'help') => void; isTtsSpeaking: boolean; }> = ({ onBack, profile, onQueueSpeech, isTtsSpeaking }) => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const wasSpeaking = useRef(false);

    const handleToggle = (id: string) => {
        const newOpenSection = openSection === id ? null : id;
        setOpenSection(newOpenSection);

        if (newOpenSection) {
            const section = helpSections.find(s => s.id === newOpenSection);
            if (section) {
                setTimeout(() => {
                    const contentElement = document.getElementById(`help-content-${section.id}`);
                    if (contentElement) {
                        onQueueSpeech(`${section.title}. ${contentElement.innerText}`, 'help');
                    }
                }, 400);
            }
        }
    };
    
    useEffect(() => {
        if (wasSpeaking.current && !isTtsSpeaking && openSection) {
            setOpenSection(null);
        }
        wasSpeaking.current = isTtsSpeaking;
    }, [isTtsSpeaking, openSection]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };
    
    return (
        <main onScroll={handleScroll} className="h-full w-full home-gradient-bg overflow-y-auto scroll-container gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">App Guide</h1>
                <h2 className="header-small-title">Mwijay Music</h2>
                <div className="header-actions-right">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] flex items-center justify-center text-[var(--text-primary)]" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>

            <div className="space-y-4 px-6 pb-40 scroll-content-with-header">
                 {helpSections.map(section => (
                    <CollapsibleSection 
                        key={section.id} 
                        title={section.title}
                        isOpen={openSection === section.id}
                        onToggle={() => handleToggle(section.id)}
                    >
                        <div id={`help-content-${section.id}`} className="prose prose-invert max-w-none prose-help text-[var(--text-secondary)] space-y-3">
                            {section.content}
                        </div>
                    </CollapsibleSection>
                ))}
            </div>
        </main>
    );
};

export default HelpView;
