import React, { useRef, useEffect, useCallback, useState } from 'react';
import './HostCursor.css';

/**
 * HostCursor - Displays the host's cursor position for viewers
 * Uses requestAnimationFrame interpolation for smooth cursor movement
 *
 * Position uses normalized coordinates (0-1) relative to canvas dimensions,
 * which are converted to viewport pixels based on the viewer's canvas size.
 * This ensures accurate cursor positioning regardless of window/browser size.
 */
export const HostCursor = ({ position }) => {
  const cursorRef = useRef(null);
  const currentPos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const isAnimating = useRef(false);
  const [canvasRect, setCanvasRect] = useState(null);
  const lastPageIndex = useRef(null);

  // Interpolation factor (0.3 = 30% of distance per frame, higher = faster)
  const LERP_FACTOR = 0.35;
  // Threshold to stop interpolation (in pixels)
  const THRESHOLD = 0.5;

  // Find and track the canvas element for the specified page
  const updateCanvasRect = useCallback(() => {
    if (position?.pageIndex == null) return;

    // Find canvas by data-page-index attribute
    let canvas = document.querySelector(`canvas[data-page-index="${position.pageIndex}"]`);

    // Fallback: try to find the active page canvas if data attribute not found
    if (!canvas) {
      const canvases = document.querySelectorAll('.main-content canvas');
      if (canvases.length > 0) {
        // Use the first visible canvas (usually the active page)
        canvas = canvases[0];
      }
    }

    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      setCanvasRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
  }, [position?.pageIndex]);

  // Track canvas position for accurate cursor placement
  useEffect(() => {
    updateCanvasRect();

    // Update on scroll and resize
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.addEventListener('scroll', updateCanvasRect);
    }
    window.addEventListener('resize', updateCanvasRect);

    // Also observe sidebar changes with MutationObserver
    const observer = new MutationObserver(updateCanvasRect);
    const sidebar = document.querySelector('.sidebar-panel');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      if (mainContent) {
        mainContent.removeEventListener('scroll', updateCanvasRect);
      }
      window.removeEventListener('resize', updateCanvasRect);
      observer.disconnect();
    };
  }, [updateCanvasRect]);

  // Update canvas rect when page changes
  useEffect(() => {
    if (position?.pageIndex !== lastPageIndex.current) {
      lastPageIndex.current = position?.pageIndex;
      updateCanvasRect();
    }
  }, [position?.pageIndex, updateCanvasRect]);

  const lerp = useCallback((start, end, factor) => {
    return start + (end - start) * factor;
  }, []);

  // Convert normalized coordinates to viewport position
  const getViewportPosition = useCallback((normalizedX, normalizedY) => {
    if (!canvasRect) {
      return { x: 0, y: 0 };
    }
    // Convert normalized (0-1) coordinates to viewport pixels
    // based on the viewer's canvas position and size
    return {
      x: canvasRect.left + (normalizedX * canvasRect.width),
      y: canvasRect.top + (normalizedY * canvasRect.height)
    };
  }, [canvasRect]);

  const animate = useCallback(() => {
    const dx = targetPos.current.x - currentPos.current.x;
    const dy = targetPos.current.y - currentPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > THRESHOLD) {
      // Interpolate towards target (using normalized coordinates)
      currentPos.current.x = lerp(currentPos.current.x, targetPos.current.x, LERP_FACTOR);
      currentPos.current.y = lerp(currentPos.current.y, targetPos.current.y, LERP_FACTOR);

      if (cursorRef.current) {
        const viewportPos = getViewportPosition(currentPos.current.x, currentPos.current.y);
        cursorRef.current.style.transform = `translate3d(${viewportPos.x - 2}px, ${viewportPos.y - 2}px, 0)`;
      }

      rafId.current = requestAnimationFrame(animate);
    } else {
      // Snap to target when close enough
      currentPos.current.x = targetPos.current.x;
      currentPos.current.y = targetPos.current.y;

      if (cursorRef.current) {
        const viewportPos = getViewportPosition(currentPos.current.x, currentPos.current.y);
        cursorRef.current.style.transform = `translate3d(${viewportPos.x - 2}px, ${viewportPos.y - 2}px, 0)`;
      }

      isAnimating.current = false;
    }
  }, [lerp, LERP_FACTOR, THRESHOLD, getViewportPosition]);

  useEffect(() => {
    if (!position || position.normalizedX == null || position.normalizedY == null) {
      return;
    }

    // Update target position (these are normalized coordinates)
    targetPos.current = { x: position.normalizedX, y: position.normalizedY };

    // Initialize current position on first render
    if (currentPos.current.x === 0 && currentPos.current.y === 0) {
      currentPos.current = { x: position.normalizedX, y: position.normalizedY };
      if (cursorRef.current) {
        const viewportPos = getViewportPosition(position.normalizedX, position.normalizedY);
        cursorRef.current.style.transform = `translate3d(${viewportPos.x - 2}px, ${viewportPos.y - 2}px, 0)`;
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
  }, [position, animate, getViewportPosition]);

  // Update cursor position when canvasRect changes (resize, scroll, sidebar toggle)
  useEffect(() => {
    if (cursorRef.current && currentPos.current) {
      const viewportPos = getViewportPosition(currentPos.current.x, currentPos.current.y);
      cursorRef.current.style.transform = `translate3d(${viewportPos.x - 2}px, ${viewportPos.y - 2}px, 0)`;
    }
  }, [canvasRect, getViewportPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  if (!position || position.normalizedX == null || position.normalizedY == null) {
    return null;
  }

  const initialViewportPos = getViewportPosition(position.normalizedX, position.normalizedY);

  return (
    <div
      ref={cursorRef}
      className="host-cursor"
      style={{
        transform: `translate3d(${initialViewportPos.x - 2}px, ${initialViewportPos.y - 2}px, 0)`,
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
