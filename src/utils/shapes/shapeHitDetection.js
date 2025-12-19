/**
 * Check if a point hits a shape
 * Includes tolerance based on stroke width for better hit detection
 */
export function isPointInShape(shape, mouseX, mouseY, canvasWidth, canvasHeight) {
  const x = shape.xNorm != null ? shape.xNorm * canvasWidth : shape.x;
  const y = shape.yNormTop != null ? shape.yNormTop * canvasHeight : shape.y;
  const w = shape.widthNorm != null ? shape.widthNorm * canvasWidth : shape.width;
  const h = shape.heightNorm != null ? shape.heightNorm * canvasHeight : shape.height;

  // Add tolerance based on stroke width (minimum 3px for easier clicking)
  const strokeWidth = shape.strokeWidth || 2;
  const tolerance = Math.max(strokeWidth / 2 + 3, 5);

  switch (shape.type) {
    case "rectangle": {
      // Check if point is inside the rectangle OR near its border (within tolerance)
      const insideOuter = (
        mouseX >= x - tolerance &&
        mouseX <= x + w + tolerance &&
        mouseY >= y - tolerance &&
        mouseY <= y + h + tolerance
      );

      // If not near the rectangle at all, return false
      if (!insideOuter) return false;

      // Check if inside the actual rectangle
      const insideRect = (
        mouseX >= x &&
        mouseX <= x + w &&
        mouseY >= y &&
        mouseY <= y + h
      );

      // If inside, definitely hit
      if (insideRect) return true;

      // Check if near the border (for hollow rectangles)
      const nearLeftBorder = Math.abs(mouseX - x) <= tolerance && mouseY >= y - tolerance && mouseY <= y + h + tolerance;
      const nearRightBorder = Math.abs(mouseX - (x + w)) <= tolerance && mouseY >= y - tolerance && mouseY <= y + h + tolerance;
      const nearTopBorder = Math.abs(mouseY - y) <= tolerance && mouseX >= x - tolerance && mouseX <= x + w + tolerance;
      const nearBottomBorder = Math.abs(mouseY - (y + h)) <= tolerance && mouseX >= x - tolerance && mouseX <= x + w + tolerance;

      return nearLeftBorder || nearRightBorder || nearTopBorder || nearBottomBorder;
    }

    case "circle": {
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      const radiusX = w / 2;
      const radiusY = h / 2;

      // Check if inside the ellipse with tolerance
      const dx = (mouseX - centerX) / (radiusX + tolerance);
      const dy = (mouseY - centerY) / (radiusY + tolerance);
      const distanceRatioOuter = dx * dx + dy * dy;

      // If not near the circle at all, return false
      if (distanceRatioOuter > 1) return false;

      // Check if inside the actual ellipse
      const dx2 = (mouseX - centerX) / radiusX;
      const dy2 = (mouseY - centerY) / radiusY;
      const distanceRatioInner = dx2 * dx2 + dy2 * dy2;

      // If inside, definitely hit
      if (distanceRatioInner <= 1) return true;

      // Near the border
      return true;
    }

    case "line":
    case "arrow": {
      // Line/Arrow hit detection with tolerance (use same tolerance calculation)
      const lineTolerance = Math.max(strokeWidth / 2 + 3, 8); // Slightly larger for lines
      const x1 = x;
      const y1 = y;
      const x2 = x + w;
      const y2 = y + h;

      // Distance from point to line segment
      const A = mouseX - x1;
      const B = mouseY - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = mouseX - xx;
      const dy = mouseY - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      return distance <= lineTolerance;
    }

    default:
      return false;
  }
}

/**
 * Check if a shape intersects with a selection rectangle
 */
export function isShapeInSelectionRect(shape, selectionRect, canvasWidth, canvasHeight) {
  const x = shape.xNorm != null ? shape.xNorm * canvasWidth : shape.x;
  const y = shape.yNormTop != null ? shape.yNormTop * canvasHeight : shape.y;
  const w = shape.widthNorm != null ? shape.widthNorm * canvasWidth : shape.width;
  const h = shape.heightNorm != null ? shape.heightNorm * canvasHeight : shape.height;

  // Get the shape's bounding box
  const shapeBounds = { x, y, width: w, height: h };

  // Check rectangle intersection
  const intersects =
    selectionRect.x < shapeBounds.x + shapeBounds.width &&
    selectionRect.x + selectionRect.width > shapeBounds.x &&
    selectionRect.y < shapeBounds.y + shapeBounds.height &&
    selectionRect.y + selectionRect.height > shapeBounds.y;

  return intersects;
}

/**
 * Check if a point is on a resize handle
 */
export function getResizeHandle(shape, mouseX, mouseY, canvasWidth, canvasHeight) {
  const x = shape.xNorm != null ? shape.xNorm * canvasWidth : shape.x;
  const y = shape.yNormTop != null ? shape.yNormTop * canvasHeight : shape.y;
  const w = shape.widthNorm != null ? shape.widthNorm * canvasWidth : shape.width;
  const h = shape.heightNorm != null ? shape.heightNorm * canvasHeight : shape.height;

  const handleSize = 8;
  const tolerance = 4;

  const handles = {
    "top-left": { x: x, y: y },
    "top-right": { x: x + w, y: y },
    "bottom-left": { x: x, y: y + h },
    "bottom-right": { x: x + w, y: y + h },
  };

  for (const [name, pos] of Object.entries(handles)) {
    if (
      Math.abs(mouseX - pos.x) <= handleSize / 2 + tolerance &&
      Math.abs(mouseY - pos.y) <= handleSize / 2 + tolerance
    ) {
      return name;
    }
  }

  return null;
}
