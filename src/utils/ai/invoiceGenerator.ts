/**
 * Invoice Content Generator
 * Generates invoice content using Claude AI with HTML-based approach
 */

import type { TemplateContent, InvoiceInputData, InvoiceStyle, GenericAITemplateDefinition } from '../../types/templates';
import type { TextItem } from '../../types/editor';
import type { ShapeItem } from '../../types/shapes';
import { sendPromptToClaude } from './claudeClient';
import { validateInvoiceInput } from './invoicePrompts';
import { buildInvoiceHtmlSystemPrompt, buildInvoiceHtmlUserPrompt } from './invoiceHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../config/constants';

/**
 * Generate invoice content using Claude AI (HTML-based approach)
 * Claude generates HTML, we render it and extract precise coordinates
 */
export async function generateInvoiceContent(
  apiKey: string,
  userData: InvoiceInputData,
  definition: GenericAITemplateDefinition
): Promise<TemplateContent> {
  // Validate input
  const validation = validateInvoiceInput(userData);
  if (!validation.valid) {
    throw new Error(`Invalid invoice data: ${validation.errors.join(', ')}`);
  }

  const style = definition.style as InvoiceStyle;

  // Build HTML prompts
  const systemPrompt = buildInvoiceHtmlSystemPrompt(style, definition);
  const userPrompt = buildInvoiceHtmlUserPrompt(userData, style, definition);

  // Call Claude API - get HTML response
  const htmlResponse = await sendPromptToClaude(apiKey, userPrompt, systemPrompt);

  // Clean up HTML response (remove any markdown code fences)
  let cleanHtml = htmlResponse.trim();
  const htmlMatch = cleanHtml.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (htmlMatch) {
    cleanHtml = htmlMatch[1].trim();
  }

  // Ensure we have the invoice div
  if (!cleanHtml.includes('<div')) {
    throw new Error('AI did not return valid HTML. Please try again.');
  }

  // Extract first div if there's extra content
  const divStart = cleanHtml.indexOf('<div');
  if (divStart > 0) {
    cleanHtml = cleanHtml.substring(divStart);
  }

  // Render HTML and extract coordinates
  const { textItems, shapes, formFields } = await extractContentFromHtml(cleanHtml);

  // Apply maxWidth for text wrapping (invoice uses 30px padding)
  const MARGIN = 30;
  const contentWidth = CANVAS_WIDTH - (MARGIN * 2);
  const textItemsWithMaxWidth = textItems.map((item) => ({
    ...item,
    maxWidth: contentWidth,
  }));

  // Build TemplateContent structure
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
 * Create a preview summary of the invoice data
 */
export function createInvoiceSummary(userData: InvoiceInputData): string {
  const parts: string[] = [];

  parts.push(`Invoice #: ${userData.invoiceNumber || 'Not set'}`);
  parts.push(`Client: ${userData.clientName || 'Not set'}`);
  parts.push(`Items: ${userData.lineItems.length}`);
  parts.push(`Total: $${userData.total.toFixed(2)}`);

  return parts.join('\n');
}
