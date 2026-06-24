/**
 * useMediaScanner.ts
 * React hook wrapping the MediaScanner class.
 * Provides reactive state + IndexedDB caching.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaScanner } from '../utils/fileScanner';
import type { ScannedMedia, ScannerProgress } from '../types/media';

const DB_NAME = 'MwijayMediaCache';
const DB_VERSION = 1;
const STORE_NAME = 'scanned_media';

// ─── IndexedDB Cache ──────────────────────────────────────────────────────────

async function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type');
        store.createIndex('folderPath', 'folderPath');
        store.createIndex('isReel', 'isReel');
        store.createIndex('scannedAt', 'scannedAt');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToCacheDB(items: ScannedMedia[]): Promise<void> {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear old entries
    store.clear();

    // Add all items in chunks to avoid transaction timeout
    for (const item of items) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (err) {
    console.warn('[Scanner Cache] Save failed:', err);
  }
}

async function loadFromCacheDB(): Promise<ScannedMedia[]> {
  try {
    const db = await openCacheDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        db.close();
        resolve((req.result as ScannedMedia[]) || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMediaScanner() {
  const [allMedia, setAllMedia] = useState<ScannedMedia[]>([]);
  const [progress, setProgress] = useState<ScannerProgress>({
    phase: 'idle',
    totalFound: 0,
    processed: 0,
    audioCount: 0,
    videoCount: 0,
    reelCount: 0,
    percent: 0,
    currentFile: '',
  });
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelRef = useRef(false);
  const newItemsBuffer = useRef<ScannedMedia[]>([]);
  const flushTimerRef = useRef<number | null>(null);

  // ── Load cached results on mount ────────────────────────────────────────

  useEffect(() => {
    loadFromCacheDB().then(cached => {
      if (cached.length > 0) {
        setAllMedia(cached);
        setProgress(prev => ({
          ...prev,
          phase: 'complete',
          totalFound: cached.length,
          audioCount: cached.filter(m => m.type === 'audio').length,
          videoCount: cached.filter(m => m.type === 'video').length,
          reelCount: cached.filter(m => m.type === 'reel').length,
          percent: 100,
        }));
        console.log('[Scanner] Loaded', cached.length, 'items from cache');
      }
    });
  }, []);

  // ── Batch flush new items to state ───────────────────────────────────────

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      const items = [...newItemsBuffer.current];
      newItemsBuffer.current = [];
      if (items.length > 0) {
        setAllMedia(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = items.filter(m => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
      }
    }, 200); // Flush to UI every 200ms
  }, []);

  // ── Start Scan ───────────────────────────────────────────────────────────

  const startScan = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setError(null);
    cancelRef.current = false;
    newItemsBuffer.current = [];
    setAllMedia([]);

    setProgress({
      phase: 'collecting',
      totalFound: 0,
      processed: 0,
      audioCount: 0,
      videoCount: 0,
      reelCount: 0,
      percent: 0,
      currentFile: 'Starting scan...',
    });

    await MediaScanner.scan({
      isCancelled: () => cancelRef.current,

      onProgress: (p) => {
        setProgress({
          phase: p.phase as any,
          totalFound: p.total,
          processed: p.processed,
          audioCount: p.audioCount,
          videoCount: p.videoCount,
          reelCount: p.reelCount,
          percent: p.percent,
          currentFile: p.currentFile,
        });
      },

      onItemFound: (item) => {
        newItemsBuffer.current.push(item);
        scheduleFlush();
      },

      onComplete: async (items) => {
        // Final state update
        setAllMedia(items);
        setProgress(prev => ({
          ...prev,
          phase: 'complete',
          percent: 100,
          totalFound: items.length,
        }));
        setIsScanning(false);

        // Save to cache
        await saveToCacheDB(items);
      },

      onError: (err) => {
        setError(err);
        setIsScanning(false);
        setProgress(prev => ({ ...prev, phase: 'error', error: err }));
      },
    });

    setIsScanning(false);
  }, [isScanning, scheduleFlush]);

  // ── Cancel Scan ──────────────────────────────────────────────────────────

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
    setIsScanning(false);
    setProgress(prev => ({ ...prev, phase: 'cancelled' }));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────

  const reels = allMedia.filter(m => m.isReel || m.type === 'reel');
  const videos = allMedia.filter(m => m.type === 'video' && !m.isReel);
  const audio = allMedia.filter(m => m.type === 'audio');
  const folders = MediaScanner.groupByFolder(allMedia);

  return {
    // All media — sorted: reels → videos → audio
    allMedia,

    // Separated by type
    reels,
    videos,
    audio,
    folders,

    // Scan state
    isScanning,
    progress,
    error,

    // Controls
    startScan,
    cancelScan,
  };
}
