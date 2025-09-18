function pdfToCssMargins(rect, marginsPDF) {
  // scale PDF units → CSS px (respect current canvas rect)
  const sx = rect.width  / 595;
  const sy = rect.height / 842;
  return {
    left:   marginsPDF.left   * sx,
    right:  marginsPDF.right  * sx,
    top:    marginsPDF.top    * sy,
    bottom: marginsPDF.bottom * sy,
  };
}


// Convert a caret index → (x,y, line metrics)
function indexToXY(index, layout, preferredX = null, verticalDir = 0) {
  const { lines, lineHeight } = layout;
  if (lines.length === 0) return { x: 0, y: 0, line: null };

  // clamp index into total range
  const totalStart = lines[0].start;
  const totalEnd   = lines[lines.length - 1].end;
  const idx = Math.max(totalStart, Math.min(index, totalEnd));

  // find current line
  let li = lines.findIndex(L => idx >= L.start && idx <= L.end);
  if (li === -1) { // in between (shouldn't happen), default to closest
    li = (idx < lines[0].start) ? 0 : lines.length - 1;
  }
  let line = lines[li];

  // column within line
  const col = idx - line.start;
  let x;
  if (verticalDir !== 0 && preferredX != null) {
    x = preferredX; // keep preferred X when moving up/down
  } else {
    x = line.charX[col];
  }
  const y = line.y;

  return { x, y, line };
}

export function drawMultilinePage(ctx, r, pageIndex, state, config) {
const {activePage, layoutMultiline, setMlPreferredX, mlConfig, mlCaret, mlAnchor, mlText, isMultilineMode, mlCaretBlink, canvasRefs, mlPreferredX, isMlDragging} = {
    ...config,
    ...state
};
if (pageIndex !== activePage) return;

  const canvas = canvasRefs.current[activePage];
  const rect = canvas.getBoundingClientRect();

  // margins in CSS px
  const m = pdfToCssMargins(rect, mlConfig.marginsPDF);

  const x = m.left;
  const y = m.top;
  const maxWidth  = Math.max(0, rect.width  - (m.left + m.right));
  const maxHeight = Math.max(0, rect.height - (m.top  + m.bottom));

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.setLineDash([4,4]);
  ctx.strokeRect(x, y, maxWidth, maxHeight);
  ctx.restore();

  // layout
  ctx.font = `${mlConfig.fontSize}px ${mlConfig.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const layout = layoutMultiline(ctx, mlText, {
    x, y, maxWidth, maxHeight,
    fontSize: mlConfig.fontSize,
    fontFamily: mlConfig.fontFamily,
    lineGap: mlConfig.lineGap
  });

  // ---- Selection highlight ----
  const selA = Math.min(mlCaret, mlAnchor);
  const selB = Math.max(mlCaret, mlAnchor);
  const hasSelection = selB > selA;

  if (hasSelection) {
    ctx.save();
    ctx.fillStyle = "rgba(30,144,255,0.25)";
    for (const L of layout.lines) {
      const s = Math.max(selA, L.start);
      const e = Math.min(selB, L.end);
      if (e <= s) continue;

      const startCol = s - L.start;
      const endCol   = e - L.start;
      const startX = L.charX[startCol];
      const endX   = L.charX[endCol];

      const highlightX = Math.max(x, startX);
      const highlightW = Math.max(0, Math.min(x + maxWidth, endX) - highlightX);
      if (highlightW > 0) {
        ctx.fillRect(highlightX, L.y, highlightW, L.height);
      }
    }
    ctx.restore();
  }

  // ---- Draw text ----
  ctx.fillStyle = "black";
  for (const L of layout.lines) {
    ctx.fillText(L.text, L.x, L.y);
  }

  // ---- Draw caret (blink) ----
  if (isMultilineMode && !hasSelection && mlCaretBlink) {
    const { x: cx, y: cy, line } = indexToXY(mlCaret, layout);
    const caretTop = cy;
    const caretBottom = cy + (line ? line.height : layout.lineHeight);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, caretTop);
    ctx.lineTo(cx + 0.5, caretBottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.restore();
  }

  // Keep preferredX in sync with current caret column
  const { x: curX } = indexToXY(mlCaret, layout);
  if (mlPreferredX == null || !isMlDragging) {
    // store latest "natural" x so up/down can honor it
    setMlPreferredX(curX);
  }

  // Expose layout for hit-testing by other handlers if needed
  return layout;
}