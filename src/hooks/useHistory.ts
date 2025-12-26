import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UndoRedoState, TextItem, ImageItem } from "../types/editor";
import type { ShapeItem } from "../types/shapes";
import type { AnnotationItem } from "../types/annotations";
import { remapStacksAfterPageRemoval } from "../utils/history/remapStacksAfterPageRemoval";

type Snapshot = { textItems?: TextItem[]; imageItems?: ImageItem[]; shapeItems?: ShapeItem[]; annotationItems?: AnnotationItem[] };

const MAX_SNAPSHOTS = 100;

// ---------- storage helpers ----------
const save = (k: string, v: any) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};
const load = (k: string): UndoRedoState => {
  try {
    const raw = localStorage.getItem(k);
    const obj = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [Number(k), v])) as UndoRedoState;
  } catch { return {}; }
};

// ---------- deepClone (robust) ----------
export const deepClone = <T,>(input: T): T => {
  if (typeof structuredClone === "function") {
    try { return structuredClone(input); } catch {}
  }
  return cloneFallback(input, new WeakMap()) as T;
};
function cloneFallback(value: any, seen: WeakMap<any, any>): any {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) { const re = new RegExp(value.source, value.flags); re.lastIndex = value.lastIndex; return re; }
  if (value instanceof Map) { const out = new Map(); seen.set(value, out); value.forEach((v, k) => out.set(cloneFallback(k, seen), cloneFallback(v, seen))); return out; }
  if (value instanceof Set) { const out = new Set(); seen.set(value, out); value.forEach(v => out.add(cloneFallback(v, seen))); return out; }
  if (value instanceof ArrayBuffer) return value.slice(0);
  if (ArrayBuffer.isView(value)) return new (value.constructor as any)(value as any);
  if (typeof File !== "undefined" && value instanceof File) return new File([value], value.name, { type: value.type, lastModified: value.lastModified });
  if (typeof Blob !== "undefined" && value instanceof Blob) return value.slice(0, value.size, value.type);
  if (typeof URL  !== "undefined" && value instanceof URL) return new URL(value.toString());
  if (Array.isArray(value)) { const arr: any[] = []; seen.set(value, arr); for (const i of value) arr.push(cloneFallback(i, seen)); return arr; }

  const proto = Object.getPrototypeOf(value);
  const out = Object.create(proto);
  seen.set(value, out);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [k, d] of Object.entries(descriptors)) {
    if ("value" in d) (d as PropertyDescriptor).value = cloneFallback((d as PropertyDescriptor).value, seen);
    Object.defineProperty(out, k, d);
  }
  return out;
}

// ---------- helpers ----------
const belongsToPage = (it: any, page: number) => {
  if (typeof it?.index === "number") return it.index === page;
  if (typeof it?.page === "number") return it.page === page;
  if (typeof it?.pageIndex === "number") return it.pageIndex === page;
  return false;
};

type SetItems<T> = (next: T[] | ((prev: T[]) => T[])) => void;
type TextSliceLike  = { textItems: TextItem[]; setTextItems: SetItems<TextItem> };
type ImageSliceLike = { imageItems: ImageItem[]; setImageItems: SetItems<ImageItem> };
type ShapeSliceLike = { shapeItems: ShapeItem[]; setShapeItems: SetItems<ShapeItem> };
type AnnotationSliceLike = { annotationItems: AnnotationItem[]; setAnnotationItems: SetItems<AnnotationItem> };
type PagesSliceLike = { pages: Array<{ textItems?: TextItem[]; imageItems?: ImageItem[]; shapes?: ShapeItem[]; annotations?: AnnotationItem[] }>; setPages: (updater: any) => void };

