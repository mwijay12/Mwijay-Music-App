import { useState, useEffect, useCallback } from 'react';
import { remoteConfig, type AppConfig } from '../services/remoteConfigService.ts';

export function useRemoteConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    await remoteConfig.refresh();
    setConfig(remoteConfig.getAll());
  }, []);

  useEffect(() => {
    remoteConfig.initialize().then(() => {
      setConfig(remoteConfig.getAll());
      setLoading(false);
    });

    const interval = setInterval(() => {
      remoteConfig.refresh().then(() => setConfig(remoteConfig.getAll()));
    }, 1800000); // refresh every 30 min

    return () => clearInterval(interval);
  }, []);

  return { config, loading, refresh };
}

export function useFeatureFlag(feature: keyof AppConfig): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    return remoteConfig.isFeatureEnabled(feature as string);
  });

  useEffect(() => {
    const unsub = remoteConfig.onConfigChange(feature as string, (value) => {
      setEnabled(value === 'true' || value === '1');
    });
    return unsub;
  }, [feature]);

  return enabled;
}
