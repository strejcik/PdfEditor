/**
 * Template Loader Utility
 * Loads templates into the editor state using the same logic as JSON import
 */

import type { TemplateData } from '../../types/templates';

export interface LoadTemplateOptions {
  setPages: (pages: any[]) => void;
  setTextItems: (items: any[]) => void;
  setImageItems: (items: any[]) => void;
  setShapeItems: (items: any[]) => void;
  setFormFields: (items: any[]) => void;
  setAnnotationItems: (items: any[]) => void;
  saveTextItemsToIndexedDB: (items: any[]) => Promise<void>;
  saveImageItemsToIndexedDB: (items: any[]) => Promise<void>;
  saveShapeItemsToIndexedDB: (items: any[]) => Promise<void>;
  saveFormFieldsToIndexedDB: (items: any[]) => Promise<void>;
  saveAnnotationsToIndexedDB: (items: any[]) => Promise<void>;
  savePagesToIndexedDB: (pages: any[]) => Promise<void>;
}

/**
 * Load a template into the editor
 * Uses the same logic as JSON import for consistency
 */
export async function loadTemplate(
  template: TemplateData,
  options: LoadTemplateOptions
): Promise<void> {
  const { content } = template;

  // Extract items from pages structure (same as importStateFromJson)
  let pages = content.pages || [];
  let textItems = content.textItems || [];
  let imageItems = content.imageItems || [];
  let shapeItems = content.shapeItems || [];
  let formFields = content.formFields || [];
  let annotationItems = content.annotationItems || [];

  // If items are embedded in pages, extract them with index
  if (pages.length > 0 && textItems.length === 0) {
    textItems = pages.flatMap((page: any, pageIndex: number) =>
      (page.textItems || []).map((item: any) => ({ ...item, index: pageIndex }))
    );
  }
  if (pages.length > 0 && imageItems.length === 0) {
    imageItems = pages.flatMap((page: any, pageIndex: number) =>
      (page.imageItems || []).map((item: any) => ({ ...item, index: pageIndex }))
    );
  }
  if (pages.length > 0 && shapeItems.length === 0) {
    shapeItems = pages.flatMap((page: any, pageIndex: number) =>
      (page.shapes || []).map((item: any) => ({ ...item, index: pageIndex }))
    );
  }
  if (pages.length > 0 && formFields.length === 0) {
    formFields = pages.flatMap((page: any, pageIndex: number) =>
      (page.formFields || []).map((item: any) => ({ ...item, index: pageIndex }))
    );
  }
  if (pages.length > 0 && annotationItems.length === 0) {
    annotationItems = pages.flatMap((page: any, pageIndex: number) =>
      (page.annotations || []).map((item: any) => ({ ...item, index: pageIndex }))
    );
  }

  // Ensure at least one page exists
  if (!pages.length) {
    pages = [{ textItems: [], imageItems: [], shapes: [], formFields: [], annotations: [] }];
  }

  // Save to IndexedDB
  await Promise.all([
    options.saveTextItemsToIndexedDB(textItems),
    options.saveImageItemsToIndexedDB(imageItems),
    options.saveShapeItemsToIndexedDB(shapeItems),
    options.saveFormFieldsToIndexedDB(formFields),
    options.saveAnnotationsToIndexedDB(annotationItems),
    options.savePagesToIndexedDB(pages),
  ]);

  // Update React state
  options.setPages(pages);
  options.setTextItems(textItems);
  options.setImageItems(imageItems);
  options.setShapeItems(shapeItems);
  options.setFormFields(formFields);
  options.setAnnotationItems(annotationItems);
}
