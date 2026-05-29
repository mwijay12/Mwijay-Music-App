import React from 'react';
import { motion } from 'framer-motion';
import { useRemoteConfig } from '../hooks/useRemoteConfig.ts';
import { Wrench, RefreshCw, Clock } from 'lucide-react';

/**
 * Full-screen maintenance mode overlay.
 * Shown when `maintenanceMode` is true in Firebase Remote Config.
 */
export const MaintenanceMode: React.FC = () => {
  const { config, refresh } = useRemoteConfig();

  if (!config?.maintenanceMode) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0d0d0d] flex flex-col items-center justify-center text-white p-8">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Animated wrench icon */}
        <motion.div
          animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="text-7xl mb-8"
        >
          🛠️
        </motion.div>

        {/* Pulsing badge */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          System Maintenance
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-black tracking-tight mb-3"
        >
          We'll be right back
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-neutral-400 text-base leading-relaxed mb-6"
        >
          {config.maintenanceMessage || "Mwijay is undergoing scheduled maintenance."}
        </motion.p>

        {config.maintenanceEstimatedTime && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-neutral-300 text-sm px-4 py-2 rounded-full mb-8"
          >
            <Clock size={14} className="text-[var(--primary-accent)]" />
            <span>Estimated: <strong>{config.maintenanceEstimatedTime}</strong></span>
          </motion.div>
        )}

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={refresh}
          className="flex items-center gap-2 bg-[var(--primary-accent)] hover:brightness-110 text-black font-black px-8 py-3 rounded-full transition-all active:scale-95 shadow-[0_0_30px_rgba(147,51,234,0.4)]"
        >
          <RefreshCw size={16} />
          Check Again
        </motion.button>
      </div>
    </div>
  );
};

export default MaintenanceMode;
