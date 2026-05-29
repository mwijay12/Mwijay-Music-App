import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Heart, Play, Shuffle, Search, 
  Loader2, ArrowUpDown, ChevronDown 
} from 'lucide-react';
import { likesService } from '../../services/likesService.ts';
import { LikeButton } from './LikeButton.tsx';
import type { Song } from '../../types.ts';

interface LikedSongsPageProps {
  onBack: () => void;
  onPlaySong: (song: Song, context: Song[]) => void;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

type SortOption = 'recent' | 'title' | 'artist';

export const LikedSongsPage: React.FC<LikedSongsPageProps> = ({
  onBack,
  onPlaySong,
  showNotification,
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Subscribe to liked songs list in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = likesService.subscribeToUserLikes((likedSongs) => {
      setSongs(likedSongs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePlayAll = (shuffle = false) => {
    if (songs.length === 0) return;
    let playlist = [...songs];
    if (shuffle) {
      playlist.sort(() => Math.random() - 0.5);
    }
    onPlaySong(playlist[0], playlist);
  };

  const filteredSongs = songs
    .filter((song) => {
      const query = searchQuery.toLowerCase();
      return (
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      return 0; // 'recent' relies on default Firestore/subscription return sequence
    });

  return (
    <div className="w-full h-full bg-black text-white flex flex-col overflow-hidden pb-12">
      {/* Top Header Section */}
      <div 
        className="w-full px-6 py-4 flex items-center justify-between sticky top-0 bg-black/60 backdrop-blur-xl border-b border-white/5 z-30"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 text-left">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white leading-tight">Liked Songs</h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Your Curated Coordinates</p>
          </div>
        </div>
        <div className="w-10"></div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--primary-accent)]" size={32} />
        </div>
      ) : songs.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6">
          <motion.span 
            className="p-6 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart size={44} fill="currentColor" />
          </motion.span>
          <div className="space-y-2">
            <p className="text-base font-black text-neutral-300">No liked songs yet</p>
            <p className="text-xs text-neutral-500 max-w-[200px] mt-1 mx-auto leading-normal">
              Tap the heart on any song to compile them in this vault.
            </p>
          </div>
        </div>
      ) : (
        /* Songs Vault */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Cover Header Hero Card */}
          <div className="px-6 py-6 flex flex-col items-center text-center relative border-b border-white/5 bg-gradient-to-b from-purple-950/20 to-transparent flex-shrink-0">
            <span className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-500 mb-3 drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">
              <Heart size={32} fill="currentColor" />
            </span>
            <h3 className="text-xl font-black text-white leading-tight">
              {songs.length} liked {songs.length === 1 ? 'song' : 'songs'}
            </h3>
            
            {/* Play All & Shuffle Actions */}
            <div className="flex gap-3 mt-5 w-full max-w-xs justify-center select-none">
              <button 
                onClick={() => handlePlayAll(false)}
                className="flex-1 py-3 px-4 bg-white text-black font-black text-xs rounded-full flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-lg"
              >
                <Play size={14} fill="currentColor" />
                <span>Play All</span>
              </button>
              <button 
                onClick={() => handlePlayAll(true)}
                className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs rounded-full flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              >
                <Shuffle size={14} />
                <span>Shuffle</span>
              </button>
            </div>
          </div>

          {/* Filtering & Sorting Controls */}
          <div className="px-6 py-3 flex items-center gap-3 border-b border-white/5 bg-black flex-shrink-0">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search liked..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/50 transition-colors text-xs"
              />
            </div>

            {/* Sorting Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="py-2 px-3 bg-white/5 border border-white/5 rounded-xl text-neutral-400 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpDown size={14} />
                <span>Sort</span>
                <ChevronDown size={12} />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                    <motion.div
                      className="absolute right-0 mt-1.5 w-40 bg-[#161616] border border-white/10 p-1.5 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 flex flex-col text-left"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                    >
                      <button
                        onClick={() => { setSortBy('recent'); setShowSortDropdown(false); }}
                        className={`w-full py-2 px-3 text-xs font-semibold rounded-lg text-left ${sortBy === 'recent' ? 'text-pink-500 bg-pink-500/5' : 'text-neutral-300 hover:bg-white/5'}`}
                      >
                        Recently Liked
                      </button>
                      <button
                        onClick={() => { setSortBy('title'); setShowSortDropdown(false); }}
                        className={`w-full py-2 px-3 text-xs font-semibold rounded-lg text-left ${sortBy === 'title' ? 'text-pink-500 bg-pink-500/5' : 'text-neutral-300 hover:bg-white/5'}`}
                      >
                        A-Z by Title
                      </button>
                      <button
                        onClick={() => { setSortBy('artist'); setShowSortDropdown(false); }}
                        className={`w-full py-2 px-3 text-xs font-semibold rounded-lg text-left ${sortBy === 'artist' ? 'text-pink-500 bg-pink-500/5' : 'text-neutral-300 hover:bg-white/5'}`}
                      >
                        A-Z by Artist
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Songs List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {filteredSongs.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500">
                No songs match your search query.
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredSongs.map((song, idx) => (
                  <motion.div
                    key={song.id}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => onPlaySong(song, filteredSongs)}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-white/5 rounded-xl overflow-hidden flex-shrink-0 relative">
                        <img 
                          src={song.albumArtUrl || 'https://via.placeholder.com/60.png?text=M'} 
                          alt={song.title} 
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary-accent)]">
                          <Play size={14} fill="currentColor" />
                        </span>
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-bold text-white truncate max-w-[200px]">{song.title}</p>
                        <p className="text-xs text-neutral-400 truncate max-w-[200px] mt-0.5">{song.artist}</p>
                      </div>
                    </div>

                    <LikeButton song={song} size="sm" />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LikedSongsPage;
