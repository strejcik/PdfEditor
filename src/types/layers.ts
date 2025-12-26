/**
 * Layer Panel Types
 * Unified type for managing all canvas elements in the Layer Panel
 */

export type LayerType = 'shape' | 'text' | 'image' | 'formField' | 'annotation';

/**
 * Represents a unified layer item for the Layer Panel
 * Wraps all element types with common properties
 */
export interface LayerItem {
  // Unique identifier for React keys and drag-drop
  id: string;
  // Type of element
  type: LayerType;
  // Index in the original array (e.g., shapeItems[3])
  globalIndex: number;
  // Which page this element belongs to
  pageIndex: number;
  // Current z-index value (higher = in front)
  zIndex: number;
  // Whether element is visible on canvas
  visible: boolean;
  // Whether element is locked (can't be edited)
  locked: boolean;
  // Display name in layer panel
  name: string;
  // Preview info for display (e.g., shape type, text snippet)
  preview?: string;
  // Whether this layer is currently selected
  isSelected?: boolean;
}

/**
 * Default z-index values for each element type
 */
export const DEFAULT_Z_INDEX: Record<LayerType, number> = {
  annotation: -50,   // Behind content
  image: -100,       // Background layer
  text: 0,           // Normal content
  shape: 0,          // Normal content
  formField: 100,    // Above content
};

/**
 * Icon representations for each layer type
 */
export const LAYER_TYPE_ICONS: Record<LayerType, string> = {
  shape: '\u25A1',      // White square
  text: 'T',            // Letter T
  image: '\u{1F5BC}',   // Frame with picture emoji
  formField: '\u{1F4DD}', // Memo emoji
  annotation: '\u{1F58D}', // Crayon emoji
};

/**
 * Generates auto-name for a layer based on its type and content
 */
export function generateLayerName(
  type: LayerType,
  item: any,
  typeIndex: number
): string {
  switch (type) {
    case 'shape': {
      const shapeTypeName = item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
        : 'Shape';
      return `${shapeTypeName} ${typeIndex + 1}`;
    }
    case 'text': {
      const preview = (item.text || '').substring(0, 20).trim();
      const suffix = (item.text || '').length > 20 ? '...' : '';
      return preview ? `Text: ${preview}${suffix}` : `Text ${typeIndex + 1}`;
    }
    case 'image':
      return `Image ${typeIndex + 1}`;
    case 'formField': {
      const fieldTypeName = item.type
        ? item.type.replace(/([A-Z])/g, ' $1').trim()
        : 'Form Field';
      const capitalizedType = fieldTypeName.charAt(0).toUpperCase() + fieldTypeName.slice(1);
      return `${capitalizedType} ${typeIndex + 1}`;
    }
    case 'annotation': {
      const annotationType = item.type
        ? item.type.charAt(0).toUpperCase() + item.type.slice(1)
        : 'Annotation';
      return `${annotationType} ${typeIndex + 1}`;
    }
    default:
      return `Layer ${typeIndex + 1}`;
  }
}
