import { isPointInShape, getResizeHandle } from "./shapeHitDetection";

/**
 * Handle mouse down on canvas for shapes
 */
export function handleShapeMouseDown(e, params) {
  const {
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
    setIsDraggingShape,
    setIsDraggingMultipleShapes,
    setIsDraggingMixedItems,
    setIsResizingShape,
    setIsSelecting,
    setDragStart,
    setSelectionDragStart, // For mixed-item dragging (uses selection hook's state)
    setInitialShape,
    setInitialMultiShapes,
    setInitialMixedItemPositions,
    setResizeStart,
    setResizeHandle,
    setInitialSize,
  } = params;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Priority 1: If a shape tool is active, start creating shape
  if (activeShapeTool) {
    startCreatingShape(mouseX, mouseY);
    return true; // Handled
  }

  // Priority 2a: Check resize handles on SELECTED shape FIRST
  // This is important for circles where handles are outside the shape area
  if (selectedShapeIndex !== null && shapeItems[selectedShapeIndex]) {
    const selectedShape = shapeItems[selectedShapeIndex];
    // Only check if this is the active page
    if (selectedShape.index === activePage) {
      const handle = getResizeHandle(selectedShape, mouseX, mouseY, rect.width, rect.height);

      if (handle) {
        // Check if shape is locked - don't allow resize
        if (selectedShape.locked) {
          return false; // Let other handlers process
        }
        // Start resizing the already selected shape
        setIsResizingShape(true);
        setResizeStart({ x: mouseX, y: mouseY });
        setResizeHandle(handle);

        // Resolve coordinates (use normalized if available, otherwise pixel values)
        const resolvedX = selectedShape.xNorm != null ? selectedShape.xNorm * rect.width : selectedShape.x;
        const resolvedY = selectedShape.yNormTop != null ? selectedShape.yNormTop * rect.height : selectedShape.y;
        const resolvedWidth = selectedShape.widthNorm != null ? selectedShape.widthNorm * rect.width : selectedShape.width;
        const resolvedHeight = selectedShape.heightNorm != null ? selectedShape.heightNorm * rect.height : selectedShape.height;

        setInitialSize({
          x: resolvedX,
          y: resolvedY,
          width: resolvedWidth,
          height: resolvedHeight,
        });
        return true; // Handled
      }
    }
  }

  // Priority 2b: Check if clicking on a shape
  const clickedShapeIndex = findClickedShape(
    shapeItems,
    mouseX,
    mouseY,
    rect.width,
    rect.height,
    activePage
  );

  if (clickedShapeIndex !== null) {
    const shape = shapeItems[clickedShapeIndex];

    // If this is a newly clicked shape (not already selected), check resize handles
    const handle = getResizeHandle(shape, mouseX, mouseY, rect.width, rect.height);

    if (handle) {
      // Check if shape is locked - don't allow resize, but still select it
      if (shape.locked) {
        // Select the locked shape but don't allow resize
        params.setSelectedTextIndex?.(null);
        params.setSelectedTextIndexes?.([]);
        params.setIsTextSelected?.(false);
        setSelectedShapeIndex(clickedShapeIndex);
        setSelectedShapeIndexes([]);
        return true; // Handled - selected but not resizing
      }
      // Start resizing (clear multi-selection, only resize the clicked shape)
      // Clear text selections when selecting a shape
      params.setSelectedTextIndex?.(null);
      params.setSelectedTextIndexes?.([]);
      params.setIsTextSelected?.(false);

      setSelectedShapeIndex(clickedShapeIndex);
      setSelectedShapeIndexes([]);
      setIsResizingShape(true);
      setResizeStart({ x: mouseX, y: mouseY });
      setResizeHandle(handle);

      // Resolve coordinates (use normalized if available, otherwise pixel values)
      const resolvedX = shape.xNorm != null ? shape.xNorm * rect.width : shape.x;
      const resolvedY = shape.yNormTop != null ? shape.yNormTop * rect.height : shape.y;
      const resolvedWidth = shape.widthNorm != null ? shape.widthNorm * rect.width : shape.width;
      const resolvedHeight = shape.heightNorm != null ? shape.heightNorm * rect.height : shape.height;

      setInitialSize({
        x: resolvedX,
        y: resolvedY,
        width: resolvedWidth,
        height: resolvedHeight,
      });
      return true; // Handled
    } else {
      // Check if clicking on a shape that's part of multi-selection
      const isPartOfMultiSelection = selectedShapeIndexes && selectedShapeIndexes.includes(clickedShapeIndex);

      // Check if this is a mixed selection (text, shapes, or form fields selected)
      const hasTextSelection = selectedTextIndexes && selectedTextIndexes.length > 0;
      const hasFormFieldSelection = selectedFormFieldIndexes && selectedFormFieldIndexes.length > 0;
      const hasMixedSelection = (hasTextSelection || hasFormFieldSelection) &&
                                selectedShapeIndexes && selectedShapeIndexes.length > 0;

      // CRITICAL FIX: Only trigger mixed dragging if the clicked shape is actually selected
      if (hasMixedSelection && isPartOfMultiSelection) {
        // Start mixed-item dragging
        const ctx = canvas.getContext('2d');
        setIsDraggingMixedItems(true);
        setIsSelecting(false); // Clear selection rectangle
        // Use setSelectionDragStart for mixed-item dragging so useMouse.ts can read it
        setSelectionDragStart({ x: mouseX, y: mouseY });

        // Store initial positions for all selected items
        const textPositions = (selectedTextIndexes || []).map(i => {
          const textItem = textItems[i];
          const Li = resolveTextLayoutForHit(textItem, ctx, canvas);
          return {
            type: 'text',
            index: i,
            xTop: Li.x,
            yTop: Li.topY,
            activePage: textItem.index
          };
        });

        const shapePositions = selectedShapeIndexes.map(i => {
          const shapeItem = shapeItems[i];
          // Resolve coordinates: prefer normalized, convert to pixels
          // Use the outer rect (from line 37) to ensure consistent coordinate calculations
          const resolvedX = shapeItem.xNorm != null ? shapeItem.xNorm * rect.width : shapeItem.x;
          const resolvedY = shapeItem.yNormTop != null ? shapeItem.yNormTop * rect.height : shapeItem.y;
          return {
            type: 'shape',
            index: i,
            x: resolvedX,
            y: resolvedY,
            activePage: shapeItem.index,
            points: shapeItem.points // Store initial points for freehand shapes
          };
        });

        const formFieldPositions = (selectedFormFieldIndexes || []).map(i => {
          const formField = formFields[i];
          const resolvedX = formField.xNorm != null ? formField.xNorm * rect.width : formField.x;
          const resolvedY = formField.yNormTop != null ? formField.yNormTop * rect.height : formField.y;
          return {
            type: 'formField',
            index: i,
            x: resolvedX,
            y: resolvedY,
            activePage: formField.index
          };
        });

        setInitialMixedItemPositions([...textPositions, ...shapePositions, ...formFieldPositions]);
        return true; // Handled
      }

      if (isPartOfMultiSelection && selectedShapeIndexes.length > 1) {
        // Start dragging all selected shapes
        setIsDraggingMultipleShapes(true);
        setDragStart({ x: mouseX, y: mouseY });

        // Store initial positions of all selected shapes
        setInitialMultiShapes(selectedShapeIndexes.map(index => {
          const shape = shapeItems[index];
          return {
            index,
            x: shape.x,
            y: shape.y,
            points: shape.points, // Store initial points for freehand shapes
          };
        }));

        return true; // Handled
      } else {
        // Start dragging single shape (clear multi-selection)
        // Clear text selections when selecting a shape
        params.setSelectedTextIndex?.(null);
        params.setSelectedTextIndexes?.([]);
        params.setIsTextSelected?.(false);

        setSelectedShapeIndex(clickedShapeIndex);
        setSelectedShapeIndexes([]);

        // Check if shape is locked - don't allow drag
        if (shape.locked) {
          return true; // Handled - selected but not dragging
        }

        setIsDraggingShape(true);
        setDragStart({ x: mouseX, y: mouseY });
        setInitialShape({ ...shape });
        return true; // Handled
      }
    }
  }

  // Priority 3: Didn't click on a shape - let other handlers process
  // DON'T clear shape selections here - let the other handlers decide what to do
  // This allows mixed selections (text + shapes) to work properly
  return false; // Not handled, let other handlers process
}

