import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { loadArrayBuffer } from "../files/loadArrayBuffer";
import { resolveTopLeft } from "../canvas/resolveTopLeft";
import { clipToPage, unclip } from "./clipping";
import { hexToRgb } from "../colors/hexToRgb";
import { isSvgDataUri } from "../images/isSvgDataUri";
import { isJpegLike } from "../images/isJpegLike";
import { rasterizeSvgDataUriToPngBytes } from "../images/rasterizeSvgDataUriToPngBytes";

interface SaveAllPagesAsPDFParams {
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  activePage: number;
  pageList: any[];
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
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
}: SaveAllPagesAsPDFParams) {
  const canvas = canvasRefs.current[activePage];
  if (!canvas) {
    throw new Error("Canvas not found");
  }

  const rect = canvas.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Canvas context not found");
  }

  // Helper: resolve text draw position (x, topY) and metrics in CSS units
  const resolveTextLayout = (item: any) => {
    const fontSize = Number(item.fontSize) || 16;
    const fontFamily = item.fontFamily || "Lato";
    const padding = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${fontSize}px ${fontFamily}`;

    const m = ctx.measureText(item.text || "");
    const ascent = m.actualBoundingBoxAscent;
    const descent = m.actualBoundingBoxDescent;
    const textWidth = m.width;
    const textHeight = ascent + descent;

    // Prefer normalized; DO NOT CLAMP so we can go off-canvas (negative or >1)
    const hasNorm = (item.xNorm != null) && (item.yNormTop != null);

    const x = hasNorm
      ? Number(item.xNorm) * rect.width
      : (Number(item.x) || 0);

    let topY: number;
    if (hasNorm) {
      topY = Number(item.yNormTop) * rect.height; // can be <0 or >rect.height
    } else {
      // Legacy: item.y may be baseline; convert to top if needed
      const anchor = item.anchor || "baseline"; // "top" | "baseline" | "bottom"
      const rawY = Number(item.y) || 0;
      if (anchor === "baseline") topY = rawY - ascent;
      else if (anchor === "bottom") topY = rawY - textHeight;
      else topY = rawY; // already top
    }

    return {
      x,
      topY,
      fontSize,
      fontFamily,
      padding,
      textWidth,
      textHeight,
      ascent,
      descent,
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
    const textItems = Array.isArray(page.textItems) ? page.textItems : [];
    const imageItems = Array.isArray(page.imageItems) ? page.imageItems : [];

    const pageManifest = { texts: [] as any[], images: [] as any[] };

    // **Clip to the page rectangle** so overflow matches canvas behavior
    clipToPage(pdfPage, W, H);

    // ---- TEXT (top-left canvas → PDF baseline) ----
    for (const item of textItems) {
      const L = resolveTextLayout(item);
      const text = String(item.text ?? "");
      if (!text) continue;

      const size = Number(item.fontSize) || 16;
      const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);

      // Baseline so glyph top == yTop
      const baseline = H - yTop - L.textHeight;

      pdfPage.drawText(text, {
        x: xTop,
        y: baseline,
        size,
        font: pdfFont,
        color: hexToRgb(item.color),
      });

      pageManifest.texts.push({
        text,
        xNorm: +xNorm.toFixed(6),
        yNormTop: +yNormTop.toFixed(6),
        fontSize: size,
        anchor: "top",
        index: item.index,
        color: item.color,
      });
    }

    // ---- IMAGES (supports data:image/svg+xml;base64) ----
    for (const item of imageItems) {
      const src = item.data || item.src;
      if (!src || typeof src !== "string") continue;

      const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);
      const drawW = Number(item.width) || Math.round((item.widthNorm ?? 0) * W);
      const drawH = Number(item.height) || Math.round((item.heightNorm ?? 0) * H);

      let pdfImage;
      try {
        if (isSvgDataUri(src)) {
          // Rasterize SVG → PNG bytes at the intended output size
          const pngBytesU8 = await rasterizeSvgDataUriToPngBytes(src, drawW || 1024, drawH || 768, "white");
          pdfImage = await pdfDoc.embedPng(pngBytesU8);
        } else {
          // Regular JPEG/PNG data URI or URL
          const bytes = await loadArrayBuffer(src);
          pdfImage = isJpegLike(src)
            ? await pdfDoc.embedJpg(bytes)
            : await pdfDoc.embedPng(bytes);
        }
      } catch (e) {
        // As a last resort, skip this image instead of breaking export
        console.warn("Image embed failed:", e);
        continue;
      }

      pdfPage.drawImage(pdfImage, {
        x: xTop,
        y: H - yTop - drawH, // flip Y
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
        ref: src, // keep original reference (svg/png/jpg)
      });
    }

    // End clipping for this page
    unclip(pdfPage);

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
