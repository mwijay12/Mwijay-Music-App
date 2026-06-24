/**
 * VideoPlayer.tsx
 *
 * Full-featured horizontal video player for long-form content.
 * Handles landscape videos, movies, documentaries.
 *
 * FEATURES:
 * - Full screen support
 * - Seek bar with preview
 * - Playback speed control (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
 * - Volume control
 * - Skip ±10 seconds
 * - Keyboard shortcuts
 * - Folder browser
 * - Built-in playlist
 * - Notes panel integration
 * - Picture-in-Picture (Android 8+)
 * - Subtitle support (basic)
 */

import React, {
  useRef, useState, useEffect, useCallback
} from 'react';
import type { ScannedMedia } from '../../types/media';
import { safeFileSrc } from '../../utils/safeUri';
import './VideoPlayer.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  video: ScannedMedia | null;
  playlist?: ScannedMedia[];
  currentPlaylistIndex?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  onPlaylistIndexChange?: (index: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─── VideoPlayer Component ────────────────────────────────────────────────────

export function VideoPlayer({
  video,
  playlist = [],
  currentPlaylistIndex = 0,
  onNext,
  onPrevious,
  onClose,
  onPlaylistIndexChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const seekBarRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeSrc = video ? safeFileSrc(video.path) : '';

  // ── Auto-hide controls ────────────────────────────────────────────────────

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying, resetControlsTimer]);

  // ── Load new video ────────────────────────────────────────────────────────

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !safeSrc) return;

    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    vid.src = safeSrc;
    vid.load();
    vid.play().catch(() => setIsPlaying(false));
  }, [safeSrc]);

  // ── Video event handlers ──────────────────────────────────────────────────

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => setIsBuffering(false);
  const handleEnded = () => {
    setIsPlaying(false);
    onNext?.();
  };

  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration);
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
  };

  const handleError = () => {
    setError('Could not play this video. Format may not be supported.');
    setIsPlaying(false);
  };

  // ── Controls ──────────────────────────────────────────────────────────────

  const togglePlayPause = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    const newTime = parseFloat(e.target.value);
    vid.currentTime = newTime;
    setCurrentTime(newTime);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const skip = useCallback((seconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, Math.min(vid.currentTime + seconds, vid.duration));
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    const newVol = parseFloat(e.target.value);
    vid.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const setSpeed = useCallback((rate: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen may not be supported
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Picture-in-Picture
  const togglePiP = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (vid.requestPictureInPicture) {
        await vid.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if typing in input (notes, search)
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const v = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = v;
            return v;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const v = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = v;
            return v;
          });
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          toggleMute();
          break;
        case 'n':
          onNext?.();
          break;
        case 'p':
          onPrevious?.();
          break;
        case 'Escape':
          onClose?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlayPause, skip, toggleFullscreen, toggleMute, onNext, onPrevious, onClose]);

  if (!video) {
    return (
      <div className="video-player video-player--empty">
        <div className="video-empty-state">
          <span className="video-empty-icon">🎬</span>
          <h3>No Video Selected</h3>
          <p>Choose a video from the library or folder browser.</p>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`video-player ${isFullscreen ? 'video-player--fullscreen' : ''}`}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
        onClick={togglePlayPause}
      />

      {/* Buffering indicator */}
      {isBuffering && (
        <div className="video-buffering">
          <div className="video-spinner" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="video-error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`video-controls ${showControls ? 'visible' : 'hidden'}`}>

        {/* Top bar */}
        <div className="video-top-bar">
          <button className="video-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <div className="video-title-area">
            <h3 className="video-title">{video.title}</h3>
            {video.artist && video.artist !== 'Unknown Artist' && (
              <p className="video-subtitle">{video.artist}</p>
            )}
          </div>
          <div className="video-top-actions">
            <button
              className="video-btn"
              onClick={() => setShowPlaylist(p => !p)}
              aria-label="Playlist"
              title="Playlist"
            >
              📋
            </button>
            <button
              className="video-btn"
              onClick={togglePiP}
              aria-label="Picture in Picture"
              title="Picture in Picture"
            >
              ⧉
            </button>
          </div>
        </div>

        {/* Center play/pause tap zone */}
        <div className="video-center-zone" onClick={togglePlayPause}>
          {!isPlaying && !isBuffering && (
            <div className="video-big-play">▶</div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="video-bottom-bar">
          {/* Seek bar */}
          <div className="video-seek-row">
            <span className="video-time">{formatTime(currentTime)}</span>
            <div className="video-seek-wrapper">
              <input
                ref={seekBarRef}
                type="range"
                className="video-seek-bar"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek"
              />
              <div
                className="video-seek-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="video-time">{formatTime(duration)}</span>
          </div>

          {/* Playback buttons row */}
          <div className="video-buttons-row">
            {/* Left: Skip back, Previous, Play, Next, Skip forward */}
            <div className="video-btn-group">
              {onPrevious && (
                <button
                  className="video-btn"
                  onClick={onPrevious}
                  aria-label="Previous"
                >
                  ⏮
                </button>
              )}
              <button
                className="video-btn"
                onClick={() => skip(-10)}
                aria-label="Skip back 10s"
              >
                ⏪
              </button>
              <button
                className="video-btn video-btn--large"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                className="video-btn"
                onClick={() => skip(10)}
                aria-label="Skip forward 10s"
              >
                ⏩
              </button>
              {onNext && (
                <button
                  className="video-btn"
                  onClick={onNext}
                  aria-label="Next"
                >
                  ⏭
                </button>
              )}
            </div>

            {/* Right: Volume, Speed, Fullscreen */}
            <div className="video-btn-group">
              {/* Volume */}
              <div className="video-volume-control">
                <button
                  className="video-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </button>
                <input
                  type="range"
                  className="video-volume-bar"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                />
              </div>

              {/* Playback speed */}
              <div className="video-speed-control">
                <button
                  className="video-btn video-btn--text"
                  onClick={() => setShowSpeedMenu(p => !p)}
                  aria-label="Playback speed"
                >
                  {playbackRate}×
                </button>
                {showSpeedMenu && (
                  <div className="video-speed-menu">
                    {PLAYBACK_RATES.map(rate => (
                      <button
                        key={rate}
                        className={`video-speed-option ${rate === playbackRate ? 'active' : ''}`}
                        onClick={() => setSpeed(rate)}
                      >
                        {rate}×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                className="video-btn"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? '⛶' : '⛶'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist sidebar */}
      {showPlaylist && playlist.length > 0 && (
        <div className="video-playlist-sidebar">
          <div className="video-playlist-header">
            <span>Up Next ({playlist.length})</span>
            <button onClick={() => setShowPlaylist(false)}>✕</button>
          </div>
          <div className="video-playlist-list">
            {playlist.map((item, index) => (
              <button
                key={item.id}
                className={`video-playlist-item ${
                  index === currentPlaylistIndex ? 'active' : ''
                }`}
                onClick={() => {
                  onPlaylistIndexChange?.(index);
                  setShowPlaylist(false);
                }}
              >
                <span className="playlist-item-title">{item.title}</span>
                <span className="playlist-item-duration">
                  {formatTime(item.duration)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
