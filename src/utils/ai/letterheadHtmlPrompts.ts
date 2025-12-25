/**
 * Letterhead HTML Prompt Templates
 */

import type { LetterheadInputData, GenericAITemplateDefinition } from '../../types/templates';
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

export function buildLetterheadHtmlSystemPrompt(
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  return `You are an expert HTML/CSS developer creating a professional letterhead.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation
2. Start with <div class="letterhead"> and end with </div>
3. Use INLINE STYLES only
4. Container: ${CANVAS_WIDTH}px × ${CANVAS_HEIGHT}px

## COLORS
- Primary: ${colorScheme.primary}
- Text: ${colorScheme.textDark}

## TYPOGRAPHY
- Company name: ${typography.titleSize}px
- Body: ${typography.bodySize}px
- Font: ${typography.fontFamily}

## LAYOUT
1. HEADER (top 10%)
   - Company/Person name (large, left or center)
   - Tagline if provided
   - Contact info (email, phone, address)

2. BODY (middle 75%)
   - Date (right-aligned)
   - Recipient info
   - Salutation
   - Body paragraphs
   - Closing
   - Signature line

3. FOOTER (bottom 5%)
   - Website or additional info

## TEXT WRAPPING
- All text containers must have: word-wrap: break-word; overflow-wrap: break-word;
- Body paragraphs MUST wrap within the content width
- Do NOT let text overflow its container
- Container must have overflow: hidden; box-sizing: border-box;

OUTPUT ONLY THE HTML.`;
}

export function buildLetterheadHtmlUserPrompt(
  userData: LetterheadInputData,
  style: string,
  definition: GenericAITemplateDefinition
): string {
  // Handle both string[] and object[] formats for bodyParagraphs
  const paragraphStrings = userData.bodyParagraphs ? extractParagraphsAsStrings(userData.bodyParagraphs) : [];
  const bodyText = paragraphStrings.join('\n\n') || '';

  return `Create an HTML letterhead with:

## SENDER INFO
- Name/Company: ${userData.companyName || userData.senderName}
- Email: ${userData.email || ''}
- Phone: ${userData.phone || ''}
- Address: ${userData.address || ''}
- Website: ${userData.website || ''}
- Tagline: ${userData.tagline || ''}

## LETTER CONTENT
- Date: ${userData.date || new Date().toLocaleDateString()}
- Recipient: ${userData.recipientName || ''}
- Recipient Title: ${userData.recipientTitle || ''}
- Recipient Company: ${userData.recipientCompany || ''}
- Salutation: ${userData.salutation || 'Dear Sir/Madam,'}

## BODY
${bodyText || 'Letter content goes here.'}

## CLOSING
- Closing: ${userData.closing || 'Sincerely,'}
- Signature Name: ${userData.signatureName || userData.senderName || ''}
- Title: ${userData.signatureTitle || ''}

Generate complete HTML. Start with <div class="letterhead" and end with </div>.`;
}
