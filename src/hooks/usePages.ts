import { useEffect, useRef, useState } from "react";
import type { Page } from "../types/editor";
import { loadPages, savePages, normalizePages } from "../utils/persistance/pagesStorage"
export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState(0);
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);

  // Load once on mount
  useEffect(() => {
    const stored = loadPages();
    if (stored) {
      const normalized = normalizePages(stored);
      setPages(normalized);
      setActivePage(0); // or keep last active page if you store it separately
    } else {
      setPages([{ textItems: [], imageItems: [] }]);
      setActivePage(0);
    }
  }, []);

  // Persist whenever pages change
  useEffect(() => {
    if (pages.length > 0) savePages(pages);
  }, [pages]);

  return { pages, setPages, activePage, setActivePage, canvasRefs };
}