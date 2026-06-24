import type { Video } from '../types.ts';
import { db } from './firebase.ts';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

// ── GUARANTEED WORKING SAMPLE VIDEOS ──────────────────────────────
const SAMPLE_VIDEOS: Video[] = [
  {
    id: 'sample_bbb',
    title: 'Big Buck Bunny',
    uploader: 'Blender Foundation',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    isFavorite: false,
  },
  {
    id: 'sample_ed',
    title: 'Elephants Dream',
    uploader: 'Blender Foundation',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
    isFavorite: false,
  },
  {
    id: 'sample_fbb',
    title: 'For Bigger Blazes',
    uploader: 'Google',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
    isFavorite: false,
  },
  {
    id: 'sample_sintel',
    title: 'Sintel',
    uploader: 'Blender Foundation',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
    isFavorite: false,
  },
  {
    id: 'sample_tos',
    title: 'Tears of Steel',
    uploader: 'Blender Foundation',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
    isFavorite: false,
  },
  {
    id: 'sample_subaru',
    title: 'Subaru Outback',
    uploader: 'Google Sample',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg',
    isFavorite: false,
  },
];

// Archive items with confirmed working MP4 paths
const ARCHIVE_KNOWN_GOOD: Video[] = [
  {
    id: 'ia_kf',
    title: 'Kaleidoscope Fantasia',
    uploader: 'Internet Archive',
    url: 'https://archive.org/download/kaleidoscope_fantasia/kaleidoscope_fantasia_512kb.mp4',
    thumbnailUrl: 'https://archive.org/services/img/kaleidoscope_fantasia',
    isFavorite: false,
  },
  {
    id: 'ia_countdown',
    title: 'Prelinger: Countdown to Zero',
    uploader: 'Prelinger Archives',
    url: 'https://archive.org/download/countdown_to_zero/countdown_to_zero.mp4',
    thumbnailUrl: 'https://archive.org/services/img/countdown_to_zero',
    isFavorite: false,
  },
];

class OnlineReelsService {

  /**
   * Get trending/default reels. Always returns something.
   */
  async getTrending(searchQuery = ''): Promise<Video[]> {
    let adminReels: Video[] = [];
    try {
      if (navigator.onLine) {
        const snap = await getDocs(query(collection(db, 'admin_reels'), orderBy('createdAt', 'desc')));
        adminReels = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
      }
    } catch (e) {
      console.warn('[OnlineReels] Failed to fetch admin reels from Firestore:', e);
    }

    const results = await Promise.allSettled([
      this.searchInternetArchive(searchQuery || 'music short film'),
      this.searchWikimedia(searchQuery || 'music'),
    ]);

    const videos: Video[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        videos.push(...r.value);
      }
    }

    if (videos.length === 0 && adminReels.length === 0) {
      console.warn('[OnlineReels] All sources failed — using built-in samples');
      return this.getSamples(searchQuery);
    }

