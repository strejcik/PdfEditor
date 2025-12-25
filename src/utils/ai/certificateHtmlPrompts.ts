/**
 * Certificate HTML Prompt Templates
 */

import type { CertificateInputData, GenericAITemplateDefinition } from '../../types/templates';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

export function buildCertificateHtmlSystemPrompt(
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const { colorScheme, typography } = definition;

  return `You are an expert HTML/CSS developer creating a formal certificate.

## CRITICAL REQUIREMENTS
1. Output ONLY valid HTML - no markdown, no explanation
2. Start with <div class="certificate"> and end with </div>
3. Use INLINE STYLES only
4. Container: ${CANVAS_WIDTH}px × ${CANVAS_HEIGHT}px

## COLORS
- Primary: ${colorScheme.primary}
- Secondary/Gold: ${colorScheme.secondary}
- Text: ${colorScheme.textDark}

## TYPOGRAPHY
- Title: ${typography.titleSize}px (elegant, centered)
- Recipient name: 28-32px
- Body: ${typography.bodySize}px
- Font: ${typography.fontFamily}

## LAYOUT (Centered, Formal)
1. DECORATIVE BORDER - Optional elegant border (use CSS border or nested divs)

2. HEADER (top 20%)
   - Organization name/logo placeholder
   - "CERTIFICATE" or "CERTIFICATE OF ACHIEVEMENT" (large, elegant)

3. BODY (middle 50%)
   - "This is to certify that" or similar
   - RECIPIENT NAME (largest, prominent)
   - Achievement description
   - Additional details

4. FOOTER (bottom 25%)
   - Date
   - Signature lines (2-3 with names and titles below)
   - Organization seal placeholder (optional)

## STYLING TIPS
- Use text-align: center for most elements
- Add elegant spacing (line-height: 1.6)
- Consider decorative underlines under recipient name
- Signature lines: border-bottom with name below

## TEXT WRAPPING
- All text containers must have: word-wrap: break-word; overflow-wrap: break-word;
- Description text MUST wrap within the container width
- Container must have overflow: hidden; box-sizing: border-box;

OUTPUT ONLY THE HTML.`;
}

export function buildCertificateHtmlUserPrompt(
  userData: CertificateInputData,
  style: string,
  definition: GenericAITemplateDefinition
): string {
  const signaturesText = userData.signatures?.map((s, i) =>
    `${i + 1}. ${s.name} - ${s.title}`
  ).join('\n') || '';

  return `Create an HTML certificate with:

## ORGANIZATION
- Name: ${userData.organizationName || 'Organization Name'}
- Logo: (placeholder text)

## CERTIFICATE DETAILS
- Title: ${userData.certificateTitle || 'Certificate of Achievement'}
- Recipient: ${userData.recipientName || 'Recipient Name'}
- Achievement: ${userData.achievementTitle || 'Outstanding Achievement'}
- Description: ${userData.description || 'For exceptional performance and dedication.'}
- Date: ${userData.date || new Date().toLocaleDateString()}
- Certificate ID: ${userData.certificateId || ''}

## SIGNATURES (${userData.signatures?.length || 0})
${signaturesText || '1. Director - Executive Director'}

Generate complete HTML. Start with <div class="certificate" and end with </div>.`;
}
