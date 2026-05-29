
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Play, Plus, GripVertical, Trash2, Music } from 'lucide-react';
import type { Song, Playlist } from '../types.ts';
import AddSongsModal from './AddSongsModal.tsx';
import CoverArtPickerModal from './CoverArtPickerModal.tsx';
import { getRandomCoverArt, FAVORITES_PLAYLIST_ID } from './constants.ts';
import BubbleButton from './BubbleButton.tsx';
import SongListItem from './SongListItem.tsx';

interface PlaylistViewProps {
  playlist: Playlist;
  allSongs: Song[];
  onPlaySong: (song: Song, context: Song[]) => void;
  onBack: () => void;
  onUpdatePlaylist: (updatedPlaylist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
  nowPlaying: Song | null;
  isPlaying: boolean;
  onOpenSongDetails?: (song: Song) => void; // Add this prop
  onOpenLyrics?: (song: Song) => void;
  onAddToQueue?: (song: Song) => void; // Added
  onViewArtist?: (artistName: string) => void; // Added
  activeModal?: string | null;
  setActiveModal?: (modal: string | null) => void;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ playlist, allSongs, onPlaySong, onBack, onUpdatePlaylist, onDeletePlaylist, nowPlaying, isPlaying, onOpenSongDetails, onOpenLyrics, onAddToQueue, onViewArtist, activeModal, setActiveModal }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(playlist.name);
    const [editedCover, setEditedCover] = useState(playlist.coverImage);
    const [editedSongIds, setEditedSongIds] = useState(new Set(playlist.songIds));
    
    const isAddSongsModalOpen = activeModal === 'addSongs';
    const setAddSongsModalOpen = (open: boolean) => setActiveModal && setActiveModal(open ? 'addSongs' : null);
    const isCoverPickerOpen = activeModal === 'coverPicker';
    const setCoverPickerOpen = (open: boolean) => setActiveModal && setActiveModal(open ? 'coverPicker' : null);
    
