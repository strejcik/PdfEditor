import React, { useRef, useEffect, useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import axios from 'axios';
import './App.css'

const btnStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginBottom: '8px',
  backgroundColor: '#007BFF',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

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
  const [maxWidth, setMaxWidth] = useState(200); // Max width input for the modal
  const [shouldClearSelectionBox, setShouldClearSelectionBox] = useState(false);

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
    window.addEventListener('keydown', handleTextMove);
    return () => window.removeEventListener('keydown', handleTextMove);
  }, [isTextSelected, selectedTextIndex, textItems]);



  // Function to remove selected text
const removeSelectedText = () => {
  let updatedItems = [...textItems];

  // === Remove Multiple Selected Texts ===
  if (selectedTextIndexes.length > 0) {
    // Filter out all selected indexes
    updatedItems = updatedItems.filter((_, i) => !selectedTextIndexes.includes(i));

    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    // Update only visible page's text items
    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    // Clear selection
    setSelectedTextIndexes([]);
    setIsTextSelected(false);
    setSelectedTextIndex(null);
    return; // prevent running single delete block
  }

  // === Remove Single Selected Text ===
  if (selectedTextIndex !== null) {
    updatedItems = updatedItems.filter((_, i) => i !== selectedTextIndex);

    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);

    const visibleItems = updatedItems.filter((item) => item.index === activePage);
    updatePageItems('textItems', visibleItems);

    setIsTextSelected(false);
    setSelectedTextIndex(null);
  }
};

  const saveTextItemsToLocalStorage = (items) => {
    localStorage.setItem('textItems', JSON.stringify(items));
  };

const wrapTextPreservingNewlinesResponsive = (text, ctx, initialWidth, fontSize, padding = 10) => {
  const paragraphs = text.split('\n');
  const lines = [];

  let maxLineWidth = 0;

  paragraphs.forEach(paragraph => {
    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth + padding * 2 > initialWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }

      // If last word, push it
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
      }

      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(currentLine).width);
    });
  });

  const lineHeight = fontSize + 4;
  const totalHeight = lines.length * lineHeight;

  return {
    lines,
    width: maxLineWidth + padding * 2,
    height: totalHeight + padding * 2
  };
};


const wrapTextResponsive = (text, maxWidth, ctx) => {
  const paragraphs = text.split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/);
    let currentLine = '';

    words.forEach((word, index) => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }

      // Push remaining line after the last word
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }
    });
  });

  return lines;
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
  if (item.index === pageIndex) {
    ctx.font = `${item.fontSize}px Arial`; // ← set before measurement

    const textMetrics = ctx.measureText(item.text);
    const actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
    const textWidth = textMetrics.width;

    const textRect = {
      x: item.x - item.boxPadding,
      y: item.y - actualHeight - item.boxPadding,
      width: textWidth + item.boxPadding * 2,
      height: actualHeight + item.boxPadding * 2,
    };

    // Draw bounding box if selected
    if (selectedTextIndexes.includes(index)) {
      ctx.strokeStyle = 'rgba(30, 144, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(textRect.x, textRect.y, textRect.width, textRect.height);
    }

    // Draw dotted guide
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'dodgerblue';
    ctx.moveTo(item.x - item.boxPadding, 0);
    ctx.lineTo(item.x - item.boxPadding, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw the actual text
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
    if (isSelecting &&
  selectionStart &&
  selectionEnd &&
  (selectionStart.x !== selectionEnd.x || selectionStart.y !== selectionEnd.y) &&
  activePage === pageIndex) {
      const rectWidth = selectionEnd.x - selectionStart.x;
      const rectHeight = selectionEnd.y - selectionStart.y;
      ctx.strokeStyle = 'dodgerblue';
      ctx.fillStyle = 'rgba(30, 144, 255, 0.3)'; // Transparent dodgerblue
      ctx.lineWidth = 1;
      ctx.strokeRect(selectionStart.x, selectionStart.y, rectWidth, rectHeight);
      ctx.fillRect(selectionStart.x, selectionStart.y, rectWidth, rectHeight);
    }



if (isTextBoxEditEnabled && textBox && activePage === pageIndex) {
const ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height);

  // Drag handle
  const dragPointSize = 10;
  ctx.fillStyle = 'dodgerblue';
  ctx.fillRect(
    textBox.x + textBox.width - dragPointSize,
    textBox.y + textBox.height - dragPointSize,
    dragPointSize,
    dragPointSize
  );

  ctx.fillStyle = 'black';
  ctx.font = `${textBox.fontSize || fontSize}px Arial`;

  const wrapped = wrapTextPreservingNewlinesResponsive(textBox.text, ctx, textBox.width, fontSize, textBox.boxPadding || 10);
  wrapped.lines.forEach((line, idx) => {
    ctx.fillText(line, textBox.x + (textBox.boxPadding || 10), textBox.y + (idx + 1) * (fontSize + 4));
  });
}
};

