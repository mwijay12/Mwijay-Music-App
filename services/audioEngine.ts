/**
 * audioEngine.ts — Backward-Compatible Wrapper
 *
 * ARCHITECTURE SUMMARY:
 * ─────────────────────
 * This file is the SINGLE PUBLIC API for audio effects and playback state.
 * All existing call sites (App.tsx, components) continue to use:
 *
 *   audioEngine.init(audioElement)
 *   audioEngine.setEqualizer(bass, mid, treble)
 *   audioEngine.setPitch(semitones)
 *   audioEngine.applyPreset('slowed_reverb')
 *   audioEngine.setSpeed(0.85)
 *   audioEngine.setNextNode(analyserNode)
 *   audioEngine.resumeContext()
 *   audioEngine.currentSong / audioEngine.isPlaying
 *
 * Internally, these calls are delegated to:
 *   - AudioCore   → HTMLAudioElement lifecycle, safe fades
 *   - AudioEffectsEngine → Tone.js DSP chain (EQ, pitch, reverb, etc.)
 *
 * THE GOLDEN RULE:
 * ─────────────────
 * The HTMLAudioElement is the source of truth.
 * Tone.js effects are optional — audio works without them.
 * NEVER use rampTo() or GainNode automation — use AudioFader instead.
 */

import * as Tone from 'tone';
import { Capacitor } from '@capacitor/core';
import { getAudioCore } from './AudioCore';
import { getAudioEffects } from './AudioEffectsEngine';
import { MIN_SPEED, MAX_SPEED, DEFAULT_SPEED } from '../constants';
import { getSharedAudioContext, resumeSharedContext } from './sharedAudioContext';

// Longer delay on Android to avoid WebView AudioWorklet race
const EFFECTS_INIT_DELAY_MS = Capacitor.isNativePlatform() ? 2500 : 1500;

// ─── Re-export public types ────────────────────────────────────────────────────

export interface AudioEngineSettings {
  bass: number;     // -10 to +10 dB
  mid: number;      // -10 to +10 dB
  treble: number;   // -10 to +10 dB
  preset: string;   // 'none', 'lofi', 'slowed_reverb', 'nightcore', etc.
  pitch: number;    // pitch shift semitones (-12 to +12)
  speed: number;    // playback rate (0.5 to 2.0)
}

// ─── Pristine connect helper (unchanged from original) ────────────────────────

let pristineConnect: any = null;

const getPristineConnect = () => {
  if (pristineConnect) return pristineConnect;
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    if (iframe.contentWindow && (iframe.contentWindow as any).AudioNode) {
      pristineConnect = (iframe.contentWindow as any).AudioNode.prototype.connect;
    }
    document.body.removeChild(iframe);
  } catch (e) {
    console.warn('[AudioEngine] Failed to retrieve pristine connect:', e);
  }
  if (!pristineConnect) {
    pristineConnect = AudioNode.prototype.connect;
  }
  return pristineConnect;
};

// ─── MwijayAudioEngine — backward-compatible wrapper ─────────────────────────

class MwijayAudioEngine {
  // ── Internal state ──────────────────────────────────────────────────────────
  private audioElement: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private hasConnectedSource: boolean = false;
  private isInitialized: boolean = false;
  private _playbackSpeed: number = DEFAULT_SPEED;
  private _isPitchPreserved: boolean = true;
  private _isRadioMode: boolean = false;

  private nextNode: AudioNode | null = null;
  private analyserTap: AudioNode | null = null;

  private static toneStarted = false;

  // Deferred init: element waiting for AudioContext to be running
  private _pendingAudioElement: HTMLAudioElement | null = null;

  // ── Global playback state (used by SimpleMode and other views) ───────────────
  public currentSong: any = null;
  public isPlaying = false;

  public setCurrentSong(song: any) {
    this.currentSong = song;
    window.dispatchEvent(new CustomEvent('mwijay-audio-state'));
  }

  public setIsPlaying(playing: boolean) {
    this.isPlaying = playing;
    window.dispatchEvent(new CustomEvent('mwijay-audio-state'));
  }

