import React, { useEffect, useRef } from 'react';

export const useInterruptibleScroll = (scrollerRef: React.RefObject<HTMLElement>, contentRef: React.RefObject<HTMLElement>, direction: 'horizontal' | 'vertical' = 'horizontal') => {
    const resumeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const scroller = scrollerRef.current;
        const content = contentRef.current;
        if (!scroller || !content) return;

        const pauseAnimationAndSetResumeTimer = () => {
            if (resumeTimerRef.current) {
                clearTimeout(resumeTimerRef.current);
            }
            if (content.style.animationPlayState !== 'paused') {
                content.style.animationPlayState = 'paused';
            }
            resumeTimerRef.current = window.setTimeout(() => {
                // Check if content is still mounted before resuming
                if(document.body.contains(content)) {
                    content.style.animationPlayState = 'running';
                }
            }, 2000); // Reduced resume time
        };
        
        const events: (keyof HTMLElementEventMap)[] = ['wheel', 'touchstart', 'scroll', 'mousedown'];
        events.forEach(event => scroller.addEventListener(event, pauseAnimationAndSetResumeTimer, { passive: true }));
        
        return () => {
            events.forEach(event => {
                if(scroller) scroller.removeEventListener(event, pauseAnimationAndSetResumeTimer);
            });
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        };
    }, [scrollerRef, contentRef, direction]);
};