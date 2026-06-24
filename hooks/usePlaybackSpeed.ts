import { useState, useCallback } from 'react';
import { SPEED_PRESETS, DEFAULT_SPEED, MIN_SPEED, MAX_SPEED } from '../constants';
import type { SpeedPreset } from '../types';
import { audioEngine } from '../services/audioEngine';

export interface UsePlaybackSpeedReturn {
  speed: number;
  setSpeed: (rate: number) => void;
  presets: SpeedPreset[];
  isPitchPreserved: boolean;
  togglePitch: (enabled: boolean) => void;
  resetSpeed: () => void;
  currentPreset: SpeedPreset | null;
  isModified: boolean;
}

export function usePlaybackSpeed(): UsePlaybackSpeedReturn {
  const [speed, setSpeedState] = useState<number>(() => {
    return audioEngine.playbackSpeed ?? DEFAULT_SPEED;
  });

  const [isPitchPreserved, setIsPitchPreserved] = useState<boolean>(() => {
    return audioEngine.isPitchPreserved ?? true;
  });

  const setSpeed = useCallback((rate: number) => {
    const clamped = Math.min(Math.max(rate, MIN_SPEED), MAX_SPEED);
    audioEngine.setPlaybackSpeed(clamped);
    setSpeedState(clamped);
  }, []);

  const togglePitch = useCallback((enabled: boolean) => {
    audioEngine.togglePitchPreservation(enabled);
    setIsPitchPreserved(enabled);
  }, []);

  const resetSpeed = useCallback(() => {
    setSpeed(DEFAULT_SPEED);
  }, [setSpeed]);

  const currentPreset = SPEED_PRESETS.find(
    p => Math.abs(p.rate - speed) < 0.01
  ) ?? null;

  const isModified = Math.abs(speed - DEFAULT_SPEED) > 0.01;

  return {
    speed,
    setSpeed,
    presets: SPEED_PRESETS,
    isPitchPreserved,
    togglePitch,
    resetSpeed,
    currentPreset,
    isModified,
  };
}