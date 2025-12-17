export type ShapeType = "rectangle" | "circle" | "line";

export interface ShapeItem {
  // Shape type
  type: ShapeType;

  // Pixel coordinates (runtime only)
  x: number;
  y: number;
  width: number;
  height: number;

  // Normalized coordinates (0-1, persisted)
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;

  // Styling (MVP: simple defaults)
  strokeColor: string;      // default: "#000000"
  strokeWidth: number;      // default: 2

  // Page association
  index: number;            // which page (0-based)
}

export interface ShapeState {
  shapeItems: ShapeItem[];
  selectedShapeIndex: number | null;
  isDraggingShape: boolean;
  isResizingShape: boolean;
  isCreatingShape: boolean;
  activeShapeTool: ShapeType | null;  // which tool is active
  shapeCreationStart: { x: number; y: number } | null;
  shapeCreationCurrent: { x: number; y: number } | null;
}