  // ── Speed / Pitch getters ──────────────────────────────────────────────────
  get playbackSpeed(): number {
    return this._playbackSpeed;
  }

  get isPitchPreserved(): boolean {
    return this._isPitchPreserved;
  }

  // ── Metronome (delegated to Tone.js directly — not audio-critical) ───────────
  private metronomeSynth: Tone.Synth | null = null;
  private metronomeLoop: Tone.Loop | null = null;

  // ── Bass/volume state for legacy combined setEqualizer() calls ───────────────
  private bassBoostVal = 0;
  private bassEqVal = 0;

  constructor() {
    // Load persisted speed preferences
    this.loadSpeedPreferences();

    // Register user-gesture listeners to unblock AudioContext early
    if (typeof window !== 'undefined') {
      const startTone = () => {
        if (MwijayAudioEngine.toneStarted) return;
        MwijayAudioEngine.toneStarted = true;
        Tone.start().catch(() => {});
        document.removeEventListener('click', startTone);
        document.removeEventListener('touchstart', startTone);
        document.removeEventListener('keydown', startTone);
      };
      document.addEventListener('click', startTone, { passive: true });
      document.addEventListener('touchstart', startTone, { passive: true });
      document.addEventListener('keydown', startTone, { passive: true });
    }
  }

  // ─── init() ─────────────────────────────────────────────────────────────────

