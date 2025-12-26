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
 type AddOpts = {
  x?: number;
  y?: number;
  scale?: number;
  // optional, if you want normalized fields persisted too
  canvasWidth?: number;
  canvasHeight?: number;
  setPages:any
};

/** Opens (or creates) an IndexedDB named "PdfEditorDB" with objectStore "imageItems" */
function openImageItemsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PdfEditorDB", 8);
    request.onupgradeneeded = (event:any) => {
      const db = event.target.result;
      // Create stores if missing (we can future-proof by ensuring both exist)
      if (!db.objectStoreNames.contains("textItems")) {
        db.createObjectStore("textItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("imageItems")) {
        db.createObjectStore("imageItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pages")) {
        db.createObjectStore("pages", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("shapes")) {
        db.createObjectStore("shapes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("formFields")) {
        db.createObjectStore("formFields", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("credentials")) {
        db.createObjectStore("credentials", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save imageItems to IndexedDB */
const saveImageItemsToIndexedDB = useCallback(async (items:any) => {
  if (!window.indexedDB) {
    console.error("IndexedDB not supported in this browser.");
    return;
  }

  try {
    const db:any = await openImageItemsDB();
    const tx = db.transaction("imageItems", "readwrite");
    const store = tx.objectStore("imageItems");

    // Serialize image data (preserving your structure)
    const serializedImages = (items || []).map((item:any) => ({
      data: item.data, // base64 data
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      index: item.index,
      xNorm: item.xNorm,
      yNormTop: item.yNormTop,
      widthNorm: item.widthNorm,
      heightNorm: item.heightNorm,
    }));

    // Store a single record under a fixed key ("main")
    store.put({ id: "main", data: serializedImages });

    await new Promise((resolve:any, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (err) {
    console.error("Failed to save imageItems to IndexedDB", err);
  }
}, []);

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
      data: dataUrl,          // base64 data URI
      x, y, width, height,    // CSS px (top-left)
      index: pageIndex,
      ...(xNorm !== undefined ? { xNorm } : {}),
      ...(yNormTop !== undefined ? { yNormTop } : {}),
      ...(widthNorm !== undefined ? { widthNorm } : {}),
      ...(heightNorm !== undefined ? { heightNorm } : {}),
    } as unknown as ImageItem;

    

    // 4) Update global imageItems
    setImageItems?.((prev: ImageItem[] = []) => {
      const merged = [...prev, newItem];
      saveImageItemsToIndexedDB?.(merged);
      return merged;
    });
    // 5) Update per-page slice in `pages`
    opts?.setPages?.((prev: any[]) => {
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


// Resolve image rect in CSS units (prefers normalized fields).
function resolveImageRectCss(item:any, canvas:any) {
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width;
  const cssH = rect.height;

  const hasNormPos  = (item.xNorm != null) && (item.yNormTop != null);
  const hasNormSize = (item.widthNorm != null) && (item.heightNorm != null);

  // ❌ no clamp on positions
  const x = hasNormPos  ? Number(item.xNorm)    * cssW : (Number(item.x)      || 0);
  const y = hasNormPos  ? Number(item.yNormTop) * cssH : (Number(item.y)      || 0);

  // No clamp on size either; just coerce to finite and >= 0
  const wPx = hasNormSize ? Number(item.widthNorm)  * cssW : (Number(item.width)  || 0);
  const hPx = hasNormSize ? Number(item.heightNorm) * cssH : (Number(item.height) || 0);
  const w = Number.isFinite(wPx) ? Math.max(0, wPx) : 0;
  const h = Number.isFinite(hPx) ? Math.max(0, hPx) : 0;

  return { x, y, w, h, cssW, cssH };
}





const handleAddImage = useCallback(
    async (e:any, activePage:number, setPages: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      history.pushSnapshotToUndo(activePage);        // snapshot BEFORE mutation
      e.target.value = ""; // allow re-selecting same file
      await addImageFromFile(file, activePage, { x: 50, y: 50, scale: 0.5, canvasHeight:842, canvasWidth: 595, setPages});

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

  // Layer panel functions
  // Toggle image visibility
  const toggleImageVisibility = useCallback((index: number) => {
    setImageItems((prev) =>
      prev.map((img, i) => i === index ? { ...img, visible: !(img.visible ?? true) } : img)
    );
  }, []);

  // Toggle image lock
  const toggleImageLock = useCallback((index: number) => {
    setImageItems((prev) =>
      prev.map((img, i) => i === index ? { ...img, locked: !img.locked } : img)
    );
  }, []);

  // Update image name
  const updateImageName = useCallback((index: number, name: string) => {
    setImageItems((prev) =>
      prev.map((img, i) => i === index ? { ...img, name } : img)
    );
  }, []);

  // Set image z-index directly
  const setImageZIndex = useCallback((index: number, zIndex: number) => {
    setImageItems((prev) =>
      prev.map((img, i) => i === index ? { ...img, zIndex } : img)
    );
  }, []);

  // Z-index actions for layering
  const bringImageForward = useCallback((index: number) => {
    setImageItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const currentZ = item.zIndex ?? -100;
      return prev.map((img, i) => i === index ? { ...img, zIndex: currentZ + 1 } : img);
    });
  }, []);

  const sendImageBackward = useCallback((index: number) => {
    setImageItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const currentZ = item.zIndex ?? -100;
      return prev.map((img, i) => i === index ? { ...img, zIndex: currentZ - 1 } : img);
    });
  }, []);

  const bringImageToFront = useCallback((index: number) => {
    setImageItems((prev) => {
      const maxZ = Math.max(...prev.map(img => img.zIndex ?? -100), -100);
      return prev.map((img, i) => i === index ? { ...img, zIndex: maxZ + 1 } : img);
    });
  }, []);

  const sendImageToBack = useCallback((index: number) => {
    setImageItems((prev) => {
      const minZ = Math.min(...prev.map(img => img.zIndex ?? -100), -100);
      return prev.map((img, i) => i === index ? { ...img, zIndex: minZ - 1 } : img);
    });
  }, []);

  return {
    imageItems, setImageItems,
    isImageDragging, setIsImageDragging,
    draggedImageIndex, setDraggedImageIndex,
    selectedImageIndex, setSelectedImageIndex,
    resizingImageIndex, setResizingImageIndex,
    resizeStart, setResizeStart,
    hydrateFromPages,
    addImageFromFile,
    handleAddImage,
    saveImageItemsToIndexedDB,
    createImageElement,
    resolveImageRectCss,

    // Z-index layering
    bringImageForward,
    sendImageBackward,
    bringImageToFront,
    sendImageToBack,

    // Layer panel functions
    toggleImageVisibility,
    toggleImageLock,
    updateImageName,
    setImageZIndex,
  };
}