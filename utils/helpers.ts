
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import type { ProfileData, Song, Video } from '../types.ts';
import { getRandomCoverArt } from '../components/constants.ts';

declare const jsmediatags: any;

export const truncate = (str: string, len: number): string => str.length > len ? `${str.substring(0, len)}...` : str;

export const findSongByTitle = (title: string, songs: Song[]): Song | null => {
    if (!title) return null;
    const searchTerm = title.toLowerCase();
    
    let song = songs.find(s => s.title.toLowerCase() === searchTerm);
    if (song) return song;

    song = songs.find(s => s.title.toLowerCase().startsWith(searchTerm));
    if (song) return song;

    song = songs.find(s => s.title.toLowerCase().includes(searchTerm));
    if (song) return song;

    song = songs.find(s => s.artist.toLowerCase().includes(searchTerm));
    if (song) return song;

    return null;
};

export const addToTopSongs = (
    topSongs: ProfileData['analytics']['topSongs'], 
    song: Song
): ProfileData['analytics']['topSongs'] => {
    const existing = (topSongs || []).find(s => s.id === song.id);
    if (existing) {
        return (topSongs || [])
            .map(s => s.id === song.id ? { ...s, playCount: s.playCount + 1 } : s)
            .sort((a, b) => b.playCount - a.playCount);
    } else {
        return [...(topSongs || []), { id: song.id, title: song.title, artist: song.artist, albumArtUrl: song.albumArtUrl, playCount: 1 }]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 50);
    }
};

export const addToTopArtists = (
    topArtists: ProfileData['analytics']['topArtists'],
    artistName: string,
    albumArtUrl: string
): ProfileData['analytics']['topArtists'] => {
    if (!artistName || artistName.toLowerCase() === 'unknown artist') {
        return topArtists;
    }
    const existing = (topArtists || []).find(a => a.name === artistName);
    if (existing) {
        return (topArtists || [])
            .map(a => a.name === artistName ? { ...a, playCount: a.playCount + 1 } : a)
            .sort((a, b) => b.playCount - a.playCount);
    } else {
        return [...(topArtists || []), { name: artistName, playCount: 1, albumArtUrl }]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 50);
    }
};

export const addToTopRadios = (
    topRadios: ProfileData['analytics']['topRadios'],
    stationId: string,
    name: string
): ProfileData['analytics']['topRadios'] => {
    const existing = (topRadios || []).find(r => r.stationId === stationId);
    if (existing) {
        return (topRadios || [])
            .map(r => r.stationId === stationId ? { ...r, playCount: r.playCount + 1 } : r)
            .sort((a, b) => b.playCount - a.playCount);
    } else {
        return [...(topRadios || []), { stationId, name, playCount: 1 }]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 50);
    }
};

export const fadeAudio = (audio: HTMLAudioElement, to: number, duration: number, onComplete?: () => void) => {
    const from = audio.volume;
    const diff = to - from;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        audio.volume = Math.max(0, Math.min(1, from + diff * progress));

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            if (onComplete) {
                onComplete();
            }
        }
    };
    requestAnimationFrame(animate);
};

export const processVideoFileMeta = (fileName: string, nativePath: string, dateAdded: number): Video => {
    return {
        id: `native-${fileName}-${dateAdded}`,
        title: fileName.replace(/\.[^/.]+$/, ""),
        uploader: 'Local Device',
        nativeUrl: nativePath,
        isFavorite: false,
        videoData: undefined,
        thumbnailUrl: getRandomCoverArt(),
    };
};

