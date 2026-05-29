import { useState, useEffect } from 'react';
import { playCountService } from '../services/playCountService.ts';

export const usePlayCount = (songId?: string) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!songId) return;

    // Subscribe to play count in real-time
    const unsubscribe = playCountService.subscribeToPlayCount(songId, (c) => {
      setCount(c);
    });

    return () => unsubscribe();
  }, [songId]);

  return {
    count,
    formatted: playCountService.formatPlayCount(count)
  };
};
export default usePlayCount;
