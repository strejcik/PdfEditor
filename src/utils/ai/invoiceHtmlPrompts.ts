/**
 * Invoice HTML Prompt Templates
 * Claude generates HTML/CSS which is then rendered and coordinates extracted
 */

import type { InvoiceInputData, InvoiceStyle, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

/**
 * Build system prompt for HTML-based invoice generation
 */
export function buildInvoiceHtmlSystemPrompt(
  style: InvoiceStyle,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  return `You are an expert HTML/CSS developer creating a professional invoice layout.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation, no code fences
2. Start with <div class="invoice"> and end with </div>
3. Use INLINE STYLES only (no <style> tags, no external CSS)
4. All measurements in pixels (px)

## CONTAINER SPECIFICATIONS
- Container size: ${CANVAS_WIDTH}px width × ${CANVAS_HEIGHT}px height
- This is an A4 page ratio
- Use box-sizing: border-box on all elements
- Use position: relative for the main container
- Child elements can use position: absolute for precise placement

## DESIGN STYLE: ${style.toUpperCase()}
Color Scheme:
- Primary: ${colorScheme.primary}
- Secondary: ${colorScheme.secondary}
- Accent: ${colorScheme.accent}
- Dark text: ${colorScheme.textDark}
- Light text: ${colorScheme.textLight}

Typography:
- Font family: ${typography.fontFamily}, sans-serif
- Title: ${typography.titleSize}px
- Heading: ${typography.headingSize}px
- Body: ${typography.bodySize}px
- Small: ${typography.smallSize}px

## LAYOUT STRUCTURE
Create a clean, professional invoice with these sections:

1. HEADER (top 12% of page)
   - Company name (large, left side)
   - "INVOICE" badge (right side, with colored background)
   - Invoice number, date, due date (right side, below badge)

2. CLIENT INFO (12-25% of page)
   - "BILL TO" label with client details (left side)
   - Optional "SHIP TO" or project info (right side)

3. ITEMS TABLE (30-70% of page)
   - Table header row with colored background
   - Columns: #, Description, Qty/Hours, Rate, Amount
   - Clear column alignment
   - Row separators (light gray borders)

4. TOTALS (72-85% of page)
   - Right-aligned
   - Subtotal, Tax, Discount (if any), Total Due
   - Total Due should be prominent

5. FOOTER (88-97% of page)
   - Payment terms
   - Notes
   - "Thank you" message

## TABLE STYLING
- Use <table> with proper structure
- Header row: background-color: ${colorScheme.primary}; color: white
- Body rows: alternate subtle backgrounds if needed
- Right-align numeric columns (Qty, Rate, Amount)
- Use border-collapse: collapse
- Cell padding: 8px 12px

## HTML STRUCTURE EXAMPLE
<div class="invoice" style="width: ${CANVAS_WIDTH}px; height: ${CANVAS_HEIGHT}px; position: relative; font-family: ${typography.fontFamily}, sans-serif; padding: 30px; box-sizing: border-box;">
  <div style="...">Header content</div>
  <div style="...">Client info</div>
  <table style="width: 100%; border-collapse: collapse; ...">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
  <div style="...">Totals</div>
  <div style="...">Footer</div>
</div>

## IMPORTANT RULES
1. ALL line items must be displayed in the table
2. Currency format: $X,XXX.XX
3. Keep text within bounds - no overflow
4. Use flexbox or table for alignment where appropriate
5. Ensure proper spacing between sections

## TEXT WRAPPING
- All text containers must have: word-wrap: break-word; overflow-wrap: break-word;
- Description and notes MUST wrap within their container width
- Container must have overflow: hidden; box-sizing: border-box;

OUTPUT ONLY THE HTML. NO OTHER TEXT.`;
}

/**
 * Build user prompt with invoice data
 */
export function buildInvoiceHtmlUserPrompt(
  userData: InvoiceInputData,
  style: InvoiceStyle,
  definition: GenericAITemplateDefinition
): string {
  const lineItemsHtml = userData.lineItems.map((item, i) =>
    `Row ${i + 1}: "${item.description}" | Qty: ${item.quantity} | Rate: $${item.rate.toFixed(2)} | Amount: $${item.amount.toFixed(2)}`
  ).join('\n');

  return `Create an HTML invoice with this data:

## COMPANY INFORMATION
- Name: ${userData.companyName}
- Email: ${userData.companyEmail}
- Phone: ${userData.companyPhone}
- Address: ${userData.companyAddress.replace(/\n/g, ', ')}

## INVOICE DETAILS
- Invoice #: ${userData.invoiceNumber}
- Date: ${userData.invoiceDate}
- Due Date: ${userData.dueDate}

## CLIENT (BILL TO)
- Name: ${userData.clientName}
- Email: ${userData.clientEmail}
- Address: ${userData.clientAddress.replace(/\n/g, ', ')}

## LINE ITEMS (${userData.lineItems.length} items - DISPLAY ALL)
${lineItemsHtml}

## TOTALS
- Subtotal: $${userData.subtotal.toFixed(2)}
- Tax (${userData.taxRate}%): $${userData.taxAmount.toFixed(2)}
${userData.discount ? `- Discount: -$${userData.discount.toFixed(2)}` : ''}
- TOTAL DUE: $${userData.total.toFixed(2)}

## FOOTER
- Payment Terms: ${userData.paymentTerms}
${userData.notes ? `- Notes: ${userData.notes}` : ''}

Generate the complete HTML invoice. Start with <div class="invoice" and end with </div>.`;
}
