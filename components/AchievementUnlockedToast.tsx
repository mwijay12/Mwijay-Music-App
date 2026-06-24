import React from 'react';
import type { Achievement } from '../types';
import { motion } from 'framer-motion';

const AchievementUnlockedToast: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    return (
        <motion.div
            layout
            initial={{ y: "150%", x: "-50%" }}
            animate={{ y: 0, x: "-50%" }}
            exit={{ y: "150%", x: "-50%" }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 w-[90%] max-w-sm z-[999]"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0rem) + 8.5rem)' }}
        >
            <div className="liquid-glass-pane rounded-2xl p-4 shadow-lg relative overflow-hidden">
                <div className="achievement-toast-confetti">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="achievement-toast-confetti-piece"
                            style={{
                                backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
                                '--i': i,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-4 relative">
                    <div className="text-4xl flex-shrink-0">{achievement.emoji}</div>
                    <div>
                        <p className="text-xs font-bold text-[var(--primary-accent)] uppercase">Achievement Unlocked!</p>
                        <p className="font-bold text-white">{achievement.name}</p>
                        <p className="text-xs text-neutral-300">{achievement.description}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AchievementUnlockedToast;