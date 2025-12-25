import { ensureLatoLoadedOnce } from "../../font/fontLoader"
import { drawGridIfNeeded } from "./layers/drawGrid";
import { drawTextItems, drawSingleTextItem } from "./layers/drawTextItems";
import { drawImageItems } from "./layers/drawImageItems";
import { drawShapeItems, drawShapeCreationPreview, drawSingleShape } from "./drawShapeItems";
import { drawFormFields, drawFormFieldCreationPreview } from "./drawFormFields";
import { drawSelectionRect } from "./layers/drawSelectionRect";
import { drawTextBoxEditor } from "./layers/drawTextBoxEditor";
import { drawMultilinePage } from "./layers/drawMultilinePage";
import { drawAnnotations, drawTextSelectionPreview } from "./drawAnnotations";
import { drawAlignmentGuides } from "../alignmentGuides";


export async function drawCanvas(pageIndex, opts = {}) {
  if (typeof pageIndex !== "number") {
    throw new Error("drawCanvas(pageIndex) requires a numeric pageIndex");
  }

  const { canvas, state = {}, config = {} } = opts;
  if (!canvas) return;

  await ensureLatoLoadedOnce(
    config.APP_FONT_FAMILY || "Lato",
    "/fonts/Lato-Regular.ttf"
  );

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  drawGridIfNeeded(ctx, rect, config.showGrid);

  if (state.isMultilineMode) {
    drawMultilinePage(ctx, rect, pageIndex, state, config);
    // return; // if you want multiline to replace normal layers
  }

  // Draw annotations BEFORE text so highlights appear behind text
  drawAnnotations(ctx, rect, pageIndex, state);
  drawTextSelectionPreview(ctx, rect, state);

  // Draw images first (background layer)
  drawImageItems(ctx, rect, pageIndex, state, config);

  // Combine textItems and shapeItems with z-index for unified sorting
  const textItems = state.textItems || [];
  const shapeItems = state.shapeItems || [];

  // Create unified list with type markers for z-index ordering
  const zIndexItems = [];

  // Add text items for this page
  textItems.forEach((item, globalIndex) => {
    if (item.index === pageIndex) {
      zIndexItems.push({
        type: 'text',
        item,
        globalIndex,
        zIndex: item.zIndex ?? 0,
      });
    }
  });

  // Add shape items for this page
  shapeItems.forEach((item, globalIndex) => {
    if (item.index === pageIndex) {
      zIndexItems.push({
        type: 'shape',
        item,
        globalIndex,
        zIndex: item.zIndex ?? 0,
      });
    }
  });

  // Sort by z-index (lower values drawn first, appear behind)
  zIndexItems.sort((a, b) => a.zIndex - b.zIndex);

  // Draw items in z-index order
  zIndexItems.forEach(({ type, item, globalIndex }) => {
    if (type === 'text') {
      drawSingleTextItem(ctx, rect, item, globalIndex, state, config);
    } else if (type === 'shape') {
      drawSingleShape(ctx, rect, item, globalIndex, state);
    }
  });

  drawShapeCreationPreview(ctx, rect, state);
  drawFormFields(ctx, rect, pageIndex, state);
  drawFormFieldCreationPreview(ctx, rect, state);

  // Draw alignment guides when dragging items
  if (state.alignmentGuides && state.alignmentGuides.length > 0) {
    drawAlignmentGuides(ctx, state.alignmentGuides, rect.width, rect.height);
  }

  drawSelectionRect(ctx, rect, pageIndex, state, config);
  drawTextBoxEditor(ctx, rect, pageIndex, state, config);
}
