/**
 * Predefined layout configurations for common document structures
 */
import type { TemplateLayout, LayoutColumn } from '../../types/templates';

export const LAYOUT_PRESETS: Record<string, TemplateLayout> = {
  'single-column': {
    preset: 'single-column',
    columns: [
      { id: 'main', name: 'Main Content', xNormStart: 0.05, xNormEnd: 0.95 }
    ],
    pageMargins: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 }
  },

  'two-column-equal': {
    preset: 'two-column-equal',
    columns: [
      { id: 'left', name: 'Left Column', xNormStart: 0.05, xNormEnd: 0.48 },
      { id: 'right', name: 'Right Column', xNormStart: 0.52, xNormEnd: 0.95 }
    ],
    pageMargins: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 }
  },

  'two-column-sidebar-left': {
    preset: 'two-column-sidebar-left',
    columns: [
      { id: 'sidebar', name: 'Sidebar', xNormStart: 0, xNormEnd: 0.30 },
      { id: 'main', name: 'Main Content', xNormStart: 0.30, xNormEnd: 1.0 }
    ],
    pageMargins: { top: 0, right: 0.05, bottom: 0, left: 0 }
  },

  'two-column-sidebar-right': {
    preset: 'two-column-sidebar-right',
    columns: [
      { id: 'main', name: 'Main Content', xNormStart: 0, xNormEnd: 0.70 },
      { id: 'sidebar', name: 'Sidebar', xNormStart: 0.70, xNormEnd: 1.0 }
    ],
    pageMargins: { top: 0, right: 0, bottom: 0, left: 0.05 }
  },

  'three-column': {
    preset: 'three-column',
    columns: [
      { id: 'left', name: 'Left Column', xNormStart: 0.03, xNormEnd: 0.30 },
      { id: 'center', name: 'Center Column', xNormStart: 0.35, xNormEnd: 0.65 },
      { id: 'right', name: 'Right Column', xNormStart: 0.70, xNormEnd: 0.97 }
    ],
    pageMargins: { top: 0.05, right: 0.03, bottom: 0.05, left: 0.03 }
  }
};

/**
 * Get a layout preset by name
 */
export function getLayoutPreset(preset: string): TemplateLayout | undefined {
  return LAYOUT_PRESETS[preset];
}

/**
 * Get column by ID from layout
 */
export function getColumnById(layout: TemplateLayout, columnId: string): LayoutColumn | undefined {
  return layout.columns.find(col => col.id === columnId);
}

/**
 * Calculate content X position within a column
 * Accounts for column padding
 */
export function getColumnContentX(column: LayoutColumn, relativeX: number = 0): number {
  const leftPadding = column.paddingNorm?.left ?? 0.02;
  const contentStart = column.xNormStart + leftPadding;
  const contentWidth = (column.xNormEnd - column.xNormStart) - leftPadding - (column.paddingNorm?.right ?? 0.02);
  return contentStart + (relativeX * contentWidth);
}

/**
 * Get the width of a column in normalized coordinates
 */
export function getColumnWidth(column: LayoutColumn): number {
  return column.xNormEnd - column.xNormStart;
}

/**
 * Get the content width of a column (excluding padding)
 */
export function getColumnContentWidth(column: LayoutColumn): number {
  const leftPadding = column.paddingNorm?.left ?? 0.02;
  const rightPadding = column.paddingNorm?.right ?? 0.02;
  return (column.xNormEnd - column.xNormStart) - leftPadding - rightPadding;
}
