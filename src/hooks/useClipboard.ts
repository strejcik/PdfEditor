// src/hooks/useClipboard.ts
import { useEffect, useCallback } from "react";
import { useEditor } from "../context/EditorProvider";
import { readClipboard, writeClipboard, clearClipboard, ClipboardPayload } from "../utils/clipboard/clipboardStorage";
import {CANVAS_WIDTH, CANVAS_HEIGHT} from '../config/constants';
import { flushSync } from "react-dom";
type AnyText = any;   // replace with your TextItem type if you have it
type AnyImage = any;  // replace with your ImageItem type if you have it

// Small helper: ensure normalized fields exist for text items
function ensureTextNormalized(it: AnyText, W: number, H: number) {
  const out = { ...it };
  if (typeof out.xNorm !== "number" && typeof out.x === "number" && W > 0) out.xNorm = out.x / W;
  if (typeof out.yNormTop !== "number" && typeof out.y === "number" && H > 0) out.yNormTop = out.y / H;
  return out;
}

// Small helper: ensure normalized fields exist for image items
function ensureImageNormalized(it: AnyImage, W: number, H: number) {
  const out = { ...it };
  if (typeof out.xNorm !== "number" && typeof out.x === "number" && W > 0) out.xNorm = out.x / W;
  if (typeof out.yNormTop !== "number" && typeof out.y === "number" && H > 0) out.yNormTop = out.y / H;
  if (typeof out.widthNorm !== "number" && typeof out.width === "number" && W > 0) out.widthNorm = out.width / W;
  if (typeof out.heightNorm !== "number" && typeof out.height === "number" && H > 0) out.heightNorm = out.height / H;
  return out;
}

