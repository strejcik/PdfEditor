/**
 * IndexedDB Helper Functions
 * Utilities for opening and reading from the PdfEditorDB
 */

/**
 * Opens the shared PdfEditorDB
 * @returns {Promise<IDBDatabase>} The opened database instance
 */
export function openEditorDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = indexedDB.open("PdfEditorDB", 5); // must match your DB_VERSION
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads the single "main" record from a given store
 * @param {string} storeName - Name of the object store to read from
 * @returns {Promise<any|null>} The record data or null if not found
 */
export async function loadStoreRecord(storeName) {
  let db;
  try {
    db = await openEditorDB();
  } catch (e) {
    // IndexedDB not available
    return null;
  }

  try {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const record = await new Promise((resolve, reject) => {
      const r = store.get("main");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });

    return record;
  } finally {
    db.close && db.close();
  }
}

/**
 * Save shapes to IndexedDB
 * @param {Array} shapeItems - Array of shape items to save
 * @returns {Promise<void>}
 */
export async function saveShapeItemsToIndexedDB(shapeItems) {
  let db;
  try {
    db = await openEditorDB();
  } catch (e) {
    console.error("Error opening IndexedDB for shapes:", e);
    return;
  }

  try {
    const tx = db.transaction("shapes", "readwrite");
    const store = tx.objectStore("shapes");

    store.put({ id: "main", data: Array.isArray(shapeItems) ? shapeItems : [] });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  } catch (error) {
    console.error("Error saving shapes to IndexedDB:", error);
  } finally {
    db.close && db.close();
  }
}

/**
 * Load shapes from IndexedDB
 * @returns {Promise<Array>} Array of shape items or empty array
 */
export async function loadShapeItemsFromIndexedDB() {
  let db;
  try {
    db = await openEditorDB();
  } catch (e) {
    console.error("Error opening IndexedDB for shapes:", e);
    return [];
  }

  try {
    const tx = db.transaction("shapes", "readonly");
    const store = tx.objectStore("shapes");

    const record = await new Promise((resolve, reject) => {
      const r = store.get("main");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });

    return record && record.data ? record.data : [];
  } catch (error) {
    console.error("Error loading shapes from IndexedDB:", error);
    return [];
  } finally {
    db.close && db.close();
  }
}
