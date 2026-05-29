import React, { useState, useEffect } from 'react';

export const TextGenerateEffect: React.FC<{ words: string; className?: string }> = ({ words, className }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        setDisplayedText(''); // Reset when words prop changes
        let i = 0;
        const intervalId = setInterval(() => {
            const newText = words.substring(0, i + 1);
            setDisplayedText(newText);
            i++;
            if (i > words.length) {
                clearInterval(intervalId);
            }
        }, 20); // Typing speed in ms

        return () => clearInterval(intervalId);
    }, [words]);

    // Using `white-space: pre-wrap` to preserve newlines and spacing from the AI's response.
    return (
        <div className={className} style={{ whiteSpace: 'pre-wrap' }}>
            {displayedText}
        </div>
    );
};

export default TextGenerateEffect;
