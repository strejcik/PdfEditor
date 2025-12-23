import axios from 'axios';
import type { TextSpan, AnnotationItem } from '../../types/annotations';

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
  setPdfTextSpans,
  setAnnotationItems,
  saveAnnotationsToIndexedDB,
  savePagesToIndexedDB,
}: {
  selectedFile: File | null;
  setIsPdfDownloaded: (value: boolean) => void;
  addTextToCanvas3: (items: any[], config: any) => void;
  pushSnapshotToUndo: (page: number) => void;
  activePage: number;
  canvasRefs: React.MutableRefObject<(HTMLCanvasElement | null)[]>;
  fontSize: number;
  setImageItems: (items: any[]) => void;
  setPages: (pages: any[] | ((prev: any[]) => any[])) => void;
  saveImageItemsToIndexedDB: (items: any[]) => void;
  drawCanvas: (pageIndex: number) => void;
  setPdfTextSpans?: (spans: TextSpan[]) => void;
  setAnnotationItems?: (items: AnnotationItem[]) => void;
  saveAnnotationsToIndexedDB?: (items: AnnotationItem[]) => Promise<void>;
  savePagesToIndexedDB?: (pages: any[]) => Promise<void>;
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

    // Separate textSpan items, annotations from regular items
    // textSpan items are used for annotation text selection
    const textSpans: TextSpan[] = [];
    const annotations: AnnotationItem[] = [];
    const regularItems: any[] = [];

    for (const item of payload) {
      if (item?.type === "textSpan") {
        // Extract text span for annotation selection
        textSpans.push({
          text: item.text || "",
          xNorm: item.xNorm ?? 0,
          yNormTop: item.yNormTop ?? 0,
          widthNorm: item.widthNorm ?? 0,
          heightNorm: item.heightNorm ?? 0,
          fontSize: item.fontSize ?? 12,
          index: item.index ?? 0,
        });
      } else if (item?.type === "annotation") {
        // Extract annotation items from manifest
        const annotationItem: AnnotationItem = {
          id: item.id || `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: item.annotationType || "highlight",
          spans: (item.spans || []).map((s: any) => ({
            xNorm: s.xNorm ?? 0,
            yNormTop: s.yNormTop ?? 0,
            widthNorm: s.widthNorm ?? 0,
            heightNorm: s.heightNorm ?? 0,
            text: s.text,
            fontSize: s.fontSize,
            relativeXNorm: s.relativeXNorm,
            relativeYNorm: s.relativeYNorm,
            ascentRatio: s.ascentRatio,
            descentRatio: s.descentRatio,
          })),
          color: item.color || "#FFFF00",
          opacity: item.opacity ?? 0.4,
          index: item.index ?? 0,
          annotatedText: item.annotatedText,
          linkedTextItemId: item.linkedTextItemId,
        };
        annotations.push(annotationItem);
      } else {
        // Regular items (text lines, images)
        regularItems.push(item);
      }
    }

    // Store text spans for annotation selection
    if (setPdfTextSpans && textSpans.length > 0) {
      setPdfTextSpans(textSpans);
    }

    // Basic sanity: ensure images carry the base64 `ref` if present
    // (Your updated backend embeds data URIs into `ref`.)
    // No changes needed here—this is just a guard.
    const normalized = regularItems.map(item => {
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

    // Store annotations AFTER addTextToCanvas3 so pages already have text items
    // IMPORTANT: We must also update pages with annotations to prevent EditorProvider sync from overwriting
    if (annotations.length > 0) {
      // Use setTimeout to ensure React has processed text/image state updates first
      setTimeout(() => {
        // Group annotations by page index (remove 'index' for page storage)
        const annotationsByPage: Record<number, any[]> = {};
        annotations.forEach((ann) => {
          const pageIdx = ann.index ?? 0;
          if (!annotationsByPage[pageIdx]) annotationsByPage[pageIdx] = [];
          const { index, ...annWithoutIndex } = ann;
          annotationsByPage[pageIdx].push(annWithoutIndex);
        });

        // Update pages with annotations
        // This ensures EditorProvider syncs annotations correctly
        setPages((prevPages: any[]) => {
          const nextPages = Array.isArray(prevPages) ? [...prevPages] : [];
          // Ensure we have enough pages
          const maxPageIndex = Math.max(...Object.keys(annotationsByPage).map(Number), 0);
          while (nextPages.length <= maxPageIndex) {
            nextPages.push({ textItems: [], imageItems: [], annotations: [] });
          }
          // Add annotations to each page
          Object.entries(annotationsByPage).forEach(([pageIdxStr, pageAnnotations]) => {
            const pageIdx = parseInt(pageIdxStr, 10);
            nextPages[pageIdx] = {
              ...nextPages[pageIdx],
              annotations: pageAnnotations,
            };
          });
          return nextPages;
        });

        // Also set annotation items state directly
        if (setAnnotationItems) {
          setAnnotationItems(annotations);
        }

        // Save to IndexedDB for persistence
        if (saveAnnotationsToIndexedDB) {
          saveAnnotationsToIndexedDB(annotations);
        }
      }, 200);
    }
  } catch (error) {
    console.error("Error uploading PDF:", error);
    alert("Failed to upload PDF. Please try again.");
  }
};