export const parseFilenameMetadata = (fileName: string): { artist: string; title: string } => {
    let cleanName = fileName.replace(/\.[^/.]+$/, ""); // Strip extension
    
    // Clean up trailing quality indicators and visual cues like (MP3_16K), [320k], (Official Video), etc.
    cleanName = cleanName.replace(/\s*[\(\[][^)]*(mp3|16k|128k|320k|kbps|official|video|music video|lyrics|audio|hq|hd|high quality|remix|cover|feat|ft)[^\]\)]*[\)\]]/gi, '').trim();
    
    // Remove wrapping underscores like _I AM_
    cleanName = cleanName.replace(/^_+|_+$/g, '').trim();

    // Replace multiple underscores with space to clean up filenames like Artist_Name_-_Song_Title
    let processedName = cleanName;
    if (processedName.includes('_-_')) {
        processedName = processedName.replace(/_-_/g, ' - ');
    }
    
    // Check for common separators (including case-insensitive " by ")
    const separators = [' - ', ' – ', ' — ', ' -', '- ', '-', '–', '—', ' by ', ' By ', ' BY ', ' _by_ '];
    for (const sep of separators) {
        const sepLower = sep.toLowerCase();
        const procLower = processedName.toLowerCase();
        const index = procLower.indexOf(sepLower);
        
        if (index !== -1) {
            const artistPart = processedName.substring(0, index).trim();
            const titlePart = processedName.substring(index + sep.length).trim();
            
            // Clean up any remaining underscores
            const artist = artistPart.replace(/_/g, ' ').replace(/^_+|_+$/g, '').trim();
            const title = titlePart.replace(/_/g, ' ').replace(/^_+|_+$/g, '').trim();
            
            if (artist && title) {
                return { artist, title };
            }
        }
    }
    
    // Check if filename is simply "Title" or has "Artist_Name"
    const titleWithSpaces = cleanName.replace(/_/g, ' ').trim();
    return {
        artist: 'Unknown Artist',
        title: titleWithSpaces
    };
};

/**
 * Lightweight pure-JS binary ID3v2 tag parser (works offline, highly robust)
 */
export const parseID3v2 = (arrayBuffer: ArrayBuffer): { title?: string, artist?: string, albumArtUrl?: string } | null => {
    try {
        const view = new DataView(arrayBuffer);
        if (view.byteLength < 10) return null;
        
        // Check "ID3" header (0x49, 0x44, 0x33)
        if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) {
            return null; // Not ID3v2
        }
        
        const version = view.getUint8(3);
        const flags = view.getUint8(5);
        
        // Read tag size (synchsafe integer: 4 bytes, 7 bits per byte)
        const s1 = view.getUint8(6);
        const s2 = view.getUint8(7);
        const s3 = view.getUint8(8);
        const s4 = view.getUint8(9);
        const tagSize = (s1 << 21) | (s2 << 14) | (s3 << 7) | s4;
        
        let offset = 10;
        // Skip extended header if present
        if ((flags & 0x40) !== 0) {
            const extHeaderSize = view.getUint32(10);
            offset += extHeaderSize + 4;
        }
        
        let title: string | undefined;
        let artist: string | undefined;
        let albumArtUrl: string | undefined;
        
        const decodeText = (bytes: Uint8Array, encoding: number): string => {
            if (encoding === 0) { // ISO-8859-1
                return Array.from(bytes).map(b => String.fromCharCode(b)).join('').trim();
            } else if (encoding === 1) { // UTF-16 with BOM
                if (bytes.length < 2) return '';
                const hasBOM = (bytes[0] === 0xFF && bytes[1] === 0xFE) || (bytes[0] === 0xFE && bytes[1] === 0xFF);
                const start = hasBOM ? 2 : 0;
                let str = '';
                for (let i = start; i < bytes.length - 1; i += 2) {
                    const charCode = bytes[i] | (bytes[i+1] << 8); // Little Endian assumption
                    if (charCode !== 0) str += String.fromCharCode(charCode);
                }
                return str.trim();
            } else if (encoding === 3) { // UTF-8
                return new TextDecoder('utf-8').decode(bytes).trim();
            }
            return '';
        };

        const limit = Math.min(tagSize + 10, view.byteLength);
        while (offset < limit - 10) {
            let frameId = '';
            for (let i = 0; i < 4; i++) {
                const char = view.getUint8(offset + i);
                if (char >= 32 && char <= 126) frameId += String.fromCharCode(char);
            }
            
            if (frameId.length < 4) break;
            
            const frameSize = view.getUint32(offset + 4);
            offset += 10;
            if (frameSize <= 0 || offset + frameSize > limit) break;
            
            const frameData = new Uint8Array(arrayBuffer, offset, frameSize);
            
            if (frameId === 'TIT2') { // Title
                const encoding = frameData[0];
                title = decodeText(frameData.subarray(1), encoding);
            } else if (frameId === 'TPE1') { // Artist
                const encoding = frameData[0];
                artist = decodeText(frameData.subarray(1), encoding);
            } else if (frameId === 'APIC') { // Picture
                try {
                    const encoding = frameData[0];
                    // Find mime type
                    let mimeOffset = 1;
                    while (mimeOffset < frameData.length && frameData[mimeOffset] !== 0) {
                        mimeOffset++;
                    }
                    const mimeType = Array.from(frameData.subarray(1, mimeOffset)).map(b => String.fromCharCode(b)).join('');
                    
                    // Description (terminated by null)
                    let descOffset = mimeOffset + 2;
                    if (encoding === 1) { // UTF-16 description
                        while (descOffset < frameData.length - 1 && !(frameData[descOffset] === 0 && frameData[descOffset+1] === 0)) {
                            descOffset += 2;
                        }
                        descOffset += 2;
                    } else {
                        while (descOffset < frameData.length && frameData[descOffset] !== 0) {
                            descOffset++;
                        }
                        descOffset++;
                    }
                    
                    const pictureData = frameData.subarray(descOffset);
                    if (pictureData.length > 0) {
                        let binary = '';
                        const len = pictureData.length;
                        const chunkSize = 8192;
                        for (let i = 0; i < len; i += chunkSize) {
                            const chunk = pictureData.subarray(i, Math.min(i + chunkSize, len));
                            // @ts-ignore
                            binary += String.fromCharCode.apply(null, chunk);
                        }
                        const base64String = btoa(binary);
                        albumArtUrl = `data:${mimeType || 'image/jpeg'};base64,${base64String}`;
                    }
                } catch (e) {
                    console.warn("Custom APIC tag decode failed", e);
                }
            }
            
            offset += frameSize;
        }
        
        return (title || artist || albumArtUrl) ? { title, artist, albumArtUrl } : null;
    } catch (e) {
        console.warn('Pure-JS ID3v2 parsing failed:', e);
        return null;
    }
};

