import React from 'react';
import './HostCursor.css';

/**
 * HostCursor - Displays the host's cursor position for viewers
 */
export const HostCursor = ({ position }) => {
  if (!position || position.x == null || position.y == null) {
    return null;
  }

  return (
    <div
      className="host-cursor"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
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
