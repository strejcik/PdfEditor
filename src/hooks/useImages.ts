import { useCallback, useState } from "react";
import type { Point, ImageItem, Page } from "../types/editor";
import { readFileAsDataURL } from "../utils/files/readFileAsDataURL";
import { loadImageDimensions } from "../utils/images/loadImageDimensions";
import { useHistory } from "../hooks/useHistory";
import { usePages } from "../hooks/usePages";
type AddOpts = { x?: number; y?: number; scale?: number };


export function useImages() {
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [resizingImageIndex, setResizingImageIndex] = useState<number | null>(null);
  const [resizeStart, setResizeStart] = useState<Point>({ x: 0, y: 0 });

  const pages = usePages();
  const history = useHistory();

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

const saveImageItemsToLocalStorage = useCallback(
    async (items:any) => {
  const serializedImages = items.map((item:ImageItem) => {
    // if(item.index === activePage) {
      
    // }
    return {
      data: item.data, // Save base64 data
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      index: item.index
    }
  });
  // if(serializedImages.length > 0) {
    
  // }
  localStorage.setItem('imageItems', JSON.stringify(serializedImages));
},[]);


const handleAddImage = useCallback(
    async (e:any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      history.pushSnapshotToUndo(pages.activePage);        // snapshot BEFORE mutation
      await addImageFromFile(file, pages.activePage, { x: 50, y: 50, scale: 0.5 });

      // If you don't use the effect-driven draw yet, force a draw:
      // drawCanvas(activePage);

      e.target.value = ""; // allow re-selecting same file
},[]);

// Utility function to create an Image element from base64 data
const createImageElement = useCallback(
    (data:any) => {
      const img = new Image();
      img.src = data;
      return img;
},[]);



  return {
    imageItems, setImageItems,
    isImageDragging, setIsImageDragging,
    draggedImageIndex, setDraggedImageIndex,
    selectedImageIndex, setSelectedImageIndex,
    resizingImageIndex, setResizingImageIndex,
    resizeStart, setResizeStart,
    hydrateFromPages,
    addImageFromFile,           // ← new action
    handleAddImage,
    saveImageItemsToLocalStorage,
    createImageElement
  };
}