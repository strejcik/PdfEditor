import { PDF_HEIGHT, PDF_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT } from "../config/constants";
import { getMousePosOnCanvas } from "../utils/canvas/getMousePosOnCanvas";


/**
 * Find the topmost text item at a given point (respecting z-index)
 * Returns { index, zIndex, type: 'text' } or null if no text item at point
 */
export function findTopmostTextAtPoint(
  textItems: any[],
  mouseX: number,
  mouseY: number,
  activePage: number,
  resolveTextLayoutForHit: (item: any, ctx: any, canvas: any) => any,
  ctx: any,
  canvas: any
): { index: number; zIndex: number; type: 'text' } | null {
  const clickedTexts: { index: number; zIndex: number }[] = [];

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];
    if (item.index !== activePage) continue;

    const L = resolveTextLayoutForHit(item, ctx, canvas);
    const b = L.box;

    const isInside = mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h;

    if (isInside) {
      clickedTexts.push({
        index: i,
        zIndex: item.zIndex ?? 0,
      });
    }
  }

  if (clickedTexts.length === 0) return null;

  // Sort by z-index descending (highest first) and return the topmost
  clickedTexts.sort((a, b) => b.zIndex - a.zIndex);
  return {
    index: clickedTexts[0].index,
    zIndex: clickedTexts[0].zIndex,
    type: 'text',
  };
}

export function useMouse() {









const clampPadding = (boxWidth:any, boxHeight:any, requestedPadding:any) => {
  const w = Math.max(1, boxWidth);
  const h = Math.max(1, boxHeight);
  const maxPadX = Math.floor(w / 2) - 1;
  const maxPadY = Math.floor(h / 2) - 1;
  const maxPad = Math.max(0, Math.min(maxPadX, maxPadY));
  return Math.max(0, Math.min(requestedPadding, maxPad));
};




/**
 * Canonical text layout:
 * - preserves explicit newlines
 * - preserves whitespace exactly (Notepad-like)
 * - wraps to width
 * - fits to width + height
 * - chooses the largest font <= maxFontSize that fits; never below minFontSize
 */
const wrapTextPreservingNewlinesResponsive = (
  text:any,
  ctx:any,
  boxWidth:any,
  boxHeight:any,
  maxFontSize:any,
  padding = 10,
  minFontSize = 6,
  fontFamily:any,
  lineGap = 4
) => {
  const raw = String(text ?? "");

  const safeW = Math.max(1, boxWidth);
  const safeH = Math.max(1, boxHeight);

  const safePadding = clampPadding(safeW, safeH, padding);

  const innerW = Math.max(1, safeW - safePadding * 2);
  const innerH = Math.max(1, safeH - safePadding * 2);

  const family =
    fontFamily ||
    (() => {
      const parts = (ctx.font || "").split(" ");
      return parts.length >= 2 ? parts.slice(1).join(" ") : "Arial";
    })();

  const setFont = (size:any) => {
    ctx.font = `${Math.max(1, size)}px ${family}`;
  };

  const breakWordToFit = (word:any) => {
    const out = [];
    let chunk = "";

    for (let i = 0; i < word.length; i++) {
      const test = chunk + word[i];
      if (ctx.measureText(test).width <= innerW) {
        chunk = test;
      } else {
        if (chunk) out.push(chunk);
        chunk = word[i];
      }
    }
    if (chunk) out.push(chunk);
    if (out.length === 0 && word.length > 0) out.push(word[0]);
    return out;
  };

  const wrapAtCurrentFont = () => {
    const paragraphs = raw.split(/\r?\n/);
    const lines = [];
    let maxLineW = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        lines.push("");
        continue;
      }

      // Preserve whitespace tokens exactly
      const tokens = paragraph.split(/(\s+)/).filter((t) => t.length > 0);
      let current = "";

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const isSpace = /^\s+$/.test(tok);

        // Notepad-like: don't start a wrapped line with whitespace
        if (current === "" && isSpace) continue;

        // Hard-break long token
        if (!isSpace && ctx.measureText(tok).width > innerW) {
          if (current) {
            lines.push(current);
            maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
            current = "";
          }
          const pieces = breakWordToFit(tok);
          for (const p of pieces) {
            lines.push(p);
            maxLineW = Math.max(maxLineW, ctx.measureText(p).width);
          }
          continue;
        }

        const test = current + tok;

        if (ctx.measureText(test).width <= innerW) {
          current = test;
        } else {
          if (current) {
            lines.push(current);
            maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
          }
          current = isSpace ? "" : tok;
        }
      }

      if (current) {
        lines.push(current);
        maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
      }
    }

    const m = /^(\d+(?:\.\d+)?)px\b/.exec(ctx.font);
    const fontPx = m ? parseFloat(m[1]) : 1;
    const lineHeight = fontPx + lineGap;
    const totalH = lines.length * lineHeight;

    return { lines, maxLineW, totalH, lineHeight };
  };

  const lo0 = Math.max(1, Math.floor(minFontSize));
  const hi0 = Math.max(lo0, Math.floor(maxFontSize));

  let lo = lo0;
  let hi = hi0;

  let bestFont = lo0;
  let bestLines = [""];
  let bestLineHeight = lo0 + lineGap;
  let bestFits = false;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    setFont(mid);

    const { lines, maxLineW, totalH, lineHeight } = wrapAtCurrentFont();

    const fitsW = maxLineW <= innerW + 0.001;
    const fitsH = totalH <= innerH + 0.001;

    if (fitsW && fitsH) {
      bestFont = mid;
      bestLines = lines;
      bestLineHeight = lineHeight;
      bestFits = true;
      lo = mid + 1; // try bigger
    } else {
      hi = mid - 1;
    }
  }

  setFont(bestFont);

  return {
    lines: bestLines,
    fontSize: bestFont,
    lineHeight: bestLineHeight,
    fits: bestFits,
    padding: safePadding, // convenient to reuse
  };
};






















































const pdfToCssMargins = (rect:any, marginsPDF:any) => {
  // scale PDF units → CSS px (respect current canvas rect)
  const sx = rect.width  / PDF_WIDTH;
  const sy = rect.height / PDF_HEIGHT;
  return {
    left:   marginsPDF.left   * sx,
    right:  marginsPDF.right  * sx,
    top:    marginsPDF.top    * sy,
    bottom: marginsPDF.bottom * sy,
  };
}
    // Convert a caret index → (x,y, line metrics)
