/**
 * Wrap text into lines that fit within maxWidth
 * Only used for user-created text, NOT for PDF-extracted text
 */
function wrapTextIntoLines(ctx, text, maxWidth) {
  if (!text || !maxWidth || maxWidth <= 0) {
    return [text || ""];
  }

  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

export function resolveTextLayout(item, ctx, rect) {
  let fontSize = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Check if this is PDF-extracted text with stored bounds or baseline
  const hasPdfBounds = (item.widthNorm != null) && (item.heightNorm != null);
  const hasPdfBaseline = item.yNormBaseline != null;
  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);
  const textContent = item.text || "";

  // Calculate PDF's target dimensions (for reference/debugging)
  const pdfTargetWidth = hasPdfBounds ? Number(item.widthNorm) * rect.width : null;
  const pdfTargetHeight = hasPdfBounds ? Number(item.heightNorm) * rect.height : null;

  // For PDF-extracted text: scale font to fit within PDF's bounding box
  // This prevents text overlap when browser font has different metrics than PDF font
  if (hasPdfBounds && textContent && pdfTargetWidth > 0) {
    // Measure text with original font size
    ctx.font = `${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(textContent);
    const measuredWidth = m.width;

    // If text is wider than target, scale down font size
    // Add small tolerance (2%) to avoid overly aggressive scaling
    if (measuredWidth > pdfTargetWidth * 1.02) {
      const scaleFactor = pdfTargetWidth / measuredWidth;
      // Don't scale below 50% of original size to maintain readability
      const minScale = 0.5;
      const adjustedScale = Math.max(scaleFactor, minScale);
      fontSize = fontSize * adjustedScale;
    }
  }

  // Set final font for all measurements
  ctx.font = `${fontSize}px ${fontFamily}`;

  // For PDF text: DON'T re-wrap - use text as-is (PDF already has correct line breaks)
  // For user text: wrap if maxWidth is set
  const maxWidth = item.maxWidth;

  let lines;
  if (hasPdfBounds || hasPdfBaseline) {
    // PDF text: preserve original line breaks, don't re-wrap
    lines = [textContent];
  } else if (maxWidth && maxWidth > 0) {
    // User-created text with maxWidth: wrap it
    lines = wrapTextIntoLines(ctx, textContent, maxWidth);
  } else {
    // Single line
    lines = [textContent];
  }

  // Calculate line height (1.2x font size for comfortable reading)
  const lineHeight = fontSize * 1.2;

  // Measure the first line for baseline metrics
  const firstLineText = lines[0] || "";
  const m = ctx.measureText(firstLineText);
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2;
  const singleLineHeight = ascent + descent;

  // Total height for all lines
  const totalTextHeight = lines.length > 1
    ? singleLineHeight + (lines.length - 1) * lineHeight
    : singleLineHeight;

  // Calculate max width across all lines
  let maxLineWidth = 0;
  for (const line of lines) {
    const lineMetrics = ctx.measureText(line);
    const bboxLeft = lineMetrics.actualBoundingBoxLeft || 0;
    const bboxRight = lineMetrics.actualBoundingBoxRight || lineMetrics.width;
    const lineWidth = bboxLeft + bboxRight;
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }
  }

  // Use actual visual bounding box for the first line
  const bboxLeft = m.actualBoundingBoxLeft || 0;
  const textWidth = maxLineWidth;

  // X offset: shift left by bboxLeft to account for glyphs extending left of origin
  const xOffset = bboxLeft;

  const xOrigin = hasNorm ? Number(item.xNorm) * rect.width : (Number(item.x) || 0);

  // Actual visual x position (accounts for left-extending glyphs like "j")
  const x = xOrigin - xOffset;

  // Calculate baseline Y position
  // If PDF provides exact baseline position, use it directly (most accurate)
  // Otherwise calculate from top position + ascent
  let baselineY = null;
  let topY;

  if (hasPdfBaseline) {
    // PDF-extracted text: use exact baseline position from PDF
    baselineY = Number(item.yNormBaseline) * rect.height;
    // Calculate topY from baseline for bounding box
    topY = baselineY - ascent;
  } else if (hasNorm) {
    topY = Number(item.yNormTop) * rect.height;
  } else {
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "baseline";
    if (anchor === "baseline") {
      baselineY = rawY;
      topY = rawY - ascent;
    } else if (anchor === "bottom") {
      topY = rawY - totalTextHeight;
    } else {
      topY = rawY; // already top
    }
  }

  return {
    x,
    xOrigin,    // Original x position (where text is drawn from)
    xOffset,    // How much glyph extends left of origin
    topY,
    baselineY,  // Exact baseline Y position (null if not available)
    fontSize,
    fontFamily,
    padding,
    textWidth,
    textHeight: totalTextHeight,
    ascent,
    descent,
    // Multi-line support
    lines,
    lineHeight,
    isMultiLine: lines.length > 1,
    // PDF bounds info (for reference)
    hasPdfBounds,
    hasPdfBaseline,
    pdfTargetWidth,
    pdfTargetHeight,
  };
}