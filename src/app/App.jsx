import React, { useRef, useEffect, useLayoutEffect, useState} from 'react';
import axios from 'axios';
import './App.css'
import { DEFAULT_FONT_SIZE, CELL_SIZE, BOX_PADDING, CANVAS_WIDTH, CANVAS_HEIGHT, PDF_WIDTH, PDF_HEIGHT } from "../config/constants";
import { getMousePosOnCanvas } from "../utils/canvas/getMousePosOnCanvas";
import { useEditor } from "../context/EditorProvider";
import fontkit from "@pdf-lib/fontkit";
import { loadLatoOnce } from "../utils/font/fontLoader";
import {useHandleAddImage} from "../hooks/useHandleAddImage";
import { drawCanvas } from '../utils/canvas/draw/drawCanvas'
import { useClipboard } from "../hooks/useClipboard";
import {importStateFromJson} from '../utils/json/importStateFromJson'
import RulerOverlay from '../utils/ruler/RulerOverlay'
import { HostPasswordModal, ViewerPasswordModal, ShareLinkModal } from "../components/LiveShareModals";

import {
  pushGraphicsState, popGraphicsState,
  moveTo, lineTo, closePath, clip, endPath,
  PDFDocument, StandardFonts, rgb
} from "pdf-lib";


const App = () => {
  const fontSize = DEFAULT_FONT_SIZE;
  const cellSize = CELL_SIZE;
  const boxPadding = BOX_PADDING;
  const APP_FONT_FAMILY = "Lato";
  const canvasWidth = CANVAS_WIDTH;
  const canvasHeight = CANVAS_HEIGHT;
  const pdfWidth = PDF_WIDTH;
  const pdfHeight = PDF_HEIGHT;
  const fontsReadyRef = useRef(null);

  const jsonRef = useRef(null);
  const onJsonPick = () => jsonRef.current?.click();

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
      textColor, setTextColor,
      removeSelectedText, saveTextItemsToIndexedDB,
      wrapTextPreservingNewlinesResponsive, wrapTextResponsive,
      resolveTextLayout,
      resolveTextLayoutForHit, addTextToCanvas
    },

    images: { 
      imageItems, setImageItems,
      isImageDragging, setIsImageDragging,
      draggedImageIndex, setDraggedImageIndex,
      selectedImageIndex, setSelectedImageIndex,
      resizingImageIndex, setResizingImageIndex,
      resizeStart, setResizeStart, addImageFromFile,
      handleAddImage, saveImageItemsToIndexedDB,
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
    share: {
      onStartShare,
      getMethodsRef,
      isViewer,
      roomId,
      mode,
      broadcasterRef,
      getStateRef,
      hostPwModal,
      cancelHostPasswordModal,
      viewerPwModal,
      cancelViewerPasswordModal,
      submitViewerPassword,
      onConfirmHostPassword,
      shareLinkModal,
      closeShareLinkModal,
      copyShareLinkAgain,
    },
    pdf: { selectedFile, setSelectedFile, isPdfDownloaded, setIsPdfDownloaded },
  } = useEditor(); // ✅ correct
  useClipboard(useEditor());















  // ====== Disable user input in viewer mode ======
  const viewOnly = (e) => {
    if (!isViewer) return;
    e.preventDefault();
    e.stopPropagation();
  };




  // Whenever your app state changes (host mode), notify broadcaster
  useEffect(() => {
    if (mode !== "host" || !broadcasterRef.current) return;
    broadcasterRef.current.notifyChange();
  }, [mode, activePage, pageList, textItems]);


    // Whenever your app state changes (host mode), notify broadcaster
  useEffect(() => {
    getStateRef.current = {
      schemaVersion: 1,
      appVersion: "0.1.0",
      activePage: activePage,
      pageList: pageList,
      textItems: textItems,
    };
    getMethodsRef.current = {
      setTextItems,
      setPages,
      setActivePage,
    }
  }, [activePage, pageList, textItems]);














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
    saveTextItemsToIndexedDB,
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
      saveTextItemsToIndexedDB(updatedItems); // Save updated position in localStorage
    }

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
      saveTextItemsToIndexedDB?.(merged);
      return merged;
    });
  }
  if (newImageItems.length) {
    setImageItems?.((prev) => {
      const merged = Array.isArray(prev) ? [...prev, ...newImageItems] : [...newImageItems];
      saveImageItemsToIndexedDB?.(merged);
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
saveTextItemsToIndexedDB?.(nextTextItems);

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
    saveImageItemsToIndexedDB(filteredItems);
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

// --- Helpers you can place above saveAllPagesAsPDF() ---

// Draw an SVG data URI onto an offscreen canvas and return PNG bytes (Uint8Array)
async function rasterizeSvgDataUriToPngBytes(svgDataUri, width, height, background = "white") {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      // data: URIs are same-origin; no crossOrigin needed
      img.onload = async () => {
        const w = Number(width)  || img.naturalWidth  || 1024;
        const h = Number(height) || img.naturalHeight || Math.round((w * 3) / 4);

        const cvs = document.createElement("canvas");
        cvs.width = w;
        cvs.height = h;

        const ctx = cvs.getContext("2d");
        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, w, h);
        }
        // draw the SVG at target size
        ctx.drawImage(img, 0, 0, w, h);

        cvs.toBlob(async (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob() failed for SVG rasterization"));
          const ab = await blob.arrayBuffer();
          resolve(new Uint8Array(ab)); // Uint8Array for pdf-lib
        }, "image/png", 1.0);
      };
      img.onerror = (e) => reject(new Error("Failed to decode SVG image"));
      img.src = svgDataUri;
    } catch (err) {
      reject(err);
    }
  });
}

