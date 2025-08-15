import { useCallback, useState } from "react";
import type { Page, TextItem } from "../types/editor";
import { DEFAULT_FONT_SIZE } from "../config/constants";

export function useTextItems() {
  const [textItems, setTextItems] = useState<TextItem[]>([]);
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

  // pull items out of pages[] and tag each with its page index
  const hydrateFromPages = useCallback((pages: Page[]) => {
    const merged = pages.flatMap((p, i) =>
      (p?.textItems ?? []).map((t: any) => ({ ...t, index: i }))
    );
    setTextItems(merged);
  }, []);

  return {
    textItems, setTextItems,
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
    hydrateFromPages,
  };
}