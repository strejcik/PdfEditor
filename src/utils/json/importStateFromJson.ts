// utils/importStateFromJson.ts
type ImportOpts = {
  // Optional React setters if you want to hydrate UI immediately after load
  setPages?: (next: any[]) => void;
  setTextItems?: (next: any[]) => void;
  setImageItems?: (next: any[]) => void;

  // LocalStorage keys (override if you use different ones)
  pagesKey?: string;
  textItemsKey?: string;
  imageItemsKey?: string;

  // IndexedDB save functions
  saveTextItemsToIndexedDB?: (items: any[]) => Promise<void>;
  saveImageItemsToIndexedDB?: (items: any[]) => Promise<void>;
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
    setPages, setTextItems, setImageItems,
    pagesKey = "pages",
    textItemsKey = "textItems",
    imageItemsKey = "imageItems",
    saveTextItemsToIndexedDB,
    saveImageItemsToIndexedDB,
    savePagesToIndexedDB,
  } = opts;

  const text = await file.text();
  const payload = safeParse<{
    pages?: any[];
    textItems?: any[];
    imageItems?: any[];
  }>(text);

  // 1) Extract arrays (tolerate missing fields)
  let pages = Array.isArray(payload.pages) ? payload.pages : null;
  const textItems = Array.isArray(payload.textItems) ? payload.textItems : [];
  const imageItems = Array.isArray(payload.imageItems) ? payload.imageItems : [];

  // 2) If pages malformed/missing, rebuild from flat arrays
  if (!pages || !pages.every(isPageShape)) {
    const maxIndex = Math.max(
      -1,
      ...textItems.map((t) => Number.isFinite(t?.index) ? Number(t.index) : -1),
      ...imageItems.map((i) => Number.isFinite(i?.index) ? Number(i.index) : -1)
    );
    const count = Math.max(0, maxIndex + 1);
    const grouped:any[] = Array.from({ length: count }, () => ({ textItems: [], imageItems: [] }));
    textItems.forEach((t) => {
      const idx = Number.isFinite(t?.index) ? Number(t.index) : 0;
      if (!grouped[idx]) grouped[idx] = { textItems: [], imageItems: [] };
      grouped[idx].textItems.push(t);
    });
    imageItems.forEach((img) => {
      const idx = Number.isFinite(img?.index) ? Number(img.index) : 0;
      if (!grouped[idx]) grouped[idx] = { textItems: [], imageItems: [] };
      grouped[idx].imageItems.push(img);
    });
    pages = grouped;
  }

  // 3) Persist to localStorage (legacy support)
  localStorage.setItem(pagesKey, JSON.stringify(pages));
  localStorage.setItem(textItemsKey, JSON.stringify(textItems));
  localStorage.setItem(imageItemsKey, JSON.stringify(imageItems));

  // 4) Persist to IndexedDB (primary storage)
  if (saveTextItemsToIndexedDB) {
    await saveTextItemsToIndexedDB(textItems);
  }
  if (saveImageItemsToIndexedDB) {
    await saveImageItemsToIndexedDB(imageItems);
  }
  if (savePagesToIndexedDB) {
    await savePagesToIndexedDB(pages);
  }

  // 5) Optionally hydrate React state right away
  setPages?.(pages);
  setTextItems?.(textItems);
  setImageItems?.(imageItems);

  return { pages, textItems, imageItems };
}
