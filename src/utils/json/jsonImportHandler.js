import { readFileAsText } from '../files/fileReader';
import { verifyDualChecksums } from './checksumVerifier';
import { importStateFromJson } from './importStateFromJson';

/**
 * Handle JSON file change event with checksum verification
 * @param {Event} e - File input change event
 * @param {Object} handlers - Handler functions
 * @param {Function} handlers.setPages - Set pages state
 * @param {Function} handlers.setTextItems - Set text items state
 * @param {Function} handlers.setImageItems - Set image items state
 * @param {Function} handlers.saveTextItemsToIndexedDB - Save text items to IndexedDB
 * @param {Function} handlers.saveImageItemsToIndexedDB - Save image items to IndexedDB
 * @param {Function} handlers.savePagesToIndexedDB - Save pages to IndexedDB
 * @param {Function} handlers.onSuccess - Optional success callback
 * @param {Function} handlers.onError - Optional error callback
 */
export const handleJSONImport = async (e, {
  setPages,
  setTextItems,
  setImageItems,
  saveTextItemsToIndexedDB,
  saveImageItemsToIndexedDB,
  savePagesToIndexedDB,
  onSuccess,
  onError
}) => {
  const file = e.target.files?.[0];
  e.currentTarget.value = "";
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const result = await verifyDualChecksums(text);

    if (!result.ok) {
      let msg = "Checksum verification failed.\n";
      if (result.fail === "parse") msg += "Reason: invalid JSON.";
      else {
        if (result.okRaw === false) {
          msg += `Raw text mismatch.\nExpectedRaw: ${result.expectedRaw}\nActualRaw:   ${result.actualRaw}\n`;
        }
        if (result.okCanon === false) {
          msg += `Canonical mismatch.\nExpected: ${result.expectedCanon}\nActual:   ${result.actualCanon}\n`;
        }
      }
      const proceed = window.confirm(`${msg}\nImport anyway?`);
      if (!proceed) return;
    }

    // Apply state (your existing helper)
    await importStateFromJson(file, {
      setPages,
      setTextItems,
      setImageItems,
      pagesKey: "pages",
      textItemsKey: "textItems",
      imageItemsKey: "imageItems",
      saveTextItemsToIndexedDB,
      saveImageItemsToIndexedDB,
      savePagesToIndexedDB,
    });

    if (onSuccess) onSuccess();
  } catch (err) {
    console.error("Failed to import state.json", err);
    if (onError) {
      onError(err);
    } else {
      alert("Invalid or corrupted state.json");
    }
  }
};