/**
 * Handle mouse move on canvas for shapes
 */
export function handleShapeMouseMove(e, params) {
  const {
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
    dragStart,
    initialShape,
    initialMultiShapes,
    resizeStart,
    resizeHandle,
    initialSize,
    updateShape,
  } = params;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Priority 1: If creating a shape, update preview
  if (isCreatingShape) {
    // Pass shiftKey for straight line snapping (horizontal/vertical)
    updateShapeCreation(mouseX, mouseY, e.shiftKey);
    return true; // Handled
  }

  // Priority 1.5: If dragging mixed items (text + shapes), defer to text handler
  // The text handler in useMouse.ts has the logic to handle both types
  if (isDraggingMixedItems) {
    return false; // Let useMouse.ts handle mixed-item dragging
  }

  // Priority 2: If dragging multiple shapes, update all positions
  if (isDraggingMultipleShapes && dragStart && initialMultiShapes.length > 0) {
    const dx = mouseX - dragStart.x;
    const dy = mouseY - dragStart.y;

    // Update all selected shapes
    initialMultiShapes.forEach(({ index, x, y, points }) => {
      const shape = shapeItems[index];
      const newX = x + dx;
      const newY = y + dy;

      const updates = {
        x: newX,
        y: newY,
        xNorm: newX / rect.width,
        yNormTop: newY / rect.height,
      };

      // For freehand shapes, also update the points array
      if (shape && shape.type === "freehand" && points) {
        const dxNorm = dx / rect.width;
        const dyNorm = dy / rect.height;

        // Use the stored initial points (from when dragging started)
        updates.points = points.map(point => ({
          x: point.x + dxNorm,
          y: point.y + dyNorm,
        }));
      }

      updateShape(index, updates);
    });

    return true; // Handled
  }

  // Priority 3: If dragging a single shape, update position
  if (isDraggingShape && selectedShapeIndex !== null && dragStart && initialShape) {
    const dx = mouseX - dragStart.x;
    const dy = mouseY - dragStart.y;

    const newX = initialShape.x + dx;
    const newY = initialShape.y + dy;

    const updates = {
      x: newX,
      y: newY,
      xNorm: newX / rect.width,
      yNormTop: newY / rect.height,
    };

    // For freehand shapes, also update the points array
    if (initialShape.type === "freehand" && initialShape.points) {
      const dxNorm = dx / rect.width;
      const dyNorm = dy / rect.height;

      updates.points = initialShape.points.map(point => ({
        x: point.x + dxNorm,
        y: point.y + dyNorm,
      }));
    }

    updateShape(selectedShapeIndex, updates);

    return true; // Handled
  }

  // Priority 4: If resizing a shape, update size
  if (isResizingShape && selectedShapeIndex !== null && resizeStart && initialSize && resizeHandle) {
    const dx = mouseX - resizeStart.x;
    const dy = mouseY - resizeStart.y;

    let newX = initialSize.x;
    let newY = initialSize.y;
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;

    // Update based on which handle is being dragged
    const isDraggingLeft = resizeHandle.includes("left");
    const isDraggingTop = resizeHandle.includes("top");

    if (isDraggingLeft) {
      newX = initialSize.x + dx;
      newWidth = initialSize.width - dx;
    } else if (resizeHandle.includes("right")) {
      newWidth = initialSize.width + dx;
    }

    if (isDraggingTop) {
      newY = initialSize.y + dy;
      newHeight = initialSize.height - dy;
    } else if (resizeHandle.includes("bottom")) {
      newHeight = initialSize.height + dy;
    }

    // Enforce minimum size and adjust position to keep opposite edge fixed
    const minSize = 10;
    if (newWidth < minSize) {
      if (isDraggingLeft) {
        // Keep right edge fixed when dragging left edge
        newX = initialSize.x + initialSize.width - minSize;
      }
      newWidth = minSize;
    }
    if (newHeight < minSize) {
      if (isDraggingTop) {
        // Keep bottom edge fixed when dragging top edge
        newY = initialSize.y + initialSize.height - minSize;
      }
      newHeight = minSize;
    }

    updateShape(selectedShapeIndex, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      xNorm: newX / rect.width,
      yNormTop: newY / rect.height,
      widthNorm: newWidth / rect.width,
      heightNorm: newHeight / rect.height,
    });

    return true; // Handled
  }

  return false; // Not handled
}

