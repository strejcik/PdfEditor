import { useMemo, useCallback } from 'react';
import type { ShapeItem } from '../types/shapes';
import type { TextItem, ImageItem } from '../types/editor';
import type { FormFieldItem } from '../types/formFields';
import type { AnnotationItem } from '../types/annotations';
import type { LayerItem, LayerType } from '../types/layers';
import { generateLayerName, DEFAULT_Z_INDEX } from '../types/layers';

interface UseLayersProps {
  // Element arrays
  textItems: TextItem[];
  shapeItems: ShapeItem[];
  imageItems: ImageItem[];
  formFields: FormFieldItem[];
  annotationItems: AnnotationItem[];

  // Setters for z-index updates
  setTextZIndex: (index: number, zIndex: number) => void;
  setShapeZIndex: (index: number, zIndex: number) => void;
  setImageZIndex: (index: number, zIndex: number) => void;
  setFormFieldZIndex: (index: number, zIndex: number) => void;
  setAnnotationZIndex: (index: number, zIndex: number) => void;

  // Visibility toggles
  toggleTextVisibility: (index: number) => void;
  toggleShapeVisibility: (index: number) => void;
  toggleImageVisibility: (index: number) => void;
  toggleFormFieldVisibility: (index: number) => void;
  toggleAnnotationVisibility: (index: number) => void;

  // Lock toggles
  toggleTextLock: (index: number) => void;
  toggleShapeLock: (index: number) => void;
  toggleImageLock: (index: number) => void;
  toggleFormFieldLock: (index: number) => void;
  toggleAnnotationLock: (index: number) => void;

  // Name updates
  updateTextName: (index: number, name: string) => void;
  updateShapeName: (index: number, name: string) => void;
  updateImageName: (index: number, name: string) => void;
  updateFormFieldName: (index: number, name: string) => void;
  updateAnnotationName: (index: number, name: string) => void;

  // Selection setters
  setSelectedTextIndex: (index: number | null) => void;
  setSelectedTextIndexes: (indexes: number[]) => void;
  setIsTextSelected: (selected: boolean) => void;
  setSelectedShapeIndex: (index: number | null) => void;
  setSelectedImageIndex: (index: number | null) => void;
  setSelectedFormFieldIndex: (index: number | null) => void;
  setSelectedAnnotationIndex: (index: number | null) => void;

  // Current selections
  selectedTextIndex: number | null;
  selectedShapeIndex: number | null;
  selectedImageIndex: number | null;
  selectedFormFieldIndex: number | null;
  selectedAnnotationIndex: number | null;

  // Current page
  activePage: number;
}

