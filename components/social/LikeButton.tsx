import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useLikes } from '../../hooks/useLikes.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { LikeAnimation } from './LikeAnimation.tsx';
import type { Song } from '../../types.ts';

interface LikeButtonProps {
  song: Song;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  variant?: 'default' | 'minimal' | 'fancy';
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  song,
  size = 'md',
  showCount = false,
  variant = 'default',
}) => {
  const { profile } = useAuth();
  const { isLiked, likeCount, toggleLike, loading } = useLikes(song.id);
  const [isBursting, setIsBursting] = useState(false);

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    // Trigger haptic feedback
    if (profile?.settings?.hapticsEnabled) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        console.log('Haptics not available on this platform.');
      }
    }

    // Toggle liked status
    await toggleLike(song);

    // If it's a new "like", trigger the particle burst
    if (!isLiked) {
      setIsBursting(true);
      setTimeout(() => {
        setIsBursting(false);
      }, 700);
    }
  };

  return (
    <div className="relative flex items-center gap-1.5 overflow-visible select-none">
      <motion.button
        onClick={handleToggle}
        disabled={loading}
        className={`relative p-2 rounded-full cursor-pointer transition-colors ${
          isLiked 
            ? 'text-pink-500 hover:bg-pink-500/5' 
            : 'text-neutral-400 hover:text-white hover:bg-white/5'
        }`}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <AnimatePresence>
          {isBursting && <LikeAnimation />}
        </AnimatePresence>

        <motion.div
          animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Heart 
            size={iconSize} 
            fill={isLiked ? 'currentColor' : 'none'} 
            className={isLiked ? 'drop-shadow-[0_0_6px_rgba(236,72,153,0.4)]' : ''}
          />
        </motion.div>
      </motion.button>

      {showCount && likeCount > 0 && (
        <span className="text-xs font-bold text-neutral-400 tracking-tight select-none">
          {likeCount}
        </span>
      )}
    </div>
  );
};
export default LikeButton;
