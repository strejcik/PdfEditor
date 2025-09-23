

export function useMouse() {


    
    
    
    
    
    
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
        saveImageItemsToLocalStorage,
        updatePageItems,
        isImageDragging,
        draggedImageIndex,
        dragStart,
        isDragging,
        initialPositions,
        setTextItems,
        saveTextItemsToLocalStorage,
        fontSize,
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
    
        const padding = textBox.boxPadding || 5;
        const innerWidth = newWidth - padding * 2;
    
        const wrappedLines = wrapTextResponsive(textBox.text, innerWidth, ctx);
        const recombinedText = wrappedLines.join('\n');
    
        setTextBox({ ...textBox, width: newWidth, height: newHeight, text: recombinedText });
        drawCanvas(activePage);
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
        saveImageItemsToLocalStorage(updated);
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
        saveImageItemsToLocalStorage(updated);
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
          saveTextItemsToLocalStorage(updated);
          drawCanvas(activePage);
          return;
        }
    
        // Single selection (+ optional snapping)
        if (selectedTextIndexes.length === 1 && initialPositions.length === 1) {
          const selIdx = selectedTextIndexes[0];
          const item   = updated[selIdx];
          const init   = initialPositions[0];
          if (!item || item.index !== activePage) return;
    
          let newX = init.xTop + dx;
          let newY = init.yTop + dy;
    
          // Snap to other left edges (optional)
          const padding = (item.fontSize || fontSize) * 0.2;
          const draggedLeft = newX - padding;
          const snapThreshold = 4;
    
          for (let i = 0; i < textItems.length; i++) {
            if (i === selIdx) continue;
            const other = textItems[i];
            if (other.index !== activePage) continue;
    
            const Lother = resolveTextLayoutForHit(other, ctx, canvas);
            const otherPadding = (other.fontSize || fontSize) * 0.2;
            const otherLeft = Lother.x - otherPadding;
    
            if (Math.abs(draggedLeft - otherLeft) < snapThreshold) {
              newX = otherLeft + padding;
              break;
            }
          }
    
          item.x = newX;
          item.y = newY;
          item.anchor = "top";
    
          item.xNorm    = rect.width  ? (newX / rect.width)  : 0; // NO clamp
          item.yNormTop = rect.height ? (newY / rect.height) : 0; // NO clamp
    
          setTextItems(updated);
          updatePageItems('textItems', updated.filter(i => i.index === activePage));
          saveTextItemsToLocalStorage(updated);
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
        saveTextItemsToLocalStorage(updated);
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
    
      if (isResizing) setIsResizing(false);
    
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
          setTextBox({ x, y, width, height, text: "" });
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

    return {
        handleMouseDown,
        handleMouseMove,
        handleMouseUp
    }

}