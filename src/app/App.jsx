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
import { handleFormFieldMouseDown, handleFormFieldMouseMove, handleFormFieldMouseUp } from "../utils/formFields/formFieldMouseHandlers";
import FontSelector from "../components/FontSelector";
import ColorPicker from "../components/ColorPicker";
import { useCursorPosition } from "../hooks/useCursorPosition";
import { HostCursor } from "../components/HostCursor";


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

  // Active panel state for icon rail navigation
  const [activePanel, setActivePanel] = useState(null);

  // Shape styling state
  const [shapeStrokeColor, setShapeStrokeColor] = useState('#000000');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  const [shapeFillColor, setShapeFillColor] = useState('transparent');
  const [shapeFillEnabled, setShapeFillEnabled] = useState(false);

  // Preset colors for shapes
  const SHAPE_PRESET_COLORS = [
    '#000000', // Black
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#6b7280', // Gray
  ];

  // Toggle panel - if same panel clicked, close it
  const togglePanel = (panelName) => {
    setActivePanel(prev => prev === panelName ? null : panelName);
  };

  const onJsonPick = () => {
    setShowLoadJsonModal(true);
  };

  const handleLoadJsonConfirm = async () => {
    setShowLoadJsonModal(false);
    // Clear IndexedDB
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
      viewerCreationState,
      hostCursorPosition,
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
      freehandPoints,
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
    formFields: {
      formFields, setFormFields,
      selectedFormFieldIndex, setSelectedFormFieldIndex,
      selectedFormFieldIndexes, setSelectedFormFieldIndexes,
      isDraggingFormField, setIsDraggingFormField,
      isDraggingMultipleFormFields, setIsDraggingMultipleFormFields,
      isResizingFormField, setIsResizingFormField,
      isCreatingFormField,
      activeFormFieldTool, setActiveFormFieldTool,
      formFieldCreationStart, formFieldCreationCurrent,
      dragStart: formFieldDragStart, setDragStart: setFormFieldDragStart,
      initialField, setInitialField,
      initialMultiFields, setInitialMultiFields,
      resizeStart: formFieldResizeStart, setResizeStart: setFormFieldResizeStart,
      resizeHandle: formFieldResizeHandle, setResizeHandle: setFormFieldResizeHandle,
      initialSize: formFieldInitialSize, setInitialSize: setFormFieldInitialSize,
      startCreatingFormField,
      updateFormFieldCreation,
      finishCreatingFormField,
      deleteSelectedFormField,
      updateFormField,
    },
    ai: {
      connectionStatus,
      isGenerating,
      error: aiError,
      hasStoredKey,
      saveNewApiKey,
      unlockApiKey,
      lockApiKey,
      clearStoredApiKey,
      generateContent,
      clearError: clearAiError,
    },
  } = useEditor(); // ✅ correct
  useClipboard(useEditor());

  // Track cursor position for cursor mirroring in shared workspaces
  const cursorPosition = useCursorPosition();

  // AI Panel local state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPassword, setAiPassword] = useState('');
  const [aiNewApiKey, setAiNewApiKey] = useState('');
  const [aiUnlockPassword, setAiUnlockPassword] = useState('');




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
  }, [mode, activePage, pageList, textItems, shapeItems, formFields, freehandPoints, isCreatingShape, cursorPosition]);


  // Keep latest state in refs for real-time broadcasting
  const latestStateRef = useRef({
    activePage,
    pageList,
    textItems,
    shapeItems,
    formFields,
    isCreatingShape,
    activeShapeTool,
    shapeCreationStart,
    shapeCreationCurrent,
    freehandPoints,
    cursorPosition,
  });

  // Update refs synchronously whenever state changes
  useEffect(() => {
    latestStateRef.current = {
      activePage,
      pageList,
      textItems,
      imageItems,
      shapeItems,
      formFields,
      isCreatingShape,
      activeShapeTool,
      shapeCreationStart,
      shapeCreationCurrent,
      freehandPoints,
      cursorPosition,
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
      imageItems: latestStateRef.current.imageItems,
      shapeItems: latestStateRef.current.shapeItems,
      formFields: latestStateRef.current.formFields,
      isCreatingShape: latestStateRef.current.isCreatingShape,
      activeShapeTool: latestStateRef.current.activeShapeTool,
      shapeCreationStart: latestStateRef.current.shapeCreationStart,
      shapeCreationCurrent: latestStateRef.current.shapeCreationCurrent,
      freehandPoints: latestStateRef.current.freehandPoints,
      cursorPosition: latestStateRef.current.cursorPosition,
    });
    getMethodsRef.current = {
      setTextItems,
      setImageItems,
      setPages,
      setActivePage,
      setShapeItems,
      setFormFields,
    }
  }, [activePage, pageList, textItems, imageItems, shapeItems, formFields, isCreatingShape, activeShapeTool, shapeCreationStart, shapeCreationCurrent, freehandPoints, cursorPosition]);














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
mlPreferredX, viewerCreationState /* + any other draw deps */]);


useEffect(() => {
  if (!isMultilineMode) return;
  const id = setInterval(() => setMlCaretBlink(v => !v), 1000);
  return () => clearInterval(id);
}, [isMultilineMode]);

const toUnits = (str) => Array.from(str ?? "");







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
        // Use viewer creation state when in viewer mode, otherwise use local state
        isCreatingShape: isViewer ? viewerCreationState.isCreatingShape : isCreatingShape,
        shapeCreationStart: isViewer ? viewerCreationState.shapeCreationStart : shapeCreationStart,
        shapeCreationCurrent: isViewer ? viewerCreationState.shapeCreationCurrent : shapeCreationCurrent,
        activeShapeTool: isViewer ? viewerCreationState.activeShapeTool : activeShapeTool,
        freehandPoints: isViewer ? viewerCreationState.freehandPoints : freehandPoints,
        // Form fields state
        formFields,
        selectedFormFieldIndex,
        selectedFormFieldIndexes,
        isCreatingFormField,
        formFieldCreationStart,
        formFieldCreationCurrent,
        activeFormFieldTool,
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
              // Use viewer creation state when in viewer mode, otherwise use local state
              isCreatingShape: isViewer ? viewerCreationState.isCreatingShape : isCreatingShape,
              shapeCreationStart: isViewer ? viewerCreationState.shapeCreationStart : shapeCreationStart,
              shapeCreationCurrent: isViewer ? viewerCreationState.shapeCreationCurrent : shapeCreationCurrent,
              activeShapeTool: isViewer ? viewerCreationState.activeShapeTool : activeShapeTool,
              freehandPoints: isViewer ? viewerCreationState.freehandPoints : freehandPoints,
              // Form fields state
              formFields,
              selectedFormFieldIndex,
              selectedFormFieldIndexes,
              isCreatingFormField,
              formFieldCreationStart,
              formFieldCreationCurrent,
              activeFormFieldTool,
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
  freehandPoints,
  formFields,
  selectedFormFieldIndex,
  selectedFormFieldIndexes,
  isCreatingFormField,
  formFieldCreationStart,
  formFieldCreationCurrent,
  activeFormFieldTool,
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
}, [textItems, imageItems, shapeItems, formFields, isSelecting, selectionStart, selectionEnd, activePage, selectedFormFieldIndex, selectedShapeIndex]);





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