useEffect(() => {
  if (isTextBoxEditEnabled && textBox && canvasRefs.current[activePage]) {
    const ctx = canvasRefs.current[activePage].getContext('2d');
    const innerWidth = textBox.width - (textBox.boxPadding || 5) * 2;

    const wrappedLines = wrapTextResponsive(textBox.text.replace(/\s+/g, ' '), innerWidth, ctx);
    const newText = wrappedLines.join('\n');

    if (newText !== textBox.text) {
      setTextBox({ ...textBox, text: newText });
    }
  }
}, [textBox?.width]);  // Reacts to textBox width resize


   // Add a new page
   const addNewPage = () => {
    setPages((prev) => [...prev, { textItems: [], imageItems: [] }]);
    setActivePage(pages.length); // Switch to the new page
  };



//changed removePage functions
const removePage = () => {
  if (pages.length <= 1) {
    alert('Cannot remove the last page.');
    return;
  }

  // Remove the active page from the pages array
  const updatedPages = pages.filter((_, index) => index !== activePage);

  // Remove text and image items belonging to the deleted page,
  // and re-index remaining items whose index > activePage
  const updatedTextItems = textItems
    .filter(item => item.index !== activePage)
    .map(item => ({
      ...item,
      index: item.index > activePage ? item.index - 1 : item.index
    }));

  const updatedImageItems = imageItems
    .filter(item => item.index !== activePage)
    .map(item => ({
      ...item,
      index: item.index > activePage ? item.index - 1 : item.index
    }));

  // Set updated state
  setPages(updatedPages);
  setTextItems(updatedTextItems);
  setImageItems(updatedImageItems);
  saveTextItemsToLocalStorage(updatedTextItems);
  saveImageItemsToLocalStorage(updatedImageItems);

  // Update active page to previous one or first one
  const newActivePage = Math.max(0, activePage - 1);
  setActivePage(newActivePage);

  // Redraw the canvas to reflect the changes
  drawCanvas(newActivePage);
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
  const ctx = canvasRefs.current[activePage].getContext('2d');
  let clickedOnText = false;

  // === Check for text clicks ===
  for (let index = 0; index < textItems.length; index++) {
    const item = textItems[index];
    if (item.index !== activePage) continue;
    ctx.font = `${item.fontSize}px Arial`; // always before measuring
    const metrics = ctx.measureText(item.text);
    const textWidth = metrics.width;
    const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    const textRect = {
      x: item.x - item.boxPadding,
      y: item.y - actualHeight - item.boxPadding,
      width: textWidth + item.boxPadding * 2,
      height: actualHeight + item.boxPadding * 2,
    };

    const isInside =
      offsetX >= textRect.x &&
      offsetX <= textRect.x + textRect.width &&
      offsetY >= textRect.y &&
      offsetY <= textRect.y + textRect.height;

    if (isInside) {
      clickedOnText = true;
      setIsTextSelected(true);
      setSelectedTextIndex(index);

      let newSelectedIndexes = selectedTextIndexes.includes(index)
        ? [...selectedTextIndexes]
        : [index];

      // If clicked on one of the selected ones, preserve group
      if (selectedTextIndexes.includes(index)) {
        newSelectedIndexes = [...selectedTextIndexes];
      }

      setSelectedTextIndexes(newSelectedIndexes);
      setIsDragging(true);
      setDragStart({ x: offsetX, y: offsetY });

      const init = newSelectedIndexes.map((i) => ({
        index: i,
        x: textItems[i].x,
        y: textItems[i].y,
        activePage,
      }));

      setInitialPositions(init);
      break;
    }
  }

  // === Not clicked on text — start selection ===
  if (!clickedOnText) {
    setIsTextSelected(false);
    setSelectedTextIndex(null);
    setSelectedTextIndexes([]);
    setIsDragging(false);
    setInitialPositions([]);
    setIsSelecting(true);
    setSelectionStart({ x: offsetX, y: offsetY });
    setSelectionEnd({ x: offsetX, y: offsetY });
  }

  // === Image Resize Handle ===
  let resizing = false;
  for (let index = 0; index < imageItems.length; index++) {
    const item = imageItems[index];
    if (item.index !== activePage) continue;

    const handleSize = 10;
    const handleX = item.x + item.width - handleSize / 2;
    const handleY = item.y + item.height - handleSize / 2;

    if (
      offsetX >= handleX &&
      offsetX <= handleX + handleSize &&
      offsetY >= handleY &&
      offsetY <= handleY + handleSize
    ) {
      setResizingImageIndex(index);
      setResizeStart({ x: offsetX, y: offsetY });
      resizing = true;
      break;
    }
  }

  if (resizing) {
    setIsSelecting(false);
    return;
  }

  // === Image Dragging ===
  let imageClicked = false;
  for (let index = 0; index < imageItems.length; index++) {
    const item = imageItems[index];
    if (item.index !== activePage) continue;

    if (
      offsetX >= item.x &&
      offsetX <= item.x + item.width &&
      offsetY >= item.y &&
      offsetY <= item.y + item.height
    ) {
      setSelectedImageIndex(index);
      setDraggedImageIndex(index);
      setIsImageDragging(true);
      setDragStart({ x: offsetX, y: offsetY });
      imageClicked = true;
      break;
    }
  }

  if (imageClicked) {
    setIsSelecting(false);
    return;
  } else {
    setIsImageDragging(false);
    setResizingImageIndex(null);
    setSelectedImageIndex(null);
  }

  // === TextBox Resize Handle ===
  const dragPointSize = 10;
  if (
    textBox &&
    offsetX >= textBox.x + textBox.width - dragPointSize &&
    offsetX <= textBox.x + textBox.width &&
    offsetY >= textBox.y + textBox.height - dragPointSize &&
    offsetY <= textBox.y + textBox.height
  ) {
    setIsResizing(true);
    setIsSelecting(false);
    return;
  }

  // === Create selection for TextBox mode ===
  if (isTextBoxEditEnabled) {
    setIsSelecting(true);
    setSelectionStart({ x: offsetX, y: offsetY });
    setSelectionEnd({ x: offsetX, y: offsetY });
    return;
  }
};








