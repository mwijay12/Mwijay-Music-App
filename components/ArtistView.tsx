
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, Play, Sparkles, Loader2, Download, Music, Youtube, Instagram } from 'lucide-react';
import type { Song, Artist } from '../types.ts';
import { getArtist, fetchFromAudius, fetchFromArchive } from './db.ts';
import { getPremiumGradientCover } from '../utils/helpers.ts';
import { getRandomCoverArt } from './constants.ts';
import BubbleButton from './BubbleButton.tsx';
import { GoogleGenAI } from '@google/genai';
import SongListItem from './SongListItem.tsx';

interface ArtistViewProps {
    artistName: string;
    allSongs: Song[];
    onPlaySong: (song: Song, context: Song[]) => void;
    onBack: () => void;
    onSaveArtist: (artist: Artist) => void;
    onAddSongs: (songs: Song[]) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    nowPlaying: Song | null;
    apiKey?: string;
    onOpenLyrics?: (song: Song) => void;
}

const ArtistView: React.FC<ArtistViewProps> = ({ artistName, allSongs, onPlaySong, onBack, onSaveArtist, onAddSongs, showNotification, nowPlaying, apiKey, onOpenLyrics }) => {
    const artistSongs = allSongs.filter(s => s.artist === artistName);
    const defaultImage = artistSongs[0]?.albumArtUrl || 'https://i.imgur.com/vB62j5K.png';

    const [artistData, setArtistData] = useState<Artist>({ name: artistName, avatarUrl: defaultImage, bannerUrl: defaultImage, bio: '' });
    const [isEditing, setIsEditing] = useState(false);
    
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);

    const [onlineSongs, setOnlineSongs] = useState<Song[]>([]);
    const [isLoadingOnline, setIsLoadingOnline] = useState(false);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    
    const [aiInsights, setAiInsights] = useState<{
        links?: { title: string, url: string }[],
        news?: string
    } | null>(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);

    useEffect(() => {
        const fetchArtistData = async () => {
            const storedArtist = await getArtist(artistName);
            if (storedArtist) {
                setArtistData(prev => ({...prev, ...storedArtist}));
            } else {
                 setArtistData({ name: artistName, avatarUrl: defaultImage, bannerUrl: defaultImage, bio: `Songs by ${artistName}. Edit this bio to add more details!` });
            }
        };
        fetchArtistData();

        const fetchOnlineSongs = async () => {
            setIsLoadingOnline(true);
            try {
                const backendPromise = fetch(`/api/search?q=${encodeURIComponent(artistName)}&sources=deezer,itunes,audius,archive&limit=25`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (!data) return [];
                        return (data.results || []).map((r: any) => ({
                            id: r.id || `online-${Math.random()}`,
                            title: r.title || 'Unknown Title',
                            artist: r.artist || 'Unknown Artist',
                            albumArtUrl: r.thumbnail || r.albumArtUrl || '',
                            url: r.url || '',
                            duration: r.duration_seconds || r.duration || 30,
                            source: r.source || r.best_source || 'Online'
                        }));
                    })
                    .catch(() => []);

                const fallbackPromise = Promise.all([
                    fetchFromAudius(artistName, 1, 15),
                    fetchFromArchive(artistName, 1, 15)
                ]).then(([a, b]) => [...a, ...b]).catch(() => []);

                // Race: use whichever resolves first with results
                const [backendSongs, fallbackSongs] = await Promise.all([backendPromise, fallbackPromise]);
                const combinedSongs = backendSongs.length > 0 ? backendSongs : fallbackSongs;
                const libraryIds = new Set(allSongs.map(s => s.id));
                const newOnlineSongs = combinedSongs.filter((s: any) => !libraryIds.has(s.id));
                setOnlineSongs(newOnlineSongs);
            } catch (error) {
                console.log('Failed to fetch online songs for this artist.');
            }
            setIsLoadingOnline(false);
        };
        fetchOnlineSongs();
        
        // AI Insights
        if (apiKey && navigator.onLine && artistName !== 'Unknown Artist') {
            const fetchInsights = async () => {
                setIsLoadingInsights(true);
                try {
                    const ai = new GoogleGenAI({ apiKey });
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Find official social links (YouTube, Spotify, Instagram) and one recent news item or release for the artist "${artistName}". 
                        Return RAW JSON ONLY. No markdown, no code blocks. 
                        Format: { "links": [{"title": "YouTube", "url": "..."}], "news": "..." }`,
                        config: { 
                            responseMimeType: 'application/json',
                            tools: [{ googleSearch: {} }]
                        }
                    });
                    
                    let text = response.text || '{}';
                    text = text.replace(/```json|```/g, '').trim();
                    
                    const data = JSON.parse(text);
                    if (data.links || data.news) {
                        setAiInsights(data);
                    }
                } catch (e) {
                    console.error("AI insights failed", e);
                } finally {
                    setIsLoadingInsights(false);
                }
            };
            fetchInsights();
        }

    }, [artistName, defaultImage, allSongs, apiKey]);
    
    const isNowPlayingInView = useMemo(() => {
        if (!nowPlaying) return false;
        return artistSongs.some(s => s.id === nowPlaying.id);
    }, [artistSongs, nowPlaying]);

    const handleJumpToSong = () => {
        if (nowPlaying) {
             const el = document.getElementById(`artist-song-${nowPlaying.id}`);
             if(el) {
                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 setHighlightedSongId(nowPlaying.id);
                 setTimeout(() => setHighlightedSongId(null), 1500);
             }
        }
    };

    const handlePlayAll = () => {
        if (artistSongs.length > 0) {
            onPlaySong(artistSongs[0], artistSongs);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                if(type === 'avatar') setArtistData(p => ({ ...p, avatarUrl: url }));
                else setArtistData(p => ({...p, bannerUrl: url}));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSaveArtist(artistData);
        setIsEditing(false);
    };

    const handleDownloadAll = async () => {
        setIsDownloadingAll(true);
        showNotification(`Starting download of ${onlineSongs.length} songs...`, 'info');
        
        const songsToDownload = onlineSongs.filter(s => !allSongs.some(ls => ls.id === s.id));
        const downloadedSongs: Song[] = [];
        
        for (const song of songsToDownload) {
            try {
                let songToDownload = { ...song };
                if (!songToDownload.url && songToDownload.source === 'Archive.org') {
                     const identifier = song.id.replace('archive-', '');
                     const metadataResponse = await fetch(`https://archive.org/metadata/${identifier}`);
                     if (!metadataResponse.ok) throw new Error('Failed to fetch metadata');
                     const metadata = await metadataResponse.json();
                     const audioFile = metadata.files.find((f: any) => f.format === 'VBR MP3') || metadata.files.find((f: any) => ['MP3', 'OGG', 'FLAC', 'WAV'].includes(f.format));
                     if (!audioFile) throw new Error('No playable file found');
                     songToDownload.url = `https://archive.org/download/${identifier}/${encodeURIComponent(audioFile.name)}`;
                }
                
                if (!songToDownload.url) continue;
                const response = await fetch(songToDownload.url);
                if (!response.ok) throw new Error(`Network response was not ok`);
                const audioData = await response.arrayBuffer();
                downloadedSongs.push({ ...songToDownload, audioData });
            } catch (err) {
                console.error(`Failed to download "${song.title}":`, String(err));
            }
        }
        
        if (downloadedSongs.length > 0) {
            onAddSongs(downloadedSongs);
            showNotification(`Successfully downloaded ${downloadedSongs.length} new songs!`, 'success');
            setOnlineSongs(prev => prev.filter(s => !downloadedSongs.some(ds => ds.id === s.id)));
        } else {
            showNotification(`No new songs downloaded.`, 'info');
        }
        setIsDownloadingAll(false);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 100);
    };

    return (
        <main onScroll={handleScroll} className="h-full w-full bg-[var(--bg-color)] overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll">
            {/* Sticky Navigation Header */}
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <div className="header-actions-left absolute top-1/2 -translate-y-1/2 left-6 z-50">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--surface-border-color)]" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
                <h2 className="header-small-title">{artistName}</h2>
                <div className="header-actions-right">
                    {isEditing ? (
                        <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white font-bold rounded-full text-sm">Save</button>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-[var(--surface-color)] text-[var(--text-primary)] font-bold rounded-full text-sm border border-[var(--surface-border-color)]">Edit</button>
                    )}
                </div>
            </div>

            {/* Banner & Avatar Section */}
            <div className="relative w-full aspect-[2/1] sm:aspect-[3/1] max-h-[300px]">
                <img 
                    src={artistData.bannerUrl} 
                    alt={`${artistName} banner`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        if (!e.currentTarget.dataset.fallbackApplied) {
                            e.currentTarget.dataset.fallbackApplied = 'true';
                            e.currentTarget.src = getRandomCoverArt();
                        }
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/50 to-transparent"></div>
                {isEditing && (
                    <button onClick={() => bannerInputRef.current?.click()} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full z-10"><Camera size={20} /></button>
                )}
                
                <div className="absolute bottom-4 left-6 flex items-end gap-4 z-10 w-[calc(100%-3rem)]">
                    <div className="relative">
                        <img 
                            src={artistData.avatarUrl} 
                            alt={artistName} 
                            className="w-24 h-24 rounded-full border-4 border-[var(--bg-color)] object-cover shadow-xl"
                            onError={(e) => { e.currentTarget.src = getRandomCoverArt(); }}
                        />
                        {isEditing && (
                            <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full text-white flex items-center justify-center"><Camera size={24} /></button>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                        <h1 className="text-3xl font-bold text-white truncate drop-shadow-md">{artistName}</h1>
                        <p className="text-sm text-neutral-300 drop-shadow-md">{artistSongs.length} songs</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 flex items-center gap-4">
                <button onClick={handlePlayAll} className="flex-1 bg-[var(--primary-accent)] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform">
                    <Play size={20} fill="currentColor" />
                    <span>Play All</span>
                </button>
            </div>

            <div className="px-6 pb-40 space-y-6">
                 {/* Bio Section */}
                 <div className="bg-[var(--surface-color)] p-4 rounded-xl border border-[var(--surface-border-color)]">
                    <h3 className="font-bold text-[var(--text-primary)] mb-2">About</h3>
                    {isEditing ? (
                        <textarea value={artistData.bio} onChange={e => setArtistData(p => ({...p, bio: e.target.value}))} className="w-full h-24 bg-black/20 rounded p-2 text-sm resize-none text-[var(--text-primary)]" />
                    ) : (
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{artistData.bio}</p>
                    )}
                 </div>

                 {/* AI Insights Section */}
                 {(aiInsights || isLoadingInsights) && (
                     <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-white/10 p-4 rounded-xl animate-fade-in">
                        <h3 className="font-bold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                            <Sparkles size={18} className="text-[var(--primary-accent)]" /> Artist Insights
                        </h3>
                        {isLoadingInsights ? (
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 size={16} className="animate-spin" /> Finding info online...</div>
                        ) : (
                            <div className="space-y-3">
                                {aiInsights?.news && (
                                    <div className="text-sm text-neutral-200 bg-black/20 p-3 rounded-lg border-l-2 border-[var(--primary-accent)]">
                                        <strong>Latest:</strong> {aiInsights.news}
                                    </div>
                                )}
                                {aiInsights?.links && aiInsights.links.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {aiInsights.links.map((link, i) => {
                                            const isYoutube = link.title.toLowerCase().includes('youtube');
                                            const isInstagram = link.title.toLowerCase().includes('instagram');
                                            return (
                                                <a 
                                                    key={i} 
                                                    href={link.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-[var(--chip-bg)] hover:bg-[var(--primary-accent)] hover:text-black px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 text-[var(--text-primary)]"
                                                >
                                                    {isYoutube ? <Youtube size={12} /> : isInstagram ? <Instagram size={12} /> : <Music size={12} />}
                                                    {link.title}
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                 )}

                {/* Local Songs */}
                <div className="space-y-2">
                     <h3 className="font-bold text-[var(--text-primary)]">Songs in Library</h3>
                     <ul className="space-y-1">
                        {artistSongs.map(song => (
                             <SongListItem
                                key={song.id}
                                domId={`artist-song-${song.id}`}
                                song={song}
                                onPlaySong={() => onPlaySong(song, artistSongs)}
                                onAddToQueue={() => {}} 
                                onOpenDetails={() => {}} 
                                onViewArtist={() => {}} 
                                isHighlighted={song.id === highlightedSongId}
                                nowPlaying={nowPlaying}
                                isPlaying={!!nowPlaying} 
                                showActions={true}
                                onOpenLyrics={onOpenLyrics ? () => onOpenLyrics(song) : undefined}
                            />
                        ))}
                    </ul>
                </div>

                {/* Online Results */}
                {onlineSongs.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-bold text-[var(--text-primary)]">Online Results</h3>
                        <ul className="space-y-1">
                            {onlineSongs.map(song => (
                                <li key={song.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors cursor-pointer" onClick={() => onPlaySong(song, onlineSongs)}>
                                    <img src={song.albumArtUrl || getPremiumGradientCover(song.title, song.artist)} alt={song.title} className="w-12 h-12 rounded-md bg-[var(--chip-bg)] object-cover" onError={(e) => { e.currentTarget.src = getPremiumGradientCover(song.title, song.artist); }}/>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm leading-tight text-[var(--text-primary)]">{song.title}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{song.source}</p>
                                    </div>
                                    <button className="w-10 h-10 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={18} fill="currentColor" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            
            {/* Floating Action Buttons */}
            <div className="fixed bottom-[calc(var(--footer-height)+6rem)] right-6 z-50 flex flex-col gap-3">
                {onlineSongs.length > 0 && (
                    <BubbleButton 
                        onClick={handleDownloadAll} 
                        className={`!p-0 !w-14 !h-14 flex items-center justify-center ${isDownloadingAll ? 'opacity-50 pointer-events-none' : ''}`} 
                        title="Download all online songs"
                    >
                         {isDownloadingAll ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                    </BubbleButton>
                )}
                
                {isNowPlayingInView && !onlineSongs.length && (
                    <BubbleButton onClick={handleJumpToSong} className="!p-0 !w-14 !h-14 flex items-center justify-center" title="Jump to current song">
                        <Music size={24} />
                    </BubbleButton>
                )}
            </div>
            
            <input type="file" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} accept="image/*" className="hidden" />
            <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" className="hidden" />
        </main>
    );
};

export default ArtistView;
