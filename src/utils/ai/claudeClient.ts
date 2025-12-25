/**
 * Claude API Client
 * Handles communication with the Anthropic Claude API
 */

import type { ClaudeResponse } from '../../types/ai';

// ============================================================================
// Constants
// ============================================================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192;

// ============================================================================
// Types
// ============================================================================

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeAPIError {
  type: string;
  message: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Send a prompt to Claude API and get a response
 */
export async function sendPromptToClaude(
  apiKey: string,
  userPrompt: string,
  systemPrompt: string
): Promise<string> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your credentials.');
    }

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }

    if (response.status === 400) {
      throw new Error(errorBody.error?.message || 'Bad request to Claude API.');
    }

    throw new Error(
      errorBody.error?.message || `API request failed with status ${response.status}`
    );
  }

  const data = await response.json();

  // Extract text content from response (skip thinking blocks)
  if (data.content && Array.isArray(data.content)) {
    // Find the last text block (thinking comes before the actual response)
    const textBlocks = data.content.filter((c: any) => c.type === 'text');
    if (textBlocks.length > 0) {
      // Use the last text block as the response
      const textContent = textBlocks[textBlocks.length - 1];
      if (textContent && textContent.text) {
        return textContent.text;
      }
    }
  }

  throw new Error('Unexpected response format from Claude API');
}

/**
 * Parse Claude's response text into a structured ClaudeResponse object
 */
export function parseClaudeResponse(responseText: string): ClaudeResponse {
  // Try to extract JSON from the response
  let jsonString = responseText.trim();

  // Handle markdown code fences (multiple patterns)
  const codeBlockPatterns = [
    /```json\s*([\s\S]*?)```/i,
    /```\s*([\s\S]*?)```/,
    /`([\s\S]*?)`/,
  ];

  for (const pattern of codeBlockPatterns) {
    const match = jsonString.match(pattern);
    if (match && match[1].includes('{')) {
      jsonString = match[1].trim();
      break;
    }
  }

  // Try to find JSON object in the response - handle nested braces correctly
  const jsonStartIdx = jsonString.indexOf('{');
  if (jsonStartIdx !== -1) {
    // Find matching closing brace by counting
    let braceCount = 0;
    let jsonEndIdx = -1;
    for (let i = jsonStartIdx; i < jsonString.length; i++) {
      if (jsonString[i] === '{') braceCount++;
      if (jsonString[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEndIdx = i;
        break;
      }
    }
    if (jsonEndIdx !== -1) {
      jsonString = jsonString.slice(jsonStartIdx, jsonEndIdx + 1);
    }
  }

  // Clean up common JSON issues
  jsonString = jsonString
    .replace(/,\s*}/g, '}')  // Remove trailing commas before }
    .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
    .replace(/\n/g, ' ')     // Replace newlines with spaces
    .replace(/\r/g, '')      // Remove carriage returns
    .replace(/\t/g, ' ');    // Replace tabs with spaces

  try {
    const parsed = JSON.parse(jsonString);

    // Validate and clean the response
    const result: ClaudeResponse = {};

    if (parsed.textItems && Array.isArray(parsed.textItems)) {
      result.textItems = parsed.textItems.map((item: any) => ({
        text: String(item.text || ''),
        xNorm: clampNorm(item.xNorm),
        yNormTop: clampNorm(item.yNormTop),
        fontSize: Math.max(8, Math.min(72, Number(item.fontSize) || 14)),
        color: item.color || '#000000',
        fontFamily: item.fontFamily || 'Lato',
        zIndex: Number(item.zIndex) || 10,
      }));
    }

    if (parsed.shapes && Array.isArray(parsed.shapes)) {
      result.shapes = parsed.shapes.map((item: any) => ({
        type: validateShapeType(item.type),
        xNorm: clampNorm(item.xNorm),
        yNormTop: clampNorm(item.yNormTop),
        widthNorm: clampNorm(item.widthNorm, 0.01),
        heightNorm: item.type === 'line' ? clampNorm(item.heightNorm, 0) : clampNorm(item.heightNorm, 0.01),
        strokeColor: item.strokeColor || '#000000',
        strokeWidth: Math.max(0, Math.min(20, Number(item.strokeWidth) || 2)),
        fillColor: item.fillColor || null,
        zIndex: Number(item.zIndex) || 0,
      }));
    }

    if (parsed.formFields && Array.isArray(parsed.formFields)) {
      result.formFields = parsed.formFields.map((item: any, index: number) => ({
        type: validateFormFieldType(item.type),
        xNorm: clampNorm(item.xNorm),
        yNormTop: clampNorm(item.yNormTop),
        widthNorm: clampNorm(item.widthNorm, 0.05),
        heightNorm: clampNorm(item.heightNorm, 0.02),
        fieldName: item.fieldName || `field_${Date.now()}_${index}`,
        label: item.label || undefined,  // Include label for checkbox/radio text display
        placeholder: item.placeholder || '',
        required: Boolean(item.required),
        options: Array.isArray(item.options) ? item.options.map(String) : undefined,
        groupName: item.groupName,
        defaultValue: item.defaultValue,
      }));
    }

    if (parsed.imageItems && Array.isArray(parsed.imageItems)) {
      result.imageItems = parsed.imageItems.map((item: any) => ({
        description: String(item.description || 'Image placeholder'),
        xNorm: clampNorm(item.xNorm),
        yNormTop: clampNorm(item.yNormTop),
        widthNorm: clampNorm(item.widthNorm, 0.05),
        heightNorm: clampNorm(item.heightNorm, 0.05),
      }));
    }

    // Return result even if empty - this prevents errors when Claude returns partial data
    return result;
  } catch (e) {
    console.error('Failed to parse Claude response:', e);
    console.error('Response text (first 500 chars):', responseText.substring(0, 500));
    console.error('Cleaned JSON string (first 500 chars):', jsonString.substring(0, 500));
    throw new Error('Failed to parse AI response. The AI returned invalid JSON. Please try again.');
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Clamp a value to the 0-1 range (or custom min-1 range)
 */
function clampNorm(value: any, min: number = 0): number {
  const num = Number(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(1, num));
}

/**
 * Validate shape type
 */
function validateShapeType(
  type: any
): 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'diamond' {
  const validTypes = ['rectangle', 'circle', 'line', 'arrow', 'triangle', 'diamond'];
  if (validTypes.includes(type)) {
    return type;
  }
  return 'rectangle';
}

/**
 * Validate form field type
 */
function validateFormFieldType(
  type: any
): 'textInput' | 'textarea' | 'checkbox' | 'radio' | 'dropdown' {
  const validTypes = ['textInput', 'textarea', 'checkbox', 'radio', 'dropdown'];
  if (validTypes.includes(type)) {
    return type;
  }
  return 'textInput';
}
