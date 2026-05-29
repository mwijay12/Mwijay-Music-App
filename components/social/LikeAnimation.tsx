import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
}

export const LikeAnimation: React.FC = () => {
  // Generate 6 particles with equal radial spacing
  const particles: Particle[] = Array.from({ length: 6 }).map((_, index) => {
    const angle = (index * 360) / 6;
    const distance = 40 + Math.random() * 20;
    const rad = (angle * Math.PI) / 180;
    return {
      id: index,
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      scale: 0.4 + Math.random() * 0.4,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-30">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
            scale: particle.scale,
          }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1], // premium custom easeOutExpo curve
          }}
        >
          <Heart size={14} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};
export default LikeAnimation;