export function useHistory() {
  const [undoStack, setUndoStack] = useState<UndoRedoState>({});
  const [redoStack, setRedoStack] = useState<UndoRedoState>({});

  // Bound sources (getters + setters) stored in refs
  const getTextItemsRef = useRef<() => TextItem[]>(() => []);
  const getImageItemsRef = useRef<() => ImageItem[]>(() => []);
  const getShapeItemsRef = useRef<() => ShapeItem[]>(() => []);
  const getAnnotationItemsRef = useRef<() => AnnotationItem[]>(() => []);
  const getPagesRef     = useRef<() => PagesSliceLike["pages"]>(() => []);

  const setTextItemsRef = useRef<SetItems<TextItem> | null>(null);
  const setImageItemsRef = useRef<SetItems<ImageItem> | null>(null);
  const setShapeItemsRef = useRef<SetItems<ShapeItem> | null>(null);
  const setAnnotationItemsRef = useRef<SetItems<AnnotationItem> | null>(null);
  const setPagesRef      = useRef<PagesSliceLike["setPages"] | null>(null);

  const isBoundRef = useRef(false);

  useEffect(() => {
    setUndoStack(load("undoStack"));
    setRedoStack(load("redoStack"));
  }, []);

  // Low-level binder (pass functions)
  const bindSources = useCallback((
    getTextItems: () => TextItem[],
    getImageItems: () => ImageItem[],
    setTextItems?: SetItems<TextItem>,
    setImageItems?: SetItems<ImageItem>,
    getPages?: () => PagesSliceLike["pages"],
    setPages?: PagesSliceLike["setPages"],
  ) => {
    getTextItemsRef.current = getTextItems;
    getImageItemsRef.current = getImageItems;
    if (setTextItems) setTextItemsRef.current = setTextItems;
    if (setImageItems) setImageItemsRef.current = setImageItems;

    if (getPages) getPagesRef.current = getPages;
    if (setPages) setPagesRef.current = setPages;

    isBoundRef.current = true;
  }, []);

  // High-level binder (pass slices)
  const bindFromSlices = useCallback(
    (text: TextSliceLike, images: ImageSliceLike, pages?: PagesSliceLike, shapes?: ShapeSliceLike, annotations?: AnnotationSliceLike) => {
      getTextItemsRef.current  = () => text.textItems;
      getImageItemsRef.current = () => images.imageItems;
      setTextItemsRef.current  = text.setTextItems;
      setImageItemsRef.current = images.setImageItems;

      if (shapes) {
        getShapeItemsRef.current = () => shapes.shapeItems;
        setShapeItemsRef.current = shapes.setShapeItems;
      }

      if (annotations) {
        getAnnotationItemsRef.current = () => annotations.annotationItems;
        setAnnotationItemsRef.current = annotations.setAnnotationItems;
      }

      if (pages) {
        getPagesRef.current = () => pages.pages;
        setPagesRef.current = pages.setPages;
      }
      isBoundRef.current = true;
    },
    []
  );

  const takeCurrentPageSnapshot = useCallback((page: number): Snapshot => {
    if (!isBoundRef.current) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[history] Not bound yet. Call history.bindFromSlices(text, images, pages, shapes, annotations) in your Provider.");
      }
      return { textItems: [], imageItems: [], shapeItems: [], annotationItems: [] };
    }
    const textItems = getTextItemsRef.current();
    const imageItems = getImageItemsRef.current();
    const shapeItems = getShapeItemsRef.current();
    const annotationItems = getAnnotationItemsRef.current();

    const textOnPage = (textItems || []).filter(it => belongsToPage(it, page)).map(deepClone);
    const imgsOnPage = (imageItems || []).filter(it => belongsToPage(it, page)).map(deepClone);
    const shapesOnPage = (shapeItems || []).filter(it => belongsToPage(it, page)).map(deepClone);
    const annotationsOnPage = (annotationItems || []).filter(it => belongsToPage(it, page)).map(deepClone);

    if (process.env.NODE_ENV !== "production") {
      if ((textItems?.length ?? 0) > 0 && textOnPage.length === 0) {
        console.warn(`[history] No textItems matched page ${page}. Ensure items carry {index|page|pageIndex}.`);
      }
      if ((imageItems?.length ?? 0) > 0 && imgsOnPage.length === 0) {
        console.warn(`[history] No imageItems matched page ${page}. Ensure items carry {index|page|pageIndex}.`);
      }
      if ((shapeItems?.length ?? 0) > 0 && shapesOnPage.length === 0) {
        console.warn(`[history] No shapeItems matched page ${page}. Ensure items carry {index|page|pageIndex}.`);
      }
      if ((annotationItems?.length ?? 0) > 0 && annotationsOnPage.length === 0) {
        console.warn(`[history] No annotationItems matched page ${page}. Ensure items carry {index|page|pageIndex}.`);
      }
    }

    return { textItems: textOnPage, imageItems: imgsOnPage, shapeItems: shapesOnPage, annotationItems: annotationsOnPage };
  }, []);

  /**
   * 🔧 Apply snapshot to *both* flat slices and the pages slice for `page`.
   * This was the missing piece that made applyPageSnapshot look like it "didn't work".
   */
  const applyPageSnapshot = useCallback((page: number, snap?: Snapshot) => {
    if (!snap) return;

    const setText  = setTextItemsRef.current;
    const setImage = setImageItemsRef.current;
    const setShape = setShapeItemsRef.current;
    const setAnnotation = setAnnotationItemsRef.current;
    const setPages = setPagesRef.current;

    if (!setText || !setImage) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[history] Setters not bound. Call bindFromSlices or bindSources with setters.");
      }
      return;
    }

    const currentText = getTextItemsRef.current();
    const currentImgs = getImageItemsRef.current();
    const currentShapes = getShapeItemsRef.current();
    const currentAnnotations = getAnnotationItemsRef.current();

    const nextText = [
      ...currentText.filter(it => !belongsToPage(it, page)),
      ...((snap.textItems || []).map(x => deepClone(x))),
    ];
    const nextImgs = [
      ...currentImgs.filter(it => !belongsToPage(it, page)),
      ...((snap.imageItems || []).map(x => deepClone(x))),
    ];
    const nextShapes = [
      ...currentShapes.filter(it => !belongsToPage(it, page)),
      ...((snap.shapeItems || []).map(x => deepClone(x))),
    ];
    const nextAnnotations = [
      ...currentAnnotations.filter(it => !belongsToPage(it, page)),
      ...((snap.annotationItems || []).map(x => deepClone(x))),
    ];

    // 1) Update flat slices
    setText(nextText);
    setImage(nextImgs);
    if (setShape) setShape(nextShapes);
    if (setAnnotation) setAnnotation(nextAnnotations);

    // 2) Update pages slice (if bound)
    if (setPages) {
      const nextPageText = (snap.textItems || []).map(x => deepClone(x));
      const nextPageImgs = (snap.imageItems || []).map(x => deepClone(x));
      const nextPageShapes = (snap.shapeItems || []).map(x => deepClone(x));
      const nextPageAnnotations = (snap.annotationItems || []).map(x => deepClone(x));

      setPages((prev: PagesSliceLike["pages"]) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const pageObj = next[page] || { textItems: [], imageItems: [], shapes: [], annotations: [] };
        next[page] = {
          ...pageObj,
          textItems: nextPageText,
          imageItems: nextPageImgs,
          shapes: nextPageShapes,
          annotations: nextPageAnnotations,
        };
        return next;
      });
    }
  }, []);

  // Capture snapshot and clear redo for that page
  const pushSnapshotToUndo = useCallback((page: number) => {
    const snap = takeCurrentPageSnapshot(page);
    setUndoStack(prev => {
      const stack = (prev as any)[page] || [];
      const updated = [...stack, snap];
      if (updated.length > MAX_SNAPSHOTS) updated.shift();
      const next = { ...(prev as any), [page]: updated };
      save("undoStack", next);
      return next;
    });
    setRedoStack(prev => {
      const next = { ...(prev as any), [page]: [] };
      save("redoStack", next);
      return next;
    });
  }, [takeCurrentPageSnapshot]);

  // UNDO
  const fnUndoStack = useCallback((page: number) => {
    const pageUndo: Snapshot[] = (undoStack as any)[page] || [];
    if (pageUndo.length === 0) return false;

    const currentSnap = takeCurrentPageSnapshot(page);
    const snapToApply = pageUndo[pageUndo.length - 1];

    setRedoStack(prev => {
      const stack: Snapshot[] = (prev as any)[page] || [];
      const updated = [...stack, currentSnap];
      const next = { ...(prev as any), [page]: updated };
      save("redoStack", next);
      return next;
    });

    setUndoStack(prev => {
      const stack: Snapshot[] = (prev as any)[page] || [];
      const updated = stack.slice(0, -1);
      const next = { ...(prev as any), [page]: updated };
      save("undoStack", next);
      return next;
    });

    applyPageSnapshot(page, snapToApply);
    return true;
  }, [undoStack, takeCurrentPageSnapshot, applyPageSnapshot]);

  // REDO
  const fnRedoStack = useCallback((page: number) => {
    const pageRedo: Snapshot[] = (redoStack as any)[page] || [];
    if (pageRedo.length === 0) return false;

    const currentSnap = takeCurrentPageSnapshot(page);
    const snapToApply = pageRedo[pageRedo.length - 1];

    setUndoStack(prev => {
      const stack: Snapshot[] = (prev as any)[page] || [];
      const updated = [...stack, currentSnap];
      const next = { ...(prev as any), [page]: updated };
      save("undoStack", next);
      return next;
    });

    setRedoStack(prev => {
      const stack: Snapshot[] = (prev as any)[page] || [];
      const updated = stack.slice(0, -1);
      const next = { ...(prev as any), [page]: updated };
      save("redoStack", next);
      return next;
    });

    applyPageSnapshot(page, snapToApply);
    return true;
  }, [redoStack, takeCurrentPageSnapshot, applyPageSnapshot]);

  const purgeUndoRedoForRemovedPage = useCallback((removedPage: number) => {
    setUndoStack(prev => {
      const rebuilt = remapStacksAfterPageRemoval(prev, removedPage);
      save("undoStack", rebuilt);
      return rebuilt;
    });
    setRedoStack(prev => {
      const rebuilt = remapStacksAfterPageRemoval(prev, removedPage);
      save("redoStack", rebuilt);
      return rebuilt;
    });
  }, []);

  const api = useMemo(() => ({
    undoStack,
    redoStack,
    bindSources,      // low-level (functions)
    bindFromSlices,   // high-level (pass slices, include pages if you want pages updates)
    pushSnapshotToUndo,
    purgeUndoRedoForRemovedPage,
    fnUndoStack,
    fnRedoStack,
    setUndoStack,
    setRedoStack,
  }), [
    undoStack,
    redoStack,
    bindSources,
    bindFromSlices,
    pushSnapshotToUndo,
    purgeUndoRedoForRemovedPage,
    fnUndoStack,
    fnRedoStack
  ]);

  return api;
}
