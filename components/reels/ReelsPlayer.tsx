/**
 * ReelsPlayer.tsx
 *
 * TikTok/Instagram Reels style vertical snap scroll player.
 * Plays portrait videos (height > width, ratio < 0.75) full screen.
 * Horizontal videos are excluded and shown in VideoPlayer instead.
 *
 * FEATURES:
 * - Snap scroll (one reel at a time)
 * - Auto-play on enter viewport (IntersectionObserver)
 * - Pause on swipe away
 * - Mute/unmute toggle
 * - Like, share, more options overlay
 * - Double tap to like animation
 * - Progress bar at bottom
 * - Video info overlay (title, artist)
 * - Loop each reel
 */

import React, {
  useRef, useState, useEffect, useCallback,
  memo
} from 'react';
import type { ScannedMedia } from '../../types/media';
import { safeFileSrc } from '../../utils/safeUri';
import './ReelsPlayer.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReelsPlayerProps {
  reels: ScannedMedia[];
  initialIndex?: number;
  onClose?: () => void;
}

interface ReelItemProps {
  reel: ScannedMedia;
  isActive: boolean;
  isMuted: boolean;
  isLiked: boolean;
  onLikeToggle: () => void;
  onMuteToggle: () => void;
  onVideoRef: (el: HTMLVideoElement | null) => void;
}

// ─── Single Reel Item ─────────────────────────────────────────────────────────

const ReelItem = memo(function ReelItem({
  reel,
  isActive,
  isMuted,
  isLiked,
  onLikeToggle,
  onMuteToggle,
  onVideoRef,
}: ReelItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [duration, setDuration] = useState(0);
  const lastTapRef = useRef(0);

  // Forward video ref to parent
  useEffect(() => {
    onVideoRef(videoRef.current);
  }, [onVideoRef]);

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {
        // Autoplay blocked — show play button
        setIsPlaying(false);
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  // Sync mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Double tap to like
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      if (!isLiked) {
        onLikeToggle();
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
    }
    lastTapRef.current = now;
  }, [isLiked, onLikeToggle]);

  // Toggle play/pause on single tap (after double tap wait)
  const handleSingleTap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const safeSrc = safeFileSrc(reel.path);

  return (
    <div className="reel-item" onClick={handleTap}>
      <video
        ref={videoRef}
        className="reel-video"
        src={safeSrc}
        loop
        muted={isMuted}
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(e) => {
          setDuration((e.target as HTMLVideoElement).duration);
        }}
        onTimeUpdate={(e) => {
          const video = e.target as HTMLVideoElement;
          if (video.duration > 0) {
            setProgress((video.currentTime / video.duration) * 100);
          }
        }}
        onError={() => {
          console.warn('[ReelsPlayer] Video load error:', reel.title);
        }}
      />

      {/* Double tap heart animation */}
      {showHeart && (
        <div className="reel-heart-animation">❤️</div>
      )}

      {/* Play indicator (shows briefly when paused) */}
      {!isPlaying && isActive && (
        <div className="reel-play-indicator" onClick={handleSingleTap}>
          ▶
        </div>
      )}

      {/* Right side actions */}
      <div className="reel-actions">
        <button
          className="reel-action-btn"
          onClick={(e) => { e.stopPropagation(); onLikeToggle(); }}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <span className={`reel-icon ${isLiked ? 'liked' : ''}`}>
            {isLiked ? '❤️' : '🤍'}
          </span>
          <span className="reel-action-label">Like</span>
        </button>

        <button
          className="reel-action-btn"
          onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="reel-icon">{isMuted ? '🔇' : '🔊'}</span>
          <span className="reel-action-label">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>

        <button
          className="reel-action-btn"
          aria-label="More options"
        >
          <span className="reel-icon">⋯</span>
          <span className="reel-action-label">More</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="reel-info">
        <h3 className="reel-title">{reel.title}</h3>
        {reel.artist && reel.artist !== 'Unknown Artist' && (
          <p className="reel-artist">🎵 {reel.artist}</p>
        )}
        <p className="reel-folder">📁 {reel.folderName}</p>
      </div>

      {/* Progress bar */}
      <div className="reel-progress-bar">
        <div
          className="reel-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
});

// ─── Main ReelsPlayer ─────────────────────────────────────────────────────────

export function ReelsPlayer({ reels, initialIndex = 0, onClose }: ReelsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Portrait-only reels (safety filter)
  const portraitReels = reels.filter(r => r.isReel || r.orientation === 'portrait');

  // ── IntersectionObserver for auto-play ───────────────────────────────────

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const indexStr = entry.target.getAttribute('data-index');
            if (indexStr !== null) {
              setCurrentIndex(parseInt(indexStr));
            }
          }
        }
      },
      {
        root: containerRef.current,
        threshold: 0.7,
      }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  // Observe reel elements
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reelElements = container.querySelectorAll('.reel-item-wrapper');
    reelElements.forEach(el => observerRef.current?.observe(el));

    return () => {
      reelElements.forEach(el => observerRef.current?.unobserve(el));
    };
  }, [portraitReels.length]);

  // ── Scroll to initial index ───────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container || initialIndex === 0) return;

    const targetEl = container.querySelectorAll('.reel-item-wrapper')[initialIndex];
    targetEl?.scrollIntoView({ behavior: 'auto' });
  }, [initialIndex]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setCurrentIndex(prev => Math.min(prev + 1, portraitReels.length - 1));
      } else if (e.key === 'ArrowUp') {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'm') {
        setIsMuted(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [portraitReels.length, onClose]);

  // ── Programmatic scroll to current index ─────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('.reel-item-wrapper');
    const target = items[currentIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentIndex]);

  const handleLikeToggle = useCallback((id: string) => {
    setLikedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleVideoRef = useCallback((id: string) => (el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(id, el);
    else videoRefs.current.delete(id);
  }, []);

  if (portraitReels.length === 0) {
    return (
      <div className="reels-empty">
        <div className="reels-empty-icon">📱</div>
        <h3>No Reels Found</h3>
        <p>Portrait videos (taller than wide) appear here.</p>
        <p>Scan your device to find vertical videos.</p>
      </div>
    );
  }

  return (
    <div className="reels-player">
      {/* Header */}
      <div className="reels-header">
        <button className="reels-back-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <span className="reels-header-title">Reels</span>
        <span className="reels-counter">
          {currentIndex + 1} / {portraitReels.length}
        </span>
      </div>

      {/* Snap scroll container */}
      <div
        ref={containerRef}
        className="reels-scroll-container"
      >
        {portraitReels.map((reel, index) => (
          <div
            key={reel.id}
            className="reel-item-wrapper"
            data-index={index}
          >
            <ReelItem
              reel={reel}
              isActive={index === currentIndex}
              isMuted={isMuted}
              isLiked={likedItems.has(reel.id)}
              onLikeToggle={() => handleLikeToggle(reel.id)}
              onMuteToggle={() => setIsMuted(p => !p)}
              onVideoRef={handleVideoRef(reel.id)}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <div className="reels-nav">
        {currentIndex > 0 && (
          <button
            className="reels-nav-btn reels-nav-up"
            onClick={() => setCurrentIndex(p => p - 1)}
            aria-label="Previous reel"
          >
            ↑
          </button>
        )}
        {currentIndex < portraitReels.length - 1 && (
          <button
            className="reels-nav-btn reels-nav-down"
            onClick={() => setCurrentIndex(p => p + 1)}
            aria-label="Next reel"
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}
