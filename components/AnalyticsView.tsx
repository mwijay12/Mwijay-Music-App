
import React, { useState } from 'react';
import { ArrowLeft, ChartPie, Clock, Play, Music, Trophy, BarChart3, Radio } from 'lucide-react';
import type { ProfileData } from '../types.ts';

const AnalyticsView: React.FC<{ profile: ProfileData; onBack: () => void }> = ({ profile, onBack }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const analytics = profile.analytics;

    const formatListenTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const maxWeeklyPlay = Math.max(...(analytics.weeklyActivity || []), 1);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Stats Calculation for Vibe Card
    const topArtist = analytics.topArtists[0]?.name || "Unknown";
    const playCount = analytics.songsPlayed || 0;

    const StatCard: React.FC<{ value: string; label: string; icon: React.ReactNode }> = ({ value, label, icon }) => (
        <div className="liquid-glass-pane glare-effect p-4 rounded-xl text-center flex flex-col items-center justify-center aspect-square">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center mb-2 text-lg">
                {icon}
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide mt-1">{label}</p>
        </div>
    );

    const TopListItem: React.FC<{ item: any; index: number; type: 'song' | 'artist' | 'radio' }> = ({ item, index, type }) => (
        <div className="flex items-center gap-4 py-3 border-b border-[var(--surface-border-color)] last:border-0">
            <span className="font-bold text-[var(--primary-accent)] w-6 text-center font-mono">{index + 1}</span>
            {item.albumArtUrl && <img src={item.albumArtUrl} alt={item.name || item.title} className="w-12 h-12 rounded-lg object-cover shadow-md" />}
            {!item.albumArtUrl && type === 'radio' && <div className="w-12 h-12 rounded-lg bg-[var(--chip-bg)] flex items-center justify-center"><Radio size={20} className="text-[var(--text-secondary)]" /></div>}
            <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-[var(--text-primary)]">{item.name || item.title}</p>
                {type === 'song' && <p className="text-xs text-[var(--text-secondary)] truncate">{item.artist}</p>}
            </div>
            <div className="text-right">
                <span className="text-sm font-bold block text-[var(--text-primary)]">{type === 'radio' ? `${Math.floor(item.playCount / 60)}m` : item.playCount}</span>
                <span className="text-[10px] text-[var(--text-secondary)] uppercase">{type === 'radio' ? 'Listened' : 'Plays'}</span>
            </div>
        </div>
    );

    return (
        <main onScroll={handleScroll} className="h-full w-full overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-[var(--text-primary)]">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">My Stats</h1>
                <h2 className="header-small-title">Stats</h2>
                <div className="header-actions-right">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] flex items-center justify-center" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>

            <div className="space-y-6 px-6 pb-40 scroll-content-with-header">
                 {/* This Week's Vibe Card */}
                 <div className="liquid-glass-pane glare-effect p-4 rounded-2xl flex justify-between items-center mb-2 mt-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--primary-accent)] flex items-center justify-center text-black">
                            <ChartPie size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">This Week's Vibe</p>
                            <p className="font-bold text-lg text-[var(--text-primary)]">{topArtist} • {playCount} Plays</p>
                        </div>
                    </div>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                    <StatCard value={formatListenTime((analytics.listenTime || 0) + (analytics.radioListenTime || 0))} label="Listen Time" icon={<Clock size={20} />} />
                    <StatCard value={(analytics.songsPlayed || 0).toString()} label="Tracks Played" icon={<Play size={20} fill="currentColor" />} />
                    <StatCard value={(analytics.songsUploaded || 0).toString()} label="Library Size" icon={<Music size={20} />} />
                    <StatCard value={(profile.unlockedAchievements || []).length.toString()} label="Awards" icon={<Trophy size={20} />} />
                </div>
                 <div className="liquid-glass-pane glare-effect p-6 rounded-2xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 size={24} className="text-[var(--primary-accent)]" /> Weekly Activity</h2>
                    <div className="flex justify-around items-end h-32 gap-2 border-b border-[var(--surface-border-color)] pb-2">
                        {(analytics.weeklyActivity || []).map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                                <div className="relative w-full h-full flex items-end group">
                                    <div 
                                        className="w-full bg-gradient-to-t from-[var(--primary-accent)] to-[var(--secondary-accent-start)] rounded-t-sm transition-all duration-500 relative"
                                        style={{ height: `${(count / maxWeeklyPlay) * 100}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            {count}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">{weekDays[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="liquid-glass-pane glare-effect p-6 rounded-2xl">
                    <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Top Songs</h2>
                    <div className="space-y-1">
                        {(analytics.topSongs || []).slice(0, 5).map((song, i) => <TopListItem key={song.id} item={song} index={i} type="song" />)}
                         {(analytics.topSongs || []).length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-4">Play some songs to see your top tracks!</p>}
                    </div>
                </div>
                 <div className="liquid-glass-pane glare-effect p-6 rounded-2xl">
                    <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Top Artists</h2>
                    <div className="space-y-1">
                        {(analytics.topArtists || []).slice(0, 5).map((artist, i) => <TopListItem key={artist.name} item={artist} index={i} type="artist" />)}
                        {(analytics.topArtists || []).length === 0 && <p className="text-sm text-[var(--text-secondary)] text-center py-4">Your favorite artists will appear here.</p>}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default AnalyticsView;
