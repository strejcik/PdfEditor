import React, { useRef, useEffect, useLayoutEffect, useState} from 'react';
import './App.css'
import { DEFAULT_FONT_SIZE, CELL_SIZE, BOX_PADDING, CANVAS_WIDTH, CANVAS_HEIGHT, PDF_WIDTH, PDF_HEIGHT } from "../config/constants";
import { getMousePosOnCanvas } from "../utils/canvas/getMousePosOnCanvas";
import { useEditor } from "../context/EditorProvider";
import { loadLatoOnce } from "../utils/font/fontLoader";
import {useHandleAddImage} from "../hooks/useHandleAddImage";
import { drawCanvas } from '../utils/canvas/draw/drawCanvas'
import { useClipboard } from "../hooks/useClipboard";
import {importStateFromJson} from '../utils/json/importStateFromJson'
import RulerOverlay from '../utils/ruler/RulerOverlay'
import { HostPasswordModal, ViewerPasswordModal, ShareLinkModal } from "../components/LiveShareModals";
import { wrapText } from "../utils/text/wrapText";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { handleJSONImport } from "../utils/json/jsonImportHandler";
import { clearAllEditorState } from "../utils/persistance/indexedDBCleaner";
import { savePages } from "../utils/persistance/pagesStorage";
import { saveShapeItemsToIndexedDB } from "../utils/persistance/indexedDBHelpers";
import { exportStateToJson } from "../utils/json/exportStateToJson";
import { deleteSelectedImage } from "../utils/images/deleteSelectedImage";
import { resolveTopLeft } from "../utils/canvas/resolveTopLeft";
import { saveAllPagesAsPDF } from "../utils/pdf/exportPdf";
import { saveEditedText } from "../utils/text/saveEditedText";
import { closeEditModal } from "../utils/text/closeEditModal";
import { uploadPdfToServer } from "../utils/pdf/uploadPdfToServer";
import { handleFileChange } from "../utils/files/handleFileChange";
import { ShapeToolbar } from "../components/ShapeToolbar";
import { isPointInShape, getResizeHandle } from "../utils/shapes/shapeHitDetection";
import { handleShapeMouseDown, handleShapeMouseMove, handleShapeMouseUp } from "../utils/shapes/shapeMouseHandlers";
import FontSelector from "../components/FontSelector";
import ColorPicker from "../components/ColorPicker";


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
  const [showLoadJsonModal, setShowLoadJsonModal] = useState(false);
  const pendingFileRef = useRef(null);

  const onJsonPick = () => {
    setShowLoadJsonModal(true);
  };

  const handleLoadJsonConfirm = async () => {
    setShowLoadJsonModal(false);
    // Clear IndexedDB and localStorage
    await clearAllEditorState();
    // Trigger file picker
    jsonRef.current?.click();
  };

  const handleLoadJsonCancel = () => {
    setShowLoadJsonModal(false);
  };

useEffect(() => {
    fontsReadyRef.current = loadLatoOnce("../../public/fonts/Lato-Regular.ttf", "Lato");
  }, []);








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
      editingColor, setEditingColor,
      editingFont, setEditingFont,
      newFontSize, setNewFontSize,
      textColor, setTextColor,
      selectedFont, setSelectedFont,
      removeSelectedText, saveTextItemsToIndexedDB,
      wrapTextPreservingNewlinesResponsive, wrapTextResponsive,
      resolveTextLayout,
      resolveTextLayoutForHit, addTextToCanvas, addTextToCanvas3,
      setupCanvasA4, computeScaledTargetFont, addTextToCanvas2
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
      isResizing, setIsResizing,
      isDraggingMixedItems, setIsDraggingMixedItems,
      initialMixedItemPositions, setInitialMixedItemPositions,
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
      addTextToCanvasMlMode,
      handleDoubleClick
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
      viewerCount,
    },
    pdf: { selectedFile, setSelectedFile, isPdfDownloaded, setIsPdfDownloaded },
    shapes: {
      shapeItems, setShapeItems,
      selectedShapeIndex, setSelectedShapeIndex,
      selectedShapeIndexes, setSelectedShapeIndexes,
      isDraggingShape, setIsDraggingShape,
      isDraggingMultipleShapes, setIsDraggingMultipleShapes,
      isResizingShape, setIsResizingShape,
      isCreatingShape,
      activeShapeTool, setActiveShapeTool,
      shapeCreationStart, shapeCreationCurrent,
      dragStart: shapeDragStart, setDragStart: setShapeDragStart,
      initialShape, setInitialShape,
      initialMultiShapes, setInitialMultiShapes,
      resizeStart: shapeResizeStart, setResizeStart: setShapeResizeStart,
      resizeHandle, setResizeHandle,
      initialSize, setInitialSize,
      startCreatingShape,
      updateShapeCreation,
      finishCreatingShape,
      deleteSelectedShape,
      deleteSelectedShapes,
      updateShape,
    },
  } = useEditor(); // ✅ correct
  useClipboard(useEditor());









