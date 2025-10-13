import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Video, ReelPlaylist } from '../types.ts';
import CreateReelPlaylistModal from './CreateReelPlaylistModal.tsx';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';
// FIX: Imported 'getRandomCoverArt' to resolve reference error.
import { getRandomCoverArt } from '../constants.ts';


// --- Sub-component: EditReelModal ---
const EditReelModal: React.FC<{
    video: Video;
    onSave: (updatedVideo: Video) => void;
    onClose: () => void;
}> = ({ video, onSave, onClose }) => {
    const [title, setTitle] = useState(video.title);
    const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnailUrl || getRandomCoverArt());
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-30 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-[var(--surface-color)] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-lg mb-4">Edit Reel</h3>
                    <div className="flex items-center gap-4 mb-4">
                        <img src={thumbnailUrl} alt="Thumbnail" className="w-16 h-24 object-cover rounded bg-black" />
                        <button onClick={() => setIsPickerOpen(true)} className="flex-1 bg-white/10 p-3 rounded-md text-sm">Change Cover</button>
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-white/10 p-3 rounded-md mb-4"
                        placeholder="Reel Title"
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="py-2 px-4 bg-[var(--chip-bg)] rounded-md">Cancel</button>
                        <button onClick={() => onSave({ ...video, title, thumbnailUrl })} className="py-2 px-4 bg-[var(--primary-accent)] text-black rounded-md">Save</button>
                    </div>
                </div>
            </div>
            {isPickerOpen && (
                <CoverArtPickerModal
                    onClose={() => setIsPickerOpen(false)}
                    onSelect={setThumbnailUrl}
                />
            )}
        </>
    );
};

// --- Sub-component: Mini Video Preview for List View ---
const MiniPreview: React.FC<{ video: Video }> = ({ video }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        let objectUrl: string | undefined;
        if (video.videoData) {
            const blob = new Blob([video.videoData], { type: 'video/mp4' });
            objectUrl = URL.createObjectURL(blob);
            setVideoSrc(objectUrl);
        }
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [video.videoData]);
    
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) videoEl.play().catch(e => {});
            else videoEl.pause();
        }, { threshold: 0.5 });
        observer.observe(videoEl);
        return () => observer.disconnect();
    }, [videoSrc]);

    return (
        <div className="w-16 h-24 bg-black rounded-md flex-shrink-0 overflow-hidden">
           {videoSrc && <video ref={videoRef} src={videoSrc} muted loop playsInline className="w-full h-full object-cover" />}
        </div>
    );
};


