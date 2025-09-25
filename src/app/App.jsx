import { useRef, useEffect, useLayoutEffect, useCallback} from 'react';
import axios from 'axios';
import './App.css'
import { DEFAULT_FONT_SIZE, CELL_SIZE, BOX_PADDING, CANVAS_WIDTH, CANVAS_HEIGHT, PDF_WIDTH, PDF_HEIGHT } from "../config/constants";
import { getMousePosOnCanvas } from "../utils/canvas/getMousePosOnCanvas";
import { useEditor } from "../context/EditorProvider";
import fontkit from "@pdf-lib/fontkit";
import { loadLatoOnce } from "../utils/font/fontLoader";
import {useHandleAddImage} from "../hooks/useHandleAddImage";
import { drawCanvas } from '../utils/canvas/draw/drawCanvas'
// Clip everything to the page box (matches canvas clipping)
import {
  pushGraphicsState, popGraphicsState,
  moveTo, lineTo, closePath, clip, endPath,
  PDFDocument, StandardFonts, rgb
} from "pdf-lib";

const btnStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginBottom: '8px',
  backgroundColor: '#007BFF',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};


let runOnce = false;
const App = () => {
  const runOnceRef = useRef(false);
  const fontSize = DEFAULT_FONT_SIZE;
  const cellSize = CELL_SIZE;
  const boxPadding = BOX_PADDING;
  const APP_FONT_FAMILY = "Lato";
  const canvasWidth = CANVAS_WIDTH;
  const canvasHeight = CANVAS_HEIGHT;
  const pdfWidth = PDF_WIDTH;
  const pdfHeight = PDF_HEIGHT;
  const fontsReadyRef = useRef(null);

useEffect(() => {
    fontsReadyRef.current = loadLatoOnce("../../public/fonts/Lato-Regular.ttf", "Lato");
  }, []);


  function setupCanvasA4(canvas, portrait = true) {
  const w = portrait ? canvasWidth : canvasHeight;
  const h = portrait ? canvasHeight : canvasWidth;

  const dpr = window.devicePixelRatio || 1;
  // Backing store in device pixels
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  // CSS size in logical pixels (no scaling in your math)
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  // Draw using logical units; DPR handled by transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: w, height: h };
}


  const {
    ui: { openSections, setOpenSections },

    history: {
      undoStack,
      redoStack,
      bindSources,      // low-level (functions)
      bindFromSlices,   // high-level (pass slices)
      pushSnapshotToUndo,
      purgeUndoRedoForRemovedPage,
      fnUndoStack,
      fnRedoStack,
      setUndoStack,
      setRedoStack,
    },
    // alias the slice's "pageList" to avoid name clash
    pages: {
      pages: pageList,     // <-- pageList array
      setPages,            // if you need to mutate it
      activePage,
      setActivePage,
      canvasRefs,
      updatePageItems,
      addNewPage,
      removePage
    },

    text: {     
      textItems, setTextItems,
      isTextSelected, setIsTextSelected,
      selectedTextIndex, setSelectedTextIndex,
      selectedTextIndexes, setSelectedTextIndexes,
      showAddTextModal, setShowAddTextModal,
      newText, setNewText,
      maxWidth, setMaxWidth,
      isEditing, setIsEditing,
      editingText, setEditingText,
      editingIndex, setEditingIndex,
      editingFontSize, setEditingFontSize,
      newFontSize, setNewFontSize,
      removeSelectedText, saveTextItemsToLocalStorage,
      wrapTextPreservingNewlinesResponsive, wrapTextResponsive,
      resolveTextLayout,
      resolveTextLayoutForHit
    },

    images: { 
      imageItems, setImageItems,
      isImageDragging, setIsImageDragging,
      draggedImageIndex, setDraggedImageIndex,
      selectedImageIndex, setSelectedImageIndex,
      resizingImageIndex, setResizingImageIndex,
      resizeStart, setResizeStart, addImageFromFile,
      handleAddImage, saveImageItemsToLocalStorage,
      createImageElement,
      resolveImageRectCss
    },

    selection: {
      showGrid, setShowGrid,
      isSelecting, setIsSelecting,
      selectionStart, setSelectionStart,
      selectionEnd, setSelectionEnd,
      initialPositions, setInitialPositions,
      shouldClearSelectionBox, setShouldClearSelectionBox,
      isDragging, setIsDragging,
      dragStart, setDragStart,
      isResizing, setIsResizing
    },

    textBox: {
      isTextBoxEditEnabled, setIsTextBoxEditEnabled, 
      textBox, setTextBox, 
      isTextBoxEditing, setIsTextBoxEditing
    },
    multiline: {
      isMultilineMode, setIsMultilineMode,
      mlText, setMlText,
      mlConfig, setMlConfig,
      mlCaret, setMlCaret,
      mlAnchor, setMlAnchor,
      mlPreferredX, setMlPreferredX,
      mlCaretBlink, setMlCaretBlink,
      isMlDragging, setIsMlDragging,
      toggleMultilineMode,
      layoutMultiline
    },
    
    mouse: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleCanvasMouseMoveMl,
      handleCanvasMouseDownMl,
      handleCanvasMouseUpMl,
      pdfToCssMargins,
      indexToXY,
      addTextToCanvasMlMode
    },
    keyboard: {
      handleKeyDown
    },

    pdf: { selectedFile, setSelectedFile, isPdfDownloaded, setIsPdfDownloaded },
  } = useEditor(); // ✅ correct




// Redraw all pages whenever items change or pages are (re)hydrated
  useLayoutEffect(() => {
    if (!pageList || pageList.length === 0) return;

    // Wait until refs are attached
    requestAnimationFrame(() => {
      pageList.forEach((_, i) => {
        // optionally: set canvas DPR scaling here if you don't already do it inside drawCanvas
        // const canvas = canvasRefs.current[i];
        // if (canvas) { /* set width/height*dpr and ctx.setTransform(dpr,0,0,dpr,0,0) */ }
        drawCanvas(i);
      }); 
    });
  }, [pageList, textItems, imageItems, mlText, mlAnchor,
mlPreferredX /* + any other draw deps */]);


useEffect(() => {
  if (!isMultilineMode) return;
  const id = setInterval(() => setMlCaretBlink(v => !v), 1000);
  return () => clearInterval(id);
}, [isMultilineMode]);

const toUnits = (str) => Array.from(str ?? "");