export const processAudioFileBuffer = (buffer: ArrayBuffer, fileName: string, nativePath: string, dateAdded: number): Promise<Song | null> => {
    return new Promise((resolve) => {
        const parsedMeta = parseFilenameMetadata(fileName);
        
        // 1. Try our custom pure-JS ID3v2 parser first (works offline, highly reliable)
        const localTags = parseID3v2(buffer);
        
        const extractedTitle = (localTags?.title && localTags.title.trim()) || parsedMeta.title;
        const extractedArtist = (localTags?.artist && localTags.artist.trim()) || parsedMeta.artist;
        const extractedAlbumArt = localTags?.albumArtUrl || getPremiumGradientCover(extractedTitle, extractedArtist);
        
        const fallbackSong: Song = {
            id: `native-${fileName}-${dateAdded}`,
            title: extractedTitle,
            artist: extractedArtist,
            albumArtUrl: extractedAlbumArt,
            audioData: buffer,
            nativeUrl: nativePath,
            dateAdded: dateAdded,
            isFavorite: false,
        };

        try {
            // If jsmediatags is defined, run it as well in case it extracts other tags
            if (typeof jsmediatags === 'undefined') {
                resolve(fallbackSong);
                return;
            }

            const readTags = new Promise((resolveTags, rejectTags) => {
                try {
                    new jsmediatags.Reader(new Blob([buffer]))
                        .setTagsToRead(["title", "artist", "picture"])
                        .read({
                            onSuccess: (tag: any) => resolveTags(tag),
                            onError: (error: any) => rejectTags(error)
                        });
                } catch (e) {
                    rejectTags(e);
                }
            });

            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Metadata read timed out")), 2000)
            );

            Promise.race([readTags, timeout])
                .then((tag: any) => {
                    const tags = tag.tags;
                    const picture = tags.picture;
                    
                    const jsTitle = (tags.title && tags.title.trim()) || extractedTitle;
                    const jsArtist = (tags.artist && tags.artist.trim()) || extractedArtist;
                    let albumArtUrl = extractedAlbumArt;
                    
                    if (picture && picture.data) {
                        try {
                            const bytes = new Uint8Array(picture.data);
                            let binary = '';
                            const len = bytes.byteLength;
                            const chunkSize = 8192;
                            
                            for (let i = 0; i < len; i += chunkSize) {
                                const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
                                // @ts-ignore
                                binary += String.fromCharCode.apply(null, chunk);
                            }
                            
                            const base64String = btoa(binary);
                            albumArtUrl = `data:${picture.format};base64,${base64String}`;
                        } catch (e) {
                            console.warn("Failed to process cover art in jsmediatags", e);
                        }
                    }

                    const audio = new Audio();
                    const blob = new Blob([buffer]);
                    const url = URL.createObjectURL(blob);
                    
                    const cleanup = () => URL.revokeObjectURL(url);

                    audio.src = url;
                    audio.onloadedmetadata = () => {
                        const song: Song = {
                            ...fallbackSong,
                            title: jsTitle,
                            artist: jsArtist,
                            albumArtUrl: albumArtUrl,
                            duration: audio.duration,
                            dateAdded: dateAdded,
                        };
                        cleanup();
                        resolve(song);
                    };
                    
                    audio.onerror = () => {
                        cleanup();
                        resolve({ ...fallbackSong, title: jsTitle, artist: jsArtist, albumArtUrl, dateAdded: dateAdded });
                    };
                })
                .catch(err => {
                    console.warn(`jsmediatags failed/timed out for ${fileName}, using pure-JS parser results:`, String(err));
                    resolve(fallbackSong);
                });

        } catch (e) {
            console.error("Critical error in processAudioFileBuffer:", e);
            resolve(fallbackSong);
        }
    });
};

