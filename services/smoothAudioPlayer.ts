class SmoothAudioPlayer {
  public currentAudio: HTMLAudioElement
  public nextAudio: HTMLAudioElement  // Pre-load next song
  private isMobile: boolean
  
  constructor() {
    this.currentAudio = this.createOptimizedAudio()
    this.nextAudio = this.createOptimizedAudio()
    this.isMobile = /Mobi|Android/i.test(navigator.userAgent)
  }
  
  private createOptimizedAudio(): HTMLAudioElement {
    const audio = new Audio()
    
    // CRITICAL ATTRIBUTES for smooth mobile playback:
    audio.preload = 'auto'           // Pre-load full audio
    audio.crossOrigin = 'anonymous'  // For CORS audio
    
    // Mobile-specific attributes:
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.setAttribute('x5-playsinline', 'true')  // Chinese browsers
    
    // Don't pause when other audio plays (for our queue)
    audio.setAttribute('x-webkit-airplay', 'allow')
    
    return audio
  }
  
  // Set the DOM reference to use the exact same element if needed,
  // or we can let App.tsx use this currentAudio reference directly.
  setMainAudioElement(audio: HTMLAudioElement) {
    this.currentAudio = audio
    // Apply optimizations to the passed element
    this.currentAudio.preload = 'auto'
    this.currentAudio.setAttribute('playsinline', 'true')
    this.currentAudio.setAttribute('webkit-playsinline', 'true')
    this.currentAudio.setAttribute('x5-playsinline', 'true')
    this.currentAudio.setAttribute('x-webkit-airplay', 'allow')
  }
  
  async loadTrack(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio.src = url
      
      const onCanPlay = () => {
        this.currentAudio.removeEventListener('canplay', onCanPlay)
        this.currentAudio.removeEventListener('error', onError)
        resolve()
      }
      
      const onError = (e: Event) => {
        this.currentAudio.removeEventListener('canplay', onCanPlay)
        this.currentAudio.removeEventListener('error', onError)
        reject(e)
      }
      
      this.currentAudio.addEventListener('canplay', onCanPlay)
      this.currentAudio.addEventListener('error', onError)
      
      this.currentAudio.load()
    })
  }
  
  // Pre-load next song into browser cache while current plays (smooth transitions)
  preloadNext(url: string): void {
    this.nextAudio.src = url
    this.nextAudio.load()
  }
  
  // Swap the pre-loaded cache to the active player
  swapToNext(): void {
    if (this.nextAudio.src) {
      this.currentAudio.src = this.nextAudio.src
      this.currentAudio.load()
      
      // Clear background cache element to free memory
      this.nextAudio.removeAttribute('src')
      this.nextAudio.load()
    }
  }
  
  async play(): Promise<void> {
    try {
      await this.currentAudio.play()
    } catch (error) {
      // Mobile blocks autoplay without user gesture
      // Try with muted first, then unmute
      this.currentAudio.muted = true
      await this.currentAudio.play()
      setTimeout(() => {
        this.currentAudio.muted = false
      }, 100)
    }
  }
  
  pause(): void {
    this.currentAudio.pause()
  }
  
  // Check buffer progress
  getBufferedPercentage(): number {
    const audio = this.currentAudio
    if (!audio.duration) return 0
    
    if (audio.buffered.length > 0) {
      const bufferedEnd = audio.buffered.end(
        audio.buffered.length - 1
      )
      return (bufferedEnd / audio.duration) * 100
    }
    
    return 0
  }
  
  // Wait for buffer before playing (prevents stutters)
  async waitForBuffer(minPercentage: number = 5): Promise<void> {
    return new Promise((resolve) => {
      const checkBuffer = () => {
        if (this.getBufferedPercentage() >= minPercentage) {
          resolve()
        } else {
          setTimeout(checkBuffer, 100)
        }
      }
      checkBuffer()
    })
  }
}

export const smoothPlayer = new SmoothAudioPlayer()
export default smoothPlayer;