// --- Main ManageReelsView Component ---
const ManageReelsView: React.FC<{
    videos: Video[];
    reelPlaylists: ReelPlaylist[];
    onUpdateVideo: (video: Video) => void;
    onUpdateReelPlaylists: (playlists: ReelPlaylist[]) => void;
    onBack: () => void;
    onPlayReel: (videoId: string) => void;
    showNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
    onViewReelPlaylist: (playlistId: string) => void;
}> = ({ videos, reelPlaylists, onUpdateVideo, onUpdateReelPlaylists, onBack, onPlayReel, showNotification, onViewReelPlaylist }) => {
    const [activeTab, setActiveTab] = useState<'my_reels' | 'playlists' | 'favorites' | 'commented'>('my_reels');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [editingReel, setEditingReel] = useState<Video | null>(null);
    const [isCreatePlaylistOpen, setCreatePlaylistOpen] = useState(false);

    const favoriteReels = useMemo(() => videos.filter(v => v.isFavorite), [videos]);
    const commentedReels = useMemo(() => videos.filter(v => v.comments && v.comments.length > 0), [videos]);

    const handleSaveReel = (updatedVideo: Video) => {
        onUpdateVideo(updatedVideo);
        setEditingReel(null);
        showNotification("Reel updated successfully!", 'success');
    };
    
    const renderReelList = (reelList: Video[]) => (
        reelList.map(video => (
            <div key={video.id} className="flex items-center gap-4 bg-[var(--surface-color)] p-2 rounded-lg">
                <MiniPreview video={video} />
                <div className="flex-1 min-w-0">
                   <p className="font-bold truncate">{video.title}</p>
                   <p className="text-xs text-neutral-400 italic truncate">{video.comments?.length || 0} comments</p>
                </div>
                <button onClick={() => onPlayReel(video.id)} className="p-2 text-neutral-300 hover:text-white" title={`Play ${video.title}`}><i className="fas fa-play"></i></button>
                <button onClick={() => setEditingReel(video)} className="p-2 text-neutral-300 hover:text-white" title={`Edit ${video.title}`}><i className="fas fa-pen"></i></button>
            </div>
        ))
    );

    const renderReelGrid = (reelList: Video[]) => (
         <div className="grid grid-cols-3 gap-2">
            {reelList.map(video => (
                 <button key={video.id} onClick={() => onPlayReel(video.id)} className="relative aspect-[9/16] bg-black rounded-md overflow-hidden group" title={`Play ${video.title}`}>
                     <MiniPreview video={video} />
                     <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100">
                         <i className="fas fa-play text-white text-2xl"></i>
                     </div>
                 </button>
            ))}
         </div>
    );
    
    const renderContent = () => {
        const contentMap = {
            'my_reels': videos,
            'playlists': [], // Handled separately
            'favorites': favoriteReels,
            'commented': commentedReels,
        };
        const listToRender = contentMap[activeTab];

        if (activeTab === 'playlists') {
             return (
                    <div>
                        <button onClick={() => setCreatePlaylistOpen(true)} className="w-full text-left bg-[var(--surface-color)] p-4 rounded-lg flex items-center gap-4 mb-4" title="Create New Playlist">
                             <div className="w-16 h-16 bg-[var(--primary-accent)]/20 rounded flex-shrink-0 flex items-center justify-center"><i className="fas fa-plus text-2xl text-[var(--primary-accent)]"></i></div>
                             <p className="font-bold">Create New Playlist</p>
                        </button>
                        {reelPlaylists.map(pl => (
                             <button key={pl.id} onClick={() => onViewReelPlaylist(pl.id)} className="w-full flex items-center gap-4 bg-[var(--surface-color)] p-2 rounded-lg mb-2 text-left">
                                <img src={pl.coverImage} alt={pl.name} className="w-16 h-16 bg-black rounded object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{pl.name}</p>
                                    <p className="text-xs text-neutral-400">{pl.videoIds.length} reels</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )
        }
        
        return viewMode === 'list' ? renderReelList(listToRender) : renderReelGrid(listToRender);
    };

    return (
         <>
         <main className="h-full w-full bg-[var(--bg-color)] overflow-y-auto scroll-container p-6 pb-40">
            <header className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                     <button onClick={onBack} className="text-2xl" aria-label="Back to Reels" title="Back to Reels"><i className="fas fa-arrow-left"></i></button>
                    <div>
                        <h1 className="text-3xl font-bold">Manage Reels</h1>
                        <p className="text-neutral-400">Organize and edit your collection</p>
                    </div>
                </div>
            </header>
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-1 p-1 bg-[var(--surface-color)] rounded-full">
                    <button onClick={() => setActiveTab('my_reels')} className={`py-2 px-4 text-sm font-bold rounded-full ${activeTab === 'my_reels' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`} title="View My Reels">My Reels</button>
                    <button onClick={() => setActiveTab('playlists')} className={`py-2 w-12 text-sm rounded-full ${activeTab === 'playlists' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`} title="Playlists"><i className="fas fa-layer-group"></i></button>
                    <button onClick={() => setActiveTab('favorites')} className={`py-2 w-12 text-sm rounded-full ${activeTab === 'favorites' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`} title="Favorites"><i className="fas fa-heart"></i></button>
                    <button onClick={() => setActiveTab('commented')} className={`py-2 w-12 text-sm rounded-full ${activeTab === 'commented' ? 'bg-[var(--primary-accent)] text-black' : 'text-neutral-300'}`} title="Commented"><i className="fas fa-comment"></i></button>
                </div>
                {activeTab !== 'playlists' && (
                    <div className="flex items-center gap-1 p-1 bg-[var(--surface-color)] rounded-full">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full ${viewMode === 'list' ? 'bg-[var(--primary-accent)] text-black' : ''}`} title="List View"><i className="fas fa-list"></i></button>
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full ${viewMode === 'grid' ? 'bg-[var(--primary-accent)] text-black' : ''}`} title="Grid View"><i className="fas fa-grip-horizontal"></i></button>
                    </div>
                )}
            </div>
            <div className="space-y-3">{renderContent()}</div>
            
        </main>
        {editingReel && <EditReelModal video={editingReel} onSave={handleSaveReel} onClose={() => setEditingReel(null)} />}
        {isCreatePlaylistOpen && <CreateReelPlaylistModal videos={videos} onSave={(playlist) => { onUpdateReelPlaylists([...reelPlaylists, playlist]); setCreatePlaylistOpen(false); showNotification('Playlist created!', 'success'); }} onClose={() => setCreatePlaylistOpen(false)} />}
        </>
    );
};

export default ManageReelsView;