const handleMouseMove = (e) => {
  const { offsetX, offsetY } = e.nativeEvent;

  // === TEXTBOX RESIZING ===
if (isResizing && textBox) {
  const newWidth = Math.max(50, offsetX - textBox.x);
  const newHeight = Math.max(20, offsetY - textBox.y);

  const ctx = canvasRefs.current[activePage].getContext('2d');
  const padding = textBox.boxPadding || 5;
  const innerWidth = newWidth - padding * 2;

  const wrappedLines = wrapTextResponsive(textBox.text, innerWidth, ctx);
  const recombinedText = wrappedLines.join('\n');

  setTextBox({
    ...textBox,
    width: newWidth,
    height: newHeight,
    text: recombinedText, // 🔁 Update to reflect real wrapping
  });

  drawCanvas(activePage);
  return;
}

  // === SELECTION RECTANGLE ===
  if (isSelecting) {
    setSelectionEnd({ x: offsetX, y: offsetY });
    drawCanvas(activePage);
    return;
  }

  // === IMAGE RESIZING ===
  if (resizingImageIndex !== null) {
    const updatedItems = [...imageItems];
    const item = updatedItems[resizingImageIndex];
    if (!item) return;

    const deltaX = offsetX - resizeStart.x;
    const deltaY = offsetY - resizeStart.y;

    item.width = Math.max(10, item.width + deltaX);
    item.height = Math.max(10, item.height + deltaY);

    setImageItems(updatedItems);
    saveImageItemsToLocalStorage(updatedItems);
    setResizeStart({ x: offsetX, y: offsetY });
    drawCanvas(activePage);
    return;
  }

  // === IMAGE DRAGGING ===
  if (isImageDragging && draggedImageIndex !== null) {
    const updatedItems = [...imageItems];
    const item = updatedItems[draggedImageIndex];
    if (!item) return;

    const deltaX = offsetX - dragStart.x;
    const deltaY = offsetY - dragStart.y;

    item.x += deltaX;
    item.y += deltaY;

    setImageItems(updatedItems);
    saveImageItemsToLocalStorage(updatedItems);
    updatePageItems('imageItems', updatedItems.filter(i => i.index === activePage));
    setDragStart({ x: offsetX, y: offsetY });
    drawCanvas(activePage);
    return;
  }

  // === TEXT DRAGGING ===
  if (isDragging && dragStart && initialPositions.length > 0) {
    const deltaX = offsetX - dragStart.x;
    const deltaY = offsetY - dragStart.y;
    const updatedItems = [...textItems];

    // === MULTIPLE ITEMS DRAG ===
    if (selectedTextIndexes.length > 1 && initialPositions.length === selectedTextIndexes.length) {
      initialPositions.forEach((pos) => {
        const item = updatedItems[pos.index];
        if (item && item.index === activePage) {
          item.x = pos.x + deltaX;
          item.y = pos.y + deltaY;
        }
      });

      setTextItems(updatedItems);
      updatePageItems('textItems', updatedItems.filter(i => i.index === activePage));
      saveTextItemsToLocalStorage(updatedItems);
      drawCanvas(activePage);
      return;
    }

    // === SINGLE ITEM DRAG (WITH SNAPPING) ===
    if (selectedTextIndexes.length === 1 && initialPositions.length === 1) {
      const selIdx = selectedTextIndexes[0];
      const item = updatedItems[selIdx];
      const initPos = initialPositions[0];

      if (!item || item.index !== activePage) return;

      let newX = initPos.x + deltaX;
      let newY = initPos.y + deltaY;

      const padding = (item.fontSize || fontSize) * 0.2;
      const draggedLeft = newX - padding;
      const snapThreshold = 4;

      // Snap to nearby vertical edge
      for (let i = 0; i < textItems.length; i++) {
        if (i === selIdx) continue;
        const other = textItems[i];
        if (other.index !== activePage) continue;

        const otherPadding = (other.fontSize || fontSize) * 0.2;
        const otherLeft = other.x - otherPadding;

        if (Math.abs(draggedLeft - otherLeft) < snapThreshold) {
          newX = otherLeft + padding;
          break;
        }
      }

      item.x = newX;
      item.y = newY;

      setTextItems(updatedItems);
      updatePageItems('textItems', updatedItems.filter(i => i.index === activePage));
      saveTextItemsToLocalStorage(updatedItems);
      drawCanvas(activePage);
      return;
    }

    // === FALLBACK: JUST MOVE ALL SELECTED ===
    selectedTextIndexes.forEach((selIdx) => {
      const item = updatedItems[selIdx];
      const initPos = initialPositions.find(p => p.index === selIdx);
      if (item && initPos && item.index === activePage) {
        item.x = initPos.x + deltaX;
        item.y = initPos.y + deltaY;
      }
    });

    setTextItems(updatedItems);
    updatePageItems('textItems', updatedItems.filter(t => t.index === activePage));
    saveTextItemsToLocalStorage(updatedItems);
    drawCanvas(activePage);
  }

};

