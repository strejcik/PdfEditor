/**
 * Loads an ArrayBuffer from a URL or data URI
 * Supports both http(s) URLs and data URIs (including base64)
 */
export async function loadArrayBuffer(urlOrDataUri: string): Promise<ArrayBuffer> {
  if (typeof urlOrDataUri !== "string") throw new Error("Invalid src");

  if (urlOrDataUri.startsWith("data:")) {
    // Generic data: URI decode (non-SVG). svg is handled elsewhere.
    const m = urlOrDataUri.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) {
      // try non-base64 data URIs
      const comma = urlOrDataUri.indexOf(",");
      const raw = decodeURIComponent(urlOrDataUri.slice(comma + 1));
      const encoder = new TextEncoder();
      return encoder.encode(raw).buffer;
    }
    const b64 = m[2];
    const binStr = atob(b64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
    return bytes.buffer;
  }

  const res = await fetch(urlOrDataUri, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to fetch: ${urlOrDataUri}`);
  return await res.arrayBuffer();
}
