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
import { useAnnotations } from '../hooks/useAnnotations';
import { useTemplates } from '../hooks/useTemplates';
import { useAlignmentGuides } from '../hooks/useAlignmentGuides';

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
  annotations: ReturnType<typeof useAnnotations>;
  templates: ReturnType<typeof useTemplates>;
  alignmentGuides: ReturnType<typeof useAlignmentGuides>;
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
  const annotations = useAnnotations();
  const templates = useTemplates();
  const alignmentGuides = useAlignmentGuides();

  // Keep latest slices in refs so history bindings always read current data
  const textRef = useRef(text);
  const imagesRef = useRef(images);
  const shareRef = useRef(share);
  const shapesRef = useRef(shapes);
  const formFieldsRef = useRef(formFields);
  const annotationsRef = useRef(annotations);

  // Sync locks to prevent circular updates
  const isSyncingPagesToShapes = useRef(false);
  const isSyncingShapesToPages = useRef(false);
  const isSyncingPagesToFormFields = useRef(false);
  const isSyncingFormFieldsToPages = useRef(false);
  const isSyncingPagesToText = useRef(false);
  const isSyncingTextToPages = useRef(false);
  const isSyncingPagesToImages = useRef(false);
  const isSyncingImagesToPages = useRef(false);
  const isSyncingPagesToAnnotations = useRef(false);
  const isSyncingAnnotationsToPages = useRef(false);
  // Store last synced hashes to prevent ping-pong
  const lastShapesFromPages = useRef<string | null>(null);
  const lastFormFieldsFromPages = useRef<string | null>(null);
  const lastTextFromPages = useRef<string | null>(null);
  const lastImagesFromPages = useRef<string | null>(null);
  const lastAnnotationsFromPages = useRef<string | null>(null);

  useEffect(() => {
    textRef.current = text;
    imagesRef.current = images;
    shareRef.current = share;
    shapesRef.current = shapes;
    formFieldsRef.current = formFields;
    annotationsRef.current = annotations;
  }, [text, images, share, shapes, formFields, annotations]);

  /**
   * 🔁 Re-hydrate text, image, and shape stores from pages (single source of truth)
   * This ensures all pages are reflected in item stores
   */
  useEffect(() => {
    // Prevent circular updates: if we're currently syncing items to pages, skip this
    if (isSyncingShapesToPages.current) return;
    if (isSyncingFormFieldsToPages.current) return;
    if (isSyncingTextToPages.current) return;
    if (isSyncingImagesToPages.current) return;
    if (isSyncingAnnotationsToPages.current) return;

    // CRITICAL: Skip pages→items sync during active user interactions
    // Otherwise updatePageItems will trigger this effect, which rehydrates items
    // from pages with OLD positions, overwriting the current changes
    if (selection.isDraggingMixedItems) return;

    // CRITICAL: Skip pages→items sync during image interactions to prevent flickering
    // Also check draggedImageIndex - it's set on click but isImageDragging is only set on actual drag
    const isImageInteracting = images.isImageDragging || images.resizingImageIndex !== null || images.draggedImageIndex !== null;
    if (isImageInteracting) return;

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
    isSyncingPagesToImages.current = true;
    isSyncingPagesToAnnotations.current = true;

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
    const allAnnotations = pageList.flatMap((p, pageIndex) =>
      (p?.annotations ?? []).map((item) => ({ ...item, index: pageIndex }))
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

    // Store hash of images we just loaded (without index and data properties for comparison)
    // Exclude 'data' from hash as it's large and doesn't change during drag/resize
    const imagesWithoutIndexAndData = allImages.map(({ index, data, ...img }) => img);
    const newImagesHash = JSON.stringify(imagesWithoutIndexAndData);

    // Store hash of annotations we just loaded (without index property for comparison)
    const annotationsWithoutIndex = allAnnotations.map(({ index, ...annotation }) => annotation);
    lastAnnotationsFromPages.current = JSON.stringify(annotationsWithoutIndex);

    // Update item stores
    // Only sync text and shapes from pages if NOT in viewer mode
    // In viewer mode, both text and shapes come directly from the broadcast
    if (!isViewer) {
      text.setTextItems?.(allText);
      shapes.setShapeItems?.(allShapes);
      formFields.setFormFields?.(allFormFields);
      annotations.setAnnotationItems?.(allAnnotations);
    }

    // Images sync from pages - only update if hash differs to prevent unnecessary re-renders
    // This prevents flickering when images→pages sync has already updated pages with current state
    // Also skip if we already have images and we're not in viewer mode (images are source of truth)
    const shouldUpdateImages = newImagesHash !== lastImagesFromPages.current &&
                               (isViewer || images.imageItems.length === 0 || allImages.length !== images.imageItems.length);
    if (shouldUpdateImages) {
      images.setImageItems?.(allImages);
      lastImagesFromPages.current = newImagesHash;
    }

    // Release locks after state updates are queued
    setTimeout(() => {
      isSyncingPagesToShapes.current = false;
      isSyncingPagesToFormFields.current = false;
      isSyncingPagesToText.current = false;
      isSyncingPagesToImages.current = false;
      isSyncingPagesToAnnotations.current = false;
    }, 0);
  }, [pages.pages, text.setTextItems, images.setImageItems, shapes.setShapeItems, formFields.setFormFields, annotations.setAnnotationItems, selection.isDraggingMixedItems, share.mode]);

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
                          formFields.isDraggingMultipleFormFields ||
                          formFields.isResizingFormField ||
                          formFields.isCreatingFormField ||
                          selection.isDraggingMixedItems;

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
  }, [formFields.formFields, formFields.isDraggingFormField, formFields.isDraggingMultipleFormFields,
      formFields.isResizingFormField, formFields.isCreatingFormField, selection.isDraggingMixedItems,
      pages.pages, pages.setPages]);

  // Track if actual image modification occurred (drag or resize, not just click)
  const wasImageModified = useRef(false);

  /**
   * 🔁 Sync imageItems back to pages whenever imageItems change (for persistence)
   * Skip during active interactions but sync when interaction ends
   */
  useEffect(() => {
    // Check for actual position-modifying interactions (not just click/selection)
    const isModifying = images.isImageDragging || images.resizingImageIndex !== null;
    // Check for any interaction (including click/selection)
    const isInteracting = isModifying || images.draggedImageIndex !== null;

    // Track if actual modification occurred
    if (isModifying) {
      wasImageModified.current = true;
    }

    // Skip sync during any interaction
    if (isInteracting) {
      return;
    }

    // If no actual modification occurred (just a click), skip sync
    const modificationJustEnded = wasImageModified.current;
    wasImageModified.current = false;

    if (!modificationJustEnded) {
      return; // Just a click, no need to sync
    }

    // Prevent circular updates: if we're currently syncing pages to images, skip this
    if (isSyncingPagesToImages.current) return;

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    if (!images.imageItems || images.imageItems.length === 0) {
      // If no imageItems, check if this is different from what we loaded
      if (lastImagesFromPages.current !== '[]') {
        isSyncingImagesToPages.current = true;
        pages.setPages(prevPages => prevPages.map(page => ({ ...page, imageItems: [] })));
        lastImagesFromPages.current = '[]';
        setTimeout(() => {
          isSyncingImagesToPages.current = false;
        }, 0);
      }
      return;
    }

    // Create current imageItems hash (without index and data properties)
    const imagesWithoutIndexAndData = images.imageItems.map(({ index, data, ...img }: any) => img);
    const currentImagesHash = JSON.stringify(imagesWithoutIndexAndData);

    // If imageItems are the same as what we loaded from pages, skip update
    if (currentImagesHash === lastImagesFromPages.current) {
      return;
    }

    // Set lock to prevent the other effect from triggering
    isSyncingImagesToPages.current = true;

    // Group imageItems by page index
    const imagesByPage: Record<number, any[]> = {};
    images.imageItems.forEach((img: any) => {
      const pageIdx = img.index ?? 0;
      if (!imagesByPage[pageIdx]) imagesByPage[pageIdx] = [];
      const { index, ...imgWithoutIndex } = img;
      imagesByPage[pageIdx].push(imgWithoutIndex);
    });

    // Update pages with imageItems
    pages.setPages(prevPages => {
      return prevPages.map((page, pageIndex) => {
        const pageImages = imagesByPage[pageIndex] || [];
        return { ...page, imageItems: pageImages };
      });
    });
    lastImagesFromPages.current = currentImagesHash;

    // Also save to IndexedDB when sync happens
    images.saveImageItemsToIndexedDB?.(images.imageItems);

    setTimeout(() => {
      isSyncingImagesToPages.current = false;
    }, 0);
  }, [images.imageItems, images.isImageDragging, images.resizingImageIndex, images.draggedImageIndex, pages.pages, pages.setPages]);

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
   * 🔁 Sync annotations back to pages whenever annotations change (for persistence)
   * Skip during active user interactions to prevent flickering
   */
  useEffect(() => {
    // CRITICAL: Skip annotations→pages sync during active user interactions
    const isInteracting = annotations.isSelectingText || selection.isDraggingMixedItems;

    if (isInteracting) {
      return;
    }

    // Prevent circular updates: if we're currently syncing pages to annotations, skip this
    if (isSyncingPagesToAnnotations.current) return;

    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    if (!annotations.annotationItems || annotations.annotationItems.length === 0) {
      // If no annotations, check if this is different from what we loaded
      if (lastAnnotationsFromPages.current !== '[]') {
        isSyncingAnnotationsToPages.current = true;
        pages.setPages(prevPages => prevPages.map(page => ({ ...page, annotations: [] })));
        lastAnnotationsFromPages.current = '[]';
        setTimeout(() => {
          isSyncingAnnotationsToPages.current = false;
        }, 0);
      }
      return;
    }

    // Create current annotations hash (without index property)
    const annotationsWithoutIndex = annotations.annotationItems.map(({ index, ...annotation }) => annotation);
    const currentAnnotationsHash = JSON.stringify(annotationsWithoutIndex);

    // If annotations are the same as what we loaded from pages, skip update to prevent ping-pong
    if (currentAnnotationsHash === lastAnnotationsFromPages.current) {
      return;
    }

    // Set lock to prevent the other effect from triggering
    isSyncingAnnotationsToPages.current = true;

    // Group annotations by page index
    const annotationsByPage: Record<number, any[]> = {};
    annotations.annotationItems.forEach((annotation) => {
      const pageIdx = annotation.index ?? 0;
      if (!annotationsByPage[pageIdx]) annotationsByPage[pageIdx] = [];

      // Remove the 'index' property before storing back to pages
      const { index, ...annotationWithoutIndex } = annotation;
      annotationsByPage[pageIdx].push(annotationWithoutIndex);
    });

    // Update pages with annotations using functional update
    pages.setPages(prevPages => {
      return prevPages.map((page, pageIndex) => {
        const pageAnnotations = annotationsByPage[pageIndex] || [];
        return { ...page, annotations: pageAnnotations };
      });
    });
    lastAnnotationsFromPages.current = currentAnnotationsHash;

    // Release lock after state updates are queued
    setTimeout(() => {
      isSyncingAnnotationsToPages.current = false;
    }, 0);
  }, [annotations.annotationItems, annotations.isSelectingText, selection.isDraggingMixedItems, pages.pages, pages.setPages]);

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

  // inside EditorProvider - use refs for stable bindings that always read current state
useLayoutEffect(() => {
  history.bindFromSlices(
    // Use refs to always get current state, avoiding stale closures
    {
      get textItems() { return textRef.current.textItems; },
      setTextItems: (next: any) => textRef.current.setTextItems(next),
    },
    {
      get imageItems() { return imagesRef.current.imageItems; },
      setImageItems: (next: any) => imagesRef.current.setImageItems(next),
    },
    pages,
    {
      get shapeItems() { return shapesRef.current.shapeItems; },
      setShapeItems: (next: any) => shapesRef.current.setShapeItems(next),
    },
    {
      get annotationItems() { return annotationsRef.current.annotationItems; },
      setAnnotationItems: (next: any) => annotationsRef.current.setAnnotationItems(next),
    }
  );
}, [history, pages]);

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
      annotations,
      templates,
      alignmentGuides,
    }),
    [ui, history, pages, text, selection, textBox, images, pdf, multiline, mouse, keyboard, share, shapes, formFields, ai, annotations, templates, alignmentGuides]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
