



export function drawTextItems(ctx, rect, pageIndex, state /* {textItems, selectedTextIndexes} */) {

  const { textItems, selectedTextIndexes, resolveTextLayout } = state;

  textItems.forEach((item, globalIndex) => {
    if (item.index !== pageIndex) return;

    const L = resolveTextLayout(item, ctx, rect);

    // Bounding box is the actual text content area (NO padding)
    // This matches how annotation spans work
    const boxX = Math.round(L.x);
    const boxY = Math.round(L.topY);
    const boxW = L.textWidth;
    const boxH = L.textHeight;

    if (selectedTextIndexes?.includes(globalIndex)) {
      ctx.strokeStyle = "rgba(30, 144, 255, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

    // Guide lines at text content boundaries (no padding)
    const left   = Math.round(L.x);
    const top    = Math.round(L.topY);
    const right  = Math.round(L.x + L.textWidth);
    const bottom = Math.round(L.topY + L.textHeight);

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "dodgerblue";

    // Left (vertical)
    ctx.moveTo(left, 0);
    ctx.lineTo(left, rect.height);

    // Top (horizontal)
    ctx.moveTo(0, top);
    ctx.lineTo(rect.width, top);

    // Right (vertical)
    ctx.moveTo(right, 0);
    ctx.lineTo(right, rect.height);

    // Bottom (horizontal)
    ctx.moveTo(0, bottom);
    ctx.lineTo(rect.width, bottom);

    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = item.color;
    ctx.font = `${L.fontSize}px ${L.fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    // Draw text at origin point (not visual left edge)
    // L.xOrigin is where fillText expects the text to start
    // L.x is the visual left edge of the bounding box
    const drawX = L.xOrigin !== undefined ? L.xOrigin : L.x;
    ctx.fillText(item.text || "", Math.round(drawX), Math.round(L.topY + L.ascent));
  });
}