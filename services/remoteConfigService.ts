import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
  getString,
  getBoolean,
  getNumber,
} from 'firebase/remote-config';
import { getApp } from 'firebase/app';

export interface AppConfig {
  // Feature Flags
  enableBetaFeatures: boolean;
  enableVisualizer: boolean;
  enableKaraokeMode: boolean;
  enableAiDj: boolean;
  enableSocialFeatures: boolean;
  enableLyrics: boolean;
  enableEffectsStudio: boolean;
  enableBeatGame: boolean;
  enableDownloads: boolean;
  enableSharing: boolean;

  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEstimatedTime: string;

  // Visual Theme
  primaryColor: string;
  accentColor: string;
  customCssOverride: string;

  // Welcome Messages
  splashTitle: string;
  splashSubtitle: string;
  welcomeMessage: string;

  // Feature Limits
  maxFreePlaylists: number;
  maxFreeDownloads: number;
  maxSongsPerPlaylist: number;
  maxCollaborators: number;

  // Announcements/Banners
  showAnnouncement: boolean;
  announcementText: string;
  announcementColor: string;
  announcementIcon: string;
  announcementActionText: string;
  announcementActionUrl: string;
  announcementDismissible: boolean;

  // Audio Settings
  preloadNextSong: boolean;
  defaultCrossfade: number;

  // Discovery
  trendingTimeWindow: number;
  recommendationCount: number;

  // Social
  allowGuestLikes: boolean;
  requireSignInForDownload: boolean;

  // Performance
  enableHapticFeedback: boolean;
  animationsEnabled: boolean;
  reduceMotion: boolean;

  // App Update
  minRequiredVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
  updateUrl: string;
}

const DEFAULT_CONFIG: Record<string, string | boolean | number> = {
  enableBetaFeatures: false,
  enableVisualizer: true,
  enableKaraokeMode: true,
  enableAiDj: true,
  enableSocialFeatures: true,
  enableLyrics: true,
  enableEffectsStudio: true,
  enableBeatGame: true,
  enableDownloads: true,
  enableSharing: true,

  maintenanceMode: false,
  maintenanceMessage: "We're upgrading Mwijay. Back soon! 🛠️",
  maintenanceEstimatedTime: '30 minutes',

  primaryColor: '',
  accentColor: '',
  customCssOverride: '',

  splashTitle: 'Mwijay',
  splashSubtitle: 'Your Music. Your Vibe.',
  welcomeMessage: 'Welcome back!',

  maxFreePlaylists: 50,
  maxFreeDownloads: 100,
  maxSongsPerPlaylist: 500,
  maxCollaborators: 10,

  showAnnouncement: false,
  announcementText: '',
  announcementColor: '#9333ea',
  announcementIcon: '📢',
  announcementActionText: 'Learn More',
  announcementActionUrl: '',
  announcementDismissible: true,

  preloadNextSong: true,
  defaultCrossfade: 3,

  trendingTimeWindow: 1,
  recommendationCount: 20,

  allowGuestLikes: false,
  requireSignInForDownload: true,

  enableHapticFeedback: true,
  animationsEnabled: true,
  reduceMotion: false,

  minRequiredVersion: '1.0.0',
  latestVersion: '1.0.0',
  forceUpdate: false,
  updateMessage: 'A new version is available!',
  updateUrl: 'https://play.google.com/store/apps/mwijay',
};

class RemoteConfigService {
  private configInstance: ReturnType<typeof getRemoteConfig> | null = null;
  private initialized = false;
  private listeners: Map<string, ((value: string) => void)[]> = new Map();

  private getInstance() {
    if (!this.configInstance) {
      try {
        this.configInstance = getRemoteConfig(getApp());
      } catch {
        return null;
      }
    }
    return this.configInstance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const rc = this.getInstance();
    if (!rc) return;

    const isDev = import.meta.env.DEV;
    rc.settings.minimumFetchIntervalMillis = isDev ? 5000 : 3600000;
    rc.defaultConfig = DEFAULT_CONFIG;

    try {
      await fetchAndActivate(rc);
      this.initialized = true;
      this.applyVisualConfig();
      this.notifyAllListeners();
    } catch (error) {
      console.warn('[RemoteConfig] Using defaults:', error);
      this.initialized = true; // still mark as done to use defaults
    }
  }

