/**
 * HTML to Canvas Converter
 * Renders HTML in a hidden container and extracts coordinates for canvas
 */

import type { TextItem } from '../../types/editor';
import type { ShapeItem } from '../../types/shapes';
import type { FormFieldItem, FormFieldType } from '../../types/formFields';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export interface ExtractedContent {
  textItems: TextItem[];
  shapes: ShapeItem[];
  formFields: FormFieldItem[];
}

/**
 * Render HTML string and extract text/shape items with positions
 */
export async function extractContentFromHtml(htmlString: string): Promise<ExtractedContent> {
  return new Promise((resolve) => {
    // Create hidden container with exact canvas dimensions
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${CANVAS_WIDTH}px;
      height: ${CANVAS_HEIGHT}px;
      background: white;
      font-family: 'Lato', sans-serif;
      overflow: hidden;
      box-sizing: border-box;
    `;

    // Insert the HTML
    container.innerHTML = htmlString;
    document.body.appendChild(container);

    // Wait for fonts and layout to settle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const textItems: TextItem[] = [];
        const shapes: ShapeItem[] = [];
        const formFields: FormFieldItem[] = [];

        const containerRect = container.getBoundingClientRect();

        // Extract all elements
        extractElements(container, containerRect, textItems, shapes, formFields, 0);

        // Clean up
        document.body.removeChild(container);

        resolve({ textItems, shapes, formFields });
      });
    });
  });
}

/**
 * Recursively extract elements from DOM
 * @param sectionMaxWidth - The maximum width constraint from the containing section (in pixels)
 */
function extractElements(
  element: Element,
  containerRect: DOMRect,
  textItems: TextItem[],
  shapes: ShapeItem[],
  formFields: FormFieldItem[],
  depth: number,
  sectionMaxWidth?: number
): void {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  // Calculate normalized positions relative to container
  const xNorm = (rect.left - containerRect.left) / CANVAS_WIDTH;
  const yNorm = (rect.top - containerRect.top) / CANVAS_HEIGHT;
  const widthNorm = rect.width / CANVAS_WIDTH;
  const heightNorm = rect.height / CANVAS_HEIGHT;

  // Skip if outside bounds
  if (xNorm < 0 || yNorm < 0 || xNorm > 1 || yNorm > 1) {
    return;
  }

  // Calculate available width for text wrapping
  // Check if this element has an explicit width constraint (percentage or fixed)
  const hasExplicitWidth = style.width && style.width !== 'auto' && !style.width.includes('auto');
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;

  // If element has explicit width (like the 30%/70% sections), use its content width as the new section width
  // Otherwise, use the parent's section width constraint
  let effectiveMaxWidth: number;
  if (hasExplicitWidth) {
    // This is a section with explicit width - calculate content width
    effectiveMaxWidth = rect.width - paddingLeft - paddingRight;
  } else if (sectionMaxWidth !== undefined) {
    // Use parent section's width, subtracting this element's padding
    effectiveMaxWidth = sectionMaxWidth - paddingLeft - paddingRight;
  } else {
    // Fallback to element's content width
    effectiveMaxWidth = rect.width - paddingLeft - paddingRight;
  }

  // Extract background as shape (if colored)
  const bgColor = style.backgroundColor;
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
      // Don't add white backgrounds
      if (hex.toLowerCase() !== '#ffffff') {
        shapes.push({
          type: 'rectangle',
          xNorm,
          yNormTop: yNorm,
          widthNorm,
          heightNorm,
          strokeColor: 'transparent',
          strokeWidth: 0,
          fillColor: hex,
          index: 0,
          x: xNorm * CANVAS_WIDTH,
          y: yNorm * CANVAS_HEIGHT,
          width: widthNorm * CANVAS_WIDTH,
          height: heightNorm * CANVAS_HEIGHT,
          zIndex: depth,
        });
      }
    }
  }

  // Extract border as shape (if present)
  const borderWidth = parseFloat(style.borderTopWidth) || 0;
  if (borderWidth > 0) {
    const borderColor = style.borderTopColor;
    const rgbMatch = borderColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
      shapes.push({
        type: 'rectangle',
        xNorm,
        yNormTop: yNorm,
        widthNorm,
        heightNorm,
        strokeColor: hex,
        strokeWidth: borderWidth,
        fillColor: null,
        index: 0,
        x: xNorm * CANVAS_WIDTH,
        y: yNorm * CANVAS_HEIGHT,
        width: widthNorm * CANVAS_WIDTH,
        height: heightNorm * CANVAS_HEIGHT,
        zIndex: depth + 1,
      });
    }
  }

  // Extract form fields (input, textarea, select)
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const inputType = (inputElement as HTMLInputElement).type?.toLowerCase() || 'text';

    // Determine form field type
    let fieldType: FormFieldType = 'textInput';
    if (tagName === 'textarea') {
      fieldType = 'textarea';
    } else if (tagName === 'select') {
      fieldType = 'dropdown';
    } else if (inputType === 'checkbox') {
      fieldType = 'checkbox';
    } else if (inputType === 'radio') {
      fieldType = 'radio';
    }

    // Get the associated label (look for parent label or preceding label)
    let label = '';
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Get text content excluding the input itself
      const labelClone = parentLabel.cloneNode(true) as HTMLElement;
      const inputsInLabel = labelClone.querySelectorAll('input, textarea, select');
      inputsInLabel.forEach(el => el.remove());
      label = labelClone.textContent?.trim() || '';
    } else {
      // Look for preceding sibling label or parent's preceding sibling
      const prevSibling = element.previousElementSibling;
      if (prevSibling?.tagName.toLowerCase() === 'label') {
        label = prevSibling.textContent?.trim() || '';
      }
    }

    // Extract field name from name, id, or placeholder
    const fieldName = inputElement.name || inputElement.id || label.toLowerCase().replace(/\s+/g, '_') || `field_${formFields.length}`;

    // Parse border color
    const borderColorMatch = style.borderColor?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const borderColor = borderColorMatch
      ? rgbToHex(parseInt(borderColorMatch[1]), parseInt(borderColorMatch[2]), parseInt(borderColorMatch[3]))
      : '#374151';

    // Parse background color
    const bgColorMatch = style.backgroundColor?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const backgroundColor = bgColorMatch
      ? rgbToHex(parseInt(bgColorMatch[1]), parseInt(bgColorMatch[2]), parseInt(bgColorMatch[3]))
      : '#ffffff';

    // Get options for select elements
    let options: string[] | undefined;
    if (tagName === 'select') {
      const selectEl = element as HTMLSelectElement;
      options = Array.from(selectEl.options).map(opt => opt.text);
    }

    // For checkboxes and radio buttons, use fixed square dimensions (18x18)
    // This ensures consistency between canvas rendering and PDF export
    const isCheckboxOrRadio = fieldType === 'checkbox' || fieldType === 'radio';
    const CHECKBOX_SIZE = 18;

    // Calculate dimensions based on field type
    let fieldWidth: number;
    let fieldHeight: number;
    let fieldWidthNorm: number;
    let fieldHeightNorm: number;

    if (isCheckboxOrRadio) {
      // Fixed 18x18 size for checkboxes and radios
      fieldWidth = CHECKBOX_SIZE;
      fieldHeight = CHECKBOX_SIZE;
      fieldWidthNorm = CHECKBOX_SIZE / CANVAS_WIDTH;
      fieldHeightNorm = CHECKBOX_SIZE / CANVAS_HEIGHT;
    } else {
      // For other fields, use extracted dimensions with minimums
      fieldWidth = Math.max(rect.width, 100);
      fieldHeight = Math.max(rect.height, 30);
      fieldWidthNorm = widthNorm;
      fieldHeightNorm = heightNorm;
    }

    formFields.push({
      type: fieldType,
      x: xNorm * CANVAS_WIDTH,
      y: yNorm * CANVAS_HEIGHT,
      width: fieldWidth,
      height: fieldHeight,
      xNorm: Math.max(0, Math.min(1, xNorm)),
      yNormTop: Math.max(0, Math.min(1, yNorm)),
      widthNorm: fieldWidthNorm,
      heightNorm: fieldHeightNorm,
      fieldName,
      label,
      placeholder: inputElement.placeholder || '',
      defaultValue: inputElement.value || '',
      required: inputElement.required || false,
      options,
      fontSize: parseFloat(style.fontSize) || 14,
      fontFamily: style.fontFamily?.split(',')[0].replace(/['"]/g, '') || 'Arial',
      textColor: '#000000',
      backgroundColor,
      borderColor,
      borderWidth: parseFloat(style.borderWidth) || 1,
      index: 0,
    });

    // Don't recurse into form elements (they have no children we care about)
    return;
  }

  // Extract text content (only direct text nodes)
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        // Get the range to measure text position precisely
        const range = document.createRange();
        range.selectNodeContents(node);
        const textRect = range.getBoundingClientRect();

        const textXNorm = (textRect.left - containerRect.left) / CANVAS_WIDTH;
        const textYNorm = (textRect.top - containerRect.top) / CANVAS_HEIGHT;

        // Parse font size
        const fontSize = parseFloat(style.fontSize) || 12;

        // Parse color
        const colorMatch = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        const color = colorMatch
          ? rgbToHex(parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3]))
          : '#000000';

        // Calculate maxWidth for text wrapping - use the section's effective width
        // This ensures text wraps within its containing section boundaries
        // Ensure maxWidth is positive and reasonable
        const textMaxWidth = effectiveMaxWidth > 10 ? effectiveMaxWidth : (sectionMaxWidth || rect.width);

        textItems.push({
          text,
          xNorm: Math.max(0, Math.min(1, textXNorm)),
          yNormTop: Math.max(0, Math.min(1, textYNorm)),
          fontSize,
          color,
          fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, '') || 'Lato',
          boxPadding: 5,
          anchor: 'top' as const,
          index: 0,
          x: textXNorm * CANVAS_WIDTH,
          y: textYNorm * CANVAS_HEIGHT,
          zIndex: depth + 10,
          maxWidth: textMaxWidth,
        });
      }
    }
  }

  // Recurse into children
  // If this element has explicit width, pass its content width as the new section width
  // Otherwise, pass the current section width down
  const childSectionWidth = hasExplicitWidth ? effectiveMaxWidth : (sectionMaxWidth ?? effectiveMaxWidth);
  for (const child of element.children) {
    extractElements(child, containerRect, textItems, shapes, formFields, depth + 1, childSectionWidth);
  }
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract horizontal lines from elements with border-bottom
 */
export function extractHorizontalLines(
  element: Element,
  containerRect: DOMRect
): ShapeItem[] {
  const lines: ShapeItem[] = [];
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  const borderBottomWidth = parseFloat(style.borderBottomWidth) || 0;
  if (borderBottomWidth > 0 && style.borderBottomStyle !== 'none') {
    const colorMatch = style.borderBottomColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (colorMatch) {
      const hex = rgbToHex(parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3]));
      const xNorm = (rect.left - containerRect.left) / CANVAS_WIDTH;
      const yNorm = (rect.bottom - containerRect.top) / CANVAS_HEIGHT;
      const widthNorm = rect.width / CANVAS_WIDTH;

      lines.push({
        type: 'line',
        xNorm,
        yNormTop: yNorm,
        widthNorm,
        heightNorm: 0,
        strokeColor: hex,
        strokeWidth: borderBottomWidth,
        fillColor: null,
        index: 0,
        x: xNorm * CANVAS_WIDTH,
        y: yNorm * CANVAS_HEIGHT,
        width: widthNorm * CANVAS_WIDTH,
        height: 0,
        zIndex: 5,
      });
    }
  }

  return lines;
}
