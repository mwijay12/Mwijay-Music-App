/**
 * AudioCore.ts
 *
 * PROBLEM THIS SOLVES:
 * ─────────────────────
 * The original audioEngine.ts creates a Tone.js MediaElementAudioSourceNode
 * and connects it to a complex effect chain. On mobile Android WebView:
 *
 * 1. MediaElementAudioSourceNode can ONLY be created ONCE per HTMLAudioElement
 *    — creating it again (e.g., when track changes) throws:
 *    "HTMLMediaElement already connected to an AudioNode"
 *
 * 2. When the Tone.js graph breaks, audio output is COMPLETELY SILENCED
 *    even though the audio element is still "playing"
 *
 * 3. Radio streams have CORS restrictions that prevent Web Audio API
 *    from routing them — the stream plays but produces no output
 *
 * THE FIX:
 * ─────────
 * AudioCore manages a SINGLE HTMLAudioElement that is NEVER replaced.
 * It changes src instead of creating new elements.
 * The Tone.js graph is optional — audio works without it.
 * Radio streams bypass the effects graph entirely.
 *
 * AUDIO ELEMENT LIFECYCLE:
 * ─────────────────────────
 * App Start → Create ONE <audio> element → Keep forever
 * Track Change → audioElement.src = newUrl (never replace element)
 * Effect ON → Connect to Tone.js (safe one-time connection)
 * Effect OFF → Disconnect from Tone.js (audio continues direct)
 * Radio → Set src, skip Tone.js entirely
 */

import { AudioFader } from './AudioFader';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AudioSourceType = 'local' | 'stream' | 'radio' | 'youtube';

export interface AudioCoreOptions {
  /** Called when audio starts playing */
  onPlay?: () => void;
  /** Called when audio pauses */
  onPause?: () => void;
  /** Called when track ends naturally */
  onEnded?: () => void;
  /** Called when time updates (throttled to ~1/sec) */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Called when audio fails to load or play */
  onError?: (error: string) => void;
  /** Called when audio is ready to play */
  onCanPlay?: () => void;
  /** Called when buffering starts */
  onWaiting?: () => void;
  /** Called when buffering ends */
  onPlaying?: () => void;
}

// ─── AudioCore Class ──────────────────────────────────────────────────────────

export class AudioCore {
  // The single persistent audio element — NEVER replaced
  public readonly element: HTMLAudioElement;

  private fader: AudioFader;
  private options: AudioCoreOptions;
  private lastTimeUpdate: number = 0;
  private isDestroyed: boolean = false;

  // Track current source info
  private currentSrc: string = '';
  private currentSourceType: AudioSourceType = 'local';
  private isRadioMode: boolean = false;

  // Volume state (separate from fade volume)
  private userVolume: number = 1.0;

  // Web Audio API connection state
  // CRITICAL: Track if MediaElementSourceNode has been created
  // It can only be created ONCE — attempting twice throws an error
  private webAudioConnected: boolean = false;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private outputGainNode: GainNode | null = null;

  // Safety guard to force volume if fade-in never completes
  private _volumeGuard: ReturnType<typeof setTimeout> | null = null;

