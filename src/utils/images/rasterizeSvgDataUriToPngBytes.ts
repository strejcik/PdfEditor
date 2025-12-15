/**
 * Draw an SVG data URI onto an offscreen canvas and return PNG bytes (Uint8Array)
 * @param svgDataUri - SVG data URI string
 * @param width - Target width for rasterization
 * @param height - Target height for rasterization
 * @param background - Background color (default: "white")
 * @returns Promise resolving to Uint8Array of PNG bytes
 */
export async function rasterizeSvgDataUriToPngBytes(
  svgDataUri: string,
  width?: number,
  height?: number,
  background: string = "white"
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      // data: URIs are same-origin; no crossOrigin needed
      img.onload = async () => {
        const w = Number(width) || img.naturalWidth || 1024;
        const h = Number(height) || img.naturalHeight || Math.round((w * 3) / 4);

        const cvs = document.createElement("canvas");
        cvs.width = w;
        cvs.height = h;

        const ctx = cvs.getContext("2d");
        if (!ctx) {
          return reject(new Error("Failed to get 2D context"));
        }

        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, w, h);
        }
        // draw the SVG at target size
        ctx.drawImage(img, 0, 0, w, h);

        cvs.toBlob(async (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob() failed for SVG rasterization"));
          const ab = await blob.arrayBuffer();
          resolve(new Uint8Array(ab)); // Uint8Array for pdf-lib
        }, "image/png", 1.0);
      };
      img.onerror = (e) => reject(new Error("Failed to decode SVG image"));
      img.src = svgDataUri;
    } catch (err) {
      reject(err);
    }
  });
}
