import { 
  doc, setDoc, deleteDoc, getDoc, getDocs, collection, 
  onSnapshot, increment, serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import type { Song } from '../types.ts';

// Local storage keys for guest/offline backup
const GUEST_LIKES_KEY = 'mwijay_guest_likes';

export const likesService = {
  /**
   * Emits local events for optimistic UI state synchronization.
   */
  emitChange: (songId: string, isLiked: boolean) => {
    window.dispatchEvent(
      new CustomEvent('like-change', { detail: { songId, isLiked } })
    );
  },

  /**
   * Checks if a song is liked (supports guest and offline caching).
   */
  isLiked: async (songId: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) {
      const guestLikes = JSON.parse(localStorage.getItem(GUEST_LIKES_KEY) || '[]');
      return guestLikes.includes(songId);
    }

    try {
      const docRef = doc(db, 'users', user.uid, 'likes', songId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch {
      return false;
    }
  },

  /**
   * Likes a song optimistically, then updates Firestore metrics.
   */
  likeSong: async (song: Song): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      // Guest mode local save
      const guestLikes = JSON.parse(localStorage.getItem(GUEST_LIKES_KEY) || '[]');
      if (!guestLikes.includes(song.id)) {
        guestLikes.push(song.id);
        localStorage.setItem(GUEST_LIKES_KEY, JSON.stringify(guestLikes));
      }
      likesService.emitChange(song.id, true);
      return;
    }

    // Optimistic trigger
    likesService.emitChange(song.id, true);

    try {
      // 1. Add to user likes list
      const userLikeRef = doc(db, 'users', user.uid, 'likes', song.id);
      await setDoc(userLikeRef, {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        artworkUrl: song.albumArtUrl || '',
        audioUrl: song.url || '',
        source: song.source || 'local',
        likedAt: serverTimestamp(),
      });

      // 2. Increment global song likes counter
      const songStatsRef = doc(db, 'songs', song.id);
      await setDoc(songStatsRef, {
        title: song.title,
        artist: song.artist,
        artworkUrl: song.albumArtUrl || '',
        likes: increment(1),
        lastLikedAt: serverTimestamp(),
      }, { merge: true });

    } catch (error) {
      // Revert optimistic updates on error
      likesService.emitChange(song.id, false);
      console.error('Failed to like song:', error);
      throw error;
    }
  },

  /**
   * Unlikes a song optimistically, then removes Firestore references.
   */
  unlikeSong: async (songId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      // Guest mode local removal
      let guestLikes = JSON.parse(localStorage.getItem(GUEST_LIKES_KEY) || '[]');
      guestLikes = guestLikes.filter((id: string) => id !== songId);
      localStorage.setItem(GUEST_LIKES_KEY, JSON.stringify(guestLikes));
      likesService.emitChange(songId, false);
      return;
    }

    // Optimistic trigger
    likesService.emitChange(songId, false);

    try {
      // 1. Delete from user likes list
      const userLikeRef = doc(db, 'users', user.uid, 'likes', songId);
      await deleteDoc(userLikeRef);

      // 2. Decrement global counter
      const songStatsRef = doc(db, 'songs', songId);
      const songSnap = await getDoc(songStatsRef);
      if (songSnap.exists()) {
        const currentLikes = songSnap.data().likes || 0;
        await setDoc(songStatsRef, {
          likes: Math.max(0, currentLikes - 1),
        }, { merge: true });
      }

    } catch (error) {
      // Revert optimistic state on error
      likesService.emitChange(songId, true);
      console.error('Failed to unlike song:', error);
      throw error;
    }
  },

  /**
   * Toggle liked status.
   */
  toggleLike: async (song: Song): Promise<boolean> => {
    const isCurrentlyLiked = await likesService.isLiked(song.id);
    if (isCurrentlyLiked) {
      await likesService.unlikeSong(song.id);
      return false;
    } else {
      await likesService.likeSong(song);
      return true;
    }
  },

  /**
   * Retrieves all liked songs for the active user.
   */
  getLikedSongs: async (): Promise<Song[]> => {
    const user = auth.currentUser;
    if (!user) {
      return []; // Guest mode does not fetch remote lists
    }

    try {
      const likesCollection = collection(db, 'users', user.uid, 'likes');
      const snap = await getDocs(likesCollection);
      return snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: data.songId,
          title: data.title,
          artist: data.artist,
          albumArtUrl: data.artworkUrl,
          url: data.audioUrl,
          source: data.source,
        } as Song;
      });
    } catch (err) {
      console.error('Failed to get liked songs:', err);
      return [];
    }
  },

  /**
   * Real-time subscription to global song stats (like counter).
   */
  subscribeToSongStats: (
    songId: string,
    callback: (likesCount: number) => void
  ): (() => void) => {
    const docRef = doc(db, 'songs', songId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().likes || 0);
      } else {
        callback(0);
      }
    }, () => callback(0));
  },

  /**
   * Real-time subscription to active user's likes.
   */
  subscribeToUserLikes: (
    callback: (likedSongs: Song[]) => void
  ): (() => void) => {
    const user = auth.currentUser;
    if (!user) {
      callback([]);
      return () => {};
    }

    const likesCollection = collection(db, 'users', user.uid, 'likes');
    return onSnapshot(likesCollection, (snap) => {
      const songs = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: data.songId,
          title: data.title,
          artist: data.artist,
          albumArtUrl: data.artworkUrl,
          url: data.audioUrl,
          source: data.source,
        } as Song;
      });
      callback(songs);
    }, () => callback([]));
  }
};
export default likesService;
