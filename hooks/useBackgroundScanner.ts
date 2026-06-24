import { useEffect, useRef } from 'react';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Song, ProfileData } from '../types.ts';
import { MediaScanner } from '../utils/fileScanner';
import MediaControl from '../plugins/MediaControl';
import { safeFileSrc } from '../utils/safeUri';

interface BackgroundScannerProps {
    enabled: boolean;
    onNewSongsFound: (songs: Song[]) => void;
    existingSongs: Song[];
    scannerSettings: ProfileData['settings']['scannerSettings'];
}

export const useBackgroundScanner = ({ enabled, onNewSongsFound, existingSongs, scannerSettings }: BackgroundScannerProps) => {
    const isScanningRef = useRef(false);
    const lastScanTimeRef = useRef(0);
    const SCAN_INTERVAL = 1000 * 60 * 15; // Scan every 15 minutes

    const scanForMusic = async () => {
        if (!Capacitor.isNativePlatform() || isScanningRef.current) return;

        // Check and request permissions
        try {
            const permStatus = await Filesystem.checkPermissions();
            if (permStatus.publicStorage !== 'granted') {
                const request = await Filesystem.requestPermissions();
                if (request.publicStorage !== 'granted') {
                    console.warn('Storage permission not granted for background scanning');
                    return;
                }
            }
        } catch (e) {
            console.error('Error checking permissions:', e);
        }

        const now = Date.now();
        if (now - lastScanTimeRef.current < SCAN_INTERVAL) return;

        isScanningRef.current = true;
        console.log('Background scanning started using MediaControl/MediaStore...');

        try {
            const existingPaths = new Set(existingSongs.map(s => s.nativeUrl).filter(Boolean));
            const foundSongs: Song[] = [];

            try {
                const result = await MediaControl.scanMedia();
                const nativeSongs = result.audio || [];
                for (const item of nativeSongs) {
                    const playUrl = item.uri || item.path;
                    if (!existingPaths.has(playUrl)) {
                        foundSongs.push({
                            id: String(item.id),
                            title: item.title,
                            artist: item.artist || 'Unknown Artist',
                            albumArtUrl: item.artwork ? safeFileSrc(item.artwork) : '',
                            nativeUrl: playUrl,
                            dateAdded: item.dateAdded ? item.dateAdded * 1000 : Date.now(),
                            isFavorite: false,
                            duration: item.duration ? Math.round(item.duration / 1000) : 0,
                        });
                    }
                }
                if (foundSongs.length > 0) {
                    console.log(`[BackgroundScanner] Found ${foundSongs.length} new songs via MediaStore`);
                    onNewSongsFound(foundSongs);
                }
                lastScanTimeRef.current = now;
            } catch (nativeError) {
                console.warn('[BackgroundScanner] Native scan failed, falling back to FS scanner:', nativeError);
                // Fallback to TS FS scanner
                await MediaScanner.scan({
                    isCancelled: () => false,
                    onProgress: () => {},
                    onItemFound: (item) => {
                        if (item.type === 'audio' && !existingPaths.has(item.path)) {
                            foundSongs.push({
                                id: item.id,
                                title: item.title,
                                artist: item.artist || 'Unknown Artist',
                                albumArtUrl: item.artworkPath || '',
                                nativeUrl: item.path,
                                dateAdded: item.dateAdded,
                                isFavorite: false,
                                duration: item.duration,
                            });
                        }
                    },
                    onComplete: () => {
                        if (foundSongs.length > 0) {
                            console.log(`[BackgroundScanner] FS Scan complete. Found ${foundSongs.length} new songs`);
                            onNewSongsFound(foundSongs);
                        }
                        lastScanTimeRef.current = now;
                    },
                    onError: (err) => {
                        console.error('[BackgroundScanner] FS Scan failed:', err);
                    },
                });
            }
        } catch (error) {
            console.error('Background scan failed:', error);
        } finally {
            isScanningRef.current = false;
        }
    };

    useEffect(() => {
        if (!enabled) return;

        // Initial scan
        scanForMusic();

        // Periodic scan
        const intervalId = setInterval(scanForMusic, SCAN_INTERVAL);

        return () => clearInterval(intervalId);
    }, [enabled, scannerSettings]);

    return { scanNow: scanForMusic };
};
