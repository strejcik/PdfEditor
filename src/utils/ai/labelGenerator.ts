/**
 * Label Content Generator
 * Generates label content using Claude AI with HTML-based approach
 */

import type { TemplateContent, LabelInputData, GenericAITemplateDefinition } from '../../types/templates';
import { sendPromptToClaude } from './claudeClient';
import { buildLabelHtmlSystemPrompt, buildLabelHtmlUserPrompt } from './labelHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { CANVAS_WIDTH } from '../../config/constants';

// Label layout constant
const MARGIN = 30;
const CONTENT_WIDTH = CANVAS_WIDTH - (MARGIN * 2); // ~535px

/**
 * Generate label content using Claude AI (HTML-based approach)
 */
export async function generateLabelContent(
  apiKey: string,
  userData: LabelInputData,
  definition: GenericAITemplateDefinition
): Promise<TemplateContent> {
  const validation = validateLabelInput(userData);
  if (!validation.valid) {
    throw new Error(`Invalid label data: ${validation.errors.join(', ')}`);
  }

  const style = definition.style as string;

  // Build HTML prompts
  const systemPrompt = buildLabelHtmlSystemPrompt(style, definition);
  const userPrompt = buildLabelHtmlUserPrompt(userData, style, definition);

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
 * Validate label input data before generation
 */
export function validateLabelInput(userData: LabelInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // For shipping/mailing labels
  if (!userData.fromAddress?.trim()) errors.push('From address is required');
  if (!userData.toName?.trim() && !userData.productName?.trim()) errors.push('Recipient name or product name is required');
  if (!userData.toAddress?.trim() && !userData.productDescription?.trim()) errors.push('Recipient address or product description is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Create a preview summary of the label data
 */
export function createLabelSummary(userData: LabelInputData): string {
  const parts: string[] = [];

  if (userData.productName) {
    parts.push(`Product: ${userData.productName}`);
    parts.push(`Price: ${userData.price || 'Not set'}`);
  } else {
    parts.push(`From: ${userData.fromName || userData.companyName || 'Not set'}`);
    parts.push(`To: ${userData.toName || 'Not set'}`);
    if (userData.trackingNumber) {
      parts.push(`Tracking: ${userData.trackingNumber}`);
    }
  }

  return parts.join('\n');
}
