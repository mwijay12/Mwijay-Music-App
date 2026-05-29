import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import { Capacitor } from '@capacitor/core';

export interface Breadcrumb {
  timestamp: number;
  category: 'navigation' | 'action' | 'error' | 'network';
  message: string;
  data?: Record<string, unknown>;
}

export interface CrashReport {
  id?: string;
  userId: string | null;
  userEmail: string | null;
  error: {
    name: string;
    message: string;
    stack: string;
  };
  context: {
    url: string;
    component: string;
    action: string;
    userAgent: string;
    platform: string;
    appVersion: string;
    timestamp: unknown;
  };
  breadcrumbs: Breadcrumb[];
  deviceInfo: {
    online: boolean;
    memory?: number;
    connection?: string;
  };
}

class CrashReportService {
  private breadcrumbs: Breadcrumb[] = [];
  private readonly maxBreadcrumbs = 50;

  async reportCrash(error: Error, context: Partial<CrashReport['context']> = {}): Promise<void> {
    try {
      const user = auth.currentUser;

      const report: Omit<CrashReport, 'id'> = {
        userId: user?.uid || null,
        userEmail: user?.email || null,
        error: {
          name: error.name,
          message: error.message,
          stack: (error.stack || '').substring(0, 2000),
        },
        context: {
          url: window.location.href,
          component: context.component || 'unknown',
          action: context.action || 'unknown',
          userAgent: navigator.userAgent,
          platform: Capacitor.getPlatform(),
          appVersion: '1.0.0',
          timestamp: serverTimestamp(),
        },
        breadcrumbs: this.breadcrumbs.slice(-20),
        deviceInfo: {
          online: navigator.onLine,
          memory: (navigator as unknown as Record<string, unknown>).deviceMemory as number | undefined,
          connection: ((navigator as unknown as Record<string, unknown>).connection as Record<string, string> | undefined)?.effectiveType,
        },
      };

      await addDoc(collection(db, 'crash_reports'), report);
    } catch {
      // Never let crash reporting itself crash the app
    }
  }

  addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({ ...crumb, timestamp: Date.now() });
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  trackNavigation(from: string, to: string): void {
    this.addBreadcrumb({ category: 'navigation', message: `${from} → ${to}` });
  }

  trackAction(action: string, data?: Record<string, unknown>): void {
    this.addBreadcrumb({ category: 'action', message: action, data });
  }

  trackNetworkRequest(url: string, method: string, status?: number): void {
    this.addBreadcrumb({ category: 'network', message: `${method} ${url}`, data: { status } });
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  // Admin: fetch recent crash reports
  async fetchRecentReports(count = 50): Promise<CrashReport[]> {
    try {
      const q = query(
        collection(db, 'crash_reports'),
        orderBy('context.timestamp', 'desc'),
        limit(count)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as CrashReport));
    } catch {
      return [];
    }
  }
}

export const crashReporter = new CrashReportService();

// Auto-hook global errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (e.error) {
      crashReporter.addBreadcrumb({ category: 'error', message: e.message });
      crashReporter.reportCrash(e.error, { component: 'global', action: 'window.error' });
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const err = new Error(String(e.reason));
    crashReporter.addBreadcrumb({ category: 'error', message: err.message });
    crashReporter.reportCrash(err, { component: 'global', action: 'unhandled_rejection' });
  });
}
