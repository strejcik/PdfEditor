/**
 * AnnotationToolbar Component
 * Provides UI for annotation tools: Highlight, Strikethrough, Underline
 */

import React from "react";
import { ANNOTATION_PRESET_COLORS } from "../types/annotations";

export function AnnotationToolbar({
  activeAnnotationTool,
  setActiveAnnotationTool,
  annotationColor,
  setAnnotationColor,
  annotationOpacity,
  setAnnotationOpacity,
  selectedAnnotationIndex,
  deleteSelectedAnnotations,
  isViewer,
  pdfTextSpansCount = 0,
  // Linking props
  linkToTextItem,
  setLinkToTextItem,
  isAnnotationLinked,
  onLinkAnnotation,
  onUnlinkAnnotation,
}) {
  // Toggle tool - clicking active tool deactivates it
  const handleToolClick = (toolType) => {
    if (isViewer) return;
    setActiveAnnotationTool(activeAnnotationTool === toolType ? null : toolType);
  };

  // Button class based on active state
  const buttonClass = (toolType) =>
    `btn ${activeAnnotationTool === toolType ? "btn-primary" : "btn-secondary"}`;

  // Viewer mode handler
  const viewOnly = () => {
    alert("Editing is disabled in viewer mode");
  };

  return (
    <div className="annotation-toolbar">
      {/* Tool buttons */}
      <div className="btn-row" style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        <button
          className={buttonClass("highlight")}
          onClick={() => handleToolClick("highlight")}
          disabled={isViewer}
          title="Highlight text - Click and drag over text to annotate"
          style={{ fontSize: "12px", padding: "6px 10px" }}
        >
          Highlight
        </button>
        <button
          className={buttonClass("strikethrough")}
          onClick={() => handleToolClick("strikethrough")}
          disabled={isViewer}
          title="Strikethrough - Click and drag over text to annotate"
          style={{ fontSize: "12px", padding: "6px 10px" }}
        >
          Strikethrough
        </button>
        <button
          className={buttonClass("underline")}
          onClick={() => handleToolClick("underline")}
          disabled={isViewer}
          title="Underline - Click and drag over text to annotate"
          style={{ fontSize: "12px", padding: "6px 10px" }}
        >
          Underline
        </button>
      </div>

      {/* Color picker - shown when tool is active */}
      {activeAnnotationTool && (
        <div className="shape-color-section" style={{ marginTop: "8px" }}>
          <div className="shape-color-header">
            <span className="panel-section-label" style={{ marginBottom: 0, fontSize: "11px" }}>Color</span>
            <div className="shape-color-current">
              <div
                className="shape-color-preview"
                style={{ backgroundColor: annotationColor }}
              />
              <span className="shape-color-hex">{annotationColor.toUpperCase()}</span>
            </div>
          </div>
          <div className="shape-color-swatches">
            {ANNOTATION_PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`shape-color-swatch ${annotationColor === color ? 'active' : ''}`}
                onClick={() => setAnnotationColor(color)}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          {/* Custom color input */}
          <div className="shape-custom-color-row">
            <input
              type="color"
              className="shape-custom-color-input"
              value={annotationColor}
              onChange={(e) => setAnnotationColor(e.target.value)}
              title="Custom color"
            />
            <span className="shape-custom-color-label">Custom color</span>
          </div>
        </div>
      )}

      {/* Opacity slider - shown for highlight tool */}
      {activeAnnotationTool === "highlight" && (
        <div style={{ marginTop: "8px" }}>
          <label style={{ fontSize: "11px", color: "#9ca3af", display: "block", marginBottom: "4px" }}>
            Opacity: {Math.round((annotationOpacity || 0.4) * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={annotationOpacity || 0.4}
            onChange={(e) => setAnnotationOpacity(parseFloat(e.target.value))}
            style={{ width: "100%", cursor: "pointer" }}
          />
        </div>
      )}

      {/* Link to text item checkbox - shown when tool is active */}
      {activeAnnotationTool && setLinkToTextItem && (
        <div style={{ marginTop: "8px" }}>
          <label
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={linkToTextItem || false}
              onChange={(e) => setLinkToTextItem(e.target.checked)}
              disabled={isViewer}
              style={{ cursor: "pointer" }}
            />
            Link to text item
          </label>
          <span style={{ fontSize: "10px", color: "#6b7280", display: "block", marginTop: "2px" }}>
            Linked annotations move with text
          </span>
        </div>
      )}

      {/* Link/Unlink button - shown when annotation is selected */}
      {selectedAnnotationIndex !== null && (onLinkAnnotation || onUnlinkAnnotation) && (
        <div style={{ marginTop: "8px" }}>
          {isAnnotationLinked && isAnnotationLinked(selectedAnnotationIndex) ? (
            <button
              className="btn btn-secondary"
              onClick={() => onUnlinkAnnotation && onUnlinkAnnotation(selectedAnnotationIndex)}
              disabled={isViewer}
              style={{
                fontSize: "12px",
                width: "100%",
                padding: "6px 10px",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
              }}
              title="Unlink annotation from text item"
            >
              Unlink from Text
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => onLinkAnnotation && onLinkAnnotation(selectedAnnotationIndex)}
              disabled={isViewer}
              style={{
                fontSize: "12px",
                width: "100%",
                padding: "6px 10px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
              }}
              title="Link annotation to overlapping text item"
            >
              Link to Text
            </button>
          )}
        </div>
      )}

      {/* Delete button - shown when annotation is selected */}
      {selectedAnnotationIndex !== null && (
        <button
          className="btn btn-secondary"
          onClick={isViewer ? viewOnly : deleteSelectedAnnotations}
          disabled={isViewer}
          style={{
            marginTop: "8px",
            fontSize: "12px",
            width: "100%",
            padding: "6px 10px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
          }}
          title="Delete selected annotation (Delete key)"
        >
          Delete Annotation
        </button>
      )}

      {/* Active tool indicator */}
      {activeAnnotationTool && (
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            marginTop: "8px",
            padding: "8px",
            background: "rgba(59, 130, 246, 0.1)",
            borderRadius: "6px",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <strong style={{ color: "#60a5fa", textTransform: "capitalize" }}>
            {activeAnnotationTool} mode
          </strong>
          <br />
          <span style={{ fontSize: "10px" }}>
            {pdfTextSpansCount > 0
              ? "Click and drag over text to annotate"
              : "Upload a PDF to annotate text"}
          </span>
        </div>
      )}

      {/* No PDF warning */}
      {activeAnnotationTool && pdfTextSpansCount === 0 && (
        <div
          style={{
            fontSize: "11px",
            color: "#fbbf24",
            marginTop: "8px",
            padding: "8px",
            background: "rgba(251, 191, 36, 0.1)",
            borderRadius: "6px",
            border: "1px solid rgba(251, 191, 36, 0.2)",
          }}
        >
          No PDF text detected. Upload a PDF with text content to use annotation tools.
        </div>
      )}
    </div>
  );
}

export default AnnotationToolbar;
