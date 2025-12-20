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
    const shapes = Array.isArray(page.shapes) ? page.shapes : [];
    const formFieldsData = Array.isArray(page.formFields) ? page.formFields : [];

    const pageManifest = { texts: [] as any[], images: [] as any[], shapes: [] as any[], formFields: [] as any[] };

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

    // ---- SHAPES (rectangles, circles, lines, arrows, triangles, diamonds, freehand) ----
    for (const item of shapes) {
      const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);
      const drawW = Number(item.width) || Math.round((item.widthNorm ?? 0) * W);
      const drawH = Number(item.height) || Math.round((item.heightNorm ?? 0) * H);

      const strokeColor = hexToRgb(item.strokeColor || "#000000");
      const borderWidth = Number(item.strokeWidth) || 2;

      // Handle fill color
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
        // pdf-lib uses ellipse, not circle
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
        // Draw line (no fill for lines)
        pdfPage.drawLine({
          start: { x: xTop, y: H - yTop },
          end: { x: xTop + drawW, y: H - (yTop + drawH) },
          color: strokeColor,
          thickness: borderWidth,
        });
      } else if (item.type === "arrow") {
        // Draw line
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

        // Draw arrowhead
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
        // Draw triangle - coordinates in PDF space (Y flipped)
        const topX = xTop + drawW / 2;
        const topY = H - yTop;
        const bottomLeftX = xTop;
        const bottomLeftY = H - yTop - drawH;
        const bottomRightX = xTop + drawW;
        const bottomRightY = H - yTop - drawH;

        // Draw fill first (if enabled) using a polygon approximation
        if (hasFill) {
          // Use SVG path for filled triangle - path relative to origin
          const path = `M ${drawW / 2},0 L 0,${drawH} L ${drawW},${drawH} Z`;
          pdfPage.drawSvgPath(path, {
            x: xTop,
            y: H - yTop - drawH,
            color: fillColor,
          });
        }

        // Draw stroke lines
        pdfPage.drawLine({
          start: { x: topX, y: topY },
          end: { x: bottomLeftX, y: bottomLeftY },
          color: strokeColor,
          thickness: borderWidth,
        });
        pdfPage.drawLine({
          start: { x: bottomLeftX, y: bottomLeftY },
          end: { x: bottomRightX, y: bottomRightY },
          color: strokeColor,
          thickness: borderWidth,
        });
        pdfPage.drawLine({
          start: { x: bottomRightX, y: bottomRightY },
          end: { x: topX, y: topY },
          color: strokeColor,
          thickness: borderWidth,
        });
      } else if (item.type === "diamond") {
        // Draw diamond - coordinates in PDF space (Y flipped)
        const topX = xTop + drawW / 2;
        const topY = H - yTop;
        const rightX = xTop + drawW;
        const rightY = H - yTop - drawH / 2;
        const bottomX = xTop + drawW / 2;
        const bottomY = H - yTop - drawH;
        const leftX = xTop;
        const leftY = H - yTop - drawH / 2;

        // Draw fill first (if enabled)
        if (hasFill) {
          // Use SVG path for filled diamond - path relative to origin
          const path = `M ${drawW / 2},0 L ${drawW},${drawH / 2} L ${drawW / 2},${drawH} L 0,${drawH / 2} Z`;
          pdfPage.drawSvgPath(path, {
            x: xTop,
            y: H - yTop - drawH,
            color: fillColor,
          });
        }

        // Draw stroke lines
        pdfPage.drawLine({
          start: { x: topX, y: topY },
          end: { x: rightX, y: rightY },
          color: strokeColor,
          thickness: borderWidth,
        });
        pdfPage.drawLine({
          start: { x: rightX, y: rightY },
          end: { x: bottomX, y: bottomY },
          color: strokeColor,
          thickness: borderWidth,
        });
        pdfPage.drawLine({
          start: { x: bottomX, y: bottomY },
          end: { x: leftX, y: leftY },
          color: strokeColor,
          thickness: borderWidth,
        });
        pdfPage.drawLine({
          start: { x: leftX, y: leftY },
          end: { x: topX, y: topY },
          color: strokeColor,
          thickness: borderWidth,
        });
      } else if (item.type === "freehand" && item.points && item.points.length > 1) {
        // Draw freehand as connected lines
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
      });
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
          checkbox.addToPage(pdfPage, {
            x: xTop,
            y: fieldY,
            width: fieldW,
            height: fieldH,
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
          radioGroup.addOptionToPage(field.fieldName, pdfPage, {
            x: xTop,
            y: fieldY,
            width: fieldW,
            height: fieldH,
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
