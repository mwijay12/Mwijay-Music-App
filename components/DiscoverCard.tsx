import React from 'react';
import { Brain } from 'lucide-react';

interface DiscoverCardProps {
    onOpenAssistant: () => void;
}

const DiscoverCard: React.FC<DiscoverCardProps> = ({ onOpenAssistant }) => {
    return (
        <div className="relative bg-[var(--surface-color)] p-4 rounded-2xl flex justify-between items-center">
            <div>
                <h3 className="text-lg font-bold">Mwijay Assistant</h3>
                <p className="text-sm text-neutral-400 max-w-xs">Tap to ask questions or control the app.</p>
            </div>
            <button
                onClick={onOpenAssistant}
                className="w-14 h-14 bg-gradient-to-br from-[var(--secondary-accent-start)] to-[var(--secondary-accent-end)] rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
                title="Open Mwijay Assistant"
            >
                <Brain size={28} />
            </button>
        </div>
    );
};

export default DiscoverCard;