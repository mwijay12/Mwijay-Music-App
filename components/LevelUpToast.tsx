import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles, CheckCircle2 } from 'lucide-react';

interface LevelUpToastProps {
    level: number;
    title: string;
    rewards: string[];
    onClose: () => void;
}

const LevelUpToast: React.FC<LevelUpToastProps> = ({ level, title, rewards, onClose }) => {
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                {/*Confetti Canvas */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-sm"
                            initial={{ 
                                top: "20%", 
                                left: `${20 + Math.random() * 60}%`, 
                                scale: Math.random() * 0.5 + 0.5,
                                rotate: 0
                            }}
                            animate={{ 
                                top: "100%", 
                                left: `${Math.random() * 100}%`,
                                rotate: Math.random() * 720,
                                opacity: [1, 1, 0]
                            }}
                            transition={{ 
                                duration: 2.5 + Math.random() * 2, 
                                ease: "easeOut",
                                repeat: Infinity 
                            }}
                            style={{
                                backgroundColor: `hsl(${Math.random() * 360}, 85%, 60%)`
                            }}
                        />
                    ))}
                </div>

                {/* Dialog Content */}
                <motion.div
                    initial={{ scale: 0.85, y: 50, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="w-full max-w-sm rounded-3xl overflow-hidden liquid-glass-pane glare-effect p-6 shadow-2xl relative border border-[var(--surface-border-color)] text-center text-[var(--text-primary)]"
                >
                    {/* Glowing background spotlight */}
                    <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[var(--primary-accent)]/20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[var(--secondary-accent-start)]/20 blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col items-center">
                        {/* Animated Badge Icon */}
                        <motion.div
                            animate={{ 
                                rotateY: [0, 180, 360],
                                scale: [1, 1.15, 1]
                            }}
                            transition={{ 
                                duration: 3, 
                                repeat: Infinity, 
                                repeatDelay: 5 
                            }}
                            className="w-20 h-20 rounded-full bg-gradient-to-tr from-[var(--primary-accent)] to-[var(--secondary-accent-start)] flex items-center justify-center text-black shadow-lg mb-4"
                        >
                            <Award size={44} />
                        </motion.div>

                        <h2 className="text-sm font-bold tracking-widest text-[var(--primary-accent)] uppercase flex items-center gap-1 mb-1">
                            <Sparkles size={14} className="animate-pulse" /> LEVEL UP! <Sparkles size={14} className="animate-pulse" />
                        </h2>
                        
                        <h3 className="text-5xl font-black mb-2 tracking-tight text-white bg-clip-text bg-gradient-to-r from-white to-gray-300">
                            Level {level}
                        </h3>

                        <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold text-[var(--text-secondary)] shadow-sm mb-6">
                            {title}
                        </div>

                        {rewards.length > 0 && (
                            <div className="w-full mb-8 text-left">
                                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 border-b border-white/5 pb-1">
                                    Unlocked Rewards
                                </p>
                                <div className="space-y-2">
                                    {rewards.map((reward, idx) => (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * idx }}
                                            key={idx} 
                                            className="flex items-center gap-2 text-xs text-[var(--text-primary)]"
                                        >
                                            <CheckCircle2 size={14} className="text-[var(--primary-accent)] flex-shrink-0" />
                                            <span>{reward}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="w-full py-3.5 rounded-xl font-bold bg-white text-black hover:bg-neutral-100 transition-colors shadow-lg text-sm"
                        >
                            Hongera! Keep Vibe On 👊
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LevelUpToast;
