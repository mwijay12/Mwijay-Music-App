import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Music, Sliders, Volume2, Check, AlertCircle, Loader2, Disc } from 'lucide-react';
import type { Song } from '../types.ts';
import { MasteringService, MasteringOptions } from '../services/masteringService.ts';
import { addOrUpdateSongs } from './db.ts';

interface MasteringStudioModalProps {
    song: Song;
    onClose: () => void;
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    onRefreshLibrary?: () => void;
}

const MasteringStudioModal: React.FC<MasteringStudioModalProps> = ({
    song,
    onClose,
    showNotification,
    onRefreshLibrary
}) => {
    // Interactive settings state
    const [preset, setPreset] = useState<MasteringOptions['preset']>('general');
    const [targetLoudness, setTargetLoudness] = useState<number>(-10); // default punchy
    const [bassPreservation, setBassPreservation] = useState<boolean>(true);
    const [outputFormat, setOutputFormat] = useState<MasteringOptions['outputFormat']>('mp3');

    // Pipeline processing state
    const [status, setStatus] = useState<'idle' | 'uploading' | 'waiting' | 'processing' | 'downloading' | 'succeeded' | 'failed'>('idle');
    const [progress, setProgress] = useState<number>(0); // 0 to 1
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleStartMastering = async () => {
        if (!song.audioData) {
            showNotification('Audio data is missing. Offline mastering is only available for local offline tracks.', 'error');
            return;
        }

        setStatus('uploading');
        setProgress(0);
        setErrorMessage('');

        const service = new MasteringService();

        try {
            // 1. Upload local track buffer
            const name = song.title.replace(/[^a-zA-Z0-9]/g, '_') + (outputFormat === 'mp3' ? '.mp3' : '.wav');
            const mimeType = song.mimeType || (outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav');
            const audioId = await service.uploadAudio(song.audioData, mimeType, name);

            // 2. Wait for audio check/preparation
            setStatus('waiting');
            await service.waitForAudioReady(audioId);

            // 3. Trigger mastering job
            setStatus('processing');
            const masteringId = await service.createMastering(audioId, {
                preset,
                targetLoudness,
                bassPreservation,
                outputFormat
            });

            // 4. Poll mastering job status
            const outputAudioId = await service.pollMastering(masteringId, (p) => {
                setProgress(p);
            });

            // 5. Download output buffer
            setStatus('downloading');
            const masteredBuffer = await service.downloadAudio(outputAudioId);

            // 6. Save as a new non-destructive track in database
            const masteredSong: Song = {
                ...song,
                id: `${song.id}-mastered-${Date.now()}`,
                title: `${song.title} (AI Mastered)`,
                audioData: masteredBuffer,
                mimeType: mimeType,
                dateAdded: Date.now(),
                isFavorite: false
            };

            await addOrUpdateSongs([masteredSong]);
            
            setStatus('succeeded');
            showNotification(`Mastering completed! "${masteredSong.title}" added to Library.`, 'success');
            if (onRefreshLibrary) {
                onRefreshLibrary();
            }
        } catch (e: any) {
            console.error('[MasteringStudioModal] Error:', e);
            setStatus('failed');
            setErrorMessage(e.message || 'An unexpected mastering error occurred.');
            showNotification('Mastering failed. Check configurations.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="liquid-glass-pane glare-effect rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative bg-[var(--surface-color)] border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-[var(--primary-accent)]" size={20} />
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">AI Mastering Studio</h3>
                    </div>
                    {status !== 'uploading' && status !== 'waiting' && status !== 'processing' && status !== 'downloading' && (
                        <button onClick={onClose} className="text-white/60 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </header>

                <div className="p-6 space-y-6">
                    {status === 'idle' && (
                        <>
                            {/* Track Info Card */}
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 text-left">
                                <div className="w-12 h-12 rounded-lg bg-[var(--primary-accent)]/10 flex items-center justify-center text-[var(--primary-accent)] flex-shrink-0">
                                    <Music size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm truncate text-[var(--text-primary)]">{song.title}</h4>
                                    <p className="text-xs text-[var(--text-secondary)] truncate">{song.artist}</p>
                                </div>
                            </div>

                            {/* Preset Selector */}
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                    <Sliders size={12} /> Character Preset
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['general', 'pop', 'jazz', 'classical'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPreset(p)}
                                            className={`py-3 px-4 rounded-xl text-xs font-bold capitalize border transition-all ${preset === p ? 'bg-[var(--primary-accent)] text-black border-[var(--primary-accent)]' : 'bg-white/5 text-[var(--text-primary)] border-white/5 hover:bg-white/10'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Loudness Slider */}
                            <div className="space-y-2 text-left">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                                        <Volume2 size={12} /> Target Loudness
                                    </label>
                                    <span className="text-xs font-bold text-[var(--primary-accent)]">{targetLoudness} dB</span>
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="range"
                                        min="-16"
                                        max="-5"
                                        step="1"
                                        value={targetLoudness}
                                        onChange={(e) => setTargetLoudness(parseInt(e.target.value))}
                                        className="w-full themed-slider"
                                        style={{ backgroundSize: `${((targetLoudness - (-16)) / 11) * 100}% 100%` }}
                                    />
                                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                                        <span>-16 dB (Dynamic)</span>
                                        <span>-10 dB (Standard)</span>
                                        <span>-5 dB (Hot/Loud)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bass Preservation Switch */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Bass Preservation</h4>
                                    <p className="text-[10px] text-[var(--text-secondary)]">Keep sub-frequencies punchy and defined</p>
                                </div>
                                <button
                                    onClick={() => setBassPreservation(!bassPreservation)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center ${bassPreservation ? 'bg-[var(--primary-accent)] justify-end' : 'bg-white/10 justify-start'}`}
                                >
                                    <motion.div layout className="w-4 h-4 rounded-full bg-black" />
                                </button>
                            </div>

                            {/* Output Format selector */}
                            <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] pt-2 px-2">
                                <span className="font-bold uppercase tracking-wider">Output Format</span>
                                <div className="flex gap-2">
                                    {(['mp3', 'wav'] as const).map((fmt) => (
                                        <button
                                            key={fmt}
                                            onClick={() => setOutputFormat(fmt)}
                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${outputFormat === fmt ? 'bg-white/20 text-white' : 'hover:text-white'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleStartMastering}
                                className="w-full bg-[var(--primary-accent)] text-black font-black py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wider shadow-lg shadow-[var(--primary-accent)]/20"
                            >
                                Start Mastering Enhancement
                            </button>
                        </>
                    )}

                    {status !== 'idle' && status !== 'succeeded' && status !== 'failed' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="relative flex items-center justify-center">
                                <Loader2 className="animate-spin text-[var(--primary-accent)]" size={48} />
                                <Disc className="absolute text-[var(--primary-accent)]/40" size={24} />
                            </div>
                            <div className="text-center space-y-2">
                                <h4 className="font-black uppercase tracking-wider text-xs text-[var(--primary-accent)]">
                                    {status === 'uploading' && 'Uploading track to studio...'}
                                    {status === 'waiting' && 'Analyzing audio signatures...'}
                                    {status === 'processing' && `Processing Master (${(progress * 100).toFixed(0)}%)`}
                                    {status === 'downloading' && 'Downloading mastered file...'}
                                </h4>
                                <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
                                    {status === 'uploading' && 'Preparing raw binary streams for serverless cloud synthesis...'}
                                    {status === 'waiting' && 'Computing target frequency footprints and dynamics thresholds...'}
                                    {status === 'processing' && 'Running multi-band limiter and loudness matching algorithm...'}
                                    {status === 'downloading' && 'Rebuilding IndexedDB structure and wrapping outputs...'}
                                </p>
                            </div>
                            {status === 'processing' && (
                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        className="bg-[var(--primary-accent)] h-full"
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${progress * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'succeeded' && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                                <Check size={32} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-lg text-[var(--text-primary)]">Mastering Successful!</h4>
                                <p className="text-xs text-[var(--text-secondary)] max-w-[280px] leading-relaxed">
                                    Your track has been mastered with stunning professional-grade loudness and dynamics!
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full bg-[var(--primary-accent)] text-black font-black py-3.5 rounded-2xl hover:scale-105 transition-transform text-xs uppercase tracking-wider"
                            >
                                Back to Music Library
                            </button>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                <AlertCircle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-bold text-lg text-[var(--text-primary)]">Enhancement Failed</h4>
                                <p className="text-xs text-red-400/80 max-w-[280px] leading-relaxed font-mono text-[10px]">
                                    {errorMessage}
                                </p>
                            </div>
                            <div className="flex flex-col w-full gap-2">
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="w-full bg-white/5 border border-white/10 text-white font-bold py-3.5 rounded-2xl hover:bg-white/10 transition-colors text-xs uppercase tracking-wider"
                                >
                                    Adjust Settings and Retry
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full text-center text-xs text-[var(--text-secondary)] hover:text-white py-2"
                                >
                                    Close Studio
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default MasteringStudioModal;
