import { useState } from "react";
import type { Point } from "../types/editor";

export function useSelection() {
  const [showGrid, setShowGrid] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState<Point>({ x: 0, y: 0 });
  const [initialPositions, setInitialPositions] = useState<Point[]>([]);
  const [shouldClearSelectionBox, setShouldClearSelectionBox] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);

  return {
    showGrid, setShowGrid,
    isSelecting, setIsSelecting,
    selectionStart, setSelectionStart,
    selectionEnd, setSelectionEnd,
    initialPositions, setInitialPositions,
    shouldClearSelectionBox, setShouldClearSelectionBox,
    isDragging, setIsDragging,
    dragStart, setDragStart,
    isResizing, setIsResizing,
  };
}