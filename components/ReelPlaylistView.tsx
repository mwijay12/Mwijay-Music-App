import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Video, ReelPlaylist } from '../types.ts';
import AddReelsModal from './AddReelsModal.tsx';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';

interface ReelPlaylistViewProps {
  playlist: ReelPlaylist;
  allVideos: Video[];
  onPlayReel: (videoId: string) => void;
  onBack: () => void;
  onUpdatePlaylist: (updatedPlaylist: ReelPlaylist) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

const ReelPlaylistView: React.FC<ReelPlaylistViewProps> = ({ playlist, allVideos, onPlayReel, onBack, onUpdatePlaylist, onDeletePlaylist }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(playlist.name);
    const [editedCover, setEditedCover] = useState(playlist.coverImage);
    const [editedVideoIds, setEditedVideoIds] = useState(new Set(playlist.videoIds));
    const [isAddReelsModalOpen, setAddReelsModalOpen] = useState(false);
    const [isCoverPickerOpen, setCoverPickerOpen] = useState(false);
    
    const nameContainerRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLHeadingElement>(null);
    const [isNameOverflowing, setIsNameOverflowing] = useState(false);

    useEffect(() => {
        setEditedName(playlist.name);
        setEditedCover(playlist.coverImage);
        setEditedVideoIds(new Set(playlist.videoIds));
    }, [playlist, isEditing]);

    useEffect(() => {
        const checkOverflow = () => {
            if (nameRef.current && nameContainerRef.current) {
                const isOverflowing = nameRef.current.scrollWidth > nameContainerRef.current.clientWidth;
                setIsNameOverflowing(isOverflowing);
            }
        };
        const timeoutId = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => { clearTimeout(timeoutId); window.removeEventListener('resize', checkOverflow); };
    }, [editedName]);

    const playlistVideos = useMemo(() => 
        Array.from(editedVideoIds).map(id => allVideos.find(s => s.id === id)).filter((s): s is Video => !!s)
    , [editedVideoIds, allVideos]);

    const handlePlayAll = () => {
        if (playlistVideos.length > 0) {
            onPlayReel(playlistVideos[0].id);
        }
    };

    const handleRemoveVideo = (videoId: string) => {
        setEditedVideoIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(videoId);
            return newSet;
        });
    };
    
    const handleAddVideos = (newVideoIds: string[]) => {
        setEditedVideoIds(prev => new Set([...prev, ...newVideoIds]));
    };

    const handleSave = () => {
        onUpdatePlaylist({
            ...playlist,
            name: editedName,
            coverImage: editedCover,
            videoIds: Array.from(editedVideoIds)
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <>
            <main className="h-full w-full bg-[var(--bg-color)] flex flex-col">
                <div className="h-40 md:h-48 flex-shrink-0 relative group">
                    <img src={editedCover} alt={`${editedName} banner`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/70 to-transparent"></div>
                    <button onClick={onBack} className="absolute top-6 left-6 text-white text-2xl bg-black/30 w-10 h-10 rounded-full z-20" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                    {isEditing && (
                        <button onClick={() => setCoverPickerOpen(true)} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <i className="fas fa-camera text-2xl"></i>
                        </button>
                    )}
                    <div className="absolute -bottom-8 left-6 right-6 flex items-end gap-4">
                        <div ref={nameContainerRef} className="flex-1 min-w-0 pb-4">
                            {isEditing ? (
                                <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="w-full bg-transparent border-b-2 border-white/50 focus:border-[var(--primary-accent)] focus:ring-0 text-4xl font-bold text-white p-0"/>
                            ) : (
                                <div className={`marquee-container ${isNameOverflowing ? 'is-overflowing' : ''}`}>
                                    <h1 ref={nameRef} className="marquee-content text-4xl font-bold text-white" title={editedName}>{editedName}</h1>
                                </div>
                            )}
                            <p className="text-sm text-neutral-400">{playlistVideos.length} reels</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-shrink-0 pt-12 p-6 flex items-center gap-4">
                    {!isEditing && (
                         <button onClick={handlePlayAll} className="flex-1 bg-[var(--primary-accent)] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2">
                            <i className="fas fa-play"></i>
                            <span>Play All</span>
                        </button>
                    )}
                    {isEditing ? (
                        <>
                            <button onClick={handleCancel} className="flex-1 bg-[var(--chip-bg)] text-white font-bold py-3 rounded-full">Cancel</button>
                            <button onClick={handleSave} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-full">Save</button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="bg-[var(--chip-bg)] text-white font-bold py-3 px-6 rounded-full">Edit</button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto scroll-container px-6 pb-40 space-y-2">
                    {isEditing && (
                        <button onClick={() => setAddReelsModalOpen(true)} className="w-full bg-[var(--surface-color)] border-2 border-dashed border-[var(--primary-accent)] text-[var(--primary-accent)] font-bold py-4 rounded-lg mb-4">
                            <i className="fas fa-plus mr-2"></i> Add Reels
                        </button>
                    )}
                    {playlistVideos.map(video => (
                        <div key={video.id} className="group flex items-center gap-4 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors">
                            <div className="w-14 h-24 rounded-md bg-[var(--chip-bg)] object-cover flex-shrink-0 overflow-hidden" onClick={() => onPlayReel(video.id)}>
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover"/>
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => onPlayReel(video.id)}>
                                <p className="font-bold leading-tight cursor-pointer">{video.title}</p>
                                <p className="text-sm text-neutral-400 cursor-pointer">{video.uploader}</p>
                            </div>
                            {isEditing ? (
                                 <button onClick={() => handleRemoveVideo(video.id)} className="w-10 h-10 text-red-400 hover:text-red-500 flex-shrink-0 flex items-center justify-center">
                                    <i className="fas fa-trash"></i>
                                </button>
                            ) : (
                                <button onClick={() => onPlayReel(video.id)} className="w-12 h-12 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i className="fas fa-play text-lg"></i>
                                </button>
                            )}
                        </div>
                    ))}
                    {!isEditing && (
                         <button onClick={() => onDeletePlaylist(playlist.id)} className="w-full mt-6 bg-red-500/10 text-red-400 font-bold py-3 rounded-full">
                            Delete Playlist
                        </button>
                    )}
                </div>
            </main>

            {isAddReelsModalOpen && (
                <AddReelsModal
                    allVideos={allVideos}
                    existingVideoIds={editedVideoIds}
                    onClose={() => setAddReelsModalOpen(false)}
                    onAdd={handleAddVideos}
                />
            )}
             {isCoverPickerOpen && (
                <CoverArtPickerModal
                    onClose={() => setCoverPickerOpen(false)}
                    onSelect={setEditedCover}
                />
            )}
        </>
    );
};

export default ReelPlaylistView;
