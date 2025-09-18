import { useImages } from '../../../../hooks/useImages';

export function drawImageItems(ctx, rect, pageIndex, state) {
  const { imageItems } = state;

  imageItems.forEach((item) => {
    if (item.index !== pageIndex) return;

    const hasNormPos  = (item.xNorm != null) && (item.yNormTop != null);
    const hasNormSize = (item.widthNorm != null) && (item.heightNorm != null);

    const x    = hasNormPos  ? Number(item.xNorm)    * rect.width  : (Number(item.x)      || 0);
    const yTop = hasNormPos  ? Number(item.yNormTop) * rect.height : (Number(item.y)      || 0);
    const w    = hasNormSize ? Number(item.widthNorm)  * rect.width  : (Number(item.width)  || 0);
    const h    = hasNormSize ? Number(item.heightNorm) * rect.height : (Number(item.height) || 0);

    const src = item.data || item.src;
    const imgEl = useImages.createImageElement(src); // keep your existing helper
    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) {
      if (imgEl) imgEl.onload = () => requestAnimationFrame(() => state.redraw?.(pageIndex));
      return;
    }

    ctx.drawImage(imgEl, Math.round(x), Math.round(yTop), Math.round(w), Math.round(h));

    const handleSize = 10;
    ctx.fillStyle = "dodgerblue";
    ctx.fillRect(
      Math.round(x + w - handleSize / 2),
      Math.round(yTop + h - handleSize / 2),
      handleSize,
      handleSize
    );

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x), Math.round(yTop), Math.round(w), Math.round(h));
  });
}
