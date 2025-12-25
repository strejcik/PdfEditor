/**
 * Label-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for label layouts
 */

import type { LabelInputData, LabelStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface LabelSectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number;
}

export interface LabelLayoutSpec {
  border: { margin: number; strokeWidth: number };
  fromSection: { yStart: number; yEnd: number };
  toSection: { yStart: number; yEnd: number };
  infoSection: { yStart: number; yEnd: number };
  sectionBounds: LabelSectionBounds[];
  primaryColor: string;
  accentColor: string;
  labelHeight: number; // Normalized height (labels are typically smaller than full page)
}

export const LABEL_LAYOUT_SPECS: Record<LabelStyle, LabelLayoutSpec> = {
  shipping: {
    border: { margin: 0.04, strokeWidth: 2 },
    fromSection: { yStart: 0.06, yEnd: 0.28 },
    toSection: { yStart: 0.32, yEnd: 0.58 },
    infoSection: { yStart: 0.62, yEnd: 0.74 },
    labelHeight: 0.75, // Use 75% of canvas height
    primaryColor: '#1f2937',
    accentColor: '#dc2626',
    sectionBounds: [
      { name: 'company', xStart: 0.06, xEnd: 0.94, yStart: 0.06, yEnd: 0.10, textColor: '#1f2937', maxCharsPerLine: 70, zIndexBase: 10 },
      { name: 'from_label', xStart: 0.06, xEnd: 0.25, yStart: 0.12, yEnd: 0.14, textColor: '#6b7280', maxCharsPerLine: 15, zIndexBase: 10 },
      { name: 'from_address', xStart: 0.06, xEnd: 0.94, yStart: 0.15, yEnd: 0.28, textColor: '#374151', maxCharsPerLine: 70, zIndexBase: 10 },
      { name: 'to_label', xStart: 0.06, xEnd: 0.25, yStart: 0.32, yEnd: 0.35, textColor: '#dc2626', maxCharsPerLine: 15, zIndexBase: 10 },
      { name: 'to_name', xStart: 0.06, xEnd: 0.94, yStart: 0.37, yEnd: 0.44, textColor: '#1f2937', maxCharsPerLine: 70, zIndexBase: 15 },
      { name: 'to_address', xStart: 0.06, xEnd: 0.94, yStart: 0.45, yEnd: 0.58, textColor: '#374151', maxCharsPerLine: 70, zIndexBase: 10 },
      { name: 'tracking', xStart: 0.06, xEnd: 0.55, yStart: 0.62, yEnd: 0.74, textColor: '#1f2937', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'weight', xStart: 0.60, xEnd: 0.94, yStart: 0.62, yEnd: 0.74, textColor: '#374151', maxCharsPerLine: 25, zIndexBase: 10 },
    ],
  },
  mailing: {
    border: { margin: 0.05, strokeWidth: 1 },
    fromSection: { yStart: 0.08, yEnd: 0.25 },
    toSection: { yStart: 0.35, yEnd: 0.65 },
    infoSection: { yStart: 0.70, yEnd: 0.78 },
    labelHeight: 0.80,
    primaryColor: '#1e3a5f',
    accentColor: '#0ea5e9',
    sectionBounds: [
      { name: 'from_name', xStart: 0.08, xEnd: 0.50, yStart: 0.08, yEnd: 0.12, textColor: '#1e3a5f', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'from_address', xStart: 0.08, xEnd: 0.50, yStart: 0.13, yEnd: 0.25, textColor: '#374151', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'to_name', xStart: 0.35, xEnd: 0.92, yStart: 0.35, yEnd: 0.45, textColor: '#1e3a5f', maxCharsPerLine: 45, zIndexBase: 15 },
      { name: 'to_address', xStart: 0.35, xEnd: 0.92, yStart: 0.47, yEnd: 0.65, textColor: '#374151', maxCharsPerLine: 45, zIndexBase: 10 },
      { name: 'postage_area', xStart: 0.75, xEnd: 0.92, yStart: 0.08, yEnd: 0.20, textColor: '#9ca3af', maxCharsPerLine: 12, zIndexBase: 5 },
    ],
  },
  product: {
    border: { margin: 0.03, strokeWidth: 1 },
    fromSection: { yStart: 0.05, yEnd: 0.35 }, // Product name area
    toSection: { yStart: 0.40, yEnd: 0.65 }, // Description area
    infoSection: { yStart: 0.70, yEnd: 0.95 }, // SKU, barcode, price area
    labelHeight: 0.70,
    primaryColor: '#111827',
    accentColor: '#6366f1',
    sectionBounds: [
      { name: 'product_name', xStart: 0.05, xEnd: 0.95, yStart: 0.05, yEnd: 0.20, textColor: '#111827', maxCharsPerLine: 75, zIndexBase: 15 },
      { name: 'product_desc', xStart: 0.05, xEnd: 0.95, yStart: 0.22, yEnd: 0.35, textColor: '#4b5563', maxCharsPerLine: 75, zIndexBase: 10 },
      { name: 'details', xStart: 0.05, xEnd: 0.60, yStart: 0.40, yEnd: 0.65, textColor: '#374151', maxCharsPerLine: 45, zIndexBase: 10 },
      { name: 'barcode_area', xStart: 0.65, xEnd: 0.95, yStart: 0.40, yEnd: 0.65, textColor: '#1f2937', maxCharsPerLine: 25, zIndexBase: 10 },
      { name: 'sku', xStart: 0.05, xEnd: 0.40, yStart: 0.70, yEnd: 0.80, textColor: '#6b7280', maxCharsPerLine: 25, zIndexBase: 10 },
      { name: 'price', xStart: 0.55, xEnd: 0.95, yStart: 0.70, yEnd: 0.95, textColor: '#111827', maxCharsPerLine: 30, zIndexBase: 15 },
    ],
  },
};

