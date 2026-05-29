import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProfileData } from '../types';

const defaultEmojis = [
  '😀', '😎', '😂', '😍', '🤔', '🥳', '🤯', '😴', '😠', '😢', '👽', '👻',
  '🤖', '👾', '🎃', '😈', '🤠', '🤡', ' M ', '❤️', '🔥', '✨', '⭐', '🌙',
  '☀️', '⚡', '🎵', '🎶', '🎧', '🎤', '🎸', '🎹', '🥁', '🎷', '🎺', '🎻'
];

interface EmojiPickerModalProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    profile: ProfileData | null;
    onUpdateProfile: (updater: (prev: ProfileData) => ProfileData) => void;
}

const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({ onSelect, onClose, profile, onUpdateProfile }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newEmoji, setNewEmoji] = useState('');

    const customEmojis = profile?.customEmojis || [];
    const emojis = [...new Set([...customEmojis, ...defaultEmojis])];

    const handleAddEmoji = () => {
        if (!newEmoji.trim()) {
            setIsAdding(false);
            return;
        }
        onUpdateProfile(p => ({
            ...p,
            customEmojis: [newEmoji, ...(p.customEmojis || [])].slice(0, 10) // Limit to 10 custom emojis
        }));
        setNewEmoji('');
        setIsAdding(false);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="liquid-glass-pane glare-effect p-6 rounded-2xl w-full max-w-xs" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-center mb-4">Choose an Emoji</h3>
                <div className="grid grid-cols-6 gap-2">
                    {emojis.map(emoji => (
                        <button 
                            key={emoji}
                            onClick={() => onSelect(emoji)}
                            className="aspect-square text-3xl rounded-lg bg-white/10 transition-transform hover:scale-110 hover:bg-white/20"
                        >
                            {emoji}
                        </button>
                    ))}
                    {isAdding ? (
                        <input
                            type="text"
                            value={newEmoji}
                            onChange={(e) => setNewEmoji(e.target.value)}
                            onBlur={handleAddEmoji}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddEmoji()}
                            className="aspect-square text-3xl rounded-lg bg-white/20 text-center col-span-2"
                            maxLength={2}
                            autoFocus
                        />
                    ) : (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="aspect-square text-3xl rounded-lg bg-white/5 transition-transform hover:scale-110 hover:bg-white/10 flex items-center justify-center"
                            title="Add your own emoji"
                        >
                           <Plus className="text-neutral-400" size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmojiPickerModal;