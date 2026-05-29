
import React, { useMemo } from 'react';
import type { ProfileData } from '../types.ts';
import Aurora from './Aurora.tsx';

const FloatingEmojis: React.FC<{ emojis: string[] }> = React.memo(({ emojis }) => {
    const items = useMemo(() => Array.from({ length: 30 }).map((_, i) => ({
        emoji: emojis[i % emojis.length],
        left: `${Math.random() * 100}%`,
        animationDuration: `${Math.random() * 10 + 10}s`,
        animationDelay: `${Math.random() * 20}s`,
        fontSize: `${Math.random() * 1.5 + 1}rem`,
        opacity: Math.random() * 0.5 + 0.3
    })), [emojis]);

    return (
        <>
            {items.map((item, i) => (
                <div key={i} className="floating-emoji" style={{
                    position: 'absolute',
                    bottom: '-50px',
                    left: item.left,
                    fontSize: item.fontSize,
                    opacity: item.opacity,
                    animation: `floatUp ${item.animationDuration} linear infinite`,
                    animationDelay: item.animationDelay,
                    pointerEvents: 'none',
                    userSelect: 'none'
                }}>
                    {item.emoji}
                </div>
            ))}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(-110vh) rotate(360deg); opacity: 0; }
                }
            `}</style>
        </>
    );
});

const BackgroundEffects: React.FC<{ settings: ProfileData['settings']['backgroundEffects'] }> = React.memo(({ settings }) => {
    if (!settings.enabled || settings.style === 'none') return null;

    if (settings.style === 'aurora') {
        return <Aurora />;
    }

    const effectContent = useMemo(() => {
        switch (settings.style) {
            case 'constellationDrift':
                return Array.from({ length: 50 }).map((_, i) => (
                    <div key={i} className="constellation-star" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        // @ts-ignore
                        '--x-end': `${(Math.random() - 0.5) * 80}px`,
                        '--y-end': `${(Math.random() - 0.5) * 80}px`,
                    }} />
                ));
            case 'spiritRise':
                return Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="spirit-particle" style={{
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 5 + 2}px`, height: `${Math.random() * 5 + 2}px`,
                        animationDuration: `${Math.random() * 15 + 10}s`,
                        animationDelay: `${Math.random() * 25}s`,
                    }} />
                ));
            case 'warpPulse':
                 return Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="ripple-circle" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 4}s`,
                    }} />
                ));
            case 'fallingNotes':
                const notes = ['🎵', '🎶', '🎼', '♬'];
                return Array.from({ length: 30 }).map((_, i) => (
                    <span key={i} className="falling-note" style={{
                        left: `${Math.random() * 100}%`,
                        fontSize: `${Math.random() * 12 + 10}px`,
                        animationDuration: `${Math.random() * 8 + 6}s`,
                        animationDelay: `${Math.random() * 14}s`,
                    }}>
                        {notes[i % notes.length]}
                    </span>
                ));
            case 'cosmicDust':
                return Array.from({ length: 70 }).map((_, i) => {
                    const size = Math.random() * 2 + 1;
                    return (
                        <div key={i} className="cosmic-dust-particle" style={{
                            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                            width: `${size}px`, height: `${size}px`,
                            animationDuration: `${Math.random() * 15 + 10}s`,
                            animationDelay: `${Math.random() * 25}s`,
                            // @ts-ignore
                            '--x-end': `${(Math.random() - 0.5) * 200}px`,
                            '--y-end': `${(Math.random() - 0.5) * 200}px`,
                            '--s-end': `${Math.random() * 0.5 + 0.5}`,
                        }} />
                    )
                });
            case 'fireflies':
                return Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className="firefly" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 10 + 5}s`,
                        animationDelay: `${Math.random() * 15}s`,
                         // @ts-ignore
                        '--tx': `${(Math.random() - 0.5) * 80}px`,
                        '--ty': `${(Math.random() - 0.5) * 80}px`,
                    }} />
                ));
            case 'bubbles':
                return Array.from({ length: 20 }).map((_, i) => {
                    const size = Math.random() * 40 + 10;
                    return (
                        <div key={i} className="bubble" style={{
                            left: `${Math.random() * 100}%`,
                            width: `${size}px`, height: `${size}px`,
                            animationDuration: `${Math.random() * 15 + 10}s`,
                            animationDelay: `${Math.random() * 25}s`,
                        }} />
                    )
                });
            case 'warpSpeed':
                return (
                    <div className="warp-speed-container">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="warp-star" style={{
                                animationDelay: `${Math.random() * 3}s`,
                                transform: `rotate(${Math.random() * 360}deg) translateZ(-200px) translateX(${(Math.random() - 0.5) * 400}px) translateY(${(Math.random() - 0.5) * 400}px)`,
                            }} />
                        ))}
                    </div>
                );
            case 'stardust':
                 return Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="stardust-particle" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 10 + 20}s, ${Math.random() * 4 + 3}s`,
                        animationDelay: `${Math.random() * 30}s, ${Math.random() * 7}s`,
                         // @ts-ignore
                        '--tx': `${(Math.random() - 0.5) * 200}px`,
                        '--ty': `${(Math.random() - 0.5) * 200}px`,
                    }} />
                ));
            case 'energyFlow':
                 return Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="energy-flow-line" style={{
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 3 + 2}s`,
                        animationDelay: `${Math.random() * 5}s`,
                    }} />
                ));
            case 'twinklingStars':
                return Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="twinkle-star" style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 3 + 2}s`,
                        animationDelay: `${Math.random() * 5}s`,
                    }} />
                ));
            // Holiday Effects
            case 'hearts': return <FloatingEmojis emojis={['💖', '💘', '🌹', '💋', '🧸']} />;
            case 'christmas': return <FloatingEmojis emojis={['🎄', '🎅', '❄️', '🎁', '⛄']} />;
            case 'spooky': return <FloatingEmojis emojis={['🎃', '👻', '🕸️', '🦇', '💀']} />;
            case 'diwali': return <FloatingEmojis emojis={['🪔', '✨', '🎆', '🕯️', '🏵️']} />;
            case 'fireworks': return <FloatingEmojis emojis={['🎆', '🎇', '✨', '🥂', '🎉']} />;
            case 'eggs': return <FloatingEmojis emojis={['🥚', '🐰', '🐣', '🌷', '🍫']} />;
            case 'clovers': return <FloatingEmojis emojis={['☘️', '🍀', '🎩', '🌈', '💰']} />;
            case 'colors': return <FloatingEmojis emojis={['🎨', '💧', '🟣', '🟡', '🟢']} />;
            case 'crescents': return <FloatingEmojis emojis={['🌙', '🕌', '⭐', '📿', '🕋']} />;
            case 'petals': return <FloatingEmojis emojis={['🌸', '💮', '🍱', '🍡', '🍵']} />;
            case 'pride': return <FloatingEmojis emojis={['🏳️‍🌈', '🦄', '🌈', '⚧', '☮️']} />;
            case 'leaves': return <FloatingEmojis emojis={['🦃', '🍂', '🥧', '🍁', '🌽']} />;
            case 'earth': return <FloatingEmojis emojis={['🌍', '🌱', '🌳', '♻️', '🐼']} />;
            case 'stars_david': return <FloatingEmojis emojis={['🕎', '🔯', '🕯️', '🕍', '🥔']} />;
            case 'fiesta': return <FloatingEmojis emojis={['🌮', '💃', '🌵', '🪅', '🌶️']} />;
            case 'pretzels': return <FloatingEmojis emojis={['🍺', '🥨', '🌭', '🎻', '🍻']} />;
            case 'torch': return <FloatingEmojis emojis={['🔥', '🔦', '🕊️', '🇹🇿']} />;
            
            default:
                return null;
        }
    }, [settings.style]);
    
    return (
        <div className="background-effects-container">
            {effectContent}
        </div>
    );
});

export default BackgroundEffects;
