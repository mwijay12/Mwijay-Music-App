import { Capacitor } from '@capacitor/core';
import type { Song, Video } from '../types';
import { MediaScanner } from '../utils/fileScanner';
import { safeFileSrc } from '../utils/safeUri';
import MediaControl from '../plugins/MediaControl';

interface ScannerSettings {
  minFileSizeMB: number;
  minSongDurationSeconds: number;
  excludedFolders: string[];
}

class FileScannerService {
  /**
   * Main scan entry point.
   * Uses the native Android MediaStore ContentResolver via MediaControl.
   * Falls back to the stable batch-processing filesystem scanner.
   */
  async scanMedia(
    scannerSettings: ScannerSettings,
    progressCallback: (current: number, total: number, fileName: string) => void
  ): Promise<{ songs: Song[]; videos: Video[] }> {
    if (!Capacitor.isNativePlatform()) {
      progressCallback(1, 1, 'Scanning not available on web.');
      return { songs: [], videos: [] };
    }

    try {
      progressCallback(0, 100, 'Querying native MediaStore...');
      const result = await MediaControl.scanMedia();
      console.log('[ScannerService] Native scan raw result:', result);

      const songs: Song[] = (result.audio || []).map((item: any) => {
        // Map cached artwork path to safe file URL
        const artworkUrl = item.artwork ? safeFileSrc(item.artwork) : '';
        const playUrl = item.uri || item.path; // URI is content://; path is file:///

        return {
          id: String(item.id),
          title: item.title,
          artist: item.artist || 'Unknown Artist',
          albumArtUrl: artworkUrl,
          nativeUrl: playUrl,
          dateAdded: item.dateAdded ? item.dateAdded * 1000 : Date.now(),
          isFavorite: false,
          duration: item.duration ? Math.round(item.duration / 1000) : 0
        };
      });

      const videos: Video[] = (result.videos || []).map((item: any) => {
        return {
          id: String(item.id),
          title: item.title,
          uploader: item.artist || 'Local Device',
          nativeUrl: item.uri || item.path,
          isFavorite: false,
          thumbnailUrl: '', // No native thumbnail extracted yet
          isReel: item.isReel === true || item.type === 'reel',
          duration: item.duration ? Math.round(item.duration / 1000) : 0
        };
      });

      progressCallback(100, 100, `Found ${songs.length} songs and ${videos.length} videos.`);
      console.log(`[ScannerService] Native scan successful. Found ${songs.length} songs, ${videos.length} videos.`);
      return { songs, videos };

    } catch (nativeError) {
      console.warn('[ScannerService] Native scan failed, falling back to FS scanner:', nativeError);

      const songs: Song[] = [];
      const videos: Video[] = [];

      return new Promise((resolve) => {
        MediaScanner.scan({
          isCancelled: () => false, // Can't easily cancel from this wrapper yet

          onProgress: (p) => {
            progressCallback(p.processed, p.total, p.currentFile);
          },

          onItemFound: (item) => {
            // Map ScannedMedia to existing Song/Video types
            if (item.type === 'audio') {
              songs.push({
                id: item.id,
                title: item.title,
                artist: item.artist || 'Unknown Artist',
                albumArtUrl: item.artworkPath || '',
                nativeUrl: item.path,
                dateAdded: item.dateAdded,
                isFavorite: false,
                duration: item.duration
              });
            } else {
              videos.push({
                id: item.id,
                title: item.title,
                uploader: item.artist || item.folderName || 'Local Device',
                nativeUrl: item.path,
                isFavorite: false,
                thumbnailUrl: item.thumbnailPath || '',
                isReel: item.isReel === true || item.type === 'reel',
                duration: item.duration
              });
            }
          },

          onComplete: (items) => {
            console.log(`[ScannerService] FS Scan complete. Found ${items.length} items.`);
            resolve({ songs, videos });
          },

          onError: (err) => {
            console.error('[ScannerService] FS Scan failed:', err);
            resolve({ songs: [], videos: [] });
          }
        });
      });
    }
  }
}

export const fileScannerService = new FileScannerService();
export default fileScannerService;
