
import React from 'react';

const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* 1. Base Layer (Theme Background) */}
      <div className="absolute inset-0 bg-[var(--bg-color)] transition-colors duration-500" />
      
      {/* Gradient Overlay for texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-color)]/20 to-[var(--bg-color)]/80 mix-blend-overlay" />

      {/* 2. Animated Blobs */}
      {/* Blob 1: Primary Accent (Top Left) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-blob opacity-40 mix-blend-screen"
           style={{ backgroundColor: 'var(--primary-accent)' }} />
      
      {/* Blob 2: Secondary Accent Start (Top Right, Delayed) */}
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-blob animation-delay-2000 opacity-40 mix-blend-screen"
           style={{ backgroundColor: 'var(--secondary-accent-start)' }} />
      
      {/* Blob 3: Secondary Accent End (Bottom Left, More Delayed) */}
      <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full blur-[100px] animate-blob animation-delay-4000 opacity-30 mix-blend-screen"
           style={{ backgroundColor: 'var(--secondary-accent-end)' }} />
      
      {/* 3. Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxmaWx0ZXIgaWQ9Im5vaXNlRmlsdGVyIj4gICAgPGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz4gIDwvZmlsdGVyPiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlRmlsdGVyKSIvPjwvc3ZnPg==')] brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
    </div>
  );
};

export default FluidBackground;
