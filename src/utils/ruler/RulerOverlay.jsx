import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
} from "react";

/**
 * RulerOverlay (pure JS)
 * - Top & Left pixel rulers
 * - Crosshair + pointer markers that persist after selection ends
 * - A floating "(x, y)" label drawn at the bottom-right of the cursor
 *
 * Props:
 *  - canvasRef: ref to your main <canvas> (required)
 *  - zoom?: number
 *  - origin?: { x, y }
 *  - showCrosshair?: boolean
 *  - majorStepPx?: number
 *  - minorStepPx?: number
 */
const RulerOverlay = forwardRef(
  (
    {
      canvasRef,
      zoom = 1,
      origin = { x: 0, y: 0 },
      showCrosshair = true,
      majorStepPx = 50,
      minorStepPx = 10,
    },
    ref
  ) => {
    const topRulerRef = useRef(null);
    const leftRulerRef = useRef(null);
    const overlayRef = useRef(null);

    const [dims, setDims] = useState({ w: 595, h: 842, dpr: 1 });

    // ---- Flicker control / state ----
    const draggingRef = useRef(false);
    const hoverRef = useRef(false);
    const lastPosRef = useRef(null); // {x, y} in canvas CSS px
    const rafIdRef = useRef(0);

    // Track canvas size
    useLayoutEffect(() => {
      const canvas = canvasRef?.current;
      if (!canvas) return;

      const update = () => {
        const r = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        setDims({ w: Math.round(r.width), h: Math.round(r.height), dpr });
      };

      update();
      const ro = new ResizeObserver(update);
      ro.observe(canvas);
      return () => ro.disconnect();
    }, [canvasRef, zoom]);

    // Draw rulers (top/left). Also size the overlay.
    useEffect(() => {
      const { w, h, dpr } = dims;

      const sizeCanvas = (c, cssW, cssH) => {
        if (!c) return null;
        c.width = Math.max(1, Math.round(cssW * dpr));
        c.height = Math.max(1, Math.round(cssH * dpr));
        const ctx = c.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);
        return ctx;
      };

      const topH = 24;
      const topCtx = sizeCanvas(topRulerRef.current, w, topH);
      if (topCtx) {
        drawRulerTop(topCtx, w, topH, {
          zoom,
          originX: origin.x,
          majorStepPx,
          minorStepPx,
        });
      }

      const leftW = 24;
      const leftCtx = sizeCanvas(leftRulerRef.current, leftW, h);
      if (leftCtx) {
        drawRulerLeft(leftCtx, leftW, h, {
          zoom,
          originY: origin.y,
          majorStepPx,
          minorStepPx,
        });
      }

      sizeCanvas(overlayRef.current, w, h);

      // After any resize/redraw, re-draw markers at last known position
      if (lastPosRef.current) scheduleOverlayDraw();
    }, [dims, zoom, origin.x, origin.y, majorStepPx, minorStepPx]);

    // Centralized, RAF-batched overlay drawing
    const scheduleOverlayDraw = () => {
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(drawOverlay);
      }
    };

    const drawOverlay = () => {
      rafIdRef.current = 0;

      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      const { w, h } = dims;

      ctx.clearRect(0, 0, w, h);

      if (!showCrosshair || !lastPosRef.current) return;

      const { x, y } = lastPosRef.current;

      // Dashed crosshair
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(30,144,255,0.85)";
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
      ctx.stroke();

      ctx.restore();

      // Corner markers + coordinate label
      drawPointerMarkers(ctx, x, y);
      drawCoordinateLabel(ctx, x, y);
    };

    // Pointer tracking (no flicker during selection)
    useEffect(() => {
      const canvas = canvasRef?.current;
      if (!canvas) return;

      const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const clientX = e.touches?.[0]?.clientX ?? e.clientX;
        const clientY = e.touches?.[0]?.clientY ?? e.clientY;
        return { x: clientX - r.left, y: clientY - r.top };
      };

      const onEnter = () => {
        hoverRef.current = true;
        scheduleOverlayDraw();
      };

      const onMove = (e) => {
        lastPosRef.current = getPos(e);
        console.log(
          `mouse: x=${Math.round(lastPosRef.current.x)}, y=${Math.round(
            lastPosRef.current.y
          )}`
        );
        scheduleOverlayDraw();
      };

      const onLeave = () => {
        hoverRef.current = false;
        lastPosRef.current = null; // clear only when really leaving
        scheduleOverlayDraw();
      };

      const onDown = (e) => {
        draggingRef.current = true;
        lastPosRef.current = getPos(e);
        scheduleOverlayDraw();

        // Track on document while dragging
        document.addEventListener("mousemove", onDocMove, { passive: true });
        document.addEventListener("mouseup", onDocUp, { passive: true });
      };

      const onDocMove = (e) => {
        // If mouse moves outside the canvas during drag, still update marker
        lastPosRef.current = getPos(e);
        scheduleOverlayDraw();
      };

      const onDocUp = () => {
        draggingRef.current = false;
        document.removeEventListener("mousemove", onDocMove);
        document.removeEventListener("mouseup", onDocUp);
        // keep lastPosRef → markers persist
        scheduleOverlayDraw();
      };

      const onClick = (e) => {
        // Ensure a click also paints markers even without move
        lastPosRef.current = getPos(e);
        scheduleOverlayDraw();
      };

      canvas.addEventListener("mouseenter", onEnter, { passive: true });
      canvas.addEventListener("mousemove", onMove, { passive: true });
      canvas.addEventListener("mouseleave", onLeave, { passive: true });
      canvas.addEventListener("mousedown", onDown, { passive: true });
      canvas.addEventListener("click", onClick, { passive: true });

      return () => {
        canvas.removeEventListener("mouseenter", onEnter);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseleave", onLeave);
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("click", onClick);
        document.removeEventListener("mousemove", onDocMove);
        document.removeEventListener("mouseup", onDocUp);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      };
    }, [canvasRef, dims, showCrosshair]);

    return (
      <>
        <canvas
          ref={topRulerRef}
          style={{
            position: "absolute",
            left: `${getCanvasLeft(canvasRef)}px`,
            top: `${getCanvasTop(canvasRef) - 24}px`,
            width: `${dims.w}px`,
            height: "24px",
            pointerEvents: "none",
            background: "#f7f7f7",
            zIndex: 10,
          }}
        />
        <canvas
          ref={leftRulerRef}
          style={{
            position: "absolute",
            left: `${getCanvasLeft(canvasRef) - 24}px`,
            top: `${getCanvasTop(canvasRef)}px`,
            width: "24px",
            height: `${dims.h}px`,
            pointerEvents: "none",
            background: "#f7f7f7",
            zIndex: 10,
          }}
        />
        <canvas
          ref={overlayRef}
          style={{
            position: "absolute",
            left: `${getCanvasLeft(canvasRef)}px`,
            top: `${getCanvasTop(canvasRef)}px`,
            width: `${dims.w}px`,
            height: `${dims.h}px`,
            pointerEvents: "none",
            zIndex: 11, // above the main canvas
          }}
        />
      </>
    );
  }
);

