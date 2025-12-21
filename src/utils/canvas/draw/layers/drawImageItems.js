// Cache for Image elements to prevent recreating them on every draw
const imageCache = new Map();

/**
 * Get or create a cached Image element for the given source
 */
function getCachedImage(src, onLoad) {
  if (!src) return null;

  // Check if we already have this image cached
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  // Create new Image element and cache it
  const img = new Image();
  img.onload = onLoad;
  img.src = src;
  imageCache.set(src, img);

  return img;
}

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

    // Use cached image - only trigger redraw once when image first loads
    const imgEl = getCachedImage(src, () => {
      // Only redraw once when image loads for the first time
      requestAnimationFrame(() => state.redraw?.(pageIndex));
    });

    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) {
      // Image not ready yet - will redraw when onload fires
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
