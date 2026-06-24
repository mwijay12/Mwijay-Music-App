
import React, { useRef, useEffect } from 'react';
import type { AudioFxNodes } from '../types.ts';

interface VisualizerProps {
    type: string;
    isPlaying: boolean;
    visualizerColor?: string | null;
    audioFx: AudioFxNodes | null;
    beatSync: boolean;
}

const CanvasVisualizer: React.FC<{ type: string, audioFx: AudioFxNodes | null, isPlaying: boolean, color: string }> = ({ type, audioFx, isPlaying, color }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number = 0;
        let analyser: AnalyserNode | null = null;
        let dataArray: Uint8Array | null = null;

        if (audioFx && audioFx.analyser) {
            analyser = audioFx.analyser;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        const resize = () => {
            canvas.width = canvas.clientWidth * window.devicePixelRatio;
            canvas.height = canvas.clientHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        window.addEventListener('resize', resize);
        resize();

        // Particles for Galaxy/Particles mode
        const particles: {x: number, y: number, size: number, speed: number, angle: number}[] = [];
        for(let i=0; i<100; i++) {
            particles.push({
                x: Math.random() * canvas.clientWidth,
                y: Math.random() * canvas.clientHeight,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 0.5,
                angle: Math.random() * Math.PI * 2
            });
        }

        // Persistent visualizer states
        const smoothHeights = new Array(32).fill(0);
        const smoothCaps = new Array(32).fill(0);

        const render = () => {
            animationId = requestAnimationFrame(render);
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            ctx.clearRect(0, 0, width, height);

            let beatValue = 0;
            if (analyser && dataArray) {
                analyser.getByteFrequencyData(dataArray as any);
                let sum = 0;
                for(let i=0; i<20; i++) sum += dataArray[i]; // Low freqs
                beatValue = sum / 20 / 255; 
            } else if (isPlaying) {
                // Highly realistic 120 BPM rhythmic kick-drum pulse simulation for fallback beat sync
                const time = Date.now();
                const period = 500; // 500ms = 120 BPM
                const progress = (time % period) / period;
                beatValue = Math.exp(-progress * 6.0) * 0.85;
            }

            ctx.fillStyle = color;
            ctx.strokeStyle = color;

            if (type === 'beat-pulse') {
                const radius = (Math.min(width, height) / 4) * (1 + beatValue * 0.5);
                ctx.beginPath();
                ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
                ctx.globalAlpha = 0.5;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(width/2, height/2, radius * 1.2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (type === 'galaxy') {
                ctx.save();
                ctx.translate(width/2, height/2);
                ctx.rotate(Date.now() * 0.0005 + beatValue);
                particles.forEach((p, i) => {
                    const r = p.size + (beatValue * 5); // Pulse size
                    const d = 50 + i * 2; // Distance from center
                    const x = Math.cos(p.angle + i) * d;
                    const y = Math.sin(p.angle + i) * d;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            } else if (type === 'tunnel') {
                const rings = 10;
                const maxRadius = Math.max(width, height);
                for(let i=0; i<rings; i++) {
                    const offset = (Date.now() * 0.1 + i * (maxRadius / rings)) % maxRadius;
                    const r = offset * (1 + beatValue * 0.2);
                    ctx.beginPath();
                    ctx.arc(width/2, height/2, r, 0, Math.PI * 2);
                    ctx.globalAlpha = 1 - (r / maxRadius);
                    ctx.lineWidth = 2 + beatValue * 5;
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else if (type === 'particles') {
                particles.forEach(p => {
                    p.y -= p.speed + (beatValue * 5);
                    if (p.y < 0) {
                        p.y = height;
                        p.x = Math.random() * width;
                    }
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (type === 'waveform' && analyser && dataArray) {
                analyser.getByteTimeDomainData(dataArray as any);
                ctx.beginPath();
                ctx.lineWidth = 2;
                const sliceWidth = width / dataArray.length;
                let x = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * height / 2;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                    x += sliceWidth;
                }
                ctx.lineTo(width, height / 2);
                ctx.stroke();
            } else if (type === 'circular-bars' && dataArray) {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) / 4;
                const bars = 64;
                for (let i = 0; i < bars; i++) {
                    const angle = (i / bars) * Math.PI * 2;
                    const val = dataArray[i % dataArray.length] / 255;
                    const barHeight = val * radius;
                    const x1 = centerX + Math.cos(angle) * radius;
                    const y1 = centerY + Math.sin(angle) * radius;
                    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                    const y2 = centerY + Math.sin(angle) * (radius + barHeight);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            } else if (type === 'vortex') {
                ctx.save();
                ctx.translate(width/2, height/2);
                ctx.rotate(Date.now() * 0.001);
                for(let i=0; i<50; i++) {
                    const r = (i * 5) * (1 + beatValue);
                    const angle = i * 0.2;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    ctx.beginPath();
                    ctx.arc(x, y, 2 + beatValue * 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (type === 'neon-grid') {
                const rows = 10;
                const cols = 10;
                const spacing = width / cols;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3 + beatValue * 0.7;
                for(let i=0; i<=rows; i++) {
                    const y = (i * height / rows) + (Date.now() * 0.05 % (height/rows));
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }
                for(let i=0; i<=cols; i++) {
                    const x = i * spacing;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else if (type === 'serengeti-sunset') {
                // Warm gradient background
                const grad = ctx.createLinearGradient(0, 0, 0, height);
                grad.addColorStop(0, '#FF4500');
                grad.addColorStop(1, '#FFD700');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
                
                // Sun
                const sunRadius = (Math.min(width, height) / 6) * (1 + beatValue * 0.2);
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(width/2, height/3, sunRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Silhouette ground
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.ellipse(width/2, height, width * 0.8, height * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'kilimanjaro') {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.moveTo(0, height);
                ctx.lineTo(width/2, height * 0.3 - (beatValue * 50));
                ctx.lineTo(width, height);
                ctx.fill();
                // Snow cap
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(width/2 - 50, height * 0.37);
                ctx.lineTo(width/2, height * 0.3 - (beatValue * 50));
                ctx.lineTo(width/2 + 50, height * 0.37);
                ctx.fill();
            } else if (type === 'matrix-rain') {
                ctx.font = '15px monospace';
                ctx.fillStyle = color;
                const columns = Math.floor(width / 20);
                for(let i=0; i<columns; i++) {
                    const char = String.fromCharCode(0x30A0 + Math.random() * 96);
                    const x = i * 20;
                    const y = (Date.now() * (0.1 + (i % 5) * 0.05)) % height;
                    ctx.globalAlpha = 0.5 + beatValue * 0.5;
                    ctx.fillText(char, x, y);
                }
                ctx.globalAlpha = 1;
            } else if (type === 'fire-storm') {
                for(let i=0; i<30; i++) {
                    const x = Math.random() * width;
                    const y = height - (Math.random() * height * beatValue);
                    const r = Math.random() * 20 + 10;
                    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                    grad.addColorStop(0, '#FF4500');
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (type === 'tribal-pulse') {
                const centerX = width / 2;
                const centerY = height / 2;
                ctx.lineWidth = 5;
                for(let i=0; i<4; i++) {
                    const r = (50 + i * 40) * (1 + beatValue * 0.3);
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                    ctx.setLineDash([20, 10]);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            } else if (type === 'spectral' && dataArray) {
                // Classic bar visualizer
                const barWidth = (width / dataArray.length) * 2.5;
                let x = 0;
                for(let i = 0; i < dataArray.length; i++) {
                    const barHeight = (dataArray[i] / 255) * height;
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
            } else if (type === 'beat-synced-spectral' && dataArray) {
                const binSize = Math.max(1, Math.floor(dataArray.length / 32));
                const barW = (width / 32) - 2;
                for (let i = 0; i < 32; i++) {
                    let sum = 0;
                    for (let j = 0; j < binSize; j++) {
                        sum += dataArray[Math.min(dataArray.length - 1, i * binSize + j)];
                    }
                    const val = sum / binSize / 255;
                    const targetHeight = val * height * 0.85;

                    if (targetHeight > smoothHeights[i]) {
                        smoothHeights[i] = targetHeight;
                    } else {
                        smoothHeights[i] -= (height * 0.015);
                    }
                    smoothHeights[i] = Math.max(0, smoothHeights[i]);

                    if (smoothHeights[i] > smoothCaps[i]) {
                        smoothCaps[i] = smoothHeights[i];
                    } else {
                        smoothCaps[i] -= (height * 0.005);
                    }
                    smoothCaps[i] = Math.max(0, smoothCaps[i]);

                    const x = i * (barW + 2);
                    const h = smoothHeights[i];

                    const grad = ctx.createLinearGradient(x, height, x, height - h);
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
                    ctx.fillStyle = grad;

                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(x, height - h, barW, h, [4, 4, 0, 0]);
                    } else {
                        ctx.rect(x, height - h, barW, h);
                    }
                    ctx.fill();

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(x, height - smoothCaps[i] - 4, barW, 2);
                }
            } else if (type === 'rhythmic-grid') {
                const rows = 7;
                const cols = 7;
                const cellW = width / cols;
                const cellH = height / rows;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const dist = Math.sqrt(Math.pow(r - 3, 2) + Math.pow(c - 3, 2));
                        let val = 0;
                        if (dataArray) {
                            const idx = Math.min(dataArray.length - 1, Math.floor(dist * 12));
                            val = dataArray[idx] / 255;
                        } else {
                            val = beatValue * (1 - dist / 5);
                        }
                        
                        const maxRadius = Math.min(cellW, cellH) * 0.4;
                        const size = maxRadius * (0.2 + val * 0.8);
                        const x = c * cellW + cellW / 2;
                        const y = r * cellH + cellH / 2;

                        ctx.save();
                        ctx.globalAlpha = 0.15 + val * 0.85;
                        ctx.fillStyle = color;
                        ctx.shadowColor = color;
                        ctx.shadowBlur = val * 10;

                        ctx.beginPath();
                        ctx.arc(x, y, Math.max(2, size), 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            } else {
                // Fallback / legacy bars
                const bars = 12;
                const gap = 4;
                const barW = (width - (bars-1)*gap) / bars;
                for(let i=0; i<bars; i++) {
                    let h = height * 0.2;
                    if(isPlaying) {
                        h = height * (0.2 + 0.6 * Math.abs(Math.sin(Date.now()*0.005 + i)));
                    }
                    ctx.fillRect(i * (barW + gap), (height - h)/2, barW, h);
                }
            }
        };

        if (isPlaying) {
            render();
        } else {
            // Draw static state
            render();
            cancelAnimationFrame(animationId);
        }

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [audioFx, isPlaying, color, type]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const Visualizer: React.FC<VisualizerProps> = ({ type, isPlaying, visualizerColor, audioFx, beatSync }) => {
    if (type === 'none') return null;

    const activeColor = visualizerColor || getComputedStyle(document.documentElement).getPropertyValue('--primary-accent').trim() || '#C8F052';

    return <CanvasVisualizer type={type} audioFx={audioFx} isPlaying={isPlaying} color={activeColor} />;
};

export default Visualizer;
