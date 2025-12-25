/**
 * Cover Letter-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for cover letter layouts
 */

import type { CoverLetterInputData, CoverLetterStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface CoverLetterSectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number;
}

export interface CoverLetterLayoutSpec {
  header: { yStart: number; yEnd: number };
  recipient: { yStart: number; yEnd: number };
  body: { yStart: number; yEnd: number };
  signature: { yStart: number; yEnd: number };
  sectionBounds: CoverLetterSectionBounds[];
  primaryColor: string;
  accentColor: string;
  hasAccentBar: boolean;
}

export const COVER_LETTER_LAYOUT_SPECS: Record<CoverLetterStyle, CoverLetterLayoutSpec> = {
  professional: {
    header: { yStart: 0.04, yEnd: 0.14 },
    recipient: { yStart: 0.16, yEnd: 0.28 },
    body: { yStart: 0.32, yEnd: 0.82 },
    signature: { yStart: 0.84, yEnd: 0.95 },
    primaryColor: '#1e293b',
    accentColor: '#0ea5e9',
    hasAccentBar: false,
    sectionBounds: [
      { name: 'name', xStart: 0.05, xEnd: 0.95, yStart: 0.04, yEnd: 0.08, textColor: '#1e293b', maxCharsPerLine: 80, zIndexBase: 15 },
      { name: 'contact', xStart: 0.05, xEnd: 0.95, yStart: 0.09, yEnd: 0.12, textColor: '#64748b', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'date', xStart: 0.05, xEnd: 0.50, yStart: 0.16, yEnd: 0.18, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'recipient', xStart: 0.05, xEnd: 0.60, yStart: 0.20, yEnd: 0.28, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'body', xStart: 0.05, xEnd: 0.95, yStart: 0.32, yEnd: 0.82, textColor: '#374151', maxCharsPerLine: 85, zIndexBase: 10 },
      { name: 'closing', xStart: 0.05, xEnd: 0.50, yStart: 0.84, yEnd: 0.88, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'signature', xStart: 0.05, xEnd: 0.50, yStart: 0.90, yEnd: 0.95, textColor: '#1e293b', maxCharsPerLine: 40, zIndexBase: 15 },
    ],
  },
  creative: {
    header: { yStart: 0.03, yEnd: 0.18 },
    recipient: { yStart: 0.20, yEnd: 0.30 },
    body: { yStart: 0.34, yEnd: 0.84 },
    signature: { yStart: 0.86, yEnd: 0.96 },
    primaryColor: '#7c3aed',
    accentColor: '#a78bfa',
    hasAccentBar: true,
    sectionBounds: [
      { name: 'accent_bar', xStart: 0, xEnd: 0.03, yStart: 0, yEnd: 1, textColor: '#7c3aed', maxCharsPerLine: 0, zIndexBase: 0 },
      { name: 'name', xStart: 0.06, xEnd: 0.94, yStart: 0.04, yEnd: 0.10, textColor: '#7c3aed', maxCharsPerLine: 75, zIndexBase: 15 },
      { name: 'title', xStart: 0.06, xEnd: 0.94, yStart: 0.11, yEnd: 0.14, textColor: '#6b7280', maxCharsPerLine: 75, zIndexBase: 10 },
      { name: 'contact', xStart: 0.06, xEnd: 0.94, yStart: 0.15, yEnd: 0.18, textColor: '#64748b', maxCharsPerLine: 75, zIndexBase: 10 },
      { name: 'date', xStart: 0.06, xEnd: 0.50, yStart: 0.20, yEnd: 0.22, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'recipient', xStart: 0.06, xEnd: 0.60, yStart: 0.24, yEnd: 0.30, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'body', xStart: 0.06, xEnd: 0.94, yStart: 0.34, yEnd: 0.84, textColor: '#374151', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'closing', xStart: 0.06, xEnd: 0.50, yStart: 0.86, yEnd: 0.90, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'signature', xStart: 0.06, xEnd: 0.50, yStart: 0.92, yEnd: 0.96, textColor: '#7c3aed', maxCharsPerLine: 40, zIndexBase: 15 },
    ],
  },
  'entry-level': {
    header: { yStart: 0.04, yEnd: 0.12 },
    recipient: { yStart: 0.14, yEnd: 0.26 },
    body: { yStart: 0.30, yEnd: 0.84 },
    signature: { yStart: 0.86, yEnd: 0.96 },
    primaryColor: '#0f766e',
    accentColor: '#14b8a6',
    hasAccentBar: false,
    sectionBounds: [
      { name: 'name', xStart: 0.05, xEnd: 0.95, yStart: 0.04, yEnd: 0.08, textColor: '#0f766e', maxCharsPerLine: 80, zIndexBase: 15 },
      { name: 'contact', xStart: 0.05, xEnd: 0.95, yStart: 0.09, yEnd: 0.12, textColor: '#64748b', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'date', xStart: 0.05, xEnd: 0.50, yStart: 0.14, yEnd: 0.16, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'recipient', xStart: 0.05, xEnd: 0.60, yStart: 0.18, yEnd: 0.26, textColor: '#374151', maxCharsPerLine: 50, zIndexBase: 10 },
      { name: 'body', xStart: 0.05, xEnd: 0.95, yStart: 0.30, yEnd: 0.84, textColor: '#374151', maxCharsPerLine: 85, zIndexBase: 10 },
      { name: 'closing', xStart: 0.05, xEnd: 0.50, yStart: 0.86, yEnd: 0.90, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'signature', xStart: 0.05, xEnd: 0.50, yStart: 0.92, yEnd: 0.96, textColor: '#0f766e', maxCharsPerLine: 40, zIndexBase: 15 },
    ],
  },
};

