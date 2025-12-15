import {
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
  PDFPage,
} from "pdf-lib";

/**
 * Clips the PDF page to the specified width and height
 * This ensures content doesn't overflow the page boundaries
 */
export function clipToPage(pdfPage: PDFPage, W: number, H: number) {
  pdfPage.pushOperators(
    pushGraphicsState(),
    moveTo(0, 0),
    lineTo(W, 0),
    lineTo(W, H),
    lineTo(0, H),
    closePath(),
    clip(),   // W operator
    endPath() // n
  );
}

/**
 * Removes the clipping region from the PDF page
 * Call this after you're done with clipped operations
 */
export function unclip(pdfPage: PDFPage) {
  pdfPage.pushOperators(popGraphicsState());
}
