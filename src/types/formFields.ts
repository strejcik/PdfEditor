export type FormFieldType = 'textInput' | 'textarea' | 'checkbox' | 'radio' | 'dropdown';

export interface FormFieldItem {
  // Type
  type: FormFieldType;

  // Pixel coordinates (runtime)
  x: number;
  y: number;
  width: number;
  height: number;

  // Normalized coordinates (0-1, persisted)
  xNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;

  // Form field properties
  fieldName: string;           // Unique field identifier
  label?: string;              // Display label
  placeholder?: string;        // For text inputs
  defaultValue?: string;       // Initial value
  required?: boolean;          // Validation flag

  // For radio/dropdown
  options?: string[];          // Available options
  groupName?: string;          // Radio group identifier

  // Styling
  fontSize: number;
  fontFamily?: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;

  // Page association
  index: number;

  // Z-index for layering (higher = in front)
  zIndex?: number;          // default: 100 (above content)

  // Layer panel properties
  visible?: boolean;        // default: true - whether element is drawn
  locked?: boolean;         // default: false - whether element can be edited
  name?: string;            // custom name for layer panel
}

export interface FormFieldState {
  formFields: FormFieldItem[];
  selectedFormFieldIndex: number | null;
  isDraggingFormField: boolean;
  isResizingFormField: boolean;
  isCreatingFormField: boolean;
  activeFormFieldTool: FormFieldType | null;
  formFieldCreationStart: { x: number; y: number } | null;
  formFieldCreationCurrent: { x: number; y: number } | null;
}

// Default sizes for different field types
export const FORM_FIELD_DEFAULTS = {
  textInput: { width: 200, height: 30 },
  textarea: { width: 300, height: 100 },  // Multi-line text area
  checkbox: { width: 20, height: 20 },
  radio: { width: 20, height: 20 },
  dropdown: { width: 200, height: 30 },
} as const;

// Default styling
export const FORM_FIELD_STYLE_DEFAULTS = {
  fontSize: 14,
  fontFamily: 'Arial',
  textColor: '#000000',
  backgroundColor: '#ffffff',
  borderColor: '#374151',
  borderWidth: 1,
} as const;
