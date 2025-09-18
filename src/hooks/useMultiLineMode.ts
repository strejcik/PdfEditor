import { useCallback, useState } from "react";

export function useMultiLineMode() {
const [isMultilineMode, setIsMultilineMode] = useState(false);
const [mlText, setMlText] = useState("");          // single-page buffer; make this per-page if you like
const [mlCaret, setMlCaret] = useState(0);         // caret index in mlText (UTF-16 code points via Array.from)
const [mlAnchor, setMlAnchor] = useState(0);       // anchor for selection; if === mlCaret → no selection
const [mlPreferredX, setMlPreferredX] = useState(null); // preserve X when moving up/down
const [mlCaretBlink, setMlCaretBlink] = useState(true); // blinking visibility
const [isMlDragging, setIsMlDragging] = useState(false);

const [mlConfig, setMlConfig] = useState({
  fontFamily: "Lato",
  fontSize: 20,
  lineGap: 4,
  marginsPDF: { top: 36, right: 36, bottom: 36, left: 36 }, // PDF units
});

const toggleMultilineMode = useCallback(() => {
  setIsMultilineMode(v => !v);
}, []);

  // Robust per-line layout, preserving newlines, with per-char positions for hit-testing.
const layoutMultiline = (ctx:CanvasRenderingContext2D, text: string, { x, y, maxWidth, maxHeight, fontSize, fontFamily, lineGap } : any) => {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `${fontSize}px ${fontFamily}`;

  const probe = ctx.measureText("Mg");
  const ascent  = probe.actualBoundingBoxAscent
  const descent = probe.actualBoundingBoxDescent
  const lineHeight = Math.ceil(ascent + descent + lineGap);

  const lines: any = [];
  let cursorY = y;
  let globalIndex = 0; // caret index in code points (Array.from-based)

  const paras = String(text ?? "").split("\n");

  const pushLine = (lineText:any) => {
    if (cursorY + lineHeight > y + maxHeight) return false;
    const units:any = Array.from(lineText);
    const charX = [x];
    let running = 0;
    for (let i = 0; i < units.length; i++) {
      running += ctx.measureText(units[i]).width;
      charX.push(x + running);
    }
    lines.push({
      text: lineText,
      x,
      y: cursorY,
      width: running,
      height: lineHeight,
      start: globalIndex,
      end: globalIndex + units.length, // exclusive
      charX, // len = units.length + 1
      ascent, descent,
    });
    cursorY += lineHeight;
    globalIndex += units.length;
    return true;
  };

  for (let p = 0; p < paras.length; p++) {
    const para = paras[p];
    const words = para.split(" ");

    let current = "";

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const next = current ? current + " " + word : word;

      const wordW = ctx.measureText(word).width;
      const nextW = ctx.measureText(next).width;

      if (wordW > maxWidth) {
        // Hard break the long word by characters
        if (current) { if (!pushLine(current)) return { lines, lineHeight, ascent, descent }; current = ""; }
        const units = Array.from(word);
        let chunk = "";
        for (let i = 0; i < units.length; i++) {
          const tryChunk = chunk + units[i];
          if (ctx.measureText(tryChunk).width > maxWidth && chunk) {
            if (!pushLine(chunk)) return { lines, lineHeight, ascent, descent };
            chunk = units[i];
          } else {
            chunk = tryChunk;
          }
        }
        current = chunk;
      } else if (nextW > maxWidth && current) {
        // Wrap BEFORE adding word (same lineHeight as any wrapped line)
        if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
        current = word;
      } else {
        current = next;
      }

      if (w === words.length - 1) {
        // Flush last bit of the paragraph
        if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
        current = "";
      }
    }

    // Handle the explicit newline BETWEEN paragraphs:
    // - We DO NOT push an extra empty line here (that caused an extra gap).
    // - We STILL advance globalIndex by 1 to account for the "\n" caret position.
    // - If the paragraph itself was empty (i.e., user typed a blank line: "\n\n"),
    //   then we must render a visual blank line: pushLine("").
    if (p < paras.length - 1) {
      if (para === "") {
        // Real blank line requested by the user
        if (!pushLine("")) return { lines, lineHeight, ascent, descent };
      }
      // Count the newline character in the caret index space
      globalIndex += 1; // the "\n"
    }
  }

  return { lines, lineHeight, ascent, descent };
}


  
  return {
    isMultilineMode, setIsMultilineMode,
    mlText, setMlText,
    mlConfig, setMlConfig,
    mlCaret, setMlCaret,
    mlAnchor, setMlAnchor,
    mlPreferredX, setMlPreferredX,
    mlCaretBlink, setMlCaretBlink,
    isMlDragging, setIsMlDragging,
    toggleMultilineMode,
    layoutMultiline
  };
}