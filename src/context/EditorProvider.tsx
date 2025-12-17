import {
  createContext,
  useContext,
  PropsWithChildren,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";

import { useUiPanels } from "../hooks/useUiPanels";
import { useHistory } from "../hooks/useHistory";
import { usePages } from "../hooks/usePages";
import { useTextItems } from "../hooks/useTextItems";
import { useSelection } from "../hooks/useSelection";
import { useTextBox } from "../hooks/useTextBox";
import { useImages } from "../hooks/useImages";
import { usePdf } from "../hooks/usePdf";
import { useMultiLineMode } from "../hooks/useMultiLineMode";
import { useMouse } from '../hooks/useMouse';
import { useKeyboard } from '../hooks/useKeyboard';
import { useShare } from '../hooks/useShare';
import { useShapes } from '../hooks/useShapes';

type EditorContextValue = {
  ui: ReturnType<typeof useUiPanels>;
  history: ReturnType<typeof useHistory>;
  pages: ReturnType<typeof usePages>;
  text: ReturnType<typeof useTextItems>;
  selection: ReturnType<typeof useSelection>;
  textBox: ReturnType<typeof useTextBox>;
  images: ReturnType<typeof useImages>;
  pdf: ReturnType<typeof usePdf>;
  multiline: ReturnType<typeof useMultiLineMode>;
  mouse: ReturnType<typeof useMouse>;
  keyboard: ReturnType<typeof useKeyboard>;
  share: ReturnType<typeof useShare>;
  shapes: ReturnType<typeof useShapes>;
};

const EditorContext = createContext<EditorContextValue | null>(null);
export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within <EditorProvider>");
  return ctx;
};


