export function drawSelectionRect(ctx, rect, pageIndex, state) {
  const { isSelecting, selectionStart, selectionEnd, activePage } = state;
  if (!isSelecting || !selectionStart || !selectionEnd || activePage !== pageIndex) return;
  if (selectionStart.x === selectionEnd.x && selectionStart.y === selectionEnd.y) return;

  const width  = selectionEnd.x - selectionStart.x;
  const height = selectionEnd.y - selectionStart.y;

  ctx.strokeStyle = "dodgerblue";
  ctx.fillStyle = "rgba(30, 144, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(selectionStart.x, selectionStart.y, width, height);
  ctx.fillRect(selectionStart.x, selectionStart.y, width, height);
}