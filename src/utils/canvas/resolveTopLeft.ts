/**
 * Converges on the same top-left canvas coordinates you draw with
 * Resolves the top-left position, normalized coordinates, and dimensions for an item
 */
export function resolveTopLeft(item: any, W: number, H: number) {
  const hasNorm = item.xNorm != null && item.yNormTop != null;

  const xTop = hasNorm ? Number(item.xNorm) * W : Number(item.x ?? 0);
  const yTop = hasNorm ? Number(item.yNormTop) * H : Number(item.y ?? 0);

  const xNorm = hasNorm ? Number(item.xNorm) : xTop / W;
  const yNormTop = hasNorm ? Number(item.yNormTop) : yTop / H;

  let w = item.width - item.padding;
  let h = item.height - item.padding;
  if (w == null && item.widthNorm  != null) w = Number(item.widthNorm)  * W;
  if (h == null && item.heightNorm != null) h = Number(item.heightNorm) * H;

  const wNorm = w != null ? (Number(w) / W) : (item.widthNorm ?? null);
  const hNorm = h != null ? (Number(h) / H) : (item.heightNorm ?? null);

  return { xTop, yTop, xNorm, yNormTop, w, h, wNorm, hNorm };
}