const indexToXY = (index:any, layout:any, preferredX = null, verticalDir = 0) => {
  const { lines, lineHeight } = layout;
  if (lines.length === 0) return { x: 0, y: 0, line: null };

  // clamp index into total range
  const totalStart = lines[0].start;
  const totalEnd   = lines[lines.length - 1].end;
  const idx = Math.max(totalStart, Math.min(index, totalEnd));

  // find current line
  let li = lines.findIndex((L:any) => idx >= L.start && idx <= L.end);
  if (li === -1) { // in between (shouldn't happen), default to closest
    li = (idx < lines[0].start) ? 0 : lines.length - 1;
  }
  let line = lines[li];

  // column within line
  const col = idx - line.start;
  let x;
  if (verticalDir !== 0 && preferredX != null) {
    x = preferredX; // keep preferred X when moving up/down
  } else {
    x = line.charX[col];
  }
  const y = line.y;

  return { x, y, line };
}
    
      // Convert a (x,y) click into a caret index
      const hitTestToIndex = (x:any, y:any, layout:any) => {
        const { lines } = layout;
        if (lines.length === 0) return 0;

        // Find line by y
        let line = null;
        for (let i = 0; i < lines.length; i++) {
          const L = lines[i];
          if (y >= L.y && y < L.y + L.height) { line = L; break; }
        }
        if (!line) {
          // above first or below last
          if (y < lines[0].y) return 0;
          const last = lines[lines.length - 1];
          return last.end; // end of last line
        }

        // Find nearest caret boundary by x (charX array)
        const { charX, start, end } = line; // charX length = (end-start)+1
        if (x <= charX[0]) return start;
        if (x >= charX[charX.length - 1]) return end;

        // binary search or linear (short lines are fine)
        let best = start, bestDist = Infinity;
        for (let i = 0; i < charX.length; i++) {
          const dist = Math.abs(x - charX[i]);
          if (dist < bestDist) { best = start + i; bestDist = dist; }
        }
        return best;
      }
    
    
    
    const handleMouseDown = (e:any, opts:any) => {
    const {
        canvasRefs,
        activePage,
        editingIndex,
        imageItems,
        resolveImageRectCss,
        setResizingImageIndex,
        setResizeStart,
        setIsSelecting,
        setSelectedImageIndex,
        setDraggedImageIndex,
        setIsImageDragging,
        setDragStart,
        textItems,
        shapeItems,
        resolveTextLayoutForHit,
        setIsTextSelected,
        setSelectedTextIndex,
        selectedTextIndexes,
        setSelectedTextIndexes,
        selectedShapeIndexes,
        setSelectedShapeIndex,
        setSelectedShapeIndexes,
        setIsDragging,
        setIsDraggingMixedItems,
        setInitialPositions,
        setInitialMixedItemPositions,
        textBox,
        setIsResizing,
        setTextBox,
        setSelectionStart,
        setSelectionEnd,
        pushSnapshotToUndo
    } = opts;
    
    if (editingIndex !== null) {
        e.preventDefault();
    }
    const canvas = canvasRefs.current[activePage];
    if (!canvas) return;

    // Use raw CSS coordinates (can be negative only if pointer starts outside canvas,
    // but mousedown happens on canvas, so expect 0..rect.* here)
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    const ctx = canvas.getContext('2d');

    // ======== 1) IMAGE: resize handle (bottom-right) ========
    for (let index = 0; index < imageItems.length; index++) {
        const item = imageItems[index];
        if (item.index !== activePage) continue;

        const { x, y, w, h, cssW, cssH } = resolveImageRectCss(item, canvas);

        const handleSize = 10; // CSS px
        const halfHandle = handleSize / 2;

        // Check all four corner handles
        const handles = [
            { name: 'top-left', hx: x - halfHandle, hy: y - halfHandle },
            { name: 'top-right', hx: x + w - halfHandle, hy: y - halfHandle },
            { name: 'bottom-left', hx: x - halfHandle, hy: y + h - halfHandle },
            { name: 'bottom-right', hx: x + w - halfHandle, hy: y + h - halfHandle },
        ];

        for (const handle of handles) {
            if (cssX >= handle.hx && cssX <= handle.hx + handleSize &&
                cssY >= handle.hy && cssY <= handle.hy + handleSize) {
                // Check if image is locked - don't allow resize
                if (item.locked) {
                    setSelectedImageIndex(index);
                    setIsSelecting(false);
                    return; // Select but don't resize
                }
                setResizingImageIndex(index);
                setResizeStart({
                    x: cssX,
                    y: cssY,
                    startX: x,
                    startY: y,
                    startW: w,
                    startH: h,
                    ratio: (w > 0 && h > 0) ? (w / h) : 1,
                    cssW,
                    cssH,
                    handle: handle.name, // Track which handle is being dragged
                });
                setIsSelecting(false);
                return;
            }
        }
    }

    // ======== 2) IMAGE: inside -> prepare for potential drag (don't set isImageDragging yet) ========
    for (let index = 0; index < imageItems.length; index++) {
        const item = imageItems[index];
        if (item.index !== activePage) continue;

        const { x, y, w, h } = resolveImageRectCss(item, canvas);

        if (cssX >= x && cssX <= x + w && cssY >= y && cssY <= y + h) {
        setSelectedImageIndex(index);

        // Check if image is locked - select but don't prepare for drag
        if (item.locked) {
            setIsSelecting(false);
            return;
        }

        setDraggedImageIndex(index);
        // DON'T set isImageDragging here - only set it when actual movement occurs
        // This prevents simple clicks from triggering drag behavior and sync effects
        setDragStart({
            x: cssX,
            y: cssY,
            grabDX: cssX - x,
            grabDY: cssY - y,
        });
        setIsSelecting(false);
        return;
        }
    }

    // ======== 3) TEXT: hit-test (top-anchored; supports off-canvas x<0) ========
    // Find the text item nearest to the cursor (not just the topmost one)
    let bestTextIndex = null;
    let bestTextScore = Infinity;

    for (let index = 0; index < textItems.length; index++) {
        const item = textItems[index];
        if (item.index !== activePage) continue;

        const L = resolveTextLayoutForHit(item, ctx, canvas);
        const b = L.box;

        const isInside = cssX >= b.x && cssX <= b.x + b.w && cssY >= b.y && cssY <= b.y + b.h;

        let score;
        if (isInside) {
            // Cursor is inside this box - score by distance to center
            const centerX = b.x + b.w / 2;
            const centerY = b.y + b.h / 2;
            score = Math.hypot(cssX - centerX, cssY - centerY);
        } else {
            // Cursor is outside - add large penalty
            const dx = cssX < b.x ? b.x - cssX : cssX > b.x + b.w ? cssX - (b.x + b.w) : 0;
            const dy = cssY < b.y ? b.y - cssY : cssY > b.y + b.h ? cssY - (b.y + b.h) : 0;
            score = Math.hypot(dx, dy) + 10000;
        }

        if (score < bestTextScore) {
            bestTextScore = score;
            bestTextIndex = index;
        }
    }

    // If we found a text item that contains the cursor, select it
    if (bestTextIndex !== null && bestTextScore < 10000) {
        // Check if this is a mixed selection (text, shapes, or form fields selected) BEFORE modifying text selection
        const { formFields, selectedFormFieldIndexes } = opts;
        const hasShapeSelection = selectedShapeIndexes && selectedShapeIndexes.length > 0;
        const hasFormFieldSelection = selectedFormFieldIndexes && selectedFormFieldIndexes.length > 0;
        const hasMixedSelection = (hasShapeSelection || hasFormFieldSelection) &&
                                  selectedTextIndexes.length > 0 &&
                                  selectedTextIndexes.includes(bestTextIndex);

        if (hasMixedSelection) {
            // Clicking on a text item that's part of a mixed selection
            // Push undo snapshot BEFORE starting drag (captures original positions)
            pushSnapshotToUndo?.(activePage);

            // Start mixed-item dragging without changing any selections
            setIsDraggingMixedItems(true);
            setDragStart({ x: cssX, y: cssY });

            // Store initial positions for all selected items
            const textPositions = selectedTextIndexes.map((i:any) => {
                const Li = resolveTextLayoutForHit(textItems[i], ctx, canvas);
                return {
                    type: 'text',
                    index: i,
                    xTop: Li.xOrigin,  // Use xOrigin (text origin), not x (visual left edge)
                    yTop: Li.topY,
                    activePage
                };
            });

            const shapePositions = (selectedShapeIndexes || []).map((i:any) => {
                const shape = shapeItems[i];
                // Resolve coordinates: prefer normalized, convert to pixels
                // Use the outer rect (from line 362) to ensure consistent coordinate calculations
                const resolvedX = shape.xNorm != null ? shape.xNorm * rect.width : shape.x;
                const resolvedY = shape.yNormTop != null ? shape.yNormTop * rect.height : shape.y;
                return {
                    type: 'shape',
                    index: i,
                    x: resolvedX,
                    y: resolvedY,
                    activePage: shape.index,
                    points: shape.points // Store initial points for freehand shapes
                };
            });

            const formFieldPositions = (selectedFormFieldIndexes || []).map((i:any) => {
                const field = formFields[i];
                const resolvedX = field.xNorm != null ? field.xNorm * rect.width : field.x;
                const resolvedY = field.yNormTop != null ? field.yNormTop * rect.height : field.y;
                return {
                    type: 'formField',
                    index: i,
                    x: resolvedX,
                    y: resolvedY,
                    activePage: field.index
                };
            });

            setInitialMixedItemPositions([...textPositions, ...shapePositions, ...formFieldPositions]);
            setIsSelecting(false);
            return;
        }

        // Not a mixed selection - handle as regular text selection
        // Clear shape selections when selecting text
        setSelectedShapeIndex?.(null);
        setSelectedShapeIndexes?.([]);

        setIsTextSelected(true);
        setSelectedTextIndex(bestTextIndex);

        const newSelectedIndexes = selectedTextIndexes.includes(bestTextIndex)
            ? [...selectedTextIndexes]
            : [bestTextIndex];

        setSelectedTextIndexes(newSelectedIndexes);

        // Check if the text item is locked - don't allow drag
        const clickedTextItem = textItems[bestTextIndex];
        if (clickedTextItem?.locked) {
            setIsSelecting(false);
            return; // Selected but not dragging
        }

        // Push undo snapshot BEFORE starting drag (captures original positions)
        pushSnapshotToUndo?.(activePage);

        // Regular text-only dragging
        setIsDragging(true);
        setDragStart({ x: cssX, y: cssY });

        // Store initial TOP-anchored positions for drag
        // Use xOrigin (text origin) not x (visual left edge) since xNorm represents origin
        const init = newSelectedIndexes.map((i) => {
            const Li = resolveTextLayoutForHit(textItems[i], ctx, canvas);
            return { index: i, xTop: Li.xOrigin, yTop: Li.topY, activePage };
        });
        setInitialPositions(init);
        setIsSelecting(false);
        return;
    }

    // ======== 4) TEXTBOX: resize handle ========
    const dragPointSize = 10;
    if (
        textBox &&
        cssX >= textBox.x + textBox.width  - dragPointSize &&
        cssX <= textBox.x + textBox.width &&
        cssY >= textBox.y + textBox.height - dragPointSize &&
        cssY <= textBox.y + textBox.height
    ) {
        setIsResizing(true);
        setIsSelecting(false);
        return;
    }

    // ======== 5) Default: begin selection rectangle ========
    setIsTextSelected(false);
    setSelectedTextIndex(null);
    setSelectedTextIndexes([]);
    setIsDragging(false);
    setInitialPositions([]);
    setIsImageDragging(false);
    setResizingImageIndex(null);
    setSelectedImageIndex(null);
    setSelectedShapeIndex?.(null);
    setSelectedShapeIndexes?.([]);

    setIsSelecting(true);
    setSelectionStart({ x: cssX, y: cssY });
    setSelectionEnd({ x: cssX, y: cssY });
    };





