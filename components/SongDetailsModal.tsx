
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GoogleGenAI } from '@google/genai';
import type { Song, ProfileData } from '../types.ts';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';
import AnimatedCoverArt from './AnimatedCoverArt.tsx';
import { Camera, Sparkles, X, Lightbulb, Wand2, Pen, ChevronRight, Play, ListMusic, Share2, Download, Bell, Trash2, Loader2 } from 'lucide-react';
import MasteringStudioModal from './MasteringStudioModal.tsx';

interface SongDetailsModalProps {
    song: Song;
    onClose: () => void;
    onSave: (updatedSong: Song) => void;
    isOnlineSong?: boolean;
    onViewArtist?: (artistName: string) => void;
    onPlayNow?: () => void;
    onAddToQueue?: () => void;
    onDelete?: () => void;
    onSharePreview?: () => void;
    onDownloadFile?: () => void;
    onOpenRingtoneMaker?: () => void;
    profile: ProfileData;
    onGenerateAiCover: (song: Song) => void;
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SongDetailsModal: React.FC<SongDetailsModalProps> = ({ 
    song, onClose, onSave, isOnlineSong = false, onViewArtist, 
    onPlayNow, onAddToQueue, onDelete, onSharePreview, onDownloadFile, 
    onOpenRingtoneMaker, profile, onGenerateAiCover, showNotification
}) => {
    const [title, setTitle] = useState(song.title);
    const [artist, setArtist] = useState(song.artist);
    const [albumArtUrl, setAlbumArtUrl] = useState(song.albumArtUrl);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isTagging, setIsTagging] = useState(false);
    const [isFetchingTrivia, setIsFetchingTrivia] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [isMasteringOpen, setIsMasteringOpen] = useState(false);

    useEffect(() => {
        setTitle(song.title);
        setArtist(song.artist);
        setAlbumArtUrl(song.albumArtUrl);
        setImgError(false);
    }, [song]);
    
    const handleViewArtistClick = () => {
        if (onViewArtist) {
            onViewArtist(song.artist);
        }
    };

    const handleSave = () => {
        onSave({ ...song, title, artist, albumArtUrl });
        onClose();
    };
    
    const handleGenerateClick = () => {
        onGenerateAiCover({ ...song, title, artist, albumArtUrl });
    };

    const handleAutoTag = async () => {
        if (!profile.apiKey) {
            showNotification("API Key required for Auto-Tagging. Please add it in Settings.", "error");
            return;
        }
        setIsTagging(true);
        try {
            const ai = new GoogleGenAI({ apiKey: profile.apiKey });
            const prompt = `Analyze this filename/metadata and return a JSON object with "title" and "artist" properties. Clean it up, remove file extensions, underscores, and 'official video' text.
            Current Title: "${title}"
            Current Artist: "${artist}"
            Native Path: "${song.nativeUrl || ''}"`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const json = JSON.parse(response.text || '{}');
            if (json.title) setTitle(json.title);
            if (json.artist) setArtist(json.artist);
            showNotification("Metadata updated via AI", "success");
        } catch (e) {
            console.error("Auto-tag failed", e);
            showNotification("Failed to auto-tag. Please check your internet connection.", "error");
        } finally {
            setIsTagging(false);
        }
    };

