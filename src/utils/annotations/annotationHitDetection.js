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
 * @returns {object} Coordinates { xNorm, yNormTop, widthNorm, heightNorm, yNormBaseline }
 */
function getSpanCoordinatesForHit(span, linkedTextItem) {
  // If linked to a textItem and has relative offsets, calculate from textItem position
  if (linkedTextItem && span.relativeXNorm !== undefined && span.relativeYNorm !== undefined) {
    return {
      xNorm: linkedTextItem.xNorm + span.relativeXNorm,
      yNormTop: linkedTextItem.yNormTop + span.relativeYNorm,
      yNormBaseline: linkedTextItem.yNormBaseline, // Preserve baseline if available
      widthNorm: span.widthNorm,
      heightNorm: span.heightNorm,
      fontSize: span.fontSize,
      text: span.text,
    };
  }
  // Otherwise use absolute coordinates
  return {
    xNorm: span.xNorm,
    yNormTop: span.yNormTop,
    yNormBaseline: span.yNormBaseline, // Preserve baseline if available
    widthNorm: span.widthNorm,
    heightNorm: span.heightNorm,
    fontSize: span.fontSize,
    text: span.text,
  };
}

/**
 * Calculate visual bounding box for a span
 * MUST match getSpanVisualMetrics in drawAnnotations.js for consistent hit detection
 *
 * @param {object} span - The span with normalized coordinates
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {CanvasRenderingContext2D} ctx - Canvas context for text measurement (optional)
 * @returns {object} Visual bounding box { x, y, w, h }
 */
