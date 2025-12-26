/**
 * PDF Annotation Types
 * Supports highlight, strikethrough, and underline annotations on PDF text
 */

export type AnnotationType = 'highlight' | 'strikethrough' | 'underline';

/**
 * Represents a text span extracted from PDF with bounding box
 * Used for text selection during annotation creation
 */
export interface TextSpan {
  text: string;
  // Normalized coordinates (0-1)
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
  // Font metrics
  fontSize: number;
  // Page association
  index: number;
  // Optional: font metrics for accurate annotation positioning
  // ascentRatio = ascent / textHeight (baseline position from top, typically ~0.8)
  // descentRatio = descent / textHeight (typically ~0.2)
  ascentRatio?: number;
  descentRatio?: number;
}

/**
 * Represents an annotation span (portion of annotation on a single line)
 */
export interface AnnotationSpan {
  // Absolute coordinates (used when not linked to text item)
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
  // Relative offsets from linked text item (used when linked)
  // These are offsets from the text item's xNorm/yNormTop
  relativeXNorm?: number;
  relativeYNorm?: number;
  // Text content for accurate visual positioning via measureText
  text?: string;
  fontSize?: number;
  // Optional: font metrics for accurate annotation positioning
  ascentRatio?: number;
  descentRatio?: number;
}

/**
 * Represents a complete annotation item
 * Can span multiple text lines (multiple spans)
 */
export interface AnnotationItem {
  id: string;
  type: AnnotationType;
  // The spans this annotation covers (can span multiple lines)
  spans: AnnotationSpan[];
  // Styling
  color: string;
  opacity: number;
  // Page association
  index: number;
  // Optional: reference to original text (for search/export)
  annotatedText?: string;
  // Linking to text item - when linked, annotation moves with the text item
  linkedTextItemId?: string;
  // Stores the last linked textItem ID when unlinked, for re-linking to original textItem
  lastLinkedTextItemId?: string;

  // Z-index for layering (higher = in front)
  zIndex?: number;          // default: -50 (behind content)

  // Layer panel properties
  visible?: boolean;        // default: true - whether element is drawn
  locked?: boolean;         // default: false - whether element can be edited
  name?: string;            // custom name for layer panel
}

/**
 * State for annotation management in the hook
 */
export interface AnnotationState {
  annotationItems: AnnotationItem[];
  selectedAnnotationIndex: number | null;
  selectedAnnotationIndexes: number[];

  // Active annotation tool
  activeAnnotationTool: AnnotationType | null;
  annotationColor: string;
  annotationOpacity: number;

  // Text selection state for annotation creation
  isSelectingText: boolean;
  textSelectionStart: { x: number; y: number } | null;
  textSelectionEnd: { x: number; y: number } | null;
  selectedTextSpans: TextSpan[];

  // Linking option - when enabled, new annotations are linked to text items
  linkToTextItem: boolean;
}

/**
 * Default styling for each annotation type
 */
export const ANNOTATION_DEFAULTS: Record<AnnotationType, { color: string; opacity: number }> = {
  highlight: { color: '#FFFF00', opacity: 0.4 },
  strikethrough: { color: '#FF0000', opacity: 1.0 },
  underline: { color: '#0000FF', opacity: 1.0 },
};

/**
 * Preset colors for annotation color picker
 */
export const ANNOTATION_PRESET_COLORS = [
  '#000000', // Black
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#6b7280', // Gray
];
