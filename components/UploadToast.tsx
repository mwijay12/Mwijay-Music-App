import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft } from 'lucide-react';

interface UploadToastProps {
    progress: { current: number; total: number; fileName: string; isComplete?: boolean } | null;
    onDismiss: () => void;
}

const UploadToast: React.FC<UploadToastProps> = ({ progress, onDismiss }) => {
    if (!progress || progress.total === 0) return null;
    
    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    const isComplete = progress.isComplete || progress.current === progress.total;

    return (
        <motion.div 
            className="w-[90%] max-w-sm z-[100]"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(event, info) => {
                if (info.offset.x < -100) {
                    onDismiss();
                }
            }}
            initial={{ y: "-150%" }}
            animate={{ y: `calc(env(safe-area-inset-top, 0rem) + 7.5rem)` }}
            exit={{ x: '-150%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="liquid-glass-pane rounded-full p-3 shadow-lg">
                <div className="flex justify-between items-center mb-1 px-2">
                    <p className="text-sm font-bold flex items-center gap-2">
                        {isComplete ? <><CheckCircle2 size={16} className="text-green-400" /> Import Complete!</> : 'Importing Media...'}
                    </p>
                    <p className="text-xs font-mono text-neutral-300">{progress.current} / {progress.total}</p>
                </div>
                <div className="w-full bg-black/20 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent-start)] h-1.5 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                </div>
                 <div className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 text-xs hidden group-hover:block">
                    <ChevronLeft size={16} />
                </div>
            </div>
        </motion.div>
    );
};

export default UploadToast;