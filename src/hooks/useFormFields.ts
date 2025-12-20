import { useState } from "react";
import type { FormFieldItem, FormFieldType } from "../types/formFields";
import { FORM_FIELD_DEFAULTS, FORM_FIELD_STYLE_DEFAULTS } from "../types/formFields";

export function useFormFields() {
  // Core state
  const [formFields, setFormFields] = useState<FormFieldItem[]>([]);
  const [selectedFormFieldIndex, setSelectedFormFieldIndex] = useState<number | null>(null);

  // Interaction state
  const [isDraggingFormField, setIsDraggingFormField] = useState(false);
  const [isResizingFormField, setIsResizingFormField] = useState(false);
  const [isCreatingFormField, setIsCreatingFormField] = useState(false);
  const [activeFormFieldTool, setActiveFormFieldTool] = useState<FormFieldType | null>(null);
  const [formFieldCreationStart, setFormFieldCreationStart] = useState<{ x: number; y: number } | null>(null);
  const [formFieldCreationCurrent, setFormFieldCreationCurrent] = useState<{ x: number; y: number } | null>(null);

  // Drag state
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialField, setInitialField] = useState<FormFieldItem | null>(null);

  // Resize state
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

  // Add a new form field
  const addFormField = (field: FormFieldItem) => {
    setFormFields((prev) => [...prev, field]);
  };

  // Update a form field by index
  const updateFormField = (index: number, updates: Partial<FormFieldItem>) => {
    setFormFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Delete a form field
  const deleteFormField = (index: number) => {
    setFormFields((prev) => prev.filter((_, i) => i !== index));
    setSelectedFormFieldIndex(null);
  };

  // Delete selected form field
  const deleteSelectedFormField = () => {
    if (selectedFormFieldIndex !== null) {
      setFormFields((prev) => prev.filter((_, i) => i !== selectedFormFieldIndex));
      setSelectedFormFieldIndex(null);
    }
  };

  // Generate unique field name
  const generateFieldName = (type: FormFieldType): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6);
    return `${type}_${timestamp}_${random}`;
  };

  // Start creating a form field
  const startCreatingFormField = (x: number, y: number) => {
    setIsCreatingFormField(true);
    setFormFieldCreationStart({ x, y });
    setFormFieldCreationCurrent({ x, y });
  };

  // Update form field creation
  const updateFormFieldCreation = (x: number, y: number) => {
    setFormFieldCreationCurrent({ x, y });
  };

  // Finish creating form field
  const finishCreatingFormField = (
    pageIndex: number,
    canvasWidth: number,
    canvasHeight: number
  ): FormFieldItem | null => {
    if (!formFieldCreationStart || !formFieldCreationCurrent || !activeFormFieldTool) {
      setIsCreatingFormField(false);
      setFormFieldCreationStart(null);
      setFormFieldCreationCurrent(null);
      return null;
    }

    const x1 = Math.min(formFieldCreationStart.x, formFieldCreationCurrent.x);
    const y1 = Math.min(formFieldCreationStart.y, formFieldCreationCurrent.y);
    const x2 = Math.max(formFieldCreationStart.x, formFieldCreationCurrent.x);
    const y2 = Math.max(formFieldCreationStart.y, formFieldCreationCurrent.y);

    let width = x2 - x1;
    let height = y2 - y1;

    // Get default sizes for the field type
    const defaults = FORM_FIELD_DEFAULTS[activeFormFieldTool];

    // Use minimum defaults if dragged area is too small
    if (width < defaults.width / 2 || height < defaults.height / 2) {
      width = defaults.width;
      height = defaults.height;
    }

    // For checkboxes and radios, enforce square aspect ratio
    if (activeFormFieldTool === 'checkbox' || activeFormFieldTool === 'radio') {
      const size = Math.max(width, height, defaults.width);
      width = size;
      height = size;
    }

    const newField: FormFieldItem = {
      type: activeFormFieldTool,
      x: x1,
      y: y1,
      width,
      height,
      xNorm: x1 / canvasWidth,
      yNormTop: y1 / canvasHeight,
      widthNorm: width / canvasWidth,
      heightNorm: height / canvasHeight,
      fieldName: generateFieldName(activeFormFieldTool),
      placeholder: activeFormFieldTool === 'textInput' ? 'Enter text...' :
                   activeFormFieldTool === 'textarea' ? 'Enter your message...' : undefined,
      options: activeFormFieldTool === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] :
               activeFormFieldTool === 'radio' ? ['Option 1'] : undefined,
      groupName: activeFormFieldTool === 'radio' ? `radioGroup_${Date.now()}` : undefined,
      required: false,
      ...FORM_FIELD_STYLE_DEFAULTS,
      index: pageIndex,
    };

    setFormFields((prev) => [...prev, newField]);
    setIsCreatingFormField(false);
    setFormFieldCreationStart(null);
    setFormFieldCreationCurrent(null);
    setActiveFormFieldTool(null);

    return newField;
  };

  // Cancel form field creation
  const cancelFormFieldCreation = () => {
    setIsCreatingFormField(false);
    setFormFieldCreationStart(null);
    setFormFieldCreationCurrent(null);
    setActiveFormFieldTool(null);
  };

  // Hydrate from pages (for JSON import)
  const hydrateFromPages = (pages: any[]) => {
    const allFields: FormFieldItem[] = [];
    pages.forEach((page, pageIndex) => {
      if (page.formFields && Array.isArray(page.formFields)) {
        page.formFields.forEach((field: any) => {
          allFields.push({
            ...field,
            index: pageIndex,
          });
        });
      }
    });
    setFormFields(allFields);
  };

  return {
    // State
    formFields,
    setFormFields,
    selectedFormFieldIndex,
    setSelectedFormFieldIndex,
    isDraggingFormField,
    setIsDraggingFormField,
    isResizingFormField,
    setIsResizingFormField,
    isCreatingFormField,
    activeFormFieldTool,
    setActiveFormFieldTool,
    formFieldCreationStart,
    formFieldCreationCurrent,

    // Drag state
    dragStart,
    setDragStart,
    initialField,
    setInitialField,

    // Resize state
    resizeStart,
    setResizeStart,
    resizeHandle,
    setResizeHandle,
    initialSize,
    setInitialSize,

    // Actions
    addFormField,
    updateFormField,
    deleteFormField,
    deleteSelectedFormField,
    generateFieldName,

    // Creation
    startCreatingFormField,
    updateFormFieldCreation,
    finishCreatingFormField,
    cancelFormFieldCreation,

    // Hydration
    hydrateFromPages,
  };
}
