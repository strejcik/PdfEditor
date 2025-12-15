/**
 * Check if a source string is an SVG data URI
 * @param src - Image source string
 * @returns True if the source is an SVG data URI
 */
export function isSvgDataUri(src: string | unknown): boolean {
  return typeof src === "string" && /^data:image\/svg\+xml/i.test(src);
}
