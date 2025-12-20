import { ensureLatoLoadedOnce } from "../../font/fontLoader"
import { drawGridIfNeeded } from "./layers/drawGrid";
import { drawTextItems } from "./layers/drawTextItems";
import { drawImageItems } from "./layers/drawImageItems";
import { drawShapeItems, drawShapeCreationPreview } from "./drawShapeItems";
import { drawFormFields, drawFormFieldCreationPreview } from "./drawFormFields";
import { drawSelectionRect } from "./layers/drawSelectionRect";
import { drawTextBoxEditor } from "./layers/drawTextBoxEditor";
import { drawMultilinePage } from "./layers/drawMultilinePage";


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

  drawTextItems(ctx, rect, pageIndex, state, config);
  drawImageItems(ctx, rect, pageIndex, state, config);
  drawShapeItems(ctx, rect, pageIndex, state);
  drawShapeCreationPreview(ctx, rect, state);
  drawFormFields(ctx, rect, pageIndex, state);
  drawFormFieldCreationPreview(ctx, rect, state);
  drawSelectionRect(ctx, rect, pageIndex, state, config);
  drawTextBoxEditor(ctx, rect, pageIndex, state, config);
}
