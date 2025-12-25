/**
 * Cover Letter HTML Prompt Templates
 */

import type { CoverLetterInputData, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export function buildCoverLetterHtmlSystemPrompt(
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  return `You are an expert HTML/CSS developer creating a professional cover letter.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation
2. Start with <div class="cover-letter"> and end with </div>
3. Use INLINE STYLES only
4. Container: ${CANVAS_WIDTH}px × ${CANVAS_HEIGHT}px

## COLORS
- Primary/Accent: ${colorScheme.primary}
- Text: ${colorScheme.textDark}
- Background: ${colorScheme.background}

## TYPOGRAPHY
- Name: ${typography.titleSize}px
- Body: ${typography.bodySize}px (line-height: 1.6)
- Font: ${typography.fontFamily}

## LAYOUT
1. HEADER (top 15%)
   - Your name (large)
   - Contact info (email, phone, location)
   - LinkedIn/Portfolio (optional)

2. DATE & RECIPIENT (next 10%)
   - Date (right or left aligned)
   - Hiring Manager name
   - Company name
   - Company address

3. SALUTATION
   - "Dear [Name]," or "Dear Hiring Manager,"

4. BODY PARAGRAPHS (main content ~50%)
   - Opening paragraph (enthusiasm, position applying for)
   - Middle paragraphs (key qualifications, achievements)
   - Closing paragraph (call to action)

5. CLOSING (bottom 10%)
   - "Sincerely," or similar
   - Your name
   - Optional: signature line

## STYLING
- Professional, clean layout
- Consistent margins (40px sides)
- Paragraph spacing (margin-bottom: 15px)
- Body text line-height: 1.6

## TEXT WRAPPING
- All text containers must have: word-wrap: break-word; overflow-wrap: break-word;
- Body paragraphs MUST wrap within the content width (~515px with 40px margins)
- Do NOT let text overflow its container
- Container must have overflow: hidden; box-sizing: border-box;

OUTPUT ONLY THE HTML.`;
}

export function buildCoverLetterHtmlUserPrompt(
  userData: CoverLetterInputData,
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const bodyText = userData.bodyParagraphs?.join('\n\n') || '';
  const keyPoints = userData.keyPoints?.join('\n- ') || '';

  return `Create an HTML cover letter with:

## YOUR INFO
- Name: ${userData.fullName || 'Your Name'}
- Email: ${userData.email || 'email@example.com'}
- Phone: ${userData.phone || ''}
- Location: ${userData.location || ''}
- LinkedIn: ${userData.linkedIn || ''}
- Portfolio: ${userData.portfolio || ''}

## RECIPIENT
- Name: ${userData.hiringManagerName || 'Hiring Manager'}
- Title: ${userData.hiringManagerTitle || ''}
- Company: ${userData.companyName || 'Company Name'}
- Address: ${userData.companyAddress || ''}

## LETTER DETAILS
- Date: ${userData.date || new Date().toLocaleDateString()}
- Position: ${userData.positionTitle || 'Position'}
- Salutation: ${userData.salutation || 'Dear Hiring Manager,'}

## BODY CONTENT
${bodyText || 'I am writing to express my interest in the position...'}

## KEY POINTS TO HIGHLIGHT
${keyPoints ? '- ' + keyPoints : ''}

## CLOSING
- Closing: ${userData.closing || 'Sincerely,'}

Generate complete HTML. Start with <div class="cover-letter" and end with </div>.`;
}