// ============================================================================
// System Prompt for Cover Letter Generation
// ============================================================================

export function buildCoverLetterSystemPrompt(style: CoverLetterStyle, definition: GenericAITemplateDefinition): string {
  const layout = COVER_LETTER_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a cover letter layout generator for a PDF editor. Generate JSON output with textItems and shapes.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width x ${CANVAS_HEIGHT}px height (A4 page ratio)
- Coordinates are NORMALIZED (0.0 to 1.0):
  - xNorm=0.0 is left edge, xNorm=1.0 is right edge
  - yNormTop=0.0 is top edge, yNormTop=1.0 is bottom edge

## Z-INDEX LAYERING SYSTEM
Every textItem and shape MUST have a zIndex property.

Z-INDEX GUIDELINES:
- Accent bar/background: zIndex: 0
- Separator lines: zIndex: 5
- Body text: zIndex: 10
- Name/headers: zIndex: 15
- Highlighted text: zIndex: 20

## COVER LETTER SECTIONS
${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

## EVEN DISTRIBUTION PRINCIPLE
The cover letter body paragraphs are evenly distributed:
1. HEADER - Your name and contact info
2. DATE & RECIPIENT - Date and hiring manager info
3. BODY - Salutation + paragraphs (evenly spaced)
4. SIGNATURE - Closing and name

Body paragraphs are distributed evenly within the body section with consistent spacing.

## LAYOUT SPECIFICATIONS

### HEADER SECTION (Y: ${layout.header.yStart} to ${layout.header.yEnd})
- Your name: Large font (${typography.titleSize}px), color: ${layout.primaryColor}
- Contact info: Small font (${typography.smallSize}px), gray
- Format: Email | Phone ${style === 'creative' ? '| LinkedIn | Portfolio' : ''}
${layout.hasAccentBar ? '- Accent bar on left side (full height, 3% width)' : ''}

### DATE & RECIPIENT (Y: ${layout.recipient.yStart} to ${layout.recipient.yEnd})
- Date: Regular font, left-aligned
- Hiring manager name
- Title (if provided)
- Company name
- Address (if provided)

### BODY SECTION (Y: ${layout.body.yStart} to ${layout.body.yEnd})
- Salutation: "Dear [Hiring Manager],"
- Opening paragraph: Introduction and position interest
- Body paragraphs: Experience and qualifications (evenly distributed)
- Closing paragraph: Thank you and call to action

TEXT WRAPPING:
- Max ~85 characters per line
- Increment yNormTop by 0.022 per line
- Increment by 0.03 between paragraphs

### SIGNATURE (Y: ${layout.signature.yStart} to ${layout.signature.yEnd})
- Closing: "Sincerely," etc.
- Your name: Medium font, color: ${layout.primaryColor}

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Name: ${typography.titleSize}px
- Section headers: ${typography.headingSize}px
- Body text: ${typography.bodySize}px
- Small text: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## TEXT WRAPPING - CRITICAL
All paragraphs MUST be broken into multiple textItems:
- Max ~85 characters per line
- Each line is a separate textItem
- Increment yNormTop by 0.022 between lines
- Increment by 0.03 between paragraphs

EXAMPLE:
Input: "I am writing to express my strong interest in the Software Engineer position. With 5 years of experience..."
Output:
{"text": "I am writing to express my strong interest in the Software Engineer", "yNormTop": 0.35, ...}
{"text": "position. With 5 years of experience...", "yNormTop": 0.372, ...}

## JSON OUTPUT FORMAT
Output ONLY valid JSON:
{
  "textItems": [
    {"text": "...", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "fontSize": 8-28, "color": "#hex", "fontFamily": "Lato", "zIndex": 0-20}
  ],
  "shapes": [
    {"type": "rectangle|line", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "widthNorm": 0.0-1.0, "heightNorm": 0.0-1.0, "strokeColor": "#hex", "strokeWidth": 0-3, "fillColor": "#hex|null", "zIndex": 0-20}
  ]
}

## HORIZONTAL LINES
Separator lines: heightNorm: 0.0 for perfectly horizontal.

## KEY RULES
1. OUTPUT ONLY VALID JSON
2. EVERY item MUST have zIndex
3. WRAP ALL paragraphs into multiple textItems
4. Even spacing between paragraphs
5. Professional, clean layout
6. Contact info on single line with separators`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildCoverLetterUserPrompt(
  userData: CoverLetterInputData,
  style: CoverLetterStyle,
  definition: GenericAITemplateDefinition
): string {
  const layout = COVER_LETTER_LAYOUT_SPECS[style];
  const dynamicLayout = calculateCoverLetterDynamicLayout(userData);

  // Format body paragraphs
  const bodyParagraphsText = userData.bodyParagraphs.map((p, i) =>
    `Body Paragraph ${i + 1}: "${p}"`
  ).join('\n');

  return `Generate a complete ${style.toUpperCase()} style cover letter layout with the following data.

## YOUR INFORMATION
- Name: ${userData.yourName}
- Email: ${userData.yourEmail}
- Phone: ${userData.yourPhone}
${userData.yourAddress ? `- Address: ${userData.yourAddress}` : ''}
${userData.linkedIn ? `- LinkedIn: ${userData.linkedIn}` : ''}
${userData.portfolio ? `- Portfolio: ${userData.portfolio}` : ''}

## DATE
- ${userData.date}

## RECIPIENT INFORMATION
- Hiring Manager: ${userData.hiringManagerName}
${userData.hiringManagerTitle ? `- Title: ${userData.hiringManagerTitle}` : ''}
- Company: ${userData.companyName}
${userData.companyAddress ? `- Address: ${userData.companyAddress}` : ''}

## POSITION
- Applying for: ${userData.positionTitle}

## LETTER CONTENT

OPENING PARAGRAPH:
"${userData.openingParagraph}"

${bodyParagraphsText}

CLOSING PARAGRAPH:
"${userData.closingParagraph}"

## SIGNATURE
- Closing: ${userData.closing}
- Name: ${userData.yourName}

## CALCULATED LAYOUT POSITIONS
${generateCoverLetterLayoutDocumentation(dynamicLayout)}

## VISUAL ELEMENTS TO INCLUDE
${layout.hasAccentBar ? `
1. Accent bar on left side:
   - Rectangle: xNorm 0, yNormTop 0, widthNorm 0.03, heightNorm 1.0
   - Color: ${layout.primaryColor}
   - zIndex: 0
` : ''}
1. Header separator line after contact info (optional, light gray)
2. All text properly wrapped

## TEXT WRAPPING INSTRUCTIONS
CRITICAL: Each paragraph must be wrapped at ~85 characters:
- Opening paragraph: Split into multiple lines
- Each body paragraph: Split into multiple lines
- Closing paragraph: Split into multiple lines
- Increment yNormTop by 0.022 per line
- Gap of 0.03 between paragraphs

## STYLE-SPECIFIC NOTES
${style === 'professional' ? `
- Clean, traditional layout
- Subtle, professional colors
- Clear hierarchy
` : style === 'creative' ? `
- Bold accent bar on left
- More vibrant colors
- Slightly larger header
- Include LinkedIn/portfolio prominently
` : `
- Fresh, approachable design
- Teal/green accent colors
- Emphasizes enthusiasm and potential
- Clean and organized
`}

## CRITICAL REMINDERS
1. EVERY textItem and shape MUST have zIndex
2. WRAP ALL paragraphs - NO single long text items
3. All horizontal lines: heightNorm = 0.0
4. Even spacing between paragraphs
5. Contact info as single line with | separators
6. Salutation: "Dear ${userData.hiringManagerName},"

Generate the complete JSON with all textItems (properly wrapped) and shapes for this cover letter.`;
}

// ============================================================================
// Dynamic Layout Calculator
// ============================================================================

interface CoverLetterDynamicLayoutResult {
  header: { nameY: number; contactY: number };
  date: { y: number };
  recipient: { yStart: number; lines: number };
  salutation: { y: number };
  paragraphs: Array<{ paragraphIndex: number; yStart: number; estimatedLines: number; type: 'opening' | 'body' | 'closing' }>;
  closing: { y: number };
  signature: { y: number };
  lineSpacing: number;
  paragraphSpacing: number;
}

const COVER_LETTER_SPACING = {
  lineHeight: 0.022,
  paragraphGap: 0.03,
  sectionGap: 0.025,
};

function estimateLineCount(text: string, maxChars: number): number {
  if (!text) return 0;
  return Math.ceil(text.length / maxChars);
}

export function calculateCoverLetterDynamicLayout(userData: CoverLetterInputData): CoverLetterDynamicLayoutResult {
  const style: CoverLetterStyle = 'professional';
  const layout = COVER_LETTER_LAYOUT_SPECS[style];
  const maxCharsPerLine = 85;

  // Header positions
  const nameY = layout.header.yStart + 0.02;
  const contactY = nameY + 0.04;

  // Date position
  const dateY = layout.recipient.yStart;

  // Recipient
  const recipientStart = dateY + COVER_LETTER_SPACING.sectionGap;
  let recipientLines = 1; // Hiring manager name
  if (userData.hiringManagerTitle) recipientLines++;
  recipientLines++; // Company name
  if (userData.companyAddress) recipientLines++;

  // Body section
  const bodyStart = layout.body.yStart;
  const bodyEnd = layout.body.yEnd;
  const availableBodySpace = bodyEnd - bodyStart;

  // Salutation
  const salutationY = bodyStart;

  // Calculate all paragraphs
  const allParagraphs: Array<{ text: string; type: 'opening' | 'body' | 'closing' }> = [
    { text: userData.openingParagraph, type: 'opening' },
    ...userData.bodyParagraphs.map(p => ({ text: p, type: 'body' as const })),
    { text: userData.closingParagraph, type: 'closing' },
  ];

  // Estimate total content
  let totalLines = 0;
  const paragraphLineCounts = allParagraphs.map(p => estimateLineCount(p.text, maxCharsPerLine));
  paragraphLineCounts.forEach(count => totalLines += count);

  const totalContentHeight = (totalLines * COVER_LETTER_SPACING.lineHeight) +
    ((allParagraphs.length) * COVER_LETTER_SPACING.paragraphGap);

  // Distribute paragraphs
  const paragraphs: Array<{ paragraphIndex: number; yStart: number; estimatedLines: number; type: 'opening' | 'body' | 'closing' }> = [];

  // Start after salutation
  let currentY = salutationY + COVER_LETTER_SPACING.lineHeight + COVER_LETTER_SPACING.paragraphGap;

  allParagraphs.forEach((p, i) => {
    paragraphs.push({
      paragraphIndex: i,
      yStart: currentY,
      estimatedLines: paragraphLineCounts[i],
      type: p.type,
    });

    const paragraphHeight = (paragraphLineCounts[i] * COVER_LETTER_SPACING.lineHeight) + COVER_LETTER_SPACING.paragraphGap;
    currentY += paragraphHeight;
  });

  // Signature
  const closingY = layout.signature.yStart;
  const signatureY = closingY + 0.04;

  return {
    header: { nameY, contactY },
    date: { y: dateY },
    recipient: { yStart: recipientStart, lines: recipientLines },
    salutation: { y: salutationY },
    paragraphs,
    closing: { y: closingY },
    signature: { y: signatureY },
    lineSpacing: COVER_LETTER_SPACING.lineHeight,
    paragraphSpacing: COVER_LETTER_SPACING.paragraphGap,
  };
}

function generateCoverLetterLayoutDocumentation(layout: CoverLetterDynamicLayoutResult): string {
  const paragraphsDoc = layout.paragraphs.map((p, i) =>
    `  ${p.type.charAt(0).toUpperCase() + p.type.slice(1)} Paragraph ${p.type === 'body' ? (p.paragraphIndex) : ''}: Y ${p.yStart.toFixed(3)} (~${p.estimatedLines} lines)`
  ).join('\n');

  return `
### HEADER POSITIONS
- Name: Y ${layout.header.nameY.toFixed(3)}
- Contact info: Y ${layout.header.contactY.toFixed(3)}

### DATE & RECIPIENT
- Date: Y ${layout.date.y.toFixed(3)}
- Recipient starts: Y ${layout.recipient.yStart.toFixed(3)} (${layout.recipient.lines} lines)

### BODY CONTENT
- Salutation ("Dear..."): Y ${layout.salutation.y.toFixed(3)}

### PARAGRAPHS (line spacing: ${layout.lineSpacing}, paragraph gap: ${layout.paragraphSpacing})
${paragraphsDoc}

### SIGNATURE
- Closing ("Sincerely,"): Y ${layout.closing.y.toFixed(3)}
- Your name: Y ${layout.signature.y.toFixed(3)}
`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getCoverLetterLayoutSpec(style: CoverLetterStyle): CoverLetterLayoutSpec {
  return COVER_LETTER_LAYOUT_SPECS[style];
}
