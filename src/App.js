import React, { useRef, useEffect, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import axios from 'axios';
let runOnce = false;
function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  let fontSize = 20;
  const cellSize = 20;
  const boxPadding = 10;

  const canvasWidth = 1024;
  const canvasHeight = 768;
  const pdfWidth = 1024;
  const pdfHeight = 768;

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


  const [isTextBoxEditEnabled, setIsTextBoxEditEnabled] = useState(false); // Track TextBox Edit mode
  const [textBox, setTextBox] = useState(null); // Store TextBox properties (position, size, content)
  const [isTextBoxEditing, setIsTextBoxEditing] = useState(false);

  const [pages, setPages] = useState([]); // Pages state, each page is a canvas with text/image data
  const [activePage, setActivePage] = useState(0); // Track the currently active page
  const canvasRefs = useRef([]); // Ref for all canvases

  const [isResizing, setIsResizing] = useState(false);



  const [imageItems, setImageItems] = useState([]); // State to hold images added to the canvas
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);   // State to track the selected image
  const [resizingImageIndex, setResizingImageIndex] = useState(null); // Track image being resized
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 }); // Track start of resizing

  // State to track editing mode and the text being edited
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  // State to track the font size being edited
const [editingFontSize, setEditingFontSize] = useState(fontSize); // Default font size


// State for new text and font size
const [newFontSize, setNewFontSize] = useState(fontSize); // Default font size


const [isPdfDownloaded, setIsPdfDownloaded] = useState(false);
// Function to toggle selecting mode
const toggleSelectingMode = () => {
  setIsSelectingModeEnabled((prevMode) => !prevMode);
};

 // Load pages from localStorage on mount
 useEffect(() => {
  let storedPages = localStorage?.getItem('pages');
  if(storedPages) {
    setPages(JSON.parse(storedPages));
  } else {
    setPages([{textItems:[], imageItems:[]}])
  }
}, []);

 // Save pages to localStorage whenever they change
 useEffect(() => {
  if(pages?.length > 0) {
    localStorage.setItem('pages', JSON.stringify(pages));
    if(runOnce === false) {
      pages.forEach((e, i) => setActivePage(i));
      runOnce = true;
    }
  }
}, [pages]);


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
        height: img.height / 2,
        index: activePage
      };
      const updatedItems = [...imageItems, newItem];
      setImageItems(updatedItems);
      const uI = updatedItems.filter((_, index) => _.index === activePage);
      updatePageItems('imageItems', uI);
      saveImageItemsToLocalStorage(updatedItems); // Save to localStorage
      drawCanvas(activePage);
    };
  };
  reader.readAsDataURL(file);
};


const convertToPdfCoordinates = (xCanvas, yCanvas) => {
  const xPdf = xCanvas; // Direct mapping since dimensions are identical
  const yPdf = pdfHeight - yCanvas; // Flipping Y-axis for PDF coordinates
  return { x: xPdf, y: yPdf };
};

// Function to convert all textItems to PDF coordinates
const convertTextItemsToPdfCoordinates = (textItems) => {
  return textItems.map((item) => {
    let { x, y } = convertToPdfCoordinates(item.x, item.y);
    
    return {
      ...item,
      xPdf: x,
      yPdf: y,
    };
  });
};

useEffect(() => {
  const handleMouseMove = (e) => {
    const canvas = canvasRefs.current[activePage];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const isOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;

    if (isOutside) {
      setIsDragging(false); // Stop dragging
      setDraggedImageIndex(null)
      setResizingImageIndex(null);
    }
  };

  // Attach the event listener
  window.addEventListener('mousemove', handleMouseMove);

  // Cleanup event listener on unmount or when activePage changes
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
  };
}, [activePage, canvasRefs]);

  

  // Load images and text items from local storage on mount
  useEffect(() => {
    const storedTextItems = localStorage?.getItem('textItems');
    const storedImageItems = localStorage?.getItem('imageItems');
  
    if (storedTextItems?.length > 0) {
      setTextItems(JSON.parse(storedTextItems));
    }
  
    if (storedImageItems?.length > 0) {
      const parsedImages = JSON.parse(storedImageItems).map((item) => ({
        ...item,
        image: createImageElement(item?.data), // Convert base64 back to Image element
      }));
      setImageItems(parsedImages);
    }
  }, []);



