/**
 * Form-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for form layouts
 */

import type { FormInputData, FormStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface FormSectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number;
}

export interface FormLayoutSpec {
  header: { yStart: number; yEnd: number };
  fields: { yStart: number; yEnd: number };
  footer: { yStart: number; yEnd: number };
  sectionBounds: FormSectionBounds[];
  primaryColor: string;
  fieldBgColor: string;
  fieldBorderColor: string;
}

export const FORM_LAYOUT_SPECS: Record<FormStyle, FormLayoutSpec> = {
  contact: {
    header: { yStart: 0.03, yEnd: 0.18 },
    fields: { yStart: 0.20, yEnd: 0.88 },
    footer: { yStart: 0.90, yEnd: 0.97 },
    primaryColor: '#3b82f6',
    fieldBgColor: '#f9fafb',
    fieldBorderColor: '#d1d5db',
    sectionBounds: [
      { name: 'header', xStart: 0.05, xEnd: 0.95, yStart: 0.03, yEnd: 0.18, textColor: '#1e293b', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'fields', xStart: 0.05, xEnd: 0.95, yStart: 0.20, yEnd: 0.88, textColor: '#374151', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.90, yEnd: 0.97, textColor: '#9ca3af', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
  registration: {
    header: { yStart: 0.03, yEnd: 0.15 },
    fields: { yStart: 0.17, yEnd: 0.85 },
    footer: { yStart: 0.88, yEnd: 0.97 },
    primaryColor: '#10b981',
    fieldBgColor: '#f0fdf4',
    fieldBorderColor: '#86efac',
    sectionBounds: [
      { name: 'header', xStart: 0.05, xEnd: 0.95, yStart: 0.03, yEnd: 0.15, textColor: '#064e3b', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'fields', xStart: 0.05, xEnd: 0.95, yStart: 0.17, yEnd: 0.85, textColor: '#374151', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.88, yEnd: 0.97, textColor: '#6b7280', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
  feedback: {
    header: { yStart: 0.03, yEnd: 0.16 },
    fields: { yStart: 0.18, yEnd: 0.86 },
    footer: { yStart: 0.89, yEnd: 0.97 },
    primaryColor: '#f59e0b',
    fieldBgColor: '#fffbeb',
    fieldBorderColor: '#fcd34d',
    sectionBounds: [
      { name: 'header', xStart: 0.05, xEnd: 0.95, yStart: 0.03, yEnd: 0.16, textColor: '#78350f', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'fields', xStart: 0.05, xEnd: 0.95, yStart: 0.18, yEnd: 0.86, textColor: '#374151', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.89, yEnd: 0.97, textColor: '#9ca3af', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
};

// ============================================================================
// System Prompt for Form Generation
// ============================================================================

export function buildFormSystemPrompt(style: FormStyle, definition: GenericAITemplateDefinition): string {
  const layout = FORM_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a form layout generator for a PDF editor. Generate JSON output with textItems, shapes, and form field placeholders.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width x ${CANVAS_HEIGHT}px height (A4 page ratio)
- Coordinates are NORMALIZED (0.0 to 1.0):
  - xNorm=0.0 is left edge, xNorm=1.0 is right edge
  - yNormTop=0.0 is top edge, yNormTop=1.0 is bottom edge

## Z-INDEX LAYERING SYSTEM
Every textItem and shape MUST have a zIndex property.

Z-INDEX GUIDELINES:
- Field background rectangles: zIndex: 0
- Separator lines: zIndex: 3
- Field labels: zIndex: 10
- Header text: zIndex: 15
- Required asterisks: zIndex: 12

## FORM SECTIONS WITH BOUNDARIES
${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

## EVEN DISTRIBUTION PRINCIPLE
Form fields are distributed evenly within the available space:
1. Calculate total available height for fields
2. Divide by number of fields to get height per field
3. Each field consists of: Label + Input area with consistent spacing

## LAYOUT SPECIFICATIONS

### HEADER SECTION (Y: ${layout.header.yStart} to ${layout.header.yEnd})
- Company name: Medium font (${typography.headingSize}px), color: ${colorScheme.textDark}
- Form title: Large font (${typography.titleSize}px), color: ${layout.primaryColor}
- Description: Small font (${typography.bodySize}px), color: #64748b

### FIELDS SECTION (Y: ${layout.fields.yStart} to ${layout.fields.yEnd})
For each form field:
- Field label: font ${typography.bodySize}px, color: #374151
- Required asterisk (*): color: #dc2626 (red), placed after label
- Input field rectangle:
  - Height: 0.045 normalized
  - Background: ${layout.fieldBgColor}
  - Border: ${layout.fieldBorderColor}
  - Placeholder text inside (optional)

FIELD TYPES:
- text/email/phone: Single line input (heightNorm: 0.045)
- textarea: Multi-line input (heightNorm: 0.12-0.18)
- checkbox: Small square (widthNorm: 0.025, heightNorm: 0.025)
- radio: Small circle (similar size)

### FOOTER SECTION (Y: ${layout.footer.yStart} to ${layout.footer.yEnd})
- Required fields note: Small font (${typography.smallSize}px), color: #9ca3af
- Privacy note if provided
- Submit button representation (optional)

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Field Background: ${layout.fieldBgColor}
- Field Border: ${layout.fieldBorderColor}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Title: ${typography.titleSize}px
- Heading: ${typography.headingSize}px
- Body/Labels: ${typography.bodySize}px
- Small: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## JSON OUTPUT FORMAT
Output ONLY valid JSON, no markdown code fences:
{
  "textItems": [
    {"text": "...", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "fontSize": 8-28, "color": "#hex", "fontFamily": "Lato", "zIndex": 0-20}
  ],
  "shapes": [
    {"type": "rectangle|line", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "widthNorm": 0.0-1.0, "heightNorm": 0.0-1.0, "strokeColor": "#hex", "strokeWidth": 0-2, "fillColor": "#hex|null", "zIndex": 0-20}
  ]
}

## HORIZONTAL LINES
For separator lines, use heightNorm: 0.0 for perfectly horizontal lines.

## KEY RULES
1. OUTPUT ONLY VALID JSON
2. EVERY item MUST have zIndex
3. Field input rectangles: strokeWidth 1, fillColor for background
4. Evenly distribute fields vertically
5. Required fields marked with red asterisk
6. Full-width fields: widthNorm 0.90
7. Placeholder text uses lighter gray color (#9ca3af)`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildFormUserPrompt(
  userData: FormInputData,
  style: FormStyle,
  definition: GenericAITemplateDefinition
): string {
  const layout = FORM_LAYOUT_SPECS[style];
  const dynamicLayout = calculateFormDynamicLayout(userData);

  // Format fields
  const fieldsText = userData.fields.map((field, i) => {
    const reqStr = field.required ? ' (Required)' : '';
    const optionsStr = field.options ? ` Options: [${field.options.join(', ')}]` : '';
    return `${i + 1}. ${field.label}${reqStr} - Type: ${field.type}${optionsStr}${field.placeholder ? ` - Placeholder: "${field.placeholder}"` : ''}`;
  }).join('\n');

  return `Generate a complete ${style.toUpperCase()} style form layout with the following data.

## FORM HEADER
- Company Name: ${userData.companyName}
- Form Title: ${userData.formTitle}
- Description: ${userData.formDescription}

## FORM FIELDS (${userData.fields.length} fields)
${fieldsText}

## FORM FOOTER
- Submit Button Text: ${userData.submitButtonText}
- Required Field Note: ${userData.requiredFieldNote}
${userData.privacyNote ? `- Privacy Note: ${userData.privacyNote}` : ''}

## CALCULATED LAYOUT POSITIONS
${generateFormLayoutDocumentation(dynamicLayout)}

## VISUAL ELEMENTS TO INCLUDE
1. Header separator line after description (horizontal, color: #e5e7eb)
2. Input field rectangles with:
   - Background: ${layout.fieldBgColor}
   - Border: ${layout.fieldBorderColor}, strokeWidth: 1
   - zIndex: 0 for rectangle, 10 for label text
3. Required asterisks in red (#dc2626)

## FIELD LAYOUT PATTERN
For each field:
1. Label text at yStart of field section
2. Input rectangle 0.03 below label
3. Placeholder text inside rectangle (if provided)

FIELD DIMENSIONS:
- Standard input: widthNorm 0.90, heightNorm 0.045
- Textarea: widthNorm 0.90, heightNorm 0.15
- Checkbox/Radio: widthNorm 0.025, heightNorm 0.025

## CRITICAL REMINDERS
1. EVERY textItem and shape MUST have zIndex
2. Field rectangles zIndex: 0, labels zIndex: 10
3. Evenly distribute fields in the available space
4. Red asterisk (*) after required field labels
5. All horizontal lines: heightNorm = 0.0

Generate the complete JSON with all textItems and shapes for this form.`;
}

// ============================================================================
// Dynamic Layout Calculator
// ============================================================================

interface FormDynamicLayoutResult {
  header: { yStart: number; yEnd: number };
  fields: Array<{
    fieldIndex: number;
    labelY: number;
    inputY: number;
    isTextarea: boolean;
  }>;
  footer: { yStart: number; yEnd: number };
  fieldHeight: number;
}

const FORM_SPACING = {
  headerHeight: 0.14,
  footerHeight: 0.07,
  sectionGap: 0.02,
  labelToInput: 0.03,
  standardFieldHeight: 0.08,
  textareaFieldHeight: 0.15,
  minFieldHeight: 0.06,
};

export function calculateFormDynamicLayout(userData: FormInputData): FormDynamicLayoutResult {
  const fields = userData.fields;

  // Fixed sections
  const headerStart = 0.03;
  const headerEnd = headerStart + FORM_SPACING.headerHeight;

  const footerStart = 0.90;
  const footerEnd = 0.97;

  // Calculate available space for fields
  const fieldsStart = headerEnd + FORM_SPACING.sectionGap;
  const fieldsEnd = footerStart - FORM_SPACING.sectionGap;
  const availableSpace = fieldsEnd - fieldsStart;

  // Count textareas (they need more space)
  const textareaCount = fields.filter(f => f.type === 'textarea').length;
  const standardCount = fields.length - textareaCount;

  // Calculate weighted space
  const textareaWeight = 2.5; // Textareas get 2.5x the space
  const totalWeight = standardCount + (textareaCount * textareaWeight);
  const unitHeight = availableSpace / totalWeight;

  // Calculate field positions
  const fieldLayouts: Array<{
    fieldIndex: number;
    labelY: number;
    inputY: number;
    isTextarea: boolean;
  }> = [];

  let currentY = fieldsStart;
  fields.forEach((field, i) => {
    const isTextarea = field.type === 'textarea';
    const fieldHeight = isTextarea ? unitHeight * textareaWeight : unitHeight;

    fieldLayouts.push({
      fieldIndex: i,
      labelY: currentY,
      inputY: currentY + FORM_SPACING.labelToInput,
      isTextarea,
    });

    currentY += fieldHeight;
  });

  return {
    header: { yStart: headerStart, yEnd: headerEnd },
    fields: fieldLayouts,
    footer: { yStart: footerStart, yEnd: footerEnd },
    fieldHeight: unitHeight,
  };
}

function generateFormLayoutDocumentation(layout: FormDynamicLayoutResult): string {
  const fieldsDoc = layout.fields.map((field, i) =>
    `  Field ${i + 1}: Label Y: ${field.labelY.toFixed(3)}, Input Y: ${field.inputY.toFixed(3)}${field.isTextarea ? ' (textarea - larger height)' : ''}`
  ).join('\n');

  return `
### EVENLY DISTRIBUTED LAYOUT
- HEADER: Y ${layout.header.yStart.toFixed(3)} to ${layout.header.yEnd.toFixed(3)}
- FIELDS (unit height: ${layout.fieldHeight.toFixed(3)}):
${fieldsDoc}
- FOOTER: Y ${layout.footer.yStart.toFixed(3)} to ${layout.footer.yEnd.toFixed(3)}

### SPACING RULES
- Label to input gap: ${FORM_SPACING.labelToInput}
- Standard field total height: ${layout.fieldHeight.toFixed(3)}
- Textarea fields get ${2.5}x the standard height
`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getFormLayoutSpec(style: FormStyle): FormLayoutSpec {
  return FORM_LAYOUT_SPECS[style];
}