function getSpanVisualBox(span, canvasWidth, canvasHeight, ctx = null) {
  let fontSize = span.fontSize || 16;
  const text = span.text || "";

  // Check if this is PDF-extracted text with bounds/baseline
  const hasPdfBounds = span.widthNorm != null && span.heightNorm != null;
  const hasPdfBaseline = span.yNormBaseline != null;

  // If we don't have a canvas context, use simple normalized coordinates
  if (!ctx) {
    const x = span.xNorm * canvasWidth;
    let y;
    if (hasPdfBaseline) {
      // Estimate topY from baseline (ascent is roughly 80% of fontSize)
      const estimatedAscent = fontSize * 0.8;
      const baselineY = span.yNormBaseline * canvasHeight;
      y = baselineY - estimatedAscent;
    } else {
      y = span.yNormTop * canvasHeight;
    }
    const w = span.widthNorm * canvasWidth;
    const h = span.heightNorm * canvasHeight;
    return { x, y, w, h };
  }

  // With canvas context, use accurate text measurement
  const fontFamily = "Lato";

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // For PDF-extracted text: scale font to fit within PDF's bounding box
  if (hasPdfBounds && text) {
    const targetWidth = span.widthNorm * canvasWidth;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const measuredWidth = ctx.measureText(text).width;
    if (measuredWidth > targetWidth * 1.02 && targetWidth > 0) {
      const scaleFactor = targetWidth / measuredWidth;
      const minScale = 0.5;
      const adjustedScale = Math.max(scaleFactor, minScale);
      fontSize = fontSize * adjustedScale;
    }
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  const m = ctx.measureText(text);

  const bboxLeft = m.actualBoundingBoxLeft || 0;
  const bboxRight = m.actualBoundingBoxRight || m.width;
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2;

  const visualWidth = bboxLeft + bboxRight;
  const visualHeight = ascent + descent;

  ctx.restore();

  const xOrigin = span.xNorm * canvasWidth;
  const x = xOrigin - bboxLeft;

  let y;
  if (hasPdfBaseline) {
    const baselineY = span.yNormBaseline * canvasHeight;
    y = baselineY - ascent;
  } else if (span.yNormTop != null) {
    y = span.yNormTop * canvasHeight;
  } else {
    y = 0;
  }

  return { x, y, w: visualWidth, h: visualHeight };
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
 * @param {CanvasRenderingContext2D} ctx - Canvas context for accurate measurement (optional)
 * @returns {boolean} True if point is inside any span
 */
export function isPointInAnnotation(annotation, mouseX, mouseY, canvasWidth, canvasHeight, linkedTextItem = null, ctx = null) {
  if (!annotation || !annotation.spans) return false;

  for (const span of annotation.spans) {
    // Get coordinates accounting for linked textItem
    const coords = getSpanCoordinatesForHit(span, linkedTextItem);
    // Use visual box for accurate hit detection
    const box = getSpanVisualBox(coords, canvasWidth, canvasHeight, ctx);

    // Check if point is inside this span (with small padding for easier clicking)
    const padding = 2;
    if (
      mouseX >= box.x - padding &&
      mouseX <= box.x + box.w + padding &&
      mouseY >= box.y - padding &&
      mouseY <= box.y + box.h + padding
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
 * @param {CanvasRenderingContext2D} ctx - Canvas context for accurate measurement (optional)
 * @returns {boolean} True if any span intersects
 */
export function isAnnotationInSelectionRect(
  annotation,
  selectionRect,
  canvasWidth,
  canvasHeight,
  ctx = null
) {
  if (!annotation || !annotation.spans || !selectionRect) return false;

  for (const span of annotation.spans) {
    // Use visual box for accurate intersection
    const box = getSpanVisualBox(span, canvasWidth, canvasHeight, ctx);

    // AABB intersection test
    const intersects =
      selectionRect.x < box.x + box.w &&
      selectionRect.x + selectionRect.width > box.x &&
      selectionRect.y < box.y + box.h &&
      selectionRect.y + selectionRect.height > box.y;

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
 * @param {CanvasRenderingContext2D} ctx - Canvas context for accurate measurement (optional)
 * @returns {boolean} True if point is inside the span
 */
export function isPointInTextSpan(span, mouseX, mouseY, canvasWidth, canvasHeight, ctx = null) {
  if (!span) return false;

  // Use visual box for accurate hit detection
  const box = getSpanVisualBox(span, canvasWidth, canvasHeight, ctx);

  return (
    mouseX >= box.x &&
    mouseX <= box.x + box.w &&
    mouseY >= box.y &&
    mouseY <= box.y + box.h
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
 * @param {CanvasRenderingContext2D} ctx - Canvas context for accurate measurement (optional)
 * @returns {Array} Array of intersecting text spans
 */
export function findTextSpansInSelection(
  pdfTextSpans,
  selectionRect,
  canvasWidth,
  canvasHeight,
  pageIndex,
  ctx = null
) {
  if (!pdfTextSpans || pdfTextSpans.length === 0 || !selectionRect) {
    return [];
  }

  return pdfTextSpans.filter(span => {
    if (span.index !== pageIndex) return false;

    // Use visual box for accurate intersection
    const box = getSpanVisualBox(span, canvasWidth, canvasHeight, ctx);

    // AABB intersection test
    return (
      selectionRect.x < box.x + box.w &&
      selectionRect.x + selectionRect.width > box.x &&
      selectionRect.y < box.y + box.h &&
      selectionRect.y + selectionRect.height > box.y
    );
  });
}

/**
 * Get bounding box that contains all spans of an annotation
 *
 * @param {object} annotation - The annotation item
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {CanvasRenderingContext2D} ctx - Canvas context for accurate measurement (optional)
 * @returns {object|null} Bounding box { x, y, width, height } or null
 */
export function getAnnotationBoundingBox(annotation, canvasWidth, canvasHeight, ctx = null) {
  if (!annotation || !annotation.spans || annotation.spans.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const span of annotation.spans) {
    // Use visual box for accurate bounding box
    const box = getSpanVisualBox(span, canvasWidth, canvasHeight, ctx);

    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.w);
    maxY = Math.max(maxY, box.y + box.h);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
