/**
 * Alignment Guides Utility
 * Calculates and manages visual alignment guides when dragging items
 */

export interface AlignmentLine {
  type: 'horizontal' | 'vertical';
  position: number; // Normalized position (0-1)
  label?: string; // Optional label (e.g., "center")
}

export interface ItemBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface AlignmentResult {
  snapX: number | null; // Snapped X position (null if no snap)
  snapY: number | null; // Snapped Y position (null if no snap)
  guides: AlignmentLine[]; // Lines to display
}

// Snap threshold in normalized coordinates (how close before snapping)
const SNAP_THRESHOLD = 0.015; // ~1.5% of canvas width/height

/**
 * Calculate bounds for a text item
 */
export function getTextItemBounds(
  item: { xNorm?: number; yNormTop?: number; x?: number; y?: number },
  canvasWidth: number,
  canvasHeight: number,
  textWidth: number,
  textHeight: number
): ItemBounds {
  const xNorm = item.xNorm ?? (item.x ?? 0) / canvasWidth;
  const yNorm = item.yNormTop ?? (item.y ?? 0) / canvasHeight;
  const widthNorm = textWidth / canvasWidth;
  const heightNorm = textHeight / canvasHeight;

  return {
    left: xNorm,
    right: xNorm + widthNorm,
    top: yNorm,
    bottom: yNorm + heightNorm,
    centerX: xNorm + widthNorm / 2,
    centerY: yNorm + heightNorm / 2,
  };
}

/**
 * Calculate bounds for a shape item
 */
export function getShapeItemBounds(
  item: { xNorm: number; yNormTop: number; widthNorm: number; heightNorm: number }
): ItemBounds {
  return {
    left: item.xNorm,
    right: item.xNorm + item.widthNorm,
    top: item.yNormTop,
    bottom: item.yNormTop + item.heightNorm,
    centerX: item.xNorm + item.widthNorm / 2,
    centerY: item.yNormTop + item.heightNorm / 2,
  };
}

/**
 * Calculate alignment guides for a dragging item
 */
export function calculateAlignmentGuides(
  draggingBounds: ItemBounds,
  otherItemBounds: ItemBounds[],
  canvasWidth: number,
  canvasHeight: number,
  snapEnabled: boolean = true
): AlignmentResult {
  const guides: AlignmentLine[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  // Canvas center lines
  const canvasCenterX = 0.5;
  const canvasCenterY = 0.5;

  // Check canvas center alignment
  if (Math.abs(draggingBounds.centerX - canvasCenterX) < SNAP_THRESHOLD) {
    guides.push({ type: 'vertical', position: canvasCenterX, label: 'center' });
    if (snapEnabled) {
      snapX = canvasCenterX - (draggingBounds.right - draggingBounds.left) / 2;
    }
  }

  if (Math.abs(draggingBounds.centerY - canvasCenterY) < SNAP_THRESHOLD) {
    guides.push({ type: 'horizontal', position: canvasCenterY, label: 'center' });
    if (snapEnabled) {
      snapY = canvasCenterY - (draggingBounds.bottom - draggingBounds.top) / 2;
    }
  }

  // Check alignment with other items
  for (const other of otherItemBounds) {
    // Vertical alignments (X-axis)
    // Left edge to left edge
    if (Math.abs(draggingBounds.left - other.left) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: other.left });
      if (snapEnabled && snapX === null) {
        snapX = other.left;
      }
    }
    // Right edge to right edge
    if (Math.abs(draggingBounds.right - other.right) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: other.right });
      if (snapEnabled && snapX === null) {
        snapX = other.right - (draggingBounds.right - draggingBounds.left);
      }
    }
    // Left edge to right edge
    if (Math.abs(draggingBounds.left - other.right) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: other.right });
      if (snapEnabled && snapX === null) {
        snapX = other.right;
      }
    }
    // Right edge to left edge
    if (Math.abs(draggingBounds.right - other.left) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: other.left });
      if (snapEnabled && snapX === null) {
        snapX = other.left - (draggingBounds.right - draggingBounds.left);
      }
    }
    // Center to center (vertical)
    if (Math.abs(draggingBounds.centerX - other.centerX) < SNAP_THRESHOLD) {
      guides.push({ type: 'vertical', position: other.centerX });
      if (snapEnabled && snapX === null) {
        snapX = other.centerX - (draggingBounds.right - draggingBounds.left) / 2;
      }
    }

    // Horizontal alignments (Y-axis)
    // Top edge to top edge
    if (Math.abs(draggingBounds.top - other.top) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: other.top });
      if (snapEnabled && snapY === null) {
        snapY = other.top;
      }
    }
    // Bottom edge to bottom edge
    if (Math.abs(draggingBounds.bottom - other.bottom) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: other.bottom });
      if (snapEnabled && snapY === null) {
        snapY = other.bottom - (draggingBounds.bottom - draggingBounds.top);
      }
    }
    // Top edge to bottom edge
    if (Math.abs(draggingBounds.top - other.bottom) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: other.bottom });
      if (snapEnabled && snapY === null) {
        snapY = other.bottom;
      }
    }
    // Bottom edge to top edge
    if (Math.abs(draggingBounds.bottom - other.top) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: other.top });
      if (snapEnabled && snapY === null) {
        snapY = other.top - (draggingBounds.bottom - draggingBounds.top);
      }
    }
    // Center to center (horizontal)
    if (Math.abs(draggingBounds.centerY - other.centerY) < SNAP_THRESHOLD) {
      guides.push({ type: 'horizontal', position: other.centerY });
      if (snapEnabled && snapY === null) {
        snapY = other.centerY - (draggingBounds.bottom - draggingBounds.top) / 2;
      }
    }
  }

  // Remove duplicate guides
  const uniqueGuides = guides.filter((guide, index, self) =>
    index === self.findIndex(g => g.type === guide.type && Math.abs(g.position - guide.position) < 0.001)
  );

  return {
    snapX,
    snapY,
    guides: uniqueGuides,
  };
}

/**
 * Draw alignment guides on the canvas
 */
export function drawAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  guides: AlignmentLine[],
  canvasWidth: number,
  canvasHeight: number
): void {
  if (guides.length === 0) return;

  ctx.save();

  // Style for alignment guides
  ctx.strokeStyle = '#f43f5e'; // Rose/pink color for visibility
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]); // Dashed line

  for (const guide of guides) {
    ctx.beginPath();

    if (guide.type === 'vertical') {
      const x = guide.position * canvasWidth;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
    } else {
      const y = guide.position * canvasHeight;
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
    }

    ctx.stroke();

    // Draw label if present
    if (guide.label) {
      ctx.setLineDash([]);
      ctx.fillStyle = '#f43f5e';
      ctx.font = '10px sans-serif';

      if (guide.type === 'vertical') {
        const x = guide.position * canvasWidth;
        ctx.fillText(guide.label, x + 4, 14);
      } else {
        const y = guide.position * canvasHeight;
        ctx.fillText(guide.label, 4, y - 4);
      }
      ctx.setLineDash([4, 4]);
    }
  }

  ctx.restore();
}
