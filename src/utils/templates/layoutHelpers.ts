/**
 * Helper functions for working with template layouts
 */
import type {
  TemplateLayout,
  LayoutSection,
  LayoutRegion,
  LayoutColumn
} from '../../types/templates';
import type { ShapeItem } from '../../types/shapes';

/**
 * Generate background shapes from layout regions
 * Converts regions to ShapeItems for rendering
 */
export function generateRegionShapes(regions: LayoutRegion[], pageIndex: number = 0): ShapeItem[] {
  return regions.map(region => ({
    type: 'rectangle' as const,
    xNorm: region.xNormStart,
    yNormTop: region.yNormStart,
    widthNorm: region.xNormEnd - region.xNormStart,
    heightNorm: region.yNormEnd - region.yNormStart,
    strokeColor: region.backgroundColor,
    strokeWidth: 0,
    fillColor: region.backgroundColor,
    index: pageIndex,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }));
}

/**
 * Generate section header underline shape
 */
export function generateSectionUnderline(
  section: LayoutSection,
  column: LayoutColumn,
  yPosition: number,
  pageIndex: number = 0
): ShapeItem {
  const underlineColor = section.headerStyle?.underlineColor ?? '#e2e8f0';
  const leftPadding = column.paddingNorm?.left ?? 0.02;
  const rightPadding = column.paddingNorm?.right ?? 0.02;

  return {
    type: 'line' as const,
    xNorm: column.xNormStart + leftPadding,
    yNormTop: yPosition,
    widthNorm: (column.xNormEnd - column.xNormStart) - leftPadding - rightPadding,
    heightNorm: 0,
    strokeColor: underlineColor,
    strokeWidth: 1,
    index: pageIndex,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
}

/**
 * Get sections for a specific column, sorted by order
 */
export function getSectionsByColumn(layout: TemplateLayout, columnId: string): LayoutSection[] {
  return (layout.sections ?? [])
    .filter(s => s.columnId === columnId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Determine which column a normalized X position falls within
 */
export function getColumnAtPosition(layout: TemplateLayout, xNorm: number): LayoutColumn | undefined {
  return layout.columns.find(col => xNorm >= col.xNormStart && xNorm < col.xNormEnd);
}

/**
 * Check if layout is defined and has valid columns
 */
export function hasValidLayout(layout?: TemplateLayout): layout is TemplateLayout {
  return !!layout && Array.isArray(layout.columns) && layout.columns.length > 0;
}

/**
 * Get all regions sorted by zIndex (lower first = rendered first = behind)
 */
export function getSortedRegions(regions: LayoutRegion[]): LayoutRegion[] {
  return [...regions].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

/**
 * Find a section by its ID
 */
export function getSectionById(layout: TemplateLayout, sectionId: string): LayoutSection | undefined {
  return layout.sections?.find(s => s.id === sectionId);
}

/**
 * Get the column that a section belongs to
 */
export function getColumnForSection(layout: TemplateLayout, sectionId: string): LayoutColumn | undefined {
  const section = getSectionById(layout, sectionId);
  if (!section) return undefined;
  return layout.columns.find(col => col.id === section.columnId);
}

/**
 * Get default text color for a column
 */
export function getDefaultTextColor(layout: TemplateLayout, columnId: string): string {
  return layout.defaultTextColorByColumn?.[columnId] ?? '#000000';
}
