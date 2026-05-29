import React from 'react';

const Confetti: React.FC = () => {
    const confetti = Array.from({ length: 150 }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
            transform: `scale(${Math.random() * 0.7 + 0.5})`,
        };
        return <div key={i} className="confetti" style={style}></div>;
    });
    return (
        <div className="confetti-container">
            {confetti}
        </div>
    );
};

export default Confetti;