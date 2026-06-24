import { Capacitor } from '@capacitor/core'

// ────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────

export type MediaType = 'music' | 'radio' | 'reel'

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  artworkUrl?: string
  audioUrl: string
  duration?: number  // in seconds
  type?: MediaType
  isLive?: boolean
}

type EventCallback = (data?: any) => void

// ────────────────────────────────────────────────
// AUDIO PLAYER CLASS
// ────────────────────────────────────────────────

class AudioPlayer {
  
  // The main audio element
  private audio: HTMLAudioElement
  
  // Currently playing track info
  private currentTrack: Track | null = null
  
  // Event listeners (React components subscribe to these)
  private listeners: Map<string, Set<EventCallback>> = new Map()
  
  // Has user interacted with page yet? (for autoplay)
  private hasUserInteracted: boolean = false
  
  // Constructor - runs once when class is created
  constructor() {
    console.log('[AudioPlayer] Initializing...')
    
    // Create the audio element
    this.audio = new Audio()
    
    // CRITICAL: These attributes are required for mobile
    this.audio.preload = 'auto'
    this.audio.crossOrigin = 'anonymous'
    
    // Mobile playsinline (prevents iOS fullscreen)
    this.audio.setAttribute('playsinline', 'true')
    this.audio.setAttribute('webkit-playsinline', 'true')
    this.audio.setAttribute('x5-playsinline', 'true')
    
    // Setup all event listeners
    this.setupAudioEvents()
    
    // Setup MediaSession (lock screen controls)
    this.setupMediaSession()
    
    // Track user interaction (needed for autoplay)
    this.trackUserInteraction()
    
    console.log('[AudioPlayer] ✓ Initialized successfully')
  }
  
  // ────────────────────────────────────────────────
  // SETUP AUDIO ELEMENT EVENTS
  // ────────────────────────────────────────────────
  
