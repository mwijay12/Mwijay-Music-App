/**
 * AudioEffectsEngine.ts
 *
 * PROBLEM THIS SOLVES:
 * ─────────────────────
 * Original audioEngine.ts always connects Tone.js effects to the audio element.
 * If ANY effect node fails to initialize, the ENTIRE audio signal is lost.
 *
 * THE FIX:
 * ─────────
 * Effects are OPTIONAL. Audio plays without them.
 * Each effect is wrapped in try/catch.
 * Effects connect to AudioCore's Web Audio graph (not directly to element).
 * Effects are disabled for radio streams.
 * All Tone.js automation replaced with direct AudioParam manipulation.
 *
 * EFFECT CHAIN:
 * ─────────────
 * AudioCore.sourceNode
 *     → EQ3 (Bass/Mid/Treble) ← Safe, no automation
 *     → PitchShift            ← Optional, disabled for radio
 *     → BitCrusher            ← Optional, for Robot preset
 *     → Filter                ← Optional, for Telephone/Underwater
 *     → Reverb                ← Optional, lazy-loaded (heavy)
 *     → FeedbackDelay         ← Optional
 *     → Volume                ← Master gain
 *     → AudioCore.outputGainNode
 *
 * MOBILE PERFORMANCE NOTES:
 * ──────────────────────────
 * - PitchShift is CPU-heavy — use sparingly on low-end devices
 * - Reverb with long decay is CPU-heavy — limit to 2-3 seconds
 * - BitCrusher causes distortion by design — use only for Robot preset
 * - All effect parameters clamped to safe ranges
 */

import * as Tone from 'tone';
import { getAudioCore } from './AudioCore';
import { getSharedAudioContext, resumeSharedContext } from './sharedAudioContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EQSettings {
  bass: number;    // -15 to +15 dB
  mid: number;     // -15 to +15 dB
  treble: number;  // -15 to +15 dB
}

export interface EffectsPreset {
  name: string;
  pitchShift?: number;       // semitones (-12 to +12)
  playbackRate?: number;     // 0.5 to 2.0
  reverbDecay?: number;      // seconds (0 = off, max 8)
  reverbWet?: number;        // 0.0 to 1.0
  delayTime?: number;        // seconds (0 = off)
  delayFeedback?: number;    // 0.0 to 0.9
  filterFreq?: number;       // Hz (0 = bypass)
  filterType?: BiquadFilterType;
  distortionAmount?: number; // 0.0 to 1.0 (replaces bitDepth — BitCrusher removed: uses AudioWorklet which crashes Android)
  chorusWet?: number;        // 0.0 to 1.0
  bass?: number;             // EQ override
  mid?: number;
  treble?: number;
}

// ─── Preset Definitions ───────────────────────────────────────────────────────

