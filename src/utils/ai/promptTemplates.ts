/**
 * Prompt Templates for Claude AI
 * System prompts and user prompt builders for canvas content generation
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_FONT_SIZE,
} from '../../config/constants';

import { FORM_FIELD_DEFAULTS } from '../../types/formFields';

// ============================================================================
// Pre-calculated normalized sizes for accurate positioning
// ============================================================================

// Form field sizes in normalized coordinates (based on actual pixel sizes)
const NORM_SIZES = {
  textInput: {
    widthNorm: FORM_FIELD_DEFAULTS.textInput.width / CANVAS_WIDTH,   // 200/595 = 0.336
    heightNorm: FORM_FIELD_DEFAULTS.textInput.height / CANVAS_HEIGHT, // 30/842 = 0.0356
  },
  textarea: {
    widthNorm: FORM_FIELD_DEFAULTS.textarea.width / CANVAS_WIDTH,     // 300/595 = 0.504
    heightNorm: FORM_FIELD_DEFAULTS.textarea.height / CANVAS_HEIGHT,  // 100/842 = 0.119
  },
  checkbox: {
    widthNorm: FORM_FIELD_DEFAULTS.checkbox.width / CANVAS_WIDTH,     // 20/595 = 0.0336
    heightNorm: FORM_FIELD_DEFAULTS.checkbox.height / CANVAS_HEIGHT,  // 20/842 = 0.0238
  },
  radio: {
    widthNorm: FORM_FIELD_DEFAULTS.radio.width / CANVAS_WIDTH,        // 20/595 = 0.0336
    heightNorm: FORM_FIELD_DEFAULTS.radio.height / CANVAS_HEIGHT,     // 20/842 = 0.0238
  },
  dropdown: {
    widthNorm: FORM_FIELD_DEFAULTS.dropdown.width / CANVAS_WIDTH,     // 200/595 = 0.336
    heightNorm: FORM_FIELD_DEFAULTS.dropdown.height / CANVAS_HEIGHT,  // 30/842 = 0.0356
  },
};

// Safe spacing and margins in normalized coordinates
const SPACING = {
  marginLeft: 0.05,      // 5% left margin (~30px)
  marginRight: 0.05,     // 5% right margin (~30px), content should end at 0.95
  marginTop: 0.04,       // 4% top margin (~34px)
  marginBottom: 0.05,    // 5% bottom margin (~42px), content should end at 0.95
  labelGap: 0.025,       // Gap between label and field (~21px)
  fieldGap: 0.05,        // Gap between form field rows (~42px)
  sectionGap: 0.06,      // Gap between major sections (~50px)
  lineHeight: 0.03,      // Text line height (~25px for 16px font)
};

// Font size recommendations (in pixels) for 595x842 canvas
const FONT_SIZES = {
  title: 22,             // Main title - professional, not oversized
  heading: 16,           // Section headings
  subheading: 14,        // Subsection headings
  body: 14,              // Body text, paragraphs, form labels
  label: 14,             // Form field labels (consistent with body)
  small: 11,             // Fine print, captions
};

// ============================================================================
// System Prompt (generated with actual canvas dimensions and sizes)
// ============================================================================

export const CANVAS_SYSTEM_PROMPT = `You are an AI assistant for a PDF Editor. Generate canvas content as JSON.

## CANVAS CAPACITY - CRITICAL
- Canvas: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}px (A4 page)
- Usable Y range: 0.05 to 0.85 (total: 0.80 normalized = ~674px)
- Coordinates are NORMALIZED (0 to 1), where yNormTop 0.0 = top, 1.0 = bottom

## ELEMENT HEIGHTS (how much Y space each element uses)
| Element Type      | Height (normalized) | Description                        |
|-------------------|--------------------|------------------------------------|
| Title (22px)      | 0.08               | Title + gap to next element        |
| Heading (16px)    | 0.06               | Section heading + gap              |
| Radio/Checkbox    | 0.05               | Field + gap to next radio/checkbox |
| TextInput         | 0.09               | Label + field + gap                |
| Textarea          | 0.16               | Label + field + gap                |
| Section gap       | 0.08               | Space between major sections       |

## CAPACITY LIMITS - RESPECT THESE
- MAX items that fit on one page (approximate):
  - 1 title + 6 text inputs = uses ~0.08 + 6*0.09 = 0.62 ✓
  - 1 title + 2 sections with 4 radios each = 0.08 + 2*(0.06 + 4*0.05 + 0.08) = 0.76 ✓
  - 1 title + 3 sections with 5 radios each = 0.08 + 3*(0.06 + 5*0.05 + 0.08) = 1.15 ✗ TOO MUCH!
- RULE: Calculate total height BEFORE generating. If > 0.75, reduce content!
- For surveys: MAX 2-3 sections with 3-4 options each

## SIMPLE POSITIONING RULES
1. Start at yNormTop: 0.05
2. Add element heights sequentially
3. NEVER exceed yNormTop: 0.80 for last element
4. All xNorm: 0.05 (left aligned)

## FORM FIELD SIZES
| Type      | widthNorm | heightNorm |
|-----------|-----------|------------|
| textInput | 0.40      | 0.036      |
| textarea  | 0.50      | 0.12       |
| checkbox  | 0.034     | 0.024      |
| radio     | 0.034     | 0.024      |
| dropdown  | 0.40      | 0.036      |

## RADIO vs CHECKBOX
- RADIO: Single selection (rating scales, yes/no, mutually exclusive choices)
- CHECKBOX: Multiple selection ("select all that apply", interests, preferences)

## JSON FORMAT (output ONLY valid JSON, no markdown, no explanation)

## COMPLETE EXAMPLE - WORKLOAD ASSESSMENT FORM
Calculate: Title(0.08) + Heading(0.06) + 3 radios(0.15) + gap(0.08) + Heading(0.06) + 3 radios(0.15) + gap(0.08) + TextInput(0.09) = 0.75 ✓

{
  "textItems": [
    {"text": "Workload Assessment", "xNorm": 0.05, "yNormTop": 0.05, "fontSize": 22, "color": "#1a1a1a", "fontFamily": "Lato"},
    {"text": "1. Current Workload", "xNorm": 0.05, "yNormTop": 0.13, "fontSize": 16, "color": "#1a1a1a", "fontFamily": "Lato"},
    {"text": "2. Work-Life Balance", "xNorm": 0.05, "yNormTop": 0.42, "fontSize": 16, "color": "#1a1a1a", "fontFamily": "Lato"}
  ],
  "formFields": [
    {"type": "radio", "label": "Very Manageable", "xNorm": 0.05, "yNormTop": 0.19, "widthNorm": 0.034, "heightNorm": 0.024, "fieldName": "wl_low_a1b2", "groupName": "workload_x1y2"},
    {"type": "radio", "label": "Manageable", "xNorm": 0.05, "yNormTop": 0.24, "widthNorm": 0.034, "heightNorm": 0.024, "fieldName": "wl_med_c3d4", "groupName": "workload_x1y2"},
    {"type": "radio", "label": "Overwhelming", "xNorm": 0.05, "yNormTop": 0.29, "widthNorm": 0.034, "heightNorm": 0.024, "fieldName": "wl_high_e5f6", "groupName": "workload_x1y2"},
    {"type": "radio", "label": "Excellent", "xNorm": 0.05, "yNormTop": 0.48, "widthNorm": 0.034, "heightNorm": 0.024, "fieldName": "bal_exc_g7h8", "groupName": "balance_z3w4"},
    {"type": "radio", "label": "Good", "xNorm": 0.05, "yNormTop": 0.53, "widthNorm": 0.034, "heightNorm": 0.024, "fieldName": "bal_good_i9j0", "groupName": "balance_z3w4"},
    {"type": "radio", "label": "Needs Improvement", "xNorm": 0.05, "yNormTop": 0.58, "widthNorm": 0.034, "heightNorm": 0.024, "fieldName": "bal_poor_k1l2", "groupName": "balance_z3w4"},
    {"type": "textInput", "label": "Additional Comments", "xNorm": 0.05, "yNormTop": 0.72, "widthNorm": 0.40, "heightNorm": 0.036, "fieldName": "comments_m3n4", "placeholder": "Optional feedback"}
  ]
}

## KEY RULES
1. OUTPUT ONLY VALID JSON - no markdown, no explanation, no comments
2. Calculate total height BEFORE generating - must be < 0.80
3. Use the "label" property on form fields - app renders labels automatically
4. Radio buttons in same group MUST share same groupName
5. All fieldName/groupName must be unique with random 4-char suffix
6. xNorm: 0.05 (left aligned), yNormTop: start at 0.05, increment based on element heights
7. Font sizes: 22 for title, 16 for headings, 14 for body/labels`;

// Additional guidance for specific form types
const FORM_TYPE_GUIDANCE = `
## FORM TYPE GUIDANCE
- Contact Form: Title + 3-4 textInputs + 1 textarea + checkbox = ~0.60
- Survey (2 sections, 3-4 options each): Title + 2*(heading + 3-4 radios) = ~0.60
- Feedback Form: Title + 1 textInput + 1 textarea + 3 radios = ~0.55
- Registration: Title + 4-5 textInputs + checkbox = ~0.55
`;

// ============================================================================
// User Prompt Builder
// ============================================================================

export interface CanvasContext {
  textCount: number;
  shapeCount: number;
  formFieldCount: number;
  imageCount: number;
}

/**
 * Build the user prompt with context about existing canvas state
 */
export function buildUserPrompt(userInput: string, context?: CanvasContext): string {
  let contextInfo = '';

  if (context) {
    const parts = [];
    if (context.textCount > 0) parts.push(`${context.textCount} text items`);
    if (context.shapeCount > 0) parts.push(`${context.shapeCount} shapes`);
    if (context.formFieldCount > 0) parts.push(`${context.formFieldCount} form fields`);
    if (context.imageCount > 0) parts.push(`${context.imageCount} images`);

    if (parts.length > 0) {
      contextInfo = `Current page has: ${parts.join(', ')}. Start new content at yNormTop 0.50 or higher.\n\n`;
    }
  }

  return `${contextInfo}Request: ${userInput}`;
}

// ============================================================================
// Example Prompts (for UI hints)
// ============================================================================

export const EXAMPLE_PROMPTS = [
  'Add a title "Invoice" at the top',
  'Create a contact form with name, email, phone, and message fields',
  'Add a header with company name and address',
  'Create a feedback form with comments textarea',
  'Add a checkbox for "I agree to terms"',
  'Create a professional letterhead',
  'Add a signature line at the bottom',
];

// Export sizes for use in useClaudeAI
export { NORM_SIZES, SPACING, FONT_SIZES };
