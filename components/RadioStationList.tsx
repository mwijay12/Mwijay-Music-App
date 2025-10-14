import React, { useMemo } from 'react';
import type { RadioStation } from '../types.ts';
import { getRandomCoverArt } from '../constants.ts';

interface RadioStationListProps {
    stations: RadioStation[];
    onPlayStation: (station: RadioStation) => void;
    favoriteStations: RadioStation[];
    onToggleFavorite: (station: RadioStation) => void;
    error: string | null;
}

const RadioStationList: React.FC<RadioStationListProps> = ({ stations, onPlayStation, favoriteStations, onToggleFavorite, error }) => {
    const favoriteStationIds = useMemo(() => new Set(favoriteStations.map(s => s.stationuuid)), [favoriteStations]);

    if (error) {
        return (
            <div className="text-center py-10 flex flex-col items-center">
                <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p className="text-neutral-400 mb-4">Error: {error}</p>
            </div>
        );
    }

    if (stations.length > 0) {
        return (
             <ul className="space-y-2">
                {stations.map(station => (
                    <li key={station.stationuuid} className="idle-ui-container flex items-center gap-4 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors cursor-pointer" onClick={() => onPlayStation(station)}>
                        <img
                            src={station.favicon || getRandomCoverArt()}
                            alt={`${station.name} logo`}
                            className="w-12 h-12 rounded-md bg-[var(--chip-bg)] object-cover flex-shrink-0"
                            onError={(e) => { e.currentTarget.src = getRandomCoverArt(); }}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{station.name}</p>
                            <p className="text-xs text-neutral-400 truncate">{station.country} &bull; {station.bitrate} kbps</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onPlayStation(station); }}
                            className="w-10 h-10 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center idle-ui-fade"
                            aria-label={`Play ${station.name}`}
                        >
                            <i className="fas fa-play"></i>
                        </button>
                    </li>
                ))}
            </ul>
        )
    }

    return (
        <div className="text-center py-10">
            <p className="text-neutral-400">No stations found.</p>
        </div>
    );
};

export default RadioStationList;