
import { useEffect, useRef } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Song, ProfileData } from '../types.ts';

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
        console.log('Background scanning started...');

        try {
            const commonDirs = [
                { path: 'Music', directory: Directory.ExternalStorage },
                { path: 'Download', directory: Directory.ExternalStorage },
                { path: 'Documents', directory: Directory.ExternalStorage },
            ];

            const foundSongs: Song[] = [];
            const existingPaths = new Set(existingSongs.map(s => s.nativeUrl).filter(Boolean));

            for (const dir of commonDirs) {
                try {
                    const result = await Filesystem.readdir({
                        path: dir.path,
                        directory: dir.directory
                    });

                    for (const file of result.files) {
                        if (file.type === 'file' && isAudioFile(file.name)) {
                            const fullPath = `${dir.path}/${file.name}`;
                            
                            if (!existingPaths.has(fullPath)) {
                                // Basic song metadata from filename
                                const title = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
                                const newSong: Song = {
                                    id: `native-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    title: title,
                                    artist: 'Unknown Artist',
                                    albumArtUrl: '',
                                    nativeUrl: fullPath,
                                    dateAdded: Date.now(),
                                    source: 'Local Storage'
                                };
                                foundSongs.push(newSong);
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Could not scan directory ${dir.path}:`, e);
                }
            }

            if (foundSongs.length > 0) {
                onNewSongsFound(foundSongs);
            }
            
            lastScanTimeRef.current = now;
        } catch (error) {
            console.error('Background scan failed:', error);
        } finally {
            isScanningRef.current = false;
        }
    };

    const isAudioFile = (filename: string) => {
        const audioExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'];
        return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext));
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
