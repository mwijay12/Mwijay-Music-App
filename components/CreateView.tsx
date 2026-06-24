
import React, { useState, useMemo, useRef } from 'react';
import { X, Loader2, PenLine, Wand2, Copy, Sliders } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Song, ProfileData } from '../types.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';
import { GEMINI_KEYS } from './constants.ts';

const SaveLyricsModal: React.FC<{
    songs: Song[];
    onSave: (song: Song) => void;
    onClose: () => void;
}> = ({ songs, onSave, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredSongs = useMemo(() =>
        songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.artist.toLowerCase().includes(searchTerm.toLowerCase())),
    [songs, searchTerm]);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[var(--surface-color)] rounded-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-[var(--surface-border-color)] flex-shrink-0">
                    <h2 className="font-bold text-lg text-[var(--text-primary)]">Save To Song</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close modal"><X size={24} /></button>
                </header>
                <div className="p-4">
                    <input type="text" placeholder="Search your songs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[var(--chip-bg)] rounded-full py-2 px-4 border-2 border-transparent focus:outline-none cosmic-search text-[var(--text-primary)]" />
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-2 scroll-container">
                    {filteredSongs.length > 0 ? filteredSongs.map(song => (
                        <button key={song.id} onClick={() => onSave(song)} className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[var(--chip-bg)] text-left">
                            <img src={song.albumArtUrl} alt={song.title} className="w-10 h-10 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold truncate text-[var(--text-primary)]">{song.title}</p>
                                <p className="text-xs text-[var(--text-secondary)] truncate">{song.artist}</p>
                            </div>
                        </button>
                    )) : (
                        <div className="text-center text-[var(--text-secondary)] py-8">
                            <p>No songs found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AnimatedLoader: React.FC<{text: string}> = ({text}) => (
    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-secondary)]">
        <Loader2 size={32} className="animate-spin" />
        <p className="mt-4">{text}</p>
    </div>
);

const PromptScroller: React.FC<{ prompts: string[], onSelect: (prompt: string) => void }> = ({ prompts, onSelect }) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    useInterruptibleScroll(scrollerRef, contentRef);

    return (
        <div ref={scrollerRef} className="prompt-scroller mb-4 -mx-2 px-2 pb-2">
            <div ref={contentRef} className="slow-scroll-horizontal-content flex gap-3">
                {prompts.map((p, i) => (
                    <button 
                        key={`${p}-${i}`} 
                        onClick={() => onSelect(p)} 
                        className="flex-shrink-0 bg-[var(--surface-color)] border border-[var(--surface-border-color)] hover:border-[var(--primary-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] px-4 py-2 rounded-full text-xs font-medium transition-all shadow-sm whitespace-nowrap"
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>
    );
};

const truncate = (str: string, len: number) => str.length > len ? `${str.substring(0, len)}...` : str;

interface CreateViewProps {
    librarySongs: Song[];
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    onGenerate: () => void;
    profile: ProfileData | null;
    onSongUpdate: (song: Song) => void;
    nowPlaying: Song | null;
}

const lyricsPrompts = [
    "A sad ballad about lost love",
    "An upbeat pop song about summer",
    "A rap track about overcoming struggle",
    "A relaxing acoustic song about nature",
    "An energetic rock anthem for a stadium",
    "A futuristic synthwave track about AI",
    "A smooth jazz number for a rainy night",
    "A motivational song for working out"
];

const CreateView: React.FC<CreateViewProps> = ({ librarySongs, showNotification, profile, onSongUpdate, nowPlaying }) => {
    const [lyricsPrompt, setLyricsPrompt] = useState('');
    
    const [generatedLyrics, setGeneratedLyrics] = useState('');
    const [generatedProductionNotes, setGeneratedProductionNotes] = useState('');
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'lyrics'>('lyrics');
    
    const handlePopulateLyricsPrompt = () => {
        if (nowPlaying) {
            setLyricsPrompt(`Write lyrics for a song similar to "${nowPlaying.title}" by ${nowPlaying.artist}. Capture the same mood and themes.`);
            showNotification('Prompt generated from current song!', 'success');
        } else {
            showNotification('No song is currently playing.', 'info');
        }
    };

    const generateOfflineLyrics = (promptText: string): { lyrics: string; productionNotes: string } => {
        const text = promptText.toLowerCase();
        let lyrics = "";
        let notes = "";

        if (text.includes("sad") || text.includes("sorrow") || text.includes("cry") || text.includes("alone") || text.includes(" heartbreak")) {
            lyrics = `[Verse 1]\nKwenye giza la usiku nakumbuka sura yako\nMoyo wangu unaumia kwa kukosa pendo lako\nUlienda bila kusema, ukaniacha peke yangu\nSauti yako inalia kichwani mwangu...\n\n[Chorus]\nOhh moyo wangu, mbona unauma hivi?\nNi kosa gani nililofanya hadi niteseke hivi?\nPendo langu lilikuwa la kweli kwako\nSasa nimebaki na machozi kwenye picha yako...\n\n[Verse 2]\nMarafiki wananiambia muda utaponya majeraha\nLakini kila sekunde nahisi kukosa furaha\nDunia haina maana bila wewe kuwa karibu nami\nNakuomba urudi, urudishe amani...\n\n[Chorus]\nOhh moyo wangu, mbona unauma hivi?\nNi kosa gani nililofanya hadi niteseke hivi?\nPendo langu lilikuwa la kweli kwako\nSasa nimebaki na machozi kwenye picha yako...\n\n[Outro]\nRudi mpenzi wangu, rudi...\nMoyo wangu bado unakusubiri...`;
            notes = "A slowed-reverb emotional Bongo Flava ballad. Starts with a soft acoustic guitar pluck, transitioning into a heavy sub-bass beat in the chorus to emphasize the heartbreak. Vocals should be deep and intimate with high reverb.";
        } else if (text.includes("love") || text.includes("heart") || text.includes("mpenzi") || text.includes("pendo") || text.includes("mahaba")) {
            lyrics = `[Verse 1]\nKila ninapokuona tabasamu lako linang'aa\nKama nyota za usiku, maisha yangu unayajaza\nUpepo mwanana unasafiri na jina lako\nNiko tayari kulinda pendo lako...\n\n[Chorus]\nMalaika wangu, mpenzi wa roho yangu\nWewe ndio furaha na mwanga wa maisha yangu\nSitakuacha kamwe, nitakuwa nawe milele\nPendo letu liwe mfano wa wote...\n\n[Verse 2]\nMacho yako yananiambia maneno ya siri\nPendo letu ni mtihani tuliofaulu vizuri\nWacha dunia izungumze, sisi tunaendelea\nKwenye mikono yako, salama nimejipatia...\n\n[Chorus]\nMalaika wangu, mpenzi wa roho yangu\nWewe ndio furaha na mwanga wa maisha yangu\nSitakuacha kamwe, nitakuwa nawe milele\nPendo letu liwe mfano wa wote...\n\n[Outro]\nMalaika... Pendo langu la dhati...\nWewe na mimi, mpaka mwisho wa maisha...";`;
            notes = "Mid-tempo romantic Afro-pop groove. Featuring sweet saxophone solos between stanzas, smooth 808 basslines, and bright acoustic guitars. Vocal performance should be passionate and warm.";
        } else if (text.includes("happy") || text.includes("dance") || text.includes("sherehe") || text.includes("party") || text.includes("furaha") || text.includes("singeli")) {
            lyrics = `[Verse 1]\nLeo ni sherehe, wacha mziki ucheze kabisa\nTupa shida zako kule, furaha tunaimiza\nKila mtu yuko juu, mikono hewani sawa\nMwijay kashika mitambo, leo ni raha tu sawa!\n\n[Chorus]\nInua mikono! Cheza cheza mpaka asubuhi\nHapa hakuna kulala, sherehe haileti adui\nVibe ni mia kwa mia, shangwe kila kona\nMziki mtamu kabisa, kila mtu anauona!\n\n[Verse 2]\nRuka ruka, zunguka zunguka kwa madaha\nHii ndio maana ya maisha, kuishi kwa furaha\nMdundo wa ngoma unazidi kupanda juu\nWacha tucheze pamoja, sote sasa tuko juu!\n\n[Chorus]\nInua mikono! Cheza cheza mpaka asubuhi\nHapa hakuna kulala, sherehe haileti adui\nVibe ni mia kwa mia, shangwe kila kona\nMziki mtamu kabisa, kila mtu anauona!\n\n[Outro]\nSema raaaha! Leo ni burudani tu!\nMwijay Music, asante kwa mziki mtamu!";`;
            notes = "Upbeat, energetic Singeli/Afrobeats fusion (130 BPM). Features fast polyrhythmic log drums (Amapiano style), high-energy synths, and shouting crowd elements. Keep the vocals fast-paced and rhythmic.";
        } else {
            lyrics = `[Verse 1]\nSauti ya gitaa inasikika kwa mbali sana\nInazungumza na roho yangu tangu asubuhi hadi mchana\nKila mdundo unakumbusha uzuri wa maisha yetu\nNa ndoto tulizoota chini ya anga la usiku wetu...\n\n[Chorus]\nHuu ndio mziki wetu, wacha uendelee kucheza\nKwenye mawimbi ya sauti, amani tunaitengeneza\nPopote ulipo duniani, sikiliza mdundo huu\nMwijay anatuletea upendo kutoka juu...\n\n[Verse 2]\nTunaandika kurasa mpya za safari yetu ya leo\nTukiwa na matumaini na nyimbo za furaha na vigelegele vya vuguvugu\nHakuna cha kutuzuia, tuna nguvu ya mziki mtamu\nInayounganisha mioyo yetu na kuleta ufahamu...\n\n[Chorus]\nHuu ndio mziki wetu, wacha uendelee kucheza\nKwenye mawimbi ya sauti, amani tunaitengeneza\nPopote ulipo duniani, sikiliza mdundo huu\nMwijay anatuletea upendo kutoka juu...\n\n[Outro]\nMziki unaisha... lakni pendo linabaki...\nMwijay Music, daima moyoni...`;
            notes = "A soulful acoustic-electric Afro-fusion song. Blends live percussion, airy acoustic guitar arpeggios, and warm ambient pads. The vocals should start soft and build to a powerful, anthemic chorus with layered harmonies.";
        }

        return { lyrics, productionNotes: notes };
    };

    const handleGenerateLyrics = async () => {
        if (!lyricsPrompt.trim()) { showNotification('Please enter a prompt for the lyrics!', 'error'); return; }
        
        setIsLoadingLyrics(true);
        setGeneratedLyrics('');
        setGeneratedProductionNotes('');

        const userKey = profile?.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
        const keysToTry = Array.from(new Set([
            userKey,
            ...GEMINI_KEYS
        ].filter(Boolean))) as string[];

        const runGeneration = async () => {
            let lastError = null;
            for (let i = 0; i < keysToTry.length; i++) {
                const activeKey = keysToTry[i];
                for (let retry = 0; retry < 2; retry++) {
                    try {
                        const generatorInstance = new GoogleGenAI({ apiKey: activeKey });
                        const response = await generatorInstance.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `Write professional, highly creative, and emotionally evocative song lyrics based on this request: "${lyricsPrompt}". 
                            
                            If the request implies Swahili, Bongo Flava, Singeli, or East African Afro-pop themes, employ authentic regional Swahili slang (miseemo), poetic wordplay, and deep cultural metaphors with perfect rhythmic flow.
                            If the request is in English, write with exquisite poetic metaphors, emotional depth, and catchy hook syncopation.
                            
                            CRITICAL INSTRUCTION: Return the 'lyrics' with clear line breaks (\\n) and stanza breaks (\\n\\n). Do NOT write the lyrics as a single block or paragraph. Label sections clearly like [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]. Ensure proper spacing. Break down the production and arrangement notes into a detailed breakdown of instrumentation, BPM, vocal delivery, and beat drops under 'productionNotes'.`,
                            config: {
                                systemInstruction: "You are an award-winning, master songwriter and poetic genius, legendary in Bongo Flava, Afro-fusion, Singeli, and East African storytelling. You write lyrics with deep cultural resonance, evocative imagery, intricate wordplay, rhyme schemes, and rich metaphors rather than shallow or literal lines. Format lyrics cleanly with proper line breaks and stanza spacing. Return valid JSON.",
                                responseMimeType: 'application/json',
                                responseSchema: {
                                    type: Type.OBJECT,
                                    properties: {
                                        lyrics: { type: Type.STRING, description: "The lyrics of the song, formatted with \\n for line breaks and \\n\\n for new stanzas." },
                                        productionNotes: { type: Type.STRING, description: "Detailed production and arrangement notes, outlining BPM, instruments, beat drops, and vocal delivery details." }
                                    },
                                    required: ["lyrics", "productionNotes"]
                                }
                            }
                        });
                        return response;
                    } catch (error) {
                        lastError = error;
                        console.warn(`Lyric generation failed with key index ${i}, attempt ${retry + 1}`, error);
                        if (retry < 1) {
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }
                }
            }
            throw lastError || new Error("All Gemini API keys exhausted.");
        };

        try {
            if (navigator.onLine && keysToTry.length > 0) {
                const response = await runGeneration();
                const result = JSON.parse(response.text || '{}');
                if (result.lyrics) {
                    setGeneratedLyrics(result.lyrics.trim());
                }
                if (result.productionNotes) setGeneratedProductionNotes(result.productionNotes.trim());
                showNotification('Lyrics generated successfully!', 'success');
            } else {
                throw new Error("Offline or no API keys available.");
            }
        } catch (error) {
            console.warn("Falling back to local lyrics generator:", String(error));
            showNotification('Offline fallback: Generating local themed lyrics...', 'info');
            const result = generateOfflineLyrics(lyricsPrompt);
            setGeneratedLyrics(result.lyrics);
            setGeneratedProductionNotes(result.productionNotes);
            showNotification('Lyrics generated locally!', 'success');
        } finally {
            setIsLoadingLyrics(false);
        }
    };
    
    const handleApplyToSong = () => {
        if (nowPlaying) {
             let newNotes = nowPlaying.notes;
            if (generatedProductionNotes) {
                newNotes = `[Production Notes]\n${generatedProductionNotes}\n\n[User Notes]\n${nowPlaying.notes || ''}`.trim();
            }
            onSongUpdate({ 
                ...nowPlaying, 
                lyrics: generatedLyrics || nowPlaying.lyrics,
                notes: newNotes,
            });
            showNotification(`Content applied to "${truncate(nowPlaying.title, 20)}"`, 'success');
        } else {
            showNotification('No song is playing to apply content to.', 'info');
        }
    };

    const handleSaveToSong = (songToUpdate: Song) => {
        const newNotes = generatedProductionNotes 
            ? `[Production Notes]\n${generatedProductionNotes}\n\n[User Notes]\n${songToUpdate.notes || ''}`.trim()
            : songToUpdate.notes;

        onSongUpdate({
            ...songToUpdate,
            lyrics: generatedLyrics || songToUpdate.lyrics,
            notes: newNotes,
        });
        showNotification(`Content saved to "${truncate(songToUpdate.title, 20)}"`, 'success');
        setIsSaveModalOpen(false);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    return (
        <main onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">AI Studio</h1>
                <h2 className="header-small-title">Studio</h2>
                <div className="header-actions-right">
                    {/* Placeholder for future studio actions */}
                </div>
            </div>

            <div className="px-6 pb-40 scroll-content-with-header">
                <div className="flex gap-1 p-1 bg-[var(--surface-color)] rounded-full mb-6">
                    <button onClick={() => setActiveTab('lyrics')} className={`flex-1 py-2 text-sm font-bold rounded-full transition-colors ${activeTab === 'lyrics' ? 'bg-[var(--primary-accent)] text-black' : 'text-[var(--text-secondary)]'}`}>
                        <PenLine size={18} className="inline-block mr-2" /> Lyrics Studio
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'lyrics' && (
                             <section className="liquid-glass-pane p-6 rounded-2xl">
                                <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Generate Lyrics</h2>
                                <PromptScroller prompts={lyricsPrompts} onSelect={setLyricsPrompt} />
                                <textarea value={lyricsPrompt} onChange={(e) => setLyricsPrompt(e.target.value)} placeholder="Describe the song (e.g., A sad song about a robot who discovers rain)..." className="w-full h-24 bg-[var(--chip-bg)] p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] resize-none mb-4 text-[var(--text-primary)]" />
                                {nowPlaying && (
                                    <button onClick={handlePopulateLyricsPrompt} className="text-xs text-center w-full text-[var(--primary-accent)] hover:underline mb-4 -mt-2">
                                       <Wand2 size={14} className="inline-block mr-1" /> Use current song for inspiration
                                    </button>
                                )}
                                <button onClick={handleGenerateLyrics} disabled={isLoadingLyrics} className="bg-[var(--primary-accent)] text-black font-black py-2 px-5 rounded-full flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 mx-auto shadow-lg text-xs uppercase tracking-widest">
                                    {isLoadingLyrics ? <><Loader2 size={14} className="animate-spin" /><span>Writing...</span></> : <><PenLine size={14} /><span>Generate</span></>}
                                </button>

                                 <div className="mt-6">
                                    {isLoadingLyrics ? <AnimatedLoader text="The AI is composing..." /> : generatedLyrics && (
                                        <div className="relative mb-6">
                                            <h3 className="font-bold mb-2 text-[var(--text-secondary)]">Lyrics</h3>
                                            <textarea readOnly value={generatedLyrics} className="w-full h-48 bg-[var(--chip-bg)] rounded-md p-4 whitespace-pre-wrap font-mono text-sm text-[var(--text-primary)]" />
                                            <button onClick={() => { navigator.clipboard.writeText(generatedLyrics); showNotification('Lyrics copied!', 'success'); }} className="absolute top-10 right-2 bg-black/30 text-white w-8 h-8 rounded-full flex items-center justify-center" title="Copy"><Copy size={16} /></button>
                                        </div>
                                    )}
                                    {isLoadingLyrics ? null : generatedProductionNotes && (
                                        <div className="relative mt-6 animate-pop-in">
                                            <h3 className="font-bold mb-2 text-[var(--secondary-accent-start)] flex items-center gap-2"><Sliders size={18} /> Production Notes</h3>
                                            <div className="bg-[var(--chip-bg)] rounded-xl p-4 border border-[var(--surface-border-color)]">
                                                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{generatedProductionNotes}</p>
                                            </div>
                                            <button onClick={() => { navigator.clipboard.writeText(generatedProductionNotes); showNotification('Production notes copied!', 'success'); }} className="absolute top-10 right-2 bg-black/30 text-white w-8 h-8 rounded-full flex items-center justify-center" title="Copy">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                    )}
                                 </div>
                                 {(generatedLyrics || generatedProductionNotes) && (
                                     <div className="mt-6 flex gap-2">
                                        {nowPlaying && <button onClick={handleApplyToSong} className="flex-1 bg-green-500 text-white font-bold py-2 px-4 rounded-full">Apply to Playing</button>}
                                        <button onClick={() => setIsSaveModalOpen(true)} className="flex-1 bg-[var(--chip-bg)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-full">Save to...</button>
                                    </div>
                                 )}
                             </section>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {isSaveModalOpen && (
                <SaveLyricsModal songs={librarySongs} onSave={handleSaveToSong} onClose={() => setIsSaveModalOpen(false)} />
            )}
        </main>
    );
};

export default CreateView;