    // Prepend admin-uploaded reels at the top, followed by shuffled online search results
    return [...adminReels, ...this.shuffle([...videos, ...SAMPLE_VIDEOS])];
  }

  // ── INTERNET ARCHIVE ────────────────────────────────────────────
  private async searchInternetArchive(query: string): Promise<Video[]> {
    try {
      const baseQuery = query
        ? `(title:"${query}" OR subject:"${query}") AND mediatype:movies`
        : 'mediatype:movies AND (subject:music OR subject:"music video" OR collection:moviesandfilms)';

      const params = new URLSearchParams({
        q: baseQuery,
        'fl[]': 'identifier,title,creator,downloads',
        sort: 'downloads desc',
        rows: '30',
        output: 'json',
      });

      const res = await fetch(
        `https://archive.org/advancedsearch.php?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!res.ok) return [];
      const data = await res.json();
      const docs: any[] = data.response?.docs || [];
      if (docs.length === 0) return [];

      // Fetch file listings in parallel (max 15 to avoid rate limiting)
      const videoPromises = docs.slice(0, 15).map(doc => this.resolveArchiveVideo(doc));
      const resolved = await Promise.allSettled(videoPromises);

      return resolved
        .filter((r): r is PromiseFulfilledResult<Video | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((v): v is Video => v !== null);

    } catch (err) {
      console.warn('[Archive] Search failed:', err);
      return [];
    }
  }

  private async resolveArchiveVideo(doc: any): Promise<Video | null> {
    try {
      const res = await fetch(
        `https://archive.org/metadata/${doc.identifier}/files`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;

      const files: any[] = await res.json();
      // Prefer small/medium MP4s for faster loading
      const mp4 = files.find(f =>
        f.format === 'MPEG4' ||
        (f.name?.toLowerCase().endsWith('.mp4') && !f.name?.toLowerCase().includes('_512'))
      ) || files.find(f => f.name?.toLowerCase().endsWith('.mp4'));

      if (!mp4) return null;

      return {
        id: `ia_${doc.identifier}`,
        title: doc.title || doc.identifier,
        uploader: doc.creator || 'Internet Archive',
        url: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(mp4.name)}`,
        thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
        isFavorite: false,
      };
    } catch {
      return null;
    }
  }

  // ── WIKIMEDIA COMMONS ───────────────────────────────────────────
  private async searchWikimedia(query: string): Promise<Video[]> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: `${query} filetype:video`,
        srnamespace: '6',
        srlimit: '25',
        origin: '*',
      });

      const res = await fetch(
        `https://commons.wikimedia.org/w/api.php?${params}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return [];

      const data = await res.json();
      const items: any[] = data.query?.search || [];
      if (items.length === 0) return [];

      const infoPromises = items.slice(0, 15).map(item => this.resolveWikimediaVideo(item));
      const resolved = await Promise.allSettled(infoPromises);

      return resolved
        .filter((r): r is PromiseFulfilledResult<Video | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((v): v is Video => v !== null);

    } catch (err) {
      console.warn('[Wikimedia] Search failed:', err);
      return [];
    }
  }

  private async resolveWikimediaVideo(item: any): Promise<Video | null> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: item.title,
        prop: 'imageinfo',
        iiprop: 'url|mime',
        origin: '*',
      });

      const res = await fetch(
        `https://commons.wikimedia.org/w/api.php?${params}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;

      const data = await res.json();
      const pages: any = data.query?.pages || {};
      const page = Object.values(pages)[0] as any;
      const info = page?.imageinfo?.[0];

      if (!info || !info.url) return null;
      // Only accept actual video MIME types
      if (!info.mime?.startsWith('video/')) return null;

      const cleanTitle = item.title.replace(/^File:/, '').replace(/\.[^.]+$/, '');
      return {
        id: `wm_${item.pageid}`,
        title: cleanTitle,
        uploader: 'Wikimedia Commons',
        url: info.url,
        thumbnailUrl: info.url, // video itself as poster
        isFavorite: false,
      };
    } catch {
      return null;
    }
  }

  // ── PIXABAY (optional — needs VITE_PIXABAY_KEY) ─────────────────
  async searchPixabay(query: string): Promise<Video[]> {
    const key = import.meta.env.VITE_PIXABAY_KEY;
    if (!key) return [];

    try {
      const params = new URLSearchParams({
        key,
        q: query || 'music nature',
        per_page: '12',
        safesearch: 'true',
        video_type: 'all',
      });

      const res = await fetch(
        `https://pixabay.com/api/videos/?${params}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return [];

      const data = await res.json();
      return (data.hits || []).map((v: any): Video => ({
        id: `px_${v.id}`,
        title: v.tags || 'Pixabay Video',
        uploader: (v.user as string | undefined) ?? 'Pixabay',
        url: v.videos?.medium?.url || v.videos?.small?.url || '',
        thumbnailUrl: `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg`,
        isFavorite: false,
      })).filter((v: Video) => !!v.url);
    } catch {
      return [];
    }
  }

  // ── BUILT-IN SAMPLES (always works offline/fallback) ────────────
  getSamples(query = ''): Video[] {
    if (!query) return [...SAMPLE_VIDEOS];
    const q = query.toLowerCase();
    const filtered = SAMPLE_VIDEOS.filter(
      v => v.title.toLowerCase().includes(q) || (v.uploader || '').toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered : [...SAMPLE_VIDEOS];
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export const onlineReelsService = new OnlineReelsService();
