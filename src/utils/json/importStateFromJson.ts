// utils/importStateFromJson.ts
type ImportOpts = {
  // Optional React setters if you want to hydrate UI immediately after load
  setPages?: (next: any[]) => void;
  setTextItems?: (next: any[]) => void;
  setImageItems?: (next: any[]) => void;
  setShapeItems?: (next: any[]) => void;

  // LocalStorage keys (override if you use different ones)
  pagesKey?: string;
  textItemsKey?: string;
  imageItemsKey?: string;
  shapeItemsKey?: string;

  // IndexedDB save functions
  saveTextItemsToIndexedDB?: (items: any[]) => Promise<void>;
  saveImageItemsToIndexedDB?: (items: any[]) => Promise<void>;
  saveShapeItemsToIndexedDB?: (items: any[]) => Promise<void>;
  savePagesToIndexedDB?: (pages: any[]) => Promise<void>;
};

const safeParse = <T = any>(raw: string): T => {
  // Handles both plain JSON and "double-encoded" JSON (stringified twice)
  const first = JSON.parse(raw);
  if (typeof first === "string") {
    try { return JSON.parse(first) as T; } catch { return first as unknown as T; }
  }
  return first as T;
};

const isPageShape = (p: any) =>
  p && typeof p === "object" &&
  Array.isArray(p.textItems) &&
  Array.isArray(p.imageItems);

export async function importStateFromJson(file: File, opts: ImportOpts = {}) {
  if (!file) throw new Error("No file provided");
  const {
    setPages, setTextItems, setImageItems, setShapeItems,
    pagesKey = "pages",
    textItemsKey = "textItems",
    imageItemsKey = "imageItems",
    shapeItemsKey = "shapeItems",
    saveTextItemsToIndexedDB,
    saveImageItemsToIndexedDB,
    saveShapeItemsToIndexedDB,
    savePagesToIndexedDB,
  } = opts;

  const text = await file.text();
  const payload = safeParse<{
    pages?: any[];
    textItems?: any[];
    imageItems?: any[];
    shapeItems?: any[];
  }>(text);

  // 1) Extract arrays (tolerate missing fields)
  let pages = Array.isArray(payload.pages) ? payload.pages : null;
  const textItems = Array.isArray(payload.textItems) ? payload.textItems : [];
  const imageItems = Array.isArray(payload.imageItems) ? payload.imageItems : [];
  const shapeItems = Array.isArray(payload.shapeItems) ? payload.shapeItems : [];

  // 2) If pages malformed/missing, rebuild from flat arrays
  if (!pages || !pages.every(isPageShape)) {
    const maxIndex = Math.max(
      -1,
      ...textItems.map((t) => Number.isFinite(t?.index) ? Number(t.index) : -1),
      ...imageItems.map((i) => Number.isFinite(i?.index) ? Number(i.index) : -1),
      ...shapeItems.map((s) => Number.isFinite(s?.index) ? Number(s.index) : -1)
    );
    const count = Math.max(0, maxIndex + 1);
    const grouped:any[] = Array.from({ length: count }, () => ({ textItems: [], imageItems: [], shapes: [] }));
    textItems.forEach((t) => {
      const idx = Number.isFinite(t?.index) ? Number(t.index) : 0;
      if (!grouped[idx]) grouped[idx] = { textItems: [], imageItems: [], shapes: [] };
      grouped[idx].textItems.push(t);
    });
    imageItems.forEach((img) => {
      const idx = Number.isFinite(img?.index) ? Number(img.index) : 0;
      if (!grouped[idx]) grouped[idx] = { textItems: [], imageItems: [], shapes: [] };
      grouped[idx].imageItems.push(img);
    });
    shapeItems.forEach((shape) => {
      const idx = Number.isFinite(shape?.index) ? Number(shape.index) : 0;
      if (!grouped[idx]) grouped[idx] = { textItems: [], imageItems: [], shapes: [] };
      grouped[idx].shapes.push(shape);
    });
    pages = grouped;
  }

  // 3) Persist to localStorage (legacy support)
  localStorage.setItem(pagesKey, JSON.stringify(pages));
  localStorage.setItem(textItemsKey, JSON.stringify(textItems));
  localStorage.setItem(imageItemsKey, JSON.stringify(imageItems));
  localStorage.setItem(shapeItemsKey, JSON.stringify(shapeItems));

  // 4) Persist to IndexedDB (primary storage)
  if (saveTextItemsToIndexedDB) {
    await saveTextItemsToIndexedDB(textItems);
  }
  if (saveImageItemsToIndexedDB) {
    await saveImageItemsToIndexedDB(imageItems);
  }
  if (saveShapeItemsToIndexedDB) {
    await saveShapeItemsToIndexedDB(shapeItems);
  }
  if (savePagesToIndexedDB) {
    await savePagesToIndexedDB(pages);
  }

  // 5) Optionally hydrate React state right away
  setPages?.(pages);
  setTextItems?.(textItems);
  setImageItems?.(imageItems);
  setShapeItems?.(shapeItems);

  return { pages, textItems, imageItems, shapeItems };
}
