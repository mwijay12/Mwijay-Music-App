
import React, { useState } from 'react';

interface AddMoodModalProps {
    onClose: () => void;
    onSave: (mood: { emoji: string; name: string; color: string }) => void;
    showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const colors = [
    'bg-red-500/80', 'bg-orange-500/80', 'bg-amber-500/80', 'bg-yellow-400/80', 'bg-lime-500/80',
    'bg-green-500/80', 'bg-emerald-500/80', 'bg-teal-500/80', 'bg-cyan-500/80', 'bg-sky-400/80',
    'bg-blue-500/80', 'bg-indigo-500/80', 'bg-violet-500/80', 'bg-purple-500/80', 'bg-fuchsia-500/80',
    'bg-pink-500/80', 'bg-rose-500/80'
];

const AddMoodModal: React.FC<AddMoodModalProps> = ({ onClose, onSave, showNotification }) => {
    const [emoji, setEmoji] = useState('😀');
    const [name, setName] = useState('');
    const [color, setColor] = useState(colors[0]);

    const handleSave = () => {
        if (!name.trim() || !emoji.trim()) {
            showNotification('Please enter a name and a single emoji.', 'error');
            return;
        }
        // A simple check for a single emoji. Not foolproof but good enough.
        if ([...emoji].length > 2) {
            showNotification('Please use only one emoji.', 'error');
            return;
        }
        onSave({ emoji, name, color: `${color} text-white` });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[320] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-[var(--surface-color)] w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center">Add Custom Mood</h3>

                <div className="flex items-center gap-4">
                    <input 
                        type="text" 
                        value={emoji}
                        onChange={e => setEmoji(e.target.value)}
                        maxLength={2}
                        className="w-20 h-20 text-5xl text-center bg-white/10 rounded-full"
                    />
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Mood Name"
                        className="flex-1 bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)]"
                    />
                </div>
                <div>
                    <p className="text-sm font-bold mb-2">Choose a color:</p>
                    <div className="grid grid-cols-7 gap-2">
                        {colors.map(c => (
                            <button 
                                key={c} 
                                onClick={() => setColor(c)}
                                className={`w-full aspect-square rounded-full ${c} ${color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--surface-color)] ring-white' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={onClose} className="bg-[var(--chip-bg)] font-bold py-2 px-4 rounded-full">Cancel</button>
                    <button onClick={handleSave} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-4 rounded-full">Save Mood</button>
                </div>
            </div>
        </div>
    );
};

export default AddMoodModal;
