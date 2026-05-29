
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ProfileData } from '../types.ts';
import { fetchRadioAPI } from './db.ts';

interface ManageRadioHubViewProps {
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onBack: () => void;
}

const RadioHubColumn: React.FC<{
    title: string;
    items: { name: string }[];
    selectedItems: Set<string>;
    onToggle: (item: string) => void;
    limit: number;
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ title, items, selectedItems, onToggle, limit, searchTerm, onSearchChange }) => {
    const displayedItems = items.slice(0, limit);
    return (
        <div className="bg-[var(--surface-color)] p-4 rounded-lg flex-1">
            <h3 className="font-bold mb-3">{title}</h3>
            <input 
                type="text" 
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={onSearchChange}
                className="w-full bg-white/10 rounded-full py-2 px-4 text-sm mb-3"
            />
            <div className="space-y-2 max-h-60 overflow-y-auto scroll-container">
                {displayedItems.map(item => (
                    <button 
                        key={item.name}
                        onClick={() => onToggle(item.name)}
                        className={`w-full text-left p-2 rounded-md text-sm transition-colors ${selectedItems.has(item.name) ? 'bg-[var(--primary-accent)] text-black font-bold' : 'hover:bg-white/10'}`}
                    >
                        {item.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ManageRadioHubView: React.FC<ManageRadioHubViewProps> = ({ profile, onUpdateProfile, onBack }) => {
    const [allGenres, setAllGenres] = useState<{ name: string }[]>([]);
    const [allRegions, setAllRegions] = useState<{ name: string }[]>([]);
    const [genreSearch, setGenreSearch] = useState('');
    const [regionSearch, setRegionSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [genresData, countriesData] = await Promise.all([
                    fetchRadioAPI<{ name: string; stationcount: number }[]>('/tags'),
                    fetchRadioAPI<{ name: string; stationcount: number }[]>('/countries')
                ]);
                setAllGenres(genresData.filter(g => g.name.length < 20 && g.stationcount > 10)); // Filter out long tags
                setAllRegions(countriesData.filter(c => c.name));
            } catch (error) {
                console.error("Failed to load radio hub data", String(error));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const favoriteGenres = useMemo(() => new Set(profile.favoriteRadioGenres || []), [profile.favoriteRadioGenres]);
    const favoriteRegions = useMemo(() => new Set(profile.favoriteRadioRegions || []), [profile.favoriteRadioRegions]);

    const handleToggle = useCallback((type: 'genre' | 'region', name: string) => {
        onUpdateProfile(p => {
            if (type === 'genre') {
                const newGenres = new Set(p.favoriteRadioGenres || []);
                if (newGenres.has(name)) newGenres.delete(name);
                else newGenres.add(name);
                return { ...p, favoriteRadioGenres: Array.from(newGenres) };
            } else {
                const newRegions = new Set(p.favoriteRadioRegions || []);
                if (newRegions.has(name)) newRegions.delete(name);
                else newRegions.add(name);
                return { ...p, favoriteRadioRegions: Array.from(newRegions) };
            }
        });
    }, [onUpdateProfile]);
    
    const filteredGenres = useMemo(() => 
        allGenres.filter(g => g.name.toLowerCase().includes(genreSearch.toLowerCase())), 
    [allGenres, genreSearch]);
    
    const filteredRegions = useMemo(() => 
        allRegions.filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase())), 
    [allRegions, regionSearch]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setIsScrolled(e.currentTarget.scrollTop > 50);
    };

    return (
        <main onScroll={handleScroll} className="h-full w-full bg-[var(--bg-color)] overflow-y-auto scroll-container home-gradient-bg gpu-accelerated-scroll text-white">
            <div className={`collapsible-header-container ${isScrolled ? 'collapsed' : ''}`}>
                <h1 className="header-big-title">Radio Hub</h1>
                <h2 className="header-small-title">Manage Radio</h2>
                <div className="header-actions-right">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--surface-border-color)] flex items-center justify-center text-[var(--text-primary)]" aria-label="Back"><ArrowLeft size={20} /></button>
                </div>
            </div>

            <div className="px-6 pb-40 scroll-content-with-header">
                {isLoading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-2xl inline-block" /></div>
                ) : (
                    <div className="flex flex-col md:flex-row gap-6 mt-4">
                        <RadioHubColumn
                            title="Genres"
                            items={filteredGenres}
                            selectedItems={favoriteGenres}
                            onToggle={(name) => handleToggle('genre', name)}
                            limit={100}
                            searchTerm={genreSearch}
                            onSearchChange={e => setGenreSearch(e.target.value)}
                        />
                        <RadioHubColumn
                            title="Regions"
                            items={filteredRegions}
                            selectedItems={favoriteRegions}
                            onToggle={(name) => handleToggle('region', name)}
                            limit={100}
                            searchTerm={regionSearch}
                            onSearchChange={e => setRegionSearch(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </main>
    );
};

export default ManageRadioHubView;
