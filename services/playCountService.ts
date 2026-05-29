import { 
  doc, setDoc, getDoc, getDocs, collection, 
  onSnapshot, increment, serverTimestamp, runTransaction, 
  arrayUnion 
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import type { Song } from '../types.ts';

// Local cache memory representing play counters
const GUEST_PLAY_COUNTS_KEY = 'mwijay_guest_plays';

export const playCountService = {
  /**
   * Records a track play globally and updates personal user records via Firestore transaction.
   */
  recordPlay: async (song: Song, isGuest: boolean): Promise<void> => {
    const user = auth.currentUser;
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    if (isGuest || !user) {
      // Guest local-storage tracker
      const guestCounts = JSON.parse(localStorage.getItem(GUEST_PLAY_COUNTS_KEY) || '{}');
      guestCounts[song.id] = (guestCounts[song.id] || 0) + 1;
      localStorage.setItem(GUEST_PLAY_COUNTS_KEY, JSON.stringify(guestCounts));
      return;
    }

    const songRef = doc(db, 'songs', song.id);
    const dailyRef = doc(db, 'songs', song.id, 'dailyStats', today);
    const userPlayRef = doc(db, 'users', user.uid, 'playCounts', song.id);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Update overall global song counters
        transaction.set(songRef, {
          title: song.title,
          artist: song.artist,
          artworkUrl: song.albumArtUrl || '',
          plays: increment(1),
          playsToday: increment(1),
          playsThisWeek: increment(1),
          playsThisMonth: increment(1),
          lastPlayedAt: serverTimestamp(),
        }, { merge: true });

        // 2. Log daily stat tracking
        transaction.set(dailyRef, {
          date: today,
          plays: increment(1),
          uniqueListeners: arrayUnion(user.uid),
        }, { merge: true });

        // 3. Log user's personal count
        transaction.set(userPlayRef, {
          songId: song.id,
          count: increment(1),
          lastPlayedAt: serverTimestamp(),
        }, { merge: true });
      });

      // Compute and update trendingScore
      await playCountService.updateTrendingScore(song.id);

    } catch (err) {
      console.warn('Failed to record playback transaction:', err);
    }
  },

  /**
   * Calculates and updates the weighted trendingScore for a song.
   */
  updateTrendingScore: async (songId: string): Promise<void> => {
    const songRef = doc(db, 'songs', songId);
    
    try {
      const songSnap = await getDoc(songRef);
      if (!songSnap.exists()) return;

      const data = songSnap.data();
      const playsToday = data.playsToday || 0;
      const playsThisWeek = data.playsThisWeek || 0;
      const playsThisMonth = data.playsThisMonth || 0;

      // Score formula: Today plays are weighted heavily, then weekly, then monthly
      const trendingScore = (playsToday * 5) + (playsThisWeek * 2) + Math.round(playsThisMonth / 4);

      await setDoc(songRef, { trendingScore }, { merge: true });
    } catch (err) {
      console.warn('Failed to calculate trending score:', err);
    }
  },

  /**
   * Formats raw counts to friendly reader strings (e.g. 1200 -> "1.2K")
   */
  formatPlayCount: (count: number): string => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    if (count < 1000000000) return `${(count / 1000000).toFixed(1)}M`;
    return `${(count / 1000000000).toFixed(1)}B`;
  },

  /**
   * Subscribes to play counts for a song.
   */
  subscribeToPlayCount: (
    songId: string,
    callback: (count: number) => void
  ): (() => void) => {
    const docRef = doc(db, 'songs', songId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().plays || 0);
      } else {
        callback(0);
      }
    }, () => callback(0));
  }
};
export default playCountService;
