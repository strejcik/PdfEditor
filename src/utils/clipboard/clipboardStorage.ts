const CLIPBOARD_KEY = "clipboard";

export type ClipboardPayload = {
  ts: number;                           // timestamp for debugging
  items: Array<{
    kind: "text" | "image";
    data: any;                          // serialized item (textItem or imageItem)
  }>;
};

export function readClipboard(): ClipboardPayload | null {
  try {
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed as ClipboardPayload;
  } catch {
    return null;
  }
}

export function writeClipboard(payload: ClipboardPayload) {
  try {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
  } catch {}
}

export function clearClipboard() {
  try { localStorage.removeItem(CLIPBOARD_KEY); } catch {}
}