const textBoxRef = useRef(null);
const rafDrawRef = useRef(0);

useEffect(() => {
  textBoxRef.current = textBox;
}, [textBox]);

const requestCanvasDraw = (page) => {
  if (rafDrawRef.current) return;
  rafDrawRef.current = requestAnimationFrame(() => {
    rafDrawRef.current = 0;
    drawCanvas(page); // drawCanvas must use textBoxRef.current (see section C)
  });
};





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
  }, [mode, activePage, pageList, textItems, shapeItems]);


  // Keep latest state in refs for real-time broadcasting
  const latestStateRef = useRef({
    activePage,
    pageList,
    textItems,
    shapeItems,
  });

  // Update refs synchronously whenever state changes
  useEffect(() => {
    latestStateRef.current = {
      activePage,
      pageList,
      textItems,
      shapeItems,
    };
  });

  // Whenever your app state changes (host mode), notify broadcaster
  useEffect(() => {
    // Use a getter function that reads from the latestStateRef
    // This ensures real-time updates during interactions (like shape dragging)
    getStateRef.current = () => ({
      schemaVersion: 1,
      appVersion: "0.1.0",
      activePage: latestStateRef.current.activePage,
      pageList: latestStateRef.current.pageList,
      textItems: latestStateRef.current.textItems,
      shapeItems: latestStateRef.current.shapeItems,
    });
    getMethodsRef.current = {
      setTextItems,
      setPages,
      setActivePage,
      setShapeItems,
    }
  }, [activePage, pageList, textItems, shapeItems]);














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
  }, [pageList, textItems, imageItems, shapeItems, mlText, mlAnchor,
mlPreferredX /* + any other draw deps */]);


useEffect(() => {
  if (!isMultilineMode) return;
  const id = setInterval(() => setMlCaretBlink(v => !v), 1000);
  return () => clearInterval(id);
}, [isMultilineMode]);

