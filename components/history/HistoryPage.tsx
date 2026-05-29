import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trash2, ShieldX, PlayCircle, Loader2, Music4 } from 'lucide-react';
import { useHistory } from '../../hooks/useHistory.ts';
import { HistoryItem } from './HistoryItem.tsx';
import type { Song } from '../../types.ts';

interface HistoryPageProps {
  onBack: () => void;
  onPlaySong: (song: Song, context: Song[]) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type DateRange = 'today' | 'week' | 'month' | 'all';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onBack,
  onPlaySong,
  showNotification,
}) => {
  const { history, loading, deleteRecord, clearHistory, fetchHistory } = useHistory();
  const [activeTab, setActiveTab] = useState<DateRange>('all');

  const handleTabChange = async (tab: DateRange) => {
    setActiveTab(tab);
    await fetchHistory(tab);
  };

  const handleClearAll = async () => {
    if (history.length === 0) return;
    if (window.confirm('Are you sure you want to clear your entire listening history?')) {
      try {
        await clearHistory();
        showNotification('Listening history cleared completely.', 'info');
      } catch {
        showNotification('Failed to clear history.', 'error');
      }
    }
  };

  const handlePlayHistorySong = (record: any) => {
    // Construct Song type from History Record
    const song: Song = {
      id: record.songId,
      title: record.title,
      artist: record.artist,
      albumArtUrl: record.artworkUrl,
      source: record.source,
      duration: record.duration,
      // URL will resolve dynamically on load
    };

    // Build context queue list from items
    const context: Song[] = history.map(h => ({
      id: h.songId,
      title: h.title,
      artist: h.artist,
      albumArtUrl: h.artworkUrl,
      source: h.source,
      duration: h.duration
    }));

    onPlaySong(song, context);
  };

  return (
    <div className="w-full h-full bg-black text-white flex flex-col overflow-hidden pb-12">
      {/* Top sticky header */}
      <div 
        className="w-full px-6 py-4 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl border-b border-white/5 z-30"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 text-left">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white leading-tight">Listening History</h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Your Sound Footprint</p>
          </div>
        </div>

        {history.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="w-10 h-10 rounded-full bg-red-950/20 hover:bg-red-900/30 text-red-400 flex items-center justify-center cursor-pointer transition-colors"
            title="Clear All History"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Date Range Tabs Grid */}
      <div className="px-6 py-4 flex items-center gap-1.5 overflow-x-auto select-none border-b border-white/5 bg-black">
        {(['all', 'today', 'week', 'month'] as DateRange[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`py-2 px-4 text-xs font-black rounded-full uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${
              activeTab === tab
                ? 'bg-white text-black font-black'
                : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* History Items Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="animate-spin text-[var(--primary-accent)]" size={32} />
          </div>
        ) : history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <span className="p-4 bg-white/5 border border-white/5 rounded-full text-neutral-500">
              <Music4 size={32} />
            </span>
            <div>
              <p className="text-sm font-bold text-neutral-400">No tracks logged yet</p>
              <p className="text-xs text-neutral-500 max-w-[200px] mt-1 mx-auto">
                Start playing songs to compile your coordinates.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {history.map((record, index) => (
              <HistoryItem
                key={record.id || index}
                item={record}
                onPlay={() => handlePlayHistorySong(record)}
                onDelete={() => deleteRecord(record.id || String(index))}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
export default HistoryPage;
