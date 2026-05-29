
import React, { useState, useEffect } from 'react';
import { Crosshair } from 'lucide-react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import type { Song } from '../types.ts';

interface ScrollToCurrentFabProps {
    nowPlaying: Song | null;
    onScrollToCurrent: () => void;
}

const ScrollToCurrentFab: React.FC<ScrollToCurrentFabProps> = ({ nowPlaying, onScrollToCurrent }) => {
    const [isVisible, setIsVisible] = useState(false);
    const controls = useAnimation();

    useEffect(() => {
        if (nowPlaying) {
            setIsVisible(true);
            controls.start({ opacity: 1, scale: 1, x: 0 });
        } else {
            setIsVisible(false);
        }
    }, [nowPlaying, controls]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100;
        if (Math.abs(info.offset.x) > threshold) {
            setIsVisible(false);
        } else {
            controls.start({ x: 0 }); // Snap back if drag wasn't far enough
        }
    };

    if (!isVisible || !nowPlaying) return null;

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: -window.innerWidth + 50, right: window.innerWidth - 50, top: -window.innerHeight + 100, bottom: 100 }}
            onDragEnd={handleDragEnd}
            animate={controls}
            initial={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-32 right-6 z-40"
            whileTap={{ scale: 0.9 }}
        >
            <button
                onClick={onScrollToCurrent}
                className="w-14 h-14 rounded-full bg-[var(--surface-color)]/90 backdrop-blur-xl border border-[var(--primary-accent)]/30 text-[var(--primary-accent)] shadow-2xl flex items-center justify-center relative overflow-hidden group"
                title="Scroll to current song"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Crosshair size={24} />
                {/* Inner ring for style */}
                <div className="absolute inset-1 border border-white/5 rounded-full pointer-events-none" />
            </button>
        </motion.div>
    );
};

export default ScrollToCurrentFab;
