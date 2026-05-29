
/**
 * mediaSessionService.ts
 * 
 * Controls what appears on:
 *  - Android/iOS lock screen
 *  - Notification shade pull-down
 *  - Bluetooth headphone buttons
 *  - Car display (Android Auto / CarPlay)
 *  - Chrome media controls bar (desktop)
 * 
 * Integrates with App.tsx via the useBackgroundMedia hook —
 * this service is a lower-level singleton that the upgraded
 * hook delegates to.
 */

export interface MediaTrack {
  title: string;
  artist: string;
  album: string;
  artwork: string;     // Full URL to image (should be HTTPS)
  duration: number;    // Total seconds
  isLiked: boolean;
}

export interface MediaState {
  track: MediaTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

class MediaSessionService {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrack: MediaTrack | null = null;
  private isSupported: boolean;
  private positionUpdateInterval: number | null = null;
  private likeCallback: ((liked: boolean) => void) | null = null;
  private nextCallback: (() => void) | null = null;
  private prevCallback: (() => void) | null = null;

  constructor() {
    this.isSupported = 'mediaSession' in navigator;
    if (!this.isSupported) {
      console.warn('[MediaSessionService] Web MediaSession API not supported in this browser. Lock screen controls will be unavailable.');
    }
  }

  /** Bind to the real HTML audio element that is actually playing. */
  initialize(audioElement: HTMLAudioElement) {
    this.audioElement = audioElement;

    audioElement.addEventListener('play',  () => this.updatePlaybackState('playing'));
    audioElement.addEventListener('pause', () => this.updatePlaybackState('paused'));
    audioElement.addEventListener('ended', () => this.updatePlaybackState('none'));
  }

  /** Set the currently playing track and push metadata to the OS. */
  setTrack(track: MediaTrack) {
    this.currentTrack = track;
    this.updateMetadata(track);
  }

