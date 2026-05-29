import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, LogIn, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';

interface GuestModeBannerProps {
  onTriggerAuth: () => void;
}

export const GuestModeBanner: React.FC<GuestModeBannerProps> = ({ onTriggerAuth }) => {
  const { isGuest } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  if (!isGuest || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-[calc(var(--footer-height)+16px)] left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 pointer-events-auto"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: { type: 'spring', damping: 20, stiffness: 200 }
        }}
        exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/90 to-indigo-900/90 backdrop-blur-2xl border border-white/20 px-4 py-3.5 pr-8 rounded-2xl flex items-center justify-between gap-4 shadow-2xl">
          {/* Subtle glowing overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-accent)]/10 to-pink-500/10 mix-blend-overlay"></div>
          
          {/* Dismiss Icon Trigger */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-white/40 hover:text-white transition-colors cursor-pointer z-20"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/20 rounded-full flex items-center justify-center text-[var(--primary-accent)]">
              <Sparkles size={16} />
            </div>
            <div className="text-left text-wrap max-w-[160px]">
              <p className="text-xs font-bold text-white leading-tight">Using Mwijay as Guest</p>
              <p className="text-[10px] text-white/60 mt-0.5 leading-tight">Sign in to back up your playlists.</p>
            </div>
          </div>

          <button
            onClick={onTriggerAuth}
            className="flex items-center gap-1 bg-white text-black font-black text-[10px] py-1.5 px-3 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md relative z-10 flex-shrink-0"
          >
            <LogIn size={12} />
            <span>Sign In</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default GuestModeBanner;
