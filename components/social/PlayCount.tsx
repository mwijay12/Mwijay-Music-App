import React from 'react';
import { Play } from 'lucide-react';
import { usePlayCount } from '../../hooks/usePlayCount.ts';

interface PlayCountProps {
  songId: string;
  variant?: 'compact' | 'detailed';
}

export const PlayCount: React.FC<PlayCountProps> = ({ songId, variant = 'compact' }) => {
  const { count, formatted } = usePlayCount(songId);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/5 py-1 px-2.5 rounded-full select-none text-[10px] text-neutral-400 font-bold uppercase tracking-wider w-fit">
      <Play size={10} className="text-[var(--primary-accent)] fill-[var(--primary-accent)]" />
      <span>
        {variant === 'detailed' ? `${formatted} plays total` : formatted}
      </span>
    </div>
  );
};
export default PlayCount;
