
import React from 'react';
import { Play, Pause, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TtsOverlayProps {
    isSpeaking: boolean;
    isPaused: boolean;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
}

const TtsOverlay: React.FC<TtsOverlayProps> = ({ isSpeaking, isPaused, onPause, onResume, onStop }) => {
    // Simple visualizer bars
    const bars = Array.from({ length: 5 }).map((_, i) => (
        <motion.div
            key={i}
            className="w-1 bg-white rounded-full"
            animate={{
                height: isPaused ? 4 : [8, 24, 12, 32, 8, 20, 8],
            }}
            transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
            }}
        />
    ));

    return (
        <AnimatePresence>
            {isSpeaking && (
                <motion.div
                    className="fixed top-24 left-1/2 z-[120] flex items-center justify-center pointer-events-auto"
                    style={{ transform: 'translate(-50%, 0)' }}
                    initial={{ y: -50, opacity: 0, scale: 0.8, x: "-50%" }}
                    animate={{ y: 0, opacity: 1, scale: 1, x: "-50%" }}
                    exit={{ y: -50, opacity: 0, scale: 0.8, x: "-50%" }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    drag
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    onDragEnd={(e, info) => {
                        if (Math.abs(info.offset.x) > 100 || Math.abs(info.offset.y) > 100) {
                            onStop();
                        }
                    }}
                >
                    <div className="liquid-glass-pane backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-5 py-3 flex items-center gap-4 min-w-[200px]">
                        <div className="flex items-center gap-1 h-6">
                            {bars}
                        </div>
                        
                        <div className="h-8 w-[1px] bg-white/20 mx-1"></div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={isPaused ? onResume : onPause}
                                className="w-8 h-8 rounded-full bg-[var(--primary-accent)] text-black flex items-center justify-center transition-transform hover:scale-110"
                            >
                                {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                            </button>
                            <button 
                                onClick={onStop}
                                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center transition-transform hover:scale-110 hover:bg-white/20"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TtsOverlay;