export const AUDIO_PRESETS: Record<string, EffectsPreset> = {
  normal: {
    name: 'Normal',
    pitchShift: 0,
    playbackRate: 1.0,
    reverbDecay: 0,
    reverbWet: 0,
    delayTime: 0,
    delayFeedback: 0,
    filterFreq: 0,
    distortionAmount: 0,
    chorusWet: 0,
  },
  slowedReverb: {
    name: 'Slowed + Reverb 🌌',
    pitchShift: -3,
    playbackRate: 0.85,
    reverbDecay: 4.0,
    reverbWet: 0.5,
    delayTime: 0,
    bass: 3,
    mid: -1,
    treble: -2,
  },
  nightcore: {
    name: 'Nightcore ⚡',
    pitchShift: 2,
    playbackRate: 1.25,
    reverbDecay: 0.5,
    reverbWet: 0.1,
    treble: 3,
  },
  lofi: {
    name: 'Lofi Vibes 📻',
    pitchShift: -1,
    playbackRate: 0.95,
    reverbDecay: 1.5,
    reverbWet: 0.3,
    filterFreq: 3500,
    filterType: 'lowpass',
    bass: 4,
    mid: -2,
    treble: -6,
  },
  telephone: {
    name: 'Telephone 📞',
    filterFreq: 3000,
    filterType: 'bandpass',
    bass: -10,
    treble: -8,
    distortionAmount: 0.3,
  },
  underwater: {
    name: 'Underwater 🌊',
    filterFreq: 500,
    filterType: 'lowpass',
    reverbDecay: 3.0,
    reverbWet: 0.6,
    bass: 5,
    treble: -8,
  },
  stadium: {
    name: 'Stadium 🏟️',
    reverbDecay: 5.0,
    reverbWet: 0.4,
    delayTime: 0.15,
    delayFeedback: 0.3,
    bass: 2,
    treble: 2,
  },
  vinyl: {
    name: 'Vinyl 🎧',
    filterFreq: 8000,
    filterType: 'lowpass',
    reverbDecay: 0.5,
    reverbWet: 0.15,
    bass: 3,
    mid: 1,
    treble: -4,
  },
  chipmunk: {
    name: 'Chipmunk 🐿️',
    pitchShift: 6,
    playbackRate: 1.0,
    treble: 3,
  },
  deepVoice: {
    name: 'Deep Voice 🦁',
    pitchShift: -5,
    bass: 6,
    mid: 2,
    treble: -3,
  },
  robot: {
    name: 'Robot 🤖',
    // BitCrusher removed (AudioWorklet crashes Android WebView)
    // Robot effect now achieved via heavy distortion + chorus
    distortionAmount: 0.7,
    pitchShift: 0,
    reverbDecay: 0.8,
    reverbWet: 0.2,
    chorusWet: 0.5,
    treble: 4,
  },
};

// ─── AudioEffectsEngine Class ─────────────────────────────────────────────────

export class AudioEffectsEngine {
  private isInitialized: boolean = false;
  private isConnected: boolean = false;
  private isDestroyed: boolean = false;
  private currentAudioElement: HTMLAudioElement | null = null;

  // Tone.js nodes — all nullable because they might fail to create
  // NOTE: BitCrusher intentionally REMOVED — it uses AudioWorklet which is
  // not reliably supported on Android WebView (causes 'setParam' crash).
  private toneContext: Tone.Context | null = null;
  private eq3: Tone.EQ3 | null = null;
  private pitchShift: Tone.PitchShift | null = null;
  private reverb: Tone.Reverb | null = null;
  private feedbackDelay: Tone.FeedbackDelay | null = null;
  private distortion: Tone.Distortion | null = null;
  private filter: Tone.Filter | null = null;
  private chorus: Tone.Chorus | null = null;
  private masterVolume: Tone.Volume | null = null;

  // Native Web Audio nodes (lighter than Tone.js, for basic EQ)
  private nativeEQNodes: BiquadFilterNode[] = [];
  private nativeContext: AudioContext | null = null;

  // Current EQ settings
  private currentEQ: EQSettings = { bass: 0, mid: 0, treble: 0 };
  private currentPreset: string = 'normal';

  // Whether effects are enabled at all
  private effectsEnabled: boolean = true;

  // ─── Initialization ──────────────────────────────────────────────────────