function isSvgDataUri(src) {
  return typeof src === "string" && /^data:image\/svg\+xml/i.test(src);
}

function isJpegLike(src) {
  return typeof src === "string" && (/^data:image\/jpe?g/i.test(src) || /\.jpe?g(\?.*)?$/i.test(src));
}

// Existing helper assumed in your code; keep as-is.
// If you don’t have it, implement a version that fetches http(s) and decodes non-SVG data URIs.
async function loadArrayBuffer(urlOrDataUri) {
  if (typeof urlOrDataUri !== "string") throw new Error("Invalid src");
  if (urlOrDataUri.startsWith("data:")) {
    // Generic data: URI decode (non-SVG). svg is handled elsewhere.
    const m = urlOrDataUri.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) {
      // try non-base64 data URIs
      const comma = urlOrDataUri.indexOf(",");
      const raw = decodeURIComponent(urlOrDataUri.slice(comma + 1));
      const encoder = new TextEncoder();
      return encoder.encode(raw).buffer;
    }
    const b64 = m[2];
    const binStr = atob(b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
    return bytes.buffer;
  }
  const res = await fetch(urlOrDataUri, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch: ${urlOrDataUri}`);
  return await res.arrayBuffer();
}

// --- Your modified function ---
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

    // ---- IMAGES (supports data:image/svg+xml;base64) ----
    for (const item of imageItems) {
      const src = item.data || item.src;
      if (!src || typeof src !== "string") continue;

      const { xTop, yTop, xNorm, yNormTop } = resolveTopLeft(item, W, H);
      const drawW = Number(item.width)  || Math.round((item.widthNorm ?? 0) * W);
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
saveTextItemsToIndexedDB?.(nextTextItems);

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

// ---------- canonical helpers ----------
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    const keys = Object.keys(value).filter(k => k !== "checksum" && k !== "checksumRaw").sort();
    for (const k of keys) out[k] = canonicalize(value[k]);
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return value;
}
function canonicalStringify(obj) {
  return JSON.stringify(canonicalize(obj));
}

// ---------- hashing ----------
async function sha256String(str) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (non-crypto)
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return "fallback_" + Math.abs(h).toString(16);
}
async function computeChecksum(obj) {
  return sha256String(canonicalStringify(obj));
}








// Helper: open the shared PdfEditorDB (version must match your other code)
function openEditorDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = indexedDB.open("PdfEditorDB", 3); // must match your DB_VERSION
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Helper: read the single "main" record from a given store
async function loadStoreRecord(storeName) {
  let db;
  try {
    db = await openEditorDB();
  } catch (e) {
    // IndexedDB not available
    return null;
  }

  try {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const record = await new Promise((resolve, reject) => {
      const r = store.get("main");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });

    return record;
  } finally {
    db.close && db.close();
  }
}

// Optional: tiny helper to safely parse localStorage if we ever need a fallback
function safeParse(raw) {
  if (!raw) return null;
  try {
    const first = JSON.parse(raw);
    if (typeof first === "string") {
      try {
        return JSON.parse(first);
      } catch {
        return first;
      }
    }
    return first;
  } catch {
    return null;
  }
}

// Main export: now prefers IndexedDB, not localStorage
async function exportStateToJson(
  pagesKey = "pages",
  textItemsKey = "textItems",
  imageItemsKey = "imageItems",
  filename = "state.json"
) {
  // 1) Try IndexedDB for pages / textItems / imageItems
  let pages = null;
  let textItems = [];
  let imageItems = [];

  try {
    const [pagesRec, textItemsRec, imageItemsRec] = await Promise.all([
      loadStoreRecord("pages"),
      loadStoreRecord("textItems"),
      loadStoreRecord("imageItems"),
    ]);

    if (pagesRec && Array.isArray(pagesRec.data)) {
      pages = pagesRec.data;
    }
    if (textItemsRec && Array.isArray(textItemsRec.data)) {
      textItems = textItemsRec.data;
    }
    if (imageItemsRec && Array.isArray(imageItemsRec.data)) {
      imageItems = imageItemsRec.data;
    }
  } catch (e) {
    console.warn("[exportStateToJson] IndexedDB read failed, will try localStorage fallback:", e);
  }

  // 2) Fallback: localStorage (only if IndexedDB gave us nothing)
  if (!pages && !textItems.length && !imageItems.length) {
    const pagesLS = safeParse(localStorage.getItem(pagesKey));
    const textItemsLS = safeParse(localStorage.getItem(textItemsKey)) || [];
    const imageItemsLS = safeParse(localStorage.getItem(imageItemsKey)) || [];

    pages = pagesLS || null;
    textItems = textItemsLS;
    imageItems = imageItemsLS;
  }

  // 3) If pages is still not a proper Page[] shape, reconstruct from items
  const isPageShape = (p) =>
    p &&
    typeof p === "object" &&
    Array.isArray(p.textItems) &&
    Array.isArray(p.imageItems);

  if (!Array.isArray(pages) || !pages.every(isPageShape)) {
    const maxIndex = Math.max(
      -1,
      ...textItems.map((t) =>
        Number.isFinite(t?.index) ? +t.index : -1
      ),
      ...imageItems.map((i) =>
        Number.isFinite(i?.index) ? +i.index : -1
      )
    );

    const pageCount = Math.max(0, maxIndex + 1);
    const grouped = Array.from({ length: pageCount }, () => ({
      textItems: [],
      imageItems: [],
    }));

    textItems.forEach((t) => {
      const i = Number.isFinite(t?.index) ? +t.index : 0;
      (grouped[i] ?? (grouped[i] = { textItems: [], imageItems: [] }))
        .textItems.push(t);
    });

    imageItems.forEach((img) => {
      const p = Number.isFinite(img?.index) ? +img.index : 0;
      (grouped[p] ?? (grouped[p] = { textItems: [], imageItems: [] }))
        .imageItems.push(img);
    });

    pages = grouped;
  }

  // 4) Base payload (no checksums)
  const base = {
    version: 2,
    savedAt: new Date().toISOString(),
    pages,
    textItems,
    imageItems,
  };

  // 5) Canonical checksum (object-based)
  const checksum = await computeChecksum(base);

  // 6) Prepare object WITH checksums, but leave checksumRaw blank for now
  const withBlank = { ...base, checksum, checksumRaw: "" };

  // Serialize once with blank checksumRaw — we will hash this exact text
  const textWithBlank = JSON.stringify(withBlank, null, 2);

  // 7) Raw text checksum (detects any textual edit)
  const checksumRaw = await sha256String(textWithBlank);

  // Final object
  const finalObj = { ...withBlank, checksumRaw };
  const finalText = JSON.stringify(finalObj, null, 2);

  // 8) Download
  const blob = new Blob([finalText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return finalObj;
}





async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsText(file);
  });
}

// Replace the checksumRaw value with "" while preserving surrounding formatting.
function blankChecksumRawInText(jsonText) {
  // Matches: "checksumRaw" : "anything including escapes"
  // and replaces the string with empty string ""
  return jsonText.replace(
    /("checksumRaw"\s*:\s*)"(?:[^"\\]|\\.)*"/,
    '$1""'
  );
}

async function verifyDualChecksums(originalText) {
  // Parse first to get fields
  let parsed;
  try {
    parsed = JSON.parse(originalText);
  } catch {
    return { ok: false, reason: "Invalid JSON", fail: "parse" };
  }

  // 1) Raw checksum check
  if (typeof parsed.checksumRaw !== "string") {
    return { ok: false, reason: "Missing checksumRaw", fail: "raw-missing" };
  }
  const blanked = blankChecksumRawInText(originalText);
  const actualRaw = await sha256String(blanked);
  const okRaw = parsed.checksumRaw === actualRaw;

  // 2) Canonical object checksum (optional but recommended)
  if (typeof parsed.checksum !== "string") {
    return { ok: false, reason: "Missing checksum", fail: "canon-missing", okRaw };
  }
  // Exclude both checksums for canonical hashing
  const { checksum, checksumRaw, ...rest } = parsed;
  const actualCanon = await computeChecksum(rest);
  const okCanon = parsed.checksum === actualCanon;

  return {
    ok: okRaw && okCanon,
    okRaw,
    okCanon,
    expectedRaw: parsed.checksumRaw,
    actualRaw,
    expectedCanon: parsed.checksum,
    actualCanon,
    parsed, // return parsed for the caller
  };
}

// Example onChange handler that enforces both checks
const onJSONChange = async (e) => {
  const file = e.target.files?.[0];
  e.currentTarget.value = "";
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const result = await verifyDualChecksums(text);

    if (!result.ok) {
      let msg = "Checksum verification failed.\n";
      if (result.fail === "parse") msg += "Reason: invalid JSON.";
      else {
        if (result.okRaw === false) {
          msg += `Raw text mismatch.\nExpectedRaw: ${result.expectedRaw}\nActualRaw:   ${result.actualRaw}\n`;
        }
        if (result.okCanon === false) {
          msg += `Canonical mismatch.\nExpected: ${result.expectedCanon}\nActual:   ${result.actualCanon}\n`;
        }
      }
      const proceed = window.confirm(`${msg}\nImport anyway?`);
      if (!proceed) return;
    }

    // Apply state (your existing helper)
    await importStateFromJson(file, {
      setPages,
      setTextItems,
      setImageItems,
      pagesKey: "pages",
      textItemsKey: "textItems",
      imageItemsKey: "imageItems",
    });
  } catch (err) {
    console.error("Failed to import state.json", err);
    alert("Invalid or corrupted state.json");
  }
};

  

  useEffect(() => {
    const c = canvasRefs.current[activePage];
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);




  const PRESET_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#4f46e5" },
];


function normalizeColor(c) {
  if (!c) return "#000000";

  // Already a valid 7-char hex? (#rrggbb)
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;

  // Convert named colors or rgb() to hex
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = c;

  const computed = ctx.fillStyle; // returns standardized color value

  // If browser returns something like "rgb(r,g,b)", convert to hex
  const m = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, "0");
    const g = Number(m[2]).toString(16).padStart(2, "0");
    const b = Number(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  // Last fallback: return black
  return "#000000";
}



return (
  <div className="app-shell">
    {/* Sidebar (left) */}
    <aside className="sidebar">
      {/* Sidebar header */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span className="sidebar-logo">📄</span>
          <div>
            <div className="sidebar-title-main">PdfEditor</div>
            <div className="sidebar-title-sub">Live collaborate & annotate</div>
          </div>
        </div>

        <div className="sidebar-share-row">
          {mode !== "viewer" && (
            <button
              className="btn btn-primary btn-share"
              onClick={isViewer ? viewOnly : onStartShare}
              disabled={isViewer}
            >
              {mode === "host" ? "Sharing…" : "Share workspace"}
            </button>
          )}
          {mode === "host" && (
            <div className="badge badge-room">Room: {roomId}</div>
          )}
          {isViewer && (
            <div className="badge badge-viewer">VIEW-ONLY</div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Sidebar sections */}
      <div className="sidebar-sections">
        {[
          {
            title: "PDF",
            icon: "📂",
            description: "Import and export your PDF document.",
            content: (
              <>
                <label className="field-label">Upload PDF</label>
                <input
                  className="input-file"
                  type="file"
                  accept="application/pdf"
                  onChange={isViewer ? viewOnly : handleFileChange}
                  disabled={isViewer}
                />
                <div className="btn-row">
                  <button
                    className="btn btn-secondary"
                    onClick={isViewer ? viewOnly : uploadPdfToServer}
                    disabled={isViewer}
                  >
                    Upload to server
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={isViewer ? viewOnly : saveAllPagesAsPDF}
                    disabled={isViewer}
                  >
                    Export as PDF
                  </button>
                </div>
              </>
            ),
          },
          {
            title: "Pages",
            icon: "📄",
            description: "Manage pages in your document.",
            content: (
              <>
                <div className="btn-row">
                  <button
                    className="btn btn-secondary"
                    onClick={isViewer ? viewOnly : addNewPage}
                    disabled={isViewer}
                  >
                    Add Page
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={
                      isViewer
                        ? viewOnly
                        : () =>
                            removePage({
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
                              saveTextItemsToIndexedDB,
                              saveImageItemsToIndexedDB,
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
                              drawCanvas,
                            })
                    }
                    disabled={isViewer}
                  >
                    Remove Page
                  </button>
                </div>
              </>
            ),
          },
          {
            title: "Text",
            icon: "🔤",
            description: "Add and manage text items.",
            content: (
              <>
                <div className="btn-row">
                  <button
                    className="btn btn-secondary"
                    onClick={
                      isViewer ? viewOnly : () => setShowAddTextModal(true)
                    }
                    disabled={isViewer}
                  >
                    Add Text
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={
                      isViewer
                        ? viewOnly
                        : () =>
                            removeSelectedText({
                              updatePageItems,
                              activePage,
                            })
                    }
                    disabled={
                      isViewer ||
                      (selectedTextIndex === null &&
                        selectedTextIndexes.length < 1)
                    }
                    style={{
                      opacity:
                        selectedTextIndex === null &&
                        selectedTextIndexes.length < 1
                          ? 0.5
                          : 1,
                    }}
                  >
                    Remove Selected
                  </button>
                </div>
                <div className="toggle-row">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={isViewer ? viewOnly : toggleGrid}
                      disabled={isViewer}
                    />
                    <span>Show grid</span>
                  </label>
                </div>
              </>
            ),
          },
          {
            title: "Images",
            icon: "🖼️",
            description: "Insert and manage images.",
            content: (
              <>
                <label className="field-label">Upload Image</label>
                <input
                  className="input-file"
                  type="file"
                  accept="image/*"
                  onChange={
                    isViewer
                      ? viewOnly
                      : (e) => {
                          handleAddImage(e, activePage, setPages);
                        }
                  }
                  disabled={isViewer}
                />
                <button
                  className="btn btn-secondary"
                  onClick={isViewer ? viewOnly : deleteSelectedImage}
                  disabled={isViewer || selectedImageIndex === null}
                  style={{
                    opacity: selectedImageIndex === null ? 0.5 : 1,
                    marginTop: 8,
                  }}
                >
                  Delete Selected
                </button>
              </>
            ),
          },
          {
            title: "TextBox",
            icon: "📝",
            description: "Edit multi-line textbox content.",
            content: (
              <button
                className="btn btn-secondary"
                onClick={
                  isViewer
                    ? viewOnly
                    : () => {
                        setIsTextBoxEditEnabled((prev) => !prev);
                        if (textBox !== null) addTextToCanvas2(textBox, maxWidth);
                        setTextBox(null);
                      }
                }
                disabled={isViewer}
              >
                {isTextBoxEditEnabled ? "Save TextBox" : "Enable TextBox Edit"}
              </button>
            ),
          },
          {
            title: "History",
            icon: "⏪",
            description: "Undo / redo recent changes.",
            content: (
              <div className="btn-row">
                <button
                  className="btn btn-secondary"
                  onClick={isViewer ? viewOnly : handleUndo}
                  disabled={isViewer}
                >
                  Undo
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={isViewer ? viewOnly : handleRedo}
                  disabled={isViewer}
                >
                  Redo
                </button>
              </div>
            ),
          },
          {
            title: "MultiLine Mode",
            icon: "║",
            description: "Switch multiline input mode.",
            content: (
              <button
                className="btn btn-secondary"
                onClick={
                  isViewer
                    ? viewOnly
                    : () => {
                        toggleMultilineMode();
                        if (isMultilineMode === true) {
                          addTextToCanvasMlMode({
                            canvasRefs,
                            activePage,
                            mlConfig,
                            mlText,
                            newFontSize,
                            pushSnapshotToUndo,
                            setPages,
                            setTextItems,
                            textItems,
                          });
                          setMlText("");
                        }
                      }
                }
                disabled={isViewer}
              >
                {isMultilineMode
                  ? "Exit Multi-line Mode"
                  : "Enter Multi-line Mode"}
              </button>
            ),
          },
          {
            title: "State",
            icon: "💾",
            description: "Save and load editor state as JSON.",
            content: (
              <>
                <div className="btn-row">
                  <button
                    className="btn btn-secondary"
                    onClick={isViewer ? viewOnly : () => exportStateToJson()}
                    disabled={isViewer}
                  >
                    Save JSON
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={isViewer ? viewOnly : onJsonPick}
                    disabled={isViewer}
                  >
                    Load JSON
                  </button>
                </div>
                <input
                  ref={jsonRef}
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={isViewer ? viewOnly : onJSONChange}
                  disabled={isViewer}
                />
              </>
            ),
          },
          {
            title: "Data",
            icon: "🗑️",
            description: "Reset all persistent data.",
            content: (
              <button
                className="btn btn-danger"
                onClick={
                  isViewer
                    ? viewOnly
                    : () => {
                        if (
                          window.confirm(
                            "Are you sure you want to clear all saved data?"
                          )
                        ) {
                          localStorage.removeItem("undoStack");
                          localStorage.removeItem("redoStack");
                          localStorage.removeItem("pages");
                          localStorage.removeItem("textItems");
                          localStorage.removeItem("imageItems");

                          setUndoStack({});
                          setRedoStack({});
                          setTextItems([]);
                          setImageItems([]);
                          setPages([{ textItems: [], imageItems: [] }]);
                          setActivePage(0);

                          setSelectedTextIndex?.(null);
                          setSelectedTextIndexes?.([]);
                          setSelectedImageIndex?.(null);
                          setIsSelecting?.(false);
                          setIsDragging?.(false);
                          setIsImageDragging?.(false);
                          setResizingImageIndex?.(null);
                          setTextBox?.(null);
                          setIsTextSelected(false);

                          drawCanvas(0);
                        }
                      }
                }
                disabled={isViewer}
              >
                Clear All Data
              </button>
            ),
          },
        ].map((section, idx) => (
          <div key={idx} className="sidebar-section">
            <button
              className="section-header"
              onClick={
                isViewer
                  ? viewOnly
                  : () =>
                      setOpenSections((prev) => ({
                        ...prev,
                        [section.title]: !prev[section.title],
                      }))
              }
              type="button"
            >
              <div className="section-header-main">
                <span className="section-icon">{section.icon}</span>
                <span className="section-title">{section.title}</span>
              </div>
              <span className="section-chevron">
                {openSections[section.title] ? "▴" : "▾"}
              </span>
            </button>
            {openSections[section.title] && (
              <div className="section-body">
                {section.description && (
                  <div className="section-description">
                    {section.description}
                  </div>
                )}
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>

    {/* Main (right) */}
    <main className="main-content">
      <div className="pages-grid">
        {pageList.map((_, index) => {
          const isActive = activePage === index;
          const canvasEl = canvasRefs.current[index];

          const pageWrapStyle = {
            position: "relative",
            display: "inline-block",
            boxShadow: "0 0 0 1px #e5e7eb",
            borderRadius: 8,
            background: "#f9fafb",
          };

          const canvasStyle = {
            display: "block",
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            backgroundColor: "white",
            border: isActive ? "1px solid #3b82f6" : "1px solid #d1d5db",
            userSelect: "none",
            MozUserSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "auto",
          };

          return (
            <div
              key={index}
              style={pageWrapStyle}
              className={`page-wrapper ${isActive ? "page-wrapper-active" : ""}`}
              onClick={isViewer ? viewOnly : () => setActivePage(index)}
            >
              <canvas
                ref={(el) => (canvasRefs.current[index] = el)}
                style={canvasStyle}
                onMouseDown={
                  isViewer
                    ? viewOnly
                    : (e) =>
                        handleCanvasMouseDownMl(e, {
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
                          setIsMlDragging,
                        })
                          ? undefined
                          : handleMouseDown(e, {
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
                              setSelectionEnd,
                            })
                }
                onMouseMove={
                  isViewer
                    ? viewOnly
                    : (e) =>
                        handleCanvasMouseMoveMl(e, {
                          isMultilineMode,
                          isMlDragging,
                          canvasRefs,
                          activePage,
                          pdfToCssMargins,
                          mlConfig,
                          layoutMultiline,
                          mlText,
                          setMlCaret,
                        })
                          ? undefined
                          : handleMouseMove(e, {
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
                              fontSize,
                            })
                }
                onMouseUp={
                  isViewer
                    ? viewOnly
                    : (e) =>
                        handleCanvasMouseUpMl(e, {
                          isMultilineMode,
                          setIsMlDragging,
                        })
                          ? undefined
                          : handleMouseUp(e, {
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
                              history,
                            })
                }
                onDoubleClick={isViewer ? viewOnly : handleDoubleClick}
              />

              {/* Only render RulerOverlay when canvas is ready */}
              {isActive && canvasEl && (
                <div className="ruler-overlay-container">
                  <RulerOverlay
                    canvasRef={{ current: canvasEl }}
                    zoom={1}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>

   {/* Add Text Modal */}
{showAddTextModal && (
  <div className="modal-backdrop">
    <div className="modal">
      <h2 className="modal-title">Add New Text</h2>

      {/* Text content */}
      <label className="field-label">Text</label>
      <input
        type="text"
        value={newText}
        onChange={isViewer ? viewOnly : (e) => setNewText(e.target.value)}
        placeholder="Enter text here"
        className="input-text"
        disabled={isViewer}
      />

      {/* Font size */}
      <label className="field-label">Font size</label>
      <input
        type="number"
        value={newFontSize}
        onChange={
          isViewer
            ? viewOnly
            : (e) => setNewFontSize(parseInt(e.target.value, 10))
        }
        className="input-text"
        disabled={isViewer}
      />

      {/* Max width */}
      <label className="field-label">Max width (px)</label>
      <input
        type="number"
        value={maxWidth}
        onChange={
          isViewer
            ? viewOnly
            : (e) => setMaxWidth(parseInt(e.target.value, 10))
        }
        className="input-text"
        disabled={isViewer}
      />

      {/* Full color picker */}
<label className="field-label">Text color</label>

<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  }}
>
  <input
    type="color"
    className="input-color"
    value={normalizeColor(textColor)}
    onChange={
      isViewer
        ? viewOnly
        : (e) => setTextColor(normalizeColor(e.target.value))
    }
    disabled={isViewer}
    style={{ width: 40, height: 40, padding: 0, border: "none" }}
  />

  <div style={{ fontSize: 13, color: "#555" }}>
    <div style={{ marginBottom: 4 }}>
      Selected: {normalizeColor(textColor)}
    </div>
    <div
      style={{
        width: 32,
        height: 16,
        borderRadius: 4,
        border: "1px solid #ccc",
        background: normalizeColor(textColor),
      }}
    />
  </div>
</div>

{/* Preset swatch palette */}
<div style={{ marginBottom: 16 }}>
  <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>
    Preset colors
  </div>

  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    }}
  >
    {PRESET_COLORS.map((c) => (
      <button
        key={c.value}
        type="button"
        disabled={isViewer}
        onClick={
          isViewer
            ? viewOnly
            : () => setTextColor(normalizeColor(c.value))
        }
        style={{
          width: 28,
          height: 28,
          borderRadius: "999px",
          border:
            normalizeColor(textColor) === normalizeColor(c.value)
              ? "2px solid #111827"
              : "1px solid rgba(0,0,0,0.2)",
          background: normalizeColor(c.value),
          cursor: isViewer ? "not-allowed" : "pointer",
        }}
        title={c.label}
      />
    ))}
  </div>
</div>

      {/* Actions */}
      <div className="modal-actions">
        <button
          className="btn btn-primary"
          onClick={
            isViewer
              ? viewOnly
              : () =>
                  addTextToCanvas({
                    canvasRefs,
                    activePage,
                    setupCanvasA4,
                    wrapText,
                    resolveTopLeft,
                    PDF_WIDTH,
                    PDF_HEIGHT,
                    pushSnapshotToUndo,
                    textItems,
                    setPages,
                    fontSize,
                    // make sure addTextToCanvas ultimately uses `textColor`
                  })
          }
          disabled={isViewer}
        >
          Add
        </button>
        <button
          className="btn btn-secondary"
          onClick={
            isViewer
              ? viewOnly
              : () => {
                  setShowAddTextModal(false);
                  setNewText("");
                  setMaxWidth(200);
                  setNewFontSize(fontSize);
                }
          }
          disabled={isViewer}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

    {/* Edit Text Modal */}
    {isEditing && (
      <div className="modal-backdrop">
        <div className="modal">
          <h2 className="modal-title">Edit Text</h2>
          <label className="field-label">Text</label>
          <input
            type="text"
            value={editingText}
            onChange={
              isViewer ? viewOnly : (e) => setEditingText(e.target.value)
            }
            className="input-text"
            disabled={isViewer}
          />
          <label className="field-label">Font size</label>
          <input
            type="number"
            value={editingFontSize}
            onChange={
              isViewer
                ? viewOnly
                : (e) => setEditingFontSize(parseInt(e.target.value, 10))
            }
            className="input-text"
            disabled={isViewer}
          />
          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={isViewer ? viewOnly : saveEditedText}
              disabled={isViewer}
            >
              Save
            </button>
            <button
              className="btn btn-secondary"
              onClick={isViewer ? viewOnly : closeEditModal}
              disabled={isViewer}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    
    {/* ======================= LIVE SHARE MODALS (Point 4) ======================= */}
    <HostPasswordModal
      open={hostPwModal.open}
      pending={hostPwModal.pending}
      error={hostPwModal.error}
      onCancel={cancelHostPasswordModal}
      onSubmit={onConfirmHostPassword}
    />
    <ShareLinkModal
      open={shareLinkModal.open}
      link={shareLinkModal.link}
      copied={shareLinkModal.copied}
      onClose={closeShareLinkModal}
      onCopyAgain={copyShareLinkAgain}
    />
    <ViewerPasswordModal
      open={viewerPwModal.open}
      pending={viewerPwModal.pending}
      error={viewerPwModal.error}
      onCancel={cancelViewerPasswordModal}
      onSubmit={submitViewerPassword}
    />
    {/* ========================================================================== */}
  </div>
);







}

export default App;