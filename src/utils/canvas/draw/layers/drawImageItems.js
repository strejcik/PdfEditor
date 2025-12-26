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

/**
 * Draw a single image item
 * Exported for unified z-index rendering
 */
export function drawSingleImage(ctx, rect, item, globalIndex, state, config) {
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
    requestAnimationFrame(() => state.redraw?.(item.index));
  });

  if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) {
    // Image not ready yet - will redraw when onload fires
    return;
  }

  ctx.drawImage(imgEl, Math.round(x), Math.round(yTop), Math.round(w), Math.round(h));

  // Draw selection highlight if selected
  const isSelected = state.selectedImageIndex === globalIndex;
  if (isSelected) {
    drawImageSelectionHighlight(ctx, x, yTop, w, h, item.locked);
  }
}

/**
 * Draw selection highlight for an image with resize handles
 */
function drawImageSelectionHighlight(ctx, x, y, w, h, isLocked) {
  ctx.save();

  // Dashed blue selection border
  ctx.strokeStyle = "rgba(30, 144, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

  // Draw resize handles at all four corners (unless locked)
  if (!isLocked) {
    const handleSize = 8;
    ctx.fillStyle = "rgba(30, 144, 255, 0.8)";
    ctx.setLineDash([]);

    // Top-left
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(x + w - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(x - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}

export function drawImageItems(ctx, rect, pageIndex, state) {
  const { imageItems } = state;

  imageItems.forEach((item, globalIndex) => {
    if (item.index !== pageIndex) return;
    if (item.visible === false) return; // Respect visibility

    drawSingleImage(ctx, rect, item, globalIndex, state, {});
  });
}