/**
 * Scans a user-selected folder for media files (Web/Desktop only)
 */
export const scanFolderForMedia = async (onProgress: (msg: string) => void): Promise<File[]> => {
    if (!('showDirectoryPicker' in window)) {
        throw new Error("Folder scanning is not supported in this browser.");
    }

    try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        
        async function scan(handle: any) {
            for await (const entry of handle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
                        files.push(file);
                    }
                } else if (entry.kind === 'directory') {
                    await scan(entry);
                }
            }
        }

        onProgress("Scanning folder...");
        await scan(dirHandle);
        return files;
    } catch (error) {
        console.error("Folder scan failed:", error);
        throw error;
    }
};

export const scanDeviceForMedia = async (
    progressCallback: (current: number, total: number, fileName: string) => void,
    scannerSettings: ProfileData['settings']['scannerSettings']
): Promise<{ songs: Song[], videos: Video[] }> => {
    if (!Capacitor.isNativePlatform()) {
        progressCallback(1,1, 'Scanning not available on web.');
        return { songs: [], videos: [] };
    }

    const newSongs: Song[] = [];
    const newVideos: Video[] = [];

    const dirsToScan: Directory[] = [Directory.Documents];
    let totalFiles = 0;
    let processedFiles = 0;

    const scanDirectory = async (directory: Directory, path = '') => {
        try {
            const result = await Filesystem.readdir({
                path: path,
                directory: directory
            });

            for (const file of result.files) {
                const filePath = `${path}/${file.name}`;
                if (scannerSettings.excludedFolders.some(folder => filePath.includes(folder))) {
                    continue;
                }

                if (file.type === 'directory') {
                    await scanDirectory(directory, filePath);
                } else if (file.name.match(/\.(mp3|m4a|aac|wav|ogg|flac)$/i)) {
                    if (file.size && file.size / (1024 * 1024) < scannerSettings.minFileSizeMB) continue;
                    
                    try {
                        const fileContent = await Filesystem.readFile({
                            path: filePath,
                            directory: directory
                        });
                        const buffer = Uint8Array.from(atob(fileContent.data as string), c => c.charCodeAt(0)).buffer;
                        // Use current time for newly scanned files to ensure they show up
                        const song = await processAudioFileBuffer(buffer, file.name, file.uri, Date.now());
                        if (song) {
                            if (song.duration && song.duration < scannerSettings.minSongDurationSeconds) continue;
                            newSongs.push(song);
                        }
                    } catch (e) {
                        console.error("Error processing audio file:", filePath, String(e));
                    }
                } else if (file.name.match(/\.(mp4|mov|webm|avi)$/i)) {
                    if (file.size && file.size / (1024 * 1024) < scannerSettings.minFileSizeMB) continue;
                    const video = processVideoFileMeta(file.name, file.uri, Date.now());
                    newVideos.push(video);
                }
                 processedFiles++;
                 progressCallback(processedFiles, totalFiles, file.name);
            }
        } catch (e) {
            console.log(`Could not read directory: ${path} in ${directory}. It might not exist.`);
        }
    };
    
     for (const dir of dirsToScan) {
        try {
            const result = await Filesystem.readdir({ path: '', directory: dir });
            totalFiles += result.files.length;
        } catch (e) {}
    }

    for (const dir of dirsToScan) {
        await scanDirectory(dir);
    }
    
    return { songs: newSongs, videos: newVideos };
};

