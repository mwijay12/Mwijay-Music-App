import { useState } from 'react';
import { motion } from 'framer-motion';

export type FilterOption = {
  source?: string[];
  genre?: string[];
  liked?: boolean;
  downloaded?: boolean;
};

interface FilterModalProps {
  currentFilters: FilterOption;
  onApply: (filters: FilterOption) => void;
  onClose: () => void;
  availableSources: string[];
  availableGenres: string[];
}

export function LibraryFilters({
  currentFilters,
  onApply,
  onClose,
  availableSources,
  availableGenres,
}: FilterModalProps) {
  
  const [localFilters, setLocalFilters] = useState<FilterOption>(currentFilters);
  
  const toggleSource = (source: string) => {
    setLocalFilters(prev => {
      const current = prev.source || [];
      return {
        ...prev,
        source: current.includes(source)
          ? current.filter(s => s !== source)
          : [...current, source]
      };
    });
  };
  
  const toggleGenre = (genre: string) => {
    setLocalFilters(prev => {
      const current = prev.genre || [];
      return {
        ...prev,
        genre: current.includes(genre)
          ? current.filter(g => g !== genre)
          : [...current, genre]
      };
    });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="filter-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30 }}
        className="filter-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="filter-modal-header">
          <h2>Filters</h2>
          <button onClick={onClose} className="filter-close">✕</button>
        </div>
        
        <div className="filter-modal-content">
          
          {/* Quick filters */}
          <div className="filter-section">
            <h3 className="filter-section-title">Quick Filters</h3>
            <div className="filter-toggles">
              <FilterToggle
                label="❤️ Liked Songs"
                active={!!localFilters.liked}
                onChange={(active) => 
                  setLocalFilters({ ...localFilters, liked: active })
                }
              />
              <FilterToggle
                label="📥 Downloaded"
                active={!!localFilters.downloaded}
                onChange={(active) => 
                  setLocalFilters({ ...localFilters, downloaded: active })
                }
              />
            </div>
          </div>
          
          {/* Source filter */}
          <div className="filter-section">
            <h3 className="filter-section-title">Source</h3>
            <div className="filter-chips-grid">
              {availableSources.map(source => (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`filter-chip-btn ${
                    localFilters.source?.includes(source) ? 'active' : ''
                  }`}
                >
                  {getSourceIcon(source)} {getSourceLabel(source)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Genre filter */}
          {availableGenres.length > 0 && (
            <div className="filter-section">
              <h3 className="filter-section-title">Genre</h3>
              <div className="filter-chips-grid">
                {availableGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`filter-chip-btn ${
                      localFilters.genre?.includes(genre) ? 'active' : ''
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="filter-modal-footer">
          <button
            onClick={() => {
              setLocalFilters({});
            }}
            className="filter-btn-reset"
          >
            Reset
          </button>
          <button
            onClick={() => onApply(localFilters)}
            className="filter-btn-apply"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface FilterToggleProps {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
}

function FilterToggle({ label, active, onChange }: FilterToggleProps) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`filter-toggle ${active ? 'active' : ''}`}
    >
      <span>{label}</span>
      <div className={`toggle-indicator ${active ? 'on' : 'off'}`}>
        <div className="toggle-dot" />
      </div>
    </button>
  );
}

function getSourceIcon(source: string): string {
  const icons: Record<string, string> = {
    local: '📱',
    cloudinary: '☁️',
    itunes: '🎵',
    deezer: '🎧',
  };
  return icons[source] || '🎵';
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    local: 'On Phone',
    cloudinary: 'My Uploads',
    itunes: 'iTunes',
    deezer: 'Deezer',
  };
  return labels[source] || source;
}