const clamp = (v:any, lo:any, hi:any) => Math.max(lo, Math.min(hi, v));


const computeScaledTargetFont = (textBox:any) => {
  const minFont  = Number(textBox.minFontSize ?? 6);
  const maxFont  = Number(textBox.maxFontSize ?? 80);

  // ✅ use resize-start base if available, else creation base
  const baseFont = Number(textBox.resizeBaseFontSize ?? textBox.baseFontSize ?? 20);

  const w = Math.max(1, Number(textBox.width) || 1);
  const h = Math.max(1, Number(textBox.height) || 1);

  const baseW = Math.max(1, Number(textBox.resizeBaseWidth ?? textBox.baseWidth ?? 1));
  const baseH = Math.max(1, Number(textBox.resizeBaseHeight ?? textBox.baseHeight ?? 1));

  const wScale = Math.max(0.01, w / baseW);
  const hScale = Math.max(0.01, h / baseH);

  // growth when either axis grows
  const scale = Math.max(wScale, hScale);

  return clamp(baseFont * scale, minFont, maxFont);
};




    const handleMouseMove = (e:any, opts:any) => {
      const {
        canvasRefs,
        activePage,
        editingIndex,
        imageItems,
        textItems,
        shapeItems,
        resolveTextLayoutForHit,
        selectedTextIndexes,
        setSelectedTextIndexes,
        selectedShapeIndexes,
        setSelectedShapeIndexes,
        setSelectedShapeIndex,
        textBox,
        setSelectionEnd,
        isResizing,
        wrapTextResponsive,
        setTextBox,
        drawCanvas,
        isSelecting,
        selectionStart,
        resizingImageIndex,
        resizeStart,
        setImageItems,
        saveImageItemsToIndexedDB,
        updatePageItems,
        isImageDragging,
        setIsImageDragging,
        draggedImageIndex,
        dragStart,
        isDragging,
        isDraggingMixedItems,
        initialPositions,
        initialMixedItemPositions,
        setTextItems,
        setShapeItems,
        saveTextItemsToIndexedDB,
        updateShape,
        requestCanvasDraw,
        snapEnabled
    } = opts;

      if (editingIndex !== null) {
        e.preventDefault();
      }
      const canvas = canvasRefs.current[activePage];
      if (!canvas) return;
    
      // CSS-space pointer; can be negative when moving outside left/top
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      const cssX = clientX - rect.left;
      const cssY = clientY - rect.top;
    
      const ctx = canvas.getContext('2d');
    
// === TEXTBOX RESIZING ===
if (isResizing && textBox) {
  const newWidth  = Math.max(50, cssX - textBox.x);
  const newHeight = Math.max(20, cssY - textBox.y);

  const sourceText = (textBox.rawText ?? textBox.text ?? "").toString();
  const requestedPadding = textBox.boxPadding ?? 10;

  // If baseWidth/baseHeight are missing, capture them once (from PRE-resize box)
  const baseWidth  = textBox.baseWidth  ?? textBox.width;
  const baseHeight = textBox.baseHeight ?? textBox.height;

  const tempBox = {
    ...textBox,
    width: newWidth,
    height: newHeight,
    baseWidth,
    baseHeight,
    hasScaled: true, // ✅ enable scaling as soon as resize begins
  };

  const targetFont = computeScaledTargetFont(tempBox);

  ctx.font = `${targetFont}px Lato`;

  const layout = wrapTextPreservingNewlinesResponsive(
    sourceText,
    ctx,
    newWidth,
    newHeight,
    targetFont,
    requestedPadding,
    tempBox.minFontSize ?? 6,
    "Lato",
    4
  );

  setTextBox({
    ...tempBox,
    rawText: sourceText,
    text: layout.lines.join("\n"),
    fontSize: layout.fontSize,
    boxPadding: layout.padding ?? requestedPadding,
  });
  return;
}


      // === SELECTION RECTANGLE (live preview) ===
      if (isSelecting && selectionStart) {
        setSelectionEnd({ x: cssX, y: cssY });

        const rectSel = {
          x: Math.min(selectionStart.x, cssX),
          y: Math.min(selectionStart.y, cssY),
          w: Math.abs(cssX - selectionStart.x),
          h: Math.abs(cssY - selectionStart.y),
        };

        const selected = [];
        for (let i = 0; i < textItems.length; i++) {
          const it = textItems[i];
          if (it.index !== activePage) continue;
          const L = resolveTextLayoutForHit(it, ctx, canvas);
          const b = L.box;

          const intersects =
            b.x < rectSel.x + rectSel.w &&
            b.x + b.w > rectSel.x &&
            b.y < rectSel.y + rectSel.h &&
            b.y + b.h > rectSel.y;

          if (intersects) selected.push(i);
        }

        setSelectedTextIndexes(selected);

        // Also check for shapes in selection rectangle (real-time)
        const selectedShapes = [];
        if (shapeItems && shapeItems.length > 0) {
          for (let i = 0; i < shapeItems.length; i++) {
            const shape = shapeItems[i];
            if (shape.index !== activePage) continue;

            const shapeX = shape.xNorm != null ? shape.xNorm * rect.width : shape.x;
            const shapeY = shape.yNormTop != null ? shape.yNormTop * rect.height : shape.y;
            const shapeW = shape.widthNorm != null ? shape.widthNorm * rect.width : shape.width;
            const shapeH = shape.heightNorm != null ? shape.heightNorm * rect.height : shape.height;

            const shapeBounds = { x: shapeX, y: shapeY, w: shapeW, h: shapeH };

            const intersects =
              shapeBounds.x < rectSel.x + rectSel.w &&
              shapeBounds.x + shapeBounds.w > rectSel.x &&
              shapeBounds.y < rectSel.y + rectSel.h &&
              shapeBounds.y + shapeBounds.h > rectSel.y;

            if (intersects) {
              selectedShapes.push(i);
            }
          }
        }

        if (selectedShapes.length > 0) {
          setSelectedShapeIndexes(selectedShapes);
          setSelectedShapeIndex(selectedShapes[selectedShapes.length - 1]);
        } else {
          setSelectedShapeIndexes([]);
          setSelectedShapeIndex(null);
        }

        // Also check for form fields in selection rectangle (real-time)
        const { formFields, setSelectedFormFieldIndexes, setSelectedFormFieldIndex } = opts;
        if (formFields && setSelectedFormFieldIndexes) {
          const selectedFields = [];
          for (let i = 0; i < formFields.length; i++) {
            const field = formFields[i];
            if (field.index !== activePage) continue;

            const fieldX = field.xNorm != null ? field.xNorm * rect.width : field.x;
            const fieldY = field.yNormTop != null ? field.yNormTop * rect.height : field.y;
            const fieldW = field.widthNorm != null ? field.widthNorm * rect.width : field.width;
            const fieldH = field.heightNorm != null ? field.heightNorm * rect.height : field.height;

            const fieldBounds = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };

            const intersects =
              fieldBounds.x < rectSel.x + rectSel.w &&
              fieldBounds.x + fieldBounds.w > rectSel.x &&
              fieldBounds.y < rectSel.y + rectSel.h &&
              fieldBounds.y + fieldBounds.h > rectSel.y;

            if (intersects) {
              selectedFields.push(i);
            }
          }

          if (selectedFields.length > 0) {
            setSelectedFormFieldIndexes(selectedFields);
            setSelectedFormFieldIndex?.(selectedFields[selectedFields.length - 1]);
          } else {
            setSelectedFormFieldIndexes([]);
            setSelectedFormFieldIndex?.(null);
          }
        }

        drawCanvas(activePage);
        return;
      }
    
      // === IMAGE RESIZING ===
      if (resizingImageIndex !== null) {
        const updated = [...imageItems];
        const item = updated[resizingImageIndex];
        if (!item || item.index !== activePage) return;

        const startX = resizeStart?.startX ?? item.x;
        const startY = resizeStart?.startY ?? item.y;
        const startW = resizeStart?.startW ?? item.width;
        const startH = resizeStart?.startH ?? item.height;
        const ratio  = resizeStart?.ratio  ?? ((startW > 0 && startH > 0) ? startW / startH : 1);
        const handle = resizeStart?.handle ?? 'bottom-right';

        const totalDX = cssX - (resizeStart?.x ?? cssX);
        const totalDY = cssY - (resizeStart?.y ?? cssY);

        let newX = startX;
        let newY = startY;
        let newW = startW;
        let newH = startH;

        // Resize based on which handle is being dragged
        const isDraggingLeft = handle.includes('left');
        const isDraggingTop = handle.includes('top');

        if (isDraggingLeft) {
          newX = startX + totalDX;
          newW = startW - totalDX;
        } else {
          newW = startW + totalDX;
        }

        if (isDraggingTop) {
          newY = startY + totalDY;
          newH = startH - totalDY;
        } else {
          newH = startH + totalDY;
        }

        // Maintain aspect ratio if shift is held
        if (e.shiftKey && ratio > 0) {
          if (Math.abs(totalDX) >= Math.abs(totalDY)) {
            const targetW = isDraggingLeft ? startW - totalDX : startW + totalDX;
            newW = targetW;
            newH = newW / ratio;
            if (isDraggingTop) {
              newY = startY + startH - newH;
            }
          } else {
            const targetH = isDraggingTop ? startH - totalDY : startH + totalDY;
            newH = targetH;
            newW = newH * ratio;
            if (isDraggingLeft) {
              newX = startX + startW - newW;
            }
          }
        }

        // Enforce minimum size and adjust position to keep opposite edge fixed
        const minSize = 10;
        if (newW < minSize) {
          if (isDraggingLeft) {
            newX = startX + startW - minSize;
          }
          newW = minSize;
        }
        if (newH < minSize) {
          if (isDraggingTop) {
            newY = startY + startH - minSize;
          }
          newH = minSize;
        }

        item.x = newX;
        item.y = newY;
        item.width  = newW;
        item.height = newH;

        // normalized (UNCLAMPED)
        item.xNorm = rect.width ? (newX / rect.width) : 0;
        item.yNormTop = rect.height ? (newY / rect.height) : 0;
        item.widthNorm  = rect.width  ? (newW / rect.width)  : 0;
        item.heightNorm = rect.height ? (newH / rect.height) : 0;

        setImageItems(updated);
        // Skip updatePageItems during resize - let sync effect handle it when interaction ends
        // Skip saveImageItemsToIndexedDB during resize for performance - save on mouseUp
        drawCanvas(activePage);
        return;
      }

      // === IMAGE DRAGGING (or potential drag) ===
      // Check for potential drag: draggedImageIndex is set but isImageDragging may not be yet
      if (draggedImageIndex !== null && dragStart) {
        const updated = [...imageItems];
        const item = updated[draggedImageIndex];
        if (!item || item.index !== activePage) return;

        // Calculate movement distance
        const moveDX = Math.abs(cssX - dragStart.x);
        const moveDY = Math.abs(cssY - dragStart.y);
        const DRAG_THRESHOLD = 3; // pixels

        // Only set isImageDragging when actual movement beyond threshold occurs
        if (!isImageDragging && (moveDX > DRAG_THRESHOLD || moveDY > DRAG_THRESHOLD)) {
          setIsImageDragging(true);
        }

        // Only update position if we're actually dragging (beyond threshold)
        if (isImageDragging || moveDX > DRAG_THRESHOLD || moveDY > DRAG_THRESHOLD) {
          const grabDX = dragStart?.grabDX ?? 0;
          const grabDY = dragStart?.grabDY ?? 0;

          const newX = cssX - grabDX; // can be negative
          const newY = cssY - grabDY;

          item.x = newX;
          item.y = newY;

          // UNCLAMPED normalized
          item.xNorm    = rect.width  ? (newX / rect.width)  : 0;
          item.yNormTop = rect.height ? (newY / rect.height) : 0;

          setImageItems(updated);
          // Skip updatePageItems during drag - let sync effect handle it when interaction ends
          // Skip saveImageItemsToIndexedDB during drag for performance - save on mouseUp
          drawCanvas(activePage);
        }
        return;
      }

      // === MIXED-ITEM DRAGGING (Text + Shapes + FormFields) ===
      if (isDraggingMixedItems && dragStart && initialMixedItemPositions && initialMixedItemPositions.length > 0) {
        const dx = cssX - dragStart.x;
        const dy = cssY - dragStart.y;

        const updatedText = [...textItems];
        const { formFields, updateFormField } = opts;

        // Update all mixed items (text, shapes, and form fields)
        initialMixedItemPositions.forEach((pos:any) => {
          if (pos.type === 'text') {
            const item = updatedText[pos.index];
            if (item && item.index === activePage) {
              const newX = pos.xTop + dx;
              const newY = pos.yTop + dy;

              item.x = newX;
              item.y = newY;
              item.anchor = "top";

              item.xNorm = rect.width ? (newX / rect.width) : 0;
              item.yNormTop = rect.height ? (newY / rect.height) : 0;
            }
          } else if (pos.type === 'shape') {
            const shape = shapeItems[pos.index];
            if (shape && shape.index === activePage) {
              const newX = pos.x + dx;
              const newY = pos.y + dy;

              const updates: any = {
                x: newX,
                y: newY,
                xNorm: newX / rect.width,
                yNormTop: newY / rect.height,
              };

              // For freehand shapes, also update the points array
              if (shape.type === "freehand" && pos.points) {
                const dxNorm = dx / rect.width;
                const dyNorm = dy / rect.height;

                updates.points = pos.points.map((point: any) => ({
                  x: point.x + dxNorm,
                  y: point.y + dyNorm,
                }));
              }

              // Use updateShape (same as multi-shape dragging) to avoid page sync conflicts
              updateShape(pos.index, updates);
            }
          } else if (pos.type === 'formField' && formFields && updateFormField) {
            const field = formFields[pos.index];
            if (field && field.index === activePage) {
              const newX = pos.x + dx;
              const newY = pos.y + dy;

              updateFormField(pos.index, {
                x: newX,
                y: newY,
                xNorm: newX / rect.width,
                yNormTop: newY / rect.height,
              });
            }
          }
        });

        // Save text items (but DON'T update pages during drag to avoid triggering sync)
        setTextItems(updatedText);
        // Skip updatePageItems during drag - it will sync automatically when drag ends
        // saveTextItemsToIndexedDB(updatedText); // Also skip DB save during drag for performance

        // Shapes are already updated via updateShape calls (same pattern as multi-shape dragging)
        // Form fields are updated via updateFormField calls
        // Use requestCanvasDraw to defer redraw to next animation frame
        // This ensures shapes have been updated before redrawing
        requestCanvasDraw();
        return;
      }

      // === TEXT DRAGGING ===
      if (isDragging && dragStart && initialPositions.length > 0) {
        const dx = cssX - dragStart.x;
        const dy = cssY - dragStart.y;
    
        const updated = [...textItems];
    
        // Multiple selection
        if (selectedTextIndexes.length > 1 && initialPositions.length === selectedTextIndexes.length) {
          initialPositions.forEach((pos:any) => {
            const item = updated[pos.index];
            if (item && item.index === activePage) {
              const newX = pos.xTop + dx;
              const newY = pos.yTop + dy;

              item.x = newX;
              item.y = newY;
              item.anchor = "top";

              item.xNorm    = rect.width  ? (newX / rect.width)  : 0; // NO clamp
              item.yNormTop = rect.height ? (newY / rect.height) : 0; // NO clamp
            }
          });

          setTextItems(updated);
          // Skip updatePageItems and saveTextItemsToIndexedDB during drag for performance
          // These will be called on mouseUp
          drawCanvas(activePage);
          return;
        }
    
        // Single selection (+ full-edge snapping: left/right/top/bottom)
if (selectedTextIndexes.length === 1 && initialPositions.length === 1) {
  const selIdx = selectedTextIndexes[0];
  const item   = updated[selIdx];
  const init   = initialPositions[0];
  if (!item || item.index !== activePage) return;

  // Proposed new text origin before snapping
  // init.xTop is xOrigin (text origin), not visual left edge
  let newX = init.xTop + dx;
  let newY = init.yTop + dy;

  // Get metrics for the dragged item at its *current* (pre-drag) state
  // We'll derive constant offsets from text origin → box edges, then
  // reuse those offsets to compute the dragged box at (newX, newY).
  const Lself = resolveTextLayoutForHit(item, ctx, canvas);
  const selfBox = Lself.box; // {x,y,w,h} – visual bounding box

  // Offsets from text origin (xOrigin, topY) to the box's top-left corner
  // selfBox.x is visual left edge, xOrigin is text origin
  // For glyphs like "j", selfBox.x < xOrigin (offset is negative)
  const offsetBx = selfBox.x - Lself.xOrigin;  // = -xOffset (visual left edge - origin)
  const offsetBy = selfBox.y - Lself.topY;     // = 0 (box top = topY)

  // Given a tentative (newXOrigin, newY), compute the dragged box edges
  const computeDraggedBox = (XOrigin:any, Y:any) => {
    const left   = XOrigin + offsetBx;  // visual left edge
    const top    = Y + offsetBy;
    const right  = left + selfBox.w;
    const bottom = top  + selfBox.h;
    return { left, top, right, bottom };
  };

  // Only apply text-to-text snapping when snap is enabled
  if (snapEnabled !== false) {
    const dragged0 = computeDraggedBox(newX, newY);

    // Snap threshold in CSS px
    const SNAP = 4;

    // We'll track the best snap per axis independently
    let bestDX = Infinity;
    let bestDY = Infinity;
    let snapX  = null;
    let snapY  = null;

    // Check against every *other* text item on the same page
    for (let i = 0; i < textItems.length; i++) {
      if (i === selIdx) continue;
      const other = textItems[i];
      if (other.index !== activePage) continue;

      const Lother   = resolveTextLayoutForHit(other, ctx, canvas);
      const otherBox = Lother.box; // same padded/tight box as used in drawing/hit

      // Other edges
      const oLeft   = otherBox.x;
      const oRight  = otherBox.x + otherBox.w;
      const oTop    = otherBox.y;
      const oBottom = otherBox.y + otherBox.h;

      // Current dragged edges
      const dLeft   = dragged0.left;
      const dRight  = dragged0.right;
      const dTop    = dragged0.top;
      const dBottom = dragged0.bottom;

      // --- X-axis snapping candidates ---
      // Snap left↔left
      {
        const dxCandidate = oLeft - dLeft;
        const abs = Math.abs(dxCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDX)) { bestDX = dxCandidate; snapX = newX + dxCandidate; }
      }
      // Snap left↔right
      {
        const dxCandidate = oRight - dLeft;
        const abs = Math.abs(dxCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDX)) { bestDX = dxCandidate; snapX = newX + dxCandidate; }
      }
      // Snap right↔left
      {
        const dxCandidate = oLeft - dRight;
        const abs = Math.abs(dxCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDX)) { bestDX = dxCandidate; snapX = newX + dxCandidate; }
      }
      // Snap right↔right
      {
        const dxCandidate = oRight - dRight;
        const abs = Math.abs(dxCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDX)) { bestDX = dxCandidate; snapX = newX + dxCandidate; }
      }

      // --- Y-axis snapping candidates ---
      // Snap top↔top
      {
        const dyCandidate = oTop - dTop;
        const abs = Math.abs(dyCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDY)) { bestDY = dyCandidate; snapY = newY + dyCandidate; }
      }
      // Snap top↔bottom
      {
        const dyCandidate = oBottom - dTop;
        const abs = Math.abs(dyCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDY)) { bestDY = dyCandidate; snapY = newY + dyCandidate; }
      }
      // Snap bottom↔top
      {
        const dyCandidate = oTop - dBottom;
        const abs = Math.abs(dyCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDY)) { bestDY = dyCandidate; snapY = newY + dyCandidate; }
      }
      // Snap bottom↔bottom
      {
        const dyCandidate = oBottom - dBottom;
        const abs = Math.abs(dyCandidate);
        if (abs <= SNAP && abs < Math.abs(bestDY)) { bestDY = dyCandidate; snapY = newY + dyCandidate; }
      }
    }

    // Apply best snap per axis (if any)
    if (snapX !== null) newX = snapX;
    if (snapY !== null) newY = snapY;
  }

  // Commit
  item.x = newX;
  item.y = newY;
  item.anchor = "top";

  item.xNorm    = rect.width  ? (newX / rect.width)  : 0; // NO clamp
  item.yNormTop = rect.height ? (newY / rect.height) : 0; // NO clamp

  setTextItems(updated);
  // Skip updatePageItems and saveTextItemsToIndexedDB during drag for performance
  // These will be called on mouseUp
  drawCanvas(activePage);
  return;
}
    
        // Fallback: move all selected by delta
        selectedTextIndexes.forEach((idx:any) => {
          const it = updated[idx];
          const init = initialPositions.find((p:any) => p.index === idx);
          if (it && init && it.index === activePage) {
            const newX = init.xTop + dx;
            const newY = init.yTop + dy;
            it.x = newX;
            it.y = newY;
            it.anchor = "top";
            it.xNorm    = rect.width  ? (newX / rect.width)  : 0; // NO clamp
            it.yNormTop = rect.height ? (newY / rect.height) : 0; // NO clamp
          }
        });

        setTextItems(updated);
        // Skip updatePageItems and saveTextItemsToIndexedDB during drag for performance
        // These will be called on mouseUp
        drawCanvas(activePage);
      }
    };



    const handleMouseUp = (e:any, opts:any) => {
      const {
        canvasRefs,
        activePage,
        editingIndex,
        textItems,
        shapeItems,
        imageItems,
        resolveTextLayoutForHit,
        setSelectedTextIndexes,
        setSelectedShapeIndexes,
        setSelectedShapeIndex,
        textBox,
        setSelectionEnd,
        selectionEnd,
        isResizing,
        setTextBox,
        drawCanvas,
        isSelecting,
        selectionStart,
        resizingImageIndex,
        isImageDragging,
        draggedImageIndex,
        isDragging,
        isDraggingMixedItems,
        setIsResizing,
        setIsDragging,
        setIsDraggingMixedItems,
        setInitialPositions,
        setInitialMixedItemPositions,
        setDragStart,
        pushSnapshotToUndo,
        setResizingImageIndex,
        setIsImageDragging,
        setDraggedImageIndex,
        setIsTextSelected,
        setSelectedTextIndex,
        isTextBoxEditEnabled,
        setIsSelecting,
        setShouldClearSelectionBox,
        setSelectionStart,
        updatePageItems,
        saveTextItemsToIndexedDB,
        saveImageItemsToIndexedDB,
        pageList,
        setPages,
        history
      } = opts;

      if (editingIndex !== null) {
        e.preventDefault();
      }
      const canvas = canvasRefs.current[activePage];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();

      const selX0 = Math.min(selectionStart?.x || 0, selectionEnd?.x || 0);
      const selY0 = Math.min(selectionStart?.y || 0, selectionEnd?.y || 0);
      const selW  = Math.abs((selectionEnd?.x || 0) - (selectionStart?.x || 0));
      const selH  = Math.abs((selectionEnd?.y || 0) - (selectionStart?.y || 0));
      const selectionRect = { x: selX0, y: selY0, width: selW, height: selH };
    
      const getCanvasPoint = (evt:any, el:any) => {
        const r = el.getBoundingClientRect();
        return { x: evt.clientX - r.left, y: evt.clientY - r.top };
      };
    
      if (isResizing){
        setIsResizing(false);
        setTextBox((tb:any) => tb ? ({
          ...tb,
          resizeBaseWidth: undefined,
          resizeBaseHeight: undefined,
          resizeBaseFontSize: undefined,
        }) : tb);
      }
    
     // Track if we were dragging before clearing state
  const wasDragging = isDragging || isDraggingMixedItems;

  if (isDragging) {
    // Save text items to IndexedDB and sync to pages (skipped during drag for performance)
    updatePageItems('textItems', textItems.filter((t:any) => t.index === activePage));
    saveTextItemsToIndexedDB(textItems);

    setIsDragging(false);
    setInitialPositions([]);
    setDragStart({ x: 0, y: 0 });
    // Snapshot was already pushed in mouseDown before drag started
  }

  if (isDraggingMixedItems) {
    // CRITICAL: Manually sync text, shapes, AND formFields to pages at once
    // This prevents the race condition where pages→items sync runs before items→pages
    // Build updated pages with all item types
    const { formFields } = opts;
    const updatedPages = pageList.map((page:any, pageIndex:any) => {
      if (pageIndex !== activePage) return page;

      // Update text items for this page
      const pageTextItems = textItems.filter((t:any) => t.index === pageIndex).map(({...item }) => item);

      // Update shapes for this page
      const pageShapes = shapeItems.filter((s:any) => s.index === pageIndex).map(({ ...shape }) => shape);

      // Update form fields for this page
      const pageFormFields = (formFields || []).filter((f:any) => f.index === pageIndex).map(({ ...field }) => field);

      return {
        ...page,
        textItems: pageTextItems,
        shapes: pageShapes,
        formFields: pageFormFields
      };
    });

    // Set pages once with all updated data
    setPages(updatedPages);
    saveTextItemsToIndexedDB(textItems);

    // Clear mixed-item dragging state
    setIsDraggingMixedItems(false);
    setInitialMixedItemPositions([]);
    setDragStart({ x: 0, y: 0 });

    // Snapshot was already pushed in mouseDown before drag started

    // CRITICAL: Defer canvas redraw to next frame to ensure React state has updated
    // Otherwise canvas draws with old drag state still active (items follow cursor)
    requestAnimationFrame(() => {
      drawCanvas(activePage);
    });
  }

  if (resizingImageIndex !== null) {
    // Save to IndexedDB when resize ends (we skipped this during resize for performance)
    saveImageItemsToIndexedDB?.(imageItems);
    setResizingImageIndex(null);
    pushSnapshotToUndo(activePage);
  }

  // Handle image interaction end (either actual drag or just a click)
  if (draggedImageIndex !== null) {
    if (isImageDragging) {
      // Actual drag occurred - save and push to undo
      saveImageItemsToIndexedDB?.(imageItems);
      pushSnapshotToUndo(activePage);
      setIsImageDragging(false);
    }
    // Always clear draggedImageIndex and dragStart when mouseUp
    setDraggedImageIndex(null);
    setDragStart({ x: 0, y: 0 });
  }

      if (isSelecting) {
        // Check if this was an actual drag (selection rectangle has size)
        // vs just a click (no rectangle)
        const hasSelectionArea = selectionRect.width > 2 || selectionRect.height > 2;

        const selectedIndexes = [];
        const updatedInitials = [];
    
        for (let i = 0; i < textItems.length; i++) {
          const item = textItems[i];
          if (item.index !== activePage) continue;
    
          const L = resolveTextLayoutForHit(item, ctx, canvas);
          const b = L.box;
    
          const intersects =
            selectionRect.x < b.x + b.w &&
            selectionRect.x + selectionRect.width > b.x &&
            selectionRect.y < b.y + b.h &&
            selectionRect.y + selectionRect.height > b.y;
    
          if (intersects) {
            selectedIndexes.push(i);
            updatedInitials.push({ index: i, xTop: L.xOrigin, yTop: L.topY, activePage });
          }
        }
    
        if (selectedIndexes.length > 0) {
          setSelectedTextIndexes(selectedIndexes);
          setInitialPositions(updatedInitials);
          setIsTextSelected(true);
        } else {
          setSelectedTextIndexes([]);
          setSelectedTextIndex(null);
          setIsTextSelected(false);
        }

        // Also check for shapes in selection rectangle
        const selectedShapeIndexes = [];
        if (shapeItems && shapeItems.length > 0) {
          for (let i = 0; i < shapeItems.length; i++) {
            const shape = shapeItems[i];
            if (shape.index !== activePage) continue;

            const shapeX = shape.xNorm != null ? shape.xNorm * rect.width : shape.x;
            const shapeY = shape.yNormTop != null ? shape.yNormTop * rect.height : shape.y;
            const shapeW = shape.widthNorm != null ? shape.widthNorm * rect.width : shape.width;
            const shapeH = shape.heightNorm != null ? shape.heightNorm * rect.height : shape.height;

            const shapeBounds = { x: shapeX, y: shapeY, width: shapeW, height: shapeH };

            const intersects =
              selectionRect.x < shapeBounds.x + shapeBounds.width &&
              selectionRect.x + selectionRect.width > shapeBounds.x &&
              selectionRect.y < shapeBounds.y + shapeBounds.height &&
              selectionRect.y + selectionRect.height > shapeBounds.y;

            if (intersects) {
              selectedShapeIndexes.push(i);
            }
          }
        }

        if (selectedShapeIndexes.length > 0) {
          setSelectedShapeIndexes(selectedShapeIndexes);
          // Also set the single selection to the last selected shape for compatibility
          setSelectedShapeIndex(selectedShapeIndexes[selectedShapeIndexes.length - 1]);
        } else {
          setSelectedShapeIndexes([]);
          setSelectedShapeIndex(null);
        }

        // Also check for form fields in selection rectangle
        const { formFields, setSelectedFormFieldIndexes, setSelectedFormFieldIndex } = opts;
        if (formFields && setSelectedFormFieldIndexes) {
          const selectedFormFieldIdxs = [];
          for (let i = 0; i < formFields.length; i++) {
            const field = formFields[i];
            if (field.index !== activePage) continue;

            const fieldX = field.xNorm != null ? field.xNorm * rect.width : field.x;
            const fieldY = field.yNormTop != null ? field.yNormTop * rect.height : field.y;
            const fieldW = field.widthNorm != null ? field.widthNorm * rect.width : field.width;
            const fieldH = field.heightNorm != null ? field.heightNorm * rect.height : field.height;

            const fieldBounds = { x: fieldX, y: fieldY, width: fieldW, height: fieldH };

            const intersects =
              selectionRect.x < fieldBounds.x + fieldBounds.width &&
              selectionRect.x + selectionRect.width > fieldBounds.x &&
              selectionRect.y < fieldBounds.y + fieldBounds.height &&
              selectionRect.y + selectionRect.height > fieldBounds.y;

            if (intersects) {
              selectedFormFieldIdxs.push(i);
            }
          }

          if (selectedFormFieldIdxs.length > 0) {
            setSelectedFormFieldIndexes(selectedFormFieldIdxs);
            setSelectedFormFieldIndex?.(selectedFormFieldIdxs[selectedFormFieldIdxs.length - 1]);
          } else {
            setSelectedFormFieldIndexes([]);
            setSelectedFormFieldIndex?.(null);
          }
        }

        if (isTextBoxEditEnabled && !textBox && selectionStart && selectionEnd) {
          const startX = selectionStart.x;
          const startY = selectionStart.y;
          const endX   = selectionEnd.x;
          const endY   = selectionEnd.y;

          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);
          const width  = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          setTextBox({
            x,
            y,
            width,
            height,
            text: "",
            baseFontSize: 20,
            baseWidth: width,
            baseHeight: height,
            minFontSize: 6,
            maxFontSize: 80,
            hasScaled: false
          });
        }

        // Clear selection state
        setIsSelecting(false);
        setShouldClearSelectionBox(true);

        // If no actual selection area, treat as a click (will be handled in the else block below)
        if (!hasSelectionArea) {
          // Don't process as selection, fall through to click handling
          // Clear the flag so the else block processes it
          return; // Exit early, let it be processed as a simple click
        }
      } else if (!wasDragging) {
        // --- SINGLE-ITEM PICK on click/tap ---
        // Only run this if we weren't dragging (i.e., didn't already select in handleMouseDown)
        const pt = getCanvasPoint(e, canvas); // <- use event coordinates, not selectionStart/End

        const pointInRect = (px:any, py:any, r:any) =>
          px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

        let pickedIdx = null;
        let bestScore = Infinity;

        // Calculate a "selection score" for each text item
        // Lower score = better match (should be selected)
        for (let i = 0; i < textItems.length; i++) {
          const item = textItems[i];
          if (item.index !== activePage) continue;

          const L = resolveTextLayoutForHit(item, ctx, canvas);
          const b = L.box; // {x,y,w,h} – tight glyph bbox

          const isInside = pointInRect(pt.x, pt.y, b);

          let score;
          if (isInside) {
            // Cursor is inside this box
            // Score = distance to center (smaller = cursor is more centered in the item)
            const centerX = b.x + b.w / 2;
            const centerY = b.y + b.h / 2;
            score = Math.hypot(pt.x - centerX, pt.y - centerY);
          } else {
            // Cursor is outside this box
            // Score = distance to nearest edge + large penalty
            const dx = pt.x < b.x ? b.x - pt.x : pt.x > b.x + b.w ? pt.x - (b.x + b.w) : 0;
            const dy = pt.y < b.y ? b.y - pt.y : pt.y > b.y + b.h ? pt.y - (b.y + b.h) : 0;
            const edgeDist = Math.hypot(dx, dy);

            // Add a large penalty so items containing the cursor are always preferred
            score = edgeDist + 10000;
          }

          // Pick the item with the lowest score
          if (score < bestScore) {
            bestScore = score;
            pickedIdx = i;
          }
        }

        // Only select if cursor is INSIDE the bounding box (score < 10000)
        // This ensures hit detection matches the visual bounding box exactly
        if (pickedIdx !== null && bestScore >= 10000) {
          // Click was outside the visual bounding box, don't select
          pickedIdx = null;
        }
    
        if (pickedIdx !== null) {
          // Select exactly one item (use GLOBAL index, not page index)
          // Clear shape selections when selecting text
          setSelectedShapeIndex?.(null);
          setSelectedShapeIndexes?.([]);

          setSelectedTextIndexes([pickedIdx]);
          setSelectedTextIndex(pickedIdx);
          setIsTextSelected(true);

          const Lbest = resolveTextLayoutForHit(textItems[pickedIdx], ctx, canvas);
          setInitialPositions([{ index: pickedIdx, xTop: Lbest.xOrigin, yTop: Lbest.topY, activePage }]);
        } else {
          // Clicked empty space: clear selection
          setSelectedTextIndexes([]);
          setSelectedTextIndex(null);
          setIsTextSelected(false);
        }
      }

      setSelectionStart(null);
      setSelectionEnd(null);

      // Defer final canvas redraw to ensure all state updates have been processed
      // This prevents items from appearing to follow the cursor after mouse up
      requestAnimationFrame(() => {
        drawCanvas(activePage);
      });
    };











  const handleCanvasMouseDownMl = (e:any, opts:any) => {
    const {
      isMultilineMode,
      activePage,
      canvasRefs,
      layoutMultiline,
      mlConfig,
      mlText,
      setMlCaret,
      setMlAnchor,
      setMlPreferredX,
      setIsMlDragging
    } = opts;
    if (!isMultilineMode) return false; // let your normal handlers run
    const canvas = canvasRefs.current[activePage];
    if (!canvas) return true;

    const rect = canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;

    const ctx = canvas.getContext("2d");
    const m = pdfToCssMargins(rect, mlConfig.marginsPDF);
    const layout = layoutMultiline(ctx, mlText, {
      x: m.left, y: m.top,
      maxWidth: rect.width - (m.left + m.right),
      maxHeight: rect.height - (m.top + m.bottom),
      fontSize: mlConfig.fontSize,
      fontFamily: mlConfig.fontFamily,
      lineGap: mlConfig.lineGap
    });

    const idx = hitTestToIndex(x, y, layout);

    if (e.shiftKey) {
      // extend selection
      setMlCaret(idx);
      // keep anchor
    } else {
      setMlCaret(idx);
      setMlAnchor(idx);
    }
    setMlPreferredX(indexToXY(idx, layout).x);
    setIsMlDragging(true);
    return true; // consumed
};















