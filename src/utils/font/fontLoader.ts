// fonts/loadFontOnce.ts


// One cache for all fonts (keyed by family+weight+style+url)
const _fontPromises = new Map<string, Promise<void>>();

/**
 * Load a font exactly once (no React hooks involved).
 * Safe in SSR (no-op if document isn't available).
 */
export function loadFontOnce(
  {
    family = "Lato",
    url = "../../../public/fonts/Lato-Regular.ttf",
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

  const key = `${family}::${weight}::${style}::${url}::${format}`;
  const cached = _fontPromises.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      // Fast path: already available?
      // Using `check` avoids eagerly loading and is cheap.
      // Use a generic size (1em) and include weight/style in the check.
      const cssDesc = `${style} normal ${weight} 1em "${family}"`;
      // Some browsers accept `document.fonts.check(desc)`; others accept `check(size family)`.
      // We try both patterns safely.
      // @ts-ignore
      if (document.fonts.check?.(cssDesc) || document.fonts.check?.(`1em "${family}"`)) {
        return;
      }

      // Load via FontFace (no hooks, no React)
      if ("FontFace" in window) {
        const face = new FontFace(
          family,
          `url("${url}") format("${format}")`,
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
      console.warn(`[fonts] Failed to load "${family}" from ${url}:`, err);
    }
  })();

  _fontPromises.set(key, promise);
  return promise;
}

/** Backwards-compatible name if you still call ensureLatoLoadedOnce(...) */
export function ensureLatoLoadedOnce(
  family: string = "Lato",
  url: string = "../../../public/fonts/Lato-Regular.ttf",
  weight: string | number = "400",
  style: string = "normal"
): Promise<void> {
  return loadFontOnce({ family, url, weight, style, format: "truetype" });
}

/** Backwards-compatible name if you still call loadLatoOnce(...) */
export function loadLatoOnce(
  url: string = "../../../public/fonts/Lato-Regular.ttf",
  family: string = "Lato",
  weight: string | number = "400",
  style: string = "normal"
): Promise<void> {
  return loadFontOnce({ family, url, weight, style, format: "truetype" });
}
