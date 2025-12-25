/**
 * Alignment Guides Hook
 * Manages visual alignment guides that appear when dragging items
 */

import { useState, useCallback } from 'react';
import type { AlignmentLine, ItemBounds, AlignmentResult } from '../utils/canvas/alignmentGuides';
import { calculateAlignmentGuides, getShapeItemBounds, getTextItemBounds } from '../utils/canvas/alignmentGuides';

export function useAlignmentGuides() {
  // Current alignment guides to display
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentLine[]>([]);

  // Whether snapping is enabled
  const [snapEnabled, setSnapEnabled] = useState(true);

  /**
   * Update alignment guides based on the current dragging item position
   * When snapEnabled is false, both snapping and guide lines are disabled
   */
  const updateGuides = useCallback((
    draggingBounds: ItemBounds,
    otherItemBounds: ItemBounds[],
    canvasWidth: number,
    canvasHeight: number
  ): AlignmentResult => {
    // When snap is disabled, don't calculate or display any guides
    if (!snapEnabled) {
      setAlignmentGuides([]);
      return { snapX: null, snapY: null, guides: [] };
    }

    const result = calculateAlignmentGuides(
      draggingBounds,
      otherItemBounds,
      canvasWidth,
      canvasHeight,
      snapEnabled
    );

    setAlignmentGuides(result.guides);
    return result;
  }, [snapEnabled]);

  /**
   * Clear all alignment guides
   */
  const clearGuides = useCallback(() => {
    setAlignmentGuides([]);
  }, []);

  /**
   * Toggle snap enabled
   */
  const toggleSnap = useCallback(() => {
    setSnapEnabled(prev => !prev);
  }, []);

  /**
   * Get bounds for all items on a page (for comparison during drag)
   * Excludes the currently dragging item
   */
  const getOtherItemBounds = useCallback((
    textItems: any[],
    shapeItems: any[],
    imageItems: any[],
    pageIndex: number,
    excludeTextIndex: number | null,
    excludeShapeIndex: number | null,
    excludeImageIndex: number | null,
    canvasWidth: number,
    canvasHeight: number,
    resolveTextLayout?: (item: any) => { width: number; height: number }
  ): ItemBounds[] => {
    const bounds: ItemBounds[] = [];

    // Add text item bounds
    textItems.forEach((item, i) => {
      if (item.index !== pageIndex) return;
      if (i === excludeTextIndex) return;

      const textSize = resolveTextLayout ? resolveTextLayout(item) : { width: 100, height: 20 };
      bounds.push(getTextItemBounds(item, canvasWidth, canvasHeight, textSize.width, textSize.height));
    });

    // Add shape item bounds
    shapeItems.forEach((item, i) => {
      if (item.index !== pageIndex) return;
      if (i === excludeShapeIndex) return;

      bounds.push(getShapeItemBounds(item));
    });

    // Add image item bounds
    imageItems.forEach((item, i) => {
      if (item.index !== pageIndex) return;
      if (i === excludeImageIndex) return;

      const xNorm = item.xNorm ?? (item.x ?? 0) / canvasWidth;
      const yNorm = item.yNormTop ?? (item.y ?? 0) / canvasHeight;
      const widthNorm = item.widthNorm ?? (item.width ?? 100) / canvasWidth;
      const heightNorm = item.heightNorm ?? (item.height ?? 100) / canvasHeight;

      bounds.push({
        left: xNorm,
        right: xNorm + widthNorm,
        top: yNorm,
        bottom: yNorm + heightNorm,
        centerX: xNorm + widthNorm / 2,
        centerY: yNorm + heightNorm / 2,
      });
    });

    return bounds;
  }, []);

  return {
    // State
    alignmentGuides,
    snapEnabled,

    // Actions
    updateGuides,
    clearGuides,
    toggleSnap,
    setSnapEnabled,
    getOtherItemBounds,
  };
}
