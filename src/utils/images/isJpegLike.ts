/**
 * Check if a source string is a JPEG image (data URI or URL)
 * @param src - Image source string (data URI or URL)
 * @returns True if the source is JPEG-like
 */
export function isJpegLike(src: string | unknown): boolean {
  return typeof src === "string" && (/^data:image\/jpe?g/i.test(src) || /\.jpe?g(\?.*)?$/i.test(src));
}
