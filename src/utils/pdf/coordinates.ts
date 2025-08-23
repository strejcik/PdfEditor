// src/utils/pdf/coordinates.ts

export type Point = { x: number; y: number };
export type TextItemLike = { x: number; y: number; fontSize?: number; [k: string]: any };
export type ImageItemLike = { x: number; y: number; width: number; height: number; [k: string]: any };

type TextAnchor = "top-left" | "baseline";

/**
 * Canvas (origin top-left) -> PDF (origin bottom-left)
 * pageHeight is the PDF page height in pixels/points.
 */
export function toPdfCoords(xCanvas: number, yCanvas: number, pageHeight: number): Point {
  return { x: xCanvas, y: pageHeight - yCanvas };
}

/**
 * For text, you may want baseline anchoring (PDF draws text on baseline).
 * If anchor="top-left", we subtract fontSize to approximate baseline.
 */
export function toPdfTextCoords(
  xCanvas: number,
  yCanvas: number,
  pageHeight: number,
  fontSize = 16,
  anchor: TextAnchor = "top-left"
): Point {
  const base = toPdfCoords(xCanvas, yCanvas, pageHeight);
  if (anchor === "top-left") {
    return { x: base.x, y: base.y - fontSize };
  }
  // "baseline" assumes yCanvas was already the baseline in canvas space
  return base;
}

/** Convert an array of text items to include xPdf/yPdf */
export function mapTextItemsToPdf<T extends TextItemLike>(
  items: T[],
  pageHeight: number,
  opts?: { defaultFontSize?: number; anchor?: TextAnchor }
): (T & { xPdf: number; yPdf: number })[] {
  const { defaultFontSize = 16, anchor = "top-left" } = opts || {};
  return (items || []).map(item => {
    const pt = toPdfTextCoords(item.x, item.y, pageHeight, item.fontSize ?? defaultFontSize, anchor);
    return { ...item, xPdf: pt.x, yPdf: pt.y };
  });
}

/**
 * For images (rectangles), convert top-left canvas coords to bottom-left PDF coords.
 * You must subtract the image height in PDF space.
 */
export function toPdfImageRect(
  xCanvas: number,
  yCanvas: number,
  width: number,
  height: number,
  pageHeight: number
): { x: number; y: number; width: number; height: number } {
  const { x, y } = toPdfCoords(xCanvas, yCanvas, pageHeight);
  return { x, y: y - height, width, height };
}

export function mapImageItemsToPdf<T extends ImageItemLike>(
  items: T[],
  pageHeight: number
): (T & { xPdf: number; yPdf: number })[] {
  return (items || []).map(item => {
    const r = toPdfImageRect(item.x, item.y, item.width, item.height, pageHeight);
    return { ...item, xPdf: r.x, yPdf: r.y };
  });
}


// 👇 NEW: PDF -> Canvas (inverse)
export function fromPdfCoords(xPdf: number, yPdf: number, pageHeight: number): Point {
    console.log({ x: xPdf, y: pageHeight - yPdf });
  return { x: xPdf, y: Number(pageHeight - yPdf) };
}