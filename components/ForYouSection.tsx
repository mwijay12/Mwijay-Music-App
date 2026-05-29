import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { recommendationService, type RecommendationSection } from '../services/recommendationService.ts';
import HorizontalSongScroller from './HorizontalSongScroller.tsx';
import type { Song, ProfileData } from '../types.ts';

interface ForYouSectionProps {
  profile: ProfileData;
  librarySongs: Song[];
  onPlaySong: (song: Song, context: Song[]) => void;
  geminiKeys?: string[];
}

const scrollRevealVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }
  }
};

export const ForYouSection: React.FC<ForYouSectionProps> = ({
  profile,
  librarySongs,
  onPlaySong,
  geminiKeys = [],
}) => {
  const [sections, setSections] = useState<RecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await recommendationService.getForYou(
        librarySongs,
        profile.recentlyPlayed ?? [],
        (profile.analytics?.topSongs ?? []).map(s => s.id),
        new Date().getHours(),
        geminiKeys,
      );
      setSections(result);
    } catch (err) {
      console.warn('[ForYou] Failed to load recommendations', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (librarySongs.length > 0) {
      loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [librarySongs.length]);

  if (librarySongs.length === 0) return null;

  return (
    <section className="flex flex-col gap-1">
      {/* Header */}
      <motion.div
        variants={scrollRevealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex items-center justify-between px-1 mb-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20 flex items-center justify-center">
            <Sparkles size={16} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">For You</h2>
            <p className="text-xs text-[var(--text-secondary)]">AI-powered picks based on your taste</p>
          </div>
        </div>

        <button
          onClick={() => loadRecommendations(true)}
          disabled={refreshing}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh recommendations"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin text-purple-400" />
              <p className="text-xs text-neutral-500">Building your playlist…</p>
            </div>
          </motion.div>
        ) : sections.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8 text-neutral-500 text-sm"
          >
            <p>Add more songs to get personalized picks.</p>
          </motion.div>
        ) : (
          <motion.div
            key="sections"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            {sections.map((section, i) => (
              <motion.div
                key={`${section.title}-${i}`}
                variants={scrollRevealVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-30px' }}
              >
                <HorizontalSongScroller
                  title={section.title}
                  songs={section.songs}
                  onPlaySong={onPlaySong}
                  emptyMessage="No songs found for this section."
                />
                {section.subtitle && (
                  <p className="text-xs text-neutral-500 mt-1 px-1">{section.subtitle}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default ForYouSection;