// useEffect(() => {
//   const handleMouseMove = (e) => {
//     const canvas = canvasRefs.current[activePage];
//     if (!canvas) return;

//     const rect = canvas.getBoundingClientRect();
//     const isOutside =
//       e.clientX < rect.left ||
//       e.clientX > rect.right ||
//       e.clientY < rect.top ||
//       e.clientY > rect.bottom;

//     if (isOutside) {
//       setIsDragging(false); // Stop dragging
//       setDraggedImageIndex(null)
//       setResizingImageIndex(null);
//     }
//   };

//   // Attach the event listener
//   window.addEventListener('mousemove', handleMouseMove);

//   // Cleanup event listener on unmount or when activePage changes
//   return () => {
//     window.removeEventListener('mousemove', handleMouseMove);
//   };
// }, [activePage, canvasRefs]);

  

  // Load images and text items from local storage on mount
  useEffect(() => {
    const storedTextItems = localStorage?.getItem('textItems');
    const storedImageItems = localStorage?.getItem('imageItems');
    
    if (storedTextItems?.length > 0) {
      setTextItems(JSON.parse(storedTextItems));
    }
  
    if (storedImageItems?.length > 0) {
      const parsedImages = JSON.parse(storedImageItems).map((item) => ({
        ...item,
        image: createImageElement(item?.data), // Convert base64 back to Image element
      }));
      setImageItems(parsedImages);
    }
  }, []);





  useEffect(() => {
    // Add keydown event listener for moving text with arrow keys
    window.addEventListener('keydown', handleTextMove);
    return () => window.removeEventListener('keydown', handleTextMove);
  }, [isTextSelected, selectedTextIndex, textItems]);


useEffect(() => {
  const refCount = Array.isArray(canvasRefs.current) ? canvasRefs.current.length : 0;
  const listCount = Array.isArray(pageList) ? pageList.length : 0;
  const maxIndexFromItems = Math.max(
    -1,
    ...[
      ...(Array.isArray(textItems) ? textItems : []),
      ...(Array.isArray(imageItems) ? imageItems : []),
    ].map((it) => (Number.isFinite(it?.index) ? it.index : -1))
  );
  const pageCount = Math.max(refCount, listCount, maxIndexFromItems + 1, 0);

  const sharedConfig = { showGrid, APP_FONT_FAMILY };

  for (let p = 0; p < pageCount; p++) {
    const canvas = canvasRefs.current?.[p];
    if (!canvas) continue;

    const isActive = p === activePage;
    drawCanvas(p, {
      canvas,
      state: {
        textItems,
        imageItems,
        selectedTextIndexes,
        selectionStart,
        selectionEnd,
        isSelecting,
        isTextBoxEditEnabled,
        textBox,
        activePage: p,
        isMultilineMode: isMultilineMode && isActive,

        // multiline editor only on active page
        canvasRefs,
        mlConfig,
        mlCaret: isActive ? mlCaret : 0,
        mlAnchor: isActive ? mlAnchor : 0,
        mlPreferredX: isActive ? mlPreferredX : null,
        mlText: isActive ? mlText : "",
        mlCaretBlink: isActive ? mlCaretBlink : false,
        isMlDragging: isActive ? isMlDragging : false,

        fontSize,
        wrapTextPreservingNewlinesResponsive,
        resolveTextLayout,
        layoutMultiline,
        setMlPreferredX,

        redraw: (idx) =>
          drawCanvas(idx, {
            canvas: canvasRefs.current?.[idx],
            state: {
              textItems,
              imageItems,
              selectedTextIndexes,
              selectionStart,
              selectionEnd,
              isSelecting,
              isTextBoxEditEnabled,
              textBox,
              activePage: idx,
              isMultilineMode: isMultilineMode && idx === activePage,
              canvasRefs,
              mlConfig,
              mlCaret: idx === activePage ? mlCaret : 0,
              mlAnchor: idx === activePage ? mlAnchor : 0,
              mlPreferredX: idx === activePage ? mlPreferredX : null,
              mlText: idx === activePage ? mlText : "",
              mlCaretBlink: idx === activePage ? mlCaretBlink : false,
              isMlDragging: idx === activePage ? isMlDragging : false,
              fontSize,
              wrapTextPreservingNewlinesResponsive,
              resolveTextLayout,
              layoutMultiline,
              setMlPreferredX,
            },
            config: sharedConfig,
          }),
      },
      config: sharedConfig,
    });
  }
}, [
  activePage,
  textItems,
  imageItems,
  selectedTextIndexes,
  selectionStart,
  selectionEnd,
  isSelecting,
  isTextBoxEditEnabled,
  textBox,
  isMultilineMode,
  mlText,
  mlCaret,
  mlAnchor,
  mlPreferredX,
  mlCaretBlink,
  isMlDragging,
  mlConfig,
  showGrid,
  APP_FONT_FAMILY,
  canvasRefs,
  pageList,
  wrapTextPreservingNewlinesResponsive,
  resolveTextLayout,
  layoutMultiline,
  setMlPreferredX,
  fontSize,
]);



useLayoutEffect(() => {
  const canvas = canvasRefs.current[activePage];
  if (canvas) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    drawCanvas(activePage);
  }
}, [activePage]);



useLayoutEffect(() => {
  const canvas = canvasRefs.current[activePage];
  if (canvas) {
    drawCanvas(activePage);
  }
}, [activePage, textItems, imageItems, isSelecting, selectionStart, selectionEnd]);





useEffect(() => {
  if (isTextBoxEditEnabled && textBox && canvasRefs.current[activePage]) {
    const ctx = canvasRefs.current[activePage].getContext('2d');
    const innerWidth = textBox.width - (textBox.boxPadding || 5) * 2;

    const wrappedLines = wrapTextResponsive(textBox.text.replace(/\s+/g, ' '), innerWidth, ctx);
    const newText = wrappedLines.join('\n');

    if (newText !== textBox.text) {
      setTextBox({ ...textBox, text: newText });
    }
  }
}, [textBox?.width]);  // Reacts to textBox width resize



useEffect(() => { drawCanvas(activePage); }, [activePage, textItems, imageItems]);





const handleUndo = () => {
  fnUndoStack(activePage)
};



const handleRedo = () => {
  fnRedoStack(activePage);
};