/**
 * Handle mouse up on canvas for shapes
 */
export function handleShapeMouseUp(e, params) {
  const {
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
    shapeStrokeColor = "#000000",
    shapeStrokeWidth = 2,
    shapeFillColor = null,
  } = params;

  // Priority 1: If creating a shape, finish creation
  if (isCreatingShape) {
    const canvas = canvasRefs.current[activePage];
    const rect = canvas.getBoundingClientRect();

    // Take snapshot BEFORE creating shape (for undo)
    pushSnapshotToUndo(activePage);

    finishCreatingShape(activePage, rect.width, rect.height, shapeStrokeColor, shapeStrokeWidth, shapeFillColor);
    return true; // Handled
  }

  // Priority 2: If dragging/resizing, stop
  if (isDraggingShape || isDraggingMultipleShapes || isResizingShape) {
    pushSnapshotToUndo(activePage);
    setIsDraggingShape(false);
    setIsDraggingMultipleShapes(false);
    setIsResizingShape(false);
    return true; // Handled
  }

  return false; // Not handled
}

/**
 * Find which shape was clicked (respects z-index - highest z-index wins)
 */
function findClickedShape(shapeItems, mouseX, mouseY, canvasWidth, canvasHeight, activePage) {
  // Find all shapes under the cursor on this page
  const clickedShapes = [];

  for (let i = 0; i < shapeItems.length; i++) {
    const shape = shapeItems[i];
    if (shape.index !== activePage) continue;

    if (isPointInShape(shape, mouseX, mouseY, canvasWidth, canvasHeight)) {
      clickedShapes.push({
        index: i,
        zIndex: shape.zIndex ?? 0,
      });
    }
  }

  if (clickedShapes.length === 0) return null;

  // Sort by z-index descending (highest first) and return the topmost
  clickedShapes.sort((a, b) => b.zIndex - a.zIndex);
  return clickedShapes[0].index;
}

/**
 * Find topmost shape by z-index (exported for cross-layer comparison)
 */
export function findTopmostShapeAtPoint(shapeItems, mouseX, mouseY, canvasWidth, canvasHeight, activePage) {
  const clickedShapes = [];

  for (let i = 0; i < shapeItems.length; i++) {
    const shape = shapeItems[i];
    if (shape.index !== activePage) continue;

    if (isPointInShape(shape, mouseX, mouseY, canvasWidth, canvasHeight)) {
      clickedShapes.push({
        index: i,
        zIndex: shape.zIndex ?? 0,
        type: 'shape',
      });
    }
  }

  if (clickedShapes.length === 0) return null;

  // Return the one with highest z-index
  clickedShapes.sort((a, b) => b.zIndex - a.zIndex);
  return clickedShapes[0];
}
