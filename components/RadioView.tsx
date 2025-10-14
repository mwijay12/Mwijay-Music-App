import React, { useState, useEffect, useCallback } from 'react';
import type { RadioStation, RadioPlaylist, ProfileData } from '../types.ts';
import RadioStationList from './RadioStationList.tsx';
import CreateRadioPlaylistModal from './CreateRadioPlaylistModal.tsx';
import RadioLoader from './RadioLoader.tsx';
import { fetchRadioAPI } from './db.ts';
import { getRandomCoverArt } from '../constants.ts';

// --- Sub-components for RadioView ---

const CosmicSearchBar: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearch: () => void;
}> = ({ value, onChange, onSearch }) => {
    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={onChange}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                placeholder="Search stations, genres, countries..."
                className="w-full bg-white/10 rounded-full py-3 pl-12 pr-4 text-white placeholder-neutral-400 border-2 border-transparent focus:outline-none cosmic-search"
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"></i>
        </div>
    );
};

const TabButton: React.FC<{
    label: string;
    icon: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'bg-[var(--primary-accent)]/20' : 'hover:bg-white/10'}`}
    >
        <i className={`fas ${icon} text-xl ${isActive ? 'text-[var(--primary-accent)]' : 'text-neutral-300'}`}></i>
        <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-400'}`}>{label}</span>
    </button>
);


// --- Main RadioView Component ---

interface RadioViewProps {
    profile: ProfileData | null;
    onPlayStation: (station: RadioStation) => void;
    favoriteStations: RadioStation[];
    radioPlaylists: RadioPlaylist[];
    onUpdateRadioPlaylists: (playlists: RadioPlaylist[]) => void;
    onNavigate: (view: string) => void;
}

const RadioView: React.FC<RadioViewProps> = ({ profile, onPlayStation, favoriteStations, radioPlaylists, onUpdateRadioPlaylists, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<RadioStation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'genres' | 'regions'>('favorites');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const stations = await fetchRadioAPI(`/stations/search?name=${encodeURIComponent(searchTerm)}&limit=50&order=clickcount&reverse=true&hidebroken=true`);
            setSearchResults(stations);
        } catch (err) {
            setError('Failed to fetch radio stations. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]);

    const handleCreatePlaylist = (playlist: RadioPlaylist) => {
        onUpdateRadioPlaylists([...radioPlaylists, playlist]);
        setCreateModalOpen(false);
    };

    const renderContent = () => {
        if (isLoading) return <RadioLoader />;
        
        if (searchTerm) {
            return <RadioStationList stations={searchResults} onPlayStation={onPlayStation} error={error} />;
        }
        
        switch(activeTab) {
            case 'favorites':
                return <RadioStationList stations={favoriteStations} onPlayStation={onPlayStation} error={null} />;
            case 'playlists':
                return (
                    <div>
                        <button onClick={() => setCreateModalOpen(true)} className="w-full text-left bg-[var(--surface-color)] p-4 rounded-lg flex items-center gap-4 mb-4" title="Create New Playlist">
                             <div className="w-16 h-16 bg-[var(--primary-accent)]/20 rounded flex-shrink-0 flex items-center justify-center"><i className="fas fa-plus text-2xl text-[var(--primary-accent)]"></i></div>
                             <p className="font-bold">Create New Playlist</p>
                        </button>
                        {radioPlaylists.map(pl => {
                            const stations = pl.stationIds.map(id => favoriteStations.find(s => s.stationuuid === id)).filter((s): s is RadioStation => !!s);
                            const cover = stations[0]?.favicon || getRandomCoverArt();
                            return (
                                 <button key={pl.id} onClick={() => onPlayStation(stations[0])} disabled={stations.length === 0} className="w-full flex items-center gap-4 bg-[var(--surface-color)] p-2 rounded-lg mb-2 text-left disabled:opacity-50">
                                    <img src={cover} alt={pl.name} className="w-16 h-16 bg-black rounded object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold truncate">{pl.name}</p>
                                        <p className="text-xs text-neutral-400">{pl.stationIds.length} stations</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                );
            case 'genres':
            case 'regions':
                 return (
                    <div className="grid grid-cols-2 gap-4">
                        {(activeTab === 'genres' ? profile?.favoriteRadioGenres : profile?.favoriteRadioRegions)?.map(item => (
                            <button key={item} onClick={() => setSearchTerm(item)} className="bg-[var(--surface-color)] p-4 rounded-lg font-bold capitalize transition-transform hover:scale-105">
                                {item}
                            </button>
                        ))}
                         <button onClick={() => onNavigate('ManageRadioHub')} className="bg-[var(--chip-bg)] p-4 rounded-lg font-bold flex flex-col items-center justify-center gap-2 text-[var(--primary-accent)]">
                           <i className="fas fa-edit text-xl"></i>
                           <span>Manage Hub</span>
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
        <main className="h-full w-full overflow-y-auto scroll-container p-6 pb-40 home-gradient-bg">
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Live Radio</h1>
                <p className="text-neutral-400">Discover stations from around the world</p>
            </header>

            <div className="sticky top-0 bg-[var(--bg-color)]/80 backdrop-blur-md z-10 py-4 -mx-6 px-6">
                 <CosmicSearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onSearch={handleSearch} />
                 {!searchTerm && (
                      <div className="flex justify-around items-center gap-2 mt-4 bg-[var(--surface-color)] p-2 rounded-xl">
                        <TabButton label="Favorites" icon="fa-heart" isActive={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
                        <TabButton label="Playlists" icon="fa-list-music" isActive={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} />
                        <TabButton label="Genres" icon="fa-guitar" isActive={activeTab === 'genres'} onClick={() => setActiveTab('genres')} />
                        <TabButton label="Regions" icon="fa-globe" isActive={activeTab === 'regions'} onClick={() => setActiveTab('regions')} />
                    </div>
                 )}
            </div>
            
            <div className="mt-6">
                {renderContent()}
            </div>
        </main>
        {isCreateModalOpen && (
            <CreateRadioPlaylistModal 
                favoriteStations={favoriteStations} 
                onSave={handleCreatePlaylist}
                onClose={() => setCreateModalOpen(false)}
            />
        )}
        </>
    );
};

export default RadioView;