  /** Push MediaMetadata to the browser/OS. Multi-size artwork for best display. */
  updateMetadata(track: MediaTrack) {
    if (!this.isSupported) return;

    const makeArt = (size: number) => ({
      src:   this.getProxiedArtwork(track.artwork, size),
      sizes: `${size}x${size}`,
      type:  'image/jpeg',
    });

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:   track.title  || 'Unknown Title',
        artist:  track.artist || 'Unknown Artist',
        album:   track.album  || '',
        artwork: [
          makeArt(96),
          makeArt(128),
          makeArt(192),
          makeArt(256),
          makeArt(512),
        ],
      });
    } catch (err) {
      console.warn('[MediaSessionService] Failed to set metadata:', err);
    }
  }

  /**
   * Returns a correctly-sized artwork URL.
   * Android WebView has CORS limits on some domains, so we transform known CDN URLs.
   */
  getProxiedArtwork(url: string, size: number): string {
    if (!url) {
      // Fallback to app favicon — always available
      return `${window.location.origin}/favicon.ico`;
    }

    // Cloudinary: e.g. https://res.cloudinary.com/.../upload/v123/photo.jpg
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_jpg/`);
    }

    // iTunes/Apple Music: e.g. …100x100bb.jpg
    if (url.includes('mzstatic.com') || url.includes('itunes.apple.com')) {
      return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
    }

    // Last.fm serves small images by default; try to upscale via their CDN path
    if (url.includes('lastfm.freetls.fastly.net') || url.includes('last.fm')) {
      // Last.fm image size path: /i/u/34s/, /i/u/64s/, /i/u/174s/, /i/u/300x300/
      return url.replace(/\/i\/u\/\d+s\//, `/i/u/${size}s/`);
    }

    // Deezer CDN images: e.g. …/image?size=small → medium/big/xl
    if (url.includes('e-cdns-images.dzcdn.net') || url.includes('cdns-images.dzcdn.net')) {
      const sizeLabel = size <= 128 ? 'small' : size <= 256 ? 'medium' : 'big';
      return url.replace(/(\/images\/\w+\/[a-f0-9]+\/)\d+x\d+/, `$1${size}x${size}`);
    }

    // Force HTTPS — Android WebView blocks mixed content
    if (url.startsWith('http://')) {
      url = 'https://' + url.slice(7);
    }

    return url;
  }

  /**
   * Register all Media Session action handlers in one call.
   * Must be called AFTER user interaction to avoid autoplay policy issues.
   */
  setupActionHandlers(callbacks: {
    onPlay:      () => void;
    onPause:     () => void;
    onNext:      () => void;
    onPrevious:  () => void;
    onSeek:      (time: number) => void;
    onLike?:     (liked: boolean) => void;
  }) {
    if (!this.isSupported) return;

    if (callbacks.onLike) this.likeCallback = callbacks.onLike;
    this.nextCallback = callbacks.onNext;
    this.prevCallback = callbacks.onPrevious;

    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action might not be supported on this platform — ignore
      }
    };

    setHandler('play', () => callbacks.onPlay());
    setHandler('pause', () => callbacks.onPause());
    setHandler('nexttrack', () => callbacks.onNext());
    setHandler('previoustrack', () => callbacks.onPrevious());

    setHandler('seekto', (details) => {
      if (details.seekTime !== undefined) callbacks.onSeek(details.seekTime);
    });

    setHandler('seekforward', (details) => {
      const skip = (details as any).seekOffset ?? 10;
      if (this.audioElement) callbacks.onSeek(this.audioElement.currentTime + skip);
    });

    setHandler('seekbackward', (details) => {
      const skip = (details as any).seekOffset ?? 10;
      if (this.audioElement) callbacks.onSeek(Math.max(0, this.audioElement.currentTime - skip));
    });

    // Stop — may not be supported everywhere
    setHandler('stop', () => callbacks.onPause());
  }

  /** Update OS playback state ('playing', 'paused', 'none') and manage position polling. */
  updatePlaybackState(state: 'playing' | 'paused' | 'none') {
    if (!this.isSupported) return;
    try {
      navigator.mediaSession.playbackState = state;
    } catch { /* ignore */ }

    if (state === 'playing') {
      this.startPositionUpdates();
    } else {
      this.stopPositionUpdates();
    }
  }

  /** Poll the audio element's position every second and push to OS seek bar. */
  startPositionUpdates() {
    this.stopPositionUpdates();

    this.positionUpdateInterval = window.setInterval(() => {
      if (!this.audioElement || !this.isSupported) return;
      const dur = this.audioElement.duration;
      if (!isFinite(dur) || dur <= 0) return;

      try {
        navigator.mediaSession.setPositionState({
          duration:     dur,
          playbackRate: this.audioElement.playbackRate || 1,
          position:     Math.min(this.audioElement.currentTime, dur),
        });
      } catch {
        // setPositionState can throw if duration is NaN on initial load
      }
    }, 1000);
  }

  stopPositionUpdates() {
    if (this.positionUpdateInterval !== null) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }

  /** Update liked/unliked state in notification (where supported). */
  updateLikeState(_isLiked: boolean) {
    // Standard MediaSession API doesn't expose a dedicated "like" action yet.
    // The Android native service (MusicService.kt) handles the heart button.
    // This stub exists for forward-compatibility.
  }

  /** Force-push the current position state (called on seek). */
  updatePositionState(position: number, duration: number, playbackRate = 1) {
    if (!this.isSupported || !isFinite(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: Math.min(position, duration),
      });
    } catch { /* ignore */ }
  }

  /** Tear down all handlers and intervals. Call on app unmount. */
  destroy() {
    this.stopPositionUpdates();

    if (!this.isSupported) return;
    const handlers: MediaSessionAction[] = [
      'play', 'pause', 'nexttrack', 'previoustrack',
      'seekto', 'seekforward', 'seekbackward', 'stop',
    ];
    handlers.forEach(action => {
      try { navigator.mediaSession.setActionHandler(action, null); } catch { /* ignore */ }
    });
    navigator.mediaSession.metadata = null;
  }
}

/** Singleton — import and use anywhere in the app. */
export const mediaSessionService = new MediaSessionService();
