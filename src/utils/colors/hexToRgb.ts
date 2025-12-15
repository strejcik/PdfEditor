import { rgb } from "pdf-lib";

/**
 * Convert hex color to RGB object for pdf-lib
 * @param hex - Hex color string (e.g., "#ffffff" or "fff")
 * @returns RGB object in 0-1 range for pdf-lib
 */
export function hexToRgb(hex: string) {
  if (!hex || typeof hex !== "string") {
    return rgb(0, 0, 0); // default to black
  }

  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  let r: number, g: number, b: number;
  if (hex.length === 3) {
    // Short form (e.g., #fff)
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    // Full form (e.g., #ffffff)
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return rgb(0, 0, 0); // default to black
  }

  // Convert to 0-1 range for pdf-lib
  return rgb(r / 255, g / 255, b / 255);
}
