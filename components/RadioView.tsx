

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { RadioStation, RadioPlaylist, ProfileData } from '../types.ts';
import RadioStationList from './RadioStationList.tsx';
import CreateRadioPlaylistModal from './CreateRadioPlaylistModal.tsx';
import RadioLoader from './RadioLoader.tsx';
import { fetchRadioAPI } from './db.ts';
import { getRandomCoverArt } from '../constants.ts';

const CosmicSearchBar: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSearch: (term: string) => void }> = ({ value, onChange, onSearch }) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch(value);
        }
    };
    return (
     <div className="relative mb-4">
        <input
            type="text"
            placeholder="Search stations, countries, genres..."
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-[var(--surface-color)] rounded-full py-2.5 pl-12 pr-6 text-white placeholder-neutral-400 border-2 border-transparent focus:outline-none cosmic-search"
        />
        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400"></i>
    </div>
    );
};

const HubCard: React.FC<{ title: string, icon: string, onClick: () => void, isManagement?: boolean }> = ({ title, icon, onClick, isManagement = false }) => (
    <button onClick={onClick} className={`bg-[var(--surface-color)] p-4 rounded-xl flex items-center justify-center gap-4 text-left transition-transform hover:scale-105 w-full ${isManagement ? 'bg-gradient-to-r from-[var(--secondary-accent-start)]/30 to-[var(--secondary-accent-end)]/30' : ''}`} title={`Browse ${title}`}>
        <i className={`fas ${icon} text-2xl text-[var(--primary-accent)] w-8 text-center`}></i>
        <div className="flex-1">
            <p className="font-bold text-lg">{title}</p>
        </div>
        <i className="fas fa-chevron-right text-neutral-500"></i>
    </button>
);

const HorizontalStationScroller: React.FC<{title: string, stations: RadioStation[], onPlayStation: (station: RadioStation) => void}> = 
({ title, stations, onPlayStation }) => {
    if (!stations || stations.length === 0) return null;

    return (
        <section className="mb-6">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            <div className="flex overflow-x-auto gap-4 scroll-container -mx-4 px-4 pb-2">
                {stations.map(station => (
                    <button key={station.stationuuid} onClick={() => onPlayStation(station)} className="flex-shrink-0 w-32 text-left group" title={`Play ${station.name}`}>
                        <img src={station.favicon || getRandomCoverArt()} alt={station.name} className="w-32 h-32 rounded-lg bg-[var(--chip-bg)] object-cover mb-2 transition-transform group-hover:scale-105" onError={(e) => { e.currentTarget.src = getRandomCoverArt(); }}/>
                        <p className="text-sm font-bold truncate">{station.name}</p>
                        <p className="text-xs text-neutral-300 truncate">{station.country}</p>
                    </button>
                ))}
            </div>
        </section>
    );
};

interface RadioViewProps {
    profile: ProfileData | null;
    onPlayStation: (station: RadioStation) => void;
    favoriteStations: RadioStation[];
    onToggleFavorite: (station: RadioStation) => void;
    radioPlaylists: RadioPlaylist[];
    onUpdateRadioPlaylists: (playlists: RadioPlaylist[]) => void;
    showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
    onNavigate: (view: string) => void;
}

