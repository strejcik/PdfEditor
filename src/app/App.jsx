import { useRef, useEffect, useLayoutEffect, useCallback} from 'react';
import axios from 'axios';
import './App.css'
import { DEFAULT_FONT_SIZE, CELL_SIZE, BOX_PADDING, CANVAS_WIDTH, CANVAS_HEIGHT, PDF_WIDTH, PDF_HEIGHT } from "../config/constants";
import { getMousePosOnCanvas } from "../utils/canvas/getMousePosOnCanvas";
import { useEditor } from "../context/EditorProvider";
import fontkit from "@pdf-lib/fontkit";
import { loadLatoOnce } from "../utils/font/fontLoader";
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


//   async function ensureAppFontLoaded(
//   family = "Lato",
//   url = "../../public/fonts/Lato-Regular.ttf",
//   descriptors = { style: "normal", weight: "400", as:"font"}
// ) {
//   try {
//     // Already available?
//     if (document.fonts?.check?.(`12px "${family}"`)) return;

//     // Load via FontFace API
//     const face = new FontFace(family, `url(${url})`, descriptors);
//     await face.load();
//     document.fonts.add(face);

//     // Wait until ready to ensure accurate measureText
//     if (document.fonts?.ready) await document.fonts.ready;
//   } catch (err) {
//     // Don’t crash rendering if the font fails to load
//     console.warn("[fonts] Failed to load", { family, url, err });
//   }
// }

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
    },

    images: { imageItems, setImageItems,
    isImageDragging, setIsImageDragging,
    draggedImageIndex, setDraggedImageIndex,
    selectedImageIndex, setSelectedImageIndex,
    resizingImageIndex, setResizingImageIndex,
    resizeStart, setResizeStart, addImageFromFile},

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
    toggleMultilineMode
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
  }, [pageList, textItems, imageItems, mlText, mlCaretBlink, mlAnchor,
mlPreferredX /* + any other draw deps */]);


useEffect(() => {
  if (!isMultilineMode) return;
  const id = setInterval(() => setMlCaretBlink(v => !v), 1000);
  return () => clearInterval(id);
}, [isMultilineMode]);

const toUnits = (str) => Array.from(str ?? "");

const handleAddImage = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  pushSnapshotToUndo(activePage);        // snapshot BEFORE mutation
  await addImageFromFile(file, activePage, { x: 50, y: 50, scale: 0.5 });

  // If you don't use the effect-driven draw yet, force a draw:
  // drawCanvas(activePage);

  e.target.value = ""; // allow re-selecting same file
};



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



// Save image items to local storage
const saveImageItemsToLocalStorage = (items) => {
  const serializedImages = items.map((item) => {
    // if(item.index === activePage) {
      
    // }
    return {
      data: item.data, // Save base64 data
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      index: item.index
    }
  });
  // if(serializedImages.length > 0) {
    
  // }
  localStorage.setItem('imageItems', JSON.stringify(serializedImages));
};


// Utility function to create an Image element from base64 data
const createImageElement = (data) => {
  const img = new Image();
  img.src = data;
  return img;
};


  useEffect(() => {
    // Add keydown event listener for moving text with arrow keys
    window.addEventListener('keydown', handleTextMove);
    return () => window.removeEventListener('keydown', handleTextMove);
  }, [isTextSelected, selectedTextIndex, textItems]);



  // Function to remove selected text
const removeSelectedText = () => {
  let updatedItems = [...textItems];

  // === Remove Multiple Selected Texts ===
  if (selectedTextIndexes.length > 0) {
    // Filter out all selected indexes
    updatedItems = updatedItems.filter((_, i) => !selectedTextIndexes.includes(i));

    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    // Update only visible page's text items
    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    // Clear selection
    setSelectedTextIndexes([]);
    setIsTextSelected(false);
    setSelectedTextIndex(null);
    return; // prevent running single delete block
  }

  // === Remove Single Selected Text ===
  if (selectedTextIndex !== null) {
    updatedItems = updatedItems.filter((_, i) => i !== selectedTextIndex);

    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
};

  const saveTextItemsToLocalStorage = (items) => {
    localStorage.setItem('textItems', JSON.stringify(items));
  };

const wrapTextPreservingNewlinesResponsive = (text, ctx, initialWidth, fontSize, padding = 10) => {
  const paragraphs = text.split('\n');
  const lines = [];

  let maxLineWidth = 0;

  paragraphs.forEach(paragraph => {
    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth + padding * 2 > initialWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }

      // If last word, push it
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
      }

      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
    });
  });

  const lineHeight = fontSize + 4;
  const totalHeight = lines.length * lineHeight;

  return {
    lines,
    width: maxLineWidth + padding * 2,
    height: totalHeight + padding * 2
  };
};


const wrapTextResponsive = (text, maxWidth, ctx) => {
  const paragraphs = text.split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/);
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }

      // Push remaining line after the last word
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
    });
  });

  return lines;
};

