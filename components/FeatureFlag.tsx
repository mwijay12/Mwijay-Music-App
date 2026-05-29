import React from 'react';
import { useFeatureFlag } from '../hooks/useRemoteConfig.ts';
import type { AppConfig } from '../services/remoteConfigService.ts';

interface FeatureFlagProps {
  feature: keyof AppConfig;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children based on Remote Config feature flag.
 * Falls back to `fallback` (default: null) when disabled.
 * 
 * Usage:
 *   <FeatureFlag feature="enableKaraokeMode">
 *     <KaraokeButton />
 *   </FeatureFlag>
 */
export const FeatureFlag: React.FC<FeatureFlagProps> = ({ feature, fallback = null, children }) => {
  const enabled = useFeatureFlag(feature);
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
};

export default FeatureFlag;