export function useClipboard(opts:any) {
  const {
    pages,              // { pages, setPages }
    text,               // { textItems, setTextItems }
    images,             // { imageItems, setImageItems }
    selection,          // { selectedTextIndexes, setSelectedTextIndexes, selectedImageIndexes?, setSelectedImageIndexes? ... }
    history,            // { pushSnapshotToUndo }
    templates,          // { isPlaceholderModalOpen, ... }
    ui,                 // { openSections, ... } for modal states
  } = opts;


  const activePage = pages.activePage ?? 0;
  const getCanvasWH = useCallback(() => {
    // If you have a canonical canvas size, read from your refs; else fallback to A4-like defaults
    const W = CANVAS_WIDTH  // PDF_WIDTH you use elsewhere
    const H = CANVAS_HEIGHT  // PDF_HEIGHT
    return { W, H };
  }, [CANVAS_WIDTH, CANVAS_HEIGHT]);

  const getSelectedItems = useCallback(() => {
    const { selectedTextIndexes = [] } = text as any;

    const textItems: AnyText[]  = selectedTextIndexes.map((i: number) => text.textItems[i]).filter(Boolean);
    const imageItems: AnyImage[] = images.imageItems[images.selectedImageIndex];
    
    return { textItems, imageItems };
  }, [text.selectedTextIndexes, text.textItems, images.imageItems]);

  const copySelection = useCallback(() => {
    const { textItems: tSel, imageItems: iSel } = getSelectedItems();
    if (tSel.length === 0 && iSel.length === 0) return false;

    const { W, H } = getCanvasWH();
    console.log(iSel);
    const payload: ClipboardPayload = {
      ts: Date.now(),
      items: [
        ...tSel.map(t => ({ kind: "text" as const,  data: ensureTextNormalized(t, W, H) })),
        { kind: "image" as const, data: ensureImageNormalized(iSel, W, H) }
      ],
    };
    writeClipboard(payload);
    return true;
  }, [getSelectedItems, getCanvasWH]);

const cutSelection = useCallback(() => {
  // Read selected indexes (text + image)
  const tIdxs: number[] = text?.selectedTextIndexes ?? [];
  const iIdxs: number[] =
    (images as any)?.selectedImageIndexes ??
    (typeof (images as any)?.selectedImageIndex === "number"
      ? [(images as any).selectedImageIndex]
      : []);

  if (tIdxs.length === 0 && iIdxs.length === 0) return false;

  // 1) Copy to clipboard first
  const copied = copySelection();
  if (!copied) return false;

  // 2) Snapshot for undo
  const activePage = pages.activePage ?? 0;
  history?.pushSnapshotToUndo?.(activePage);

  // 3) Build next global arrays by FILTERING BY INDEX
  const tSet = new Set(tIdxs);
  const iSet = new Set(iIdxs);

  const nextText = (text.textItems ?? []).filter((_:any, idx:any) => !tSet.has(idx));
  const nextImgs = (images.imageItems ?? []).filter((_:any, idx:any) => !iSet.has(idx));

  // 4) Synchronously update global slices
  flushSync(() => {
    text.setTextItems(nextText);
    images.setImageItems(nextImgs);
    // optional persistence
    text.saveTextItemsToLocalStorage?.(nextText);
    images.saveImageItemsToLocalStorage?.(nextImgs);
  });

  // 5) Rebuild the page slice for the active page from the updated globals
  flushSync(() => {
    pages.setPages((prev: any[]) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const page = next[activePage] || { textItems: [], imageItems: [] };
      next[activePage] = {
        ...page,
        textItems: nextText.filter((it: any) => it.index === activePage),
        imageItems: nextImgs.filter((it: any) => it.index === activePage),
      };
      return next;
    });
  });

  // 6) Clear selection
  selection.setSelectedTextIndexes?.([]);
  (selection as any).setSelectedImageIndex?.(null);

  return true;
}, [
  selection?.selectedTextIndexes,
  (images as any)?.selectedImageIndexes,
  (images as any)?.selectedImageIndex,
  text.textItems,
  images.imageItems,
  pages.activePage,
  copySelection,
  history,
  text.setTextItems,
  images.setImageItems,
  pages.setPages,
]);

  const pasteClipboard = useCallback(() => {
    const clip = readClipboard();
    if (!clip || !Array.isArray(clip.items) || clip.items.length === 0) return false;

    history?.pushSnapshotToUndo?.(activePage);

    // Paste offset so multiple pastes don't overlap perfectly
    const OFFSET = 12;

    const { W, H } = getCanvasWH();

    const pastedText: AnyText[]  = [];
    const pastedImgs: AnyImage[] = [];

    clip.items.forEach(({ kind, data }) => {
      if (kind === "text") {
        const src = ensureTextNormalized(data, W, H);
        // Convert to px using current canvas dims, then offset slightly
        const x = (src.x ?? src.xNorm * W) + OFFSET;
        const y = (src.y ?? src.yNormTop * H) + OFFSET;

        const newText = {
          ...src,
          x, y,
          xNorm: x / W,
          yNormTop: y / H,
          index: activePage,
          anchor: "top",
        };
        pastedText.push(newText);
      } else if (kind === "image") {
        const src = ensureImageNormalized(data, W, H);
        const x = (src.x ?? src.xNorm * W) + OFFSET;
        const y = (src.y ?? src.yNormTop * H) + OFFSET;
        const width  = (src.width  ?? src.widthNorm  * W);
        const height = (src.height ?? src.heightNorm * H);

        const newImg = {
          ...src,
          x, y, width, height,
          xNorm: x / W,
          yNormTop: y / H,
          widthNorm: width / W,
          heightNorm: height / H,
          index: activePage,
        };
        pastedImgs.push(newImg);
      }
    });

    // Append to globals
    if (pastedText.length) {
      text.setTextItems((prev:any) => [...(prev || []), ...pastedText]);
    }
    if (pastedImgs.length) {
      images.setImageItems?.((prev: AnyImage[]) => [...(prev || []), ...pastedImgs]);
    }

    // Append to pages slice
    pages.setPages((prev: any[]) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const page = next[activePage] || { textItems: [], imageItems: [] };
      next[activePage] = {
        ...page,
        textItems: [...(page.textItems || []), ...pastedText.map((t) => ({ ...t }))],
        imageItems: [...(page.imageItems || []), ...pastedImgs.map((i) => ({ ...i }))],
      };
      return next;
    });

    // Replace selection with the freshly pasted items (text selection only for simplicity)
    const baseIndex = (text.textItems?.length ?? 0);
    const newlyAddedTextCount = pastedText.length;
    const newSelection = Array.from({ length: newlyAddedTextCount }, (_, i) => baseIndex + i);

    text.setSelectedTextIndexes?.(newSelection);
    // if you also track image selection, you can set it here similarly

    return true;
  }, [history, activePage, getCanvasWH, text, images, pages, selection]);

  // Register global key handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard handling when any modal is open
      // This prevents Ctrl+C/V/Z from affecting canvas when user is in a modal
      const isTemplateModalOpen = templates?.isPlaceholderModalOpen ||
                                  templates?.previewTemplate !== null;

      // Also check for any modal backdrop in the DOM (covers all modals including confirmation dialogs)
      const hasModalBackdrop = document.querySelector('.modal-backdrop') !== null;
      const hasOpenModal = document.querySelector('.modal[open], dialog[open]') !== null;

      if (isTemplateModalOpen || hasModalBackdrop || hasOpenModal) return;

      // Also skip if focus is on an input/textarea (user is typing in a form field)
      const target = e.target as HTMLElement;
      const tagName = target?.tagName?.toLowerCase() || "";
      const isTypingInField = tagName === "input" || tagName === "textarea" || target?.isContentEditable;
      if (isTypingInField) return;

      // Skip if the event target is inside a modal
      if (target?.closest('.modal, .modal-backdrop, dialog')) return;

      const isCmd = navigator.platform.includes("Mac");
      const mod = isCmd ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      const k = e.key.toLowerCase();

      // COPY
      if (k === "c") {
        const did = copySelection();
        if (did) e.preventDefault();
        return;
      }

      // CUT (your request mentions Ctrl+Z; we support both X and Z)
      if (k === "x" || k === "z") {
        const did = cutSelection();
        if (did) {
          e.preventDefault();          // prevent default undo if Ctrl+Z
          e.stopPropagation();
        }
        return;
      }

      // PASTE
      if (k === "v") {
        const did = pasteClipboard();
        if (did) e.preventDefault();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [copySelection, cutSelection, pasteClipboard, templates?.isPlaceholderModalOpen, templates?.previewTemplate]);

  return {
    copySelection,
    cutSelection,
    pasteClipboard,
    readClipboard,
    clearClipboard,
  };
}
