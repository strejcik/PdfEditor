export function ShapeToolbar({
  activeShapeTool,
  setActiveShapeTool,
  selectedShapeIndex,
  deleteSelectedShape,
  isViewer,
  viewOnly,
  // Z-index actions
  bringShapeForward,
  sendShapeBackward,
  bringShapeToFront,
  sendShapeToBack,
}) {
  const handleToolClick = (toolType) => {
    // Toggle: if clicking the active tool, deactivate it
    setActiveShapeTool(activeShapeTool === toolType ? null : toolType);
  };

  const buttonClass = (toolType) =>
    activeShapeTool === toolType ? "btn btn-primary" : "btn btn-secondary";

  const hasSelection = selectedShapeIndex !== null;

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
          title="Draw line - Hold Shift for straight horizontal/vertical"
        >
          ╱ Line
        </button>
        <button
          className={buttonClass("arrow")}
          onClick={isViewer ? viewOnly : () => handleToolClick("arrow")}
          disabled={isViewer}
          title="Draw arrow - Hold Shift for straight horizontal/vertical"
        >
          → Arrow
        </button>
        <button
          className={buttonClass("triangle")}
          onClick={isViewer ? viewOnly : () => handleToolClick("triangle")}
          disabled={isViewer}
          title="Draw triangle - Click and drag on canvas"
        >
          △ Triangle
        </button>
        <button
          className={buttonClass("diamond")}
          onClick={isViewer ? viewOnly : () => handleToolClick("diamond")}
          disabled={isViewer}
          title="Draw diamond - Click and drag on canvas"
        >
          ◇ Diamond
        </button>
        <button
          className={buttonClass("freehand")}
          onClick={isViewer ? viewOnly : () => handleToolClick("freehand")}
          disabled={isViewer}
          title="Draw freehand - Click and drag on canvas"
        >
          ✎ Freehand
        </button>
      </div>

      {/* Z-index controls for selected shape */}
      {hasSelection && (
        <div className="z-index-controls" style={{ marginTop: 12 }}>
          <div className="panel-input-label" style={{ marginBottom: 6 }}>Layer Order</div>
          <div className="btn-row">
            <button
              className="btn btn-small btn-secondary"
              onClick={isViewer ? viewOnly : () => bringShapeToFront?.(selectedShapeIndex)}
              disabled={isViewer}
              title="Bring to Front"
            >
              ⬆⬆
            </button>
            <button
              className="btn btn-small btn-secondary"
              onClick={isViewer ? viewOnly : () => bringShapeForward?.(selectedShapeIndex)}
              disabled={isViewer}
              title="Bring Forward"
            >
              ⬆
            </button>
            <button
              className="btn btn-small btn-secondary"
              onClick={isViewer ? viewOnly : () => sendShapeBackward?.(selectedShapeIndex)}
              disabled={isViewer}
              title="Send Backward"
            >
              ⬇
            </button>
            <button
              className="btn btn-small btn-secondary"
              onClick={isViewer ? viewOnly : () => sendShapeToBack?.(selectedShapeIndex)}
              disabled={isViewer}
              title="Send to Back"
            >
              ⬇⬇
            </button>
          </div>
        </div>
      )}

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
          {(activeShapeTool === 'line' || activeShapeTool === 'arrow')
            ? 'Hold Shift for straight lines'
            : 'Click and drag on the canvas to draw'}
        </div>
      )}
    </>
  );
}