const toUnits = (str) => Array.from(str ?? "");


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

  const sharedConfig = { showGrid, APP_FONT_FAMILY: selectedFont || APP_FONT_FAMILY };

  for (let p = 0; p < pageCount; p++) {
    const canvas = canvasRefs.current?.[p];
    if (!canvas) continue;

    const isActive = p === activePage;
    drawCanvas(p, {
      canvas,
      state: {
        textItems,
        imageItems,
        shapeItems,
        selectedShapeIndex,
        selectedShapeIndexes,
        isCreatingShape,
        shapeCreationStart,
        shapeCreationCurrent,
        activeShapeTool,
        selectedTextIndexes,
        selectionStart,
        selectionEnd,
        isSelecting,
        isTextBoxEditEnabled,
        textBox,
        activePage,
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
        computeScaledTargetFont,

        redraw: (idx) =>
          drawCanvas(idx, {
            canvas: canvasRefs.current?.[idx],
            state: {
              textItems,
              imageItems,
              shapeItems,
              selectedShapeIndex,
              selectedShapeIndexes,
              isCreatingShape,
              shapeCreationStart,
              shapeCreationCurrent,
              activeShapeTool,
              selectedTextIndexes,
              selectionStart,
              selectionEnd,
              isSelecting,
              isTextBoxEditEnabled,
              textBox,
              activePage,
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
              computeScaledTargetFont,
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
  shapeItems,
  selectedShapeIndex,
  selectedShapeIndexes,
  isCreatingShape,
  shapeCreationStart,
  shapeCreationCurrent,
  activeShapeTool,
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
  selectedFont,
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
    // Only resize canvas if dimensions actually changed
    // Setting canvas.width/height clears the canvas, so avoid unnecessary resets
    const needsResize = canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight;

    if (needsResize) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    drawCanvas(activePage);
  }
}, [textItems, imageItems, shapeItems, isSelecting, selectionStart, selectionEnd]);





useEffect(() => {
  if (!isTextBoxEditEnabled || !textBox || !canvasRefs.current[activePage]) return;

  const canvas = canvasRefs.current[activePage];
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ✅ source of truth (never wrap/normalize from rendered text)
  const raw = (textBox.rawText ?? textBox.text ?? "").toString();

  // ✅ do NOT normalize whitespace (removes the "spaces drift" bug)
  // ✅ do NOT bake wrapping into rawText

  const family = textBox.fontFamily || selectedFont || APP_FONT_FAMILY || "Lato";
  const requestedPadding = textBox.boxPadding ?? 10;

  // If your wrapper already clamps padding internally you can pass requestedPadding,
  // otherwise clamp it here. (Safe to keep as-is if you already return layout.padding.)
  const targetFont = textBox.hasScaled
    ? computeScaledTargetFont(textBox)                // allow grow/shrink ONLY after resize has begun
    : (textBox.baseFontSize ?? 20);                   // initial creation always 20

  ctx.font = `${targetFont}px ${family}`;
  
  // ✅ canonical layout: matches live draw + final commit
  const layout = wrapTextPreservingNewlinesResponsive(
    raw,
    ctx,
    textBox.width,
    textBox.height,
    targetFont,
    requestedPadding,
    textBox.minFontSize ?? 6,
    family,
    4
  );

  const rendered = (layout.lines && layout.lines.length ? layout.lines : [""]).join("\n");

  // Only update if something actually changed to avoid loops
  const nextFont = layout.fontSize ?? targetFont;
  const nextPadding = layout.padding ?? requestedPadding;

  const changed =
    rendered !== textBox.text ||
    nextFont !== textBox.fontSize ||
    nextPadding !== textBox.boxPadding;

  if (changed) {
    setTextBox({
      ...textBox,
      rawText: raw,
      text: rendered,
      fontSize: nextFont,
      boxPadding: nextPadding,

      // ✅ DO NOT reset hasScaled here.
      // hasScaled should be flipped to true when user actually starts resizing (mousedown/move),
      // otherwise scaling will never show while dragging.
      hasScaled: textBox.hasScaled,
    });
  }
  // React to width/height/padding changes (not only width)
}, [textBox?.width, textBox?.height, textBox?.boxPadding, activePage, isTextBoxEditEnabled]);








const handleUndo = () => {
  fnUndoStack(activePage)
};



const handleRedo = () => {
  fnRedoStack(activePage);
};

// Wrapper mouse handlers that check shapes first, then fall through to existing handlers
const wrappedMouseDown = (e) => {
  // First, try shape handler
  const shapeHandled = handleShapeMouseDown(e, {
    canvasRefs,
    activePage,
    activeShapeTool,
    shapeItems,
    textItems,
    resolveTextLayoutForHit,
    startCreatingShape,
    selectedShapeIndex,
    setSelectedShapeIndex,
    selectedShapeIndexes,
    setSelectedShapeIndexes,
    selectedTextIndexes,
    setSelectedTextIndex,
    setSelectedTextIndexes,
    setIsTextSelected,
    setIsDraggingShape,
    setIsDraggingMultipleShapes,
    setIsDraggingMixedItems,
    setIsResizingShape,
    setIsSelecting,
    setDragStart: setShapeDragStart,
    setSelectionDragStart: setDragStart, // For mixed-item dragging (needs selection hook's setter)
    setInitialShape,
    setInitialMultiShapes,
    setInitialMixedItemPositions,
    setResizeStart: setShapeResizeStart,
    setResizeHandle,
    setInitialSize,
  });

  if (shapeHandled) return; // Shape handled it, don't propagate

  // If multiline mode, handle that
  if (handleCanvasMouseDownMl(e, {
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
  })) return;

  // Otherwise, handle normal mouse down (text/images)
  handleMouseDown(e, {
    canvasRefs,
    activePage,
    editingIndex,
    imageItems,
    shapeItems,
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
  });
};

const wrappedMouseMove = (e) => {
  // First, try shape handler
  const shapeHandled = handleShapeMouseMove(e, {
    canvasRefs,
    activePage,
    isCreatingShape,
    updateShapeCreation,
    isDraggingShape,
    isDraggingMultipleShapes,
    isDraggingMixedItems,
    isResizingShape,
    selectedShapeIndex,
    shapeItems,
    dragStart: shapeDragStart,
    initialShape,
    initialMultiShapes,
    resizeStart: shapeResizeStart,
    resizeHandle,
    initialSize,
    updateShape,
  });

  if (shapeHandled) return; // Shape handled it, don't propagate

  // If multiline mode, handle that
  if (handleCanvasMouseMoveMl(e, {
    isMultilineMode,
    isMlDragging,
    canvasRefs,
    activePage,
    pdfToCssMargins,
    mlConfig,
    layoutMultiline,
    mlText,
    setMlCaret,
  })) return;

  // Otherwise, handle normal mouse move (text/images)
  handleMouseMove(e, {
    canvasRefs,
    activePage,
    editingIndex,
    imageItems,
    textItems,
    shapeItems,
    resolveImageRectCss,
    resolveTextLayoutForHit,
    selectedTextIndex,
    selectedTextIndexes,
    setSelectedTextIndexes,
    selectedShapeIndexes,
    setSelectedShapeIndexes,
    setSelectedShapeIndex,
    setTextItems,
    setShapeItems,
    draggedImageIndex,
    resizingImageIndex,
    setImageItems,
    setDragStart,
    resizeStart,
    setResizeStart,
    isImageDragging,
    isDragging,
    isDraggingMixedItems,
    setIsDragging,
    initialPositions,
    initialMixedItemPositions,
    dragStart,
    isSelecting,
    setSelectionEnd,
    selectionStart,
    isResizing,
    textBox,
    setTextBox,
    wrapTextResponsive,
    drawCanvas,
    saveImageItemsToIndexedDB,
    updatePageItems,
    saveTextItemsToIndexedDB,
    updateShape,
    requestCanvasDraw: () => drawCanvas(activePage),
  });
};

const wrappedMouseUp = (e) => {
  // First, try shape handler
  const shapeHandled = handleShapeMouseUp(e, {
    canvasRefs,
    activePage,
    isCreatingShape,
    finishCreatingShape,
    isDraggingShape,
    isDraggingMultipleShapes,
    isResizingShape,
    setIsDraggingShape,
    setIsDraggingMultipleShapes,
    setIsResizingShape,
    pushSnapshotToUndo,
  });

  if (shapeHandled) return; // Shape handled it, don't propagate

  // If multiline mode, handle that
  if (handleCanvasMouseUpMl(e, {
    isMultilineMode,
    isMlDragging,
    setIsMlDragging,
  })) return;

  // Otherwise, handle normal mouse up (text/images)
  handleMouseUp(e, {
    canvasRefs,
    activePage,
    isImageDragging,
    setIsImageDragging,
    setDraggedImageIndex,
    resizingImageIndex,
    setResizingImageIndex,
    setResizeStart,
    isSelecting,
    setIsSelecting,
    selectionStart,
    selectionEnd,
    textItems,
    setSelectedTextIndexes,
    setSelectedTextIndex,
    imageItems,
    setSelectedImageIndex,
    shapeItems,
    setSelectedShapeIndexes,
    setSelectedShapeIndex,
    isDragging,
    isDraggingMixedItems,
    setIsDragging,
    setIsDraggingMixedItems,
    setInitialPositions,
    setInitialMixedItemPositions,
    setDragStart,
    isResizing,
    setIsResizing,
    setTextBox,
    setShouldClearSelectionBox,
    editingIndex,
    resolveTextLayoutForHit,
    setSelectionEnd,
    setSelectionStart,
    textBox,
    drawCanvas,
    pushSnapshotToUndo,
    setIsTextSelected,
    isTextBoxEditEnabled,
    updatePageItems,
    saveTextItemsToIndexedDB,
    pageList,
    setPages,
  });
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
    indexToXY,
    selectedShapeIndex,
    selectedShapeIndexes,
    deleteSelectedShape,
    deleteSelectedShapes,
    pushSnapshotToUndo
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






















  








const toggleGrid = () => {
    setShowGrid((prevShowGrid) => !prevShowGrid);
    drawCanvas(activePage);
  };






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


// Handler for JSON file import
const onJSONChange = async (e) => {
  await handleJSONImport(e, {
    setPages,
    setTextItems,
    setImageItems,
    setShapeItems,
    saveTextItemsToIndexedDB,
    saveImageItemsToIndexedDB,
    saveShapeItemsToIndexedDB,
    savePagesToIndexedDB: savePages,
    onSuccess: () => {
      console.log("JSON state imported successfully");
      drawCanvas(activePage);
    },
    onError: (err) => {
      console.error("Failed to import state.json", err);
      alert("Invalid or corrupted state.json");
    }
  });
};

  

  useEffect(() => {
    const c = canvasRefs.current[activePage];
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);




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
            <>
              <div className="badge badge-room">Room: {roomId}</div>
              <div className="badge badge-viewers">
                👥 {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
              </div>
            </>
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
                  onChange={
                    isViewer
                      ? viewOnly
                      : (e) => handleFileChange({ event: e, setSelectedFile })
                  }
                  disabled={isViewer}
                />
                <div className="btn-row">
                  <button
                    className="btn btn-secondary"
                    onClick={
                      isViewer
                        ? viewOnly
                        : () =>
                            uploadPdfToServer({
                              selectedFile,
                              setIsPdfDownloaded,
                              addTextToCanvas3,
                              pushSnapshotToUndo,
                              activePage,
                              canvasRefs,
                              fontSize,
                              setImageItems,
                              setPages,
                              saveImageItemsToIndexedDB,
                              drawCanvas,
                            })
                    }
                    disabled={isViewer}
                  >
                    Upload to server
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={
                      isViewer
                        ? viewOnly
                        : () =>
                            saveAllPagesAsPDF({
                              canvasRefs,
                              activePage,
                              pageList,
                              CANVAS_WIDTH: canvasWidth,
                              CANVAS_HEIGHT: canvasHeight,
                            })
                    }
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
                              APP_FONT_FAMILY: selectedFont || APP_FONT_FAMILY,
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
                  onClick={
                    isViewer
                      ? viewOnly
                      : () =>
                          deleteSelectedImage({
                            selectedImageIndex,
                            imageItems,
                            activePage,
                            setImageItems,
                            saveImageItemsToIndexedDB,
                            updatePageItems,
                            setSelectedImageIndex,
                            drawCanvas,
                          })
                  }
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
            title: "Shapes",
            icon: "⬜",
            description: "Draw shapes on the canvas.",
            content: (
              <ShapeToolbar
                activeShapeTool={activeShapeTool}
                setActiveShapeTool={setActiveShapeTool}
                selectedShapeIndex={selectedShapeIndex}
                deleteSelectedShape={deleteSelectedShape}
                isViewer={isViewer}
                viewOnly={viewOnly}
              />
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
                        if (textBox !== null) {
                          addTextToCanvas2(textBox, {
                            activePage,
                            canvasRefs,
                            setPages,
                            APP_FONT_FAMILY: selectedFont || APP_FONT_FAMILY,
                            setTextBox
                          });
                        } else {
                          setTextBox(null);
                        }
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
                onMouseDown={isViewer ? viewOnly : wrappedMouseDown}
                onMouseMove={isViewer ? viewOnly : wrappedMouseMove}
                onMouseUp={isViewer ? viewOnly : wrappedMouseUp}
                onDoubleClick={isViewer ? viewOnly : (e) => handleDoubleClick(e, {
                  canvasRefs,
                  activePage,
                  textItems,
                  setIsEditing,
                  setEditingText,
                  setEditingFontSize,
                  setEditingColor,
                  setEditingFont,
                  setEditingIndex
                })}
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

      {/* Font selection */}
      <FontSelector
        selectedFont={selectedFont}
        onChange={isViewer ? viewOnly : (e) => setSelectedFont(e.target.value)}
        disabled={isViewer}
      />

      {/* Color picker */}
      <ColorPicker
        color={textColor}
        onChange={isViewer ? () => {} : setTextColor}
        disabled={isViewer}
      />

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

          {/* Font selection */}
          <FontSelector
            selectedFont={editingFont}
            onChange={isViewer ? viewOnly : (e) => setEditingFont(e.target.value)}
            disabled={isViewer}
          />

          {/* Color picker */}
          <ColorPicker
            color={editingColor}
            onChange={isViewer ? () => {} : setEditingColor}
            disabled={isViewer}
          />

          <div className="modal-actions">
            <button
              className="btn btn-primary"
              onClick={
                isViewer
                  ? viewOnly
                  : () =>
                      saveEditedText({
                        editingIndex,
                        editingText,
                        editingFontSize,
                        editingColor,
                        editingFont,
                        textItems,
                        activePage,
                        setTextItems,
                        saveTextItemsToIndexedDB,
                        setPages,
                        closeEditModal: () =>
                          closeEditModal({
                            setIsEditing,
                            setEditingText,
                            setEditingIndex,
                          }),
                        drawCanvas,
                      })
              }
              disabled={isViewer}
            >
              Save
            </button>
            <button
              className="btn btn-secondary"
              onClick={
                isViewer
                  ? viewOnly
                  : () =>
                      closeEditModal({
                        setIsEditing,
                        setEditingText,
                        setEditingIndex,
                      })
              }
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

    {/* Load JSON Confirmation Modal */}
    <ConfirmationModal
      open={showLoadJsonModal}
      title="Load JSON State"
      message="Loading data from a JSON file will clear your current state (all pages, text items, and images). This action cannot be undone. Do you want to proceed?"
      confirmText="Proceed"
      cancelText="Cancel"
      danger={true}
      onConfirm={handleLoadJsonConfirm}
      onCancel={handleLoadJsonCancel}
    />
  </div>
);







}

export default App;