import React, { useEffect, useRef } from 'react';

interface TypingAnimationProps {
  isTyping: boolean;
}

export function TypingAnimation({ isTyping }: TypingAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !isTyping) return;

    const dots = containerRef.current.querySelectorAll('.dot');
    let frame = 0;

    const animate = () => {
      frame = (frame + 1) % 180; // 3 second cycle for more complex animation
      
      dots.forEach((dot, index) => {
        const offset = index * 15; // Tighter stagger
        const progress = ((frame + offset) % 180) / 180;
        
        // Complex movement combining multiple waves
        const x = Math.sin(progress * Math.PI * 4) * 4;
        const y = Math.cos(progress * Math.PI * 2) * 6;
        
        // Pulsing scale effect
        const baseScale = 0.8 + Math.sin(progress * Math.PI * 6) * 0.2;
        const scale = baseScale * (1 + index * 0.1); // Each dot slightly larger
        
        // Dynamic color transition
        const hue = (progress * 360 + index * 30) % 360;
        const saturation = 80 + Math.sin(progress * Math.PI * 2) * 20;
        const lightness = 60 + Math.cos(progress * Math.PI * 4) * 10;
        
        // Apply transforms
        (dot as HTMLElement).style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        (dot as HTMLElement).style.backgroundColor = `hsl(${hue}deg, ${saturation}%, ${lightness}%)`;
        (dot as HTMLElement).style.boxShadow = `0 0 12px hsla(${hue}deg, ${saturation}%, ${lightness}%, 0.5)`;
      });

      if (isTyping) {
        requestAnimationFrame(animate);
      }
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isTyping]);

  if (!isTyping) return null;

  return (
    <div 
      ref={containerRef}
      className="inline-flex items-center h-8 px-2 py-1 ml-2"
      role="status"
      aria-label="Loading response"
    >
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="dot w-3 h-3 rounded-full transition-all duration-75 ease-out"
            style={{
              backgroundColor: 'hsl(230, 80%, 60%)',
              boxShadow: '0 0 12px hsla(230, 80%, 60%, 0.5)',
            }}
          />
        ))}
      </div>
    </div>
  );
}