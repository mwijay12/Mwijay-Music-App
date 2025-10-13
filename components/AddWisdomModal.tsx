
import React, { useState } from 'react';

interface AddWisdomModalProps {
    onClose: () => void;
    onSave: (wisdom: string) => void;
}

const AddWisdomModal: React.FC<AddWisdomModalProps> = ({ onClose, onSave }) => {
    const [text, setText] = useState('');

    const handleSave = () => {
        if (!text.trim()) {
            alert('Please enter a quote or fact.');
            return;
        }
        onSave(text);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[210] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-[var(--surface-color)] w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="font-bold text-lg text-center">Add Your Wisdom</h3>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter your favorite quote or a cool fact..."
                    className="w-full h-32 bg-white/10 p-3 rounded-md border-transparent focus:border-[var(--primary-accent)] focus:ring-[var(--primary-accent)] resize-none"
                    maxLength={200}
                />
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="bg-[var(--chip-bg)] font-bold py-2 px-4 rounded-full">Cancel</button>
                    <button onClick={handleSave} className="bg-[var(--primary-accent)] text-black font-bold py-2 px-4 rounded-full">Save</button>
                </div>
            </div>
        </div>
    );
};

export default AddWisdomModal;
