// src/hooks/useTextItems.ts
import { useCallback, useState } from "react";
import type { Page, TextItem, TextBox } from "../types/editor";
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
  const [selectedFont, setSelectedFont] = useState("Lato");



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

    const fontFamily = selectedFont || "Lato";                 // use selected font
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
    const request = indexedDB.open("PdfEditorDB", 5);
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
      if (!db.objectStoreNames.contains("shapes")) {
        db.createObjectStore("shapes", { keyPath: "id" });
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

  /**
   * addTextToCanvas3 - handles both text and image items
   * Accepts an array of mixed text/image items for import, or uses manual text entry.
   */
  const addTextToCanvas3 = useCallback((
    items: any[] = [],
    deps: {
      pushSnapshotToUndo: (pageIndex: number) => void;
      activePage: number;
      canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
      fontSize: number;
      setImageItems: React.Dispatch<React.SetStateAction<any[]>>;
      setPages: React.Dispatch<React.SetStateAction<any>>;
      saveImageItemsToIndexedDB?: (items: any[]) => void;
      drawCanvas?: (pageIndex: number) => void;
    }
  ) => {
    const {
      pushSnapshotToUndo,
      activePage,
      canvasRefs,
      fontSize: defaultFontSize,
      setImageItems,
      setPages,
      saveImageItemsToIndexedDB,
      drawCanvas,
    } = deps;

    const usingImport = Array.isArray(items) && items.length > 0;
    if (!usingImport && (!newText || newText.trim() === "")) return;

    // Snapshot BEFORE mutation (for undo)
    if (typeof pushSnapshotToUndo === "function") {
      pushSnapshotToUndo(activePage);
    }

    // Dimensions (used to convert norms <-> px)
    const canvas = canvasRefs?.current?.[activePage];
    const rect = canvas?.getBoundingClientRect?.() || { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    const cssW = (typeof rect.width === "number" && rect.width > 0) ? rect.width : CANVAS_WIDTH;
    const cssH = (typeof rect.height === "number" && rect.height > 0) ? rect.height : CANVAS_HEIGHT;

    const fontFamilyDefault = selectedFont || "Lato";
    const fallbackSize = Number(newFontSize) || Number(defaultFontSize) || 16;

    const newTextItems: any[] = [];
    const newImageItems: any[] = [];

    // Helpers
    const toNum = (v: any, def: number = 0): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };

    // Be very permissive when deciding if an item is an image
    const isImageLike = (o: any): boolean => {
      if (!o || typeof o !== "object") return false;
      if (o.type === "image") return true;
      // Consider as image if it has any of these signals:
      if ("widthNorm" in o || "heightNorm" in o) return true;
      if ("pixelWidth" in o || "pixelHeight" in o) return true;
      if (typeof o.ref === "string" || typeof o.data === "string" || typeof o.src === "string") return true;
      // If it has only text fields, treat as text:
      if ("text" in o && !("widthNorm" in o) && !("heightNorm" in o)) return false;
      return false;
    };

    // Normalize incoming -> newTextItems / newImageItems
    if (usingImport) {
      for (const src of items) {
        const pageIndex = (typeof src?.index === "number") ? src.index : activePage;

        if (isImageLike(src)) {
          const xNorm     = (src.xNorm     != null) ? toNum(src.xNorm)     : (src.x != null ? toNum(src.x) / cssW : 0);
          const yNormTop  = (src.yNormTop  != null) ? toNum(src.yNormTop)  : (src.y != null ? toNum(src.y) / cssH : 0);
          const widthNorm = (src.widthNorm != null) ? toNum(src.widthNorm) : (src.width  != null ? toNum(src.width)  / cssW : 0);
          const heightNorm= (src.heightNorm!= null) ? toNum(src.heightNorm): (src.height != null ? toNum(src.height) / cssH : 0);

          const x = xNorm * cssW;
          const y = yNormTop * cssH;
          const width = widthNorm * cssW;
          const height = heightNorm * cssH;

          // Prefer base64 data URI if present; keep whatever you have in .data
          const dataCandidate =
            (typeof src.ref === "string" && src.ref) ||
            (typeof src.data === "string" && src.data) ||
            (typeof src.src === "string" && src.src) ||
            null;

          newImageItems.push({
            type: "image",
            index: pageIndex,

            // normalized (persisted)
            xNorm, yNormTop, widthNorm, heightNorm,

            // concrete px (draw)
            x, y, width, height,

            // meta passthrough
            name: src.name ?? null,
            pixelWidth: Number.isFinite(src?.pixelWidth) ? Number(src.pixelWidth) : null,
            pixelHeight: Number.isFinite(src?.pixelHeight) ? Number(src.pixelHeight) : null,

            // bytes/url for draw
            data: dataCandidate,
          });
        } else {
          // TEXT
          const size = toNum(src?.fontSize, fallbackSize);

          const xNorm    = (src?.xNorm    != null) ? toNum(src.xNorm)    : (src?.x != null ? toNum(src.x) / cssW : 0);
          const yNormTop = (src?.yNormTop != null) ? toNum(src.yNormTop) : (src?.y != null ? toNum(src.y) / cssH : 0);

          const x = xNorm * cssW;
          const y = yNormTop * cssH;

          const padding = (src?.boxPadding != null)
            ? toNum(src.boxPadding)
            : Math.round(size * 0.2);

          newTextItems.push({
            type: "text",
            text: String(src?.text ?? ""),
            x, y,
            xNorm, yNormTop,
            fontSize: size,
            boxPadding: padding,
            index: pageIndex,
            anchor: "top",
            fontFamily: String(src?.fontFamily || fontFamilyDefault),
          });
        }
      }
    } else {
      // Manual add (single text)
      const size = fallbackSize;
      const padding = Math.round(size * 0.2);
      const x = 50, y = 50;

      newTextItems.push({
        type: "text",
        text: newText,
        x, y,
        xNorm: x / cssW,
        yNormTop: y / cssH,
        fontSize: size,
        boxPadding: padding,
        index: activePage,
        anchor: "top",
        fontFamily: fontFamilyDefault,
      });
    }

    // Commit to global stores first (so draw code can use them immediately)
    if (newTextItems.length) {
      setTextItems((prev) => {
        const merged = Array.isArray(prev) ? [...prev, ...newTextItems] : [...newTextItems];
        saveTextItemsToIndexedDB?.(merged);
        return merged;
      });
    }
    if (newImageItems.length) {
      setImageItems?.((prev) => {
        const merged = Array.isArray(prev) ? [...prev, ...newImageItems] : [...newImageItems];
        saveImageItemsToIndexedDB?.(merged);
        return merged;
      });
    }

    // Group by page to persist in `pages`
    const byPage = new Map<number, { textItems: any[], imageItems: any[] }>();
    for (const ti of newTextItems) {
      const entry = byPage.get(ti.index) ?? { textItems: [], imageItems: [] };
      entry.textItems.push({ ...ti });
      byPage.set(ti.index, entry);
    }
    for (const ii of newImageItems) {
      const entry = byPage.get(ii.index) ?? { textItems: [], imageItems: [] };
      entry.imageItems.push({ ...ii });
      byPage.set(ii.index, entry);
    }

    // Robust setPages: supports array or object, preserves existing items, appends both text & images.
    setPages((prev: any) => {
      let next: any = prev;

      // If pages isn't an array/object yet, initialize as array
      if (!next || (typeof next !== "object")) {
        next = [];
      }

      // Clone shallowly to avoid mutating prev
      next = Array.isArray(next) ? [...next] : { ...next };

      for (const [pIdx, group] of byPage.entries()) {
        // Read existing page slice
        const curr = Array.isArray(next)
          ? (next[pIdx] || { textItems: [], imageItems: [] })
          : (next[pIdx] || { textItems: [], imageItems: [] });

        const currText = Array.isArray(curr.textItems) ? curr.textItems : [];
        const currImgs = Array.isArray(curr.imageItems) ? curr.imageItems : [];

        const mergedPage = {
          ...curr,
          textItems: [...currText, ...group.textItems],
          imageItems: [...currImgs, ...group.imageItems],
        };

        // Write back (supports both array and object pages store)
        if (Array.isArray(next)) {
          next[pIdx] = mergedPage;             // creates sparse entries if needed
        } else {
          next[pIdx] = mergedPage;             // object keyed by index
        }
      }

      return next;
    });

    // Redraw if needed
    drawCanvas?.(activePage);

    // Reset inputs for manual add
    if (!usingImport) {
      setShowAddTextModal?.(false);
      setNewText?.("");
      setNewFontSize?.(defaultFontSize);
      setMaxWidth?.(200);
    }
  }, [newText, newFontSize, setTextItems, saveTextItemsToIndexedDB, setShowAddTextModal, setNewText, setNewFontSize, setMaxWidth]);



























  /**
   * setupCanvasA4 - Sets up canvas with proper DPR scaling
   */
  const setupCanvasA4 = useCallback((canvas: HTMLCanvasElement, portrait: boolean = true): { ctx: CanvasRenderingContext2D | null; width: number; height: number } => {
    const w = portrait ? CANVAS_WIDTH : CANVAS_HEIGHT;
    const h = portrait ? CANVAS_HEIGHT : CANVAS_WIDTH;

    const dpr = window.devicePixelRatio || 1;
    // Backing store in device pixels
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // CSS size in logical pixels (no scaling in your math)
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return { ctx: null, width: w, height: h };

    // Draw using logical units; DPR handled by transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: w, height: h };
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  /**
   * computeScaledTargetFont - Computes the scaled target font size for a textBox
   */
  const computeScaledTargetFont = useCallback((textBox: TextBox, minFont: number = 6): number => {
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    const minFontSize = Number(textBox.minFontSize ?? minFont);
    const maxFont = Number(textBox.maxFontSize ?? 80);

    // ✅ use resize-start base if available, else creation base
    const baseFont = Number(textBox.resizeBaseFontSize ?? textBox.baseFontSize ?? 20);

    const w = Math.max(1, Number(textBox.width) || 1);
    const h = Math.max(1, Number(textBox.height) || 1);

    const baseW = Math.max(1, Number(textBox.resizeBaseWidth ?? textBox.baseWidth ?? 1));
    const baseH = Math.max(1, Number(textBox.resizeBaseHeight ?? textBox.baseHeight ?? 1));

    const wScale = Math.max(0.01, w / baseW);
    const hScale = Math.max(0.01, h / baseH);

    // growth when either axis grows
    const scale = Math.max(wScale, hScale);

    return clamp(baseFont * scale, minFontSize, maxFont);
  }, []);

  /**
   * addTextToCanvas2 - Converts a textBox to text items and adds them to the canvas
   */
  const addTextToCanvas2 = useCallback((
    textBox: TextBox | null,
    deps: {
      activePage: number;
      canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
      setPages: React.Dispatch<React.SetStateAction<Page[]>>;
      APP_FONT_FAMILY: string;
      setTextBox: React.Dispatch<React.SetStateAction<TextBox | null>>;
    }
  ): void => {
    const { activePage, canvasRefs, setPages, APP_FONT_FAMILY, setTextBox } = deps;

    if (!textBox) return;

    const sourceText = (textBox.rawText ?? textBox.text ?? "").toString();
    if (!sourceText.trim()) return;

    const canvas = canvasRefs.current[activePage];
    if (!canvas) return;

    const { ctx } = setupCanvasA4(canvas, true);
    if (!ctx) return;

    const family = APP_FONT_FAMILY || "Arial";

    const requestedPadding = textBox.boxPadding ?? 10;
    const maxPadX = Math.floor((textBox.width || 0) / 2) - 1;
    const maxPadY = Math.floor((textBox.height || 0) / 2) - 1;
    const padding = Math.max(0, Math.min(requestedPadding, Math.max(0, Math.min(maxPadX, maxPadY))));

    // Use scaling target font (so commit matches editor)
    const targetFont = computeScaledTargetFont(textBox, 6);
    ctx.font = `${targetFont}px ${family}`;

    const layout = wrapTextPreservingNewlinesResponsive(
      sourceText,
      ctx,
      textBox.width,
      textBox.height,
      targetFont,
      padding,
      6,
      family,
      4
    );

    const textItemsToAdd = layout.lines.map((line, i) => ({
      text: line,
      fontSize: layout.fontSize,
      boxPadding: padding,
      x: (textBox.x || 0) + padding,
      y: (textBox.y || 0) + padding + i * layout.lineHeight,
      index: activePage,
      xNorm: ((textBox.x || 0) + padding) / CANVAS_WIDTH,
      yNormTop: ((textBox.y || 0) + padding + i * layout.lineHeight) / CANVAS_HEIGHT,
      anchor: "top",
      fontFamily: family,
      color: textColor || "#000000",
    }));

    setTextItems((prev) => {
      const prevArr = Array.isArray(prev) ? prev : [];
      const nextTextItems = [...prevArr, ...textItemsToAdd.map((it) => ({ ...it }))];

      saveTextItemsToIndexedDB?.(nextTextItems);

      setPages((prevPages) => {
        const nextPages = Array.isArray(prevPages) ? [...prevPages] : [];
        const page = nextPages[activePage] || { textItems: [], imageItems: [] };

        nextPages[activePage] = {
          ...page,
          textItems: nextTextItems.filter((it) => it.index === activePage).map((it) => ({ ...it })),
          imageItems: page.imageItems || [],
        };

        return nextPages;
      });

      return nextTextItems;
    });

    setTextBox(null);
  }, [setupCanvasA4, computeScaledTargetFont, wrapTextPreservingNewlinesResponsive, setTextItems, saveTextItemsToIndexedDB, textColor, CANVAS_WIDTH, CANVAS_HEIGHT]);

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
    selectedFont, setSelectedFont,
    saveTextItemsToIndexedDB,
    removeSelectedText,
    wrapTextPreservingNewlinesResponsive,
    wrapTextResponsive,
    resolveTextLayout,
    resolveTextLayoutForHit,
    // hydration
    hydrateFromPages,
    addTextToCanvas,
    addTextToCanvas3,
    // new functions
    setupCanvasA4,
    computeScaledTargetFont,
    addTextToCanvas2,
  };
}
