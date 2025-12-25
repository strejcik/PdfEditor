/**
 * Form Content Generator
 * Generates form content using Claude AI with HTML-based approach
 */

import type { TemplateContent, FormInputData, GenericAITemplateDefinition } from '../../types/templates';
import { sendPromptToClaude } from './claudeClient';
import { buildFormHtmlSystemPrompt, buildFormHtmlUserPrompt } from './formHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { CANVAS_WIDTH } from '../../config/constants';

// Form layout constant
const MARGIN = 40;
const CONTENT_WIDTH = CANVAS_WIDTH - (MARGIN * 2); // ~515px

/**
 * Validate form input data
 */
export function validateFormInput(userData: FormInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.formTitle?.trim()) {
    errors.push('Form title is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate form content using Claude AI (HTML-based approach)
 */
export async function generateFormContent(
  apiKey: string,
  userData: FormInputData,
  definition: GenericAITemplateDefinition
): Promise<TemplateContent> {
  const validation = validateFormInput(userData);
  if (!validation.valid) {
    throw new Error(`Invalid form data: ${validation.errors.join(', ')}`);
  }

  const style = definition.style as string;

  // Build HTML prompts
  const systemPrompt = buildFormHtmlSystemPrompt(style, definition);
  const userPrompt = buildFormHtmlUserPrompt(userData, style, definition);

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
        formFields: formFields || [],
        annotations: [],
      },
    ],
    textItems: [],
    imageItems: [],
    shapeItems: [],
    formFields: formFields || [],
    annotationItems: [],
  };

  return content;
}

/**
 * Create a preview summary of the form data
 */
export function createFormSummary(userData: FormInputData): string {
  const parts: string[] = [];

  parts.push(`Title: ${userData.formTitle || 'Not set'}`);
  parts.push(`Fields: ${userData.fields?.length || 0}`);
  parts.push(`Sections: ${userData.sections?.length || 0}`);

  return parts.join('\n');
}
