
import React, { useMemo } from 'react';

interface AnimatedCoverArtProps {
    id: string;
    className?: string;
    shape?: 'square' | 'circle';
}

const AnimatedCoverArt: React.FC<AnimatedCoverArtProps> = ({ id, className = '', shape = 'square' }) => {
    // Generate deterministic colors based on the song ID to ensure variety (>100 combos)
    const style = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const h = Math.abs(hash % 360);
        const s = 70 + (Math.abs(hash) % 30); // 70-100% saturation
        
        return {
            // Main background gradient
            background: `linear-gradient(135deg, hsl(${h}, ${s}%, 60%), hsl(${(h + 60) % 360}, ${s}%, 50%))`,
            // Blob colors
            blob1: `hsl(${(h + 30) % 360}, 85%, 65%)`,
            blob2: `hsl(${(h + 180) % 360}, 75%, 55%)`,
            blob3: `hsl(${(h + 90) % 360}, 90%, 70%)`,
            blob4: `hsl(${(h + 270) % 360}, 80%, 60%)`
        };
    }, [id]);

    return (
        <div className={`animated-cover-card ${shape} ${className}`} style={{ background: style.background }}>
             <div className="animated-cover-content" />
             <div className="animated-cover-blob blob-1" style={{ backgroundColor: style.blob1 }} />
             <div className="animated-cover-blob blob-2" style={{ backgroundColor: style.blob2 }} />
             <div className="animated-cover-blob blob-3" style={{ backgroundColor: style.blob3 }} />
             <div className="animated-cover-blob blob-4" style={{ backgroundColor: style.blob4 }} />
        </div>
    );
};

export default AnimatedCoverArt;
