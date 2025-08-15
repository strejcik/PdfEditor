// src/utils/persistence/pagesStorage.ts
import type { Page } from "../../types/editor";

const KEY = "pages";

export function loadPages(): unknown | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePages(pages: Page[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pages));
  } catch {}
}

const emptyPage = (): Page => ({ textItems: [], imageItems: [] } as Page);

/** Ensure the stored data fits your Page[] shape (no id). */
export function normalizePages(input: unknown): Page[] {
  if (!Array.isArray(input)) {
    return [emptyPage()];
  }

  return (input as any[]).map((p) => ({
    textItems: Array.isArray(p?.textItems) ? p.textItems : [],
    imageItems: Array.isArray(p?.imageItems) ? p.imageItems : [],
  })) as Page[];
}