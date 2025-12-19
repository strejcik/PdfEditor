import { useState, useEffect, useRef } from 'react';

/**
 * Hook to track global cursor position
 * Used for cursor mirroring in shared workspaces
 */
export function useCursorPosition() {
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const latestPosition = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Store the latest position
      latestPosition.current = { x: e.clientX, y: e.clientY };

      // Throttle updates with requestAnimationFrame
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        if (latestPosition.current) {
          setCursorPosition(latestPosition.current);
        }
      });
    };

    const handleMouseLeave = () => {
      setCursorPosition(null);
    };

    // Track mouse globally
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return cursorPosition;
}
