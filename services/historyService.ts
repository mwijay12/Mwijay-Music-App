import { 
  collection, doc, addDoc, getDocs, deleteDoc, 
  query, where, orderBy, limit, serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase.ts';
import type { Song } from '../types.ts';

export interface HistoryRecord {
  id?: string;
  songId: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  source: string;
  playedAt: any; // Timestamp or Date
  duration: number;
  listenedSeconds: number;
  completed: boolean;
  skipped: boolean;
  playMethod: 'manual' | 'autoplay' | 'shuffle';
}

// Local memory storage for offline/guest mode history tracking
let localGuestHistory: HistoryRecord[] = [];

export const historyService = {
  /**
   * Logs a listening record to Firestore (or local storage for Guest mode).
   */
  recordPlay: async (
    userId: string | null,
    isGuest: boolean,
    song: Song,
    listenedSeconds: number,
    completed: boolean,
    skipped: boolean,
    playMethod: 'manual' | 'autoplay' | 'shuffle' = 'manual'
  ): Promise<void> => {
    const record: HistoryRecord = {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      album: song.source || 'Mwijay Local',
      artworkUrl: song.albumArtUrl || '',
      source: song.source || 'local',
      playedAt: new Date(),
      duration: song.duration || 0,
      listenedSeconds,
      completed,
      skipped,
      playMethod,
    };

    if (isGuest || !userId) {
      // Deduplicate guest history (no consecutive duplicate tracks in 5 mins)
      if (localGuestHistory.length > 0) {
        const last = localGuestHistory[0];
        const timeDiff = new Date().getTime() - new Date(last.playedAt).getTime();
        if (last.songId === song.id && timeDiff < 5 * 60 * 1000) {
          return;
        }
      }
      localGuestHistory.unshift(record);
      if (localGuestHistory.length > 100) localGuestHistory.pop();
      return;
    }

    try {
      // Deduplicate real-time history
      const historyCollection = collection(db, 'users', userId, 'history');
      const q = query(historyCollection, orderBy('playedAt', 'desc'), limit(1));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const lastRecord = querySnap.docs[0].data() as HistoryRecord;
        const lastPlayedTime = lastRecord.playedAt?.toDate?.() || new Date(lastRecord.playedAt);
        const timeDiff = new Date().getTime() - lastPlayedTime.getTime();

        if (lastRecord.songId === song.id && timeDiff < 5 * 60 * 1000) {
          // Skip logging since it's within the deduplication window
          return;
        }
      }

      await addDoc(historyCollection, {
        ...record,
        playedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Failed to log listening history to Firestore:', err);
    }
  },

  /**
   * Fetches history items with filters for time ranges.
   */
  getHistory: async (
    userId: string | null,
    isGuest: boolean,
    timeRange: 'today' | 'week' | 'month' | 'all' = 'all'
  ): Promise<HistoryRecord[]> => {
    if (isGuest || !userId) {
      return filterHistoryByTimeRange(localGuestHistory, timeRange);
    }

    try {
      const historyCollection = collection(db, 'users', userId, 'history');
      const q = query(historyCollection, orderBy('playedAt', 'desc'));
      const querySnap = await getDocs(q);

      const records: HistoryRecord[] = querySnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          playedAt: data.playedAt?.toDate?.() || new Date(data.playedAt || Date.now()),
        } as HistoryRecord;
      });

      return filterHistoryByTimeRange(records, timeRange);
    } catch (err) {
      console.error('Failed to get listening history:', err);
      return [];
    }
  },

  /**
   * Deletes a single history record.
   */
  deleteHistoryItem: async (userId: string | null, isGuest: boolean, itemId: string): Promise<void> => {
    if (isGuest || !userId) {
      localGuestHistory = localGuestHistory.filter((item, index) => String(index) !== itemId && item.id !== itemId);
      return;
    }

    try {
      const docRef = doc(db, 'users', userId, 'history', itemId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  },

  /**
   * Clears entire listening history.
   */
  clearAllHistory: async (userId: string | null, isGuest: boolean): Promise<void> => {
    if (isGuest || !userId) {
      localGuestHistory = [];
      return;
    }

    try {
      const historyCollection = collection(db, 'users', userId, 'history');
      const querySnap = await getDocs(historyCollection);
      
      const batch = writeBatch(db);
      querySnap.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to clear listening history:', err);
    }
  },

  /**
   * Gathers calculated trends for top songs.
   */
  getMostPlayedSongs: (records: HistoryRecord[], limitCount = 10): { songId: string; title: string; artist: string; artworkUrl: string; count: number }[] => {
    const counts: Record<string, { title: string; artist: string; artworkUrl: string; count: number }> = {};
    
    records.forEach((rec) => {
      if (!counts[rec.songId]) {
        counts[rec.songId] = { title: rec.title, artist: rec.artist, artworkUrl: rec.artworkUrl, count: 0 };
      }
      counts[rec.songId].count += 1;
    });

    return Object.keys(counts)
      .map((key) => ({ songId: key, ...counts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
  }
};

/**
 * Filter utility for ranges.
 */
function filterHistoryByTimeRange(records: HistoryRecord[], range: 'today' | 'week' | 'month' | 'all'): HistoryRecord[] {
  if (range === 'all') return records;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  return records.filter((rec) => {
    const playTime = new Date(rec.playedAt).getTime();
    if (range === 'today') return playTime >= startOfDay;
    if (range === 'week') return playTime >= oneWeekAgo;
    if (range === 'month') return playTime >= oneMonthAgo;
    return true;
  });
}
export default historyService;
