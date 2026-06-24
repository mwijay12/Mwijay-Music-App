import { db, auth } from './firebase.ts';
import {
  collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, where, increment, getDoc, runTransaction
} from 'firebase/firestore';
import type { Song } from '../types.ts';

export interface AdminSong {
  id: string;
  title: string;
  artist: string;
  description?: string;
  url: string;
  duration?: number;
  albumArtUrl?: string;
  source: string;
  isAiGenerated?: boolean;
  uploadedBy?: string;
  featured?: boolean;
  playCount?: number;
  createdAt?: any;
}

function mapDocToSong(doc: any): Song {
  const data = doc.data();
  return {
    id: `mwijay-${doc.id}`,
    title: data.title || 'Untitled',
    artist: data.artist || 'Mwijay',
    albumArtUrl: data.albumArtUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.title || 'Mwijay')}&background=9333ea&color=fff&size=400`,
    url: data.url || '',
    duration: data.duration || 0,
    source: 'Mwijay Originals',
    notes: data.description || '',
    isFavorite: false,
  };
}

export const adminSongsService = {
  async create(data: { title: string; artist: string; description?: string; url: string; duration?: number; albumArtUrl?: string }): Promise<string> {
    const docRef = await addDoc(collection(db, 'admin_songs'), {
      ...data,
      source: 'R2',
      isAiGenerated: true,
      featured: false,
      playCount: 0,
      uploadedBy: auth.currentUser?.email || 'admin',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getAll(): Promise<AdminSong[]> {
    const snap = await getDocs(query(collection(db, 'admin_songs'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminSong));
  },

  async getAllAsSongs(): Promise<Song[]> {
    const snap = await getDocs(query(collection(db, 'admin_songs'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => mapDocToSong(d));
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'admin_songs', id));
  },

  async toggleFeature(id: string, featured: boolean): Promise<void> {
    await updateDoc(doc(db, 'admin_songs', id), { featured });
  },

  async search(term: string): Promise<Song[]> {
    const snap = await getDocs(query(collection(db, 'admin_songs'), orderBy('createdAt', 'desc')));
    const lower = term.toLowerCase();
    return snap.docs
      .filter(d => {
        const data = d.data();
        return (data.title || '').toLowerCase().includes(lower) ||
               (data.artist || '').toLowerCase().includes(lower);
      })
      .map(d => mapDocToSong(d));
  },

  async recordPlay(songId: string): Promise<void> {
    const realId = songId.replace('mwijay-', '');
    const adminSongRef = doc(db, 'admin_songs', realId);
    try {
      await runTransaction(db, async (transaction) => {
        transaction.set(adminSongRef, {
          playCount: increment(1),
          lastPlayedAt: serverTimestamp(),
        }, { merge: true });
      });
    } catch (err) {
      console.warn('Failed to record admin song play:', err);
    }
  },
};
