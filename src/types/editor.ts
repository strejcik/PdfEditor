import type { FormFieldItem } from './formFields';
import type { AnnotationItem, TextSpan } from './annotations';

export type Point = { x: number; y: number };

export type TextItem = {
  // Unique identifier for linking annotations
  id?: string;
  // add fields you use (selected, color, font, etc.)
  boxPadding: number;
  fontSize: number;
  index: number;
  text: string;
  x: number;
  y: number;
  anchor: string;
  xNorm: number;
  yNormTop: number;
  color: string;
  fontFamily?: string;
  // Bounding box dimensions (normalized 0-1)
  // These represent the actual text content area, not including padding
  widthNorm?: number;
  heightNorm?: number;
  // Font metrics for accurate annotation positioning
  // ascentRatio = ascent / textHeight (baseline position from top, typically ~0.8)
  // descentRatio = descent / textHeight (typically ~0.2)
  ascentRatio?: number;
  descentRatio?: number;
};

export type ImageItem = {
  data:string;
  height:number;
  index:number;
  width:number;
  xNorm: number;
  yNorm: number;
  yNormTop: number;
  widthNorm: number;
  heightNorm: number;
  x:number;
  y:number;
};

export type Page = {
  textItems: TextItem[];
  imageItems: ImageItem[];
  shapes?: any[];
  formFields?: FormFieldItem[];
  annotations?: AnnotationItem[];
  pdfTextSpans?: TextSpan[];
};

export type UndoRedoState = Record<string, unknown>;

export type TextBox = {
  rawText?: string;
  text?: string;
  width: number;
  height: number;
  boxPadding?: number;
  hasScaled?: boolean;
  baseFontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
  resizeBaseFontSize?: number;
  resizeBaseWidth?: number;
  resizeBaseHeight?: number;
  baseWidth?: number;
  baseHeight?: number;
  x?: number;
  y?: number;
  fontSize?: number;
};