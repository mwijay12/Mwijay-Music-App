import React from 'react';

interface VisualizerProps {
    type: string;
    isPlaying: boolean;
    analyserData: Uint8Array | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ type, isPlaying, analyserData }) => {
    if (type === 'none' || !isPlaying || !analyserData) {
        return null;
    }

    // FIX: Moved audio data analysis out of renderVisualizer to make `overall` and `progress` accessible throughout the component.
    const data = analyserData;
    const dataLength = data.length; // Should be 128

    const getAverage = (start: number, end: number) => {
        const length = end - start;
        if (length <= 0) return 0;
        let sum = 0;
        for (let i = start; i < end; i++) {
            sum += data[i];
        }
        return sum / length / 255; // Normalize to 0-1
    };

    const bass = getAverage(0, 10);
    const mids = getAverage(40, 80);
    const treble = getAverage(100, dataLength);
    const overall = getAverage(0, dataLength);

    // A simple progress value based on overall volume, for visualizers that need a continuous value
    const progress = overall * 360; 

    const renderVisualizer = () => {
        switch (type) {
            case 'spectral': {
                const barCount = 32;
                return (
                    <div className="absolute inset-0 flex justify-center items-end gap-[1px]">
                        {Array.from({ length: barCount }).map((_, i) => {
                            const index = Math.floor((i / barCount) * dataLength);
                            const value = data[index] / 255;
                            const height = Math.max(2, value * 100);
                            return <div key={i} className="spectral-bar" style={{ height: `${height}%`, width: `${100 / barCount}%` }} />;
                        })}
                    </div>
                );
            }
            case 'aurora': {
                const barCount = 10;
                 return (
                    <div className="absolute inset-0 flex justify-between items-end">
                        {Array.from({ length: barCount }).map((_, i) => {
                            const index = Math.floor((i/barCount) * (dataLength/2));
                            const value = data[index] / 255;
                            const height = Math.max(10, value * 80 + bass * 20);
                            return <div key={i} className="aurora-bar" style={{ height: `${height}%`, left: `${(100 / barCount) * i}%` }} />
                        })}
                    </div>
                );
            }
            case 'pulse-web':
                return (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {Array.from({ length: 8 }).map((_, i) => ( <div key={i} className="pulse-web-line" style={{ transform: `rotate(${i * 22.5}deg)` }} /> ))}
                        {Array.from({ length: 4 }).map((_, i) => {
                            const scale = 0.8 + (bass * 0.2);
                            const opacity = Math.max(0.2, (mids * 0.6));
                             return (
                                <div key={i} className="pulse-web-circle" style={{ 
                                    width: `${25 * (i + 1)}%`, height: `${25 * (i + 1)}%`,
                                    transform: `translate(-50%, -50%) scale(${scale})`,
                                    opacity: opacity
                                 }} />
                            );
                        })}
                    </div>
                );
            case 'rainfall':
                return (
                    <div className="absolute inset-0 overflow-hidden">
                        {Array.from({ length: 50 }).map((_, i) => {
                            const speed = 1 + bass * 2;
                            return (
                                <div key={i} className="rainfall-drop" style={{
                                    left: `${Math.random() * 100}%`,
                                    height: `${Math.max(20, (data[i % dataLength]/255) * 100)}px`,
                                    animation: `rainfall-fall ${Math.random() * 2 + speed}s linear infinite`,
                                    animationDelay: `${Math.random() * 5}s`
                                }} />
                            );
                        })}
                    </div>
                );
             case 'nebula': {
                 const particleCount = 60;
                 return (
                    <div className="absolute inset-0">
                        {Array.from({ length: particleCount }).map((_, i) => {
                            const size = 1 + (data[i % dataLength] / 255) * 3;
                            const opacity = Math.max(0.1, bass);
                            return (
                                <div key={i} className="nebula-star" style={{
                                    top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                                    width: `${size}px`, height: `${size}px`,
                                    opacity: opacity,
                                    transform: `scale(${1 + treble * 0.5})`
                                }} />
                            );
                        })}
                    </div>
                );
            }
            case 'galaxy':
                return (
                    <div className="absolute inset-0" style={{ transform: `rotate(${progress * 10}deg)` }}>
                        {Array.from({ length: 50 }).map((_, i) => {
                             const distance = 50 + (data[i] / 255) * 100;
                             return (
                                <div key={i} className="galaxy-star" style={{ transform: `rotate(${i * 7.2}deg) translateX(${distance}px)`}} />
                            )
                        })}
                    </div>
                );
            case 'equalizer':
                 return (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {Array.from({ length: 6 }).map((_, i) => {
                            const scale = (bass * 0.8 + overall * 0.2) * (i/4)
                            return (
                                <div key={i} className="equalizer-ring" style={{
                                    width: `100%`, height: `100%`,
                                    borderColor: i % 2 === 0 ? 'var(--primary-accent)' : 'var(--secondary-accent-start)',
                                    transform: `scale(${scale})`,
                                    opacity: 1 - scale
                                }} />
                            )
                        })}
                    </div>
                );
            default:
                // Fallback for other visualizers to still show something
                 return (
                    <div className="absolute inset-0 flex justify-between items-end">
                        {Array.from({ length: 20 }).map((_, i) => (
                             <div key={i} className="spectral-bar" style={{ height: `${(data[i % data.length] / 255) * 100}%`, left: `${(100 / 20) * i}%` }} />
                        ))}
                    </div>
                );
        }
    };
    
    return (
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none visualizer-container">
            {renderVisualizer()}
        </div>
    );
};

export default Visualizer;
