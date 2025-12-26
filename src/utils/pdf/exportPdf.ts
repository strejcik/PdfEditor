import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadArrayBuffer } from "../files/loadArrayBuffer";
import { resolveTopLeft } from "../canvas/resolveTopLeft";
import { clipToPage, unclip } from "./clipping";
import { hexToRgb, hexToRgbValues } from "../colors/hexToRgb";
import { isSvgDataUri } from "../images/isSvgDataUri";
import { isJpegLike } from "../images/isJpegLike";
import { rasterizeSvgDataUriToPngBytes } from "../images/rasterizeSvgDataUriToPngBytes";

interface SaveAllPagesAsPDFParams {
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  activePage: number;
  pageList: any[];
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
  // Optional: pass current state directly to ensure fresh data (overrides pageList)
  textItems?: any[];
  annotationItems?: any[];
}

/**
 * Export all pages as a single PDF document with text and images
 */
export async function saveAllPagesAsPDF({
  canvasRefs,
  activePage,
  pageList,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  textItems: textItemsOverride,
  annotationItems: annotationItemsOverride,
}: SaveAllPagesAsPDFParams) {
  const canvas = canvasRefs.current[activePage];
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Canvas context not found");
  }

  // IMPORTANT: Use CANVAS_WIDTH/CANVAS_HEIGHT for all calculations, NOT canvas.getBoundingClientRect()
  // The CSS rect can differ from the actual canvas size due to scaling/DPI, causing misalignment
  const pdfWidth = CANVAS_WIDTH;
  const pdfHeight = CANVAS_HEIGHT;

  // Helper: wrap text into lines that fit within maxWidth (same as canvas)
  const wrapTextIntoLines = (text: string, maxWidth: number): string[] => {
    if (!text || !maxWidth || maxWidth <= 0) {
      return [text || ""];
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [""];
  };

  // Helper: resolve text draw position (x, topY) and metrics in PDF units
  // Uses CANVAS_WIDTH/CANVAS_HEIGHT to ensure consistency with resolveTopLeft
  // Now includes word wrapping support using item.maxWidth
  const resolveTextLayout = (item: any) => {
    const fontSize = Number(item.fontSize) || 16;
    const fontFamily = item.fontFamily || "Lato";
    const padding = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${fontSize}px ${fontFamily}`;

    // Check if text needs to be wrapped using item.maxWidth (same as canvas)
    const maxWidth = item.maxWidth;
    const lines = maxWidth && maxWidth > 0 ? wrapTextIntoLines(item.text || "", maxWidth) : [item.text || ""];

    // Calculate line height (1.2x font size for comfortable reading - same as canvas)
    const lineHeight = fontSize * 1.2;

    // Measure the first line for baseline metrics
    const firstLineText = lines[0] || "";
    const m = ctx.measureText(firstLineText);
    const ascent = m.actualBoundingBoxAscent;
    const descent = m.actualBoundingBoxDescent;
    const singleLineHeight = ascent + descent;

    // Total height for all lines (same as canvas)
    const totalTextHeight = lines.length > 1
      ? singleLineHeight + (lines.length - 1) * lineHeight
      : singleLineHeight;

    // Calculate max width across all lines
    let maxLineWidth = 0;
    for (const line of lines) {
      const lineMetrics = ctx.measureText(line);
      const bboxLeft = lineMetrics.actualBoundingBoxLeft || 0;
      const bboxRight = lineMetrics.actualBoundingBoxRight || lineMetrics.width;
      const lineWidth = bboxLeft + bboxRight;
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }
    }

    // Use actual visual bounding box for the first line
    const bboxLeft = m.actualBoundingBoxLeft || 0;
    const textWidth = maxLineWidth;

    // Prefer normalized; DO NOT CLAMP so we can go off-canvas (negative or >1)
    // Use pdfWidth/pdfHeight for consistent coordinate system
    const hasNorm = (item.xNorm != null) && (item.yNormTop != null);

    const xOrigin = hasNorm
      ? Number(item.xNorm) * pdfWidth
      : (Number(item.x) || 0);

    // Actual visual x position (accounts for left-extending glyphs like "j")
    const x = xOrigin - bboxLeft;

    let topY: number;
    if (hasNorm) {
      topY = Number(item.yNormTop) * pdfHeight;
    } else {
      // Legacy: item.y may be baseline; convert to top if needed
      const anchor = item.anchor || "baseline"; // "top" | "baseline" | "bottom"
      const rawY = Number(item.y) || 0;
      if (anchor === "baseline") topY = rawY - ascent;
      else if (anchor === "bottom") topY = rawY - totalTextHeight;
      else topY = rawY; // already top
    }

    return {
      x,
      xOrigin,   // Original x position (where text is drawn from)
      topY,
      fontSize,
      fontFamily,
      padding,
      textWidth,
      textHeight: totalTextHeight,
      ascent,
      descent,
      // Multi-line support
      lines,
      lineHeight,
      isMultiLine: lines.length > 1,
    };
  };

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit?.(fontkit);

  // Embed EXACT font (public assets are served from "/", not "/public")
  let pdfFont;
  try {
    const fontBytes = await loadArrayBuffer("/fonts/Lato-Regular.ttf");
    pdfFont = await pdfDoc.embedFont(fontBytes, { subset: true });
  } catch {
    pdfFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const manifest = {
    pageSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    pages: [] as any[],
  };

  const pageCount = Array.isArray(pageList) ? pageList.length : 0;

  for (let i = 0; i < pageCount; i++) {
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const pdfPage = pdfDoc.addPage([W, H]);

    const page = pageList[i] ?? {};

    // Use override state if provided (ensures fresh data), otherwise fall back to pageList
    // Filter by page index since override arrays contain all items with index property
    const textItems = textItemsOverride
      ? textItemsOverride.filter((item: any) => item.index === i)
      : (Array.isArray(page.textItems) ? page.textItems : []);
    const imageItems = Array.isArray(page.imageItems) ? page.imageItems : [];
    const shapes = Array.isArray(page.shapes) ? page.shapes : [];
    const formFieldsData = Array.isArray(page.formFields) ? page.formFields : [];

    const pageManifest = { texts: [] as any[], images: [] as any[], shapes: [] as any[], formFields: [] as any[], annotations: [] as any[], textSpans: [] as any[] };

    // **Clip to the page rectangle** so overflow matches canvas behavior
    clipToPage(pdfPage, W, H);

    // ---- Z-INDEX SORTING: Combine all drawable items and sort by z-index ----
    // This ensures items are drawn in the correct order (lower z-index first = background)
    type DrawableItem = {
      type: 'text' | 'image' | 'shape';
      item: any;
      zIndex: number;
    };

    const drawableItems: DrawableItem[] = [];

    // Add text items with z-index
    for (const item of textItems) {
      drawableItems.push({
        type: 'text',
        item,
        zIndex: item.zIndex ?? 10, // Default text z-index
      });
    }

    // Add image items with z-index
    for (const item of imageItems) {
      drawableItems.push({
        type: 'image',
        item,
        zIndex: item.zIndex ?? 5, // Default image z-index
      });
    }

    // Add shape items with z-index
    for (const item of shapes) {
      drawableItems.push({
        type: 'shape',
        item,
        zIndex: item.zIndex ?? 0, // Default shape z-index (background)
      });
    }

    // Sort by z-index ascending (lower z-index drawn first = behind)
    drawableItems.sort((a, b) => a.zIndex - b.zIndex);

    // ---- DRAW ALL ITEMS IN Z-INDEX ORDER ----
    for (const drawable of drawableItems) {
      if (drawable.type === 'text') {
        const item = drawable.item;
        // ---- TEXT DRAWING ----
        const L = resolveTextLayout(item);
        const text = String(item.text ?? "");
        if (!text) continue;

        const size = Number(item.fontSize) || 16;
        const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);

        // Draw each line separately (handles word wrapping same as canvas)
        if (L.lines && L.lines.length > 0) {
          for (let lineIndex = 0; lineIndex < L.lines.length; lineIndex++) {
            const line = L.lines[lineIndex];
            if (!line) continue;

            // Calculate Y position for this line (same as canvas: topY + ascent + lineIndex * lineHeight)
            // In PDF coordinates, Y is bottom-up, so we need to convert
            const canvasLineY = yTop + L.ascent + (lineIndex * L.lineHeight);
            const pdfLineY = H - canvasLineY;

            pdfPage.drawText(line, {
              x: xTop,
              y: pdfLineY,
              size,
              font: pdfFont,
              color: hexToRgb(item.color),
            });
          }
        } else {
          // Fallback for items without wrapping
          const baseline = H - yTop - L.textHeight;
          pdfPage.drawText(text, {
            x: xTop,
            y: baseline,
            size,
            font: pdfFont,
            color: hexToRgb(item.color),
          });
        }

        // Store actual measured text dimensions for accurate annotation positioning
        const textEntry = {
          text,
          xNorm: +xNorm.toFixed(6),
          yNormTop: +yNormTop.toFixed(6),
          widthNorm: +(L.textWidth / W).toFixed(6),
          heightNorm: +(L.textHeight / H).toFixed(6),
          ascentRatio: +(L.ascent / L.textHeight).toFixed(4),
          descentRatio: +(L.descent / L.textHeight).toFixed(4),
          fontSize: size,
          anchor: "top",
          index: item.index,
          color: item.color,
          zIndex: item.zIndex ?? 10,
          // Layer properties
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          ...(item.name && { name: item.name }),
          ...(item.id && { id: item.id }),
        };
        pageManifest.texts.push(textEntry);

        pageManifest.textSpans.push({
          text,
          xNorm: +xNorm.toFixed(6),
          yNormTop: +yNormTop.toFixed(6),
          widthNorm: +(L.textWidth / W).toFixed(6),
          heightNorm: +(L.textHeight / H).toFixed(6),
          fontSize: size,
          index: i,
          ascentRatio: +(L.ascent / L.textHeight).toFixed(4),
          descentRatio: +(L.descent / L.textHeight).toFixed(4),
        });

      } else if (drawable.type === 'image') {
        const item = drawable.item;
        // ---- IMAGE DRAWING ----
        const src = item.data || item.src;
        if (!src || typeof src !== "string") continue;

        const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);
        const drawW = Number(item.width) || Math.round((item.widthNorm ?? 0) * W);
        const drawH = Number(item.height) || Math.round((item.heightNorm ?? 0) * H);

        let pdfImage;
        try {
          if (isSvgDataUri(src)) {
            const pngBytesU8 = await rasterizeSvgDataUriToPngBytes(src, drawW || 1024, drawH || 768, "white");
            pdfImage = await pdfDoc.embedPng(pngBytesU8);
          } else {
            const bytes = await loadArrayBuffer(src);
            pdfImage = isJpegLike(src)
              ? await pdfDoc.embedJpg(bytes)
              : await pdfDoc.embedPng(bytes);
          }
        } catch (e) {
          console.warn("Image embed failed:", e);
          continue;
        }

        pdfPage.drawImage(pdfImage, {
          x: xTop,
          y: H - yTop - drawH,
          width: drawW,
          height: drawH,
        });

        pageManifest.images.push({
          index: item.index,
          width: drawW,
          height: drawH,
          xNorm: +xNorm.toFixed(6),
          yNormTop: +yNormTop.toFixed(6),
          widthNorm: +((drawW) / W).toFixed(6),
          heightNorm: +((drawH) / H).toFixed(6),
          zIndex: item.zIndex ?? 5,
          // Layer properties
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          ...(item.name && { name: item.name }),
          ref: src,
        });

      } else if (drawable.type === 'shape') {
        const item = drawable.item;
        // ---- SHAPE DRAWING ----
        const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);
        const drawW = Number(item.width) || Math.round((item.widthNorm ?? 0) * W);
        const drawH = Number(item.height) || Math.round((item.heightNorm ?? 0) * H);

        const strokeColor = hexToRgb(item.strokeColor || "#000000");
        const borderWidth = Number(item.strokeWidth) || 2;

        const hasFill = item.fillColor && item.fillColor !== 'transparent' && item.fillColor !== null;
        const fillColor = hasFill ? hexToRgb(item.fillColor) : undefined;

        if (item.type === "rectangle") {
          pdfPage.drawRectangle({
            x: xTop,
            y: H - yTop - drawH,
            width: drawW,
            height: drawH,
            borderColor: strokeColor,
            borderWidth: borderWidth,
            color: fillColor,
          });
        } else if (item.type === "circle") {
          pdfPage.drawEllipse({
            x: xTop + drawW / 2,
            y: H - yTop - drawH / 2,
            xScale: drawW / 2,
            yScale: drawH / 2,
            borderColor: strokeColor,
            borderWidth: borderWidth,
            color: fillColor,
          });
        } else if (item.type === "line") {
          pdfPage.drawLine({
            start: { x: xTop, y: H - yTop },
            end: { x: xTop + drawW, y: H - (yTop + drawH) },
            color: strokeColor,
            thickness: borderWidth,
          });
        } else if (item.type === "arrow") {
          const startX = xTop;
          const startY = H - yTop;
          const endX = xTop + drawW;
          const endY = H - (yTop + drawH);

          pdfPage.drawLine({
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            color: strokeColor,
            thickness: borderWidth,
          });

          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowSize = 15;
          const arrowAngle = Math.PI / 6;

          const x3 = endX - arrowSize * Math.cos(angle - arrowAngle);
          const y3 = endY - arrowSize * Math.sin(angle - arrowAngle);
          const x4 = endX - arrowSize * Math.cos(angle + arrowAngle);
          const y4 = endY - arrowSize * Math.sin(angle + arrowAngle);

          pdfPage.drawLine({
            start: { x: endX, y: endY },
            end: { x: x3, y: y3 },
            color: strokeColor,
            thickness: borderWidth,
          });
          pdfPage.drawLine({
            start: { x: endX, y: endY },
            end: { x: x4, y: y4 },
            color: strokeColor,
            thickness: borderWidth,
          });
        } else if (item.type === "triangle") {
          const topX = xTop + drawW / 2;
          const topY = H - yTop;
          const bottomLeftX = xTop;
          const bottomLeftY = H - yTop - drawH;
          const bottomRightX = xTop + drawW;
          const bottomRightY = H - yTop - drawH;

          if (hasFill) {
            const path = `M ${drawW / 2},0 L 0,${drawH} L ${drawW},${drawH} Z`;
            pdfPage.drawSvgPath(path, {
              x: xTop,
              y: H - yTop - drawH,
              color: fillColor,
            });
          }

          pdfPage.drawLine({ start: { x: topX, y: topY }, end: { x: bottomLeftX, y: bottomLeftY }, color: strokeColor, thickness: borderWidth });
          pdfPage.drawLine({ start: { x: bottomLeftX, y: bottomLeftY }, end: { x: bottomRightX, y: bottomRightY }, color: strokeColor, thickness: borderWidth });
          pdfPage.drawLine({ start: { x: bottomRightX, y: bottomRightY }, end: { x: topX, y: topY }, color: strokeColor, thickness: borderWidth });
        } else if (item.type === "diamond") {
          const topX = xTop + drawW / 2;
          const topY = H - yTop;
          const rightX = xTop + drawW;
          const rightY = H - yTop - drawH / 2;
          const bottomX = xTop + drawW / 2;
          const bottomY = H - yTop - drawH;
          const leftX = xTop;
          const leftY = H - yTop - drawH / 2;

          if (hasFill) {
            const path = `M ${drawW / 2},0 L ${drawW},${drawH / 2} L ${drawW / 2},${drawH} L 0,${drawH / 2} Z`;
            pdfPage.drawSvgPath(path, {
              x: xTop,
              y: H - yTop - drawH,
              color: fillColor,
            });
          }

          pdfPage.drawLine({ start: { x: topX, y: topY }, end: { x: rightX, y: rightY }, color: strokeColor, thickness: borderWidth });
          pdfPage.drawLine({ start: { x: rightX, y: rightY }, end: { x: bottomX, y: bottomY }, color: strokeColor, thickness: borderWidth });
          pdfPage.drawLine({ start: { x: bottomX, y: bottomY }, end: { x: leftX, y: leftY }, color: strokeColor, thickness: borderWidth });
          pdfPage.drawLine({ start: { x: leftX, y: leftY }, end: { x: topX, y: topY }, color: strokeColor, thickness: borderWidth });
        } else if (item.type === "freehand" && item.points && item.points.length > 1) {
          const points = item.points;
          for (let j = 0; j < points.length - 1; j++) {
            const startX = points[j].x * W;
            const startY = H - points[j].y * H;
            const endX = points[j + 1].x * W;
            const endY = H - points[j + 1].y * H;

            pdfPage.drawLine({
              start: { x: startX, y: startY },
              end: { x: endX, y: endY },
              color: strokeColor,
              thickness: borderWidth,
            });
          }
        }

        pageManifest.shapes.push({
          type: item.type,
          xNorm: +xNorm.toFixed(6),
          yNormTop: +yNormTop.toFixed(6),
          widthNorm: +((drawW) / W).toFixed(6),
          heightNorm: +((drawH) / H).toFixed(6),
          strokeColor: item.strokeColor || "#000000",
          strokeWidth: borderWidth,
          fillColor: item.fillColor || null,
          index: item.index,
          zIndex: item.zIndex ?? 0,
          // Layer properties
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          ...(item.name && { name: item.name }),
          // Freehand points
          ...(item.type === "freehand" && item.points && { points: item.points }),
        });
      }
    }

    // ---- ANNOTATIONS (highlight, strikethrough, underline) ----
    // Typographic constants - MUST match drawAnnotations.js exactly
    const TYPO_ANNOT = {
      // Highlight: covers the full text bounding box exactly (no padding)
      HIGHLIGHT_HORIZONTAL_PAD: 0, // No horizontal padding - exact bounding box

      // Underline: positioned at the very bottom of the bounding box
      UNDERLINE_POSITION: 0.98, // 98% from top (near bottom of bounding box)
      UNDERLINE_THICKNESS_RATIO: 0.06, // Line thickness as ratio of height

      // Strikethrough: positioned at exact vertical center of bounding box
      STRIKETHROUGH_POSITION: 0.50, // Exactly 50% from top (visual center)
      STRIKETHROUGH_THICKNESS_RATIO: 0.06, // Line thickness as ratio of height
    };

    /**
     * Calculate visual metrics for a span - MUST match getSpanVisualMetrics in drawAnnotations.js
     * This ensures PDF annotations are positioned exactly like canvas annotations
     */
    const getSpanVisualMetricsForPdf = (spanText: string, fontSize: number, xNorm: number, yNormTop: number) => {
      const fontFamily = "Lato";

      // Set font to measure text accurately
      ctx.save();
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      const m = ctx.measureText(spanText);

      // Get actual bounding box metrics - SAME as drawAnnotations.js
      const bboxLeft = m.actualBoundingBoxLeft || 0;
      const bboxRight = m.actualBoundingBoxRight || m.width;
      const ascent = m.actualBoundingBoxAscent || fontSize * 0.8;
      const descent = m.actualBoundingBoxDescent || fontSize * 0.2;

      // Calculate visual width and height (actual rendered dimensions) - SAME as canvas
      const visualWidth = bboxLeft + bboxRight;
      const visualHeight = ascent + descent;

      ctx.restore();

      // xOrigin is where fillText would be called (from normalized coords)
      const xOrigin = xNorm * W;
      // Visual left edge accounts for glyphs extending left of origin
      const visualX = xOrigin - bboxLeft;

      // Y position from stored normalized value - matches canvas calculation
      const y = yNormTop * H;

      return {
        x: visualX,           // Visual left edge (matches text bounding box on canvas)
        y: y,                 // Top Y position
        width: visualWidth,   // Visual width (bboxLeft + bboxRight)
        height: visualHeight, // Visual height (ascent + descent) - measured like canvas
        bboxLeft: bboxLeft,   // How far left of origin glyphs extend
      };
    };

    // Use override annotations if provided (ensures fresh data), otherwise fall back to pageList
    const annotations = annotationItemsOverride
      ? annotationItemsOverride.filter((item: any) => item.index === i)
      : (Array.isArray(page.annotations) ? page.annotations : []);

    for (const annotation of annotations) {
      if (!annotation.spans || annotation.spans.length === 0) continue;

      const annotationColor = hexToRgb(annotation.color || "#FFFF00");
      const opacity = annotation.opacity ?? 0.4;

      // Find linked textItem if annotation is linked
      let linkedTextItem: any = null;
      if (annotation.linkedTextItemId) {
        linkedTextItem = textItems.find((t: any) => t.id === annotation.linkedTextItemId);
      }

      for (const span of annotation.spans) {
        // Calculate position - if linked to textItem, use textItem position + relative offset
        let xNorm = span.xNorm ?? 0;
        let yNormTop = span.yNormTop ?? 0;

        if (linkedTextItem && span.relativeXNorm !== undefined && span.relativeYNorm !== undefined) {
          // Annotation is linked - calculate position from linked textItem
          xNorm = linkedTextItem.xNorm + span.relativeXNorm;
          yNormTop = linkedTextItem.yNormTop + span.relativeYNorm;
        }

        // Get text and fontSize for measurement
        const spanText = span.text || "";
        const fontSize = span.fontSize || 16;

        // Calculate visual metrics using canvas measurement - SAME as drawAnnotations.js
        // This ensures the PDF annotation matches the canvas bounding box exactly
        const metrics = getSpanVisualMetricsForPdf(spanText, fontSize, xNorm, yNormTop);

        // Use measured values - exactly like canvas does in drawAnnotations.js
        // IMPORTANT: Use exact dimensions without any padding to match canvas 1:1
        const pdfX = metrics.x;       // Visual left edge (adjusted by bboxLeft)
        const pdfW = metrics.width;   // Visual width (bboxLeft + bboxRight)
        const pdfH = metrics.height;  // Exact visual height (ascent + descent) - no padding
        const pdfY = metrics.y;       // Exact top Y position - no offset

        // Skip if dimensions are invalid
        if (pdfW <= 0 || pdfH <= 0) continue;

        if (annotation.type === "highlight") {
          // Highlight: covers the full text bounding box with minimal horizontal padding
          // Matches canvas rendering exactly
          const hlX = pdfX - TYPO_ANNOT.HIGHLIGHT_HORIZONTAL_PAD;
          const hlY = pdfY;
          const hlW = pdfW + (TYPO_ANNOT.HIGHLIGHT_HORIZONTAL_PAD * 2);
          const hlH = pdfH;

          // PDF Y is bottom-up: convert from canvas top-down coords
          const pdfHlY = H - hlY - hlH;

          pdfPage.drawRectangle({
            x: hlX,
            y: pdfHlY,
            width: hlW,
            height: hlH,
            color: annotationColor,
            opacity: opacity,
          });
        } else if (annotation.type === "strikethrough") {
          // Strikethrough: positioned at exact vertical center (50%) of bounding box
          // Matches canvas rendering exactly
          const strikeCanvasY = pdfY + (pdfH * TYPO_ANNOT.STRIKETHROUGH_POSITION);
          const pdfStrikeY = H - strikeCanvasY;
          const lineThickness = Math.max(1, pdfH * TYPO_ANNOT.STRIKETHROUGH_THICKNESS_RATIO);

          pdfPage.drawLine({
            start: { x: pdfX, y: pdfStrikeY },
            end: { x: pdfX + pdfW, y: pdfStrikeY },
            color: annotationColor,
            thickness: lineThickness,
            opacity: opacity,
          });
        } else if (annotation.type === "underline") {
          // Underline: positioned at 98% from top (bottom of bounding box)
          // Matches canvas rendering exactly
          const underlineCanvasY = pdfY + (pdfH * TYPO_ANNOT.UNDERLINE_POSITION);
          const pdfUnderlineY = H - underlineCanvasY;
          const lineThickness = Math.max(1, pdfH * TYPO_ANNOT.UNDERLINE_THICKNESS_RATIO);

          pdfPage.drawLine({
            start: { x: pdfX, y: pdfUnderlineY },
            end: { x: pdfX + pdfW, y: pdfUnderlineY },
            color: annotationColor,
            thickness: lineThickness,
            opacity: opacity,
          });
        }
      }

      // Add to manifest - store visual metrics for accurate re-import
      // Build annotation manifest entry
      const annotationEntry: any = {
        id: annotation.id,
        type: annotation.type,
        spans: annotation.spans.map((s: any) => {
          // Calculate actual position for linked annotations
          let finalXNorm = s.xNorm ?? 0;
          let finalYNormTop = s.yNormTop ?? 0;
          if (linkedTextItem && s.relativeXNorm !== undefined && s.relativeYNorm !== undefined) {
            finalXNorm = linkedTextItem.xNorm + s.relativeXNorm;
            finalYNormTop = linkedTextItem.yNormTop + s.relativeYNorm;
          }
          const spanEntry: any = {
            xNorm: +finalXNorm.toFixed(6),
            yNormTop: +finalYNormTop.toFixed(6),
            widthNorm: +(s.widthNorm ?? 0).toFixed(6),
            heightNorm: +(s.heightNorm ?? 0).toFixed(6),
            text: s.text || "",
            fontSize: s.fontSize || 16,
          };
          // Preserve relative offsets for linked annotations
          if (s.relativeXNorm !== undefined) {
            spanEntry.relativeXNorm = +s.relativeXNorm.toFixed(6);
          }
          if (s.relativeYNorm !== undefined) {
            spanEntry.relativeYNorm = +s.relativeYNorm.toFixed(6);
          }
          return spanEntry;
        }),
        color: annotation.color || "#FFFF00",
        opacity: opacity,
        index: i,
        annotatedText: annotation.annotatedText,
        zIndex: annotation.zIndex ?? -50,
        // Layer properties
        visible: annotation.visible ?? true,
        locked: annotation.locked ?? false,
        ...(annotation.name && { name: annotation.name }),
      };
      // Preserve linked text item ID for re-linking on import
      if (annotation.linkedTextItemId) {
        annotationEntry.linkedTextItemId = annotation.linkedTextItemId;
      }
      pageManifest.annotations.push(annotationEntry);
    }

    // End clipping for this page
    unclip(pdfPage);

    // ---- FORM FIELDS (interactive PDF form fields) ----
    const form = pdfDoc.getForm();

    for (const field of formFieldsData) {
      const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(field, W, H);
      const fieldW = Number(field.width) || Math.round((field.widthNorm ?? 0) * W);
      const fieldH = Number(field.height) || Math.round((field.heightNorm ?? 0) * H);

      // PDF Y coordinate is bottom-up
      const fieldY = H - yTop - fieldH;

      // Get colors
      const borderColor = hexToRgb(field.borderColor || "#374151");
      const bgColor = hexToRgb(field.backgroundColor || "#ffffff");
      const textColorVal = hexToRgbValues(field.textColor || "#000000");

      try {
        if (field.type === "textInput") {
          const textField = form.createTextField(field.fieldName);
          // Use defaultValue if set, otherwise use placeholder as initial text
          const initialText = field.defaultValue || field.placeholder || "";
          textField.setText(initialText);
          // Add to page first (creates default appearance)
          textField.addToPage(pdfPage, {
            x: xTop,
            y: fieldY,
            width: fieldW,
            height: fieldH,
            borderColor: borderColor,
            backgroundColor: bgColor,
            borderWidth: field.borderWidth || 1,
          });
          // Set font size AFTER addToPage (requires default appearance to exist)
          try {
            const fontSize = field.fontSize || 14;
            textField.setFontSize(fontSize);
          } catch (fontErr) {
            console.warn("Could not set font size for textInput:", field.fieldName, fontErr);
          }
        } else if (field.type === "textarea") {
          const textField = form.createTextField(field.fieldName);
          // Enable multi-line for textarea
          textField.enableMultiline();
          // Use defaultValue if set, otherwise use placeholder as initial text
          const initialText = field.defaultValue || field.placeholder || "";
          textField.setText(initialText);
          // Add to page first (creates default appearance)
          textField.addToPage(pdfPage, {
            x: xTop,
            y: fieldY,
            width: fieldW,
            height: fieldH,
            borderColor: borderColor,
            backgroundColor: bgColor,
            borderWidth: field.borderWidth || 1,
          });
          // Set font size AFTER addToPage (requires default appearance to exist)
          try {
            const fontSize = field.fontSize || 14;
            textField.setFontSize(fontSize);
          } catch (fontErr) {
            console.warn("Could not set font size for textarea:", field.fieldName, fontErr);
          }
        } else if (field.type === "checkbox") {
          const checkbox = form.createCheckBox(field.fieldName);
          if (field.defaultValue === "true") {
            checkbox.check();
          }
          // Use fixed 18x18 dimensions for checkboxes to match canvas rendering
          const CHECKBOX_SIZE = 18;
          const checkboxW = Math.min(fieldW, CHECKBOX_SIZE);
          const checkboxH = Math.min(fieldH, CHECKBOX_SIZE);
          // Recalculate Y position with fixed height
          const checkboxY = H - yTop - checkboxH;
          checkbox.addToPage(pdfPage, {
            x: xTop,
            y: checkboxY,
            width: checkboxW,
            height: checkboxH,
            borderColor: borderColor,
            backgroundColor: bgColor,
            borderWidth: field.borderWidth || 1,
          });
        } else if (field.type === "radio") {
          // Radio buttons need a group
          const groupName = field.groupName || `radio_${field.fieldName}`;
          let radioGroup;
          try {
            radioGroup = form.getRadioGroup(groupName);
          } catch {
            radioGroup = form.createRadioGroup(groupName);
          }
          // Use fixed 18x18 dimensions for radio buttons to match canvas rendering
          const RADIO_SIZE = 18;
          const radioW = Math.min(fieldW, RADIO_SIZE);
          const radioH = Math.min(fieldH, RADIO_SIZE);
          // Recalculate Y position with fixed height
          const radioY = H - yTop - radioH;
          radioGroup.addOptionToPage(field.fieldName, pdfPage, {
            x: xTop,
            y: radioY,
            width: radioW,
            height: radioH,
            borderColor: borderColor,
            backgroundColor: bgColor,
            borderWidth: field.borderWidth || 1,
          });
          if (field.defaultValue === "true") {
            radioGroup.select(field.fieldName);
          }
        } else if (field.type === "dropdown") {
          const dropdown = form.createDropdown(field.fieldName);
          const options = Array.isArray(field.options) ? field.options : ["Option 1", "Option 2", "Option 3"];
          dropdown.setOptions(options);
          if (field.defaultValue && options.includes(field.defaultValue)) {
            dropdown.select(field.defaultValue);
          }
          // Add to page first (creates default appearance)
          dropdown.addToPage(pdfPage, {
            x: xTop,
            y: fieldY,
            width: fieldW,
            height: fieldH,
            borderColor: borderColor,
            backgroundColor: bgColor,
            borderWidth: field.borderWidth || 1,
          });
          // Set font size AFTER addToPage (requires default appearance to exist)
          try {
            const fontSize = field.fontSize || 14;
            dropdown.setFontSize(fontSize);
          } catch (fontErr) {
            console.warn("Could not set font size for dropdown:", field.fieldName, fontErr);
          }
        }

        pageManifest.formFields.push({
          type: field.type,
          fieldName: field.fieldName,
          xNorm: +xNorm.toFixed(6),
          yNormTop: +yNormTop.toFixed(6),
          widthNorm: +((fieldW) / W).toFixed(6),
          heightNorm: +((fieldH) / H).toFixed(6),
          index: i,
          // Preserve all form field properties
          ...(field.label && { label: field.label }),
          ...(field.placeholder && { placeholder: field.placeholder }),
          ...(field.defaultValue && { defaultValue: field.defaultValue }),
          ...(field.required && { required: field.required }),
          ...(field.options && { options: field.options }),
          ...(field.groupName && { groupName: field.groupName }),
          fontSize: field.fontSize || 14,
          ...(field.fontFamily && { fontFamily: field.fontFamily }),
          textColor: field.textColor || '#000000',
          backgroundColor: field.backgroundColor || '#ffffff',
          borderColor: field.borderColor || '#374151',
          borderWidth: field.borderWidth || 1,
          zIndex: field.zIndex ?? 100,
          // Layer properties
          visible: field.visible ?? true,
          locked: field.locked ?? false,
          ...(field.name && { name: field.name }),
        });
      } catch (e) {
        console.warn("Form field creation failed:", field.fieldName, e);
      }
    }

    // Update field appearances with the embedded font
    try {
      form.updateFieldAppearances(pdfFont);
    } catch (e) {
      console.warn("Failed to update form field appearances:", e);
    }

    manifest.pages.push(pageManifest);
  }

  // Attach manifest for perfect re-import (optional)
  try {
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
    await pdfDoc.attach?.(manifestBytes, "manifest.json", {
      mimeType: "application/json",
      description: "Normalized coordinates for texts/images.",
      creationDate: new Date(),
      modificationDate: new Date(),
    });
  } catch { /* older pdf-lib, ignore */ }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "multi_page_document.pdf";
  a.click();
  URL.revokeObjectURL(url);
}
