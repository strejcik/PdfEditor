import React, { useRef, useEffect, useCallback } from 'react';
import './HostCursor.css';

/**
 * HostCursor - Displays the host's cursor position for viewers
 * Uses requestAnimationFrame interpolation for smooth cursor movement
 */
export const HostCursor = ({ position }) => {
  const cursorRef = useRef(null);
  const currentPos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const isAnimating = useRef(false);

  // Interpolation factor (0.3 = 30% of distance per frame, higher = faster)
  const LERP_FACTOR = 0.35;
  // Threshold to stop interpolation (in pixels)
  const THRESHOLD = 0.5;

  const lerp = useCallback((start, end, factor) => {
    return start + (end - start) * factor;
  }, []);

  const animate = useCallback(() => {
    const dx = targetPos.current.x - currentPos.current.x;
    const dy = targetPos.current.y - currentPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > THRESHOLD) {
      // Interpolate towards target
      currentPos.current.x = lerp(currentPos.current.x, targetPos.current.x, LERP_FACTOR);
      currentPos.current.y = lerp(currentPos.current.y, targetPos.current.y, LERP_FACTOR);

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentPos.current.x - 2}px, ${currentPos.current.y - 2}px, 0)`;
      }

      rafId.current = requestAnimationFrame(animate);
    } else {
      // Snap to target when close enough
      currentPos.current.x = targetPos.current.x;
      currentPos.current.y = targetPos.current.y;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentPos.current.x - 2}px, ${currentPos.current.y - 2}px, 0)`;
      }

      isAnimating.current = false;
    }
  }, [lerp, LERP_FACTOR, THRESHOLD]);

  useEffect(() => {
    if (!position || position.x == null || position.y == null) {
      return;
    }

    // Update target position
    targetPos.current = { x: position.x, y: position.y };

    // Initialize current position on first render
    if (currentPos.current.x === 0 && currentPos.current.y === 0) {
      currentPos.current = { x: position.x, y: position.y };
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${position.x - 2}px, ${position.y - 2}px, 0)`;
      }
    }

    // Start animation loop if not already running
    if (!isAnimating.current) {
      isAnimating.current = true;
      rafId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [position, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  if (!position || position.x == null || position.y == null) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="host-cursor"
      style={{
        transform: `translate3d(${position.x - 2}px, ${position.y - 2}px, 0)`,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cursor pointer shape */}
        <path
          d="M5.5 3.5L5.5 16.5L9 13L12 20L14 19L11 12L16.5 12L5.5 3.5Z"
          fill="#FF6B6B"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="host-cursor-label">Host</div>
    </div>
  );
};