// Wrapper mouse handlers that check form fields, then shapes, then fall through to existing handlers
const wrappedMouseDown = (e) => {
  // First, try form field handler
  const formFieldHandled = handleFormFieldMouseDown(e, {
    canvasRefs,
    activePage,
    activeFormFieldTool,
    formFields,
    textItems,
    shapeItems,
    startCreatingFormField,
    selectedFormFieldIndex,
    setSelectedFormFieldIndex,
    selectedFormFieldIndexes,
    setSelectedFormFieldIndexes,
    selectedTextIndexes,
    selectedShapeIndexes,
    setIsDraggingFormField,
    setIsDraggingMultipleFormFields,
    setIsDraggingMixedItems,
    setIsResizingFormField,
    setIsSelecting,
    setDragStart: setFormFieldDragStart,
    setSelectionDragStart: setDragStart,
    setInitialField,
    setInitialMultiFields,
    setInitialMixedItemPositions,
    setResizeStart: setFormFieldResizeStart,
    setResizeHandle: setFormFieldResizeHandle,
    setInitialSize: setFormFieldInitialSize,
    resolveTextLayoutForHit,
    // For clearing other selections
    setSelectedShapeIndex,
    setSelectedShapeIndexes,
    setSelectedTextIndex,
    setSelectedTextIndexes,
    setIsTextSelected,
  });

  if (formFieldHandled) return; // Form field handled it, don't propagate

  // Check if click is on a selected text/shape that would trigger mixed-item dragging
  // If so, don't clear form field selection yet - let handleMouseDown decide
  const canvas = canvasRefs.current[activePage];
  const rect = canvas?.getBoundingClientRect();
  const cssX = rect ? e.clientX - rect.left : 0;
  const cssY = rect ? e.clientY - rect.top : 0;
  const ctx = canvas?.getContext('2d');

  let clickedOnSelectedText = false;
  let clickedOnSelectedShape = false;

  // Check if clicking on a selected text item
  if (canvas && ctx && selectedTextIndexes?.length > 0) {
    for (const idx of selectedTextIndexes) {
      const item = textItems[idx];
      if (item && item.index === activePage) {
        const L = resolveTextLayoutForHit(item, ctx, canvas);
        const b = L.box;
        if (cssX >= b.x && cssX <= b.x + b.w && cssY >= b.y && cssY <= b.y + b.h) {
          clickedOnSelectedText = true;
          break;
        }
      }
    }
  }

  // Check if clicking on a selected shape
  if (canvas && selectedShapeIndexes?.length > 0) {
    for (const idx of selectedShapeIndexes) {
      const shape = shapeItems[idx];
      if (shape && shape.index === activePage) {
        const shapeX = shape.xNorm != null ? shape.xNorm * rect.width : shape.x;
        const shapeY = shape.yNormTop != null ? shape.yNormTop * rect.height : shape.y;
        const shapeW = shape.widthNorm != null ? shape.widthNorm * rect.width : shape.width;
        const shapeH = shape.heightNorm != null ? shape.heightNorm * rect.height : shape.height;
        if (cssX >= shapeX && cssX <= shapeX + shapeW && cssY >= shapeY && cssY <= shapeY + shapeH) {
          clickedOnSelectedShape = true;
          break;
        }
      }
    }
  }

  // Only clear form field selection if NOT clicking on a selected text/shape
  // (which would trigger mixed-item dragging and needs the form field selection intact)
  const preserveFormFieldSelection = (clickedOnSelectedText || clickedOnSelectedShape) && selectedFormFieldIndexes?.length > 0;

  if (!preserveFormFieldSelection) {
    if (selectedFormFieldIndex !== null && !selectedFormFieldIndexes?.length) {
      setSelectedFormFieldIndex(null);
    }
    if (selectedFormFieldIndexes?.length > 0) {
      setSelectedFormFieldIndexes([]);
    }
  }

  // Next, try shape handler
  const shapeHandled = handleShapeMouseDown(e, {
    canvasRefs,
    activePage,
    activeShapeTool,
    shapeItems,
    textItems,
    formFields,
    resolveTextLayoutForHit,
    startCreatingShape,
    selectedShapeIndex,
    setSelectedShapeIndex,
    selectedShapeIndexes,
    setSelectedShapeIndexes,
    selectedTextIndexes,
    selectedFormFieldIndexes,
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
    formFields,
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
    selectedFormFieldIndexes,
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
  // First, try form field handler
  const formFieldHandled = handleFormFieldMouseMove(e, {
    canvasRefs,
    activePage,
    isCreatingFormField,
    updateFormFieldCreation,
    isDraggingFormField,
    isDraggingMultipleFormFields,
    isDraggingMixedItems,
    isResizingFormField,
    selectedFormFieldIndex,
    formFields,
    dragStart: formFieldDragStart,
    initialField,
    initialMultiFields,
    resizeStart: formFieldResizeStart,
    resizeHandle: formFieldResizeHandle,
    initialSize: formFieldInitialSize,
    updateFormField,
  });

  if (formFieldHandled) return; // Form field handled it, don't propagate

  // Next, try shape handler
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
    formFields,
    resolveImageRectCss,
    resolveTextLayoutForHit,
    selectedTextIndex,
    selectedTextIndexes,
    setSelectedTextIndexes,
    selectedShapeIndexes,
    setSelectedShapeIndexes,
    setSelectedShapeIndex,
    selectedFormFieldIndexes,
    setSelectedFormFieldIndexes,
    setSelectedFormFieldIndex,
    setTextItems,
    setShapeItems,
    draggedImageIndex,
    resizingImageIndex,
    setImageItems,
    setDragStart,
    resizeStart,
    setResizeStart,
    isImageDragging,
    setIsImageDragging,
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
    updateFormField,
    requestCanvasDraw: () => drawCanvas(activePage),
  });
};