  /**
   * Connect an HTMLAudioElement to the Web Audio + effects graph.
   *
   * SAFE: Only connects MediaElementAudioSourceNode ONCE per element.
   * Reuses the existing source node if already created.
   *
   * This mirrors the original audioEngine.init() signature exactly
   * so existing call sites (App.tsx) require NO changes.
   */
  public init(audio: HTMLAudioElement) {
    if (this.isInitialized && this.audioElement === audio) return;

    this.audioElement = audio;

    // Skip Web Audio init for elements without crossOrigin.
    // CORS-restricted sources (Cloudinary, etc.) would be silenced
    // by MediaElementAudioSourceNode — better to play directly.
    if (!audio.crossOrigin) {
      console.log('[AudioEngine] Skipping init — no crossOrigin, audio plays directly');
      return;
    }

    try {
      // CRITICAL: Only create MediaElementAudioSourceNode AFTER context is running.
      // Creating it on a suspended context HIJACKS the audio element but routes
      // through a dead graph → permanent silence until next page reload.
      const ctx = getSharedAudioContext();

      if (ctx.state !== 'running') {
        // Defer node creation — audio plays directly to speakers for now.
        // init() will be called again when context resumes (triggered by
        // nowPlaying.id change in the settings sync effect).
        this._pendingAudioElement = audio;
        console.log('[AudioEngine] Context not running — deferring MediaElementSourceNode creation. State:', ctx.state);
        return;
      }

      this._createNodeAndConnect(audio, ctx);

      // Initialize effects engine in background (non-blocking)
      this.initEffectsAsync(ctx, this.mediaSource!);
      console.log('[AudioEngine] Initialized — audio element connected.');
    } catch (error) {
      // Non-fatal: audio still plays directly through the element
      console.warn('[AudioEngine] Web Audio init failed — playing directly:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Create MediaElementAudioSourceNode and connect it to the audio graph.
   * Only call this when AudioContext is in 'running' state.
   */
  private _createNodeAndConnect(audio: HTMLAudioElement, ctx: AudioContext): void {
    // CRITICAL: Reuse or create the ONE MediaElementAudioSourceNode.
    // Web Audio only allows ONE per element — never recreate it.
    let sourceNode: MediaElementAudioSourceNode = (audio as any)._mediaElementSource;
    if (!sourceNode) {
      sourceNode = ctx.createMediaElementSource(audio);
      (audio as any)._mediaElementSource = sourceNode;
    }
    this.mediaSource = sourceNode;
    this.isInitialized = true;
    this._pendingAudioElement = null;

    // Apply persisted speed to new audio element (not for radio)
    if (!this._isRadioMode) {
      audio.playbackRate = this._playbackSpeed;
      this._applyPitchPreservation(audio);
    }

    // Connect immediately to nextNode (preamp) or destination
    try {
      if (this.nextNode) {
        sourceNode.connect(this.nextNode);
        console.log('[AudioEngine] Connected sourceNode to nextNode (preamp) in init.');
      } else {
        sourceNode.connect(ctx.destination);
        console.log('[AudioEngine] Connected sourceNode directly to destination in init.');
      }
    } catch (e) {}

    // Resume context (suspended until user gesture in browser)
    ctx.resume().catch(() => {});
  }

  private isBypassed: boolean = false;

  public setBypass(bypass: boolean) {
    if (this.isBypassed === bypass) return;
    this.isBypassed = bypass;

    if (!this.isInitialized || !this.mediaSource) return;

    try {
      const rawContext = Tone.getContext().rawContext as AudioContext;
      const effects = getAudioEffects();

      if (bypass) {
        console.log('[AudioEngine] Bypassing effects chain — connecting direct');
        effects.disconnectFromSourceNode(this.mediaSource, rawContext);
        try {
          this.mediaSource.disconnect();
        } catch (e) {}
        this.reconnectAnalyserTap();
        try {
          if (this.nextNode) {
            this.mediaSource.connect(this.nextNode);
            console.log('[AudioEngine] Connected mediaSource to nextNode (preamp) on bypass');
          } else {
            this.mediaSource.connect(rawContext.destination);
            console.log('[AudioEngine] Connected mediaSource directly to destination on bypass');
          }
        } catch (e) {}
      } else {
        console.log('[AudioEngine] Re-enabling effects chain');
        // Safely reconnect the effects chain
        this.initEffectsAsync(rawContext, this.mediaSource);
      }
    } catch (error) {
      console.warn('[AudioEngine] setBypass failed:', error);
    }
  }

  private async initEffectsAsync(
    rawContext: AudioContext,
    sourceNode: MediaElementAudioSourceNode
  ) {
    try {
      // ANDROID GLITCH FIX: Delay effects init by platform-aware timeout.
      // Android WebView needs more time to stabilize the audio pipeline
      // before inserting the effects chain to avoid audio thread stalls.
      // Platform delay: Android=2500ms, Web=1500ms (EFFECTS_INIT_DELAY_MS)
      await new Promise(resolve => setTimeout(resolve, EFFECTS_INIT_DELAY_MS));

      // Guard: if audio element changed during delay, abort
      // The new init() call will handle the new source
      if (this.audioElement !== sourceNode.mediaElement) {
        console.log('[AudioEngine] Source changed during delay — aborting stale chain build');
        return;
      }

      // Guard: if context is not running, try to resume first
      const rawCtxState = rawContext.state;
      if (rawCtxState === 'suspended') {
        try {
          await rawContext.resume();
          console.log('[AudioEngine] Context resumed before chain build');
        } catch (e) {
          console.warn('[AudioEngine] Could not resume context before chain build:', e);
        }
      }

      if (this.isBypassed) {
        console.log('[AudioEngine] Bypassed during effects init delay — skipping connection');
        return;
      }

      const effects = getAudioEffects();

      // Ensure Tone.js AudioContext is started (requires user gesture on mobile)
      if (!MwijayAudioEngine.toneStarted) {
        await Tone.start();
        MwijayAudioEngine.toneStarted = true;
      }

      // Initialize the Tone.js effect nodes
      await effects.initialize();

      if (this.isBypassed) {
        console.log('[AudioEngine] Bypassed before connecting effects — skipping');
        return;
      }

      // CRITICAL: Connect effects directly to the App.tsx sourceNode,
      // NOT via AudioCore (which has its own separate audio element).
      // Using connectToAudioCore() would connect the wrong element.
      await effects.connectToSourceNode(sourceNode, rawContext, this.nextNode);

      // Wire up the analyser tap if it was registered before init completed
      if (this.analyserTap && this.mediaSource) {
        this.connectAnalyserTap(sourceNode);
      }

      console.log('[AudioEngine] Effects engine connected to App audio element.');

      // Ensure AudioContext is running after chain build
      try {
        const ctxAfter = Tone.getContext().rawContext as AudioContext;
        if (ctxAfter.state !== 'running') {
          await ctxAfter.resume();
          console.log('[AudioEngine] Context resumed after chain build');
        }
      } catch (e) {
        console.warn('[AudioEngine] Post-chain resume failed:', e);
      }
    } catch (e) {
      console.warn('[AudioEngine] Effects init failed — audio continues without effects:', e);
      // Ensure audio still reaches speakers even without effects
      try { sourceNode.connect(rawContext.destination); } catch { /* ignore */ }
    }
  }


  // ─── setNextNode() ───────────────────────────────────────────────────────────

  /**
   * Registers a downstream AudioNode to receive the processed audio output.
   * Typically this is a preamp node from useAudioFx.
   *
   * IMPORTANT: This method is called by useAudioFx BEFORE init() in some flows.
   * It must be safe to call at any time.
   */
  public setNextNode(node: AudioNode | null) {
    this.nextNode = node;
    if (this.isInitialized) {
      this.updateConnections();
    }
  }

  /**
   * Registers the analyser node from useAudioFx for read-only visualizer tap.
   */
  public setAnalyserTap(analyser: AudioNode | null) {
    this.analyserTap = analyser;
    if (this.isInitialized && this.mediaSource) {
      if (analyser) {
        this.connectAnalyserTap(this.mediaSource);
      }
    }
  }

  private connectAnalyserTap(sourceNode: MediaElementAudioSourceNode) {
    if (!this.analyserTap) return;
    try {
      getPristineConnect().call(sourceNode, this.analyserTap);
    } catch {
      try {
        sourceNode.connect(this.analyserTap);
      } catch (e) {
        console.warn('[AudioEngine] Analyser tap connect failed:', e);
      }
    }
  }

  private reconnectAnalyserTap() {
    if (this.analyserTap && this.mediaSource) {
      this.connectAnalyserTap(this.mediaSource);
    }
  }

  /**
   * Internal: re-route the volumeNormalizer/master output to the registered nextNode.
   * Uses the Effects engine's masterVolume if connected; otherwise the raw source.
   *
   * Called after any connection change (setNextNode, init, effects connected).
   */
  private updateConnections() {
    if (!this.isInitialized || !this.mediaSource) return;

    try {
      const rawContext = Tone.getContext().rawContext as AudioContext;
      const effects = getAudioEffects();

      // Ensure analyser tap is connected
      if (this.analyserTap && !this.hasConnectedSource) {
        this.hasConnectedSource = true;
        this.connectAnalyserTap(this.mediaSource);
      }

      if (this.isBypassed) {
        try {
          this.mediaSource.disconnect();
        } catch (e) {}
        this.reconnectAnalyserTap();

        if (this.nextNode) {
          this.mediaSource.connect(this.nextNode);
          console.log('[AudioEngine] Dynamically connected mediaSource to nextNode.');
        } else {
          this.mediaSource.connect(rawContext.destination);
          console.log('[AudioEngine] Dynamically connected mediaSource to destination.');
        }
      } else {
        // Tone.js effects are active. Re-route Tone.js masterVolume to nextNode.
        const masterVol = (effects as any).masterVolume;
        if (masterVol) {
          try {
            masterVol.disconnect();
          } catch (e) {}
          
          if (this.nextNode) {
            masterVol.connect(this.nextNode);
            console.log('[AudioEngine] Dynamically connected Tone.js masterVolume to nextNode.');
          } else {
            masterVol.toDestination();
            console.log('[AudioEngine] Dynamically connected Tone.js masterVolume to destination.');
          }
        }
      }
    } catch (e) {
      console.warn('[AudioEngine] updateConnections failed:', e);
    }
  }

  // ─── EQ / Effects ────────────────────────────────────────────────────────────

  /**
   * Set 3-band equalizer (bass / mid / treble).
   * Delegates to AudioEffectsEngine.setEQ().
   */
  public setEqualizer(bass: number, mid: number, treble: number) {
    this.bassEqVal = typeof bass === 'number' && !isNaN(bass) ? bass : 0;
    const effects = getAudioEffects();
    effects.setEQ({
      bass: this.bassEqVal + this.bassBoostVal,
      mid: typeof mid === 'number' && !isNaN(mid) ? mid : 0,
      treble: typeof treble === 'number' && !isNaN(treble) ? treble : 0,
    });
  }

  /**
   * Set bass boost gain (combines with manual EQ bass).
   */
  public setBassBoost(boost: number) {
    this.bassBoostVal = typeof boost === 'number' && !isNaN(boost) ? boost : 0;
    const effects = getAudioEffects();
    effects.setEQ({ bass: this.bassEqVal + this.bassBoostVal });
  }

  /**
   * Set master preamp volume gain.
   * Delegates to AudioCore.setVolume() for crash-safe volume control.
   */
  public setVolumePreamp(gain: number) {
    const validGain = typeof gain === 'number' && !isNaN(gain) && gain > 0 ? gain : 1.0;
    if (this.audioElement) {
      this.audioElement.volume = Math.min(1, validGain);
    }
  }

  /**
   * Set delay + reverb parameters.
   * Maps to AudioEffectsEngine preset-style parameters.
   */
  public setDelayReverb(delayTime: number, feedback: number) {
    const effects = getAudioEffects();
    const validDelay = typeof delayTime === 'number' && !isNaN(delayTime) ? delayTime : 0;
    const validFeedback = typeof feedback === 'number' && !isNaN(feedback) ? feedback : 0;

    // Map to a partial preset update
    if (validDelay > 0.02) {
      effects.setEQ({}); // Ensure EQ is init'd
      // Access internal effect nodes via applyPreset to keep abstraction
      // Use the effects engine's partial update path
      (effects as any).feedbackDelay && (() => {
        try {
          (effects as any).feedbackDelay.delayTime.value = validDelay;
          (effects as any).feedbackDelay.feedback.value = validFeedback;
          (effects as any).feedbackDelay.wet.value = 0.4;
          if ((effects as any).reverb) {
            (effects as any).reverb.roomSize && ((effects as any).reverb.wet.value = 0.3);
          }
        } catch (e) {
          console.warn('[AudioEngine] setDelayReverb failed:', e);
        }
      })();
    }
  }

  /**
   * Set pitch shift in semitones (-12 to +12).
   * Delegates to AudioEffectsEngine.
   */
  public setPitch(semitones: number) {
    const effects = getAudioEffects();
    const rawPitch = typeof semitones === 'number' && !isNaN(semitones) && isFinite(semitones) ? semitones : 0;
    const safePitch = Math.max(-12, Math.min(12, rawPitch));

    if ((effects as any).pitchShift) {
      try {
        (effects as any).pitchShift.pitch = safePitch;
        if ((effects as any).pitchShift.wet) {
          (effects as any).pitchShift.wet.value = safePitch === 0 ? 0 : 1;
        }
      } catch (e) {
        console.warn('[AudioEngine] setPitch failed:', e);
      }
    }
  }

  /**
   * Set playback rate (speed).
   * Delegates to AudioCore for safe native element rate control.
   */
  public setSpeed(speed: number) {
    const validSpeed = typeof speed === 'number' && !isNaN(speed) && speed > 0 ? speed : 1.0;

    // Update the raw element if we have a direct reference
    if (this.audioElement) {
      this.audioElement.defaultPlaybackRate = validSpeed;
      this.audioElement.playbackRate = validSpeed;
    }
  }

  /**
   * Apply a named audio preset.
   * Maps old preset names to new AudioEffectsEngine preset keys.
   */
  public applyPreset(presetName: string) {
    // Map old preset names → new preset keys for backward compatibility
    const PRESET_MAP: Record<string, string> = {
      'none':           'normal',
      'normal':         'normal',
      'lofi':           'lofi',
      'slowed_reverb':  'slowedReverb',
      'nightcore':      'nightcore',
      'concert_hall':   'stadium',
      'telephone':      'telephone',
      'underwater':     'underwater',
      'stadium':        'stadium',
      'vinyl':          'vinyl',
      'chipmunk':       'chipmunk',
      'deep_voice':     'deepVoice',
      'robot':          'robot',
    };

    const mappedKey = PRESET_MAP[presetName.toLowerCase()] ?? presetName;
    const effects = getAudioEffects();

    // applyPreset is async internally (for reverb IR generation)
    // We fire-and-forget here to maintain the sync API contract
    effects.applyPreset(mappedKey).catch((e) => {
      console.warn('[AudioEngine] applyPreset failed:', e);
    });
  }

  // ─── Microphone Voice Changer ─────────────────────────────────────────────────

  /**
   * Opens microphone and connects a real-time vocal pitch shift voice changer.
   * This functionality is unchanged from the original implementation.
   */
  public async startMicVoiceChanger(semitones: number, onOpen: () => void) {
    let micSource: Tone.UserMedia | null = null;

    try {
      if (Tone.getContext().state !== 'running') {
        await Tone.getContext().resume();
      }

      micSource = new Tone.UserMedia();
      const voicePitch = new Tone.PitchShift({ pitch: semitones });

      await micSource.open();
      onOpen();

      micSource.connect(voicePitch);
      voicePitch.toDestination();

      return {
        setPitch: (newPitch: number) => {
          try {
            voicePitch.pitch = newPitch;
          } catch (e) {
            console.warn('[AudioEngine] Mic pitch change failed:', e);
          }
        },
        stop: () => {
          try {
            micSource?.close();
            micSource?.dispose();
            voicePitch.dispose();
          } catch (e) {
            console.warn('[AudioEngine] Mic stop failed:', e);
          }
          micSource = null;
        },
      };
    } catch (e) {
      micSource?.dispose();
      throw e;
    }
  }

  // ─── Metronome ────────────────────────────────────────────────────────────────

  /**
   * Sets the metronome beat click loop dynamically.
   */
  public setMetronome(enabled: boolean, bpm: number, soundType: string) {
    if (this.metronomeLoop) {
      this.metronomeLoop.stop();
      this.metronomeLoop.dispose();
      this.metronomeLoop = null;
    }

    if (!enabled) return;

    try {
      if (!this.metronomeSynth) {
        this.metronomeSynth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        }).toDestination();
        this.metronomeSynth.volume.value = -6;
      }

      const safeBpm = typeof bpm === 'number' && bpm >= 40 && bpm <= 300 ? bpm : 120;
      Tone.Transport.bpm.value = safeBpm;

      this.metronomeLoop = new Tone.Loop((time) => {
        if (!this.metronomeSynth) return;
        if (soundType === 'drum') {
          this.metronomeSynth.oscillator.type = 'triangle';
          this.metronomeSynth.triggerAttackRelease('C2', '16n', time);
        } else if (soundType === 'activity' || soundType === 'woodblock') {
          this.metronomeSynth.oscillator.type = 'sine';
          this.metronomeSynth.triggerAttackRelease('A5', '32n', time);
        } else {
          this.metronomeSynth.oscillator.type = 'sine';
          this.metronomeSynth.triggerAttackRelease('C6', '32n', time);
        }
      }, '4n');

      this.metronomeLoop.start(0);
      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
    } catch (e) {
      console.warn('[AudioEngine] Metronome init failed:', e);
    }
  }

  // ─── Speed / Pitch Control ──────────────────────────────────────────────────

  /**
   * Apply pitch preservation properties to an audio element.
   * Uses vendor-prefixed properties for cross-browser support.
   * The 'any' casts are necessary because TypeScript's HTMLAudioElement
   * type doesn't include these vendor-prefixed properties.
   */
  private _applyPitchPreservation(audioEl: HTMLAudioElement): void {
    try {
      // Standard (Chrome 90+, Edge, Electron)
      (audioEl as any).preservesPitch = this._isPitchPreserved;
      // Firefox
      (audioEl as any).mozPreservesPitch = this._isPitchPreserved;
      // Safari / older Android WebView
      (audioEl as any).webkitPreservesPitch = this._isPitchPreserved;
    } catch (e) {
      console.warn('[AudioEngine] preservesPitch not fully supported:', e);
    }
  }

  /**
   * Load persisted speed and pitch preferences from localStorage.
   */
  public loadSpeedPreferences(): void {
    try {
      const savedSpeed = localStorage.getItem('mwijay_playback_speed');
      const savedPitch = localStorage.getItem('mwijay_pitch_preserved');

      if (savedSpeed !== null) {
        const parsed = parseFloat(savedSpeed);
        if (isFinite(parsed) && parsed >= MIN_SPEED && parsed <= MAX_SPEED) {
          this._playbackSpeed = parsed;
        }
      }

      if (savedPitch !== null) {
        this._isPitchPreserved = savedPitch !== 'false';
      }

      console.log(`[AudioEngine] Loaded speed prefs: ${this._playbackSpeed}x, pitch: ${this._isPitchPreserved}`);
    } catch (e) {
      // localStorage unavailable — use defaults
    }
  }

  /**
   * Set the playback speed. Clamped to valid range.
   * If in radio mode, speed is stored but NOT applied to the audio element.
   */
  public setPlaybackSpeed(rate: number): void {
    const clampedRate = Math.min(Math.max(rate, MIN_SPEED), MAX_SPEED);
    this._playbackSpeed = clampedRate;

    // Do not apply speed to radio streams
    if (this._isRadioMode) {
      console.log('[AudioEngine] Radio mode — speed not applied');
      return;
    }

    // Apply to current audio element if it exists
    if (this.audioElement) {
      this.audioElement.playbackRate = clampedRate;
      this._applyPitchPreservation(this.audioElement);
      console.log(`[AudioEngine] Speed set to ${clampedRate}x, pitch preserved: ${this._isPitchPreserved}`);
    }

    // Persist to localStorage
    try {
      localStorage.setItem('mwijay_playback_speed', String(clampedRate));
    } catch (e) {
      // localStorage may not be available in private browsing
    }
  }

  /**
   * Toggle pitch preservation on/off.
   * When off, changing speed also changes pitch (chipmunk effect).
   */
  public togglePitchPreservation(enabled: boolean): void {
    this._isPitchPreserved = enabled;

    if (this.audioElement) {
      this._applyPitchPreservation(this.audioElement);
    }

    try {
      localStorage.setItem('mwijay_pitch_preserved', String(enabled));
    } catch (e) {}

    console.log(`[AudioEngine] Pitch preservation: ${enabled}`);
  }

  /**
   * Set radio mode on/off. When radio mode is active, speed is NOT
   * applied to the audio element (radio streams use plain HTMLAudioElement).
   */
  public setRadioMode(isRadio: boolean): void {
    this._isRadioMode = isRadio;
    if (isRadio && this.audioElement) {
      this.audioElement.playbackRate = 1.0;
      this._applyPitchPreservation(this.audioElement);
    }
  }

  // ─── AudioContext Resume ──────────────────────────────────────────────────────

  /**
   * Resume the AudioContext. Required after user gesture on mobile.
   * If a pending init was deferred (context was suspended), complete it now.
   */
  public async resumeContext() {
    try {
      await Tone.start();
      if (Tone.getContext().state !== 'running') {
        await Tone.getContext().resume();
      }
      // After context is running, check for deferred init
      if (this._pendingAudioElement && !this.isInitialized) {
        const ctx = getSharedAudioContext();
        if (ctx.state === 'running') {
          console.log('[AudioEngine] Completing deferred init after context resume');
          this._createNodeAndConnect(this._pendingAudioElement, ctx);
        }
      }
    } catch (e) {
      console.warn('[AudioEngine] resumeContext failed:', e);
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const audioEngine = new MwijayAudioEngine();