  constructor(options: AudioCoreOptions = {}) {
    this.options = options;

    // Create the ONE persistent audio element
    this.element = document.createElement('audio');
    this.element.preload = 'metadata';

    // CRITICAL for mobile: Allow cross-origin audio
    // Must be set BEFORE setting src
    this.element.crossOrigin = 'anonymous';

    // CRITICAL for iOS/Android: Prevents audio interruption
    // when other apps play sounds
    this.element.setAttribute('playsinline', '');
    this.element.setAttribute('webkit-playsinline', '');

    this.fader = new AudioFader(this.element);
    this.attachEventListeners();

    // Append to DOM — required for some Android WebView versions
    // to allow autoplay and background audio
    this.element.style.display = 'none';
    document.body.appendChild(this.element);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Load a new audio source.
   *
   * SAFE TO CALL REPEATEDLY — does not recreate the audio element.
   * Changes src only if URL has changed (prevents unnecessary reloads).
   *
   * @param url         Audio URL (file://, https://, blob:, etc.)
   * @param sourceType  Type of source for routing decisions
   * @param autoPlay    Whether to start playing after load
   */
  async load(
    url: string,
    sourceType: AudioSourceType = 'local',
    autoPlay: boolean = false
  ): Promise<void> {
    if (this.isDestroyed) return;

    console.log(`[AudioCore] Loading: ${sourceType} | ${url.substring(0, 60)}...`);

    this.currentSourceType = sourceType;
    this.isRadioMode = sourceType === 'radio';

    // Cancel any active fade
    this.fader.cancel();

    // Pause current playback first
    try {
      this.element.pause();
    } catch {
      // Ignore pause errors
    }

    // For radio: remove crossOrigin to avoid CORS blocking streams
    // Many radio streams don't send CORS headers
    if (this.isRadioMode) {
      this.element.removeAttribute('crossorigin');
      this.element.preload = 'none'; // Don't pre-buffer radio
    } else {
      // Only set crossOrigin if not already set (avoid resetting)
      if (!this.element.hasAttribute('crossorigin')) {
        this.element.crossOrigin = 'anonymous';
      }
      this.element.preload = 'metadata';
    }

    // Only change src if it's actually different
    if (url !== this.currentSrc) {
      this.currentSrc = url;

      // Reset position and ready state
      this.element.currentTime = 0;

      // Set new source
      this.element.src = url;

      // Load must be called after src change to reset the media element
      this.element.load();
    }

    if (autoPlay) {
      await this.play(true); // true = fade in
    }
  }

  /**
   * Play audio with optional fade in.
   *
   * SAFE VERSION: Handles all mobile WebView play() restrictions.
   * On Android, play() returns a Promise that MUST be caught.
   *
   * @param withFade  Whether to fade in (default: true)
   * @param fadeDuration  Fade duration in ms (default: 600)
   */
  async play(withFade: boolean = true, fadeDuration: number = 600): Promise<void> {
    if (this.isDestroyed) return;

    try {
      // Resume AudioContext if it was suspended
      // Android WebView suspends AudioContext until user gesture
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (withFade && !this.isRadioMode) {
        // Set volume to 0 BEFORE play() so fade in is smooth
        this.fader.targetMaxVolume = this.userVolume;
        this.element.volume = 0;

        // SAFETY: force volume to user level after 2s if fade never completes
        this._volumeGuard = setTimeout(() => {
          try {
            if (this.element && !this.element.paused && this.element.volume === 0) {
              console.warn('[AudioCore] Volume still 0 after 2s — forcing to userVolume:', this.userVolume);
              this.element.volume = this.userVolume;
            }
          } catch (e) {
            console.warn('[AudioCore] Volume guard error:', e);
          }
        }, 2000);
      }

      // The actual play() call — MUST be awaited and caught
      await this.element.play();

      // Start fade AFTER play() succeeds
      if (withFade && !this.isRadioMode) {
        // Don't await — let it run async so playback starts immediately
        this.fader.fadeIn(fadeDuration).catch(() => {
          // Fade cancelled or failed — snap to target volume
          this.element.volume = this.userVolume;
        });
      } else {
        // For radio or no-fade: ensure volume is at user level
        this.element.volume = this.userVolume;
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Common mobile errors and their meanings:
      if (errorMessage.includes('AbortError')) {
        // Play was interrupted — usually means new load() called before play completed
        // This is normal when rapidly skipping tracks — not a real error
        console.log('[AudioCore] Play aborted (new track loaded) — normal');
        return;
      }

      if (errorMessage.includes('NotAllowedError')) {
        // Browser requires user gesture before playing
        // This happens in browser dev mode — not in native APK
        console.warn('[AudioCore] Play requires user gesture (browser only)');
        this.options.onError?.('Tap to play — user interaction required');
        return;
      }

      if (errorMessage.includes('NotSupportedError')) {
        // Audio format not supported or URL is invalid
        console.error('[AudioCore] Audio format not supported:', this.currentSrc);
        this.options.onError?.('Audio format not supported');
        return;
      }

      // Unknown error — log but don't crash
      console.error('[AudioCore] Play error:', errorMessage);
      this.options.onError?.(errorMessage);
    }
  }

  /**
   * Pause audio with optional fade out.
   *
   * @param withFade     Whether to fade out before pausing
   * @param fadeDuration Fade duration in ms (default: 400)
   */
  async pause(withFade: boolean = true, fadeDuration: number = 400): Promise<void> {
    if (this.isDestroyed) return;

    if (withFade && !this.isRadioMode && !this.element.paused) {
      try {
        await this.fader.fadeOut(fadeDuration);
      } catch {
        // Fade was cancelled — proceed to pause anyway
      }
    }

    try {
      this.element.pause();
    } catch {
      // Ignore pause errors
    }

    // Restore volume for next play
    this.element.volume = this.userVolume;
  }

  /**
   * Seek to a position.
   * NOT available for radio streams.
   *
   * @param seconds  Position in seconds
   */
  seek(seconds: number): void {
    if (this.isDestroyed || this.isRadioMode) return;

    try {
      if (isFinite(this.element.duration) && seconds <= this.element.duration) {
        this.element.currentTime = Math.max(0, seconds);
      }
    } catch (error) {
      console.warn('[AudioCore] Seek error:', error);
    }
  }

  /**
   * Set playback volume.
   *
   * @param volume  0.0 (silent) to 1.0 (full)
   */
  setVolume(volume: number): void {
    this.userVolume = Math.max(0, Math.min(1, volume));
    this.fader.targetMaxVolume = this.userVolume;

    // Only set directly if not currently fading
    this.element.volume = this.userVolume;
  }

  /**
   * Set playback speed.
   * Rate 1.0 = normal. 0.85 = slowed. 1.25 = nightcore.
   * NOT available for radio streams.
   *
   * @param rate  0.5 to 2.0
   */
  setPlaybackRate(rate: number): void {
    if (this.isRadioMode) return; // Radio cannot be speed-adjusted
    const safeRate = Math.max(0.25, Math.min(4.0, rate));
    this.element.playbackRate = safeRate;
  }

  /**
   * Get current playback position in seconds.
   */
  get currentTime(): number {
    return this.element.currentTime;
  }

  /**
   * Get total duration in seconds. Returns 0 if unknown (radio/loading).
   */
  get duration(): number {
    const d = this.element.duration;
    return isFinite(d) ? d : 0;
  }

  /**
   * Whether audio is currently playing.
   */
  get isPlaying(): boolean {
    return !this.element.paused && !this.element.ended;
  }

  /**
   * Whether in radio mode.
   */
  get isRadio(): boolean {
    return this.isRadioMode;
  }

  /**
   * Connect this audio element to the Web Audio API.
   * Returns the source node for effects chaining.
   *
   * CRITICAL: Can only be called ONCE per HTMLAudioElement.
   * Subsequent calls return the existing source node safely.
   *
   * Returns null if connection fails (audio continues playing directly).
   */
  connectToWebAudio(audioContext: AudioContext): MediaElementAudioSourceNode | null {
    // Already connected — return existing node
    if (this.webAudioConnected && this.sourceNode) {
      return this.sourceNode;
    }

    // Radio bypasses Web Audio to avoid CORS issues
    if (this.isRadioMode) {
      console.log('[AudioCore] Radio mode — skipping Web Audio connection');
      return null;
    }

    try {
      this.audioContext = audioContext;
      this.sourceNode = audioContext.createMediaElementSource(this.element);

      // Create an output gain node — effects chain connects through this
      this.outputGainNode = audioContext.createGain();
      this.outputGainNode.gain.value = 1.0;

      // Default: source → output gain → speakers
      // Effects engine will insert between source and outputGainNode
      this.sourceNode.connect(this.outputGainNode);
      this.outputGainNode.connect(audioContext.destination);

      this.webAudioConnected = true;
      console.log('[AudioCore] Connected to Web Audio API');
      return this.sourceNode;

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[AudioCore] Web Audio connection failed:', msg);
      // Audio continues playing directly — effects just won't work
      return null;
    }
  }

  /**
   * Get the output gain node for effects chain connection.
   */
  getOutputGainNode(): GainNode | null {
    return this.outputGainNode;
  }

  /**
   * Get the AudioContext (if connected).
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Stop and destroy the audio core.
   * Call when the app unmounts.
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this._volumeGuard) {
      clearTimeout(this._volumeGuard);
      this._volumeGuard = null;
    }

    this.fader.destroy();

    try {
      this.element.pause();
      this.element.src = '';
      this.element.load();
    } catch {
      // Ignore
    }

    try {
      this.sourceNode?.disconnect();
      this.outputGainNode?.disconnect();
      this.audioContext?.close();
    } catch {
      // Ignore Web Audio cleanup errors
    }

    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    console.log('[AudioCore] Destroyed');
  }

  // ─── Private Event Listeners ─────────────────────────────────────────────────

  private attachEventListeners(): void {
    const el = this.element;

    el.addEventListener('play', () => {
      if (!this.isDestroyed) this.options.onPlay?.();
    });

    el.addEventListener('pause', () => {
      if (!this.isDestroyed) this.options.onPause?.();
    });

    el.addEventListener('ended', () => {
      if (!this.isDestroyed) this.options.onEnded?.();
    });

    el.addEventListener('canplay', () => {
      if (!this.isDestroyed) this.options.onCanPlay?.();
    });

    el.addEventListener('waiting', () => {
      if (!this.isDestroyed) this.options.onWaiting?.();
    });

    el.addEventListener('playing', () => {
      if (!this.isDestroyed) this.options.onPlaying?.();
    });

    // Throttled time update — fire at most once per second
    el.addEventListener('timeupdate', () => {
      if (this.isDestroyed) return;
      const now = Date.now();
      if (now - this.lastTimeUpdate > 900) {
        this.lastTimeUpdate = now;
        this.options.onTimeUpdate?.(el.currentTime, el.duration || 0);
      }
    });

    el.addEventListener('error', () => {
      if (this.isDestroyed) return;
      const err = el.error;
      let message = 'Unknown audio error';

      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Audio loading aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'Network error — check connection';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Audio file is corrupted or unsupported format';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Audio source not supported';
            break;
        }
      }

      console.error('[AudioCore] Audio error:', message, '| src:', this.currentSrc?.substring(0, 80));
      this.options.onError?.(message);
    });

    // Stalled — stream not delivering data (common with radio)
    el.addEventListener('stalled', () => {
      if (!this.isDestroyed && this.isRadioMode) {
        console.warn('[AudioCore] Radio stream stalled — attempting reload');
        // For radio: reload after 3 seconds of stalling
        setTimeout(() => {
          if (!this.isDestroyed && this.isRadioMode && this.element.paused) {
            this.element.load();
            this.play(false);
          }
        }, 3000);
      }
    });
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/**
 * Global AudioCore singleton.
 * Import and use this in all components that need audio playback.
 *
 * IMPORTANT: Initialize this ONCE in App.tsx, not in individual components.
 */
let _audioCoreInstance: AudioCore | null = null;

export function getAudioCore(options?: AudioCoreOptions): AudioCore {
  if (!_audioCoreInstance) {
    _audioCoreInstance = new AudioCore(options);
    console.log('[AudioCore] Singleton created');
  }
  return _audioCoreInstance;
}

export function destroyAudioCore(): void {
  _audioCoreInstance?.destroy();
  _audioCoreInstance = null;
}
