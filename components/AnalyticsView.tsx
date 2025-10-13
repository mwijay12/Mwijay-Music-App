import React from 'react';
import type { ProfileData } from '../types.ts';

const AnalyticsView: React.FC<{ profile: ProfileData; onBack: () => void }> = ({ profile, onBack }) => {
    const { analytics } = profile;

    const formatListenTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const maxWeeklyPlay = Math.max(...(analytics.weeklyActivity || [0]), 1);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const StatCard: React.FC<{ value: string; label: string; icon: string }> = ({ value, label, icon }) => (
        <div className="bg-[var(--surface-color)] p-4 rounded-xl text-center">
            <i className={`fas ${icon} text-2xl text-[var(--primary-accent)] mb-2`}></i>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-sm text-neutral-400">{label}</p>
        </div>
    );

    const TopListItem: React.FC<{ item: any; index: number; type: 'song' | 'artist' | 'radio' }> = ({ item, index, type }) => (
        <div className="flex items-center gap-4 py-2">
            <span className="font-bold text-neutral-400 w-6 text-center">{index + 1}</span>
            {item.albumArtUrl && <img src={item.albumArtUrl} alt={item.name || item.title} className="w-10 h-10 rounded-md object-cover" />}
            {!item.albumArtUrl && type === 'radio' && <div className="w-10 h-10 rounded-md bg-[var(--chip-bg)] flex items-center justify-center"><i className="fas fa-tower-broadcast"></i></div>}
            <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{item.name || item.title}</p>
                {type === 'song' && <p className="text-xs text-neutral-400 truncate">{item.artist}</p>}
            </div>
            <span className="text-sm font-semibold">{item.playCount} plays</span>
        </div>
    );


    return (
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40 home-gradient-bg">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="text-2xl" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                <div>
                    <h1 className="text-3xl font-bold">Your Analytics</h1>
                    <p className="text-neutral-400">A deep dive into your listening habits</p>
                </div>
            </header>

            <div className="space-y-6">
                 <div className="bg-[var(--surface-color)] p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">Weekly Activity</h2>
                    <div className="flex justify-around items-end h-40 gap-2 border-b pb-2" style={{borderColor: 'var(--surface-border-color)'}}>
                        {(analytics.weeklyActivity || []).map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                                <div className="relative w-full h-full flex items-end">
                                    <div 
                                        className="w-full bg-[var(--primary-accent)] rounded-t-md transition-all duration-300 group-hover:bg-[var(--secondary-accent-end)]"
                                        style={{ height: `${(count / maxWeeklyPlay) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs font-bold text-neutral-400">{weekDays[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-[var(--surface-color)] p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">Top 10 Songs</h2>
                    <div className="space-y-1">
                        {(analytics.topSongs || []).slice(0, 10).map((song, i) => <TopListItem key={song.id} item={song} index={i} type="song" />)}
                         {(analytics.topSongs || []).length === 0 && <p className="text-sm text-neutral-400 text-center py-4">Play some songs to see your top tracks!</p>}
                    </div>
                </div>
                 <div className="bg-[var(--surface-color)] p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">Top 10 Artists</h2>
                    <div className="space-y-1">
                        {(analytics.topArtists || []).slice(0, 10).map((artist, i) => <TopListItem key={artist.name} item={artist} index={i} type="artist" />)}
                        {(analytics.topArtists || []).length === 0 && <p className="text-sm text-neutral-400 text-center py-4">Your favorite artists will appear here.</p>}
                    </div>
                </div>
                 <div className="bg-[var(--surface-color)] p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">Top 10 Radio Stations</h2>
                    <div className="space-y-1">
                        {(analytics.topRadios || []).slice(0, 10).map((radio, i) => <TopListItem key={radio.stationId} item={radio} index={i} type="radio" />)}
                        {(analytics.topRadios || []).length === 0 && <p className="text-sm text-neutral-400 text-center py-4">Listen to the radio to see your top stations.</p>}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default AnalyticsView;