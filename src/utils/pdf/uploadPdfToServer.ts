import axios from 'axios';

/**
 * Upload PDF file to server for processing
 * The server extracts text and images from the PDF
 */
export const uploadPdfToServer = async ({
  selectedFile,
  setIsPdfDownloaded,
  addTextToCanvas3,
  pushSnapshotToUndo,
  activePage,
  canvasRefs,
  fontSize,
  setImageItems,
  setPages,
  saveImageItemsToIndexedDB,
  drawCanvas,
}: {
  selectedFile: File | null;
  setIsPdfDownloaded: (value: boolean) => void;
  addTextToCanvas3: (items: any[], config: any) => void;
  pushSnapshotToUndo: (page: number) => void;
  activePage: number;
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  fontSize: number;
  setImageItems: (items: any[]) => void;
  setPages: (pages: any[]) => void;
  saveImageItemsToIndexedDB: (items: any[]) => void;
  drawCanvas: (pageIndex: number) => void;
}) => {
  if (!selectedFile) {
    alert("No file selected. Please select a PDF file to upload.");
    return;
  }

  const formData = new FormData();
  formData.append("pdf", selectedFile);
  // optional flags your backend can ignore or use
  formData.append("texts", "1");
  formData.append("images", "1");

  try {
    const response = await axios.post(
      "http://localhost:5000/upload-pdf",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        // withCredentials: true, // enable if your Flask server uses cookies
      }
    );

    // Expecting an array with mixed items:
    //  - { type: "text", text, xNorm, yNormTop, fontSize, index, ... }
    //  - { type: "image", xNorm, yNormTop, widthNorm, heightNorm, index, ref(base64), ... }
    const payload = response?.data;

    if (!Array.isArray(payload)) {
      console.error("Unexpected response:", payload);
      alert("Server returned an unexpected response.");
      return;
    }

    // Basic sanity: ensure images carry the base64 `ref` if present
    // (Your updated backend embeds data URIs into `ref`.)
    // No changes needed here—this is just a guard.
    const normalized = payload.map(item => {
      if (item?.type === "image" && typeof item.ref !== "string") {
        // keep as-is; your draw code can still place a placeholder rect if needed
        // (or you can decide to filter images without ref)
      }
      return item;
    });

    setIsPdfDownloaded(true);
    // Your improved addTextToCanvas3 already handles both text and images
    addTextToCanvas3(normalized, {
      pushSnapshotToUndo,
      activePage,
      canvasRefs,
      fontSize,
      setImageItems,
      setPages,
      saveImageItemsToIndexedDB,
      drawCanvas,
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    alert("Failed to upload PDF. Please try again.");
  }
};