// ============================================================================
// System Prompt for Label Generation
// ============================================================================

export function buildLabelSystemPrompt(style: LabelStyle, definition: GenericAITemplateDefinition): string {
  const layout = LABEL_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a label layout generator for a PDF editor. Generate JSON output with textItems and shapes.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width x ${CANVAS_HEIGHT}px height
- Labels use portion of canvas: ${(layout.labelHeight * 100).toFixed(0)}% of height
- Coordinates are NORMALIZED (0.0 to 1.0)

## Z-INDEX LAYERING SYSTEM
Every textItem and shape MUST have a zIndex property.

Z-INDEX GUIDELINES:
- Border rectangle: zIndex: 0
- Separator lines: zIndex: 3
- Labels/small text: zIndex: 10
- Names/important text: zIndex: 15
- Priority badges: zIndex: 20

## LABEL SECTIONS
${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

## EVEN DISTRIBUTION PRINCIPLE
${style === 'shipping' ? `
Shipping label has 3 main sections evenly distributed:
1. FROM SECTION (Sender info) - Top 1/3
2. TO SECTION (Recipient info) - Middle 1/3 (larger, more prominent)
3. INFO SECTION (Tracking, weight) - Bottom 1/3
` : style === 'mailing' ? `
Mailing label has classic layout:
1. FROM (top-left corner, smaller)
2. TO (center-right, larger, more prominent)
3. POSTAGE AREA (top-right, placeholder)
` : `
Product label has 3 sections:
1. PRODUCT NAME/BRAND - Top, prominent
2. DESCRIPTION/DETAILS - Middle
3. SKU/BARCODE/PRICE - Bottom
`}

## LAYOUT SPECIFICATIONS

### BORDER
- Rectangle around entire label
- Margin: ${layout.border.margin} from edges
- Stroke width: ${layout.border.strokeWidth}
- Color: ${layout.primaryColor}
- zIndex: 0

${style === 'shipping' ? `
### FROM SECTION (Y: ${layout.fromSection.yStart} to ${layout.fromSection.yEnd})
- Company name: Medium font (${typography.subheadingSize}px)
- "SHIP FROM:" label: Small, gray
- Address: Regular font, multi-line

### TO SECTION (Y: ${layout.toSection.yStart} to ${layout.toSection.yEnd})
- Separator line above
- "SHIP TO:" label: Small, RED (${layout.accentColor})
- Recipient name: LARGE font (${typography.headingSize}px)
- Address: Regular font, multi-line

### INFO SECTION (Y: ${layout.infoSection.yStart} to ${layout.infoSection.yEnd})
- Separator line above
- "TRACKING #:" label + tracking number
- Weight on right side
` : style === 'mailing' ? `
### FROM SECTION (Y: ${layout.fromSection.yStart} to ${layout.fromSection.yEnd})
- Top-left positioning
- Smaller font for return address
- Name on first line, address below

### TO SECTION (Y: ${layout.toSection.yStart} to ${layout.toSection.yEnd})
- Center-right positioning
- Larger, more prominent
- Name prominent, address below

### POSTAGE AREA (top-right)
- Dashed rectangle placeholder
- "POSTAGE" or "STAMP" text
` : `
### PRODUCT NAME (Y: ${layout.fromSection.yStart} to ${layout.fromSection.yEnd})
- Large, bold product name
- Brand or category below (optional)

### DESCRIPTION (Y: ${layout.toSection.yStart} to ${layout.toSection.yEnd})
- Product details
- Features or specifications
- Barcode placeholder area (right side)

### PRICE/SKU (Y: ${layout.infoSection.yStart} to ${layout.infoSection.yEnd})
- SKU on left
- Large price on right, prominent
`}

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Large text: ${typography.headingSize}px
- Medium text: ${typography.subheadingSize}px
- Regular text: ${typography.bodySize}px
- Small text: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## TEXT WRAPPING
- Addresses should wrap at section boundaries
- Max chars per line defined per section
- Increment yNormTop by 0.025 per line

## JSON OUTPUT FORMAT
Output ONLY valid JSON:
{
  "textItems": [
    {"text": "...", "xNorm": 0.0-1.0, "yNormTop": 0.0-1.0, "fontSize": 8-20, "color": "#hex", "fontFamily": "Lato", "zIndex": 0-20}
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
3. Border rectangle zIndex: 0
4. Destination address more prominent than sender
5. All sections fit within label boundaries
6. Clean, readable design`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildLabelUserPrompt(
  userData: LabelInputData,
  style: LabelStyle,
  definition: GenericAITemplateDefinition
): string {
  const layout = LABEL_LAYOUT_SPECS[style];
  const dynamicLayout = calculateLabelDynamicLayout(userData, style);

  // Format addresses (replace newlines)
  const formatAddress = (addr: string) => addr.split('\n').join(' / ');

  return `Generate a complete ${style.toUpperCase()} style label layout with the following data.

${style === 'shipping' || style === 'mailing' ? `
## SENDER INFORMATION
${userData.companyName ? `- Company: ${userData.companyName}` : ''}
${userData.fromName ? `- From Name: ${userData.fromName}` : ''}
- From Address: ${formatAddress(userData.fromAddress)}

## RECIPIENT INFORMATION
- To Name: ${userData.toName}
- To Address: ${formatAddress(userData.toAddress)}
` : ''}

${style === 'shipping' ? `
## SHIPPING DETAILS
${userData.trackingNumber ? `- Tracking Number: ${userData.trackingNumber}` : ''}
${userData.weight ? `- Weight: ${userData.weight}` : ''}
${userData.shippingMethod ? `- Method: ${userData.shippingMethod}` : ''}
${userData.priority ? `- Priority: ${userData.priority.toUpperCase()}` : ''}
${userData.fragile ? '- FRAGILE: Yes' : ''}
` : ''}

${style === 'product' ? `
## PRODUCT INFORMATION
- Product Name: ${userData.productName || 'Product Name'}
${userData.productDescription ? `- Description: ${userData.productDescription}` : ''}
${userData.sku ? `- SKU: ${userData.sku}` : ''}
${userData.barcode ? `- Barcode: ${userData.barcode}` : ''}
${userData.price ? `- Price: ${userData.price}` : ''}
` : ''}

## CALCULATED LAYOUT POSITIONS
${generateLabelLayoutDocumentation(dynamicLayout, style)}

## VISUAL ELEMENTS TO INCLUDE
1. Border rectangle around label
   - Margin: ${layout.border.margin}
   - Stroke: ${layout.border.strokeWidth}px, color: ${layout.primaryColor}
${style === 'shipping' ? `
2. Separator line between FROM and TO sections
3. Separator line before tracking/weight section
4. "SHIP FROM:" and "SHIP TO:" labels
${userData.fragile ? '5. FRAGILE warning badge (red background)' : ''}
${userData.priority === 'express' || userData.priority === 'overnight' ? '5. Priority badge' : ''}
` : style === 'mailing' ? `
2. Postage placeholder box (dashed, top-right)
` : `
2. Separator line between sections
3. Barcode placeholder rectangle
4. Price with currency symbol
`}

## STYLE-SPECIFIC NOTES
${style === 'shipping' ? `
- "SHIP TO:" in RED for visibility
- Recipient name larger than sender
- Tracking number prominent
- Weight aligned right
` : style === 'mailing' ? `
- Return address smaller, top-left
- Destination address centered/right, larger
- Postage area clearly marked
` : `
- Product name most prominent
- Price large and visible
- SKU smaller, for reference
- Barcode area reserved
`}

## CRITICAL REMINDERS
1. EVERY textItem and shape MUST have zIndex
2. Border rectangle zIndex: 0
3. All horizontal lines: heightNorm = 0.0
4. Wrap addresses if too long
5. Keep within label boundaries (max Y: ${layout.labelHeight})

Generate the complete JSON with all textItems and shapes for this label.`;
}

// ============================================================================
// Dynamic Layout Calculator
// ============================================================================

interface LabelDynamicLayoutResult {
  border: { x: number; y: number; w: number; h: number };
  fromSection: { yStart: number; yEnd: number; lineCount: number };
  toSection: { yStart: number; yEnd: number; lineCount: number };
  infoSection: { yStart: number; yEnd: number };
  separatorLines: Array<{ y: number }>;
}

const LABEL_SPACING = {
  lineHeight: 0.025,
  sectionGap: 0.03,
  labelPadding: 0.02,
};

function countAddressLines(address: string): number {
  return address.split('\n').length;
}

export function calculateLabelDynamicLayout(userData: LabelInputData, style: LabelStyle): LabelDynamicLayoutResult {
  const layout = LABEL_LAYOUT_SPECS[style];

  // Border
  const border = {
    x: layout.border.margin,
    y: layout.border.margin,
    w: 1 - (layout.border.margin * 2),
    h: layout.labelHeight - (layout.border.margin * 2),
  };

  // Count address lines
  const fromLines = countAddressLines(userData.fromAddress);
  const toLines = countAddressLines(userData.toAddress);

  // Section positions from spec
  const fromSection = {
    yStart: layout.fromSection.yStart,
    yEnd: layout.fromSection.yEnd,
    lineCount: fromLines + 1, // +1 for label
  };

  const toSection = {
    yStart: layout.toSection.yStart,
    yEnd: layout.toSection.yEnd,
    lineCount: toLines + 1, // +1 for name
  };

  const infoSection = {
    yStart: layout.infoSection.yStart,
    yEnd: layout.infoSection.yEnd,
  };

  // Separator lines
  const separatorLines = [
    { y: layout.toSection.yStart - 0.02 }, // Before TO section
    { y: layout.infoSection.yStart - 0.02 }, // Before info section
  ];

  return {
    border,
    fromSection,
    toSection,
    infoSection,
    separatorLines,
  };
}

function generateLabelLayoutDocumentation(layout: LabelDynamicLayoutResult, style: LabelStyle): string {
  const separatorsDoc = layout.separatorLines.map((line, i) =>
    `  Line ${i + 1}: Y ${line.y.toFixed(3)}`
  ).join('\n');

  return `
### LABEL DIMENSIONS
- Border: X ${layout.border.x.toFixed(2)}, Y ${layout.border.y.toFixed(2)}, W ${layout.border.w.toFixed(2)}, H ${layout.border.h.toFixed(2)}

### SECTION POSITIONS
- FROM: Y ${layout.fromSection.yStart.toFixed(3)} to ${layout.fromSection.yEnd.toFixed(3)} (${layout.fromSection.lineCount} lines)
- TO: Y ${layout.toSection.yStart.toFixed(3)} to ${layout.toSection.yEnd.toFixed(3)} (${layout.toSection.lineCount} lines)
- INFO: Y ${layout.infoSection.yStart.toFixed(3)} to ${layout.infoSection.yEnd.toFixed(3)}

### SEPARATOR LINES
${separatorsDoc}

### LINE SPACING
- Between text lines: ${LABEL_SPACING.lineHeight}
- Between sections: ${LABEL_SPACING.sectionGap}
`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getLabelLayoutSpec(style: LabelStyle): LabelLayoutSpec {
  return LABEL_LAYOUT_SPECS[style];
}
