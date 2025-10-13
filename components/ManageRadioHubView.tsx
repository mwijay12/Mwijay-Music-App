

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
}> = ({ title, items, selectedItems, onToggle, limit }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        return items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, searchTerm]);

    const canSelectMore = selectedItems.size < limit;

    return (
        <div className="bg-[var(--surface-color)] rounded-2xl p-4 flex flex-col h-[60vh]">
            <h2 className="text-md font-bold text-neutral-300 mb-2">{title} ({selectedItems.size}/{limit})</h2>
            <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full bg-white/10 rounded-full py-2 px-4 mb-3 text-sm"
            />
            <div className="flex-1 overflow-y-auto scroll-container pr-2 -mr-2">
                <div className="flex flex-col gap-1">
                    {filteredItems.map(item => {
                        const isSelected = selectedItems.has(item.name);
                        return (
                            <button
                                key={item.name}
                                onClick={() => onToggle(item.name)}
                                disabled={!isSelected && !canSelectMore}
                                className={`w-full text-left px-3 py-2 rounded-md font-semibold text-sm transition-colors capitalize flex justify-between items-center ${isSelected ? 'bg-[var(--primary-accent)] text-black' : 'hover:bg-white/10 disabled:opacity-50'}`}
                            >
                                <span>{item.name}</span>
                                {isSelected && <i className="fas fa-check"></i>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


const ManageRadioHubView: React.FC<ManageRadioHubViewProps> = ({ profile, onUpdateProfile, onBack }) => {
    const [allGenres, setAllGenres] = useState<{ name: string }[]>([]);
    const [allRegions, setAllRegions] = useState<{ name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [genresData, regionsData] = await Promise.all([
                fetchRadioAPI('/tags?limit=500&order=stationcount&reverse=true&hidebroken=true'),
                fetchRadioAPI('/countries?order=stationcount&reverse=true&hidebroken=true')
            ]);

            setAllGenres(genresData.filter((g: any) => g.stationcount > 20).sort((a: any, b: any) => a.name.localeCompare(b.name)));
            setAllRegions(regionsData.sort((a: any, b: any) => a.name.localeCompare(b.name)));

        } catch (err) {
            setError("Could not load categories. Please check your internet connection.");
            console.error("Error fetching radio hub data:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleToggle = (type: 'genres' | 'regions', value: string) => {
        const key = type === 'genres' ? 'favoriteRadioGenres' : 'favoriteRadioRegions';
        onUpdateProfile(p => {
            const currentList = p[key] || [];
            const isSelected = currentList.includes(value);
            let newList;
            if (isSelected) {
                newList = currentList.filter(item => item !== value);
            } else {
                if (currentList.length >= 10) {
                    return p;
                }
                newList = [...currentList, value];
            }
            return { ...p, [key]: newList };
        });
    };

    const selectedGenres = new Set(profile.favoriteRadioGenres || []);
    const selectedRegions = new Set(profile.favoriteRadioRegions || []);

    return (
        <main className="h-full w-full home-gradient-bg flex flex-col">
            <header className="flex-shrink-0 p-6 flex items-center gap-4">
                <button onClick={onBack} className="text-2xl" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                <div>
                    <h1 className="text-2xl font-bold">Manage Radio Hub</h1>
                    <p className="text-neutral-400">Pick up to 10 of each for quick access.</p>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto scroll-container px-6 pb-40">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <i className="fas fa-spinner fa-spin text-3xl"></i>
                    </div>
                ) : error ? (
                     <div className="flex flex-col items-center justify-center text-center text-red-400 p-4 h-full">
                        <i className="fas fa-wifi-slash text-4xl mb-4 opacity-50"></i>
                        <p className="font-bold mb-2">{error}</p>
                        <button onClick={fetchAllData} className="mt-4 bg-[var(--primary-accent)] text-black font-bold py-2 px-6 rounded-full">
                            <i className="fas fa-sync-alt mr-2"></i> Retry
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RadioHubColumn
                            title="Genres"
                            items={allGenres}
                            selectedItems={selectedGenres}
                            onToggle={(item) => handleToggle('genres', item)}
                            limit={10}
                        />
                        <RadioHubColumn
                            title="Regions"
                            items={allRegions}
                            selectedItems={selectedRegions}
                            onToggle={(item) => handleToggle('regions', item)}
                            limit={10}
                        />
                    </div>
                )}
            </div>
        </main>
    );
};

export default ManageRadioHubView;