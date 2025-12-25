/**
 * Letterhead Content Generator
 * Generates letterhead content using Claude AI with HTML-based approach
 */

import type { TemplateContent, LetterheadInputData, GenericAITemplateDefinition } from '../../types/templates';
import { sendPromptToClaude } from './claudeClient';
import { buildLetterheadHtmlSystemPrompt, buildLetterheadHtmlUserPrompt } from './letterheadHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { validateLetterheadInput } from './letterheadPrompts';
import { CANVAS_WIDTH } from '../../config/constants';

// Letterhead layout constant (single column with margins)
const MARGIN = 40;
const CONTENT_WIDTH = CANVAS_WIDTH - (MARGIN * 2); // ~515px

/**
 * Generate letterhead content using Claude AI (HTML-based approach)
 */
export async function generateLetterheadContent(
  apiKey: string,
  userData: LetterheadInputData,
  definition: GenericAITemplateDefinition
): Promise<TemplateContent> {
  const validation = validateLetterheadInput(userData);
  if (!validation.valid) {
    throw new Error(`Invalid letterhead data: ${validation.errors.join(', ')}`);
  }

  const style = definition.style as string;

  // Build HTML prompts
  const systemPrompt = buildLetterheadHtmlSystemPrompt(style, definition);
  const userPrompt = buildLetterheadHtmlUserPrompt(userData, style, definition);

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

  // Apply maxWidth for text wrapping
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
 * Create a preview summary of the letterhead data
 */
export function createLetterheadSummary(userData: LetterheadInputData): string {
  const parts: string[] = [];

  parts.push(`From: ${userData.companyName || 'Not set'}`);
  parts.push(`To: ${userData.recipientName || 'Not set'}`);
  parts.push(`Paragraphs: ${userData.bodyParagraphs.length}`);

  return parts.join('\n');
}
