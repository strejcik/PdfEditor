/**
 * Resolve coordinate (normalized or pixel)
 */
function resolveCoord(norm, pixel, canvasSize) {
  return norm != null ? norm * canvasSize : pixel;
}

/**
 * Draw an arrowhead at the end of a line
 */
function drawArrowhead(ctx, x1, y1, x2, y2, arrowSize = 10) {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  // Calculate the two points for the arrowhead
  const arrowAngle = Math.PI / 6; // 30 degrees

  const x3 = x2 - arrowSize * Math.cos(angle - arrowAngle);
  const y3 = y2 - arrowSize * Math.sin(angle - arrowAngle);

  const x4 = x2 - arrowSize * Math.cos(angle + arrowAngle);
  const y4 = y2 - arrowSize * Math.sin(angle + arrowAngle);

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.moveTo(x2, y2);
  ctx.lineTo(x4, y4);
  ctx.stroke();
}

/**
 * Draw all shapes for a specific page
 */
export function drawShapeItems(ctx, rect, pageIndex, state) {
  const { shapeItems, selectedShapeIndex, selectedShapeIndexes } = state;

  if (!shapeItems || shapeItems.length === 0) return;

  shapeItems.forEach((item, globalIndex) => {
    // Only draw shapes for this page
    if (item.index !== pageIndex) return;

    // Resolve coordinates
    const x = resolveCoord(item.xNorm, item.x, rect.width);
    const y = resolveCoord(item.yNormTop, item.y, rect.height);
    const w = resolveCoord(item.widthNorm, item.width, rect.width);
    const h = resolveCoord(item.heightNorm, item.height, rect.height);

    // Set style
    ctx.strokeStyle = item.strokeColor || "#000000";
    ctx.lineWidth = item.strokeWidth || 2;

    // Draw based on type
    switch (item.type) {
      case "rectangle":
        ctx.strokeRect(x, y, w, h);
        break;

      case "circle":
        const radiusX = w / 2;
        const radiusY = h / 2;
        const centerX = x + radiusX;
        const centerY = y + radiusY;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case "line":
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        break;

      case "arrow":
        // Draw the line
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        // Draw the arrowhead at the end
        drawArrowhead(ctx, x, y, x + w, y + h, 15);
        break;

      default:
        console.warn("Unknown shape type:", item.type);
    }

    // Draw selection highlight
    // Check both single selection and multi-selection
    const isSelected =
      globalIndex === selectedShapeIndex ||
      (selectedShapeIndexes && selectedShapeIndexes.includes(globalIndex));

    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = "rgba(30, 144, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

      // Draw resize handles (small squares at corners)
      const handleSize = 8;
      ctx.fillStyle = "rgba(30, 144, 255, 0.8)";
      ctx.setLineDash([]);

      // Top-left
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      // Top-right
      ctx.fillRect(x + w - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      // Bottom-left
      ctx.fillRect(x - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);
      // Bottom-right
      ctx.fillRect(x + w - handleSize / 2, y + h - handleSize / 2, handleSize, handleSize);

      ctx.restore();
    }
  });
}

/**
 * Draw shape creation preview (while dragging)
 */
export function drawShapeCreationPreview(ctx, rect, state) {
  const { isCreatingShape, shapeCreationStart, shapeCreationCurrent, activeShapeTool } = state;

  if (!isCreatingShape || !shapeCreationStart || !shapeCreationCurrent || !activeShapeTool) {
    return;
  }

  const x1 = Math.min(shapeCreationStart.x, shapeCreationCurrent.x);
  const y1 = Math.min(shapeCreationStart.y, shapeCreationCurrent.y);
  const x2 = Math.max(shapeCreationStart.x, shapeCreationCurrent.x);
  const y2 = Math.max(shapeCreationStart.y, shapeCreationCurrent.y);

  const w = x2 - x1;
  const h = y2 - y1;

  // Preview style
  ctx.strokeStyle = "rgba(30, 144, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  switch (activeShapeTool) {
    case "rectangle":
      ctx.strokeRect(x1, y1, w, h);
      break;

    case "circle":
      const radiusX = w / 2;
      const radiusY = h / 2;
      const centerX = x1 + radiusX;
      const centerY = y1 + radiusY;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case "line":
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;

    case "arrow":
      // Draw the line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      // Draw the arrowhead at the end
      drawArrowhead(ctx, x1, y1, x2, y2, 15);
      break;
  }

  ctx.setLineDash([]);
}
