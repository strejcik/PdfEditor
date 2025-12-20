import { useState, useEffect, useRef } from 'react';

/**
 * Normalized cursor position for sharing between host and viewers.
 * Uses normalized coordinates (0-1) relative to the canvas dimensions,
 * allowing accurate cursor mirroring regardless of window/canvas size.
 */
export interface NormalizedCursorPosition {
  /** Normalized X coordinate (0-1) relative to canvas width */
  normalizedX: number;
  /** Normalized Y coordinate (0-1) relative to canvas height */
  normalizedY: number;
  /** Page index the cursor is over */
  pageIndex: number;
  /** Original canvas dimensions for reference */
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Hook to track cursor position in normalized coordinates
 * Used for cursor mirroring in shared workspaces
 *
 * Only tracks cursor when it's over a canvas element.
 * Returns normalized (0-1) coordinates relative to the canvas,
 * ensuring accurate cursor positioning regardless of window size.
 */
export function useCursorPosition() {
  const [cursorPosition, setCursorPosition] = useState<NormalizedCursorPosition | null>(null);
  const rafRef = useRef<number>(0);
  const latestPosition = useRef<NormalizedCursorPosition | null>(null);
  const isOverCanvas = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Check if the mouse is over a canvas element
      const target = e.target as HTMLElement;
      const canvas = target.closest('canvas') || (target.tagName === 'CANVAS' ? target : null) as HTMLCanvasElement | null;

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

      // Get the canvas bounding rect for position calculation
      const canvasRect = canvas.getBoundingClientRect();

      // Calculate cursor position relative to the canvas
      const canvasX = e.clientX - canvasRect.left;
      const canvasY = e.clientY - canvasRect.top;

      // Normalize coordinates to 0-1 range based on canvas displayed size
      const normalizedX = canvasX / canvasRect.width;
      const normalizedY = canvasY / canvasRect.height;

      // Find the page index by looking at the canvas's data attribute or parent
      let pageIndex = 0;
      const pageIndexAttr = canvas.getAttribute('data-page-index');
      if (pageIndexAttr !== null) {
        pageIndex = parseInt(pageIndexAttr, 10);
      } else {
        // Fallback: try to find from parent page wrapper
        const pageWrapper = canvas.closest('[data-page-index]');
        if (pageWrapper) {
          const idx = pageWrapper.getAttribute('data-page-index');
          if (idx !== null) {
            pageIndex = parseInt(idx, 10);
          }
        }
      }

      latestPosition.current = {
        normalizedX,
        normalizedY,
        pageIndex,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      };

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
