import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { useRemoteConfig } from '../hooks/useRemoteConfig.ts';

/**
 * Announcement banner driven by Firebase Remote Config.
 * Shows when `showAnnouncement` is true. Dismissal persists in localStorage.
 */
export const Announcement: React.FC = () => {
  const { config } = useRemoteConfig();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!config?.announcementText) return;
    const hash = btoa(unescape(encodeURIComponent(config.announcementText)));
    if (localStorage.getItem('mwijay_announcement_dismissed') === hash) {
      setDismissed(true);
    } else {
      setDismissed(false); // New announcement — reset dismissal
    }
  }, [config?.announcementText]);

  const handleDismiss = () => {
    setDismissed(true);
    if (config?.announcementDismissible && config.announcementText) {
      const hash = btoa(unescape(encodeURIComponent(config.announcementText)));
      localStorage.setItem('mwijay_announcement_dismissed', hash);
    }
  };

  const handleAction = () => {
    if (config?.announcementActionUrl) {
      window.open(config.announcementActionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const show = config?.showAnnouncement && !!config.announcementText && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-0 left-0 right-0 z-[9999] px-4 pt-2 pointer-events-auto"
        >
          <div
            className="relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl overflow-hidden"
            style={{ backgroundColor: config?.announcementColor || '#9333ea' }}
          >
            {/* Background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />

            {/* Icon */}
            <span className="text-xl flex-shrink-0 relative z-10">
              {config?.announcementIcon || '📢'}
            </span>

            {/* Text */}
            <p className="text-white text-sm font-semibold flex-1 leading-tight relative z-10">
              {config?.announcementText}
            </p>

            {/* Action Button */}
            {config?.announcementActionText && config.announcementActionUrl && (
              <button
                onClick={handleAction}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors relative z-10 flex-shrink-0 cursor-pointer"
              >
                {config.announcementActionText}
                <ExternalLink size={10} />
              </button>
            )}

            {/* Dismiss */}
            {config?.announcementDismissible && (
              <button
                onClick={handleDismiss}
                className="text-white/70 hover:text-white transition-colors relative z-10 flex-shrink-0 cursor-pointer"
                aria-label="Dismiss announcement"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Announcement;
