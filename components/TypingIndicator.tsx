import React from 'react';

const TypingIndicator: React.FC = () => {
    return (
        <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg p-3 max-w-xs flex items-center space-x-1">
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-0"></span>
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
            </div>
        </div>
    );
};

export default TypingIndicator;
