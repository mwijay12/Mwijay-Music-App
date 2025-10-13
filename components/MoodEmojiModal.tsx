import React from 'react';
import type { Song } from '../types.ts';

interface Mood {
    name: string;
    emoji: string;
    color: string;
}

interface MoodEmojiModalProps {
    song: Song;
    onClose: () => void;
    onSetMood: (songId: string, emoji: string) => void;
    onAddMood: () => void;
    allMoods: Mood[];
}

const MoodEmojiModal: React.FC<MoodEmojiModalProps> = ({ song, onClose, onSetMood, onAddMood, allMoods }) => {
    const handleSelect = (emoji: string) => {
        onSetMood(song.id, emoji);
        onClose();
    };

    const moodsToDisplay = allMoods.slice(0, 11);

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center" onClick={onClose}>
            <div 
                className="liquid-glass-pane w-full max-w-md rounded-t-2xl p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center mb-1">Set the mood for:</h3>
                <p className="text-sm text-center text-neutral-400 mb-4 truncate">{song.title}</p>
                <div className="grid grid-cols-6 gap-2">
                    {moodsToDisplay.map(mood => (
                        <button 
                            key={mood.emoji}
                            onClick={() => handleSelect(mood.emoji)}
                            className={`aspect-square text-3xl rounded-lg transition-transform hover:scale-110 ${song.moodEmoji === mood.emoji ? 'bg-[var(--primary-accent)]' : 'bg-white/10'}`}
                            title={mood.name}
                        >
                            {mood.emoji}
                        </button>
                    ))}
                    <button 
                        onClick={onAddMood}
                        className={`aspect-square text-3xl rounded-lg transition-transform hover:scale-110 bg-white/5 flex items-center justify-center`}
                        title="Add new mood"
                    >
                        <i className="fas fa-plus text-neutral-400"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoodEmojiModal;