/**
 * Resolve coordinate (normalized or pixel)
 */
function resolveCoord(norm, pixel, canvasSize) {
  return norm != null ? norm * canvasSize : pixel;
}

/**
 * Draw all form fields for a specific page
 */
export function drawFormFields(ctx, rect, pageIndex, state) {
  const { formFields, selectedFormFieldIndex } = state;

  if (!formFields || formFields.length === 0) return;

  formFields.forEach((field, globalIndex) => {
    // Only draw fields for this page
    if (field.index !== pageIndex) return;

    // Resolve coordinates
    const x = resolveCoord(field.xNorm, field.x, rect.width);
    const y = resolveCoord(field.yNormTop, field.y, rect.height);
    const w = resolveCoord(field.widthNorm, field.width, rect.width);
    const h = resolveCoord(field.heightNorm, field.height, rect.height);

    // Draw based on type
    switch (field.type) {
      case "textInput":
        drawTextInput(ctx, x, y, w, h, field);
        break;

      case "textarea":
        drawTextarea(ctx, x, y, w, h, field);
        break;

      case "checkbox":
        drawCheckbox(ctx, x, y, w, h, field);
        break;

      case "radio":
        drawRadio(ctx, x, y, w, h, field);
        break;

      case "dropdown":
        drawDropdown(ctx, x, y, w, h, field);
        break;

      default:
        console.warn("Unknown form field type:", field.type);
    }

    // Draw selection highlight
    const isSelected = globalIndex === selectedFormFieldIndex;

    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

      // Draw resize handles (small squares at corners)
      const handleSize = 8;
      ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
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

    // Draw required indicator
    if (field.required) {
      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 14px Arial";
      ctx.fillText("*", x + w + 4, y + 14);
      ctx.restore();
    }
  });
}

/**
 * Draw text input field
 */
function drawTextInput(ctx, x, y, w, h, field) {
  // Background
  ctx.fillStyle = field.backgroundColor || "#ffffff";
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = field.borderColor || "#374151";
  ctx.lineWidth = field.borderWidth || 1;
  ctx.strokeRect(x, y, w, h);

  // Placeholder text
  if (field.placeholder || field.defaultValue) {
    ctx.save();
    ctx.fillStyle = field.defaultValue ? (field.textColor || "#000000") : "#9ca3af";
    ctx.font = `${field.fontSize || 14}px ${field.fontFamily || "Arial"}`;
    ctx.textBaseline = "middle";

    // Clip to field bounds
    ctx.beginPath();
    ctx.rect(x + 4, y, w - 8, h);
    ctx.clip();

    ctx.fillText(field.defaultValue || field.placeholder || "", x + 8, y + h / 2);
    ctx.restore();
  }

  // Text input icon (small "T" indicator)
  ctx.save();
  ctx.fillStyle = "#9ca3af";
  ctx.font = "bold 10px Arial";
  ctx.fillText("T", x + w - 14, y + h - 6);
  ctx.restore();
}

/**
 * Draw textarea field (multi-line text input)
 */
function drawTextarea(ctx, x, y, w, h, field) {
  // Background
  ctx.fillStyle = field.backgroundColor || "#ffffff";
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = field.borderColor || "#374151";
  ctx.lineWidth = field.borderWidth || 1;
  ctx.strokeRect(x, y, w, h);

  // Placeholder or default value text (with wrapping)
  const displayText = field.defaultValue || field.placeholder || "";
  if (displayText) {
    ctx.save();
    ctx.fillStyle = field.defaultValue ? (field.textColor || "#000000") : "#9ca3af";
    ctx.font = `${field.fontSize || 14}px ${field.fontFamily || "Arial"}`;
    ctx.textBaseline = "top";

    // Clip to field bounds with padding
    const padding = 8;
    ctx.beginPath();
    ctx.rect(x + padding, y + padding, w - padding * 2, h - padding * 2);
    ctx.clip();

    // Simple text wrapping
    const words = displayText.split(' ');
    const lineHeight = (field.fontSize || 14) * 1.3;
    const maxWidth = w - padding * 2;
    let line = '';
    let lineY = y + padding;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line.trim(), x + padding, lineY);
        line = words[i] + ' ';
        lineY += lineHeight;
        // Stop if we've gone past the bottom
        if (lineY > y + h - padding) break;
      } else {
        line = testLine;
      }
    }
    // Draw remaining text
    if (lineY <= y + h - padding) {
      ctx.fillText(line.trim(), x + padding, lineY);
    }

    ctx.restore();
  }

  // Textarea icon (lines indicator in bottom-right corner)
  ctx.save();
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;
  // Draw three small horizontal lines to indicate multi-line
  const iconX = x + w - 18;
  const iconY = y + h - 14;
  ctx.beginPath();
  ctx.moveTo(iconX, iconY);
  ctx.lineTo(iconX + 10, iconY);
  ctx.moveTo(iconX, iconY + 4);
  ctx.lineTo(iconX + 10, iconY + 4);
  ctx.moveTo(iconX, iconY + 8);
  ctx.lineTo(iconX + 6, iconY + 8);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw checkbox field
 */
function drawCheckbox(ctx, x, y, w, h, field) {
  // Background
  ctx.fillStyle = field.backgroundColor || "#ffffff";
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = field.borderColor || "#374151";
  ctx.lineWidth = field.borderWidth || 1;
  ctx.strokeRect(x, y, w, h);

  // Checkmark if checked
  if (field.defaultValue === "true") {
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.5);
    ctx.lineTo(x + w * 0.4, y + h * 0.7);
    ctx.lineTo(x + w * 0.8, y + h * 0.3);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Draw radio button field
 */
function drawRadio(ctx, x, y, w, h, field) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 1;

  // Background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = field.backgroundColor || "#ffffff";
  ctx.fill();

  // Border
  ctx.strokeStyle = field.borderColor || "#374151";
  ctx.lineWidth = field.borderWidth || 1;
  ctx.stroke();

  // Inner dot if selected
  if (field.defaultValue === "true") {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
  }
}

/**
 * Draw dropdown field
 */
function drawDropdown(ctx, x, y, w, h, field) {
  // Background
  ctx.fillStyle = field.backgroundColor || "#ffffff";
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = field.borderColor || "#374151";
  ctx.lineWidth = field.borderWidth || 1;
  ctx.strokeRect(x, y, w, h);

  // Selected value or placeholder
  ctx.save();
  ctx.fillStyle = field.defaultValue ? (field.textColor || "#000000") : "#9ca3af";
  ctx.font = `${field.fontSize || 14}px ${field.fontFamily || "Arial"}`;
  ctx.textBaseline = "middle";

  // Clip to field bounds (excluding dropdown arrow area)
  ctx.beginPath();
  ctx.rect(x + 4, y, w - 28, h);
  ctx.clip();

  const displayText = field.defaultValue ||
    (field.options && field.options.length > 0 ? field.options[0] : "Select...");
  ctx.fillText(displayText, x + 8, y + h / 2);
  ctx.restore();

  // Dropdown arrow
  ctx.save();
  ctx.fillStyle = "#6b7280";
  ctx.beginPath();
  ctx.moveTo(x + w - 18, y + h / 2 - 3);
  ctx.lineTo(x + w - 8, y + h / 2 - 3);
  ctx.lineTo(x + w - 13, y + h / 2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Separator line before arrow
  ctx.strokeStyle = field.borderColor || "#374151";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w - 24, y + 4);
  ctx.lineTo(x + w - 24, y + h - 4);
  ctx.stroke();
}

/**
 * Draw form field creation preview (while dragging)
 */
export function drawFormFieldCreationPreview(ctx, rect, state) {
  const { isCreatingFormField, formFieldCreationStart, formFieldCreationCurrent, activeFormFieldTool } = state;

  if (!isCreatingFormField || !formFieldCreationStart || !formFieldCreationCurrent || !activeFormFieldTool) {
    return;
  }

  const x1 = Math.min(formFieldCreationStart.x, formFieldCreationCurrent.x);
  const y1 = Math.min(formFieldCreationStart.y, formFieldCreationCurrent.y);
  const x2 = Math.max(formFieldCreationStart.x, formFieldCreationCurrent.x);
  const y2 = Math.max(formFieldCreationStart.y, formFieldCreationCurrent.y);

  let w = x2 - x1;
  let h = y2 - y1;

  // Enforce minimum size
  const minSize = 20;
  if (w < minSize) w = minSize;
  if (h < minSize) h = minSize;

  // For checkbox and radio, enforce square
  if (activeFormFieldTool === 'checkbox' || activeFormFieldTool === 'radio') {
    const size = Math.max(w, h);
    w = size;
    h = size;
  }

  // Preview style
  ctx.save();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);

  if (activeFormFieldTool === 'radio') {
    // Draw circle preview for radio
    const centerX = x1 + w / 2;
    const centerY = y1 + h / 2;
    const radius = Math.min(w, h) / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Draw rectangle preview for others
    ctx.fillRect(x1, y1, w, h);
    ctx.strokeRect(x1, y1, w, h);
  }

  // Label
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
  ctx.font = "12px Arial";
  const label = activeFormFieldTool === 'textInput' ? 'Text Input' :
                activeFormFieldTool === 'textarea' ? 'Text Area' :
                activeFormFieldTool === 'checkbox' ? 'Checkbox' :
                activeFormFieldTool === 'radio' ? 'Radio' : 'Dropdown';
  ctx.fillText(label, x1, y1 - 5);

  ctx.restore();
}
