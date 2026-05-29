import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth.ts';
import { likesService } from '../services/likesService.ts';
import type { Song } from '../types.ts';

export const useLikes = (songId?: string) => {
  const { user, isGuest } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Synchronize dynamic updates
  useEffect(() => {
    if (!songId) return;

    // Check initial user likes state
    likesService.isLiked(songId).then(setIsLiked);

    // Subscribe to song likes count
    const unsubscribeCount = likesService.subscribeToSongStats(songId, (count) => {
      setLikeCount(count);
    });

    // Optimistic listener to sync state instantly
    const handleLikeEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.songId === songId) {
        setIsLiked(detail.isLiked);
      }
    };
    window.addEventListener('like-change', handleLikeEvent);

    return () => {
      unsubscribeCount();
      window.removeEventListener('like-change', handleLikeEvent);
    };
  }, [songId, user]);

  const toggleLike = useCallback(async (song: Song): Promise<void> => {
    if (!songId) return;

    if (!user || isGuest) {
      // Dispatch trigger to show Auth Modal for guests
      window.dispatchEvent(new CustomEvent('trigger-auth-modal'));
      return;
    }

    setLoading(true);
    try {
      await likesService.toggleLike(song);
    } catch (err) {
      console.error('Toggle like failed:', err);
    } finally {
      setLoading(false);
    }
  }, [songId, user, isGuest]);

  return {
    isLiked,
    likeCount,
    toggleLike,
    loading
  };
};
export default useLikes;
