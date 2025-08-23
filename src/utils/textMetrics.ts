let _measureCanvas;
let _measureCtx;

export function ensureMeasureCtx() {
  if (_measureCtx) return _measureCtx;
  _measureCanvas = document.createElement('canvas');
  _measureCtx = _measureCanvas.getContext('2d');
  return _measureCtx;
}

/**
 * Measure ascent/descent/width in CSS units for given text/font.
 * Requires the font to be loaded (document.fonts.ready).
 */
export function measureTextMetrics(text, sizePx, family = "Lato") {
  const ctx = ensureMeasureCtx();
  ctx.font = `${sizePx}px ${family}`;
  const m = ctx.measureText(text || "");
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : sizePx * 0.8;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : sizePx * 0.2;
  return { ascent, descent, width: m.width };
}