// src/utils/persistence/pagesStorage.ts
import type { Page } from "../../types/editor";

const DB_NAME = "PdfEditorDB";
const DB_VERSION = 8;               // bump if you add more stores later
const STORE_PAGES = "pages";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e:any) => {
      const db = e.target.result;
      // Create all stores you might use so versioning stays simple
      if (!db.objectStoreNames.contains("textItems")) {
        db.createObjectStore("textItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("imageItems")) {
        db.createObjectStore("imageItems", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        db.createObjectStore(STORE_PAGES, { keyPath: "id" });
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
      if (!db.objectStoreNames.contains("annotations")) {
        db.createObjectStore("annotations", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pdfTextSpans")) {
        db.createObjectStore("pdfTextSpans", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx:any) {
  return new Promise((resolve:any, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

/**
 * Load pages from IndexedDB.
 * @returns {Promise<Array| null>}
 */
export async function loadPages() {
  try {
    const db:any = await openDB();
    const tx = db.transaction(STORE_PAGES, "readonly");
    const store = tx.objectStore(STORE_PAGES);

    const record:any = await new Promise((resolve, reject) => {
      const r = store.get("main");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });

    await txDone(tx);
    db.close();

    if (record && record.data && Array.isArray(record.data)) {
      return record.data;
    }

    return null;
  } catch (err) {
    console.error("Failed to load pages from IndexedDB:", err);
    return null;
  }
}

/**
 * Save pages array into IndexedDB.
 * @param {Array} pages
 * @returns {Promise<void>}
 */
export async function savePages(pages:any) {
  try {
    const db:any = await openDB();
    const tx = db.transaction(STORE_PAGES, "readwrite");
    const store = tx.objectStore(STORE_PAGES);

    store.put({ id: "main", data: Array.isArray(pages) ? pages : [] });

    await txDone(tx);
    db.close();
  } catch (err) {
    console.error("Failed to save pages to IndexedDB:", err);
  }
}


const emptyPage = (): Page => ({
  textItems: [],
  imageItems: [],
  shapes: [],
  formFields: [],
  annotations: [],
  pdfTextSpans: [],
} as Page);

/** Ensure the stored data fits your Page[] shape (no id). */
export function normalizePages(input: unknown): Page[] {
  if (!Array.isArray(input)) {
    return [emptyPage()];
  }

  return (input as any[]).map((p) => ({
    textItems: Array.isArray(p?.textItems) ? p.textItems : [],
    imageItems: Array.isArray(p?.imageItems) ? p.imageItems : [],
    shapes: Array.isArray(p?.shapes) ? p.shapes : [],
    formFields: Array.isArray(p?.formFields) ? p.formFields : [],
    annotations: Array.isArray(p?.annotations) ? p.annotations : [],
    pdfTextSpans: Array.isArray(p?.pdfTextSpans) ? p.pdfTextSpans : [],
  })) as Page[];
}