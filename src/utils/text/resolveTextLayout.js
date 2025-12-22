export function resolveTextLayout(item, ctx, rect) {
  const fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const m = ctx.measureText(item.text || "");
  const ascent  = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const textHeight = ascent + descent;

  // Use actual visual bounding box, not advance width
  // This correctly handles letters like "j" that extend left of origin
  // actualBoundingBoxLeft: distance from origin to leftmost pixel (positive = extends left)
  // actualBoundingBoxRight: distance from origin to rightmost pixel
  const bboxLeft = m.actualBoundingBoxLeft || 0;
  const bboxRight = m.actualBoundingBoxRight || m.width;
  const textWidth = bboxLeft + bboxRight;

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
    else if (anchor === "bottom")   topY = rawY - textHeight;
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
    textHeight,
    ascent,
    descent,
  };
}