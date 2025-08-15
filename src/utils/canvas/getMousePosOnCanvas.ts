export type Point = { offsetX: number; offsetY: number };

export function getMousePosOnCanvas(
  e: MouseEvent | { clientX: number; clientY: number } | any,
  canvas: HTMLCanvasElement | null | undefined
): Point {
  if (!canvas) return { offsetX: 0, offsetY: 0 };

  const evt = (e?.nativeEvent ?? e) as { clientX: number; clientY: number };
  const rect = canvas.getBoundingClientRect();

  // CSS px -> internal canvas px (DPI/zoom aware)
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    offsetX: (evt.clientX - rect.left) * scaleX,
    offsetY: (evt.clientY - rect.top) * scaleY,
  };
}