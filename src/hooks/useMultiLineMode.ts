import { useCallback, useState } from "react";

export function useMultiLineMode() {
const [isMultilineMode, setIsMultilineMode] = useState(false);
const [mlText, setMlText] = useState(""); // page-level text buffer (per active page if you want)
const [mlConfig, setMlConfig] = useState({
  fontFamily: "Lato",
  fontSize: 20,
  lineGap: 4, // px between lines
  marginsPDF: { top: 36, right: 36, bottom: 36, left: 36 }, // PDF units
});

const toggleMultilineMode = useCallback(() => {
  setIsMultilineMode(v => !v);
}, []);

  
  return {
    isMultilineMode, setIsMultilineMode,
    mlText, setMlText,
    mlConfig, setMlConfig,
    toggleMultilineMode
  };
}