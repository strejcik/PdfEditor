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
    // const merged = pages.flatMap((p, i) =>
    //   (p?.imageItems ?? []).map((img: any) => ({ ...img, index: i }))
    // );
    // setImageItems(merged as ImageItem[]);
  }, []);

  /**
   * Add an image from a File. Returns the created item so the caller can
   * also sync it into pages[pageIndex].imageItems in the Provider.
   *
   * NOTE: We keep state serializable (no HTMLImageElement in state).
   * If your draw code needs an Image(), load it on the fly from item.data.
   */
 type AddOpts = {
  x?: number;
  y?: number;
  scale?: number;
  // optional, if you want normalized fields persisted too
  canvasWidth?: number;
  canvasHeight?: number;
};

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

const addImageFromFile = useCallback(
  async (file: File, pageIndex: number, opts?: AddOpts): Promise<ImageItem | null> => {
    if (!file) return null;
    // 1) Read file + probe intrinsic size
    const dataUrl = await readFileAsDataURL(file);
    const { width: naturalW, height: naturalH } = await loadImageDimensions(dataUrl);

    // 2) Placement & sizing
    const scale  = opts?.scale ?? 0.5;
    const x      = Math.round(opts?.x ?? 50);
    const y      = Math.round(opts?.y ?? 50);
    const width  = Math.round(naturalW * scale);
    const height = Math.round(naturalH * scale);

    // 3) Optional normalized fields (if caller provides canvas dims)
    const xNorm =
      typeof opts?.canvasWidth === "number" && opts.canvasWidth > 0
        ? x / opts.canvasWidth
        : undefined;
    const yNormTop =
      typeof opts?.canvasHeight === "number" && opts.canvasHeight > 0
        ? y / opts.canvasHeight
        : undefined;
    const widthNorm =
      typeof opts?.canvasWidth === "number" && opts.canvasWidth > 0
        ? width / opts.canvasWidth
        : undefined;
    const heightNorm =
      typeof opts?.canvasHeight === "number" && opts.canvasHeight > 0
        ? height / opts.canvasHeight
        : undefined;

    const newItem = {
      type: "image",
      data: dataUrl,          // base64 data URI
      x, y, width, height,    // CSS px (top-left)
      index: pageIndex,
      ...(xNorm !== undefined ? { xNorm } : {}),
      ...(yNormTop !== undefined ? { yNormTop } : {}),
      ...(widthNorm !== undefined ? { widthNorm } : {}),
      ...(heightNorm !== undefined ? { heightNorm } : {}),
      pixelWidth: naturalW,
      pixelHeight: naturalH,
    } as unknown as ImageItem;

    // 4) Update global imageItems
    setImageItems?.((prev: ImageItem[] = []) => {
      const merged = [...prev, newItem];
      saveImageItemsToLocalStorage?.(merged);
      return merged;
    });

    // 5) Update per-page slice in `pages`
    pages.setPages?.((prev: any[]) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const page = next[pageIndex] || { textItems: [], imageItems: [] };

      // Copy existing
      const currentImages = Array.isArray(page.imageItems) ? [...page.imageItems] : [];

      // Check uniqueness (by data + index; adapt if you prefer id/ref)
      const exists = currentImages.some(
        (img) => img.data === newItem.data && img.index === newItem.index
      );

      next[pageIndex] = {
        ...page,
        textItems: Array.isArray(page.textItems) ? [...page.textItems] : [],
        imageItems: exists ? currentImages : [...currentImages, { ...newItem }],
      };
      

      return next;
    });

    return newItem;
  },
  []
);





const handleAddImage = useCallback(
    async (e:any, activePage:number) => {
      console.log('aaaaaaaaaa');
      const file = e.target.files?.[0];
      if (!file) return;
      history.pushSnapshotToUndo(activePage);        // snapshot BEFORE mutation
      e.target.value = ""; // allow re-selecting same file
      await addImageFromFile(file, activePage, { x: 50, y: 50, scale: 0.5 });

      // If you don't use the effect-driven draw yet, force a draw:
      // drawCanvas(activePage);
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