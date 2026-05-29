import React, { useEffect, useRef } from 'react';
import type { ProfileData } from '../types';

interface EdgeLightingProps {
    settings: ProfileData['settings']['edgeLighting'];
}

const EdgeLighting: React.FC<EdgeLightingProps> = React.memo(({ settings }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        const c1 = rootStyle.getPropertyValue('--primary-accent').trim();
        const c2 = rootStyle.getPropertyValue('--secondary-accent-start').trim();
        const c3 = rootStyle.getPropertyValue('--secondary-accent-end').trim();

        if (ref.current) {
            ref.current.style.setProperty('--edge-c1', settings.color1 || c1);
            ref.current.style.setProperty('--edge-c2', settings.color2 || c2);
            ref.current.style.setProperty('--edge-c3', settings.color3 || c3);
        }
    }, [settings.color1, settings.color2, settings.color3]); // Rerun when custom colors change


    if (!settings.enabled) {
        return null;
    }

    const style = {
        '--angle': '0deg',
        '--edge-depth': `${settings.depth}px`,
        '--edge-radius': `${settings.radius}px`,
        '--edge-speed': `${11 - settings.speed}s`,
    } as React.CSSProperties;

    return (
        <div ref={ref} className="edge-lighting-container" style={style}></div>
    );
});

export default EdgeLighting;