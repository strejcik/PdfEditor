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


  
  return {
    isMultilineMode, setIsMultilineMode,
    mlText, setMlText,
    mlConfig, setMlConfig,
    mlCaret, setMlCaret,
    mlAnchor, setMlAnchor,
    mlPreferredX, setMlPreferredX,
    mlCaretBlink, setMlCaretBlink,
    isMlDragging, setIsMlDragging,
    toggleMultilineMode
  };
}