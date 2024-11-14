import React, { useRef, useEffect, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';

function App() {
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

  const fontSize = 30;
  const cellSize = 20;
  const boxPadding = 10;

  useEffect(() => {
    const storedTextItems = localStorage.getItem('textItems');
    if (storedTextItems) {
      setTextItems(JSON.parse(storedTextItems));
    }
  }, []);

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
      ctx.font = `${fontSize}px Arial`;
      const textWidth = ctx.measureText(item.text).width;
      const textHeight = fontSize;

      if (selectedTextIndexes.includes(index)) {
        ctx.strokeStyle = 'rgba(30, 144, 255, 0.7)'; // Dodgerblue for selected bounding box
        ctx.lineWidth = 1;
        ctx.strokeRect(
          item.x - boxPadding,
          item.y - textHeight - boxPadding,
          textWidth + boxPadding * 2,
          textHeight + boxPadding * 2
        );
      }

      ctx.fillStyle = 'black';
      ctx.fillText(item.text, item.x, item.y);
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
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `${fontSize}px Arial`;

    let clickedOnText = false;

    textItems.forEach((item, index) => {
      const textWidth = ctx.measureText(item.text).width;
      const textHeight = fontSize;

      // Check if the click is within the bounding box of any text item
      if (
        offsetX >= item.x - boxPadding &&
        offsetX <= item.x + textWidth + boxPadding &&
        offsetY >= item.y - textHeight - boxPadding &&
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
        const textHeight = fontSize;

        const textRect = {
          x: item.x - boxPadding,
          y: item.y - textHeight - boxPadding,
          width: textWidth + boxPadding * 2,
          height: textHeight + boxPadding * 2,
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

  const addTextToCanvas = () => {
    const newItem = { text: newText, x: 50, y: 50 }; // Add new text item at a default position
    const updatedItems = [...textItems, newItem];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    setShowAddTextModal(false); // Close modal
    setNewText(''); // Reset text input
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

  return (
    <div style={{ padding: '20px' }}>
      <h1>Text Editor with Grid and PDF Save</h1>
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid black', marginBottom: '20px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <button onClick={() => setShowAddTextModal(true)}>Add Text</button>
      <button onClick={toggleGrid} style={{ marginLeft: '10px' }}>
        {showGrid ? 'Hide Grid' : 'Show Grid'}
      </button>
      <button onClick={saveCanvasAsPDF} style={{ marginLeft: '10px' }}>
        Save as PDF
      </button>
      <button onClick={removeSelectedText} disabled={selectedTextIndex === null} style={{ marginLeft: '10px' }}>
          Remove Text
      </button> 
      {showAddTextModal && (
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
            onChange={(e) => setNewText((prev) => prev = e.target.value)}
            placeholder="Enter text here"
          />
          <div style={{ marginTop: '10px' }}>
            <button onClick={addTextToCanvas}>Ok</button>
            <button onClick={() => setShowAddTextModal(false)} style={{ marginLeft: '10px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;