const handleCanvasMouseMoveMl = (e:any, opts:any) => {
  const {
    isMultilineMode,
    isMlDragging,
    canvasRefs,
    activePage,
    mlConfig,
    layoutMultiline,
    mlText,
    setMlCaret,

   } = opts;
  if (!isMultilineMode || !isMlDragging) return false;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return true;

  const rect = canvas.getBoundingClientRect();
  const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
  const y = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;

  const ctx = canvas.getContext("2d");
  const m = pdfToCssMargins(rect, mlConfig.marginsPDF);
  const layout = layoutMultiline(ctx, mlText, {
    x: m.left, y: m.top,
    maxWidth: rect.width - (m.left + m.right),
    maxHeight: rect.height - (m.top + m.bottom),
    fontSize: mlConfig.fontSize,
    fontFamily: mlConfig.fontFamily,
    lineGap: mlConfig.lineGap
  });

  const idx = hitTestToIndex(x, y, layout);
  setMlCaret(idx);
  return true;
};

const handleCanvasMouseUpMl = (e:any, opts:any) => {
  const { isMultilineMode, setIsMlDragging} = opts;
  if (!isMultilineMode) return false;
  setIsMlDragging(false);
  return true;
};








// returns { lines: [{text,x,y}], lineHeight, clipped:boolean }
function wrapParagraphsToWidth(ctx:any, text:any, {
  x, y, maxWidth, fontSize, fontFamily, lineGap = 0, maxHeight = Infinity
}:any) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px ${fontFamily}`;

  // robust line height from tight metrics
  const probe = ctx.measureText("Mg");
  const ascent  = probe.actualBoundingBoxAscent;
  const descent = probe.actualBoundingBoxDescent
  const lineHeight = Math.ceil(ascent + descent + lineGap);

  const out:any = [];
  let cursorY = y;
  let clipped = false;

  const paragraphs = String(text ?? "").split("\n");

  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p];
    // collapse multiple spaces visually but keep a single space for wrapping
    // (optional: remove this if you want literal spaces)
    const words = para.split(" ");

    let current = "";

    const pushLine = (s:any) => {
      if (cursorY + lineHeight > y + maxHeight) { clipped = true; return false; }
      out.push({ text: s, x: Math.round(x), y: Math.round(cursorY) });
      cursorY += lineHeight;
      return true;
    };

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const next = current ? current + " " + word : word;

      const wordWidth = ctx.measureText(word).width;
      const nextWidth = ctx.measureText(next).width;

      if (wordWidth > maxWidth) {
        // break the long word by characters
        if (current) { if (!pushLine(current)) return { lines: out, lineHeight, clipped }; current = ""; }
        let chunk = "";
        for (let i = 0; i < word.length; i++) {
          const tryChunk = chunk + word[i];
          const cW = ctx.measureText(tryChunk).width;
          if (cW > maxWidth && chunk) {
            if (!pushLine(chunk)) return { lines: out, lineHeight, clipped: true };
            chunk = word[i];
          } else {
            chunk = tryChunk;
          }
        }
        current = chunk; // leftover continues on this line
      } else if (nextWidth > maxWidth && current) {
        if (!pushLine(current)) return { lines: out, lineHeight, clipped: true };
        current = word;
      } else {
        current = next;
      }

      if (w === words.length - 1) {
        if (!pushLine(current)) return { lines: out, lineHeight, clipped: true };
        current = "";
      }
    }

    // blank line (paragraph break)
    if (para === "") {
      // if (!pushLine("")) return { lines: out, lineHeight, clipped: true };
    }
  }

  return { lines: out, lineHeight, clipped };
}



  

const addTextToCanvasMlMode = (opts:any) => {
    const {
    canvasRefs,
    activePage,
    mlConfig,
    mlText,
    newFontSize,
    pushSnapshotToUndo,
    setPages,
    setTextItems,
    textItems
  } = opts;


  const canvas = canvasRefs.current[activePage];
  if (!canvas) return;

  const ctx = canvasRefs.current[activePage].getContext('2d');










  const rect = canvasRefs.current[activePage].getBoundingClientRect();

  // convert PDF margins to CSS px
  const m = pdfToCssMargins(rect, mlConfig.marginsPDF);

  // layout zone
  const x = m.left;
  const y = m.top;
  const maxWidth  = Math.max(0, rect.width  - (m.left + m.right));
  const maxHeight = Math.max(0, rect.height - (m.top  + m.bottom));



  let { lines } = wrapParagraphsToWidth(ctx, mlText, {
    x, y,
    maxWidth,
    maxHeight,
    fontSize: mlConfig.fontSize,
    fontFamily: mlConfig.fontFamily,
    lineGap: mlConfig.lineGap,
  });


  const padding = newFontSize * 0.2;
lines = lines
  .filter((line: any) => line.text.length > 0) // keep only lines with text
  .map((line: any) => ({
    index: activePage,
    x: line.x,
    y: line.y,
    anchor: 'top',
    padding: padding,
    fontFamily: 'Lato',
    fontSize: 20,
    text: line.text
  }));

  // Snapshot BEFORE state change for undo
  pushSnapshotToUndo(activePage);

  // Sync into the pages slice so persistence/refresh works
  setPages((prev:any) => {
    const next = [...prev];
    const page = next[activePage] || { textItems: [], imageItems: [] };
    next[activePage] = {
      ...page,
      textItems: [...(page.textItems || []), ...lines], // spread preserves xNorm/yNormTop
    };
    return next;
  });

  const updatedItems = [...textItems, ...lines];
  setTextItems(updatedItems);
  
  // force refresh
  //return window.location.reload();
}


const handleDoubleClick = (e: MouseEvent, opts: any) => {
  const {
    canvasRefs,
    activePage,
    textItems,
    setIsEditing,
    setEditingText,
    setEditingFontSize,
    setEditingColor,
    setEditingFont,
    setEditingIndex
  } = opts;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return;

  function toCssFromBacking(canvas: HTMLCanvasElement, { offsetX, offsetY }: { offsetX: number; offsetY: number }) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: offsetX / sx, y: offsetY / sy };
  }

  // Your getMousePosOnCanvas returns backing-store coords; convert to CSS units.
  const backing = getMousePosOnCanvas(e, canvas); // { offsetX, offsetY } in backing px
  const { x: mx, y: my } = toCssFromBacking(canvas, backing); // CSS px

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use distance-based selection to find the nearest text item
  // Uses actual visual bounding box (no padding, actualBoundingBoxLeft/Right)
  let bestIndex: number | null = null;
  let bestScore = Infinity;

  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = rect.height;

  for (let index = 0; index < textItems.length; index++) {
    const item = textItems[index];
    if (item.index !== activePage) continue;

    const fontSize = Number(item.fontSize) || 16;
    const fontFamily = item.fontFamily || 'Lato';

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${fontSize}px ${fontFamily}`;

    const m = ctx.measureText(item.text || '');
    const ascent = (typeof m.actualBoundingBoxAscent === 'number') ? m.actualBoundingBoxAscent : fontSize * 0.83;
    const descent = (typeof m.actualBoundingBoxDescent === 'number') ? m.actualBoundingBoxDescent : fontSize * 0.2;
    const textHeight = ascent + descent;

    // Use actual visual bounding box (handles "j", "g", etc.)
    const bboxLeft = (typeof m.actualBoundingBoxLeft === 'number') ? m.actualBoundingBoxLeft : 0;
    const bboxRight = (typeof m.actualBoundingBoxRight === 'number') ? m.actualBoundingBoxRight : m.width;
    const textWidth = bboxLeft + bboxRight;

    ctx.restore();

    // Resolve position
    const hasNorm = item.xNorm != null && item.yNormTop != null;
    const xOrigin = hasNorm ? Number(item.xNorm) * cssW : (Number(item.x) || 0);

    // Visual x position (shifted left for glyphs like "j")
    const boxX = xOrigin - bboxLeft;

    let topY: number;
    if (hasNorm) {
      topY = Number(item.yNormTop) * cssH;
    } else {
      const rawY = Number(item.y) || 0;
      const anchor = item.anchor || 'top';
      if (anchor === 'baseline') topY = rawY - ascent;
      else if (anchor === 'bottom') topY = rawY - textHeight;
      else topY = rawY;
    }

    // Bounding box is actual text content (NO padding)
    const boxY = topY;
    const boxW = textWidth;
    const boxH = textHeight;

    // Hit-test in CSS units
    const isInside = (mx >= boxX && mx <= boxX + boxW && my >= boxY && my <= boxY + boxH);

    // Calculate selection score
    let score: number;
    if (isInside) {
      // Cursor is inside - score by distance to center
      const centerX = boxX + boxW / 2;
      const centerY = boxY + boxH / 2;
      score = Math.hypot(mx - centerX, my - centerY);
    } else {
      // Cursor is outside - add large penalty
      const dx = mx < boxX ? boxX - mx : mx > boxX + boxW ? mx - (boxX + boxW) : 0;
      const dy = my < boxY ? boxY - my : my > boxY + boxH ? my - (boxY + boxH) : 0;
      score = Math.hypot(dx, dy) + 10000;
    }

    // Track the best (lowest score = nearest)
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  // Only edit if we found an item that contains the cursor
  if (bestIndex !== null && bestScore < 10000) {
    const item = textItems[bestIndex];
    const fontSize = Number(item.fontSize) || 16;
    setIsEditing(true);
    setEditingText(item.text);
    setEditingFontSize(fontSize);
    setEditingColor(item.color || "black");

    // Normalize font family to match selector options
    // Backend returns CSS font-family like "Times New Roman, serif"
    // but the selector expects just "Times New Roman"
    const normalizeEditingFont = (fontFamily: string | undefined): string => {
      if (!fontFamily) return "Lato";

      // Known font selector options (must match FontSelector.jsx)
      const knownFonts = [
        "Lato", "Arial", "Times New Roman", "Georgia", "Verdana",
        "Courier New", "Comic Sans MS", "Impact", "Trebuchet MS", "Palatino"
      ];

      // Check if any known font is contained in the fontFamily string
      const fontLower = fontFamily.toLowerCase();
      for (const font of knownFonts) {
        if (fontLower.includes(font.toLowerCase())) {
          return font;
        }
      }

      // If no match found, try extracting the first font from the list
      // "Times New Roman, serif" -> "Times New Roman"
      const firstFont = fontFamily.split(",")[0].trim().replace(/["']/g, "");

      // Check if extracted font matches any known font
      const firstFontLower = firstFont.toLowerCase();
      for (const font of knownFonts) {
        if (firstFontLower === font.toLowerCase()) {
          return font;
        }
      }

      // Fallback to Lato if no match
      return "Lato";
    };

    setEditingFont(normalizeEditingFont(item.fontFamily));
    setEditingIndex(bestIndex);
  }
};

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleCanvasMouseDownMl,
        handleCanvasMouseMoveMl,
        handleCanvasMouseUpMl,
        pdfToCssMargins,
        indexToXY,
        addTextToCanvasMlMode,
        handleDoubleClick,
    }

}