import * as Tone from 'tone';

export interface AudioEngineSettings {
  bass: number;     // -10 to +10 dB
  mid: number;      // -10 to +10 dB
  treble: number;   // -10 to +10 dB
  preset: string;   // 'none', 'lofi', 'slowed_reverb', 'nightcore', etc.
  pitch: number;    // pitch shift semitones (-12 to +12)
  speed: number;    // playback rate (0.5 to 2.0)
}

class MwijayAudioEngine {
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private micSource: Tone.UserMedia | null = null;
  private audioElement: HTMLAudioElement | null = null;

  // DSP Nodes
  private eq3!: Tone.EQ3;
  private pitchShift!: Tone.PitchShift;
  private filter!: Tone.Filter;
  private bitCrusher!: Tone.BitCrusher;
  private distortion!: Tone.Distortion;
  private chorus!: Tone.Chorus;
  private reverb!: Tone.JCReverb;
  private delay!: Tone.FeedbackDelay;
  private volumeNormalizer!: Tone.Volume;

  private isInitialized = false;

  // Global playback state properties for Simple Mode and other views
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

  private static toneStarted = false;

  constructor() {
    // Lazy initialization happens when the audio element is connected
    // Pre-register user-gesture listener to unblock AudioContext early
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

  /**
   * Initializes the Web Audio graph and connects the HTML5 <audio> element.
   */
  public init(audio: HTMLAudioElement) {
    if (this.isInitialized && this.audioElement === audio) return;

    this.audioElement = audio;

    const rawContext = Tone.getContext().rawContext as AudioContext;

    // Reuse or create the ONE MediaElementAudioSourceNode for this element
    let sourceNode: MediaElementAudioSourceNode = (audio as any)._mediaElementSource;
    if (!sourceNode) {
      sourceNode = rawContext.createMediaElementSource(audio);
      (audio as any)._mediaElementSource = sourceNode;
    }
    this.mediaSource = sourceNode;

    // Create all Tone.js DSP nodes
    this.eq3 = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    this.pitchShift = new Tone.PitchShift({ pitch: 0 });
    this.filter = new Tone.Filter({ frequency: 20000, type: 'lowpass' });
    this.bitCrusher = new Tone.BitCrusher(8);
    this.bitCrusher.wet.value = 0;
    this.distortion = new Tone.Distortion({ distortion: 0, wet: 0 });
    this.chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0 });
    this.reverb = new Tone.JCReverb({ roomSize: 0.5, wet: 0 });
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0 });
    this.volumeNormalizer = new Tone.Volume(0);

    // Build the Tone.js DSP chain internally (eq3 → ... → Tone.Destination)
    this.eq3.chain(
      this.pitchShift,
      this.bitCrusher,
      this.filter,
      this.distortion,
      this.chorus,
      this.reverb,
      this.delay,
      this.volumeNormalizer,
      Tone.Destination
    );

    // Connect wrapped media source using optimal bypass or DSP path
    this.isInitialized = true;
    this.updateConnections();

    // Ensure Tone.js AudioContext is started (requires user gesture)
    if (!MwijayAudioEngine.toneStarted) {
      Tone.start().then(() => {
        MwijayAudioEngine.toneStarted = true;
      }).catch(() => {});
    }

    // Resume context (browsers suspend AudioContext until user gesture)
    rawContext.resume().catch(() => {});
    console.log('Mwijay audio engine connected.');
  }

  /**
   * Updates connections dynamically: bypasses Tone.js DSP graph when flat/no effects
   * to eliminate audio stutters on Android WebViews.
   */
  private updateConnections() {
    if (!this.isInitialized || !this.mediaSource) return;

    const rawContext = Tone.getContext().rawContext as AudioContext;
    
    // Check if EQ is flat
    const eqActive = (this.eq3.low.value !== 0) || (this.eq3.mid.value !== 0) || (this.eq3.high.value !== 0);
    
    // Check if Pitch shift is active
    const pitchActive = (this.pitchShift.wet.value > 0);
    
    // Check if other dynamic effects are active
    const effectsActive = (this.bitCrusher.wet.value > 0) || 
                          (this.distortion.wet.value > 0) || 
                          (this.chorus.wet.value > 0) || 
                          (this.reverb.wet.value > 0) || 
                          (this.delay.wet.value > 0);

    const needsDsplChain = eqActive || pitchActive || effectsActive;

    try {
      this.mediaSource.disconnect();
    } catch (e) {
      // Node might not be connected yet
    }

    if (needsDsplChain) {
      console.log('[AudioEngine] Dynamic update: connecting to Tone.js DSP chain.');
      try {
        const getNativeNode = (node: any): AudioNode | null => {
          if (!node) return null;
          if (node instanceof AudioNode) return node;
          if (node._nativeAudioNode instanceof AudioNode) return node._nativeAudioNode;
          if (node._inputNode instanceof AudioNode) return node._inputNode;
          if (node.input && node.input !== node) return getNativeNode(node.input);
          return null;
        };

        const nativeInput = getNativeNode(this.eq3);
        if (nativeInput) {
          try {
            this.mediaSource.connect(nativeInput);
            console.log('[AudioEngine] Connected native source to Tone.EQ3 input successfully.');
          } catch (errDirect) {
            console.warn('[AudioEngine] Direct connect failed, attempting clean native connect fallback:', errDirect);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            try {
              const win = iframe.contentWindow as any;
              if (win && win.AudioNode) {
                const originalConnect = win.AudioNode.prototype.connect;
                originalConnect.call(this.mediaSource, nativeInput);
                console.log('[AudioEngine] Connected sourceNode directly to Tone.EQ3 via clean native connect.');
              } else {
                throw new Error('Failed to resolve clean connect context');
              }
            } finally {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            }
          }
        } else {
          throw new Error('Could not resolve native input node inside Tone.EQ3');
        }
      } catch (e) {
        console.warn('[AudioEngine] Tone connect failed, connecting to destination:', e);
        try {
          this.mediaSource.connect(rawContext.destination);
        } catch (errFallback) {}
      }
    } else {
      // Bypass Tone.js DSP graph completely for zero-latency, zero-stutter native playback
      console.log('[AudioEngine] Bypassing Tone.js DSP graph completely to optimize mobile CPU overhead.');
      try {
        try {
          this.mediaSource.connect(rawContext.destination);
          console.log('[AudioEngine] Connected sourceNode directly to rawContext.destination successfully.');
        } catch (errFallback) {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          try {
            const win = iframe.contentWindow as any;
            if (win && win.AudioNode) {
              const originalConnect = win.AudioNode.prototype.connect;
              originalConnect.call(this.mediaSource, rawContext.destination);
              console.log('[AudioEngine] Connected sourceNode directly to rawContext.destination via clean native connect.');
            }
          } finally {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }
        }
      } catch (e2) {
        console.error('[AudioEngine] Bypass fallback connection failed:', e2);
      }
    }
  }

  /**
   * Exposes the EQ3 entry point node for series chaining.
   */
  public getInputNode() {
    return this.eq3;
  }

  /**
   * Updates the manual 3-band parametric EQ values.
   */
  public setEqualizer(bass: number, mid: number, treble: number) {
    if (!this.isInitialized) return;
    this.eq3.low.value = typeof bass === 'number' && !isNaN(bass) ? bass : 0;
    this.eq3.mid.value = typeof mid === 'number' && !isNaN(mid) ? mid : 0;
    this.eq3.high.value = typeof treble === 'number' && !isNaN(treble) ? treble : 0;
    this.updateConnections();
  }

  /**
   * Modifies the playback speed (tempo) natively.
   */
  public setSpeed(speed: number) {
    if (this.audioElement) {
      const validSpeed = typeof speed === 'number' && !isNaN(speed) && speed > 0 ? speed : 1.0;
      this.audioElement.defaultPlaybackRate = validSpeed;
      this.audioElement.playbackRate = validSpeed;
    }
  }

  /**
   * Manually sets real-time pitch shifting in semitones (-12 to +12).
   */
  public setPitch(semitones: number) {
    if (!this.isInitialized) return;
    // Clamp to valid PitchShift range — Tone.js crashes on values outside roughly [-24, 24]
    // In practice, [-12, 12] semitones sounds musical and avoids the null timestamp crash
    const rawPitch = typeof semitones === 'number' && !isNaN(semitones) && isFinite(semitones) ? semitones : 0;
    const safePitch = Math.max(-12, Math.min(12, rawPitch));
    if (safePitch === 0) {
      this.pitchShift.wet.value = 0;
    } else {
      try {
        this.pitchShift.wet.value = 1;
        this.pitchShift.pitch = safePitch;
      } catch (e) {
        console.warn("Tone.js PitchShift failed to set pitch, bypassing effect:", e);
        this.pitchShift.wet.value = 0;
      }
    }
    this.updateConnections();
  }

  /**
   * Applies pre-configured visual and voice presets on the active audio stream.
   */
  public applyPreset(presetName: string) {
    if (!this.isInitialized) return;

    // Reset default states of all dynamic nodes
    this.setPitch(0);
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 20000;
    this.bitCrusher.wet.value = 0;
    this.distortion.wet.value = 0;
    this.chorus.wet.value = 0;
    this.reverb.roomSize.value = 0.5;
    this.reverb.wet.value = 0;
    this.delay.wet.value = 0;
    this.setSpeed(1.0);

    switch (presetName.toLowerCase()) {
      // ─── VOICE CHANGER EFFECTS ───
      case 'chipmunk':
        this.setPitch(6); // +6 semitones
        break;

      case 'deep_voice':
        this.setPitch(-5); // -5 semitones
        this.eq3.low.value = 6;    // Boost low bass
        break;

      case 'robot':
        this.bitCrusher.wet.value = 0.8;    // Blend in the 8-bit sample reduction
        this.chorus.frequency.value = 4;    // Frequency is a Signal, use .value
        this.chorus.depth = 0.9;            // Depth is a number, assign directly
        this.chorus.wet.value = 0.7;
        this.distortion.distortion = 0.4;
        this.distortion.wet.value = 0.5;
        break;

      // ─── MUSIC ATMOSPHERE PRESETS ───
      case 'lofi':
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1800; // Muted highs
        this.bitCrusher.wet.value = 0.15;   // Sample reduction hiss overlay
        this.reverb.roomSize.value = 0.5;
        this.reverb.wet.value = 0.25;
        break;

      case 'slowed_reverb':
        this.setSpeed(0.85); // 85% speed (slowed down)
        this.setPitch(-2); // Pitch corrected down
        this.reverb.roomSize.value = 0.8; // Extreme stadium reverb size
        this.reverb.wet.value = 0.45;
        this.filter.frequency.value = 10000;
        break;

      case 'nightcore':
        this.setSpeed(1.25); // 125% speed (sped up)
        this.setPitch(2); // High-pitch anime vibe
        this.eq3.high.value = 4;   // Extra sparkling highs
        break;

      case 'concert_hall':
        this.reverb.roomSize.value = 0.7;
        this.reverb.wet.value = 0.35;
        this.chorus.frequency.value = 0.3; // frequency is a Signal
        this.chorus.depth = 0.2;            // depth is a number
        this.chorus.wet.value = 0.15;
        break;

      case 'telephone':
        // Highpass at 300Hz, Lowpass at 3000Hz creates the thin bandpass
        this.filter.type = 'highpass';
        this.filter.frequency.value = 400;
        this.distortion.distortion = 0.3;
        this.distortion.wet.value = 0.4;
        break;

      case 'underwater':
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 450; // Deeply muffled lowpass
        this.reverb.roomSize.value = 0.6;
        this.reverb.wet.value = 0.5;
        this.chorus.frequency.value = 0.5; // frequency is a Signal
        this.chorus.depth = 0.7;            // depth is a number
        this.chorus.wet.value = 0.4;
        break;

      case 'stadium':
        this.reverb.roomSize.value = 0.9;
        this.reverb.wet.value = 0.4;
        this.delay.delayTime.value = '4n';
        this.delay.feedback.value = 0.25;
        this.delay.wet.value = 0.25;
        break;

      case 'vinyl':
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 12000;
        this.distortion.distortion = 0.05;
        this.distortion.wet.value = 0.2;
        break;

      default:
        // Already reset all, do nothing (Clean pass-through)
        break;
    }
    this.updateConnections();
  }

  /**
   * Opens microphone and connects a real-time vocal pitch shift voice changer.
   */
  public async startMicVoiceChanger(semitones: number, onOpen: () => void) {
    if (this.micSource) {
      this.micSource.dispose();
    }

    // Start Audio Context if suspended
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume();
    }

    this.micSource = new Tone.UserMedia();
    const voicePitch = new Tone.PitchShift({ pitch: semitones });

    await this.micSource.open();
    onOpen();

    this.micSource.connect(voicePitch);
    voicePitch.toDestination();

    return {
      setPitch: (newPitch: number) => {
        try {
          voicePitch.pitch = newPitch;
        } catch (e) {
          console.warn("Mic Voice Changer failed to set pitch:", e);
        }
      },
      stop: () => {
        if (this.micSource) {
          this.micSource.close();
          this.micSource.dispose();
          this.micSource = null;
        }
        voicePitch.dispose();
      }
    };
  }

  public async resumeContext() {
    await Tone.start();
    if (Tone.getContext().state !== 'running') {
      await Tone.getContext().resume();
    }
  }
}

export const audioEngine = new MwijayAudioEngine();
