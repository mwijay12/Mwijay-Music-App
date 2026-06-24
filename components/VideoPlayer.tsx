
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronsRight, ChevronsLeft, Brain, Heart, MessageSquare, Headphones, Share2, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import type { Video, Song, ProfileData } from '../types.ts';
import CommentsModal from './CommentsModal.tsx';
import { getRandomCoverArt } from './constants.ts';
import { shareTextOrUrl } from '../utils/helpers.ts';
import { Capacitor } from '@capacitor/core';

// --- Sub-Components for VideoPlayer ---

const SeekIndicator: React.FC<{direction: 'rewind' | 'forward'}> = ({ direction }) => (
    <div className={`absolute top-1/2 -translate-y-1/2 ${direction === 'forward' ? 'right-8' : 'left-8'} z-30 pointer-events-none`}>
        <div className={`seek-indicator ${direction}`}>
            {direction === 'forward' ? <ChevronsRight size={48} /> : <ChevronsLeft size={48} />}
        </div>
    </div>
);

const AssistantAwarenessChip: React.FC<{ isOnline: boolean, onClick: () => void, isVisible: boolean }> = ({ isOnline, onClick, isVisible }) => {
    return (
         <div 
            className="absolute bottom-36 left-4 z-30 transition-all duration-500"
            style={{ transform: isVisible ? 'translateX(0)' : 'translateX(-200px)', opacity: isVisible ? 1 : 0 }}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-2 bg-black/50 backdrop-blur-sm p-2 rounded-full text-xs font-bold text-white transition-transform hover:scale-110"
                title="Open Mwijay Assistant"
            >
                <Brain size={20} className="text-[var(--primary-accent)]" />
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
  onPlayAsAudio: (video: Video) => void;
  nowPlaying: Song | null;
  onUpdateProfile?: (updater: (prev: ProfileData) => ProfileData) => void; 
  profile: ProfileData;
  onPlaybackComplete: () => void;
  onOpenAssistant: () => void;
  isAssistantOnline: boolean;
  showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onToggleReelsUiVisibility: () => void;
}

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const floorSeconds = Math.floor(seconds);
    const min = Math.floor(floorSeconds / 60);
    const sec = floorSeconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};


