import { PDF_HEIGHT, PDF_WIDTH } from "../config/constants";


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
        resolveTextLayoutForHit,
        setIsTextSelected,
        setSelectedTextIndex,
        selectedTextIndexes,
        setSelectedTextIndexes,
        setIsDragging,
        setInitialPositions,
        textBox,
        setIsResizing,
        setTextBox,
        setSelectionStart,
        setSelectionEnd
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
        const handleX = x + w - handleSize / 2;
        const handleY = y + h - handleSize / 2;

        if (cssX >= handleX && cssX <= handleX + handleSize &&
            cssY >= handleY && cssY <= handleY + handleSize) {
        setResizingImageIndex(index);
        setResizeStart({
            x: cssX,
            y: cssY,
            startW: w,
            startH: h,
            ratio: (w > 0 && h > 0) ? (w / h) : 1,
            cssW,
            cssH,
        });
        setIsSelecting(false);
        return;
        }
    }

    // ======== 2) IMAGE: inside -> start drag ========
    for (let index = 0; index < imageItems.length; index++) {
        const item = imageItems[index];
        if (item.index !== activePage) continue;

        const { x, y, w, h } = resolveImageRectCss(item, canvas);

        if (cssX >= x && cssX <= x + w && cssY >= y && cssY <= y + h) {
        setSelectedImageIndex(index);
        setDraggedImageIndex(index);
        setIsImageDragging(true);
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
    for (let index = textItems.length - 1; index >= 0; index--) {
        const item = textItems[index];
        if (item.index !== activePage) continue;

        const L = resolveTextLayoutForHit(item, ctx, canvas);
        const b = L.box;

        if (cssX >= b.x && cssX <= b.x + b.w && cssY >= b.y && cssY <= b.y + b.h) {
        setIsTextSelected(true);
        setSelectedTextIndex(index);

        const newSelectedIndexes = selectedTextIndexes.includes(index)
            ? [...selectedTextIndexes]
            : [index];

        setSelectedTextIndexes(newSelectedIndexes);
        setIsDragging(true);
        setDragStart({ x: cssX, y: cssY });

        // Store initial TOP-anchored positions for drag
        const init = newSelectedIndexes.map((i) => {
            const Li = resolveTextLayoutForHit(textItems[i], ctx, canvas);
            return { index: i, xTop: Li.x, yTop: Li.topY, activePage };
        });
        setInitialPositions(init);
        setIsSelecting(false);
        return;
        }
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
        resolveTextLayoutForHit,
        selectedTextIndexes,
        setSelectedTextIndexes,
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
        draggedImageIndex,
        dragStart,
        isDragging,
        initialPositions,
        setTextItems,
        saveTextItemsToIndexedDB,
        requestCanvasDraw
    } = opts;

      if (editingIndex !== null) {
        e.preventDefault();
      }
      const canvas = canvasRefs.current[activePage];
      if (!canvas) return;
    
      // CSS-space pointer; can be negative when moving outside left/top
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      const clientY = e.touches?.[0]?.clientY ?? e.clientY;
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
      if (isSelecting) {
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
        drawCanvas(activePage);
        return;
      }
    
      // === IMAGE RESIZING ===
      if (resizingImageIndex !== null) {
        const updated = [...imageItems];
        const item = updated[resizingImageIndex];
        if (!item || item.index !== activePage) return;
    
        const startW = resizeStart?.startW ?? item.width;
        const startH = resizeStart?.startH ?? item.height;
        const ratio  = resizeStart?.ratio  ?? ((startW > 0 && startH > 0) ? startW / startH : 1);
    
        const totalDX = cssX - (resizeStart?.x ?? cssX);
        const totalDY = cssY - (resizeStart?.y ?? cssY);
    
        let newW = startW + totalDX;
        let newH = startH + totalDY;
    
        if (e.shiftKey && ratio > 0) {
          if (Math.abs(totalDX) >= Math.abs(totalDY)) {
            newW = startW + totalDX; newH = newW / ratio;
          } else {
            newH = startH + totalDY; newW = newH * ratio;
          }
        }
    
        newW = Math.max(10, newW);
        newH = Math.max(10, newH);
    
        item.width  = newW;               // pixels
        item.height = newH;
    
        // normalized (UNCLAMPED)
        item.widthNorm  = rect.width  ? (newW / rect.width)  : 0;
        item.heightNorm = rect.height ? (newH / rect.height) : 0;
    
        setImageItems(updated);
        saveImageItemsToIndexedDB(updated);
        updatePageItems('imageItems', updated.filter(i => i.index === activePage));
        drawCanvas(activePage);
        return;
      }
    
      // === IMAGE DRAGGING ===
      if (isImageDragging && draggedImageIndex !== null) {
        const updated = [...imageItems];
        const item = updated[draggedImageIndex];
        if (!item || item.index !== activePage) return;
    
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
        saveImageItemsToIndexedDB(updated);
        updatePageItems('imageItems', updated.filter(i => i.index === activePage));
        drawCanvas(activePage);
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
          updatePageItems('textItems', updated.filter(i => i.index === activePage));
          saveTextItemsToIndexedDB(updated);
          drawCanvas(activePage);
          return;
        }
    
        // Single selection (+ full-edge snapping: left/right/top/bottom)
if (selectedTextIndexes.length === 1 && initialPositions.length === 1) {
  const selIdx = selectedTextIndexes[0];
  const item   = updated[selIdx];
  const init   = initialPositions[0];
  if (!item || item.index !== activePage) return;

  // Proposed new top-anchored draw point before snapping
  let newX = init.xTop + dx;
  let newY = init.yTop + dy;

  // Get metrics for the dragged item at its *current* (pre-drag) state
  // We'll derive constant offsets from draw point → box edges, then
  // reuse those offsets to compute the dragged box at (newX, newY).
  const Lself = resolveTextLayoutForHit(item, ctx, canvas);
  const selfBox = Lself.box; // {x,y,w,h} – padded/tight box you use in hit & draw

  // Offsets from draw point (x, topY) to the box's top-left corner
  // These are stable for this item (given same font/text).
  const offsetBx = selfBox.x - Lself.x;      // how far box-left is from drawX
  const offsetBy = selfBox.y - Lself.topY;   // how far box-top  is from topY

  // Given a tentative (newX, newY), compute the dragged box edges
  const computeDraggedBox = (X:any, Y:any) => {
    const left   = X + offsetBx;
    const top    = Y + offsetBy;
    const right  = left + selfBox.w;
    const bottom = top  + selfBox.h;
    return { left, top, right, bottom };
  };

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

  // Commit
  item.x = newX;
  item.y = newY;
  item.anchor = "top";

  item.xNorm    = rect.width  ? (newX / rect.width)  : 0; // NO clamp
  item.yNormTop = rect.height ? (newY / rect.height) : 0; // NO clamp

  setTextItems(updated);
  updatePageItems('textItems', updated.filter(i => i.index === activePage));
  saveTextItemsToIndexedDB(updated);
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
        updatePageItems('textItems', updated.filter(t => t.index === activePage));
        saveTextItemsToIndexedDB(updated);
        drawCanvas(activePage);
      }
    };



    const handleMouseUp = (e:any, opts:any) => {
      const {
        canvasRefs,
        activePage,
        editingIndex,
        textItems,
        resolveTextLayoutForHit,
        setSelectedTextIndexes,
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
        isDragging,
        setIsResizing,
        setIsDragging,
        setInitialPositions,
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
        history
      } = opts;

      if (editingIndex !== null) {
        e.preventDefault();
      }
      const canvas = canvasRefs.current[activePage];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
    
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
    
     if (isDragging) {
    setIsDragging(false);
    setInitialPositions([]);
    setDragStart({ x: 0, y: 0 });
    pushSnapshotToUndo(activePage);
  }

  if (resizingImageIndex !== null) setResizingImageIndex(null);
  if (isImageDragging) {
    setIsImageDragging(false);
    setDraggedImageIndex(null);
    setDragStart({ x: 0, y: 0 });
    pushSnapshotToUndo(activePage);
  }
    
      if (isSelecting) {
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
            updatedInitials.push({ index: i, xTop: L.x, yTop: L.topY, activePage });
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
    
        setIsSelecting(false);
        setShouldClearSelectionBox(true);
      } else {
        // --- SINGLE-ITEM PICK on click/tap ---
        const pt = getCanvasPoint(e, canvas); // <- use event coordinates, not selectionStart/End
    
        const pointInRect = (px:any, py:any, r:any) =>
          px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    
        let pickedIdx = null;
    
        // Pass 1: choose the TOPMOST item that contains the point (iterate from end)
        for (let i = textItems.length - 1; i >= 0; i--) {
          const item = textItems[i];
          if (item.index !== activePage) continue;
    
          const L = resolveTextLayoutForHit(item, ctx, canvas);
          const b = L.box; // {x,y,w,h} – tight glyph bbox
    
          if (pointInRect(pt.x, pt.y, b)) {
            pickedIdx = i;
            break; // topmost found
          }
        }
    
        // Pass 2: if none contain, snap to nearest within a small threshold
        if (pickedIdx === null) {
          const NEAR_THRESHOLD = 6; // px
          let bestDist = Infinity;
    
          for (let i = textItems.length - 1; i >= 0; i--) {
            const item = textItems[i];
            if (item.index !== activePage) continue;
    
            const L = resolveTextLayoutForHit(item, ctx, canvas);
            const b = L.box;
    
            const dx =
              pt.x < b.x ? b.x - pt.x : pt.x > b.x + b.w ? pt.x - (b.x + b.w) : 0;
            const dy =
              pt.y < b.y ? b.y - pt.y : pt.y > b.y + b.h ? pt.y - (b.y + b.h) : 0;
            const dist = Math.hypot(dx, dy);
    
            if (dist <= NEAR_THRESHOLD && dist < bestDist) {
              bestDist = dist;
              pickedIdx = i;
            }
          }
        }
    
        if (pickedIdx !== null) {
          // Select exactly one item (use GLOBAL index, not page index)
          setSelectedTextIndexes([pickedIdx]);
          setSelectedTextIndex(pickedIdx);
          setIsTextSelected(true);
    
          const Lbest = resolveTextLayoutForHit(textItems[pickedIdx], ctx, canvas);
          setInitialPositions([{ index: pickedIdx, xTop: Lbest.x, yTop: Lbest.topY, activePage }]);
        } else {
          // Clicked empty space: clear selection
          setSelectedTextIndexes([]);
          setSelectedTextIndex(null);
          setIsTextSelected(false);
        }
      }
    
      setSelectionStart(null);
      setSelectionEnd(null);
      drawCanvas(activePage);
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

  console.log(lines);

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
    }

}