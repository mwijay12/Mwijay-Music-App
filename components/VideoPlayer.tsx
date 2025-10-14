
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Video, Song, ProfileData } from '../types.ts';
import CommentsModal from './CommentsModal.tsx';
import { getRandomCoverArt } from '../constants.ts';

// --- Sub-Components for VideoPlayer ---

const SeekIndicator: React.FC<{direction: 'rewind' | 'forward'}> = ({ direction }) => (
    <div className={`absolute top-1/2 -translate-y-1/2 ${direction === 'forward' ? 'right-8' : 'left-8'} z-30 pointer-events-none`}>
        <div className={`seek-indicator ${direction}`}>
            <i className={`fas fa-angle-double-${direction === 'forward' ? 'right' : 'left'}`}></i>
            <i className={`fas fa-angle-double-${direction === 'forward' ? 'right' : 'left'}`}></i>
            <i className={`fas fa-angle-double-${direction === 'forward' ? 'right' : 'left'}`}></i>
        </div>
    </div>
);

const AssistantAwarenessChip: React.FC<{ isOnline: boolean, onClick: () => void, isVisible: boolean }> = ({ isOnline, onClick, isVisible }) => {
    return (
         <div 
            className="absolute bottom-28 left-4 z-30 transition-all duration-500"
            style={{ transform: isVisible ? 'translateX(0)' : 'translateX(-200px)', opacity: isVisible ? 1 : 0 }}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-2 bg-black/50 backdrop-blur-sm p-2 rounded-full text-xs font-bold text-white transition-transform hover:scale-110"
                title="Open Mwijay Assistant"
            >
                <i className="fas fa-brain text-lg text-[var(--primary-accent)]"></i>
                <span>Ask Mwijay</span>
                <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-black/50 ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`} title={isOnline ? 'Assistant is Online' : 'Assistant is Offline'}></span>
            </button>
        </div>
    );
};

// --- Main VideoPlayer Component ---
interface VideoPlayerProps {
  video: Video;
  onUpdate: (video: Video) => void;
  onReelActiveChange: (isActive: boolean) => void;
  onToggleNavVisibility: (isHidden: boolean) => void;
  onPlayAsAudio: (video: Video) => void;
  nowPlaying: Song | null;
  onUpdateProfile?: (updater: (prev: ProfileData) => ProfileData) => void; 
  profile: ProfileData;
  onPlaybackComplete: () => void;
  onOpenAssistant: () => void;
  isAssistantOnline: boolean;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};


const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onUpdate, onReelActiveChange, onToggleNavVisibility, onPlayAsAudio, nowPlaying, onUpdateProfile, profile, onPlaybackComplete, onOpenAssistant, isAssistantOnline }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const uiHideTimeout = useRef<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const loopCount = useRef(0);
  const tapTimeoutRef = useRef<number | null>(null);
  const seekIntervalRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isImmersive, setIsImmersive] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const [showSeekForward, setShowSeekForward] = useState(false);
  const [showSeekRewind, setShowSeekRewind] = useState(false);
  
  const isThisReelAudioPlaying = nowPlaying?.id === video.id && nowPlaying?.isFromReel;

  useEffect(() => {
    const checkOverflow = setTimeout(() => {
        if (titleRef.current) {
            const isOverflowing = titleRef.current.scrollWidth > titleRef.current.clientWidth;
            setIsTitleOverflowing(isOverflowing);
        }
    }, 100);
    return () => clearTimeout(checkOverflow);
  }, [video.title, areControlsVisible]);

  const resetUiTimeout = useCallback(() => {
    if (uiHideTimeout.current) clearTimeout(uiHideTimeout.current);
    if (!isImmersive) {
        setAreControlsVisible(true);
        uiHideTimeout.current = window.setTimeout(() => {
            if (isPlaying) {
                setAreControlsVisible(false);
            }
        }, 5000);
    }
  }, [isPlaying, isImmersive]);
  
  useEffect(() => {
    resetUiTimeout();
    return () => {
      if (uiHideTimeout.current) clearTimeout(uiHideTimeout.current);
    };
  }, [resetUiTimeout]);

  useEffect(() => {
    let objectUrl: string | undefined;
    if (video.videoData) {
        const blob = new Blob([video.videoData], { type: 'video/mp4' });
        objectUrl = URL.createObjectURL(blob);
        setVideoSrc(objectUrl);
    }
    return () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [video.videoData]);
  
  const handleTimeUpdate = () => {
      const videoEl = videoRef.current;
      if (videoEl) {
        setProgress(videoEl.currentTime);
        if (videoEl.duration && isFinite(videoEl.duration)) {
             setDuration(videoEl.duration);
        }
      }
  };

  const handleEnded = useCallback(() => {
      onUpdateProfile?.(p => ({ ...p, analytics: { ...p.analytics, reelsWatched: (p.analytics.reelsWatched || 0) + 1 } }));
      loopCount.current += 1;
      if (loopCount.current >= (profile.settings.reelsAutoScrollLoops || 2)) {
          onPlaybackComplete();
      } else {
          if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
          }
      }
  }, [onUpdateProfile, profile.settings.reelsAutoScrollLoops, onPlaybackComplete]);

  useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const handlePlay = () => {
            setIsPlaying(true);
            onReelActiveChange(true);
        };
        const handlePause = () => {
            setIsPlaying(false);
            onReelActiveChange(false);
        };

        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', handlePause);

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    loopCount.current = 0;
                    videoEl.play().catch(() => {});
                    resetUiTimeout();
                } else {
                    videoEl.pause();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(videoEl);

        return () => {
            observer.unobserve(videoEl);
            videoEl.removeEventListener('play', handlePlay);
            videoEl.removeEventListener('pause', handlePause);
            onReelActiveChange(false);
        };
  }, [onReelActiveChange, resetUiTimeout]);

  const handleTogglePlay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    if (isThisReelAudioPlaying) {
        onPlayAsAudio(video);
        return;
    }

    if (videoEl.paused) {
      videoEl.play().catch(()=>{});
    } else {
      videoEl.pause();
    }
    resetUiTimeout();
  }, [isThisReelAudioPlaying, onPlayAsAudio, resetUiTimeout, video]);

    const handleMainClick = () => {
        if (tapTimeoutRef.current) { // Double tap
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
            handleTogglePlay();
        } else { // First tap
            tapTimeoutRef.current = window.setTimeout(() => {
                tapTimeoutRef.current = null;
                // Single tap action: show controls and reset hide timer
                setAreControlsVisible(v => !v);
                resetUiTimeout();
            }, 300);
        }
    };
    
    const triggerSeekAnimation = (direction: 'forward' | 'rewind') => {
        if (direction === 'forward') {
            setShowSeekForward(true);
            setTimeout(() => setShowSeekForward(false), 600);
        } else {
            setShowSeekRewind(true);
            setTimeout(() => setShowSeekRewind(false), 600);
        }
    };
    
    const handleSeekBy = (delta: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + delta));
        }
    };

    const handleSeekHoldStart = (direction: 'rewind' | 'forward') => {
        if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
        triggerSeekAnimation(direction);
        seekIntervalRef.current = window.setInterval(() => {
            handleSeekBy(direction === 'forward' ? 1 : -1);
        }, 100);
    };

    const handleSeekHoldEnd = () => {
        if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
    };

    const handleToggleImmersive = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newImmersiveState = !isImmersive;
        setIsImmersive(newImmersiveState);
        onToggleNavVisibility(newImmersiveState);
        if (newImmersiveState) {
            setAreControlsVisible(false);
            if (uiHideTimeout.current) clearTimeout(uiHideTimeout.current);
        } else {
            resetUiTimeout();
        }
    };
  
    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setProgress(newTime);
        if (videoRef.current) videoRef.current.currentTime = newTime;
    };

    const areOtherControlsVisible = areControlsVisible && !isImmersive;
    const backgroundImageUrl = video.thumbnailUrl || getRandomCoverArt();

  return (
    <>
        {/* Background Static Blurred Image */}
        <div
            className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl scale-110 opacity-50 pointer-events-none"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />

        <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain relative z-10"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            playsInline
            preload="auto"
        />

        {/* Gesture Layers */}
        <div className="absolute inset-0 z-20 flex">
            <div className="w-1/3 h-full" onMouseDown={() => handleSeekHoldStart('rewind')} onMouseUp={handleSeekHoldEnd} onTouchStart={() => handleSeekHoldStart('rewind')} onTouchEnd={handleSeekHoldEnd} onMouseLeave={handleSeekHoldEnd} title="Hold to rewind" />
            <div className="w-1/3 h-full" onClick={handleMainClick} title="Double-tap to play/pause" />
            <div className="w-1/3 h-full" onMouseDown={() => handleSeekHoldStart('forward')} onMouseUp={handleSeekHoldEnd} onTouchStart={() => handleSeekHoldStart('forward')} onTouchEnd={handleSeekHoldEnd} onMouseLeave={handleSeekHoldEnd} title="Hold to fast-forward" />
        </div>
        
        {/* Center Play/Pause Indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
             <button onClick={handleTogglePlay} className={`transition-opacity duration-300 pointer-events-auto ${areOtherControlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div className={`transition-transform duration-300 transform ${isPlaying ? 'scale-0' : 'scale-100'}`}>
                    <i className="fas fa-play text-white text-6xl bg-black/30 p-4 rounded-full"></i>
                </div>
            </button>
        </div>
        
        {/* Seek Animation Indicators */}
        {showSeekRewind && <SeekIndicator direction="rewind" />}
        {showSeekForward && <SeekIndicator direction="forward" />}


        {/* Side Bar Icons */}
        <div className="absolute top-1/2 -translate-y-1/2 right-2 flex flex-col items-center gap-3 text-white z-30 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); onUpdate({ ...video, isFavorite: !video.isFavorite }); }} className={`transition-opacity duration-300 ${areOtherControlsVisible ? 'opacity-100' : 'opacity-0'}`} title={video.isFavorite ? "Unfavorite this reel" : "Favorite this reel"}>
                <i className={`${video.isFavorite ? 'fas text-red-500' : 'far'} fa-heart text-2xl`}></i>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsCommentsModalOpen(true); }} className={`transition-opacity duration-300 ${areOtherControlsVisible ? 'opacity-100' : 'opacity-0'}`} title="Comment on this reel">
                <i className="far fa-comment text-2xl"></i>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onPlayAsAudio(video); }} className={`transition-opacity duration-300 ${isThisReelAudioPlaying ? 'text-[var(--primary-accent)]' : ''} ${areOtherControlsVisible ? 'opacity-100' : 'opacity-0'}`} title={isThisReelAudioPlaying ? "Stop reel audio" : "Play audio in main player"}>
                <i className="fas fa-headphones text-2xl"></i>
            </button>
            <button onClick={handleToggleImmersive} className={`transition-opacity duration-300 ${isImmersive ? 'opacity-50 hover:opacity-100' : (areControlsVisible ? 'opacity-100' : 'opacity-0')}`} title="Toggle immersive view">
                <i className="far fa-eye text-2xl"></i>
            </button>
        </div>

        {/* Fading Footer Info */}
        <div className={`absolute left-4 right-4 bottom-36 pointer-events-none transition-opacity duration-300 z-20 ${areOtherControlsVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                <h3 ref={titleRef} className="marquee-content text-white font-bold text-sm" title={video.title}>
                    {video.title}
                </h3>
            </div>
            <p className="text-white/80 text-xs">{video.uploader}</p>
        </div>

        {/* Assistant Awareness Chip */}
        <AssistantAwarenessChip isVisible={isImmersive} isOnline={isAssistantOnline} onClick={onOpenAssistant} />

        {/* Permanent Seek Bar */}
        <div className={`absolute left-4 right-4 z-20 pointer-events-auto transition-all duration-300 ${isImmersive ? 'bottom-4' : 'bottom-24'}`}>
            <input
                type="range"
                min="0"
                max={duration || 1}
                value={progress}
                onChange={handleSeekChange}
                className="w-full video-seek-bar"
                style={{ 
                    backgroundImage: `linear-gradient(to right, var(--primary-accent), var(--secondary-accent-start), var(--secondary-accent-end))`,
                    backgroundSize: `${(progress / (duration || 1)) * 100}% 100%`,
                }}
            />
            <div className={`justify-between items-center text-white text-xs font-mono mt-1 ${isImmersive ? 'flex' : 'hidden'}`}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
            </div>
        </div>

        {isCommentsModalOpen && (
          <CommentsModal
            video={video}
            profile={profile}
            onClose={() => setIsCommentsModalOpen(false)}
            onUpdateVideo={onUpdate}
          />
        )}
    </>
  );
};

export default React.memo(VideoPlayer);
