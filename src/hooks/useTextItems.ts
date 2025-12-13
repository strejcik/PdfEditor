// src/hooks/useTextItems.ts
import { useCallback, useState } from "react";
import type { Page, TextItem } from "../types/editor";
import { DEFAULT_FONT_SIZE, CANVAS_WIDTH as CW_CONST, CANVAS_HEIGHT as CH_CONST } from "../config/constants";
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

  const [textColor, setTextColor] = useState("black");



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


  // Function to handle adding new text to the canvas
  const addTextToCanvas = ((opts: any) => {
    const {
      canvasRefs, activePage, setupCanvasA4, 
      wrapText, resolveTopLeft, PDF_WIDTH, PDF_HEIGHT,
      pushSnapshotToUndo, textItems, setPages, fontSize,
    } = opts;
    if (!newText || newText.trim() === "") return;
  
    const canvas = canvasRefs.current[activePage];
    if (!canvas) return;
  
    const { ctx } = setupCanvasA4(canvasRefs.current[activePage], /* portrait? */ true);
    if (!ctx) return;
  
    const fontFamily = "Lato";                 // match what you export with pdf-lib
    const fontSizeToUse = Number(newFontSize);
    const padding = Math.round(fontSizeToUse * 0.2);
  
    // Prepare font for measuring/wrapping
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${fontSizeToUse}px ${fontFamily}`;
  
    // Choose an effective maxWidth:
    // if user provided a sensible one, use it; otherwise pick a safe default
    const measuredWidth = ctx.measureText(newText).width;
    const safeDefaultMax = Math.max(measuredWidth + 20, fontSizeToUse * 2);
    const effectiveMaxWidth =
      (typeof maxWidth === "number" && maxWidth > fontSizeToUse) ? maxWidth : safeDefaultMax;
  
    // Wrap into CANVAS coordinates (no PDF conversion here)
    const lines = wrapText(newText, ctx, {
      x: 50,                 // starting X (adjust as you like)
      y: 50,                 // starting Y (adjust as you like)
      maxWidth: effectiveMaxWidth,
      fontSize: fontSizeToUse,
      fontFamily,
      lineGap: 0,
    });
  
    // Build items (top-anchored). We store 'anchor: "top"' for clarity/compat.
    const itemsToAdd = lines.map((ln:any) => {
        const { xNorm, yNormTop } = resolveTopLeft(ln.text, PDF_WIDTH, PDF_HEIGHT);
      return {
        text: ln.text,
        fontSize: newFontSize,
        boxPadding: padding,
        x: ln.x,
        y: ln.y,
        index: activePage,
        xNorm: +xNorm.toFixed(6),
        yNormTop: +yNormTop.toFixed(6),
        fontFamily,
        color: textColor,
      }
    });
  
  
    // Snapshot BEFORE state change for undo
    pushSnapshotToUndo(activePage);
  
  // In your handler where you append itemsToAdd
  const nextTextItems = [ ...(textItems || []), ...itemsToAdd.map((it:any) => ({ ...it })) ];
  setTextItems(nextTextItems);
  
  // Use the SAME computed array right away:
  saveTextItemsToIndexedDB?.(nextTextItems);
  
  setPages((prev:any) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const page = next[activePage] || { textItems: [], imageItems: [] };
  
    // Only items for this page
    const forThisPage = nextTextItems.filter(it => it.index === activePage);
  
    next[activePage] = {
      ...page,
      textItems: forThisPage.map(it => ({ ...it })), // keep immutable
      imageItems: page.imageItems || [],
    };
    return next;
  });
  
    // (If you don't have the effect-driven redraw yet, you can force it)
    // drawCanvas(activePage);
  
    // Reset modal state
    setShowAddTextModal(false);
    setNewText("");
    setNewFontSize(fontSize);
    setMaxWidth(200);
  });



const openTextItemsDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PdfEditorDB", 3);
    request.onupgradeneeded = (event:any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("textItems")) {
        db.createObjectStore("textItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("imageItems")) {
        db.createObjectStore("imageItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pages")) {
        db.createObjectStore("pages", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


/** Replaces localStorage.setItem("textItems", JSON.stringify(items)) */
const saveTextItemsToIndexedDB = useCallback(async (items:any) => {
  if (!window.indexedDB) {
    console.error("IndexedDB not supported in this browser.");
    return;
  }

  try {
    const db:any = await openTextItemsDB();
    const tx = db.transaction("textItems", "readwrite");
    const store = tx.objectStore("textItems");

    // We always use a single entry (like localStorage), with key "main"
    store.put({ id: "main", data: items });

    await new Promise((resolve:any, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (err) {
    console.error("Failed to save textItems to IndexedDB", err);
  }
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
    saveTextItemsToIndexedDB(updatedItems);

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
    saveTextItemsToIndexedDB(updatedItems);

    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
}, [selectedTextIndexes]);




























const clampPadding = (boxWidth:any, boxHeight:any, requestedPadding:any) => {
  const w = Math.max(1, boxWidth);
  const h = Math.max(1, boxHeight);
  const maxPadX = Math.floor(w / 2) - 1;
  const maxPadY = Math.floor(h / 2) - 1;
  const maxPad = Math.max(0, Math.min(maxPadX, maxPadY));
  return Math.max(0, Math.min(requestedPadding, maxPad));
};




type Canvas2DContext = CanvasRenderingContext2D;

type WrapResult = {
  lines: string[];
  fontSize: number;  // final font size used
  lineHeight: number;
  fits: boolean;
  padding: number;
};

const wrapTextPreservingNewlinesResponsive = (
  text: string,
  ctx: Canvas2DContext,
  boxWidth: number,
  boxHeight: number,
  maxFontSize: number,          // << we treat this as "target scaled size"
  padding: number = 10,
  minFontSize: number = 6,      // << minimum allowed scale
  fontFamily?: string,
  lineGap: number = 4
): WrapResult => {
  const raw = String(text ?? "");

  const safeW = Math.max(1, boxWidth);
  const safeH = Math.max(1, boxHeight);

  const safePadding = clampPadding(safeW, safeH, padding);

  const innerW = Math.max(1, safeW - safePadding * 2);
  const innerH = Math.max(1, safeH - safePadding * 2);

  const family =
    fontFamily ||
    (() => {
      const parts = (ctx.font || "").split(" ");
      return parts.length >= 2 ? parts.slice(1).join(" ") : "Arial";
    })();

  const setFont = (size:any) => {
    ctx.font = `${Math.max(1, size)}px ${family}`;
  };

  const breakWordToFit = (word:any) => {
    const out = [];
    let chunk = "";

    for (let i = 0; i < word.length; i++) {
      const test = chunk + word[i];
      if (ctx.measureText(test).width <= innerW) {
        chunk = test;
      } else {
        if (chunk) out.push(chunk);
        chunk = word[i];
      }
    }
    if (chunk) out.push(chunk);
    if (out.length === 0 && word.length > 0) out.push(word[0]);
    return out;
  };

  const wrapAtCurrentFont = () => {
    const paragraphs = raw.split(/\r?\n/);
    const lines = [];
    let maxLineW = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        lines.push("");
        continue;
      }

      // Preserve whitespace tokens exactly
      const tokens = paragraph.split(/(\s+)/).filter((t) => t.length > 0);
      let current = "";

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const isSpace = /^\s+$/.test(tok);

        // Notepad-like: don't start a wrapped line with whitespace
        if (current === "" && isSpace) continue;

        // Hard-break long token
        if (!isSpace && ctx.measureText(tok).width > innerW) {
          if (current) {
            lines.push(current);
            maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
            current = "";
          }
          const pieces = breakWordToFit(tok);
          for (const p of pieces) {
            lines.push(p);
            maxLineW = Math.max(maxLineW, ctx.measureText(p).width);
          }
          continue;
        }

        const test = current + tok;

        if (ctx.measureText(test).width <= innerW) {
          current = test;
        } else {
          if (current) {
            lines.push(current);
            maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
          }
          current = isSpace ? "" : tok;
        }
      }

      if (current) {
        lines.push(current);
        maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
      }
    }

    const m = /^(\d+(?:\.\d+)?)px\b/.exec(ctx.font);
    const fontPx = m ? parseFloat(m[1]) : 1;
    const lineHeight = fontPx + lineGap;
    const totalH = lines.length * lineHeight;

    return { lines, maxLineW, totalH, lineHeight };
  };

  const lo0 = Math.max(1, Math.floor(minFontSize));
  const hi0 = Math.max(lo0, Math.floor(maxFontSize));

  let lo = lo0;
  let hi = hi0;

  let bestFont = lo0;
  let bestLines = [""];
  let bestLineHeight = lo0 + lineGap;
  let bestFits = false;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    setFont(mid);

    const { lines, maxLineW, totalH, lineHeight } = wrapAtCurrentFont();

    const fitsW = maxLineW <= innerW + 0.001;
    const fitsH = totalH <= innerH + 0.001;

    if (fitsW && fitsH) {
      bestFont = mid;
      bestLines = lines;
      bestLineHeight = lineHeight;
      bestFits = true;
      lo = mid + 1; // try bigger
    } else {
      hi = mid - 1;
    }
  }

  setFont(bestFont);

  return {
    lines: bestLines,
    fontSize: bestFont,
    lineHeight: bestLineHeight,
    fits: bestFits,
    padding: safePadding, // convenient to reuse
  };
};

















































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






































































// Wraps text so EVERY returned line fits within maxWidth (guaranteed).
// - Preserves explicit '\n' (empty lines kept)
// - Preserves whitespace between words (does NOT collapse spaces)
// - Word-wraps
// - Force-breaks a single too-long token by characters (URLs/long words) so containment is always possible
/**
 * wrapTextResponsive – “Notepad-like” behavior
 *
 * What “Notepad-like” means here:
 * - Preserves ALL characters exactly (spaces, multiple spaces, tabs)
 * - Explicit '\n' creates a new visual line (including blank lines)
 * - Soft wrapping happens ONLY when a line exceeds maxWidth
 * - Soft wrap does NOT insert extra spaces / does NOT trim
 * - Soft wrap prefers breaking at whitespace if possible (like Notepad)
 * - If there is no whitespace to break (long word/URL), it breaks by characters
 * - Wrapped lines never exceed maxWidth (guaranteed)
 */
const wrapTextResponsive = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D) => {
  const safeMaxWidth = Math.max(1, maxWidth);
  const raw = String(text ?? "");
  const hardLines = raw.split("\n"); // explicit newlines

  const out: string[] = [];

  // Break a string by characters into chunks that each fit maxWidth
  const breakByChars = (s: string) => {
    const units = Array.from(s);
    let chunk = "";
    for (let i = 0; i < units.length; i++) {
      const test = chunk + units[i];
      if (ctx.measureText(test).width <= safeMaxWidth) {
        chunk = test;
      } else {
        if (chunk) out.push(chunk);
        chunk = units[i];
      }
    }
    if (chunk) out.push(chunk);
  };

  // Wrap ONE hard line into one or more soft lines
  const wrapHardLine = (line: string) => {
    // Preserve completely empty line
    if (line.length === 0) {
      out.push("");
      return;
    }

    // If it already fits, keep it exactly
    if (ctx.measureText(line).width <= safeMaxWidth) {
      out.push(line);
      return;
    }

    // Notepad-like: accumulate chars, but when overflow happens,
    // try to break at the last whitespace in the current chunk.
    const units = Array.from(line);

    let chunk = "";
    let lastBreakPosInChunk = -1; // index in chunk-units where whitespace last seen
    let chunkUnits: string[] = [];

    const isWs = (ch: string) => ch === " " || ch === "\t";

    const flushChunk = (s: string) => {
      // Keep as-is (including leading/trailing spaces)
      out.push(s);
    };

    for (let i = 0; i < units.length; i++) {
      const ch = units[i];
      const nextChunk = chunk + ch;

      if (ctx.measureText(nextChunk).width <= safeMaxWidth) {
        chunk = nextChunk;
        chunkUnits.push(ch);
        if (isWs(ch)) lastBreakPosInChunk = chunkUnits.length - 1;
        continue;
      }

      // Overflow: decide where to break
      if (chunk.length === 0) {
        // Even single char doesn't fit? push it anyway to avoid infinite loop
        flushChunk(ch);
        chunk = "";
        chunkUnits = [];
        lastBreakPosInChunk = -1;
        continue;
      }

      if (lastBreakPosInChunk >= 0) {
        // Break at last whitespace IN the chunk (Notepad-ish)
        const left = chunkUnits.slice(0, lastBreakPosInChunk + 1).join("");
        const right = chunkUnits.slice(lastBreakPosInChunk + 1).join("");

        flushChunk(left);

        // Start new chunk with the "right" remainder (kept exactly), then retry current char
        chunk = right;
        chunkUnits = Array.from(right);
        lastBreakPosInChunk = -1;
        for (let k = 0; k < chunkUnits.length; k++) {
          if (isWs(chunkUnits[k])) lastBreakPosInChunk = k;
        }

        // retry current char (don’t lose it)
        i -= 1;
      } else {
        // No whitespace in chunk -> hard break by characters
        flushChunk(chunk);
        chunk = "";
        chunkUnits = [];
        lastBreakPosInChunk = -1;

        // retry current char
        i -= 1;
      }
    }

    if (chunk.length > 0) flushChunk(chunk);
  };

  for (const line of hardLines) {
    wrapHardLine(line);
  }

  return out;
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
    textColor, setTextColor,
    saveTextItemsToIndexedDB,
    removeSelectedText,
    wrapTextPreservingNewlinesResponsive,
    wrapTextResponsive,
    resolveTextLayout,
    resolveTextLayoutForHit,
    // hydration
    hydrateFromPages,
    addTextToCanvas
  };
}