export const getDominantColor = (imageUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const smallSize = 50;
            canvas.width = smallSize;
            canvas.height = smallSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }
            ctx.drawImage(img, 0, 0, smallSize, smallSize);
            const data = ctx.getImageData(0, 0, smallSize, smallSize).data;
            const colorCount: { [key: string]: number } = {};
            let maxCount = 0;
            let dominantColor = '';

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 255) continue;
                
                const rgb = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                colorCount[rgb] = (colorCount[rgb] || 0) + 1;
                if (colorCount[rgb] > maxCount) {
                    maxCount = colorCount[rgb];
                    dominantColor = rgb;
                }
            }
            resolve(dominantColor);
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
    });
};

export const emojiToDataUrl = (emoji: string, size = 128, bgColor = 'transparent'): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
        ctx.font = `${size * 0.75}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Android Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);
    }
    return canvas.toDataURL();
};

export const rgbStringToHsl = (rgbString: string): [number, number, number] | null => {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;

    let r = parseInt(match[1], 10) / 255;
    let g = parseInt(match[2], 10) / 255;
    let b = parseInt(match[3], 10) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s, l];
};

export const forceHttps = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('http:')) return url.replace('http:', 'https:');
    return url;
};

export const hslToCss = (h: number, s: number, l: number): string => {
    return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                const base64data = reader.result.split(',')[1];
                resolve(base64data);
            } else {
                reject(new Error('Failed to convert blob to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const getPremiumGradientCover = (title: string, artist: string): string => {
    let hash = 0;
    const str = `${title || ''} ${artist || ''}`;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h1 = Math.abs(hash) % 360;
    const h2 = (h1 + 120) % 360;
    const s = 65 + (Math.abs(hash >> 3) % 20);
    const l = 40 + (Math.abs(hash >> 6) % 15);

    const color1 = `hsl(${h1}, ${s}%, ${l}%)`;
    const color2 = `hsl(${h2}, ${s}%, ${l - 10}%)`;

    const firstLetter = title ? title.charAt(0).toUpperCase() : 'M';
    const cleanArtist = artist && artist.toLowerCase() !== 'unknown artist' ? artist : 'Mwijay App';

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
                </linearGradient>
                <filter id="shadow">
                    <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.35"/>
                </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad)" />
            <circle cx="150" cy="125" r="45" fill="white" opacity="0.1" />
            <text x="150" y="142" font-family="'Satoshi', 'Inter', sans-serif" font-weight="900" font-size="52" fill="#fff" text-anchor="middle" opacity="0.95" filter="url(#shadow)">${firstLetter}</text>
            <text x="150" y="215" font-family="'Satoshi', 'Inter', sans-serif" font-weight="800" font-size="15" fill="#fff" text-anchor="middle" opacity="0.95" letter-spacing="1">${title.substring(0, 20).toUpperCase()}${title.length > 20 ? '...' : ''}</text>
            <text x="150" y="238" font-family="'Satoshi', 'Inter', sans-serif" font-weight="500" font-size="11" fill="rgba(255,255,255,0.6)" text-anchor="middle">${cleanArtist.substring(0, 25)}</text>
        </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const shareTextOrUrl = async (
    title: string,
    text: string,
    url?: string,
    showNotification?: (message: string, type?: 'success' | 'info' | 'error') => void
) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Share.share({
                title,
                text,
                url,
                dialogTitle: title,
            });
        } catch (error) {
            console.log('Error sharing natively:', error);
        }
    } else if (navigator.share) {
        try {
            await navigator.share({
                title,
                text,
                url,
            });
        } catch (error) {
            console.log('Error sharing in browser:', error);
        }
    } else {
        try {
            await navigator.clipboard.writeText(`${title} - ${text} ${url || ''}`);
            if (showNotification) showNotification('Copied sharing info to clipboard!', 'success');
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            if (showNotification) showNotification('Sharing not supported on this browser/device', 'error');
        }
    }
};
