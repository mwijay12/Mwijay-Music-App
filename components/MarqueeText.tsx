import React, { useEffect, useRef, useState } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number;          // pixels per second
  pauseDuration?: number;  // ms to pause at start
  gap?: number;            // gap between repetitions
  alwaysScroll?: boolean;  // force scroll even if fits
  isActive?: boolean;      // only scroll when active (playing)
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  speed = 40,
  pauseDuration = 1500,
  gap = 50,
  alwaysScroll = false,
  isActive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(0);
  
  useEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !textRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      
      const overflows = textWidth > containerWidth;
      setShouldScroll(overflows || alwaysScroll);
      
      if (overflows || alwaysScroll) {
        // Calculate scroll duration based on text length
        const totalDistance = textWidth + gap;
        const duration = totalDistance / speed;
        setAnimationDuration(duration);
      }
    };
    
    checkOverflow();
    
    // Re-check on resize
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [text, speed, gap, alwaysScroll]);
  
  if (!shouldScroll || !isActive) {
    return (
      <div ref={containerRef} className={`marquee-container ${className}`}>
        <span ref={textRef} className="marquee-text-static">
          {text}
        </span>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className={`marquee-container ${className}`}>
      <div 
        className="marquee-track"
        style={{
          animationDuration: `${animationDuration}s`,
          animationDelay: `${pauseDuration / 1000}s`,
        }}
      >
        <span ref={textRef} className="marquee-text">
          {text}
        </span>
        <span 
          className="marquee-text marquee-text-clone"
          style={{ paddingLeft: `${gap}px` }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
