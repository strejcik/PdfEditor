import { useCallback, useState } from "react";
import type { Point, ImageItem, Page } from "../types/editor";

export function useImages() {
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [resizingImageIndex, setResizingImageIndex] = useState<number | null>(null);
  const [resizeStart, setResizeStart] = useState<Point>({ x: 0, y: 0 });


  const hydrateFromPages = useCallback((pages: Page[]) => {
    const merged = pages.flatMap((p, i) =>
      (p?.imageItems ?? []).map((img: any) => ({ ...img, index: i }))
    );
    setImageItems(merged);
  }, []);

  
  return {
    imageItems, setImageItems,
    isImageDragging, setIsImageDragging,
    draggedImageIndex, setDraggedImageIndex,
    selectedImageIndex, setSelectedImageIndex,
    resizingImageIndex, setResizingImageIndex,
    resizeStart, setResizeStart,
    hydrateFromPages
  };
}