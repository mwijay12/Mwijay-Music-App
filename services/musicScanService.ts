import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

export interface LocalSong {
  id: string
  title: string
  artist: string
  album: string
  filePath: string
  duration: number
  fileSize: number
  artwork?: string
  lastModified: number
}

class MusicScanService {
  private isScanning: boolean = false
  
  async scanMusic(
    onProgress: (current: number, total: number) => void,
    onSongFound: (song: LocalSong) => void
  ): Promise<LocalSong[]> {
    
    if (this.isScanning) {
      console.warn('[Scan] Already scanning')
      return []
    }
    
    if (!Capacitor.isNativePlatform()) {
      console.warn('[Scan] Only available on native')
      return []
    }
    
    this.isScanning = true
    
    try {
      // STEP 1: Check cache first (instant results)
      const cached = await this.loadFromCache()
      if (cached.length > 0) {
        console.log('[Scan] Using cached results:', cached.length)
        cached.forEach(onSongFound)
      }
      
      // STEP 2: Scan in CHUNKS to prevent UI lag
      const directories = [
        Directory.ExternalStorage,
        Directory.Documents,
      ]
      
      const allSongs: LocalSong[] = []
      
      for (const directory of directories) {
        const songs = await this.scanDirectoryInChunks(
          directory,
          'Music',
          onProgress,
          onSongFound
        )
        allSongs.push(...songs)
      }
      
      // STEP 3: Save to cache for next time
      await this.saveToCache(allSongs)
      
      return allSongs
      
    } catch (error) {
      console.error('[Scan] Error:', error)
      return []
    } finally {
      this.isScanning = false
    }
  }
  
  private async scanDirectoryInChunks(
    directory: Directory,
    path: string,
    onProgress: (current: number, total: number) => void,
    onSongFound: (song: LocalSong) => void
  ): Promise<LocalSong[]> {
    
    const songs: LocalSong[] = []
    
    try {
      const result = await Filesystem.readdir({
        path,
        directory,
      })
      
      const audioFiles = result.files.filter(file => 
        this.isAudioFile(file.name)
      )
      
      const total = audioFiles.length
      const CHUNK_SIZE = 10  // Process 10 files at a time
      
      for (let i = 0; i < audioFiles.length; i += CHUNK_SIZE) {
        const chunk = audioFiles.slice(i, i + CHUNK_SIZE)
        
        // Process chunk
        await Promise.all(chunk.map(async (file) => {
          try {
            const song = await this.parseAudioFile(
              file,
              directory,
              path
            )
            
            if (song) {
              songs.push(song)
              onSongFound(song)
            }
          } catch (e) {
            // Skip broken files
          }
        }))
        
        // Update progress
        onProgress(Math.min(i + CHUNK_SIZE, total), total)
        
        // YIELD to UI thread - prevents freezing
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      
    } catch (error) {
      console.warn(`[Scan] Cannot read ${path}:`, error)
    }
    
    return songs
  }
  
  private isAudioFile(filename: string): boolean {
    const audioExtensions = [
      '.mp3', '.m4a', '.wav', '.ogg', 
      '.flac', '.aac', '.opus', '.wma'
    ]
    const lower = filename.toLowerCase()
    return audioExtensions.some(ext => lower.endsWith(ext))
  }
  
  private async parseAudioFile(
    file: any,
    directory: Directory,
    basePath: string
  ): Promise<LocalSong | null> {
    
    try {
      const filePath = `${basePath}/${file.name}`
      
      // Parse filename for title/artist
      // Format usually: "Artist - Title.mp3"
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, '')
      const parts = nameWithoutExt.split(' - ')
      
      let artist = 'Unknown Artist'
      let title = nameWithoutExt
      
      if (parts.length >= 2) {
        artist = parts[0].trim()
        title = parts.slice(1).join(' - ').trim()
      }
      
      return {
        id: `local_${file.uri}`,
        title,
        artist,
        album: 'Local Music',
        filePath: file.uri,
        duration: 0,  // Will be loaded when played
        fileSize: file.size || 0,
        lastModified: file.mtime || Date.now(),
      }
      
    } catch (error) {
      return null
    }
  }
  
  // CACHE MANAGEMENT
  private async loadFromCache(): Promise<LocalSong[]> {
    try {
      const { value } = await Preferences.get({ key: 'music_scan_cache' })
      
      if (value) {
        const data = JSON.parse(value)
        // Cache valid for 24 hours
        if (Date.now() - data.timestamp < 86400000) {
          return data.songs
        }
      }
    } catch {}
    
    return []
  }
  
  private async saveToCache(songs: LocalSong[]): Promise<void> {
    try {
      await Preferences.set({
        key: 'music_scan_cache',
        value: JSON.stringify({
          timestamp: Date.now(),
          songs,
        }),
      })
    } catch {}
  }
  
  async clearCache(): Promise<void> {
    await Preferences.remove({ key: 'music_scan_cache' })
  }
  
  // INCREMENTAL SCAN - only new files since last scan
  async scanForNewMusic(
    onSongFound: (song: LocalSong) => void
  ): Promise<LocalSong[]> {
    const cached = await this.loadFromCache()
    const cachedPaths = new Set(cached.map(s => s.filePath))
    
    const newSongs: LocalSong[] = []
    
    // Quick scan, only check for new files
    await this.scanMusic(
      () => {},
      (song) => {
        if (!cachedPaths.has(song.filePath)) {
          newSongs.push(song)
          onSongFound(song)
        }
      }
    )
    
    return newSongs
  }
}

export const musicScanner = new MusicScanService()
export default musicScanner;