    const handleFetchTrivia = async () => {
        if (!profile.apiKey) {
            showNotification("API Key required for AI Trivia.", "error");
            return;
        }
        setIsFetchingTrivia(true);
        try {
            const ai = new GoogleGenAI({ apiKey: profile.apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Tell me a short, interesting fun fact about the song "${title}" by ${artist}. 
                Keep it under 30 words. If unknown, say "This track is a mystery!".`,
                config: { tools: [{ googleSearch: {} }] }
            });
            if (response.text) {
                showNotification(response.text.trim(), "info");
            }
        } catch (e) {
            console.error(e);
            showNotification("Failed to get trivia.", "error");
        } finally {
            setIsFetchingTrivia(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onClose}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="liquid-glass-pane glare-effect rounded-3xl flex flex-col md:flex-row w-full max-w-sm md:max-w-3xl max-h-[90vh] md:h-[520px] overflow-hidden shadow-2xl relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close button placed at top-right of modal */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md z-50 transition-colors border border-white/10" aria-label="Close modal">
                        <X size={20} />
                    </button>

                    {/* Header with Image - acts as left column on desktop */}
                    <header className="relative h-44 md:h-full md:w-[320px] flex-shrink-0 group overflow-hidden">
                        {!imgError && albumArtUrl ? (
                            <img 
                                src={albumArtUrl} 
                                alt={title} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="w-full h-full">
                                <AnimatedCoverArt id={song.id} shape="square" />
                            </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />
                        
                        {/* Buttons Overlay */}
                        {!isOnlineSong && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                                <button onClick={() => setIsPickerOpen(true)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-5 py-2.5 rounded-full font-bold text-white transition-all transform hover:scale-105 shadow-lg border border-white/10">
                                    <Camera size={18} /> <span>Change Art</span>
                                </button>
                                {profile.settings.aiCoverArtEnabled && (
                                    <button onClick={handleGenerateClick} className="flex items-center gap-2 bg-[var(--primary-accent)] hover:brightness-110 text-black px-5 py-2.5 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-[var(--primary-accent)]/30">
                                        <Sparkles size={18} /> <span>AI Generate</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </header>

                    {/* Right column on desktop - holds scrollable form inputs and actions */}
                    <div className="flex flex-col flex-1 md:h-full min-w-0 overflow-hidden">
                        {/* Form Content */}
                        <div className="p-6 space-y-5 overflow-y-auto scroll-container flex-1 bg-gradient-to-b from-transparent to-[var(--surface-color)]/30">
                             {/* Auto Tag Button */}
                             {!isOnlineSong && (
                                 <div className="flex justify-between -mt-2">
                                     <button 
                                        onClick={handleFetchTrivia}
                                        disabled={isFetchingTrivia}
                                        className="text-[10px] font-bold uppercase tracking-wider bg-purple-50/10 text-purple-400 hover:bg-purple-50/20 px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50"
                                     >
                                        {isFetchingTrivia ? <Loader2 className="animate-spin" size={12} /> : <Lightbulb size={12} />}
                                        {isFetchingTrivia ? 'Thinking...' : 'AI Trivia'}
                                     </button>
                                     <button 
                                        onClick={handleAutoTag} 
                                        disabled={isTagging} 
                                        className="text-[10px] font-bold uppercase tracking-wider bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] hover:bg-[var(--primary-accent)]/20 px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50"
                                     >
                                        {isTagging ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />} 
                                        {isTagging ? 'Analyzing...' : 'Auto-Tag'}
                                     </button>
                                 </div>
                             )}

                            {/* Title Input */}
                            <div className="relative group/input">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Title</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => !isOnlineSong && setTitle(e.target.value)} 
                                    readOnly={isOnlineSong}
                                    className={`w-full bg-transparent border-b-2 border-white/10 focus:border-[var(--primary-accent)] py-2 text-xl font-bold text-[var(--text-primary)] outline-none transition-colors ${isOnlineSong ? 'cursor-default opacity-60' : ''}`} 
                                />
                                {!isOnlineSong && <Pen className="absolute right-2 bottom-3 text-[var(--text-secondary)] opacity-0 group-hover/input:opacity-100 transition-opacity" size={12} />}
                            </div>

                            {/* Artist Input */}
                            <div className="relative group/input">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Artist</label>
                                <input 
                                    type="text" 
                                    value={artist} 
                                    onChange={e => !isOnlineSong && setArtist(e.target.value)} 
                                    readOnly={isOnlineSong}
                                    className={`w-full bg-transparent border-b-2 border-white/10 focus:border-[var(--primary-accent)] py-2 text-lg font-medium text-[var(--text-primary)] outline-none transition-colors ${isOnlineSong ? 'cursor-default opacity-60' : ''}`} 
                                />
                                 {!isOnlineSong && <Pen className="absolute right-2 bottom-3 text-[var(--text-secondary)] opacity-0 group-hover/input:opacity-100 transition-opacity" size={12} />}
                            </div>

                            {onViewArtist && (
                                <button onClick={handleViewArtistClick} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-between px-4 group/artist transition-colors border border-white/5">
                                    <span className="text-sm font-bold text-[var(--text-secondary)] group-hover/artist:text-[var(--text-primary)]">More by this artist</span>
                                    <ChevronRight className="text-[var(--text-secondary)] group-hover/artist:translate-x-1 transition-transform" size={14} />
                                </button>
                            )}
                        </div>
                        
                        {/* Footer Actions */}
                        <footer className="p-4 border-t border-white/10 bg-[var(--surface-color)]/80 backdrop-blur-xl flex-shrink-0">
                            {!isOnlineSong ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1 pt-1 gap-2 overflow-x-auto scroll-container-horizontal pb-2">
                                        {onPlayNow && (
                                            <button onClick={onPlayNow} className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-white transition-colors group flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                                    <Play size={16} />
                                                </div>
                                                <span className="text-[9px] font-medium">Play</span>
                                            </button>
                                        )}
                                        {onAddToQueue && (
                                            <button onClick={onAddToQueue} className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-white transition-colors group flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                                    <ListMusic size={16} />
                                                </div>
                                                <span className="text-[9px] font-medium">Queue</span>
                                            </button>
                                        )}
                                        {onSharePreview && (
                                            <button onClick={onSharePreview} className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-white transition-colors group flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                                    <Share2 size={16} />
                                                </div>
                                                <span className="text-[9px] font-medium">Share</span>
                                            </button>
                                        )}
                                        {onDownloadFile && (
                                            <button onClick={onDownloadFile} className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-white transition-colors group flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                                    <Download size={16} />
                                                </div>
                                                <span className="text-[9px] font-medium">Save</span>
                                            </button>
                                        )}
                                        {onOpenRingtoneMaker && song.audioData && (
                                            <button onClick={onOpenRingtoneMaker} className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-white transition-colors group flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                                                    <Bell size={16} />
                                                </div>
                                                <span className="text-[9px] font-medium">Ringtone</span>
                                            </button>
                                        )}
                                        {song.audioData && (
                                            <button 
                                                onClick={() => setIsMasteringOpen(true)} 
                                                className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-white transition-colors group flex-shrink-0 animate-pulse"
                                                title="AI Mastering Studio"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 text-[var(--primary-accent)]">
                                                    <Sparkles size={16} />
                                                </div>
                                                <span className="text-[9px] font-medium">AI Master</span>
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button onClick={onDelete} className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300 transition-colors group flex-shrink-0">
                                                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20">
                                                    <Trash2 size={16} className="text-red-400" />
                                                </div>
                                                <span className="text-[9px] font-medium">Delete</span>
                                            </button>
                                        )}
                                    </div>

                                    <button onClick={handleSave} className="w-full bg-[var(--primary-accent)] hover:brightness-110 text-black font-bold py-4 rounded-xl shadow-lg shadow-[var(--primary-accent)]/20 transition-all mt-2 transform hover:scale-[1.02] active:scale-[0.98]">
                                        Save Changes
                                    </button>
                                </div>
                            ) : (
                                 <div className="space-y-3">
                                    <button onClick={onDownloadFile} className="w-full bg-[var(--primary-accent)] hover:brightness-110 text-black font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] transition-all">
                                        <Download size={18} /> Download to Library
                                    </button>
                                    {onSharePreview && (
                                        <button onClick={onSharePreview} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                            <Share2 size={18} /> Share Preview
                                        </button>
                                    )}
                                 </div>
                            )}
                        </footer>
                    </div>
                </motion.div>
            </div>
            {isPickerOpen && (
                <CoverArtPickerModal
                    onClose={() => setIsPickerOpen(false)}
                    onSelect={(url) => {
                       setAlbumArtUrl(url);
                       setIsPickerOpen(false);
                    }}
                />
            )}
            {isMasteringOpen && (
                <MasteringStudioModal
                    song={song}
                    onClose={() => {
                        setIsMasteringOpen(false);
                        onClose();
                    }}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default SongDetailsModal;