useEffect(() => {
  if (shouldClearSelectionBox) {
    setSelectionStart(null);
    setSelectionEnd(null);
    setShouldClearSelectionBox(false);
    drawCanvas(activePage);
  }
}, [shouldClearSelectionBox]);


const handleMouseUp = (e) => {
  const selectionRect = {
    x: Math.min(selectionStart?.x || 0, selectionEnd?.x || 0),
    y: Math.min(selectionStart?.y || 0, selectionEnd?.y || 0),
    width: Math.abs((selectionEnd?.x || 0) - (selectionStart?.x || 0)),
    height: Math.abs((selectionEnd?.y || 0) - (selectionStart?.y || 0)),
  };

  // === Stop Resizing ===
  if (isResizing) setIsResizing(false);

  // === Stop Dragging ===
  if (isDragging) {
    setIsDragging(false);
    setInitialPositions([]);
    setDragStart({ x: 0, y: 0 });
  }

  if (resizingImageIndex !== null) setResizingImageIndex(null);
  if (isImageDragging) {
    setIsImageDragging(false);
    setDraggedImageIndex(null);
    setDragStart({ x: 0, y: 0 });
  }

  // === Selection Handling ===
  if (isSelecting) {
    const ctx = canvasRefs.current[activePage].getContext('2d');
    const selectedIndexes = [];
    const updatedInitialPositions = [];

    textItems.forEach((item, index) => {
      if (item.index !== activePage) return;

      const textWidth = ctx.measureText(item.text).width;
      const textHeight = ctx.measureText(item.text);
      const actualHeight = textHeight.actualBoundingBoxAscent + textHeight.actualBoundingBoxDescent;

      const textRect = {
        x: item.x - item.boxPadding,
        y: item.y - actualHeight - item.boxPadding,
        width: textWidth + item.boxPadding * 2,
        height: actualHeight + item.boxPadding * 2,
      };

      const intersects =
        selectionRect.x < textRect.x + textRect.width &&
        selectionRect.x + selectionRect.width > textRect.x &&
        selectionRect.y < textRect.y + textRect.height &&
        selectionRect.y + selectionRect.height > textRect.y;

      if (intersects) {
        selectedIndexes.push(index);
        updatedInitialPositions.push({
          index,
          x: item.x,
          y: item.y,
          activePage,
        });
      }
    });

    if (selectedIndexes.length > 0) {
      // Texts selected
      setSelectedTextIndexes(selectedIndexes);
      setInitialPositions(updatedInitialPositions);
      setIsTextSelected(true);
    } else {
      // No texts selected
      setSelectedTextIndexes([]);
      setSelectedTextIndex(null);
      setIsTextSelected(false);
    }

    // TextBox mode creates a new box
    if (isTextBoxEditEnabled && !textBox) {
      const rectWidth = selectionEnd.x - selectionStart.x;
      const rectHeight = selectionEnd.y - selectionStart.y;

      setTextBox({
        x: selectionStart.x,
        y: selectionStart.y,
        width: rectWidth,
        height: rectHeight,
        text: '',
      });
    }

   setIsSelecting(false);
   setShouldClearSelectionBox(true);
  }

  // === Always clear selection rectangle ===
  setSelectionStart(null);
  setSelectionEnd(null);
  drawCanvas(activePage); // Redraw canvas
};


 const handleKeyDown = (e) => {
if (isTextBoxEditEnabled && textBox) {
    let updatedText = textBox.text;

    if (e.key === 'Enter') {
      updatedText += '\n';
    } else if (e.key === 'Backspace') {
      updatedText = updatedText.slice(0, -1);
    } else if (e.key.length === 1) {
      updatedText += e.key;
    } else {
      return;
    }

    const ctx = canvasRefs.current[activePage].getContext('2d');
    ctx.font = `${textBox.fontSize || fontSize}px Arial`;

    const result = wrapTextPreservingNewlinesResponsive(updatedText, ctx, textBox.width, fontSize, textBox.boxPadding || 10);

    setTextBox({
      ...textBox,
      text: updatedText,
      width: result.width,
      height: result.height
    });
  }
  };