async function drawCanvas(pageIndex) {
    // Load the exact font you use for measuring/drawing (same as PDF export)
  await loadLatoOnce("../../public/fonts/Lato-Regular.ttf", APP_FONT_FAMILY);
  if (document.fonts?.ready) await document.fonts.ready;


  const canvas = canvasRefs.current[pageIndex];
  if (!canvas) return;



  

  // === Size/scale canvas to match its CSS box ===
  const rect  = canvas.getBoundingClientRect();
  const dpr   = window.devicePixelRatio || 1;
  canvas.width  = Math.round(rect.width  * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const ctx = canvas.getContext("2d");
  
  // Draw in CSS units (no need to think in backing pixels)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Clear and optional grid in CSS units
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (showGrid) drawGrid(ctx, rect.width, rect.height);

   // ========= MULTI-LINE MODE =========
  if (isMultilineMode) {
    drawMultilinePage(ctx, pageIndex);
    // Optionally early return to hide regular items while in multi-line mode:
  }

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
    const descent = m.actualBoundingBoxDescent
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

  // === DRAW TEXT ITEMS (normalized-first, off-canvas allowed) ===
  textItems.forEach((item, globalIndex) => {
    if (item.index !== pageIndex) return;

    const L = resolveTextLayout(item);
    const boxX = Math.round(L.x)    - L.padding;
    const boxY = Math.round(L.topY) - L.padding;
    const boxW = L.textWidth  + L.padding * 2;
    const boxH = L.textHeight + L.padding * 2;

    // Bounding box when selected
    if (selectedTextIndexes.includes(globalIndex)) {
      ctx.strokeStyle = "rgba(30, 144, 255, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

    // Optional vertical guide line
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "dodgerblue";
    ctx.moveTo(Math.round(L.x) - L.padding, 0);
    ctx.lineTo(Math.round(L.x) - L.padding, rect.height);
    ctx.stroke();
    ctx.restore();

    // Draw the text (top-anchored at L.topY)
    ctx.fillStyle = "black";
    ctx.font = `${L.fontSize}px ${L.fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(item.text || "", Math.round(L.x), Math.round(L.topY + L.textHeight));
  });

  // === DRAW IMAGE ITEMS (normalized-first, off-canvas allowed) ===
  imageItems.forEach((item) => {
    if (item.index !== pageIndex) return;

    const hasNormPos  = (item.xNorm != null) && (item.yNormTop != null);
    const hasNormSize = (item.widthNorm != null) && (item.heightNorm != null);

    // DO NOT CLAMP: allow negative / >1
    const x    = hasNormPos  ? Number(item.xNorm)    * rect.width  : (Number(item.x)      || 0);
    const yTop = hasNormPos  ? Number(item.yNormTop) * rect.height : (Number(item.y)      || 0);
    const w    = hasNormSize ? Number(item.widthNorm)  * rect.width  : (Number(item.width)  || 0);
    const h    = hasNormSize ? Number(item.heightNorm) * rect.height : (Number(item.height) || 0);

    const src = item.data || item.src;
    const imgEl = createImageElement(src);
    if (!imgEl || !imgEl.complete || !imgEl.naturalWidth) {
      if (imgEl) {
        imgEl.onload = () => requestAnimationFrame(() => drawCanvas(pageIndex));
      }
      return;
    }

    ctx.drawImage(imgEl, Math.round(x), Math.round(yTop), Math.round(w), Math.round(h));

    // Resize handle
    const handleSize = 10;
    ctx.fillStyle = "dodgerblue";
    ctx.fillRect(
      Math.round(x + w - handleSize / 2),
      Math.round(yTop + h - handleSize / 2),
      handleSize,
      handleSize
    );

    // Outline
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x), Math.round(yTop), Math.round(w), Math.round(h));
  });

  // === DRAW SELECTION RECT ===
  if (
    isSelecting &&
    selectionStart &&
    selectionEnd &&
    activePage === pageIndex &&
    (selectionStart.x !== selectionEnd.x || selectionStart.y !== selectionEnd.y)
  ) {
    const width  = selectionEnd.x - selectionStart.x;
    const height = selectionEnd.y - selectionStart.y;

    ctx.strokeStyle = "dodgerblue";
    ctx.fillStyle = "rgba(30, 144, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(selectionStart.x, selectionStart.y, width, height);
    ctx.fillRect(selectionStart.x, selectionStart.y, width, height);
  }

  // === DRAW TEXTBOX ===
  if (isTextBoxEditEnabled && textBox && activePage === pageIndex) {
    const padding = textBox.boxPadding || 10;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height);

    // Drag handle
    const dragPointSize = 10;
    ctx.fillStyle = "dodgerblue";
    ctx.fillRect(
      textBox.x + textBox.width - dragPointSize,
      textBox.y + textBox.height - dragPointSize,
      dragPointSize,
      dragPointSize
    );

    // Text inside the box (top-anchored)
    ctx.fillStyle = "black";
    const boxFontSize = textBox.fontSize || fontSize;
    ctx.font = `${boxFontSize}px ${APP_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    const wrapped = wrapTextPreservingNewlinesResponsive(
      textBox.text,
      ctx,
      textBox.width,
      boxFontSize,
      padding
    );

    wrapped.lines.forEach((line, idx) => {
      ctx.fillText(line, textBox.x + padding, textBox.y + padding + idx * (boxFontSize + 4));
    });
  }
}


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


   // Add a new page
   const addNewPage = () => {
    setPages((prev) => [...prev, { textItems: [], imageItems: [] }]);
    setActivePage(pageList.length); // Switch to the new page
  };



// changed removePage function (with undo/redo purge)
const removePage = () => {
  if (pageList.length <= 1) {
    alert('Cannot remove the last page.');
    return;
  }

  const removedPage = activePage;

  // Remove page
  const updatedPages = pageList.filter((_, index) => index !== removedPage);

  // Reindex live items
  const reindex = (arr) =>
    arr
      .filter(it => it.index !== removedPage)
      .map(it => ({
        ...it,
        index: it.index > removedPage ? it.index - 1 : it.index
      }));

  const updatedTextItems  = reindex(textItems);
  const updatedImageItems = reindex(imageItems);

  setPages(updatedPages);
  setTextItems(updatedTextItems);
  setImageItems(updatedImageItems);
  saveTextItemsToLocalStorage(updatedTextItems);
  saveImageItemsToLocalStorage(updatedImageItems);

  // Purge and reindex undo/redo stacks for the removed page
  purgeUndoRedoForRemovedPage(removedPage);

  // Move active page
  const newActivePage = Math.max(0, removedPage - 1);
  setActivePage(newActivePage);

  // Optional: clear selections/drag state here if they referenced the removed page

  drawCanvas(newActivePage);
};



  const drawGrid = (ctx) => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < ctx.canvas.width; x += cellSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
    }

    for (let y = 0; y < ctx.canvas.height; y += cellSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
    }

    ctx.stroke();
  };





  // CSS mouse position (works with React events too)
function getCssMousePos(e, canvas) {
  const evt = e?.nativeEvent ?? e;
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}


// Map your getMousePosOnCanvas() (backing pixels) to CSS units used by drawCanvas.
function toCssFromBacking(canvas, { offsetX, offsetY }) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return { x: offsetX / sx, y: offsetY / sy };
}

// Resolve text layout exactly like drawCanvas (top-anchored, normalized-first)
// Compute the same layout used for drawing a text item (top-anchored).
function resolveTextLayoutForHit(item, ctx, canvas) {
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = rect.height;

  const fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? Number(item.boxPadding) : Math.round(fontSize * 0.2);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const m = ctx.measureText(item.text || "");
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : fontSize * 0.83;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : fontSize * 0.20;
  const textWidth  = m.width;
  const textHeight = ascent + descent;
  ctx.restore();

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);

  // ❌ no clamping — allow negative / > canvas values
  const x = hasNorm
    ? Number(item.xNorm) * cssW
    : (Number(item.x) || 0);

  let topY;
  if (hasNorm) {
    // ❌ no clamping
    topY = Number(item.yNormTop) * cssH;
  } else {
    // Legacy pixel mode: convert baseline/bottom to top
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "baseline"; // keep legacy default
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
    box: {
      x: x - padding,
      y: topY - padding,
      w: textWidth + padding * 2,
      h: textHeight + padding * 2,
    },
  };
}
function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// clamp 0..1
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);


