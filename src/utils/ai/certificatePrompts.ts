/**
 * Certificate-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for certificate layouts
 */

import type { CertificateInputData, CertificateStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface CertificateSectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number;
  textAlign?: 'left' | 'center' | 'right';
}

export interface CertificateLayoutSpec {
  border: { margin: number; strokeWidth: number };
  header: { yStart: number; yEnd: number };
  title: { yStart: number; yEnd: number };
  presentation: { yStart: number; yEnd: number };
  recipient: { yStart: number; yEnd: number };
  achievement: { yStart: number; yEnd: number };
  date: { yStart: number; yEnd: number };
  signatures: { yStart: number; yEnd: number };
  sectionBounds: CertificateSectionBounds[];
  primaryColor: string;
  accentColor: string;
  borderColor: string;
}

export const CERTIFICATE_LAYOUT_SPECS: Record<CertificateStyle, CertificateLayoutSpec> = {
  achievement: {
    border: { margin: 0.05, strokeWidth: 3 },
    header: { yStart: 0.10, yEnd: 0.16 },
    title: { yStart: 0.20, yEnd: 0.32 },
    presentation: { yStart: 0.38, yEnd: 0.42 },
    recipient: { yStart: 0.44, yEnd: 0.54 },
    achievement: { yStart: 0.56, yEnd: 0.68 },
    date: { yStart: 0.70, yEnd: 0.74 },
    signatures: { yStart: 0.78, yEnd: 0.90 },
    primaryColor: '#1e3a5f',
    accentColor: '#b8860b',
    borderColor: '#b8860b',
    sectionBounds: [
      { name: 'organization', xStart: 0.10, xEnd: 0.90, yStart: 0.10, yEnd: 0.16, textColor: '#1e3a5f', maxCharsPerLine: 60, zIndexBase: 10, textAlign: 'center' },
      { name: 'title', xStart: 0.10, xEnd: 0.90, yStart: 0.20, yEnd: 0.32, textColor: '#1e3a5f', maxCharsPerLine: 40, zIndexBase: 15, textAlign: 'center' },
      { name: 'presentation', xStart: 0.10, xEnd: 0.90, yStart: 0.38, yEnd: 0.42, textColor: '#64748b', maxCharsPerLine: 60, zIndexBase: 10, textAlign: 'center' },
      { name: 'recipient', xStart: 0.10, xEnd: 0.90, yStart: 0.44, yEnd: 0.54, textColor: '#1e3a5f', maxCharsPerLine: 40, zIndexBase: 15, textAlign: 'center' },
      { name: 'achievement', xStart: 0.15, xEnd: 0.85, yStart: 0.56, yEnd: 0.68, textColor: '#374151', maxCharsPerLine: 55, zIndexBase: 10, textAlign: 'center' },
      { name: 'date', xStart: 0.10, xEnd: 0.90, yStart: 0.70, yEnd: 0.74, textColor: '#64748b', maxCharsPerLine: 40, zIndexBase: 10, textAlign: 'center' },
      { name: 'signatures', xStart: 0.10, xEnd: 0.90, yStart: 0.78, yEnd: 0.90, textColor: '#64748b', maxCharsPerLine: 30, zIndexBase: 10, textAlign: 'center' },
    ],
  },
  completion: {
    border: { margin: 0.04, strokeWidth: 2 },
    header: { yStart: 0.08, yEnd: 0.14 },
    title: { yStart: 0.18, yEnd: 0.28 },
    presentation: { yStart: 0.34, yEnd: 0.38 },
    recipient: { yStart: 0.40, yEnd: 0.50 },
    achievement: { yStart: 0.54, yEnd: 0.68 },
    date: { yStart: 0.72, yEnd: 0.76 },
    signatures: { yStart: 0.80, yEnd: 0.92 },
    primaryColor: '#065f46',
    accentColor: '#10b981',
    borderColor: '#10b981',
    sectionBounds: [
      { name: 'organization', xStart: 0.08, xEnd: 0.92, yStart: 0.08, yEnd: 0.14, textColor: '#065f46', maxCharsPerLine: 65, zIndexBase: 10, textAlign: 'center' },
      { name: 'title', xStart: 0.08, xEnd: 0.92, yStart: 0.18, yEnd: 0.28, textColor: '#065f46', maxCharsPerLine: 50, zIndexBase: 15, textAlign: 'center' },
      { name: 'presentation', xStart: 0.08, xEnd: 0.92, yStart: 0.34, yEnd: 0.38, textColor: '#6b7280', maxCharsPerLine: 65, zIndexBase: 10, textAlign: 'center' },
      { name: 'recipient', xStart: 0.08, xEnd: 0.92, yStart: 0.40, yEnd: 0.50, textColor: '#065f46', maxCharsPerLine: 45, zIndexBase: 15, textAlign: 'center' },
      { name: 'achievement', xStart: 0.12, xEnd: 0.88, yStart: 0.54, yEnd: 0.68, textColor: '#374151', maxCharsPerLine: 60, zIndexBase: 10, textAlign: 'center' },
      { name: 'date', xStart: 0.08, xEnd: 0.92, yStart: 0.72, yEnd: 0.76, textColor: '#6b7280', maxCharsPerLine: 45, zIndexBase: 10, textAlign: 'center' },
      { name: 'signatures', xStart: 0.08, xEnd: 0.92, yStart: 0.80, yEnd: 0.92, textColor: '#6b7280', maxCharsPerLine: 35, zIndexBase: 10, textAlign: 'center' },
    ],
  },
  award: {
    border: { margin: 0.06, strokeWidth: 4 },
    header: { yStart: 0.12, yEnd: 0.18 },
    title: { yStart: 0.22, yEnd: 0.34 },
    presentation: { yStart: 0.40, yEnd: 0.44 },
    recipient: { yStart: 0.46, yEnd: 0.56 },
    achievement: { yStart: 0.58, yEnd: 0.70 },
    date: { yStart: 0.72, yEnd: 0.76 },
    signatures: { yStart: 0.80, yEnd: 0.92 },
    primaryColor: '#7c2d12',
    accentColor: '#dc2626',
    borderColor: '#dc2626',
    sectionBounds: [
      { name: 'organization', xStart: 0.12, xEnd: 0.88, yStart: 0.12, yEnd: 0.18, textColor: '#7c2d12', maxCharsPerLine: 55, zIndexBase: 10, textAlign: 'center' },
      { name: 'title', xStart: 0.12, xEnd: 0.88, yStart: 0.22, yEnd: 0.34, textColor: '#7c2d12', maxCharsPerLine: 35, zIndexBase: 15, textAlign: 'center' },
      { name: 'presentation', xStart: 0.12, xEnd: 0.88, yStart: 0.40, yEnd: 0.44, textColor: '#78716c', maxCharsPerLine: 55, zIndexBase: 10, textAlign: 'center' },
      { name: 'recipient', xStart: 0.12, xEnd: 0.88, yStart: 0.46, yEnd: 0.56, textColor: '#7c2d12', maxCharsPerLine: 40, zIndexBase: 15, textAlign: 'center' },
      { name: 'achievement', xStart: 0.15, xEnd: 0.85, yStart: 0.58, yEnd: 0.70, textColor: '#44403c', maxCharsPerLine: 50, zIndexBase: 10, textAlign: 'center' },
      { name: 'date', xStart: 0.12, xEnd: 0.88, yStart: 0.72, yEnd: 0.76, textColor: '#78716c', maxCharsPerLine: 40, zIndexBase: 10, textAlign: 'center' },
      { name: 'signatures', xStart: 0.12, xEnd: 0.88, yStart: 0.80, yEnd: 0.92, textColor: '#78716c', maxCharsPerLine: 30, zIndexBase: 10, textAlign: 'center' },
    ],
  },
};

