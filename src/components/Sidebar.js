
import React from 'react';

const Sidebar = ({
  snapEnabled, setSnapEnabled,
  handleFileChange, uploadPdfToServer,
  addNewPage, removePage,
  setShowAddTextModal, toggleGrid, showGrid,
  saveAllPagesAsPDF, removeSelectedText,
  selectedTextIndex, selectedTextIndexes,
  toggleSelectingMode, isSelectingModeEnabled,
  handleAddImage, isTextBoxEditEnabled, setIsTextBoxEditEnabled,
  textBox, addTextToCanvas2, maxWidth, setTextBox,
  deleteSelectedImage, selectedImageIndex
}) => {
  return (
    <div className="sidebar" style={{ paddingRight: '20px' }}>
      <h2>Controls</h2>
      <button onClick={() => setSnapEnabled(prev => !prev)}>
        {snapEnabled ? 'Disable Snap' : 'Enable Snap'}
      </button>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={uploadPdfToServer}>Upload PDF</button>
      <button onClick={addNewPage}>Add New Page</button>
      <button onClick={removePage}>Remove Page</button>
      <button onClick={() => setShowAddTextModal(true)}>Add Text</button>
      <button onClick={toggleGrid}>
        {showGrid ? 'Hide Grid' : 'Show Grid'}
      </button>
      <button onClick={saveAllPagesAsPDF}>Save as PDF</button>
      <button
        onClick={removeSelectedText}
        disabled={selectedTextIndex === null && selectedTextIndexes.length < 1}
      >
        Remove Text
      </button>
      <button onClick={toggleSelectingMode}>
        {isSelectingModeEnabled ? 'Disable Selecting' : 'Enable Selecting'}
      </button>
      <input type="file" accept="image/*" onChange={handleAddImage} />
      <button
        onClick={() => {
          setIsTextBoxEditEnabled((prev) => !prev);
          if (textBox !== null) {
            addTextToCanvas2(textBox, maxWidth);
          }
          setTextBox(null);
        }}
      >
        {isTextBoxEditEnabled ? 'Save TextBox' : 'Enable TextBox Edit'}
      </button>
      <button
        onClick={deleteSelectedImage}
        disabled={selectedImageIndex === null}
      >
        Delete Image
      </button>
    </div>
  );
};

export default Sidebar;
