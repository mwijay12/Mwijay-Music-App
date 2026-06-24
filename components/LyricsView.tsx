
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Clock, Settings, Minus, X, Languages, Loader2, Pause, Play, Mic2, Sparkles, Save, Music, Mic, Search, Globe, ChevronRight, Check, Feather, Download, PenLine } from 'lucide-react';
import type { Song, ProfileData } from '../types.ts';
import { fonts, getRandomCoverArt } from './constants.ts';
import { getPremiumGradientCover } from '../utils/helpers.ts';
import { useInterruptibleScroll } from '../hooks/useInterruptibleScroll.ts';
import TranscriptionView from './TranscriptionView.tsx';
import { LyricsAnalysis } from './LyricsAnalysis.tsx';
import { aiService } from '../services/aiService.ts';
import { motion } from 'framer-motion';

interface LyricsViewProps {
    song: Song;
    profile: ProfileData;
    onClose: () => void;
    onMinimize: () => void;
    onUpdateSong: (song: Song) => void;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    progress: number;
    duration: number;
    isPlaying: boolean;
    onSaveNotes: (songId: string, notes: string) => void;
    onSaveRadioNotes: (songId: string, notes: string) => void;
    isLive: boolean;
    audioRef: React.RefObject<HTMLAudioElement>;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

interface LyricLine {
    time: number;
    text: string;
}

const parseLrc = (lrcText: string): LyricLine[] => {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/;
    
    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const time = minutes * 60 + seconds;
            const text = line.replace(timeRegex, '').trim();
            result.push({ time, text });
        }
    }
    
    return result.sort((a, b) => a.time - b.time);
};