// ============================================================================
// System Prompt for Certificate Generation
// ============================================================================

export function buildCertificateSystemPrompt(style: CertificateStyle, definition: GenericAITemplateDefinition): string {
  const layout = CERTIFICATE_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), align: ${section.textAlign}, maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a certificate layout generator for a PDF editor. Generate JSON output with textItems and shapes.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width x ${CANVAS_HEIGHT}px height (A4 page ratio)
- Coordinates are NORMALIZED (0.0 to 1.0):
  - xNorm=0.0 is left edge, xNorm=1.0 is right edge
  - yNormTop=0.0 is top edge, yNormTop=1.0 is bottom edge

## Z-INDEX LAYERING SYSTEM
Every textItem and shape MUST have a zIndex property.

Z-INDEX GUIDELINES:
- Border rectangles: zIndex: 0
- Decorative lines: zIndex: 3
- Body text: zIndex: 10
- Title text: zIndex: 15
- Recipient name: zIndex: 20

## CERTIFICATE SECTIONS - ALL CENTERED
${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

## EVEN DISTRIBUTION PRINCIPLE
Certificate content is vertically centered and evenly distributed:
1. ORGANIZATION - Top area
2. TITLE - Main certificate title
3. PRESENTATION TEXT - "Presented to" etc.
4. RECIPIENT NAME - Prominent, large
5. ACHIEVEMENT - What was achieved
6. DATE - When awarded
7. SIGNATURES - Bottom area with signature lines

## LAYOUT SPECIFICATIONS

### DECORATIVE BORDER
- Outer border: Rectangle at margin ${layout.border.margin}, strokeWidth: ${layout.border.strokeWidth}
- Inner border: Optional, slightly inset
- Border color: ${layout.borderColor}
- Both borders zIndex: 0

### ORGANIZATION (Y: ${layout.header.yStart} to ${layout.header.yEnd})
- Organization name: Medium font (${typography.subheadingSize}px)
- Centered horizontally at xNorm: 0.50
- Color: ${layout.primaryColor}

### TITLE (Y: ${layout.title.yStart} to ${layout.title.yEnd})
- "CERTIFICATE": Very large (${typography.titleSize + 10}px)
- Subtitle (e.g., "OF ACHIEVEMENT"): Medium (${typography.headingSize}px)
- Color: ${layout.primaryColor} for main, ${layout.accentColor} for subtitle

### PRESENTATION TEXT (Y: ${layout.presentation.yStart} to ${layout.presentation.yEnd})
- "This certificate is proudly presented to": Small italic style
- Color: #64748b (muted)

### RECIPIENT NAME (Y: ${layout.recipient.yStart} to ${layout.recipient.yEnd})
- Recipient's name: Large (${typography.titleSize}px)
- Color: ${layout.primaryColor}
- Underline decoration optional

### ACHIEVEMENT (Y: ${layout.achievement.yStart} to ${layout.achievement.yEnd})
- "in recognition of" text: Small, muted
- Achievement description: Medium font
- Wrap if longer than max chars

### DATE (Y: ${layout.date.yStart} to ${layout.date.yEnd})
- Date: Small font, muted color

### SIGNATURES (Y: ${layout.signatures.yStart} to ${layout.signatures.yEnd})
- Signature lines: Horizontal lines for signing
- Name below line: Small font
- Title below name: Smaller, muted
- Evenly distributed horizontally based on count

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Accent: ${colorScheme.accent}
- Border: ${layout.borderColor}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Main title: ${typography.titleSize + 10}px
- Subtitle: ${typography.headingSize}px
- Recipient name: ${typography.titleSize}px
- Body text: ${typography.bodySize}px
- Small text: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## TEXT CENTERING
All text on certificates is CENTERED:
- Calculate text position at xNorm: 0.50
- Text will be centered around this point

## JSON OUTPUT FORMAT
Output ONLY valid JSON:
{
  "textItems": [
    {"text": "...", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "fontSize": 8-48, "color": "#hex", "fontFamily": "Lato", "zIndex": 0-20}
  ],
  "shapes": [
    {"type": "rectangle|line", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "widthNorm": 0.0-1.0, "heightNorm": 0.0-1.0, "strokeColor": "#hex", "strokeWidth": 0-5, "fillColor": "#hex|null", "zIndex": 0-20}
  ]
}

## SIGNATURE LINES
Horizontal lines for signatures:
- type: "line"
- heightNorm: 0.0 (horizontal)
- widthNorm: ~0.20 each
- Evenly spaced based on signature count

## KEY RULES
1. OUTPUT ONLY VALID JSON
2. EVERY item MUST have zIndex
3. ALL text centered at xNorm: 0.50
4. Borders zIndex: 0, text zIndex: 10+
5. Elegant, formal appearance
6. Signature lines evenly distributed`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildCertificateUserPrompt(
  userData: CertificateInputData,
  style: CertificateStyle,
  definition: GenericAITemplateDefinition
): string {
  const layout = CERTIFICATE_LAYOUT_SPECS[style];
  const dynamicLayout = calculateCertificateDynamicLayout(userData);

  // Format signatures
  const signaturesText = userData.signatures.map((sig, i) =>
    `${i + 1}. ${sig.name} - ${sig.title}`
  ).join('\n');

  return `Generate a complete ${style.toUpperCase()} style certificate layout with the following data.

## ORGANIZATION
- Name: ${userData.organizationName}

## CERTIFICATE DETAILS
- Title: ${userData.certificateTitle}
${userData.certificateSubtitle ? `- Subtitle: ${userData.certificateSubtitle}` : ''}

## PRESENTATION
- Text: ${userData.presentationText}

## RECIPIENT
- Name: ${userData.recipientName}

## ACHIEVEMENT
- Main Text: ${userData.achievementText}
${userData.achievementDescription ? `- Description: ${userData.achievementDescription}` : ''}

## DATE
- Date: ${userData.date}
${userData.validUntil ? `- Valid Until: ${userData.validUntil}` : ''}

## SIGNATURES (${userData.signatures.length})
${signaturesText}

${userData.certificateNumber ? `## CERTIFICATE NUMBER: ${userData.certificateNumber}` : ''}

## CALCULATED LAYOUT POSITIONS
${generateCertificateLayoutDocumentation(dynamicLayout)}

## VISUAL ELEMENTS TO INCLUDE
1. Double border (outer ${layout.borderColor}, inner ${layout.primaryColor})
   - Outer: margin ${layout.border.margin}, strokeWidth: ${layout.border.strokeWidth}
   - Inner: margin ${layout.border.margin + 0.02}, strokeWidth: 1
2. Decorative line under recipient name (accent color)
3. Signature lines for each signatory

## SIGNATURE LAYOUT
${userData.signatures.length === 1 ?
  '- Single signature: Centered at xNorm 0.50' :
  userData.signatures.length === 2 ?
  '- Two signatures: Left at xNorm 0.25, Right at xNorm 0.75' :
  '- Three+ signatures: Evenly distributed across width'
}

## STYLE-SPECIFIC NOTES
${style === 'achievement' ? `
- Gold/bronze accent colors
- Elegant, formal design
- Bold borders
` : style === 'completion' ? `
- Green accent for success/completion
- Clean, professional look
- Moderate borders
` : `
- Red/burgundy for prestigious awards
- Strong, impactful design
- Prominent borders
`}

## CRITICAL REMINDERS
1. EVERY textItem and shape MUST have zIndex
2. ALL text centered at xNorm: 0.50
3. Borders at zIndex: 0
4. All horizontal lines: heightNorm = 0.0
5. Wrap long achievement text if needed
6. Signature lines evenly distributed

Generate the complete JSON with all textItems and shapes for this certificate.`;
}

// ============================================================================
// Dynamic Layout Calculator
// ============================================================================

interface CertificateDynamicLayoutResult {
  border: { outer: { x: number; y: number; w: number; h: number }; inner: { x: number; y: number; w: number; h: number } };
  organization: { y: number };
  title: { y: number; subtitleY?: number };
  presentation: { y: number };
  recipient: { y: number; underlineY: number };
  achievement: { y: number; descriptionY?: number };
  date: { y: number };
  signatures: Array<{ x: number; lineY: number; nameY: number; titleY: number }>;
}

export function calculateCertificateDynamicLayout(userData: CertificateInputData): CertificateDynamicLayoutResult {
  const style: CertificateStyle = 'achievement';
  const layout = CERTIFICATE_LAYOUT_SPECS[style];

  // Border calculations
  const outerMargin = layout.border.margin;
  const innerMargin = outerMargin + 0.02;

  // Section Y positions (centered within their ranges)
  const organizationY = (layout.header.yStart + layout.header.yEnd) / 2;
  const titleY = layout.title.yStart + 0.03;
  const subtitleY = layout.title.yEnd - 0.03;
  const presentationY = (layout.presentation.yStart + layout.presentation.yEnd) / 2;
  const recipientY = (layout.recipient.yStart + layout.recipient.yEnd) / 2;
  const recipientUnderlineY = recipientY + 0.04;
  const achievementY = layout.achievement.yStart + 0.03;
  const descriptionY = userData.achievementDescription ? achievementY + 0.05 : undefined;
  const dateY = (layout.date.yStart + layout.date.yEnd) / 2;

  // Signature positions
  const signatureCount = userData.signatures.length;
  const signaturesStartX = 0.15;
  const signaturesEndX = 0.85;
  const signatureSpacing = (signaturesEndX - signaturesStartX) / Math.max(signatureCount, 1);

  const signatures = userData.signatures.map((sig, i) => {
    const x = signatureCount === 1 ? 0.50 :
              signatureCount === 2 ? (i === 0 ? 0.25 : 0.75) :
              signaturesStartX + (signatureSpacing * (i + 0.5));
    return {
      x,
      lineY: layout.signatures.yStart + 0.04,
      nameY: layout.signatures.yStart + 0.07,
      titleY: layout.signatures.yStart + 0.10,
    };
  });

  return {
    border: {
      outer: { x: outerMargin, y: outerMargin, w: 1 - (outerMargin * 2), h: 1 - (outerMargin * 2) },
      inner: { x: innerMargin, y: innerMargin, w: 1 - (innerMargin * 2), h: 1 - (innerMargin * 2) },
    },
    organization: { y: organizationY },
    title: { y: titleY, subtitleY: userData.certificateSubtitle ? subtitleY : undefined },
    presentation: { y: presentationY },
    recipient: { y: recipientY, underlineY: recipientUnderlineY },
    achievement: { y: achievementY, descriptionY },
    date: { y: dateY },
    signatures,
  };
}

function generateCertificateLayoutDocumentation(layout: CertificateDynamicLayoutResult): string {
  const signaturesDoc = layout.signatures.map((sig, i) =>
    `  Signature ${i + 1}: X ${sig.x.toFixed(2)}, Line Y: ${sig.lineY.toFixed(3)}, Name Y: ${sig.nameY.toFixed(3)}`
  ).join('\n');

  return `
### BORDER POSITIONS
- Outer: X ${layout.border.outer.x.toFixed(2)}, Y ${layout.border.outer.y.toFixed(2)}, W ${layout.border.outer.w.toFixed(2)}, H ${layout.border.outer.h.toFixed(2)}
- Inner: X ${layout.border.inner.x.toFixed(2)}, Y ${layout.border.inner.y.toFixed(2)}, W ${layout.border.inner.w.toFixed(2)}, H ${layout.border.inner.h.toFixed(2)}

### TEXT POSITIONS (all centered at X: 0.50)
- Organization: Y ${layout.organization.y.toFixed(3)}
- Title: Y ${layout.title.y.toFixed(3)}${layout.title.subtitleY ? `, Subtitle Y: ${layout.title.subtitleY.toFixed(3)}` : ''}
- Presentation: Y ${layout.presentation.y.toFixed(3)}
- Recipient: Y ${layout.recipient.y.toFixed(3)}, Underline Y: ${layout.recipient.underlineY.toFixed(3)}
- Achievement: Y ${layout.achievement.y.toFixed(3)}${layout.achievement.descriptionY ? `, Description Y: ${layout.achievement.descriptionY.toFixed(3)}` : ''}
- Date: Y ${layout.date.y.toFixed(3)}

### SIGNATURE POSITIONS
${signaturesDoc}
`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getCertificateLayoutSpec(style: CertificateStyle): CertificateLayoutSpec {
  return CERTIFICATE_LAYOUT_SPECS[style];
}
