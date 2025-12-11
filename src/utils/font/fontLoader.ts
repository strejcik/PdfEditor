// fonts/loadFontOnce.ts

// One cache for all fonts (keyed by family+weight+style+url)
const _fontPromises = new Map<string, Promise<void>>();

const DEFAULT_FONT_PATH = "/fonts/Lato-Regular.ttf";

/**
 * Normalize any font URL so it works both in dev and in the built app.
 *
 * Handles cases like:
 *  - "../../../public/fonts/Lato-Regular.ttf"
 *  - "public/fonts/Lato-Regular.ttf"
 *  - "/public/fonts/Lato-Regular.ttf"
 *  - "fonts/Lato-Regular.ttf"
 *  - "/fonts/Lato-Regular.ttf"
 *  - absolute ("https://.../Lato.ttf")
 */
function resolveFontUrl(url?: string): string {
  // No URL provided -> use default
  if (!url) return DEFAULT_FONT_PATH;

  // Already absolute (http/https)
  if (/^https?:\/\//i.test(url)) return url;

  // Normalize slashes
  let cleaned = url.replace(/\\/g, "/").trim();

  // If it's already a root-relative /fonts/... just return it
  if (cleaned.startsWith("/fonts/")) return cleaned;

  // Strip leading ./ or ../ sequences like ./, ../, ../../, etc.
  cleaned = cleaned.replace(/^(\.{1,2}\/)+/, "");

  // If the path includes "public/", strip everything up to and including "public/"
  // e.g., "public/fonts/Lato.ttf" -> "fonts/Lato.ttf"
  //       "../public/fonts/Lato.ttf" (after previous step) -> "fonts/Lato.ttf"
  cleaned = cleaned.replace(/^public\//, "");
  cleaned = cleaned.replace(/^\/?public\//, "");

  // At this point, something like "fonts/Lato.ttf" or maybe "assets/fonts/Lato.ttf"
  // We assume Node serves your build root, so we just make it root-relative
  if (!cleaned.startsWith("/")) {
    cleaned = `/${cleaned}`;
  }

  return cleaned;
}

/**
 * Load a font exactly once (no React hooks involved).
 * Safe in SSR (no-op if document isn't available).
 */
export function loadFontOnce(
  {
    family = "Lato",
    url = DEFAULT_FONT_PATH,
    weight = "400",
    style = "normal",
    format = "truetype", // change to "woff2" if needed
  }: {
    family?: string;
    url?: string;
    weight?: string | number;
    style?: string;
    format?: "truetype" | "woff2" | "woff" | "opentype";
  } = {}
): Promise<void> {
  // SSR / non-browser guard
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.resolve();
  }

  // If browser doesn't support the CSS Font Loading API, bail (but resolve)
  if (!("fonts" in document)) {
    return Promise.resolve();
  }

  const resolvedUrl = resolveFontUrl(url);

  const key = `${family}::${weight}::${style}::${resolvedUrl}::${format}`;
  const cached = _fontPromises.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      // Fast path: already available?
      const cssDesc = `${style} normal ${weight} 1em "${family}"`;
      // @ts-ignore
      if (
        document.fonts.check?.(cssDesc) ||
        // @ts-ignore
        document.fonts.check?.(`1em "${family}"`)
      ) {
        return;
      }

      // Load via FontFace (no hooks, no React)
      if ("FontFace" in window) {
        const face = new FontFace(
          family,
          `url("${resolvedUrl}") format("${format}")`,
          { weight: String(weight), style }
        );
        const loaded = await face.load();
        document.fonts.add(loaded);
      }

      // Wait until the browser reports fonts ready (best-effort)
      // @ts-ignore
      if (document.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    } catch (err) {
      // Do not throw from a renderer utility; just warn and let canvas draw with fallback font.
      // eslint-disable-next-line no-console
      console.warn(`[fonts] Failed to load "${family}" from ${resolvedUrl}:`, err);
    }
  })();

  _fontPromises.set(key, promise);
  return promise;
}

/** Backwards-compatible name if you still call ensureLatoLoadedOnce(...) */
export function ensureLatoLoadedOnce(
  family: string = "Lato",
  url: string = DEFAULT_FONT_PATH,
  weight: string | number = "400",
  style: string = "normal"
): Promise<void> {
  // NOTE: we still accept the old `url` arg, but normalize it so
  // "../../../public/fonts/..." will resolve to "/fonts/..."
  return loadFontOnce({ family, url, weight, style, format: "truetype" });
}

/** Backwards-compatible name if you still call loadLatoOnce(...) */
export function loadLatoOnce(
  url: string = DEFAULT_FONT_PATH,
  family: string = "Lato",
  weight: string | number = "400",
  style: string = "normal"
): Promise<void> {
  // Same as above: `url` is normalized inside loadFontOnce
  return loadFontOnce({ family, url, weight, style, format: "truetype" });
}
