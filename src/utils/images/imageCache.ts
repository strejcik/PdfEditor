class ImageCache {
  private loaded = new Map<string, CanvasImageSource>();
  private pending = new Map<string, Promise<CanvasImageSource>>();

  getSync(src: string) { return this.loaded.get(src); }

  async load(src: string): Promise<CanvasImageSource> {
    if (this.loaded.has(src)) return this.loaded.get(src)!;
    if (this.pending.has(src)) return this.pending.get(src)!;

    const p = (async () => {
      try {
        if (typeof createImageBitmap === "function") {
          const res = await fetch(src);
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          this.loaded.set(src, bmp);
          this.pending.delete(src);
          return bmp;
        }
      } catch {}
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        // el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = src;
      });
      this.loaded.set(src, img);
      this.pending.delete(src);
      return img;
    })();

    this.pending.set(src, p);
    return p;
  }
}
export const imageCache = new ImageCache();