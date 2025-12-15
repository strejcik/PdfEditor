/**
 * Wraps text to fit within a specified width, handling line breaks and word wrapping.
 *
 * @param {string} text - The text to wrap
 * @param {CanvasRenderingContext2D} ctx - Canvas context for measuring text
 * @param {Object} options - Configuration options
 * @param {number} [options.x=50] - X coordinate for text positioning
 * @param {number} [options.y=50] - Y coordinate for text positioning
 * @param {number} [options.maxWidth=Infinity] - Maximum width for text wrapping
 * @param {number} [options.fontSize=16] - Font size in pixels
 * @param {string} [options.fontFamily="Lato"] - Font family name
 * @param {number} [options.lineGap=0] - Extra gap between lines in pixels
 * @returns {Array<{text: string, x: number, y: number}>} Array of wrapped lines with positions
 */
export const wrapText = (text, ctx, {
  x = 50,
  y = 50,
  maxWidth = Infinity,
  fontSize = 16,
  fontFamily = "Lato",
  lineGap = 0,              // extra gap between lines in pixels
} = {}) => {
  if (!text) return [];

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontSize}px ${fontFamily}`;

  // Measure a representative glyph to get ascent+descent for line height
  const m = ctx.measureText("Mg");
  const ascent  = (typeof m.actualBoundingBoxAscent  === "number") ? m.actualBoundingBoxAscent  : fontSize * 0.83;
  const descent = (typeof m.actualBoundingBoxDescent === "number") ? m.actualBoundingBoxDescent : fontSize * 0.2;
  const lineHeight = Math.ceil(ascent + descent + lineGap);

  const lines = [];
  const paragraphs = String(text).split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ");
    let current = "";

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const next = current ? current + " " + word : word;
      const nextWidth = ctx.measureText(next).width;
      const wordWidth = ctx.measureText(word).width;

      // If a single word is wider than maxWidth, break it by characters
      if (wordWidth > maxWidth) {
        // push the current line first
        if (current) {
          lines.push(current);
          current = "";
        }
        let chunk = "";
        for (let i = 0; i < word.length; i++) {
          const tryChunk = chunk + word[i];
          const chunkWidth = ctx.measureText(tryChunk).width;
          if (chunkWidth > maxWidth && chunk) {
            lines.push(chunk);
            chunk = word[i];
          } else {
            chunk = tryChunk;
          }
        }
        if (chunk) {
          current = chunk; // continue current with the leftover piece
        }
      } else if (nextWidth > maxWidth && current) {
        // wrap before adding word
        lines.push(current);
        current = word;
      } else {
        current = next;
      }

      if (w === words.length - 1 && current) {
        lines.push(current);
        current = "";
      }
    }
    // keep blank line if paragraph ends with an empty current
    if (paragraph === "" ) lines.push("");
  }

  // Map to positioned lines (top-anchored)
  return lines.map((line, i) => ({
    text: line,
    x: Math.round(x),
    y: Math.round(y + i * lineHeight),
  }));
};
