/**
 * Draw annotations on canvas
 * Annotations include: highlight, strikethrough, underline
 *
 * IMPORTANT: This function should be called BEFORE drawTextItems
 * so that highlights appear behind the text.
 *
 * Typography Reference:
 * - Baseline: ~80% from top of bounding box (where most letters sit)
 * - x-height: ~50% of em height (height of lowercase 'x')
 * - Ascender line: top of tall letters (b, d, h, l)
 * - Descender line: bottom of letters with tails (g, p, y)
 */

// Typographic constants for professional annotation positioning
// All annotations are positioned WITHIN the text bounding box
const TYPO = {
  // Highlight: covers the full text bounding box exactly (no padding)
  HIGHLIGHT_HORIZONTAL_PAD: 0, // No horizontal padding - exact bounding box

  // Underline: positioned at the very bottom of the bounding box
  UNDERLINE_POSITION: 0.98, // 98% from top (near bottom of bounding box)
  UNDERLINE_THICKNESS_RATIO: 0.06, // Line thickness as ratio of height
  UNDERLINE_MIN_THICKNESS: 1, // Minimum 1px thickness

  // Strikethrough: positioned at exact vertical center of bounding box
  STRIKETHROUGH_POSITION: 0.50, // Exactly 50% from top (visual center)
  STRIKETHROUGH_THICKNESS_RATIO: 0.06, // Line thickness as ratio of height
  STRIKETHROUGH_MIN_THICKNESS: 1, // Minimum 1px thickness
};


/**
 * Convert hex color to rgba string
 * @param {string} hex - Hex color (e.g., "#FFFF00")
 * @param {number} alpha - Opacity (0-1)
 * @returns {string} RGBA color string
 */
