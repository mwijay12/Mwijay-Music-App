import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import type { Song, Playlist } from '../types.ts';
import { FAVORITES_PLAYLIST_ID, getRandomCoverArt } from './constants.ts';
import SongDetailsModal from './SongDetailsModal.tsx';
import SongListItem from './SongListItem.tsx';

declare const jsmediatags: any;

// --- START: Local Hook & Component for Search History ---
const useSearchHistory = (storageKey: string) => {
    const [history, setHistory] = useState<string[]>(() => {
        try {
            const storedHistory = window.localStorage.getItem(storageKey);
            return storedHistory ? JSON.parse(storedHistory) : [];
        } catch (error) {
            console.error("Error reading search history from localStorage", error);
            return [];
        }
    });

    const addSearchTerm = useCallback((term: string) => {
        const cleanedTerm = term.trim();
        if (!cleanedTerm) return;

        setHistory(prev => {
            const newHistory = [cleanedTerm, ...prev.filter(item => item.toLowerCase() !== cleanedTerm.toLowerCase())].slice(0, 8);
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(newHistory));
            } catch (error) {
                console.error("Error saving search history to localStorage", error);
            }
            return newHistory;
        });
    }, [storageKey]);
    
    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            window.localStorage.removeItem(storageKey);
        } catch (error) {
            console.error("Error clearing search history from localStorage", error);
        }
    }, [storageKey]);

    return { history, addSearchTerm, clearHistory };
};