export function EditorProvider({ children }: PropsWithChildren) {
  const ui = useUiPanels();
  const pages = usePages();
  const text = useTextItems();
  const selection = useSelection();
  const textBox = useTextBox();
  const images = useImages();
  const pdf = usePdf();
  const multiline = useMultiLineMode();
  const history = useHistory();
  const mouse = useMouse();
  const keyboard = useKeyboard();
  const share = useShare();
  const shapes = useShapes();

  // Keep latest slices in refs so history bindings always read current data
  const textRef = useRef(text);
  const imagesRef = useRef(images);
  const shareRef = useRef(share);
  const shapesRef = useRef(shapes);

  // Sync locks to prevent circular updates
  const isSyncingPagesToShapes = useRef(false);
  const isSyncingShapesToPages = useRef(false);
  // Store last synced shapes hash to prevent ping-pong
  const lastShapesFromPages = useRef<string | null>(null);

  useEffect(() => {
    textRef.current = text;
    imagesRef.current = images;
    shareRef.current = share;
    shapesRef.current = shapes;
  }, [text, images, share, shapes]);

  /**
   * 🔁 Re-hydrate text, image, and shape stores from pages (single source of truth)
   * This ensures all pages are reflected in item stores
   */
  useEffect(() => {
    // Prevent circular updates: if we're currently syncing shapes to pages, skip this
    if (isSyncingShapesToPages.current) return;

    // CRITICAL: Skip pages→shapes sync during mixed-item dragging
    // Otherwise updatePageItems (for text) will trigger this effect, which rehydrates shapes
    // from pages with OLD positions, overwriting the updateShape changes
    if (selection.isDraggingMixedItems) return;

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    // Set lock to prevent the other effect from triggering
    isSyncingPagesToShapes.current = true;

    // Extract all items from pages and add index property to each item
    const allText = pageList.flatMap((p, pageIndex) =>
      (p?.textItems ?? []).map((item) => ({ ...item, index: pageIndex }))
    );
    const allImages = pageList.flatMap((p, pageIndex) =>
      (p?.imageItems ?? []).map((item) => ({ ...item, index: pageIndex }))
    );
    const allShapes = pageList.flatMap((p, pageIndex) =>
      (p?.shapes ?? []).map((item) => ({ ...item, index: pageIndex }))
    );

    // Store hash of shapes we just loaded (without index property for comparison)
    const shapesWithoutIndex = allShapes.map(({ index, ...shape }) => shape);
    lastShapesFromPages.current = JSON.stringify(shapesWithoutIndex);

    // Update item stores
    text.setTextItems?.(allText);
    images.setImageItems?.(allImages);
    shapes.setShapeItems?.(allShapes);

    // Release lock after state updates are queued
    setTimeout(() => {
      isSyncingPagesToShapes.current = false;
    }, 0);
  }, [pages.pages, text.setTextItems, images.setImageItems, shapes.setShapeItems, selection.isDraggingMixedItems]);

  /**
   * 🔁 Sync shapes back to pages whenever shapes change (for persistence)
   * Skip during active user interactions to prevent flickering
   */
  useEffect(() => {
    // CRITICAL: Skip shapes→pages sync during active user interactions
    const isInteracting = shapes.isDraggingShape || shapes.isDraggingMultipleShapes ||
                          shapes.isResizingShape || shapes.isCreatingShape ||
                          selection.isDraggingMixedItems;

    if (isInteracting) {
      return;
    }

    // Prevent circular updates: if we're currently syncing pages to shapes, skip this
    if (isSyncingPagesToShapes.current) return;

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    if (!shapes.shapeItems || shapes.shapeItems.length === 0) {
      // If no shapes, check if this is different from what we loaded
      if (lastShapesFromPages.current !== '[]') {
        const updatedPages = pageList.map(page => ({ ...page, shapes: [] }));
        isSyncingShapesToPages.current = true;
        pages.setPages(updatedPages);
        lastShapesFromPages.current = '[]';
        setTimeout(() => {
          isSyncingShapesToPages.current = false;
        }, 0);
      }
      return;
    }

    // Create current shapes hash (without index property)
    const shapesWithoutIndex = shapes.shapeItems.map(({ index, ...shape }) => shape);
    const currentShapesHash = JSON.stringify(shapesWithoutIndex);

    // If shapes are the same as what we loaded from pages, skip update to prevent ping-pong
    if (currentShapesHash === lastShapesFromPages.current) {
      return;
    }

    // Set lock to prevent the other effect from triggering
    isSyncingShapesToPages.current = true;

    // Group shapes by page index
    const shapesByPage: Record<number, any[]> = {};
    shapes.shapeItems.forEach((shape) => {
      const pageIdx = shape.index ?? 0;
      if (!shapesByPage[pageIdx]) shapesByPage[pageIdx] = [];

      // Remove the 'index' property before storing back to pages
      const { index, ...shapeWithoutIndex } = shape;
      shapesByPage[pageIdx].push(shapeWithoutIndex);
    });

    // Update pages with shapes
    const updatedPages = pageList.map((page, pageIndex) => {
      const pageShapes = shapesByPage[pageIndex] || [];
      return { ...page, shapes: pageShapes };
    });

    // Update pages and store the new hash
    pages.setPages(updatedPages);
    lastShapesFromPages.current = currentShapesHash;

    // Release lock after state updates are queued
    setTimeout(() => {
      isSyncingShapesToPages.current = false;
    }, 0);

    // NOTE: Interaction flags MUST be in dependencies so effect runs when interaction ends
  }, [shapes.shapeItems, shapes.isDraggingShape, shapes.isDraggingMultipleShapes,
      shapes.isResizingShape, shapes.isCreatingShape, selection.isDraggingMixedItems,
      pages.pages, pages.setPages]);

  /**
   * Bind history sources once; the getters pull from refs so they see fresh arrays.
   */
  useLayoutEffect(() => {
    history.bindSources(
      () => textRef.current.textItems,
      () => imagesRef.current.imageItems,
      (next) => textRef.current.setTextItems(next),
      (next) => imagesRef.current.setImageItems(next)
    );
  }, [history]);

  // inside EditorProvider
useLayoutEffect(() => {
  history.bindFromSlices(text, images, pages, shapes); // 👈 pass ALL four
}, [history, text, images, pages, shapes]);

  const value = useMemo<EditorContextValue>(
    () => ({
      ui,
      history,
      pages,
      text,
      selection,
      textBox,
      images,
      pdf,
      multiline,
      mouse,
      keyboard,
      share,
      shapes,
    }),
    [ui, history, pages, text, selection, textBox, images, pdf, multiline, mouse, keyboard, share, shapes]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