const RadioView: React.FC<RadioViewProps> = ({ profile, onPlayStation, favoriteStations, onToggleFavorite, radioPlaylists, onUpdateRadioPlaylists, showNotification, onNavigate }) => {
    const [view, setView] = useState<'hub' | 'station_list' | 'playlists'>('hub');
    const [stationList, setStationList] = useState<RadioStation[]>([]);
    const [listTitle, setListTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreatePlaylistOpen, setCreatePlaylistOpen] = useState(false);
    const [topStations, setTopStations] = useState<RadioStation[]>([]);

    const fetchHubData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const top = await fetchRadioAPI('/stations/search?limit=20&order=clickcount&reverse=true&hidebroken=true');
            setTopStations(top);
        } catch (err) {
            setError("Could not fetch top stations. Please check your connection.");
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchHubData();
        const timer = setTimeout(() => {
            setIsInitialLoading(false);
        }, 3500); // Guarantees loader shows for 3.5s
        return () => clearTimeout(timer);
    }, [fetchHubData]);
    
    const executeSearch = async (term: string) => {
        if (term.length < 2) return;
        setIsLoading(true);
        setError(null);
        try {
            const results = await fetchRadioAPI(`/stations/search?name=${encodeURIComponent(term)}&limit=100&hidebroken=true`);
            setStationList(results);
            setListTitle(`Search: "${term}"`);
            setView('station_list');
        } catch (err) {
            setError("Search failed. The radio API might be down.");
        }
        setIsLoading(false);
    };

    const handleListItemClick = async (item: { name: string }, type: 'genre' | 'region') => {
        setIsLoading(true);
        setError(null);
        // FIX: Correctly use `bycountryexact` for regions and `bytag` for genres.
        const path = type === 'genre'
            ? `/stations/bytag/${encodeURIComponent(item.name)}?limit=200&hidebroken=true`
            : `/stations/bycountryexact/${encodeURIComponent(item.name)}?limit=200&hidebroken=true`;
        
        try {
            const data = await fetchRadioAPI(path);
            setStationList(data);
            setListTitle(item.name);
            setView('station_list');
        } catch (err) {
            setError(`Could not load stations for ${item.name}.`);
        }
        setIsLoading(false);
    };

    const renderHub = () => (
        <div className="overflow-y-auto scroll-container h-full">
            <HorizontalStationScroller title="Top Stations" stations={topStations} onPlayStation={onPlayStation} />
            
            {(profile?.favoriteRadioGenres?.length ?? 0) > 0 && (
                <section className="mb-6">
                    <h2 className="text-xl font-bold mb-4">Your Genres</h2>
                    <div className="prompt-scroller -mx-4 px-4 pb-2">
                        <div className="prompt-scroller-content">
                            {profile?.favoriteRadioGenres?.map(genre => (
                                <button key={genre} onClick={() => handleListItemClick({ name: genre }, 'genre')} className="flex-shrink-0 text-sm font-bold px-4 py-3 rounded-full bg-[var(--chip-bg)] capitalize">{genre}</button>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            
            {(profile?.favoriteRadioRegions?.length ?? 0) > 0 && (
                 <section className="mb-6">
                    <h2 className="text-xl font-bold mb-4">Your Regions</h2>
                    <div className="prompt-scroller -mx-4 px-4 pb-2">
                        <div className="prompt-scroller-content">
                            {profile?.favoriteRadioRegions?.map(region => (
                                <button key={region} onClick={() => handleListItemClick({ name: region }, 'region')} className="flex-shrink-0 text-sm font-bold px-4 py-3 rounded-full bg-[var(--chip-bg)]">{region}</button>
                            ))}
                        </div>
                    </div>
                </section>
            )}
            
            <HorizontalStationScroller title="Recently Played" stations={profile?.recentlyPlayedRadios || []} onPlayStation={onPlayStation} />
            
            <div className="space-y-4">
                <HubCard title="Favorites" icon="fa-heart" onClick={() => { setListTitle('Favorites'); setStationList(favoriteStations); setView('station_list'); }} />
                <HubCard title="Playlists" icon="fa-list-music" onClick={() => setView('playlists')} />
                <HubCard title="Manage Hub" icon="fa-sliders-h" onClick={() => onNavigate('ManageRadioHub')} isManagement />
            </div>
        </div>
    );

    const renderContent = () => {
        if (isInitialLoading || isLoading) {
            return <div className="flex-1 flex items-center justify-center"><RadioLoader /></div>;
        }
        if (error) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-red-400 p-4">
                    <i className="fas fa-tower-broadcast text-4xl mb-4 opacity-50"></i>
                    <p className="font-bold mb-2">{error}</p>
                    <p className="text-sm text-neutral-500 mb-6">This can happen if you're offline or if the radio servers are temporarily down.</p>
                    <button onClick={fetchHubData} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-6 rounded-full">
                        <i className="fas fa-sync-alt mr-2"></i> Retry
                    </button>
                </div>
            );
        }

        switch(view) {
            case 'hub': return renderHub();
            case 'playlists':
                 return (
                     <div className="flex flex-col h-full">
                         <header className="flex items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setView('hub')} className="text-2xl" aria-label="Back to Hub" title="Back to Hub"><i className="fas fa-arrow-left"></i></button>
                                <h1 className="text-2xl font-bold">Radio Playlists</h1>
                            </div>
                            <button onClick={() => setCreatePlaylistOpen(true)} className="bg-[var(--primary-accent)] text-black rounded-full w-10 h-10 flex items-center justify-center" title="Create new radio playlist">
                                <i className="fas fa-plus"></i>
                            </button>
                         </header>
                         <div className="flex-1 overflow-y-auto scroll-container -mr-4 pr-4">
                            {radioPlaylists.length > 0 ? radioPlaylists.map(pl => (
                                <div key={pl.id} className="p-4 rounded-lg bg-[var(--surface-color)] mb-3">
                                    <h3 className="font-bold">{pl.name}</h3>
                                    <p className="text-xs text-neutral-400">{pl.stationIds.length} stations</p>
                                </div>
                            )) : <p className="text-center text-neutral-400 pt-8">No radio playlists yet.</p>}
                         </div>
                     </div>
                 );

            case 'station_list':
                return (
                    <div className="flex flex-col h-full">
                         <header className="flex items-center gap-4 mb-4">
                             <button onClick={() => { setSearchTerm(''); setView('hub'); }} className="text-2xl" aria-label="Back to Hub" title="Back to Hub"><i className="fas fa-arrow-left"></i></button>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold truncate capitalize">{listTitle}</h1>
                                <p className="text-sm text-neutral-400">{stationList.length} stations found</p>
                            </div>
                         </header>
                         <div className="flex-1 overflow-y-auto scroll-container -mr-4 pr-4">
                            <RadioStationList stations={stationList} onPlayStation={onPlayStation} favoriteStations={favoriteStations} onToggleFavorite={onToggleFavorite} error={null} />
                         </div>
                    </div>
                );
        }
    };
    
    return (
        <>
            <main className="h-full w-full flex flex-col p-4 pb-40 home-gradient-bg">
                {view === 'hub' && (
                    <>
                        <header className="flex justify-between items-center mb-4">
                            <div>
                                <h1 className="text-2xl font-bold">Live Radio</h1>
                                <p className="text-sm text-neutral-400">Powered by Mwijay Music</p>
                            </div>
                        </header>
                        <CosmicSearchBar value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onSearch={executeSearch} />
                    </>
                )}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {renderContent()}
                </div>
            </main>
            {isCreatePlaylistOpen && (
                <CreateRadioPlaylistModal
                    favoriteStations={favoriteStations}
                    onSave={(playlist) => { onUpdateRadioPlaylists([...radioPlaylists, playlist]); setCreatePlaylistOpen(false); }}
                    onClose={() => setCreatePlaylistOpen(false)}
                />
            )}
        </>
    );
};

export default RadioView;