useEffect(() => {
  if (shouldClearSelectionBox) {
    setSelectionStart(null);
    setSelectionEnd(null);
    setShouldClearSelectionBox(false);
    requestAnimationFrame(() => drawCanvas(activePage));
  }
}, [shouldClearSelectionBox]);




// optional: keep some state in refs to avoid stale closures
const selectedTextIndexesRef = useRef(selectedTextIndexes);
useEffect(() => { selectedTextIndexesRef.current = selectedTextIndexes; }, [selectedTextIndexes]);


useEffect(() => {
  // Use document for better reliability; capture=false is fine
  const listener = (event) => handleKeyDown(event,{
    canvasRefs,
    fontSize,
    isTextBoxEditEnabled,
    textBox,
    textItems,
    isMultilineMode,
    mlText,
    mlCaret, 
    mlAnchor, 
    mlPreferredX, 
    activePage, 
    mlConfig,
    setSelectedTextIndexes,
    setIsTextSelected,
    setSelectedTextIndex,
    setTextItems,
    setMlText,
    selectedTextIndexesRef,
    saveTextItemsToLocalStorage,
    updatePageItems,
    wrapTextPreservingNewlinesResponsive,
    setTextBox,
    toUnits,
    pdfToCssMargins,
    layoutMultiline,
    setMlCaret,
    setMlAnchor,
    setMlPreferredX,
    indexToXY
  });

  document.addEventListener("keydown", listener, { passive: false });

  return () => {
    document.removeEventListener("keydown", listener);
  };
}, [handleKeyDown]);  // <-- depend on the handler itself



  const handleTextMove = (e) => {
    
    if (isTextSelected && selectedTextIndex !== null) {
      const updatedItems = [...textItems];
      const selectedItem = updatedItems[selectedTextIndex];
      //e.preventDefault();
      // Move the selected text item based on the arrow key pressed
      if (e.key === 'ArrowUp') selectedItem.y -= 1;
      if (e.key === 'ArrowDown') selectedItem.y += 1;
      if (e.key === 'ArrowLeft') selectedItem.x -= 1;
      if (e.key === 'ArrowRight') selectedItem.x += 1;

      // Ensure text stays within canvas bounds
      selectedItem.x = Math.max(0, Math.min(selectedItem.x, canvasRefs.current[activePage].width - fontSize));
      selectedItem.y = Math.max(fontSize, Math.min(selectedItem.y, canvasRefs.current[activePage].height));

      setTextItems(updatedItems);
      saveTextItemsToLocalStorage(updatedItems); // Save updated position in localStorage
    }

  };






















  