// Save image items to local storage
const saveImageItemsToLocalStorage = (items) => {
  const serializedImages = items.map((item) => {
    // if(item.index === activePage) {
      
    // }
    return {
      data: item.data, // Save base64 data
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      index: item.index
    }
  });
  // if(serializedImages.length > 0) {
    
  // }
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

    //updatePageItems('textItems', updatedItems)
  }
  if(selectedTextIndexes.length >=1) {
    // Remove the selected text item from the list
    let updatedItems = textItems.filter((e,i) => e.index === activePage && selectedTextIndexes.indexOf(i) > -1 ? false : true); // [1]
    

    // Update state and localStorage
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);
    updatePageItems('textItems', updatedItems)
    // Reset selection
    setIsTextSelected(false);
    setSelectedTextIndex(null);

    //updatePageItems('textItems', updatedItems)
  }
};

  const saveTextItemsToLocalStorage = (items) => {
    localStorage.setItem('textItems', JSON.stringify(items));
  };

  const drawCanvas = (pageIndex) => {
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return; // Ensure the canvas exists before proceeding
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //const { textItems, imageItems } = pages[pageIndex];


    if (showGrid) drawGrid(ctx);

    textItems.forEach((item, index) => {
      if(item.index === pageIndex) {
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
          textWidth + item.boxPadding,
          actualHeight + item.boxPadding
        );
      }



      // Draw vertical dotted line for selected text
      ctx.beginPath();
      ctx.setLineDash([5, 5]); // Dotted line pattern
      ctx.strokeStyle = 'dodgerblue';
      ctx.moveTo(item.x - item.boxPadding, 0);
      ctx.lineTo(item.x - item.boxPadding, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash



      ctx.fillStyle = 'black';
      ctx.fillText(item.text, item.x, item.y);
      }
    });

    // Draw image items
    imageItems.forEach((item) => {
    if(item.index === pageIndex) {
      
      ctx.drawImage(item.image, item.x, item.y, item.width, item.height);

      // Draw resizing handle (bottom-right corner)
      ctx.fillStyle = 'dodgerblue';
      const handleSize = 10;
      ctx.fillRect(
        item.x + item.width - handleSize / 2,
        item.y + item.height - handleSize / 2,
        handleSize,
        handleSize
      );

      // Draw a 1px border around the image
      ctx.strokeStyle = 'black'; // Border color
      ctx.lineWidth = 1; // Border width
      ctx.strokeRect(item.x, item.y, item.width, item.height);
    }


    });

    // Draw the selection square if selecting
    if (isSelecting && activePage === pageIndex) {
      const rectWidth = selectionEnd.x - selectionStart.x;
      const rectHeight = selectionEnd.y - selectionStart.y;
      ctx.strokeStyle = 'dodgerblue';
      ctx.fillStyle = 'rgba(30, 144, 255, 0.3)'; // Transparent dodgerblue
      ctx.lineWidth = 1;
      ctx.strokeRect(selectionStart.x, selectionStart.y, rectWidth, rectHeight);
      ctx.fillRect(selectionStart.x, selectionStart.y, rectWidth, rectHeight);
    }



    if (isTextBoxEditEnabled && textBox && activePage === pageIndex) {
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
    
      // Calculate the selection rectangle
      const rectWidth = selectionEnd.x - selectionStart.x;
      const rectHeight = selectionEnd.y - selectionStart.y;
    
      // Update textBox dimensions based on selection
      if (isSelecting) {
        textBox.x = selectionStart.x;
        textBox.y = selectionStart.y;
        textBox.width = rectWidth;
        textBox.height = rectHeight;
      }
    
      // Draw the textBox border
      ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height);
    
      // Draw the drag point (small square in the bottom-right corner)
      const dragPointSize = 10;
      ctx.fillStyle = 'dodgerblue';
      ctx.fillRect(
        textBox.x + textBox.width - dragPointSize,
        textBox.y + textBox.height - dragPointSize,
        dragPointSize,
        dragPointSize
      );
    
      // Draw text inside the textBox if not selecting
      if (!isSelecting) {
        ctx.fillStyle = 'black';
        ctx.font = `${fontSize}px Arial`;
        const lines = textBox.text.split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(line, textBox.x + 5, textBox.y + 20 + index * 20); // Adjust line spacing
        });
      }
    }

  
  };

   // Add a new page
   const addNewPage = () => {
    setPages((prev) => [...prev, { textItems: [], imageItems: [] }]);
    setActivePage(pages.length); // Switch to the new page
  };


  // Function to remove the current page
  const removePage = () => {
    if (pages.length <= 1) {
      alert('Cannot remove the last page.');
      return;
    }
    let updatedPages = pages.filter((_, index) => index !== activePage);
    let updatedTextItems = [];
    let updatedImageItems = [];
    updatedPages.forEach(e =>{
      e["textItems"].forEach((e, index) =>{
        if(activePage > 1) {
          return;
        } else {
          e.index = Math.max(0, e.index - 1)
        }
      });
      e["imageItems"].forEach((e, index) =>{
        if(activePage > 1) {
          return;
        } else {
          e.index = Math.max(0, e.index - 1)
        }
      });
    });
    updatedPages.forEach(e =>{
      
      e["textItems"].forEach((e, index) =>{
        updatedTextItems.push(e);
      });
      e["imageItems"].forEach((e, index) =>{
        updatedImageItems.push(e);
      });
    })

    setTextItems(updatedTextItems); // update textItems state
    saveTextItemsToLocalStorage(updatedTextItems);
    setImageItems(updatedImageItems);
    saveImageItemsToLocalStorage(updatedImageItems);
    setPages(updatedPages); // Update pages state
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
    const ctx = canvasRefs.current[activePage].getContext('2d');
    //ctx.font = `${fontSize}px Arial`;
    //let { textItems, imageItems } = pages[activePage];
    let clickedOnText = false;

    textItems.forEach((item, index) => {
      if(item.index === activePage) {
        const textWidth = ctx.measureText(item.text).width;
        const textHeight = ctx.measureText(item.text);
        let actualHeight = textHeight.actualBoundingBoxAscent + textHeight.actualBoundingBoxDescent
  
        // Check if the click is within the bounding box of any text item
        if (
          offsetX >= item.x - boxPadding &&
          offsetX <= item.x + textWidth + boxPadding &&
          offsetY >= item.y - actualHeight - boxPadding &&
          offsetY <= item.y + boxPadding && item.index === activePage
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
            activePage: item.index
          }));
          setInitialPositions(positions);
  
        }
  
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
  let resizing = false;






   // Check for resizing handle clicks
   imageItems.forEach((item, index) => {
    const handleSize = 10;

    const handleX = item.x + item.width - handleSize / 2;
    const handleY = item.y + item.height - handleSize / 2;

    if (
      offsetX >= handleX &&
      offsetX <= handleX + handleSize &&
      offsetY >= handleY &&
      offsetY <= handleY + handleSize && item.index === activePage
    ) {
      setResizingImageIndex(index);
      setResizeStart({ x: offsetX, y: offsetY });
      resizing = true;
    }
  });

  if (resizing) {
    setIsSelecting(false); // Disable selection square during resizing
    return;
  }


  imageItems.forEach((item, index) => {
    if (
      offsetX >= item.x &&
      offsetX <= item.x + item.width &&
      offsetY >= item.y &&
      offsetY <= item.y + item.height && item.index === activePage
    ) {
      setSelectedImageIndex(item.index); // Set the clicked image as selected
      setIsImageDragging(true);
      setDraggedImageIndex(index);
      setDragStart({ x: offsetX, y: offsetY });
      imageClicked = true;
      
      
    }
  });

  
  if (!imageClicked) {
    setIsImageDragging(false);
    setResizingImageIndex(null);
    setSelectedImageIndex(null);
  }

  if (imageClicked) {
    setIsSelecting(false); // Disable selection square if an image is being dragged
    return; // Exit to prevent triggering selection logic
  }





  const dragPointSize = 10;

  if (
    textBox &&
    offsetX >= textBox.x + textBox.width - dragPointSize &&
    offsetX <= textBox.x + textBox.width &&
    offsetY >= textBox.y + textBox.height - dragPointSize &&
    offsetY <= textBox.y + textBox.height
  ) {
    setIsResizing(true);
    setIsSelecting(false); // Disable selection while resizing
    return;
  }

  if (isTextBoxEditEnabled) {
    // Start a selection
    setIsSelecting(true);
    setSelectionStart({ x: offsetX, y: offsetY });
    setSelectionEnd({ x: offsetX, y: offsetY });
    return;
  }


  };


  const handleKeyPress = (e) => {
    if (isTextBoxEditEnabled && textBox) {
      let updatedText;
  
      if (e.key === 'Enter') {
        updatedText = textBox.text + '\n'; // Add a newline
      } else if (e.key === ' ') {
        updatedText = textBox.text + ' '; // Add a space
      } else if (e.key.length === 1) {
        updatedText = textBox.text + e.key; // Add the character
      } else {
        return; // Ignore non-character keys
      }
  
      // Wrap text based on maxWidth
      const wrappedTextLines = wrapText(updatedText, textBox.width);
  
      // Combine wrapped lines into a single string with line breaks
      const wrappedText = wrappedTextLines.map((line) => line.text).join('\n');
  
      // Update textBox state with wrapped text
      setTextBox({ ...textBox, text: wrappedText });
    }
  };
  useEffect(() => {
    window.addEventListener('keyup', handleKeyPress);
    return () => {
      window.removeEventListener('keyup', handleKeyPress);
    };
  }, [isTextBoxEditEnabled, textBox]);


  const handleMouseMove = (e, index) => {
    setActivePage(index);

    if (isResizing && textBox) {
      // Update the width and height of the textBox while resizing
      const newWidth = Math.max(50, e.nativeEvent.offsetX - textBox.x); // Minimum width: 50
      const newHeight = Math.max(20, e.nativeEvent.offsetY - textBox.y); // Minimum height: 20
  
      setTextBox({ ...textBox, width: newWidth, height: newHeight });
      drawCanvas(); // Redraw the canvas with updated dimensions
      return;
    }


    if (isSelecting) {
      setSelectionEnd({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
      drawCanvas(activePage);
    }







    if (isDragging) {
      const { offsetX, offsetY } = e.nativeEvent;
  
      const deltaX = offsetX - dragStart.x;
      const deltaY = offsetY - dragStart.y;
  
      const updatedItems = [...textItems];
      const draggedItem = updatedItems[selectedTextIndex];
  
      // Calculate new position for the dragged text
      let newX = draggedItem.x + deltaX;
      let newY = draggedItem.y + deltaY;
  
      let snapped = false; // Track whether snapping has occurred
  
      // Snapping threshold
      const snappingThreshold = 3;
  
      // Check for snapping to any other text's vertical line
      textItems.forEach((item, i) => {
        if (i !== selectedTextIndex && item.index===activePage) {
          const itemPadding = (item.fontSize || fontSize) * 0.2;
          const lineX = item.x - itemPadding;
  
          // Check if the dragged text's left edge is near the current item's line
          const draggedPadding = (draggedItem.fontSize || fontSize) * 0.2;
          const draggedLeftEdge = newX - draggedPadding;
  
          if (Math.abs(draggedLeftEdge - lineX) < snappingThreshold) {
            newX = lineX + draggedPadding; // Snap dragged text to the line
            snapped = true;
          }
        }
      });
  
      // Update position only if snapping occurred or text is moving normally
      if (snapped || deltaX !== 0 || deltaY !== 0 && index===activePage) {
         draggedItem.x = newX - deltaX;
         draggedItem.y = newY - deltaY;
  
        setTextItems(updatedItems);
        saveTextItemsToLocalStorage(updatedItems); // Save updated position in localStorage
        setDragStart({ x: offsetX, y: offsetY }); // Update drag start position
        drawCanvas(activePage);
      }
    }

    if (isDragging) {
      const offsetX = e.nativeEvent.offsetX - dragStart.x;
      const offsetY = e.nativeEvent.offsetY - dragStart.y;

      let updatedItems = [...textItems];

      if(initialPositions.length >= 2) {
        initialPositions.forEach((pos) => {
          const { index, x, y } = pos;

          if(updatedItems[index].index === pos.activePage) {
          updatedItems[index] = {
            ...updatedItems[index],
            x: updatedItems[index].x + offsetX,
            y: updatedItems[index].y + offsetY,
          };
          }

        });
        let temp = [];
        updatedItems.forEach(e => {
          if(e.index === activePage) {
            temp.push(e);
          }
        })
        updatePageItems('textItems', temp)
      } else {
      selectedTextIndexes.forEach((index) => {
        updatedItems[index] = {
          ...updatedItems[index],
          x: updatedItems[index].x + offsetX,
          y: updatedItems[index].y + offsetY,
        };
      });
      let temp = [];
      updatedItems.forEach(e => {
        if(e.index === activePage) {
          temp.push(e);
        }
      })
      updatePageItems('textItems', temp)
      }

      setTextItems(updatedItems);
      saveTextItemsToLocalStorage(updatedItems);
      setDragStart({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
      drawCanvas(activePage);
    }

    if (resizingImageIndex !== null) {
      const { offsetX, offsetY } = e.nativeEvent;
  
      const updatedItems = [...imageItems];
      const item = updatedItems[resizingImageIndex];
  
      // Calculate new width and height based on mouse movement
      const deltaX = offsetX - resizeStart.x;
      const deltaY = offsetY - resizeStart.y;
  
      item.width = Math.max(10, item.width + deltaX); // Minimum width is 10px
      item.height = Math.max(10, item.height + deltaY); // Minimum height is 10px
  
      setImageItems(updatedItems);
      saveImageItemsToLocalStorage(updatedItems); // Persist changes
      setResizeStart({ x: offsetX, y: offsetY }); // Update resize start position
      drawCanvas(activePage);
    }




    if (isImageDragging && draggedImageIndex !== null) {
      const { offsetX, offsetY } = e.nativeEvent;
      const deltaX = offsetX - dragStart.x;
      const deltaY = offsetY - dragStart.y;
  
      const updatedItems = [...imageItems];
      updatedItems[draggedImageIndex].x += deltaX;
      updatedItems[draggedImageIndex].y += deltaY;
  
      setImageItems(updatedItems);


      const uI = imageItems.filter((_, index) => _.index === activePage);
      setImageItems(updatedItems); // Update state

      ///////////////////////////////////
      // HERE //
      ///////////////////////////////////

      saveImageItemsToLocalStorage(updatedItems); // Save updated positions to localStorage
      updatePageItems('imageItems', uI)
      setDragStart({ x: offsetX, y: offsetY });
      drawCanvas(activePage);
    }
    
    const uI = imageItems.filter((_, index) => _.index === activePage);
     updatePageItems('imageItems', uI)
  };

  const handleMouseUp = (e) => {
    //setSelectedImageIndex(null); setSelectedTextIndex(null); setSelectedTextIndexes([]);
    const selectionRect = {
      x: Math.min(selectionStart.x, selectionEnd.x),
      y: Math.min(selectionStart.y, selectionEnd.y),
      width: Math.abs(selectionEnd.x - selectionStart.x),
      height: Math.abs(selectionEnd.y - selectionStart.y),
    };

    if (isResizing) {
      setIsResizing(false); // Stop resizing textBox edit
    }


    if (isSelecting) {


      const selectedIndexes = [];
      const ctx = canvasRefs.current[activePage].getContext('2d');
      //ctx.font = `${fontSize}px Arial`;

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
            activePage: activePage
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

    if (resizingImageIndex !== null) {
      setResizingImageIndex(null);
    }

    if (isImageDragging) {
      setIsImageDragging(false);
      setDraggedImageIndex(null);
      setDragStart({ x: 0, y: 0 });
    }



    // //Deselect selection square while no text is selected
    // setIsTextSelected(true);
    // setIsSelecting(true);

if (isResizing) {
    setIsResizing(false); // Stop resizing
  }

  if (isSelecting) {
    setIsSelecting(false); // Stop selecting
    if (!textBox) {
      // Create a new textBox after selection
      const rectWidth = selectionEnd.x - selectionStart.x;
      const rectHeight = selectionEnd.y - selectionStart.y;

      setTextBox({
        x: selectionStart.x,
        y: selectionStart.y,
        width: rectWidth,
        height: rectHeight,
        text: '', // Initialize with empty text
      });
    }
  }


    
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
      selectedItem.x = Math.max(0, Math.min(selectedItem.x, canvasRefs.current[activePage].width - fontSize));
      selectedItem.y = Math.max(fontSize, Math.min(selectedItem.y, canvasRefs.current[activePage].height));

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
      y: e.y,
      index: activePage
    }))
    const updatedItems = [...textItems, ...newItem];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    setShowAddTextModal(false); // Close modal
    setNewText(''); // Reset text input
    setNewFontSize(fontSize); // Reset font size input
    setMaxWidth(200); // Reset maxWidth input
    updatePageItems('textItems', newItem)
    drawCanvas(activePage); // Redraw canvas to show new text immediately
  }
};



const addTextToCanvas3 = (textArray = []) => {
  if (newText.trim() !== '' || textArray.length > 0) {
    const padding = newFontSize * 0.2; // Calculate dynamic padding (20% of font size)
    let itemsToAdd = convertTextItemsToPdfCoordinates(textArray);
    
    if (textArray.length > 0) {
      // If textArray is provided, use it to create items
      itemsToAdd = itemsToAdd.map((item) => ({
        text: item.text,
        fontSize: newFontSize,
        boxPadding: padding,
        x: item.xPdf,
        y: item.yPdf-5,
        index: item.index,
      }));
    } else {
      // Default behavior for adding a single new text item
      const wrappedText = wrapText(newText, maxWidth); // Wrap text based on maxWidth
      itemsToAdd = wrappedText.map((e) => ({
        text: e.text,
        fontSize: newFontSize,
        boxPadding: padding,
        x: e.x,
        y: e.y,
        index: e.index,
      }));
    }

    const updatedItems = [...textItems, ...itemsToAdd];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    setShowAddTextModal(false); // Close modal
    setNewText(''); // Reset text input
    setNewFontSize(fontSize); // Reset font size input
    setMaxWidth(200); // Reset maxWidth input
    drawCanvas(activePage); // Redraw canvas to show new text immediately
  }
};



// Function to handle adding new text to the canvas
const addTextToCanvas2 = (textBox, maxW) => {
  if (textBox.text.trim() !== '') {
    const padding = newFontSize * 0.2; // Calculate dynamic padding (20% of font size)
    let newItem = textBox.text;
    const wrappedText = wrapText(newItem, maxW); // Wrap text based on maxWidth
    newItem = [];
    wrappedText.forEach((e,i) => newItem.push( { 
      text: e.text, 
      fontSize: newFontSize, 
      boxPadding: padding, // Include dynamic box padding
      x: textBox.x +5, 
      y: textBox.y + 20 + i * 20,
      index: activePage
    }))
    const updatedItems = [...textItems, ...newItem];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    setShowAddTextModal(false); // Close modal
    setNewText(''); // Reset text input
    setNewFontSize(fontSize); // Reset font size input
    setMaxWidth(200); // Reset maxWidth input
    updatePageItems('textItems', updatedItems)
    drawCanvas(activePage); // Redraw canvas to show new text immediately
  }
};


// Handle deleting the selected image
const deleteSelectedImage = () => {
  if (selectedImageIndex !== null) {
    const updatedItems = imageItems.filter((_, index) => index !== selectedImageIndex);
    setImageItems(updatedItems); // Update state
    saveImageItemsToLocalStorage(updatedItems); // Save to localStorage
    setSelectedImageIndex(null); // Reset selected image
    drawCanvas(activePage); // Redraw canvas without the deleted image
    updatePageItems('textItems', updatedItems)
  }
};


const wrapText = (text, maxWidth) => {
  const ctx = canvasRefs.current[activePage].getContext('2d');
  const lines = [];
  const paragraphs = text.split('\n'); // Split text into paragraphs by newline

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach((word, wordIndex) => {
      let testLine = currentLine + (currentLine ? ' ' : '') + word;
      let testWidth = ctx.measureText(testLine).width;

      // If the word itself exceeds maxWidth, break it into smaller parts
      if (ctx.measureText(word).width > maxWidth) {
        for (let i = 0; i < word.length; i++) {
          const testWordLine = currentLine + word[i];
          const testWordWidth = ctx.measureText(testWordLine).width;

          if (testWordWidth > maxWidth && currentLine) {
            lines.push(currentLine); // Push the current line
            currentLine = word[i]; // Start a new line with the current letter
          } else {
            currentLine += word[i]; // Add the letter to the current line
          }
        }
        currentLine += ''; // Add a space after breaking the word
      } else if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine); // Push the current line
        currentLine = word; // Start a new line with the word
      } else {
        currentLine = testLine; // Continue adding words to the current line
      }

      // If it's the last word in the paragraph, push the current line
      if (wordIndex === words.length - 1 && currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
    });
  });

  return lines.map((line, i) => ({
    text: line,
    x: 50, // Default starting x-coordinate
    y: 50 + i * (fontSize + 5), // Adjust y-coordinate for each line
  }));
};


  const toggleGrid = () => {
    setShowGrid((prevShowGrid) => !prevShowGrid);
    drawCanvas(activePage);
  };

    // Save all pages as PDF
  const saveAllPagesAsPDF = async () => {
    const pdfDoc = await PDFDocument.create();

    for (const page of pages) {
      let i = 0;
      const pageCanvas = canvasRefs.current[pages.indexOf(page)];
      const ctx = pageCanvas.getContext('2d');
      const { width, height } = pageCanvas;
      const pdfPage = pdfDoc.addPage([width, height]);

      const { textItems, imageItems } = page;

      // Add text items
      textItems.forEach((item) => {
        pdfPage.drawText(item.text, {
          x: item.x,
          y: height - item.y, // Convert canvas y to PDF coordinate system
          size: item.fontSize || fontSize,
          color: rgb(0, 0, 0),
        });
      });

      // Add image items
      for (const item of imageItems) {
        const imgBytes = await fetch(item.data).then((res) => res.arrayBuffer());
        const pdfImage = await pdfDoc.embedPng(imgBytes); // Assuming PNG
        pdfPage.drawImage(pdfImage, {
          x: item.x,
          y: height - item.y - item.height,
          width: item.width,
          height: item.height,
        });
      }

      i++;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'multi_page_document.pdf';
    link.click();
  };

  useEffect(() => {
    drawCanvas(activePage);
  }, [textItems, showGrid, isTextSelected, pages, activePage, textBox]);


  // // Update textItems or imageItems on the current page
  // const updatePageItems = (type, items) => {
  //   const updatedPages = pages.map((page, index) => {
  //     // Update only the active page, keep others unchanged
  //     if (index === activePage) {
  //       return {
  //         ...page,
  //         [type]: items, // Update the specific type (textItems or imageItems)
  //       };
  //     }
  //     return page;
  //   });
  
  //   setPages(updatedPages); // Update state with the new pages array
  // };


  const updatePageItems = (type, items) => {
    const updatedPages = [...pages];
    updatedPages.map((page, index) => {
      if (index === activePage){
        updatedPages[activePage][type] = items;
        setPages(updatedPages);
      } else {
        return ;
      }
    })

  };


  useEffect(() => {
    if(isPdfDownloaded === true) { 

      const occurrences = textItems.reduce((acc, item) => {
        if (!acc[item.index]) {
          acc[item.index] = [];
        }
        acc[item.index].push(item);
        return acc;
      }, {});
  
      // Format result
      const result = Object.entries(occurrences).map(([index, texts]) => ({
        index: Number(index),
        texts,
        occurrence: texts.length
      }));

      
      let updatedPages = pages;
      for(let i=0; i< result.length; i++) {
        updatedPages[i] = {
          "textItems": result[i].texts,
          "imageItems": []
        }
        setActivePage(i);
      }
      setPages(updatedPages);
    }
    setIsPdfDownloaded(false);
  }, [isPdfDownloaded])











// Function to handle double-click on a text
const handleDoubleClick = (e) => {
  const { offsetX, offsetY } = e.nativeEvent;
  const ctx = canvasRefs.current[activePage].getContext('2d');
  //ctx.font = `${fontSize}px Arial`;

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
      index: activePage
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


  // Handle file upload
  const uploadPdfToServer = async () => {
    if (!selectedFile) {
      alert("No file selected. Please select a PDF file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", selectedFile);

    try {
      const response = await axios.post("http://localhost:5000/upload-pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          'Content-Type': 'application/x-www-form-urlencoded'
        },
      });
      alert("PDF uploaded successfully:");
      setIsPdfDownloaded(true);
      addTextToCanvas3(response.data);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Failed to upload PDF. Please try again.");
    }
  };

  //Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      alert("Please select a valid PDF file.");
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>PdfEditor //not_finished</h1>
      {/* {console.log(convertTextItemsToPdfCoordinates(textItems))} */}
      {pages.map((_, index) => (
          <canvas
          key={index}
          ref={(el) => (canvasRefs.current[index] = el)}
          style={{
            border: activePage === index ? '1px solid dodgerblue' : '1px solid black',
            marginBottom: '20px',
          }}
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={(e) => handleMouseMove(e, index)}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onClick={() => setActivePage(index)}
        />
        ))}
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ marginBottom: "10px" }}
      />
      <button onClick={uploadPdfToServer}>Upload PDF</button>
        <button onClick={addNewPage} style={{ marginBottom: '10px' }}>
          Add New Page
        </button>
        <button onClick={removePage} style={{ marginBottom: '10px' }}>
          Remove Page
        </button>
      <button onClick={() => setShowAddTextModal(true)}>Add Text</button>
      <button onClick={toggleGrid} style={{ marginLeft: '10px' }}>
        {showGrid ? 'Hide Grid' : 'Show Grid'}
      </button>
      <button onClick={saveAllPagesAsPDF} style={{ marginTop: '10px' }}>
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
      onClick={() => {
        setIsTextBoxEditEnabled((prev) => !prev);
        if(textBox !== null ) {
          addTextToCanvas2(textBox, maxWidth)
         }
        setTextBox(null); // Clear existing TextBox on toggle
      }}
      style={{ marginBottom: '10px' }}
    >
      {isTextBoxEditEnabled ? 'Save TextBox' : 'Enable TextBox Edit'}
    </button>
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