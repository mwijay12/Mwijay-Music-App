export type AppPlatform = 'web' | 'android' | 'electron';

export function getPlatform(): AppPlatform {
  if (typeof window !== 'undefined' &&
    (window as any).electronAPI?.isElectron) {
    return 'electron';
  }

  if (typeof window !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.()) {
    return 'android';
  }

  return 'web';
}

export const isElectron = getPlatform() === 'electron';
export const isAndroid = getPlatform() === 'android';
export const isWeb = getPlatform() === 'web';
export const isDesktop = getPlatform() === 'electron';
export const isMobile = getPlatform() === 'android';
export const isNative = isElectron || isAndroid;

export function getPlatformName(): string {
  switch (getPlatform()) {
    case 'electron': return 'Windows';
    case 'android': return 'Android';
    default: return 'Web';
  }
}

export function getElectronAPI() {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI ?? null;
}
