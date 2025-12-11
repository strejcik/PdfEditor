import { useState } from "react";

export function useUiPanels() {
  const [openSections, setOpenSections] = useState({
    PDF: false,
    Pages: false,
    Text: false,
    Images: false,
    TextBox: false,
    History: false,
    Data: false,
  });

  return { openSections, setOpenSections };
}