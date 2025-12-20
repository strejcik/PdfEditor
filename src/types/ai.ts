/**
 * AI Integration Type Definitions
 * Types for Claude AI integration including credentials, responses, and payloads
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_FONT_SIZE,
} from '../config/constants';

// Re-export for convenience in AI modules
export { CANVAS_WIDTH, CANVAS_HEIGHT, DEFAULT_FONT_SIZE };

// ============================================================================
// Credentials Types
// ============================================================================

export interface AICredentials {
  encryptedKey: string;      // Base64 encoded encrypted API key
  salt: string;              // Base64 encoded salt for PBKDF2
  iv: string;                // Base64 encoded IV for AES-GCM
}

export type AIConnectionStatus = 'disconnected' | 'unlocked' | 'error';

// ============================================================================
// Claude Response Types
// ============================================================================

export interface ClaudeResponse {
  textItems?: TextItemPayload[];
  shapes?: ShapeItemPayload[];
  formFields?: FormFieldItemPayload[];
  imageItems?: ImageItemPayload[];
}

// ============================================================================
// Payload Types (what Claude returns - normalized coordinates)
// ============================================================================

export interface TextItemPayload {
  text: string;
  xNorm: number;           // 0-1 normalized X position
  yNormTop: number;        // 0-1 normalized Y position
  fontSize: number;
  color?: string;
  fontFamily?: string;
}

export interface ShapeItemPayload {
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'diamond';
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string | null;
}

export interface FormFieldItemPayload {
  type: 'textInput' | 'checkbox' | 'radio' | 'dropdown';
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
  fieldName: string;
  label?: string;           // Label text to display above/beside the field
  placeholder?: string;
  required?: boolean;
  options?: string[];       // For radio/dropdown
  groupName?: string;       // For radio buttons
  defaultValue?: string;
}

export interface ImageItemPayload {
  description: string;      // Claude describes what image should go here
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
}

// ============================================================================
// Utility Functions for Coordinate Conversion
// ============================================================================

/**
 * Convert normalized coordinates to pixel coordinates
 */
export function normalizedToPixel(
  xNorm: number,
  yNormTop: number,
  widthNorm?: number,
  heightNorm?: number,
  pageIndex: number = 0
): {
  x: number;
  y: number;
  xNorm: number;
  yNormTop: number;
  width?: number;
  height?: number;
  widthNorm?: number;
  heightNorm?: number;
  index: number;
} {
  const result: any = {
    x: xNorm * CANVAS_WIDTH,
    y: yNormTop * CANVAS_HEIGHT,
    xNorm,
    yNormTop,
    index: pageIndex,
  };

  if (widthNorm !== undefined) {
    result.width = widthNorm * CANVAS_WIDTH;
    result.widthNorm = widthNorm;
  }

  if (heightNorm !== undefined) {
    result.height = heightNorm * CANVAS_HEIGHT;
    result.heightNorm = heightNorm;
  }

  return result;
}
