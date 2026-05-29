import React from 'react';

interface SpecialPlaylistCardProps {
    title: string;
    subtitle?: string;
    icon: string;
    emoji: string;
    gradient: string;
    onClick: () => void;
}

const SpecialPlaylistCard: React.FC<SpecialPlaylistCardProps> = ({ title, subtitle, icon, emoji, gradient, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="relative flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden text-white p-3 text-center transition-transform hover:scale-105"
            style={{ background: gradient }}
        >
            <span
                className="absolute -bottom-2 -right-2 text-6xl opacity-20 z-0 select-none transform -rotate-20"
            >
                {emoji}
            </span>
            
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
                <i className={`fas ${icon} text-3xl mb-1`}></i>
                <span className="font-bold text-sm leading-tight">{title}</span>
                {subtitle && <span className="text-[10px] text-white/70 mt-0.5">{subtitle}</span>}
            </div>
        </button>
    );
};

export default SpecialPlaylistCard;
