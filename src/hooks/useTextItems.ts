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

// Constants - computed once, not on every render
const CANVAS_WIDTH  = typeof CW_CONST === "number" && CW_CONST > 0 ? CW_CONST : 595; // A4 @ 72 dpi
const CANVAS_HEIGHT = typeof CH_CONST === "number" && CH_CONST > 0 ? CH_CONST : 842;

export function useTextItems() {
  
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
  const [editingColor, setEditingColor] = useState("black");
  const [editingFont, setEditingFont] = useState("Lato");
  const [newFontSize, setNewFontSize] = useState(DEFAULT_FONT_SIZE);

  const [textColor, setTextColor] = useState("black");
  const [selectedFont, setSelectedFont] = useState("Lato");



  /**
   * Wrapped setter that ALWAYS ensures normalized coords exist.
   * Accepts either an array or a functional updater (same as React setState).
   * Note: CANVAS_WIDTH/CANVAS_HEIGHT are module-level constants, so this callback is stable.
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
    [] // CANVAS_WIDTH/CANVAS_HEIGHT are module-level constants
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
    // Measure text dimensions for accurate annotation positioning
    const itemsToAdd = lines.map((ln:any) => {
        const { xNorm, yNormTop } = resolveTopLeft(ln.text, PDF_WIDTH, PDF_HEIGHT);

        // Measure actual text dimensions using canvas
        // Use actual visual bounding box for accurate measurements (handles "j", "g", etc.)
        ctx.font = `${fontSizeToUse}px ${fontFamily}`;
        const metrics = ctx.measureText(ln.text || "");
        const ascent = metrics.actualBoundingBoxAscent || (fontSizeToUse * 0.8);
        const descent = metrics.actualBoundingBoxDescent || (fontSizeToUse * 0.2);
        const bboxLeft = metrics.actualBoundingBoxLeft || 0;
        const bboxRight = metrics.actualBoundingBoxRight || metrics.width;
        const textWidth = bboxLeft + bboxRight;
        const textHeight = ascent + descent;

        // Compute normalized dimensions and font metrics
        const rect = canvas.getBoundingClientRect();
        const widthNorm = textWidth / rect.width;
        const heightNorm = textHeight / rect.height;
        const ascentRatio = textHeight > 0 ? ascent / textHeight : 0.8;
        const descentRatio = textHeight > 0 ? descent / textHeight : 0.2;

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
        // Bounding box dimensions for annotation positioning
        widthNorm: +widthNorm.toFixed(6),
        heightNorm: +heightNorm.toFixed(6),
        ascentRatio: +ascentRatio.toFixed(4),
        descentRatio: +descentRatio.toFixed(4),
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
    const request = indexedDB.open("PdfEditorDB", 8);
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
      if (!db.objectStoreNames.contains("formFields")) {
        db.createObjectStore("formFields", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("credentials")) {
        db.createObjectStore("credentials", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


/** Save textItems to IndexedDB */
const saveTextItemsToIndexedDB = useCallback(async (items:any) => {
  if (!window.indexedDB) {
    console.error("IndexedDB not supported in this browser.");
    return;
  }

  try {
    const db:any = await openTextItemsDB();
    const tx = db.transaction("textItems", "readwrite");
    const store = tx.objectStore("textItems");

    // Store all items under a single "main" key
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


// Function to remove selected text (respects locked property)
const removeSelectedText  = useCallback((opts: any) => {
  const {updatePageItems, activePage} = opts;
  let updatedItems = [...textItemsState];
  // === Remove Multiple Selected Texts ===
  if (selectedTextIndexes.length > 0) {
    // Filter out selected indexes, but keep locked items
    updatedItems = updatedItems.filter((item, i) => !selectedTextIndexes.includes(i) || item.locked);

    setTextItems(updatedItems);
    saveTextItemsToIndexedDB(updatedItems);

    // Update only visible page's text items
    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    // Keep locked items in selection
    const remainingSelected = selectedTextIndexes.filter(i => textItemsState[i]?.locked);
    setSelectedTextIndexes(remainingSelected);
    if (remainingSelected.length === 0) {
      setIsTextSelected(false);
      setSelectedTextIndex(null);
    }
    return; // prevent running single delete block
  }
   // === Remove Single Selected Text ===
  if (selectedTextIndex !== null) {
    // Don't delete if text item is locked
    if (textItemsState[selectedTextIndex]?.locked) return;

    updatedItems = updatedItems.filter((_, i) => i !== selectedTextIndex);

    setTextItems(updatedItems);
    saveTextItemsToIndexedDB(updatedItems);

    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
}, [selectedTextIndexes, textItemsState]);




























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

  let fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? Number(item.boxPadding) : Math.round(fontSize * 0.2);

  // Check if this is PDF-extracted text with bounds/baseline
  const hasPdfBounds = (item.widthNorm != null) && (item.heightNorm != null);
  const hasPdfBaseline = item.yNormBaseline != null;
  const textContent = item.text || "";

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // For PDF-extracted text: scale font to fit within PDF's bounding box
  // MUST match resolveTextLayout exactly for consistent hit detection
  if (hasPdfBounds && textContent) {
    const targetWidth = Number(item.widthNorm) * cssW;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const measuredWidth = ctx.measureText(textContent).width;
    if (measuredWidth > targetWidth * 1.02 && targetWidth > 0) {
      const scaleFactor = targetWidth / measuredWidth;
      const minScale = 0.5;
      const adjustedScale = Math.max(scaleFactor, minScale);
      fontSize = fontSize * adjustedScale;
    }
  }

  ctx.font = `${fontSize}px ${fontFamily}`;

  const m = ctx.measureText(textContent);
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : fontSize * 0.83;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : fontSize * 0.20;
  const textHeight = ascent + descent;

  // Use actual visual bounding box, not advance width
  // This correctly handles letters like "j" that extend left of origin
  const bboxLeft = (typeof m.actualBoundingBoxLeft === "number") ? m.actualBoundingBoxLeft : 0;
  const bboxRight = (typeof m.actualBoundingBoxRight === "number") ? m.actualBoundingBoxRight : m.width;
  const textWidth = bboxLeft + bboxRight;
  const xOffset = bboxLeft;

  ctx.restore();

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);

  // ❌ no clamping — allow negative / > canvas values
  const xOrigin = hasNorm
    ? Number(item.xNorm) * cssW
    : (Number(item.x) || 0);

  // Actual visual x position (accounts for left-extending glyphs like "j")
  const x = xOrigin - xOffset;

  // Calculate topY - MUST match resolveTextLayout exactly
  // If PDF provides exact baseline position, use it to calculate topY
  let topY;
  if (hasPdfBaseline) {
    // PDF-extracted text: calculate topY from baseline position
    const baselineY = Number(item.yNormBaseline) * cssH;
    topY = baselineY - ascent;
  } else if (hasNorm) {
    // User-created text with normalized coords
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
    xOrigin,    // Original x position (where text is drawn from)
    xOffset,    // How much glyph extends left of origin
    topY,
    fontSize,
    fontFamily,
    padding,
    textWidth,
    textHeight,
    ascent,
    descent,
    // Bounding box is the actual text content area (NO padding)
    // This matches how annotation spans work
    box: {
      x: x,
      y: topY,
      w: textWidth,
      h: textHeight,
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




























































/**
 * Wrap text into lines that fit within maxWidth
 */
function wrapTextIntoLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text || !maxWidth || maxWidth <= 0) {
    return [text || ""];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

const resolveTextLayout = (item:any, ctx:CanvasRenderingContext2D, rect:any) => {
  let fontSize   = Number(item.fontSize) || 16;
  const fontFamily = item.fontFamily || "Lato";
  const padding    = item.boxPadding != null ? item.boxPadding : Math.round(fontSize * 0.2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Check if this is PDF-extracted text with width bounds
  const hasPdfBounds = (item.widthNorm != null) && (item.heightNorm != null);
  const hasPdfBaseline = item.yNormBaseline != null;
  const textContent = item.text || "";

  // For PDF-extracted text: scale font to fit within PDF's bounding box
  // This prevents text overlap when browser font has different metrics than PDF font
  if (hasPdfBounds && textContent) {
    const targetWidth = Number(item.widthNorm) * rect.width;

    // Measure text with original font size
    ctx.font = `${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(textContent);
    const measuredWidth = m.width;

    // If text is wider than target, scale down font size
    // Add small tolerance (2%) to avoid overly aggressive scaling
    if (measuredWidth > targetWidth * 1.02 && targetWidth > 0) {
      const scaleFactor = targetWidth / measuredWidth;
      // Don't scale below 50% of original size to maintain readability
      const minScale = 0.5;
      const adjustedScale = Math.max(scaleFactor, minScale);
      fontSize = fontSize * adjustedScale;
    }
  }

  // Set final font for all measurements
  ctx.font = `${fontSize}px ${fontFamily}`;

  // Check if text needs to be wrapped using item.maxWidth
  // PDF-extracted text should NOT be wrapped (it has precise positioning)
  const maxWidth = item.maxWidth;
  const lines = (hasPdfBounds || hasPdfBaseline || !maxWidth || maxWidth <= 0)
    ? [textContent]
    : wrapTextIntoLines(ctx, textContent, maxWidth);

  // Calculate line height (1.2x font size for comfortable reading)
  const lineHeight = fontSize * 1.2;

  // Measure the first line for baseline metrics
  const firstLineText = lines[0] || "";
  const m = ctx.measureText(firstLineText);
  const ascent  = m.actualBoundingBoxAscent || fontSize * 0.8;
  const descent = m.actualBoundingBoxDescent || fontSize * 0.2;
  const singleLineHeight = ascent + descent;

  // Total height for all lines
  const totalTextHeight = lines.length > 1
    ? singleLineHeight + (lines.length - 1) * lineHeight
    : singleLineHeight;

  // Calculate max width across all lines
  let maxLineWidth = 0;
  for (const line of lines) {
    const lineMetrics = ctx.measureText(line);
    const bboxLeft = lineMetrics.actualBoundingBoxLeft || 0;
    const bboxRight = lineMetrics.actualBoundingBoxRight || lineMetrics.width;
    const lineWidth = bboxLeft + bboxRight;
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }
  }

  // Use actual visual bounding box, not advance width
  // This correctly handles letters like "j" that extend left of origin
  const bboxLeft = (typeof m.actualBoundingBoxLeft === "number") ? m.actualBoundingBoxLeft : 0;
  const bboxRight = (typeof m.actualBoundingBoxRight === "number") ? m.actualBoundingBoxRight : m.width;
  const textWidth = maxLineWidth;
  const xOffset = bboxLeft;

  const hasNorm = (item.xNorm != null) && (item.yNormTop != null);
  const xOrigin = hasNorm ? Number(item.xNorm) * rect.width : (Number(item.x) || 0);

  // Visual left edge (accounts for left-extending glyphs like "j")
  const x = xOrigin - xOffset;

  // Calculate baseline Y position
  // If PDF provides exact baseline position, use it directly (most accurate)
  // Otherwise calculate from top position + ascent
  let baselineY: number | null = null;
  let topY: number;

  if (hasPdfBaseline) {
    // PDF-extracted text: use exact baseline position from PDF
    baselineY = Number(item.yNormBaseline) * rect.height;
    // Calculate topY from baseline for bounding box (using canvas-measured ascent)
    topY = baselineY - ascent;
  } else if (hasNorm) {
    topY = Number(item.yNormTop) * rect.height;
    // baselineY will be calculated from topY + ascent in drawing code
  } else {
    const rawY = Number(item.y) || 0;
    const anchor = item.anchor || "baseline";
    if (anchor === "baseline") {
      baselineY = rawY;
      topY = rawY - ascent;
    } else if (anchor === "bottom") {
      topY = rawY - totalTextHeight;
    } else {
      topY = rawY; // already top
    }
  }

  return {
    x,           // Visual left edge of bounding box
    xOrigin,     // Original x position (where text is drawn from)
    xOffset,     // How much glyph extends left of origin
    topY,
    baselineY,   // Exact baseline Y position (null if not available, use topY + ascent)
    fontSize,    // May be scaled down for PDF text to fit bounds
    fontFamily,
    padding,
    textWidth,   // Visual width (not advance width)
    textHeight: totalTextHeight,
    ascent,
    descent,
    // Multi-line support
    lines,
    lineHeight,
    isMultiLine: lines.length > 1,
    // PDF precision flags
    hasPdfBaseline,
    hasPdfBounds,
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

    // Be very permissive when deciding if an item is an image or vector
    const isImageLike = (o: any): boolean => {
      if (!o || typeof o !== "object") return false;
      // Explicit type checks first - text items should NOT be treated as images
      if (o.type === "text") return false;
      if (o.type === "image") return true;
      if (o.type === "vector") return true;  // Vectors are SVG data URIs, treat like images
      // Consider as image if it has pixelWidth/pixelHeight (image-specific properties)
      if ("pixelWidth" in o || "pixelHeight" in o) return true;
      // Consider as image if it has data/ref/src (image data properties) WITHOUT being text
      if ((typeof o.ref === "string" || typeof o.data === "string" || typeof o.src === "string") && !("text" in o)) return true;
      // If it has widthNorm/heightNorm but also has text, it's a text item with bounds
      if (("widthNorm" in o || "heightNorm" in o) && "text" in o) return false;
      // If it has widthNorm/heightNorm without text, it's likely an image
      if ("widthNorm" in o || "heightNorm" in o) return true;
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
            type: src.type === "vector" ? "vector" : "image",  // Preserve vector type
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

            // Layer properties - vectors default to -50 (above images, below text)
            zIndex: src?.zIndex ?? (src.type === "vector" ? -50 : -100),
            visible: src?.visible ?? true,
            locked: src?.locked ?? false,
          });
        } else {
          // TEXT
          const size = toNum(src?.fontSize, fallbackSize);
          const textContent = String(src?.text ?? "");
          const fontFamily = String(src?.fontFamily || fontFamilyDefault);

          const xNorm    = (src?.xNorm    != null) ? toNum(src.xNorm)    : (src?.x != null ? toNum(src.x) / cssW : 0);
          const yNormTop = (src?.yNormTop != null) ? toNum(src.yNormTop) : (src?.y != null ? toNum(src.y) / cssH : 0);

          const x = xNorm * cssW;
          const y = yNormTop * cssH;

          const padding = (src?.boxPadding != null)
            ? toNum(src.boxPadding)
            : Math.round(size * 0.2);

          // Use source dimensions if available (from PDF extraction), otherwise measure
          let widthNorm = src?.widthNorm != null ? toNum(src.widthNorm) : null;
          let heightNorm = src?.heightNorm != null ? toNum(src.heightNorm) : null;
          let ascentRatio = src?.ascentRatio != null ? toNum(src.ascentRatio) : null;
          let descentRatio = src?.descentRatio != null ? toNum(src.descentRatio) : null;

          // If dimensions not provided, measure using canvas
          // Use actual visual bounding box for accurate measurements (handles "j", "g", etc.)
          if (widthNorm === null || heightNorm === null) {
            const ctx = canvas?.getContext?.("2d");
            if (ctx && textContent) {
              ctx.font = `${size}px ${fontFamily}`;
              const metrics = ctx.measureText(textContent);
              const ascent = metrics.actualBoundingBoxAscent || (size * 0.8);
              const descent = metrics.actualBoundingBoxDescent || (size * 0.2);
              const bboxLeft = metrics.actualBoundingBoxLeft || 0;
              const bboxRight = metrics.actualBoundingBoxRight || metrics.width;
              const textWidth = bboxLeft + bboxRight;
              const textHeight = ascent + descent;

              widthNorm = textWidth / cssW;
              heightNorm = textHeight / cssH;
              ascentRatio = textHeight > 0 ? ascent / textHeight : 0.8;
              descentRatio = textHeight > 0 ? descent / textHeight : 0.2;
            }
          }

          newTextItems.push({
            type: "text",
            text: textContent,
            x, y,
            xNorm, yNormTop,
            fontSize: size,
            boxPadding: padding,
            index: pageIndex,
            anchor: "top",
            fontFamily,
            // Preserve color from source (defaults to black if not specified)
            color: src?.color || "#000000",
            // Preserve ID for annotation linking (from manifest)
            ...(src?.id && { id: src.id }),
            // Bounding box dimensions for annotation positioning
            ...(widthNorm !== null && { widthNorm: +widthNorm.toFixed(6) }),
            ...(heightNorm !== null && { heightNorm: +heightNorm.toFixed(6) }),
            ...(ascentRatio !== null && { ascentRatio: +ascentRatio.toFixed(4) }),
            ...(descentRatio !== null && { descentRatio: +descentRatio.toFixed(4) }),
            // Preserve baseline position for precise rendering (from PDF extraction)
            ...(src?.yNormBaseline != null && { yNormBaseline: +toNum(src.yNormBaseline).toFixed(6) }),
            // Preserve ascender/descender from PDF extraction
            ...(src?.ascender != null && { ascender: toNum(src.ascender) }),
            ...(src?.descender != null && { descender: toNum(src.descender) }),
            // Layer properties
            zIndex: src?.zIndex ?? 10,
            visible: src?.visible ?? true,
            locked: src?.locked ?? false,
            ...(src?.name && { name: src.name }),
          });
        }
      }
    } else {
      // Manual add (single text)
      const size = fallbackSize;
      const padding = Math.round(size * 0.2);
      const x = 50, y = 50;

      // Measure text dimensions for accurate annotation positioning
      // Use actual visual bounding box for accurate measurements (handles "j", "g", etc.)
      let widthNorm: number | null = null;
      let heightNorm: number | null = null;
      let ascentRatio: number | null = null;
      let descentRatio: number | null = null;

      const ctx = canvas?.getContext?.("2d");
      if (ctx && newText) {
        ctx.font = `${size}px ${fontFamilyDefault}`;
        const metrics = ctx.measureText(newText);
        const ascent = metrics.actualBoundingBoxAscent || (size * 0.8);
        const descent = metrics.actualBoundingBoxDescent || (size * 0.2);
        const bboxLeft = metrics.actualBoundingBoxLeft || 0;
        const bboxRight = metrics.actualBoundingBoxRight || metrics.width;
        const textWidth = bboxLeft + bboxRight;
        const textHeight = ascent + descent;

        widthNorm = textWidth / cssW;
        heightNorm = textHeight / cssH;
        ascentRatio = textHeight > 0 ? ascent / textHeight : 0.8;
        descentRatio = textHeight > 0 ? descent / textHeight : 0.2;
      }

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
        // Bounding box dimensions for annotation positioning
        ...(widthNorm !== null && { widthNorm: +widthNorm.toFixed(6) }),
        ...(heightNorm !== null && { heightNorm: +heightNorm.toFixed(6) }),
        ...(ascentRatio !== null && { ascentRatio: +ascentRatio.toFixed(4) }),
        ...(descentRatio !== null && { descentRatio: +descentRatio.toFixed(4) }),
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

    const textItemsToAdd = layout.lines.map((line, i) => {
      // Measure text dimensions for accurate annotation positioning
      // Use actual visual bounding box for accurate measurements (handles "j", "g", etc.)
      ctx.font = `${layout.fontSize}px ${family}`;
      const metrics = ctx.measureText(line);
      const ascent = metrics.actualBoundingBoxAscent || (layout.fontSize * 0.8);
      const descent = metrics.actualBoundingBoxDescent || (layout.fontSize * 0.2);
      const bboxLeft = metrics.actualBoundingBoxLeft || 0;
      const bboxRight = metrics.actualBoundingBoxRight || metrics.width;
      const textWidth = bboxLeft + bboxRight;
      const textHeight = ascent + descent;

      const widthNorm = textWidth / CANVAS_WIDTH;
      const heightNorm = textHeight / CANVAS_HEIGHT;
      const ascentRatio = textHeight > 0 ? ascent / textHeight : 0.8;
      const descentRatio = textHeight > 0 ? descent / textHeight : 0.2;

      return {
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
        // Bounding box dimensions for annotation positioning
        widthNorm: +widthNorm.toFixed(6),
        heightNorm: +heightNorm.toFixed(6),
        ascentRatio: +ascentRatio.toFixed(4),
        descentRatio: +descentRatio.toFixed(4),
      };
    });

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

  // Z-index actions for layering
  // Bring text item one layer forward (increment z-index)
  const bringTextForward = useCallback((index: number) => {
    setTextItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const currentZ = item.zIndex ?? 0;
      return prev.map((t, i) => i === index ? { ...t, zIndex: currentZ + 1 } : t);
    });
  }, [setTextItems]);

  // Send text item one layer backward (decrement z-index)
  const sendTextBackward = useCallback((index: number) => {
    setTextItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const currentZ = item.zIndex ?? 0;
      return prev.map((t, i) => i === index ? { ...t, zIndex: currentZ - 1 } : t);
    });
  }, [setTextItems]);

  // Bring text item to front (set z-index to max + 1)
  const bringTextToFront = useCallback((index: number) => {
    setTextItems((prev) => {
      const maxZ = Math.max(...prev.map(t => t.zIndex ?? 0), 0);
      return prev.map((t, i) => i === index ? { ...t, zIndex: maxZ + 1 } : t);
    });
  }, [setTextItems]);

  // Send text item to back (set z-index to min - 1)
  const sendTextToBack = useCallback((index: number) => {
    setTextItems((prev) => {
      const minZ = Math.min(...prev.map(t => t.zIndex ?? 0), 0);
      return prev.map((t, i) => i === index ? { ...t, zIndex: minZ - 1 } : t);
    });
  }, [setTextItems]);

  // Layer panel functions
  // Toggle text item visibility
  const toggleTextVisibility = useCallback((index: number) => {
    setTextItems((prev) =>
      prev.map((t, i) => i === index ? { ...t, visible: !(t.visible ?? true) } : t)
    );
  }, [setTextItems]);

  // Toggle text item lock
  const toggleTextLock = useCallback((index: number) => {
    setTextItems((prev) =>
      prev.map((t, i) => i === index ? { ...t, locked: !t.locked } : t)
    );
  }, [setTextItems]);

  // Update text item name
  const updateTextName = useCallback((index: number, name: string) => {
    setTextItems((prev) =>
      prev.map((t, i) => i === index ? { ...t, name } : t)
    );
  }, [setTextItems]);

  // Set text item z-index directly
  const setTextZIndex = useCallback((index: number, zIndex: number) => {
    setTextItems((prev) =>
      prev.map((t, i) => i === index ? { ...t, zIndex } : t)
    );
  }, [setTextItems]);

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
    editingColor, setEditingColor,
    editingFont, setEditingFont,
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

    // Z-index layering
    bringTextForward,
    sendTextBackward,
    bringTextToFront,
    sendTextToBack,

    // Layer panel functions
    toggleTextVisibility,
    toggleTextLock,
    updateTextName,
    setTextZIndex,
  };
}