const LyricsView: React.FC<LyricsViewProps> = ({ song, profile, onClose, onMinimize, onUpdateSong, onUpdateProfile, progress, duration, isPlaying, onSaveNotes, onSaveRadioNotes, isLive, audioRef, showNotification }) => {
    const isRadio = song.duration === Infinity;
    
    // State for Lyrics tab
    const [isEditingLyrics, setIsEditingLyrics] = useState(!song.lyrics);
    const [lyricsText, setLyricsText] = useState(song.lyrics || '');
    const [isAnimationPlaying, setIsAnimationPlaying] = useState(isPlaying);
    const [isTranslating, setIsTranslating] = useState(false);

    // Timed lyrics states and helpers
    const parsedLyrics = useMemo(() => {
        return parseLrc(lyricsText);
    }, [lyricsText]);
    
    const isSynced = parsedLyrics.length > 0;
    const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [userScrolling, setUserScrolling] = useState(false);
    const userScrollTimeout = useRef<number>();

    // Find current line based on time
    useEffect(() => {
        if (!isSynced || parsedLyrics.length === 0) return;
        
        let foundIndex = -1;
        for (let i = parsedLyrics.length - 1; i >= 0; i--) {
            if (progress >= parsedLyrics[i].time) {
                foundIndex = i;
                break;
            }
        }
        
        if (foundIndex !== currentLineIndex) {
            setCurrentLineIndex(foundIndex);
        }
    }, [progress, parsedLyrics, isSynced, currentLineIndex]);

    // Auto-scroll to current line
    useEffect(() => {
        if (currentLineIndex < 0 || !isSynced) return;
        if (userScrolling) return;
        if (!lyricsContainerRef.current) return;
        
        const container = lyricsContainerRef.current;
        const currentLine = lineRefs.current[currentLineIndex];
        
        if (!currentLine) return;
        
        // Calculate scroll position (center the line)
        const containerHeight = container.offsetHeight;
        const lineTop = currentLine.offsetTop;
        const lineHeight = currentLine.offsetHeight;
        
        const targetScroll = lineTop - (containerHeight / 2) + (lineHeight / 2);
        
        container.scrollTo({
            top: targetScroll,
            behavior: 'smooth',
        });
    }, [currentLineIndex, userScrolling, isSynced]);

    // Detect user scrolling to pause auto-scroll
    const handleScroll = () => {
        setUserScrolling(true);
        
        clearTimeout(userScrollTimeout.current);
        userScrollTimeout.current = window.setTimeout(() => {
            setUserScrolling(false);
        }, 3000); // Resume auto-scroll after 3s of no scrolling
    };

    // State for Notes tab
    const [notesText, setNotesText] = useState(song.notes || '');
    
    const [activeTab, setActiveTab] = useState<'lyrics' | 'notes' | 'ai'>(isRadio ? 'notes' : 'lyrics');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [saveChoiceText, setSaveChoiceText] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Online Lyrics Search State
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);
    const [searchQuery, setSearchQuery] = useState(`${song.title} ${song.artist}`);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedLyricsResult, setSelectedLyricsResult] = useState<any | null>(null);
    const [lyricsPreview, setLyricsPreview] = useState('');
    const [syncedLyricsPreview, setSyncedLyricsPreview] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const lyricsContentRef = useRef<HTMLDivElement>(null);
    const settingsPanelRef = useRef<HTMLDivElement>(null);
    const fontScrollerRef = useRef<HTMLDivElement>(null);
    const fontContentRef = useRef<HTMLDivElement>(null);
    const animScrollerRef = useRef<HTMLDivElement>(null);
    const animContentRef = useRef<HTMLDivElement>(null);

    useInterruptibleScroll(lyricsContainerRef, lyricsContentRef, 'vertical');
    useInterruptibleScroll(fontScrollerRef, fontContentRef);
    useInterruptibleScroll(animScrollerRef, animContentRef);

    const lyricsSettings = profile.settings.lyricsSettings;
    const animationShouldBeActive = isPlaying && isAnimationPlaying;

    useEffect(() => {
        // Force animation reset/restart when song, text, or play state changes significantly
        const content = lyricsContentRef.current;
        if (!content) return;

        content.style.animation = 'none';
        content.offsetHeight; /* trigger reflow */

        if (lyricsSettings.animation === 'scroll' && lyricsText) {
            const lineCount = (lyricsText.match(/\n/g) || []).length + 1;
            const speedFactor = Math.max(0.5, lyricsSettings.animationSpeed);
            const baseSecondsPerLine = 4;
            const adjustedDuration = lineCount * baseSecondsPerLine * (10 / speedFactor);
            
            content.style.animationName = 'lyrics-scroll-anim';
            content.style.animationDuration = `${adjustedDuration}s`;
            content.style.animationTimingFunction = 'linear';
            content.style.animationIterationCount = 'infinite';
            content.style.animationPlayState = animationShouldBeActive ? 'running' : 'paused';
        }
    }, [lyricsText, lyricsSettings.animation, lyricsSettings.animationSpeed, animationShouldBeActive, song.id]);
    
    useEffect(() => {
        setIsAnimationPlaying(isPlaying);
    }, [isPlaying]);

    useEffect(() => {
        if (!isSettingsOpen) return;
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (settingsPanelRef.current && !settingsPanelRef.current.contains(target) && !target.closest('.lyrics-settings-toggle-btn')) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('click', handleOutsideClick, { capture: true });
        document.addEventListener('touchstart', handleOutsideClick, { capture: true });
        return () => {
            document.removeEventListener('click', handleOutsideClick, { capture: true });
            document.removeEventListener('touchstart', handleOutsideClick, { capture: true });
        };
    }, [isSettingsOpen]);

    // Auto-search online for lyrics when no lyrics are saved (makes lyrics tab useful on first open)
    useEffect(() => {
        const autoSearch = async () => {
            if (!song.lyrics && !isRadio && song.title && song.artist && song.artist !== 'Unknown Artist') {
                setIsSearchLoading(true);
                setIsSearchingOnline(true);
                setSearchQuery(`${song.title} ${song.artist}`);
                try {
                    // Primary: LRCLib exact match (fastest)
                    const exactUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(song.title)}&artist_name=${encodeURIComponent(song.artist)}`;
                    const exactRes = await fetch(exactUrl, {
                        headers: { 'User-Agent': 'MwijayMusicApp/1.0 (https://github.com/mwijay)' }
                    });
                    if (exactRes.ok && exactRes.status !== 404) {
                        const exactData = await exactRes.json();
                        if (exactData.plainLyrics || exactData.syncedLyrics) {
                            // Auto-select this result
                            setLyricsPreview(exactData.plainLyrics || '');
                            setSyncedLyricsPreview(exactData.syncedLyrics || '');
                            setSelectedLyricsResult({
                                source: 'LRCLib',
                                id: `lrc-${exactData.id}`,
                                title: exactData.trackName || song.title,
                                artist: exactData.artistName || song.artist,
                                album: exactData.albumName || null,
                                plainLyrics: exactData.plainLyrics,
                                syncedLyrics: exactData.syncedLyrics,
                                thumbnail: null
                            });
                            setIsSearchLoading(false);
                            return;
                        }
                    }
                    
                    // Secondary: search query
                    const query = `${song.title} ${song.artist}`;
                    const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
                        headers: { 'User-Agent': 'MwijayMusicApp/1.0 (https://github.com/mwijay)' }
                    });
                    if (searchRes.ok) {
                        const hits = await searchRes.json();
                        if (hits && hits.length > 0) {
                            setSearchResults(hits.slice(0, 10).map((hit: any) => ({
                                source: 'LRCLib',
                                id: `lrc-${hit.id}`,
                                title: hit.trackName,
                                artist: hit.artistName,
                                album: hit.albumName,
                                duration: hit.duration,
                                plainLyrics: hit.plainLyrics,
                                syncedLyrics: hit.syncedLyrics,
                                thumbnail: null
                            })));
                        }
                    }
                } catch (e) {
                    console.warn('Auto lyrics search failed:', e);
                } finally {
                    setIsSearchLoading(false);
                }
            }
        };
        autoSearch();
    // Only run once per song
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [song.id]);


    const handleOnlineSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsSearchLoading(true);
        setSearchResults([]);
        try {
            // 1. Fetch from LRCLib (highly reliable for text/synced lyrics and works client-side)
            const lrcUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
            const lrcRes = await fetch(lrcUrl, {
                headers: {
                    'User-Agent': 'MwijayMusicApp/1.0 (https://github.com/ai-mastering/tutorial-node)'
                }
            });
            let lrcHits: any[] = [];
            if (lrcRes.ok) {
                lrcHits = await lrcRes.json();
            }

            // 2. Fetch from Genius
            let geniusHits: any[] = [];
            const geniusToken = 'UzOGslLV5dBAiD6DqBUmrBCXOpW91bcKt8ep52tgAemUetCdedV7SVNmwHm0bSs9';
            try {
                const geniusUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}`;
                const geniusRes = await fetch(geniusUrl, {
                    headers: {
                        'Authorization': `Bearer ${geniusToken}`
                    }
                });
                if (geniusRes.ok) {
                    const data = await geniusRes.json();
                    geniusHits = data.response?.hits || [];
                }
            } catch (e) {
                console.warn("Genius search failed (likely CORS or network), falling back to LRCLib only.", e);
            }

            // 3. Merge or combine results beautifully
            const unifiedResults: any[] = [];

            // Add LRCLib hits
            lrcHits.forEach((hit: any) => {
                unifiedResults.push({
                    source: 'LRCLib',
                    id: `lrc-${hit.id}`,
                    title: hit.trackName,
                    artist: hit.artistName,
                    album: hit.albumName,
                    duration: hit.duration,
                    plainLyrics: hit.plainLyrics,
                    syncedLyrics: hit.syncedLyrics,
                    thumbnail: null
                });
            });

            // Add Genius hits if not duplicate
            geniusHits.forEach((hit: any) => {
                const songResult = hit.result;
                const isDuplicate = unifiedResults.some(r => 
                    r.title.toLowerCase() === songResult.title.toLowerCase() && 
                    r.artist.toLowerCase() === songResult.primary_artist.name.toLowerCase()
                );
                if (!isDuplicate) {
                    unifiedResults.push({
                        source: 'Genius',
                        id: `genius-${songResult.id}`,
                        title: songResult.title,
                        artist: songResult.primary_artist.name,
                        album: null,
                        duration: null,
                        plainLyrics: null,
                        syncedLyrics: null,
                        thumbnail: songResult.song_art_image_thumbnail_url
                    });
                } else {
                    const matched = unifiedResults.find(r => 
                        r.title.toLowerCase() === songResult.title.toLowerCase() && 
                        r.artist.toLowerCase() === songResult.primary_artist.name.toLowerCase()
                    );
                    if (matched) {
                        matched.thumbnail = songResult.song_art_image_thumbnail_url;
                    }
                }
            });

            setSearchResults(unifiedResults);
            if (unifiedResults.length === 0) {
                showNotification('No search results found online.', 'info');
            }
        } catch (e) {
            console.error("Online search failed", e);
            showNotification('Online search failed. Please check your internet connection.', 'error');
        } finally {
            setIsSearchLoading(false);
        }
    };

    const handleSelectResult = async (result: any) => {
        if (result.plainLyrics || result.syncedLyrics) {
            setLyricsPreview(result.plainLyrics || '');
            setSyncedLyricsPreview(result.syncedLyrics || '');
            setSelectedLyricsResult(result);
            return;
        }

        setIsSearchLoading(true);
        try {
            const track = result.title;
            const artist = result.artist;
            const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`;
            
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'MwijayMusicApp/1.0 (https://github.com/ai-mastering/tutorial-node)'
                }
            });

            if (res.ok) {
                const data = await res.json();
                setLyricsPreview(data.plainLyrics || '');
                setSyncedLyricsPreview(data.syncedLyrics || '');
                setSelectedLyricsResult({
                    ...result,
                    plainLyrics: data.plainLyrics,
                    syncedLyrics: data.syncedLyrics
                });
            } else {
                console.log("LRCLib specific search failed, trying Lyrics.ovh...");
                const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
                const ovhRes = await fetch(ovhUrl);
                if (ovhRes.ok) {
                    const ovhData = await ovhRes.json();
                    setLyricsPreview(ovhData.lyrics || '');
                    setSyncedLyricsPreview('');
                    setSelectedLyricsResult({
                        ...result,
                        plainLyrics: ovhData.lyrics,
                        syncedLyrics: ''
                    });
                } else {
                    showNotification('Could not retrieve lyrics contents for this track.', 'error');
                }
            }
        } catch (e) {
            console.error("Failed to fetch lyrics detail", e);
            showNotification('Failed to retrieve lyrics detail.', 'error');
        } finally {
            setIsSearchLoading(false);
        }
    };

    const handleSaveLyrics = () => {
        onUpdateSong({ ...song, lyrics: lyricsText });
        setIsEditingLyrics(false);
    };
    
    const handleSaveNotes = () => {
        if (isLive) {
            onSaveRadioNotes(song.id, notesText);
        } else {
            onSaveNotes(song.id, notesText);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setLyricsText(e.target?.result as string);
            reader.readAsText(file);
        }
    };

    const handleExport = () => {
        const text = `--- MWIJAY MUSIC LYRICS & NOTES EXPORT ---
Song: ${song.title}
Artist: ${song.artist}
Export Date: ${new Date().toLocaleDateString()}

=========================================
LYRICS:
=========================================
${lyricsText || 'No lyrics recorded.'}

=========================================
MY NOTES:
=========================================
${notesText || 'No notes taken.'}
`;

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lyrics_notes.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("Lyrics and Notes exported successfully!", "success");
    };

    const handleTranslate = async () => {
        if (!lyricsText.trim()) return;
        const apiKey = profile.apiKey || process.env.API_KEY;
        if (!apiKey) {
            showNotification('API Key required for translation.', 'error');
            return;
        }
        
        setIsTranslating(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Translate these song lyrics to English. Preserve the line structure.\n\n${lyricsText}`
            });
            if (response.text) {
                setLyricsText(response.text);
                showNotification('Lyrics translated successfully.', 'success');
            }
        } catch (e) {
            console.error("Translation failed", e);
            showNotification('Translation failed. Check console.', 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleTimestamp = () => {
        const minutes = Math.floor(progress / 60);
        const seconds = Math.floor(progress % 60);
        const ms = Math.floor((progress % 1) * 100);
        const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
        
        // Insert timestamp at cursor or append
        const textarea = document.getElementById('lyrics-editor') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            
            // Try to find the start of the current line
            const lastNewline = before.lastIndexOf('\n');
            const insertPos = lastNewline === -1 ? 0 : lastNewline + 1;
            
            const newText = text.substring(0, insertPos) + timestamp + " " + text.substring(insertPos);
            setLyricsText(newText);
        } else {
            setLyricsText(prev => prev + '\n' + timestamp + ' ');
        }
    };

    const handleSettingChange = <K extends keyof ProfileData['settings']['lyricsSettings']>(
        key: K, value: ProfileData['settings']['lyricsSettings'][K]
    ) => {
        onUpdateProfile(p => ({
            ...p,
            settings: { ...p.settings, lyricsSettings: { ...p.settings.lyricsSettings, [key]: value } }
        }));
    };
    
    const animationStyles: ProfileData['settings']['lyricsSettings']['animation'][] = ['scroll', 'karaoke', 'fade-in', 'typewriter', 'slide-up', 'blur-in'];

    const handleDeepAnalysis = async () => {
        if (isAnalyzing || !song) return;
        setIsAnalyzing(true);
        showNotification(isRadio ? "Gnos is capturing live stream for analysis..." : "Gnos is performing Deep Neural Analysis...", "info");
        try {
            let base64Data: string | undefined;
            if (!isRadio && song.audioData) {
                const blob = new Blob([song.audioData], { type: song.mimeType || 'audio/mpeg' });
                base64Data = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }

            const mediaInput = isRadio ? { audio: { audioUrl: song.url } } : { audio: { base64: base64Data, mimeType: song.mimeType } };
            const result = await aiService.analyzeMedia(mediaInput as any, {});
            
            // Format segments into lyrics-like text
            const formattedLyrics = result.segments.map((s: any) => `[${s.timestamp}] ${s.content}`).join('\n');
            
            setSaveChoiceText(formattedLyrics);
            showNotification("Analysis Complete", "success");
        } catch (e) { 
            console.error(e);
            showNotification("Analysis failed", "error"); 
        } finally { 
            setIsAnalyzing(false); 
        }
    };

    const renderAiContent = () => (
        <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1 pb-16 scroll-container">
            {/* If lyrics text exists, show the AI Vibe & Meaning Analysis */}
            {lyricsText ? (
                <div className="mb-4">
                    <LyricsAnalysis 
                        songTitle={song.title} 
                        artist={song.artist} 
                        lyricsText={lyricsText} 
                    />
                </div>
            ) : (
                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles size={20} className="text-[var(--primary-accent)]" />
                            <h3 className="font-bold text-[var(--text-primary)]">Deep Analysis</h3>
                        </div>
                        <button 
                            onClick={handleDeepAnalysis}
                            disabled={isAnalyzing}
                            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isAnalyzing ? 'bg-white/5 text-white/40' : 'bg-[var(--primary-accent)] text-black hover:scale-105'}`}
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                        </button>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Gnos will scan the audio to extract lyrics, timestamps, and analyze the mood and vibe of the track.
                    </p>
                </div>
            )}

            <div className="flex-shrink-0 border-t border-white/5 pt-4">
                <h3 className="font-bold text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-3">AI Audio Transcriber</h3>
                <TranscriptionView 
                    profile={profile} 
                    onSave={(text) => {
                        if (isRadio) {
                            onSaveRadioNotes(song.id, text);
                            setActiveTab('notes');
                        } else {
                            setSaveChoiceText(text);
                        }
                    }} 
                    audioRef={audioRef} 
                />
            </div>
        </div>
    );

    const renderOnlineSearchContent = () => {
        if (selectedLyricsResult && (lyricsPreview || syncedLyricsPreview)) {
            return (
                <div className="flex flex-col h-full space-y-4 text-left">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        {selectedLyricsResult.thumbnail ? (
                            <img src={selectedLyricsResult.thumbnail} alt={selectedLyricsResult.title} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-[var(--chip-bg)] flex items-center justify-center text-[var(--primary-accent)]">
                                <Music size={20} />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate text-[var(--text-primary)]">{selectedLyricsResult.title}</h4>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{selectedLyricsResult.artist}</p>
                            <span className="inline-block mt-1 text-[9px] font-black uppercase bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] px-2 py-0.5 rounded-full">
                                {syncedLyricsPreview ? 'Timed (LRC)' : 'Plain Text'}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-black/20 rounded-2xl p-4 border border-white/5 overflow-y-auto max-h-[300px]">
                        <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--text-secondary)] leading-relaxed select-text text-left">
                            {syncedLyricsPreview || lyricsPreview || "No lyrics content found."}
                        </pre>
                    </div>

                    <div className="flex flex-col gap-2">
                        {syncedLyricsPreview && (
                            <button
                                onClick={() => {
                                    onUpdateSong({ ...song, lyrics: syncedLyricsPreview });
                                    setLyricsText(syncedLyricsPreview);
                                    setIsSearchingOnline(false);
                                    setIsEditingLyrics(false);
                                    setSelectedLyricsResult(null);
                                    showNotification('Synchronized lyrics saved successfully!', 'success');
                                }}
                                className="w-full bg-[var(--primary-accent)] text-black font-black py-3 rounded-full hover:scale-105 transition-transform text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                            >
                                <Check size={14} /> Save Timed Lyrics
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const targetLyrics = lyricsPreview || syncedLyricsPreview;
                                onUpdateSong({ ...song, lyrics: targetLyrics });
                                setLyricsText(targetLyrics);
                                setIsSearchingOnline(false);
                                setIsEditingLyrics(false);
                                setSelectedLyricsResult(null);
                                showNotification('Plain lyrics saved successfully!', 'success');
                            }}
                            className={`${syncedLyricsPreview ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' : 'bg-[var(--primary-accent)] text-black font-black hover:scale-105'} w-full py-3 rounded-full transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2`}
                        >
                            {!syncedLyricsPreview && <Check size={14} />} Save Plain Lyrics
                        </button>
                        <button
                            onClick={() => {
                                setSelectedLyricsResult(null);
                                setLyricsPreview('');
                                setSyncedLyricsPreview('');
                            }}
                            className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-white py-2"
                        >
                            Back to Search Results
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full space-y-4 text-left">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleOnlineSearch(searchQuery)}
                            className="w-full bg-[var(--chip-bg)] text-[var(--text-primary)] rounded-full pl-10 pr-4 py-2.5 text-xs border border-white/5 focus:border-[var(--primary-accent)] outline-none"
                            placeholder="Song title and artist..."
                        />
                        <Search className="absolute left-3.5 top-3 text-[var(--text-secondary)]" size={14} />
                    </div>
                    <button
                        onClick={() => handleOnlineSearch(searchQuery)}
                        disabled={isSearchLoading}
                        className="bg-[var(--primary-accent)] text-black px-4 py-2.5 rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                        {isSearchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </button>
                </div>

                <div className="flex-1 min-h-[250px] overflow-y-auto space-y-2 pr-1">
                    {isSearchLoading && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                            <Loader2 size={28} className="animate-spin text-[var(--primary-accent)]" />
                            <p className="text-xs text-[var(--text-secondary)] text-center">Searching online catalog...</p>
                        </div>
                    )}

                    {!isSearchLoading && searchResults.length > 0 && searchResults.map((result) => (
                        <button
                            key={result.id}
                            onClick={() => handleSelectResult(result)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 group text-left transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {result.thumbnail ? (
                                    <img src={result.thumbnail} alt={result.title} className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[var(--chip-bg)] flex items-center justify-center text-[var(--primary-accent)]">
                                        <Music size={16} />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm truncate text-[var(--text-primary)] group-hover:text-[var(--primary-accent)] transition-colors">{result.title}</h4>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">{result.artist}</p>
                                    {result.album && <p className="text-[10px] text-white/40 truncate">{result.album}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {result.syncedLyrics && (
                                    <span className="text-[8px] font-black uppercase bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Timed</span>
                                )}
                                <ChevronRight className="text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" size={14} />
                            </div>
                        </button>
                    ))}

                    {!isSearchLoading && searchResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-secondary)]">
                            <Globe size={28} className="opacity-30 mb-2" />
                            <p className="text-xs">Type artist and title above to find lyrics online.</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => {
                        setIsSearchingOnline(false);
                        setSelectedLyricsResult(null);
                        setSearchResults([]);
                    }}
                    className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-white py-2"
                >
                    Cancel and Back
                </button>
            </div>
        );
    };

    const renderSyncedLyrics = () => {
        return (
            <div 
                className="lyrics-synced-container flex flex-col space-y-4 py-8"
                onScroll={handleScroll}
            >
                <div className="lyrics-badge synced self-center mb-6">✓ Synced</div>
                
                {/* Spacer to push first line down */}
                <div className="h-[25vh] pointer-events-none" />
                
                {parsedLyrics.map((line, index) => {
                    const isCurrent = index === currentLineIndex;
                    const isPast = index < currentLineIndex;
                    const isFuture = index > currentLineIndex;
                    const distance = Math.abs(index - currentLineIndex);
                    
                    return (
                        <motion.div
                            key={index}
                            ref={(el: HTMLDivElement | null) => { lineRefs.current[index] = el; }}
                            onClick={() => {
                                if (audioRef && audioRef.current) {
                                    audioRef.current.currentTime = line.time;
                                }
                            }}
                            className={`lyrics-line ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
                            animate={{
                                opacity: isCurrent ? 1 : Math.max(0.2, 1 - distance * 0.15),
                                scale: isCurrent ? 1.05 : 1,
                            }}
                            transition={{
                                duration: 0.4,
                                ease: [0.4, 0, 0.2, 1],
                            }}
                        >
                            <span className="lyrics-text">{line.text}</span>
                            
                            {/* Active line progress bar */}
                            {isCurrent && isPlaying && (
                                <motion.div
                                    className="lyrics-progress-indicator"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{
                                        duration: getNextLineDelay(index, parsedLyrics, progress),
                                        ease: 'linear',
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
                
                {/* Spacer to allow scrolling last line to center */}
                <div className="h-[35vh] pointer-events-none" />
            </div>
        );
    };

    const getNextLineDelay = (
      index: number,
      lyricsList: LyricLine[],
      currentTime: number
    ): number => {
      if (index >= lyricsList.length - 1) return 5;
      const nextTime = lyricsList[index + 1].time;
      const remaining = nextTime - currentTime;
      return Math.max(0.1, remaining);
    };

    const renderLyricsContent = () => {
        if (isSearchingOnline) {
            return renderOnlineSearchContent();
        }
        if (isEditingLyrics) {
            return (
                <div className="relative h-full">
                    <textarea
                        id="lyrics-editor"
                        value={lyricsText}
                        onChange={(e) => setLyricsText(e.target.value)}
                        className="w-full h-full bg-[var(--chip-bg)] text-[var(--text-primary)] rounded-lg p-4 text-base leading-relaxed resize-none focus:ring-2 focus:ring-[var(--primary-accent)] font-mono min-h-[300px]"
                        placeholder="Type or paste lyrics here..."
                    />
                    <button 
                        onClick={handleTimestamp} 
                        className="absolute bottom-4 right-4 bg-[var(--primary-accent)] text-black font-bold p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
                        title="Insert Timestamp"
                    >
                        <Clock size={24} />
                    </button>
                </div>
            );
        }
        if (!lyricsText) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6 animate-fade-in py-16">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[var(--primary-accent)]">
                        <Music size={32} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">No Lyrics Yet</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-[240px] leading-relaxed">
                            Search online using Genius or type them manually to display scrolling lyrics on playback.
                        </p>
                    </div>
                    <div className="flex flex-col w-full gap-2.5">
                        <button
                            onClick={() => {
                                setSearchQuery(`${song.title} ${song.artist}`);
                                setIsSearchingOnline(true);
                            }}
                            className="w-full bg-[var(--primary-accent)] text-black font-black py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform text-xs uppercase tracking-wider"
                        >
                            Search Online
                        </button>
                        <button
                            onClick={() => setIsEditingLyrics(true)}
                            className="w-full bg-white/5 text-[var(--text-primary)] border border-white/10 font-bold py-3.5 rounded-full hover:bg-white/10 transition-colors text-xs uppercase tracking-wider"
                        >
                            Write Manually
                        </button>
                    </div>
                </div>
            );
        }
        if (isSynced) {
            return renderSyncedLyrics();
        }
        return (
            <div
                ref={lyricsContentRef}
                className={`whitespace-pre-wrap text-center leading-loose text-[var(--text-primary)]`}
                style={{ fontFamily: fonts.find(f => f.name === lyricsSettings.fontFamily)?.family || 'Satoshi', fontSize: `${lyricsSettings.fontSize}px` }}
            >
                <p>{lyricsText}</p>
                {lyricsSettings.animation === 'scroll' && <p className="mt-8">{lyricsText}</p>}
            </div>
        );
    };

    const notesStyle = {
        fontFamily: fonts.find(f => f.name === lyricsSettings.fontFamily)?.family || 'Satoshi',
        fontSize: `${lyricsSettings.fontSize}px`,
        lineHeight: 1.6,
    };
    
    const renderNotesContent = () => (
        <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="w-full h-full bg-[var(--chip-bg)] text-[var(--text-primary)] rounded-lg p-4 resize-none focus:ring-2 focus:ring-[var(--primary-accent)]"
            placeholder="Jot down your notes here..."
            style={notesStyle}
        />
    );

    return (
        <div className="fixed inset-0 lg:left-auto lg:right-0 lg:w-[460px] bg-black/70 lg:bg-transparent z-[300] flex items-center justify-center lg:items-stretch p-4 lg:p-6 pointer-events-none" onClick={onClose}>
            <div className="liquid-glass-pane rounded-3xl flex flex-col w-full h-[85vh] lg:h-full overflow-hidden shadow-2xl relative bg-[var(--surface-color)]/95 backdrop-blur-xl border border-white/10 pointer-events-auto" onClick={e => e.stopPropagation()}>
                
                {/* Spacious Left column hidden to keep the card single-column and compact on desktop */}
                <div className="hidden flex-col w-2/3 border-r border-[var(--surface-border-color)] overflow-hidden">
                    <header className="flex items-center justify-between p-4 border-b border-[var(--surface-border-color)] flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Music size={18} className="text-[var(--primary-accent)] animate-pulse" />
                            <span className="font-black text-xs uppercase tracking-widest text-[var(--text-primary)]">Lyrics Reading Room</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsAnimationPlaying(p => !p)} className="bg-[var(--chip-bg)] text-[var(--text-primary)] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all">
                                {animationShouldBeActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                <span>{animationShouldBeActive ? 'Pause Scroll' : 'Auto Scroll'}</span>
                            </button>
                        </div>
                    </header>
                    
                    <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto p-8 relative lyrics-content-container select-none scroll-container">
                        <div ref={lyricsContentRef} style={{
                            fontFamily: fonts.find(f => f.name === lyricsSettings.fontFamily)?.family || 'Satoshi',
                            fontSize: `${lyricsSettings.fontSize + 4}px`, // slightly larger on desktop
                            lineHeight: 1.8
                        }} className="text-center font-bold text-[var(--text-primary)] whitespace-pre-wrap leading-loose">
                            {lyricsText ? (
                                <p className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                    {lyricsText}
                                </p>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-16 gap-3">
                                    <Feather size={48} className="opacity-40 animate-pulse text-[var(--primary-accent)]" />
                                    <p className="italic text-sm">No lyrics saved yet. Use the editor on the right or search online to add them!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side (Sidebar on Desktop / Full modal on Mobile) */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <header className="flex items-center justify-between p-3 border-b border-[var(--surface-border-color)] flex-shrink-0">
                        {!isRadio ? (
                             <div className="flex items-center gap-1 p-1 bg-[var(--chip-bg)] rounded-full">
                                <button onClick={() => setActiveTab('lyrics')} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${activeTab === 'lyrics' ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>
                                    <span>Lyrics</span>
                                </button>
                                <button onClick={() => setActiveTab('notes')} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${activeTab === 'notes' ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>Notes</button>
                                <button onClick={() => setActiveTab('ai')} className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${activeTab === 'ai' ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'}`}>AI & Sync</button>
                            </div>
                        ) : (
                             <div className="flex items-center gap-1 p-1 bg-[var(--chip-bg)] rounded-full">
                                <button onClick={() => setActiveTab('notes')} className="px-3 py-1 text-sm font-bold rounded-full bg-[var(--surface-color)] text-[var(--text-primary)] shadow-sm">Notes</button>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            {activeTab === 'lyrics' && !isSearchingOnline && (
                                <button
                                    onClick={() => {
                                        setSearchQuery(`${song.title} ${song.artist}`);
                                        setIsSearchingOnline(true);
                                    }}
                                    className="bg-[var(--primary-accent)] text-black w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                    title="Search Online"
                                >
                                    <Globe size={16} />
                                </button>
                            )}
                            {activeTab === 'lyrics' && (
                                isEditingLyrics ? (
                                    <button 
                                        onClick={handleSaveLyrics} 
                                        className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                        title="Save Lyrics"
                                    >
                                        <Check size={16} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setIsEditingLyrics(true)} 
                                        className="bg-[var(--chip-bg)] text-[var(--text-primary)] w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 hover:bg-[var(--surface-border-color)]"
                                        title="Edit Lyrics"
                                    >
                                        <PenLine size={16} />
                                    </button>
                                )
                            )}
                            {activeTab === 'notes' && (
                                <button 
                                    onClick={handleSaveNotes} 
                                    className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                    title="Save Notes"
                                >
                                    <Check size={16} />
                                </button>
                            )}
                            
                            {/* Export Lyrics & Notes button */}
                            <button 
                                onClick={handleExport} 
                                className="bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--primary-accent)] w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" 
                                title="Export Lyrics & Notes"
                            >
                                <Download size={16} />
                            </button>

                            <button onClick={() => setIsSettingsOpen(p => !p)} className={`lyrics-settings-toggle-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-8 h-8 rounded-full flex items-center justify-center ${isSettingsOpen ? 'bg-[var(--primary-accent)] text-black' : 'bg-[var(--chip-bg)]'}`}><Settings size={18} /></button>
                            <button onClick={onMinimize} className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-8 h-8 rounded-full bg-[var(--chip-bg)] flex items-center justify-center"><Minus size={18} /></button>
                            <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-8 h-8 rounded-full bg-[var(--chip-bg)] flex items-center justify-center"><X size={18} /></button>
                        </div>
                    </header>
                    
                    <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto lyrics-content-container p-6 gpu-accelerated-scroll relative scroll-container">
                        {saveChoiceText && (
                            <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-6 animate-fade-in">
                                <div className="bg-[var(--surface-color)] p-6 rounded-2xl shadow-2xl border border-[var(--surface-border-color)] text-center space-y-4">
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Save Transcription</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Where would you like to save this text?</p>
                                    <div className="flex flex-col gap-2">
                                        <button 
                                            onClick={() => {
                                                onUpdateSong({ ...song, lyrics: saveChoiceText });
                                                setLyricsText(saveChoiceText);
                                                setSaveChoiceText(null);
                                                setActiveTab('lyrics');
                                            }}
                                            className="bg-[var(--primary-accent)] text-black font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform"
                                        >
                                            Save as Lyrics
                                        </button>
                                        <button 
                                            onClick={() => {
                                                onSaveNotes(song.id, saveChoiceText);
                                                setNotesText(saveChoiceText);
                                                setSaveChoiceText(null);
                                                setActiveTab('notes');
                                            }}
                                            className="bg-[var(--chip-bg)] text-[var(--text-primary)] font-bold py-3 px-6 rounded-full hover:bg-[var(--surface-border-color)] transition-colors"
                                        >
                                            Save as Notes
                                        </button>
                                        <button 
                                            onClick={() => setSaveChoiceText(null)}
                                            className="text-[var(--text-secondary)] text-sm pt-2 hover:text-[var(--text-primary)]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* On desktop, show editor if activeTab is lyrics */}
                        {activeTab === 'lyrics' ? renderLyricsContent() : activeTab === 'notes' ? renderNotesContent() : renderAiContent()}
                    </div>

                    <footer className="p-3 border-t border-[var(--surface-border-color)] flex-shrink-0">
                        {activeTab === 'lyrics' && isEditingLyrics ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[var(--chip-bg)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-full text-sm hover:bg-[var(--surface-border-color)]">Import from .txt</button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.lrc" className="hidden" />
                            </div>
                        ) : activeTab === 'lyrics' && !isEditingLyrics ? (
                            <div className="flex items-center gap-4">
                                 <img src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} alt={song.title} className="w-10 h-10 rounded object-cover" />
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate text-[var(--text-primary)]">{song.title}</p>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">{song.artist}</p>
                                </div>
                                {lyricsText && (
                                    <button onClick={handleTranslate} disabled={isTranslating} className="bg-[var(--chip-bg)] text-[var(--text-primary)] w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--surface-border-color)]">
                                        {isTranslating ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
                                    </button>
                                )}
                                <button onClick={() => setIsAnimationPlaying(p => !p)} className="text-2xl w-10 h-10 text-[var(--primary-accent)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                                    {animationShouldBeActive ? <Pause size={24} className="fill-[var(--primary-accent)]" /> : <Play size={24} className="fill-[var(--primary-accent)]" />}
                                </button>
                            </div>
                        ) : null}
                    </footer>
                </div>

                {isSettingsOpen && (
                    <div ref={settingsPanelRef} className="absolute top-16 right-4 bg-[var(--surface-color)] border border-[var(--surface-border-color)] p-4 rounded-xl shadow-lg w-72 space-y-4 animate-pop-in z-10">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)]">Font Size ({lyricsSettings.fontSize}px)</label>
                            <input type="range" min="12" max="40" value={lyricsSettings.fontSize} onChange={e => handleSettingChange('fontSize', parseInt(e.target.value))} className="w-full mt-1 themed-slider" style={{ backgroundSize: `${((lyricsSettings.fontSize - 12) / 28) * 100}% 100%` }} />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)]">Font Family</label>
                            <div ref={fontScrollerRef} className="prompt-scroller -mx-1 px-1 pt-2 pb-1">
                                <div ref={fontContentRef} className="slow-scroll-horizontal-content flex gap-2">
                                    {fonts.map(f => <button key={f.name+"1"} onClick={() => handleSettingChange('fontFamily', f.name)} className={`font-picker-button !text-sm !px-3 !py-1 ${lyricsSettings.fontFamily === f.name ? 'active' : ''}`}>{f.name}</button>)}
                                    {fonts.map(f => <button key={f.name+"2"} onClick={() => handleSettingChange('fontFamily', f.name)} className={`font-picker-button !text-sm !px-3 !py-1 ${lyricsSettings.fontFamily === f.name ? 'active' : ''}`}>{f.name}</button>)}
                                </div>
                            </div>
                        </div>
                        {activeTab === 'lyrics' && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)]">Animation Style</label>
                                    <div ref={animScrollerRef} className="prompt-scroller -mx-1 px-1 pt-2 pb-1">
                                        <div ref={animContentRef} className="slow-scroll-horizontal-content flex gap-2">
                                             {animationStyles.map(a => <button key={a+"1"} onClick={() => handleSettingChange('animation', a)} className={`font-picker-button !text-sm !px-3 !py-1 capitalize ${lyricsSettings.animation === a ? 'active' : ''}`}>{a.replace('-', ' ')}</button>)}
                                             {animationStyles.map(a => <button key={a+"2"} onClick={() => handleSettingChange('animation', a)} className={`font-picker-button !text-sm !px-3 !py-1 capitalize ${lyricsSettings.animation === a ? 'active' : ''}`}>{a.replace('-', ' ')}</button>)}
                                        </div>
                                    </div>
                                </div>
                                 <div>
                                    <div className="flex justify-between text-[var(--text-secondary)]">
                                        <label className="text-xs font-bold">Scroll Speed</label>
                                        <span className="text-xs">{lyricsSettings.animationSpeed.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                                        <span>Slower</span>
                                        <span>Faster</span>
                                    </div>
                                    <input type="range" min="0.5" max="20" step="0.5" value={lyricsSettings.animationSpeed} onChange={e => handleSettingChange('animationSpeed', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((lyricsSettings.animationSpeed - 0.5) / 19.5) * 100}% 100%` }} />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyricsView;