// Resolve image rect in CSS units (prefers normalized fields).
function resolveImageRectCss(item, canvas) {
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = rect.height;

  const hasNormPos  = (item.xNorm != null) && (item.yNormTop != null);
  const hasNormSize = (item.widthNorm != null) && (item.heightNorm != null);

  // ❌ no clamp on positions
  const x = hasNormPos  ? Number(item.xNorm)    * cssW : (Number(item.x)      || 0);
  const y = hasNormPos  ? Number(item.yNormTop) * cssH : (Number(item.y)      || 0);

  // No clamp on size either; just coerce to finite and >= 0
  const wPx = hasNormSize ? Number(item.widthNorm)  * cssW : (Number(item.width)  || 0);
  const hPx = hasNormSize ? Number(item.heightNorm) * cssH : (Number(item.height) || 0);
  const w = Number.isFinite(wPx) ? Math.max(0, wPx) : 0;
  const h = Number.isFinite(hPx) ? Math.max(0, hPx) : 0;

  return { x, y, w, h, cssW, cssH };
}



const handleMouseDown = (e) => {
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



// useEffect(() => {
//   const u = JSON.parse(localStorage.getItem('undoStack') || '{}');
//   const r = JSON.parse(localStorage.getItem('redoStack') || '{}');
//   setUndoStack(u);
//   setRedoStack(r);
// }, []);

// useEffect(() => {
//   drawCanvas(activePage);
// }, [undoStack, redoStack]);

useEffect(() => { drawCanvas(activePage); }, [activePage, textItems, imageItems]);



// const applySnapshotToPage = (snapshot) => {
//   const newTextItems = snapshot.textItems.map(item => ({ ...item }));
//   const newImageItems = snapshot.imageItems.map(item => ({ ...item }));

//   // Update global textItems
//   const updatedTextItems = textItems
//     .filter(item => item.index !== activePage)
//     .concat(newTextItems);

//   setTextItems(updatedTextItems);
//   saveTextItemsToLocalStorage(updatedTextItems);

//   // Update global imageItems
//   const updatedImageItems = imageItems
//     .filter(item => item.index !== activePage)
//     .concat(newImageItems);

//   setImageItems(updatedImageItems);
//   saveImageItemsToLocalStorage(updatedImageItems);

//   // Update the corresponding page
//   const updatedPages = [...pageList];
//   updatedPages[activePage] = {
//     ...updatedPages[activePage],
//     textItems: newTextItems,
//     imageItems: newImageItems
//   };
//   setPages(updatedPages);
//   localStorage.setItem('pages', JSON.stringify(updatedPages));
// };




const handleUndo = () => {
  fnUndoStack(activePage)
};



const handleRedo = () => {
  fnRedoStack(activePage);
};






// Mirrors your drawCanvas metrics and does NOT clamp xNorm/yNormTop
function resolveTextLayoutForHit(item, ctx, canvas) {
  const rect = canvas.getBoundingClientRect();

  const fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const m = ctx.measureText(item.text || "");
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : fontSize * 0.8;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : fontSize * 0.2;
  const textW = m.width;
  const textH = ascent + descent;
  ctx.restore();

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);
  const x = hasNorm ? Number(item.xNorm)    * rect.width  : (Number(item.x) || 0);
  let topY;
  if (hasNorm) {
    topY = Number(item.yNormTop) * rect.height; // can be negative / > rect.height
  } else {
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "top"; // "top" | "baseline" | "bottom"
    if (anchor === "baseline")      topY = rawY - ascent;
    else if (anchor === "bottom")   topY = rawY - textH;
    else                            topY = rawY;
  }

  const box = {
    x: x - padding,
    y: topY - padding,
    w: textW + padding * 2,
    h: textH + padding * 2,
  };

  return { x, topY, w: textW, h: textH, padding, box };
}

