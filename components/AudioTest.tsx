import React, { useEffect } from 'react'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

export default function AudioTest() {
  const {
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
    onLockScreenAction,
  } = useAudioPlayer()
  
  // Listen for lock screen actions
  useEffect(() => {
    const unsubscribe = onLockScreenAction((action) => {
      console.log('Lock screen action:', action)
      
      if (action === 'next') {
        console.log('User pressed NEXT on lock screen')
        // Add your "play next song" logic here
      } else if (action === 'previous') {
        console.log('User pressed PREVIOUS on lock screen')
        // Add your "play previous song" logic here
      }
    })
    
    return unsubscribe
  }, [onLockScreenAction])
  
  // Sample tracks for testing
  const sampleTracks = [
    {
      id: '1',
      title: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      type: 'music' as const,
      // Public test audio file that always works
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      artworkUrl: 'https://via.placeholder.com/512/A8E040/000000?text=Music',
      duration: 372,
    },
    {
      id: '2',
      title: 'Test Radio Station',
      artist: 'BBC Radio',
      type: 'radio' as const,
      isLive: true,
      audioUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
      artworkUrl: 'https://via.placeholder.com/512/FF6B6B/FFFFFF?text=Radio',
    },
    {
      id: '3',
      title: 'Test Reel',
      artist: '@testuser',
      type: 'reel' as const,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      artworkUrl: 'https://via.placeholder.com/512/9333EA/FFFFFF?text=Reel',
      duration: 30,
    },
  ]
  
  // Format time helper
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '20px auto',
      background: '#1a1a1a',
      color: 'white',
      borderRadius: '12px',
      fontFamily: 'sans-serif',
      zIndex: 9999,
      position: 'relative'
    }}>
      <h1 style={{ color: '#A8E040', marginBottom: '20px' }}>
        🎵 Audio Player Test
      </h1>
      
      {/* Error display */}
      {error && (
        <div style={{
          background: '#ef4444',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          ❌ Error: {error}
        </div>
      )}
      
      {/* Current track display */}
      {currentTrack && (
        <div style={{
          background: '#262626',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <img
              src={currentTrack.artworkUrl}
              alt=""
              style={{ width: '80px', height: '80px', borderRadius: '8px' }}
            />
            <div>
              <h3 style={{ margin: 0, color: '#A8E040' }}>
                {currentTrack.title}
              </h3>
              <p style={{ margin: '4px 0', opacity: 0.7 }}>
                {currentTrack.artist}
              </p>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.5 }}>
                Type: {currentTrack.type}
              </p>
            </div>
          </div>
          
          {/* Progress bar */}
          {currentTrack.type !== 'radio' && (
            <div style={{ marginTop: '16px' }}>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '12px',
                opacity: 0.7,
              }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}
          
          {/* For radio - show LIVE indicator */}
          {currentTrack.type === 'radio' && (
            <div style={{
              marginTop: '16px',
              padding: '8px',
              background: '#dc2626',
              borderRadius: '4px',
              textAlign: 'center',
              fontWeight: 'bold',
            }}>
              🔴 LIVE BROADCAST
            </div>
          )}
          
          {/* Control buttons */}
          <div style={{ 
            marginTop: '16px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
          }}>
            <button
              onClick={togglePlayPause}
              style={{
                padding: '12px 24px',
                background: '#A8E040',
                color: 'black',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            
            <button
              onClick={stop}
              style={{
                padding: '12px 24px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              ⏹ Stop
            </button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          opacity: 0.7,
        }}>
          ⏳ Loading...
        </div>
      )}
      
      {/* Sample tracks to play */}
      <div>
        <h2 style={{ color: '#A8E040' }}>Test Tracks:</h2>
        {sampleTracks.map((track) => (
          <div
            key={track.id}
            style={{
              background: '#262626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <strong>{track.title}</strong>
              <br />
              <small style={{ opacity: 0.7 }}>
                {track.artist} ({track.type})
              </small>
            </div>
            
            <button
              onClick={() => play(track)}
              style={{
                padding: '8px 16px',
                background: '#A8E040',
                color: 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ▶ Play
            </button>
          </div>
        ))}
      </div>
      
      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#262626',
        borderRadius: '8px',
        fontSize: '14px',
      }}>
        <h3 style={{ marginTop: 0, color: '#A8E040' }}>📱 Testing Instructions:</h3>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Tap "Play" on any track</li>
          <li>Audio should start playing</li>
          <li>Open Chrome DevTools (F12) to see console logs</li>
          <li>For mobile: Lock the screen</li>
          <li>You should see media controls on lock screen</li>
          <li>Try the play/pause/next/previous buttons</li>
        </ol>
      </div>
    </div>
  )
}
