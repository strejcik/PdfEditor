import { ensureLatoLoadedOnce } from "../../font/fontLoader"
import { drawGridIfNeeded } from "./layers/drawGrid";
import { drawTextItems, drawSingleTextItem } from "./layers/drawTextItems";
import { drawImageItems, drawSingleImage } from "./layers/drawImageItems";
import { drawShapeItems, drawShapeCreationPreview, drawSingleShape } from "./drawShapeItems";
import { drawFormFields, drawFormFieldCreationPreview, drawSingleFormField } from "./drawFormFields";
import { drawSelectionRect } from "./layers/drawSelectionRect";
import { drawTextBoxEditor } from "./layers/drawTextBoxEditor";
import { drawMultilinePage } from "./layers/drawMultilinePage";
import { drawAnnotations, drawTextSelectionPreview, drawSingleAnnotation } from "./drawAnnotations";
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

  // Draw text selection preview (selection rectangle during annotation creation)
  drawTextSelectionPreview(ctx, rect, state);

  // UNIFIED Z-INDEX RENDERING
  // All element types participate in z-index sorting for proper layering
  const textItems = state.textItems || [];
  const shapeItems = state.shapeItems || [];
  const imageItems = state.imageItems || [];
  const formFields = state.formFields || [];
  const annotationItems = state.annotationItems || [];

  // Create unified list with type markers for z-index ordering
  const zIndexItems = [];

  // Add annotation items for this page (default z-index: -50, behind content)
  annotationItems.forEach((item, globalIndex) => {
    if (item.index === pageIndex && item.visible !== false) {
      zIndexItems.push({
        type: 'annotation',
        item,
        globalIndex,
        zIndex: item.zIndex ?? -50,
      });
    }
  });

  // Add image items for this page (default z-index: -100, background layer)
  imageItems.forEach((item, globalIndex) => {
    if (item.index === pageIndex && item.visible !== false) {
      zIndexItems.push({
        type: 'image',
        item,
        globalIndex,
        zIndex: item.zIndex ?? -100,
      });
    }
  });

  // Add text items for this page (default z-index: 0)
  textItems.forEach((item, globalIndex) => {
    if (item.index === pageIndex && item.visible !== false) {
      zIndexItems.push({
        type: 'text',
        item,
        globalIndex,
        zIndex: item.zIndex ?? 0,
      });
    }
  });

  // Add shape items for this page (default z-index: 0)
  shapeItems.forEach((item, globalIndex) => {
    if (item.index === pageIndex && item.visible !== false) {
      zIndexItems.push({
        type: 'shape',
        item,
        globalIndex,
        zIndex: item.zIndex ?? 0,
      });
    }
  });

  // Add form field items for this page (default z-index: 100, above content)
  formFields.forEach((item, globalIndex) => {
    if (item.index === pageIndex && item.visible !== false) {
      zIndexItems.push({
        type: 'formField',
        item,
        globalIndex,
        zIndex: item.zIndex ?? 100,
      });
    }
  });

  // Sort by z-index (lower values drawn first, appear behind)
  zIndexItems.sort((a, b) => a.zIndex - b.zIndex);

  // Draw items in z-index order
  zIndexItems.forEach(({ type, item, globalIndex }) => {
    switch (type) {
      case 'annotation':
        drawSingleAnnotation(ctx, rect, item, globalIndex, state);
        break;
      case 'image':
        drawSingleImage(ctx, rect, item, globalIndex, state, config);
        break;
      case 'text':
        drawSingleTextItem(ctx, rect, item, globalIndex, state, config);
        break;
      case 'shape':
        drawSingleShape(ctx, rect, item, globalIndex, state);
        break;
      case 'formField':
        drawSingleFormField(ctx, rect, item, globalIndex, state);
        break;
    }
  });

  // Draw creation previews (always on top of existing items)
  drawShapeCreationPreview(ctx, rect, state);
  drawFormFieldCreationPreview(ctx, rect, state);

  // Draw alignment guides when dragging items
  if (state.alignmentGuides && state.alignmentGuides.length > 0) {
    drawAlignmentGuides(ctx, state.alignmentGuides, rect.width, rect.height);
  }

  drawSelectionRect(ctx, rect, pageIndex, state, config);
  drawTextBoxEditor(ctx, rect, pageIndex, state, config);
}
