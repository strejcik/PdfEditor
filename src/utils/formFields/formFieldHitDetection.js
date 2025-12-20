/**
 * Resolve coordinate (normalized or pixel)
 */
function resolveCoord(norm, pixel, canvasSize) {
  return norm != null ? norm * canvasSize : pixel;
}

/**
 * Check if a point is inside a form field
 */
export function isPointInFormField(field, mouseX, mouseY, canvasWidth, canvasHeight) {
  const x = resolveCoord(field.xNorm, field.x, canvasWidth);
  const y = resolveCoord(field.yNormTop, field.y, canvasHeight);
  const w = resolveCoord(field.widthNorm, field.width, canvasWidth);
  const h = resolveCoord(field.heightNorm, field.height, canvasHeight);

  // Add small tolerance for easier clicking
  const tolerance = 2;

  if (field.type === 'radio') {
    // For radio buttons, use circle hit detection
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.min(w, h) / 2 + tolerance;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    return (dx * dx + dy * dy) <= (radius * radius);
  }

  // For all other field types, use rectangle hit detection
  return (
    mouseX >= x - tolerance &&
    mouseX <= x + w + tolerance &&
    mouseY >= y - tolerance &&
    mouseY <= y + h + tolerance
  );
}

/**
 * Get resize handle at mouse position (if any)
 * Returns: "top-left", "top-right", "bottom-left", "bottom-right", or null
 */
export function getFormFieldResizeHandle(field, mouseX, mouseY, canvasWidth, canvasHeight) {
  const x = resolveCoord(field.xNorm, field.x, canvasWidth);
  const y = resolveCoord(field.yNormTop, field.y, canvasHeight);
  const w = resolveCoord(field.widthNorm, field.width, canvasWidth);
  const h = resolveCoord(field.heightNorm, field.height, canvasHeight);

  const handleSize = 8;
  const tolerance = 4;
  const halfHandle = handleSize / 2 + tolerance;

  // Check each corner
  // Top-left
  if (
    mouseX >= x - halfHandle &&
    mouseX <= x + halfHandle &&
    mouseY >= y - halfHandle &&
    mouseY <= y + halfHandle
  ) {
    return "top-left";
  }

  // Top-right
  if (
    mouseX >= x + w - halfHandle &&
    mouseX <= x + w + halfHandle &&
    mouseY >= y - halfHandle &&
    mouseY <= y + halfHandle
  ) {
    return "top-right";
  }

  // Bottom-left
  if (
    mouseX >= x - halfHandle &&
    mouseX <= x + halfHandle &&
    mouseY >= y + h - halfHandle &&
    mouseY <= y + h + halfHandle
  ) {
    return "bottom-left";
  }

  // Bottom-right
  if (
    mouseX >= x + w - halfHandle &&
    mouseX <= x + w + halfHandle &&
    mouseY >= y + h - halfHandle &&
    mouseY <= y + h + halfHandle
  ) {
    return "bottom-right";
  }

  return null;
}

/**
 * Find which form field was clicked
 */
export function findClickedFormField(formFields, mouseX, mouseY, canvasWidth, canvasHeight, pageIndex) {
  // Iterate in reverse order (top to bottom in z-order)
  for (let i = formFields.length - 1; i >= 0; i--) {
    const field = formFields[i];
    if (field.index !== pageIndex) continue;

    if (isPointInFormField(field, mouseX, mouseY, canvasWidth, canvasHeight)) {
      return i;
    }
  }
  return null;
}
