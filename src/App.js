import React, { useRef, useEffect, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';

function App() {
  let fontSize = 20;
  const cellSize = 20;
  const boxPadding = 20;
  
  const canvasRef = useRef(null);
  const [textItems, setTextItems] = useState([]); // List of text items on the canvas
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [selectedTextIndex, setSelectedTextIndex] = useState(null); // Track the selected text
  const [showAddTextModal, setShowAddTextModal] = useState(false); // Control modal visibility
  const [newText, setNewText] = useState(''); // Text input for the modal
  const [selectedTextIndexes, setSelectedTextIndexes] = useState([]); // Store indexes of selected texts
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [initialPositions, setInitialPositions] = useState([]);
  const [isSelectingModeEnabled, setIsSelectingModeEnabled] = useState(true);     // State to track whether selecting mode is enabled
  const [maxWidth, setMaxWidth] = useState(200); // Max width input for the modal

  const [imageItems, setImageItems] = useState([]); // State to hold images added to the canvas
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);   // State to track the selected image


  // State to track editing mode and the text being edited
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  // State to track the font size being edited
const [editingFontSize, setEditingFontSize] = useState(fontSize); // Default font size


// State for new text and font size
const [newFontSize, setNewFontSize] = useState(fontSize); // Default font size

// Function to toggle selecting mode
const toggleSelectingMode = () => {
  setIsSelectingModeEnabled((prevMode) => !prevMode);
};


// Function to handle file input change
const handleAddImage = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.src = reader.result; // Base64 encoded image
    img.onload = () => {
      const newItem = { 
        image: img, 
        data: reader.result, // Store base64 data for persistence
        x: 50, 
        y: 50, 
        width: img.width / 2, 
        height: img.height / 2 
      };
      const updatedItems = [...imageItems, newItem];
      setImageItems(updatedItems);
      saveImageItemsToLocalStorage(updatedItems); // Save to localStorage
      drawCanvas();
    };
  };
  reader.readAsDataURL(file);
};



  // useEffect(() => {
  //   const storedTextItems = localStorage.getItem('textItems');
  //   if (storedTextItems) {
  //     setTextItems(JSON.parse(storedTextItems));
  //   }
  // }, []);


  // useEffect(() => {
  //   saveImageItemsToLocalStorage(imageItems);
  // }, [imageItems]);
  

  // Load images and text items from local storage on mount
useEffect(() => {
  const storedTextItems = localStorage.getItem('textItems');
  const storedImageItems = localStorage.getItem('imageItems');

  if (storedTextItems) {
    setTextItems(JSON.parse(storedTextItems));
  }

  if (storedImageItems) {
    const parsedImages = JSON.parse(storedImageItems).map((item) => ({
      ...item,
      image: createImageElement(item.data), // Convert base64 back to Image element
    }));
    setImageItems(parsedImages);
  }
}, []);






// Save image items to local storage
const saveImageItemsToLocalStorage = (items) => {
  const serializedImages = items.map((item) => ({
    data: item.data, // Save base64 data
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  }));
  localStorage.setItem('imageItems', JSON.stringify(serializedImages));
};


// Utility function to create an Image element from base64 data
const createImageElement = (data) => {
  const img = new Image();
  img.src = data;
  return img;
};


  useEffect(() => {
    // Add keydown event listener for moving text with arrow keys
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTextSelected, selectedTextIndex, textItems]);



  // Function to remove selected text
