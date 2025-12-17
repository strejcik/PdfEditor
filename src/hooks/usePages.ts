import { useCallback, useEffect, useRef, useState } from "react";
import type { Page } from "../types/editor";
import { loadPages, savePages, normalizePages } from "../utils/persistance/pagesStorage"
export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<number>(0);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);

  // Add a new page
  const addNewPage = () => {
    if(pages.length >= 1) {
      setPages((prev) => [...prev, { textItems: [], imageItems: [], shapes: [] }]);
      setActivePage(pages.length); // Switch to the new page
    }
  };

  const removePage = (opts = {}) => {
    const {
      setSelectedTextIndexes,
      setSelectedTextIndex,
      setIsTextSelected,
      setSelectionStart,
      setSelectionEnd,
      setIsSelecting,
      setIsDragging,
      setIsImageDragging,
      setDraggedImageIndex,
      setResizingImageIndex,
      setTextItems,
      setImageItems,
      setShapeItems,
      saveTextItemsToIndexedDB,
      saveImageItemsToIndexedDB,
      saveShapeItemsToIndexedDB,
      purgeUndoRedoForRemovedPage,
      textItems,
      imageItems,
      shapeItems,
      isTextBoxEditEnabled,
      textBox,
      activePage,
      isMultilineMode,
      canvasRefs,
      mlConfig,
      mlCaret,
      mlAnchor,
      mlPreferredX,
      mlText,
      mlCaretBlink,
      isMlDragging,
      fontSize,
      wrapTextPreservingNewlinesResponsive,
      resolveTextLayout,
      layoutMultiline,
      setMlPreferredX,
      showGrid,
      APP_FONT_FAMILY,
      drawCanvas
    }: any = opts;

  if (!Array.isArray(pages) || pages.length <= 1) {
    alert("Cannot remove the last page.");
    return;
  }

  const removedIndex = activePage;

  // 1) Build reindex helpers
  const reindexArrayItems = (arr = []) =>
    arr
      .filter((it:any) => it && typeof it.index === "number" && it.index !== removedIndex) // drop items on removed page
      .map((it: any) =>
        it.index > removedIndex ? { ...it, index: it.index - 1 } : it
      );

  const reindexPagesSlice = (pages:any) => {
    // Remove the page and reindex embedded item indices so they
    // always match their new page position.
    const filtered = pages.filter((_:any, i:any) => i !== removedIndex);
    return filtered.map((pg:any, newIdx:any) => ({
      ...pg,
      textItems: (pg.textItems || []).map((t:any) => ({ ...t, index: newIdx })),
      imageItems: (pg.imageItems || []).map((im:any) => ({ ...im, index: newIdx })),
      shapes: (pg.shapes || []).map((s:any) => ({ ...s, index: newIdx })),
    }));
  };

  // 2) Compute next state synchronously
  const nextPages = reindexPagesSlice(pages);
  const nextTextItems = reindexArrayItems(textItems || []);
  const nextImageItems = reindexArrayItems(imageItems || []);
  const nextShapeItems = reindexArrayItems(shapeItems || []);

  // 3) Compute next active page
  const nextActivePage = (() => {
    const count = nextPages.length;
    if (count === 0) return 0;
    if (activePage === removedIndex) return Math.min(removedIndex, count - 1);
    if (activePage > removedIndex) return activePage - 1;
    return activePage;
  })();

  // 4) Clear selections / drag state to avoid dangling indices
  setSelectedTextIndexes?.([]);
  setSelectedTextIndex?.(null);
  setIsTextSelected?.(false);
  setSelectionStart?.(null);
  setSelectionEnd?.(null);
  setIsSelecting?.(false);
  setIsDragging?.(false);
  setIsImageDragging?.(false);
  setDraggedImageIndex?.(null);
  setResizingImageIndex?.(null);

  // 5) Update refs array to keep in sync with removed page (if you keep manual refs)
  if (Array.isArray(canvasRefs?.current)) {
    canvasRefs.current.splice(removedIndex, 1);
  }

  // 6) Commit state (pages, items, activePage)
  setPages(nextPages);
  setTextItems(nextTextItems);
  setImageItems(nextImageItems);
  setShapeItems?.(nextShapeItems);
  saveTextItemsToIndexedDB?.(nextTextItems);
  saveImageItemsToIndexedDB?.(nextImageItems);
  saveShapeItemsToIndexedDB?.(nextShapeItems);

  // Undo/redo stacks purge for removed page (if you maintain per-page history)
  try {
    purgeUndoRedoForRemovedPage?.(removedIndex);
  } catch (_) {}

  setActivePage(nextActivePage);

  // 7) Redraw all remaining pages on the next frame (avoids measuring during state flush)
  requestAnimationFrame(() => {
    const pageCount = nextPages.length;
    for (let p = 0; p < pageCount; p++) {
      const canvas = canvasRefs?.current?.[p];
      if (!canvas) continue;

      drawCanvas(p, {
        canvas,
        state: {
          // fresh global stores:
          textItems: nextTextItems,
          imageItems: nextImageItems,
          shapeItems: nextShapeItems,

          // basic UI state (cleared above):
          selectedTextIndexes: [],
          selectionStart: null,
          selectionEnd: null,
          isSelecting: false,
          isTextBoxEditEnabled,
          textBox,
          activePage: p,

          // Optional multiline editor: only "active" page shows caret/blink
          isMultilineMode: isMultilineMode && p === nextActivePage,
          canvasRefs,
          mlConfig,
          mlCaret: p === nextActivePage ? mlCaret : 0,
          mlAnchor: p === nextActivePage ? mlAnchor : 0,
          mlPreferredX: p === nextActivePage ? mlPreferredX : null,
          mlText: p === nextActivePage ? mlText : "",
          mlCaretBlink: p === nextActivePage ? mlCaretBlink : false,
          isMlDragging: p === nextActivePage ? isMlDragging : false,

          fontSize,
          wrapTextPreservingNewlinesResponsive,
          resolveTextLayout,
          layoutMultiline,
          setMlPreferredX,
        },
        config: { showGrid, APP_FONT_FAMILY },
      });
    }
  });
  }

  // Load once on mount
useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const stored = await loadPages();     // <-- now async (IndexedDB)
      const normalized = normalizePages(stored);

      if (!cancelled) {
        setPages(normalized);
        // pick a safe active page within bounds
        setActivePage(normalized.length > 0 ? Math.min(0, normalized.length - 1) : 0);
      }
    } catch {
      if (!cancelled) {
        // fall back to one blank page if anything goes wrong
        setPages([{ textItems: [], imageItems: [], shapes: [] }]);
        setActivePage(0);
      }
    }
  })();

  return () => { cancelled = true; };
}, []);
  

  // Persist whenever pages change
  useEffect(() => {
    if (pages.length > 0) {
      savePages(pages);
    }
  }, [pages]);


const updatePageItems = useCallback(
  <K extends keyof Page>(key: K, items: Page[K]) => {
    setPages(prevPages => {
      const updatedPages = [...prevPages];
      updatedPages[activePage] = {
        ...updatedPages[activePage],
        [key]: items,
      };
      return updatedPages;
    });
  },
  [activePage, setPages]
);

  return { pages, setPages, activePage, setActivePage, canvasRefs, updatePageItems, addNewPage, removePage};
}