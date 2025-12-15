/**
 * Save edited text item and update the state
 */
export const saveEditedText = ({
  editingIndex,
  editingText,
  editingFontSize,
  textItems,
  activePage,
  setTextItems,
  saveTextItemsToIndexedDB,
  setPages,
  closeEditModal,
  drawCanvas,
}: {
  editingIndex: number | null;
  editingText: string;
  editingFontSize: number;
  textItems: any[];
  activePage: number;
  setTextItems: (items: any[]) => void;
  saveTextItemsToIndexedDB: (items: any[]) => void;
  setPages: (fn: (prev: any[]) => any[]) => void;
  closeEditModal: () => void;
  drawCanvas: (pageIndex: number) => void;
}) => {
  if (editingIndex !== null && editingText.trim() !== '') {
    const updatedItems = [...textItems];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      text: editingText, // Update the text
      fontSize: editingFontSize, // Update the font size
      index: activePage,
      boxPadding: editingFontSize * 0.2,
    };

    // In your handler where you append itemsToAdd
    const nextTextItems = [...updatedItems];
    setTextItems(nextTextItems);

    // Use the SAME computed array right away:
    saveTextItemsToIndexedDB?.(nextTextItems);

    setPages(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const page = next[activePage] || { textItems: [], imageItems: [] };

      // Only items for this page
      const forThisPage = nextTextItems.filter(it => it.index === activePage);

      next[activePage] = {
        ...page,
        textItems: forThisPage.map(it => ({ ...it })), // keep immutable
        imageItems: page.imageItems || [],
      };
      return next;
    });
    closeEditModal(); // Close the modal
    drawCanvas(activePage);
  }
};
