import React, { useState, useEffect, useRef } from 'react';
import type { Song, Artist } from '../types.ts';
import { getArtist } from './db.ts';

interface ArtistViewProps {
    artistName: string;
    allSongs: Song[];
    onPlaySong: (song: Song, context: Song[]) => void;
    onBack: () => void;
    onSaveArtist: (artist: Artist) => void;
}

const ArtistView: React.FC<ArtistViewProps> = ({ artistName, allSongs, onPlaySong, onBack, onSaveArtist }) => {
    const artistSongs = allSongs.filter(s => s.artist === artistName);
    const defaultImage = artistSongs[0]?.albumArtUrl || 'https://i.imgur.com/vB62j5K.png';

    const [artistData, setArtistData] = useState<Artist>({ name: artistName, avatarUrl: defaultImage, bannerUrl: defaultImage, bio: '' });
    const [isEditing, setIsEditing] = useState(false);
    
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const nameContainerRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLHeadingElement>(null);
    const [isNameOverflowing, setIsNameOverflowing] = useState(false);
    
    useEffect(() => {
        const checkOverflow = () => {
            if (nameRef.current && nameContainerRef.current) {
                const isOverflowing = nameRef.current.scrollWidth > nameContainerRef.current.clientWidth;
                setIsNameOverflowing(isOverflowing);
            }
        };

        const timeoutId = setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', checkOverflow);
        };
    }, [artistName]);

    useEffect(() => {
        const fetchArtistData = async () => {
            const storedArtist = await getArtist(artistName);
            if (storedArtist) {
                setArtistData(prev => ({...prev, ...storedArtist}));
            } else {
                 setArtistData({ name: artistName, avatarUrl: defaultImage, bannerUrl: defaultImage, bio: `Songs by ${artistName}. Edit this bio to add more details!` });
            }
        };
        fetchArtistData();
    }, [artistName, defaultImage]);

    const handlePlayAll = () => {
        if (artistSongs.length > 0) {
            onPlaySong(artistSongs[0], artistSongs);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                if(type === 'avatar') setArtistData(p => ({ ...p, avatarUrl: url }));
                else setArtistData(p => ({...p, bannerUrl: url}));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSaveArtist(artistData);
        setIsEditing(false);
    };

    return (
        <main className="h-full w-full bg-[var(--bg-color)] flex flex-col">
            <div className="h-40 md:h-48 flex-shrink-0 relative group">
                <img src={artistData.bannerUrl} alt={`${artistName} banner`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/70 to-transparent"></div>
                <button onClick={onBack} className="absolute top-6 left-6 text-white text-2xl bg-black/30 w-10 h-10 rounded-full z-20" aria-label="Back"><i className="fas fa-arrow-left"></i></button>
                {isEditing && (
                    <button onClick={() => bannerInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fas fa-camera text-2xl"></i>
                    </button>
                )}
                <div className="absolute -bottom-16 left-6 right-6 flex items-end gap-4">
                    <div className="w-32 h-32 rounded-full border-4 border-[var(--bg-color)] flex-shrink-0 relative group/avatar">
                        <img src={artistData.avatarUrl} alt={artistName} className="w-full h-full object-cover rounded-full" />
                         {isEditing && (
                            <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full">
                                <i className="fas fa-camera text-xl"></i>
                            </button>
                        )}
                    </div>
                    <div ref={nameContainerRef} className="flex-1 min-w-0 pb-4">
                        <div className={`marquee-container ${isNameOverflowing ? 'is-overflowing' : ''}`}>
                             <h1 ref={nameRef} className="marquee-content text-4xl font-bold text-white" title={artistName}>{artistName}</h1>
                        </div>
                        <p className="text-sm text-neutral-400">{artistSongs.length} songs in your library</p>
                    </div>
                </div>
            </div>
            
             <div className="flex-shrink-0 pt-20 p-6 flex items-center gap-4">
                <button onClick={handlePlayAll} className="flex-1 bg-[var(--primary-accent)] text-black font-bold py-3 rounded-full flex items-center justify-center gap-2">
                    <i className="fas fa-play"></i>
                    <span>Play All</span>
                </button>
                {isEditing ? (
                    <button onClick={handleSave} className="bg-green-500 text-white font-bold py-3 px-6 rounded-full">Save</button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="bg-[var(--chip-bg)] text-white font-bold py-3 px-6 rounded-full">Edit Profile</button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto scroll-container px-6 pb-40 space-y-4">
                 <div className="bg-[var(--surface-color)] p-4 rounded-lg">
                    <h3 className="font-bold mb-2">About</h3>
                    {isEditing ? (
                        <textarea value={artistData.bio} onChange={e => setArtistData(p => ({...p, bio: e.target.value}))} className="w-full h-24 bg-white/10 rounded p-2 text-sm resize-none" />
                    ) : (
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{artistData.bio}</p>
                    )}
                 </div>
                <div>
                     <h3 className="font-bold mb-2">Songs</h3>
                     <ul className="space-y-2">
                        {artistSongs.map(song => (
                            <li key={song.id} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--surface-color)] transition-colors cursor-pointer" onClick={() => onPlaySong(song, artistSongs)}>
                                <img src={song.albumArtUrl} alt={song.title} className="w-14 h-14 rounded-md bg-[var(--chip-bg)] object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold leading-tight">{song.title}</p>
                                </div>
                                <button className="w-12 h-12 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i className="fas fa-play text-lg"></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <input type="file" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} accept="image/*" className="hidden" />
            <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" className="hidden" />
        </main>
    );
};

export default ArtistView;