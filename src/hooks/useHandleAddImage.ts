export function useHandleAddImage({
  getActivePage,            // () => number
  addImageFromFile,         // (file, pageIndex, { x, y, scale }) => Promise<void>
  pushSnapshotToUndo,       // (pageIndex) => void
  drawCanvas,               // optional: (pageIndex) => void
}) {
  // returns an onChange handler for <input type="file" />
  const handleAddImage = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const pageIndex = getActivePage();
      pushSnapshotToUndo?.(pageIndex); // snapshot BEFORE mutation
      await addImageFromFile(file, pageIndex, { x: 50, y: 50, scale: 0.5 });

      // If you don't use effect-driven redraw, you can force a draw:
      // drawCanvas?.(pageIndex);

    } finally {
      // allow re-selecting the same file
      if (e?.target) e.target.value = "";
    }
  };

  return { handleAddImage };
}