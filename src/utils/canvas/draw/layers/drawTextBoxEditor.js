export function drawTextBoxEditor(ctx, rect, pageIndex, state, config) {
  const { isTextBoxEditEnabled, textBox, activePage, fontSize, APP_FONT_FAMILY, wrapTextPreservingNewlinesResponsive } = {
    ...state,
    ...config,
  };
  if (isTextBoxEditEnabled && textBox && activePage === pageIndex) {
    const padding = textBox.boxPadding || 10;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height);

    // Drag handle
    const dragPointSize = 10;
    ctx.fillStyle = "dodgerblue";
    ctx.fillRect(
      textBox.x + textBox.width - dragPointSize,
      textBox.y + textBox.height - dragPointSize,
      dragPointSize,
      dragPointSize
    );

    
    // Text inside the box (top-anchored)
    ctx.fillStyle = "black";
    const boxFontSize = textBox.fontSize || fontSize;
    ctx.font = `${boxFontSize}px ${APP_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";


    const wrapped = wrapTextPreservingNewlinesResponsive(
      textBox.text,
      ctx,
      textBox.width,
      boxFontSize,
      padding
    );

    wrapped.lines.forEach((line, idx) => {
      ctx.fillText(line, textBox.x + padding, textBox.y + padding + idx * (boxFontSize + 4));
    });
}
}
