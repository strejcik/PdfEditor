export function ShapeToolbar({ activeShapeTool, setActiveShapeTool, selectedShapeIndex, deleteSelectedShape, isViewer, viewOnly }) {
  const handleToolClick = (toolType) => {
    // Toggle: if clicking the active tool, deactivate it
    setActiveShapeTool(activeShapeTool === toolType ? null : toolType);
  };

  const buttonClass = (toolType) =>
    activeShapeTool === toolType ? "btn btn-primary" : "btn btn-secondary";

  return (
    <>
      <div className="btn-row">
        <button
          className={buttonClass("rectangle")}
          onClick={isViewer ? viewOnly : () => handleToolClick("rectangle")}
          disabled={isViewer}
          title="Draw rectangle - Click and drag on canvas"
        >
          ▢ Rectangle
        </button>
        <button
          className={buttonClass("circle")}
          onClick={isViewer ? viewOnly : () => handleToolClick("circle")}
          disabled={isViewer}
          title="Draw circle - Click and drag on canvas"
        >
          ○ Circle
        </button>
        <button
          className={buttonClass("line")}
          onClick={isViewer ? viewOnly : () => handleToolClick("line")}
          disabled={isViewer}
          title="Draw line - Click and drag on canvas"
        >
          ╱ Line
        </button>
        <button
          className={buttonClass("arrow")}
          onClick={isViewer ? viewOnly : () => handleToolClick("arrow")}
          disabled={isViewer}
          title="Draw arrow - Click and drag on canvas"
        >
          → Arrow
        </button>
      </div>

      {deleteSelectedShape && (
        <button
          className="btn btn-secondary"
          onClick={isViewer ? viewOnly : deleteSelectedShape}
          disabled={isViewer || selectedShapeIndex === null}
          style={{
            opacity: selectedShapeIndex === null ? 0.5 : 1,
            marginTop: 8,
          }}
          title="Delete selected shape (or press Delete key)"
        >
          Delete Selected
        </button>
      )}

      {activeShapeTool && (
        <div style={{
          fontSize: "11px",
          color: "#9ca3af",
          marginTop: "8px",
          padding: "6px 8px",
          background: "rgba(59, 130, 246, 0.1)",
          borderRadius: "6px",
          border: "1px solid rgba(59, 130, 246, 0.2)"
        }}>
          <strong style={{ color: "#60a5fa" }}>✓ {activeShapeTool.charAt(0).toUpperCase() + activeShapeTool.slice(1)} tool active</strong>
          <br />
          Click and drag on the canvas to draw
        </div>
      )}
    </>
  );
}
