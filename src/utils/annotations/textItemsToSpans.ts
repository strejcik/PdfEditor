import type { TextSpan } from "../../types/annotations";
import type { TextItem } from "../../types/editor";

/**
 * Convert textItems to TextSpan format for annotation selection.
 * This allows client-side annotation creation without backend PDF processing.
 *
 * @param textItems - Array of TextItem objects from the editor
 * @param canvasWidth - Canvas width in pixels (for calculating dimensions if needed)
 * @param canvasHeight - Canvas height in pixels (for calculating dimensions if needed)
 * @param ctx - Optional canvas context for accurate text measurement
 * @returns Array of TextSpan objects suitable for annotation selection
 */
export function textItemsToSpans(
  textItems: TextItem[],
  canvasWidth: number,
  canvasHeight: number,
  ctx?: CanvasRenderingContext2D | null
): TextSpan[] {
  if (!textItems || textItems.length === 0) {
    return [];
  }

  return textItems.map((item) => {
    // Use existing dimensions if available
    let widthNorm = item.widthNorm;
    let heightNorm = item.heightNorm;
    let ascentRatio = item.ascentRatio;
    let descentRatio = item.descentRatio;

    const fontSize = item.fontSize || 16;
    const fontFamily = item.fontFamily || "Lato";

    // If dimensions are not available, calculate them
    if (widthNorm === undefined || heightNorm === undefined) {
      if (ctx) {
        // Use canvas context for accurate measurement
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(item.text || "");

        const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8;
        const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2;
        const textHeight = ascent + descent;

        // Use actual visual bounding box
        const bboxLeft = metrics.actualBoundingBoxLeft || 0;
        const bboxRight = metrics.actualBoundingBoxRight || metrics.width;
        const textWidth = bboxLeft + bboxRight;

        widthNorm = widthNorm ?? textWidth / canvasWidth;
        heightNorm = heightNorm ?? textHeight / canvasHeight;
        ascentRatio = ascentRatio ?? ascent / textHeight;
        descentRatio = descentRatio ?? descent / textHeight;
      } else {
        // Fallback: estimate dimensions without canvas context
        // Average character width ~= 0.5 * fontSize
        const estimatedWidth = (item.text?.length || 1) * fontSize * 0.5;
        const estimatedHeight = fontSize * 1.2; // Include line height

        widthNorm = widthNorm ?? estimatedWidth / canvasWidth;
        heightNorm = heightNorm ?? estimatedHeight / canvasHeight;
        ascentRatio = ascentRatio ?? 0.8;
        descentRatio = descentRatio ?? 0.2;
      }
    }

    // Store text origin position - canvas will adjust for visual rendering
    const span: TextSpan = {
      text: item.text || "",
      xNorm: item.xNorm,  // Text origin (canvas adjusts by -bboxLeft for visual)
      yNormTop: item.yNormTop,
      widthNorm: widthNorm || 0.1,
      heightNorm: heightNorm || 0.02,
      fontSize: fontSize,
      index: item.index,
    };

    // Include font metrics if available
    if (ascentRatio !== undefined) {
      span.ascentRatio = ascentRatio;
    }
    if (descentRatio !== undefined) {
      span.descentRatio = descentRatio;
    }

    return span;
  });
}

/**
 * Get text spans for a specific page, either from pdfTextSpans or generated from textItems.
 * This is the main entry point for getting annotatable text spans.
 *
 * @param pdfTextSpans - TextSpans extracted from backend (if available)
 * @param textItems - TextItems from the editor
 * @param pageIndex - Page index to filter by
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param ctx - Optional canvas context for accurate measurement
 * @returns Array of TextSpan objects for the specified page
 */
export function getAnnotatableTextSpans(
  pdfTextSpans: TextSpan[],
  textItems: TextItem[],
  pageIndex: number,
  canvasWidth: number,
  canvasHeight: number,
  ctx?: CanvasRenderingContext2D | null
): TextSpan[] {
  // Filter pdfTextSpans for this page
  const pageSpans = pdfTextSpans.filter((span) => span.index === pageIndex);

  // If we have pdfTextSpans for this page, use them
  if (pageSpans.length > 0) {
    return pageSpans;
  }

  // Otherwise, generate spans from textItems
  const pageTextItems = textItems.filter((item) => item.index === pageIndex);
  return textItemsToSpans(pageTextItems, canvasWidth, canvasHeight, ctx);
}

/**
 * Merge pdfTextSpans with textItem-generated spans.
 * Useful when you want both backend-extracted spans AND client-side text.
 *
 * @param pdfTextSpans - TextSpans extracted from backend
 * @param textItems - TextItems from the editor (may include new client-side text)
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param ctx - Optional canvas context for accurate measurement
 * @returns Combined array of TextSpan objects
 */
export function mergeTextSpans(
  pdfTextSpans: TextSpan[],
  textItems: TextItem[],
  canvasWidth: number,
  canvasHeight: number,
  ctx?: CanvasRenderingContext2D | null
): TextSpan[] {
  // Generate spans from all textItems
  const generatedSpans = textItemsToSpans(textItems, canvasWidth, canvasHeight, ctx);

  // Create a set of existing span keys for deduplication
  // Key is based on position and text content
  const existingKeys = new Set<string>();
  pdfTextSpans.forEach((span) => {
    const key = `${span.index}-${span.xNorm.toFixed(4)}-${span.yNormTop.toFixed(4)}-${span.text}`;
    existingKeys.add(key);
  });

  // Add generated spans that don't overlap with existing ones
  const uniqueGeneratedSpans = generatedSpans.filter((span) => {
    const key = `${span.index}-${span.xNorm.toFixed(4)}-${span.yNormTop.toFixed(4)}-${span.text}`;
    return !existingKeys.has(key);
  });

  return [...pdfTextSpans, ...uniqueGeneratedSpans];
}