export default RulerOverlay;

/* ---------- helpers ---------- */
function getCanvasLeft(canvasRef) {
  const el = canvasRef?.current;
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const parent = el.offsetParent?.getBoundingClientRect?.();
  return parent ? r.left - parent.left : r.left;
}
function getCanvasTop(canvasRef) {
  const el = canvasRef?.current;
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const parent = el.offsetParent?.getBoundingClientRect?.();
  return parent ? r.top - parent.top : r.top;
}

/* --- drawing functions --- */
function drawRulerTop(ctx, width, height, { zoom, originX, majorStepPx, minorStepPx }) {
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(0, height - 0.5);
  ctx.lineTo(width, height - 0.5);
  ctx.stroke();

  const minor = Math.max(2, Math.floor(minorStepPx * zoom));
  const major = Math.max(minor, Math.floor(majorStepPx * zoom));
  const start = -originX % minor;
  const labelEvery = Math.max(1, Math.round(major / minor));

  ctx.fillStyle = "#666";
  ctx.strokeStyle = "#bbb";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.font = "10px system-ui";

  let minorCount = 0;
  for (let x = start; x < width; x += minor, minorCount++) {
    const isMajor = minorCount % labelEvery === 0;
    ctx.beginPath();
    const y1 = isMajor ? 0 : height * 0.45;
    ctx.moveTo(Math.round(x) + 0.5, height);
    ctx.lineTo(Math.round(x) + 0.5, y1);
    ctx.stroke();
    if (isMajor) {
      const logical = Math.round((x + originX) / zoom);
      ctx.fillText(String(logical), Math.round(x) + 0.5, 2);
    }
  }
}

