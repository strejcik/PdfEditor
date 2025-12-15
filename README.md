# PdfEditor - Browser-Based PDF Creation & Editing Suite

PdfEditor is a Full-stack PDF editing application built primarily with TypeScript, JavaScript, and React. It allows users to create, modify, and annotate PDF documents in-browser, supporting features such as adding and editing text, inserting images, undo/redo functionality, and more. The project is designed for modern browsers and provides a smooth, interactive editing experience. Live demo might not have the latest commit / update.

**Live Demo:**  
[https://pdf-editor8-19e064251dbf.herokuapp.com/](https://pdf-editor8-19e064251dbf.herokuapp.com/)

## Key Features

### Core PDF Editing Capabilities

- **Multi-Page Document Management** - Create, add, remove, and navigate between multiple PDF pages with ease
- **Advanced Text Annotation** - Add text blocks with customizable fonts, sizes, colors, and multi-line editing support
- **Image Insertion & Manipulation** - Insert, resize, and position PNG, JPEG, and SVG images with precision
- **Canvas-Based Rendering** - Professional canvas rendering with accurate text measurement and wrapping
- **Responsive Coordinate System** - Intelligent normalization ensures content scales perfectly across different screen sizes

### Professional Workflow Tools

- **Comprehensive Undo/Redo** - Up to 100 snapshots per session with persistent history across browser sessions
- **Full Clipboard Support** - Copy, paste, cut, and delete operations with standard keyboard shortcuts (Ctrl+C/V/X/Z)
- **Visual Grid Overlay** - Ruler system for pixel-perfect element placement and alignment
- **PDF Export** - Generate multi-page PDFs with embedded text and images using pdf-lib
- **JSON Import/Export** - Save and restore entire editor states as portable JSON files

### Advanced Features

- **Work Persistence** - Automatic saving to browser storage (IndexedDB) ensures you never lose progress
- **PDF Upload & Processing** - Upload existing PDFs and extract text, images, and SVG representations
- **Custom Font Support** - Integrated Lato font for clean, professional-looking documents
- **Multi-Line Text Editor** - Advanced editing mode with caret positioning and text selection
- **SVG to PNG Conversion** - Automatic rasterization for PDF compatibility

### Real-Time Collaboration

- **Live Sharing/Mirroring** - Share your editing session with multiple viewers in real-time
- **Password-Protected Rooms** - Secure collaboration with JWT-based authentication
- **Host/Viewer Roles** - Hosts control the session while viewers mirror the canvas state
- **Automatic Synchronization** - Incremental updates and full state broadcasting for smooth collaboration
- **Room Management** - Automatic cleanup and health monitoring of active sessions

## Architecture

PdfEditor employs a modern, scalable architecture combining React frontend with dual backend services:

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React 18.3 Application                      │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────────┐   │   │
│  │  │  Canvas    │  │   Context   │  │   14 Custom      │   │   │
│  │  │  Rendering │◄─┤   Provider  │◄─┤   Hooks          │   │   │
│  │  └────────────┘  └─────────────┘  └──────────────────┘   │   │
│  │                                                          │   │
│  │  Storage:                                                │   │
│  │  • IndexedDB (images, pages)                             │   │
│  │  • localStorage (undo/redo stacks)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                    │                    │           │
│           │ HTTP               │ Socket.IO          │ HTTP      │
│           ▼                    ▼                    ▼           │
└─────────────────────────────────────────────────────────────────┘
            │                    │                    │
┌───────────▼──────────┐  ┌──────▼────────┐  ┌────────▼─────────┐
│   Node.js Server     │  │  Socket.IO    │  │  Python Flask    │
│   (Express)          │  │  Server       │  │  Backend         │
│                      │  │               │  │                  │
│  • Static frontend   │  │ • Room mgmt   │  │ • PDF upload     │
│  • Live routes       │  │ • JWT auth    │  │ • SVG extract    │
│  • CORS handling     │  │ • State sync  │  │ • Text/image     │
│                      │  │ • Password    │  │   extraction     │
└──────────────────────┘  └───────────────┘  └──────────────────┘
```

### Frontend Architecture

The React application uses a sophisticated Context-based state management system:

```
EditorProvider (Central State Manager)
├── useUiPanels        - UI panel visibility and controls
├── useHistory         - Undo/redo stack with localStorage persistence
├── usePages           - Multi-page document management
├── useTextItems       - Text annotations with normalized coordinates
├── useSelection       - Selection box and multi-item selection
├── useTextBox         - Text editing and input handling
├── useImages          - Image management with IndexedDB caching
├── usePdf             - PDF upload/download orchestration
├── useMultiLineMode   - Advanced text editing with caret
├── useMouse           - Mouse events, dragging, and canvas interactions
├── useKeyboard        - Keyboard shortcuts and clipboard operations
└── useShare           - Live collaboration and Socket.IO integration
```

### Backend Services

**Node.js/Express Server:**
- Serves production frontend as static files
- Provides REST API for room creation and management
- Handles JWT token generation and validation
- Manages Socket.IO connections for real-time collaboration

**Python Flask Server:**
- Processes PDF uploads and extracts content
- Converts PDF pages to SVG using pdf2svg utility
- Extracts text and images using PyMuPDF (fitz)
- Rasterizes SVG data URIs to PNG for embedding

## Technology Stack

### Frontend Technologies

|     Technology   | Version |                Purpose                   |
|------------------|---------|------------------------------------------|
| React            | 18.3.1  | UI framework with modern hooks           |
| TypeScript       | Latest  | Type-safe development (mixed with JS)    |
| Vite             | 7.1.11  | Lightning-fast build tool and dev server |
| pdf-lib          | 1.17.1  | PDF generation and manipulation          |
| @pdf-lib/fontkit | 1.1.1   | Custom font embedding support            |
| Socket.IO Client | 4.8.1   | Real-time WebSocket communication        |
| Axios            | 1.12.0  | HTTP client for API requests             |
| Canvas API       | Native  | Rendering and text measurement           |

### Backend Technologies

|       Technology      |                 Purpose                 |
|-----------------------|-----------------------------------------|
| Node.js + Express     | API server and static file serving      |
| Socket.IO             | WebSocket server for live collaboration |
| jsonwebtoken          | JWT-based authentication for rooms      |
| bcryptjs              | Password hashing for room protection    |
| Flask (Python)        | PDF processing backend                  |
| PyPDF                 | PDF manipulation in Python              |
| PyMuPDF (fitz)        | Advanced PDF text/image extraction      |
| pdf2svg               | CLI tool for PDF to SVG conversion      |

### Build & Development Tools

- **Vite** - Modern build system with HMR (Hot Module Replacement)
- **Rollup** - Code bundling and optimization (via Vite)
- **Manual Chunk Splitting** - Optimized bundles for React, PDF libraries, Socket.IO, and utilities
- **CORS** - Cross-origin resource sharing configuration

## Project Structure

```
PdfEditor/
├── src/                          # React frontend source code
│   ├── app/                      # Main application component
│   ├── components/               # Reusable UI components
│   │   └── modals/              # Modal dialogs
│   ├── context/                  # React Context providers
│   │   └── EditorProvider.js    # Central state management
│   ├── hooks/                    # 14 custom React hooks
│   │   ├── useHistory.js        # Undo/redo implementation
│   │   ├── usePages.js          # Page management
│   │   ├── useTextItems.js      # Text annotation logic
│   │   ├── useMouse.js          # Mouse interaction handling
│   │   ├── useKeyboard.js       # Keyboard shortcuts
│   │   ├── useShare.js          # Live collaboration
│   │   └── ...                  # Additional hooks
│   ├── utils/                    # Utility functions
│   │   ├── canvas/              # Canvas drawing utilities
│   │   ├── pdf/                 # PDF export functionality
│   │   ├── images/              # Image handling and conversion
│   │   ├── text/                # Text rendering and wrapping
│   │   ├── persistance/         # IndexedDB storage
│   │   ├── json/                # JSON import/export
│   │   ├── files/               # File handling utilities
│   │   ├── colors/              # Color manipulation
│   │   ├── ruler/               # Grid overlay rendering
│   │   ├── clipboard/           # Clipboard operations
│   │   ├── history/             # History management
│   │   ├── liveclient/          # Live sharing client
│   │   └── font/                # Font loading
│   ├── types/                    # TypeScript type definitions
│   ├── config/                   # Configuration constants
│   │   └── constants.ts         # Canvas size, grid, defaults
│   └── main.jsx                  # Application entry point
│
├── server/                       # Node.js backend
│   ├── config/                   # Server configuration
│   │   └── index.js             # Environment variables
│   ├── routes/                   # API route handlers
│   │   └── liveRoutes.js        # Room creation/auth endpoints
│   ├── services/                 # Business logic
│   │   └── roomService.js       # Room state management
│   ├── sockets/                  # Socket.IO event handlers
│   │   └── liveSocket.js        # Real-time collaboration logic
│   └── utils/                    # Server utilities
│       ├── jwt.js               # JWT token handling
│       ├── password.js          # Password hashing
│       └── time.js              # Timestamp utilities
│
├── PdfEditorServer/              # Python Flask backend
│   └── app.py                   # PDF processing and SVG extraction
│
├── build/                        # Production build output (generated)
├── public/                       # Static assets
├── server.js                     # Express server entry point
├── vite.config.js               # Vite build configuration
├── package.json                 # Dependencies and scripts
└── index.html                   # HTML entry point
```

## How It Works

### Coordinate System

PdfEditor employs a sophisticated dual-coordinate system:

1. **Pixel Coordinates** (x, y) - Absolute positions on the canvas
2. **Normalized Coordinates** (xNorm: 0-1, yNormTop: 0-1) - Relative positions

This approach ensures content scales perfectly when:
- Canvas size changes
- Different screen resolutions are used
- Documents are exported to PDF

The normalized system supports off-canvas positioning (values < 0 or > 1) and uses top-anchored positioning for consistent text rendering across different font sizes.

### Text Rendering Pipeline

```
User Input
    ↓
Text Item Created (with normalized coordinates)
    ↓
Canvas Context Measurement
    ↓
Multi-line Wrapping Algorithm
    ↓
Responsive Font Sizing (fits text within box)
    ↓
Canvas Rendering with Preserved Whitespace
    ↓
PDF Export (embedded text with pdf-lib)
```

### Undo/Redo System

The robust undo/redo implementation:
- Deep clones entire application state for each snapshot
- Maintains separate undo and redo stacks (max 100 each)
- Persists stacks to localStorage for session recovery
- Supports page-aware history with automatic remapping
- Uses functional and reference-based binding for efficiency

### Live Collaboration Flow

```
Host                              Server                          Viewer
  │                                 │                                │
  ├─ Create Room ─────────────────► │                                │
  │◄─ Return JWT token ─────────────┤                                │
  │                                 │                                │
  ├─ Connect via Socket.IO ───────► │                                │
  │◄─ Room joined ──────────────────┤                                │
  │                                 │                                │
  │                                 │◄─ Request viewer token ────────┤
  │                                 ├─ Validate password ───────────►│
  │                                 │◄───────────────────────────────┤
  │                                 ├─ Return viewer JWT ───────────►│
  │                                 │                                │
  │                                 │◄─ Connect via Socket.IO ───────┤
  │◄─ Viewer joined notification ───┤                                │
  │                                 │                                │
  ├─ Broadcast state ──────────────►│                                │
  │                                 ├─ Forward state ───────────────►│
  │                                 │                                │
  ├─ Send incremental patch ───────►│                                │
  │                                 ├─ Forward patch ───────────────►│
  │                                 │                                │
```

### Image Management

Images are handled through a multi-stage pipeline:
1. Upload image
2. Convert to data URI (base64)
3. Store in IndexedDB for persistence
4. Render on canvas
5. For SVG: rasterize to PNG for PDF compatibility
6. Embed in final PDF with normalized dimensions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x (for PDF processing backend)
- pdf2svg utility (for SVG extraction)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PdfEditor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file
PORT=5000
LIVE_JWT_SECRET=your-secret-key-here
APP_ORIGINS=http://localhost:3000,http://localhost:5000
```

4. Install Python dependencies (for PDF processing):
```bash
cd PdfEditorServer
pip install flask PyPDF PyMuPDF
```

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

This launches Vite dev server on `http://localhost:3000` with proxy to backend on port 5000.

Start the Node.js backend:

```bash
npm start
```

Start the Python Flask backend (optional, for PDF processing):

```bash
cd PdfEditorServer
python app.py
```

### Production Build

Build optimized production bundle:

```bash
npm run build
```

This creates an optimized build in the `/build` directory with:
- Manual chunk splitting for optimal loading
- Minified JavaScript and CSS
- Tree-shaken dependencies
- Separate bundles for React, PDF libraries, Socket.IO, and utilities

Preview production build:

```bash
npm run preview
```

### Deployment

The project includes Heroku configuration:

```bash
git push heroku main
```

The `heroku-postbuild` script automatically runs `npm run build` during deployment.

## Configuration

### Canvas Settings (src/config/constants.ts)

```typescript
CANVAS_WIDTH: 595      // A4 width at 72 DPI
CANVAS_HEIGHT: 842     // A4 height at 72 DPI
PDF_WIDTH: 595         // Export PDF width
PDF_HEIGHT: 842        // Export PDF height
DEFAULT_FONT_SIZE: 20  // Default text size
CELL_SIZE: 20          // Grid cell size
BOX_PADDING: 10        // Text box padding
```

### Build Optimization (vite.config.js)

Manual chunk splitting strategy:
- **react-vendor**: React core and ReactDOM (separate chunk for caching)
- **pdf-vendor**: pdf-lib and fontkit (large library, ~1MB)
- **socket-vendor**: Socket.IO client
- **utils-vendor**: Axios and other utilities

This ensures optimal loading performance and browser caching.

## Development Workflow

### Keyboard Shortcuts

- **Ctrl+C** - Copy selected item
- **Ctrl+V** - Paste from clipboard
- **Ctrl+X** - Cut selected item
- **Delete** - Delete selected item

### State Management Pattern

The application uses a centralized Context provider that aggregates all hooks:

```javascript
<EditorProvider>
  {children}
</EditorProvider>
```

Each hook manages a specific concern and exposes both state and actions, enabling clean separation of concerns and testability.

## Unique Technical Achievements

### 1. Hybrid Coordinate System
The dual pixel/normalized coordinate system is rarely implemented in browser-based PDF editors, providing true resolution independence.

### 2. Canvas-Based Text Measurement
Unlike typical DOM-based editors, PdfEditor uses canvas context for text measurement, ensuring pixel-perfect accuracy between display and PDF export.

### 3. Persistent Undo/Redo
Deep cloning entire application state with localStorage persistence provides desktop-app-level reliability in a browser environment.

### 4. Real-Time Collaboration Without Operational Transform
Instead of complex OT algorithms, the system uses JWT-secured rooms with full state broadcasting and incremental patches - simpler and more reliable for this use case.

### 5. Multi-Backend Architecture
Combining Node.js (for real-time collaboration) with Python (for PDF processing) leverages the best tools for each task.

## Browser Compatibility

Supports modern browsers:
- Chrome (last version)
- Firefox (last version)
- Safari (last version)
- Edge (Chromium-based)

Production build targets:
- >0.2% market share
- Not dead browsers
- Excludes Opera Mini

## Performance Characteristics

- **Build size**: ~2-3 MB (including pdf-lib)
- **Chunk size warning threshold**: 1500 KB (due to pdf-lib)
- **Undo/redo snapshots**: Up to 100 per session
- **Image storage**: IndexedDB (unlimited with user permission)
- **Real-time latency**: <100ms for collaboration updates (typical)

## Security Features

- JWT-based authentication for live rooms
- Password hashing with bcryptjs (salt rounds: 10)
- CORS protection with configurable origins
- No server-side storage of PDF content (privacy-focused)
- Token expiration and automatic room cleanup

## License

[MIT](LICENSE)

## Contributing

[strejcik](https://github.com/strejcik) + AI

## Acknowledgments

This project leverages outstanding open-source libraries:
- **pdf-lib** - Incredible PDF manipulation library
- **React** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **Socket.IO** - Real-time communication made simple
- **PyMuPDF** - Powerful PDF processing in Python

