/**
 * Label HTML Prompt Templates
 */

import type { LabelInputData, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export function buildLabelHtmlSystemPrompt(
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  return `You are an expert HTML/CSS developer creating a shipping/mailing label.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation
2. Start with <div class="label"> and end with </div>
3. Use INLINE STYLES only
4. Container: ${CANVAS_WIDTH}px × ${CANVAS_HEIGHT}px

## COLORS
- Primary: ${colorScheme.primary}
- Text: ${colorScheme.textDark}
- Border: #000000

## TYPOGRAPHY
- Headers: ${typography.headingSize}px, bold
- Address: ${typography.bodySize}px
- Font: ${typography.fontFamily}

## LAYOUT (Standard Shipping Label)
1. FROM SECTION (top 35%)
   - "FROM:" label (small, uppercase)
   - Sender name (bold)
   - Company name (if provided)
   - Street address
   - City, State ZIP
   - Country (if international)

2. DIVIDER LINE (horizontal line separating sections)

3. TO SECTION (middle 45%)
   - "TO:" or "SHIP TO:" label (small, uppercase)
   - Recipient name (LARGE, bold)
   - Company name (if provided)
   - Street address
   - City, State ZIP
   - Country (if international)

4. ADDITIONAL INFO (bottom 15%)
   - Tracking number/barcode placeholder
   - Shipping method
   - Special instructions

## STYLING
- Clear hierarchy between FROM and TO
- TO address should be more prominent (larger font)
- Use borders around sections if appropriate
- Leave space for barcode/tracking

## TEXT WRAPPING
- All text containers must have: word-wrap: break-word; overflow-wrap: break-word;
- Address text MUST wrap within the container width
- Container must have overflow: hidden; box-sizing: border-box;

OUTPUT ONLY THE HTML.`;
}

export function buildLabelHtmlUserPrompt(
  userData: LabelInputData,
  style: string,
  definition: GenericAITemplateDefinition
): string {
  return `Create an HTML shipping label with:

## FROM (Sender)
- Name: ${userData.senderName || 'Sender Name'}
- Company: ${userData.senderCompany || ''}
- Address: ${userData.senderAddress || '123 Main Street'}
- City: ${userData.senderCity || 'City'}
- State: ${userData.senderState || 'State'}
- ZIP: ${userData.senderZip || '12345'}
- Country: ${userData.senderCountry || 'USA'}

## TO (Recipient)
- Name: ${userData.recipientName || 'Recipient Name'}
- Company: ${userData.recipientCompany || ''}
- Address: ${userData.recipientAddress || '456 Oak Avenue'}
- City: ${userData.recipientCity || 'City'}
- State: ${userData.recipientState || 'State'}
- ZIP: ${userData.recipientZip || '67890'}
- Country: ${userData.recipientCountry || 'USA'}

## SHIPPING INFO
- Method: ${userData.shippingMethod || 'Standard'}
- Tracking: ${userData.trackingNumber || 'XXXX-XXXX-XXXX'}
- Weight: ${userData.weight || ''}
- Instructions: ${userData.specialInstructions || ''}

Generate complete HTML. Start with <div class="label" and end with </div>.`;
}
