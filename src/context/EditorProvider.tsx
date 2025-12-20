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
import { useFormFields } from '../hooks/useFormFields';
import { useClaudeAI } from '../hooks/useClaudeAI';

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
  formFields: ReturnType<typeof useFormFields>;
  ai: ReturnType<typeof useClaudeAI>;
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
  const formFields = useFormFields();
  const ai = useClaudeAI();

  // Keep latest slices in refs so history bindings always read current data
  const textRef = useRef(text);
  const imagesRef = useRef(images);
  const shareRef = useRef(share);
  const shapesRef = useRef(shapes);
  const formFieldsRef = useRef(formFields);

  // Sync locks to prevent circular updates
  const isSyncingPagesToShapes = useRef(false);
  const isSyncingShapesToPages = useRef(false);
  const isSyncingPagesToFormFields = useRef(false);
  const isSyncingFormFieldsToPages = useRef(false);
  const isSyncingPagesToText = useRef(false);
  const isSyncingTextToPages = useRef(false);
  // Store last synced hashes to prevent ping-pong
  const lastShapesFromPages = useRef<string | null>(null);
  const lastFormFieldsFromPages = useRef<string | null>(null);
  const lastTextFromPages = useRef<string | null>(null);

  useEffect(() => {
    textRef.current = text;
    imagesRef.current = images;
    shareRef.current = share;
    shapesRef.current = shapes;
    formFieldsRef.current = formFields;
  }, [text, images, share, shapes, formFields]);

  /**
   * 🔁 Re-hydrate text, image, and shape stores from pages (single source of truth)
   * This ensures all pages are reflected in item stores
   */
  useEffect(() => {
    // Prevent circular updates: if we're currently syncing items to pages, skip this
    if (isSyncingShapesToPages.current) return;
    if (isSyncingFormFieldsToPages.current) return;
    if (isSyncingTextToPages.current) return;

    // CRITICAL: Skip pages→shapes sync during mixed-item dragging
    // Otherwise updatePageItems (for text) will trigger this effect, which rehydrates shapes
    // from pages with OLD positions, overwriting the updateShape changes
    if (selection.isDraggingMixedItems) return;

    // CRITICAL: Skip pages→shapes sync in viewer mode
    // In viewer mode, shapes are synced directly via shapeItems broadcast, not through pages
    // If we sync from pages here, we'll overwrite real-time shape positions with stale data
    const isViewer = share.mode === "viewer";

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    // Set locks to prevent the other effects from triggering
    isSyncingPagesToShapes.current = true;
    isSyncingPagesToFormFields.current = true;
    isSyncingPagesToText.current = true;

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
    const allFormFields = pageList.flatMap((p, pageIndex) =>
      (p?.formFields ?? []).map((item) => ({ ...item, index: pageIndex }))
    );

    // Store hash of shapes we just loaded (without index property for comparison)
    const shapesWithoutIndex = allShapes.map(({ index, ...shape }) => shape);
    lastShapesFromPages.current = JSON.stringify(shapesWithoutIndex);

    // Store hash of formFields we just loaded (without index property for comparison)
    const formFieldsWithoutIndex = allFormFields.map(({ index, ...field }) => field);
    lastFormFieldsFromPages.current = JSON.stringify(formFieldsWithoutIndex);

    // Store hash of textItems we just loaded (without index property for comparison)
    const textWithoutIndex = allText.map(({ index, ...item }) => item);
    lastTextFromPages.current = JSON.stringify(textWithoutIndex);

    // Update item stores
    // Only sync text and shapes from pages if NOT in viewer mode
    // In viewer mode, both text and shapes come directly from the broadcast
    if (!isViewer) {
      text.setTextItems?.(allText);
      shapes.setShapeItems?.(allShapes);
      formFields.setFormFields?.(allFormFields);
    }

    // Images always sync from pages (no real-time broadcast needed)
    images.setImageItems?.(allImages);

    // Release locks after state updates are queued
    setTimeout(() => {
      isSyncingPagesToShapes.current = false;
      isSyncingPagesToFormFields.current = false;
      isSyncingPagesToText.current = false;
    }, 0);
  }, [pages.pages, text.setTextItems, images.setImageItems, shapes.setShapeItems, formFields.setFormFields, selection.isDraggingMixedItems, share.mode]);

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
        isSyncingShapesToPages.current = true;
        // Use functional update to avoid overwriting other concurrent updates
        pages.setPages(prevPages => prevPages.map(page => ({ ...page, shapes: [] })));
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

    // Update pages with shapes using functional update to avoid overwriting other concurrent updates
    pages.setPages(prevPages => {
      return prevPages.map((page, pageIndex) => {
        const pageShapes = shapesByPage[pageIndex] || [];
        return { ...page, shapes: pageShapes };
      });
    });
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
   * 🔁 Sync formFields back to pages whenever formFields change (for persistence)
   * Skip during active user interactions to prevent flickering
   */
  useEffect(() => {
    // CRITICAL: Skip formFields→pages sync during active user interactions
    const isInteracting = formFields.isDraggingFormField ||
                          formFields.isResizingFormField ||
                          formFields.isCreatingFormField;

    if (isInteracting) {
      return;
    }

    // Prevent circular updates: if we're currently syncing pages to formFields, skip this
    if (isSyncingPagesToFormFields.current) return;

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    if (!formFields.formFields || formFields.formFields.length === 0) {
      // If no formFields, check if this is different from what we loaded
      if (lastFormFieldsFromPages.current !== '[]') {
        isSyncingFormFieldsToPages.current = true;
        // Use functional update to avoid overwriting other concurrent updates
        pages.setPages(prevPages => prevPages.map(page => ({ ...page, formFields: [] })));
        lastFormFieldsFromPages.current = '[]';
        setTimeout(() => {
          isSyncingFormFieldsToPages.current = false;
        }, 0);
      }
      return;
    }

    // Create current formFields hash (without index property)
    const formFieldsWithoutIndex = formFields.formFields.map(({ index, ...field }) => field);
    const currentFormFieldsHash = JSON.stringify(formFieldsWithoutIndex);

    // If formFields are the same as what we loaded from pages, skip update to prevent ping-pong
    if (currentFormFieldsHash === lastFormFieldsFromPages.current) {
      return;
    }

    // Set lock to prevent the other effect from triggering
    isSyncingFormFieldsToPages.current = true;

    // Group formFields by page index
    const formFieldsByPage: Record<number, any[]> = {};
    formFields.formFields.forEach((field) => {
      const pageIdx = field.index ?? 0;
      if (!formFieldsByPage[pageIdx]) formFieldsByPage[pageIdx] = [];

      // Remove the 'index' property before storing back to pages
      const { index, ...fieldWithoutIndex } = field;
      formFieldsByPage[pageIdx].push(fieldWithoutIndex);
    });

    // Update pages with formFields using functional update to avoid overwriting other concurrent updates
    pages.setPages(prevPages => {
      return prevPages.map((page, pageIndex) => {
        const pageFormFields = formFieldsByPage[pageIndex] || [];
        return { ...page, formFields: pageFormFields };
      });
    });
    lastFormFieldsFromPages.current = currentFormFieldsHash;

    // Release lock after state updates are queued
    setTimeout(() => {
      isSyncingFormFieldsToPages.current = false;
    }, 0);

    // NOTE: Interaction flags MUST be in dependencies so effect runs when interaction ends
  }, [formFields.formFields, formFields.isDraggingFormField,
      formFields.isResizingFormField, formFields.isCreatingFormField,
      pages.pages, pages.setPages]);

  /**
   * 🔁 Sync textItems back to pages whenever textItems change (for persistence)
   * This is critical for AI-generated content to be saved to IndexedDB
   */
  useEffect(() => {
    // Prevent circular updates: if we're currently syncing pages to text, skip this
    if (isSyncingPagesToText.current) return;

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    if (!text.textItems || text.textItems.length === 0) {
      // If no textItems, check if this is different from what we loaded
      if (lastTextFromPages.current !== '[]') {
        isSyncingTextToPages.current = true;
        // Use functional update to avoid overwriting other concurrent updates
        pages.setPages(prevPages => prevPages.map(page => ({ ...page, textItems: [] })));
        lastTextFromPages.current = '[]';
        setTimeout(() => {
          isSyncingTextToPages.current = false;
        }, 0);
      }
      return;
    }

    // Create current textItems hash (without index property)
    const textWithoutIndex = text.textItems.map(({ index, ...item }: any) => item);
    const currentTextHash = JSON.stringify(textWithoutIndex);

    // If textItems are the same as what we loaded from pages, skip update to prevent ping-pong
    if (currentTextHash === lastTextFromPages.current) {
      return;
    }

    // Set lock to prevent the other effect from triggering
    isSyncingTextToPages.current = true;

    // Group textItems by page index
    const textByPage: Record<number, any[]> = {};
    text.textItems.forEach((item: any) => {
      const pageIdx = item.index ?? 0;
      if (!textByPage[pageIdx]) textByPage[pageIdx] = [];

      // Remove the 'index' property before storing back to pages
      const { index, ...itemWithoutIndex } = item;
      textByPage[pageIdx].push(itemWithoutIndex);
    });

    // Update pages with textItems using functional update to avoid overwriting other concurrent updates
    pages.setPages(prevPages => {
      return prevPages.map((page, pageIndex) => {
        const pageText = textByPage[pageIndex] || [];
        return { ...page, textItems: pageText };
      });
    });
    lastTextFromPages.current = currentTextHash;

    // Release lock after state updates are queued
    setTimeout(() => {
      isSyncingTextToPages.current = false;
    }, 0);
  }, [text.textItems, pages.pages, pages.setPages]);

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
      formFields,
      ai,
    }),
    [ui, history, pages, text, selection, textBox, images, pdf, multiline, mouse, keyboard, share, shapes, formFields, ai]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
