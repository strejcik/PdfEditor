/**
 * Hit detection utilities for annotations
 * Used to detect clicks on annotations and text spans
 */

/**
 * Get the actual coordinates for a span, accounting for linked textItems
 * This mirrors the logic in drawAnnotations.js getSpanCoordinates
 *
 * @param {object} span - The annotation span
 * @param {object} linkedTextItem - The linked text item (if any)
 * @returns {object} Coordinates { xNorm, yNormTop, widthNorm, heightNorm }
 */
function getSpanCoordinatesForHit(span, linkedTextItem) {
  // If linked to a textItem and has relative offsets, calculate from textItem position
  if (linkedTextItem && span.relativeXNorm !== undefined && span.relativeYNorm !== undefined) {
    return {
      xNorm: linkedTextItem.xNorm + span.relativeXNorm,
      yNormTop: linkedTextItem.yNormTop + span.relativeYNorm,
      widthNorm: span.widthNorm,
      heightNorm: span.heightNorm,
    };
  }
  // Otherwise use absolute coordinates
  return {
    xNorm: span.xNorm,
    yNormTop: span.yNormTop,
    widthNorm: span.widthNorm,
    heightNorm: span.heightNorm,
  };
}

/**
 * Check if a point is inside an annotation's spans
 *
 * @param {object} annotation - The annotation item
 * @param {number} mouseX - Mouse X position in pixels
 * @param {number} mouseY - Mouse Y position in pixels
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {object} linkedTextItem - The linked text item (if any)
 * @returns {boolean} True if point is inside any span
 */
export function isPointInAnnotation(annotation, mouseX, mouseY, canvasWidth, canvasHeight, linkedTextItem = null) {
  if (!annotation || !annotation.spans) return false;

  for (const span of annotation.spans) {
    // Get coordinates accounting for linked textItem
    const coords = getSpanCoordinatesForHit(span, linkedTextItem);
    const x = coords.xNorm * canvasWidth;
    const y = coords.yNormTop * canvasHeight;
    const w = coords.widthNorm * canvasWidth;
    const h = coords.heightNorm * canvasHeight;

    // Check if point is inside this span (with small padding for easier clicking)
    const padding = 2;
    if (
      mouseX >= x - padding &&
      mouseX <= x + w + padding &&
      mouseY >= y - padding &&
      mouseY <= y + h + padding
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Find which annotation was clicked (returns the topmost one)
 *
 * @param {Array} annotationItems - Array of annotation items
 * @param {number} mouseX - Mouse X position in pixels
 * @param {number} mouseY - Mouse Y position in pixels
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} pageIndex - Current page index
 * @param {Array} textItems - Array of text items (for linked annotation position calculation)
 * @returns {number|null} Index of clicked annotation or null
 */
export function findClickedAnnotation(
  annotationItems,
  mouseX,
  mouseY,
  canvasWidth,
  canvasHeight,
  pageIndex,
  textItems = []
) {
  if (!annotationItems || annotationItems.length === 0) return null;

  // Check from last to first (topmost first)
  for (let i = annotationItems.length - 1; i >= 0; i--) {
    const annotation = annotationItems[i];
    if (annotation.index !== pageIndex) continue;

    // Find linked text item if annotation is linked
    let linkedTextItem = null;
    if (annotation.linkedTextItemId && textItems.length > 0) {
      linkedTextItem = textItems.find(t => t.id === annotation.linkedTextItemId) || null;
    }

    if (isPointInAnnotation(annotation, mouseX, mouseY, canvasWidth, canvasHeight, linkedTextItem)) {
      return i;
    }
  }

  return null;
}

/**
 * Check if an annotation intersects with a selection rectangle
 *
 * @param {object} annotation - The annotation item
 * @param {object} selectionRect - Selection rectangle { x, y, width, height }
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {boolean} True if any span intersects
 */
export function isAnnotationInSelectionRect(
  annotation,
  selectionRect,
  canvasWidth,
  canvasHeight
) {
  if (!annotation || !annotation.spans || !selectionRect) return false;

  for (const span of annotation.spans) {
    const x = span.xNorm * canvasWidth;
    const y = span.yNormTop * canvasHeight;
    const w = span.widthNorm * canvasWidth;
    const h = span.heightNorm * canvasHeight;

    // AABB intersection test
    const intersects =
      selectionRect.x < x + w &&
      selectionRect.x + selectionRect.width > x &&
      selectionRect.y < y + h &&
      selectionRect.y + selectionRect.height > y;

    if (intersects) return true;
  }

  return false;
}

/**
 * Check if a point is inside a text span
 *
 * @param {object} span - Text span with normalized coordinates
 * @param {number} mouseX - Mouse X position in pixels
 * @param {number} mouseY - Mouse Y position in pixels
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {boolean} True if point is inside the span
 */
export function isPointInTextSpan(span, mouseX, mouseY, canvasWidth, canvasHeight) {
  if (!span) return false;

  const x = span.xNorm * canvasWidth;
  const y = span.yNormTop * canvasHeight;
  const w = span.widthNorm * canvasWidth;
  const h = span.heightNorm * canvasHeight;

  return (
    mouseX >= x &&
    mouseX <= x + w &&
    mouseY >= y &&
    mouseY <= y + h
  );
}

/**
 * Find text spans that intersect with a selection rectangle
 *
 * @param {Array} pdfTextSpans - Array of text spans
 * @param {object} selectionRect - Selection rectangle { x, y, width, height }
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} pageIndex - Current page index
 * @returns {Array} Array of intersecting text spans
 */
export function findTextSpansInSelection(
  pdfTextSpans,
  selectionRect,
  canvasWidth,
  canvasHeight,
  pageIndex
) {
  if (!pdfTextSpans || pdfTextSpans.length === 0 || !selectionRect) {
    return [];
  }

  return pdfTextSpans.filter(span => {
    if (span.index !== pageIndex) return false;

    const x = span.xNorm * canvasWidth;
    const y = span.yNormTop * canvasHeight;
    const w = span.widthNorm * canvasWidth;
    const h = span.heightNorm * canvasHeight;

    // AABB intersection test
    return (
      selectionRect.x < x + w &&
      selectionRect.x + selectionRect.width > x &&
      selectionRect.y < y + h &&
      selectionRect.y + selectionRect.height > y
    );
  });
}

/**
 * Get bounding box that contains all spans of an annotation
 *
 * @param {object} annotation - The annotation item
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {object|null} Bounding box { x, y, width, height } or null
 */
export function getAnnotationBoundingBox(annotation, canvasWidth, canvasHeight) {
  if (!annotation || !annotation.spans || annotation.spans.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const span of annotation.spans) {
    const x = span.xNorm * canvasWidth;
    const y = span.yNormTop * canvasHeight;
    const w = span.widthNorm * canvasWidth;
    const h = span.heightNorm * canvasHeight;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
