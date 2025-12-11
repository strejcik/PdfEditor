# PdfEditor

PdfEditor is a web-based PDF editing application built primarily with TypeScript, JavaScript, and React. It allows users to create, modify, and annotate PDF documents in-browser, supporting features such as adding and editing text, inserting images, undo/redo functionality, and more. The project is designed for modern browsers and provides a smooth, interactive editing experience.

**Live Demo:**  
[https://pdf-editor8-19e064251dbf.herokuapp.com/](https://pdf-editor8-19e064251dbf.herokuapp.com/)
Some features ie. mirroring(via sockets) etc. in demo are not taken into account due to data privacy. To see all the features run app locally.

## Features

- **PDF Page Creation & Editing**: Add, remove pages in your PDF document.
- **Text Annotation**: Add, move, edit, and style text blocks on PDF pages.
- **Image Insertion**: Insert, resize, and position images with support for normalization and caching.
- **Undo/Redo**: Full undo/redo history for text and image edits, stored in browser local storage.
- **Clipboard Support**: Copy, paste, cut, delete and clear text and image items using custom clipboard logic.
- **Rulers and Canvas Tools**: Visual overlays for precise placement with customizable rulers.
- **Persistence**: Work is saved in browser storage for continuity across sessions.
- **Custom Fonts**: Uses the Lato font for a clean, readable interface.
- **Mirroring**: It gives ability for user to share the state/view of his pdf canvas so other users can watch it in real time.

## Technology Stack

- **Frontend:** React, TypeScript, JavaScript
- **State Management:** React hooks, context
- **PDF/Page Logic:** Custom canvas-based rendering
- **Image Handling:** IndexedDB for persistent storage, normalization helpers
- **Undo/Redo:** Custom stack logic with deep cloning for snapshots
- **Pdf2Svg:** Getting svg's images path from pdf document

## Getting Started

### Prerequisites

- Node.js >= v22.18.0
- npm >= 11.6.0
- Python >= 3.13.5
### Installation

```bash
git clone https://github.com/strejcik/PdfEditor.git
cd PdfEditor
npm install
```

```bash
cd PdfEditorServer
pip install Flask flask-cors pypdf pymupdf

Flask>=3.0
flask-cors>=4.0
pypdf>=5.0
pymupdf>=1.24

Download pdf2svg: https://github.com/jalios/pdf2svg-windows
Extract dist-32bits / dist64bits inside PdfEditorServer folder
```

### Running the App

```bash
Client:
cd PdfEditor
npm run build
npm start
```

```bash
Server:
cd PdfEditor
cd PdfEditorServer
python app.py
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build # or yarn build
```

Static files will be generated in the `build/` directory.

## Usage

- **Add Text:** Click the "Add Text" button, type your annotation, and drag it to position.
- **Insert Image:** Use the image upload control to place images.
- **Copy & Paste:** Use keyboard shortcut (`Ctrl+C`, `CTRL+V`) to copy and paste textItems.
- **Cut:**  Use keyboard shortcut (`CTRL+X`) to cut textItems.
- **Delete:**  Use keyboard shortcut (`DELETE`) to delete textItems.
- **Undo/Redo:** Use the UI controls or keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`) for undo/redo.
- **Save Work:** All changes are automatically saved in your browser.
- **Export:** (Feature may require browser PDF export or screenshot tools.)

## Project Structure

```
src/
  app/                # Main React application and UI logic
  hooks/              # Custom React hooks (history, clipboard, mouse, images)
  utils/              # Utility functions (images, ruler overlays, cloning, etc.)
  types/              # TypeScript type definitions
  index.js            # Entry point
  index.css           # Styles
  reportWebVitals.js  # Performance reporting
public/
  fonts/              # Custom font files
```

## Key Components

- **App.jsx**: Main application component, manages state and UI.
- **useHistory.ts**: Undo/redo stack logic with deep snapshotting and local storage.
- **useImages.ts**: Image manipulation and storage.
- **useClipboard.ts**: Clipboard logic for text and images.
- **RulerOverlay.jsx**: Visual canvas ruler for precise editing.
- **EditorProvider**: Context provider for application state.

## Development Notes

- **Undo/Redo:** All edits are recorded in an undo stack with up to 100 snapshots per session.
- **Image Cache:** Images are serialized and stored in IndexedDB for persistence.
- **Clipboard:** Custom clipboard implementation for multi-item paste/copy/cut/delete.


## License

[MIT](LICENSE)

## Author
[strejcik](https://github.com/strejcik) + AI
