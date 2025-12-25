import { useState, useEffect } from "react";
import type { ShapeItem, ShapeType } from "../types/shapes";

export function useShapes() {
  // Core state
  const [shapeItems, setShapeItems] = useState<ShapeItem[]>([]);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [selectedShapeIndexes, setSelectedShapeIndexes] = useState<number[]>([]);

  // Interaction state
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isResizingShape, setIsResizingShape] = useState(false);
  const [isCreatingShape, setIsCreatingShape] = useState(false);
  const [activeShapeTool, setActiveShapeTool] = useState<ShapeType | null>(null);
  const [shapeCreationStart, setShapeCreationStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeCreationCurrent, setShapeCreationCurrent] = useState<{ x: number; y: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([]);

  // Drag state (moved from refs to state)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialShape, setInitialShape] = useState<ShapeItem | null>(null);

  // Multi-drag state (moved from ref to state)
  const [isDraggingMultipleShapes, setIsDraggingMultipleShapes] = useState(false);
  const [initialMultiShapes, setInitialMultiShapes] = useState<Array<{ index: number; x: number; y: number }>>([]);

  // Resize state (moved from refs to state)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

  // Add a new shape
  const addShape = (shape: ShapeItem) => {
    setShapeItems((prev) => [...prev, shape]);
  };

  // Update a shape by index
  const updateShape = (index: number, updates: Partial<ShapeItem>) => {
    setShapeItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Delete a shape
  const deleteShape = (index: number) => {
    setShapeItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedShapeIndex(null);
  };

  // Delete selected shape (single)
  const deleteSelectedShape = () => {
    if (selectedShapeIndex !== null) {
      setShapeItems((prev) => prev.filter((_, i) => i !== selectedShapeIndex));
      setSelectedShapeIndex(null);
    }
  };

  // Delete multiple selected shapes
  const deleteSelectedShapes = () => {
    if (selectedShapeIndexes.length > 0) {
      setShapeItems((prev) => prev.filter((_, i) => !selectedShapeIndexes.includes(i)));
      setSelectedShapeIndexes([]);
      setSelectedShapeIndex(null);
    }
  };

  // Ensure normalized coordinates
  const ensureNormalizedCoords = (shape: ShapeItem, canvasWidth: number, canvasHeight: number): ShapeItem => {
    if (shape.xNorm == null || shape.yNormTop == null) {
      return {
        ...shape,
        xNorm: shape.x / canvasWidth,
        yNormTop: shape.y / canvasHeight,
        widthNorm: shape.width / canvasWidth,
        heightNorm: shape.height / canvasHeight,
      };
    }
    return shape;
  };

  // Hydrate from pages (for JSON import)
  const hydrateFromPages = (pages: any[]) => {
    const allShapes: ShapeItem[] = [];
    pages.forEach((page, pageIndex) => {
      if (page.shapes && Array.isArray(page.shapes)) {
        page.shapes.forEach((shape: any) => {
          allShapes.push({
            ...shape,
            index: pageIndex,
          });
        });
      }
    });
    setShapeItems(allShapes);
  };

  // Start creating a shape
  const startCreatingShape = (x: number, y: number) => {
    setIsCreatingShape(true);
    setShapeCreationStart({ x, y });
    setShapeCreationCurrent({ x, y });

    // For freehand, initialize points array
    if (activeShapeTool === "freehand") {
      setFreehandPoints([{ x, y }]);
    }
  };

  // Update shape creation
  // shiftKey parameter enables straight line snapping for line/arrow tools
  const updateShapeCreation = (x: number, y: number, shiftKey: boolean = false) => {
    let finalX = x;
    let finalY = y;

    // For line/arrow with Shift key, snap to horizontal or vertical
    if ((activeShapeTool === "line" || activeShapeTool === "arrow") && shiftKey && shapeCreationStart) {
      const dx = Math.abs(x - shapeCreationStart.x);
      const dy = Math.abs(y - shapeCreationStart.y);

      if (dx > dy) {
        // Snap to horizontal line
        finalY = shapeCreationStart.y;
      } else {
        // Snap to vertical line
        finalX = shapeCreationStart.x;
      }
    }

    setShapeCreationCurrent({ x: finalX, y: finalY });

    // For freehand, add point to the path (with distance threshold to avoid too many points)
    if (activeShapeTool === "freehand") {
      setFreehandPoints((prev) => {
        if (prev.length === 0) {
          return [{ x: finalX, y: finalY }];
        }

        // Only add point if it's far enough from the last point (minimum 2px distance)
        const lastPoint = prev[prev.length - 1];
        const pdx = finalX - lastPoint.x;
        const pdy = finalY - lastPoint.y;
        const distance = Math.sqrt(pdx * pdx + pdy * pdy);

        if (distance >= 2) {
          return [...prev, { x: finalX, y: finalY }];
        }

        return prev;
      });
    }
  };

  // Finish creating shape
  const finishCreatingShape = (
    pageIndex: number,
    canvasWidth: number,
    canvasHeight: number,
    strokeColor: string = "#000000",
    strokeWidth: number = 2,
    fillColor: string | null = null
  ) => {
    if (!shapeCreationStart || !shapeCreationCurrent || !activeShapeTool) {
      setIsCreatingShape(false);
      setShapeCreationStart(null);
      setShapeCreationCurrent(null);
      setFreehandPoints([]);
      return null;
    }

    // Handle freehand shape
    if (activeShapeTool === "freehand") {
      // Minimum points check
      if (freehandPoints.length < 2) {
        setIsCreatingShape(false);
        setShapeCreationStart(null);
        setShapeCreationCurrent(null);
        setFreehandPoints([]);
        return null;
      }

      // Calculate bounding box from points
      const xs = freehandPoints.map(p => p.x);
      const ys = freehandPoints.map(p => p.y);
      const x1 = Math.min(...xs);
      const y1 = Math.min(...ys);
      const x2 = Math.max(...xs);
      const y2 = Math.max(...ys);

      const width = x2 - x1;
      const height = y2 - y1;

      // Normalize points (0-1 relative to canvas)
      const normalizedPoints = freehandPoints.map(p => ({
        x: p.x / canvasWidth,
        y: p.y / canvasHeight,
      }));

      const newShape: ShapeItem = {
        type: "freehand",
        x: x1,
        y: y1,
        width,
        height,
        xNorm: x1 / canvasWidth,
        yNormTop: y1 / canvasHeight,
        widthNorm: width / canvasWidth,
        heightNorm: height / canvasHeight,
        points: normalizedPoints,
        strokeColor,
        strokeWidth,
        fillColor,
        index: pageIndex,
      };

      setShapeItems((prev) => [...prev, newShape]);
      setIsCreatingShape(false);
      setShapeCreationStart(null);
      setShapeCreationCurrent(null);
      setFreehandPoints([]);
      setActiveShapeTool(null);

      return newShape;
    }

    // Handle regular shapes
    const x1 = Math.min(shapeCreationStart.x, shapeCreationCurrent.x);
    const y1 = Math.min(shapeCreationStart.y, shapeCreationCurrent.y);
    const x2 = Math.max(shapeCreationStart.x, shapeCreationCurrent.x);
    const y2 = Math.max(shapeCreationStart.y, shapeCreationCurrent.y);

    const width = x2 - x1;
    const height = y2 - y1;

    // Minimum size check
    // For lines/arrows: need at least 10px in one dimension (allows straight horizontal/vertical lines)
    // For other shapes: need at least 10px in both dimensions
    const isLineOrArrow = activeShapeTool === "line" || activeShapeTool === "arrow";
    const lineLength = Math.sqrt(
      Math.pow(shapeCreationCurrent.x - shapeCreationStart.x, 2) +
      Math.pow(shapeCreationCurrent.y - shapeCreationStart.y, 2)
    );

    if (isLineOrArrow) {
      // Lines need minimum length of 10px (diagonal distance)
      if (lineLength < 10) {
        setIsCreatingShape(false);
        setShapeCreationStart(null);
        setShapeCreationCurrent(null);
        setFreehandPoints([]);
        return null;
      }
    } else {
      // Other shapes need minimum 10px in both dimensions
      if (width < 10 || height < 10) {
        setIsCreatingShape(false);
        setShapeCreationStart(null);
        setShapeCreationCurrent(null);
        setFreehandPoints([]);
        return null;
      }
    }

    const newShape: ShapeItem = {
      type: activeShapeTool,
      x: x1,
      y: y1,
      width,
      height,
      xNorm: x1 / canvasWidth,
      yNormTop: y1 / canvasHeight,
      widthNorm: width / canvasWidth,
      heightNorm: height / canvasHeight,
      strokeColor,
      strokeWidth,
      fillColor,
      index: pageIndex,
    };

    setShapeItems((prev) => [...prev, newShape]);
    setIsCreatingShape(false);
    setShapeCreationStart(null);
    setShapeCreationCurrent(null);
    setFreehandPoints([]);
    setActiveShapeTool(null);

    return newShape;
  };

  // Cancel shape creation
  const cancelShapeCreation = () => {
    setIsCreatingShape(false);
    setShapeCreationStart(null);
    setShapeCreationCurrent(null);
    setFreehandPoints([]);
    setActiveShapeTool(null);
  };

  // Z-index actions for layering
  // Bring shape one layer forward (increment z-index)
  const bringShapeForward = (index: number) => {
    setShapeItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const currentZ = item.zIndex ?? 0;
      return prev.map((s, i) => i === index ? { ...s, zIndex: currentZ + 1 } : s);
    });
  };

  // Send shape one layer backward (decrement z-index)
  const sendShapeBackward = (index: number) => {
    setShapeItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const currentZ = item.zIndex ?? 0;
      return prev.map((s, i) => i === index ? { ...s, zIndex: currentZ - 1 } : s);
    });
  };

  // Bring shape to front (set z-index to max + 1)
  const bringShapeToFront = (index: number) => {
    setShapeItems((prev) => {
      const maxZ = Math.max(...prev.map(s => s.zIndex ?? 0), 0);
      return prev.map((s, i) => i === index ? { ...s, zIndex: maxZ + 1 } : s);
    });
  };

  // Send shape to back (set z-index to min - 1)
  const sendShapeToBack = (index: number) => {
    setShapeItems((prev) => {
      const minZ = Math.min(...prev.map(s => s.zIndex ?? 0), 0);
      return prev.map((s, i) => i === index ? { ...s, zIndex: minZ - 1 } : s);
    });
  };

  return {
    // State
    shapeItems,
    setShapeItems,
    selectedShapeIndex,
    setSelectedShapeIndex,
    selectedShapeIndexes,
    setSelectedShapeIndexes,
    isDraggingShape,
    setIsDraggingShape,
    isDraggingMultipleShapes,
    setIsDraggingMultipleShapes,
    isResizingShape,
    setIsResizingShape,
    isCreatingShape,
    activeShapeTool,
    setActiveShapeTool,
    shapeCreationStart,
    shapeCreationCurrent,
    freehandPoints,

    // Drag state (now all state, no refs)
    dragStart,
    setDragStart,
    initialShape,
    setInitialShape,
    initialMultiShapes,
    setInitialMultiShapes,
    resizeStart,
    setResizeStart,
    resizeHandle,
    setResizeHandle,
    initialSize,
    setInitialSize,

    // Actions
    addShape,
    updateShape,
    deleteShape,
    deleteSelectedShape,
    deleteSelectedShapes,
    ensureNormalizedCoords,
    hydrateFromPages,

    // Creation
    startCreatingShape,
    updateShapeCreation,
    finishCreatingShape,
    cancelShapeCreation,

    // Z-index layering
    bringShapeForward,
    sendShapeBackward,
    bringShapeToFront,
    sendShapeToBack,
  };
}
