
import { useEffect, useState, useRef } from 'react';

export const useShake = (onShake: () => void, threshold = 15, timeout = 1000) => {
    const lastShake = useRef(0);
    const lastX = useRef(0);
    const lastY = useRef(0);
    const lastZ = useRef(0);

    useEffect(() => {
        const handleMotion = (e: DeviceMotionEvent) => {
            const current = e.accelerationIncludingGravity;
            if (!current) return;

            const { x, y, z } = current;
            const now = Date.now();

            if (!x || !y || !z) return;

            const deltaX = Math.abs(x - lastX.current);
            const deltaY = Math.abs(y - lastY.current);
            const deltaZ = Math.abs(z - lastZ.current);

            if ((deltaX + deltaY + deltaZ) > threshold) {
                if (now - lastShake.current > timeout) {
                    lastShake.current = now;
                    onShake();
                }
            }

            lastX.current = x;
            lastY.current = y;
            lastZ.current = z;
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [onShake, threshold, timeout]);
};