const removeSelectedText = () => {
  if (selectedTextIndex !== null) {
    // Remove the selected text item from the list
    const updatedItems = textItems.filter((_, index) => index !== selectedTextIndex);


    // Update state and localStorage
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    // Reset selection
    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
  if(selectedTextIndexes.length >=1) {
    // Remove the selected text item from the list
    const updatedItems = textItems.filter((_, index) => selectedTextIndexes.forEach((e,i) => index !== i));


    // Update state and localStorage
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    // Reset selection
    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
};

  const saveTextItemsToLocalStorage = (items) => {
    localStorage.setItem('textItems', JSON.stringify(items));
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 768;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (showGrid) drawGrid(ctx);

    textItems.forEach((item, index) => {
      ctx.font = `${item.fontSize}px Arial`;
      const textWidth = ctx.measureText(item.text).width;
      const textHeight = ctx.measureText(item.text);
      let actualHeight = textHeight.actualBoundingBoxAscent + textHeight.actualBoundingBoxDescent
      if (selectedTextIndexes.includes(index)) {
        ctx.strokeStyle = 'rgba(30, 144, 255, 0.7)'; // Dodgerblue for selected bounding box
        ctx.lineWidth = 1;
        ctx.strokeRect(
          item.x - item.boxPadding,
          item.y - actualHeight - item.boxPadding,
          textWidth + item.boxPadding * 2,
          actualHeight + item.boxPadding * 2
        );
      }

      ctx.fillStyle = 'black';
      ctx.fillText(item.text, item.x, item.y);
    });

    // Draw image items
    imageItems.forEach((item) => {
      ctx.drawImage(item.image, item.x, item.y, item.width, item.height);
    });

    // Draw the selection square if selecting
    if (isSelecting) {
      const rectWidth = selectionEnd.x - selectionStart.x;
      const rectHeight = selectionEnd.y - selectionStart.y;
      ctx.strokeStyle = 'dodgerblue';
      ctx.fillStyle = 'rgba(30, 144, 255, 0.3)'; // Transparent dodgerblue
      ctx.lineWidth = 1;
      ctx.strokeRect(selectionStart.x, selectionStart.y, rectWidth, rectHeight);
      ctx.fillRect(selectionStart.x, selectionStart.y, rectWidth, rectHeight);
    }
  };

  const drawGrid = (ctx) => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < ctx.canvas.width; x += cellSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
    }

    for (let y = 0; y < ctx.canvas.height; y += cellSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
    }

    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    if (!isSelectingModeEnabled) return; // Exit if selecting mode is disabled
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `${fontSize}px Arial`;

    let clickedOnText = false;

    textItems.forEach((item, index) => {
      const textWidth = ctx.measureText(item.text).width;
      const textHeight = ctx.measureText(item.text);
      let actualHeight = textHeight.actualBoundingBoxAscent + textHeight.actualBoundingBoxDescent

      // Check if the click is within the bounding box of any text item
      if (
        offsetX >= item.x - boxPadding &&
        offsetX <= item.x + textWidth + boxPadding &&
        offsetY >= item.y - actualHeight - boxPadding &&
        offsetY <= item.y + boxPadding
      ) {
        setIsTextSelected(true);
        setSelectedTextIndexes([index]);
        setSelectedTextIndex(index);
        setDragStart({ x: offsetX, y: offsetY });
        setIsDragging(true);
        clickedOnText = true;
        const positions = selectedTextIndexes.map(i => ({
          index: i,
          x: textItems[i].x,
          y: textItems[i].y,
        }));
        setInitialPositions(positions)

        
      // if (selectedTextIndexes.includes(index)) {
      //   setIsDragging(true);
      //   setDragStart({ x: offsetX, y: offsetY });
      //   // Capture initial positions of all selected texts
      //   const positions = selectedTextIndexes.map(i => ({
      //     index: i,
      //     x: textItems[i].x,
      //     y: textItems[i].y,
      //   }));
      //   setInitialPositions(positions);
      //   clickedOnText = true;
      // }



      }

    });

    // Only set up selection square if click is outside any text bounding box
    if (!clickedOnText) {
      setIsSelecting(true);
      setSelectionStart({ x: offsetX, y: offsetY });
      setSelectionEnd({ x: offsetX, y: offsetY });
      setSelectedTextIndexes([]);
      setSelectedTextIndex(null);
      setIsTextSelected(false);
    }




  let imageClicked = false;

  imageItems.forEach((item, index) => {
    if (
      offsetX >= item.x &&
      offsetX <= item.x + item.width &&
      offsetY >= item.y &&
      offsetY <= item.y + item.height
    ) {
      setSelectedImageIndex(index); // Set the clicked image as selected
      setIsImageDragging(true);
      setDraggedImageIndex(index);
      setDragStart({ x: offsetX, y: offsetY });
      imageClicked = true;
      
      
    }
  });

  if (imageClicked) {
    setIsSelecting(false); // Disable selection square if an image is being dragged
    return; // Exit to prevent triggering selection logic
  }






  };

  const handleMouseMove = (e) => {
    if (isSelecting) {
      setSelectionEnd({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
      drawCanvas();
    }

    if (isDragging) {
      const offsetX = e.nativeEvent.offsetX - dragStart.x;
      const offsetY = e.nativeEvent.offsetY - dragStart.y;

      const updatedItems = [...textItems];



      if(initialPositions.length >= 2) {
        initialPositions.forEach((pos) => {
          const { index, x, y } = pos;
          updatedItems[index] = {
            ...updatedItems[index],
            x: updatedItems[index].x + offsetX,
            y: updatedItems[index].y + offsetY,
          };
        });
      } else {
              //TOREMOVE
      selectedTextIndexes.forEach((index) => {
        updatedItems[index] = {
          ...updatedItems[index],
          x: updatedItems[index].x + offsetX,
          y: updatedItems[index].y + offsetY,
        };
      });
      }

      setTextItems(updatedItems);
      saveTextItemsToLocalStorage(updatedItems);
      setDragStart({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
      drawCanvas();
    }


    if (isImageDragging && draggedImageIndex !== null) {
      const { offsetX, offsetY } = e.nativeEvent;
      const deltaX = offsetX - dragStart.x;
      const deltaY = offsetY - dragStart.y;
  
      const updatedItems = [...imageItems];
      updatedItems[draggedImageIndex].x += deltaX;
      updatedItems[draggedImageIndex].y += deltaY;
  
      setImageItems(updatedItems);
      saveImageItemsToLocalStorage(updatedItems); // Save updated positions to localStorage
      setDragStart({ x: offsetX, y: offsetY });
      drawCanvas();
    }
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      const selectionRect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y),
      };

      const selectedIndexes = [];
      const ctx = canvasRef.current.getContext('2d');
      ctx.font = `${fontSize}px Arial`;

      textItems.forEach((item, index) => {
        const textWidth = ctx.measureText(item.text).width;
        const textHeight = ctx.measureText(item.text);
        let actualHeight = textHeight.actualBoundingBoxAscent + textHeight.actualBoundingBoxDescent
        const textRect = {
          x: item.x - item.boxPadding,
          y: item.y - actualHeight - item.boxPadding,
          width: textWidth + item.boxPadding,
          height: actualHeight + item.boxPadding,
        };

        if (
          selectionRect.x < textRect.x + textRect.width &&
          selectionRect.x + selectionRect.width > textRect.x &&
          selectionRect.y < textRect.y + textRect.height &&
          selectionRect.y + selectionRect.height > textRect.y
        ) {
          selectedIndexes.push(index);

          const pos = {
            index: index,
            x: item.x,
            y: item.y,
          }
          initialPositions.push(pos);
          
        }
      });

      setSelectedTextIndexes(selectedIndexes);
      setInitialPositions(initialPositions);
      setIsTextSelected(selectedIndexes.length > 0);
    }

    if (isDragging) {
      setIsDragging(false);
      setInitialPositions([]);
      setDragStart({ x: 0, y: 0 });
    }

    if (isImageDragging) {
      setIsImageDragging(false);
      setDraggedImageIndex(null);
      setDragStart({ x: 0, y: 0 });
    }



    // //Deselect selection square while no text is selected
    // setIsTextSelected(true);
    // setIsSelecting(true);
    setSelectionStart({});
    setSelectionEnd({});


    
  };

  const handleKeyDown = (e) => {
    //e.preventDefault();
    if (isTextSelected && selectedTextIndex !== null) {
      const updatedItems = [...textItems];
      const selectedItem = updatedItems[selectedTextIndex];
      
      // Move the selected text item based on the arrow key pressed
      if (e.key === 'ArrowUp') selectedItem.y -= 1;
      if (e.key === 'ArrowDown') selectedItem.y += 1;
      if (e.key === 'ArrowLeft') selectedItem.x -= 1;
      if (e.key === 'ArrowRight') selectedItem.x += 1;

      // Ensure text stays within canvas bounds
      selectedItem.x = Math.max(0, Math.min(selectedItem.x, canvasRef.current.width - fontSize));
      selectedItem.y = Math.max(fontSize, Math.min(selectedItem.y, canvasRef.current.height));

      setTextItems(updatedItems);
      saveTextItemsToLocalStorage(updatedItems); // Save updated position in localStorage
    }
  };

// Function to handle adding new text to the canvas
const addTextToCanvas = () => {
  if (newText.trim() !== '') {
    const padding = newFontSize * 0.2; // Calculate dynamic padding (20% of font size)
    let newItem = newText;
    const wrappedText = wrapText(newItem, maxWidth); // Wrap text based on maxWidth
    newItem = [];
    wrappedText.forEach(e => newItem.push( { 
      text: e.text, 
      fontSize: newFontSize, 
      boxPadding: padding, // Include dynamic box padding
      x: e.x, 
      y: e.y 
    }))
    const updatedItems = [...textItems, ...newItem];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    setShowAddTextModal(false); // Close modal
    setNewText(''); // Reset text input
    setNewFontSize(fontSize); // Reset font size input
    setMaxWidth(200); // Reset maxWidth input
    drawCanvas(); // Redraw canvas to show new text immediately
  }
};


// Handle deleting the selected image
const deleteSelectedImage = () => {
  if (selectedImageIndex !== null) {
    const updatedItems = imageItems.filter((_, index) => index !== selectedImageIndex);
    setImageItems(updatedItems); // Update state
    saveImageItemsToLocalStorage(updatedItems); // Save to localStorage
    setSelectedImageIndex(null); // Reset selected image
    drawCanvas(); // Redraw canvas without the deleted image
  }
};


// Function to wrap text based on maxWidth
const wrapText = (text, maxWidth) => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px Arial`;

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  let y = 50; // Default starting y-coordinate

  words.forEach((word) => {
    const testLine = currentLine + word + ' ';
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push({ text: currentLine.trim(), x: 50, y }); // Add current line
      currentLine = word + ' ';
      y += fontSize + 5; // Move to next line
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push({ text: currentLine.trim(), x: 50, y }); // Add remaining text
  }

  return lines;
};

  const toggleGrid = () => {
    setShowGrid((prevShowGrid) => !prevShowGrid);
    drawCanvas();
  };

  const saveCanvasAsPDF = async () => {
    const canvas = canvasRef.current;
    const { width, height } = canvas;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    textItems.forEach((item) => {
      page.drawText(item.text, {
        x: item.x,
        y: height - item.y,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    });

  // Add image items to PDF
  for (const item of imageItems) {
    const imgBytes = await fetch(item.data).then((res) => res.arrayBuffer());
    const pdfImage = await pdfDoc.embedPng(imgBytes); // Assuming PNG; use `embedJpg` for JPEG
    page.drawImage(pdfImage, {
      x: item.x,
      y: height - item.y - item.height, // Adjust for PDF coordinate system
      width: item.width,
      height: item.height,
    });
  }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'canvas_content.pdf';
    link.click();
  };

  useEffect(() => {
    drawCanvas();
  }, [textItems, showGrid, isTextSelected]);











// Function to handle double-click on a text
const handleDoubleClick = (e) => {
  const { offsetX, offsetY } = e.nativeEvent;
  const ctx = canvasRef.current.getContext('2d');
  ctx.font = `${fontSize}px Arial`;

  textItems.forEach((item, index) => {
    const textWidth = ctx.measureText(item.text).width;
    const textHeight = ctx.measureText(item.text);
    let actualHeight = textHeight.actualBoundingBoxAscent + textHeight.actualBoundingBoxDescent
    // Check if the double-click is within the bounding box of a text
    if (
      offsetX >= item.x - item.boxPadding &&
      offsetX <= item.x + textWidth + item.boxPadding &&
      offsetY >= item.y - actualHeight - item.boxPadding &&
      offsetY <= item.y + item.boxPadding
    ) {
      setIsEditing(true); // Enter editing mode
      setEditingText(item.text); // Pre-fill the modal with the current text
      setEditingFontSize(item.fontSize || fontSize); // Pre-fill with the current font size
      setEditingIndex(index); // Track the index of the text being edited
    }
  });
};

// Function to save the edited text and font size
const saveEditedText = () => {
  if (editingIndex !== null && editingText.trim() !== '') {
    const updatedItems = [...textItems];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      text: editingText, // Update the text
      fontSize: editingFontSize, // Update the font size
    };
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    closeEditModal(); // Close the modal
  }
};

// Function to close the edit modal
const closeEditModal = () => {
  setIsEditing(false);
  setEditingText('');
  setEditingIndex(null);
};



  return (
    <div style={{ padding: '20px' }}>
      <h1>PdfEditor //not_finished</h1>
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid black', marginBottom: '20px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      <button onClick={() => setShowAddTextModal(true)}>Add Text</button>
      <button onClick={toggleGrid} style={{ marginLeft: '10px' }}>
        {showGrid ? 'Hide Grid' : 'Show Grid'}
      </button>
      <button onClick={saveCanvasAsPDF} style={{ marginLeft: '10px' }}>
        Save as PDF
      </button>
      <button onClick={removeSelectedText}  disabled={selectedTextIndex === null && selectedTextIndexes.length < 1} style={{ marginLeft: '10px' }}>
          Remove Text
      </button>
      <button onClick={toggleSelectingMode} style={{ marginLeft: '10px' }}>
        {isSelectingModeEnabled ? 'Disable Selecting' : 'Enable Selecting'}
      </button>
      <input
      type="file"
      accept="image/*"
      onChange={handleAddImage}
      style={{ marginBottom: '10px' }}
    />
    <button
      onClick={deleteSelectedImage}
      disabled={selectedImageIndex === null} // Disable button if no image is selected
      style={{ marginLeft: '10px' }}
    >
      Delete Image
    </button>
      {
  showAddTextModal && (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        border: '1px solid #ccc',
        boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      }}
    >
      <h2>Add New Text</h2>
      <input
        type="text"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="Enter text here"
        style={{ marginBottom: '10px', display: 'block', width: '100%' }}
      />
      <input
        type="number"
        value={newFontSize}
        onChange={(e) => setNewFontSize(parseInt(e.target.value, 10))}
        placeholder="Font Size"
        style={{ marginBottom: '10px', display: 'block', width: '100%' }}
      />
       <input
        type="number"
        value={maxWidth}
        onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
        placeholder="Enter max width (e.g., 200)"
        style={{ marginBottom: '10px', display: 'block', width: '100%' }}
      />
      <div>
        <button onClick={addTextToCanvas}>Ok</button>
        <button
          onClick={() => {
            setShowAddTextModal(false);
            setNewText('');
            setMaxWidth(200);
            setNewFontSize(fontSize);
          }}
          style={{ marginLeft: '10px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

{
  isEditing && (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        border: '1px solid #ccc',
        boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      }}
    >
      <h2>Edit Text</h2>
      <input
        type="text"
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        placeholder="Edit text here"
        style={{ marginBottom: '10px', display: 'block', width: '100%' }}
      />
      <input
        type="number"
        value={editingFontSize}
        onChange={(e) => setEditingFontSize(parseInt(e.target.value, 10))}
        placeholder="Font Size"
        style={{ marginBottom: '10px', display: 'block', width: '100%' }}
      />
      <div>
        <button onClick={saveEditedText}>Save</button>
        <button onClick={closeEditModal} style={{ marginLeft: '10px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
    </div>
  );
}

export default App;