function drawRulerLeft(ctx, width, height, { zoom, originY, majorStepPx, minorStepPx }) {
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(width - 0.5, 0);
  ctx.lineTo(width - 0.5, height);
  ctx.stroke();

  const minor = Math.max(2, Math.floor(minorStepPx * zoom));
  const major = Math.max(minor, Math.floor(majorStepPx * zoom));
  const start = -originY % minor;
  const labelEvery = Math.max(1, Math.round(major / minor));

  ctx.fillStyle = "#666";
  ctx.strokeStyle = "#bbb";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.font = "10px system-ui";

  let minorCount = 0;
  for (let y = start; y < height; y += minor, minorCount++) {
    const isMajor = minorCount % labelEvery === 0;
    ctx.beginPath();
    const x1 = isMajor ? 0 : width * 0.45;
    ctx.moveTo(width, Math.round(y) + 0.5);
    ctx.lineTo(x1, Math.round(y) + 0.5);
    ctx.stroke();
    if (isMajor) {
      const logical = Math.round((y + originY) / zoom);
      ctx.save();
      ctx.translate(width - 2, Math.round(y) + 0.5);
      ctx.fillText(String(logical), 0, 0);
      ctx.restore();
    }
  }
}

function drawPointerMarkers(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(30,144,255,0.95)";

  // top marker triangle
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, 0);
  ctx.lineTo(Math.round(x) + 4.5, 8);
  ctx.lineTo(Math.round(x) - 3.5, 8);
  ctx.closePath();
  ctx.fill();

  // left marker triangle
  ctx.beginPath();
  ctx.moveTo(0, Math.round(y) + 0.5);
  ctx.lineTo(8, Math.round(y) - 3.5);
  ctx.lineTo(8, Math.round(y) + 4.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draw a small rounded label showing "(x, y)" at bottom-right of the cursor.
 * Always placed to the right and below the cursor (no clamping by design).
 */
function drawCoordinateLabel(ctx, x, y) {
  const padX = 6;
  const padY = 4;
  const offsetX = 10; // distance to the right of the cursor
  const offsetY = 10; // distance below the cursor
  const label = `(${Math.round(x)}, ${Math.round(y)})`;

  ctx.save();
  ctx.font = "12px system-ui";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const metrics = ctx.measureText(label);
  const textW = metrics.width;
  const textH = 14; // approximate height for 12px font
  const boxX = Math.round(x + offsetX);
  const boxY = Math.round(y + offsetY);
  const boxW = Math.ceil(textW + padX * 2);
  const boxH = Math.ceil(textH + padY * 2);

  // background
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  roundRect(ctx, boxX, boxY, boxW, boxH, 4);
  ctx.fill();

  // text
  ctx.fillStyle = "#fff";
  ctx.fillText(label, boxX + padX, boxY + padY);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
