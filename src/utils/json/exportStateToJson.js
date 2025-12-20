/**
 * Export State to JSON
 * Functions for exporting the editor state to a JSON file with checksums
 */

import { loadStoreRecord } from '../persistance/indexedDBHelpers';

/**
 * Canonicalizes a value for consistent JSON serialization
 * Removes checksum fields and sorts object keys
 * @param {any} value - The value to canonicalize
 * @returns {any} The canonicalized value
 */
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    const keys = Object.keys(value).filter(k => k !== "checksum" && k !== "checksumRaw").sort();
    for (const k of keys) out[k] = canonicalize(value[k]);
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return value;
}

/**
 * Converts an object to a canonical JSON string
 * @param {any} obj - The object to stringify
 * @returns {string} The canonical JSON string
 */
function canonicalStringify(obj) {
  return JSON.stringify(canonicalize(obj));
}

/**
 * Computes SHA-256 hash of a string
 * Falls back to simple hash if crypto API not available
 * @param {string} str - The string to hash
 * @returns {Promise<string>} The hash as a hex string
 */
async function sha256String(str) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback (non-crypto)
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return "fallback_" + Math.abs(h).toString(16);
}

/**
 * Computes checksum for an object
 * @param {any} obj - The object to checksum
 * @returns {Promise<string>} The checksum hash
 */
async function computeChecksum(obj) {
  return sha256String(canonicalStringify(obj));
}

/**
 * Exports the current editor state to a JSON file
 * Reads data from IndexedDB and creates a downloadable JSON file with checksums
 * @param {string} filename - The name of the file to download (default: "state.json")
 * @returns {Promise<Object>} The exported state object
 */
export async function exportStateToJson(
  filename = "state.json"
) {
  // 1) Read from IndexedDB
  let pages = null;
  let textItems = [];
  let imageItems = [];
  let shapeItems = [];
  let formFields = [];

  try {
    const [pagesRec, textItemsRec, imageItemsRec, shapesRec, formFieldsRec] = await Promise.all([
      loadStoreRecord("pages"),
      loadStoreRecord("textItems"),
      loadStoreRecord("imageItems"),
      loadStoreRecord("shapes"),
      loadStoreRecord("formFields"),
    ]);

    if (pagesRec && Array.isArray(pagesRec.data)) {
      pages = pagesRec.data;
    }
    if (textItemsRec && Array.isArray(textItemsRec.data)) {
      textItems = textItemsRec.data;
    }
    if (imageItemsRec && Array.isArray(imageItemsRec.data)) {
      imageItems = imageItemsRec.data;
    }
    if (shapesRec && Array.isArray(shapesRec.data)) {
      shapeItems = shapesRec.data;
    }
    if (formFieldsRec && Array.isArray(formFieldsRec.data)) {
      formFields = formFieldsRec.data;
    }

    // If individual stores are empty but pages has items, extract from pages
    // This handles the case where items were synced to pages but not saved to individual stores
    if (Array.isArray(pages) && pages.length > 0) {
      if (textItems.length === 0) {
        textItems = pages.flatMap((p, pageIndex) =>
          (p?.textItems ?? []).map((item) => ({ ...item, index: pageIndex }))
        );
      }
      if (imageItems.length === 0) {
        imageItems = pages.flatMap((p, pageIndex) =>
          (p?.imageItems ?? []).map((item) => ({ ...item, index: pageIndex }))
        );
      }
      if (shapeItems.length === 0) {
        shapeItems = pages.flatMap((p, pageIndex) =>
          (p?.shapes ?? []).map((item) => ({ ...item, index: pageIndex }))
        );
      }
      if (formFields.length === 0) {
        formFields = pages.flatMap((p, pageIndex) =>
          (p?.formFields ?? []).map((item) => ({ ...item, index: pageIndex }))
        );
      }
    }
  } catch (e) {
    console.error("[exportStateToJson] IndexedDB read failed:", e);
    alert("Failed to read data from IndexedDB. Cannot export state.");
    throw e;
  }

  // 2) If pages is still not a proper Page[] shape, reconstruct from items
  const isPageShape = (p) =>
    p &&
    typeof p === "object" &&
    Array.isArray(p.textItems) &&
    Array.isArray(p.imageItems);

  if (!Array.isArray(pages) || !pages.every(isPageShape)) {
    // Reconstruct pages from textItems, imageItems, shapeItems, and formFields
    const maxIndex = Math.max(
      -1,
      ...textItems.map((t) =>
        Number.isFinite(t?.index) ? +t.index : -1
      ),
      ...imageItems.map((i) =>
        Number.isFinite(i?.index) ? +i.index : -1
      ),
      ...shapeItems.map((s) =>
        Number.isFinite(s?.index) ? +s.index : -1
      ),
      ...formFields.map((f) =>
        Number.isFinite(f?.index) ? +f.index : -1
      )
    );

    const pageCount = Math.max(0, maxIndex + 1);
    const grouped = Array.from({ length: pageCount }, () => ({
      textItems: [],
      imageItems: [],
      shapes: [],
      formFields: [],
    }));

    textItems.forEach((t) => {
      const i = Number.isFinite(t?.index) ? +t.index : 0;
      (grouped[i] ?? (grouped[i] = { textItems: [], imageItems: [], shapes: [], formFields: [] }))
        .textItems.push(t);
    });

    imageItems.forEach((img) => {
      const p = Number.isFinite(img?.index) ? +img.index : 0;
      (grouped[p] ?? (grouped[p] = { textItems: [], imageItems: [], shapes: [], formFields: [] }))
        .imageItems.push(img);
    });

    shapeItems.forEach((shape) => {
      const p = Number.isFinite(shape?.index) ? +shape.index : 0;
      (grouped[p] ?? (grouped[p] = { textItems: [], imageItems: [], shapes: [], formFields: [] }))
        .shapes.push(shape);
    });

    formFields.forEach((field) => {
      const p = Number.isFinite(field?.index) ? +field.index : 0;
      (grouped[p] ?? (grouped[p] = { textItems: [], imageItems: [], shapes: [], formFields: [] }))
        .formFields.push(field);
    });

    pages = grouped;
  }

  // 3) Ensure we have at least one page
  if (!Array.isArray(pages) || pages.length === 0) {
    pages = [{ textItems: [], imageItems: [], shapes: [], formFields: [] }];
  }
  console.log(pages, textItems, imageItems, shapeItems, formFields);

  // 4) Base payload (no checksums)
  const base = {
    version: 2,
    savedAt: new Date().toISOString(),
    pages,
    textItems,
    imageItems,
    shapeItems,
    formFields,
  };

  // 5) Canonical checksum (object-based)
  const checksum = await computeChecksum(base);

  // 6) Prepare object WITH checksums, but leave checksumRaw blank for now
  const withBlank = { ...base, checksum, checksumRaw: "" };

  // Serialize once with blank checksumRaw — we will hash this exact text
  const textWithBlank = JSON.stringify(withBlank, null, 2);

  // 7) Raw text checksum (detects any textual edit)
  const checksumRaw = await sha256String(textWithBlank);

  // Final object
  const finalObj = { ...withBlank, checksumRaw };
  const finalText = JSON.stringify(finalObj, null, 2);

  // 8) Download
  const blob = new Blob([finalText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return finalObj;
}