const wrappedMouseUp = (e) => {
  // First, try form field handler
  const formFieldHandled = handleFormFieldMouseUp(e, {
    canvasRefs,
    activePage,
    isCreatingFormField,
    finishCreatingFormField,
    isDraggingFormField,
    isDraggingMultipleFormFields,
    isResizingFormField,
    setIsDraggingFormField,
    setIsDraggingMultipleFormFields,
    setIsResizingFormField,
    pushSnapshotToUndo,
  });

  if (formFieldHandled) return; // Form field handled it, don't propagate

  // Next, try shape handler
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
    shapeStrokeColor,
    shapeStrokeWidth,
    shapeFillColor: shapeFillEnabled ? shapeFillColor : null,
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
    draggedImageIndex,
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
    formFields,
    setSelectedFormFieldIndexes,
    setSelectedFormFieldIndex,
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
    saveImageItemsToIndexedDB,
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
      saveTextItemsToIndexedDB(updatedItems); // Save updated position to IndexedDB
    }

  };






















  








const toggleGrid = () => {
    setShowGrid((prevShowGrid) => !prevShowGrid);
    drawCanvas(activePage);
  };






  useEffect(() => {
    drawCanvas(activePage);
  }, [textItems, imageItems, formFields, showGrid, isTextSelected, pageList, activePage, textBox, isMultilineMode, selectedFormFieldIndex, selectedShapeIndex]);



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
    {/* Icon Rail (left) */}
    <nav className="icon-rail">
      <div className="rail-logo">P</div>

      {/* Main tool buttons */}
      <button
        className={`rail-btn ${activePanel === 'document' ? 'active' : ''}`}
        title="Document"
        onClick={() => togglePanel('document')}
      >
        📁
      </button>
      <button
        className={`rail-btn ${activePanel === 'pages' ? 'active' : ''}`}
        title="Pages"
        onClick={() => togglePanel('pages')}
      >
        📄
      </button>
      <button
        className={`rail-btn ${activePanel === 'text' ? 'active' : ''}`}
        title="Text"
        onClick={() => togglePanel('text')}
      >
        T
      </button>
      <button
        className={`rail-btn ${activePanel === 'shapes' ? 'active' : ''}`}
        title="Shapes"
        onClick={() => togglePanel('shapes')}
      >
        ⬜
      </button>
      <button
        className={`rail-btn ${activePanel === 'images' ? 'active' : ''}`}
        title="Images"
        onClick={() => togglePanel('images')}
      >
        🖼️
      </button>
      <button
        className={`rail-btn ${activePanel === 'forms' ? 'active' : ''}`}
        title="Forms"
        onClick={() => togglePanel('forms')}
      >
        📝
      </button>

      <div className="rail-divider" />

      {/* Bottom buttons */}
      <div className="rail-bottom">
        <button
          className="rail-btn"
          title="Undo"
          onClick={isViewer ? viewOnly : handleUndo}
          disabled={isViewer}
        >
          ↩
        </button>
        <button
          className="rail-btn"
          title="Redo"
          onClick={isViewer ? viewOnly : handleRedo}
          disabled={isViewer}
        >
          ↪
        </button>
        <div className="rail-divider" />
        <button
          className={`rail-btn ${activePanel === 'share' ? 'active' : ''}`}
          title="Share"
          onClick={() => togglePanel('share')}
        >
          🔗
        </button>
        <button
          className={`rail-btn ${activePanel === 'ai' ? 'active' : ''}`}
          title="AI Assistant"
          onClick={() => togglePanel('ai')}
        >
          🤖
        </button>
        <button
          className={`rail-btn ${activePanel === 'settings' ? 'active' : ''}`}
          title="Settings"
          onClick={() => togglePanel('settings')}
        >
          ⚙️
        </button>
      </div>
    </nav>

    {/* Expandable Panel */}
    <aside className={`sidebar-panel ${activePanel ? '' : 'collapsed'}`}>
      {/* Document Panel */}
      {activePanel === 'document' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">📁</span>
              Document
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-label">Import PDF</div>
              <input
                className="panel-input-file"
                type="file"
                accept="application/pdf"
                onChange={isViewer ? viewOnly : (e) => handleFileChange({ event: e, setSelectedFile })}
                disabled={isViewer}
              />
              <button
                className="panel-btn"
                onClick={isViewer ? viewOnly : () => uploadPdfToServer({
                  selectedFile, setIsPdfDownloaded, addTextToCanvas3, pushSnapshotToUndo,
                  activePage, canvasRefs, fontSize, setImageItems, setPages,
                  saveImageItemsToIndexedDB, drawCanvas,
                })}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">⬆️</span>
                Upload to Server
              </button>
            </div>

            <div className="panel-section">
              <div className="panel-section-label">Export</div>
              <button
                className="panel-btn"
                onClick={isViewer ? viewOnly : () => saveAllPagesAsPDF({
                  canvasRefs, activePage, pageList,
                  CANVAS_WIDTH: canvasWidth, CANVAS_HEIGHT: canvasHeight,
                })}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">📥</span>
                Export as PDF
              </button>
            </div>

            <div className="panel-section">
              <div className="panel-section-label">State</div>
              <button
                className="panel-btn"
                onClick={isViewer ? viewOnly : () => exportStateToJson()}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">💾</span>
                Save JSON
              </button>
              <button
                className="panel-btn"
                onClick={isViewer ? viewOnly : onJsonPick}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">📂</span>
                Load JSON
              </button>
              <input
                ref={jsonRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={isViewer ? viewOnly : onJSONChange}
                disabled={isViewer}
              />
            </div>
          </div>
        </>
      )}

      {/* Pages Panel */}
      {activePanel === 'pages' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">📄</span>
              Pages
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-label">Page: {activePage + 1} of {pageList.length}</div>
              <button
                className="panel-btn panel-btn-primary"
                onClick={isViewer ? viewOnly : addNewPage}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">➕</span>
                Add New Page
              </button>
              <button
                className="panel-btn panel-btn-danger"
                onClick={isViewer ? viewOnly : () => removePage({
                  setSelectedTextIndexes, setSelectedTextIndex, setIsTextSelected,
                  setSelectionStart, setSelectionEnd, setIsSelecting, setIsDragging,
                  setIsImageDragging, setDraggedImageIndex, setResizingImageIndex,
                  setTextItems, setImageItems, saveTextItemsToIndexedDB, saveImageItemsToIndexedDB,
                  purgeUndoRedoForRemovedPage, textItems, imageItems, isTextBoxEditEnabled,
                  textBox, activePage, isMultilineMode, canvasRefs, mlConfig, mlCaret,
                  mlAnchor, mlPreferredX, mlText, mlCaretBlink, isMlDragging, fontSize,
                  wrapTextPreservingNewlinesResponsive, resolveTextLayout, layoutMultiline,
                  setMlPreferredX, showGrid, APP_FONT_FAMILY: selectedFont || APP_FONT_FAMILY,
                  drawCanvas,
                })}
                disabled={isViewer || pageList.length <= 1}
              >
                <span className="panel-btn-icon">🗑️</span>
                Remove Current Page
              </button>
            </div>
          </div>
        </>
      )}

      {/* Text Panel */}
      {activePanel === 'text' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">T</span>
              Text
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-label">Add Text</div>
              <button
                className="panel-btn panel-btn-primary"
                onClick={isViewer ? viewOnly : () => setShowAddTextModal(true)}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">➕</span>
                Add Text
              </button>
              <button
                className="panel-btn"
                onClick={isViewer ? viewOnly : () => removeSelectedText({ updatePageItems, activePage })}
                disabled={isViewer || (selectedTextIndex === null && selectedTextIndexes.length < 1)}
              >
                <span className="panel-btn-icon">🗑️</span>
                Remove Selected
              </button>
            </div>

            <div className="panel-section">
              <div className="panel-section-label">TextBox Mode</div>
              <button
                className={`panel-btn ${isTextBoxEditEnabled ? 'panel-btn-primary' : ''}`}
                onClick={isViewer ? viewOnly : () => {
                  setIsTextBoxEditEnabled((prev) => !prev);
                  if (textBox !== null) {
                    addTextToCanvas2(textBox, {
                      activePage, canvasRefs, setPages,
                      APP_FONT_FAMILY: selectedFont || APP_FONT_FAMILY, setTextBox
                    });
                  } else {
                    setTextBox(null);
                  }
                }}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">📝</span>
                {isTextBoxEditEnabled ? "Save TextBox" : "Enable TextBox"}
              </button>
            </div>

            <div className="panel-section">
              <div className="panel-section-label">Multi-line Mode</div>
              <button
                className={`panel-btn ${isMultilineMode ? 'panel-btn-primary' : ''}`}
                onClick={isViewer ? viewOnly : () => {
                  toggleMultilineMode();
                  if (isMultilineMode === true) {
                    addTextToCanvasMlMode({
                      canvasRefs, activePage, mlConfig, mlText, newFontSize,
                      pushSnapshotToUndo, setPages, setTextItems, textItems,
                    });
                    setMlText("");
                  }
                }}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">║</span>
                {isMultilineMode ? "Exit Multi-line" : "Enter Multi-line"}
              </button>
            </div>

            <div className="panel-section">
              <div className="panel-toggle">
                <span className="panel-toggle-label">Show Grid</span>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={isViewer ? viewOnly : toggleGrid}
                  disabled={isViewer}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shapes Panel */}
      {activePanel === 'shapes' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">⬜</span>
              Shapes
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            {/* Shape Tools Grid */}
            <div className="panel-section">
              <div className="panel-section-label">Shape Tools</div>
              <div className="tool-grid-shapes">
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === null ? 'active' : ''}`}
                  title="Select"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool(null)}
                  disabled={isViewer}
                >
                  <span>👆</span>
                  <span className="tool-btn-label">Select</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'rectangle' ? 'active' : ''}`}
                  title="Rectangle"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('rectangle')}
                  disabled={isViewer}
                >
                  <span>▢</span>
                  <span className="tool-btn-label">Rect</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'circle' ? 'active' : ''}`}
                  title="Circle"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('circle')}
                  disabled={isViewer}
                >
                  <span>○</span>
                  <span className="tool-btn-label">Circle</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'line' ? 'active' : ''}`}
                  title="Line"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('line')}
                  disabled={isViewer}
                >
                  <span>╱</span>
                  <span className="tool-btn-label">Line</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'arrow' ? 'active' : ''}`}
                  title="Arrow"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('arrow')}
                  disabled={isViewer}
                >
                  <span>→</span>
                  <span className="tool-btn-label">Arrow</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'triangle' ? 'active' : ''}`}
                  title="Triangle"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('triangle')}
                  disabled={isViewer}
                >
                  <span>△</span>
                  <span className="tool-btn-label">Triangle</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'diamond' ? 'active' : ''}`}
                  title="Diamond"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('diamond')}
                  disabled={isViewer}
                >
                  <span>◇</span>
                  <span className="tool-btn-label">Diamond</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeShapeTool === 'freehand' ? 'active' : ''}`}
                  title="Freehand"
                  onClick={isViewer ? viewOnly : () => setActiveShapeTool('freehand')}
                  disabled={isViewer}
                >
                  <span>✏️</span>
                  <span className="tool-btn-label">Draw</span>
                </button>
              </div>

              {/* Active tool indicator */}
              {activeShapeTool && (
                <div className="shape-tool-active-indicator">
                  <span>✓</span>
                  <strong>{activeShapeTool.charAt(0).toUpperCase() + activeShapeTool.slice(1)}</strong>
                  <span>— Click and drag on canvas</span>
                </div>
              )}
            </div>

            <div className="panel-divider" />

            {/* Stroke Width Section */}
            <div className="panel-section stroke-width-section">
              <div className="stroke-width-header">
                <div className="panel-section-label" style={{ marginBottom: 0 }}>Stroke Width</div>
                <span className="stroke-width-value">{shapeStrokeWidth}px</span>
              </div>
              <input
                type="range"
                className="stroke-slider"
                min="1"
                max="20"
                value={shapeStrokeWidth}
                onChange={isViewer ? viewOnly : (e) => setShapeStrokeWidth(parseInt(e.target.value, 10))}
                disabled={isViewer}
              />
              <div className="stroke-preview">
                <div
                  className="stroke-preview-line"
                  style={{
                    height: `${shapeStrokeWidth}px`,
                    backgroundColor: shapeStrokeColor,
                  }}
                />
              </div>
            </div>

            <div className="panel-divider" />

            {/* Color Section */}
            <div className="panel-section shape-color-section">
              <div className="shape-color-header">
                <div className="panel-section-label" style={{ marginBottom: 0 }}>Stroke Color</div>
                <div className="shape-color-current">
                  <div
                    className="shape-color-preview"
                    style={{ backgroundColor: shapeStrokeColor }}
                  />
                  <span className="shape-color-hex">{shapeStrokeColor.toUpperCase()}</span>
                </div>
              </div>

              {/* Color swatches */}
              <div className="shape-color-swatches">
                {SHAPE_PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`shape-color-swatch ${shapeStrokeColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={isViewer ? viewOnly : () => setShapeStrokeColor(color)}
                    disabled={isViewer}
                    title={color}
                  />
                ))}
              </div>

              {/* Custom color picker */}
              <div className="shape-custom-color-row">
                <input
                  type="color"
                  className="shape-custom-color-input"
                  value={shapeStrokeColor}
                  onChange={isViewer ? viewOnly : (e) => setShapeStrokeColor(e.target.value)}
                  disabled={isViewer}
                />
                <span className="shape-custom-color-label">Custom color</span>
              </div>
            </div>

            <div className="panel-divider" />

            {/* Fill Color Section */}
            <div className="panel-section shape-color-section">
              <div className="shape-color-header">
                <div className="panel-section-label" style={{ marginBottom: 0 }}>Fill Color</div>
                <div className="shape-color-current">
                  <div
                    className="shape-color-preview"
                    style={{
                      backgroundColor: shapeFillEnabled ? shapeFillColor : 'transparent',
                      backgroundImage: !shapeFillEnabled ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                    }}
                  />
                  <span className="shape-color-hex">{shapeFillEnabled ? shapeFillColor.toUpperCase() : 'NONE'}</span>
                </div>
              </div>

              {/* Fill toggle */}
              <div className="panel-toggle" style={{ marginBottom: 12 }}>
                <span className="panel-toggle-label">Enable Fill</span>
                <input
                  type="checkbox"
                  checked={shapeFillEnabled}
                  onChange={isViewer ? viewOnly : (e) => {
                    setShapeFillEnabled(e.target.checked);
                    if (e.target.checked && shapeFillColor === 'transparent') {
                      setShapeFillColor('#3b82f6');
                    }
                  }}
                  disabled={isViewer}
                />
              </div>

              {/* Color swatches - only show when fill is enabled */}
              {shapeFillEnabled && (
                <>
                  <div className="shape-color-swatches">
                    {SHAPE_PRESET_COLORS.map((color) => (
                      <button
                        key={`fill-${color}`}
                        type="button"
                        className={`shape-color-swatch ${shapeFillColor === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={isViewer ? viewOnly : () => setShapeFillColor(color)}
                        disabled={isViewer}
                        title={color}
                      />
                    ))}
                  </div>

                  {/* Custom fill color picker */}
                  <div className="shape-custom-color-row">
                    <input
                      type="color"
                      className="shape-custom-color-input"
                      value={shapeFillColor === 'transparent' ? '#3b82f6' : shapeFillColor}
                      onChange={isViewer ? viewOnly : (e) => setShapeFillColor(e.target.value)}
                      disabled={isViewer}
                    />
                    <span className="shape-custom-color-label">Custom fill</span>
                  </div>
                </>
              )}
            </div>

            <div className="panel-divider" />

            {/* Selected Shape Actions */}
            <div className="panel-section">
              <div className="panel-section-label">Selected Shape</div>
              <button
                className="panel-btn panel-btn-danger"
                onClick={isViewer ? viewOnly : deleteSelectedShape}
                disabled={isViewer || selectedShapeIndex === null}
              >
                <span className="panel-btn-icon">🗑️</span>
                Delete Selected
              </button>
            </div>
          </div>
        </>
      )}

      {/* Images Panel */}
      {activePanel === 'images' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🖼️</span>
              Images
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-label">Upload Image</div>
              <input
                className="panel-input-file"
                type="file"
                accept="image/*"
                onChange={isViewer ? viewOnly : (e) => handleAddImage(e, activePage, setPages)}
                disabled={isViewer}
              />
            </div>

            <div className="panel-section">
              <div className="panel-section-label">Selected Image</div>
              <button
                className="panel-btn panel-btn-danger"
                onClick={isViewer ? viewOnly : () => deleteSelectedImage({
                  selectedImageIndex, imageItems, activePage, setImageItems,
                  saveImageItemsToIndexedDB, updatePageItems, setSelectedImageIndex, drawCanvas,
                })}
                disabled={isViewer || selectedImageIndex === null}
              >
                <span className="panel-btn-icon">🗑️</span>
                Delete Selected
              </button>
            </div>
          </div>
        </>
      )}

      {/* Forms Panel */}
      {activePanel === 'forms' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">📝</span>
              Forms
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            {/* Form Field Tools */}
            <div className="panel-section">
              <div className="panel-section-label">Form Fields</div>
              <div className="tool-grid-shapes">
                <button
                  className={`tool-grid-btn-lg ${activeFormFieldTool === null ? 'active' : ''}`}
                  title="Select"
                  onClick={isViewer ? viewOnly : () => setActiveFormFieldTool(null)}
                  disabled={isViewer}
                >
                  <span>👆</span>
                  <span className="tool-btn-label">Select</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeFormFieldTool === 'textInput' ? 'active' : ''}`}
                  title="Text Input"
                  onClick={isViewer ? viewOnly : () => setActiveFormFieldTool('textInput')}
                  disabled={isViewer}
                >
                  <span>📝</span>
                  <span className="tool-btn-label">Text</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeFormFieldTool === 'textarea' ? 'active' : ''}`}
                  title="Text Area (Multi-line)"
                  onClick={isViewer ? viewOnly : () => setActiveFormFieldTool('textarea')}
                  disabled={isViewer}
                >
                  <span>📄</span>
                  <span className="tool-btn-label">Area</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeFormFieldTool === 'checkbox' ? 'active' : ''}`}
                  title="Checkbox"
                  onClick={isViewer ? viewOnly : () => setActiveFormFieldTool('checkbox')}
                  disabled={isViewer}
                >
                  <span>☑️</span>
                  <span className="tool-btn-label">Check</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeFormFieldTool === 'radio' ? 'active' : ''}`}
                  title="Radio Button"
                  onClick={isViewer ? viewOnly : () => setActiveFormFieldTool('radio')}
                  disabled={isViewer}
                >
                  <span>🔘</span>
                  <span className="tool-btn-label">Radio</span>
                </button>
                <button
                  className={`tool-grid-btn-lg ${activeFormFieldTool === 'dropdown' ? 'active' : ''}`}
                  title="Dropdown"
                  onClick={isViewer ? viewOnly : () => setActiveFormFieldTool('dropdown')}
                  disabled={isViewer}
                >
                  <span>📋</span>
                  <span className="tool-btn-label">Select</span>
                </button>
              </div>

              {/* Active tool indicator */}
              {activeFormFieldTool && (
                <div className="shape-tool-active-indicator">
                  <span>✓</span>
                  <strong>{activeFormFieldTool === 'textInput' ? 'Text Input' :
                           activeFormFieldTool === 'textarea' ? 'Text Area' :
                           activeFormFieldTool.charAt(0).toUpperCase() + activeFormFieldTool.slice(1)}</strong>
                  <span>— Click and drag on canvas</span>
                </div>
              )}
            </div>

            <div className="panel-divider" />

            {/* Field Properties Editor - shown when a field is selected */}
            {selectedFormFieldIndex !== null && formFields[selectedFormFieldIndex] && (
              <>
                <div className="panel-section">
                  <div className="panel-section-label">Field Properties</div>

                  {/* Field Name */}
                  <div className="panel-input-group">
                    <label className="panel-input-label">Field Name</label>
                    <input
                      type="text"
                      className="panel-input"
                      value={formFields[selectedFormFieldIndex].fieldName || ''}
                      onChange={(e) => updateFormField(selectedFormFieldIndex, { fieldName: e.target.value })}
                      placeholder="field_name"
                      disabled={isViewer}
                    />
                  </div>

                  {/* Placeholder - for text inputs and textareas */}
                  {(formFields[selectedFormFieldIndex].type === 'textInput' || formFields[selectedFormFieldIndex].type === 'textarea') && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Placeholder</label>
                      <input
                        type="text"
                        className="panel-input"
                        value={formFields[selectedFormFieldIndex].placeholder || ''}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { placeholder: e.target.value })}
                        placeholder="Enter placeholder text..."
                        disabled={isViewer}
                      />
                    </div>
                  )}

                  {/* Default Value - for text inputs */}
                  {formFields[selectedFormFieldIndex].type === 'textInput' && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Default Value</label>
                      <input
                        type="text"
                        className="panel-input"
                        value={formFields[selectedFormFieldIndex].defaultValue || ''}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { defaultValue: e.target.value })}
                        placeholder="Default text..."
                        disabled={isViewer}
                      />
                    </div>
                  )}

                  {/* Default Value - for textareas (multi-line) */}
                  {formFields[selectedFormFieldIndex].type === 'textarea' && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Default Value</label>
                      <textarea
                        className="panel-textarea"
                        value={formFields[selectedFormFieldIndex].defaultValue || ''}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { defaultValue: e.target.value })}
                        placeholder="Default text..."
                        rows={3}
                        disabled={isViewer}
                      />
                    </div>
                  )}

                  {/* Checked state - for checkbox and radio */}
                  {(formFields[selectedFormFieldIndex].type === 'checkbox' || formFields[selectedFormFieldIndex].type === 'radio') && (
                    <div className="panel-input-group">
                      <label className="panel-checkbox-label">
                        <input
                          type="checkbox"
                          checked={formFields[selectedFormFieldIndex].defaultValue === 'true'}
                          onChange={(e) => updateFormField(selectedFormFieldIndex, { defaultValue: e.target.checked ? 'true' : 'false' })}
                          disabled={isViewer}
                        />
                        <span>Default Checked</span>
                      </label>
                    </div>
                  )}

                  {/* Radio Group Name */}
                  {formFields[selectedFormFieldIndex].type === 'radio' && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Group Name</label>
                      <input
                        type="text"
                        className="panel-input"
                        value={formFields[selectedFormFieldIndex].groupName || ''}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { groupName: e.target.value })}
                        placeholder="radio_group"
                        disabled={isViewer}
                      />
                    </div>
                  )}

                  {/* Options - for dropdown */}
                  {formFields[selectedFormFieldIndex].type === 'dropdown' && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Options (one per line)</label>
                      <textarea
                        className="panel-textarea"
                        value={(formFields[selectedFormFieldIndex].options || []).join('\n')}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, {
                          options: e.target.value.split('\n').filter(opt => opt.trim() !== '')
                        })}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                        rows={4}
                        disabled={isViewer}
                      />
                    </div>
                  )}

                  {/* Default selected - for dropdown */}
                  {formFields[selectedFormFieldIndex].type === 'dropdown' && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Default Selected</label>
                      <select
                        className="panel-select"
                        value={formFields[selectedFormFieldIndex].defaultValue || ''}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { defaultValue: e.target.value })}
                        disabled={isViewer}
                      >
                        <option value="">-- None --</option>
                        {(formFields[selectedFormFieldIndex].options || []).map((opt, idx) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Required toggle */}
                  <div className="panel-input-group">
                    <label className="panel-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formFields[selectedFormFieldIndex].required || false}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { required: e.target.checked })}
                        disabled={isViewer}
                      />
                      <span>Required Field</span>
                    </label>
                  </div>
                </div>

                <div className="panel-divider" />

                {/* Styling */}
                <div className="panel-section">
                  <div className="panel-section-label">Styling</div>

                  {/* Font Size - for text inputs, textareas and dropdowns */}
                  {(formFields[selectedFormFieldIndex].type === 'textInput' || formFields[selectedFormFieldIndex].type === 'textarea' || formFields[selectedFormFieldIndex].type === 'dropdown') && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Font Size: {formFields[selectedFormFieldIndex].fontSize || 14}px</label>
                      <input
                        type="range"
                        className="panel-slider"
                        min="8"
                        max="32"
                        value={formFields[selectedFormFieldIndex].fontSize || 14}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { fontSize: parseInt(e.target.value) })}
                        disabled={isViewer}
                      />
                    </div>
                  )}

                  {/* Background Color */}
                  <div className="panel-input-group">
                    <label className="panel-input-label">Background</label>
                    <div className="panel-color-row">
                      <input
                        type="color"
                        className="panel-color-input"
                        value={formFields[selectedFormFieldIndex].backgroundColor || '#ffffff'}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { backgroundColor: e.target.value })}
                        disabled={isViewer}
                      />
                      <input
                        type="text"
                        className="panel-color-text"
                        value={formFields[selectedFormFieldIndex].backgroundColor || '#ffffff'}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { backgroundColor: e.target.value })}
                        disabled={isViewer}
                      />
                    </div>
                  </div>

                  {/* Border Color */}
                  <div className="panel-input-group">
                    <label className="panel-input-label">Border</label>
                    <div className="panel-color-row">
                      <input
                        type="color"
                        className="panel-color-input"
                        value={formFields[selectedFormFieldIndex].borderColor || '#374151'}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { borderColor: e.target.value })}
                        disabled={isViewer}
                      />
                      <input
                        type="text"
                        className="panel-color-text"
                        value={formFields[selectedFormFieldIndex].borderColor || '#374151'}
                        onChange={(e) => updateFormField(selectedFormFieldIndex, { borderColor: e.target.value })}
                        disabled={isViewer}
                      />
                    </div>
                  </div>

                  {/* Text Color - for text inputs, textareas and dropdowns */}
                  {(formFields[selectedFormFieldIndex].type === 'textInput' || formFields[selectedFormFieldIndex].type === 'textarea' || formFields[selectedFormFieldIndex].type === 'dropdown') && (
                    <div className="panel-input-group">
                      <label className="panel-input-label">Text Color</label>
                      <div className="panel-color-row">
                        <input
                          type="color"
                          className="panel-color-input"
                          value={formFields[selectedFormFieldIndex].textColor || '#000000'}
                          onChange={(e) => updateFormField(selectedFormFieldIndex, { textColor: e.target.value })}
                          disabled={isViewer}
                        />
                        <input
                          type="text"
                          className="panel-color-text"
                          value={formFields[selectedFormFieldIndex].textColor || '#000000'}
                          onChange={(e) => updateFormField(selectedFormFieldIndex, { textColor: e.target.value })}
                          disabled={isViewer}
                        />
                      </div>
                    </div>
                  )}

                  {/* Border Width */}
                  <div className="panel-input-group">
                    <label className="panel-input-label">Border Width: {formFields[selectedFormFieldIndex].borderWidth || 1}px</label>
                    <input
                      type="range"
                      className="panel-slider"
                      min="0"
                      max="5"
                      value={formFields[selectedFormFieldIndex].borderWidth || 1}
                      onChange={(e) => updateFormField(selectedFormFieldIndex, { borderWidth: parseInt(e.target.value) })}
                      disabled={isViewer}
                    />
                  </div>
                </div>

                <div className="panel-divider" />
              </>
            )}

            {/* Selected Field Actions */}
            <div className="panel-section">
              <div className="panel-section-label">Actions</div>
              <button
                className="panel-btn panel-btn-danger"
                onClick={isViewer ? viewOnly : deleteSelectedFormField}
                disabled={isViewer || selectedFormFieldIndex === null}
              >
                <span className="panel-btn-icon">🗑️</span>
                Delete Selected
              </button>
            </div>
          </div>
        </>
      )}

      {/* Share Panel */}
      {activePanel === 'share' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🔗</span>
              Share
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="panel-section">
              {isViewer && (
                <div className="panel-badge panel-badge-viewer">VIEW-ONLY MODE</div>
              )}
              {mode === "host" && (
                <>
                  <div className="panel-badge panel-badge-room">Room: {roomId}</div>
                  <div className="panel-badge panel-badge-viewers">
                    👥 {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
                  </div>
                </>
              )}
              {mode !== "viewer" && (
                <button
                  className="panel-btn panel-btn-primary"
                  onClick={isViewer ? viewOnly : onStartShare}
                  disabled={isViewer}
                >
                  <span className="panel-btn-icon">🔗</span>
                  {mode === "host" ? "Sharing Active" : "Start Sharing"}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* AI Assistant Panel */}
      {activePanel === 'ai' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🤖</span>
              AI Assistant
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            {/* Connection Status */}
            <div className="panel-section">
              <div className="panel-section-label">Status</div>
              <div className={`panel-badge ${
                connectionStatus === 'unlocked' ? 'panel-badge-viewers' :
                connectionStatus === 'error' ? 'panel-badge-viewer' :
                'panel-badge-room'
              }`}>
                {connectionStatus === 'unlocked' ? '🟢 Connected' :
                 connectionStatus === 'error' ? '🔴 Error' :
                 '🔒 Locked'}
              </div>
            </div>

            {/* Error Display */}
            {aiError && (
              <div className="panel-section">
                <div className="ai-error-message">
                  {aiError}
                  <button className="ai-error-dismiss" onClick={clearAiError}>✕</button>
                </div>
              </div>
            )}

            {/* Setup Form - when no key stored */}
            {!hasStoredKey && connectionStatus !== 'unlocked' && (
              <div className="panel-section">
                <div className="panel-section-label">Setup API Key</div>
                <div className="panel-input-group">
                  <label className="panel-input-label">Claude API Key</label>
                  <input
                    type="password"
                    className="panel-input"
                    placeholder="sk-ant-..."
                    value={aiNewApiKey}
                    onChange={(e) => setAiNewApiKey(e.target.value)}
                  />
                </div>
                <div className="panel-input-group">
                  <label className="panel-input-label">Set Password</label>
                  <input
                    type="password"
                    className="panel-input"
                    placeholder="Create a password to encrypt your key..."
                    value={aiPassword}
                    onChange={(e) => setAiPassword(e.target.value)}
                  />
                </div>
                <button
                  className="panel-btn panel-btn-primary"
                  onClick={async () => {
                    const success = await saveNewApiKey(aiNewApiKey, aiPassword);
                    if (success) {
                      setAiNewApiKey('');
                      setAiPassword('');
                    }
                  }}
                  disabled={!aiNewApiKey || !aiPassword || aiPassword.length < 4}
                >
                  <span className="panel-btn-icon">🔐</span>
                  Save & Encrypt
                </button>
              </div>
            )}

            {/* Unlock Form - when key stored but locked */}
            {hasStoredKey && connectionStatus === 'disconnected' && (
              <div className="panel-section">
                <div className="panel-section-label">Unlock API Key</div>
                <div className="panel-input-group">
                  <label className="panel-input-label">Password</label>
                  <input
                    type="password"
                    className="panel-input"
                    placeholder="Enter your password..."
                    value={aiUnlockPassword}
                    onChange={(e) => setAiUnlockPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiUnlockPassword) {
                        unlockApiKey(aiUnlockPassword).then((success) => {
                          if (success) setAiUnlockPassword('');
                        });
                      }
                    }}
                  />
                </div>
                <button
                  className="panel-btn panel-btn-primary"
                  onClick={async () => {
                    const success = await unlockApiKey(aiUnlockPassword);
                    if (success) setAiUnlockPassword('');
                  }}
                  disabled={!aiUnlockPassword}
                >
                  <span className="panel-btn-icon">🔓</span>
                  Unlock
                </button>
              </div>
            )}

            {/* Generate Content - when unlocked */}
            {connectionStatus === 'unlocked' && (
              <>
                <div className="panel-section">
                  <div className="panel-section-label">Generate Content</div>
                  <textarea
                    className="panel-textarea"
                    placeholder={"Describe what you want to create...\n\nExamples:\n• Add a title 'Invoice' at the top\n• Create a contact form with name, email, phone\n• Draw a header box with company logo placeholder"}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={6}
                    disabled={isGenerating}
                  />
                  <button
                    className="panel-btn panel-btn-primary"
                    onClick={async () => {
                      const success = await generateContent(aiPrompt, {
                        setTextItems,
                        setShapeItems,
                        setFormFields,
                        textItems,
                        shapeItems,
                        formFields,
                        imageItems,
                        pushSnapshotToUndo,
                        activePage,
                      });
                      if (success) setAiPrompt('');
                    }}
                    disabled={isGenerating || !aiPrompt.trim()}
                  >
                    <span className="panel-btn-icon">{isGenerating ? '⏳' : '✨'}</span>
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>

                <div className="panel-divider" />

                <div className="panel-section">
                  <div className="panel-section-label">Key Management</div>
                  <button
                    className="panel-btn"
                    onClick={lockApiKey}
                  >
                    <span className="panel-btn-icon">🔒</span>
                    Lock API Key
                  </button>
                  <button
                    className="panel-btn panel-btn-danger"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove your stored API key?')) {
                        clearStoredApiKey();
                      }
                    }}
                  >
                    <span className="panel-btn-icon">🗑️</span>
                    Remove API Key
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Settings Panel */}
      {activePanel === 'settings' && (
        <>
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">⚙️</span>
              Settings
            </div>
            <button className="panel-close-btn" onClick={() => setActivePanel(null)}>✕</button>
          </div>
          <div className="panel-content">
            <div className="panel-section">
              <div className="panel-section-label">Display</div>
              <div className="panel-toggle">
                <span className="panel-toggle-label">Show Grid</span>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={isViewer ? viewOnly : toggleGrid}
                  disabled={isViewer}
                />
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-label">Danger Zone</div>
              <button
                className="panel-btn panel-btn-danger"
                onClick={isViewer ? viewOnly : async () => {
                  if (window.confirm("Are you sure you want to clear all saved data?")) {
                    // Clear IndexedDB first
                    await clearAllEditorState();
                    // Clear all state
                    setUndoStack({});
                    setRedoStack({});
                    setTextItems([]);
                    setImageItems([]);
                    setShapeItems([]);
                    setFormFields([]);
                    setPages([{ textItems: [], imageItems: [], shapes: [], formFields: [] }]);
                    setActivePage(0);
                    setSelectedTextIndex?.(null);
                    setSelectedTextIndexes?.([]);
                    setSelectedImageIndex?.(null);
                    setSelectedShapeIndex?.(null);
                    setSelectedShapeIndexes?.([]);
                    setSelectedFormFieldIndex?.(null);
                    setIsSelecting?.(false);
                    setIsDragging?.(false);
                    setIsImageDragging?.(false);
                    setResizingImageIndex?.(null);
                    setTextBox?.(null);
                    setIsTextSelected(false);
                    drawCanvas(0);
                  }
                }}
                disabled={isViewer}
              >
                <span className="panel-btn-icon">🗑️</span>
                Clear All Data
              </button>
            </div>
          </div>
        </>
      )}
    </aside>

    {/* Main (right) */}
    <main className="main-content">
      <div className="pages-grid">
        {/* Single canvas view - only show active page */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
            boxShadow: "0 0 0 1px #e5e7eb",
            borderRadius: 8,
            background: "#f9fafb",
          }}
          className="page-wrapper page-wrapper-active"
        >
          <canvas
            ref={(el) => (canvasRefs.current[activePage] = el)}
            data-page-index={activePage}
            style={{
              display: "block",
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundColor: "white",
              border: "1px solid #3b82f6",
              userSelect: "none",
              MozUserSelect: "none",
              WebkitUserSelect: "none",
              pointerEvents: "auto",
            }}
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

          {/* RulerOverlay for active page */}
          {(
            <div className="ruler-overlay-container">
              <RulerOverlay
                key={`ruler-${activePage}`}
                canvasRef={{ current: canvasRefs.current[activePage] }}
                zoom={1}
              />
            </div>
          )}
        </div>
      </div>
    </main>

    {/* Bottom Bar - Page Navigation */}
    <div className="bottom-bar">
      <button
        className="page-btn page-btn-remove"
        title="Remove Current Page"
        onClick={isViewer ? viewOnly : () => removePage({
          setSelectedTextIndexes, setSelectedTextIndex, setIsTextSelected,
          setSelectionStart, setSelectionEnd, setIsSelecting, setIsDragging,
          setIsImageDragging, setDraggedImageIndex, setResizingImageIndex,
          setTextItems, setImageItems, saveTextItemsToIndexedDB, saveImageItemsToIndexedDB,
          purgeUndoRedoForRemovedPage, textItems, imageItems, isTextBoxEditEnabled,
          textBox, activePage, isMultilineMode, canvasRefs, mlConfig, mlCaret,
          mlAnchor, mlPreferredX, mlText, mlCaretBlink, isMlDragging, fontSize,
          wrapTextPreservingNewlinesResponsive, resolveTextLayout, layoutMultiline,
          setMlPreferredX, showGrid, APP_FONT_FAMILY: selectedFont || APP_FONT_FAMILY,
          drawCanvas,
        })}
        disabled={isViewer || pageList.length <= 1}
      >
        −
      </button>
      <div className="bottom-bar-divider" />
      <button
        className="page-btn"
        title="Previous Page"
        onClick={isViewer ? viewOnly : () => setActivePage(prev => Math.max(0, prev - 1))}
        disabled={isViewer || activePage === 0}
      >
        ←
      </button>
      <div className="page-jump-container">
        <span className="page-jump-label">Page</span>
        <input
          type="text"
          className="page-jump-input"
          value={activePage + 1}
          onChange={(e) => {
            const val = e.target.value;
            // Allow empty input while typing
            if (val === '') return;
            // Only accept digits
            if (!/^\d+$/.test(val)) return;
            const pageNum = parseInt(val, 10);
            // Validate range and navigate
            if (pageNum >= 1 && pageNum <= pageList.length) {
              setActivePage(pageNum - 1);
            }
          }}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            // Reset to current page if invalid on blur
            e.target.value = activePage + 1;
          }}
          disabled={isViewer}
          min={1}
          max={pageList.length}
        />
        <span className="page-jump-total">of {pageList.length}</span>
      </div>
      <button
        className="page-btn"
        title="Next Page"
        onClick={isViewer ? viewOnly : () => setActivePage(prev => Math.min(pageList.length - 1, prev + 1))}
        disabled={isViewer || activePage === pageList.length - 1}
      >
        →
      </button>
      <div className="bottom-bar-divider" />
      <button
        className="page-btn page-btn-add"
        title="Add New Page"
        onClick={isViewer ? viewOnly : addNewPage}
        disabled={isViewer}
      >
        +
      </button>
    </div>

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

    {/* Host Cursor Mirroring - Show host's cursor to viewers */}
    {isViewer && hostCursorPosition && (
      <HostCursor position={hostCursorPosition} />
    )}
  </div>
);







}

export default App;