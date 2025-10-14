import React, { useState, useRef, useEffect } from 'react';
import type { Song, ProfileData } from '../types.ts';
import { fonts } from '../constants.ts';

interface LyricsViewProps {
    song: Song;
    profile: ProfileData;
    onClose: () => void;
    onMinimize: () => void;
    onUpdateSong: (song: Song) => void;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    progress: number;
    duration: number;
}

const LyricsView: React.FC<LyricsViewProps> = ({ song, profile, onClose, onMinimize, onUpdateSong, onUpdateProfile, progress, duration }) => {
    const [isEditing, setIsEditing] = useState(!song.lyrics);
    const [lyricsText, setLyricsText] = useState(song.lyrics || '');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const progressPercentage = (progress / (duration || 1)) * 100;

    const lyricsSettings = profile.settings.lyricsSettings;

    const stopScrolling = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

    const startScrolling = () => {
        stopScrolling();
        if (!lyricsContainerRef.current) return;
        const container = lyricsContainerRef.current;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        if (scrollHeight <= 0) return;

        const speedValue = lyricsSettings.animationSpeed;
        const speedMultiplier = 20 / speedValue;
        const totalDurationMs = (scrollHeight / 40) * 1000 * speedMultiplier;

        let startTime = 0;
        container.scrollTop = 0;

        const animateScroll = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const scrollProgress = Math.min(elapsedTime / totalDurationMs, 1);
            container.scrollTop = scrollHeight * scrollProgress;

            if (scrollProgress < 1) {
                animationFrameRef.current = requestAnimationFrame(animateScroll);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animateScroll);
    };

    useEffect(() => {
        if (lyricsSettings.animation === 'scroll' && isAnimating && !isEditing) {
            startScrolling();
        } else {
            stopScrolling();
        }
        return stopScrolling;
    }, [isAnimating, isEditing, lyricsSettings.animation, lyricsSettings.animationSpeed, lyricsText]);


    const handleSave = () => {
        onUpdateSong({ ...song, lyrics: lyricsText });
        setIsEditing(false);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setLyricsText(e.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const handleSettingChange = <K extends keyof ProfileData['settings']['lyricsSettings']>(
        key: K,
        value: ProfileData['settings']['lyricsSettings'][K]
    ) => {
        onUpdateProfile(p => ({
            ...p,
            settings: {
                ...p.settings,
                lyricsSettings: {
                    ...p.settings.lyricsSettings,
                    [key]: value
                }
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="liquid-glass-pane rounded-3xl flex flex-col w-full max-w-md h-[80vh] max-h-[600px] overflow-hidden shadow-2xl relative" 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <div className="min-w-0">
                        <h2 className="font-bold text-lg truncate">Lyrics</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         {isEditing ? (
                            <button onClick={handleSave} className="bg-green-500 text-white font-bold py-2 px-4 rounded-full text-sm">Save</button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="bg-white/10 font-bold py-2 px-4 rounded-full text-sm">Edit</button>
                        )}
                        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-white/70 hover:text-white w-8 h-8"><i className="fas fa-cog text-xl"></i></button>
                        <button onClick={onMinimize} className="text-white/70 hover:text-white w-8 h-8" aria-label="Minimize lyrics"><i className="fas fa-minus text-xl"></i></button>
                        <button onClick={onClose} className="text-white/70 hover:text-white w-8 h-8" aria-label="Close lyrics"><i className="fas fa-times text-xl"></i></button>
                    </div>
                </header>
                
                <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto scroll-container p-6">
                    {isEditing ? (
                        <textarea
                            value={lyricsText}
                            onChange={(e) => setLyricsText(e.target.value)}
                            className="w-full h-full bg-black/30 rounded-lg p-4 text-base leading-relaxed resize-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                            placeholder="Type or paste lyrics here..."
                        />
                    ) : (
                         <div
                            className={`lyrics-content-container lyrics-container whitespace-pre-wrap text-center leading-loose ${isAnimating ? 'is-animating' : ''}`}
                            style={{
                                fontFamily: fonts.find(f => f.name === lyricsSettings.fontFamily)?.family || 'Satoshi',
                                fontSize: `${lyricsSettings.fontSize}px`
                            }}
                        >
                            {lyricsText?.split('\n').map((line, index) => {
                                const baseDuration = line.length * 0.1;
                                const speedMultiplier = 1 / (lyricsSettings.animationSpeed / 4);
                                const animationDuration = Math.max(0.3, baseDuration * speedMultiplier);

                                const animationStyle = {
                                    '--anim-delay': `${index * 0.5}s`,
                                    '--type-duration': `${animationDuration}s`,
                                    '--type-steps': line.length,
                                } as React.CSSProperties;

                                return (
                                    <p
                                        key={`${index}-${line.substring(0, 5)}`}
                                        className={`lyrics-line ${lyricsSettings.animation}`}
                                        style={animationStyle}
                                    >
                                        {line || '\u00A0'}
                                    </p>
                                );
                            })}
                            {!lyricsText && <p className="text-neutral-400">No lyrics available for this song.</p>}
                        </div>
                    )}
                </div>

                <footer className="p-4 flex-shrink-0 liquid-glass-pane !border-t !border-white/10">
                    {isEditing ? (
                         <div className="flex items-center justify-center gap-4">
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[var(--chip-bg)] text-white font-bold py-3 px-5 rounded-full">
                               <i className="fas fa-upload mr-2"></i> Upload .txt file
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.lrc" className="hidden" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <div className="flex items-center gap-3">
                                <img src={song.albumArtUrl} alt="Album Art" className="w-12 h-12 rounded-md object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{song.title}</p>
                                    <p className="text-sm text-neutral-400 truncate">{song.artist}</p>
                                </div>
                                <button onClick={() => setIsAnimating(!isAnimating)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl">
                                    <i className={`fas ${isAnimating ? 'fa-pause' : 'fa-play'}`}></i>
                                </button>
                            </div>
                             <div className="lyrics-card-footer-progress mt-2">
                                <div className="lyrics-card-footer-progress-inner" style={{ width: `${progressPercentage}%` }}></div>
                            </div>
                        </div>
                    )}
                </footer>
                
                {/* Settings Panel */}
                {isSettingsOpen && (
                    <div className="absolute inset-x-4 bottom-24 bg-black/80 backdrop-blur-md p-4 rounded-xl z-10 space-y-4">
                        <div>
                            <label className="text-sm font-bold">Font Size ({lyricsSettings.fontSize}px)</label>
                            <input type="range" min="12" max="48" value={lyricsSettings.fontSize} onChange={e => handleSettingChange('fontSize', parseInt(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((lyricsSettings.fontSize - 12) / 36) * 100}% 100%` }} />
                        </div>
                         <div>
                            <label className="text-sm font-bold">Animation Speed ({lyricsSettings.animationSpeed.toFixed(1)})</label>
                            <input type="range" min="0.5" max="20" step="0.5" value={lyricsSettings.animationSpeed} onChange={e => handleSettingChange('animationSpeed', parseFloat(e.target.value))} className="w-full themed-slider" style={{ backgroundSize: `${((lyricsSettings.animationSpeed - 0.5) / 19.5) * 100}% 100%` }}/>
                             <div className="flex justify-between text-xs text-neutral-400 mt-1">
                                <span>Slow</span>
                                <span>Fast</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-bold mb-2 block">Font Family</label>
                            <div className="prompt-scroller -mx-2 px-2">
                                <div className="prompt-scroller-content">
                                    {fonts.map(font => (
                                        <button
                                            key={font.name}
                                            onClick={() => handleSettingChange('fontFamily', font.name)}
                                            className={`flex-shrink-0 py-2 px-4 rounded-full text-sm font-bold transition-colors ${lyricsSettings.fontFamily === font.name ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10 text-white'}`}
                                            style={{ fontFamily: font.family }}
                                            title={`Set font: ${font.name}`}
                                        >
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                         <div>
                            <label className="text-sm font-bold">Animation</label>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                <button onClick={() => handleSettingChange('animation', 'scroll')} className={`p-2 text-xs rounded ${lyricsSettings.animation === 'scroll' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Scroll</button>
                                <button onClick={() => handleSettingChange('animation', 'typewriter')} className={`p-2 text-xs rounded ${lyricsSettings.animation === 'typewriter' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Typewriter</button>
                                <button onClick={() => handleSettingChange('animation', 'fade-in')} className={`p-2 text-xs rounded ${lyricsSettings.animation === 'fade-in' ? 'bg-[var(--primary-accent)] text-black' : 'bg-white/10'}`}>Fade In</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyricsView;