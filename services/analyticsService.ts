import { getAnalytics, logEvent, setUserId, setUserProperties, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { getApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { auth } from './firebase.ts';

class AnalyticsService {
  private analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
  private enabled = true;

  private getInstance() {
    if (!this.analyticsInstance) {
      try {
        this.analyticsInstance = getAnalytics(getApp());
      } catch {
        return null;
      }
    }
    return this.analyticsInstance;
  }

  // ── INITIALIZE ────────────────────────────────────────
  initialize(): void {
    const user = auth.currentUser;
    if (user) this.setUser(user.uid);

    try {
      const a = this.getInstance();
      if (!a) return;
      setUserProperties(a, {
        platform: Capacitor.getPlatform(),
        app_version: '1.0.0',
        build_type: import.meta.env.DEV ? 'development' : 'production',
      });
    } catch { /* analytics may not be available on native */ }

    this.trackEvent('app_open');
  }

  // ── USER ──────────────────────────────────────────────
  setUser(userId: string, properties: Record<string, string> = {}): void {
    try {
      const a = this.getInstance();
      if (!a) return;
      setUserId(a, userId);
      if (Object.keys(properties).length > 0) {
        setUserProperties(a, properties);
      }
    } catch { /* noop */ }
  }

  clearUser(): void {
    try {
      const a = this.getInstance();
      if (!a) return;
      setUserId(a, null as unknown as string);
    } catch { /* noop */ }
  }

  // ── CORE EVENT ────────────────────────────────────────
  trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
    if (!this.enabled) return;
    try {
      const a = this.getInstance();
      if (!a) return;
      logEvent(a, eventName, {
        ...params,
        platform: Capacitor.getPlatform(),
      });
    } catch { /* noop */ }
  }

  // ── MUSIC EVENTS ──────────────────────────────────────
  trackSongPlay(song: { id: string; title: string; artist: string; source?: string }, source: string): void {
    this.trackEvent('song_play', {
      song_id: song.id,
      song_title: song.title,
      song_artist: song.artist,
      song_source: song.source || 'local',
      play_source: source,
    });
  }

  trackSongComplete(songId: string, listenedSeconds: number, duration: number): void {
    this.trackEvent('song_complete', {
      song_id: songId,
      listened_seconds: Math.round(listenedSeconds),
      completion_rate: Math.round((listenedSeconds / (duration || 1)) * 100),
    });
  }

  trackSongSkip(songId: string, atSecond: number, duration: number): void {
    this.trackEvent('song_skip', {
      song_id: songId,
      skip_at_second: Math.round(atSecond),
      skip_rate: Math.round((atSecond / (duration || 1)) * 100),
    });
  }

  trackSearch(query: string, resultsCount: number): void {
    this.trackEvent('search', {
      search_term: query.substring(0, 100),
      results_count: resultsCount,
      has_results: resultsCount > 0,
    });
  }

  // ── SOCIAL EVENTS ─────────────────────────────────────
  trackLike(songId: string, action: 'like' | 'unlike'): void {
    this.trackEvent('song_like', { song_id: songId, action });
  }

  trackShare(method: string, contentType: string, contentId: string): void {
    this.trackEvent('share', { method, content_type: contentType, item_id: contentId });
  }

  trackPlaylistCreate(playlistId: string, isPublic: boolean): void {
    this.trackEvent('playlist_create', { playlist_id: playlistId, is_public: isPublic });
  }

  // ── FEATURE EVENTS ────────────────────────────────────
  trackFeatureUse(featureName: string, action = 'open'): void {
    this.trackEvent('feature_used', { feature_name: featureName, action });
  }

  trackEffectsUsed(presetName: string): void {
    this.trackEvent('effects_used', { preset_name: presetName });
  }

  trackGameComplete(score: number, accuracy: number): void {
    this.trackEvent('game_complete', { score, accuracy: Math.round(accuracy) });
  }

  // ── NAVIGATION ────────────────────────────────────────
  trackScreenView(screenName: string): void {
    try {
      const a = this.getInstance();
      if (!a) return;
      logEvent(a, 'screen_view', {
        firebase_screen: screenName,
        firebase_screen_class: screenName,
      });
    } catch { /* noop */ }
  }

  // ── AUTH EVENTS ───────────────────────────────────────
  trackSignUp(method: string): void { this.trackEvent('sign_up', { method }); }
  trackSignIn(method: string): void { this.trackEvent('login', { method }); }
  trackSignOut(): void { this.trackEvent('logout'); }

  // ── ERROR TRACKING ────────────────────────────────────
  trackError(error: Error, context: string): void {
    this.trackEvent('app_error', {
      error_message: error.message.substring(0, 200),
      error_name: error.name,
      context,
    });
  }

  // ── PRIVACY ───────────────────────────────────────────
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      const a = this.getInstance();
      if (a) setAnalyticsCollectionEnabled(a, enabled);
    } catch { /* noop */ }
  }
}

export const analytics = new AnalyticsService();

// Auto-track global errors (safe - won't crash if analytics fails)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.error) analytics.trackError(e.error, 'window.error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    analytics.trackError(new Error(String(e.reason)), 'unhandled_rejection');
  });
}
