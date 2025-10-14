import React from 'react';

interface VisualizerProps {
    type: string;
    isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ type, isPlaying }) => {
    if (type === 'none' || !isPlaying) {
        return null;
    }

    const renderVisualizer = () => {
        // NOTE: Old visualizers like 'DNA', 'Bloom', 'Warp Speed', 'Crystal' have been removed.
        switch (type) {
            case 'spectral':
                return (
                    <div className="absolute inset-0 flex justify-between items-end">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="spectral-bar" style={{ height: `${Math.random() * 80 + 10}%`, left: `${(100 / 20) * i}%`, animationDelay: `${i * 0.05}s` }} />
                        ))}
                    </div>
                );
            case 'galaxy':
                return (
                    <div className="absolute inset-0">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="galaxy-star" style={{ animationDuration: `${Math.random() * 10 + 5}s`, animationDelay: `${Math.random() * 10}s`, transform: `rotate(${Math.random() * 360}deg) translateX(${Math.random() * 100 + 50}px) rotate(0deg)` }} />
                        ))}
                    </div>
                );
            case 'tunnel':
                return (
                    <div className="absolute inset-0" style={{transformStyle: 'preserve-3d', transform: 'rotateX(75deg)'}}>
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="tunnel-ring" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                );
            case 'particles':
                return (
                    <div className="absolute inset-0">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="particle" style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 8}s`,
                                // @ts-ignore
                                '--x-end': `${(Math.random() - 0.5) * 100}px`,
                                '--y-end': `${(Math.random() - 0.5) * 100}px`,
                            }} />
                        ))}
                    </div>
                );
            case 'vortex':
                return (
                    <div className="absolute inset-0" style={{transformStyle: 'preserve-3d', transform: 'rotateX(75deg)'}}>
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="vortex-ring" style={{ 
                                width: `${100 - i*4}%`, height: `${100 - i*4}%`, top: `${i*2}%`, left: `${i*2}%`,
                                borderColor: i % 2 === 0 ? 'var(--primary-accent)' : 'var(--secondary-accent-end)',
                                animationDuration: `${2 + i*0.1}s`
                             }} />
                        ))}
                    </div>
                );
            case 'stardust':
                return (
                    <div className="absolute inset-0">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="star" style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`
                            }} />
                        ))}
                    </div>
                );
            case 'electric':
                return (
                    <div className="absolute inset-0">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="electric-bolt" style={{
                                top: `${Math.random() * 100}%`,
                                transform: `rotate(${(Math.random() - 0.5) * 20}deg)`,
                                animationDelay: `${Math.random() * 0.2}s`
                            }} />
                        ))}
                    </div>
                );
            case 'equalizer':
                return (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="equalizer-ring" style={{
                                width: `${10 + i * 15}%`,
                                height: `${10 + i * 15}%`,
                                borderColor: i % 2 === 0 ? 'var(--primary-accent)' : 'var(--secondary-accent-start)',
                                animationDelay: `${i * 0.1}s`,
                            }} />
                        ))}
                    </div>
                );
            case 'flow':
                return (
                    <div className="absolute inset-0">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="flow-line" style={{
                                top: `${i * 7}%`,
                                animationDuration: `${Math.random() * 3 + 2}s`,
                                animationDelay: `${Math.random() * 4}s`,
                            }} />
                        ))}
                    </div>
                );
            case 'neon-grid':
                return <div className="neon-grid"></div>;
            case 'metropolis':
                return (
                    <div className="metropolis-bar-container">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="metropolis-bar" style={{ animationDelay: `${Math.random() * 2}s` }}></div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none visualizer-container">
            {renderVisualizer()}
        </div>
    );
};

export default Visualizer;