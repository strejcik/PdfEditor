


/**
 * Canonical text layout engine with scaling support.
 * - Preserves explicit newlines
 * - Preserves whitespace exactly (Notepad-like)
 * - Wraps to width
 * - Fits to width + height
 * - Scales font size between minFontSize and maxFontSize
 */
const wrapTextPreservingNewlinesResponsive = (
  text,
  ctx,
  boxWidth,
  boxHeight,
  maxFontSize,      // target scaled font size
  padding = 10,
  minFontSize = 6,  // minimum allowed font size
  fontFamily,
  lineGap = 4
) => {
  const raw = String(text ?? "");

  const safeW = Math.max(1, boxWidth);
  const safeH = Math.max(1, boxHeight);

  // Clamp padding so inner rect never becomes <= 0
  const maxPadX = Math.floor(safeW / 2) - 1;
  const maxPadY = Math.floor(safeH / 2) - 1;
  const maxPad = Math.max(0, Math.min(maxPadX, maxPadY));
  const safePadding = Math.max(0, Math.min(padding, maxPad));

  const innerW = Math.max(1, safeW - safePadding * 2);
  const innerH = Math.max(1, safeH - safePadding * 2);

  const family =
    fontFamily ||
    (() => {
      const parts = (ctx.font || "").split(" ");
      return parts.length >= 2 ? parts.slice(1).join(" ") : "Arial";
    })();

  const setFont = (size) => {
    ctx.font = `${Math.max(1, size)}px ${family}`;
  };

  const breakWordToFit = (word) => {
    const out = [];
    let chunk = "";

    for (let i = 0; i < word.length; i++) {
      const test = chunk + word[i];
      if (ctx.measureText(test).width <= innerW) {
        chunk = test;
      } else {
        if (chunk) out.push(chunk);
        chunk = word[i];
      }
    }

    if (chunk) out.push(chunk);
    if (out.length === 0 && word.length > 0) out.push(word[0]);

    return out;
  };

  const wrapAtCurrentFont = () => {
    const paragraphs = raw.split(/\r?\n/);
    const lines = [];
    let maxLineW = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        lines.push("");
        continue;
      }

      // Preserve whitespace tokens exactly
      const tokens = paragraph.split(/(\s+)/).filter(t => t.length > 0);
      let current = "";

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const isSpace = /^\s+$/.test(tok);

        // Notepad-like: don't start a wrapped line with whitespace
        if (current === "" && isSpace) continue;

        // Hard-break long token
        if (!isSpace && ctx.measureText(tok).width > innerW) {
          if (current) {
            lines.push(current);
            maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
            current = "";
          }
          const pieces = breakWordToFit(tok);
          for (const p of pieces) {
            lines.push(p);
            maxLineW = Math.max(maxLineW, ctx.measureText(p).width);
          }
          continue;
        }

        const test = current + tok;
        if (ctx.measureText(test).width <= innerW) {
          current = test;
        } else {
          if (current) {
            lines.push(current);
            maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
          }
          current = isSpace ? "" : tok;
        }
      }

      if (current) {
        lines.push(current);
        maxLineW = Math.max(maxLineW, ctx.measureText(current).width);
      }
    }

    // Line height from current font px + gap
    const m = /^(\d+(?:\.\d+)?)px\b/.exec(ctx.font);
    const fontPx = m ? parseFloat(m[1]) : 1;
    const lineHeight = fontPx + lineGap;
    const totalH = lines.length * lineHeight;

    return { lines, maxLineW, totalH };
  };

  const lo0 = Math.max(1, Math.floor(minFontSize));
  const hi0 = Math.max(lo0, Math.floor(maxFontSize));

  let lo = lo0;
  let hi = hi0;

  let bestFont = lo0;
  let bestLines = [""];
  let bestH = Infinity;
  let bestFits = false;

  // Binary search: largest font that fits BOTH width and height
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    setFont(mid);

    const { lines, maxLineW, totalH } = wrapAtCurrentFont();

    const fitsW = maxLineW <= innerW + 0.001;
    const fitsH = totalH <= innerH + 0.001;

    if (fitsW && fitsH) {
      bestFont = mid;
      bestLines = lines;
      bestH = totalH;
      bestFits = true;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Apply final font
  setFont(bestFont);
  const lineHeight = bestFont + lineGap;

  return {
    lines: bestLines,
    fontSize: bestFont,
    lineHeight,
    fits: bestFits || (bestH <= innerH + 0.001),
  };
};











