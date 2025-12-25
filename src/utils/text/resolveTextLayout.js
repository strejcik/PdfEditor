/**
 * Wrap text into lines that fit within maxWidth
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
  const fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  // Check if text needs to be wrapped using item.maxWidth
  const maxWidth = item.maxWidth;

  const lines = maxWidth && maxWidth > 0 ? wrapTextIntoLines(ctx, item.text, maxWidth) : [item.text || ""];

  // Calculate line height (1.2x font size for comfortable reading)
  const lineHeight = fontSize * 1.2;

  // Measure the first line for baseline metrics
  const firstLineText = lines[0] || "";
  const m = ctx.measureText(firstLineText);
  const ascent  = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
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
  const bboxRight = m.actualBoundingBoxRight || m.width;
  const textWidth = maxLineWidth;

  // X offset: shift left by bboxLeft to account for glyphs extending left of origin
  const xOffset = bboxLeft;

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);
  const xOrigin = hasNorm ? Number(item.xNorm) * rect.width : (Number(item.x) || 0);

  // Actual visual x position (accounts for left-extending glyphs like "j")
  const x = xOrigin - xOffset;

  let topY;
  if (hasNorm) {
    topY = Number(item.yNormTop) * rect.height;
  } else {
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "baseline";
    if (anchor === "baseline")      topY = rawY - ascent;
    else if (anchor === "bottom")   topY = rawY - totalTextHeight;
    else                            topY = rawY; // already top
  }

  return {
    x,
    xOrigin,    // Original x position (where text is drawn from)
    xOffset,    // How much glyph extends left of origin
    topY,
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
  };
}