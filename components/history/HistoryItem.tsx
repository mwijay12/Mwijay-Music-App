import React from 'react';
import { motion } from 'framer-motion';
import { Play, Trash2, CheckCircle2, AlertTriangle, MoreVertical } from 'lucide-react';
import type { HistoryRecord } from '../../services/historyService.ts';

interface HistoryItemProps {
  item: HistoryRecord;
  onPlay: () => void;
  onDelete: () => void;
  onOpenOptions?: () => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({
  item,
  onPlay,
  onDelete,
  onOpenOptions,
}) => {
  // Format dates relative to now
  const formatRelativeTime = (dateInput: any): string => {
    const date = new Date(dateInput);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const elapsedPercent = Math.min(
    100,
    Math.round((item.listenedSeconds / (item.duration || 180)) * 100)
  );

  return (
    <motion.div
      className="group relative overflow-hidden bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-3 hover:bg-white/10 transition-colors"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -1 }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Cover Art Spot */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#161616] flex-shrink-0">
          <img
            src={item.artworkUrl || 'https://via.placeholder.com/60.png?text=M'}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onPlay}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[var(--primary-accent)]"
          >
            <Play size={16} fill="currentColor" />
          </button>
        </div>

        {/* Text Metadata */}
        <div className="text-left min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate max-w-[200px]">
            {item.title}
          </p>
          <p className="text-xs text-neutral-400 truncate max-w-[200px] mt-0.5">
            {item.artist} • <span className="font-mono text-[10px] text-neutral-500">{formatRelativeTime(item.playedAt)}</span>
          </p>
          
          {/* Listened Progress Mini Bar */}
          <div className="w-24 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full ${item.completed ? 'bg-[var(--primary-accent)]' : item.skipped ? 'bg-red-500/80' : 'bg-purple-500'}`} 
              style={{ width: `${elapsedPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Completion Indicators and Options */}
      <div className="flex items-center gap-2">
        {item.completed ? (
          <span aria-label="Completed Play">
            <CheckCircle2 size={16} className="text-[var(--primary-accent)]" />
          </span>
        ) : item.skipped ? (
          <span aria-label="Skipped Song">
            <AlertTriangle size={16} className="text-red-400" />
          </span>
        ) : null}

        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-white/5 hover:bg-red-950/20 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
          title="Delete from history"
        >
          <Trash2 size={14} />
        </button>

        {onOpenOptions && (
          <button
            onClick={onOpenOptions}
            className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
export default HistoryItem;