const SearchHistory: React.FC<{ history: string[]; onSelect: (term: string) => void; onClear: () => void; }> = ({ history, onSelect, onClear }) => {
    if (history.length === 0) return null;

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-color)] border border-[var(--surface-border-color)] rounded-2xl shadow-lg z-20 p-2">
            <div className="flex justify-between items-center px-2 pb-1 mb-1 border-b border-[var(--surface-border-color)]">
                <h3 className="text-xs font-bold text-neutral-400">Recent Searches</h3>
                <button onClick={onClear} className="text-xs text-red-400 hover:text-red-500">Clear</button>
            </div>
            <ul className="max-h-48 overflow-y-auto scroll-container">
                {history.map(term => (
                    <li key={term}>
                        <button onClick={() => onSelect(term)} className="w-full text-left p-2 rounded-md hover:bg-white/10 flex items-center gap-3">
                            <i className="fas fa-history text-neutral-400"></i>
                            <span>{term}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
// --- END: Local Hook & Component ---


interface LibraryViewProps {
  songs: Song[];
  playlists: Playlist[];
  onAddSongs: (songs: Song[]) => void;
  onUpdateSong: (song: Song) => void;
  onPlaySong: (song: Song, context: Song[]) => void;
  onAddToQueue: (song: Song) => void;
  onCreatePlaylist: () => void;
  onViewPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  onOpenSongDetails: (song: Song) => void;
  onViewArtist: (artistName: string) => void;
  onOpenPlaylistManager: () => void;
  onDeleteSong: (songId: string) => void;
  onPlayPlaylistRadio: (playlist: Playlist) => void;
  recentlyAddedSongId: string | null;
}

const CreatePlaylistCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button onClick={onClick} className="flex-shrink-0 w-40 h-40 rounded-lg bg-[var(--chip-bg)] flex flex-col items-center justify-center text-center p-2 group transition-all duration-300 hover:bg-[var(--surface-color)]" title="Create a new playlist">
        <div className="w-16 h-16 rounded-full bg-[var(--primary-accent)]/20 flex items-center justify-center transition-transform group-hover:scale-110">
            <i className="fas fa-plus text-3xl text-[var(--primary-accent)]"></i>
        </div>
        <p className="font-bold mt-3 text-sm">Create Playlist</p>
    </button>
);


const LibraryView: React.FC<LibraryViewProps> = ({ songs, playlists, onAddSongs, onUpdateSong, onPlaySong, onAddToQueue, onCreatePlaylist, onViewPlaylist, onDeletePlaylist, showNotification, onOpenSongDetails, onViewArtist, onOpenPlaylistManager, onDeleteSong, onPlayPlaylistRadio, recentlyAddedSongId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activePlaylistMenu, setActivePlaylistMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [songForDetails, setSongForDetails] = useState<Song | null>(null);

  type SortOption = 'date-newest' | 'date-oldest' | 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc';
  const [sortOption, setSortOption] = useState<SortOption>('date-newest');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { history: searchHistory, addSearchTerm, clearHistory } = useSearchHistory('librarySearchHistory');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (menuRef.current && !menuRef.current.contains(target) && !(event.target as HTMLElement).closest('.playlist-menu-button')) {
            setActivePlaylistMenu(null);
        }
        if (sortMenuRef.current && !sortMenuRef.current.contains(target) && sortButtonRef.current && !sortButtonRef.current.contains(target)) {
            setIsSortMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const sortedAndFilteredSongs = useMemo(() => {
    const filtered = songs.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortOption) {
        case 'title-asc':
            return filtered.sort((a, b) => a.title.localeCompare(b.title));
        case 'title-desc':
            return filtered.sort((a, b) => b.title.localeCompare(a.title));
        case 'artist-asc':
            return filtered.sort((a, b) => a.artist.localeCompare(b.artist));
        case 'artist-desc':
            return filtered.sort((a, b) => b.artist.localeCompare(a.artist));
        case 'date-oldest':
            return filtered.sort((a, b) => (a.dateAdded || 0) - (b.dateAdded || 0));
        case 'date-newest':
        default:
            return filtered.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    }
  }, [songs, searchTerm, sortOption]);
  
  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length > 50) {
        showNotification('You can upload up to 50 songs at once.', 'error');
        return;
    }
    
    if (audioFiles.length === 0) {
        showNotification('No audio files were found in your selection.', 'info');
        return;
    }

    showNotification(`Importing ${audioFiles.length} song(s)...`, 'info');

    let failedCount = 0;
    const songPromises = audioFiles.map(file => 
      new Promise<Song | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const audioData = e.target?.result as ArrayBuffer;
          jsmediatags.read(file, {
            onSuccess: (tag: any) => {
              const tags = tag.tags;
              let albumArtUrl = getRandomCoverArt();
              if (tags.picture) {
                const { data, format } = tags.picture;
                let base64String = "";
                for (let i = 0; i < data.length; i++) {
                  base64String += String.fromCharCode(data[i]);
                }
                albumArtUrl = `data:${format};base64,${window.btoa(base64String)}`;
              }
              resolve({
                id: `song-${file.name}-${file.lastModified}-${file.size}`,
                title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                artist: tags.artist || 'Unknown Artist',
                albumArtUrl: albumArtUrl,
                audioData: audioData,
                mimeType: file.type,
                isFavorite: false,
                dateAdded: Date.now(),
              });
            },
            onError: () => {
              resolve({
                id: `song-${file.name}-${file.lastModified}-${file.size}`,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Unknown Artist',
                albumArtUrl: getRandomCoverArt(),
                audioData: audioData,
                mimeType: file.type,
                isFavorite: false,
                dateAdded: Date.now(),
              });
            }
          });
        };
        reader.onerror = (error) => {
            console.error(`Failed to read file ${file.name}:`, error);
            failedCount++;
            resolve(null);
        };
        reader.readAsArrayBuffer(file);
      })
    );
      
    const settledSongs = await Promise.all(songPromises);
    const newSongs = settledSongs.filter((s): s is Song => s !== null);
      
    if (newSongs.length > 0) {
        onAddSongs(newSongs);
        showNotification(`Added ${newSongs.length} song(s). ${failedCount > 0 ? `${failedCount} failed to read.` : ''}`, 'success');
    } else if (failedCount > 0) {
        showNotification(`Could not read any of the selected files.`, 'error');
    } else if (audioFiles.length > 0) {
        showNotification(`Could not process the selected audio files.`, 'error');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(event.target.files);
    if(event.target) event.target.value = '';
  };
  
  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(event.target.files);
    if(event.target) event.target.value = '';
  };

  const sortOptionsMap: { [key in SortOption]: string } = {
    'date-newest': 'Date Added (Newest)',
    'date-oldest': 'Date Added (Oldest)',
    'title-asc': 'Title (A-Z)',
    'title-desc': 'Title (Z-A)',
    'artist-asc': 'Artist (A-Z)',
    'artist-desc': 'Artist (Z-A)',
  };

  const handleSortSelect = (option: SortOption) => {
    setSortOption(option);
    setIsSortMenuOpen(false);
  };

  const handleDownloadSong = (song: Song) => {
    if (!song.audioData || !song.mimeType) {
        showNotification("This song doesn't have local data to download.", 'error');
        return;
    }
    try {
        const blob = new Blob([song.audioData], { type: song.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const extension = song.mimeType.split('/')[1] || 'mp3';
        a.download = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        showNotification("Song download started!", 'success');
    } catch (error) {
        console.error("Download failed:", String(error));
        showNotification("Failed to prepare song for download.", 'error');
    }
  };

  return (
    <>
    <main className="h-full w-full flex flex-col home-gradient-bg">
      <div className="sticky top-0 z-20 bg-[var(--bg-color)]/80 backdrop-blur-md px-4 pt-6 pb-2 shadow-black/20 shadow-lg">
        <header className="flex justify-between items-center mb-4">
          <div>
              <h1 className="text-2xl font-bold">My Library</h1>
              <p className="text-sm text-neutral-400">Your collection on Mwijay Music</p>
          </div>
           <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" multiple className="hidden" />
            <input type="file" ref={folderInputRef} onChange={handleFolderSelect} {...{ webkitdirectory: "true", mozdirectory: "true", directory: "true" } as any} className="hidden" />
            <button onClick={() => folderInputRef.current?.click()} className="bg-[var(--chip-bg)] text-white w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105" title="Upload folder">
                <i className="fas fa-folder-open"></i>
            </button>
            <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[var(--primary-accent)] text-black font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-transform hover:scale-105"
                title="Upload songs from your device"
            >
                <i className="fas fa-upload"></i>
                <span>Upload</span>
            </button>
          </div>
        </header>
        <div 
          className="relative" 
          onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsSearchFocused(false);
                  addSearchTerm(searchTerm);
              }
          }}
        >
            <input 
              type="text" 
              placeholder="Search your songs..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              onFocus={() => setIsSearchFocused(true)}
              className="w-full bg-[var(--chip-bg)] rounded-full py-2 pl-12 pr-4 text-white placeholder-neutral-400 border-2 border-transparent focus:outline-none cosmic-search" 
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"></i>
             {isSearchFocused && searchTerm.length === 0 && (
                <SearchHistory 
                    history={searchHistory} 
                    onSelect={(term) => {
                        setSearchTerm(term);
                        setIsSearchFocused(false);
                    }}
                    onClear={() => {
                        clearHistory();
                        setIsSearchFocused(false);
                    }}
                />
            )}
        </div>
      </div>
      
      <div className="flex flex-col overflow-y-auto scroll-container px-4 pb-40">
        <section className="mt-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Your Playlists</h2>
            <button onClick={onOpenPlaylistManager} className="text-neutral-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center bg-[var(--chip-bg)]" title="Manage playlists">
              <i className="fas fa-ellipsis-v"></i>
            </button>
          </div>
          <div className="flex overflow-x-auto gap-4 -mx-4 px-4 pb-2 scroll-container">
              <CreatePlaylistCard onClick={onCreatePlaylist} />
              {playlists.map(p => (
                  <div key={p.id} className="flex-shrink-0 w-40 text-center group relative">
                    <div className="relative cursor-pointer" onClick={() => onViewPlaylist(p.id)} title={`View playlist: ${p.name}`}>
                        <img src={p.coverImage} alt={p.name} className="w-40 h-40 rounded-lg object-cover mb-2 transition-transform group-hover:scale-105" />
                         <button onClick={(e) => { e.stopPropagation(); onPlayPlaylistRadio(p); }} className="absolute bottom-4 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" title={`Start ${p.name} Radio`}>
                            <i className="fas fa-tower-broadcast text-sm"></i>
                        </button>
                    </div>
                      <h3 className="font-bold text-sm truncate">{p.name}</h3>
                      <div className="flex items-center justify-center text-xs text-neutral-400">
                          <span className="truncate">{p.songIds.length} songs</span>
                          {p.id !== FAVORITES_PLAYLIST_ID && (
                            <button
                                onClick={() => setActivePlaylistMenu(p.id === activePlaylistMenu ? null : p.id)}
                                className="playlist-menu-button ml-2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center"
                                title="Playlist options"
                            >
                                <i className="fas fa-ellipsis-h text-xs"></i>
                            </button>
                          )}
                      </div>

                      {/* Context Menu */}
                      {activePlaylistMenu === p.id && (
                          <div ref={menuRef} className="absolute top-full mt-2 -right-4 bg-[var(--surface-color)] border border-[var(--surface-border-color)] rounded-lg shadow-lg z-10 w-32 text-left">
                              <button onClick={() => { onViewPlaylist(p.id); setActivePlaylistMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-t-lg">View & Edit</button>
                              <button onClick={() => {
                                  if(window.confirm(`Are you sure you want to delete "${p.name}"?`)) {
                                      onDeletePlaylist(p.id);
                                  }
                                  setActivePlaylistMenu(null);
                              }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg">Delete</button>
                          </div>
                      )}
                  </div>
              ))}
          </div>
        </section>
        
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">All Songs</h2>
             <div className="flex items-center gap-2">
                <div className="relative" ref={sortMenuRef}>
                    <button 
                        ref={sortButtonRef}
                        onClick={() => setIsSortMenuOpen(o => !o)} 
                        className="p-1 text-sm text-neutral-300 bg-[var(--chip-bg)] rounded-full flex items-center gap-2 px-3"
                        title="Sort songs"
                    >
                        <i className="fas fa-sort-amount-down"></i>
                        <span className="hidden sm:inline">{sortOptionsMap[sortOption]}</span>
                        <i className={`fas fa-chevron-down text-xs transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isSortMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--surface-color)] border border-[var(--surface-border-color)] rounded-lg shadow-lg z-20 text-sm">
                            {Object.entries(sortOptionsMap).map(([key, value]) => (
                                <button 
                                    key={key} 
                                    onClick={() => handleSortSelect(key as SortOption)} 
                                    className="w-full text-left px-4 py-2 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg"
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 p-1 bg-[var(--chip-bg)] rounded-full">
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm rounded-full ${viewMode === 'list' ? 'bg-[var(--primary-accent)] text-black' : 'text-white'}`} title="List View"><i className="fas fa-list"></i></button>
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-1 text-sm rounded-full ${viewMode === 'grid' ? 'bg-[var(--primary-accent)] text-black' : 'text-white'}`} title="Grid View"><i className="fas fa-grip-horizontal"></i></button>
                </div>
            </div>
        </div>

        <div className="flex-1">
          {sortedAndFilteredSongs.length > 0 ? (
            viewMode === 'list' ? (
                <ul className="space-y-3">
                    {sortedAndFilteredSongs.map(song => (
                        <SongListItem
                            key={song.id}
                            song={song}
                            onPlaySong={() => onPlaySong(song, sortedAndFilteredSongs)}
                            onAddToQueue={() => onAddToQueue(song)}
                            onOpenDetails={() => setSongForDetails(song)}
                            onViewArtist={onViewArtist}
                            isNewlyAdded={song.id === recentlyAddedSongId}
                        />
                    ))}
                </ul>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {sortedAndFilteredSongs.map(song => (
                        <button key={song.id} onClick={() => setSongForDetails(song)} className="song-grid-item text-left" title={`${song.title} by ${song.artist}`}>
                           <img src={song.albumArtUrl} alt={song.title} />
                           <div className="song-grid-item-overlay">
                                <p className="font-bold text-sm truncate text-white">{song.title}</p>
                           </div>
                        </button>
                    ))}
                </div>
            )
          ) : (
            <div className="text-center py-10 flex flex-col items-center">
              <i className="fas fa-music text-5xl text-neutral-500 mb-4"></i>
              <p className="text-neutral-400 font-bold">No songs found</p>
              <p className="text-neutral-500 text-sm mt-1">{searchTerm ? "Try a different search term." : "Your music library is empty."}</p>
            </div>
          )}
        </div>
      </div>
    </main>
    {songForDetails && (
        <SongDetailsModal
            song={songForDetails}
            onClose={() => setSongForDetails(null)}
            onSave={(updatedSong) => {
                onUpdateSong(updatedSong);
                setSongForDetails(null);
            }}
            onViewArtist={onViewArtist}
            onPlayNow={() => {
                if(songForDetails) onPlaySong(songForDetails, songs);
                setSongForDetails(null);
            }}
            onAddToQueue={() => {
                if(songForDetails) onAddToQueue(songForDetails);
                setSongForDetails(null);
            }}
            onDelete={() => {
                if(songForDetails) {
                    onDeleteSong(songForDetails.id);
                    setSongForDetails(null);
                }
            }}
            onSharePreview={() => {
              if (songForDetails) {
                 onOpenSongDetails(songForDetails);
                 setSongForDetails(null);
              }
            }}
            onDownloadFile={() => {
                if (songForDetails) {
                    handleDownloadSong(songForDetails);
                }
            }}
        />
    )}
    </>
  );
};

export default LibraryView;
