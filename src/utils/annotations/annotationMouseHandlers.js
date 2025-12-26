/**
 * Mouse event handlers for annotation tools
 * Handles text selection for creating annotations and clicking existing annotations
 */

import { findClickedAnnotation } from "./annotationHitDetection";

/**
 * Check if a textItem exists at the given position
 * @param {Array} textItems - Array of text items
 * @param {number} mouseX - Mouse X in canvas coords
 * @param {number} mouseY - Mouse Y in canvas coords
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} pageIndex - Current page index
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Function} resolveTextLayoutForHit - Function to get text item bounds
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {boolean} True if a textItem exists at the position
 */
function isTextItemAtPosition(textItems, mouseX, mouseY, pageIndex, ctx, resolveTextLayoutForHit, canvas) {
  if (!textItems || !ctx || !resolveTextLayoutForHit || !canvas) return false;

  for (const item of textItems) {
    if (item.index !== pageIndex) continue;

    try {
      const layout = resolveTextLayoutForHit(item, ctx, canvas);
      if (layout && layout.box) {
        const b = layout.box;
        if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
          return true;
        }
      }
    } catch (e) {
      // Ignore errors in hit testing
    }
  }

  return false;
}

/**
 * Handle mouse down for annotation mode
 * Starts text selection if annotation tool is active,
 * or selects existing annotation if clicked
 *
 * @param {MouseEvent} e - Mouse event
 * @param {object} params - Handler parameters
 * @returns {boolean} True if event was handled
 */
export function handleAnnotationMouseDown(e, params) {
  const {
    canvasRefs,
    activePage,
    activeAnnotationTool,
    annotationItems,
    pdfTextSpans,
    startTextSelection,
    setSelectedAnnotationIndex,
    setSelectedAnnotationIndexes,
    clearAnnotationSelection,
    // For pass-through when textItems are under annotations
    textItems,
    resolveTextLayoutForHit,
  } = params;

  const canvas = canvasRefs?.current?.[activePage];
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const ctx = canvas.getContext('2d');

  // Priority 1: If annotation tool is active and we have text (either pdfTextSpans or textItems), start text selection
  const hasAnnotatableText = (pdfTextSpans && pdfTextSpans.length > 0) || (textItems && textItems.length > 0);
  if (activeAnnotationTool && hasAnnotatableText) {
    startTextSelection(mouseX, mouseY);
    return true;
  }

  // Priority 2: Check if clicking on existing annotation
  // Pass textItems so hit detection works correctly for linked annotations
  const clickedIndex = findClickedAnnotation(
    annotationItems,
    mouseX,
    mouseY,
    rect.width,
    rect.height,
    activePage,
    textItems || []
  );

  if (clickedIndex !== null) {
    const clickedAnnotation = annotationItems[clickedIndex];

    // Check if there's a textItem at this position
    // If so, pass through the click to let the textItem be selected/dragged
    // This allows users to interact with textItems even when annotations overlap them
    if (!activeAnnotationTool) {
      const hasTextItemUnderneath = isTextItemAtPosition(
        textItems,
        mouseX,
        mouseY,
        activePage,
        ctx,
        resolveTextLayoutForHit,
        canvas
      );

      if (hasTextItemUnderneath) {
        // Pass through to textItem handlers
        if (clearAnnotationSelection) {
          clearAnnotationSelection();
        }
        return false;
      }
    }

    // No textItem underneath - select the annotation
    if (setSelectedAnnotationIndex) {
      setSelectedAnnotationIndex(clickedIndex);
    }
    if (setSelectedAnnotationIndexes) {
      setSelectedAnnotationIndexes([clickedIndex]);
    }
    return true;
  }

  // If clicking elsewhere and no tool active, clear annotation selection
  if (!activeAnnotationTool && clearAnnotationSelection) {
    clearAnnotationSelection();
  }

  return false;
}

/**
 * Handle mouse move for annotation mode
 * Updates text selection if currently selecting
 *
 * @param {MouseEvent} e - Mouse event
 * @param {object} params - Handler parameters
 * @returns {boolean} True if event was handled
 */
export function handleAnnotationMouseMove(e, params) {
  const {
    canvasRefs,
    activePage,
    isSelectingText,
    updateTextSelection,
    pdfTextSpans,
    textItems,
  } = params;

  if (!isSelectingText) return false;

  const canvas = canvasRefs?.current?.[activePage];
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const ctx = canvas.getContext('2d');

  // Update text selection with current mouse position
  // Pass both pdfTextSpans and textItems - the hook will use whichever is available
  if (updateTextSelection) {
    updateTextSelection(
      mouseX,
      mouseY,
      pdfTextSpans || [],
      rect.width,
      rect.height,
      activePage,
      textItems || [],
      ctx
    );
  }

  return true;
}

/**
 * Handle mouse up for annotation mode
 * Finishes text selection and creates annotation
 *
 * @param {MouseEvent} e - Mouse event
 * @param {object} params - Handler parameters
 * @returns {boolean} True if event was handled
 */
export function handleAnnotationMouseUp(e, params) {
  const {
    activePage,
    isSelectingText,
    finishTextSelection,
    pushSnapshotToUndo,
    selectedTextSpans,
    // For linking annotations to text items
    textItems,
    ensureTextItemId,
  } = params;

  if (!isSelectingText) return false;

  // Only create annotation if we have selected text spans
  if (selectedTextSpans && selectedTextSpans.length > 0) {
    // Push undo snapshot before creating annotation
    if (pushSnapshotToUndo) {
      pushSnapshotToUndo(activePage);
    }
  }

  // Finish text selection (this creates the annotation if spans were selected)
  // Pass textItems and ensureTextItemId for linking support
  if (finishTextSelection) {
    finishTextSelection(activePage, textItems, ensureTextItemId);
  }

  return true;
}

/**
 * Handle keyboard events for annotations
 * Delete key removes selected annotation
 *
 * @param {KeyboardEvent} e - Keyboard event
 * @param {object} params - Handler parameters
 * @returns {boolean} True if event was handled
 */
export function handleAnnotationKeyDown(e, params) {
  const {
    selectedAnnotationIndex,
    deleteSelectedAnnotations,
    cancelTextSelection,
    isSelectingText,
    pushSnapshotToUndo,
    activePage,
  } = params;

  // Escape cancels text selection
  if (e.key === "Escape" && isSelectingText) {
    if (cancelTextSelection) {
      cancelTextSelection();
    }
    return true;
  }

  // Delete/Backspace removes selected annotation
  if ((e.key === "Delete" || e.key === "Backspace") && selectedAnnotationIndex !== null) {
    // Don't delete if we're in a text input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return false;
    }

    // Push undo snapshot before deleting annotation
    if (pushSnapshotToUndo && activePage !== undefined) {
      pushSnapshotToUndo(activePage);
    }

    if (deleteSelectedAnnotations) {
      deleteSelectedAnnotations();
    }
    return true;
  }

  return false;
}

/**
 * Get cursor style for annotation mode
 *
 * @param {object} params - Parameters
 * @returns {string} CSS cursor value
 */
export function getAnnotationCursor(params) {
  const {
    activeAnnotationTool,
    isSelectingText,
    hoveredAnnotationIndex,
  } = params;

  if (isSelectingText) {
    return "text";
  }

  if (activeAnnotationTool) {
    return "crosshair";
  }

  if (hoveredAnnotationIndex !== null) {
    return "pointer";
  }

  return "default";
}