  private setupAudioEvents(): void {
    
    // When audio starts playing
    this.audio.addEventListener('play', () => {
      console.log('[AudioPlayer] ▶ Playing')
      this.updateMediaSessionState('playing')
      this.emit('play')
    })
    
    // When audio is paused
    this.audio.addEventListener('pause', () => {
      console.log('[AudioPlayer] ⏸ Paused')
      this.updateMediaSessionState('paused')
      this.emit('pause')
    })
    
    // When audio ends
    this.audio.addEventListener('ended', () => {
      console.log('[AudioPlayer] ⏹ Ended')
      this.updateMediaSessionState('none')
      this.emit('ended')
    })
    
    // When time updates (during playback)
    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', this.audio.currentTime)
    })
    
    // When metadata is loaded (duration available)
    this.audio.addEventListener('loadedmetadata', () => {
      console.log('[AudioPlayer] ✓ Metadata loaded, duration:', this.audio.duration)
      this.emit('loadedmetadata', this.audio.duration)
    })
    
    // When audio can play
    this.audio.addEventListener('canplay', () => {
      console.log('[AudioPlayer] ✓ Can play')
      this.emit('canplay')
    })
    
    // When audio is loading
    this.audio.addEventListener('waiting', () => {
      console.log('[AudioPlayer] ⏳ Buffering...')
      this.emit('waiting')
    })
    
    // Errors
    this.audio.addEventListener('error', (e) => {
      const error = this.audio.error
      console.error('[AudioPlayer] ✗ ERROR:', {
        code: error?.code,
        message: error?.message,
        src: this.audio.src,
      })
      this.emit('error', { code: error?.code, message: error?.message })
    })
  }
  
  // ────────────────────────────────────────────────
  // TRACK USER INTERACTION (for autoplay)
  // ────────────────────────────────────────────────
  
  private trackUserInteraction(): void {
    const markInteracted = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true
        console.log('[AudioPlayer] ✓ User interaction detected')
      }
    }
    
    // Listen for first user interaction
    document.addEventListener('click', markInteracted, { once: false })
    document.addEventListener('touchstart', markInteracted, { once: false })
    document.addEventListener('keydown', markInteracted, { once: false })
  }
  
  // ────────────────────────────────────────────────
  // PLAY A TRACK (MAIN FUNCTION)
  // ────────────────────────────────────────────────
  
  async play(track: Track): Promise<boolean> {
    console.log('[AudioPlayer] play() called with:', track.title)
    console.log('[AudioPlayer] Audio URL:', track.audioUrl)
    
    // Validate the audio URL
    if (!track.audioUrl) {
      console.error('[AudioPlayer] ✗ No audio URL provided!')
      this.emit('error', { message: 'No audio URL' })
      return false
    }
    
    // Save current track
    this.currentTrack = track
    
    // Stop any current playback
    this.audio.pause()
    this.audio.currentTime = 0
    
    // Set the new audio source
    this.audio.src = track.audioUrl
    this.audio.load()
    
    console.log('[AudioPlayer] Source set, loading...')
    
    // Update lock screen info BEFORE playing
    this.updateMediaSessionMetadata(track)
    
    // Try to play
    try {
      await this.audio.play()
      console.log('[AudioPlayer] ✓ Playback started successfully')
      return true
      
    } catch (error: any) {
      console.error('[AudioPlayer] ✗ Play failed:', error.name, error.message)
      
      // If autoplay was blocked, try with muted
      if (error.name === 'NotAllowedError') {
        console.log('[AudioPlayer] Trying muted autoplay workaround...')
        
        this.audio.muted = true
        try {
          await this.audio.play()
          // Unmute after a brief delay
          setTimeout(() => {
            this.audio.muted = false
            console.log('[AudioPlayer] ✓ Unmuted')
          }, 200)
          return true
        } catch (e: any) {
          console.error('[AudioPlayer] ✗ Muted play also failed:', e.message)
          this.emit('error', { 
            message: 'Tap anywhere to enable audio',
            needsInteraction: true,
          })
          return false
        }
      }
      
      this.emit('error', { message: error.message })
      return false
    }
  }
  
  // ────────────────────────────────────────────────
  // PAUSE AUDIO
  // ────────────────────────────────────────────────
  
  pause(): void {
    console.log('[AudioPlayer] pause() called')
    this.audio.pause()
  }
  
  // ────────────────────────────────────────────────
  // RESUME AUDIO
  // ────────────────────────────────────────────────
  
  async resume(): Promise<void> {
    console.log('[AudioPlayer] resume() called')
    try {
      await this.audio.play()
    } catch (error: any) {
      console.error('[AudioPlayer] Resume failed:', error.message)
    }
  }
  
  // ────────────────────────────────────────────────
  // TOGGLE PLAY/PAUSE
  // ────────────────────────────────────────────────
  
  async togglePlayPause(): Promise<void> {
    if (this.audio.paused) {
      await this.resume()
    } else {
      this.pause()
    }
  }
  
  // ────────────────────────────────────────────────
  // STOP AUDIO
  // ────────────────────────────────────────────────
  
  stop(): void {
    console.log('[AudioPlayer] stop() called')
    this.audio.pause()
    this.audio.currentTime = 0
    this.audio.src = ''
    this.currentTrack = null
    this.clearMediaSession()
  }
  
  // ────────────────────────────────────────────────
  // SEEK TO POSITION
  // ────────────────────────────────────────────────
  
  seek(seconds: number): void {
    if (isFinite(this.audio.duration)) {
      const newTime = Math.max(0, Math.min(seconds, this.audio.duration))
      this.audio.currentTime = newTime
      console.log('[AudioPlayer] Seeked to:', newTime)
    }
  }
  
  // ────────────────────────────────────────────────
  // VOLUME CONTROL
  // ────────────────────────────────────────────────
  
  setVolume(level: number): void {
    this.audio.volume = Math.max(0, Math.min(1, level))
  }
  
  getVolume(): number {
    return this.audio.volume
  }
  
  // ────────────────────────────────────────────────
  // MEDIA SESSION SETUP (Lock Screen Controls)
  // ────────────────────────────────────────────────
  
  private setupMediaSession(): void {
    if (!('mediaSession' in navigator)) {
      console.warn('[AudioPlayer] ⚠ MediaSession API not supported')
      return
    }
    
    console.log('[AudioPlayer] ✓ Setting up MediaSession')
    
    try {
      // PLAY button on lock screen
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('[AudioPlayer] 🔔 Lock screen: PLAY')
        this.resume()
        this.emit('lockscreenAction', { action: 'play' })
      })
      
      // PAUSE button on lock screen
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('[AudioPlayer] 🔔 Lock screen: PAUSE')
        this.pause()
        this.emit('lockscreenAction', { action: 'pause' })
      })
      
      // NEXT TRACK button
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        console.log('[AudioPlayer] 🔔 Lock screen: NEXT')
        this.emit('lockscreenAction', { action: 'next' })
      })
      
      // PREVIOUS TRACK button
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('[AudioPlayer] 🔔 Lock screen: PREVIOUS')
        this.emit('lockscreenAction', { action: 'previous' })
      })
      
      // SEEK button (drag progress bar)
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        console.log('[AudioPlayer] 🔔 Lock screen: SEEK to', details.seekTime)
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime)
        }
      })
      
      // SEEK FORWARD button
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10
        this.seek(this.audio.currentTime + offset)
      })
      
      // SEEK BACKWARD button
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10
        this.seek(this.audio.currentTime - offset)
      })
      
      // STOP button
      navigator.mediaSession.setActionHandler('stop', () => {
        console.log('[AudioPlayer] 🔔 Lock screen: STOP')
        this.stop()
        this.emit('lockscreenAction', { action: 'stop' })
      })
      
      console.log('[AudioPlayer] ✓ MediaSession handlers set')
      
    } catch (error) {
      console.error('[AudioPlayer] MediaSession setup error:', error)
    }
  }
  
  // ────────────────────────────────────────────────
  // UPDATE MEDIA SESSION METADATA (Track Info)
  // ────────────────────────────────────────────────
  
  private updateMediaSessionMetadata(track: Track): void {
    if (!('mediaSession' in navigator)) return
    
    console.log('[AudioPlayer] Updating MediaSession metadata for:', track.title)
    
    try {
      // Determine display info based on type
      let displayTitle = track.title
      let displayArtist = track.artist
      let displayAlbum = track.album || 'Mwijay Music'
      
      // For radio, add LIVE indicator
      if (track.type === 'radio') {
        displayArtist = `🔴 LIVE · ${track.artist}`
        displayAlbum = 'Mwijay Radio'
      }
      
      // For reel, add reel indicator
      if (track.type === 'reel') {
        displayTitle = `🎬 ${track.title}`
        displayAlbum = 'Mwijay Reels'
      }
      
      // Build artwork in multiple sizes
      const artwork = this.buildArtworkArray(track.artworkUrl)
      
      // Set the metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: displayArtist,
        album: displayAlbum,
        artwork: artwork,
      })
      
      // Configure available actions based on type
      this.configureActionsForType(track.type || 'music')
      
      console.log('[AudioPlayer] ✓ MediaSession metadata updated')
      
    } catch (error) {
      console.error('[AudioPlayer] Metadata update error:', error)
    }
  }
  
  // ────────────────────────────────────────────────
  // CONFIGURE ACTIONS BASED ON MEDIA TYPE
  // ────────────────────────────────────────────────
  
  private configureActionsForType(type: MediaType): void {
    if (!('mediaSession' in navigator)) return
    
    if (type === 'radio') {
      // RADIO: Disable next, previous, seek
      try {
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
        navigator.mediaSession.setActionHandler('seekforward', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
        
        console.log('[AudioPlayer] Configured for RADIO (no skip/seek)')
      } catch (e) {
        console.error('[AudioPlayer] Radio config error:', e)
      }
    } else {
      // MUSIC/REEL: Enable all controls
      try {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.emit('lockscreenAction', { action: 'next' })
        })
        
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.emit('lockscreenAction', { action: 'previous' })
        })
        
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            this.seek(details.seekTime)
          }
        })
        
        console.log('[AudioPlayer] Configured for', type.toUpperCase())
      } catch (e) {
        console.error('[AudioPlayer] Config error:', e)
      }
    }
  }
  
  // ────────────────────────────────────────────────
  // BUILD ARTWORK ARRAY (Multiple Sizes)
  // ────────────────────────────────────────────────
  
  private buildArtworkArray(url?: string): MediaImage[] {
    // No artwork - use default
    if (!url) {
      return [{
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      }]
    }
    
    // R2 / S3-compatible storage - no server-side transforms, return single entry for all sizes
    if (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com')) {
      return [96, 192, 256, 512].map(size => ({
        src: url,
        sizes: `${size}x${size}`,
        type: 'image/jpeg',
      }))
    }
    
    // iTunes URLs - replace size
    if (url.includes('mzstatic.com')) {
      return [100, 200, 400, 600].map(size => ({
        src: url.replace(/\d+x\d+bb/, `${size}x${size}bb`),
        sizes: `${size}x${size}`,
        type: 'image/jpeg',
      }))
    }
    
    // Default - single size
    return [
      { src: url, sizes: '512x512', type: 'image/jpeg' }
    ]
  }
  
  // ────────────────────────────────────────────────
  // UPDATE PLAYBACK STATE
  // ────────────────────────────────────────────────
  
  private updateMediaSessionState(state: 'playing' | 'paused' | 'none'): void {
    if (!('mediaSession' in navigator)) return
    
    try {
      navigator.mediaSession.playbackState = state
      
      // Update position state (NOT for radio)
      if (this.currentTrack && this.currentTrack.type !== 'radio') {
        if (isFinite(this.audio.duration) && this.audio.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: this.audio.duration,
              playbackRate: this.audio.playbackRate,
              position: this.audio.currentTime,
            })
          } catch (e) {
            // Some browsers throw on setPositionState
          }
        }
      }
    } catch (error) {
      console.error('[AudioPlayer] State update error:', error)
    }
  }
  
  // ────────────────────────────────────────────────
  // CLEAR MEDIA SESSION
  // ────────────────────────────────────────────────
  
  private clearMediaSession(): void {
    if (!('mediaSession' in navigator)) return
    
    try {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    } catch {}
  }
  
  // ────────────────────────────────────────────────
  // EVENT EMITTER (Subscribe/Unsubscribe)
  // ────────────────────────────────────────────────
  
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => this.off(event, callback)
  }
  
  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback)
  }
  
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[AudioPlayer] Event handler error (${event}):`, error)
        }
      })
    }
  }
  
  // ────────────────────────────────────────────────
  // GETTERS
  // ────────────────────────────────────────────────
  
  get isPlaying(): boolean {
    return !this.audio.paused && !this.audio.ended
  }
  
  get isPaused(): boolean {
    return this.audio.paused
  }
  
  get currentTime(): number {
    return this.audio.currentTime
  }
  
  get duration(): number {
    return isFinite(this.audio.duration) ? this.audio.duration : 0
  }
  
  get track(): Track | null {
    return this.currentTrack
  }
  
  get audioElement(): HTMLAudioElement {
    return this.audio
  }
}

// ────────────────────────────────────────────────
// EXPORT SINGLE INSTANCE
// ────────────────────────────────────────────────

export const audioPlayer = new AudioPlayer()

// Also export the class type for components
export type { AudioPlayer }