export function useLayers(props: UseLayersProps) {
  const {
    textItems,
    shapeItems,
    imageItems,
    formFields,
    annotationItems,
    setTextZIndex,
    setShapeZIndex,
    setImageZIndex,
    setFormFieldZIndex,
    setAnnotationZIndex,
    toggleTextVisibility,
    toggleShapeVisibility,
    toggleImageVisibility,
    toggleFormFieldVisibility,
    toggleAnnotationVisibility,
    toggleTextLock,
    toggleShapeLock,
    toggleImageLock,
    toggleFormFieldLock,
    toggleAnnotationLock,
    updateTextName,
    updateShapeName,
    updateImageName,
    updateFormFieldName,
    updateAnnotationName,
    setSelectedTextIndex,
    setSelectedTextIndexes,
    setIsTextSelected,
    setSelectedShapeIndex,
    setSelectedImageIndex,
    setSelectedFormFieldIndex,
    setSelectedAnnotationIndex,
    selectedTextIndex,
    selectedShapeIndex,
    selectedImageIndex,
    selectedFormFieldIndex,
    selectedAnnotationIndex,
    activePage,
  } = props;

  // Build unified layer list from all element types
  const layers = useMemo<LayerItem[]>(() => {
    const result: LayerItem[] = [];

    // Track type-specific indices for auto-naming
    let textTypeIndex = 0;
    let shapeTypeIndex = 0;
    let imageTypeIndex = 0;
    let formFieldTypeIndex = 0;
    let annotationTypeIndex = 0;

    // Add text items
    textItems.forEach((item, globalIndex) => {
      if (item.index === activePage) {
        result.push({
          id: `text-${globalIndex}`,
          type: 'text' as LayerType,
          globalIndex,
          pageIndex: item.index,
          zIndex: item.zIndex ?? DEFAULT_Z_INDEX.text,
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          name: item.name || generateLayerName('text', item, textTypeIndex),
          preview: (item.text || '').substring(0, 20),
          isSelected: selectedTextIndex === globalIndex,
        });
        textTypeIndex++;
      }
    });

    // Add shape items
    shapeItems.forEach((item, globalIndex) => {
      if (item.index === activePage) {
        result.push({
          id: `shape-${globalIndex}`,
          type: 'shape' as LayerType,
          globalIndex,
          pageIndex: item.index,
          zIndex: item.zIndex ?? DEFAULT_Z_INDEX.shape,
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          name: item.name || generateLayerName('shape', item, shapeTypeIndex),
          preview: item.type,
          isSelected: selectedShapeIndex === globalIndex,
        });
        shapeTypeIndex++;
      }
    });

    // Add image items
    imageItems.forEach((item, globalIndex) => {
      if (item.index === activePage) {
        result.push({
          id: `image-${globalIndex}`,
          type: 'image' as LayerType,
          globalIndex,
          pageIndex: item.index,
          zIndex: item.zIndex ?? DEFAULT_Z_INDEX.image,
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          name: item.name || generateLayerName('image', item, imageTypeIndex),
          isSelected: selectedImageIndex === globalIndex,
        });
        imageTypeIndex++;
      }
    });

    // Add form fields
    formFields.forEach((item, globalIndex) => {
      if (item.index === activePage) {
        result.push({
          id: `formField-${globalIndex}`,
          type: 'formField' as LayerType,
          globalIndex,
          pageIndex: item.index,
          zIndex: item.zIndex ?? DEFAULT_Z_INDEX.formField,
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          name: item.name || generateLayerName('formField', item, formFieldTypeIndex),
          preview: item.type,
          isSelected: selectedFormFieldIndex === globalIndex,
        });
        formFieldTypeIndex++;
      }
    });

    // Add annotations
    annotationItems.forEach((item, globalIndex) => {
      if (item.index === activePage) {
        result.push({
          id: `annotation-${globalIndex}`,
          type: 'annotation' as LayerType,
          globalIndex,
          pageIndex: item.index,
          zIndex: item.zIndex ?? DEFAULT_Z_INDEX.annotation,
          visible: item.visible ?? true,
          locked: item.locked ?? false,
          name: item.name || generateLayerName('annotation', item, annotationTypeIndex),
          preview: item.type,
          isSelected: selectedAnnotationIndex === globalIndex,
        });
        annotationTypeIndex++;
      }
    });

    // Sort by zIndex descending (top layer first in list)
    result.sort((a, b) => b.zIndex - a.zIndex);

    return result;
  }, [
    textItems, shapeItems, imageItems, formFields, annotationItems,
    activePage,
    selectedTextIndex, selectedShapeIndex, selectedImageIndex,
    selectedFormFieldIndex, selectedAnnotationIndex,
  ]);

  // Toggle visibility for a layer
  const toggleLayerVisibility = useCallback((layer: LayerItem) => {
    switch (layer.type) {
      case 'text':
        toggleTextVisibility(layer.globalIndex);
        break;
      case 'shape':
        toggleShapeVisibility(layer.globalIndex);
        break;
      case 'image':
        toggleImageVisibility(layer.globalIndex);
        break;
      case 'formField':
        toggleFormFieldVisibility(layer.globalIndex);
        break;
      case 'annotation':
        toggleAnnotationVisibility(layer.globalIndex);
        break;
    }
  }, [toggleTextVisibility, toggleShapeVisibility, toggleImageVisibility, toggleFormFieldVisibility, toggleAnnotationVisibility]);

  // Toggle lock for a layer
  const toggleLayerLock = useCallback((layer: LayerItem) => {
    switch (layer.type) {
      case 'text':
        toggleTextLock(layer.globalIndex);
        break;
      case 'shape':
        toggleShapeLock(layer.globalIndex);
        break;
      case 'image':
        toggleImageLock(layer.globalIndex);
        break;
      case 'formField':
        toggleFormFieldLock(layer.globalIndex);
        break;
      case 'annotation':
        toggleAnnotationLock(layer.globalIndex);
        break;
    }
  }, [toggleTextLock, toggleShapeLock, toggleImageLock, toggleFormFieldLock, toggleAnnotationLock]);

  // Update name for a layer
  const updateLayerName = useCallback((layer: LayerItem, newName: string) => {
    switch (layer.type) {
      case 'text':
        updateTextName(layer.globalIndex, newName);
        break;
      case 'shape':
        updateShapeName(layer.globalIndex, newName);
        break;
      case 'image':
        updateImageName(layer.globalIndex, newName);
        break;
      case 'formField':
        updateFormFieldName(layer.globalIndex, newName);
        break;
      case 'annotation':
        updateAnnotationName(layer.globalIndex, newName);
        break;
    }
  }, [updateTextName, updateShapeName, updateImageName, updateFormFieldName, updateAnnotationName]);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedTextIndex(null);
    setSelectedTextIndexes([]);
    setIsTextSelected(false);
    setSelectedShapeIndex(null);
    setSelectedImageIndex(null);
    setSelectedFormFieldIndex(null);
    setSelectedAnnotationIndex(null);
  }, [setSelectedTextIndex, setSelectedTextIndexes, setIsTextSelected, setSelectedShapeIndex, setSelectedImageIndex, setSelectedFormFieldIndex, setSelectedAnnotationIndex]);

  // Select a layer (clears other selections first)
  const selectLayer = useCallback((layer: LayerItem) => {
    clearAllSelections();

    switch (layer.type) {
      case 'text':
        setSelectedTextIndex(layer.globalIndex);
        setSelectedTextIndexes([layer.globalIndex]);
        setIsTextSelected(true);
        break;
      case 'shape':
        setSelectedShapeIndex(layer.globalIndex);
        break;
      case 'image':
        setSelectedImageIndex(layer.globalIndex);
        break;
      case 'formField':
        setSelectedFormFieldIndex(layer.globalIndex);
        break;
      case 'annotation':
        setSelectedAnnotationIndex(layer.globalIndex);
        break;
    }
  }, [clearAllSelections, setSelectedTextIndex, setSelectedTextIndexes, setIsTextSelected, setSelectedShapeIndex, setSelectedImageIndex, setSelectedFormFieldIndex, setSelectedAnnotationIndex]);

  // Reorder layers by drag-drop
  // fromIndex and toIndex are positions in the sorted layers array
  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Create a copy and reorder
    const reordered = [...layers];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Assign new z-indexes (highest first since list is top-to-bottom)
    // Use increments of 10 to allow for future insertions
    const maxZ = reordered.length * 10;

    reordered.forEach((layer, i) => {
      const newZIndex = maxZ - (i * 10);

      switch (layer.type) {
        case 'text':
          setTextZIndex(layer.globalIndex, newZIndex);
          break;
        case 'shape':
          setShapeZIndex(layer.globalIndex, newZIndex);
          break;
        case 'image':
          setImageZIndex(layer.globalIndex, newZIndex);
          break;
        case 'formField':
          setFormFieldZIndex(layer.globalIndex, newZIndex);
          break;
        case 'annotation':
          setAnnotationZIndex(layer.globalIndex, newZIndex);
          break;
      }
    });
  }, [layers, setTextZIndex, setShapeZIndex, setImageZIndex, setFormFieldZIndex, setAnnotationZIndex]);

  return {
    layers,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayerName,
    selectLayer,
    reorderLayers,
    clearAllSelections,
  };
}
