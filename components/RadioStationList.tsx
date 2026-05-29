
import React, { useMemo } from 'react';
import { AlertTriangle, Disc, Heart } from 'lucide-react';
import type { RadioStation } from '../types.ts';
import { getRandomCoverArt } from '../constants.ts';
import AnimatedList from './AnimatedList.tsx';

interface RadioStationListProps {
    stations: RadioStation[];
    onPlayStation: (station: RadioStation) => void;
    favoriteStations: RadioStation[];
    onToggleFavorite: (station: RadioStation) => void;
    error: string | null;
    isLoading?: boolean;
}

const SkeletonStationItem: React.FC = () => (
    <li className="flex items-center gap-4 p-2">
        <div className="w-12 h-12 rounded-md bg-white/10 animate-pulse"></div>
        <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse"></div>
            <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse"></div>
        </div>
    </li>
);


const RadioStationList: React.FC<RadioStationListProps> = ({ stations, onPlayStation, favoriteStations, onToggleFavorite, error, isLoading }) => {
    const favoriteStationIds = useMemo(() => new Set(favoriteStations.map(s => s.stationuuid)), [favoriteStations]);
    
    if (isLoading) {
        return (
            <ul className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonStationItem key={i} />)}
            </ul>
        );
    }

    if (error) {
        return (
            <div className="text-center py-10 flex flex-col items-center">
                <AlertTriangle size={40} className="text-red-500 mb-4" />
                <p className="text-neutral-400 mb-4">Error: {error}</p>
            </div>
        );
    }

    if (stations.length === 0) {
        return (
             <div className="text-center py-10">
                <Disc size={40} className="text-neutral-500 mb-4" />
                <p className="text-neutral-400">No stations found.</p>
            </div>
        );
    }

    return (
        <AnimatedList<RadioStation>
            items={stations}
            getKey={(station) => station.stationuuid}
            onItemSelect={onPlayStation}
            className="-mx-2"
            renderItem={(station, index, isSelected) => {
                const isFavorite = favoriteStationIds.has(station.stationuuid);
                return (
                    <div className="flex items-center gap-4 p-2 rounded-lg">
                        <img
                            src={station.favicon || getRandomCoverArt()}
                            alt={`${station.name} logo`}
                            className="w-12 h-12 rounded-md bg-[var(--chip-bg)] object-cover flex-shrink-0"
                            onError={(e) => { e.currentTarget.src = getRandomCoverArt(); }}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{station.name}</p>
                            <p className="text-xs text-neutral-400 truncate">{station.country}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(station); }} className="w-10 h-10 flex-shrink-0 flex items-center justify-center transition-colors" title={isFavorite ? 'Unfavorite' : 'Favorite'}>
                            <Heart size={20} className={isFavorite ? 'text-red-500 fill-red-500' : 'text-neutral-400 hover:text-white'} />
                        </button>
                    </div>
                );
            }}
        />
    );
};

export default RadioStationList;
