import { useCallback, useState } from "react";
import type { Point, ImageItem, Page } from "../types/editor";
import { readFileAsDataURL } from "../utils/files/readFileAsDataURL";
import { loadImageDimensions } from "../utils/images/loadImageDimensions";

type AddOpts = { x?: number; y?: number; scale?: number };

export function useImages() {
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [resizingImageIndex, setResizingImageIndex] = useState<number | null>(null);
  const [resizeStart, setResizeStart] = useState<Point>({ x: 0, y: 0 });

  /**
   * Hydrate global imageItems from persisted pages (adds .index to each).
   */
  const hydrateFromPages = useCallback((pages: Page[]) => {
    const merged = pages.flatMap((p, i) =>
      (p?.imageItems ?? []).map((img: any) => ({ ...img, index: i }))
    );
    setImageItems(merged as ImageItem[]);
  }, []);

  /**
   * Add an image from a File. Returns the created item so the caller can
   * also sync it into pages[pageIndex].imageItems in the Provider.
   *
   * NOTE: We keep state serializable (no HTMLImageElement in state).
   * If your draw code needs an Image(), load it on the fly from item.data.
   */
  const addImageFromFile = useCallback(
    async (file: File, pageIndex: number, opts?: AddOpts): Promise<ImageItem | null> => {
      if (!file) return null;

      // Read file and probe dimensions
      const dataUrl = await readFileAsDataURL(file);
      const { width: naturalW, height: naturalH } = await loadImageDimensions(dataUrl);

      const scale = opts?.scale ?? 0.5;
      const x = opts?.x ?? 50;
      const y = opts?.y ?? 50;

      const newItem = {
        // Keep it serializable; PDF export already uses .data in your code
        data: dataUrl,
        x,
        y,
        width: Math.round(naturalW * scale),
        height: Math.round(naturalH * scale),
        index: pageIndex, // important for per-page filtering
      } as unknown as ImageItem;

      setImageItems(prev => [...prev, newItem]);
      return newItem;
    },
    []
  );

  return {
    imageItems, setImageItems,
    isImageDragging, setIsImageDragging,
    draggedImageIndex, setDraggedImageIndex,
    selectedImageIndex, setSelectedImageIndex,
    resizingImageIndex, setResizingImageIndex,
    resizeStart, setResizeStart,
    hydrateFromPages,
    addImageFromFile,           // ← new action
  };
}