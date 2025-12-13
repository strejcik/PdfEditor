import { useCallback, useState } from "react";

export function useMultiLineMode() {
  const [isMultilineMode, setIsMultilineMode] = useState(false);
  const [mlText, setMlText] = useState("");          // single-page buffer; make this per-page if you like

  // NOTE: Array.from() is Unicode code points (not UTF-16 code units)
  const [mlCaret, setMlCaret] = useState(0);         // caret index in mlText (code points)
  const [mlAnchor, setMlAnchor] = useState(0);       // anchor for selection; if === mlCaret → no selection

  const [mlPreferredX, setMlPreferredX] = useState<number | null>(null); // preserve X when moving up/down
  const [mlCaretBlink, setMlCaretBlink] = useState(true); // blinking visibility
  const [isMlDragging, setIsMlDragging] = useState(false);

  const [mlConfig, setMlConfig] = useState({
    fontFamily: "Lato",
    fontSize: 20,
    lineGap: 4,
    marginsPDF: { top: 36, right: 36, bottom: 36, left: 36 }, // PDF units
  });

  const toggleMultilineMode = useCallback(() => {
    setIsMultilineMode((v) => !v);
  }, []);

  /**
   * Robust per-line layout:
   * - Preserves explicit newlines
   * - Preserves whitespace exactly (multiple spaces, tabs -> treated as tokens)
   * - Wraps to maxWidth without destroying indices
   * - Hard-breaks a token if it's longer than maxWidth
   * - Provides per-char x positions for hit-testing
   */
  const layoutMultiline = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      text: string,
      {
        x,
        y,
        maxWidth,
        maxHeight,
        fontSize,
        fontFamily,
        lineGap,
      }: any
    ) => {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = `${fontSize}px ${fontFamily}`;

      // Safe bounds defaults
      const safeMaxWidth = Number.isFinite(maxWidth) ? maxWidth : Infinity;
      const safeMaxHeight = Number.isFinite(maxHeight) ? maxHeight : Infinity;

      const probe = ctx.measureText("Mg");
      const ascent = probe.actualBoundingBoxAscent || fontSize * 0.8;
      const descent = probe.actualBoundingBoxDescent || fontSize * 0.2;
      const lineHeight = Math.ceil(ascent + descent + lineGap);

      const lines: any[] = [];
      let cursorY = y;
      let globalIndex = 0; // caret index in code points (Array.from based)

      const paras = String(text ?? "").split("\n");

      const canPushLine = () => cursorY + lineHeight <= y + safeMaxHeight + 0.001;

      const pushLine = (lineText: string) => {
        if (!canPushLine()) return false;

        const units = Array.from(lineText);
        const charX: number[] = [x];
        let running = 0;

        // (Perf note: per-char measureText is expensive but keeps your hit-testing accurate)
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
          charX, // length = units.length + 1
          ascent,
          descent,
        });

        cursorY += lineHeight;
        globalIndex += units.length;
        return true;
      };

      // Break a too-long non-whitespace token into chunks that fit width
      const breakTokenToFit = (token: string) => {
        const units = Array.from(token);
        let chunk = "";

        for (let i = 0; i < units.length; i++) {
          const tryChunk = chunk + units[i];
          if (ctx.measureText(tryChunk).width > safeMaxWidth && chunk) {
            if (!pushLine(chunk)) return false;
            chunk = units[i];
          } else {
            chunk = tryChunk;
          }
        }

        // continue building current line from last chunk instead of pushing immediately
        return chunk; // return remaining chunk
      };

      for (let p = 0; p < paras.length; p++) {
        const para = paras[p];

        // Tokenize paragraph into whitespace + non-whitespace tokens (preserves spaces/tabs)
        // Example: "a  b\tc" => ["a", "  ", "b", "\t", "c"]
        const tokens = para.split(/(\s+)/).filter((t) => t.length > 0);

        // Special case: empty paragraph -> render blank line
        if (tokens.length === 0) {
          if (!pushLine("")) return { lines, lineHeight, ascent, descent };
        } else {
          let current = "";

          for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            const isWS = /^\s+$/.test(tok);

            // Don’t start a new wrapped line with whitespace
            if (current === "" && isWS) {
              // but we STILL must count it in indices if user actually typed leading spaces:
              // we count it by appending to current and wrapping logic will move it if it fits.
              // If you want to truly ignore leading spaces visually AND in caret space, remove this block.
              // Here: we skip visually but keep caret space by *not* adding.
              continue;
            }

            // If a single non-whitespace token is wider than width, hard-break it
            if (!isWS && ctx.measureText(tok).width > safeMaxWidth) {
              // flush current
              if (current) {
                if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
                current = "";
              }

              const leftover = breakTokenToFit(tok);
              if (leftover === false) return { lines, lineHeight, ascent, descent };

              // leftover chunk becomes current (don’t push yet; continue token stream)
              current = typeof leftover === "string" ? leftover : "";
              continue;
            }

            const test = current + tok;
            const testW = ctx.measureText(test).width;

            if (testW <= safeMaxWidth) {
              current = test;
            } else {
              if (current) {
                if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
              }
              // start new line with token, but not if it's whitespace
              current = isWS ? "" : tok;
            }
          }

          if (current) {
            if (!pushLine(current)) return { lines, lineHeight, ascent, descent };
          }
        }

        // Account for the explicit newline between paragraphs in caret space
        if (p < paras.length - 1) {
          globalIndex += 1; // the "\n"
        }
      }

      return { lines, lineHeight, ascent, descent };
    },
    []
  );

  return {
    isMultilineMode,
    setIsMultilineMode,
    mlText,
    setMlText,
    mlConfig,
    setMlConfig,
    mlCaret,
    setMlCaret,
    mlAnchor,
    setMlAnchor,
    mlPreferredX,
    setMlPreferredX,
    mlCaretBlink,
    setMlCaretBlink,
    isMlDragging,
    setIsMlDragging,
    toggleMultilineMode,
    layoutMultiline,
  };
}