// Image rect in CSS units; NO clamping on normalized values
function resolveImageRectCss(item, canvas) {
  const rect = canvas.getBoundingClientRect();
  const hasNormPos  = (item.xNorm != null) && (item.yNormTop != null);
  const hasNormSize = (item.widthNorm != null) && (item.heightNorm != null);

  const x = hasNormPos  ? Number(item.xNorm)    * rect.width  : (Number(item.x)      || 0);
  const y = hasNormPos  ? Number(item.yNormTop) * rect.height : (Number(item.y)      || 0);
  const w = hasNormSize ? Number(item.widthNorm)  * rect.width  : (Number(item.width)  || 0);
  const h = hasNormSize ? Number(item.heightNorm) * rect.height : (Number(item.height) || 0);

  return { x, y, w, h, cssW: rect.width, cssH: rect.height };
}





const handleMouseMove = (e) => {
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
      initialPositions.forEach((pos) => {
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
    selectedTextIndexes.forEach((idx) => {
      const it = updated[idx];
      const init = initialPositions.find(p => p.index === idx);
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



useEffect(() => {
  if (shouldClearSelectionBox) {
    setSelectionStart(null);
    setSelectionEnd(null);
    setShouldClearSelectionBox(false);
    requestAnimationFrame(() => drawCanvas(activePage));
  }
}, [shouldClearSelectionBox]);


const handleMouseUp = (e) => {
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

  const getCanvasPoint = (evt, el) => {
    const r = el.getBoundingClientRect();
    return { x: evt.clientX - r.left, y: evt.clientY - r.top };
  };

  if (isResizing) setIsResizing(false);

  if (isDragging) {
    setIsDragging(false);
    setInitialPositions([]);
    setDragStart({ x: 0, y: 0 });
    if (typeof pushSnapshotToUndo === "function") {
      pushSnapshotToUndo(activePage);
    } else if (history?.pushSnapshotToUndo) {
      history.pushSnapshotToUndo(activePage);
    }
  }

  if (resizingImageIndex !== null) setResizingImageIndex(null);
  if (isImageDragging) {
    setIsImageDragging(false);
    setDraggedImageIndex(null);
    setDragStart({ x: 0, y: 0 });
    if (typeof pushSnapshotToUndo === "function") {
      pushSnapshotToUndo(activePage);
    } else if (history?.pushSnapshotToUndo) {
      history.pushSnapshotToUndo(activePage);
    }
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

    const pointInRect = (px, py, r) =>
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





// optional: keep some state in refs to avoid stale closures
const selectedTextIndexesRef = useRef(selectedTextIndexes);
useEffect(() => { selectedTextIndexesRef.current = selectedTextIndexes; }, [selectedTextIndexes]);

const handleKeyDown = useCallback((e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  const typingInDOMField =
    tag === "input" || tag === "textarea" || e.target?.isContentEditable;
























    

  // Ctrl + A: select all textItems on the active page
  if (e.ctrlKey && (e.key === "a" || e.key === "A") && !isMultilineMode) {
    e.preventDefault();

    // Build ids only for the active page (no undefined holes)
    const allIds = textItems
      .map((it, idx) => (it.index === activePage ? idx : null))
      .filter((v) => v !== null);

    setSelectedTextIndexes(allIds);
    setIsTextSelected(allIds.length > 0);
    setSelectedTextIndex(allIds.length ? allIds[allIds.length - 1] : null);
    return;
  }

  if (e.key === "Delete" && !isMultilineMode) {
    e.preventDefault();
    const toRemove = selectedTextIndexesRef.current;
    if (toRemove.length > 0) {
      const updated = textItems.filter((_, i) => !toRemove.includes(i));
      setTextItems(updated);
      saveTextItemsToLocalStorage(updated);
      updatePageItems("textItems", updated.filter(it => it.index === activePage));
      setSelectedTextIndexes([]);
      setIsTextSelected(false);
      setSelectedTextIndex(null);
      return;
    }
  }

  // TextBox inline typing
  if (isTextBoxEditEnabled && textBox && !typingInDOMField && !isMultilineMode) {
    let updatedText = textBox.text;
    if (e.key === "Enter")       updatedText += "\n";
    else if (e.key === "Backspace") updatedText = updatedText.slice(0, -1);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
      updatedText += e.key;
    else return;

    const ctx = canvasRefs.current[activePage].getContext("2d");
    ctx.font = `${textBox.fontSize || fontSize}px Arial`;
    const result = wrapTextPreservingNewlinesResponsive(
      updatedText, ctx, textBox.width, fontSize, textBox.boxPadding || 10
    );
    setTextBox({ ...textBox, text: updatedText, width: result.width, height: result.height });
  }

  // MULTI-LINE MODE
  if (isMultilineMode && !typingInDOMField) {
    // ignore meta shortcuts except shift for selection
    if (e.metaKey || e.ctrlKey) return;

    const units = toUnits(mlText);
    const clamp = (v) => Math.max(0, Math.min(v, units.length));

    // selection helpers
    const hasSel = mlCaret !== mlAnchor;
    const selA = Math.min(mlCaret, mlAnchor);
    const selB = Math.max(mlCaret, mlAnchor);

    // prepare layout for navigation
    const canvas = canvasRefs.current[activePage];
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
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

    const moveCaret = (newPos, keepAnchor=false) => {
      const pos = clamp(newPos);
      setMlCaret(pos);
      if (!keepAnchor) setMlAnchor(pos);
      const { x } = indexToXY(pos, layout);
      setMlPreferredX(x);
    };

    // Navigation
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (hasSel && !e.shiftKey) {
        moveCaret(selA, false); // collapse to start
      } else {
        moveCaret(mlCaret - 1, e.shiftKey);
      }
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (hasSel && !e.shiftKey) {
        moveCaret(selB, false); // collapse to end
      } else {
        moveCaret(mlCaret + 1, e.shiftKey);
      }
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      // go to line start
      const { line } = indexToXY(mlCaret, layout);
      if (line) moveCaret(line.start, e.shiftKey);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      const { line } = indexToXY(mlCaret, layout);
      if (line) moveCaret(line.end, e.shiftKey);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const dir = (e.key === "ArrowUp") ? -1 : 1;
      const { x, line } = indexToXY(mlCaret, layout);
      const targetX = mlPreferredX ?? x;

      let li = layout.lines.findIndex(L => mlCaret >= L.start && mlCaret <= L.end);
      if (li === -1) li = 0;
      const newLi = li + dir;
      if (newLi >= 0 && newLi < layout.lines.length) {
        const L = layout.lines[newLi];
        // find column by nearest boundary to targetX
        let bestCol = 0, bestDist = Infinity;
        for (let c = 0; c < L.charX.length; c++) {
          const d = Math.abs(L.charX[c] - targetX);
          if (d < bestDist) { bestDist = d; bestCol = c; }
        }
        if(e.key === "ArrowUp") {
          moveCaret(L.start + bestCol, e.shiftKey);
        }
        if(e.key === "ArrowDown") {
          moveCaret((L.start + bestCol) + dir, e.shiftKey);
        }
      }
      return;
    }

    // Editing
    if (e.key === "Enter") {
      e.preventDefault();
      let next = mlText;
      if (hasSel) next = toUnits(next).slice(0, selA).join("") + "\n" + toUnits(next).slice(selB).join("");
      else        next = toUnits(next).slice(0, mlCaret).join("") + "\n" + toUnits(next).slice(mlCaret).join("");
      setMlText(next);
      const newPos = hasSel ? selA + 1 : mlCaret + 1;
      setMlCaret(newPos);
      setMlAnchor(newPos);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (hasSel) {
        const next = toUnits(mlText).slice(0, selA).concat(toUnits(mlText).slice(selB)).join("");
        setMlText(next); moveCaret(selA, false);
      } else if (mlCaret > 0) {
        const arr = toUnits(mlText);
        arr.splice(mlCaret - 1, 1);
        setMlText(arr.join("")); moveCaret(mlCaret - 1, false);
      }
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      if (hasSel) {
        const next = toUnits(mlText).slice(0, selA).concat(toUnits(mlText).slice(selB)).join("");
        setMlText(next); moveCaret(selA, false);
      } else {
        const arr = toUnits(mlText);
        if (mlCaret < arr.length) { arr.splice(mlCaret, 1); setMlText(arr.join("")); }
      }
      return;
    }

    // Insert printable character
    if (e.key.length === 1) {
      e.preventDefault();
      const ch = e.key;
      let arr = toUnits(mlText);
      if (hasSel) {
        arr = arr.slice(0, selA).concat([ch], arr.slice(selB));
        setMlText(arr.join("")); moveCaret(selA + 1, false);
      } else {
        if(arr.length === 0) {
          const ch = e.key;

          // Current text as grapheme array
          const units = toUnits(mlText);


          let newUnits, newPos;

          if (hasSel) {
            // Replace selection with the typed char
            newUnits = units.slice(0, selA).concat([ch], units.slice(selB));
            newPos = selA + 1;
          } else {
            // Insert at caret
            newUnits = units.slice(0, mlCaret).concat([ch], units.slice(mlCaret));
            newPos = mlCaret + 1;              // ← caret after the newly inserted char
          }

          const newText = newUnits.join("");
          setMlText(newText);

          // Set caret & anchor AFTER text so it lands after the new char
          setMlCaret(newPos);
          setMlAnchor(newPos);
          return ;
        }
        arr.splice(mlCaret, 0, ch);
        setMlText(arr.join(""));
        setMlCaret(mlCaret + 1);
        setMlAnchor(mlCaret + 1);
      }
      return;
    }

    return; // handled multiline
  }
}, [
  // keep these minimal—avoid re-creating handler constantly
  activePage,
  canvasRefs,
  fontSize,
  isTextBoxEditEnabled,
  textBox,
  textItems,
  isMultilineMode,
  mlText,
  mlCaret, mlAnchor, mlPreferredX, activePage, mlConfig,
  setSelectedTextIndexes,
  setIsTextSelected,
  setSelectedTextIndex,
  setTextItems,
  setMlText,
]);

useEffect(() => {
  // Use document for better reliability; capture=false is fine
  document.addEventListener("keydown", handleKeyDown, { passive: false });
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
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





  // Robust per-line layout, preserving newlines, with per-char positions for hit-testing.
function layoutMultiline(ctx, text, { x, y, maxWidth, maxHeight, fontSize, fontFamily, lineGap }) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const probe = ctx.measureText("Mg");
  const ascent  = (probe.actualBoundingBoxAscent  ?? fontSize * 0.83);
  const descent = (probe.actualBoundingBoxDescent ?? fontSize * 0.20);
  const lineHeight = Math.ceil(ascent + descent + lineGap);

  const lines = [];
  let cursorY = y;
  let globalIndex = 0; // index within mlText (code point based)

  const paras = String(text ?? "").split("\n");
  for (let p = 0; p < paras.length; p++) {
    const para = paras[p];
    const words = para.split(" ");

    const pushLine = (lineText) => {
      if (cursorY + lineHeight > y + maxHeight) return false;
      // precompute per-char Xs (boundaries)
      const units = toUnits(lineText);
      const charX = [x];
      let running = 0;
      for (let i = 0; i < units.length; i++) {
        running += ctx.measureText(units[i]).width;
        charX.push(x + running); // boundary after char i
      }
      lines.push({
        text: lineText,
        x,
        y: cursorY,
        width: running,
        height: lineHeight,
        start: globalIndex,
        end: globalIndex + units.length, // exclusive
        charX, // length = units.length + 1
        ascent, descent,
      });
      cursorY += lineHeight;
      globalIndex += units.length;
      return true;
    };

    let current = "";
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const next = current ? current + " " + word : word;

      const wordW = ctx.measureText(word).width;
      const nextW = ctx.measureText(next).width;

      if (wordW > maxWidth) {
        // break word by characters
        if (current) { if (!pushLine(current)) return { lines, lineHeight, ascent, descent }; current = ""; }
        const units = toUnits(word);
        let chunk = "";
        for (let i = 0; i < units.length; i++) {
          const tryChunk = chunk + units[i];
          if (ctx.measureText(tryChunk).width > maxWidth && chunk) {
            if (!pushLine(chunk)) return { lines, lineHeight, ascent, descent };
            chunk = units[i];
          } else {
            chunk = tryChunk;
          }
        }
        current = chunk;
      } else if (nextW > maxWidth && current) {
        if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
        current = word;
      } else {
        current = next;
      }

      if (w === words.length - 1) {
        if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
        current = "";
      }
    }

    // newline char (empty line at paragraph boundary)
    if (p < paras.length - 1) {
      // represent the newline as an empty line if needed
      if (!pushLine("")) return { lines, lineHeight, ascent, descent };
      // account for the newline in global index
      globalIndex += 1; // the "\n"
    }
  }

  // If text ended without explicit newline, globalIndex already accounted from lines
  return { lines, lineHeight, ascent, descent };
}

// Convert a (x,y) click into a caret index
function hitTestToIndex(x, y, layout) {
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

// Convert a caret index → (x,y, line metrics)
function indexToXY(index, layout, preferredX = null, verticalDir = 0) {
  const { lines, lineHeight } = layout;
  if (lines.length === 0) return { x: 0, y: 0, line: null };

  // clamp index into total range
  const totalStart = lines[0].start;
  const totalEnd   = lines[lines.length - 1].end;
  const idx = Math.max(totalStart, Math.min(index, totalEnd));

  // find current line
  let li = lines.findIndex(L => idx >= L.start && idx <= L.end);
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













  function pdfToCssMargins(rect, marginsPDF) {
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

// returns { lines: [{text,x,y}], lineHeight, clipped:boolean }
function wrapParagraphsToWidth(ctx, text, {
  x, y, maxWidth, fontSize, fontFamily, lineGap = 0, maxHeight = Infinity
}) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px ${fontFamily}`;

  // robust line height from tight metrics
  const probe = ctx.measureText("Mg");
  const ascent  = probe.actualBoundingBoxAscent;
  const descent = probe.actualBoundingBoxDescent
  const lineHeight = Math.ceil(ascent + descent + lineGap);

  const out = [];
  let cursorY = y;
  let clipped = false;

  const paragraphs = String(text ?? "").split("\n");

  for (let p = 0; p < paragraphs.length; p++) {
    const para = paragraphs[p];
    // collapse multiple spaces visually but keep a single space for wrapping
    // (optional: remove this if you want literal spaces)
    const words = para.split(" ");

    let current = "";

    const pushLine = (s) => {
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
      if (!pushLine("")) return { lines: out, lineHeight, clipped: true };
    }
  }

  return { lines: out, lineHeight, clipped };
}



function drawMultilinePage(ctx, pageIndex) {
if (pageIndex !== activePage) return;

  const canvas = canvasRefs.current[pageIndex];
  const rect = canvas.getBoundingClientRect();

  // margins in CSS px
  const m = pdfToCssMargins(rect, mlConfig.marginsPDF);

  const x = m.left;
  const y = m.top;
  const maxWidth  = Math.max(0, rect.width  - (m.left + m.right));
  const maxHeight = Math.max(0, rect.height - (m.top  + m.bottom));

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.setLineDash([4,4]);
  ctx.strokeRect(x, y, maxWidth, maxHeight);
  ctx.restore();

  // layout
  ctx.font = `${mlConfig.fontSize}px ${mlConfig.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const layout = layoutMultiline(ctx, mlText, {
    x, y, maxWidth, maxHeight,
    fontSize: mlConfig.fontSize,
    fontFamily: mlConfig.fontFamily,
    lineGap: mlConfig.lineGap
  });

  // ---- Selection highlight ----
  const selA = Math.min(mlCaret, mlAnchor);
  const selB = Math.max(mlCaret, mlAnchor);
  const hasSelection = selB > selA;

  if (hasSelection) {
    ctx.save();
    ctx.fillStyle = "rgba(30,144,255,0.25)";
    for (const L of layout.lines) {
      const s = Math.max(selA, L.start);
      const e = Math.min(selB, L.end);
      if (e <= s) continue;

      const startCol = s - L.start;
      const endCol   = e - L.start;
      const startX = L.charX[startCol];
      const endX   = L.charX[endCol];

      const highlightX = Math.max(x, startX);
      const highlightW = Math.max(0, Math.min(x + maxWidth, endX) - highlightX);
      if (highlightW > 0) {
        ctx.fillRect(highlightX, L.y, highlightW, L.height);
      }
    }
    ctx.restore();
  }

  // ---- Draw text ----
  ctx.fillStyle = "black";
  for (const L of layout.lines) {
    ctx.fillText(L.text, L.x, L.y);
  }

  // ---- Draw caret (blink) ----
  if (isMultilineMode && !hasSelection && mlCaretBlink) {
    const { x: cx, y: cy, line } = indexToXY(mlCaret, layout);
    const caretTop = cy;
    const caretBottom = cy + (line ? line.height : layout.lineHeight);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, caretTop);
    ctx.lineTo(cx + 0.5, caretBottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.restore();
  }

  // Keep preferredX in sync with current caret column
  const { x: curX } = indexToXY(mlCaret, layout);
  if (mlPreferredX == null || !isMlDragging) {
    // store latest "natural" x so up/down can honor it
    setMlPreferredX(curX);
  }

  // Expose layout for hit-testing by other handlers if needed
  return layout;
}



const handleCanvasMouseDownMl = (e) => {
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

const handleCanvasMouseMoveMl = (e) => {
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

const handleCanvasMouseUpMl = (e) => {
  if (!isMultilineMode) return false;
  setIsMlDragging(false);
  return true;
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
      // After you compute the canvas top-anchored y (e.g., `yTop`)
    // let yTop = toCanvasTopLeftY(ln)
    // console.log("[A] add", {
    //   page: activePage,
    //   fontSize: newFontSize,
    //   yCanvasTop: R(yTop),
    //   CANVAS_HEIGHT,
    //   yNormTopExpected: R(yTop / CANVAS_HEIGHT),
    // });
    return {
      text: ln.text,
      x: ln.x,
      y: ln.y,
      fontSize: fontSizeToUse,
      boxPadding: padding,
      index: activePage,
      anchor: "top",
      fontFamily,            // optional, helps keep draw/export consistent
    }
  });


  // Snapshot BEFORE state change for undo
  pushSnapshotToUndo(activePage);

  // Update global textItems
  setTextItems((prev) => [...prev, ...itemsToAdd]);

  // Sync into the pages slice so persistence/refresh works
setPages(prev => {
  const next = [...prev];
  const page = next[activePage] || { textItems: [], imageItems: [] };
  next[activePage] = {
    ...page,
    textItems: [...(page.textItems || []), ...itemsToAdd.map(it => ({ ...it }))], // spread preserves xNorm/yNormTop
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




const addTextToCanvas3 = (textArray = []) => {
  const usingImport = Array.isArray(textArray) && textArray.length > 0;

  if (!usingImport && (!newText || newText.trim() === "")) return;

  // snapshot BEFORE mutation (for undo)
  if (typeof pushSnapshotToUndo === "function") {
    pushSnapshotToUndo(activePage);
  } else if (history?.pushSnapshotToUndo) {
    history.pushSnapshotToUndo(activePage);
  }

  const fontFamily = "Lato"; // keep in sync with draw & PDF export
  const fallbackSize = Number(newFontSize) || Number(fontSize) || 16;

  let itemsToAdd = [];

  if (usingImport) {
    // Backend path: items contain xNorm (0..1 from left), yNormTop (0..1 from top)
    itemsToAdd = textArray.map((src) => {
      const size = Number(src.fontSize) || fallbackSize;

      const xNorm = src.xNorm != null ? (src.xNorm)
                  : (src.x != null ? (src.x / CANVAS_WIDTH) : 0);

      const yNormTop = src.yNormTop != null ? (src.yNormTop)
                     : (src.y != null ? (src.y / CANVAS_HEIGHT) : 0);

      const x = Math.round(xNorm * CANVAS_WIDTH);
      const y = Math.round(yNormTop * CANVAS_HEIGHT);

      const padding = src.boxPadding != null ? Number(src.boxPadding) : Math.round(size * 0.2);

      return {
        text: String(src.text ?? ""),
        fontSize: size,
        fontFamily,
        boxPadding: padding,
        // store BOTH pixel and normalized for round-trip + rendering
        x, y,
        xNorm, yNormTop,
        index: src.index ?? activePage,
        anchor: "top",
      };
    });
  } else {
    // Manual entry path: wrap in CANVAS pixels, also store normalized
    const canvas = canvasRefs.current[activePage];
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const size = fallbackSize;
    const padding = Math.round(size * 0.2);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${size}px ${fontFamily}`;

    // pick a sensible maxWidth
    const measured = ctx.measureText(newText).width;
    const safeDefault = Math.max(measured + 20, size * 2);
    const effectiveMaxWidth =
      (typeof maxWidth === "number" && maxWidth > size) ? maxWidth : safeDefault;

    // wrapText should return CANVAS coords (top-left anchored)
    // Expected shape per line: { text, x, y }
    const lines = wrapText(newText, ctx, {
      x: 50,
      y: 50,
      maxWidth: effectiveMaxWidth,
      fontSize: size,
      fontFamily,
      lineGap: 0,
    });

    itemsToAdd = lines.map((ln) => {
      const x = Math.round(ln.x);
      const y = Math.round(ln.y);
      const xNorm = x / CANVAS_WIDTH;
      const yNormTop = y / CANVAS_HEIGHT;

      return {
        text: ln.text,
        fontSize: size,
        fontFamily,
        boxPadding: padding,
        x, y,
        xNorm, yNormTop,
        index: activePage,
        anchor: "top",
      };
    });
  }

  // update flat items
  setTextItems((prev) => [...prev, ...itemsToAdd]);

  // also sync into pages[activePage] so it persists on refresh
  setPages((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const page = next[activePage] || { textItems: [], imageItems: [] };
    next[activePage] = {
      ...page,
      textItems: [...(page.textItems || []), ...itemsToAdd.map(it => ({ ...it }))],
    };
    return next;
  });

  // reset modal UI (when coming from manual entry)
  if (!usingImport) {
    setShowAddTextModal(false);
    setNewText("");
    setNewFontSize(fontSize);
    setMaxWidth(200);
  }

  // force redraw if your effects don’t auto-trigger
  if (typeof drawCanvas === "function") {
    drawCanvas(activePage);
  }
};

const addTextToCanvasMlMode = () => {
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
  lines = lines.map(line => {
    if(line.text.length === 0) return;
    return {
      index: activePage,
      x: line.x,
      y: line.y,
      anchor: 'top',
      padding: padding,
      fontFamily: 'Lato',
      fontSize: 20,
      text: line.text
    }
  });

//   // Sync into the pages slice so persistence/refresh works
// setPages(prev => {
//   const next = [...prev];
//   const page = next[activePage] || { textItems: [], imageItems: [] };
//   next[activePage] = {
//     ...page,
//     textItems: [...(page.textItems || []), l], // spread preserves xNorm/yNormTop
//   };
//   return next;
// });



  // const updatedItems = [...textItems, ...lines];
  // console.log(updatedItems);
  // pushSnapshotToUndo(activePage);
  // setTextItems(updatedItems);
  // saveTextItemsToLocalStorage(updatedItems);
  // updatePageItems('textItems', updatedItems);
  // drawCanvas(activePage);


  // Snapshot BEFORE state change for undo
  pushSnapshotToUndo(activePage);

  // Sync into the pages slice so persistence/refresh works
  setPages(prev => {
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
  // force redraw if your effects don’t auto-trigger
  if (typeof drawCanvas === "function") {
    drawCanvas(activePage);
  }
}

const addTextToCanvas2 = (textBox) => {
    if (textBox?.text?.trim()) {
    const padding = newFontSize * 0.2;
    const ctx = canvasRefs.current[activePage].getContext('2d');
    const innerWidth = textBox.width - padding * 2;
    const lines = wrapTextResponsive(textBox.text, innerWidth, ctx);
    const lineHeight = newFontSize + 5;

    const textItemsToAdd = lines.map((line, i) => ({
      text: line,
      fontSize: newFontSize,
      boxPadding: padding,
      x: textBox.x + padding,
      y: textBox.y + 20 + i * lineHeight,
      index: activePage,
    }));

    const updatedItems = [...textItems, ...textItemsToAdd];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);
    updatePageItems('textItems', updatedItems);
    setTextBox(null);
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
        xNorm: +xNorm.toFixed(6),
        yNormTop: +yNormTop.toFixed(6),
        widthNorm: +((drawW) / W).toFixed(6),
        heightNorm: +((drawH) / H).toFixed(6),
        ref: item.ref ?? null,
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
  }, [textItems, showGrid, isTextSelected, pageList, activePage, textBox, isMultilineMode]);



  const updatePageItems = (type, items) => {
    const updatedPages = [...pageList];
    updatedPages.map((page, index) => {
      if (index === activePage){
        updatedPages[activePage][type] = items;
        setPages(updatedPages);
      } else {
        return ;
      }
    })

  };


  useEffect(() => {
    if(isPdfDownloaded === true) { 

      const occurrences = textItems.reduce((acc, item) => {
        if (!acc[item.index]) {
          acc[item.index] = [];
        }
        acc[item.index].push(item);
        return acc;
      }, {});
  
      // Format result
      const result = Object.entries(occurrences).map(([index, texts]) => ({
        index: Number(index),
        texts,
        occurrence: texts.length
      }));

      
      let updatedPages = pageList;
      for(let i=0; i< result.length; i++) {
        updatedPages[i] = {
          "textItems": result[i].texts,
          "imageItems": []
        }
        setActivePage(i);
      }
      setPages(updatedPages);
    }
    setIsPdfDownloaded(false);
  }, [isPdfDownloaded])











const handleDoubleClick = (e) => {
  const canvas = canvasRefs.current[activePage];
  if (!canvas) return;

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
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
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

    try {
      const response = await axios.post("http://localhost:5000/upload-pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("PDF uploaded successfully:");
      setIsPdfDownloaded(true);
      addTextToCanvas3(response.data);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Failed to upload PDF. Please try again.");
    }
  };

  //Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("Please select a valid PDF file.");
    }
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
              <button style={btnStyle} onClick={removePage}>Remove Page</button>
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
                onClick={removeSelectedText}
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
                onChange={handleAddImage}
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
                  addTextToCanvasMlMode();
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
                    setPages([{}]);       // single placeholder page
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
          onMouseDown={(e) => handleCanvasMouseDownMl(e) ? undefined : handleMouseDown(e)}
          onMouseMove={(e) => handleCanvasMouseMoveMl(e) ? undefined : handleMouseMove(e, index)}
          onMouseUp={(e) => handleCanvasMouseUpMl(e) ? undefined : handleMouseUp(e)}
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