function hexToRgba(hex, alpha) {
  // Handle invalid hex
  if (!hex || typeof hex !== 'string') {
    return `rgba(255, 255, 0, ${alpha})`; // Default yellow
  }

  // Remove # if present
  hex = hex.replace('#', '');

  // Handle short hex (#FFF -> #FFFFFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculate visual text metrics for a span
 * This matches how text items calculate their visual bounding box
 * MUST match resolveTextLayoutForHit logic for consistent positioning
 */
function getSpanVisualMetrics(ctx, span, rect) {
  let fontSize = span.fontSize || 16;
  const fontFamily = "Lato"; // Default font used for rendering
  const text = span.text || "";

  // Check if this is PDF-extracted text with bounds/baseline
  const hasPdfBounds = span.widthNorm != null && span.heightNorm != null;
  const hasPdfBaseline = span.yNormBaseline != null;

  // Set font to measure text accurately
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // For PDF-extracted text: scale font to fit within PDF's bounding box
  // MUST match resolveTextLayout exactly for consistent positioning
  if (hasPdfBounds && text) {
    const targetWidth = span.widthNorm * rect.width;
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

  // Get actual bounding box metrics
  const bboxLeft = m.actualBoundingBoxLeft || 0;
  const bboxRight = m.actualBoundingBoxRight || m.width;
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2;

  // Calculate visual width (actual rendered width)
  const visualWidth = bboxLeft + bboxRight;
  const visualHeight = ascent + descent;

  ctx.restore();

  // xOrigin is where fillText would be called (from normalized coords)
  const xOrigin = span.xNorm * rect.width;
  // Visual left edge accounts for glyphs extending left of origin
  const visualX = xOrigin - bboxLeft;

  // Calculate y position - MUST match resolveTextLayoutForHit exactly
  // If PDF provides exact baseline position, use it to calculate topY
  let y;
  if (hasPdfBaseline) {
    // PDF-extracted text: calculate topY from baseline position
    const baselineY = span.yNormBaseline * rect.height;
    y = baselineY - ascent;
  } else if (span.yNormTop != null) {
    // User-created text or span with normalized coords
    y = span.yNormTop * rect.height;
  } else {
    y = 0;
  }

  return {
    x: visualX,           // Visual left edge (matches text bounding box)
    y: y,
    width: visualWidth,   // Visual width
    height: visualHeight, // Visual height
    xOrigin: xOrigin,     // Where text is drawn from
    bboxLeft: bboxLeft,   // How far left of origin glyphs extend
  };
}

/**
 * Find a text item by ID
 */
function findTextItemById(textItems, id) {
  if (!textItems || !id) return null;
  return textItems.find(item => item.id === id) || null;
}

/**
 * Get span coordinates, accounting for linked text items
 * If the annotation is linked to a text item, calculate position from
 * text item position + relative offsets
 */
function getSpanCoordinates(span, linkedTextItem) {
  if (linkedTextItem && span.relativeXNorm !== undefined && span.relativeYNorm !== undefined) {
    // Calculate absolute position from text item position + relative offset
    return {
      xNorm: linkedTextItem.xNorm + span.relativeXNorm,
      yNormTop: linkedTextItem.yNormTop + span.relativeYNorm,
      widthNorm: span.widthNorm,
      heightNorm: span.heightNorm,
      text: span.text,
      fontSize: span.fontSize,
    };
  }
  // Use absolute coordinates
  return span;
}

/**
 * Draw a single annotation item
 * Exported for unified z-index rendering
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {DOMRect} rect - Canvas bounding rect
 * @param {object} item - Annotation item
 * @param {number} globalIndex - Index in annotations array
 * @param {object} state - Editor state
 */
export function drawSingleAnnotation(ctx, rect, item, globalIndex, state) {
  const {
    selectedAnnotationIndex,
    selectedAnnotationIndexes = [],
    textItems = [],
  } = state;

  ctx.save();

  // Find linked text item if annotation is linked
  const linkedTextItem = item.linkedTextItemId
    ? findTextItemById(textItems, item.linkedTextItemId)
    : null;

  // Draw each span of the annotation
  (item.spans || []).forEach(span => {
    // Get span coordinates (adjusted for linked text item if applicable)
    const adjustedSpan = getSpanCoordinates(span, linkedTextItem);

    // Calculate visual metrics to match text rendering
    const metrics = getSpanVisualMetrics(ctx, adjustedSpan, rect);
    const x = metrics.x;
    const y = metrics.y;
    const w = metrics.width;
    const h = metrics.height;

    switch (item.type) {
      case 'highlight': {
        // Highlight: covers the full text bounding box with minimal horizontal padding
        const hlX = x - TYPO.HIGHLIGHT_HORIZONTAL_PAD;
        const hlY = y;
        const hlW = w + (TYPO.HIGHLIGHT_HORIZONTAL_PAD * 2);
        const hlH = h;

        ctx.fillStyle = hexToRgba(item.color, item.opacity || 0.4);
        const radius = Math.min(3, hlH * 0.15);
        ctx.beginPath();
        ctx.roundRect(hlX, hlY, hlW, hlH, radius);
        ctx.fill();
        break;
      }

      case 'strikethrough': {
        const strikeY = y + (h * TYPO.STRIKETHROUGH_POSITION);
        const lineWidth = Math.max(TYPO.STRIKETHROUGH_MIN_THICKNESS, h * TYPO.STRIKETHROUGH_THICKNESS_RATIO);

        ctx.strokeStyle = item.color || '#FF0000';
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = item.opacity || 1.0;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(x, strikeY);
        ctx.lineTo(x + w, strikeY);
        ctx.stroke();
        break;
      }

      case 'underline': {
        const underlineY = y + (h * TYPO.UNDERLINE_POSITION);
        const lineWidth = Math.max(TYPO.UNDERLINE_MIN_THICKNESS, h * TYPO.UNDERLINE_THICKNESS_RATIO);

        ctx.strokeStyle = item.color || '#0000FF';
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = item.opacity || 1.0;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + w, underlineY);
        ctx.stroke();
        break;
      }

      default:
        break;
    }
  });

  ctx.restore();

  // Draw selection highlight around the annotation
  const isSelected =
    globalIndex === selectedAnnotationIndex ||
    (selectedAnnotationIndexes && selectedAnnotationIndexes.includes(globalIndex));

  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = "rgba(30, 144, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Draw selection rectangle around all spans
    (item.spans || []).forEach(span => {
      const adjustedSpan = getSpanCoordinates(span, linkedTextItem);
      const metrics = getSpanVisualMetrics(ctx, adjustedSpan, rect);
      ctx.strokeRect(metrics.x, metrics.y, metrics.width, metrics.height);
    });

    // Show link indicator if annotation is linked
    if (item.linkedTextItemId && linkedTextItem) {
      ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
      ctx.font = "10px sans-serif";
      const firstSpan = item.spans[0];
      if (firstSpan) {
        const adjustedSpan = getSpanCoordinates(firstSpan, linkedTextItem);
        const metrics = getSpanVisualMetrics(ctx, adjustedSpan, rect);
        ctx.fillText("\u{1F517}", metrics.x - 12, metrics.y + 10);
      }
    }

    ctx.restore();
  }
}

/**
 * Draw all annotations for a specific page
 * MUST be called BEFORE drawTextItems for highlights to appear behind text
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {DOMRect} rect - Canvas bounding rect
 * @param {number} pageIndex - Current page index
 * @param {object} state - Editor state containing annotations and textItems
 */
