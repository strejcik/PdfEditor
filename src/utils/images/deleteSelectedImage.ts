/**
 * Deletes the selected image from the canvas
 */
export const deleteSelectedImage = ({
  selectedImageIndex,
  imageItems,
  activePage,
  setImageItems,
  saveImageItemsToIndexedDB,
  updatePageItems,
  setSelectedImageIndex,
  drawCanvas,
}: {
  selectedImageIndex: number | null;
  imageItems: any[];
  activePage: number;
  setImageItems: (items: any[]) => void;
  saveImageItemsToIndexedDB: (items: any[]) => void;
  updatePageItems: (key: string, items: any[]) => void;
  setSelectedImageIndex: (index: number | null) => void;
  drawCanvas: (pageIndex: number) => void;
}) => {
  if (selectedImageIndex !== null) {
    const filteredItems = imageItems.filter((item, index) => {
      if (item.index !== activePage) return true; // keep images from other pages
      const pageImages = imageItems.filter(i => i.index === activePage);
      const targetItem = pageImages[selectedImageIndex];
      return item !== targetItem; // remove only the matched item from current page
    });

    setImageItems(filteredItems);
    saveImageItemsToIndexedDB(filteredItems);
    updatePageItems('imageItems', filteredItems);
    setSelectedImageIndex(null);
    drawCanvas(activePage);
  }
};
