/**
 * Letterhead-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for professional letterhead layouts
 */

import type { LetterheadInputData, LetterheadStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// Helper to extract text from bodyParagraphs (handles both string[] and {id, text}[] formats)
function extractParagraphText(paragraph: string | { id?: string; text: string }): string {
  if (typeof paragraph === 'string') {
    return paragraph;
  }
  return paragraph?.text || '';
}

function extractParagraphsAsStrings(paragraphs: (string | { id?: string; text: string })[]): string[] {
  return paragraphs.map(extractParagraphText);
}

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface LetterheadSectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number;
}

export interface LetterheadLayoutSpec {
  header: { yStart: number; yEnd: number };
  recipient: { yStart: number; yEnd: number };
  body: { yStart: number; yEnd: number };
  signature: { yStart: number; yEnd: number };
  footer: { yStart: number; yEnd: number };
  sectionBounds: LetterheadSectionBounds[];
  primaryColor: string;
  accentColor: string;
  headerAlignment: 'left' | 'center' | 'right';
}

export const LETTERHEAD_LAYOUT_SPECS: Record<LetterheadStyle, LetterheadLayoutSpec> = {
  corporate: {
    header: { yStart: 0.03, yEnd: 0.14 },
    recipient: { yStart: 0.18, yEnd: 0.32 },
    body: { yStart: 0.36, yEnd: 0.75 },
    signature: { yStart: 0.77, yEnd: 0.88 },
    footer: { yStart: 0.92, yEnd: 0.97 },
    primaryColor: '#1e3a5f',
    accentColor: '#0ea5e9',
    headerAlignment: 'left',
    sectionBounds: [
      { name: 'company_left', xStart: 0.05, xEnd: 0.50, yStart: 0.03, yEnd: 0.12, textColor: '#1e3a5f', maxCharsPerLine: 40, zIndexBase: 20 },
      { name: 'contact_right', xStart: 0.60, xEnd: 0.95, yStart: 0.03, yEnd: 0.12, textColor: '#64748b', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'date', xStart: 0.05, xEnd: 0.50, yStart: 0.18, yEnd: 0.21, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'recipient', xStart: 0.05, xEnd: 0.60, yStart: 0.23, yEnd: 0.32, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'salutation', xStart: 0.05, xEnd: 0.60, yStart: 0.36, yEnd: 0.39, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'body', xStart: 0.05, xEnd: 0.95, yStart: 0.40, yEnd: 0.75, textColor: '#374151', maxCharsPerLine: 85, zIndexBase: 10 },
      { name: 'closing', xStart: 0.05, xEnd: 0.40, yStart: 0.77, yEnd: 0.80, textColor: '#374151', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'signature', xStart: 0.05, xEnd: 0.40, yStart: 0.82, yEnd: 0.88, textColor: '#374151', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.92, yEnd: 0.97, textColor: '#1e3a5f', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
  personal: {
    header: { yStart: 0.04, yEnd: 0.16 },
    recipient: { yStart: 0.20, yEnd: 0.30 },
    body: { yStart: 0.34, yEnd: 0.76 },
    signature: { yStart: 0.78, yEnd: 0.90 },
    footer: { yStart: 0.93, yEnd: 0.97 },
    primaryColor: '#374151',
    accentColor: '#9ca3af',
    headerAlignment: 'center',
    sectionBounds: [
      { name: 'name_header', xStart: 0.20, xEnd: 0.80, yStart: 0.04, yEnd: 0.09, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 20 },
      { name: 'address_line', xStart: 0.15, xEnd: 0.85, yStart: 0.10, yEnd: 0.12, textColor: '#6b7280', maxCharsPerLine: 60, zIndexBase: 10 },
      { name: 'contact_line', xStart: 0.20, xEnd: 0.80, yStart: 0.13, yEnd: 0.15, textColor: '#6b7280', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'date', xStart: 0.05, xEnd: 0.50, yStart: 0.20, yEnd: 0.23, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'salutation', xStart: 0.05, xEnd: 0.60, yStart: 0.28, yEnd: 0.30, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'body', xStart: 0.05, xEnd: 0.95, yStart: 0.34, yEnd: 0.76, textColor: '#374151', maxCharsPerLine: 85, zIndexBase: 10 },
      { name: 'closing', xStart: 0.05, xEnd: 0.40, yStart: 0.78, yEnd: 0.81, textColor: '#374151', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'signature', xStart: 0.05, xEnd: 0.40, yStart: 0.84, yEnd: 0.90, textColor: '#374151', maxCharsPerLine: 35, zIndexBase: 10 },
    ],
  },
  minimalist: {
    header: { yStart: 0.04, yEnd: 0.10 },
    recipient: { yStart: 0.14, yEnd: 0.24 },
    body: { yStart: 0.28, yEnd: 0.78 },
    signature: { yStart: 0.80, yEnd: 0.92 },
    footer: { yStart: 0.95, yEnd: 0.98 },
    primaryColor: '#111827',
    accentColor: '#d1d5db',
    headerAlignment: 'left',
    sectionBounds: [
      { name: 'name', xStart: 0.05, xEnd: 0.50, yStart: 0.04, yEnd: 0.07, textColor: '#111827', maxCharsPerLine: 40, zIndexBase: 20 },
      { name: 'contact', xStart: 0.05, xEnd: 0.70, yStart: 0.07, yEnd: 0.09, textColor: '#6b7280', maxCharsPerLine: 60, zIndexBase: 10 },
      { name: 'date', xStart: 0.05, xEnd: 0.40, yStart: 0.14, yEnd: 0.17, textColor: '#374151', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'recipient', xStart: 0.05, xEnd: 0.60, yStart: 0.18, yEnd: 0.24, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'salutation', xStart: 0.05, xEnd: 0.60, yStart: 0.28, yEnd: 0.30, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'body', xStart: 0.05, xEnd: 0.95, yStart: 0.32, yEnd: 0.78, textColor: '#374151', maxCharsPerLine: 85, zIndexBase: 10 },
      { name: 'closing', xStart: 0.05, xEnd: 0.40, yStart: 0.80, yEnd: 0.83, textColor: '#374151', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'signature', xStart: 0.05, xEnd: 0.40, yStart: 0.85, yEnd: 0.92, textColor: '#111827', maxCharsPerLine: 35, zIndexBase: 10 },
    ],
  },
};

// ============================================================================
// System Prompt for Letterhead Generation
// ============================================================================

export function buildLetterheadSystemPrompt(style: LetterheadStyle, definition: GenericAITemplateDefinition): string {
  const layout = LETTERHEAD_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a professional letterhead layout generator for a PDF editor. Generate JSON output with textItems and shapes.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width × ${CANVAS_HEIGHT}px height (A4 page ratio)
- Coordinates are NORMALIZED (0.0 to 1.0):
  - xNorm=0.0 is left edge, xNorm=1.0 is right edge
  - yNormTop=0.0 is top edge, yNormTop=1.0 is bottom edge

## Z-INDEX LAYERING SYSTEM - CRITICAL
Every textItem and shape MUST have a zIndex property.

Z-INDEX GUIDELINES:
- Background/decorative shapes: zIndex: 0
- Separator lines: zIndex: 5
- Body text: zIndex: 10
- Header text: zIndex: 15
- Company/sender name: zIndex: 20

## LETTERHEAD SECTIONS
${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

## EVEN DISTRIBUTION PRINCIPLE
The letterhead has 5 main sections with EVEN paragraph distribution:
1. HEADER - Company/Personal info and branding (fixed)
2. DATE & RECIPIENT - Letter addressing
3. BODY - Salutation + paragraphs (evenly distributed)
4. SIGNATURE - Closing, signature space, name/title
5. FOOTER - Website or additional info (fixed)

Body paragraphs are distributed evenly within the body section.

## LAYOUT SPECIFICATIONS FOR ${style.toUpperCase()} STYLE

### HEADER SECTION (Y: ${layout.header.yStart} to ${layout.header.yEnd})
${style === 'corporate' ? `CORPORATE STYLE - TWO COLUMN:
LEFT SIDE (xNorm: 0.05):
- Company Name: Large font (${typography.titleSize}px), color: ${layout.primaryColor}, zIndex: 20
- Tagline: Below name, small font (${typography.smallSize}px), color: #64748b

RIGHT SIDE (xNorm: 0.95, right-aligned):
- Address: Right-aligned, small font (${typography.smallSize}px), color: #64748b
- Phone: "Tel: xxx-xxx-xxxx"
- Email: Email address
- Website (if provided)

DIVIDER LINE:
- Horizontal line below header at Y: 0.14
- Color: ${layout.primaryColor}, strokeWidth: 2
- xNorm: 0.05, widthNorm: 0.90, heightNorm: 0.0
` : style === 'personal' ? `PERSONAL STYLE - CENTERED:
CENTERED HEADER:
- Your Name: Centered (xNorm: 0.50), large font (${typography.titleSize}px), color: ${layout.primaryColor}, zIndex: 20
- Address Line: Centered, format: "Street Address  •  City, State ZIP"
- Contact Line: Centered, format: "email@email.com  •  (xxx) xxx-xxxx"
- Small font (${typography.smallSize}px), color: #6b7280

DECORATIVE LINES:
- Thin line above contact at Y: 0.10
- Thin line below contact at Y: 0.16
- Centered, widthNorm: 0.40, color: ${layout.accentColor}
` : `MINIMALIST STYLE - CLEAN:
LEFT-ALIGNED SIMPLE:
- Name: Medium font (${typography.headingSize}px), color: ${layout.primaryColor}, zIndex: 20
- Contact in single line: "email | phone | website"
- Very subtle or no divider line
- Clean, uncluttered appearance
`}

### DATE & RECIPIENT (Y: ${layout.recipient.yStart} to ${layout.recipient.yEnd})
DATE:
- Position: Y ${layout.recipient.yStart}, left-aligned
- Format: Full date (e.g., "December 24, 2024")
- Font: ${typography.bodySize}px, color: #374151

RECIPIENT INFO (after date, with small gap):
- Recipient Name: Font ${typography.bodySize}px
- Recipient Title (if provided): Same font
- Recipient Company (if provided): Same font
- Recipient Address (if provided): May need wrapping
- Each on separate line, Y increment: 0.025

### BODY SECTION (Y: ${layout.body.yStart} to ${layout.body.yEnd})
SALUTATION:
- Format: "${style === 'personal' ? 'Dear [Name],' : 'Dear Mr./Ms. [Name],'}"
- Position: Y ${layout.body.yStart}
- Font: ${typography.bodySize}px
- Followed by blank space

PARAGRAPHS - CRITICAL:
- Each paragraph MUST be wrapped at ~85 characters per line
- Each wrapped line is a SEPARATE textItem
- Line increment: 0.022 between lines within paragraph
- Paragraph gap: 0.03 between paragraphs
- Font: ${typography.bodySize}px, color: #374151

TEXT WRAPPING EXAMPLE:
Input paragraph: "I am writing to discuss our upcoming partnership and the exciting opportunities it presents for both of our organizations. This collaboration will bring significant value."

Output (multiple textItems):
{"text": "I am writing to discuss our upcoming partnership and the exciting opportunities it", "xNorm": 0.05, "yNormTop": 0.42, "fontSize": 11, "color": "#374151", "zIndex": 10}
{"text": "presents for both of our organizations. This collaboration will bring significant value.", "xNorm": 0.05, "yNormTop": 0.442, "fontSize": 11, "color": "#374151", "zIndex": 10}

### SIGNATURE SECTION (Y: ${layout.signature.yStart} to ${layout.signature.yEnd})
CLOSING:
- Text: "${style === 'personal' ? 'Warm regards,' : 'Sincerely,'}" or similar
- Position: Y ${layout.signature.yStart}

SIGNATURE SPACE:
- Leave ~0.05 vertical space for actual signature

SENDER INFO:
- Sender Name: Font ${typography.bodySize}px, slightly bolder appearance
- Sender Title (if provided): Below name, smaller/lighter color
- Position: After signature space

### FOOTER (Y: ${layout.footer.yStart} to ${layout.footer.yEnd})
${style === 'corporate' ? `CORPORATE FOOTER:
- Horizontal separator line at Y: ${layout.footer.yStart}
- Website centered below line
- Color: ${layout.primaryColor}
` : style === 'personal' ? `PERSONAL FOOTER:
- Optional centered decorative element
- Or blank
` : `MINIMALIST FOOTER:
- Minimal or blank
- Clean finish
`}

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Company/Sender name: ${typography.titleSize}px
- Section headers: ${typography.headingSize}px
- Body text: ${typography.bodySize}px
- Small text: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## TEXT WRAPPING - CRITICAL RULE
Long text MUST be broken into multiple textItems:
- Max ~85 characters per line for body text
- Max ~40 characters for addresses
- Increment yNormTop by 0.022 for each new line
- Increment by 0.03 between paragraphs

## JSON OUTPUT FORMAT
Output ONLY valid JSON, no markdown code fences:
{
  "textItems": [
    {"text": "...", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "fontSize": 8-28, "color": "#hex", "fontFamily": "Lato", "zIndex": 0-20}
  ],
  "shapes": [
    {"type": "rectangle|line", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "widthNorm": 0.0-1.0, "heightNorm": 0.0-1.0, "strokeColor": "#hex", "strokeWidth": 0-3, "fillColor": "#hex|null", "zIndex": 0-20}
  ]
}

## HORIZONTAL LINES - CRITICAL
For horizontal separator lines: heightNorm MUST be 0.0
Example: {"type": "line", "xNorm": 0.05, "yNormTop": 0.14, "widthNorm": 0.90, "heightNorm": 0.0, "strokeColor": "${layout.primaryColor}", "strokeWidth": 2, "zIndex": 5}

## KEY RULES - FOLLOW EXACTLY
1. OUTPUT ONLY VALID JSON - no markdown, no explanation
2. EVERY item MUST have zIndex property
3. WRAP ALL paragraphs into multiple textItems (max 85 chars/line)
4. Horizontal lines: heightNorm MUST be 0.0
5. Even spacing between paragraphs (0.03)
6. Professional, clean layout
7. Never exceed yNormTop: 0.97`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildLetterheadUserPrompt(
  userData: LetterheadInputData,
  style: LetterheadStyle,
  definition: GenericAITemplateDefinition
): string {
  const layout = LETTERHEAD_LAYOUT_SPECS[style];
  const dynamicLayout = calculateLetterheadDynamicLayout(userData, style);

  // Format paragraphs with char counts (handle both string[] and object[] formats)
  const paragraphStrings = extractParagraphsAsStrings(userData.bodyParagraphs);
  const paragraphsText = paragraphStrings.map((p, i) =>
    `  Paragraph ${i + 1} (${p.length} chars): "${p}"`
  ).join('\n');

  // Format address
  const fullAddress = userData.cityStateZip
    ? `${userData.address}, ${userData.cityStateZip}`
    : userData.address;

  return `Generate a complete ${style.toUpperCase()} style letterhead layout with ALL the following content.

## SENDER INFORMATION
- Name/Company: ${userData.companyName}
${userData.tagline ? `- Tagline: "${userData.tagline}"` : ''}
- Address: ${fullAddress}
- Phone: ${userData.phone}
- Email: ${userData.email}
${userData.website ? `- Website: ${userData.website}` : ''}

## DATE
${userData.date}

## RECIPIENT INFORMATION
- Name: ${userData.recipientName}
${userData.recipientTitle ? `- Title: ${userData.recipientTitle}` : ''}
${userData.recipientCompany ? `- Company: ${userData.recipientCompany}` : ''}
${userData.recipientAddress ? `- Address: ${userData.recipientAddress}` : ''}

## LETTER CONTENT
Salutation: "${userData.salutation}"

Body Paragraphs (${userData.bodyParagraphs.length} paragraphs - ALL MUST be included and wrapped):
${paragraphsText}

Closing: "${userData.closing}"

Sender:
- Name: ${userData.senderName}
${userData.senderTitle ? `- Title: ${userData.senderTitle}` : ''}

## CALCULATED LAYOUT POSITIONS
${generateLetterheadLayoutDocumentation(dynamicLayout, style)}

## VISUAL ELEMENTS TO INCLUDE
${style === 'corporate' ? `1. Header separator line at Y: 0.14 (horizontal, ${layout.primaryColor}, strokeWidth: 2)
2. Footer separator line at Y: 0.92 (optional)
3. Clean professional appearance` : style === 'personal' ? `1. Decorative line above contact info at Y: ~0.10 (centered, thin)
2. Decorative line below contact info at Y: ~0.16 (centered, thin)
3. Elegant, warm appearance` : `1. Minimal or no decorative lines
2. Focus on clean typography
3. Plenty of white space`}

## TEXT WRAPPING REQUIREMENTS - CRITICAL
- EVERY body paragraph MUST be wrapped at 85 characters
- Each wrapped line = separate textItem
- Line increment: 0.022 within paragraphs
- Paragraph gap: 0.03 between paragraphs
- Include ALL ${userData.bodyParagraphs.length} paragraphs

## ALIGNMENT
${style === 'personal' ? `- Header (name, address, contact): CENTERED (xNorm: 0.50)
- Body content: LEFT aligned (xNorm: 0.05)` : `- All content: LEFT aligned (xNorm: 0.05)
- Right-side contact info: RIGHT aligned at edge`}

## CRITICAL REQUIREMENTS
1. ALL ${userData.bodyParagraphs.length} paragraphs MUST be included
2. Each paragraph MUST be wrapped into multiple textItems
3. Proper spacing between all sections
4. Every textItem and shape MUST have zIndex
5. Horizontal lines: heightNorm = 0.0

Generate the complete JSON with all textItems (including ALL wrapped paragraph lines) and shapes.`;
}

// ============================================================================
// Dynamic Layout Calculator
// ============================================================================

interface LetterheadDynamicLayoutResult {
  header: { yStart: number; yEnd: number };
  date: { yStart: number };
  recipient: { yStart: number; yEnd: number; lineCount: number };
  salutation: { yStart: number };
  paragraphs: Array<{ paragraphIndex: number; yStart: number; estimatedLines: number }>;
  closing: { yStart: number };
  signature: { yStart: number; yEnd: number };
  footer: { yStart: number; yEnd: number };
  paragraphGap: number;
}

const LETTERHEAD_SPACING = {
  lineHeight: 0.022,
  paragraphGap: 0.03,
  sectionGap: 0.025,
  recipientLineHeight: 0.025,
  signatureGap: 0.05,
};

function estimateLineCount(text: string, maxChars: number): number {
  if (!text) return 0;
  return Math.ceil(text.length / maxChars);
}

export function calculateLetterheadDynamicLayout(
  userData: LetterheadInputData,
  style: LetterheadStyle
): LetterheadDynamicLayoutResult {
  const layout = LETTERHEAD_LAYOUT_SPECS[style];

  // Header
  const headerStart = layout.header.yStart;
  const headerEnd = layout.header.yEnd;

  // Date
  const dateStart = layout.recipient.yStart;

  // Recipient - count lines
  let recipientLines = 1; // Name
  if (userData.recipientTitle) recipientLines++;
  if (userData.recipientCompany) recipientLines++;
  if (userData.recipientAddress) recipientLines++;
  const recipientStart = dateStart + LETTERHEAD_SPACING.sectionGap;
  const recipientEnd = recipientStart + (recipientLines * LETTERHEAD_SPACING.recipientLineHeight);

  // Body section
  const salutationStart = layout.body.yStart;
  const bodyContentStart = salutationStart + LETTERHEAD_SPACING.lineHeight + LETTERHEAD_SPACING.paragraphGap;
  const bodyEnd = layout.body.yEnd;

  // Calculate paragraph layouts (handle both string[] and object[] formats)
  const paragraphs: Array<{ paragraphIndex: number; yStart: number; estimatedLines: number }> = [];
  const maxCharsPerLine = 85;
  const paragraphStrings = extractParagraphsAsStrings(userData.bodyParagraphs);

  let currentY = bodyContentStart;
  paragraphStrings.forEach((p, i) => {
    const lineCount = estimateLineCount(p, maxCharsPerLine);
    paragraphs.push({
      paragraphIndex: i,
      yStart: currentY,
      estimatedLines: lineCount,
    });
    currentY += (lineCount * LETTERHEAD_SPACING.lineHeight) + LETTERHEAD_SPACING.paragraphGap;
  });

  // Signature section
  const closingStart = Math.max(currentY + 0.02, layout.signature.yStart);
  const signatureStart = closingStart + LETTERHEAD_SPACING.signatureGap;
  const signatureEnd = layout.signature.yEnd;

  // Footer
  const footerStart = layout.footer.yStart;
  const footerEnd = layout.footer.yEnd;

  return {
    header: { yStart: headerStart, yEnd: headerEnd },
    date: { yStart: dateStart },
    recipient: { yStart: recipientStart, yEnd: recipientEnd, lineCount: recipientLines },
    salutation: { yStart: salutationStart },
    paragraphs,
    closing: { yStart: closingStart },
    signature: { yStart: signatureStart, yEnd: signatureEnd },
    footer: { yStart: footerStart, yEnd: footerEnd },
    paragraphGap: LETTERHEAD_SPACING.paragraphGap,
  };
}

function generateLetterheadLayoutDocumentation(
  layout: LetterheadDynamicLayoutResult,
  style: LetterheadStyle
): string {
  const paragraphsDoc = layout.paragraphs.map((p, i) =>
    `  - Paragraph ${i + 1}: Y ${p.yStart.toFixed(3)}, ~${p.estimatedLines} lines`
  ).join('\n');

  return `### SECTION POSITIONS (Pre-calculated)

HEADER: Y ${layout.header.yStart.toFixed(3)} to ${layout.header.yEnd.toFixed(3)}
DATE: Y ${layout.date.yStart.toFixed(3)}
RECIPIENT: Y ${layout.recipient.yStart.toFixed(3)} to ${layout.recipient.yEnd.toFixed(3)} (${layout.recipient.lineCount} lines)
SALUTATION: Y ${layout.salutation.yStart.toFixed(3)}

BODY PARAGRAPHS (line increment: 0.022, gap between: ${layout.paragraphGap}):
${paragraphsDoc}

CLOSING: Y ${layout.closing.yStart.toFixed(3)}
SIGNATURE: Y ${layout.signature.yStart.toFixed(3)} to ${layout.signature.yEnd.toFixed(3)}
FOOTER: Y ${layout.footer.yStart.toFixed(3)} to ${layout.footer.yEnd.toFixed(3)}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getLetterheadLayoutSpec(style: LetterheadStyle): LetterheadLayoutSpec {
  return LETTERHEAD_LAYOUT_SPECS[style];
}

/**
 * Validate letterhead input data before generation
 */
export function validateLetterheadInput(userData: LetterheadInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.companyName?.trim()) errors.push('Company/Sender name is required');
  if (!userData.recipientName?.trim()) errors.push('Recipient name is required');
  if (!userData.salutation?.trim()) errors.push('Salutation is required');
  if (userData.bodyParagraphs.length === 0) errors.push('At least one paragraph is required');
  // Handle both string[] and object[] formats for bodyParagraphs
  const paragraphStrings = extractParagraphsAsStrings(userData.bodyParagraphs);
  paragraphStrings.forEach((p, i) => {
    if (!p?.trim()) errors.push(`Paragraph ${i + 1} is empty`);
  });
  if (!userData.closing?.trim()) errors.push('Closing is required');
  if (!userData.senderName?.trim()) errors.push('Sender name is required');

  return { valid: errors.length === 0, errors };
}