    const nameContainerRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLHeadingElement>(null);
    const [isNameOverflowing, setIsNameOverflowing] = useState(false);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const listContainerRef = useRef<HTMLUListElement>(null);
    const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);

    const isFavorites = playlist.id === FAVORITES_PLAYLIST_ID;

    const handleRemoveSongDirect = (songId: string) => {
        const newSongIds = playlist.songIds.filter(id => id !== songId);
        onUpdatePlaylist({
            ...playlist,
            songIds: newSongIds
        });
    };

    useEffect(() => {
        setEditedName(playlist.name);
        setEditedCover(playlist.coverImage);
        setEditedSongIds(new Set(playlist.songIds));
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

    const playlistSongs = useMemo(() => {
        const songMap = new Map(allSongs.map(s => [s.id, s]));
        const orderedSongs = Array.from(editedSongIds).map(id => songMap.get(id));
        return orderedSongs.filter((s): s is Song => !!s);
    }, [editedSongIds, allSongs]);
    
    const isNowPlayingInPlaylist = useMemo(() => {
        if (!nowPlaying) return false;
        return playlistSongs.some(s => s.id === nowPlaying.id);
    }, [playlistSongs, nowPlaying]);

    const handleJumpToSong = () => {
        if (nowPlaying) {
            const songElement = document.getElementById(`playlist-song-${nowPlaying.id}`);
            if (songElement) {
                songElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedSongId(nowPlaying.id);
                setTimeout(() => setHighlightedSongId(null), 1500);
            }
        }
    };
    
    const handlePlayAll = () => {
        if (playlistSongs.length > 0) {
            onPlaySong(playlistSongs[0], playlistSongs);
        }
    };

    const handleRemoveSong = (songId: string) => {
        setEditedSongIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(songId);
            return newSet;
        });
    };
    
    const handleAddSongs = (newSongIds: string[]) => {
        setEditedSongIds(prev => new Set([...prev, ...newSongIds]));
    };

    const handleSave = () => {
        const newSongIds = playlistSongs.map(s => s.id);
        onUpdatePlaylist({
            ...playlist,
            name: editedName,
            coverImage: editedCover,
            songIds: newSongIds
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };
    
    const handleDragStart = (position: number) => {
        dragItem.current = position;
    };
    const handleDragEnter = (position: number) => {
        dragOverItem.current = position;
    };
    const handleDrop = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;
        
        const newPlaylistSongs = [...playlistSongs];
        const dragItemContent = newPlaylistSongs.splice(dragItem.current, 1)[0];
        newPlaylistSongs.splice(dragOverItem.current, 0, dragItemContent);
        
        const newIds = newPlaylistSongs.map(s => s.id);
        setEditedSongIds(new Set(newIds));

        dragItem.current = null;
        dragOverItem.current = null;
    };

    const backgroundStyle = playlist.bgColor
        ? { background: `linear-gradient(to bottom, ${playlist.bgColor} -20%, var(--bg-color) 70%)` }
        : {};

    return (
        <>
            <main className="h-full w-full flex flex-col" style={backgroundStyle}>
                <div className="h-40 md:h-48 flex-shrink-0 relative group pt-[env(safe-area-inset-top,0rem)]">
                    <img 
                        src={editedCover} 
                        alt={`${editedName} banner`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            if (!e.currentTarget.dataset.fallbackApplied) {
                                e.currentTarget.dataset.fallbackApplied = 'true';
                                e.currentTarget.src = getRandomCoverArt();
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/70 to-transparent"></div>
                    <button onClick={onBack} className="absolute top-[calc(env(safe-area-inset-top,0rem)+1.5rem)] left-6 text-white text-2xl bg-black/30 w-10 h-10 rounded-full z-20 flex items-center justify-center" aria-label="Back"><ArrowLeft size={24} /></button>
                    {isEditing && !isFavorites && (
                        <button onClick={() => setCoverPickerOpen(true)} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={32} />
                        </button>
                    )}
                    <div className="absolute -bottom-8 left-6 right-6 flex items-end gap-4">
                        <div ref={nameContainerRef} className="flex-1 min-w-0 pb-4">
                            {isEditing && !isFavorites ? (
                                <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="w-full bg-transparent border-b-2 border-white/50 focus:border-[var(--primary-accent)] focus:ring-0 text-4xl font-bold text-white p-0"/>
                            ) : (
                                <div className={`marquee-container ${isNameOverflowing ? 'is-overflowing' : ''}`}>
                                    <h1 ref={nameRef} className="marquee-content text-4xl font-bold text-white" title={editedName}>{editedName}</h1>
                                </div>
                            )}
                            <p className="text-sm text-neutral-400">{playlistSongs.length} songs</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-shrink-0 pt-12 p-6 flex items-center gap-4">
                    <button onClick={handlePlayAll} className="flex-1 bg-[var(--primary-accent)] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2">
                        <Play size={20} fill="currentColor" />
                        <span>Play All</span>
                    </button>
                    {!isFavorites && (
                        isEditing ? (
                            <>
                                <button onClick={handleCancel} className="flex-1 bg-[var(--chip-bg)] text-white font-bold py-3 rounded-full">Cancel</button>
                                <button onClick={handleSave} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-full">Save</button>
                            </>
                        ) : (
                             <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditing(true)} className="bg-[var(--chip-bg)] text-white font-bold py-3 px-6 rounded-full">Edit</button>
                            </div>
                        )
                    )}
                </div>

                <ul ref={listContainerRef} className="flex-1 overflow-y-auto scroll-container px-6 pb-40 space-y-2 gpu-accelerated-scroll">
                    {isEditing && !isFavorites && (
                        <button onClick={() => setAddSongsModalOpen(true)} className="w-full bg-[var(--surface-color)] border-2 border-dashed border-[var(--primary-accent)] text-[var(--primary-accent)] font-bold py-4 rounded-lg mb-4 flex items-center justify-center gap-2">
                            <Plus size={20} /> Add Songs
                        </button>
                    )}
                    {playlistSongs.map((song, index) => (
                        <li 
                            key={song.id}
                            id={`playlist-song-${song.id}`}
                            className={`group flex items-center gap-4 p-2 rounded-lg hover:bg-[var(--surface-color)] transition-colors ${song.id === highlightedSongId ? 'newly-added-highlight' : ''}`}
                            draggable={isEditing && !isFavorites}
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            {isEditing && !isFavorites && <GripVertical size={20} className="text-neutral-400 cursor-grab" />}
                             <SongListItem
                                song={song}
                                onPlaySong={() => onPlaySong(song, playlistSongs)}
                                onAddToQueue={() => onAddToQueue && onAddToQueue(song)}
                                onOpenDetails={() => onOpenSongDetails && onOpenSongDetails(song)} // Pass through
                                onViewArtist={(artist) => onViewArtist && onViewArtist(artist)}
                                isHighlighted={false}
                                nowPlaying={nowPlaying}
                                isPlaying={isPlaying}
                                showActions={!isEditing}
                                onOpenLyrics={onOpenLyrics ? () => onOpenLyrics(song) : undefined}
                            />
                            {!isEditing && !isFavorites && (
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveSongDirect(song.id); }} 
                                    className="w-10 h-10 text-neutral-400 hover:text-red-400 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:opacity-100"
                                    title="Remove from Playlist"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                            )}
                            {isEditing && !isFavorites && (
                                 <button onClick={() => handleRemoveSong(song.id)} className="w-10 h-10 text-red-400 hover:text-red-500 flex-shrink-0 flex items-center justify-center">
                                    <Trash2 size={20} />
                                 </button>
                            )}
                        </li>
                    ))}
                    {!isEditing && !isFavorites && (
                         <button onClick={() => onDeletePlaylist(playlist.id)} className="w-full mt-6 bg-red-500/10 text-red-400 font-bold py-3 rounded-full">
                            Delete Playlist
                        </button>
                    )}
                </ul>
            </main>

            {isNowPlayingInPlaylist && (
                <motion.div
                    className="fixed bottom-[calc(var(--footer-height)+6rem)] right-6 z-50"
                    drag
                    dragMomentum={false}
                    whileDrag={{ scale: 1.1 }}
                 >
                    <BubbleButton onClick={handleJumpToSong} className="!p-0 !w-14 !h-14 flex items-center justify-center" title="Jump to current song">
                        <Music size={24} />
                    </BubbleButton>
                </motion.div>
            )}

            {isAddSongsModalOpen && (
                <AddSongsModal
                    allSongs={allSongs}
                    existingSongIds={editedSongIds}
                    onClose={() => setAddSongsModalOpen(false)}
                    onAdd={handleAddSongs}
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

export default PlaylistView;
