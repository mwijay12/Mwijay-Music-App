/**
 * AudioFader.ts
 *
 * PROBLEM THIS SOLVES:
 * ─────────────────────
 * Tone.js uses Web Audio API GainNode.gain.rampTo() for fades.
 * On Android WebView (Capacitor), audio context scheduling is
 * unreliable — rampTo() with future timestamps causes:
 * 1. AudioContext suspension → complete silence
 * 2. GainNode parameter conflicts → distortion then silence
 * 3. Uncaught promise rejections → React state corruption
 *
 * THE FIX:
 * ─────────
 * Use native HTMLAudioElement.volume property + setInterval.
 * This works on EVERY browser, EVERY Android version, ZERO crashes.
 * The volume property accepts 0.0 to 1.0 and is always safe to set.
 *
 * USAGE:
 * ───────
 * const fader = new AudioFader(audioElement);
 * await fader.fadeIn(800);   // Fade in over 800ms
 * await fader.fadeOut(600);  // Fade out over 600ms
 * fader.cancel();             // Stop any active fade instantly
 */

export class AudioFader {
  private audio: HTMLAudioElement;
  private activeIntervalId: number | null = null;
  private activeReject: ((reason?: unknown) => void) | null = null;

  // Target volume ceiling — respects user's volume setting
  // Default 1.0 but can be set lower for crossfade scenarios
  public targetMaxVolume: number = 1.0;

  constructor(audio: HTMLAudioElement) {
    this.audio = audio;
  }

  /**
   * Fade audio IN from 0 to targetMaxVolume.
   *
   * @param durationMs  Total fade duration in milliseconds
   * @returns Promise that resolves when fade completes
   */
  fadeIn(durationMs: number = 800): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any active fade before starting new one
      this.cancel();

      // Start from silence
      this.audio.volume = 0;

      // If duration is too short, just snap to full volume
      if (durationMs < 50) {
        this.audio.volume = this.targetMaxVolume;
        resolve();
        return;
      }

      // Calculate step size and interval
      // We want ~30 steps per second for smooth fade
      const intervalMs = Math.max(16, durationMs / 30); // min 16ms (~60fps)
      const stepSize = this.targetMaxVolume / (durationMs / intervalMs);

      this.activeReject = reject;

      this.activeIntervalId = window.setInterval(() => {
        const newVolume = Math.min(
          this.audio.volume + stepSize,
          this.targetMaxVolume
        );
        this.audio.volume = newVolume;

        if (newVolume >= this.targetMaxVolume) {
          this.clearInterval();
          resolve();
        }
      }, intervalMs);
    });
  }

  /**
   * Fade audio OUT from current volume to 0.
   *
   * @param durationMs  Total fade duration in milliseconds
   * @returns Promise that resolves when fade completes (volume = 0)
   */
  fadeOut(durationMs: number = 600): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any active fade before starting new one
      this.cancel();

      const startVolume = this.audio.volume;

      // If already silent or duration too short, snap to 0
      if (startVolume <= 0.01 || durationMs < 50) {
        this.audio.volume = 0;
        resolve();
        return;
      }

      const intervalMs = Math.max(16, durationMs / 30);
      const stepSize = startVolume / (durationMs / intervalMs);

      this.activeReject = reject;

      this.activeIntervalId = window.setInterval(() => {
        const newVolume = Math.max(this.audio.volume - stepSize, 0);
        this.audio.volume = newVolume;

        if (newVolume <= 0.001) {
          this.audio.volume = 0;
          this.clearInterval();
          resolve();
        }
      }, intervalMs);
    });
  }

  /**
   * Fade from current volume to a specific target volume.
   * Used for crossfades and ducking effects.
   *
   * @param targetVolume  0.0 to 1.0
   * @param durationMs    Duration in milliseconds
   */
  fadeTo(targetVolume: number, durationMs: number = 500): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cancel();

      const safeTarget = Math.max(0, Math.min(1, targetVolume));
      const startVolume = this.audio.volume;
      const diff = safeTarget - startVolume;

      if (Math.abs(diff) < 0.01 || durationMs < 50) {
        this.audio.volume = safeTarget;
        resolve();
        return;
      }

      const intervalMs = Math.max(16, durationMs / 30);
      const stepSize = diff / (durationMs / intervalMs);

      this.activeReject = reject;

      this.activeIntervalId = window.setInterval(() => {
        const currentDiff = safeTarget - this.audio.volume;

        // Check if we've crossed or reached the target
        if (
          (stepSize > 0 && this.audio.volume >= safeTarget) ||
          (stepSize < 0 && this.audio.volume <= safeTarget)
        ) {
          this.audio.volume = safeTarget;
          this.clearInterval();
          resolve();
          return;
        }

        this.audio.volume = Math.max(0, Math.min(1, this.audio.volume + stepSize));
      }, intervalMs);
    });
  }

  /**
   * Cancel any active fade and maintain current volume.
   * Safe to call even if no fade is active.
   */
  cancel(): void {
    if (this.activeIntervalId !== null) {
      clearInterval(this.activeIntervalId);
      this.activeIntervalId = null;
    }
    if (this.activeReject) {
      // Resolve (not reject) so callers don't need catch() for cancellation
      this.activeReject = null;
    }
  }

  /**
   * Cancel fade and immediately snap to full volume.
   */
  snapToFull(): void {
    this.cancel();
    this.audio.volume = this.targetMaxVolume;
  }

  /**
   * Cancel fade and immediately snap to silence.
   */
  snapToSilence(): void {
    this.cancel();
    this.audio.volume = 0;
  }

  private clearInterval(): void {
    if (this.activeIntervalId !== null) {
      clearInterval(this.activeIntervalId);
      this.activeIntervalId = null;
    }
    this.activeReject = null;
  }

  /**
   * Destroy the fader — call when the audio element is removed.
   */
  destroy(): void {
    this.cancel();
  }
}
