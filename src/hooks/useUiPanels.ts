import { useState } from "react";

export function useUiPanels() {
  const [openSections, setOpenSections] = useState({
    PDF: true,
    Pages: true,
    Text: true,
    Images: true,
    TextBox: true,
    History: true,
    Data: false,
  });

  return { openSections, setOpenSections };
}