  getAll(): AppConfig {
    const rc = this.getInstance();
    if (!rc) return this.getDefaults();

    return {
      enableBetaFeatures: getBoolean(rc, 'enableBetaFeatures'),
      enableVisualizer: getBoolean(rc, 'enableVisualizer'),
      enableKaraokeMode: getBoolean(rc, 'enableKaraokeMode'),
      enableAiDj: getBoolean(rc, 'enableAiDj'),
      enableSocialFeatures: getBoolean(rc, 'enableSocialFeatures'),
      enableLyrics: getBoolean(rc, 'enableLyrics'),
      enableEffectsStudio: getBoolean(rc, 'enableEffectsStudio'),
      enableBeatGame: getBoolean(rc, 'enableBeatGame'),
      enableDownloads: getBoolean(rc, 'enableDownloads'),
      enableSharing: getBoolean(rc, 'enableSharing'),

      maintenanceMode: getBoolean(rc, 'maintenanceMode'),
      maintenanceMessage: getString(rc, 'maintenanceMessage'),
      maintenanceEstimatedTime: getString(rc, 'maintenanceEstimatedTime'),

      primaryColor: getString(rc, 'primaryColor'),
      accentColor: getString(rc, 'accentColor'),
      customCssOverride: getString(rc, 'customCssOverride'),

      splashTitle: getString(rc, 'splashTitle'),
      splashSubtitle: getString(rc, 'splashSubtitle'),
      welcomeMessage: getString(rc, 'welcomeMessage'),

      maxFreePlaylists: getNumber(rc, 'maxFreePlaylists'),
      maxFreeDownloads: getNumber(rc, 'maxFreeDownloads'),
      maxSongsPerPlaylist: getNumber(rc, 'maxSongsPerPlaylist'),
      maxCollaborators: getNumber(rc, 'maxCollaborators'),

      showAnnouncement: getBoolean(rc, 'showAnnouncement'),
      announcementText: getString(rc, 'announcementText'),
      announcementColor: getString(rc, 'announcementColor'),
      announcementIcon: getString(rc, 'announcementIcon'),
      announcementActionText: getString(rc, 'announcementActionText'),
      announcementActionUrl: getString(rc, 'announcementActionUrl'),
      announcementDismissible: getBoolean(rc, 'announcementDismissible'),

      preloadNextSong: getBoolean(rc, 'preloadNextSong'),
      defaultCrossfade: getNumber(rc, 'defaultCrossfade'),

      trendingTimeWindow: getNumber(rc, 'trendingTimeWindow'),
      recommendationCount: getNumber(rc, 'recommendationCount'),

      allowGuestLikes: getBoolean(rc, 'allowGuestLikes'),
      requireSignInForDownload: getBoolean(rc, 'requireSignInForDownload'),

      enableHapticFeedback: getBoolean(rc, 'enableHapticFeedback'),
      animationsEnabled: getBoolean(rc, 'animationsEnabled'),
      reduceMotion: getBoolean(rc, 'reduceMotion'),

      minRequiredVersion: getString(rc, 'minRequiredVersion'),
      latestVersion: getString(rc, 'latestVersion'),
      forceUpdate: getBoolean(rc, 'forceUpdate'),
      updateMessage: getString(rc, 'updateMessage'),
      updateUrl: getString(rc, 'updateUrl'),
    };
  }

  private getDefaults(): AppConfig {
    return Object.fromEntries(
      Object.entries(DEFAULT_CONFIG).map(([k, v]) => [k, v])
    ) as unknown as AppConfig;
  }

  isFeatureEnabled(feature: string): boolean {
    const rc = this.getInstance();
    if (!rc) return (DEFAULT_CONFIG[feature] as boolean) ?? true;
    return getBoolean(rc, feature);
  }

  getStringValue(key: string): string {
    const rc = this.getInstance();
    if (!rc) return String(DEFAULT_CONFIG[key] ?? '');
    return getString(rc, key);
  }

  getNumberValue(key: string): number {
    const rc = this.getInstance();
    if (!rc) return Number(DEFAULT_CONFIG[key] ?? 0);
    return getNumber(rc, key);
  }

  private applyVisualConfig(): void {
    const config = this.getAll();
    const root = document.documentElement;

    if (config.primaryColor) {
      root.style.setProperty('--primary-accent', config.primaryColor);
    }
    if (config.accentColor) {
      root.style.setProperty('--secondary-accent', config.accentColor);
    }

    if (config.customCssOverride) {
      let styleEl = document.getElementById('remote-css-override');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'remote-css-override';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = config.customCssOverride;
    }

    if (config.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }

  onConfigChange(key: string, callback: (value: string) => void): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key)!.push(callback);

    // Send current value immediately
    callback(this.getStringValue(key));

    return () => {
      const list = this.listeners.get(key);
      if (list) {
        const i = list.indexOf(callback);
        if (i > -1) list.splice(i, 1);
      }
    };
  }

  private notifyAllListeners(): void {
    this.listeners.forEach((cbs, key) => {
      const value = this.getStringValue(key);
      cbs.forEach(cb => cb(value));
    });
  }

  async refresh(): Promise<void> {
    const rc = this.getInstance();
    if (!rc) return;
    try {
      await fetchAndActivate(rc);
      this.applyVisualConfig();
      this.notifyAllListeners();
    } catch (error) {
      console.error('[RemoteConfig] Refresh failed:', error);
    }
  }

  isUpdateRequired(): boolean {
    const current = '1.0.0';
    const minRequired = this.getStringValue('minRequiredVersion');
    return this.compareVersions(current, minRequired) < 0;
  }

  hasNewVersion(): boolean {
    const current = '1.0.0';
    const latest = this.getStringValue('latestVersion');
    return this.compareVersions(current, latest) < 0;
  }

  private compareVersions(a: string, b: string): number {
    const ap = a.split('.').map(Number);
    const bp = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (ap[i] > bp[i]) return 1;
      if (ap[i] < bp[i]) return -1;
    }
    return 0;
  }
}

export const remoteConfig = new RemoteConfigService();
