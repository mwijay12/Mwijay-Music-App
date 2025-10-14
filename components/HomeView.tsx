import React, { useState, useMemo } from 'react';
import Header from './Header.tsx';
import MwijayAssistantButton from './MwijayAssistantButton.tsx';
import type { ProfileData, Song } from '../types.ts';
import { defaultMoods } from '../constants.ts';

interface HomeViewProps {
    profile: ProfileData;
    librarySongs: Song[];
    onNavigate: (view: string) => void;
    onPlaySong: (song: Song, context: Song[]) => void;
    onOpenAssistant: () => void;
    onToggleTheme: () => void;
    onOpenAddMoodModal: () => void;
    isAssistantOpening: boolean;
}

const HorizontalSongScroller: React.FC<{title: string, songs: Song[], onPlaySong: (song: Song, context: Song[]) => void, emptyMessage?: string}> = 
({ title, songs, onPlaySong, emptyMessage }) => {
    if (songs.length === 0 && !emptyMessage) return null;

    const handlePlay = (song: Song) => {
        onPlaySong(song, songs);
    }

    return (
        <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            {songs.length > 0 ? (
                <div className="flex overflow-x-auto gap-4 scroll-container -mx-6 px-6 pb-2">
                    {songs.map(song => (
                        <button key={song.id} onClick={() => handlePlay(song)} className="flex-shrink-0 w-32 text-left group" title={`Play ${song.title}`}>
                            <img src={song.albumArtUrl} alt={song.title} className="w-32 h-32 rounded-lg object-cover mb-2 transition-transform group-hover:scale-105" />
                            <p className="text-sm font-bold truncate">{song.title}</p>
                            <p className="text-xs text-neutral-300 truncate">{song.artist}</p>
                        </button>
                    ))}
                </div>
            ) : (
                 <div className="text-center text-sm text-neutral-400 bg-[var(--chip-bg)] p-4 rounded-lg">
                    <p>{emptyMessage}</p>
                </div>
            )}
        </section>
    );
};


const HomeView: React.FC<HomeViewProps> = ({ profile, librarySongs, onNavigate, onPlaySong, onOpenAssistant, onToggleTheme, onOpenAddMoodModal, isAssistantOpening }) => {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    const allMoods = useMemo(() => {
        return [...defaultMoods, ...(profile.customMoods ?? [])];
    }, [profile.customMoods]);

    const moodSongs = useMemo(() => {
        if (!selectedMood) return [];
        return librarySongs.filter(s => s.moodEmoji === selectedMood);
    }, [selectedMood, librarySongs]);

    const recentlyPlayedSongs = useMemo(() => {
        return (profile.recentlyPlayed ?? [])
            .map(songId => librarySongs.find(song => song.id === songId))
            .filter((s): s is Song => !!s);
    }, [profile.recentlyPlayed, librarySongs]);
    
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) {
            const emojis = ['🌞', '👋', '☕', '🎶', '😊'];
            return { text: 'Good Morning', emoji: emojis[Math.floor(Math.random() * emojis.length)] };
        }
        if (hour < 18) {
            const emojis = ['🌅', '😎', '☀️', '🎧', '👍'];
            return { text: 'Good Afternoon', emoji: emojis[Math.floor(Math.random() * emojis.length)] };
        }
        const emojis = ['🌆', '🌃', '🌙', '✨', '😌'];
        return { text: 'Good Evening', emoji: emojis[Math.floor(Math.random() * emojis.length)] };
    };

    const { text: greetingText, emoji: greetingEmoji } = getGreeting();

    return (
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40 home-gradient-bg">
            <Header 
                profile={profile}
                greetingText={greetingText}
                greetingEmoji={greetingEmoji}
                onAvatarClick={() => onNavigate('Profile')}
                onOpenCreateView={() => onNavigate('Create')}
                onToggleTheme={onToggleTheme}
            />

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">What's your mood today?</h2>
                <div className="flex overflow-x-auto gap-4 scroll-container -mx-6 px-6 pb-2">
                   {allMoods.map(mood => (
                       <button 
                            key={mood.name} 
                            onClick={() => setSelectedMood(prev => prev === mood.emoji ? null : mood.emoji)}
                            className={`flex-shrink-0 flex flex-col items-center gap-2 text-center transition-transform hover:scale-105 p-2 rounded-lg ${selectedMood === mood.emoji ? 'bg-[var(--primary-accent)]/20' : ''}`}
                            title={`Filter by ${mood.name} mood`}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-200 ${mood.color} ${selectedMood === mood.emoji ? 'ring-4 ring-offset-2 ring-offset-[var(--bg-color)] ring-[var(--primary-accent)]' : ''}`}>
                                {mood.emoji}
                            </div>
                            <span className="font-bold text-sm">{mood.name}</span>
                        </button>
                   ))}
                   <button 
                        onClick={onOpenAddMoodModal}
                        className="flex-shrink-0 flex flex-col items-center gap-2 text-center transition-transform hover:scale-105 p-2 rounded-lg"
                        title="Add a new custom mood"
                    >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-200 bg-[var(--chip-bg)]">
                            <i className="fas fa-plus"></i>
                        </div>
                        <span className="font-bold text-sm">Add New</span>
                    </button>
                </div>
            </section>
            
            {selectedMood && (
                 <HorizontalSongScroller
                    title={`${selectedMood} Vibe`}
                    songs={moodSongs}
                    onPlaySong={onPlaySong}
                    emptyMessage="No songs match this mood yet. You can set a song's mood from the full player!"
                />
            )}

            <section className="mb-8 flex justify-center items-center py-4">
                <MwijayAssistantButton onClick={onOpenAssistant} isOpening={isAssistantOpening} />
            </section>
            
            <HorizontalSongScroller
                title="Recently Played"
                songs={recentlyPlayedSongs}
                onPlaySong={onPlaySong}
            />

        </main>
    );
};

export default HomeView;