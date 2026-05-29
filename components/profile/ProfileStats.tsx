import React from 'react';
import { motion } from 'framer-motion';
import { Music, Clock, Flame, Heart, ListMusic } from 'lucide-react';
import type { ProfileData } from '../../types.ts';

interface ProfileStatsProps {
  profile: ProfileData;
  onStatClick?: (statType: 'songs' | 'hours' | 'streak' | 'liked' | 'playlists') => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ profile, onStatClick }) => {
  const songsPlayed = profile.analytics?.songsPlayed || 0;
  const hoursListened = Math.round((profile.analytics?.listenTime || 0) / 3600);
  const currentStreak = profile.streak?.currentStreak || 0;
  
  // Custom theme-based mappings for premium color flows
  const stats = [
    {
      id: 'songs' as const,
      label: 'Songs Played',
      value: songsPlayed,
      icon: <Music size={20} />,
      color: 'from-purple-500/25 to-pink-500/5 border-purple-500/20 text-purple-400',
    },
    {
      id: 'hours' as const,
      label: 'Hours Listened',
      value: hoursListened,
      icon: <Clock size={20} />,
      color: 'from-blue-500/25 to-indigo-500/5 border-blue-500/20 text-blue-400',
    },
    {
      id: 'streak' as const,
      label: 'Day Streak',
      value: currentStreak,
      icon: <Flame size={20} />,
      color: 'from-orange-500/25 to-yellow-500/5 border-orange-500/20 text-orange-400',
      highlight: currentStreak > 0,
    },
    {
      id: 'playlists' as const,
      label: 'Playlists Created',
      value: 5, // Default/Mock count representing collaborative & local playlists
      icon: <ListMusic size={20} />,
      color: 'from-emerald-500/25 to-teal-500/5 border-emerald-500/20 text-emerald-400',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 260, damping: 20 }
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-2 gap-4 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {stats.map((stat) => (
        <motion.button
          key={stat.id}
          variants={itemVariants}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onStatClick?.(stat.id)}
          className={`relative overflow-hidden bg-gradient-to-br ${stat.color} border p-4 rounded-3xl flex flex-col justify-between text-left h-28 cursor-pointer shadow-xl`}
        >
          {/* Subtle background glow */}
          {stat.highlight && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-2xl animate-pulse"></div>
          )}

          <div className="flex justify-between items-start w-full">
            <span className="p-2 bg-white/5 border border-white/5 rounded-2xl">
              {stat.icon}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-2xl font-black text-white leading-none tracking-tight">
              {stat.value}
            </p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 mt-1 leading-none">
              {stat.label}
            </p>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};
export default ProfileStats;
