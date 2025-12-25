/**
 * Cover Letter Content Generator
 * Generates cover letter content using Claude AI with HTML-based approach
 */

import type { TemplateContent, CoverLetterInputData, GenericAITemplateDefinition } from '../../types/templates';
import { sendPromptToClaude } from './claudeClient';
import { buildCoverLetterHtmlSystemPrompt, buildCoverLetterHtmlUserPrompt } from './coverLetterHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { CANVAS_WIDTH } from '../../config/constants';

// Cover letter layout constant (single column with 40px margins)
const MARGIN = 40;
const CONTENT_WIDTH = CANVAS_WIDTH - (MARGIN * 2); // ~515px

/**
 * Generate cover letter content using Claude AI (HTML-based approach)
 */
export async function generateCoverLetterContent(
  apiKey: string,
  userData: CoverLetterInputData,
  definition: GenericAITemplateDefinition
): Promise<TemplateContent> {
  const validation = validateCoverLetterInput(userData);
  if (!validation.valid) {
    throw new Error(`Invalid cover letter data: ${validation.errors.join(', ')}`);
  }

  const style = definition.style as string;

  // Build HTML prompts
  const systemPrompt = buildCoverLetterHtmlSystemPrompt(style, definition);
  const userPrompt = buildCoverLetterHtmlUserPrompt(userData, style, definition);

  // Call Claude API - get HTML response
  const htmlResponse = await sendPromptToClaude(apiKey, userPrompt, systemPrompt);

  // Clean up HTML response
  let cleanHtml = htmlResponse.trim();
  const htmlMatch = cleanHtml.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    cleanHtml = htmlMatch[1].trim();
  }

  if (!cleanHtml.includes('<div')) {
    throw new Error('AI did not return valid HTML. Please try again.');
  }

  const divStart = cleanHtml.indexOf('<div');
  if (divStart > 0) {
    cleanHtml = cleanHtml.substring(divStart);
  }

  // Render HTML and extract coordinates
  const { textItems, shapes, formFields } = await extractContentFromHtml(cleanHtml);

  // Apply maxWidth for text wrapping (single column layout)
  const textItemsWithMaxWidth = textItems.map((item) => ({
    ...item,
    maxWidth: CONTENT_WIDTH,
  }));

  const content: TemplateContent = {
    pages: [
      {
        textItems: textItemsWithMaxWidth,
        imageItems: [],
        shapes,
        formFields: [],
        annotations: [],
      },
    ],
    textItems: [],
    imageItems: [],
    shapeItems: [],
    formFields: [],
    annotationItems: [],
  };

  return content;
}

/**
 * Validate cover letter input data before generation
 */
export function validateCoverLetterInput(userData: CoverLetterInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.yourName?.trim()) errors.push('Your name is required');
  if (!userData.yourEmail?.trim()) errors.push('Your email is required');
  if (!userData.companyName?.trim()) errors.push('Company name is required');
  if (!userData.positionTitle?.trim()) errors.push('Position title is required');
  if (!userData.openingParagraph?.trim()) errors.push('Opening paragraph is required');
  if (userData.bodyParagraphs.length === 0) errors.push('At least one body paragraph is required');
  if (!userData.closingParagraph?.trim()) errors.push('Closing paragraph is required');
  if (!userData.closing?.trim()) errors.push('Closing (e.g., "Sincerely,") is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Create a preview summary of the cover letter data
 */
export function createCoverLetterSummary(userData: CoverLetterInputData): string {
  const parts: string[] = [];

  parts.push(`From: ${userData.yourName || 'Not set'}`);
  parts.push(`To: ${userData.companyName || 'Not set'}`);
  parts.push(`Position: ${userData.positionTitle || 'Not set'}`);
  parts.push(`Paragraphs: ${userData.bodyParagraphs.length + 2}`); // +2 for opening and closing

  return parts.join('\n');
}