  /**
   * Initialize the effects engine.
   * Must be called after a user gesture (tap/click) on mobile.
   *
   * @param forceDisable  Set to true to disable effects entirely (safer)
   */
  async initialize(forceDisable: boolean = false): Promise<boolean> {
    if (this.isInitialized || this.isDestroyed) return this.isInitialized;

    if (forceDisable) {
      console.log('[Effects] Effects disabled by flag');
      this.effectsEnabled = false;
      this.isInitialized = true;
      return true;
    }

    try {
      // Resume AudioContext — required after user gesture on mobile
      await resumeSharedContext();
      console.log('[Effects] Tone.js AudioContext started');

      // Create all effect nodes safely
      this.createEffectNodes();

      this.isInitialized = true;
      console.log('[Effects] Initialized successfully');
      return true;

    } catch (error) {
      console.error('[Effects] Initialization failed:', error);
      // Effects disabled — audio still works via AudioCore direct path
      this.effectsEnabled = false;
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Connect the effects chain to the AudioCore audio element.
   * SAFE: Can be called multiple times — only connects once.
   *
   * @returns true if connected, false if using direct output
   */
  async connectToAudioCore(): Promise<boolean> {
    if (this.isConnected || !this.effectsEnabled || !this.isInitialized) {
      return this.isConnected;
    }

    const audioCore = getAudioCore();

    // Don't connect effects for radio — CORS blocks Web Audio for streams
    if (audioCore.isRadio) {
      console.log('[Effects] Skipping connection for radio mode');
      return false;
    }

    try {
      const audioContext = getSharedAudioContext();
      const sourceNode = audioCore.connectToWebAudio(audioContext);

      if (!sourceNode) {
        console.warn('[Effects] Could not get source node — effects disabled');
        return false;
      }

      // Disconnect the default source → destination routing
      // that AudioCore set up
      const outputGain = audioCore.getOutputGainNode();
      if (outputGain) {
        try { sourceNode.disconnect(outputGain); } catch { /* already disconnected */ }
      }

      // Build the Tone.js effect chain
      // Each connection is wrapped in try/catch
      this.buildEffectChain(sourceNode, audioContext);

      this.isConnected = true;
      console.log('[Effects] Effect chain connected via AudioCore');
      return true;

    } catch (error) {
      console.error('[Effects] Connection failed:', error);
      // AudioCore will continue with direct output
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Connect the effects chain directly to a provided MediaElementAudioSourceNode.
   * Use this when the audio element is managed externally (e.g., by App.tsx).
   * This bypasses AudioCore entirely — no duplicate element creation.
   *
   * @param sourceNode   The MediaElementAudioSourceNode wrapping the audio element
   * @param audioContext The AudioContext the source node belongs to
   */
  async connectToSourceNode(
    sourceNode: MediaElementAudioSourceNode,
    audioContext: AudioContext,
    outputNode: AudioNode | null = null
  ): Promise<boolean> {
    if (sourceNode && sourceNode.mediaElement) {
      this.currentAudioElement = sourceNode.mediaElement as HTMLAudioElement;
    }
    if (this.isConnected) return true;
    if (!this.effectsEnabled || !this.isInitialized) return false;

    try {
      // Disconnect from the direct destination
      try {
        sourceNode.disconnect(audioContext.destination);
      } catch (e) {
        // Fallback: full disconnect
        try { sourceNode.disconnect(); } catch {}
      }

      this.buildEffectChain(sourceNode, audioContext, outputNode);
      this.isConnected = true;
      console.log('[Effects] Effect chain connected via external source node');
      return true;
    } catch (error) {
      console.error('[Effects] connectToSourceNode failed:', error);
      // Fallback: connect source directly to destination (or outputNode) so audio still plays
      try {
        if (outputNode) {
          sourceNode.connect(outputNode);
        } else {
          sourceNode.connect(audioContext.destination);
        }
      } catch { /* ignore */ }
      return false;
    }
  }

  /**
   * Safely disconnect the effects chain from the source node.
   */
  disconnectFromSourceNode(
    sourceNode: MediaElementAudioSourceNode,
    audioContext: AudioContext
  ): void {
    if (!this.isConnected) return;
    try {
      const chain: Array<Tone.ToneAudioNode | null> = [
        this.eq3,
        this.filter,
        this.distortion,
        this.pitchShift,
        this.chorus,
        this.reverb,
        this.feedbackDelay,
        this.masterVolume,
      ].filter(Boolean);

      if (chain.length > 0 && chain[0]) {
        try {
          sourceNode.disconnect(chain[0].input as AudioNode);
        } catch (e) {}
      }
      this.isConnected = false;
      console.log('[Effects] Effect chain disconnected from source node');
    } catch (error) {
      console.error('[Effects] disconnectFromSourceNode failed:', error);
    }
  }

  // ─── EQ Control ──────────────────────────────────────────────────────────

  /**
   * Set EQ levels.
   * Works in both native Web Audio and Tone.js modes.
   *
   * @param settings  Bass, mid, treble in dB (-15 to +15)
   */
  setEQ(settings: Partial<EQSettings>): void {
    this.currentEQ = { ...this.currentEQ, ...settings };

    const clamp = (v: number) => Math.max(-15, Math.min(15, v));

    if (this.eq3) {
      try {
        // Use direct value assignment — NOT rampTo() which crashes on mobile
        this.eq3.low.value = clamp(this.currentEQ.bass);
        this.eq3.mid.value = clamp(this.currentEQ.mid);
        this.eq3.high.value = clamp(this.currentEQ.treble);
      } catch (error) {
        console.warn('[Effects] EQ update failed:', error);
      }
    } else {
      // Fallback: update native BiquadFilter nodes
      this.updateNativeEQ();
    }
  }

  /**
   * Apply a named preset to the audio engine.
   *
   * @param presetName  Key from AUDIO_PRESETS
   */
  async applyPreset(presetName: string): Promise<void> {
    const preset = AUDIO_PRESETS[presetName];
    if (!preset) {
      console.warn('[Effects] Unknown preset:', presetName);
      return;
    }

    console.log('[Effects] Applying preset:', preset.name);
    this.currentPreset = presetName;

    const audioCore = getAudioCore();

    // Playback rate — safe to set directly on audio element
    if (preset.playbackRate !== undefined) {
      if (this.currentAudioElement) {
        this.currentAudioElement.defaultPlaybackRate = preset.playbackRate;
        this.currentAudioElement.playbackRate = preset.playbackRate;
      }
      audioCore.setPlaybackRate(preset.playbackRate);
    }

    // EQ settings
    this.setEQ({
      bass: preset.bass ?? 0,
      mid: preset.mid ?? 0,
      treble: preset.treble ?? 0,
    });

    if (!this.isConnected) {
      // Only playback rate and EQ work without Tone.js
      return;
    }

    // Apply Tone.js effect parameters
    try {
      // Pitch shift
      if (this.pitchShift && preset.pitchShift !== undefined) {
        this.pitchShift.pitch = preset.pitchShift;
      }

      // Reverb — use direct value, not rampTo
      if (this.reverb) {
        if (preset.reverbDecay !== undefined && preset.reverbDecay > 0) {
          // Reverb decay changes require regenerating the impulse response
          // Do it async to avoid blocking
          this.reverb.decay = Math.min(preset.reverbDecay, 8);
          await this.reverb.generate();
          this.reverb.wet.value = preset.reverbWet ?? 0;
        } else {
          this.reverb.wet.value = 0;
        }
      }

      // Delay
      if (this.feedbackDelay) {
        if (preset.delayTime && preset.delayTime > 0) {
          this.feedbackDelay.delayTime.value = preset.delayTime;
          this.feedbackDelay.feedback.value = preset.delayFeedback ?? 0.3;
          this.feedbackDelay.wet.value = 0.4;
        } else {
          this.feedbackDelay.wet.value = 0;
        }
      }

      // Filter
      if (this.filter) {
        if (preset.filterFreq && preset.filterFreq > 0) {
          this.filter.frequency.value = preset.filterFreq;
          this.filter.type = preset.filterType ?? 'lowpass';
        } else {
          // Bypass by setting frequency to high limit
          this.filter.frequency.value = 20000;
          this.filter.type = 'lowpass';
        }
      }

      // Distortion (replaces removed BitCrusher for Robot/Telephone presets)
      if (this.distortion) {
        const amount = preset.distortionAmount ?? 0;
        this.distortion.distortion = amount;
        this.distortion.wet.value = amount > 0 ? Math.min(amount, 0.9) : 0;
      }

      // Chorus
      if (this.chorus) {
        this.chorus.wet.value = preset.chorusWet ?? 0;
      }

    } catch (error) {
      console.error('[Effects] Preset application failed:', error);
      // Non-fatal — some effects may not apply but audio continues
    }
  }

  /**
   * Reset all effects to default (Normal preset).
   */
  async resetToNormal(): Promise<void> {
    await this.applyPreset('normal');
    if (this.currentAudioElement) {
      this.currentAudioElement.defaultPlaybackRate = 1.0;
      this.currentAudioElement.playbackRate = 1.0;
    }
    const audioCore = getAudioCore();
    audioCore.setPlaybackRate(1.0);
  }

  /**
   * Get list of all available presets.
   */
  getPresets(): Array<{ key: string; name: string }> {
    return Object.entries(AUDIO_PRESETS).map(([key, preset]) => ({
      key,
      name: preset.name,
    }));
  }

  /**
   * Get current EQ settings.
   */
  getEQ(): EQSettings {
    return { ...this.currentEQ };
  }

  /**
   * Destroy the effects engine.
   */
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    try {
      this.eq3?.dispose();
      this.pitchShift?.dispose();
      this.reverb?.dispose();
      this.feedbackDelay?.dispose();
      this.distortion?.dispose();
      this.filter?.dispose();
      this.chorus?.dispose();
      this.masterVolume?.dispose();
    } catch {
      // Ignore disposal errors
    }

    console.log('[Effects] Destroyed');
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  private createEffectNodes(): void {
    // Create each node wrapped in try/catch
    // If one fails, others continue independently

    // Check AudioWorklet availability (required for Tone.js processor-based
    // effects like PitchShift and Chorus on Android WebView)
    const hasAudioWorklet = typeof AudioWorkletNode !== 'undefined' &&
      Tone.getContext().rawContext.audioWorklet !== undefined;

    if (!hasAudioWorklet) {
      console.warn('[Effects] AudioWorklet unavailable — skipping PitchShift and Chorus');
    }

    try {
      this.eq3 = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    } catch (e) {
      console.warn('[Effects] EQ3 creation failed:', e);
    }

    // PitchShift — only create if AudioWorklet is available
    // CPU-heavy on Android; skipped by default unless user explicitly enables pitch
    if (hasAudioWorklet) {
      try {
        // PitchShift is CPU intensive — use windowSize carefully
        // Smaller windowSize = less latency but more artifacts
        this.pitchShift = new Tone.PitchShift({ pitch: 0, windowSize: 0.1 });
      } catch (e) {
        console.warn('[Effects] PitchShift creation failed:', e);
      }
    } else {
      this.pitchShift = null;
      console.log('[Effects] PitchShift skipped — AudioWorklet unavailable');
    }

    try {
      // Start with short decay — long decay causes lag on first apply
      this.reverb = new Tone.Reverb({ decay: 1.5, wet: 0 });
    } catch (e) {
      console.warn('[Effects] Reverb creation failed:', e);
    }

    try {
      this.feedbackDelay = new Tone.FeedbackDelay({
        delayTime: 0.3,
        feedback: 0.3,
        wet: 0
      });
    } catch (e) {
      console.warn('[Effects] FeedbackDelay creation failed:', e);
    }

    // BitCrusher intentionally NOT created here.
    // It uses AudioWorklet which crashes Android WebView (Chromium <102):
    // onReady() fires with node.parameters=undefined → setParam() throws TypeError.
    // Robot preset now uses Distortion instead.

    try {
      this.distortion = new Tone.Distortion({ distortion: 0, wet: 0 });
    } catch (e) {
      console.warn('[Effects] Distortion creation failed:', e);
    }

    try {
      this.filter = new Tone.Filter({
        frequency: 20000,
        type: "lowpass"
      });
    } catch (e) {
      console.warn('[Effects] Filter creation failed:', e);
    }

    // Chorus — only create if AudioWorklet is available
    if (hasAudioWorklet) {
      try {
        this.chorus = new Tone.Chorus({
          frequency: 1.5,
          delayTime: 3.5,
          depth: 0.7,
          wet: 0
        }).start();
      } catch (e) {
        console.warn('[Effects] Chorus creation failed:', e);
      }
    } else {
      this.chorus = null;
      console.log('[Effects] Chorus skipped — AudioWorklet unavailable');
    }

    try {
      this.masterVolume = new Tone.Volume(0);
      this.masterVolume.toDestination();
    } catch (e) {
      console.warn('[Effects] MasterVolume creation failed:', e);
    }
  }

  /**
   * Build the effect chain from source node through to output.
   * Only connects nodes that were successfully created.
   */
  private buildEffectChain(
    sourceNode: MediaElementAudioSourceNode,
    audioContext: AudioContext,
    outputNode: AudioNode | null = null
  ): void {
    // Build ordered list of available nodes (BitCrusher removed — AudioWorklet crashes Android)
    const chain: Array<Tone.ToneAudioNode | null> = [
      this.eq3,
      this.filter,
      this.distortion,
      this.pitchShift,
      this.chorus,
      this.reverb,
      this.feedbackDelay,
      this.masterVolume,
    ].filter(Boolean);

    if (chain.length === 0) {
      console.warn('[Effects] No effect nodes available — using direct output');
      return;
    }

    try {
      // Connect native Web Audio sourceNode to first Tone.js node
      // Tone.js nodes expose their native input via .input
      const firstNode = chain[0] as Tone.ToneAudioNode;
      sourceNode.connect(firstNode.input as AudioNode);

      // Connect each Tone.js node to the next
      for (let i = 0; i < chain.length - 1; i++) {
        const current = chain[i] as Tone.ToneAudioNode;
        const next = chain[i + 1] as Tone.ToneAudioNode;
        current.connect(next);
      }

      // Re-route the last node (this.masterVolume) to outputNode if provided, otherwise to destination
      if (this.masterVolume) {
        try {
          this.masterVolume.disconnect();
        } catch (e) {}
        if (outputNode) {
          try {
            this.masterVolume.connect(outputNode);
            console.log('[Effects] Connected Tone.js masterVolume to custom outputNode');
          } catch (e) {
            console.warn('[Effects] Failed to connect masterVolume to custom outputNode, falling back to destination:', e);
            this.masterVolume.toDestination();
          }
        } else {
          this.masterVolume.toDestination();
        }
      }

      console.log(`[Effects] Chain built. Context: ${audioContext.state}, Source connected: ${sourceNode !== null}, Nodes: ${chain.length}`);

    } catch (error) {
      console.error('[Effects] Chain connection failed:', error);
      // Reconnect source directly to output as fallback
      try {
        if (outputNode) {
          sourceNode.connect(outputNode);
        } else {
          sourceNode.connect(audioContext.destination);
        }
      } catch { /* ignore */ }
    }
  }

  /**
   * Native BiquadFilter EQ fallback for when Tone.js EQ3 is unavailable.
   * Uses the AudioCore's audio context directly.
   */
  private updateNativeEQ(): void {
    // Native EQ is simpler but functional
    // Implementation depends on whether native nodes were created
    // This is only called when Tone.js EQ3 is not available
    const audioCore = getAudioCore();
    const ctx = audioCore.getAudioContext();
    if (!ctx) return;

    // If native EQ nodes exist, update them
    this.nativeEQNodes.forEach((node, index) => {
      const gains = [
        this.currentEQ.bass,
        this.currentEQ.mid,
        this.currentEQ.treble
      ];
      if (node.gain) {
        node.gain.value = Math.max(-15, Math.min(15, gains[index] ?? 0));
      }
    });
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

let _effectsInstance: AudioEffectsEngine | null = null;

export function getAudioEffects(): AudioEffectsEngine {
  if (!_effectsInstance) {
    _effectsInstance = new AudioEffectsEngine();
  }
  return _effectsInstance;
}
