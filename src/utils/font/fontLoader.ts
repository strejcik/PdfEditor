let latoReadyPromise: Promise<void> | null = null;

export function loadLatoOnce(
  url: string = "../../public/fonts/Lato-Regular.ttf",
  family: string = "Lato",
  weight: string | number = "400",
  style: string = "normal"
): Promise<void> {
  if (latoReadyPromise) return latoReadyPromise; // ← memoized

  latoReadyPromise = (async () => {
    // If browser doesn't support the CSS Font Loading API, just bail once.
    if (!("fonts" in document)) return;

    // Already loaded? (fast path)
    if (document.fonts.check(`1em "${family}"`)) return;

    // Load via FontFace (works even if you also have @font-face in CSS)
    try {
      const face = new FontFace(
        family,
        `url("${url}") format("truetype")`,
        { weight: weight as string, style, display: "swap" as any }
      );
      const loaded = await face.load();
      document.fonts.add(loaded);

      // Wait until the browser considers all faces ready (first call only)
      await (document.fonts as any).ready;
    } catch (err) {
      console.warn(`[fonts] Failed to load ${family} from ${url}`, err);
    }
  })();

  return latoReadyPromise;
}