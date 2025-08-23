// src/hooks/useTextItems.ts
import { useCallback, useState } from "react";
import type { Page, TextItem } from "../types/editor";
import { DEFAULT_FONT_SIZE, CANVAS_WIDTH as CW_CONST, CANVAS_HEIGHT as CH_CONST } from "../config/constants";

/**
 * Ensure each TextItem carries normalized coordinates (xNorm/yNormTop).
 * - If xNorm/yNormTop are missing but pixel x/y exist, compute them.
 * - If both are present, leave as-is.
 */
function ensureNormalizedCoords<T extends Partial<TextItem>>(it: T, CW: number, CH: number): T {
  const out: any = { ...it };

  const hasXNorm = out.xNorm != null;
  const hasYNorm = out.yNormTop != null;
  const hasXPix  = Number.isFinite(out.x);
  const hasYPix  = Number.isFinite(out.y);

  // Fill normalized from pixels (top-anchored), allow negatives / >1
  if (!hasXNorm && hasXPix && CW > 0) out.xNorm = out.x / CW;
  if (!hasYNorm && hasYPix && CH > 0) out.yNormTop = out.y / CH;

  // Also fill pixels from normalized if missing
  if (!hasXPix && hasXNorm && CW > 0) out.x = out.xNorm * CW;
  if (!hasYPix && hasYNorm && CH > 0) out.y = out.yNormTop * CH;

  // ❌ No clamping, no rounding
  return out as T;
}

export function useTextItems() {
  const CANVAS_WIDTH  = typeof CW_CONST === "number" && CW_CONST > 0 ? CW_CONST : 595; // A4 @ 72 dpi
  const CANVAS_HEIGHT = typeof CH_CONST === "number" && CH_CONST > 0 ? CH_CONST : 842;

  // Core item state
  const [textItemsState, _setTextItems] = useState<TextItem[]>([]);

  // UI/editor state you already had
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [selectedTextIndexes, setSelectedTextIndexes] = useState<number[]>([]);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [newText, setNewText] = useState("");
  const [maxWidth, setMaxWidth] = useState(200);

  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingFontSize, setEditingFontSize] = useState(DEFAULT_FONT_SIZE);
  const [newFontSize, setNewFontSize] = useState(DEFAULT_FONT_SIZE);

  /**
   * Wrapped setter that ALWAYS ensures normalized coords exist.
   * Accepts either an array or a functional updater (same as React setState).
   */
  const setTextItems = useCallback(
    (update: TextItem[] | ((prev: TextItem[]) => TextItem[])) => {
      _setTextItems(prevRaw => {
        const nextRaw = typeof update === "function" ? (update as any)(prevRaw) : update;
        // Ensure every item keeps/gets normalized fields
        const normalized = (nextRaw || []).map(it => ensureNormalizedCoords(it, CANVAS_WIDTH, CANVAS_HEIGHT));
        return normalized as TextItem[];
      });
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT]
  );

  /**
   * Hydrate from pages[] (e.g., on app load or after rehydrating storage).
   * - Preserves ALL fields on each item (no shape loss).
   * - Adds/repairs xNorm/yNormTop as needed.
   * - Tags each item with its page index.
   */
  const hydrateFromPages = useCallback((pages: Page[]) => {
    const merged: TextItem[] = (pages || []).flatMap((p, i) =>
      (p?.textItems ?? []).map((t: any) => {
        const withIndex = { ...t, index: i };
        return ensureNormalizedCoords(withIndex, CANVAS_WIDTH, CANVAS_HEIGHT);
      })
    );
    _setTextItems(merged);
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  return {
    // items
    textItems: textItemsState,
    setTextItems,

    // selection/editing UI state
    isTextSelected, setIsTextSelected,
    selectedTextIndex, setSelectedTextIndex,
    selectedTextIndexes, setSelectedTextIndexes,
    showAddTextModal, setShowAddTextModal,
    newText, setNewText,
    maxWidth, setMaxWidth,
    isEditing, setIsEditing,
    editingText, setEditingText,
    editingIndex, setEditingIndex,
    editingFontSize, setEditingFontSize,
    newFontSize, setNewFontSize,

    // hydration
    hydrateFromPages,
  };
}
