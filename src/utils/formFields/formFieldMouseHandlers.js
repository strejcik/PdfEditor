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
    startCreatingFormField,
    selectedFormFieldIndex,
    setSelectedFormFieldIndex,
    setIsDraggingFormField,
    setIsResizingFormField,
    setDragStart,
    setInitialField,
    setResizeStart,
    setResizeHandle,
    setInitialSize,
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

    // Clear other selections when selecting a form field
    setSelectedShapeIndex?.(null);
    setSelectedShapeIndexes?.([]);
    setSelectedTextIndex?.(null);
    setSelectedTextIndexes?.([]);
    setIsTextSelected?.(false);

    // Check resize handles on clicked field
    const handle = getFormFieldResizeHandle(field, mouseX, mouseY, rect.width, rect.height);

    if (handle) {
      setSelectedFormFieldIndex(clickedFieldIndex);
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
      // Start dragging
      setSelectedFormFieldIndex(clickedFieldIndex);
      setIsDraggingFormField(true);
      setDragStart({ x: mouseX, y: mouseY });
      setInitialField({ ...field });
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
    isResizingFormField,
    selectedFormFieldIndex,
    formFields,
    dragStart,
    initialField,
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

  // Priority 2: If dragging a form field, update position
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

  // Priority 3: If resizing a form field, update size
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
    isResizingFormField,
    setIsDraggingFormField,
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
  if (isDraggingFormField || isResizingFormField) {
    pushSnapshotToUndo(activePage);
    setIsDraggingFormField(false);
    setIsResizingFormField(false);
    return true;
  }

  return false;
}