useEffect(() => {


  window.addEventListener('keydown', handleKeyDown); // changed from keyup
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [isTextBoxEditEnabled, textBox, activePage]);

  const handleTextMove = (e) => {
    
    if (isTextSelected && selectedTextIndex !== null) {
      const updatedItems = [...textItems];
      const selectedItem = updatedItems[selectedTextIndex];
      //e.preventDefault();
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



const addTextToCanvas2 = (textBox) => {
    if (textBox?.text?.trim()) {
    const padding = newFontSize * 0.2;
    const ctx = canvasRefs.current[activePage].getContext('2d');
    const innerWidth = textBox.width - padding * 2;
    const lines = wrapTextResponsive(textBox.text, innerWidth, ctx);
    const lineHeight = newFontSize + 5;

    const textItemsToAdd = lines.map((line, i) => ({
      text: line,
      fontSize: newFontSize,
      boxPadding: padding,
      x: textBox.x + padding,
      y: textBox.y + 20 + i * lineHeight,
      index: activePage,
    }));

    const updatedItems = [...textItems, ...textItemsToAdd];
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems);
    updatePageItems('textItems', updatedItems);
    setTextBox(null);
    drawCanvas(activePage);
  }
};


// Handle deleting the selected image
const deleteSelectedImage = () => {
  if (selectedImageIndex !== null) {
    const filteredItems = imageItems.filter((item, index) => {
      if (item.index !== activePage) return true; // keep images from other pages
      const pageImages = imageItems.filter(i => i.index === activePage);
      const targetItem = pageImages[selectedImageIndex];
      return item !== targetItem; // remove only the matched item from current page
    });

    setImageItems(filteredItems);
    saveImageItemsToLocalStorage(filteredItems);
    setSelectedImageIndex(null);
    drawCanvas(activePage);
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











const handleDoubleClick = (e) => {
  const { offsetX, offsetY } = e.nativeEvent;
  const ctx = canvasRefs.current[activePage].getContext('2d');

  textItems.forEach((item, index) => {
    if (item.index !== activePage) return;

    // Set font size for the item before measuring
    const fontSize = item.fontSize || 16;
    ctx.font = `${fontSize}px Arial`;

    // Recalculate padding dynamically if not stored
    const boxPadding = item.boxPadding ?? (fontSize * 0.2);

    const metrics = ctx.measureText(item.text);
    const textWidth = metrics.width;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    const textRect = {
      x: item.x - boxPadding,
      y: item.y - textHeight - boxPadding,
      width: textWidth + boxPadding * 2,
      height: textHeight + boxPadding * 2,
    };

    const isInside =
      offsetX >= textRect.x &&
      offsetX <= textRect.x + textRect.width &&
      offsetY >= textRect.y &&
      offsetY <= textRect.y + textRect.height;

    if (isInside) {
      setIsEditing(true);
      setEditingText(item.text);
      setEditingFontSize(item.fontSize);
      setEditingIndex(index);
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
      index: activePage,
      boxPadding: editingFontSize * 0.2,
    };
    setTextItems(updatedItems);
    saveTextItemsToLocalStorage(updatedItems); // Save to localStorage
    closeEditModal(); // Close the modal
    drawCanvas(activePage);
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
<div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
  {/* Sidebar */}
  <div style={{
    width: '260px',
    backgroundColor: '#f4f6f8',
    padding: '20px',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: '2px 0 6px rgba(0,0,0,0.05)'
  }}>
    <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>PdfEditor</h2>

    {/* PDF Controls */}
    <div>
      <h4 style={{ marginBottom: '10px', color: '#666' }}>PDF</h4>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ marginBottom: '10px', width: '100%' }}
      />
      <button style={btnStyle} onClick={uploadPdfToServer}>Upload PDF</button>
      <button style={btnStyle} onClick={saveAllPagesAsPDF}>Save as PDF</button>
    </div>

    {/* Page Controls */}
    <div>
      <h4 style={{ marginBottom: '10px', color: '#666' }}>Pages</h4>
      <button style={btnStyle} onClick={addNewPage}>Add Page</button>
      <button style={btnStyle} onClick={removePage}>Remove Page</button>
    </div>

    {/* Text Controls */}
    <div>
      <h4 style={{ marginBottom: '10px', color: '#666' }}>Text</h4>
      <button style={btnStyle} onClick={() => setShowAddTextModal(true)}>Add Text</button>
      <button
        style={{ ...btnStyle, opacity: selectedTextIndex === null && selectedTextIndexes.length < 1 ? 0.5 : 1 }}
        onClick={removeSelectedText}
        disabled={selectedTextIndex === null && selectedTextIndexes.length < 1}
      >
        Remove Text
      </button>
      <button style={btnStyle} onClick={toggleGrid}>
        {showGrid ? 'Hide Grid' : 'Show Grid'}
      </button>
    </div>

 {/* Image Controls */}
    <div>
      <h4 style={{ marginBottom: '10px', color: '#666' }}>Images</h4>
      <input
        type="file"
        accept="image/*"
        onChange={handleAddImage}
        style={{ marginBottom: '10px', width: '100%' }}
      />
      <button
        style={{ ...btnStyle, opacity: selectedImageIndex === null ? 0.5 : 1 }}
        onClick={deleteSelectedImage}
        disabled={selectedImageIndex === null}
      >
        Delete Image
      </button>
    </div>

    {/* TextBox Controls */}
    <div>
      <h4 style={{ marginBottom: '10px', color: '#666' }}>TextBox</h4>
      <button
        style={btnStyle}
        onClick={() => {
          setIsTextBoxEditEnabled(prev => !prev);
          if (textBox !== null) addTextToCanvas2(textBox, maxWidth);
          setTextBox(null);
        }}
      >
        {isTextBoxEditEnabled ? 'Save TextBox' : 'Enable TextBox Edit'}
      </button>
    </div>

    
  </div>

  {/* Canvas Area */}
  <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
    {pages.map((_, index) => (
      <canvas
        key={index}
        ref={(el) => (canvasRefs.current[index] = el)}
        style={{
          border: activePage === index ? '2px solid dodgerblue' : '1px solid #ccc',
          marginBottom: '20px',
          backgroundColor: 'white'
        }}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={(e) => handleMouseMove(e, index)}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={() => setActivePage(index)}
      />
    ))}
  </div>

  {/* Modal for Add Text */}

  {showAddTextModal && (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      border: '1px solid #ccc',
      boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
      zIndex: 1000
    }}>
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
  )}

{/* Edit Text Modal */}
  {isEditing && (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      border: '1px solid #ccc',
      boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
      zIndex: 1000
    }}>
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
  )}
</div>
);
}

export default App;