export function drawTextBoxEditor(ctx, rect, pageIndex, state, config) {
  const {
    isTextBoxEditEnabled,
    textBox,
    activePage,
    APP_FONT_FAMILY,
    wrapTextPreservingNewlinesResponsive,
    computeScaledTargetFont,
  } = { ...state, ...config };

  if (!(isTextBoxEditEnabled && textBox && activePage === pageIndex)) return;

  // ---- local helper (fixes "clampPadding is not a function") ----
  const clampPadding = (boxWidth, boxHeight, requestedPadding) => {
    const w = Math.max(1, Number(boxWidth) || 1);
    const h = Math.max(1, Number(boxHeight) || 1);
    const req = Number(requestedPadding) || 0;

    const maxPadX = Math.floor(w / 2) - 1;
    const maxPadY = Math.floor(h / 2) - 1;
    const maxPad = Math.max(0, Math.min(maxPadX, maxPadY));

    return Math.max(0, Math.min(req, maxPad));
  };

  const family = APP_FONT_FAMILY || "Arial";

  // Normalize dims
  const boxX = Number(textBox.x) || 0;
  const boxY = Number(textBox.y) || 0;
  const boxW = Math.max(1, Number(textBox.width) || 1);
  const boxH = Math.max(1, Number(textBox.height) || 1);

  // Draw box
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Drag handle
  const dragPointSize = 10;
  ctx.fillStyle = "dodgerblue";
  ctx.fillRect(
    boxX + boxW - dragPointSize,
    boxY + boxH - dragPointSize,
    dragPointSize,
    dragPointSize
  );

  // Padding computed ONCE (critical)
  const requestedPadding = textBox.boxPadding ?? 10;
  const padding = clampPadding(boxW, boxH, requestedPadding);

  const innerW = Math.max(1, boxW - padding * 2);
  const innerH = Math.max(1, boxH - padding * 2);

  const sourceText = (textBox.rawText ?? textBox.text ?? "").toString();

  // Tiny boxes: draw indicator
  if (innerW <= 6 || innerH <= 6) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      boxX + 1,
      boxY + 1,
      Math.max(1, boxW - 2),
      Math.max(1, boxH - 2)
    );
    ctx.clip();
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `1px ${family}`;
    ctx.fillText("…", boxX + 1, boxY + 1);
    ctx.restore();
    return;
  }

  // --- scaling behavior: start at 20, only scale after first resize ---
  const baseFont = Number(textBox.baseFontSize ?? 20);
  const minFont = Number(textBox.minFontSize ?? 6);

  // If computeScaledTargetFont isn't provided, fall back safely
  const scaledTarget =
    typeof computeScaledTargetFont === "function"
      ? computeScaledTargetFont({ ...textBox, width: boxW, height: boxH })
      : baseFont;

  const targetFont = textBox.hasScaled ? scaledTarget : baseFont;

  // IMPORTANT: set font BEFORE wrapping/measurement
  ctx.font = `${targetFont}px ${family}`;

  // Canonical layout (must match resize + commit)
  const layout = wrapTextPreservingNewlinesResponsive(
    sourceText,
    ctx,
    boxW,
    boxH,
    targetFont,                 // "max font" for fitter
    padding,                    // already clamped
    minFont,
    family,
    4
  );

  const lines =
    Array.isArray(layout?.lines) && layout.lines.length ? layout.lines : [""];

  const fittedFont = Math.max(minFont, Number(layout?.fontSize) || targetFont);
  ctx.font = `${fittedFont}px ${family}`;

  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Clip to inner rect
  ctx.save();
  ctx.beginPath();
  ctx.rect(boxX + padding, boxY + padding, innerW, innerH);
  ctx.clip();

  const lineHeight = Math.max(1, Number(layout?.lineHeight) || (fittedFont + 4));

  for (let i = 0; i < lines.length; i++) {
    const yy = boxY + padding + i * lineHeight;
    if (yy > boxY + padding + innerH - 1) break;
    ctx.fillText(lines[i], boxX + padding, yy);
  }

  ctx.restore();
}

