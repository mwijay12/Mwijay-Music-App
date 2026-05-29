import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth.ts';
import { historyService, HistoryRecord } from '../services/historyService.ts';
import { profileService } from '../services/profileService.ts';
import type { Song } from '../types.ts';

export const useHistory = () => {
  const { user, isGuest } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyPaused, setHistoryPaused] = useState(false);

  // Tracking details for the active listening song session
  const activeTrackRef = useRef<Song | null>(null);
  const startTimeRef = useRef<number>(0);
  const totalListenedSecondsRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  const fetchHistory = useCallback(async (range: 'today' | 'week' | 'month' | 'all' = 'all') => {
    setLoading(true);
    try {
      const records = await historyService.getHistory(user?.uid || null, isGuest, range);
      setHistory(records);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest]);

  const deleteRecord = async (itemId: string) => {
    await historyService.deleteHistoryItem(user?.uid || null, isGuest, itemId);
    setHistory(prev => prev.filter(h => h.id !== itemId));
  };

  const clearHistory = async () => {
    await historyService.clearAllHistory(user?.uid || null, isGuest);
    setHistory([]);
  };

  // Log active song plays
  const trackPlayStart = useCallback((song: Song) => {
    if (historyPaused) return;

    // Flush any previous tracked song session
    trackPlayEnd();

    activeTrackRef.current = song;
    startTimeRef.current = new Date().getTime();
    totalListenedSecondsRef.current = 0;

    // Start timer incrementing listened seconds
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      totalListenedSecondsRef.current += 1;
    }, 1000);
  }, [historyPaused]);

  const trackPlayEnd = useCallback(async () => {
    if (!activeTrackRef.current) return;

    const finalDuration = activeTrackRef.current.duration || 180; // fallback to 3 mins
    const listened = totalListenedSecondsRef.current;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Calculations for completion and skip rates
    const completed = listened >= finalDuration * 0.8 || listened > 120; // >80% played or >2 mins
    const skipped = listened < 10; // skipped in under 10 seconds

    // Record the play ONLY if listened for more than 30 seconds
    if (listened >= 30) {
      try {
        await historyService.recordPlay(
          user?.uid || null,
          isGuest,
          activeTrackRef.current,
          listened,
          completed,
          skipped
        );
      } catch (err) {
        console.warn('Playback logging failed:', err);
      }
    }

    activeTrackRef.current = null;
    totalListenedSecondsRef.current = 0;
  }, [user, isGuest]);

  useEffect(() => {
    fetchHistory();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchHistory]);

  return {
    history,
    loading,
    historyPaused,
    setHistoryPaused,
    fetchHistory,
    deleteRecord,
    clearHistory,
    trackPlayStart,
    trackPlayEnd,
  };
};
export default useHistory;