// Function to handle adding new text to the canvas
const addTextToCanvas = () => {
  if (!newText || newText.trim() === "") return;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return;

  const { ctx } = setupCanvasA4(canvasRefs.current[activePage], /* portrait? */ true);
  if (!ctx) return;

  const fontFamily = "Lato";                 // match what you export with pdf-lib
  const fontSizeToUse = Number(newFontSize);
  const padding = Math.round(fontSizeToUse * 0.2);

  // Prepare font for measuring/wrapping
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSizeToUse}px ${fontFamily}`;

  // Choose an effective maxWidth:
  // if user provided a sensible one, use it; otherwise pick a safe default
  const measuredWidth = ctx.measureText(newText).width;
  const safeDefaultMax = Math.max(measuredWidth + 20, fontSizeToUse * 2);
  const effectiveMaxWidth =
    (typeof maxWidth === "number" && maxWidth > fontSizeToUse) ? maxWidth : safeDefaultMax;

  // Wrap into CANVAS coordinates (no PDF conversion here)
  const lines = wrapText(newText, ctx, {
    x: 50,                 // starting X (adjust as you like)
    y: 50,                 // starting Y (adjust as you like)
    maxWidth: effectiveMaxWidth,
    fontSize: fontSizeToUse,
    fontFamily,
    lineGap: 0,
  });

  // Build items (top-anchored). We store 'anchor: "top"' for clarity/compat.
  const itemsToAdd = lines.map((ln) => {
      const { xNorm, yNormTop } = resolveTopLeft(ln.text, PDF_WIDTH, PDF_HEIGHT);
    return {
      text: ln.text,
      fontSize: newFontSize,
      boxPadding: padding,
      x: ln.x,
      y: ln.y,
      index: activePage,
      xNorm: +xNorm.toFixed(6),
      yNormTop: +yNormTop.toFixed(6),
      fontFamily
    }
  });


  // Snapshot BEFORE state change for undo
  pushSnapshotToUndo(activePage);

// In your handler where you append itemsToAdd
const nextTextItems = [ ...(textItems || []), ...itemsToAdd.map(it => ({ ...it })) ];
setTextItems(nextTextItems);

// Use the SAME computed array right away:
saveTextItemsToLocalStorage?.(nextTextItems);

setPages(prev => {
  const next = Array.isArray(prev) ? [...prev] : [];
  const page = next[activePage] || { textItems: [], imageItems: [] };

  // Only items for this page
  const forThisPage = nextTextItems.filter(it => it.index === activePage);

  next[activePage] = {
    ...page,
    textItems: forThisPage.map(it => ({ ...it })), // keep immutable
    imageItems: page.imageItems || [],
  };
  return next;
});

  // (If you don't have the effect-driven redraw yet, you can force it)
  // drawCanvas(activePage);

  // Reset modal state
  setShowAddTextModal(false);
  setNewText("");
  setNewFontSize(fontSize);
  setMaxWidth(200);
};




const addTextToCanvas3 = (items = []) => {
  const usingImport = Array.isArray(items) && items.length > 0;
  if (!usingImport && (!newText || newText.trim() === "")) return;

  // Snapshot BEFORE mutation (for undo)
  if (typeof pushSnapshotToUndo === "function") {
    pushSnapshotToUndo(activePage);
  } else if (history?.pushSnapshotToUndo) {
    history.pushSnapshotToUndo(activePage);
  }

  // Dimensions (used to convert norms <-> px)
  const canvas = canvasRefs?.current?.[activePage];
  const rect = canvas?.getBoundingClientRect?.() || { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  const cssW = (typeof rect.width === "number" && rect.width > 0) ? rect.width : CANVAS_WIDTH;
  const cssH = (typeof rect.height === "number" && rect.height > 0) ? rect.height : CANVAS_HEIGHT;

  const fontFamilyDefault = "Lato";
  const fallbackSize = Number(newFontSize) || Number(fontSize) || 16;

  const newTextItems = [];
  const newImageItems = [];

  // Helpers
  const toNum = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };

  // Be very permissive when deciding if an item is an image
  const isImageLike = (o) => {
    if (!o || typeof o !== "object") return false;
    if (o.type === "image") return true;
    // Consider as image if it has any of these signals:
    if ("widthNorm" in o || "heightNorm" in o) return true;
    if ("pixelWidth" in o || "pixelHeight" in o) return true;
    if (typeof o.ref === "string" || typeof o.data === "string" || typeof o.src === "string") return true;
    // If it has only text fields, treat as text:
    if ("text" in o && !("widthNorm" in o) && !("heightNorm" in o)) return false;
    return false;
  };

  // Normalize incoming -> newTextItems / newImageItems
  if (usingImport) {
    for (const src of items) {
      const pageIndex = (typeof src?.index === "number") ? src.index : activePage;

      if (isImageLike(src)) {
        const xNorm     = (src.xNorm     != null) ? toNum(src.xNorm)     : (src.x != null ? toNum(src.x) / cssW : 0);
        const yNormTop  = (src.yNormTop  != null) ? toNum(src.yNormTop)  : (src.y != null ? toNum(src.y) / cssH : 0);
        const widthNorm = (src.widthNorm != null) ? toNum(src.widthNorm) : (src.width  != null ? toNum(src.width)  / cssW : 0);
        const heightNorm= (src.heightNorm!= null) ? toNum(src.heightNorm): (src.height != null ? toNum(src.height) / cssH : 0);

        const x = xNorm * cssW;
        const y = yNormTop * cssH;
        const width = widthNorm * cssW;
        const height = heightNorm * cssH;

        // Prefer base64 data URI if present; keep whatever you have in .data
        const dataCandidate =
          (typeof src.ref === "string" && src.ref) ||
          (typeof src.data === "string" && src.data) ||
          (typeof src.src === "string" && src.src) ||
          null;

        newImageItems.push({
          type: "image",
          index: pageIndex,

          // normalized (persisted)
          xNorm, yNormTop, widthNorm, heightNorm,

          // concrete px (draw)
          x, y, width, height,

          // meta passthrough
          name: src.name ?? null,
          pixelWidth: Number.isFinite(src?.pixelWidth) ? Number(src.pixelWidth) : null,
          pixelHeight: Number.isFinite(src?.pixelHeight) ? Number(src.pixelHeight) : null,

          // bytes/url for draw
          data: dataCandidate,
        });
      } else {
        // TEXT
        const size = toNum(src?.fontSize, fallbackSize);

        const xNorm    = (src?.xNorm    != null) ? toNum(src.xNorm)    : (src?.x != null ? toNum(src.x) / cssW : 0);
        const yNormTop = (src?.yNormTop != null) ? toNum(src.yNormTop) : (src?.y != null ? toNum(src.y) / cssH : 0);

        const x = xNorm * cssW;
        const y = yNormTop * cssH;

        const padding = (src?.boxPadding != null)
          ? toNum(src.boxPadding)
          : Math.round(size * 0.2);

        newTextItems.push({
          type: "text",
          text: String(src?.text ?? ""),
          x, y,
          xNorm, yNormTop,
          fontSize: size,
          boxPadding: padding,
          index: pageIndex,
          anchor: "top",
          fontFamily: String(src?.fontFamily || fontFamilyDefault),
        });
      }
    }
  } else {
    // Manual add (single text)
    const size = fallbackSize;
    const padding = Math.round(size * 0.2);
    const x = 50, y = 50;

    newTextItems.push({
      type: "text",
      text: newText,
      x, y,
      xNorm: x / cssW,
      yNormTop: y / cssH,
      fontSize: size,
      boxPadding: padding,
      index: activePage,
      anchor: "top",
      fontFamily: fontFamilyDefault,
    });
  }

  // Commit to global stores first (so draw code can use them immediately)
  if (newTextItems.length) {
    setTextItems((prev) => {
      const merged = Array.isArray(prev) ? [...prev, ...newTextItems] : [...newTextItems];
      saveTextItemsToLocalStorage?.(merged);
      return merged;
    });
  }
  if (newImageItems.length) {
    setImageItems?.((prev) => {
      const merged = Array.isArray(prev) ? [...prev, ...newImageItems] : [...newImageItems];
      saveImageItemsToLocalStorage?.(merged);
      return merged;
    });
  }

  // Group by page to persist in `pages`
  const byPage = new Map();
  for (const ti of newTextItems) {
    const entry = byPage.get(ti.index) ?? { textItems: [], imageItems: [] };
    entry.textItems.push({ ...ti });
    byPage.set(ti.index, entry);
  }
  for (const ii of newImageItems) {
    const entry = byPage.get(ii.index) ?? { textItems: [], imageItems: [] };
    entry.imageItems.push({ ...ii });
    byPage.set(ii.index, entry);
  }

  // Robust setPages: supports array or object, preserves existing items, appends both text & images.
  setPages((prev) => {
    let next = prev;

    // If pages isn't an array/object yet, initialize as array
    if (!next || (typeof next !== "object")) {
      next = [];
    }

    // Clone shallowly to avoid mutating prev
    next = Array.isArray(next) ? [...next] : { ...next };

    for (const [pIdx, group] of byPage.entries()) {
      // Read existing page slice
      const curr = Array.isArray(next)
        ? (next[pIdx] || { textItems: [], imageItems: [] })
        : (next[pIdx] || { textItems: [], imageItems: [] });

      const currText = Array.isArray(curr.textItems) ? curr.textItems : [];
      const currImgs = Array.isArray(curr.imageItems) ? curr.imageItems : [];

      const mergedPage = {
        ...curr,
        textItems: [...currText, ...group.textItems],
        imageItems: [...currImgs, ...group.imageItems],
      };

      // Write back (supports both array and object pages store)
      if (Array.isArray(next)) {
        next[pIdx] = mergedPage;             // creates sparse entries if needed
      } else {
        next[pIdx] = mergedPage;             // object keyed by index
      }
    }

    return next;
  });

  // Redraw if needed
  drawCanvas?.(activePage);

  // Reset inputs for manual add
  if (!usingImport) {
    setShowAddTextModal?.(false);
    setNewText?.("");
    setNewFontSize?.(fontSize);
    setMaxWidth?.(200);
  }
};



const addTextToCanvas2 = (textBox) => {
    if (textBox?.text?.trim()) {

    const canvas = canvasRefs.current[activePage];
    if (!canvas) return;

    const { ctx } = setupCanvasA4(canvasRefs.current[activePage], /* portrait? */ true);
    if (!ctx) return;


    const padding = newFontSize * 0.2;
    const innerWidth = textBox.width - padding * 2;
    const lines = wrapTextResponsive(textBox.text, innerWidth, ctx);
    const lineHeight = newFontSize + 5;



    const textItemsToAdd = lines.map((line, i) =>{
      return {text: line,
      fontSize: newFontSize,
      boxPadding: padding,
      x: textBox.x + padding,
      y: textBox.y + 20 + i * lineHeight,
      index: activePage}
    });
    
// In your handler where you append itemsToAdd
const nextTextItems = [ ...(textItems || []), ...textItemsToAdd.map(it => ({ ...it })) ];
setTextItems(nextTextItems);

// Use the SAME computed array right away:
saveTextItemsToLocalStorage?.(nextTextItems);

setPages(prev => {
  const next = Array.isArray(prev) ? [...prev] : [];
  const page = next[activePage] || { textItems: [], imageItems: [] };

  // Only items for this page
  const forThisPage = nextTextItems.filter(it => it.index === activePage);

  next[activePage] = {
    ...page,
    textItems: forThisPage.map(it => ({ ...it })), // keep immutable
    imageItems: page.imageItems || [],
  };
  return next;
});

    setTextBox(null);
    setNewFontSize(fontSize);
    drawCanvas(activePage);
  }
};




// Handle deleting the selected image
const deleteSelectedImage = () => {
  if (selectedImageIndex !== null) {
    const filteredItems = imageItems.filter((item, index) => {
      if (item.index !== activePage) return true; // keep images from other pageList
      const pageImages = imageItems.filter(i => i.index === activePage);
      const targetItem = pageImages[selectedImageIndex];
      return item !== targetItem; // remove only the matched item from current page
    });


    setImageItems(filteredItems);
    saveImageItemsToLocalStorage(filteredItems);
    updatePageItems('imageItems', filteredItems);
    setSelectedImageIndex(null);
    drawCanvas(activePage);
  }
};


const wrapText = (text, ctx, {
  x = 50,
  y = 50,
  maxWidth = Infinity,
  fontSize = 16,
  fontFamily = "Lato",
  lineGap = 0,              // extra gap between lines in pixels
} = {}) => {
  if (!text) return [];

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  // Measure a representative glyph to get ascent+descent for line height
  const m = ctx.measureText("Mg");
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : fontSize * 0.83;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : fontSize * 0.2;
  const lineHeight = Math.ceil(ascent + descent + lineGap);

  const lines = [];
  const paragraphs = String(text).split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let current = "";

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const next = current ? current + " " + word : word;
      const nextWidth = ctx.measureText(next).width;
      const wordWidth = ctx.measureText(word).width;

      // If a single word is wider than maxWidth, break it by characters
      if (wordWidth > maxWidth) {
        // push the current line first
        if (current) {
          lines.push(current);
          current = "";
        }
        let chunk = "";
        for (let i = 0; i < word.length; i++) {
          const tryChunk = chunk + word[i];
          const chunkWidth = ctx.measureText(tryChunk).width;
          if (chunkWidth > maxWidth && chunk) {
            lines.push(chunk);
            chunk = word[i];
          } else {
            chunk = tryChunk;
          }
        }
        if (chunk) {
          current = chunk; // continue current with the leftover piece
        }
      } else if (nextWidth > maxWidth && current) {
        // wrap before adding word
        lines.push(current);
        current = word;
      } else {
        current = next;
      }

      if (w === words.length - 1 && current) {
        lines.push(current);
        current = "";
      }
    }
    // keep blank line if paragraph ends with an empty current
    if (paragraph === "" ) lines.push("");
  }

  // Map to positioned lines (top-anchored)
  return lines.map((line, i) => ({
    text: line,
    x: Math.round(x),
    y: Math.round(y + i * lineHeight),
  }));
};


  const toggleGrid = () => {
    setShowGrid((prevShowGrid) => !prevShowGrid);
    drawCanvas(activePage);
  };



// --- helpers ---
async function loadArrayBuffer(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return await res.arrayBuffer();
}

function pdfAscentAt(font, size) {
  if (typeof font.ascentAtSize === "function") return font.ascentAtSize(size);
  if (typeof font.heightAtSize === "function") return font.heightAtSize(size) * 0.83;
  return size * 0.8;
}

// Converges on the *same* top-left canvas coordinates you draw with
function resolveTopLeft(item, W, H) {
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



function clipToPage(pdfPage, W, H) {
  pdfPage.pushOperators(
    pushGraphicsState(),
    moveTo(0, 0),
    lineTo(W, 0),
    lineTo(W, H),
    lineTo(0, H),
    closePath(),
    clip(),   // W operator
    endPath() // n
  );
}

function unclip(pdfPage) {
  pdfPage.pushOperators(popGraphicsState());
}

async function saveAllPagesAsPDF() {
    const canvas = canvasRefs.current[activePage];
  const rect  = canvas.getBoundingClientRect();
  const ctx = canvas.getContext('2d');
// Helper: resolve text draw position (x, topY) and metrics in CSS units
  const resolveTextLayout = (item) => {
    const fontSize   = Number(item.fontSize) || 16;
    const fontFamily = item.fontFamily || "Lato";
    const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${fontSize}px ${fontFamily}`;

    const m = ctx.measureText(item.text || "");
    const ascent  = m.actualBoundingBoxAscent;
    const descent = m.actualBoundingBoxDescent;
    const textWidth  = m.width;
    const textHeight = ascent + descent;

    // Prefer normalized; DO NOT CLAMP so we can go off-canvas (negative or >1)
    const hasNorm = (item.xNorm != null) && (item.yNormTop != null);

    const x = hasNorm
      ? Number(item.xNorm) * rect.width
      : (Number(item.x) || 0);

    let topY;
    if (hasNorm) {
      topY = Number(item.yNormTop) * rect.height; // can be <0 or >rect.height
    } else {
      // Legacy: item.y may be baseline; convert to top if needed
      const anchor = item.anchor || "baseline"; // "top" | "baseline" | "bottom"
      const rawY = Number(item.y) || 0;
      if (anchor === "baseline")      topY = rawY - ascent;
      else if (anchor === "bottom")   topY = rawY - textHeight;
      else                            topY = rawY; // already top
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

  // Embed EXACT font (public assets are served from “/”, not “/public”)
  let pdfFont;
  try {
    const fontBytes = await loadArrayBuffer("/fonts/Lato-Regular.ttf");
    pdfFont = await pdfDoc.embedFont(fontBytes, { subset: true });
  } catch {
    pdfFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const manifest = {
    pageSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    pages: [],
  };

  const pageCount = Array.isArray(pageList) ? pageList.length : 0;

  for (let i = 0; i < pageCount; i++) {
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const pdfPage = pdfDoc.addPage([W, H]);

    const page = pageList[i] ?? {};
    const textItems = Array.isArray(page.textItems) ? page.textItems : [];
    const imageItems = Array.isArray(page.imageItems) ? page.imageItems : [];

    const pageManifest = { texts: [], images: [] };

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
        color: rgb(0, 0, 0),
      });

      pageManifest.texts.push({
        text,
        xNorm: +xNorm.toFixed(6),
        yNormTop: +yNormTop.toFixed(6),
        fontSize: size,
        anchor: "top",
        index: item.index,
      });
    }

    // ---- IMAGES (top-left canvas → bottom-left PDF) ----
    for (const item of imageItems) {
      let L = resolveTextLayout(item)
      const src = item.data || item.src;
      if (!src || typeof src !== "string") continue;

      const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);

      const bytes = await loadArrayBuffer(src);
      const isJpg = /^data:image\/jpeg/i.test(src) || /\.jpe?g$/i.test(src);
      const pdfImage = isJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);

      const drawW = item.width;
      const drawH = item.height;

      pdfPage.drawImage(pdfImage, {
        x: xTop,
        y: H - yTop - drawH, // flip Y
        width: drawW,
        height: drawH,
      });
      pageManifest.images.push({
        index: item.index,
        width: item.width,
        height: item.height,
        xNorm: +xNorm.toFixed(6),
        yNormTop: +yNormTop.toFixed(6),
        widthNorm: +((drawW) / W).toFixed(6),
        heightNorm: +((drawH) / H).toFixed(6),
        ref: item.data ?? null,
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


  useEffect(() => {
    drawCanvas(activePage);
  }, [textItems,imageItems, showGrid, isTextSelected, pageList, activePage, textBox, isMultilineMode]);



useEffect(() => {
  if (isPdfDownloaded === true) {
    // Group textItems by page
    const textOccurrences = textItems.reduce((acc, item) => {
      if (!acc[item.index]) acc[item.index] = [];
      acc[item.index].push(item);
      return acc;
    }, {});

    // Group imageItems by page
    const imageOccurrences = imageItems.reduce((acc, item) => {
      if (!acc[item.index]) acc[item.index] = [];
      acc[item.index].push(item);
      return acc;
    }, {});

    // Merge both into updatedPages
    const maxIndex = Math.max(
      ...Object.keys(textOccurrences).map(Number),
      ...Object.keys(imageOccurrences).map(Number),
      pageList.length - 1
    );

    const updatedPages = [...pageList];
    for (let i = 0; i <= maxIndex; i++) {
      const texts = textOccurrences[i] || [];
      const images = imageOccurrences[i] || [];

      updatedPages[i] = {
        textItems: texts,
        imageItems: images,
      };
    }

    setPages(updatedPages);
    setIsPdfDownloaded(false);
  }
}, [isPdfDownloaded, textItems, imageItems, pageList]);











const handleDoubleClick = (e) => {
  const canvas = canvasRefs.current[activePage];
  if (!canvas) return;


function toCssFromBacking(canvas, { offsetX, offsetY }) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: offsetX / sx, y: offsetY / sy };
}

  // Your getMousePosOnCanvas returns backing-store coords; convert to CSS units.
  const backing = getMousePosOnCanvas(e, canvas); // { offsetX, offsetY } in backing px
  const { x: mx, y: my } = toCssFromBacking(canvas, backing); // CSS px

  const ctx = canvas.getContext('2d');

  for (let index = 0; index < textItems.length; index++) {
    const item = textItems[index];
    if (item.index !== activePage) continue;

    const fontSize   = Number(item.fontSize) || 16;
    const fontFamily = item.fontFamily || 'Lato';
    const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

    // Use same settings as drawCanvas
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `${fontSize}px ${fontFamily}`;

    // Resolve item position (prefer normalized)
    const cssW = CANVAS_WIDTH;   // your logical canvas width
    const cssH = CANVAS_HEIGHT;  // your logical canvas height

    const hasNorm = item.xNorm != null && item.yNormTop != null;

    const x = hasNorm ? (Math.min(Math.max(item.xNorm, 0), 1) * cssW)
                      : (Number(item.x) || 0);

    let topY;
    if (hasNorm) {
      topY = Math.min(Math.max(item.yNormTop, 0), 1) * cssH; // top-anchored
    } else {
      // Legacy anchor conversion → top-anchored y
      const m = ctx.measureText(item.text || '');
      const ascent  = (typeof m.actualBoundingBoxAscent  === 'number') ? m.actualBoundingBoxAscent  : fontSize * 0.83;
      const descent = (typeof m.actualBoundingBoxDescent === 'number') ? m.actualBoundingBoxDescent : fontSize * 0.2;
      const textHeight = ascent + descent;

      const anchor = item.anchor || 'top'; // 'top' | 'baseline' | 'bottom'
      const rawY   = Number(item.y) || 0;
      if (anchor === 'baseline')       topY = rawY - ascent;
      else if (anchor === 'bottom')    topY = rawY - textHeight;
      else                              topY = rawY;
    }

    // Measure with the SAME font to get width/height
    const m2 = ctx.measureText(item.text || '');
    const ascent2  = (typeof m2.actualBoundingBoxAscent  === 'number') ? m2.actualBoundingBoxAscent  : fontSize * 0.83;
    const descent2 = (typeof m2.actualBoundingBoxDescent === 'number') ? m2.actualBoundingBoxDescent : fontSize * 0.2;
    const textWidth  = m2.width;
    const textHeight = ascent2 + descent2;

    // Top-anchored bounding box
    const boxX = x - padding;
    const boxY = topY - padding;
    const boxW = textWidth + padding * 2;
    const boxH = textHeight + padding * 2;

    // Hit-test in CSS units
    const isInside = (mx >= boxX && mx <= boxX + boxW && my >= boxY && my <= boxY + boxH);
    if (isInside) {
      setIsEditing(true);
      setEditingText(item.text);
      setEditingFontSize(fontSize);
      setEditingIndex(index);
      return;
    }
  }
};


