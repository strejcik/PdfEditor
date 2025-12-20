/**
 * useClaudeAI Hook
 * Main hook for Claude AI integration - handles credentials, API calls, and content generation
 */

import { useState, useEffect, useCallback } from 'react';
import type { AIConnectionStatus, ClaudeResponse } from '../types/ai';
import { normalizedToPixel, DEFAULT_FONT_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../types/ai';
import { FORM_FIELD_DEFAULTS, FORM_FIELD_STYLE_DEFAULTS } from '../types/formFields';
import { saveApiKey, loadApiKey, hasApiKey, clearApiKey } from '../utils/ai/credentialsStorage';
import { sendPromptToClaude, parseClaudeResponse } from '../utils/ai/claudeClient';
import { CANVAS_SYSTEM_PROMPT, buildUserPrompt, NORM_SIZES, SPACING, FONT_SIZES, type CanvasContext } from '../utils/ai/promptTemplates';

// ============================================================================
// Bounds and Validation Constants
// ============================================================================

const BOUNDS = {
  xMin: 0.05,            // Minimum x position (5% margin)
  xMax: 0.90,            // Maximum x position (leaves 10% right margin)
  yMin: 0.05,            // Minimum y position (5% top margin)
  yMax: 0.90,            // Maximum y position (leaves 10% bottom margin)
};

const FONT_LIMITS = {
  min: 8,                // Minimum readable font size
  max: 48,               // Maximum font size for A4
  titleMax: 32,          // Maximum for titles
  bodyDefault: 14,       // Default for body text
  labelDefault: 12,      // Default for labels
};

// ============================================================================
// Types
// ============================================================================

export interface GenerateContentDeps {
  // State setters
  setTextItems: (updater: (prev: any[]) => any[]) => void;
  setShapeItems: (updater: (prev: any[]) => any[]) => void;
  setFormFields: (updater: (prev: any[]) => any[]) => void;

  // Current state for context
  textItems: any[];
  shapeItems: any[];
  formFields: any[];
  imageItems: any[];

  // History
  pushSnapshotToUndo: (pageIndex: number) => void;

  // Active page
  activePage: number;
}

// ============================================================================
// Hook
// ============================================================================

export function useClaudeAI() {
  // API key state (only in memory)
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<AIConnectionStatus>('disconnected');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');

  // Check for stored credentials on mount
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    hasApiKey().then(setHasStoredKey);
  }, []);

  // ============================================================================
  // Credential Management
  // ============================================================================

  /**
   * Save a new API key with password encryption
   */
  const saveNewApiKey = useCallback(async (key: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      await saveApiKey(key, password);
      setApiKey(key);
      setConnectionStatus('unlocked');
      setHasStoredKey(true);
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to save API key');
      setConnectionStatus('error');
      return false;
    }
  }, []);

  /**
   * Unlock stored API key with password
   */
  const unlockApiKey = useCallback(async (password: string): Promise<boolean> => {
    try {
      setError(null);
      const key = await loadApiKey(password);

      if (!key) {
        setError('Invalid password or corrupted data');
        setConnectionStatus('error');
        return false;
      }

      setApiKey(key);
      setConnectionStatus('unlocked');
      return true;
    } catch (e: any) {
      setError(e.message || 'Failed to unlock API key');
      setConnectionStatus('error');
      return false;
    }
  }, []);

  /**
   * Lock API key (clear from memory but keep in IndexedDB)
   */
  const lockApiKey = useCallback(() => {
    setApiKey(null);
    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  /**
   * Clear stored API key completely
   */
  const clearStoredApiKey = useCallback(async () => {
    try {
      await clearApiKey();
      setApiKey(null);
      setConnectionStatus('disconnected');
      setHasStoredKey(false);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to clear API key');
    }
  }, []);

  // ============================================================================
  // Content Generation
  // ============================================================================

  /**
   * Generate content from a user prompt
   */
  const generateContent = useCallback(async (
    prompt: string,
    deps: GenerateContentDeps
  ): Promise<boolean> => {
    if (!apiKey) {
      setError('API key not unlocked');
      return false;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return false;
    }

    setIsGenerating(true);
    setError(null);
    setLastPrompt(prompt);

    try {
      // Build context about existing items on the active page
      const context: CanvasContext = {
        textCount: deps.textItems.filter((t: any) => t.index === deps.activePage).length,
        shapeCount: deps.shapeItems.filter((s: any) => s.index === deps.activePage).length,
        formFieldCount: deps.formFields.filter((f: any) => f.index === deps.activePage).length,
        imageCount: deps.imageItems.filter((i: any) => i.index === deps.activePage).length,
      };

      // Build the user prompt with context
      const userPrompt = buildUserPrompt(prompt, context);

      // Call Claude API
      const responseText = await sendPromptToClaude(apiKey, userPrompt, CANVAS_SYSTEM_PROMPT);

      // Parse the response
      const parsed = parseClaudeResponse(responseText);

      // Push undo snapshot before making changes
      deps.pushSnapshotToUndo(deps.activePage);

      // Add generated items to canvas
      addItemsToCanvas(parsed, deps);

      return true;
    } catch (e: any) {
      console.error('Generation error:', e);
      setError(e.message || 'Failed to generate content');

      // Check for authentication errors
      if (e.message?.includes('Invalid API key')) {
        setConnectionStatus('error');
      }

      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey]);

  // ============================================================================
  // Helper: Add Items to Canvas
  // ============================================================================

  /**
   * Clamp a value between min and max
   */
  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Convert normalized coordinate to pixels
   */
  function normToPixelX(xNorm: number): number {
    return xNorm * CANVAS_WIDTH;
  }

  function normToPixelY(yNorm: number): number {
    return yNorm * CANVAS_HEIGHT;
  }

  /**
   * Convert pixel coordinate to normalized
   */
  function pixelToNormX(x: number): number {
    return x / CANVAS_WIDTH;
  }

  function pixelToNormY(y: number): number {
    return y / CANVAS_HEIGHT;
  }

  /**
   * Clamp normalized coordinates to safe canvas bounds
   */
  function clampCoords(xNorm: number, yNormTop: number, widthNorm?: number, heightNorm?: number) {
    // Clamp position to safe bounds
    let x = clamp(xNorm, BOUNDS.xMin, BOUNDS.xMax);
    let y = clamp(yNormTop, BOUNDS.yMin, BOUNDS.yMax);

    // If width/height provided, ensure element fits within canvas
    if (widthNorm !== undefined) {
      const maxWidth = BOUNDS.xMax - x;
      widthNorm = clamp(widthNorm, 0.01, maxWidth);
    }
    if (heightNorm !== undefined) {
      const maxHeight = BOUNDS.yMax - y;
      heightNorm = clamp(heightNorm, 0.01, maxHeight);
    }

    return { xNorm: x, yNormTop: y, widthNorm, heightNorm };
  }

  /**
   * Clamp font size to reasonable limits
   */
  function clampFontSize(fontSize: number, isTitle: boolean = false): number {
    const max = isTitle ? FONT_LIMITS.titleMax : FONT_LIMITS.max;
    return clamp(fontSize, FONT_LIMITS.min, max);
  }

  /**
   * Generate a unique random suffix (4 alphanumeric chars)
   */
  function generateUniqueSuffix(): string {
    return Math.random().toString(36).substring(2, 6);
  }

  /**
   * Ensure field name is unique by always appending a random suffix
   */
  function ensureUniqueFieldName(providedName: string | undefined, fieldType: string): string {
    const suffix = generateUniqueSuffix();
    if (providedName) {
      // Remove any existing suffix pattern (e.g., _xxxx at the end) and add new one
      const baseName = providedName.replace(/_[a-z0-9]{4}$/, '');
      return `${baseName}_${suffix}`;
    }
    return `${fieldType}_${Date.now()}_${suffix}`;
  }

  /**
   * Ensure group name is unique by always appending a random suffix
   */
  function ensureUniqueGroupName(providedName: string | undefined): string {
    const suffix = generateUniqueSuffix();
    if (providedName) {
      // Remove any existing suffix pattern and add new one
      const baseName = providedName.replace(/_[a-z0-9]{4}$/, '');
      return `${baseName}_${suffix}`;
    }
    return `radioGroup_${Date.now()}_${suffix}`;
  }

  /**
   * Get proper form field defaults based on type
   */
  function getFormFieldDefaults(type: string) {
    const defaults = FORM_FIELD_DEFAULTS[type as keyof typeof FORM_FIELD_DEFAULTS] || FORM_FIELD_DEFAULTS.textInput;
    return {
      widthNorm: defaults.width / CANVAS_WIDTH,
      heightNorm: defaults.height / CANVAS_HEIGHT,
      width: defaults.width,
      height: defaults.height,
    };
  }

  /**
   * Compute aligned coordinates for label above textInput/dropdown
   */
  function computeLabelAboveFieldPosition(
    fieldXNorm: number,
    fieldYNorm: number,
    labelFontSize: number
  ): { xNorm: number; yNorm: number } {
    // Convert to pixels
    const fieldYPx = normToPixelY(fieldYNorm);

    // Label goes above the field: field top - gap - label height
    // Gap: 4px, Label height ≈ fontSize
    const labelYPx = fieldYPx - 4 - labelFontSize;

    // Convert back to normalized
    const labelYNorm = clamp(pixelToNormY(labelYPx), BOUNDS.yMin, BOUNDS.yMax);

    return { xNorm: fieldXNorm, yNorm: labelYNorm };
  }

  /**
   * Optimized coordinate conversion for text items
   * Returns properly structured text item with both pixel and normalized coords
   */
  function createOptimizedTextItem(
    text: string,
    xNorm: number,
    yNormTop: number,
    fontSize: number,
    pageIndex: number,
    options: {
      color?: string;
      fontFamily?: string;
      boxPadding?: number;
      skipClamp?: boolean;  // Skip clamping for labels positioned relative to fields
    } = {}
  ) {
    // For labels next to form fields, skip clamping as position is already calculated correctly
    // For regular text items, clamp to safe bounds
    const finalXNorm = options.skipClamp ? xNorm : clamp(xNorm, BOUNDS.xMin, BOUNDS.xMax);
    const finalYNorm = options.skipClamp ? yNormTop : clamp(yNormTop, BOUNDS.yMin, BOUNDS.yMax);

    // Calculate pixel coordinates with rounding for crisp rendering
    const x = Math.round(finalXNorm * CANVAS_WIDTH);
    const y = Math.round(finalYNorm * CANVAS_HEIGHT);

    // Calculate boxPadding if not provided (20% of fontSize, matching app convention)
    const boxPadding = options.boxPadding ?? Math.round(fontSize * 0.2);

    return {
      type: 'text' as const,
      text,
      // Pixel coordinates (rounded for crisp rendering)
      x,
      y,
      // Normalized coordinates (6 decimal precision for accuracy)
      xNorm: parseFloat(finalXNorm.toFixed(6)),
      yNormTop: parseFloat(finalYNorm.toFixed(6)),
      // Text properties
      fontSize,
      fontFamily: options.fontFamily || 'Lato',
      color: options.color || '#000000',
      anchor: 'top' as const,
      boxPadding,
      // Page assignment
      index: pageIndex,
    };
  }

  // ============================================================================
  // Collision Detection Helpers
  // ============================================================================

  interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  /**
   * Check if two bounding boxes overlap
   */
  function boxesOverlap(a: BoundingBox, b: BoundingBox, padding: number = 4): boolean {
    return !(
      a.x + a.width + padding < b.x ||
      b.x + b.width + padding < a.x ||
      a.y + a.height + padding < b.y ||
      b.y + b.height + padding < a.y
    );
  }

  /**
   * Calculate bounding box for a text item
   */
  function getTextBoundingBox(item: any): BoundingBox {
    const fontSize = item.fontSize || 14;
    const text = item.text || '';
    // Approximate width: ~0.6 * fontSize per character
    const approxWidth = text.length * fontSize * 0.6;
    const height = fontSize * 1.2; // Line height

    return {
      x: item.x ?? (item.xNorm * CANVAS_WIDTH),
      y: item.y ?? (item.yNormTop * CANVAS_HEIGHT),
      width: Math.max(approxWidth, 20),
      height: height,
    };
  }

  /**
   * Calculate bounding box for a form field (including its label if checkbox/radio)
   */
  function getFormFieldBoundingBox(
    xNorm: number,
    yNorm: number,
    widthNorm: number,
    heightNorm: number,
    fieldType: string,
    label?: string
  ): BoundingBox {
    const x = xNorm * CANVAS_WIDTH;
    const y = yNorm * CANVAS_HEIGHT;
    let width = widthNorm * CANVAS_WIDTH;
    const height = heightNorm * CANVAS_HEIGHT;

    // For checkbox/radio with label, extend width to include label
    if ((fieldType === 'checkbox' || fieldType === 'radio') && label) {
      const labelWidth = label.length * FONT_LIMITS.labelDefault * 0.6;
      width = 28 + labelWidth; // field + margin + label
    }

    return { x, y, width, height };
  }

  /**
   * Calculate bounding box for a shape
   */
  function getShapeBoundingBox(item: any): BoundingBox {
    return {
      x: item.x ?? (item.xNorm * CANVAS_WIDTH),
      y: item.y ?? (item.yNormTop * CANVAS_HEIGHT),
      width: item.width ?? (item.widthNorm * CANVAS_WIDTH) ?? 50,
      height: item.height ?? (item.heightNorm * CANVAS_HEIGHT) ?? 50,
    };
  }

  /**
   * Find a non-overlapping Y position by moving down
   */
  function findNonOverlappingY(
    box: BoundingBox,
    existingBoxes: BoundingBox[],
    maxY: number = CANVAS_HEIGHT * 0.9
  ): number {
    let currentY = box.y;
    const step = 10; // Move down by 10px increments

    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops

    while (attempts < maxAttempts) {
      const testBox = { ...box, y: currentY };
      const hasOverlap = existingBoxes.some(existing => boxesOverlap(testBox, existing));

      if (!hasOverlap) {
        return currentY;
      }

      currentY += step;
      attempts++;

      // Don't go beyond canvas bounds
      if (currentY + box.height > maxY) {
        break;
      }
    }

    return currentY;
  }

  // ============================================================================
  // Post-Processing: Ensure Proper Vertical Spacing
  // ============================================================================

  interface LayoutItem {
    type: 'text' | 'shape' | 'formField';
    originalIndex: number;
    yNorm: number;
    heightNorm: number;
    data: any;
  }

  /**
   * Get the height of an item in normalized coordinates
   */
  function getItemHeightNorm(item: any, itemType: 'text' | 'shape' | 'formField'): number {
    if (itemType === 'text') {
      const fontSize = item.fontSize || 14;
      return (fontSize * 1.4) / CANVAS_HEIGHT; // Line height ~1.4x font size
    } else if (itemType === 'shape') {
      return item.heightNorm || 0.01;
    } else {
      // Form field - account for label above if not checkbox/radio
      const fieldHeight = item.heightNorm || 0.036;
      if (item.type === 'checkbox' || item.type === 'radio') {
        return fieldHeight;
      }
      // Add space for label above (about 20px = 0.024 normalized)
      return fieldHeight + 0.03;
    }
  }

  /**
   * Get minimum spacing after an item based on its type
   */
  function getMinSpacingAfter(item: any, itemType: 'text' | 'shape' | 'formField'): number {
    if (itemType === 'text') {
      const fontSize = item.fontSize || 14;
      if (fontSize >= 20) return 0.05; // After title
      if (fontSize >= 16) return 0.04; // After section heading
      return 0.03; // After body text
    } else if (itemType === 'shape') {
      return 0.02; // After decorative shapes
    } else {
      // Form field
      if (item.type === 'checkbox' || item.type === 'radio') {
        return 0.04; // After checkbox/radio
      }
      if (item.type === 'textarea') {
        return 0.05; // After textarea
      }
      return 0.045; // After textInput/dropdown
    }
  }

  /**
   * Post-process Claude's response to ensure proper vertical spacing
   * Sorts all items by Y, then ensures minimum spacing between consecutive items
   */
  function ensureProperSpacing(response: ClaudeResponse): ClaudeResponse {
    // Collect all items into a single array with metadata
    const allItems: LayoutItem[] = [];

    if (response.textItems) {
      response.textItems.forEach((item, idx) => {
        allItems.push({
          type: 'text',
          originalIndex: idx,
          yNorm: item.yNormTop || 0.05,
          heightNorm: getItemHeightNorm(item, 'text'),
          data: { ...item },
        });
      });
    }

    if (response.shapes) {
      response.shapes.forEach((item, idx) => {
        allItems.push({
          type: 'shape',
          originalIndex: idx,
          yNorm: item.yNormTop || 0.05,
          heightNorm: getItemHeightNorm(item, 'shape'),
          data: { ...item },
        });
      });
    }

    if (response.formFields) {
      response.formFields.forEach((item, idx) => {
        allItems.push({
          type: 'formField',
          originalIndex: idx,
          yNorm: item.yNormTop || 0.05,
          heightNorm: getItemHeightNorm(item, 'formField'),
          data: { ...item },
        });
      });
    }

    // Sort by Y position
    allItems.sort((a, b) => a.yNorm - b.yNorm);

    // Ensure minimum spacing between consecutive items
    let currentY = 0.05; // Start at top margin

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];

      // If item is above where it should be, push it down
      if (item.yNorm < currentY) {
        item.yNorm = currentY;
        item.data.yNormTop = currentY;
      }

      // Calculate where the next item should start (after this item + spacing)
      const itemBottom = item.yNorm + item.heightNorm;
      const minSpacing = getMinSpacingAfter(item.data, item.type);
      currentY = itemBottom + minSpacing;

      // Don't let items go beyond bottom margin
      if (item.yNorm > 0.85) {
        item.yNorm = 0.85;
        item.data.yNormTop = 0.85;
      }
    }

    // Rebuild the response with corrected coordinates
    const correctedResponse: ClaudeResponse = {
      textItems: [],
      shapes: [],
      formFields: [],
    };

    // Restore items to their original arrays with corrected Y positions
    for (const item of allItems) {
      if (item.type === 'text') {
        correctedResponse.textItems!.push(item.data);
      } else if (item.type === 'shape') {
        correctedResponse.shapes!.push(item.data);
      } else {
        correctedResponse.formFields!.push(item.data);
      }
    }

    return correctedResponse;
  }

  function addItemsToCanvas(rawResponse: ClaudeResponse, deps: GenerateContentDeps) {
    const { activePage } = deps;
    const allNewTextItems: any[] = [];
    const allNewShapes: any[] = [];
    const allNewFormFields: any[] = [];

    // Post-process to ensure proper spacing
    const response = ensureProperSpacing(rawResponse);

    // Check if page already has content - if so, we need to offset new items
    const existingItemCount =
      deps.textItems.filter((t: any) => t.index === activePage).length +
      deps.shapeItems.filter((s: any) => s.index === activePage).length +
      deps.formFields.filter((f: any) => f.index === activePage).length;

    // Calculate Y offset if page has existing content
    // Find the lowest Y position of existing items and start new content below it
    let yOffset = 0;
    if (existingItemCount > 0) {
      let maxY = 0;

      deps.textItems.filter((t: any) => t.index === activePage).forEach((t: any) => {
        const y = t.yNormTop || (t.y / CANVAS_HEIGHT) || 0;
        const height = (t.fontSize || 14) * 1.2 / CANVAS_HEIGHT;
        maxY = Math.max(maxY, y + height);
      });

      deps.shapeItems.filter((s: any) => s.index === activePage).forEach((s: any) => {
        const y = s.yNormTop || (s.y / CANVAS_HEIGHT) || 0;
        const height = s.heightNorm || (s.height / CANVAS_HEIGHT) || 0.05;
        maxY = Math.max(maxY, y + height);
      });

      deps.formFields.filter((f: any) => f.index === activePage).forEach((f: any) => {
        const y = f.yNormTop || (f.y / CANVAS_HEIGHT) || 0;
        const height = f.heightNorm || (f.height / CANVAS_HEIGHT) || 0.05;
        maxY = Math.max(maxY, y + height);
      });

      // Add some padding and calculate offset
      // New content starts at maxY + 0.05 padding
      const newContentStart = maxY + 0.05;

      // Find the minimum Y in the new content
      let minNewY = 1;
      if (response.textItems) {
        response.textItems.forEach((t: any) => {
          minNewY = Math.min(minNewY, t.yNormTop || 0.05);
        });
      }
      if (response.shapes) {
        response.shapes.forEach((s: any) => {
          minNewY = Math.min(minNewY, s.yNormTop || 0.05);
        });
      }
      if (response.formFields) {
        response.formFields.forEach((f: any) => {
          minNewY = Math.min(minNewY, f.yNormTop || 0.05);
        });
      }

      // Calculate offset to shift new content below existing content
      yOffset = newContentStart - minNewY;
    }

    // Add text items - trust AI coordinates, just apply offset if needed
    if (response.textItems && response.textItems.length > 0) {
      for (const item of response.textItems) {
        const isTitle = item.fontSize && item.fontSize >= 20;
        const fontSize = clampFontSize(item.fontSize || FONT_LIMITS.bodyDefault, isTitle);

        // Apply offset to Y coordinate
        const yNorm = clamp(item.yNormTop + yOffset, BOUNDS.yMin, BOUNDS.yMax);
        const xNorm = clamp(item.xNorm, BOUNDS.xMin, BOUNDS.xMax);

        const textItem = createOptimizedTextItem(
          item.text,
          xNorm,
          yNorm,
          fontSize,
          activePage,
          {
            color: item.color,
            fontFamily: item.fontFamily,
          }
        );

        allNewTextItems.push(textItem);
      }
    }

    // Add shapes - trust AI coordinates, just apply offset if needed
    if (response.shapes && response.shapes.length > 0) {
      for (const item of response.shapes) {
        const strokeWidth = clamp(item.strokeWidth || 1, 1, 5);

        // Apply offset to Y coordinate
        const yNorm = clamp(item.yNormTop + yOffset, BOUNDS.yMin, BOUNDS.yMax);
        const xNorm = clamp(item.xNorm, BOUNDS.xMin, BOUNDS.xMax);
        const widthNorm = item.widthNorm ? clamp(item.widthNorm, 0.01, BOUNDS.xMax - xNorm) : undefined;
        const heightNorm = item.heightNorm ? clamp(item.heightNorm, 0.01, BOUNDS.yMax - yNorm) : undefined;

        const x = Math.round(xNorm * CANVAS_WIDTH);
        const y = Math.round(yNorm * CANVAS_HEIGHT);
        const width = widthNorm ? Math.round(widthNorm * CANVAS_WIDTH) : undefined;
        const height = heightNorm ? Math.round(heightNorm * CANVAS_HEIGHT) : undefined;

        allNewShapes.push({
          type: item.type,
          x,
          y,
          width,
          height,
          xNorm: parseFloat(xNorm.toFixed(6)),
          yNormTop: parseFloat(yNorm.toFixed(6)),
          widthNorm: widthNorm ? parseFloat(widthNorm.toFixed(6)) : undefined,
          heightNorm: heightNorm ? parseFloat(heightNorm.toFixed(6)) : undefined,
          index: activePage,
          strokeColor: item.strokeColor || '#000000',
          strokeWidth,
          fillColor: item.fillColor ?? null,
        });
      }
    }

    // Add form fields - trust AI coordinates, just apply offset if needed
    if (response.formFields && response.formFields.length > 0) {
      // Track groupName mappings to preserve radio button groups
      // All radios with the same original groupName should get the same unique groupName
      const groupNameMap = new Map<string, string>();

      for (const item of response.formFields) {
        const fieldType = item.type;
        const typeDefaults = getFormFieldDefaults(fieldType);

        // Use provided dimensions or fall back to proper defaults
        let widthNorm = item.widthNorm || typeDefaults.widthNorm;
        let heightNorm = item.heightNorm || typeDefaults.heightNorm;

        // Apply offset to Y coordinate and clamp
        const yNorm = clamp(item.yNormTop + yOffset, BOUNDS.yMin, BOUNDS.yMax);
        const xNorm = clamp(item.xNorm, BOUNDS.xMin, BOUNDS.xMax);
        widthNorm = clamp(widthNorm, 0.01, BOUNDS.xMax - xNorm);
        heightNorm = clamp(heightNorm, 0.01, BOUNDS.yMax - yNorm);

        // Calculate pixel coordinates
        const fieldXPx = Math.round(xNorm * CANVAS_WIDTH);
        const fieldYPx = Math.round(yNorm * CANVAS_HEIGHT);
        const fieldWidthPx = Math.round(widthNorm * CANVAS_WIDTH);
        const fieldHeightPx = Math.round(heightNorm * CANVAS_HEIGHT);

        // Add label as text item if provided
        if (item.label) {
          const isCheckboxOrRadio = fieldType === 'checkbox' || fieldType === 'radio';
          const labelFontSize = isCheckboxOrRadio ? 14 : FONT_LIMITS.labelDefault;
          const labelPadding = Math.round(labelFontSize * 0.2);

          if (isCheckboxOrRadio) {
            // For checkbox/radio: place label to the right, vertically centered
            const fieldSize = 20;
            const labelGap = 10;
            const labelX = fieldXPx + fieldSize + labelGap;
            const fieldCenterY = fieldYPx + (fieldSize / 2);
            const labelY = fieldCenterY - (labelFontSize * 0.4);

            const labelTextItem = {
              text: item.label,
              x: Math.round(labelX),
              y: Math.round(labelY),
              xNorm: labelX / CANVAS_WIDTH,
              yNormTop: labelY / CANVAS_HEIGHT,
              fontSize: labelFontSize,
              color: '#333333',
              fontFamily: 'Lato',
              anchor: 'top' as const,
              boxPadding: labelPadding,
              index: activePage,
            };

            allNewTextItems.push(labelTextItem);
          } else {
            // Label above the field for textInput/textarea/dropdown
            const labelPos = computeLabelAboveFieldPosition(xNorm, yNorm, labelFontSize);

            const labelItem = createOptimizedTextItem(
              item.label,
              labelPos.xNorm,
              labelPos.yNorm,
              labelFontSize,
              activePage
            );
            allNewTextItems.push(labelItem);
          }
        }

        // Always ensure unique fieldName
        const fieldName = ensureUniqueFieldName(item.fieldName, fieldType);

        // Handle radio button groupName - preserve groups so only one can be selected
        let groupName: string | undefined;
        if (fieldType === 'radio' && item.groupName) {
          // Check if we've already mapped this groupName
          if (groupNameMap.has(item.groupName)) {
            groupName = groupNameMap.get(item.groupName);
          } else {
            // First time seeing this groupName - create a unique version and store it
            groupName = ensureUniqueGroupName(item.groupName);
            groupNameMap.set(item.groupName, groupName);
          }
        } else if (fieldType === 'radio') {
          // No groupName provided - generate one (each ungrouped radio is independent)
          groupName = ensureUniqueGroupName(undefined);
        }

        // Create the form field
        allNewFormFields.push({
          type: fieldType,
          x: fieldXPx,
          y: fieldYPx,
          width: fieldWidthPx,
          height: fieldHeightPx,
          xNorm: parseFloat(xNorm.toFixed(6)),
          yNormTop: parseFloat(yNorm.toFixed(6)),
          widthNorm: parseFloat(widthNorm.toFixed(6)),
          heightNorm: parseFloat(heightNorm.toFixed(6)),
          index: activePage,
          fieldName,
          label: item.label,
          placeholder: item.placeholder || (fieldType === 'textInput' ? 'Enter text...' : undefined),
          required: item.required || false,
          options: item.options || (fieldType === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] :
                                    fieldType === 'radio' ? ['Option 1'] : undefined),
          groupName,
          defaultValue: item.defaultValue,
          ...FORM_FIELD_STYLE_DEFAULTS,
        });
      }
    }

    // Handle image placeholders (show as rectangles with text for now)
    if (response.imageItems && response.imageItems.length > 0) {
      for (const item of response.imageItems) {
        // Apply offset to Y coordinate and clamp
        const imgYNorm = clamp(item.yNormTop + yOffset, BOUNDS.yMin, BOUNDS.yMax);
        const imgXNorm = clamp(item.xNorm, BOUNDS.xMin, BOUNDS.xMax);
        const placeholderWidthNorm = item.widthNorm ? clamp(item.widthNorm, 0.01, BOUNDS.xMax - imgXNorm) : 0.15;
        const placeholderHeightNorm = item.heightNorm ? clamp(item.heightNorm, 0.01, BOUNDS.yMax - imgYNorm) : 0.08;

        // Get dimensions in pixels for precise centering (rounded for crisp rendering)
        const placeholderXPx = Math.round(imgXNorm * CANVAS_WIDTH);
        const placeholderYPx = Math.round(imgYNorm * CANVAS_HEIGHT);
        const placeholderWidthPx = Math.round(placeholderWidthNorm * CANVAS_WIDTH);
        const placeholderHeightPx = Math.round(placeholderHeightNorm * CANVAS_HEIGHT);

        // Add placeholder rectangle with optimized coordinates
        allNewShapes.push({
          type: 'rectangle' as const,
          x: placeholderXPx,
          y: placeholderYPx,
          width: placeholderWidthPx,
          height: placeholderHeightPx,
          xNorm: parseFloat(imgXNorm.toFixed(6)),
          yNormTop: parseFloat(imgYNorm.toFixed(6)),
          widthNorm: parseFloat(placeholderWidthNorm.toFixed(6)),
          heightNorm: parseFloat(placeholderHeightNorm.toFixed(6)),
          index: activePage,
          strokeColor: '#94a3b8',
          strokeWidth: 2,
          fillColor: '#f1f5f9',
        });

        // Center text in placeholder using optimized coordinates
        const placeholderFontSize = FONT_SIZES.small;
        const textCenterXPx = placeholderXPx + (placeholderWidthPx / 2) - 30; // Approximate text width offset
        const textCenterYPx = placeholderYPx + (placeholderHeightPx / 2) - (placeholderFontSize / 2);

        // Use optimized text item creation for consistent structure
        const placeholderTextItem = createOptimizedTextItem(
          `[${item.description}]`,
          pixelToNormX(textCenterXPx),
          pixelToNormY(textCenterYPx),
          placeholderFontSize,
          activePage,
          { color: '#64748b' }
        );
        allNewTextItems.push(placeholderTextItem);
      }
    }

    // Commit all items to state
    if (allNewTextItems.length > 0) {
      deps.setTextItems((prev) => [...prev, ...allNewTextItems]);
    }
    if (allNewShapes.length > 0) {
      deps.setShapeItems((prev) => [...prev, ...allNewShapes]);
    }
    if (allNewFormFields.length > 0) {
      deps.setFormFields((prev) => [...prev, ...allNewFormFields]);
    }
  }

  // ============================================================================
  // Return Hook Value
  // ============================================================================

  return {
    // State
    apiKey,
    connectionStatus,
    isGenerating,
    error,
    lastPrompt,
    hasStoredKey,

    // Credential management
    saveNewApiKey,
    unlockApiKey,
    lockApiKey,
    clearStoredApiKey,

    // Content generation
    generateContent,

    // Error management
    setError,
    clearError: () => setError(null),
  };
}
