/**
 * Read a file as text
 * @param {File} file - The file to read
 * @returns {Promise<string>} The file contents as text
 */
export async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsText(file);
  });
}
