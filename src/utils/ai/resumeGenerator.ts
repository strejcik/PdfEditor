/**
 * Resume Content Generator
 * Generates resume content using Claude AI with HTML-based approach
 */

import type { TemplateContent, ResumeInputData, AITemplateDefinition } from '../../types/templates';
import { sendPromptToClaude } from './claudeClient';
import { buildResumeHtmlSystemPrompt, buildResumeHtmlUserPrompt } from './resumeHtmlPrompts';
import { extractContentFromHtml } from './htmlToCanvas';
import { CANVAS_WIDTH } from '../../config/constants';

// Resume layout constants (matches the HTML template structure)
const SIDEBAR_WIDTH_PERCENT = 0.30; // 30% for sidebar
const SIDEBAR_PADDING = 25; // padding inside sidebar
const MAIN_PADDING = 30; // padding inside main content
const SIDEBAR_CONTENT_WIDTH = CANVAS_WIDTH * SIDEBAR_WIDTH_PERCENT - (SIDEBAR_PADDING * 2); // ~128px
const MAIN_CONTENT_WIDTH = CANVAS_WIDTH * (1 - SIDEBAR_WIDTH_PERCENT) - (MAIN_PADDING * 2); // ~357px

/**
 * Generate resume content using Claude AI (HTML-based approach)
 */
export async function generateResumeContent(
  apiKey: string,
  userData: ResumeInputData,
  definition: AITemplateDefinition
): Promise<TemplateContent> {
  // Build HTML prompts
  const systemPrompt = buildResumeHtmlSystemPrompt(definition.style, definition);
  const userPrompt = buildResumeHtmlUserPrompt(userData, definition.style, definition);

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

  // Apply position-based maxWidth for text wrapping
  // Resume has two columns: sidebar (left 30%) and main content (right 70%)
  const sidebarThreshold = SIDEBAR_WIDTH_PERCENT; // xNorm threshold for sidebar vs main
  const textItemsWithMaxWidth = textItems.map((item) => {
    // Determine which section the text is in based on its x position
    const isInSidebar = item.xNorm < sidebarThreshold;
    const sectionMaxWidth = isInSidebar ? SIDEBAR_CONTENT_WIDTH : MAIN_CONTENT_WIDTH;

    return {
      ...item,
      maxWidth: sectionMaxWidth,
    };
  });

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
 * Validate resume input data before generation
 */
export function validateResumeInputForGeneration(
  userData: ResumeInputData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!userData.fullName?.trim()) {
    errors.push('Full Name is required');
  }

  if (!userData.jobTitle?.trim()) {
    errors.push('Job Title is required');
  }

  if (!userData.email?.trim()) {
    errors.push('Email is required');
  }

  // Validate work experience entries
  userData.workExperience.forEach((exp, index) => {
    if (!exp.title?.trim()) {
      errors.push(`Work Experience ${index + 1}: Job Title is required`);
    }
    if (!exp.company?.trim()) {
      errors.push(`Work Experience ${index + 1}: Company is required`);
    }
  });

  // Validate education entries
  userData.education.forEach((edu, index) => {
    if (!edu.degree?.trim()) {
      errors.push(`Education ${index + 1}: Degree is required`);
    }
    if (!edu.institution?.trim()) {
      errors.push(`Education ${index + 1}: Institution is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a preview summary of the resume data
 */
export function createResumeSummary(userData: ResumeInputData): string {
  const parts: string[] = [];

  parts.push(`Name: ${userData.fullName || 'Not provided'}`);
  parts.push(`Title: ${userData.jobTitle || 'Not provided'}`);
  parts.push(`Email: ${userData.email || 'Not provided'}`);

  if (userData.workExperience.length > 0) {
    parts.push(`Work Experience: ${userData.workExperience.length} entries`);
  }

  if (userData.education.length > 0) {
    parts.push(`Education: ${userData.education.length} entries`);
  }

  if (userData.skills.length > 0) {
    parts.push(`Skills: ${userData.skills.length} items`);
  }

  if (userData.languages.length > 0) {
    parts.push(`Languages: ${userData.languages.length} entries`);
  }

  return parts.join('\n');
}
