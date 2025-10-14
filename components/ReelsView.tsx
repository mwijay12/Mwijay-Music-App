import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Video, ReelPlaylist, ProfileData, Song } from '../types.ts';
import VideoPlayer from './VideoPlayer.tsx';
import ManageReelsView from './ManageReelsView.tsx';

interface ReelsViewProps {
    videos: Video[];
    reelPlaylists: ReelPlaylist[];
    onUpdate: (updater: (prev: Video[]) => Video[]) => void;
    onUpdateReelPlaylists: (playlists: ReelPlaylist[]) => void;
    isLibraryPlaying: boolean;
    onReelActiveChange: (isActive: boolean) => void;
    showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
    onToggleNavVisibility: (isHidden: boolean) => void;
    profile: ProfileData;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
    onPlayReelAsAudio: (video: Video) => void;
    nowPlaying: Song | null;
    onOpenAssistant: () => void;
    isAssistantOnline: boolean;
    onViewReelPlaylist: (playlistId: string) => void;
    initialVideoId?: string | null;
}

const ReelsView: React.FC<ReelsViewProps> = ({
    videos,
    reelPlaylists,
    onUpdate,
    onUpdateReelPlaylists,
    isLibraryPlaying,
    onReelActiveChange,
    showNotification,
    onToggleNavVisibility,
    profile,
    onUpdateProfile,
    onPlayReelAsAudio,
    nowPlaying,
    onOpenAssistant,
    isAssistantOnline,
    onViewReelPlaylist,
    initialVideoId,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isManaging, setIsManaging] = useState(false);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const reelsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialVideoId) {
            const videoElement = document.getElementById(`reel-${initialVideoId}`);
            if (videoElement) {
                videoElement.scrollIntoView({ behavior: 'auto' });
            }
        }
    }, [initialVideoId]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        showNotification(`Importing ${files.length} reel(s)...`, 'info');
        const videoFiles = Array.from(files).filter((file: File) => file.type.startsWith('video/'));

        const newVideos: Video[] = await Promise.all(
            videoFiles.map((file: File) => new Promise<Video>((resolve) => {
                const reader = new FileReader();
                reader.onload = e => {
                    const videoData = e.target?.result as ArrayBuffer;
                    resolve({
                        id: `video-${file.name}-${file.lastModified}`,
                        title: file.name.replace(/\.[^/.]+$/, ""),
                        videoData,
                        isFavorite: false,
                        comments: [],
                    });
                };
                reader.readAsArrayBuffer(file);
            }))
        );

        onUpdate((prevVideos) => [...prevVideos, ...newVideos]);
        showNotification(`${newVideos.length} reel(s) added successfully!`, 'success');
        if(event.target) event.target.value = ''; // Reset input
        
        if (newVideos.length > 0) {
            const firstNewVideoId = newVideos[0].id;
            setTimeout(() => {
                const newReelElement = document.getElementById(`reel-${firstNewVideoId}`);
                newReelElement?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };
    
    const handleUpdateSingleVideo = useCallback((updatedVideo: Video) => {
        onUpdate(prevVideos => prevVideos.map(v => v.id === updatedVideo.id ? updatedVideo : v));
    }, [onUpdate]);

    const handlePlaybackComplete = () => {
        const container = reelsContainerRef.current;
        if (container && videos.length > 1) {
            const nextIndex = (currentVideoIndex + 1) % videos.length;
            const nextVideoElement = document.getElementById(`reel-${videos[nextIndex].id}`);
            if (nextVideoElement) {
                nextVideoElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };
    
    useEffect(() => {
        const container = reelsContainerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const index = videos.findIndex(v => `reel-${v.id}` === entry.target.id);
                        if (index !== -1) {
                            setCurrentVideoIndex(index);
                        }
                    }
                });
            },
            { threshold: 0.5 }
        );

        const videoElements = Array.from(container.children);
        videoElements.forEach((el: Element) => observer.observe(el));
        
        return () => observer.disconnect();
    }, [videos]);


    if (isManaging) {
        return <ManageReelsView
            videos={videos}
            reelPlaylists={reelPlaylists}
            onUpdateVideo={handleUpdateSingleVideo}
            onUpdateReelPlaylists={onUpdateReelPlaylists}
            onBack={() => setIsManaging(false)}
            onPlayReel={(videoId) => {
                const index = videos.findIndex(v => v.id === videoId);
                if (index !== -1) {
                    setIsManaging(false);
                    setTimeout(() => {
                        const el = document.getElementById(`reel-${videoId}`);
                        el?.scrollIntoView();
                    }, 0);
                }
            }}
            showNotification={showNotification}
            onViewReelPlaylist={onViewReelPlaylist}
        />;
    }

    return (
        <div className="h-full w-full bg-[var(--bg-color)] relative">
            <header className="absolute top-0 left-0 right-0 z-40 flex justify-between items-center p-4 text-[var(--text-primary)] bg-gradient-to-b from-black/50 to-transparent">
                <h1 className="font-bold text-xl">Mwijay Reels</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-[var(--chip-bg)] text-white w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105" title="Upload Reel"><i className="fas fa-plus text-xl"></i></button>
                    <button onClick={() => setIsManaging(true)} className="bg-[var(--chip-bg)] text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-transform hover:scale-105" title="Manage Reels">
                        <i className="fas fa-folder-open"></i>
                        <span>Manage</span>
                    </button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*" multiple className="hidden" />
            </header>

            {videos.length > 0 ? (
                <div ref={reelsContainerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory">
                    {videos.map((video) => (
                        <div key={video.id} id={`reel-${video.id}`} className="h-full w-full snap-start relative flex items-center justify-center">
                            <VideoPlayer
                                video={video}
                                onUpdate={handleUpdateSingleVideo}
                                isLibraryPlaying={isLibraryPlaying}
                                onReelActiveChange={onReelActiveChange}
                                onToggleNavVisibility={onToggleNavVisibility}
                                onPlayAsAudio={onPlayReelAsAudio}
                                nowPlaying={nowPlaying}
                                profile={profile}
                                onUpdateProfile={onUpdateProfile}
                                onPlaybackComplete={handlePlaybackComplete}
                                onOpenAssistant={onOpenAssistant}
                                isAssistantOnline={isAssistantOnline}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center text-white p-4">
                    <i className="fas fa-video-slash text-5xl text-neutral-500 mb-4"></i>
                    <h2 className="font-bold text-xl">No Mwijay Reels Yet</h2>
                    <p className="text-neutral-400 mt-2">Tap the <i className="fas fa-plus"></i> icon at the top to upload your first reel to Mwijay Music.</p>
                </div>
            )}
        </div>
    );
};

export default ReelsView;