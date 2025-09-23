// src/hooks/useTextItems.ts
import { useCallback, useState } from "react";
import type { Page, TextItem } from "../types/editor";
import { DEFAULT_FONT_SIZE, CANVAS_WIDTH as CW_CONST, CANVAS_HEIGHT as CH_CONST } from "../config/constants";
import {usePages} from '../hooks/usePages'
import { Canvas2DContext, WrapResult} from '../types/text'
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
  const pages = usePages();
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
        const normalized = (nextRaw || []).map((it:any) => ensureNormalizedCoords(it, CANVAS_WIDTH, CANVAS_HEIGHT));
        return normalized as TextItem[];
      });
    },
    [CANVAS_WIDTH, CANVAS_HEIGHT]
  );

const saveTextItemsToLocalStorage = useCallback((items: any) => {
  localStorage.setItem("textItems", JSON.stringify(items));
}, []);


// Function to remove selected text
const removeSelectedText  = useCallback((opts: any) => {
  const {updatePageItems, activePage} = opts;
  let updatedItems = [...textItemsState];
  // === Remove Multiple Selected Texts ===
  if (selectedTextIndexes.length > 0) {
    // Filter out all selected indexes
    updatedItems = updatedItems.filter((_, i) => !selectedTextIndexes.includes(i));

    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    // Update only visible page's text items
    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    // Clear selection
    setSelectedTextIndexes([]);
    setIsTextSelected(false);
    setSelectedTextIndex(null);
    return; // prevent running single delete block
  }
   // === Remove Single Selected Text ===
  if (selectedTextIndex !== null) {
    updatedItems = updatedItems.filter((_, i) => i !== selectedTextIndex);

    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
}, [selectedTextIndexes]);


/**
 * Wrap text to a given width while preserving explicit newlines.
 * Returns lines plus the resulting box width/height (with padding).
 */
const wrapTextPreservingNewlinesResponsive = (
  text: string,
  ctx: Canvas2DContext,
  initialWidth: number,
  fontSize: number,
  padding: number = 10
): WrapResult => {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  let maxLineWidth = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth + padding * 2 > initialWidth && currentLine) {
        lines.push(currentLine);
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
        currentLine = word;
      } else {
        currentLine = testLine;
      }

      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
        maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
      }
    });
  }

  const lineHeight = fontSize + 4;
  const totalHeight = lines.length * lineHeight;

  return {
    lines,
    width: maxLineWidth + padding * 2,
    height: totalHeight + padding * 2,
  };
}


function resolveTextLayoutForHit(item:any, ctx:any, canvas:any) {
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = rect.height;

  const fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? Number(item.boxPadding) : Math.round(fontSize * 0.2);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const m = ctx.measureText(item.text || "");
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : fontSize * 0.83;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : fontSize * 0.20;
  const textWidth  = m.width;
  const textHeight = ascent + descent;
  ctx.restore();

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);

  // ❌ no clamping — allow negative / > canvas values
  const x = hasNorm
    ? Number(item.xNorm) * cssW
    : (Number(item.x) || 0);

  let topY;
  if (hasNorm) {
    // ❌ no clamping
    topY = Number(item.yNormTop) * cssH;
  } else {
    // Legacy pixel mode: convert baseline/bottom to top
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "baseline"; // keep legacy default
    if (anchor === "baseline")      topY = rawY - ascent;
    else if (anchor === "bottom")   topY = rawY - textHeight;
    else                            topY = rawY; // already top
  }

  return {
    x,
    topY,
    fontSize,
    fontFamily,
    padding,
    textWidth,
    textHeight,
    ascent,
    descent,
    box: {
      x: x - padding,
      y: topY - padding,
      w: textWidth + padding * 2,
      h: textHeight + padding * 2,
    },
  };
}

const wrapTextResponsive = (text:string, maxWidth:number, ctx: CanvasRenderingContext2D) => {
  const paragraphs = text.split('\n');
  const lines:any = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/);
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }

      // Push remaining line after the last word
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
    });
  });

  return lines;
};



const resolveTextLayout = (item:any, ctx:CanvasRenderingContext2D, rect:any) => {
  const fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const m = ctx.measureText(item.text || "");
  const ascent  = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const textWidth  = m.width;
  const textHeight = ascent + descent;

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);
  const x = hasNorm ? Number(item.xNorm) * rect.width : (Number(item.x) || 0);

  let topY;
  if (hasNorm) {
    topY = Number(item.yNormTop) * rect.height;
  } else {
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "baseline";
    if (anchor === "baseline")      topY = rawY - ascent;
    else if (anchor === "bottom")   topY = rawY - textHeight;
    else                            topY = rawY; // already top
  }

  return {
    x,
    topY,
    fontSize,
    fontFamily,
    padding,
    textWidth,
    textHeight,
    ascent,
    descent,
  };
}

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
    saveTextItemsToLocalStorage,
    removeSelectedText,
    wrapTextPreservingNewlinesResponsive,
    wrapTextResponsive,
    resolveTextLayout,
    resolveTextLayoutForHit,
    // hydration
    hydrateFromPages,
  };
}
