
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Search, Heart, Disc, MapPin, Sliders, ArrowLeft, Plus, Radio, RefreshCw } from 'lucide-react';
import type { RadioStation, RadioPlaylist, ProfileData } from '../types.ts';
import RadioStationList from './RadioStationList.tsx';
import CreateRadioPlaylistModal from './CreateRadioPlaylistModal.tsx';
import RadioLoader from './RadioLoader.tsx';
import { fetchRadioAPI } from './db.ts';
import { getRandomCoverArt } from './constants.ts';

// Simple in-memory cache to persist data when switching views
let cachedTopStations: RadioStation[] = [];

const CosmicSearchBar: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSearch: (term: string) => void }> = ({ value, onChange, onSearch }) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch(value);
        }
    };
    return (
     <div className="relative mb-4 cosmic-search">
        <input
            type="text"
            placeholder="Search stations, countries, genres..."
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-[var(--surface-color)] rounded-full py-2.5 pl-12 pr-6 text-[var(--text-primary)] placeholder-[var(--text-secondary)] border-2 border-transparent focus:outline-none"
        />
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
    </div>
    );
};

const HubCard: React.FC<{ title: string, icon: React.ReactNode, onClick: () => void, className?: string }> = ({ title, icon, onClick, className }) => (
    <button 
        onClick={onClick} 
        className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-3 text-center text-white transition-transform hover:scale-105 w-full aspect-square ${className}`}
        title={`Browse ${title}`}
    >
        {icon}
        <p className="font-bold text-lg mt-2">{title}</p>
    </button>
);

const HorizontalStationScroller: React.FC<{title: string, stations: RadioStation[], onPlayStation: (station: RadioStation) => void}> = 
({ title, stations, onPlayStation }) => {
    if (!stations || stations.length === 0) return null;

    return (
        <section className="mb-6">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{title}</h2>
            <div className="flex overflow-x-auto gap-4 scroll-container -mx-4 px-4 pb-2 gpu-accelerated-scroll">
                {stations.map(station => (
                    <button key={station.stationuuid} onClick={() => onPlayStation(station)} className="flex-shrink-0 w-32 text-left group" title={`Play ${station.name}`}>
                        <img src={station.favicon || getRandomCoverArt()} alt={station.name} className="w-32 h-32 rounded-lg bg-[var(--chip-bg)] object-cover mb-2 transition-transform group-hover:scale-105" onError={(e) => { e.currentTarget.src = getRandomCoverArt(); }}/>
                        <p className="text-sm font-bold truncate text-[var(--text-primary)]">{station.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{station.country}</p>
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
    onNavigate: (view: string) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const RadioView: React.FC<RadioViewProps> = ({ profile, onPlayStation, favoriteStations, onToggleFavorite, radioPlaylists, onUpdateRadioPlaylists, onNavigate, showNotification }) => {
    const [view, setView] = useState<'hub' | 'station_list' | 'playlists'>('hub');
    const [stationList, setStationList] = useState<RadioStation[]>([]);
    const [listTitle, setListTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(cachedTopStations.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [isCreatePlaylistOpen, setCreatePlaylistOpen] = useState(false);
    const [topStations, setTopStations] = useState<RadioStation[]>(cachedTopStations);
    const [isScrolled, setIsScrolled] = useState(false);

    const fetchHubData = useCallback(async () => {
        if (cachedTopStations.length > 0) {
            setTopStations(cachedTopStations);
            setIsInitialLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const top = await fetchRadioAPI<RadioStation[]>('/stations/search?limit=20&order=clickcount&reverse=true&hidebroken=true');
            cachedTopStations = top; // Update cache
            setTopStations(top);
        } catch (err) {
            console.error(err);
            setError("Could not fetch top stations. Please check your connection.");
        } finally {
            setIsLoading(false);
            setIsInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHubData();
    }, [fetchHubData]);

    const executeSearch = async (term: string) => {
        if (term.length < 2) return;
        setIsLoading(true);
        setError(null);
        setStationList([]); // Clear previous results
        setListTitle(`Search: "${term}"`);
        setView('station_list');
        try {
            const results = await fetchRadioAPI<RadioStation[]>(`/stations/search?name=${encodeURIComponent(term)}&limit=100&hidebroken=true`);
            setStationList(results);
        } catch (err) {
            setError("Search failed. The radio API might be down.");
        }
        setIsLoading(false);
    };

    const findNearbyStations = async () => {
        setIsLoading(true);
        setError(null);
        const apiKey = profile?.apiKey || process.env.API_KEY;
        if (!apiKey) {
            setError("Please set your Gemini API key in Settings to use this feature.");
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: "What are some popular radio stations near me? Give me just a list of names.",
                    config: {
                        tools: [{ googleMaps: {} }],
                        toolConfig: {
                            retrievalConfig: {
                                latLng: { latitude, longitude }
                            }
                        }
                    }
                });

                if (response.text) {
                    const stationNames = response.text.trim().split('\n').map(s => s.replace(/[-*]/g, '').trim()).filter(Boolean);
                    if(stationNames.length > 0) {
                        const searchPromises = stationNames.map(name => fetchRadioAPI<RadioStation[]>(`/stations/search?name=${encodeURIComponent(name)}&limit=1&hidebroken=true`));
                        const searchResults = await Promise.all(searchPromises);
                        const nearbyStations = searchResults.flat();
                        setStationList(nearbyStations);
                        setListTitle("Nearby Stations");
                        setView('station_list');
                    } else {
                        setError("Could not find any nearby stations.");
                    }
                }
            } catch (err) {
                console.error("Error finding nearby stations: " + String(err));
                setError("AI search for nearby stations failed.");
            } finally {
                setIsLoading(false);
            }
        }, (err) => {
            setError("Could not get your location. Please enable location services.");
            setIsLoading(false);
        });
    };

    const handleListItemClick = async (item: { name: string }, type: 'genre' | 'region') => {
        setIsLoading(true);
        setError(null);
        setStationList([]); // Clear previous results
        setListTitle(item.name);
        setView('station_list');
        const path = type === 'genre'
            ? `/stations/bytag/${encodeURIComponent(item.name)}?limit=200&hidebroken=true`
            : `/stations/bycountryexact/${encodeURIComponent(item.name)}?limit=200&hidebroken=true`;
        
        try {
            const data = await fetchRadioAPI<RadioStation[]>(path);
            setStationList(data);
        } catch (err) {
            setError(`Could not load stations for ${item.name}.`);
        }
        setIsLoading(false);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    const renderHub = () => (
        <div className="overflow-y-auto scroll-container h-full gpu-accelerated-scroll" onScroll={handleScroll}>
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">Live Radio</h1>
                <h2 className="header-small-title">Radio Hub</h2>
            </div>
            
            <div className="px-4 pb-40 scroll-content-with-header">
                <CosmicSearchBar value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onSearch={executeSearch} />

                <HorizontalStationScroller title="Top Stations" stations={topStations} onPlayStation={onPlayStation} />
                
                {(profile?.favoriteRadioGenres?.length ?? 0) > 0 && (
                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Your Genres</h2>
                        <div className="flex overflow-x-auto gap-2 scroll-container -mx-4 px-4 pb-2 gpu-accelerated-scroll">
                            {profile?.favoriteRadioGenres?.map(genre => (
                                <button key={genre} onClick={() => handleListItemClick({ name: genre }, 'genre')} className="flex-shrink-0 text-sm font-bold px-4 py-3 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] capitalize">{genre}</button>
                            ))}
                        </div>
                    </section>
                )}
                
                {(profile?.favoriteRadioRegions?.length ?? 0) > 0 && (
                    <section className="mb-6">
                        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Your Regions</h2>
                        <div className="flex overflow-x-auto gap-2 scroll-container -mx-4 px-4 pb-2 gpu-accelerated-scroll">
                            {profile?.favoriteRadioRegions?.map(region => (
                                <button key={region} onClick={() => handleListItemClick({ name: region }, 'region')} className="flex-shrink-0 text-sm font-bold px-4 py-3 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)]">{region}</button>
                            ))}
                        </div>
                    </section>
                )}
                
                <HorizontalStationScroller title="Recently Played" stations={profile?.recentlyPlayedRadios || []} onPlayStation={onPlayStation} />
                
                <div className="grid grid-cols-2 gap-4">
                    <HubCard 
                        title="Favorites" 
                        icon={<Heart size={36} />} 
                        onClick={() => { setListTitle('Favorites'); setStationList(favoriteStations); setView('station_list'); }}
                        className="bg-gradient-to-br from-pink-500 to-rose-600"
                    />
                    <HubCard 
                        title="Playlists" 
                        icon={<Disc size={36} />} 
                        onClick={() => setView('playlists')}
                        className="bg-gradient-to-br from-teal-500 to-cyan-600"
                    />
                </div>
                <button onClick={findNearbyStations} className="relative w-full p-6 mt-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
                    <div className="z-10">
                        <h3 className="text-xl font-bold">Nearby Stations</h3>
                        <p className="text-sm text-white/80 max-w-xs">Discover radio from your area.</p>
                    </div>
                    <MapPin size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
                </button>
                <button onClick={() => onNavigate('ManageRadioHub')} className="relative w-full p-6 mt-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex justify-between items-center text-left text-white overflow-hidden transition-transform hover:scale-105">
                    <div className="z-10">
                        <h3 className="text-xl font-bold">Manage Hub</h3>
                        <p className="text-sm text-white/80 max-w-xs">Customize your genres & regions.</p>
                    </div>
                    <Sliders size={48} className="text-white/20 absolute right-4 bottom-4 z-0" />
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (isInitialLoading) {
            return <div className="flex-1 flex items-center justify-center"><RadioLoader /></div>;
        }
        if (error && !isLoading && stationList.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-red-400 p-4">
                    <Radio size={48} className="mb-4 opacity-50" />
                    <p className="font-bold mb-2">{error}</p>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">This can happen if you're offline or if the radio servers are temporarily down.</p>
                    <button onClick={() => { setIsLoading(true); fetchHubData(); }} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-6 rounded-full flex items-center gap-2">
                        <RefreshCw size={18} /> Retry
                    </button>
                </div>
            );
        }

        switch(view) {
            case 'hub': return renderHub();
            case 'playlists':
                 return (
                     <div className="flex flex-col h-full">
                         <header className="flex items-center justify-between gap-4 mb-4 p-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setView('hub')} className="text-[var(--text-primary)]" aria-label="Back to Hub" title="Back to Hub"><ArrowLeft size={24} /></button>
                                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Radio Playlists</h1>
                            </div>
                            <button onClick={() => setCreatePlaylistOpen(true)} className="bg-[var(--primary-accent)] text-black rounded-full w-10 h-10 flex items-center justify-center" title="Create new radio playlist">
                                <Plus size={24} />
                            </button>
                         </header>
                         <div className="flex-1 overflow-y-auto scroll-container px-4 pb-40 gpu-accelerated-scroll">
                            {radioPlaylists.length > 0 ? radioPlaylists.map(pl => (
                                <div key={pl.id} className="p-4 rounded-lg bg-[var(--surface-color)] mb-3">
                                    <h3 className="font-bold text-[var(--text-primary)]">{pl.name}</h3>
                                    <p className="text-xs text-[var(--text-secondary)]">{pl.stationIds.length} stations</p>
                                </div>
                            )) : <p className="text-center text-[var(--text-secondary)] pt-8">No radio playlists yet.</p>}
                         </div>
                     </div>
                 );

            case 'station_list':
                return (
                    <div className="flex flex-col h-full">
                         <header className="flex items-center gap-4 mb-4 p-4">
                             <button onClick={() => { setSearchTerm(''); setView('hub'); }} className="text-[var(--text-primary)]" aria-label="Back to Hub" title="Back to Hub"><ArrowLeft size={24} /></button>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold truncate capitalize text-[var(--text-primary)]">{listTitle}</h1>
                                <p className="text-sm text-[var(--text-secondary)]">{stationList.length} stations found</p>
                            </div>
                         </header>
                         <div className="flex-1 overflow-y-auto scroll-container px-4 pb-40 gpu-accelerated-scroll">
                            <RadioStationList stations={stationList} onPlayStation={onPlayStation} favoriteStations={favoriteStations} onToggleFavorite={onToggleFavorite} error={error} isLoading={isLoading} />
                         </div>
                    </div>
                );
        }
    };
    
    return (
        <>
            <main className="h-full w-full flex flex-col home-gradient-bg overflow-hidden">
                <div className="flex-1 overflow-hidden flex flex-col">
                    {renderContent()}
                </div>
            </main>
            {isCreatePlaylistOpen && (
                <CreateRadioPlaylistModal
                    favoriteStations={favoriteStations}
                    onSave={(playlist) => { onUpdateRadioPlaylists([...radioPlaylists, playlist]); setCreatePlaylistOpen(false); showNotification(`Playlist "${playlist.name}" created!`, 'success'); }}
                    onClose={() => setCreatePlaylistOpen(false)}
                    showNotification={showNotification}
                />
            )}
        </>
    );
};

export default RadioView;
