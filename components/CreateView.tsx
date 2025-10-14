declare var process: any;
import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Song } from '../types.ts';

// SaveLyricsModal sub-component
const SaveLyricsModal: React.FC<{
    songs: Song[];
    onSave: (songId: string) => void;
    onClose: () => void;
}> = ({ songs, onSave, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredSongs = useMemo(() =>
        songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.artist.toLowerCase().includes(searchTerm.toLowerCase())),
    [songs, searchTerm]);

    const handleSave = (songId: string) => {
        onSave(songId);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="font-bold text-lg">Save Lyrics to a Song</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close modal"><i className="fas fa-times text-2xl"></i></button>
                </header>
                <div className="p-4">
                    <input type="text" placeholder="Search your songs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/10 rounded-full py-2 px-4 border-2 border-transparent focus:outline-none cosmic-search" />
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-2 scroll-container">
                    {filteredSongs.length > 0 ? filteredSongs.map(song => (
                        <button key={song.id} onClick={() => handleSave(song.id)} className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 text-left">
                            <img src={song.albumArtUrl} alt={song.title} className="w-10 h-10 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{song.title}</p>
                                <p className="text-xs truncate text-neutral-400">{song.artist}</p>
                            </div>
                        </button>
                    )) : (
                        <div className="text-center text-neutral-400 py-8">
                            <p>No songs found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AnimatedPenLoader = () => (
    <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--primary-accent)] pen-writing-anim">
            <path d="M13.0237 3.86443L20.211 11.0518L8.68284 22.58L2.00002 22.58L2 15.8972L13.0237 3.86443Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.5 6L18 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="mt-4">The AI is writing...</p>
    </div>
);

const truncate = (str: string, len: number) => str.length > len ? `${str.substring(0, len)}...` : str;

// Main CreateView component
interface CreateViewProps {
    librarySongs: Song[];
    onUpdateSong: (song: Song) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    onGenerate: () => void;
}

const CreateView: React.FC<CreateViewProps> = ({ librarySongs, onUpdateSong, showNotification, onGenerate }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedLyrics, setGeneratedLyrics] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const ai = useMemo(() => {
        if (process.env.API_KEY) {
            try {
                return new GoogleGenAI({ apiKey: process.env.API_KEY });
            } catch (e) {
                console.error("Failed to initialize GoogleGenAI", String(e));
                return null;
            }
        }
        return null;
    }, []);

    const handleGenerateLyrics = async () => {
        if (!prompt.trim()) {
            showNotification('Please enter a prompt for the song!', 'error');
            return;
        }
        if (!ai) {
            showNotification('AI features are not available. Check API key.', 'error');
            return;
        }
        setIsLoading(true);
        setGeneratedLyrics('');
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Write song lyrics based on this prompt: ${prompt}`,
                config: {
                    systemInstruction: "You are a professional songwriter. Write clear, creative, and well-structured lyrics based on the user's prompt. Format the lyrics with verse and chorus labels like [Verse 1], [Chorus], etc. Do not include any other commentary or introductory text.",
                }
            });
            setGeneratedLyrics((response.text || '').trim());
            onGenerate(); // Trigger achievement check
        } catch (error) {
            console.error("Error generating lyrics:", String(error));
            showNotification('Failed to generate lyrics. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveToSong = (songId: string) => {
        const songToUpdate = librarySongs.find(s => s.id === songId);
        if (songToUpdate) {
            onUpdateSong({ ...songToUpdate, lyrics: generatedLyrics });
            showNotification(`Lyrics saved to "${truncate(songToUpdate.title, 20)}"!`, 'success');
        }
    };

    return (
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40 home-gradient-bg">
            <header className="mb-8">
                <h1 className="text-2xl font-bold">Mwijay AI Lyric Studio</h1>
                <p className="text-neutral-400">Craft your next masterpiece</p>
            </header>

            <div className="space-y-6">
                <section className="bg-[var(--surface-color)] p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">1. Describe Your Song</h2>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A sad song about a robot who discovers rain for the first time."
                        className="w-full h-24 bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] resize-none"
                    />
                    <button
                        onClick={handleGenerateLyrics}
                        disabled={isLoading}
                        className="mt-4 w-full bg-[var(--primary-accent)] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                        {isLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <i className="fas fa-wand-magic-sparkles"></i>
                                <span>Generate Lyrics</span>
                            </>
                        )}
                    </button>
                </section>
                
                {(generatedLyrics || isLoading) && (
                    <section className="bg-[var(--surface-color)] p-6 rounded-2xl">
                        <h2 className="text-xl font-bold mb-4">2. Your Lyrics</h2>
                        {isLoading ? (
                            <AnimatedPenLoader />
                        ) : (
                            <>
                                <textarea
                                    readOnly
                                    value={generatedLyrics}
                                    className="w-full h-64 bg-black/20 rounded-md p-4 whitespace-pre-wrap font-mono text-sm"
                                />
                                <div className="flex gap-4 mt-4">
                                    <button onClick={() => { navigator.clipboard.writeText(generatedLyrics); showNotification('Lyrics copied!', 'success'); }} className="flex-1 bg-white/10 text-white font-bold py-3 rounded-full">Copy</button>
                                    <button onClick={() => setIsSaveModalOpen(true)} className="flex-1 bg-white/10 text-white font-bold py-3 rounded-full">Save to Song</button>
                                </div>
                            </>
                        )}
                    </section>
                )}
            </div>

            {isSaveModalOpen && (
                <SaveLyricsModal
                    songs={librarySongs}
                    onSave={handleSaveToSong}
                    onClose={() => setIsSaveModalOpen(false)}
                />
            )}
        </main>
    );
};

export default CreateView;
