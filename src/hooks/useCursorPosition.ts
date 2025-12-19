import { useState, useEffect, useRef } from 'react';

/**
 * Hook to track cursor position relative to .main-content area
 * Used for cursor mirroring in shared workspaces
 *
 * Only tracks cursor when it's over a canvas element.
 * By tracking position relative to .main-content, the cursor position
 * remains accurate regardless of sidebar panel state (open/closed)
 */
export function useCursorPosition() {
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const latestPosition = useRef<{ x: number; y: number } | null>(null);
  const isOverCanvas = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Check if the mouse is over a canvas element
      const target = e.target as HTMLElement;
      const canvas = target.closest('canvas') || (target.tagName === 'CANVAS' ? target : null);

      if (!canvas) {
        // Mouse is not over a canvas - hide cursor for viewers
        if (isOverCanvas.current) {
          isOverCanvas.current = false;
          latestPosition.current = null;
          setCursorPosition(null);
        }
        return;
      }

      isOverCanvas.current = true;

      // Get the main-content element to calculate relative position
      const mainContent = document.querySelector('.main-content');

      if (mainContent) {
        const rect = mainContent.getBoundingClientRect();
        // Calculate position relative to main-content, including scroll offset
        latestPosition.current = {
          x: e.clientX - rect.left + mainContent.scrollLeft,
          y: e.clientY - rect.top + mainContent.scrollTop
        };
      } else {
        // Fallback to viewport coordinates if main-content not found
        latestPosition.current = { x: e.clientX, y: e.clientY };
      }

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
      isOverCanvas.current = false;
      latestPosition.current = null;
      setCursorPosition(null);
    };

    // Track mouse globally but only capture when over canvas
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
