/**
 * Draw a single text item (used for z-index ordering)
 * Supports multi-line text with wrapping
 */
export function drawSingleTextItem(ctx, rect, item, globalIndex, state, config) {
  const { selectedTextIndexes, resolveTextLayout } = state;

  const L = resolveTextLayout(item, ctx, rect);

  // Bounding box is the actual text content area (NO padding)
  const boxX = Math.round(L.x);
  const boxY = Math.round(L.topY);
  const boxW = L.textWidth;
  const boxH = L.textHeight;

  // Draw selection highlight if selected
  if (selectedTextIndexes?.includes(globalIndex)) {
    ctx.strokeStyle = "rgba(30, 144, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
  }

  // Draw the text
  ctx.fillStyle = item.color;
  ctx.font = `${L.fontSize}px ${L.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const drawX = L.xOrigin !== undefined ? L.xOrigin : L.x;

  // Always use wrapped lines from layout (handles both single and multi-line)
  if (L.lines && L.lines.length > 0) {
    // Draw each line (works for both single and multi-line text)
    L.lines.forEach((line, lineIndex) => {
      const lineY = L.topY + L.ascent + (lineIndex * L.lineHeight);
      ctx.fillText(line, Math.round(drawX), Math.round(lineY));
    });
  } else {
    // Fallback for items without wrapping
    ctx.fillText(item.text || "", Math.round(drawX), Math.round(L.topY + L.ascent));
  }
}

/**
 * Draw all text items for a specific page (legacy function)
 */
export function drawTextItems(ctx, rect, pageIndex, state, config) {
  const { textItems, selectedTextIndexes, resolveTextLayout } = state;

  if (!textItems || textItems.length === 0) return;

  // Sort by z-index for proper layering
  const sortedItems = textItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.index === pageIndex)
    .sort((a, b) => (a.item.zIndex ?? 0) - (b.item.zIndex ?? 0));

  sortedItems.forEach(({ item, index: globalIndex }) => {
    drawSingleTextItem(ctx, rect, item, globalIndex, state, config);
  });
}