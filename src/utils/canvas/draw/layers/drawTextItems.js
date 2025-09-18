



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

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "dodgerblue";
    ctx.moveTo(Math.round(L.x) - L.padding, 0);
    ctx.lineTo(Math.round(L.x) - L.padding, rect.height);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "black";
    ctx.font = `${L.fontSize}px ${L.fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    // baseline draw (topY + textHeight)
    ctx.fillText(item.text || "", Math.round(L.x), Math.round(L.topY + L.textHeight));
  });
}