export function drawAnnotations(ctx, rect, pageIndex, state) {
  const { annotationItems = [] } = state;

  if (!annotationItems || annotationItems.length === 0) return;

  annotationItems.forEach((item, globalIndex) => {
    // Only draw annotations for current page
    if (item.index !== pageIndex) return;
    // Respect visibility
    if (item.visible === false) return;

    drawSingleAnnotation(ctx, rect, item, globalIndex, state);
  });
}

/**
 * Draw text selection preview during annotation creation
 * Shows which text spans are currently selected
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {DOMRect} rect - Canvas bounding rect
 * @param {object} state - Editor state
 */
export function drawTextSelectionPreview(ctx, rect, state) {
  const {
    isSelectingText,
    selectedTextSpans = [],
    activeAnnotationTool,
    annotationColor,
    annotationOpacity,
    textSelectionStart,
    textSelectionEnd,
  } = state;

  if (!isSelectingText || !activeAnnotationTool) return;

  ctx.save();

  // Draw selection rectangle (dashed outline)
  if (textSelectionStart && textSelectionEnd) {
    const selX = Math.min(textSelectionStart.x, textSelectionEnd.x);
    const selY = Math.min(textSelectionStart.y, textSelectionEnd.y);
    const selW = Math.abs(textSelectionEnd.x - textSelectionStart.x);
    const selH = Math.abs(textSelectionEnd.y - textSelectionStart.y);

    ctx.strokeStyle = "rgba(30, 144, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(selX, selY, selW, selH);
  }

  // Draw preview of selected text spans
  if (selectedTextSpans.length > 0) {
    const previewOpacity = (annotationOpacity || 0.4) * 0.7; // Slightly more transparent for preview

    selectedTextSpans.forEach(span => {
      // Use visual metrics for accurate positioning
      const metrics = getSpanVisualMetrics(ctx, span, rect);
      const x = metrics.x;
      const y = metrics.y;
      const w = metrics.width;
      const h = metrics.height;

      // Draw preview based on annotation type using same typographic positioning
      if (activeAnnotationTool === 'highlight') {
        const hlX = x - TYPO.HIGHLIGHT_HORIZONTAL_PAD;
        const hlY = y;
        const hlW = w + (TYPO.HIGHLIGHT_HORIZONTAL_PAD * 2);
        const hlH = h;

        ctx.fillStyle = hexToRgba(annotationColor || '#FFFF00', previewOpacity);
        const radius = Math.min(3, hlH * 0.15);
        ctx.beginPath();
        ctx.roundRect(hlX, hlY, hlW, hlH, radius);
        ctx.fill();
      } else if (activeAnnotationTool === 'strikethrough') {
        // Strikethrough at exact vertical center
        const strikeY = y + (h * TYPO.STRIKETHROUGH_POSITION);
        const lineWidth = Math.max(TYPO.STRIKETHROUGH_MIN_THICKNESS, h * TYPO.STRIKETHROUGH_THICKNESS_RATIO);

        ctx.strokeStyle = annotationColor || '#FF0000';
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = previewOpacity;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(x, strikeY);
        ctx.lineTo(x + w, strikeY);
        ctx.stroke();
      } else if (activeAnnotationTool === 'underline') {
        // Underline positioned at bottom of bounding box
        const underlineY = y + (h * TYPO.UNDERLINE_POSITION);
        const lineWidth = Math.max(TYPO.UNDERLINE_MIN_THICKNESS, h * TYPO.UNDERLINE_THICKNESS_RATIO);

        ctx.strokeStyle = annotationColor || '#0000FF';
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = previewOpacity;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(x, underlineY);
        ctx.lineTo(x + w, underlineY);
        ctx.stroke();
      }
    });
  }

  ctx.restore();
}

/**
 * Draw PDF text spans (for debugging - normally hidden)
 * Useful for seeing what text can be annotated
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {DOMRect} rect - Canvas bounding rect
 * @param {number} pageIndex - Current page index
 * @param {object} state - Editor state
 */
export function drawPdfTextSpansDebug(ctx, rect, pageIndex, state) {
  const { pdfTextSpans = [], showTextSpanDebug } = state;

  if (!showTextSpanDebug || !pdfTextSpans || pdfTextSpans.length === 0) return;

  ctx.save();
  ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
  ctx.lineWidth = 1;

  pdfTextSpans.forEach(span => {
    if (span.index !== pageIndex) return;

    const x = span.xNorm * rect.width;
    const y = span.yNormTop * rect.height;
    const w = span.widthNorm * rect.width;
    const h = span.heightNorm * rect.height;

    ctx.strokeRect(x, y, w, h);
  });

  ctx.restore();
}