const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onUpdate, onReelActiveChange, onPlayAsAudio, nowPlaying, onUpdateProfile, profile, onPlaybackComplete, onOpenAssistant, isAssistantOnline, showNotification, onToggleReelsUiVisibility }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const uiHideTimeout = useRef<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const centerTapTimer = useRef<number | null>(null);
  const leftTapTimer = useRef<number | null>(null);
  const rightTapTimer = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const [showSeekForward, setShowSeekForward] = useState(false);
  const [showSeekRewind, setShowSeekRewind] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [isUiMinimal, setIsUiMinimal] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('mwijay_reels_muted') === 'true');
  
  const isThisReelAudioPlaying = nowPlaying?.id === video.id && nowPlaying?.isFromReel;

  // Sync mute state with video element
  useEffect(() => {
    if (videoRef.current) {
        videoRef.current.muted = isMuted;
    }
  }, [isMuted, videoSrc]);

  const handleToggleMute = useCallback(() => {
      setIsMuted(prev => {
          const next = !prev;
          localStorage.setItem('mwijay_reels_muted', String(next));
          if (videoRef.current) videoRef.current.muted = next;
          return next;
      });
  }, []);

  const handleToggleControls = useCallback(() => {
    setAreControlsVisible(prev => !prev);
  }, []);
  
  const resetUiTimeout = useCallback(() => {
    if (uiHideTimeout.current) clearTimeout(uiHideTimeout.current);
    if (!areControlsVisible) {
        setAreControlsVisible(true);
    }
    uiHideTimeout.current = window.setTimeout(() => {
        if (isPlaying && areControlsVisible) {
            setAreControlsVisible(false);
            setIsSpeedMenuOpen(false);
        }
    }, 4000);
  }, [isPlaying, areControlsVisible]);

  useEffect(() => {
    resetUiTimeout();
    return () => { if (uiHideTimeout.current) clearTimeout(uiHideTimeout.current); };
  }, [resetUiTimeout]);

  useEffect(() => {
    let objectUrl: string | undefined;
    if (video.videoData) {
        const blob = new Blob([video.videoData], { type: 'video/mp4' });
        objectUrl = URL.createObjectURL(blob);
        setVideoSrc(objectUrl);
    } else if (video.nativeUrl && Capacitor.isNativePlatform()) {
        setVideoSrc(Capacitor.convertFileSrc(video.nativeUrl));
    } else if (video.url) {
        setVideoSrc(video.url);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [video.videoData, video.url, video.nativeUrl]);
  
  const handleTimeUpdate = () => {
      const videoEl = videoRef.current;
      if (videoEl) {
        setProgress(videoEl.currentTime);
      }
  };

  const handleLoadedMetadata = () => {
    const videoEl = videoRef.current;
    if (videoEl) {
        if (isFinite(videoEl.duration)) setDuration(videoEl.duration);
        setVideoDimensions({ width: videoEl.videoWidth, height: videoEl.videoHeight });
    }
  };

  const handleEnded = useCallback(() => {
      onUpdateProfile?.(p => ({ ...p, analytics: { ...p.analytics, reelsWatched: (p.analytics.reelsWatched || 0) + 1 } }));
      
      const loopLimit = profile.settings.reelsAutoScrollLoops;
      if (loopLimit > 0 && loopCount + 1 < loopLimit) {
          setLoopCount(prev => prev + 1);
          if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(()=>{});
          }
      } else {
          onPlaybackComplete();
      }
  }, [onUpdateProfile, onPlaybackComplete, profile.settings.reelsAutoScrollLoops, loopCount]);

  useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const handlePlay = () => { setIsPlaying(true); onReelActiveChange(true); };
        const handlePause = () => { setIsPlaying(false); onReelActiveChange(false); };

        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', handlePause);

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setLoopCount(0);
                    videoEl.play().catch(() => {});
                    resetUiTimeout();
                    setShowGestureHint(true);
                    setTimeout(() => setShowGestureHint(false), 3000);
                } else {
                    videoEl.pause();
                }
            }, { threshold: 0.5 }
        );

        observer.observe(videoEl);

        return () => {
            observer.unobserve(videoEl);
            videoEl.removeEventListener('play', handlePlay);
            videoEl.removeEventListener('pause', handlePause);
            onReelActiveChange(false);
        };
  }, [onReelActiveChange, resetUiTimeout, videoSrc]);

  const handleTogglePlay = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) videoEl.play().catch(()=>{});
    else videoEl.pause();
    resetUiTimeout();
  }, [resetUiTimeout]);

    const triggerSeekAnimation = (direction: 'forward' | 'rewind') => {
        const setter = direction === 'forward' ? setShowSeekForward : setShowSeekRewind;
        setter(true);
        setTimeout(() => setter(false), 600);
    };

    const handleSeekBy = useCallback((delta: number) => {
        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.currentTime = Math.max(0, Math.min(duration, videoEl.currentTime + delta));
            triggerSeekAnimation(delta > 0 ? 'forward' : 'rewind');
        }
    }, [duration]);

    const handleTap = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const tapX = e.clientX - rect.left;
        const region = tapX / rect.width;

        if (region < 0.3) { // Left region
            if (leftTapTimer.current) {
                clearTimeout(leftTapTimer.current);
                leftTapTimer.current = null;
                handleSeekBy(-profile.settings.reelSeekDuration);
            } else {
                leftTapTimer.current = window.setTimeout(() => {
                    leftTapTimer.current = null;
                    handleToggleControls();
                }, 250);
            }
        } else if (region > 0.7) { // Right region
             if (rightTapTimer.current) {
                clearTimeout(rightTapTimer.current);
                rightTapTimer.current = null;
                handleSeekBy(profile.settings.reelSeekDuration);
            } else {
                rightTapTimer.current = window.setTimeout(() => {
                    rightTapTimer.current = null;
                    handleToggleControls();
                }, 250);
            }
        } else { // Center region
            if (centerTapTimer.current) {
                clearTimeout(centerTapTimer.current);
                centerTapTimer.current = null;
                handleTogglePlay(); // Double tap center -> play/pause
            } else {
                centerTapTimer.current = window.setTimeout(() => {
                    centerTapTimer.current = null;
                    handleToggleControls(); // Single tap center -> toggle controls
                }, 250);
            }
        }
    };
    
    const handleLike = () => {
        setShowLikeAnim(true);
        onUpdate({ ...video, isFavorite: true });
        setTimeout(() => setShowLikeAnim(false), 1000);
    };

    const handleToggleFavorite = () => {
        if (!video.isFavorite) {
            handleLike();
        } else {
            onUpdate({ ...video, isFavorite: false });
        }
    };
    
    useEffect(() => {
        if(titleRef.current) setIsTitleOverflowing(titleRef.current.scrollWidth > titleRef.current.clientWidth);
    }, [video.title]);
    
    useEffect(() => {
        const videoEl = videoRef.current;
        if(videoEl) videoEl.playbackRate = currentSpeed;
    }, [currentSpeed]);

    const handleToggleMinimalUi = () => {
        setIsUiMinimal(prev => !prev);
        onToggleReelsUiVisibility();
    };

    return (
        <div className="w-full h-full bg-black relative">
            {showSeekRewind && <SeekIndicator direction="rewind" />}
            {showSeekForward && <SeekIndicator direction="forward" />}
            {showLikeAnim && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"><Heart size={96} className="text-white fill-white heart-pop-anim" /></div>}

            <video
                ref={videoRef}
                src={videoSrc}
                loop={profile.settings.reelsAutoScrollLoops === 0}
                playsInline
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
            />

            <div 
                className="absolute inset-0 z-20"
                onClick={handleTap}
            />

            {areControlsVisible && !isUiMinimal && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/70 pointer-events-none z-20" />
            )}

            <AssistantAwarenessChip isOnline={isAssistantOnline} onClick={onOpenAssistant} isVisible={areControlsVisible && !isUiMinimal} />
            
            <AnimatePresence>
                {areControlsVisible && !isUiMinimal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 left-0 right-0 p-4 pt-6 z-30 pointer-events-none"
                    >
                        <div className={`marquee-container ${isTitleOverflowing ? 'is-overflowing' : ''}`}>
                            <h2 ref={titleRef} className="marquee-content text-lg font-bold text-white shadow-md">{video.title}</h2>
                        </div>
                        <p className="text-sm text-neutral-300 shadow-md">{video.uploader}</p>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className={`absolute right-2 top-[55%] lg:top-[58%] -translate-y-1/2 flex flex-col items-center gap-4 transition-opacity duration-300 z-30 ${areControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 {!isUiMinimal && (
                    <>
                        <button onClick={handleToggleFavorite} className="flex items-center justify-center text-white group cursor-pointer" title={video.isFavorite ? 'Unfavorite' : 'Favorite'}>
                            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-red-500/20 group-hover:border-red-500/30 transition-all">
                                <Heart size={20} className={video.isFavorite ? 'text-red-500 fill-red-500' : 'text-white'} />
                            </div>
                        </button>
                        <button onClick={() => setIsCommentsModalOpen(true)} className="flex items-center justify-center text-white group cursor-pointer" title="View Comments">
                            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                <MessageSquare size={20} />
                            </div>
                        </button>
                        <button 
                            onClick={() => {
                                onPlayAsAudio(video);
                                showNotification(`Streaming "${video.title}" audio in background... 🎧`, 'success');
                            }} 
                            className={`flex items-center justify-center text-white group cursor-pointer ${isThisReelAudioPlaying ? 'animate-pulse' : ''}`} 
                            title="Continue Play as Audio"
                        >
                            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-[var(--primary-accent)]/20 group-hover:border-[var(--primary-accent)]/30 transition-all">
                                <Headphones size={20} />
                            </div>
                        </button>
                        <button 
                            onClick={shareTextOrUrl.bind(null, `Watching ${video.title} on Mwijay Reels`, `Check out this reel by ${video.uploader}!`, 'https://mwijay.app', showNotification)} 
                            className="flex items-center justify-center text-white group cursor-pointer" 
                            title="Share"
                        >
                            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                <Share2 size={20} />
                            </div>
                        </button>
                        <button 
                            onClick={handleToggleMute} 
                            className="flex items-center justify-center text-white group cursor-pointer" 
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                {isMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} />}
                            </div>
                        </button>
                    </>
                 )}
                 <button onClick={handleToggleMinimalUi} className={`flex items-center justify-center text-white cursor-pointer transition-opacity ${isUiMinimal ? 'opacity-40' : ''}`} title="Toggle Immersive UI">
                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                        {isUiMinimal ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                </button>
            </div>
            
            <AnimatePresence>
                {areControlsVisible && !isUiMinimal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-30 pointer-events-none"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">{formatTime(progress)}</span>
                            <div className="w-full h-1 bg-white/30 rounded-full flex-1">
                                <div className="h-full bg-white rounded-full" style={{ width: `${(progress / duration) * 100}%` }} />
                            </div>
                            <span className="text-xs font-mono">{formatTime(duration)}</span>
                            <div className="relative">
                                <button onClick={() => setIsSpeedMenuOpen(p => !p)} className="w-10 h-8 text-xs font-bold bg-white/20 rounded-md pointer-events-auto">{currentSpeed}x</button>
                                {isSpeedMenuOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-black/50 backdrop-blur-sm rounded-md overflow-hidden pointer-events-auto">
                                        {[0.5, 1, 1.5, 2].map(speed => (
                                            <button key={speed} onClick={() => {setCurrentSpeed(speed); setIsSpeedMenuOpen(false);}} className="block w-full px-4 py-2 text-xs font-bold text-left hover:bg-white/20">{speed}x</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
             {isCommentsModalOpen && (
                <CommentsModal 
                    video={video} 
                    profile={profile} 
                    onClose={() => setIsCommentsModalOpen(false)} 
                    onUpdateVideo={onUpdate}
                />
            )}
        </div>
    );
};

export default VideoPlayer;
