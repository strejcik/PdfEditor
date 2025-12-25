/**
 * Invoice-Specific Prompt Templates for Claude AI
 * Generates structured JSON output for professional invoice layouts
 */

import type { InvoiceInputData, InvoiceStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

// ============================================================================
// Layout Constraints by Style
// ============================================================================

export interface InvoiceSectionBounds {
  name: string;
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
  textColor: string;
  maxCharsPerLine: number;
  zIndexBase: number;
}

export interface InvoiceLayoutSpec {
  header: { yStart: number; yEnd: number };
  clientInfo: { yStart: number; yEnd: number };
  itemsTable: { yStart: number; yEnd: number };
  totals: { yStart: number; yEnd: number };
  footer: { yStart: number; yEnd: number };
  sectionBounds: InvoiceSectionBounds[];
  primaryColor: string;
  accentColor: string;
  tableColumns: {
    item: number;
    description: number;
    qty: number;
    rate: number;
    amount: number;
  };
}

export const INVOICE_LAYOUT_SPECS: Record<InvoiceStyle, InvoiceLayoutSpec> = {
  professional: {
    header: { yStart: 0.03, yEnd: 0.14 },
    clientInfo: { yStart: 0.16, yEnd: 0.28 },
    itemsTable: { yStart: 0.30, yEnd: 0.70 },
    totals: { yStart: 0.72, yEnd: 0.84 },
    footer: { yStart: 0.86, yEnd: 0.96 },
    primaryColor: '#0ea5e9',
    accentColor: '#0f172a',
    tableColumns: { item: 0.05, description: 0.12, qty: 0.55, rate: 0.68, amount: 0.84 },
    sectionBounds: [
      { name: 'company_info', xStart: 0.05, xEnd: 0.50, yStart: 0.03, yEnd: 0.12, textColor: '#0f172a', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'invoice_badge', xStart: 0.70, xEnd: 0.95, yStart: 0.03, yEnd: 0.08, textColor: '#ffffff', maxCharsPerLine: 20, zIndexBase: 20 },
      { name: 'invoice_info', xStart: 0.70, xEnd: 0.95, yStart: 0.08, yEnd: 0.14, textColor: '#475569', maxCharsPerLine: 25, zIndexBase: 10 },
      { name: 'bill_to', xStart: 0.05, xEnd: 0.45, yStart: 0.16, yEnd: 0.28, textColor: '#1e293b', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'ship_to', xStart: 0.55, xEnd: 0.95, yStart: 0.16, yEnd: 0.28, textColor: '#1e293b', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'items_header', xStart: 0.04, xEnd: 0.96, yStart: 0.30, yEnd: 0.34, textColor: '#ffffff', maxCharsPerLine: 80, zIndexBase: 15 },
      { name: 'items_body', xStart: 0.04, xEnd: 0.96, yStart: 0.35, yEnd: 0.70, textColor: '#334155', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'totals', xStart: 0.60, xEnd: 0.96, yStart: 0.72, yEnd: 0.84, textColor: '#0f172a', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.86, yEnd: 0.96, textColor: '#64748b', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
  basic: {
    header: { yStart: 0.03, yEnd: 0.12 },
    clientInfo: { yStart: 0.14, yEnd: 0.26 },
    itemsTable: { yStart: 0.28, yEnd: 0.70 },
    totals: { yStart: 0.72, yEnd: 0.84 },
    footer: { yStart: 0.86, yEnd: 0.96 },
    primaryColor: '#374151',
    accentColor: '#111827',
    tableColumns: { item: 0.05, description: 0.10, qty: 0.55, rate: 0.68, amount: 0.84 },
    sectionBounds: [
      { name: 'company_info', xStart: 0.05, xEnd: 0.50, yStart: 0.03, yEnd: 0.10, textColor: '#111827', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'invoice_info', xStart: 0.60, xEnd: 0.95, yStart: 0.03, yEnd: 0.12, textColor: '#4b5563', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'bill_to', xStart: 0.05, xEnd: 0.50, yStart: 0.14, yEnd: 0.26, textColor: '#374151', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'items_header', xStart: 0.05, xEnd: 0.95, yStart: 0.28, yEnd: 0.32, textColor: '#111827', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'items_body', xStart: 0.05, xEnd: 0.95, yStart: 0.33, yEnd: 0.70, textColor: '#374151', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'totals', xStart: 0.60, xEnd: 0.95, yStart: 0.72, yEnd: 0.84, textColor: '#111827', maxCharsPerLine: 30, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.86, yEnd: 0.96, textColor: '#6b7280', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
  freelancer: {
    header: { yStart: 0.03, yEnd: 0.16 },
    clientInfo: { yStart: 0.18, yEnd: 0.30 },
    itemsTable: { yStart: 0.32, yEnd: 0.70 },
    totals: { yStart: 0.72, yEnd: 0.86 },
    footer: { yStart: 0.88, yEnd: 0.97 },
    primaryColor: '#7c3aed',
    accentColor: '#1e1b4b',
    tableColumns: { item: 0.05, description: 0.12, qty: 0.52, rate: 0.66, amount: 0.84 },
    sectionBounds: [
      { name: 'freelancer_header', xStart: 0.05, xEnd: 0.55, yStart: 0.03, yEnd: 0.14, textColor: '#1e1b4b', maxCharsPerLine: 45, zIndexBase: 10 },
      { name: 'invoice_badge', xStart: 0.70, xEnd: 0.95, yStart: 0.03, yEnd: 0.08, textColor: '#ffffff', maxCharsPerLine: 20, zIndexBase: 20 },
      { name: 'invoice_info', xStart: 0.60, xEnd: 0.95, yStart: 0.08, yEnd: 0.16, textColor: '#4c1d95', maxCharsPerLine: 28, zIndexBase: 10 },
      { name: 'bill_to', xStart: 0.05, xEnd: 0.50, yStart: 0.18, yEnd: 0.30, textColor: '#1e1b4b', maxCharsPerLine: 40, zIndexBase: 10 },
      { name: 'project_info', xStart: 0.55, xEnd: 0.95, yStart: 0.18, yEnd: 0.30, textColor: '#4c1d95', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'items_header', xStart: 0.04, xEnd: 0.96, yStart: 0.32, yEnd: 0.36, textColor: '#ffffff', maxCharsPerLine: 80, zIndexBase: 15 },
      { name: 'items_body', xStart: 0.04, xEnd: 0.96, yStart: 0.37, yEnd: 0.70, textColor: '#374151', maxCharsPerLine: 80, zIndexBase: 10 },
      { name: 'totals', xStart: 0.55, xEnd: 0.96, yStart: 0.72, yEnd: 0.86, textColor: '#1e1b4b', maxCharsPerLine: 35, zIndexBase: 10 },
      { name: 'footer', xStart: 0.05, xEnd: 0.95, yStart: 0.88, yEnd: 0.97, textColor: '#6b7280', maxCharsPerLine: 80, zIndexBase: 10 },
    ],
  },
};

// ============================================================================
// System Prompt for Invoice Generation
// ============================================================================

export function buildInvoiceSystemPrompt(style: InvoiceStyle, definition: GenericAITemplateDefinition): string {
  const layout = INVOICE_LAYOUT_SPECS[style];
  const { colorScheme, typography } = definition;

  const sectionBoundsDoc = layout.sectionBounds.map(section =>
    `  - ${section.name}: X(${section.xStart.toFixed(2)}-${section.xEnd.toFixed(2)}), Y(${section.yStart.toFixed(2)}-${section.yEnd.toFixed(2)}), maxChars: ${section.maxCharsPerLine}, zIndex: ${section.zIndexBase}+`
  ).join('\n');

  return `You are a professional invoice layout generator for a PDF editor. Generate JSON output with textItems and shapes.

## CANVAS SPECIFICATIONS
- Canvas dimensions: ${CANVAS_WIDTH}px width × ${CANVAS_HEIGHT}px height (A4 page ratio)
- Coordinates are NORMALIZED (0.0 to 1.0):
  - xNorm=0.0 is left edge, xNorm=1.0 is right edge
  - yNormTop=0.0 is top edge, yNormTop=1.0 is bottom edge
- To convert normalized to pixels: pixelX = xNorm × ${CANVAS_WIDTH}, pixelY = yNormTop × ${CANVAS_HEIGHT}

## Z-INDEX LAYERING SYSTEM - CRITICAL
Every textItem and shape MUST have a zIndex property. Items with higher zIndex are drawn ON TOP of items with lower zIndex.

Z-INDEX GUIDELINES:
- Background shapes/accents: zIndex: 0
- Decorative elements: zIndex: 3
- Table row separator lines: zIndex: 4
- Table header background: zIndex: 5
- Regular text content: zIndex: 10
- Table header text: zIndex: 15
- Important elements (badge, total): zIndex: 20

## INVOICE SECTIONS WITH BOUNDARIES
${style.toUpperCase()} STYLE SECTIONS:
${sectionBoundsDoc}

## EVEN DISTRIBUTION PRINCIPLE
The invoice is divided into 5 main sections with EVEN spacing:
1. HEADER (Company/Freelancer info + Invoice badge) - Fixed at top
2. CLIENT INFO (Bill To + optional Ship To/Project) - Even height
3. ITEMS TABLE (Line items with header row) - Main content, expandable
4. TOTALS (Subtotal, Tax, Discount, Total Due) - Right-aligned
5. FOOTER (Payment terms, notes, thank you) - Fixed at bottom

## LAYOUT SPECIFICATIONS FOR ${style.toUpperCase()} STYLE

### HEADER SECTION (Y: ${layout.header.yStart} to ${layout.header.yEnd})
LEFT SIDE - Company/Freelancer Info:
- Name: Large font (${typography.titleSize}px), bold, color: ${colorScheme.textDark}
${style === 'freelancer' ? '- Title/Profession: Medium font, color: ' + layout.primaryColor : ''}
- Contact info stacked: Email, Phone, Address
- Font size: ${typography.smallSize}px, color: #64748b

RIGHT SIDE - Invoice Badge & Details:
${style !== 'basic' ? `- "INVOICE" badge with background rectangle
  - Background: ${layout.primaryColor}, rounded corners effect
  - Text: White (#ffffff), large font (28px), zIndex: 20
  - Badge rectangle: zIndex: 5` : '- "INVOICE" text large (28px), color: ' + layout.primaryColor}
- Invoice #: Below badge
- Date: Invoice date
- Due Date: Due date (use #dc2626 red if overdue context)

### CLIENT INFO SECTION (Y: ${layout.clientInfo.yStart} to ${layout.clientInfo.yEnd})
LEFT SIDE - Bill To:
- "BILL TO" label: Font ${typography.bodySize}px, color: ${layout.primaryColor}, uppercase
- Client Name: Font ${typography.subheadingSize}px, color: ${colorScheme.textDark}
- Client Email: Font ${typography.smallSize}px
- Client Address: Font ${typography.smallSize}px (wrap if needed)

${style === 'freelancer' ? `RIGHT SIDE - Project Info:
- "PROJECT" label: Color: ${layout.primaryColor}
- Project Name: Font ${typography.subheadingSize}px
- Hourly Rate: If provided
- Total Hours: Calculated from items` : style === 'professional' ? `RIGHT SIDE - Ship To (if different):
- "SHIP TO" label (optional)
- Shipping address if provided` : ''}

### ITEMS TABLE SECTION (Y: ${layout.itemsTable.yStart} to ${layout.itemsTable.yEnd})
This is the most important section. LINE ITEMS MUST be displayed correctly.

TABLE HEADER ROW:
- Background rectangle: xNorm: 0.04, widthNorm: 0.92, heightNorm: 0.035
- fillColor: ${layout.primaryColor}, strokeWidth: 0, zIndex: 5
- Column headers (zIndex: 15, color: #ffffff):
  - "#" at xNorm: ${layout.tableColumns.item}
  - "Description" at xNorm: ${layout.tableColumns.description}
  - "${style === 'freelancer' ? 'Hours' : 'Qty'}" at xNorm: ${layout.tableColumns.qty}
  - "Rate" at xNorm: ${layout.tableColumns.rate}
  - "Amount" at xNorm: ${layout.tableColumns.amount}

TABLE BODY ROWS:
- Each line item gets its own row
- Row height: Calculated based on number of items (typically 0.035-0.05 per row)
- Alternate row backgrounds: Optional light gray (#f8fafc) for even rows
- Row separator lines: Thin horizontal lines (#e2e8f0), heightNorm: 0.0, zIndex: 4

ROW DATA ALIGNMENT:
- Item #: Left-aligned at xNorm: ${layout.tableColumns.item}
- Description: Left-aligned at xNorm: ${layout.tableColumns.description} (wrap if > 40 chars)
- Qty/Hours: Right-aligned near xNorm: ${layout.tableColumns.qty + 0.08}
- Rate: Right-aligned near xNorm: ${layout.tableColumns.rate + 0.10}
- Amount: Right-aligned near xNorm: ${layout.tableColumns.amount + 0.10}

### TOTALS SECTION (Y: ${layout.totals.yStart} to ${layout.totals.yEnd})
RIGHT-ALIGNED layout with labels and values:
- Position labels at xNorm: ~0.65, values at xNorm: ~0.88
- Each total row: Increment Y by 0.028

ROWS TO DISPLAY:
1. "Subtotal:" | "$X,XXX.XX"
${style === 'freelancer' ? '2. "Total Hours:" | "XX hrs"' : ''}
2. "Tax (X%):" | "$XXX.XX"
3. ${style === 'freelancer' ? '"Discount:"' : '"Discount:"'} | "-$XX.XX" (if applicable)
4. Separator line: Horizontal line, ${layout.primaryColor}, zIndex: 5
5. "TOTAL DUE:" | "$X,XXX.XX" (Large font, ${layout.primaryColor}, zIndex: 20)

### FOOTER SECTION (Y: ${layout.footer.yStart} to ${layout.footer.yEnd})
- "Payment Terms" header: Color: ${layout.primaryColor}
- Payment details: Wrap text at 80 chars
- Bank details if provided
- Notes in italics if provided
- "Thank you for your business!" - Final line

## COLOR SCHEME
- Primary: ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

## TYPOGRAPHY
- Title: ${typography.titleSize}px
- Heading: ${typography.headingSize}px
- Subheading: ${typography.subheadingSize}px
- Body: ${typography.bodySize}px
- Small: ${typography.smallSize}px
- Font family: ${typography.fontFamily}

## TEXT WRAPPING RULES
- Company/Client addresses: Max 40 chars per line
- Description column: Max 40 chars, wrap to next line with Y increment 0.022
- Payment terms: Max 80 chars per line
- Notes: Max 80 chars per line

## CURRENCY FORMATTING
- Always include dollar sign: $
- Include decimal places: .00
- Use comma for thousands: $1,234.56
- Right-align all monetary values

## JSON OUTPUT FORMAT - CRITICAL
You MUST output ONLY a valid JSON object. No markdown, no explanation, no text before or after.
Start your response with { and end with }. Nothing else.

{
  "textItems": [
    {"text": "Company Name", "xNorm": 0.05, "yNormTop": 0.03, "fontSize": 24, "color": "#0f172a", "fontFamily": "Lato", "zIndex": 10}
  ],
  "shapes": [
    {"type": "rectangle", "xNorm": 0.04, "yNormTop": 0.30, "widthNorm": 0.92, "heightNorm": 0.035, "strokeColor": "#0ea5e9", "strokeWidth": 0, "fillColor": "#0ea5e9", "zIndex": 5}
  ]
}

## HORIZONTAL LINES - CRITICAL
To draw a PERFECTLY HORIZONTAL line:
1. Set heightNorm to 0.0 (ZERO)
2. Use widthNorm for the length
3. Example: {"type": "line", "xNorm": 0.04, "yNormTop": 0.50, "widthNorm": 0.92, "heightNorm": 0.0, "strokeColor": "#e2e8f0", "strokeWidth": 1, "zIndex": 4}

## KEY RULES - FOLLOW EXACTLY
1. YOUR ENTIRE RESPONSE MUST BE ONLY JSON - start with { end with } - NO OTHER TEXT
2. EVERY item MUST have zIndex property
3. Table header background MUST be behind header text (bg zIndex: 5, text zIndex: 15)
4. ALL LINE ITEMS must be displayed - iterate through each one
5. Currency values MUST be right-aligned
6. Use consistent column positions for ALL table rows
7. Wrap long description text into multiple textItems
8. Never exceed yNormTop: 0.97 for any element
9. Horizontal lines: heightNorm MUST be 0.0

RESPOND WITH JSON ONLY. NO EXPLANATION. NO MARKDOWN.`;
}

// ============================================================================
// User Prompt Builder
// ============================================================================

export function buildInvoiceUserPrompt(
  userData: InvoiceInputData,
  style: InvoiceStyle,
  definition: GenericAITemplateDefinition
): string {
  const layout = INVOICE_LAYOUT_SPECS[style];
  const dynamicLayout = calculateInvoiceDynamicLayout(userData, style);

  // Format line items with all details
  const lineItemsText = userData.lineItems.map((item, i) => {
    const qtyLabel = style === 'freelancer' && item.hours ? `Hours: ${item.hours}` : `Qty: ${item.quantity}`;
    return `  ${i + 1}. "${item.description}" | ${qtyLabel} | Rate: $${item.rate.toFixed(2)} | Amount: $${item.amount.toFixed(2)}`;
  }).join('\n');

  // Format addresses nicely
  const formatAddress = (addr: string) => addr.replace(/\n/g, ', ');
  const formatAddressLines = (addr: string) => addr.split('\n').map((line, i) => `    Line ${i + 1}: ${line}`).join('\n');

  // Calculate totals display
  const totalHours = style === 'freelancer' && userData.totalHours
    ? userData.totalHours
    : userData.lineItems.reduce((sum, item) => sum + (item.hours || 0), 0);

  return `Generate a complete ${style.toUpperCase()} style invoice layout with ALL the following data displayed correctly.

## COMPANY/FREELANCER INFORMATION
- Name: ${userData.companyName}
${userData.freelancerTitle ? `- Title: ${userData.freelancerTitle}` : ''}
- Email: ${userData.companyEmail}
- Phone: ${userData.companyPhone}
- Address:
${formatAddressLines(userData.companyAddress)}

## INVOICE DETAILS
- Invoice Number: ${userData.invoiceNumber}
- Invoice Date: ${userData.invoiceDate}
- Due Date: ${userData.dueDate}

## CLIENT INFORMATION (BILL TO)
- Client Name: ${userData.clientName}
- Client Email: ${userData.clientEmail}
- Client Address:
${formatAddressLines(userData.clientAddress)}

${userData.projectName ? `## PROJECT INFORMATION
- Project Name: ${userData.projectName}
${userData.hourlyRate ? `- Hourly Rate: $${userData.hourlyRate.toFixed(2)}/hr` : ''}
${totalHours > 0 ? `- Total Hours: ${totalHours} hrs` : ''}
` : ''}

## LINE ITEMS - CRITICAL: Display ALL ${userData.lineItems.length} items
${lineItemsText}

## TOTALS CALCULATION
- Subtotal: $${userData.subtotal.toFixed(2)}
${totalHours > 0 ? `- Total Hours: ${totalHours} hrs` : ''}
- Tax Rate: ${userData.taxRate}%
- Tax Amount: $${userData.taxAmount.toFixed(2)}
${userData.discount ? `- Discount: -$${userData.discount.toFixed(2)}${userData.discountPercent ? ` (${userData.discountPercent}%)` : ''}` : ''}
- TOTAL DUE: $${userData.total.toFixed(2)}

## PAYMENT INFORMATION
- Payment Terms: ${userData.paymentTerms}
${userData.paymentMethod ? `- Payment Methods: ${userData.paymentMethod}` : ''}
${userData.bankDetails ? `- Bank Details: ${userData.bankDetails}` : ''}
${userData.notes ? `- Notes: ${userData.notes}` : ''}

## CALCULATED LAYOUT POSITIONS
${generateInvoiceLayoutDocumentation(dynamicLayout, style)}

## TABLE COLUMN X POSITIONS (Use these exact positions for alignment)
- Column 1 (Item #): xNorm = ${layout.tableColumns.item}
- Column 2 (Description): xNorm = ${layout.tableColumns.description}
- Column 3 (${style === 'freelancer' ? 'Hours' : 'Qty'}): xNorm = ${layout.tableColumns.qty} (right-align value at ${(layout.tableColumns.qty + 0.08).toFixed(2)})
- Column 4 (Rate): xNorm = ${layout.tableColumns.rate} (right-align value at ${(layout.tableColumns.rate + 0.10).toFixed(2)})
- Column 5 (Amount): xNorm = ${layout.tableColumns.amount} (right-align value at ${(layout.tableColumns.amount + 0.10).toFixed(2)})

## VISUAL ELEMENTS TO INCLUDE
1. ${style !== 'basic' ? 'Invoice badge background rectangle (primary color, zIndex: 5)' : 'Invoice title text'}
2. Horizontal line under header (optional accent)
3. Table header background rectangle (${layout.primaryColor}, zIndex: 5)
4. Table header text (white, zIndex: 15)
5. Row separator lines between items (light gray #e2e8f0, zIndex: 4)
6. Totals section separator line (${layout.primaryColor}, zIndex: 5)

## CRITICAL REQUIREMENTS
1. ALL ${userData.lineItems.length} LINE ITEMS must appear in the table
2. Each line item on its own row with correct Y position from calculated layout
3. Table header text MUST be white (#ffffff) on colored background
4. All monetary values MUST include $ and be formatted: $X,XXX.XX
5. Totals section right-aligned on right side of page
6. "TOTAL DUE" should be prominent (larger font, primary color)
7. Every textItem and shape MUST have zIndex property
8. Horizontal lines: heightNorm = 0.0

IMPORTANT: Output ONLY the JSON object. Start with { and end with }. No markdown code blocks, no explanation text.`;
}

// ============================================================================
// Dynamic Layout Calculator
// ============================================================================

interface InvoiceDynamicLayoutResult {
  header: { yStart: number; yEnd: number };
  clientInfo: { yStart: number; yEnd: number };
  tableHeader: { yStart: number; yEnd: number };
  tableRows: Array<{ yStart: number; yEnd: number; itemIndex: number }>;
  totals: { yStart: number; yEnd: number };
  footer: { yStart: number; yEnd: number };
  rowHeight: number;
}

const INVOICE_SPACING = {
  sectionGap: 0.02,
  minRowHeight: 0.032,
  maxRowHeight: 0.055,
  tableHeaderHeight: 0.035,
  totalsRowHeight: 0.028,
};

export function calculateInvoiceDynamicLayout(
  userData: InvoiceInputData,
  style: InvoiceStyle
): InvoiceDynamicLayoutResult {
  const layoutSpec = INVOICE_LAYOUT_SPECS[style];
  const itemCount = userData.lineItems.length;

  // Use layout spec positions
  const headerStart = layoutSpec.header.yStart;
  const headerEnd = layoutSpec.header.yEnd;

  const clientInfoStart = layoutSpec.clientInfo.yStart;
  const clientInfoEnd = layoutSpec.clientInfo.yEnd;

  // Table section
  const tableHeaderStart = layoutSpec.itemsTable.yStart;
  const tableHeaderEnd = tableHeaderStart + INVOICE_SPACING.tableHeaderHeight;

  // Calculate available space for rows
  const tableBodyEnd = layoutSpec.itemsTable.yEnd;
  const availableRowSpace = tableBodyEnd - tableHeaderEnd - 0.02; // Small padding

  // Calculate row height based on item count (with min/max bounds)
  let rowHeight = availableRowSpace / Math.max(itemCount, 1);
  rowHeight = Math.max(INVOICE_SPACING.minRowHeight, Math.min(INVOICE_SPACING.maxRowHeight, rowHeight));

  // Generate row positions
  const tableRows: Array<{ yStart: number; yEnd: number; itemIndex: number }> = [];
  for (let i = 0; i < itemCount; i++) {
    const rowStart = tableHeaderEnd + (i * rowHeight) + 0.008;
    tableRows.push({
      yStart: rowStart,
      yEnd: rowStart + rowHeight - 0.005,
      itemIndex: i,
    });
  }

  // Totals and footer
  const totalsStart = layoutSpec.totals.yStart;
  const totalsEnd = layoutSpec.totals.yEnd;
  const footerStart = layoutSpec.footer.yStart;
  const footerEnd = layoutSpec.footer.yEnd;

  return {
    header: { yStart: headerStart, yEnd: headerEnd },
    clientInfo: { yStart: clientInfoStart, yEnd: clientInfoEnd },
    tableHeader: { yStart: tableHeaderStart, yEnd: tableHeaderEnd },
    tableRows,
    totals: { yStart: totalsStart, yEnd: totalsEnd },
    footer: { yStart: footerStart, yEnd: footerEnd },
    rowHeight,
  };
}

function generateInvoiceLayoutDocumentation(
  layout: InvoiceDynamicLayoutResult,
  style: InvoiceStyle
): string {
  const spec = INVOICE_LAYOUT_SPECS[style];

  const rowsDoc = layout.tableRows.map((row, i) =>
    `  - Row ${i + 1} (Item ${i + 1}): Y = ${row.yStart.toFixed(3)}`
  ).join('\n');

  return `### SECTION POSITIONS (Pre-calculated for even distribution)

HEADER: Y ${layout.header.yStart.toFixed(3)} to ${layout.header.yEnd.toFixed(3)}
  - Company name at Y: ${layout.header.yStart.toFixed(3)}
  - Invoice badge at Y: ${(layout.header.yStart + 0.01).toFixed(3)}
  - Invoice details at Y: ${(layout.header.yStart + 0.06).toFixed(3)}

CLIENT INFO: Y ${layout.clientInfo.yStart.toFixed(3)} to ${layout.clientInfo.yEnd.toFixed(3)}
  - "BILL TO" label at Y: ${layout.clientInfo.yStart.toFixed(3)}
  - Client name at Y: ${(layout.clientInfo.yStart + 0.025).toFixed(3)}

TABLE HEADER: Y ${layout.tableHeader.yStart.toFixed(3)} to ${layout.tableHeader.yEnd.toFixed(3)}
  - Header background rectangle: yNormTop: ${layout.tableHeader.yStart.toFixed(3)}, heightNorm: ${INVOICE_SPACING.tableHeaderHeight}
  - Header text centered in row

TABLE BODY ROWS (${layout.tableRows.length} items, row height: ${layout.rowHeight.toFixed(3)}):
${rowsDoc}

TOTALS: Y ${layout.totals.yStart.toFixed(3)} to ${layout.totals.yEnd.toFixed(3)}
  - Subtotal at Y: ${layout.totals.yStart.toFixed(3)}
  - Tax at Y: ${(layout.totals.yStart + 0.028).toFixed(3)}
  - Separator line at Y: ${(layout.totals.yStart + 0.056).toFixed(3)}
  - TOTAL DUE at Y: ${(layout.totals.yStart + 0.070).toFixed(3)}

FOOTER: Y ${layout.footer.yStart.toFixed(3)} to ${layout.footer.yEnd.toFixed(3)}
  - Payment terms at Y: ${layout.footer.yStart.toFixed(3)}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getInvoiceLayoutSpec(style: InvoiceStyle): InvoiceLayoutSpec {
  return INVOICE_LAYOUT_SPECS[style];
}

/**
 * Validate invoice data before generation
 */
export function validateInvoiceInput(userData: InvoiceInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.companyName?.trim()) errors.push('Company name is required');
  if (!userData.invoiceNumber?.trim()) errors.push('Invoice number is required');
  if (!userData.clientName?.trim()) errors.push('Client name is required');
  if (userData.lineItems.length === 0) errors.push('At least one line item is required');

  userData.lineItems.forEach((item, i) => {
    if (!item.description?.trim()) errors.push(`Line item ${i + 1}: Description is required`);
    if (item.amount <= 0) errors.push(`Line item ${i + 1}: Amount must be greater than 0`);
  });

  return { valid: errors.length === 0, errors };
}
