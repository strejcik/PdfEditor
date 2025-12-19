/**
 * Utility functions for cleaning IndexedDB stores
 */

const DB_NAME = "PdfEditorDB";
const DB_VERSION = 5;

/**
 * Open the PdfEditorDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
function openEditorDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      return reject(new Error("IndexedDB not supported"));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    // Create stores if they don't exist (handles empty DB case)
    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create all stores if they don't exist
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
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear a specific store in IndexedDB
 * @param {string} storeName - Name of the store to clear
 * @returns {Promise<void>}
 */
async function clearStore(storeName) {
  let db;
  try {
    db = await openEditorDB();
  } catch (e) {
    console.warn(`IndexedDB not available or error opening DB:`, e);
    return;
  }

  try {
    // Check if store exists before trying to access it
    if (!db.objectStoreNames.contains(storeName)) {
      console.warn(`Store "${storeName}" does not exist in IndexedDB, skipping clear`);
      return;
    }

    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    await new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
    });
  } catch (err) {
    console.warn(`Error clearing store "${storeName}":`, err);
  } finally {
    db.close && db.close();
  }
}

/**
 * Clear all editor data from IndexedDB
 * @param {Array<string>} [stores=['pages', 'textItems', 'imageItems', 'shapes']] - Store names to clear
 * @returns {Promise<void>}
 */
export async function clearEditorData(stores = ['pages', 'textItems', 'imageItems', 'shapes']) {
  try {
    const clearPromises = stores.map(storeName => clearStore(storeName));
    await Promise.all(clearPromises);
  } catch (err) {
    console.warn('Error clearing IndexedDB stores:', err);
  }
}

/**
 * Clear IndexedDB for editor state
 * @returns {Promise<void>}
 */
export async function clearAllEditorState() {
  // Clear IndexedDB (gracefully handles empty DB)
  await clearEditorData(['pages', 'textItems', 'imageItems', 'shapes']);
}
