/**
 * Certificate Content Generator
 * Generates certificate content using Claude AI with HTML-based approach
 */

import type { TemplateContent, CertificateInputData, GenericAITemplateDefinition } from '../../types/templates';
import { sendPromptToClaude } from './claudeClient';
import { buildCertificateHtmlSystemPrompt, buildCertificateHtmlUserPrompt } from './certificateHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { CANVAS_WIDTH } from '../../config/constants';

// Certificate layout constant (centered with decorative margins)
const MARGIN = 50;
const CONTENT_WIDTH = CANVAS_WIDTH - (MARGIN * 2); // ~495px

/**
 * Generate certificate content using Claude AI (HTML-based approach)
 */
export async function generateCertificateContent(
  apiKey: string,
  userData: CertificateInputData,
  definition: GenericAITemplateDefinition
): Promise<TemplateContent> {
  const validation = validateCertificateInput(userData);
  if (!validation.valid) {
    throw new Error(`Invalid certificate data: ${validation.errors.join(', ')}`);
  }

  const style = definition.style as string;

  // Build HTML prompts
  const systemPrompt = buildCertificateHtmlSystemPrompt(style, definition);
  const userPrompt = buildCertificateHtmlUserPrompt(userData, style, definition);

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
 * Validate certificate input data before generation
 */
export function validateCertificateInput(userData: CertificateInputData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.organizationName?.trim()) errors.push('Organization name is required');
  if (!userData.certificateTitle?.trim()) errors.push('Certificate title is required');
  if (!userData.recipientName?.trim()) errors.push('Recipient name is required');
  if (userData.signatures.length === 0) errors.push('At least one signature is required');

  userData.signatures.forEach((sig, i) => {
    if (!sig.name?.trim()) errors.push(`Signature ${i + 1}: Name is required`);
    if (!sig.title?.trim()) errors.push(`Signature ${i + 1}: Title is required`);
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Create a preview summary of the certificate data
 */
export function createCertificateSummary(userData: CertificateInputData): string {
  const parts: string[] = [];

  parts.push(`Type: ${userData.certificateTitle || 'Not set'}`);
  parts.push(`Recipient: ${userData.recipientName || 'Not set'}`);
  parts.push(`Signatures: ${userData.signatures.length}`);

  return parts.join('\n');
}
