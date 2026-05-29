import { Capacitor } from '@capacitor/core';

class MicrophoneService {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private animationFrameId: number | null = null;
  
  async requestPermission(): Promise<{
    granted: boolean;
    error?: string;
    permanent?: boolean;
  }> {
    try {
      // Request microphone via getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      // Stop immediately - we just wanted to verify/gain permission
      stream.getTracks().forEach(track => track.stop());
      
      return { granted: true };
      
    } catch (error: any) {
      console.error('[Microphone] Access error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return { 
          granted: false, 
          error: 'Microphone access denied',
          permanent: true,
        };
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return { 
          granted: false, 
          error: 'No microphone found on device' 
        };
      }
      return { 
        granted: false, 
        error: error.message || 'Failed to access microphone' 
      };
    }
  }
  
  async startListening(
    onAudioLevel: (level: number) => void
  ): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      this.stream = stream;
      
      // Set up audio level monitoring
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      this.audioContext = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkLevel = () => {
        if (!this.stream || !this.audioContext) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const level = average / 255;  // Normalize to 0-1
        
        onAudioLevel(level);
        
        this.animationFrameId = requestAnimationFrame(checkLevel);
      };
      
      checkLevel();
      
      return stream;
      
    } catch (error) {
      console.error('Failed to start microphone listener:', error);
      return null;
    }
  }

  stopListening() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
    }
  }
}

export const microphoneService = new MicrophoneService();
export default microphoneService;
