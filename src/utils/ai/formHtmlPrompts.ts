/**
 * Form HTML Prompt Templates
 */

import type { FormInputData, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export function buildFormHtmlSystemPrompt(
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  // Calculate section heights for proper space allocation
  const HEADER_HEIGHT = 70;
  const FOOTER_HEIGHT = 60;
  const CONTAINER_PADDING = 50; // 25px top + 25px bottom
  const AVAILABLE_CONTENT_HEIGHT = CANVAS_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - CONTAINER_PADDING;

  return `You are an expert HTML/CSS developer creating a professional form layout.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation
2. Start with <div class="form"> and end with </div>
3. Use INLINE STYLES only
4. All measurements in pixels (px)
5. MUST use REAL HTML form elements: <input>, <textarea>, <select>
6. ALL content MUST fit within the container - NO overflow allowed
7. Do NOT use any emojis - use only plain text characters

## CONTAINER SPECIFICATIONS
- Container size: ${CANVAS_WIDTH}px width × ${CANVAS_HEIGHT}px height (A4 ratio)
- Use box-sizing: border-box on ALL elements
- Container MUST have overflow: hidden
- All content must be visible - nothing can extend beyond container bounds

## SPACE ALLOCATION (CRITICAL - MUST FOLLOW EXACTLY)
Total available height: ${CANVAS_HEIGHT}px

FIXED SECTION HEIGHTS:
┌─────────────────────────────────────────┐
│ HEADER SECTION: ${HEADER_HEIGHT}px MAX              │
│ (Title + Description)                   │
├─────────────────────────────────────────┤
│ FORM CONTENT: ${AVAILABLE_CONTENT_HEIGHT}px MAX             │
│ (All fields, sections, labels)          │
│ - Each text input field: 55px height    │
│ - Each textarea: 80px max height        │
│ - Each checkbox row: 30px height        │
│ - Section headers: 25px height          │
│ - Spacing between fields: 10px          │
├─────────────────────────────────────────┤
│ FOOTER SECTION: ${FOOTER_HEIGHT}px FIXED            │
│ (Submit button - MUST be fully visible) │
└─────────────────────────────────────────┘

## FIELD HEIGHT LIMITS (STRICT)
- Text input (single line): height: 36px; + label 15px + margin 10px = 55px total
- Textarea: height: 60px; + label 15px + margin 10px = 80px total (adjust if many fields)
- Checkbox/Radio: 18px height + margin 10px = 30px total
- Dropdown/Select: height: 36px; + label 15px + margin 10px = 55px total
- Section title: 25px total with margin

## DYNAMIC FIELD SIZING
If form has MANY fields (>6), reduce sizes:
- Text input height: 32px
- Textarea height: 50px
- Margins: 8px
- Font sizes: reduce by 1-2px

## COLORS
- Primary: ${colorScheme.primary}
- Text: ${colorScheme.textDark}
- Background: ${colorScheme.background}

## TYPOGRAPHY
- Title: ${typography.titleSize}px (max 24px if space is tight)
- Section headings: ${typography.headingSize}px
- Labels: ${typography.bodySize}px (max 12px)
- Input text: 14px
- Font: ${typography.fontFamily}

## FORM LAYOUT STRUCTURE
1. HEADER (${HEADER_HEIGHT}px max) - Form title centered, optional short description
2. FORM CONTENT (${AVAILABLE_CONTENT_HEIGHT}px max) - Fields organized in sections with strict height limits
3. FOOTER (${FOOTER_HEIGHT}px fixed) - Submit button centered, ALWAYS fully visible

## MULTI-SECTION FORMS
When form has multiple sections:
- Calculate available height per section: ${AVAILABLE_CONTENT_HEIGHT}px ÷ (number of sections)
- Each section gets a title (14px font, uppercase, margin-bottom: 8px)
- Use 2-column layout for short fields to save vertical space
- Group related fields horizontally when possible

## CRITICAL: USE REAL FORM ELEMENTS
You MUST use actual HTML form elements, NOT just styled divs:
- For text fields: <input type="text" name="fieldname" value="default value" placeholder="..." style="..." />
- For email: <input type="email" name="email" value="default value" placeholder="..." style="..." />
- For multi-line text: <textarea name="message" style="...">default text here</textarea>
- For checkboxes: <input type="checkbox" name="unique_context_name" checked style="width: 18px; height: 18px; background-color: white;" />
- For dropdowns: <select name="..."><option selected>Selected Option</option></select>

## PRE-FILLED VALUES (IMPORTANT)
When a field has a "value" specified in the field description:
- Text/Email inputs: Use the value attribute: value="provided value"
- Textareas: Put the value as text content between tags
- Checkboxes: Add "checked" attribute if value is "true"
- Dropdowns: Add "selected" attribute to the matching option
- Radio buttons: Add "checked" attribute to the matching option

## CHECKBOX STYLING AND NAMING (CRITICAL)
- Checkboxes MUST always have a white background: background-color: white;
- Checkboxes MUST have FIXED dimensions: width: 18px; height: 18px;
- Each checkbox MUST have a UNIQUE field name based on its context/label
- Field names should be descriptive and unique, e.g.: "agree_terms", "newsletter_subscribe", "accept_privacy", "dietary_vegetarian"
- NEVER use generic names like "checkbox1", "checkbox2", "agree", etc.
- Example: <input type="checkbox" name="accept_terms_conditions" style="width: 18px; height: 18px; background-color: white; accent-color: ${colorScheme.primary};" />

## FIELD STRUCTURE EXAMPLE
<div style="margin-bottom: 12px;">
  <label style="display: block; margin-bottom: 4px; font-weight: 600; color: ${colorScheme.textDark}; font-size: 12px;">Full Name</label>
  <input type="text" name="fullname" placeholder="Enter your name" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; box-sizing: border-box;" />
</div>

<div style="margin-bottom: 12px;">
  <label style="display: block; margin-bottom: 4px; font-weight: 600; color: ${colorScheme.textDark}; font-size: 12px;">Message</label>
  <textarea name="message" placeholder="Your message" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; resize: none; box-sizing: border-box;"></textarea>
</div>

## CHECKBOX FIELD EXAMPLE
<div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
  <input type="checkbox" name="accept_privacy_policy" style="width: 18px; height: 18px; background-color: white;" />
  <label style="font-size: 12px; color: ${colorScheme.textDark};">I accept the privacy policy</label>
</div>

## TEXT WRAPPING
- All text containers must have: word-wrap: break-word; overflow-wrap: break-word;
- Container must have overflow: hidden; box-sizing: border-box;

## HTML STRUCTURE TEMPLATE (FOLLOW THIS EXACTLY)
<div class="form" style="width: ${CANVAS_WIDTH}px; height: ${CANVAS_HEIGHT}px; display: flex; flex-direction: column; font-family: ${typography.fontFamily}, sans-serif; box-sizing: border-box; overflow: hidden; padding: 25px; background: ${colorScheme.background};">

  <!-- HEADER SECTION: Fixed ${HEADER_HEIGHT}px max -->
  <div style="flex-shrink: 0; max-height: ${HEADER_HEIGHT}px; text-align: center; margin-bottom: 10px; overflow: hidden;">
    <h1 style="margin: 0 0 5px 0; font-size: ${typography.titleSize}px; color: ${colorScheme.textDark};">Form Title</h1>
    <p style="margin: 0; font-size: 12px; color: #6b7280;">Optional description</p>
  </div>

  <!-- FORM CONTENT SECTION: Fills remaining space, max ${AVAILABLE_CONTENT_HEIGHT}px -->
  <div style="flex: 1; max-height: ${AVAILABLE_CONTENT_HEIGHT}px; overflow: hidden; display: flex; flex-direction: column; gap: 10px;">

    <!-- Section 1 (if multiple sections) -->
    <div style="flex-shrink: 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: ${colorScheme.primary};">Section Title</h3>

      <!-- 2-column layout for short fields -->
      <div style="display: flex; gap: 15px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 600;">Field 1</label>
          <input type="text" name="field1" style="width: 100%; height: 36px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box;" />
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 600;">Field 2</label>
          <input type="text" name="field2" style="width: 100%; height: 36px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box;" />
        </div>
      </div>
    </div>

    <!-- Full-width field example -->
    <div style="flex-shrink: 0;">
      <label style="display: block; margin-bottom: 4px; font-size: 12px; font-weight: 600;">Full Width Field</label>
      <input type="text" name="fullwidth" style="width: 100%; height: 36px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box;" />
    </div>

    <!-- Checkbox example -->
    <div style="flex-shrink: 0; display: flex; align-items: center; gap: 8px;">
      <input type="checkbox" name="agree_terms" style="width: 18px; height: 18px; background-color: white;" />
      <label style="font-size: 12px;">Checkbox label</label>
    </div>
  </div>

  <!-- FOOTER SECTION: Fixed ${FOOTER_HEIGHT}px -->
  <div style="flex-shrink: 0; height: ${FOOTER_HEIGHT}px; display: flex; align-items: center; justify-content: center; padding-top: 10px;">
    <button style="padding: 12px 40px; background: ${colorScheme.primary}; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">Submit</button>
  </div>
</div>

## BEFORE GENERATING - CALCULATE SPACE
1. Count total fields in the form
2. Calculate total height needed: (text inputs × 55px) + (textareas × 80px) + (checkboxes × 30px) + (section headers × 25px)
3. If total > ${AVAILABLE_CONTENT_HEIGHT}px, use 2-column layout and reduce field heights
4. ALWAYS reserve ${FOOTER_HEIGHT}px at bottom for submit button

OUTPUT ONLY THE HTML. NO OTHER TEXT.`;
}

export function buildFormHtmlUserPrompt(
  userData: FormInputData,
  style: string,
  definition: GenericAITemplateDefinition
): string {
  // Count fields by type for space calculation
  const fields = userData.fields || [];
  const textInputCount = fields.filter(f => f.type === 'text' || f.type === 'email' || f.type === 'tel' || f.type === 'number').length;
  const textareaCount = fields.filter(f => f.type === 'textarea').length;
  const checkboxCount = fields.filter(f => f.type === 'checkbox').length;
  const dropdownCount = fields.filter(f => f.type === 'select' || f.type === 'dropdown').length;
  const sectionCount = userData.sections?.length || 1;

  // Calculate estimated height needed
  const estimatedHeight = (textInputCount * 55) + (textareaCount * 80) + (checkboxCount * 30) + (dropdownCount * 55) + (sectionCount * 25);
  const needsCompactLayout = estimatedHeight > 660; // Available content height

  // Build detailed field descriptions with options and default values
  const fieldsText = fields.map((f, i) => {
    let fieldDesc = `${i + 1}. ${f.label} (${f.type})`;
    if (f.required === true || f.required === 'Yes') fieldDesc += ' - Required';
    if (f.placeholder) fieldDesc += ` | placeholder: "${f.placeholder}"`;
    if (f.defaultValue) fieldDesc += ` | value: "${f.defaultValue}"`;
    if (f.width) fieldDesc += ` | width: ${f.width}`;

    // Handle options for select/radio/checkbox (could be string or array)
    const options = typeof f.options === 'string'
      ? f.options.split(',').map((o: string) => o.trim()).filter(Boolean)
      : f.options;
    if (options && options.length > 0) {
      fieldDesc += ` | options: [${options.join(', ')}]`;
    }

    return fieldDesc;
  }).join('\n') || 'Name (text), Email (email), Message (textarea)';

  return `Create an HTML form with:

## FORM INFO
- Title: ${userData.formTitle || 'Contact Form'}
- Description: ${userData.formDescription || ''}
- Organization: ${userData.companyName || ''}

## FIELD COUNT & SPACE CALCULATION
- Total fields: ${fields.length}
- Text inputs: ${textInputCount} (×55px = ${textInputCount * 55}px)
- Textareas: ${textareaCount} (×80px = ${textareaCount * 80}px)
- Checkboxes: ${checkboxCount} (×30px = ${checkboxCount * 30}px)
- Dropdowns: ${dropdownCount} (×55px = ${dropdownCount * 55}px)
- Sections: ${sectionCount} (×25px = ${sectionCount * 25}px)
- Estimated total: ${estimatedHeight}px
- Available space: 660px
${needsCompactLayout ? '- ⚠️ USE COMPACT LAYOUT: 2-column layout required, reduce field heights' : '- ✓ Standard layout OK'}

## FIELDS
${fieldsText}

## SECTIONS
${userData.sections?.map(s => s.title).join(', ') || 'Single section'}

${needsCompactLayout ? `
## COMPACT LAYOUT REQUIRED
You MUST use:
- 2-column layout for text inputs where possible
- Reduced field heights (32px instead of 36px)
- Reduced margins (8px instead of 10px)
- Smaller textareas (50px instead of 60px)
` : ''}

Generate complete HTML. Start with <div class="form" and end with </div>.`;
}
