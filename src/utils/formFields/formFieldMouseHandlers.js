import { isPointInFormField, getFormFieldResizeHandle, findClickedFormField } from "./formFieldHitDetection";

/**
 * Handle mouse down on canvas for form fields
 */
export function handleFormFieldMouseDown(e, params) {
  const {
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
    setDragStart,
    setSelectionDragStart,
    setInitialField,
    setInitialMultiFields,
    setInitialMixedItemPositions,
    setResizeStart,
    setResizeHandle,
    setInitialSize,
    resolveTextLayoutForHit,
    // For clearing other selections
    setSelectedShapeIndex,
    setSelectedShapeIndexes,
    setSelectedTextIndex,
    setSelectedTextIndexes,
    setIsTextSelected,
  } = params;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Priority 1: If form field tool is active, start creating
  if (activeFormFieldTool) {
    startCreatingFormField(mouseX, mouseY);
    return true;
  }

  // Priority 2: Check resize handles on selected field
  if (selectedFormFieldIndex !== null && formFields[selectedFormFieldIndex]) {
    const selectedField = formFields[selectedFormFieldIndex];
    if (selectedField.index === activePage) {
      const handle = getFormFieldResizeHandle(selectedField, mouseX, mouseY, rect.width, rect.height);

      if (handle) {
        // Check if field is locked - don't allow resize
        if (selectedField.locked) {
          return false; // Let other handlers process
        }
        setIsResizingFormField(true);
        setResizeStart({ x: mouseX, y: mouseY });
        setResizeHandle(handle);

        const resolvedX = selectedField.xNorm != null ? selectedField.xNorm * rect.width : selectedField.x;
        const resolvedY = selectedField.yNormTop != null ? selectedField.yNormTop * rect.height : selectedField.y;
        const resolvedWidth = selectedField.widthNorm != null ? selectedField.widthNorm * rect.width : selectedField.width;
        const resolvedHeight = selectedField.heightNorm != null ? selectedField.heightNorm * rect.height : selectedField.height;

        setInitialSize({
          x: resolvedX,
          y: resolvedY,
          width: resolvedWidth,
          height: resolvedHeight,
        });
        return true;
      }
    }
  }

  // Priority 3: Check if clicking on a form field
  const clickedFieldIndex = findClickedFormField(
    formFields,
    mouseX,
    mouseY,
    rect.width,
    rect.height,
    activePage
  );

  if (clickedFieldIndex !== null) {
    const field = formFields[clickedFieldIndex];

    // Check resize handles on clicked field
    const handle = getFormFieldResizeHandle(field, mouseX, mouseY, rect.width, rect.height);

    if (handle) {
      // Check if field is locked - don't allow resize, but still select it
      if (field.locked) {
        // Select the locked field but don't allow resize
        setSelectedShapeIndex?.(null);
        setSelectedShapeIndexes?.([]);
        setSelectedTextIndex?.(null);
        setSelectedTextIndexes?.([]);
        setIsTextSelected?.(false);
        setSelectedFormFieldIndex(clickedFieldIndex);
        setSelectedFormFieldIndexes?.([]);
        return true; // Handled - selected but not resizing
      }
      // Clear other selections when resizing
      setSelectedShapeIndex?.(null);
      setSelectedShapeIndexes?.([]);
      setSelectedTextIndex?.(null);
      setSelectedTextIndexes?.([]);
      setIsTextSelected?.(false);

      setSelectedFormFieldIndex(clickedFieldIndex);
      setSelectedFormFieldIndexes?.([]);
      setIsResizingFormField(true);
      setResizeStart({ x: mouseX, y: mouseY });
      setResizeHandle(handle);

      const resolvedX = field.xNorm != null ? field.xNorm * rect.width : field.x;
      const resolvedY = field.yNormTop != null ? field.yNormTop * rect.height : field.y;
      const resolvedWidth = field.widthNorm != null ? field.widthNorm * rect.width : field.width;
      const resolvedHeight = field.heightNorm != null ? field.heightNorm * rect.height : field.height;

      setInitialSize({
        x: resolvedX,
        y: resolvedY,
        width: resolvedWidth,
        height: resolvedHeight,
      });
      return true;
    } else {
      // Check if this is part of a multi-selection
      const isPartOfMultiSelection = selectedFormFieldIndexes && selectedFormFieldIndexes.includes(clickedFieldIndex);

      // Check for mixed selection (text + shapes + form fields)
      const hasTextSelection = selectedTextIndexes && selectedTextIndexes.length > 0;
      const hasShapeSelection = selectedShapeIndexes && selectedShapeIndexes.length > 0;
      const hasFormFieldSelection = selectedFormFieldIndexes && selectedFormFieldIndexes.length > 0;

      // Determine if we have a mixed selection (at least 2 different types of items selected)
      const selectionTypeCount = (hasTextSelection ? 1 : 0) + (hasShapeSelection ? 1 : 0) + (hasFormFieldSelection ? 1 : 0);
      const isMixedSelection = selectionTypeCount >= 2;

      // If clicked form field is part of a mixed selection, start mixed-item dragging
      if (isMixedSelection && isPartOfMultiSelection) {
        const ctx = canvas.getContext('2d');
        setIsDraggingMixedItems?.(true);
        setIsSelecting?.(false);
        setSelectionDragStart?.({ x: mouseX, y: mouseY });

        // Store initial positions for all selected items
        const textPositions = (selectedTextIndexes || []).map(i => {
          const textItem = textItems[i];
          const Li = resolveTextLayoutForHit?.(textItem, ctx, canvas);
          return {
            type: 'text',
            index: i,
            xTop: Li?.x || textItem.x,
            yTop: Li?.topY || textItem.y,
            activePage: textItem.index
          };
        });

        const shapePositions = (selectedShapeIndexes || []).map(i => {
          const shape = shapeItems[i];
          const resolvedX = shape.xNorm != null ? shape.xNorm * rect.width : shape.x;
          const resolvedY = shape.yNormTop != null ? shape.yNormTop * rect.height : shape.y;
          return {
            type: 'shape',
            index: i,
            x: resolvedX,
            y: resolvedY,
            activePage: shape.index,
            points: shape.points
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

        setInitialMixedItemPositions?.([...textPositions, ...shapePositions, ...formFieldPositions]);
        return true;
      }

      // If clicking on a form field that's part of multi-form-field selection
      if (isPartOfMultiSelection && selectedFormFieldIndexes.length > 1) {
        setIsDraggingMultipleFormFields?.(true);
        setDragStart({ x: mouseX, y: mouseY });

        // Store initial positions of all selected form fields
        setInitialMultiFields?.(selectedFormFieldIndexes.map(index => {
          const f = formFields[index];
          const resolvedX = f.xNorm != null ? f.xNorm * rect.width : f.x;
          const resolvedY = f.yNormTop != null ? f.yNormTop * rect.height : f.y;
          return {
            index,
            x: resolvedX,
            y: resolvedY
          };
        }));
        return true;
      }

      // Single form field selection - clear other selections
      setSelectedShapeIndex?.(null);
      setSelectedShapeIndexes?.([]);
      setSelectedTextIndex?.(null);
      setSelectedTextIndexes?.([]);
      setIsTextSelected?.(false);

      // Select the form field
      setSelectedFormFieldIndex(clickedFieldIndex);
      setSelectedFormFieldIndexes?.([]);

      // Check if field is locked - don't allow drag
      if (field.locked) {
        return true; // Handled - selected but not dragging
      }

      // Start dragging single form field
      setIsDraggingFormField(true);
      setDragStart({ x: mouseX, y: mouseY });

      // Resolve coordinates before storing - use normalized values if available
      const resolvedX = field.xNorm != null ? field.xNorm * rect.width : field.x;
      const resolvedY = field.yNormTop != null ? field.yNormTop * rect.height : field.y;
      setInitialField({ ...field, x: resolvedX, y: resolvedY });
      return true;
    }
  }

  // Not handled
  return false;
}

/**
 * Handle mouse move on canvas for form fields
 */
export function handleFormFieldMouseMove(e, params) {
  const {
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
    dragStart,
    initialField,
    initialMultiFields,
    resizeStart,
    resizeHandle,
    initialSize,
    updateFormField,
  } = params;

  const canvas = canvasRefs.current[activePage];
  if (!canvas) return false;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Priority 1: If creating a form field, update preview
  if (isCreatingFormField) {
    updateFormFieldCreation(mouseX, mouseY);
    return true;
  }

  // Priority 1.5: If dragging mixed items, defer to text handler
  if (isDraggingMixedItems) {
    return false; // Let useMouse.ts handle mixed-item dragging
  }

  // Priority 2: If dragging multiple form fields, update all positions
  if (isDraggingMultipleFormFields && dragStart && initialMultiFields && initialMultiFields.length > 0) {
    const dx = mouseX - dragStart.x;
    const dy = mouseY - dragStart.y;

    // Update all selected form fields
    initialMultiFields.forEach(({ index, x, y }) => {
      const newX = x + dx;
      const newY = y + dy;

      updateFormField(index, {
        x: newX,
        y: newY,
        xNorm: newX / rect.width,
        yNormTop: newY / rect.height,
      });
    });

    return true;
  }

  // Priority 3: If dragging a single form field, update position
  if (isDraggingFormField && selectedFormFieldIndex !== null && dragStart && initialField) {
    const dx = mouseX - dragStart.x;
    const dy = mouseY - dragStart.y;

    const newX = initialField.x + dx;
    const newY = initialField.y + dy;

    updateFormField(selectedFormFieldIndex, {
      x: newX,
      y: newY,
      xNorm: newX / rect.width,
      yNormTop: newY / rect.height,
    });

    return true;
  }

  // Priority 4: If resizing a form field, update size
  if (isResizingFormField && selectedFormFieldIndex !== null && resizeStart && initialSize && resizeHandle) {
    const dx = mouseX - resizeStart.x;
    const dy = mouseY - resizeStart.y;

    let newX = initialSize.x;
    let newY = initialSize.y;
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;

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

    // Enforce minimum size
    const minSize = 20;
    if (newWidth < minSize) {
      if (isDraggingLeft) {
        newX = initialSize.x + initialSize.width - minSize;
      }
      newWidth = minSize;
    }
    if (newHeight < minSize) {
      if (isDraggingTop) {
        newY = initialSize.y + initialSize.height - minSize;
      }
      newHeight = minSize;
    }

    // For checkbox and radio, maintain square aspect ratio
    const field = formFields[selectedFormFieldIndex];
    if (field && (field.type === 'checkbox' || field.type === 'radio')) {
      const size = Math.max(newWidth, newHeight);
      newWidth = size;
      newHeight = size;
    }

    updateFormField(selectedFormFieldIndex, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      xNorm: newX / rect.width,
      yNormTop: newY / rect.height,
      widthNorm: newWidth / rect.width,
      heightNorm: newHeight / rect.height,
    });

    return true;
  }

  return false;
}

/**
 * Handle mouse up on canvas for form fields
 */
export function handleFormFieldMouseUp(e, params) {
  const {
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
  } = params;

  // Priority 1: If creating a form field, finish creation
  if (isCreatingFormField) {
    const canvas = canvasRefs.current[activePage];
    const rect = canvas.getBoundingClientRect();

    // Take snapshot BEFORE creating field (for undo)
    pushSnapshotToUndo(activePage);

    finishCreatingFormField(activePage, rect.width, rect.height);
    return true;
  }

  // Priority 2: If dragging/resizing, stop
  if (isDraggingFormField || isDraggingMultipleFormFields || isResizingFormField) {
    pushSnapshotToUndo(activePage);
    setIsDraggingFormField?.(false);
    setIsDraggingMultipleFormFields?.(false);
    setIsResizingFormField?.(false);
    return true;
  }

  return false;
}
