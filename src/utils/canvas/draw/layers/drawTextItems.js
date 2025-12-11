



export function drawTextItems(ctx, rect, pageIndex, state /* {textItems, selectedTextIndexes} */) {

  const { textItems, selectedTextIndexes, resolveTextLayout } = state;

  textItems.forEach((item, globalIndex) => {
    if (item.index !== pageIndex) return;

    const L = resolveTextLayout(item, ctx, rect);
    const boxX = Math.round(L.x)    - L.padding;
    const boxY = Math.round(L.topY) - L.padding;
    const boxW = L.textWidth  + L.padding * 2;
    const boxH = L.textHeight + L.padding * 2;

    if (selectedTextIndexes?.includes(globalIndex)) {
      ctx.strokeStyle = "rgba(30, 144, 255, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

  const left   = Math.round(L.x - L.padding);
  const top    = Math.round(L.topY - L.padding);
  const right  = Math.round(L.x + L.textWidth + L.padding);
  const bottom = Math.round(L.topY + L.textHeight + L.padding);

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "dodgerblue";

  // Left (vertical) — existing
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
    // baseline draw (topY + textHeight)
    ctx.fillText(item.text || "", Math.round(L.x), Math.round(L.topY + L.textHeight));
  });
}