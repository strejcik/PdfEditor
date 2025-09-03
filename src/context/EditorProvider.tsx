import { createContext, useContext, PropsWithChildren, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import { useUiPanels } from "../hooks/useUiPanels";
import { useHistory } from "../hooks/useHistory";
import { usePages } from "../hooks/usePages";
import { useTextItems } from "../hooks/useTextItems";
import { useSelection } from "../hooks/useSelection";
import { useTextBox } from "../hooks/useTextBox";
import { useImages } from "../hooks/useImages";
import { usePdf } from "../hooks/usePdf";
import { useMultiLineMode } from '../hooks/useMultiLineMode';

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

  // Keep latest slices in refs so bound getters/setters always see fresh data
  const textRef = useRef(text);
  const imagesRef = useRef(images);
  const hydratedOnceRef = useRef(false);

  // Update refs every render
  useEffect(() => { textRef.current = text; imagesRef.current = images; }, [text, images]);

useEffect(() => {
  if (hydratedOnceRef.current) return;
  if (!pages.pages || pages.pages.length === 0) return;

  text.hydrateFromPages?.(pages.pages);
  images.hydrateFromPages?.(pages.pages);

  hydratedOnceRef.current = true;
}, [pages.pages]);

  // Bind ONCE before paint; functions read from refs → always up to date
  useLayoutEffect(() => {
    history.bindSources(
      () => textRef.current.textItems,
      () => imagesRef.current.imageItems,
      (next) => textRef.current.setTextItems(next),
      (next) => imagesRef.current.setImageItems(next)
    );
  }, [history]);

  const value = useMemo<EditorContextValue>(() => ({
    ui, history, pages, text, selection, textBox, images, pdf, multiline
  }), [ui, history, pages, text, selection, textBox, images, pdf, multiline]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}