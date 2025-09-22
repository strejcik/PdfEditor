import {
  createContext,
  useContext,
  PropsWithChildren,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";

import { useUiPanels } from "../hooks/useUiPanels";
import { useHistory } from "../hooks/useHistory";
import { usePages } from "../hooks/usePages";
import { useTextItems } from "../hooks/useTextItems";
import { useSelection } from "../hooks/useSelection";
import { useTextBox } from "../hooks/useTextBox";
import { useImages } from "../hooks/useImages";
import { usePdf } from "../hooks/usePdf";
import { useMultiLineMode } from "../hooks/useMultiLineMode";
import { useMouse } from '../hooks/useMouse';
import { useKeyboard } from '../hooks/useKeyboard';

type EditorContextValue = {
  ui: ReturnType<typeof useUiPanels>;
  history: ReturnType<typeof useHistory>;
  pages: ReturnType<typeof usePages>;
  text: ReturnType<typeof useTextItems>;
  selection: ReturnType<typeof useSelection>;
  textBox: ReturnType<typeof useTextBox>;
  images: ReturnType<typeof useImages>;
  pdf: ReturnType<typeof usePdf>;
  multiline: ReturnType<typeof useMultiLineMode>;
  mouse: ReturnType<typeof useMouse>;
  keyboard: ReturnType<typeof useKeyboard>;
};

const EditorContext = createContext<EditorContextValue | null>(null);
export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within <EditorProvider>");
  return ctx;
};

export function EditorProvider({ children }: PropsWithChildren) {
  const ui = useUiPanels();
  const pages = usePages();
  const text = useTextItems();
  const selection = useSelection();
  const textBox = useTextBox();
  const images = useImages();
  const pdf = usePdf();
  const multiline = useMultiLineMode();
  const history = useHistory();
  const mouse = useMouse();
  const keyboard = useKeyboard();

  // Keep latest slices in refs so history bindings always read current data
  const textRef = useRef(text);
  const imagesRef = useRef(images);
  useEffect(() => {
    textRef.current = text;
    imagesRef.current = images;
  }, [text, images]);

  /**
   * 🔁 Re-hydrate text & image stores EVERY TIME pages change.
   * This ensures all pages (not just the first) are reflected in item stores.
   * If your hydrateFromPages merges, you can keep using it; otherwise derive flat arrays.
   */
  
  
  useEffect(() => {
    const pageList = pages.pages ?? [];
    if (!Array.isArray(pageList) || pageList.length === 0) return;

    // Prefer explicit, side-effect-free derivation:
    const allText = pageList.flatMap((p) => p?.textItems ?? []);
    const allImages = pageList.flatMap((p) => p?.imageItems ?? []);

    // Set into item stores (replace with your setters if named differently)
    text.setTextItems?.(allText);
    images.setImageItems?.(allImages);

    // If you also keep counts/indices per page in those stores, update them here as well.
  }, [pages.pages, text.setTextItems, images.setImageItems]);

  /**
   * Bind history sources once; the getters pull from refs so they see fresh arrays.
   */
  useLayoutEffect(() => {
    history.bindSources(
      () => textRef.current.textItems,
      () => imagesRef.current.imageItems,
      (next) => textRef.current.setTextItems(next),
      (next) => imagesRef.current.setImageItems(next)
    );
  }, [history]);

  const value = useMemo<EditorContextValue>(
    () => ({
      ui,
      history,
      pages,
      text,
      selection,
      textBox,
      images,
      pdf,
      multiline,
      mouse,
      keyboard
    }),
    [ui, history, pages, text, selection, textBox, images, pdf, multiline, mouse, keyboard]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
