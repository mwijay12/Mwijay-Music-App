import Meyda from 'meyda';

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
  mood: string;
  energy: number;
}

class MwijayAudioAnalyzer {
  private audioContext: AudioContext | null = null;

  constructor() {
    // AudioContext will be initialized on-demand
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    return this.audioContext;
  }

  /**
   * Performs client-side, offline analysis of any File or Blob to extract BPM, Key, Energy, and Mood!
   */
  public async analyzeFile(file: File | Blob): Promise<AudioAnalysisResult> {
    const ctx = this.getAudioContext();

    // 1. Read file as ArrayBuffer and decode audio channels
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // 2. Extract raw channel PCM data for calculations
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // 3. Detect BPM using an autocorrelation energy-peaks loop
    const bpm = this.detectBPM(channelData, sampleRate);

    // 4. Use Meyda to run feature extractions over small frame intervals
    const features = this.extractMeydaFeatures(audioBuffer);

    // 5. Detect Key using chromagram profiles
    const key = this.detectKey(features.chroma);

    // 6. Estimate Mood from RMS and zero-crossing rates
    const mood = this.estimateMood(features.rms, features.zcr);

    // 7. Calculate overall energy rating (0.0 to 1.0)
    const energy = Math.min(1.0, features.rms * 5.0);

    return { bpm, key, mood, energy };
  }

  /**
   * BPM detection using energy window peak evaluation (autocorrelation of peaks)
   */
  private detectBPM(data: Float32Array, sampleRate: number): number {
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms energy windows
    const energies: number[] = [];

    // Calculate RMS energy per window block
    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let sumSquares = 0;
      for (let j = i; j < i + windowSize; j++) {
        sumSquares += data[j] * data[j];
      }
      energies.push(Math.sqrt(sumSquares / windowSize));
    }

    // Find energy average & peaks threshold
    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const threshold = avgEnergy * 1.5;

    // Detect indices of energy peaks
    const peaks: number[] = [];
    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > threshold && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
        peaks.push(i);
      }
    }

    if (peaks.length < 2) return 120; // Safe default (Standard tempo)

    // Calculate intervals between peaks
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    // Find average peak interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalInSeconds = avgInterval * 0.1; // 100ms window size

    // Convert peak frequency to beats-per-minute (BPM)
    let bpm = Math.round(60 / intervalInSeconds);

    // Clamp BPM into normal musical ranges
    while (bpm < 60) bpm *= 2;
    while (bpm > 185) bpm = Math.round(bpm / 2);

    return bpm;
  }

  /**
   * Uses Meyda.js to extract real-time chroma, RMS, and zero-crossing profiles of the decoded buffer
   */
  private extractMeydaFeatures(audioBuffer: AudioBuffer): { chroma: number[]; rms: number; zcr: number } {
    const ctx = this.getAudioContext();
    
    // Create offline node sources
    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = audioBuffer;

    let accumulatedChroma = new Array(12).fill(0);
    let accumulatedRms = 0;
    let accumulatedZcr = 0;
    let frameCount = 0;

    // Meyda operates over specific buffers, we can feed it frame blocks
    const bufferSize = 512;
    const channelData = audioBuffer.getChannelData(0);

    // Run custom frame-by-frame analysis
    for (let offset = 0; offset < channelData.length - bufferSize; offset += bufferSize) {
      const signalFrame = channelData.subarray(offset, offset + bufferSize);
      
      const features = Meyda.extract(
        ['rms', 'zcr', 'chroma'],
        // @ts-ignore
        signalFrame
      );

      if (features) {
        accumulatedRms += features.rms || 0;
        accumulatedZcr += features.zcr || 0;
        if (features.chroma) {
          for (let k = 0; k < 12; k++) {
            accumulatedChroma[k] += features.chroma[k] || 0;
          }
        }
        frameCount++;
      }
    }

    if (frameCount > 0) {
      accumulatedRms /= frameCount;
      accumulatedZcr /= frameCount;
      accumulatedChroma = accumulatedChroma.map(val => val / frameCount);
    }

    return {
      chroma: accumulatedChroma,
      rms: accumulatedRms,
      zcr: accumulatedZcr
    };
  }

  /**
   * Matches maximum chromagram vector index to standard musical key labels
   */
  private detectKey(chroma: number[]): string {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    if (!chroma || chroma.length < 12) return 'C';

    const maxVal = Math.max(...chroma);
    const keyIndex = chroma.indexOf(maxVal);

    return keyIndex >= 0 ? keys[keyIndex] : 'C';
  }

  /**
   * Establishes overall song mood by checking Zero-Crossing Rates (zcr) and Root-Mean-Square (rms) energy thresholds
   */
  private estimateMood(rms: number, zcr: number): string {
    // Normalize bounds: high rms = intense/high energy, high zcr = sharp transients (e.g. drums/claps)
    if (rms > 0.1 && zcr > 25) {
      return 'Energetic 🔥';
    } else if (rms > 0.1 && zcr <= 25) {
      return 'Intense ⚡';
    } else if (rms <= 0.1 && zcr > 20) {
      return 'Calm & Bright 🍃';
    } else if (rms <= 0.1 && zcr <= 20) {
      return 'Melancholic / Deep 🌧️';
    }
    return 'Chill Vibes 🎧';
  }
}

export const audioAnalyzer = new MwijayAudioAnalyzer();
