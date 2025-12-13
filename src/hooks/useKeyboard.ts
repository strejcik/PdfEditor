import { useCallback } from "react";

export function useKeyboard() {

    let _ghKeyDown:any = [];

    const handleKeyDown = useCallback((e:any, opts:any) => {
      const {
        canvasRefs,
        fontSize,
        isTextBoxEditEnabled,
        textBox,
        textItems,
        isMultilineMode,
        mlText,
        mlCaret, 
        mlAnchor, 
        mlPreferredX, 
        activePage, 
        mlConfig,
        setSelectedTextIndexes,
        setIsTextSelected,
        setSelectedTextIndex,
        setTextItems,
        setMlText,
        selectedTextIndexesRef,
        saveTextItemsToIndexedDB,
        updatePageItems,
        wrapTextPreservingNewlinesResponsive,
        setTextBox,
        toUnits,
        pdfToCssMargins,
        layoutMultiline,
        setMlCaret,
        setMlAnchor,
        indexToXY,
        setMlPreferredX
      } = opts;
      _ghKeyDown.push({
        activePage,
        canvasRefs,
        fontSize,
        isTextBoxEditEnabled,
        textBox,
        textItems,
        isMultilineMode,
        mlText,
        mlCaret, 
        mlAnchor, 
        mlPreferredX, 
        mlConfig,
        setSelectedTextIndexes,
        setIsTextSelected,
        setSelectedTextIndex,
        setTextItems,
        setMlText,
      })
      const tag = (e.target?.tagName || "").toLowerCase();
      const typingInDOMField =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
    
    
      // Ctrl + A: select all textItems on the active page
      if (e.ctrlKey && (e.key === "a" || e.key === "A") && !isMultilineMode) {
        e.preventDefault();
    
        // Build ids only for the active page (no undefined holes)
        const allIds = textItems
          .map((it:any, idx:any) => (it.index === activePage ? idx : null))
          .filter((v:any) => v !== null);
    
        setSelectedTextIndexes(allIds);
        setIsTextSelected(allIds.length > 0);
        setSelectedTextIndex(allIds.length ? allIds[allIds.length - 1] : null);
        return;
      }
    
      if (e.key === "Delete" && !isMultilineMode) {
        e.preventDefault();
        const toRemove = selectedTextIndexesRef.current;
        if (toRemove.length > 0) {
          const updated = textItems.filter((_:any, i:any) => !toRemove.includes(i));
          setTextItems(updated);
          saveTextItemsToIndexedDB(updated);
          updatePageItems("textItems", updated.filter((it:any) => it.index === activePage));
          setSelectedTextIndexes([]);
          setIsTextSelected(false);
          setSelectedTextIndex(null);
          return;
        }
      }
    
      if (isTextBoxEditEnabled && textBox && !typingInDOMField && !isMultilineMode) {
        const prevRaw = (textBox.rawText ?? textBox.text ?? "");
        let nextRaw = prevRaw;

        if (e.key === "Enter") nextRaw += "\n";
        else if (e.key === "Backspace") nextRaw = nextRaw.slice(0, -1);
        else if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) nextRaw += " ";
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) nextRaw += e.key;
        else return;

        const canvas = canvasRefs.current[activePage];
        const ctx = canvas.getContext("2d");

        const family = "Lato";
        const padding = textBox.boxPadding || 10;

        const currentMaxFont = textBox.fontSize || fontSize;
        ctx.font = `${currentMaxFont}px ${family}`;

        const wrapped = wrapTextPreservingNewlinesResponsive(
          nextRaw,
          ctx,
          textBox.width,
          currentMaxFont,
          padding,
          textBox.height
        );

        // Height guard (block overflow at bottom)
        const lineHeight = wrapped.fontSize + 4;
        const innerH = textBox.height - padding * 2;
        const contentH = wrapped.lines.length * lineHeight;

        if (contentH > innerH + 0.001) {
          // allow backspace even if guards disagree due to rounding
          if (e.key === "Backspace") {
            setTextBox({ ...textBox, rawText: nextRaw, text: wrapped.lines.join("\n"), fontSize: wrapped.fontSize });
          }
          return;
        }

        setTextBox({
          ...textBox,
          rawText: nextRaw,                 // <-- preserves spaces
          text: wrapped.lines.join("\n"),   // <-- drawing uses wrapped version
          fontSize: wrapped.fontSize,
        });
    }
    
      // MULTI-LINE MODE
      if (isMultilineMode && !typingInDOMField) {
        // ignore meta shortcuts except shift for selection
        if (e.metaKey || e.ctrlKey) return;
    
        const units = toUnits(mlText);
        const clamp = (v:any) => Math.max(0, Math.min(v, units.length));
    
        // selection helpers
        const hasSel = mlCaret !== mlAnchor;
        const selA = Math.min(mlCaret, mlAnchor);
        const selB = Math.max(mlCaret, mlAnchor);
    
        // prepare layout for navigation
        const canvas = canvasRefs.current[activePage];
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext("2d");
        const m = pdfToCssMargins(rect, mlConfig.marginsPDF);
        const layout = layoutMultiline(ctx, mlText, {
          x: m.left, y: m.top,
          maxWidth: rect.width - (m.left + m.right),
          maxHeight: rect.height - (m.top + m.bottom),
          fontSize: mlConfig.fontSize,
          fontFamily: mlConfig.fontFamily,
          lineGap: mlConfig.lineGap
        });
    
        const moveCaret = (newPos:any, keepAnchor=false) => {
          const pos = clamp(newPos);
          setMlCaret(pos);
          if (!keepAnchor) setMlAnchor(pos);
          const { x } = indexToXY(pos, layout);
          setMlPreferredX(x);
        };
    
        // Navigation
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (hasSel && !e.shiftKey) {
            moveCaret(selA, false); // collapse to start
          } else {
            moveCaret(mlCaret - 1, e.shiftKey);
          }
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (hasSel && !e.shiftKey) {
            moveCaret(selB, false); // collapse to end
          } else {
            moveCaret(mlCaret + 1, e.shiftKey);
          }
          return;
        }
        if (e.key === "Home") {
          e.preventDefault();
          // go to line start
          const { line } = indexToXY(mlCaret, layout);
          if (line) moveCaret(line.start, e.shiftKey);
          return;
        }
        if (e.key === "End") {
          e.preventDefault();
          const { line } = indexToXY(mlCaret, layout);
          if (line) moveCaret(line.end, e.shiftKey);
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const dir = (e.key === "ArrowUp") ? -1 : 1;
          const { x, line } = indexToXY(mlCaret, layout);
          const targetX = mlPreferredX ?? x;
    
          let li = layout.lines.findIndex((L:any) => mlCaret >= L.start && mlCaret <= L.end);
          if (li === -1) li = 0;
          const newLi = li + dir;
          if (newLi >= 0 && newLi < layout.lines.length) {
            const L = layout.lines[newLi];
            // find column by nearest boundary to targetX
            let bestCol = 0, bestDist = Infinity;
            for (let c = 0; c < L.charX.length; c++) {
              const d = Math.abs(L.charX[c] - targetX);
              if (d < bestDist) { bestDist = d; bestCol = c; }
            }
            if(e.key === "ArrowUp") {
              moveCaret(L.start + bestCol, e.shiftKey);
            }
            if(e.key === "ArrowDown") {
              moveCaret((L.start + bestCol) + dir, e.shiftKey);
            }
          }
          return;
        }
    
        // Editing
        if (e.key === "Enter") {
          e.preventDefault();
          let next = mlText;
          if (hasSel) next = toUnits(next).slice(0, selA).join("") + "\n" + toUnits(next).slice(selB).join("");
          else        next = toUnits(next).slice(0, mlCaret).join("") + "\n" + toUnits(next).slice(mlCaret).join("");
          setMlText(next);
          const newPos = hasSel ? selA + 1 : mlCaret + 1;
          setMlCaret(newPos);
          setMlAnchor(newPos);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          if (hasSel) {
            const next = toUnits(mlText).slice(0, selA).concat(toUnits(mlText).slice(selB)).join("");
            setMlText(next); moveCaret(selA, false);
          } else if (mlCaret > 0) {
            const arr = toUnits(mlText);
            arr.splice(mlCaret - 1, 1);
            setMlText(arr.join("")); moveCaret(mlCaret - 1, false);
          }
          return;
        }
        if (e.key === "Delete") {
          e.preventDefault();
          if (hasSel) {
            const next = toUnits(mlText).slice(0, selA).concat(toUnits(mlText).slice(selB)).join("");
            setMlText(next); moveCaret(selA, false);
          } else {
            const arr = toUnits(mlText);
            if (mlCaret < arr.length) { arr.splice(mlCaret, 1); setMlText(arr.join("")); }
          }
          return;
        }
    
        // Insert printable character
        if (e.key.length === 1) {
          e.preventDefault();
          const ch = e.key;
          let arr = toUnits(mlText);
          if (hasSel) {
            arr = arr.slice(0, selA).concat([ch], arr.slice(selB));
            setMlText(arr.join("")); moveCaret(selA + 1, false);
          } else {
            if(arr.length === 0) {
              const ch = e.key;
    
              // Current text as grapheme array
              const units = toUnits(mlText);
    
    
              let newUnits, newPos;
    
              if (hasSel) {
                // Replace selection with the typed char
                newUnits = units.slice(0, selA).concat([ch], units.slice(selB));
                newPos = selA + 1;
              } else {
                // Insert at caret
                newUnits = units.slice(0, mlCaret).concat([ch], units.slice(mlCaret));
                newPos = mlCaret + 1;              // ← caret after the newly inserted char
              }
    
              const newText = newUnits.join("");
              setMlText(newText);
    
              // Set caret & anchor AFTER text so it lands after the new char
              setMlCaret(newPos);
              setMlAnchor(newPos);
              return ;
            }
            arr.splice(mlCaret, 0, ch);
            setMlText(arr.join(""));
            setMlCaret(mlCaret + 1);
            setMlAnchor(mlCaret + 1);
          }
          return;
        }
    
        return; // handled multiline
      }
    }, [
      // keep these minimal—avoid re-creating handler constantly
      _ghKeyDown
    ]);


    return {
        handleKeyDown,
    }
}