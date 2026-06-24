
/**
 * MusicControlPlugin.ts
 * 
 * TypeScript Capacitor bridge for the native Android MusicService.
 * On Android: forwards calls to the Kotlin foreground service via Capacitor.
 * On Web/iOS: silently no-ops so the app never crashes.
 * 
 * Usage:
 *   import { MusicControl } from '../plugins/MusicControlPlugin';
 *   await MusicControl.updateNowPlaying({ title, artist, ... });
 */

import { registerPlugin } from '@capacitor/core';

export interface UpdateNowPlayingOptions {
  title:     string;
  artist:    string;
  album:     string;
  artwork:   string;   // HTTPS URL to cover art
  isPlaying: boolean;
  isLiked:   boolean;
  duration:  number;   // milliseconds
  position:  number;   // milliseconds
  type?:     'music' | 'radio' | 'reel' | 'podcast' | 'video';
  isLive?:   boolean;
}

export interface MediaActionEvent {
  action:    string;   // e.g. 'com.mwijay.ACTION_PLAY'
  position?: number;   // milliseconds (only for SEEK action)
}

export interface MusicControlPlugin {
  /** Push current track state to the Android foreground service notification. */
  updateNowPlaying(options: UpdateNowPlayingOptions): Promise<void>;

  /** Stop the foreground service (called when user stops playback or closes app). */
  stopService(): Promise<void>;

  /**
   * Listen for media button events coming FROM the Android notification.
   * (play, pause, next, prev, like, seek)
   */
  addListener(
    eventName: 'mediaAction',
    listenerFunc: (data: MediaActionEvent) => void
  ): Promise<{ remove: () => void }>;
}

/**
 * Web fallback implementation:
 * All methods are stubs that resolve immediately without errors.
 * This allows the same TypeScript code to run on both web & native.
 */
const webFallback: MusicControlPlugin = {
  updateNowPlaying: async () => {},
  stopService: async () => {},
  addListener: async (_eventName, _listenerFunc) => ({
    remove: () => {},
  }),
};

export const MusicControl = registerPlugin<MusicControlPlugin>('MusicControl', {
  web: webFallback,
});
