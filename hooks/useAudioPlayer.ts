import { useEffect, useState, useCallback } from 'react'
import { audioPlayer, Track } from '../services/audioPlayer'

export interface UseAudioPlayerReturn {
  // State
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
  
  // Actions
  play: (track: Track) => Promise<void>
  pause: () => void
  resume: () => Promise<void>
  togglePlayPause: () => Promise<void>
  stop: () => void
  seek: (seconds: number) => void
  setVolume: (level: number) => void
  
  // Lock screen actions (subscribe to handle next/prev)
  onLockScreenAction: (callback: (action: string) => void) => () => void
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('[useAudioPlayer] Setting up listeners')
    
    // Subscribe to audio events
    const unsubPlay = audioPlayer.on('play', () => {
      setIsPlaying(true)
      setIsLoading(false)
      setError(null)
    })
    
    const unsubPause = audioPlayer.on('pause', () => {
      setIsPlaying(false)
    })
    
    const unsubEnded = audioPlayer.on('ended', () => {
      setIsPlaying(false)
    })
    
    const unsubTime = audioPlayer.on('timeupdate', (time: number) => {
      setCurrentTime(time)
    })
    
    const unsubDuration = audioPlayer.on('loadedmetadata', (dur: number) => {
      setDuration(dur)
    })
    
    const unsubWaiting = audioPlayer.on('waiting', () => {
      setIsLoading(true)
    })
    
    const unsubCanPlay = audioPlayer.on('canplay', () => {
      setIsLoading(false)
    })
    
    const unsubError = audioPlayer.on('error', (err: any) => {
      setError(err.message || 'Playback error')
      setIsLoading(false)
    })
    
    // Cleanup on unmount
    return () => {
      unsubPlay()
      unsubPause()
      unsubEnded()
      unsubTime()
      unsubDuration()
      unsubWaiting()
      unsubCanPlay()
      unsubError()
    }
  }, [])
  
  // Wrapped action functions
  
  const play = useCallback(async (track: Track) => {
    console.log('[useAudioPlayer] play called')
    setIsLoading(true)
    setError(null)
    setCurrentTrack(track)
    
    const success = await audioPlayer.play(track)
    
    if (!success) {
      setIsLoading(false)
    }
  }, [])
  
  const pause = useCallback(() => {
    audioPlayer.pause()
  }, [])
  
  const resume = useCallback(async () => {
    await audioPlayer.resume()
  }, [])
  
  const togglePlayPause = useCallback(async () => {
    await audioPlayer.togglePlayPause()
  }, [])
  
  const stop = useCallback(() => {
    audioPlayer.stop()
    setCurrentTrack(null)
    setCurrentTime(0)
    setDuration(0)
  }, [])
  
  const seek = useCallback((seconds: number) => {
    audioPlayer.seek(seconds)
  }, [])
  
  const setVolume = useCallback((level: number) => {
    audioPlayer.setVolume(level)
  }, [])
  
  const onLockScreenAction = useCallback((callback: (action: string) => void) => {
    return audioPlayer.on('lockscreenAction', (data: { action: string }) => {
      callback(data.action)
    })
  }, [])
  
  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    play,
    pause,
    resume,
    togglePlayPause,
    stop,
    seek,
    setVolume,
    onLockScreenAction,
  }
}
