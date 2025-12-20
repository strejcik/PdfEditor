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
  const updateShapeCreation = (x: number, y: number) => {
    setShapeCreationCurrent({ x, y });

    // For freehand, add point to the path (with distance threshold to avoid too many points)
    if (activeShapeTool === "freehand") {
      setFreehandPoints((prev) => {
        if (prev.length === 0) {
          return [{ x, y }];
        }

        // Only add point if it's far enough from the last point (minimum 2px distance)
        const lastPoint = prev[prev.length - 1];
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= 2) {
          return [...prev, { x, y }];
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

    // Minimum size check (10px)
    if (width < 10 || height < 10) {
      setIsCreatingShape(false);
      setShapeCreationStart(null);
      setShapeCreationCurrent(null);
      setFreehandPoints([]);
      return null;
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
  };
}