// Function to save the edited text and font size
const saveEditedText = () => {
  if (editingIndex !== null && editingText.trim() !== '') {
    const updatedItems = [...textItems];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      text: editingText, // Update the text
      fontSize: editingFontSize, // Update the font size
      index: activePage,
      boxPadding: editingFontSize * 0.2,
    };

// In your handler where you append itemsToAdd
const nextTextItems = [ ...updatedItems];
setTextItems(nextTextItems);

// Use the SAME computed array right away:
saveTextItemsToLocalStorage?.(nextTextItems);

setPages(prev => {
  const next = Array.isArray(prev) ? [...prev] : [];
  const page = next[activePage] || { textItems: [], imageItems: [] };

  // Only items for this page
  const forThisPage = nextTextItems.filter(it => it.index === activePage);

  next[activePage] = {
    ...page,
    textItems: forThisPage.map(it => ({ ...it })), // keep immutable
    imageItems: page.imageItems || [],
  };
  return next;
});
    closeEditModal(); // Close the modal
    drawCanvas(activePage);
  }
};

// Function to close the edit modal
const closeEditModal = () => {
  setIsEditing(false);
  setEditingText('');
  setEditingIndex(null);
};


  // Handle file upload
const uploadPdfToServer = async () => {
  if (!selectedFile) {
    alert("No file selected. Please select a PDF file to upload.");
    return;
  }

  const formData = new FormData();
  formData.append("pdf", selectedFile);
  // optional flags your backend can ignore or use
formData.append("texts", "1");
formData.append("images", "1");

  try {
    const response = await axios.post(
      "http://localhost:5000/upload-pdf",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        // withCredentials: true, // enable if your Flask server uses cookies
      }
    );

    // Expecting an array with mixed items:
    //  - { type: "text", text, xNorm, yNormTop, fontSize, index, ... }
    //  - { type: "image", xNorm, yNormTop, widthNorm, heightNorm, index, ref(base64), ... }
    const payload = response?.data;

    if (!Array.isArray(payload)) {
      console.error("Unexpected response:", payload);
      alert("Server returned an unexpected response.");
      return;
    }

    // Basic sanity: ensure images carry the base64 `ref` if present
    // (Your updated backend embeds data URIs into `ref`.)
    // No changes needed here—this is just a guard.
    const normalized = payload.map(item => {
      if (item?.type === "image" && typeof item.ref !== "string") {
        // keep as-is; your draw code can still place a placeholder rect if needed
        // (or you can decide to filter images without ref)
      }
      return item;
    });

    setIsPdfDownloaded(true);
    // Your improved addTextToCanvas3 already handles both text and images
    addTextToCanvas3(normalized);
  } catch (error) {
    console.error("Error uploading PDF:", error);
    alert("Failed to upload PDF. Please try again.");
  }
};

const handleFileChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }
  // accept only PDFs
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    alert("Please select a valid PDF file.");
    return;
  }
  setSelectedFile(file);
};




return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif', position: 'relative'}}>
    {/* Sidebar */}
    <div
      style={{
        width: '260px',
        backgroundColor: '#f4f6f8',
        padding: '20px 10px',
        borderRight: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        height: '100vh',
        boxShadow: '2px 0 6px rgba(0,0,0,0.05)',
        scrollbarWidth: 'thin'
      }}
    >
      <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>📄 PdfEditor</h2>

      {[
        {
          title: 'PDF',
          icon: '📂',
          content: (
            <>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ marginBottom: '10px', width: '100%' }}
              />
              <button style={btnStyle} onClick={uploadPdfToServer}>Upload PDF</button>
              <button style={btnStyle} onClick={saveAllPagesAsPDF}>Save as PDF</button>
            </>
          )
        },
        {
          title: 'Pages',
          icon: '📄',
          content: (
            <>
              <button style={btnStyle} onClick={addNewPage}>Add Page</button>
              <button style={btnStyle} onClick={() => removePage({
                setSelectedTextIndexes,
                setSelectedTextIndex,
                setIsTextSelected,
                setSelectionStart,
                setSelectionEnd,
                setIsSelecting,
                setIsDragging,
                setIsImageDragging,
                setDraggedImageIndex,
                setResizingImageIndex,
                setTextItems,
                setImageItems,
                saveTextItemsToLocalStorage,
                saveImageItemsToLocalStorage,
                purgeUndoRedoForRemovedPage,
                textItems,
                imageItems,
                isTextBoxEditEnabled,
                textBox,
                activePage,
                isMultilineMode,
                canvasRefs,
                mlConfig,
                mlCaret,
                mlAnchor,
                mlPreferredX,
                mlText,
                mlCaretBlink,
                isMlDragging,
                fontSize,
                wrapTextPreservingNewlinesResponsive,
                resolveTextLayout,
                layoutMultiline,
                setMlPreferredX,
                showGrid, 
                APP_FONT_FAMILY,
                drawCanvas})}>Remove Page</button>
            </>
          )
        },
        {
          title: 'Text',
          icon: '🔤',
          content: (
            <>
              <button style={btnStyle} onClick={() => setShowAddTextModal(true)}>Add Text</button>
              <button
                style={{
                  ...btnStyle,
                  opacity: selectedTextIndex === null && selectedTextIndexes.length < 1 ? 0.5 : 1
                }}
                onClick={() => removeSelectedText({updatePageItems, activePage})}
                disabled={selectedTextIndex === null && selectedTextIndexes.length < 1}
              >
                Remove Text
              </button>
              <button style={btnStyle} onClick={toggleGrid}>
                {showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
            </>
          )
        },
        {
          title: 'Images',
          icon: '🖼️',
          content: (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {handleAddImage(e, activePage, setPages)}}
                style={{ marginBottom: '10px', width: '100%' }}
              />
              <button
                style={{ ...btnStyle, opacity: selectedImageIndex === null ? 0.5 : 1 }}
                onClick={deleteSelectedImage}
                disabled={selectedImageIndex === null}
              >
                Delete Image
              </button>
            </>
          )
        },
        {
          title: 'TextBox',
          icon: '📝',
          content: (
            <button
              style={btnStyle}
              onClick={() => {
                setIsTextBoxEditEnabled(prev => !prev);
                if (textBox !== null) addTextToCanvas2(textBox, maxWidth);
                setTextBox(null);
              }}
            >
              {isTextBoxEditEnabled ? 'Save TextBox' : 'Enable TextBox Edit'}
            </button>
          )
        },
        {
          title: 'History',
          icon: '⏪',
          content: (
            <>
              <button style={btnStyle} onClick={handleUndo}>Undo</button>
              <button style={btnStyle} onClick={handleRedo}>Redo</button>
            </>
          )
        },
        {
          title: 'MultiLine Mode',
          icon: '║',
          content: (
            <>
              <button onClick={() => {
                toggleMultilineMode();
                if(isMultilineMode === true) {
                  addTextToCanvasMlMode({    
                    canvasRefs,
                    activePage,
                    mlConfig,
                    mlText,
                    newFontSize,
                    pushSnapshotToUndo,
                    setPages,
                    setTextItems,
                    textItems
                  });
                  setMlText('');
                }
              }}>
                {isMultilineMode ? "Exit Multi-line mode" : "Multi-line mode"}
              </button>
            </>
          )
        },
        {
          title: 'Data',
          icon: '🗑️',
          content: (
            <>
              <button
                style={{ ...btnStyle, backgroundColor: '#ff4d4f', color: 'white' }}
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all saved data?')) {
                    // Clear persistent storage
                    localStorage.removeItem('undoStack');
                    localStorage.removeItem('redoStack');
                    localStorage.removeItem('pages');
                    localStorage.removeItem('textItems');
                    localStorage.removeItem('imageItems');

                    // Reset state to a single blank page
                    setUndoStack({});
                    setRedoStack({});
                    setTextItems([]);
                    setImageItems([]);
                    setPages([{"textItems":[],"imageItems":[]}]);       // single placeholder page
                    setActivePage(0);

                    // Optional: clear selection / editing states if you keep them
                    setSelectedTextIndex?.(null);
                    setSelectedTextIndexes?.([]);
                    setSelectedImageIndex?.(null);
                    setIsSelecting?.(false);
                    setIsDragging?.(false);
                    setIsImageDragging?.(false);
                    setResizingImageIndex?.(null);
                    setTextBox?.(null);
                    setIsTextSelected(false);
                    // Redraw fresh first page
                    drawCanvas(0);
                  }
                }}
              >
                Clear Data
              </button>
            </>
          )
        }
      ].map((section, index) => (
        
        <div key={index} style={{ marginTop: '20px' }}>
          <h4
            style={{
              marginBottom: '10px',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
            onClick={() =>
              setOpenSections(prev => ({
                ...prev,
                [section.title]: !prev[section.title]
              }))
            }
          >
            <span>{section.icon}</span>
            <span>{section.title}</span>
          </h4>
          {openSections[section.title] && <div style={{ paddingLeft: '8px' }}>{section.content}</div>}
        </div>
      ))}
    </div>

    {/* Canvas Area */}
    <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
      {pageList.map((_, index) => (
        <canvas
          key={index}
          ref={(el) => (canvasRefs.current[index] = el)}
          style={{
            display: 'block',
            width: canvasWidth,
            height: canvasHeight,
            border: activePage === index ? '1px solid dodgerblue' : '1px solid #ccc',
            backgroundColor: 'white',
            pointerEvents: 'auto',
            userSelect: 'none',
            MozUserSelect: 'none',
            WebkitUserSelect: 'none',
            marginBottom: '20px'
          }}
          onMouseDown={(e) => handleCanvasMouseDownMl(e, {
            isMultilineMode,
            activePage,
            canvasRefs,
            pdfToCssMargins,
            layoutMultiline,
            mlConfig,
            mlText,
            setMlCaret,
            setMlAnchor,
            setMlPreferredX,
            setIsMlDragging
          }) ? undefined : handleMouseDown(e,{ 
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
            setSelectionEnd})}
          onMouseMove={(e) => handleCanvasMouseMoveMl(e,{
                isMultilineMode,
                isMlDragging,
                canvasRefs,
                activePage,
                pdfToCssMargins,
                mlConfig,
                layoutMultiline,
                mlText,
                setMlCaret,
          }) ? undefined : handleMouseMove(e,{
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
          })}
          onMouseUp={(e) => handleCanvasMouseUpMl(e, { isMultilineMode, setIsMlDragging}) ? undefined : handleMouseUp(e,{
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
      })}
          onDoubleClick={handleDoubleClick}
          onClick={() => setActivePage(index)}
        />
      ))}
    </div>

    {/* Add Text Modal */}
    {showAddTextModal && (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        border: '1px solid #ccc',
        boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1000
      }}>
        <h2>Add New Text</h2>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Enter text here"
          style={{ marginBottom: '10px', display: 'block', width: '100%' }}
        />
        <input
          type="number"
          value={newFontSize}
          onChange={(e) => setNewFontSize(parseInt(e.target.value, 10))}
          placeholder="Font Size"
          style={{ marginBottom: '10px', display: 'block', width: '100%' }}
        />
        <input
          type="number"
          value={maxWidth}
          onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
          placeholder="Enter max width (e.g., 200)"
          style={{ marginBottom: '10px', display: 'block', width: '100%' }}
        />
        <div>
          <button onClick={addTextToCanvas}>Ok</button>
          <button
            onClick={() => {
              setShowAddTextModal(false);
              setNewText('');
              setMaxWidth(200);
              setNewFontSize(fontSize);
            }}
            style={{ marginLeft: '10px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Edit Text Modal */}
    {isEditing && (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        border: '1px solid #ccc',
        boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1000
      }}>
        <h2>Edit Text</h2>
        <input
          type="text"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          placeholder="Edit text here"
          style={{ marginBottom: '10px', display: 'block', width: '100%' }}
        />
        <input
          type="number"
          value={editingFontSize}
          onChange={(e) => setEditingFontSize(parseInt(e.target.value, 10))}
          placeholder="Font Size"
          style={{ marginBottom: '10px', display: 'block', width: '100%' }}
        />
        <div>
          <button onClick={saveEditedText}>Save</button>
          <button onClick={closeEditModal} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
);


}

export default App;