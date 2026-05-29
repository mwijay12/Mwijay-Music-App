import React from 'react';
import Confetti from './Confetti';
import BubbleButton from './BubbleButton.tsx';

interface TutorialModalProps {
    userName: string;
    onYes: () => void;
    onNo: () => void;
    showCelebration: boolean;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ userName, onYes, onNo, showCelebration }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {showCelebration && <Confetti />}
            <div className="liquid-glass-pane p-8 rounded-2xl text-center flex flex-col items-center max-w-sm animate-pop-in">
                <div className="text-6xl mb-4 animate-handshake">🤝</div>
                <h2 className="text-3xl font-bold" style={{ color: 'var(--primary-accent)' }}>Welcome, {userName}!</h2>
                <p className="text-neutral-300 mt-4">This app has lots of cool features. Would you like a quick tour to learn how things work?</p>
                <div className="flex gap-4 mt-6 w-full">
                    <button onClick={onNo} className="flex-1 bg-[var(--chip-bg)] text-white font-bold py-3 rounded-full transition-colors hover:bg-white/10">
                        No
                    </button>
                    <BubbleButton onClick={onYes} className="flex-1">
                        Yes
                    </BubbleButton>
                </div>
            </div>
        </div>
    );
};

export default TutorialModal;