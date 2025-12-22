import { useState } from "react";
import type { AnnotationItem, AnnotationType, TextSpan } from "../types/annotations";
import { ANNOTATION_DEFAULTS } from "../types/annotations";
import type { TextItem } from "../types/editor";

export function useAnnotations() {
  // Core state
  const [annotationItems, setAnnotationItems] = useState<AnnotationItem[]>([]);
  const [selectedAnnotationIndex, setSelectedAnnotationIndex] = useState<number | null>(null);
  const [selectedAnnotationIndexes, setSelectedAnnotationIndexes] = useState<number[]>([]);

  // Tool state
  const [activeAnnotationTool, setActiveAnnotationToolRaw] = useState<AnnotationType | null>(null);
  const [annotationColor, setAnnotationColor] = useState<string>('#FFFF00');
  const [annotationOpacity, setAnnotationOpacity] = useState<number>(0.4);

  // Text selection state for annotation creation
  const [isSelectingText, setIsSelectingText] = useState(false);
  const [textSelectionStart, setTextSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [textSelectionEnd, setTextSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectedTextSpans, setSelectedTextSpans] = useState<TextSpan[]>([]);

  // PDF text spans extracted from the document
  const [pdfTextSpans, setPdfTextSpans] = useState<TextSpan[]>([]);

  // Linking option - when enabled, new annotations are linked to text items
  const [linkToTextItem, setLinkToTextItem] = useState<boolean>(false);

  // Generate unique ID
  const generateId = (): string => {
    return `annotation_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  };

  // Generate unique ID for text items (if they don't have one)
  const generateTextItemId = (): string => {
    return `textItem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  };

  /**
   * Find text item that matches the given spans
   * First tries position overlap, then falls back to text content matching
   * Returns the text item if found, null otherwise
   */
  const findOverlappingTextItem = (
    spans: TextSpan[],
    textItems: TextItem[],
    pageIndex: number
  ): TextItem | null => {
    if (!spans.length || !textItems.length) return null;

    const pageTextItems = textItems.filter(t => t.index === pageIndex);
    if (pageTextItems.length === 0) return null;

    // Get bounding box of all spans
    const minX = Math.min(...spans.map(s => s.xNorm));
    const minY = Math.min(...spans.map(s => s.yNormTop));
    const maxX = Math.max(...spans.map(s => s.xNorm + s.widthNorm));
    const maxY = Math.max(...spans.map(s => s.yNormTop + s.heightNorm));

    // First, try to find text item that overlaps with this bounding box
    for (const textItem of pageTextItems) {
      const itemX = textItem.xNorm;
      const itemY = textItem.yNormTop;
      const itemW = textItem.widthNorm || 0.1; // fallback width
      const itemH = textItem.heightNorm || 0.05; // fallback height

      // Check AABB intersection
      const overlaps = (
        itemX < maxX &&
        itemX + itemW > minX &&
        itemY < maxY &&
        itemY + itemH > minY
      );

      if (overlaps) {
        return textItem;
      }
    }

    // If no position overlap (textItem may have moved), try matching by text content
    const spanText = spans.map(s => s.text).join('').trim().toLowerCase();
    if (spanText) {
      for (const textItem of pageTextItems) {
        const itemText = (textItem.text || '').trim().toLowerCase();
        // Check if textItem contains the span text or vice versa
        if (itemText && (itemText.includes(spanText) || spanText.includes(itemText))) {
          return textItem;
        }
      }
    }

    // Last resort: if only one textItem on page, use it
    if (pageTextItems.length === 1) {
      return pageTextItems[0];
    }

    return null;
  };

  // Set active tool with automatic defaults
  const setActiveAnnotationTool = (tool: AnnotationType | null) => {
    setActiveAnnotationToolRaw(tool);
    if (tool) {
      const defaults = ANNOTATION_DEFAULTS[tool];
      setAnnotationColor(defaults.color);
      setAnnotationOpacity(defaults.opacity);
    }
    // Clear any text selection when switching tools
    setSelectedTextSpans([]);
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
    setIsSelectingText(false);
  };

  /**
   * Add annotation from selected text spans
   * If linkToTextItem is enabled and textItems are provided, the annotation will be linked
   * to the overlapping text item and store relative offsets
   */
  const addAnnotation = (
    spans: TextSpan[],
    pageIndex: number,
    color?: string,
    opacity?: number,
    textItems?: TextItem[],
    ensureTextItemId?: (textItem: TextItem) => string
  ): AnnotationItem | null => {
    if (!activeAnnotationTool || spans.length === 0) return null;

    const defaults = ANNOTATION_DEFAULTS[activeAnnotationTool];

    let linkedTextItemId: string | undefined;
    let linkedTextItem: TextItem | null = null;

    // If linking is enabled and textItems are provided, find overlapping text item
    if (linkToTextItem && textItems && textItems.length > 0) {
      linkedTextItem = findOverlappingTextItem(spans, textItems, pageIndex);
      if (linkedTextItem) {
        // Ensure the text item has an ID
        if (!linkedTextItem.id && ensureTextItemId) {
          linkedTextItem.id = ensureTextItemId(linkedTextItem);
        }
        linkedTextItemId = linkedTextItem.id;
      }
    }

    // When linking to a textItem, we need to position the annotation at the textItem's
    // current position, not the original pdfTextSpans position (in case textItem has moved)
    const firstSpan = spans[0];

    const newAnnotation: AnnotationItem = {
      id: generateId(),
      type: activeAnnotationTool,
      spans: spans.map((s, spanIndex) => {
        // Calculate internal offset within the annotation (relative to first span)
        const internalOffsetX = firstSpan ? s.xNorm - firstSpan.xNorm : 0;
        const internalOffsetY = firstSpan ? s.yNormTop - firstSpan.yNormTop : 0;

        // If linked to a text item, position annotation at textItem's location
        if (linkedTextItem && linkedTextItemId) {
          return {
            // Position at textItem's location + internal offset
            xNorm: linkedTextItem.xNorm + internalOffsetX,
            yNormTop: linkedTextItem.yNormTop + internalOffsetY,
            widthNorm: s.widthNorm,
            heightNorm: s.heightNorm,
            // Include text and fontSize for accurate visual positioning via measureText
            text: s.text,
            fontSize: s.fontSize,
            // Include font metrics if available for accurate annotation positioning
            ...(s.ascentRatio !== undefined && { ascentRatio: s.ascentRatio }),
            ...(s.descentRatio !== undefined && { descentRatio: s.descentRatio }),
            // Store relative offsets from textItem
            relativeXNorm: internalOffsetX,
            relativeYNorm: internalOffsetY,
          };
        }

        // Not linked - use original span positions
        return {
          xNorm: s.xNorm,
          yNormTop: s.yNormTop,
          widthNorm: s.widthNorm,
          heightNorm: s.heightNorm,
          // Include text and fontSize for accurate visual positioning via measureText
          text: s.text,
          fontSize: s.fontSize,
          // Include font metrics if available for accurate annotation positioning
          ...(s.ascentRatio !== undefined && { ascentRatio: s.ascentRatio }),
          ...(s.descentRatio !== undefined && { descentRatio: s.descentRatio }),
        };
      }),
      color: color || annotationColor || defaults.color,
      opacity: opacity ?? annotationOpacity ?? defaults.opacity,
      index: pageIndex,
      annotatedText: spans.map(s => s.text).join(' '),
      linkedTextItemId,
    };

    setAnnotationItems(prev => [...prev, newAnnotation]);
    return newAnnotation;
  };

  // Add annotation directly (for programmatic creation)
  const addAnnotationDirect = (annotation: AnnotationItem) => {
    setAnnotationItems(prev => [...prev, annotation]);
  };

  // Update an annotation by index
  const updateAnnotation = (index: number, updates: Partial<AnnotationItem>) => {
    setAnnotationItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Delete an annotation by index
  const deleteAnnotation = (index: number) => {
    setAnnotationItems(prev => prev.filter((_, i) => i !== index));
    setSelectedAnnotationIndex(null);
  };

  // Delete selected annotation (single)
  const deleteSelectedAnnotation = () => {
    if (selectedAnnotationIndex !== null) {
      setAnnotationItems(prev => prev.filter((_, i) => i !== selectedAnnotationIndex));
      setSelectedAnnotationIndex(null);
    }
  };

  // Delete multiple selected annotations
  const deleteSelectedAnnotations = () => {
    if (selectedAnnotationIndexes.length > 0) {
      setAnnotationItems(prev =>
        prev.filter((_, i) => !selectedAnnotationIndexes.includes(i))
      );
      setSelectedAnnotationIndexes([]);
      setSelectedAnnotationIndex(null);
    } else if (selectedAnnotationIndex !== null) {
      deleteSelectedAnnotation();
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAnnotationIndex(null);
    setSelectedAnnotationIndexes([]);
  };

  // Start text selection
  const startTextSelection = (x: number, y: number) => {
    setIsSelectingText(true);
    setTextSelectionStart({ x, y });
    setTextSelectionEnd({ x, y });
    setSelectedTextSpans([]);
  };

  // Update text selection - find intersecting text spans
  const updateTextSelection = (
    x: number,
    y: number,
    pdfTextSpans: TextSpan[],
    canvasWidth: number,
    canvasHeight: number,
    pageIndex: number
  ) => {
    setTextSelectionEnd({ x, y });

    if (!textSelectionStart) return;

    // Build selection rectangle (normalize to handle any drag direction)
    const selRect = {
      x: Math.min(textSelectionStart.x, x),
      y: Math.min(textSelectionStart.y, y),
      width: Math.abs(x - textSelectionStart.x),
      height: Math.abs(y - textSelectionStart.y),
    };

    // Find text spans that intersect with selection rectangle
    const selected = pdfTextSpans.filter(span => {
      if (span.index !== pageIndex) return false;

      // Convert normalized coords to pixel coords
      const spanX = span.xNorm * canvasWidth;
      const spanY = span.yNormTop * canvasHeight;
      const spanW = span.widthNorm * canvasWidth;
      const spanH = span.heightNorm * canvasHeight;

      // Check AABB intersection
      return (
        spanX < selRect.x + selRect.width &&
        spanX + spanW > selRect.x &&
        spanY < selRect.y + selRect.height &&
        spanY + spanH > selRect.y
      );
    });

    setSelectedTextSpans(selected);
  };

  // Finish text selection and create annotation
  // textItems and ensureTextItemId are optional - only needed if linkToTextItem is enabled
  const finishTextSelection = (
    pageIndex: number,
    textItems?: TextItem[],
    ensureTextItemId?: (textItem: TextItem) => string
  ): AnnotationItem | null => {
    if (selectedTextSpans.length === 0 || !activeAnnotationTool) {
      cancelTextSelection();
      return null;
    }

    const annotation = addAnnotation(
      selectedTextSpans,
      pageIndex,
      undefined, // color - use default
      undefined, // opacity - use default
      textItems,
      ensureTextItemId
    );

    // Reset selection state but keep tool active for quick subsequent annotations
    setIsSelectingText(false);
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
    setSelectedTextSpans([]);

    return annotation;
  };

  // Cancel text selection
  const cancelTextSelection = () => {
    setIsSelectingText(false);
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
    setSelectedTextSpans([]);
  };

  // Hydrate from pages (for JSON import / page loading)
  const hydrateFromPages = (pages: any[]) => {
    const allAnnotations: AnnotationItem[] = [];
    pages.forEach((page, pageIndex) => {
      if (page.annotations && Array.isArray(page.annotations)) {
        page.annotations.forEach((annotation: any) => {
          allAnnotations.push({
            ...annotation,
            index: pageIndex,
          });
        });
      }
    });
    setAnnotationItems(allAnnotations);
  };

  /**
   * Link an existing annotation to a text item
   * Moves the annotation to the text item's position and stores relative offsets
   */
  const linkAnnotationToTextItem = (
    annotationIndex: number,
    textItem: TextItem,
    ensureTextItemId?: (textItem: TextItem) => string
  ) => {
    setAnnotationItems(prev => prev.map((item, i) => {
      if (i !== annotationIndex) return item;

      // Ensure the text item has an ID
      let textItemId = textItem.id;
      if (!textItemId && ensureTextItemId) {
        textItemId = ensureTextItemId(textItem);
      }
      if (!textItemId) return item; // Can't link without ID

      // When linking/re-linking, move the annotation to the textItem's position
      // Calculate the offset of each span relative to the first span (to preserve annotation structure)
      const firstSpan = item.spans[0];
      const updatedSpans = item.spans.map(span => {
        // Calculate span's offset within the annotation (relative to first span)
        const internalOffsetX = firstSpan ? span.xNorm - firstSpan.xNorm : 0;
        const internalOffsetY = firstSpan ? span.yNormTop - firstSpan.yNormTop : 0;

        return {
          ...span,
          // Move absolute position to textItem's location + internal offset
          xNorm: textItem.xNorm + internalOffsetX,
          yNormTop: textItem.yNormTop + internalOffsetY,
          // Store relative offsets from textItem (same as internal offsets since we're positioning at textItem)
          relativeXNorm: internalOffsetX,
          relativeYNorm: internalOffsetY,
        };
      });

      // Clear lastLinkedTextItemId since we're now linked
      const { lastLinkedTextItemId, ...restItem } = item;
      return {
        ...restItem,
        spans: updatedSpans,
        linkedTextItemId: textItemId,
      };
    }));
  };

  /**
   * Unlink an annotation from its text item
   * The annotation will keep its current absolute position (calculated from textItem + relative offsets)
   * Stores the linkedTextItemId as lastLinkedTextItemId for potential re-linking
   * @param annotationIndex - Index of the annotation to unlink
   * @param textItems - Array of text items to find the linked text item
   */
  const unlinkAnnotation = (annotationIndex: number, textItems?: TextItem[]) => {
    setAnnotationItems(prev => prev.map((item, i) => {
      if (i !== annotationIndex) return item;

      // Find the linked text item to calculate current absolute position
      const linkedTextItem = textItems?.find(t => t.id === item.linkedTextItemId);

      // Update spans with calculated absolute positions
      const updatedSpans = item.spans.map(span => {
        const { relativeXNorm, relativeYNorm, ...rest } = span;

        // If we have the linked text item and relative offsets, calculate new absolute position
        if (linkedTextItem && relativeXNorm !== undefined && relativeYNorm !== undefined) {
          return {
            ...rest,
            // Update absolute coordinates to current position (textItem pos + relative offset)
            xNorm: linkedTextItem.xNorm + relativeXNorm,
            yNormTop: linkedTextItem.yNormTop + relativeYNorm,
          };
        }

        // No linked text item found or no relative offsets - keep existing absolute coords
        return rest;
      });

      // Store the current linkedTextItemId as lastLinkedTextItemId for re-linking
      const { linkedTextItemId, ...rest } = item;
      return {
        ...rest,
        spans: updatedSpans,
        lastLinkedTextItemId: linkedTextItemId, // Remember original textItem for re-linking
      };
    }));
  };

  /**
   * Check if an annotation is linked to a text item
   */
  const isAnnotationLinked = (annotationIndex: number): boolean => {
    const annotation = annotationItems[annotationIndex];
    return annotation?.linkedTextItemId !== undefined;
  };

  /**
   * Get the linked text item ID for an annotation
   */
  const getLinkedTextItemId = (annotationIndex: number): string | undefined => {
    return annotationItems[annotationIndex]?.linkedTextItemId;
  };

  return {
    // Core state
    annotationItems,
    setAnnotationItems,
    selectedAnnotationIndex,
    setSelectedAnnotationIndex,
    selectedAnnotationIndexes,
    setSelectedAnnotationIndexes,

    // Tool state
    activeAnnotationTool,
    setActiveAnnotationTool,
    annotationColor,
    setAnnotationColor,
    annotationOpacity,
    setAnnotationOpacity,

    // Text selection state
    isSelectingText,
    setIsSelectingText,
    textSelectionStart,
    setTextSelectionStart,
    textSelectionEnd,
    setTextSelectionEnd,
    selectedTextSpans,
    setSelectedTextSpans,

    // PDF text spans
    pdfTextSpans,
    setPdfTextSpans,

    // Linking state
    linkToTextItem,
    setLinkToTextItem,

    // Actions
    addAnnotation,
    addAnnotationDirect,
    updateAnnotation,
    deleteAnnotation,
    deleteSelectedAnnotation,
    deleteSelectedAnnotations,
    clearSelection,

    // Text selection
    startTextSelection,
    updateTextSelection,
    finishTextSelection,
    cancelTextSelection,

    // Linking actions
    linkAnnotationToTextItem,
    unlinkAnnotation,
    isAnnotationLinked,
    getLinkedTextItemId,
    generateTextItemId,

    // Hydration
    hydrateFromPages,
  };
}
