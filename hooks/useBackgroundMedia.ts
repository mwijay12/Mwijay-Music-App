
/**
 * useBackgroundMedia.ts
 * 
 * Upgraded hook — now delegates to mediaSessionService for richer OS integration
 * AND pushes track info to the Android foreground service via MusicControl plugin.
 * 
 * Replaces the old inline MediaSession calls in App.tsx.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { Song, MediaSessionActionDetails } from '../types';
import { mediaSessionService } from '../services/mediaSessionService';
import { MusicControl } from '../plugins/MusicControlPlugin';

interface BackgroundMediaControls {
  onPlay:         () => void;
  onPause:        () => void;
  onNext:         () => void;
  onPrev:         () => void;
  onSeekForward:  (details: MediaSessionActionDetails) => void;
  onSeekBackward: (details: MediaSessionActionDetails) => void;
  onSeekTo:       (details: MediaSessionActionDetails) => void;
}

const isNative = Capacitor.isNativePlatform();

export const useBackgroundMedia = (
  song:      Song | null,
  isPlaying: boolean,
  progress:  number,
  duration:  number,
  controls:  BackgroundMediaControls
) => {
  // ── Refs ───────────────────────────────────────────────────────────────────
  const controlsRef           = useRef(controls);
  const audioInitialized      = useRef(false);
  const nativeListenerRef     = useRef<{ remove: () => void } | null>(null);
  const nativePositionTimer   = useRef<number | null>(null);
  const lastPositionUpdateRef = useRef<number>(0);

  // Keep controls pointer stable
  useEffect(() => { controlsRef.current = controls; }, [controls]);

  // ── 1. Initialize mediaSessionService once ─────────────────────────────────
  useEffect(() => {
    if (audioInitialized.current) return;
    audioInitialized.current = true;

    // Find the actual <audio> element in the DOM (App.tsx uses audioRef)
    const audioEl = document.querySelector('audio') as HTMLAudioElement | null;
    if (audioEl) {
      mediaSessionService.initialize(audioEl);
    }

    // Wire all controls through the service
    mediaSessionService.setupActionHandlers({
      onPlay:     () => controlsRef.current.onPlay(),
      onPause:    () => controlsRef.current.onPause(),
      onNext:     () => controlsRef.current.onNext(),
      onPrevious: () => controlsRef.current.onPrev(),
      onSeek:     (time) => {
        controlsRef.current.onSeekTo({ seekTime: time, action: 'seekto', fastSeek: false } as any);
      },
    });

    return () => { mediaSessionService.destroy(); };
  }, []); // run once

  // ── 2. Push track metadata whenever the song changes ──────────────────────
  useEffect(() => {
    if (!song) {
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
      return;
    }

    const artwork = song.albumArtUrl || '';

    mediaSessionService.setTrack({
      title:    song.title,
      artist:   song.artist,
      album:    song.artist || '',          // Song type has no 'album' field — use artist as fallback
      artwork,
      duration: isFinite(duration) ? duration : 0,
      isLiked:  song.isFavorite ?? false,
    });

    // Push to Android native foreground service
    if (isNative) {
      MusicControl.updateNowPlaying({
        title:     song.title,
        artist:    song.artist,
        album:     song.artist || '',
        artwork,
        isPlaying,
        isLiked:   song.isFavorite ?? false,
        duration:  isFinite(duration) ? Math.floor(duration * 1000) : 0,
        position:  Math.floor(progress * 1000),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, song?.title, song?.artist, song?.albumArtUrl, song?.isFavorite]);

  // ── 3. Update playback state (play/pause) and seek bar ────────────────────
  useEffect(() => {
    if (!song) return;

    const state = isPlaying ? 'playing' : 'paused';
    mediaSessionService.updatePlaybackState(state);

    const isLive = !isFinite(duration) || duration === 0;

    if (!isLive) {
      const now = Date.now();
      // Throttle to once per 2 s to avoid thrashing the OS
      if (now - lastPositionUpdateRef.current > 2000 || !isPlaying) {
        lastPositionUpdateRef.current = now;
        mediaSessionService.updatePositionState(progress, duration);
      }
    }

    // Push play-state to Android native service
    if (isNative && song) {
      MusicControl.updateNowPlaying({
        title:     song.title,
        artist:    song.artist,
        album:     song.artist || '',       // No album field in Song type
        artwork:   song.albumArtUrl || '',
        isPlaying,
        isLiked:   song.isFavorite ?? false,
        duration:  isFinite(duration) ? Math.floor(duration * 1000) : 0,
        position:  Math.floor(progress * 1000),
      }).catch(() => {});
    }
  }, [isPlaying, progress, duration, song?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Re-bind seek handlers when duration changes (live vs. track) ────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const isLive = !isFinite(duration) || duration === 0;

    const trySet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* ignore */ }
    };

    if (isLive) {
      trySet('seekto',       null);
      trySet('seekforward',  null);
      trySet('seekbackward', null);
    } else {
      trySet('seekforward',  (d) => controlsRef.current.onSeekForward(d as any));
      trySet('seekbackward', (d) => controlsRef.current.onSeekBackward(d as any));
      trySet('seekto',       (d) => controlsRef.current.onSeekTo(d as any));
    }

    return () => {
      trySet('seekforward',  null);
      trySet('seekbackward', null);
      trySet('seekto',       null);
    };
  }, [duration]);

  // ── 5. Android native event listener: notification button taps ───────────
  useEffect(() => {
    if (!isNative) return;

    // Remove existing listener before registering new one
    nativeListenerRef.current?.remove();

    MusicControl.addListener('mediaAction', (data) => {
      switch (data.action) {
        case 'com.mwijay.ACTION_PLAY':
          controlsRef.current.onPlay();
          break;
        case 'com.mwijay.ACTION_PAUSE':
          controlsRef.current.onPause();
          break;
        case 'com.mwijay.ACTION_NEXT':
          controlsRef.current.onNext();
          break;
        case 'com.mwijay.ACTION_PREV':
          controlsRef.current.onPrev();
          break;
        case 'SEEK':
          if (data.position !== undefined) {
            controlsRef.current.onSeekTo({
              seekTime: data.position / 1000,
              action:   'seekto',
            } as any);
          }
          break;
      }
    }).then((listener) => {
      nativeListenerRef.current = listener;
    }).catch(() => {});

    return () => {
      nativeListenerRef.current?.remove();
      nativeListenerRef.current = null;
    };
  }, []); // run once

  // ── 6. Periodic native position update while playing ─────────────────────
  useEffect(() => {
    if (!isNative || !song || !isPlaying) {
      if (nativePositionTimer.current) {
        clearInterval(nativePositionTimer.current);
        nativePositionTimer.current = null;
      }
      return;
    }

    nativePositionTimer.current = window.setInterval(() => {
      if (!song) return;
      MusicControl.updateNowPlaying({
        title:     song.title,
        artist:    song.artist,
        album:     song.artist || '',       // No album field in Song type
        artwork:   song.albumArtUrl || '',
        isPlaying: true,
        isLiked:   song.isFavorite ?? false,
        duration:  isFinite(duration) ? Math.floor(duration * 1000) : 0,
        position:  Math.floor(progress * 1000),
      }).catch(() => {});
    }, 5000); // Every 5 s — just enough for the scrubber to feel responsive

    return () => {
      if (nativePositionTimer.current) {
        clearInterval(nativePositionTimer.current);
        nativePositionTimer.current = null;
      }
    };
  }, [isPlaying, song?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 7. Stop native service when nothing is playing ────────────────────────
  const stopNativeService = useCallback(() => {
    if (isNative) MusicControl.stopService().catch(() => {});
  }, []);

  return { stopNativeService };
};
