import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { quotesService } from './quotesService.ts';
import { getFromStore, saveToStore } from '../components/db.ts';

export interface NotificationSettings {
  dailyQuote: boolean;        // Quote every morning
  quoteTime: string;          // "08:00" format
  enabled: boolean;           // Master switch
}

const SETTINGS_STORE = 'notification_settings';
const SETTINGS_KEY = 'settings';
const DAILY_QUOTE_ID = 1001;

const defaultSettings: NotificationSettings = {
  dailyQuote: false,
  quoteTime: "08:00",
  enabled: false,
};

class NotificationService {
  /**
   * Request notification permission from Android/iOS.
   * Persists granted state or preferences to IndexedDB.
   */
  public async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Notification Service: Mocking permission request on web.');
      return true;
    }

    try {
      const status = await LocalNotifications.requestPermissions();
      const isGranted = status.display === 'granted';
      
      // Update settings master switch if permitted
      const current = await this.getSettings();
      await this.saveSettings({
        ...current,
        enabled: isGranted,
      });

      return isGranted;
    } catch (e) {
      console.error('Failed to request notification permissions:', e);
      return false;
    }
  }

  /**
   * Schedule a repeating daily notification containing a local music quote.
   */
  public async scheduleDailyQuote(time: string): Promise<void> {
    // 1. Cancel previous instances
    await this.cancelDailyQuote();

    const quote = quotesService.getQuoteForNotification();
    const cleanText = quote.text.length > 100 ? quote.text.slice(0, 97) + '...' : quote.text;
    
    // Parse time ("HH:MM")
    let hour = 8;
    let minute = 0;
    try {
      const parts = time.split(':');
      if (parts.length === 2) {
        hour = parseInt(parts[0], 10);
        minute = parseInt(parts[1], 10);
      }
    } catch (e) {
      console.warn("Invalid time format for quote schedule, defaulting to 08:00");
    }

    if (!Capacitor.isNativePlatform()) {
      console.log(`[Web Mock] Scheduled daily quote at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}! Content: "${cleanText}" — ${quote.author}`);
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: DAILY_QUOTE_ID,
          title: "Quote of the Day 🎵",
          body: `"${cleanText}" — ${quote.author}`,
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: undefined,
          smallIcon: 'ic_notification',
          iconColor: '#9333ea',
        }]
      });
      console.log(`Successfully scheduled daily quote notification at ${hour}:${minute}`);
    } catch (e) {
      console.error('Failed to schedule daily quote notification:', e);
    }
  }

  /**
   * Cancel the daily repeating quote notification.
   */
  public async cancelDailyQuote(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Web Mock] Cancelled daily quote notification.');
      return;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: DAILY_QUOTE_ID }]
      });
      console.log('Daily quote notification cancelled.');
    } catch (e) {
      console.error('Failed to cancel daily quote notification:', e);
    }
  }

  /**
   * Persist user notification preferences in IndexedDB and apply schedule logic.
   */
  public async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await saveToStore(SETTINGS_STORE, { id: SETTINGS_KEY, ...settings });
      
      // Actively apply schedules
      if (settings.enabled && settings.dailyQuote) {
        await this.scheduleDailyQuote(settings.quoteTime);
      } else {
        await this.cancelDailyQuote();
      }
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    }
  }

  /**
   * Load notification preferences from IndexedDB, falling back to defaults.
   */
  public async getSettings(): Promise<NotificationSettings> {
    try {
      const stored = await getFromStore(SETTINGS_STORE, SETTINGS_KEY);
      if (stored) {
        return {
          dailyQuote: stored.dailyQuote ?? defaultSettings.dailyQuote,
          quoteTime: stored.quoteTime ?? defaultSettings.quoteTime,
          enabled: stored.enabled ?? defaultSettings.enabled,
        };
      }
    } catch (e) {
      console.warn("Failed to load settings from IndexedDB, returning default:", e);
    }
    return defaultSettings;
  }

  /**
   * Trigger an instantaneous test notification containing a random local quote.
   */
  public async sendTestNotification(): Promise<void> {
    const quote = quotesService.getQuoteForNotification();
    const cleanText = quote.text.length > 100 ? quote.text.slice(0, 97) + '...' : quote.text;

    if (!Capacitor.isNativePlatform()) {
      alert(`[Web Notification Test]\nTitle: Notifications are working! 🎵\nBody: "${cleanText}" — ${quote.author}`);
      return;
    }

    try {
      const testId = Math.floor(Math.random() * 100000);
      await LocalNotifications.schedule({
        notifications: [{
          id: testId,
          title: "Notifications are working! 🎵",
          body: `"${cleanText}" — ${quote.author}`,
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay
          sound: undefined,
          smallIcon: 'ic_notification',
          iconColor: '#9333ea',
        }]
      });
      console.log('Immediate test notification fired.');
    } catch (e) {
      console.error('Failed to send test notification:', e);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
